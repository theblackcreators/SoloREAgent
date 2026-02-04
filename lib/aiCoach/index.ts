/**
 * AI Coach Engine - Main orchestrator for all three coaches
 * Generates a complete daily plan across Fitness, Real Estate, and Social pillars
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fitnessCoach } from "./fitnessCoach";
import { realEstateCoach } from "./realEstateCoach";
import { socialCoach } from "./socialCoach";
import {
  Coach,
  CoachContext,
  GeneratedTask,
  UserStats,
  UserPreferences,
  UserHistory,
  DEFAULT_PREFERENCES,
  DailyLogSummary,
} from "./types";

// All coaches
const COACHES: Coach[] = [fitnessCoach, realEstateCoach, socialCoach];

/**
 * Generate a complete daily plan for a user
 */
export async function generateDailyPlan(
  userId: string,
  cohortId: number,
  date: string
): Promise<{ tasks: GeneratedTask[]; context: CoachContext }> {
  // Build context from user data
  const context = await buildCoachContext(userId, cohortId, date);

  // Generate tasks from all coaches
  const allTasks: GeneratedTask[] = [];

  for (const coach of COACHES) {
    const tasks = coach.generateTasks(context);
    allTasks.push(...tasks);
  }

  // Sort by priority and timing
  allTasks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return parseTime(a.timing) - parseTime(b.timing);
  });

  return { tasks: allTasks, context };
}

/**
 * Save generated tasks to the database
 */
export async function saveDailyPlan(
  userId: string,
  cohortId: number,
  date: string,
  tasks: GeneratedTask[],
  context: CoachContext
): Promise<{ success: boolean; count: number; error?: string }> {
  const rows = tasks.map((task, index) => ({
    user_id: userId,
    cohort_id: cohortId,
    task_date: date,
    pillar: task.pillar,
    title: task.title,
    description: task.description,
    action: task.action,
    timing: task.timing,
    duration_minutes: task.duration_minutes,
    why_it_matters: task.why_it_matters,
    priority: task.priority,
    sequence_order: index,
    xp_reward: task.xp_reward,
    stat_rewards: task.stat_rewards,
    generation_context: {
      rank: context.stats.rank,
      streak: context.stats.streak,
      xp: context.stats.xp,
      completionRate: context.history.completionRate,
    },
    ai_model: "rule-based",
  }));

  const { error } = await supabaseAdmin
    .from("ai_daily_tasks")
    .upsert(rows, {
      onConflict: "user_id,cohort_id,task_date,pillar,sequence_order",
      ignoreDuplicates: false,
    });

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: rows.length };
}

/**
 * Build the context object for coaches
 */
async function buildCoachContext(
  userId: string,
  cohortId: number,
  date: string
): Promise<CoachContext> {
  // Get user stats
  const { data: statsData } = await supabaseAdmin
    .from("member_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .single();

  const stats: UserStats = {
    xp: statsData?.xp || 0,
    rank: statsData?.rank || "E",
    streak: statsData?.streak || 0,
    gold: statsData?.gold || 0,
    str: statsData?.str || 10,
    sta: statsData?.sta || 10,
    agi: statsData?.agi || 10,
    int_stat: statsData?.int_stat || 10,
    cha: statsData?.cha || 10,
    rep: statsData?.rep || 10,
  };

  // Get user preferences
  const { data: prefsData } = await supabaseAdmin
    .from("ai_user_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .single();

  const preferences: UserPreferences = prefsData
    ? {
        wake_time: prefsData.wake_time || DEFAULT_PREFERENCES.wake_time,
        sleep_time: prefsData.sleep_time || DEFAULT_PREFERENCES.sleep_time,
        work_start: prefsData.work_start || DEFAULT_PREFERENCES.work_start,
        work_end: prefsData.work_end || DEFAULT_PREFERENCES.work_end,
        fitness_level: prefsData.fitness_level || DEFAULT_PREFERENCES.fitness_level,
        preferred_workout_time: prefsData.preferred_workout_time || DEFAULT_PREFERENCES.preferred_workout_time,
        workout_duration_preference: prefsData.workout_duration_preference || DEFAULT_PREFERENCES.workout_duration_preference,
        daily_call_target: prefsData.daily_call_target || DEFAULT_PREFERENCES.daily_call_target,
        daily_text_target: prefsData.daily_text_target || DEFAULT_PREFERENCES.daily_text_target,
        prospecting_hours: prefsData.prospecting_hours || DEFAULT_PREFERENCES.prospecting_hours,
        networking_comfort: prefsData.networking_comfort || DEFAULT_PREFERENCES.networking_comfort,
        content_creation_frequency: prefsData.content_creation_frequency || DEFAULT_PREFERENCES.content_creation_frequency,
        coaching_intensity: prefsData.coaching_intensity || DEFAULT_PREFERENCES.coaching_intensity,
        include_motivational_messages: prefsData.include_motivational_messages ?? DEFAULT_PREFERENCES.include_motivational_messages,
      }
    : DEFAULT_PREFERENCES;

  // Get recent history (last 14 days)
  const history = await getUserHistory(userId, cohortId, date);

  // Parse date info
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return {
    userId,
    cohortId,
    date,
    stats,
    preferences,
    history,
    dayOfWeek,
    isWeekend,
  };
}

/**
 * Get user's recent history for adaptive task generation
 */
async function getUserHistory(
  userId: string,
  cohortId: number,
  date: string
): Promise<UserHistory> {
  const endDate = new Date(date);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 14);

  const { data: logs } = await supabaseAdmin
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .gte("log_date", startDate.toISOString().split("T")[0])
    .lt("log_date", date)
    .order("log_date", { ascending: false });

  const recentLogs: DailyLogSummary[] = (logs || []).map((log: any) => ({
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
  }));

  // Calculate averages
  const count = recentLogs.length || 1;
  const averageSteps = recentLogs.reduce((sum, l) => sum + l.steps, 0) / count;
  const averageCalls = recentLogs.reduce((sum, l) => sum + l.calls, 0) / count;
  const averageTexts = recentLogs.reduce((sum, l) => sum + l.texts, 0) / count;
  const averageConvos = recentLogs.reduce((sum, l) => sum + l.convos, 0) / count;
  const averageAppts = recentLogs.reduce((sum, l) => sum + l.appts, 0) / count;
  const averageLearningMinutes = recentLogs.reduce((sum, l) => sum + l.learning_minutes, 0) / count;
  const workoutFrequency = recentLogs.filter((l) => l.workout_done).length / count;
  const contentFrequency = recentLogs.filter((l) => l.content_done).length / count;

  // Get completion rate from quests
  const { data: quests } = await supabaseAdmin
    .from("daily_quests")
    .select("completed")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .gte("quest_date", startDate.toISOString().split("T")[0])
    .lt("quest_date", date);

  const totalQuests = quests?.length || 1;
  const completedQuests = quests?.filter((q: any) => q.completed).length || 0;
  const completionRate = completedQuests / totalQuests;

  return {
    recentLogs,
    completionRate,
    averageSteps,
    averageCalls,
    averageTexts,
    averageConvos,
    averageAppts,
    averageLearningMinutes,
    workoutFrequency,
    contentFrequency,
  };
}

/**
 * Parse time string to minutes for sorting
 */
function parseTime(timing: string): number {
  if (timing.toLowerCase().includes("throughout") || timing.toLowerCase().includes("anytime")) {
    return 1440; // End of day
  }
  if (timing.toLowerCase().includes("end of day")) {
    return 1380; // 11 PM
  }

  const match = timing.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return 720; // Default to noon

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] || "0");
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Export types
export * from "./types";
export { fitnessCoach } from "./fitnessCoach";
export { realEstateCoach } from "./realEstateCoach";
export { socialCoach } from "./socialCoach";

