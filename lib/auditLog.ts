/**
 * Audit Logging Utility
 * Tracks admin actions for accountability
 */

import { supabaseAdmin } from "./supabaseAdmin";

export type AuditAction = "create" | "update" | "delete" | "login" | "invite" | "approve" | "reject" | "activate" | "deactivate";

export type EntityType = 
  | "quest_template"
  | "location"
  | "invite"
  | "resource"
  | "shop_item"
  | "cohort"
  | "program"
  | "user"
  | "achievement"
  | "membership";

export interface AuditLogEntry {
  userId: string;
  userEmail?: string;
  programId?: number;
  cohortId?: number;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string | number;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      user_id: entry.userId,
      user_email: entry.userEmail,
      program_id: entry.programId,
      cohort_id: entry.cohortId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId?.toString(),
      entity_name: entry.entityName,
      old_values: entry.oldValues,
      new_values: entry.newValues,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
    });

    if (error) {
      console.error("Failed to log audit event:", error);
    }
  } catch (err) {
    console.error("Audit logging error:", err);
  }
}

/**
 * Helper to extract request metadata
 */
export function getRequestMetadata(req: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  };
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(options: {
  programId?: number;
  cohortId?: number;
  userId?: string;
  action?: AuditAction;
  entityType?: EntityType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: any[]; total: number }> {
  let query = supabaseAdmin
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.programId) {
    query = query.eq("program_id", options.programId);
  }
  if (options.cohortId) {
    query = query.eq("cohort_id", options.cohortId);
  }
  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }
  if (options.action) {
    query = query.eq("action", options.action);
  }
  if (options.entityType) {
    query = query.eq("entity_type", options.entityType);
  }
  if (options.startDate) {
    query = query.gte("created_at", options.startDate);
  }
  if (options.endDate) {
    query = query.lte("created_at", options.endDate);
  }

  const limit = options.limit || 50;
  const offset = options.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch audit logs:", error);
    return { logs: [], total: 0 };
  }

  return { logs: data || [], total: count || 0 };
}

/**
 * Format audit action for display
 */
export function formatAuditAction(action: string, entityType: string): string {
  const actionLabels: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    login: "Logged in",
    invite: "Invited",
    approve: "Approved",
    reject: "Rejected",
    activate: "Activated",
    deactivate: "Deactivated",
  };

  const entityLabels: Record<string, string> = {
    quest_template: "Quest Template",
    location: "Location",
    invite: "Invite",
    resource: "Resource",
    shop_item: "Shop Item",
    cohort: "Cohort",
    program: "Program",
    user: "User",
    achievement: "Achievement",
    membership: "Membership",
  };

  return `${actionLabels[action] || action} ${entityLabels[entityType] || entityType}`;
}

