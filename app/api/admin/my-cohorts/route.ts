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

  // Get cohorts where user is admin
  const { data: memberships, error } = await supabaseAdmin
    .from("cohort_memberships")
    .select("cohort_id, cohorts(id, name)")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const cohorts = (memberships || []).map((m: any) => ({
    id: m.cohorts.id,
    name: m.cohorts.name,
  }));

  return NextResponse.json({ ok: true, cohorts });
}

