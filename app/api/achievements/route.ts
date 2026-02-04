import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserAchievements, getAllAchievements } from "@/lib/achievements";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

// GET /api/achievements - Get user's achievements and all available achievements
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

  try {
    // Get all achievements
    const allAchievements = await getAllAchievements();

    // Get user's unlocked achievements
    const userAchievements = await getUserAchievements(userId, cid);
    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement.id));

    // Calculate stats
    const totalUnlocked = userAchievements.length;
    const totalAvailable = allAchievements.length;
    const totalXpEarned = userAchievements.reduce(
      (sum, ua) => sum + (ua.achievement.xp_reward || 0),
      0
    );

    // Group by category
    const byCategory: Record<string, { unlocked: number; total: number }> = {};
    for (const ach of allAchievements) {
      if (!byCategory[ach.category]) {
        byCategory[ach.category] = { unlocked: 0, total: 0 };
      }
      byCategory[ach.category].total++;
      if (unlockedIds.has(ach.id)) {
        byCategory[ach.category].unlocked++;
      }
    }

    // Group by rarity
    const byRarity: Record<string, { unlocked: number; total: number }> = {};
    for (const ach of allAchievements) {
      if (!byRarity[ach.rarity]) {
        byRarity[ach.rarity] = { unlocked: 0, total: 0 };
      }
      byRarity[ach.rarity].total++;
      if (unlockedIds.has(ach.id)) {
        byRarity[ach.rarity].unlocked++;
      }
    }

    // Build response with all achievements marked as unlocked/locked
    const achievements = allAchievements.map((ach) => {
      const userAch = userAchievements.find((ua) => ua.achievement.id === ach.id);
      return {
        ...ach,
        unlocked: !!userAch,
        unlockedAt: userAch?.unlocked_at || null,
      };
    });

    return NextResponse.json({
      ok: true,
      achievements,
      stats: {
        totalUnlocked,
        totalAvailable,
        completionRate: totalAvailable > 0 ? Math.round((totalUnlocked / totalAvailable) * 100) : 0,
        totalXpEarned,
        byCategory,
        byRarity,
      },
      recentUnlocks: userAchievements.slice(0, 5).map((ua) => ({
        ...ua.achievement,
        unlockedAt: ua.unlocked_at,
      })),
    });
  } catch (error: any) {
    console.error("Achievements error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

