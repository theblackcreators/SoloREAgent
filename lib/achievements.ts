import { supabaseAdmin } from "./supabaseAdmin";

export interface Achievement {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  criteria: any;
  xp_reward: number;
  rarity: string;
}

export interface UserAchievement {
  achievement: Achievement;
  unlocked_at: string;
}

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

export async function checkAndAwardAchievements(
  userId: string,
  cohortId: number,
  context: {
    newStreak?: number;
    newRank?: string;
    totalQuestsCompleted?: number;
    totalSteps?: number;
    totalAppts?: number;
    isFirstLog?: boolean;
    isFirstCheckin?: boolean;
    logTime?: Date;
  }
): Promise<Achievement[]> {
  const awarded: Achievement[] = [];

  // Get all active achievements
  const { data: achievements } = await supabaseAdmin
    .from("achievements")
    .select("*")
    .eq("active", true);

  if (!achievements) return awarded;

  // Get user's existing achievements
  const { data: existing } = await supabaseAdmin
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId);

  const existingIds = new Set((existing || []).map((e: any) => e.achievement_id));

  for (const ach of achievements) {
    if (existingIds.has(ach.id)) continue;

    const earned = checkCriteria(ach, context);
    if (earned) {
      // Award the achievement
      const { error } = await supabaseAdmin
        .from("user_achievements")
        .insert({
          user_id: userId,
          cohort_id: cohortId,
          achievement_id: ach.id,
        });

      if (!error) {
        awarded.push(ach);
        
        // Award XP bonus
        if (ach.xp_reward > 0) {
          await supabaseAdmin
            .from("member_stats")
            .update({ xp: supabaseAdmin.rpc("increment_xp", { amount: ach.xp_reward }) })
            .eq("user_id", userId)
            .eq("cohort_id", cohortId);
        }
      }
    }
  }

  return awarded;
}

function checkCriteria(
  ach: Achievement,
  ctx: {
    newStreak?: number;
    newRank?: string;
    totalQuestsCompleted?: number;
    totalSteps?: number;
    totalAppts?: number;
    isFirstLog?: boolean;
    isFirstCheckin?: boolean;
    logTime?: Date;
  }
): boolean {
  const { criteria } = ach;
  if (!criteria?.type) return false;

  switch (criteria.type) {
    case "streak":
      return (ctx.newStreak || 0) >= criteria.value;

    case "rank":
      if (!ctx.newRank) return false;
      return RANK_ORDER.indexOf(ctx.newRank) >= RANK_ORDER.indexOf(criteria.value);

    case "quests_completed":
      return (ctx.totalQuestsCompleted || 0) >= criteria.value;

    case "total_steps":
      return (ctx.totalSteps || 0) >= criteria.value;

    case "total_appts":
      return (ctx.totalAppts || 0) >= criteria.value;

    case "first_log":
      return ctx.isFirstLog === true;

    case "first_checkin":
      return ctx.isFirstCheckin === true;

    case "early_log":
      if (!ctx.logTime) return false;
      return ctx.logTime.getHours() < 8;

    default:
      return false;
  }
}

export async function getUserAchievements(
  userId: string,
  cohortId: number
): Promise<UserAchievement[]> {
  const { data } = await supabaseAdmin
    .from("user_achievements")
    .select(`
      unlocked_at,
      achievements (*)
    `)
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .order("unlocked_at", { ascending: false });

  return (data || []).map((row: any) => ({
    achievement: row.achievements,
    unlocked_at: row.unlocked_at,
  }));
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const { data } = await supabaseAdmin
    .from("achievements")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("rarity");

  return data || [];
}

