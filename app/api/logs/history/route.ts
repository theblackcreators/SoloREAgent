import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { addDaysUTC, toISODateUTC } from "@/lib/date";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

// GET /api/logs/history - Get user's log history
export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohortId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);
  const today = toISODateUTC(new Date());
  const start = startDate || addDaysUTC(today, -30);
  const end = endDate || today;

  try {
    // Fetch daily logs
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .gte("log_date", start)
      .lte("log_date", end)
      .order("log_date", { ascending: false });

    if (logsErr) throw new Error(logsErr.message);

    // Fetch daily quests for the same period
    const { data: quests, error: questsErr } = await supabaseAdmin
      .from("daily_quests")
      .select("quest_date, title, quest_type, completed, xp_reward")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .gte("quest_date", start)
      .lte("quest_date", end);

    if (questsErr) throw new Error(questsErr.message);

    // Group quests by date
    const questsByDate: Record<string, any[]> = {};
    for (const q of quests || []) {
      const d = q.quest_date;
      if (!questsByDate[d]) questsByDate[d] = [];
      questsByDate[d].push(q);
    }

    // Build log entries with quest data
    const entries = (logs || []).map((log: any) => {
      const dayQuests = questsByDate[log.log_date] || [];
      const completedQuests = dayQuests.filter((q: any) => q.completed).length;
      const totalQuests = dayQuests.length;
      const xpEarned = dayQuests
        .filter((q: any) => q.completed)
        .reduce((sum: number, q: any) => sum + (q.xp_reward || 0), 0);

      return {
        date: log.log_date,
        steps: log.steps || 0,
        workout_done: log.workout_done || false,
        learning_minutes: log.learning_minutes || 0,
        calls: log.calls || 0,
        texts: log.texts || 0,
        convos: log.convos || 0,
        leads: log.leads || 0,
        appts: log.appts || 0,
        content_done: log.content_done || false,
        notes: log.notes || "",
        completedQuests,
        totalQuests,
        xpEarned,
        quests: dayQuests,
      };
    });

    // Build calendar data (all dates in range with log status)
    const calendar: Record<string, { hasLog: boolean; quests: number; completed: number }> = {};
    let d = new Date(start);
    const endD = new Date(end);
    while (d <= endD) {
      const dateStr = toISODateUTC(d);
      const dayLog = entries.find((e: any) => e.date === dateStr);
      calendar[dateStr] = {
        hasLog: !!dayLog,
        quests: dayLog?.totalQuests || 0,
        completed: dayLog?.completedQuests || 0,
      };
      d = new Date(d.getTime() + 86400000);
    }

    return NextResponse.json({
      ok: true,
      period: { start, end },
      logs: entries,
      calendar,
      totalLogs: entries.length,
    });
  } catch (error: any) {
    console.error("Log history error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

