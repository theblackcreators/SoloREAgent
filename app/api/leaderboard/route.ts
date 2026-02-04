import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

// GET /api/leaderboard - Get leaderboard for a cohort
export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohortId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const rankFilter = searchParams.get("rank"); // Optional: filter by rank

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);

  try {
    // Fetch all member stats for this cohort with user profiles
    let query = supabaseAdmin
      .from("member_stats")
      .select(`
        user_id,
        xp,
        rank,
        streak,
        str,
        sta,
        agi,
        int_stat,
        cha,
        rep,
        gold,
        profiles!inner(display_name, email)
      `)
      .eq("cohort_id", cid)
      .order("xp", { ascending: false })
      .limit(limit);

    // Optional rank filter
    if (rankFilter && ["E", "D", "C", "B", "A", "S"].includes(rankFilter)) {
      query = query.eq("rank", rankFilter);
    }

    const { data: members, error } = await query;

    if (error) throw new Error(error.message);

    // Format leaderboard entries
    const leaderboard = (members || []).map((member: any, index: number) => {
      const profile = member.profiles;
      return {
        position: index + 1,
        userId: member.user_id,
        displayName: profile?.display_name || profile?.email?.split("@")[0] || "Agent",
        xp: member.xp || 0,
        rank: member.rank || "E",
        streak: member.streak || 0,
        stats: {
          str: member.str || 0,
          sta: member.sta || 0,
          agi: member.agi || 0,
          int: member.int_stat || 0,
          cha: member.cha || 0,
          rep: member.rep || 0,
        },
        gold: member.gold || 0,
        isCurrentUser: member.user_id === userId,
      };
    });

    // Find current user's position if not in top results
    const currentUserEntry = leaderboard.find((e: any) => e.isCurrentUser);
    let currentUserPosition = null;

    if (!currentUserEntry) {
      // Get current user's rank
      const { data: userStats } = await supabaseAdmin
        .from("member_stats")
        .select("xp, rank, streak")
        .eq("user_id", userId)
        .eq("cohort_id", cid)
        .single();

      if (userStats) {
        // Count how many users have more XP
        const { count } = await supabaseAdmin
          .from("member_stats")
          .select("*", { count: "exact", head: true })
          .eq("cohort_id", cid)
          .gt("xp", userStats.xp || 0);

        currentUserPosition = {
          position: (count || 0) + 1,
          xp: userStats.xp || 0,
          rank: userStats.rank || "E",
          streak: userStats.streak || 0,
        };
      }
    }

    return NextResponse.json({
      leaderboard,
      totalMembers: members?.length || 0,
      currentUserPosition,
    });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

