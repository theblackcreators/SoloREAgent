import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAuditEvent, getRequestMetadata } from "@/lib/auditLog";

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

// GET /api/admin/quest-templates - List quest templates for a program
export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("programId");

  if (!programId) {
    return NextResponse.json({ error: "Missing programId" }, { status: 400 });
  }

  const pid = Number(programId);

  // Verify admin/coach access
  const hasAccess = await isAdminOrCoach(userId, pid);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("quest_templates")
    .select("*")
    .eq("program_id", pid)
    .order("quest_type")
    .order("title");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, templates: data });
}

// POST /api/admin/quest-templates - Create a new quest template
export async function POST(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { programId, title, description, questType, xpReward, completionRule, active } = body;

  if (!programId || !title || !questType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const pid = Number(programId);
  const hasAccess = await isAdminOrCoach(userId, pid);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("quest_templates")
    .insert({
      program_id: pid,
      title,
      description: description || null,
      quest_type: questType,
      xp_reward: xpReward || 0,
      completion_rule: completionRule || {},
      active: active !== false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit event
  const metadata = getRequestMetadata(req);
  await logAuditEvent({
    userId,
    programId: pid,
    action: "create",
    entityType: "quest_template",
    entityId: data.id,
    entityName: data.title,
    newValues: data,
    ...metadata,
  });

  return NextResponse.json({ ok: true, template: data });
}

// PATCH /api/admin/quest-templates - Update a quest template
export async function PATCH(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, programId, title, description, questType, xpReward, completionRule, active } = body;

  if (!id || !programId) {
    return NextResponse.json({ error: "Missing id or programId" }, { status: 400 });
  }

  const pid = Number(programId);
  const hasAccess = await isAdminOrCoach(userId, pid);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (questType !== undefined) updates.quest_type = questType;
  if (xpReward !== undefined) updates.xp_reward = xpReward;
  if (completionRule !== undefined) updates.completion_rule = completionRule;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabaseAdmin
    .from("quest_templates")
    .update(updates)
    .eq("id", id)
    .eq("program_id", pid)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit event
  const metadata = getRequestMetadata(req);
  await logAuditEvent({
    userId,
    programId: pid,
    action: "update",
    entityType: "quest_template",
    entityId: data.id,
    entityName: data.title,
    newValues: updates,
    ...metadata,
  });

  return NextResponse.json({ ok: true, template: data });
}

// DELETE /api/admin/quest-templates - Delete a quest template
export async function DELETE(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const programId = searchParams.get("programId");

  if (!id || !programId) {
    return NextResponse.json({ error: "Missing id or programId" }, { status: 400 });
  }

  const pid = Number(programId);
  const hasAccess = await isAdminOrCoach(userId, pid);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get template before deleting for audit log
  const { data: template } = await supabaseAdmin
    .from("quest_templates")
    .select("*")
    .eq("id", Number(id))
    .single();

  const { error } = await supabaseAdmin
    .from("quest_templates")
    .delete()
    .eq("id", Number(id))
    .eq("program_id", pid);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit event
  const metadata = getRequestMetadata(req);
  await logAuditEvent({
    userId,
    programId: pid,
    action: "delete",
    entityType: "quest_template",
    entityId: id,
    entityName: template?.title,
    oldValues: template,
    ...metadata,
  });

  return NextResponse.json({ ok: true });
}

