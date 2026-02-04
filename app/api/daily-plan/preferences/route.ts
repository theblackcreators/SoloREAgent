import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_PREFERENCES } from "@/lib/aiCoach";

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ?? null;
}

/**
 * GET /api/daily-plan/preferences - Get user's AI coaching preferences
 */
export async function GET(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const cohortId = url.searchParams.get("cohortId");

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);

  try {
    const { data: prefs, error } = await supabaseAdmin
      .from("ai_user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .eq("cohort_id", cid)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    // Return existing prefs or defaults
    return NextResponse.json({
      ok: true,
      preferences: prefs || {
        ...DEFAULT_PREFERENCES,
        user_id: user.id,
        cohort_id: cid,
      },
      isDefault: !prefs,
    });
  } catch (error: any) {
    console.error("Get preferences error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/daily-plan/preferences - Update user's AI coaching preferences
 */
export async function PUT(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { cohortId, ...preferences } = body;

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);

  // Validate preferences
  const validFields = [
    "wake_time",
    "sleep_time",
    "work_start",
    "work_end",
    "fitness_level",
    "preferred_workout_time",
    "workout_duration_preference",
    "daily_call_target",
    "daily_text_target",
    "prospecting_hours",
    "networking_comfort",
    "content_creation_frequency",
    "coaching_intensity",
    "include_motivational_messages",
  ];

  const updates: Record<string, any> = {};
  for (const field of validFields) {
    if (preferences[field] !== undefined) {
      updates[field] = preferences[field];
    }
  }

  try {
    // Upsert preferences
    const { data, error } = await supabaseAdmin
      .from("ai_user_preferences")
      .upsert(
        {
          user_id: user.id,
          cohort_id: cid,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,cohort_id",
        }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      preferences: data,
    });
  } catch (error: any) {
    console.error("Update preferences error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

