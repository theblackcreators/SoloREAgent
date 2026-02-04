import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type NotificationType = 
  | "streak_warning"
  | "streak_broken"
  | "quest_reminder"
  | "rank_up"
  | "achievement_unlocked"
  | "weekly_recap";

export type NotificationChannel = "email" | "in_app" | "push";

export interface Notification {
  id?: number;
  user_id: string;
  cohort_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  sent_at?: string;
  created_at?: string;
}

// Create an in-app notification
export async function createNotification(
  notification: Omit<Notification, "id" | "read" | "created_at">
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: notification.user_id,
    cohort_id: notification.cohort_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data || {},
    read: false,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Get unread notifications for a user
export async function getUnreadNotifications(
  userId: string,
  cohortId: number
): Promise<Notification[]> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [];
  return data || [];
}

// Mark notification as read
export async function markNotificationRead(
  notificationId: number,
  userId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return !error;
}

// Mark all notifications as read
export async function markAllNotificationsRead(
  userId: string,
  cohortId: number
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .eq("read", false);

  return !error;
}

// Check streak and create warning notification if needed
export async function checkStreakWarning(
  userId: string,
  cohortId: number,
  currentStreak: number
): Promise<void> {
  if (currentStreak >= 3 && currentStreak <= 7) {
    // User has a streak worth protecting
    await createNotification({
      user_id: userId,
      cohort_id: cohortId,
      type: "streak_warning",
      title: "🔥 Protect Your Streak!",
      message: `You have a ${currentStreak}-day streak! Complete today's quests to keep it going.`,
      data: { streak: currentStreak },
    });
  }
}

// Create rank up notification
export async function notifyRankUp(
  userId: string,
  cohortId: number,
  oldRank: string,
  newRank: string
): Promise<void> {
  await createNotification({
    user_id: userId,
    cohort_id: cohortId,
    type: "rank_up",
    title: "🎉 RANK UP!",
    message: `Congratulations! You've advanced from ${oldRank}-Rank to ${newRank}-Rank!`,
    data: { oldRank, newRank },
  });
}

// Create streak broken notification
export async function notifyStreakBroken(
  userId: string,
  cohortId: number,
  previousStreak: number
): Promise<void> {
  await createNotification({
    user_id: userId,
    cohort_id: cohortId,
    type: "streak_broken",
    title: "💔 Streak Lost",
    message: `Your ${previousStreak}-day streak has ended. Start fresh today!`,
    data: { previousStreak },
  });
}

