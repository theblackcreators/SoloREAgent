import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

function generateInviteCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cohortId, role = "agent", maxUses = null, expiresAt = null } = body;

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);

  // Verify user is admin of this cohort
  const { data: membership } = await supabaseAdmin
    .from("cohort_memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("cohort_id", cid)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json(
      { error: "Must be admin of this cohort" },
      { status: 403 }
    );
  }

  // Generate unique code
  let code = generateInviteCode();
  let attempts = 0;

  while (attempts < 10) {
    const { data: existing } = await supabaseAdmin
      .from("cohort_invites")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (!existing) break;
    code = generateInviteCode();
    attempts++;
  }

  // Create invite
  const { data: invite, error } = await supabaseAdmin
    .from("cohort_invites")
    .insert({
      cohort_id: cid,
      code,
      role,
      max_uses: maxUses,
      expires_at: expiresAt,
      created_by: userId,
      active: true,
      uses: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, invite });
}

