/**
 * Social Coach - Generates personalized networking and relationship tasks
 * Covers: Networking events, relationship-building, community engagement
 */

import { Coach, CoachContext, GeneratedTask, RANK_THRESHOLDS } from "./types";

// Networking activities by comfort level
const NETWORKING_ACTIVITIES = {
  low: [
    { name: "Coffee Chat", action: "Schedule a 1-on-1 coffee meeting with someone in your network", duration: 45 },
    { name: "LinkedIn Engagement", action: "Comment thoughtfully on 10 posts from your connections", duration: 20 },
    { name: "Thank You Notes", action: "Send 3 handwritten thank you notes to recent contacts", duration: 20 },
    { name: "Virtual Meetup", action: "Join an online industry webinar or virtual networking event", duration: 60 },
  ],
  moderate: [
    { name: "Lunch Meeting", action: "Take a potential referral partner to lunch", duration: 75 },
    { name: "Industry Event", action: "Attend a local real estate or business networking event", duration: 120 },
    { name: "Referral Partner Check-in", action: "Call 5 referral partners (lenders, title, inspectors)", duration: 30 },
    { name: "Community Group", action: "Attend a local community group meeting (Rotary, Chamber, etc.)", duration: 90 },
  ],
  high: [
    { name: "Host Event", action: "Host a client appreciation event or educational seminar", duration: 180 },
    { name: "Speaking Opportunity", action: "Reach out to 3 organizations about speaking opportunities", duration: 30 },
    { name: "Strategic Partnership", action: "Meet with a potential strategic partner to discuss collaboration", duration: 60 },
    { name: "Mastermind Group", action: "Attend or organize a mastermind session with top agents", duration: 120 },
  ],
};

const RELATIONSHIP_BUILDING = [
  { action: "Send a birthday or anniversary message to 3 people in your database", priority: 2 },
  { action: "Share a helpful article with 5 contacts who would find it valuable", priority: 3 },
  { action: "Introduce two people in your network who should know each other", priority: 2 },
  { action: "Leave a positive review for a local business you've used", priority: 3 },
  { action: "Congratulate someone on a recent achievement you saw on social media", priority: 3 },
];

const COMMUNITY_ENGAGEMENT = [
  { name: "Local Business Support", action: "Visit and support 3 local businesses, share on social media" },
  { name: "Volunteer Work", action: "Spend 2 hours volunteering for a local charity or cause" },
  { name: "Neighborhood Walk", action: "Walk your farm area and introduce yourself to 10 neighbors" },
  { name: "Community Event", action: "Attend a local community event (farmers market, festival, etc.)" },
  { name: "School/Sports Support", action: "Attend a local school or youth sports event" },
];

const LEARNING_ACTIVITIES = [
  { name: "Industry Podcast", action: "Listen to a real estate podcast during your commute or workout", duration: 30 },
  { name: "Book Reading", action: "Read 20 pages of a business or personal development book", duration: 25 },
  { name: "Online Course", action: "Complete one module of an online real estate course", duration: 30 },
  { name: "Market Research", action: "Study 10 recent sales in your farm area", duration: 20 },
  { name: "Script Practice", action: "Practice your listing presentation or objection handling scripts", duration: 20 },
];

export const socialCoach: Coach = {
  pillar: "social",
  name: "Coach Connect",
  emoji: "🤝",

  generateTasks(context: CoachContext): GeneratedTask[] {
    const tasks: GeneratedTask[] = [];
    const { preferences, history, stats, isWeekend, dayOfWeek } = context;
    const comfort = preferences.networking_comfort;
    const rankMultiplier = RANK_THRESHOLDS[stats.rank as keyof typeof RANK_THRESHOLDS]?.multiplier || 1;

    // Task 1: Daily Learning (morning routine)
    const learning = LEARNING_ACTIVITIES[dayOfWeek % LEARNING_ACTIVITIES.length];
    
    tasks.push({
      pillar: "social",
      title: `📚 Learn: ${learning.name}`,
      description: "Invest in yourself with daily learning",
      action: learning.action,
      timing: preferences.wake_time,
      duration_minutes: learning.duration,
      why_it_matters: "Top agents never stop learning. Knowledge compounds over time.",
      priority: 2,
      sequence_order: 0,
      xp_reward: 5,
      stat_rewards: { int_stat: 1 },
    });

    // Task 2: Relationship Building (daily)
    const relationship = RELATIONSHIP_BUILDING[Math.floor(Math.random() * RELATIONSHIP_BUILDING.length)];
    
    tasks.push({
      pillar: "social",
      title: "💝 Relationship Touch",
      description: "Nurture your network with genuine connection",
      action: relationship.action,
      timing: "10:00 AM",
      duration_minutes: 15,
      why_it_matters: "Your network is your net worth. Small touches build lasting relationships.",
      priority: relationship.priority,
      sequence_order: 1,
      xp_reward: 5,
      stat_rewards: { cha: 1 },
    });

    // Task 3: Networking Activity (based on comfort level and day)
    // More intensive networking on certain days
    const isNetworkingDay = dayOfWeek === 2 || dayOfWeek === 4 || isWeekend;
    
    if (isNetworkingDay) {
      const activities = NETWORKING_ACTIVITIES[comfort];
      const activity = activities[Math.floor(Math.random() * activities.length)];
      
      tasks.push({
        pillar: "social",
        title: `🌐 Network: ${activity.name}`,
        description: `${comfort === "high" ? "High-impact" : comfort === "low" ? "Comfortable" : "Balanced"} networking activity`,
        action: activity.action,
        timing: isWeekend ? "11:00 AM" : "5:30 PM",
        duration_minutes: activity.duration,
        why_it_matters: "Every connection is a potential client, referral, or opportunity",
        priority: 2,
        sequence_order: 2,
        xp_reward: Math.round(10 * rankMultiplier),
        stat_rewards: { cha: 2, rep: 1 },
      });
    }

    // Task 4: Community Engagement (weekends or specific days)
    if (isWeekend || dayOfWeek === 3) {
      const community = COMMUNITY_ENGAGEMENT[Math.floor(Math.random() * COMMUNITY_ENGAGEMENT.length)];
      
      tasks.push({
        pillar: "social",
        title: `🏘️ Community: ${community.name}`,
        description: "Be visible and valuable in your community",
        action: community.action,
        timing: isWeekend ? "9:00 AM" : "After work",
        duration_minutes: 60,
        why_it_matters: "Community involvement builds trust and positions you as the local expert",
        priority: 3,
        sequence_order: 3,
        xp_reward: 10,
        stat_rewards: { rep: 2 },
      });
    }

    // Task 5: Gratitude/Mindset (end of day)
    tasks.push({
      pillar: "social",
      title: "🙏 Evening Reflection",
      description: "End the day with gratitude and planning",
      action: "Write down 3 wins from today and 3 priorities for tomorrow",
      timing: preferences.sleep_time.replace(/(\d+):/, (_, h) => `${parseInt(h) - 1}:`),
      duration_minutes: 10,
      why_it_matters: "Reflection builds self-awareness and keeps you focused on what matters",
      priority: 3,
      sequence_order: 4,
      xp_reward: 3,
      stat_rewards: { int_stat: 1 },
    });

    return tasks;
  },
};

