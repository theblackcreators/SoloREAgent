/**
 * AI Coaching System Types
 */

export type Pillar = "fitness" | "real_estate" | "social";

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type CoachingIntensity = "gentle" | "balanced" | "aggressive";
export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface UserStats {
  xp: number;
  rank: string;
  streak: number;
  gold: number;
  str: number;
  sta: number;
  agi: number;
  int_stat: number;
  cha: number;
  rep: number;
}

export interface UserPreferences {
  wake_time: string;
  sleep_time: string;
  work_start: string;
  work_end: string;
  fitness_level: FitnessLevel;
  preferred_workout_time: TimeOfDay;
  workout_duration_preference: number;
  daily_call_target: number;
  daily_text_target: number;
  prospecting_hours: number;
  networking_comfort: "low" | "moderate" | "high";
  content_creation_frequency: "daily" | "weekly" | "occasional";
  coaching_intensity: CoachingIntensity;
  include_motivational_messages: boolean;
}

export interface UserHistory {
  recentLogs: DailyLogSummary[];
  completionRate: number;
  averageSteps: number;
  averageCalls: number;
  averageTexts: number;
  averageConvos: number;
  averageAppts: number;
  averageLearningMinutes: number;
  workoutFrequency: number; // percentage of days with workout
  contentFrequency: number; // percentage of days with content
}

export interface DailyLogSummary {
  date: string;
  steps: number;
  workout_done: boolean;
  learning_minutes: number;
  calls: number;
  texts: number;
  convos: number;
  leads: number;
  appts: number;
  content_done: boolean;
}

export interface GeneratedTask {
  pillar: Pillar;
  title: string;
  description: string;
  action: string;
  timing: string;
  duration_minutes: number;
  why_it_matters: string;
  priority: number;
  sequence_order: number;
  xp_reward: number;
  stat_rewards: Record<string, number>;
}

export interface CoachContext {
  userId: string;
  cohortId: number;
  date: string;
  stats: UserStats;
  preferences: UserPreferences;
  history: UserHistory;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isWeekend: boolean;
}

export interface Coach {
  pillar: Pillar;
  name: string;
  emoji: string;
  generateTasks(context: CoachContext): GeneratedTask[];
}

// Default preferences for new users
export const DEFAULT_PREFERENCES: UserPreferences = {
  wake_time: "06:00",
  sleep_time: "22:00",
  work_start: "09:00",
  work_end: "17:00",
  fitness_level: "intermediate",
  preferred_workout_time: "morning",
  workout_duration_preference: 45,
  daily_call_target: 20,
  daily_text_target: 50,
  prospecting_hours: 3,
  networking_comfort: "moderate",
  content_creation_frequency: "daily",
  coaching_intensity: "balanced",
  include_motivational_messages: true,
};

// Rank thresholds for adaptive difficulty
export const RANK_THRESHOLDS = {
  E: { min: 0, multiplier: 0.8 },
  D: { min: 500, multiplier: 0.9 },
  C: { min: 1500, multiplier: 1.0 },
  B: { min: 3000, multiplier: 1.1 },
  A: { min: 5000, multiplier: 1.2 },
  S: { min: 7500, multiplier: 1.3 },
};

