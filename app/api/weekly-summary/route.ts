import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { toISODateUTC } from "@/lib/date";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Start from Sunday
  const startOfWeek = new Date(d.setDate(diff));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return {
    start: toISODateUTC(startOfWeek),
    end: toISODateUTC(endOfWeek),
  };
}

// GET /api/weekly-summary - Get weekly progress summary
export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohortId");

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);
  const now = new Date();
  const thisWeek = getWeekRange(now);
  
  // Previous week
  const lastWeekDate = new Date(now);
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = getWeekRange(lastWeekDate);

  try {
    // Fetch this week's quests
    const { data: thisWeekQuests } = await supabaseAdmin
      .from("daily_quests")
      .select("completed, xp_reward")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .gte("quest_date", thisWeek.start)
      .lte("quest_date", thisWeek.end);

    // Fetch last week's quests
    const { data: lastWeekQuests } = await supabaseAdmin
      .from("daily_quests")
      .select("completed, xp_reward")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .gte("quest_date", lastWeek.start)
      .lte("quest_date", lastWeek.end);

    // Fetch this week's logs
    const { data: thisWeekLogs } = await supabaseAdmin
      .from("daily_logs")
      .select("log_date")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .gte("log_date", thisWeek.start)
      .lte("log_date", thisWeek.end);

    // Fetch last week's logs
    const { data: lastWeekLogs } = await supabaseAdmin
      .from("daily_logs")
      .select("log_date")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .gte("log_date", lastWeek.start)
      .lte("log_date", lastWeek.end);

    // Current stats
    const { data: stats } = await supabaseAdmin
      .from("member_stats")
      .select("xp, rank, streak")
      .eq("user_id", userId)
      .eq("cohort_id", cid)
      .single();

    // Calculate metrics
    const thisWeekXp = (thisWeekQuests || [])
      .filter((q: any) => q.completed)
      .reduce((sum: number, q: any) => sum + (q.xp_reward || 0), 0);

    const lastWeekXp = (lastWeekQuests || [])
      .filter((q: any) => q.completed)
      .reduce((sum: number, q: any) => sum + (q.xp_reward || 0), 0);

    const thisWeekCompleted = (thisWeekQuests || []).filter((q: any) => q.completed).length;
    const thisWeekTotal = (thisWeekQuests || []).length;
    const lastWeekCompleted = (lastWeekQuests || []).filter((q: any) => q.completed).length;
    const lastWeekTotal = (lastWeekQuests || []).length;

    const thisWeekDaysLogged = (thisWeekLogs || []).length;
    const lastWeekDaysLogged = (lastWeekLogs || []).length;

    // Calculate percentage changes
    const xpChange = lastWeekXp > 0 ? Math.round(((thisWeekXp - lastWeekXp) / lastWeekXp) * 100) : 0;
    const completionRate = thisWeekTotal > 0 ? Math.round((thisWeekCompleted / thisWeekTotal) * 100) : 0;
    const lastCompletionRate = lastWeekTotal > 0 ? Math.round((lastWeekCompleted / lastWeekTotal) * 100) : 0;

    return NextResponse.json({
      ok: true,
      period: thisWeek,
      thisWeek: {
        xpEarned: thisWeekXp,
        questsCompleted: thisWeekCompleted,
        totalQuests: thisWeekTotal,
        completionRate,
        daysLogged: thisWeekDaysLogged,
      },
      lastWeek: {
        xpEarned: lastWeekXp,
        questsCompleted: lastWeekCompleted,
        totalQuests: lastWeekTotal,
        completionRate: lastCompletionRate,
        daysLogged: lastWeekDaysLogged,
      },
      comparison: {
        xpChange,
        daysChange: thisWeekDaysLogged - lastWeekDaysLogged,
        rateChange: completionRate - lastCompletionRate,
      },
      currentStats: {
        totalXp: stats?.xp || 0,
        rank: stats?.rank || "E",
        streak: stats?.streak || 0,
      },
    });
  } catch (error: any) {
    console.error("Weekly summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

