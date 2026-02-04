/**
 * Fitness Coach - Generates personalized fitness tasks
 * Covers: Workouts, step goals, meal prep, recovery activities
 */

import { Coach, CoachContext, GeneratedTask, RANK_THRESHOLDS } from "./types";

// Workout templates by fitness level
const WORKOUTS = {
  beginner: [
    { name: "20-min Walk", duration: 20, action: "Take a brisk 20-minute walk around your neighborhood" },
    { name: "Bodyweight Basics", duration: 25, action: "Complete 3 sets of: 10 squats, 10 push-ups (modified ok), 10 lunges" },
    { name: "Stretching Session", duration: 15, action: "Follow a 15-minute full-body stretching routine" },
    { name: "Light Cardio", duration: 20, action: "Do 20 minutes of light cardio: jumping jacks, marching in place, arm circles" },
  ],
  intermediate: [
    { name: "HIIT Circuit", duration: 30, action: "Complete 4 rounds: 30s burpees, 30s mountain climbers, 30s jump squats, 30s rest" },
    { name: "Strength Training", duration: 45, action: "Upper body: 4x12 push-ups, 4x12 dumbbell rows, 4x12 shoulder press, 3x15 tricep dips" },
    { name: "Cardio Blast", duration: 35, action: "Run/jog for 35 minutes at moderate intensity (conversational pace)" },
    { name: "Core Crusher", duration: 25, action: "Complete: 3x20 crunches, 3x30s plank, 3x15 leg raises, 3x20 Russian twists" },
  ],
  advanced: [
    { name: "Power HIIT", duration: 45, action: "6 rounds: 45s box jumps, 45s burpee pull-ups, 45s kettlebell swings, 30s rest" },
    { name: "Heavy Lifting", duration: 60, action: "Compound lifts: 5x5 deadlifts, 5x5 squats, 5x5 bench press, 4x8 rows" },
    { name: "Endurance Run", duration: 50, action: "Run 5-6 miles at tempo pace with 2 sprint intervals" },
    { name: "Full Body Burn", duration: 50, action: "Circuit: 5 rounds of 15 each - thrusters, pull-ups, box jumps, KB swings, burpees" },
  ],
};

const STEP_GOALS = {
  beginner: { base: 5000, stretch: 7000 },
  intermediate: { base: 7000, stretch: 10000 },
  advanced: { base: 10000, stretch: 15000 },
};

const RECOVERY_ACTIVITIES = [
  { name: "Foam Rolling", duration: 15, action: "Spend 15 minutes foam rolling major muscle groups" },
  { name: "Yoga Flow", duration: 20, action: "Complete a 20-minute gentle yoga flow for recovery" },
  { name: "Cold Shower", duration: 5, action: "End your shower with 2-3 minutes of cold water for recovery" },
  { name: "Mobility Work", duration: 15, action: "Do 15 minutes of hip, shoulder, and ankle mobility exercises" },
];

export const fitnessCoach: Coach = {
  pillar: "fitness",
  name: "Coach Flex",
  emoji: "💪",

  generateTasks(context: CoachContext): GeneratedTask[] {
    const tasks: GeneratedTask[] = [];
    const { preferences, history, stats, isWeekend, dayOfWeek } = context;
    const level = preferences.fitness_level;
    const rankMultiplier = RANK_THRESHOLDS[stats.rank as keyof typeof RANK_THRESHOLDS]?.multiplier || 1;

    // Determine workout timing
    const workoutTime = preferences.preferred_workout_time === "morning" ? "6:30 AM" :
                        preferences.preferred_workout_time === "afternoon" ? "12:00 PM" : "6:00 PM";

    // Task 1: Primary Workout (not on rest days - Sunday or if streak is high)
    const needsRestDay = dayOfWeek === 0 || (context.stats.streak > 0 && context.stats.streak % 7 === 0);
    
    if (!needsRestDay) {
      const workouts = WORKOUTS[level];
      const workout = workouts[Math.floor(Math.random() * workouts.length)];
      
      tasks.push({
        pillar: "fitness",
        title: `🏋️ ${workout.name}`,
        description: `Your ${level} level workout for today`,
        action: workout.action,
        timing: workoutTime,
        duration_minutes: workout.duration,
        why_it_matters: "Consistent workouts build STR and STA stats, boosting your agent performance",
        priority: 1,
        sequence_order: 0,
        xp_reward: Math.round(10 * rankMultiplier),
        stat_rewards: { str: 1, sta: 1 },
      });
    } else {
      // Rest day - recovery activity
      const recovery = RECOVERY_ACTIVITIES[Math.floor(Math.random() * RECOVERY_ACTIVITIES.length)];
      tasks.push({
        pillar: "fitness",
        title: `🧘 Recovery: ${recovery.name}`,
        description: "Active recovery day - your body needs this to grow stronger",
        action: recovery.action,
        timing: "Anytime",
        duration_minutes: recovery.duration,
        why_it_matters: "Recovery is when your muscles actually grow. Rest days = gains days!",
        priority: 2,
        sequence_order: 0,
        xp_reward: 5,
        stat_rewards: { sta: 1 },
      });
    }

    // Task 2: Step Goal
    const stepGoal = STEP_GOALS[level];
    const targetSteps = history.averageSteps > stepGoal.base 
      ? Math.min(Math.round(history.averageSteps * 1.1), stepGoal.stretch)
      : stepGoal.base;

    tasks.push({
      pillar: "fitness",
      title: `👟 Walk ${targetSteps.toLocaleString()} Steps`,
      description: `Daily movement goal based on your ${level} fitness level`,
      action: `Accumulate ${targetSteps.toLocaleString()} steps throughout the day. Park farther, take stairs, walk during calls.`,
      timing: "Throughout the day",
      duration_minutes: Math.round(targetSteps / 100), // ~100 steps per minute
      why_it_matters: "Walking boosts energy, clears your mind for client calls, and builds STA",
      priority: 1,
      sequence_order: 1,
      xp_reward: 5,
      stat_rewards: { sta: 1 },
    });

    // Task 3: Hydration (always important)
    tasks.push({
      pillar: "fitness",
      title: "💧 Drink 8 Glasses of Water",
      description: "Stay hydrated for peak mental and physical performance",
      action: "Drink at least 64oz (8 glasses) of water. Set hourly reminders if needed.",
      timing: "Throughout the day",
      duration_minutes: 0,
      why_it_matters: "Dehydration kills focus and energy - stay sharp for your clients",
      priority: 3,
      sequence_order: 2,
      xp_reward: 3,
      stat_rewards: {},
    });

    return tasks;
  },
};

