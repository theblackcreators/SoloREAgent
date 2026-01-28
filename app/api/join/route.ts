import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function POST(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, displayName, email } = body;

  if (!code) {
    return NextResponse.json({ error: "Missing invite code" }, { status: 400 });
  }

  // 1) Find invite
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from("cohort_invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (inviteErr || !invite) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  // 2) Validate invite
  if (!invite.active) {
    return NextResponse.json({ error: "Invite is inactive" }, { status: 400 });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  if (invite.max_uses && invite.uses >= invite.max_uses) {
    return NextResponse.json(
      { error: "Invite has reached max uses" },
      { status: 400 }
    );
  }

  // 3) Check if already a member
  const { data: existing } = await supabaseAdmin
    .from("cohort_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("cohort_id", invite.cohort_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Already a member of this cohort" },
      { status: 400 }
    );
  }

  // 4) Upsert profile (optional)
  if (displayName || email) {
    await supabaseAdmin.from("profiles").upsert(
      {
        user_id: userId,
        display_name: displayName || null,
        email: email || null,
      },
      { onConflict: "user_id" }
    );
  }

  // 5) Create membership
  const { error: memberErr } = await supabaseAdmin
    .from("cohort_memberships")
    .insert({
      user_id: userId,
      cohort_id: invite.cohort_id,
      role: invite.role || "agent",
      joined_at: new Date().toISOString(),
    });

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 400 });
  }

  // 6) Initialize member stats
  const { error: statsErr } = await supabaseAdmin
    .from("member_stats")
    .insert({
      user_id: userId,
      cohort_id: invite.cohort_id,
      xp: 0,
      rank: "E",
      streak: 0,
      str: 0,
      sta: 0,
      agi: 0,
      int_stat: 0,
      cha: 0,
      rep: 0,
      gold: 0,
    });

  if (statsErr) {
    return NextResponse.json({ error: statsErr.message }, { status: 400 });
  }

  // 7) Record redemption and increment uses
  await supabaseAdmin
    .from("cohort_invites")
    .update({
      uses: (invite.uses || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  return NextResponse.json({
    ok: true,
    cohortId: invite.cohort_id,
    role: invite.role || "agent",
  });
}

