import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ?? null;
}

// GET /api/profile - Get current user's profile
export async function GET(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get cohort memberships
    const { data: memberships } = await supabaseAdmin
      .from("cohort_memberships")
      .select(`
        cohort_id,
        role,
        joined_at,
        cohorts (id, name, start_date, is_active)
      `)
      .eq("user_id", user.id);

    // Get stats for active cohort
    const activeCohortId = memberships?.[0]?.cohort_id;
    let stats = null;
    if (activeCohortId) {
      const { data: statsData } = await supabaseAdmin
        .from("member_stats")
        .select("xp, rank, streak, gold")
        .eq("user_id", user.id)
        .eq("cohort_id", activeCohortId)
        .single();
      stats = statsData;
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        emailConfirmedAt: user.email_confirmed_at,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
      },
      profile: profile || { display_name: null },
      memberships: memberships || [],
      stats,
    });
  } catch (error: any) {
    console.error("Profile error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/profile - Update user's profile
export async function PATCH(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { displayName } = body;

  try {
    // Upsert profile
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: user.id,
        display_name: displayName?.trim() || null,
        email: user.email,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, profile: data });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/profile/resend-verification - Resend email verification
export async function POST(req: Request) {
  // Apply strict rate limiting to email sending
  const rateLimited = applyRateLimit(req, RATE_LIMITS.strict, "resend-verification");
  if (rateLimited) return rateLimited;

  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.email_confirmed_at) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: user.email!,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, message: "Verification email sent" });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

