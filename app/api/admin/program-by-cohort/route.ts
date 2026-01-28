import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohortId");

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

  // Get cohort with program info
  const { data: cohort, error } = await supabaseAdmin
    .from("cohorts")
    .select("id, name, program_id")
    .eq("id", cid)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, cohort });
}

