import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

// GET /api/notifications - Get user's notifications
export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohortId");
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", Number(cohortId))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count unread
  const { count: unreadCount } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("cohort_id", Number(cohortId))
    .eq("read", false);

  return NextResponse.json({
    notifications: data || [],
    unreadCount: unreadCount || 0,
  });
}

// PATCH /api/notifications - Mark notification(s) as read
export async function PATCH(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { notificationId, markAllRead, cohortId } = body;

  if (markAllRead && cohortId) {
    // Mark all notifications as read for this cohort
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("cohort_id", Number(cohortId))
      .eq("read", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, markedAllRead: true });
  }

  if (notificationId) {
    // Mark single notification as read
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", Number(notificationId))
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, notificationId });
  }

  return NextResponse.json(
    { error: "Missing notificationId or markAllRead with cohortId" },
    { status: 400 }
  );
}

