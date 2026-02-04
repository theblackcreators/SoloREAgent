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

// GET /api/analytics - Get user analytics data
export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohortId");
  const days = parseInt(searchParams.get("days") || "30", 10);

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);
  const today = toISODateUTC(new Date());
  const startDate = addDaysUTC(today, -days);

  try {
    // Fetch daily logs for the period
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from("daily_logs")
      .select("log_date, steps, workout_done, learning_minutes, calls, texts, convos, leads, appts, content_done")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .gte("log_date", startDate)
      .lte("log_date", today)
      .order("log_date", { ascending: true });

    if (logsErr) throw new Error(logsErr.message);

    // Fetch daily quests for the period
    const { data: quests, error: questsErr } = await supabaseAdmin
      .from("daily_quests")
      .select("quest_date, quest_type, completed")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .gte("quest_date", startDate)
      .lte("quest_date", today);

    if (questsErr) throw new Error(questsErr.message);

    // Fetch current stats
    const { data: stats, error: statsErr } = await supabaseAdmin
      .from("member_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .single();

    if (statsErr) throw new Error(statsErr.message);

    // Calculate XP history (cumulative approximation based on daily gains)
    const xpHistory = (logs || []).map((log: any) => {
      const dailyXp = 
        (log.workout_done ? 5 : 0) +
        (log.steps >= 7000 ? 5 : 0) +
        (log.learning_minutes >= 20 ? 5 : 0) +
        (log.convos >= 5 || log.appts >= 1 ? 5 : 0) +
        (log.content_done ? 3 : 0) +
        (log.steps >= 10000 ? 2 : 0) +
        (log.appts >= 2 ? 3 : 0);
      return { date: log.log_date, xp: dailyXp };
    });

    // Quest completion stats
    const questStats = {
      total: quests?.length || 0,
      completed: quests?.filter((q: any) => q.completed).length || 0,
      byType: {} as Record<string, { total: number; completed: number }>,
    };

    for (const quest of quests || []) {
      const type = (quest as any).quest_type;
      if (!questStats.byType[type]) {
        questStats.byType[type] = { total: 0, completed: 0 };
      }
      questStats.byType[type].total++;
      if ((quest as any).completed) questStats.byType[type].completed++;
    }

    // Stat progression (current values)
    const statProgression = {
      str: stats?.str || 0,
      sta: stats?.sta || 0,
      agi: stats?.agi || 0,
      int: stats?.int_stat || 0,
      cha: stats?.cha || 0,
      rep: stats?.rep || 0,
    };

    // Activity heatmap data
    const activityMap: Record<string, number> = {};
    for (const log of logs || []) {
      const activities = 
        (log.workout_done ? 1 : 0) +
        (log.steps >= 7000 ? 1 : 0) +
        (log.learning_minutes >= 20 ? 1 : 0) +
        (log.convos >= 1 ? 1 : 0);
      activityMap[log.log_date] = activities;
    }

    return NextResponse.json({
      period: { start: startDate, end: today, days },
      currentStats: stats,
      xpHistory,
      questStats,
      statProgression,
      activityMap,
      logsCount: logs?.length || 0,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

