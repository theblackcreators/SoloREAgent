import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuditLogs } from "@/lib/auditLog";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

async function isAdminOrCoach(userId: string, programId: number): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("cohort_memberships")
    .select("role, cohorts!inner(program_id)")
    .eq("user_id", userId)
    .in("role", ["admin", "coach"]);
  
  if (!data || data.length === 0) return false;
  return data.some((m: any) => m.cohorts?.program_id === programId);
}

/**
 * GET /api/admin/audit-logs - Get audit logs for a program
 */
export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const programId = url.searchParams.get("programId");
  const cohortId = url.searchParams.get("cohortId");
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entityType");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");

  if (!programId) {
    return NextResponse.json({ error: "Missing programId" }, { status: 400 });
  }

  const pid = Number(programId);

  // Verify admin/coach access
  const hasAccess = await isAdminOrCoach(userId, pid);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { logs, total } = await getAuditLogs({
      programId: pid,
      cohortId: cohortId ? Number(cohortId) : undefined,
      action: action as any,
      entityType: entityType as any,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });

    return NextResponse.json({
      ok: true,
      logs,
      total,
      hasMore: (Number(offset) || 0) + logs.length < total,
    });
  } catch (error: any) {
    console.error("Audit logs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

