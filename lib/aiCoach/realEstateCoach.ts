/**
 * Real Estate Coach - Generates personalized business tasks
 * Covers: Prospecting calls, follow-ups, content creation, lead generation
 */

import { Coach, CoachContext, GeneratedTask, RANK_THRESHOLDS } from "./types";

// Prospecting scripts by intensity
const PROSPECTING_SCRIPTS = {
  gentle: [
    "Call 10 past clients to check in and ask for referrals",
    "Send 20 personalized texts to your sphere of influence",
    "Reach out to 5 FSBOs with a helpful market update",
  ],
  balanced: [
    "Make 20 prospecting calls: 10 expired listings, 10 FSBOs",
    "Send 40 texts: 20 follow-ups, 20 new contacts",
    "Door knock 15 homes in your farm area",
  ],
  aggressive: [
    "Power dial 50 contacts: expireds, FSBOs, and circle prospecting",
    "Send 75 texts with personalized market insights",
    "Door knock 30 homes and leave 20 door hangers",
  ],
};

const FOLLOW_UP_TASKS = [
  { action: "Follow up with all leads from the past 48 hours", priority: 1 },
  { action: "Send market updates to your top 10 hottest leads", priority: 1 },
  { action: "Schedule 3 listing presentations for this week", priority: 2 },
  { action: "Check in with pending transaction clients", priority: 2 },
  { action: "Reconnect with 5 past clients you haven't spoken to in 90+ days", priority: 3 },
];

const CONTENT_IDEAS = [
  { type: "Video", action: "Record a 60-second market update video for social media" },
  { type: "Post", action: "Create a 'Just Listed' or 'Just Sold' post with professional photos" },
  { type: "Story", action: "Share 3 Instagram/Facebook stories showing your day as an agent" },
  { type: "Email", action: "Send your weekly newsletter to your database" },
  { type: "Blog", action: "Write a 500-word blog post about local market trends" },
];

const LEAD_GEN_ACTIVITIES = [
  { name: "Open House Prep", action: "Prepare materials and promote an upcoming open house", duration: 45 },
  { name: "Database Mining", action: "Review your CRM and identify 20 contacts due for follow-up", duration: 30 },
  { name: "Referral Asks", action: "Ask 5 happy past clients for referrals today", duration: 20 },
  { name: "Networking Event", action: "Attend a local business networking event", duration: 90 },
  { name: "Community Involvement", action: "Volunteer or attend a community event to build presence", duration: 120 },
];

export const realEstateCoach: Coach = {
  pillar: "real_estate",
  name: "Coach Closer",
  emoji: "🏠",

  generateTasks(context: CoachContext): GeneratedTask[] {
    const tasks: GeneratedTask[] = [];
    const { preferences, history, stats, isWeekend, dayOfWeek } = context;
    const intensity = preferences.coaching_intensity;
    const rankMultiplier = RANK_THRESHOLDS[stats.rank as keyof typeof RANK_THRESHOLDS]?.multiplier || 1;

    // Adjust targets based on history and rank
    const callTarget = Math.round(preferences.daily_call_target * rankMultiplier);
    const textTarget = Math.round(preferences.daily_text_target * rankMultiplier);

    // Task 1: Morning Prospecting Block (highest priority)
    const prospectingScript = PROSPECTING_SCRIPTS[intensity][Math.floor(Math.random() * 3)];
    
    tasks.push({
      pillar: "real_estate",
      title: "📞 Power Hour: Prospecting",
      description: `${intensity === "aggressive" ? "Aggressive" : intensity === "gentle" ? "Warm" : "Focused"} prospecting session`,
      action: prospectingScript,
      timing: `${preferences.work_start} - ${parseInt(preferences.work_start) + 2}:00`,
      duration_minutes: preferences.prospecting_hours * 60,
      why_it_matters: "Prospecting is the #1 activity that directly leads to listings and sales",
      priority: 1,
      sequence_order: 0,
      xp_reward: Math.round(15 * rankMultiplier),
      stat_rewards: { cha: 2, rep: 1 },
    });

    // Task 2: Follow-up Task
    const followUp = FOLLOW_UP_TASKS[Math.floor(Math.random() * FOLLOW_UP_TASKS.length)];
    
    tasks.push({
      pillar: "real_estate",
      title: "🔄 Follow-Up Focus",
      description: "Fortune is in the follow-up",
      action: followUp.action,
      timing: "11:00 AM",
      duration_minutes: 30,
      why_it_matters: "80% of sales require 5+ follow-ups. Most agents give up after 2.",
      priority: followUp.priority,
      sequence_order: 1,
      xp_reward: 10,
      stat_rewards: { cha: 1 },
    });

    // Task 3: Content Creation (if enabled)
    if (preferences.content_creation_frequency === "daily" || 
        (preferences.content_creation_frequency === "weekly" && dayOfWeek === 1)) {
      const content = CONTENT_IDEAS[Math.floor(Math.random() * CONTENT_IDEAS.length)];
      
      tasks.push({
        pillar: "real_estate",
        title: `📱 Content: ${content.type}`,
        description: "Build your brand and attract inbound leads",
        action: content.action,
        timing: "2:00 PM",
        duration_minutes: 30,
        why_it_matters: "Consistent content builds trust and keeps you top-of-mind with your sphere",
        priority: 2,
        sequence_order: 2,
        xp_reward: 10,
        stat_rewards: { rep: 2 },
      });
    }

    // Task 4: Lead Generation Activity (varies by day)
    const leadGen = LEAD_GEN_ACTIVITIES[dayOfWeek % LEAD_GEN_ACTIVITIES.length];
    
    tasks.push({
      pillar: "real_estate",
      title: `🎯 Lead Gen: ${leadGen.name}`,
      description: "Proactive lead generation activity",
      action: leadGen.action,
      timing: isWeekend ? "10:00 AM" : "4:00 PM",
      duration_minutes: leadGen.duration,
      why_it_matters: "Diversified lead sources create a stable, predictable business",
      priority: 2,
      sequence_order: 3,
      xp_reward: Math.round(10 * rankMultiplier),
      stat_rewards: { cha: 1, rep: 1 },
    });

    // Task 5: Daily Metrics Check
    tasks.push({
      pillar: "real_estate",
      title: "📊 Log Your Numbers",
      description: "Track your daily activities in the app",
      action: `Log today's activities: Calls (target: ${callTarget}), Texts (target: ${textTarget}), Conversations, Appointments`,
      timing: "End of day",
      duration_minutes: 5,
      why_it_matters: "What gets measured gets managed. Track to improve.",
      priority: 3,
      sequence_order: 4,
      xp_reward: 5,
      stat_rewards: {},
    });

    return tasks;
  },
};

