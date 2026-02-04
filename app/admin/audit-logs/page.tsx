"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface AuditLog {
  id: number;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-900/50 text-green-300",
  update: "bg-blue-900/50 text-blue-300",
  delete: "bg-red-900/50 text-red-300",
  invite: "bg-purple-900/50 text-purple-300",
  activate: "bg-emerald-900/50 text-emerald-300",
  deactivate: "bg-orange-900/50 text-orange-300",
};

const ACTION_ICONS: Record<string, string> = {
  create: "➕",
  update: "✏️",
  delete: "🗑️",
  invite: "📧",
  activate: "✅",
  deactivate: "⏸️",
};

const ENTITY_ICONS: Record<string, string> = {
  quest_template: "📜",
  location: "📍",
  invite: "📧",
  resource: "📚",
  shop_item: "🛒",
  user: "👤",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Get program ID from cohort
      const cohortId = localStorage.getItem("activeCohortId");
      if (!cohortId) return;

      const cohortRes = await fetch(`/api/admin/program-by-cohort?cohortId=${cohortId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const cohortData = await cohortRes.json();
      if (!cohortData.programId) return;

      let url = `/api/admin/audit-logs?programId=${cohortData.programId}&limit=${pageSize}&offset=${page * pageSize}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      if (entityFilter) url += `&entityType=${entityFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }

  function formatEntityType(type: string) {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/quests" className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold">📋 Audit Logs</h1>
            <p className="text-zinc-400">Track all admin actions and changes</p>
          </div>
          <div className="text-zinc-400">
            Total: {total} entries
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="invite">Invite</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Entities</option>
            <option value="quest_template">Quest Templates</option>
            <option value="location">Locations</option>
            <option value="resource">Resources</option>
            <option value="shop_item">Shop Items</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-zinc-400">Loading audit logs...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">No Audit Logs Found</h3>
            <p className="text-zinc-400">Admin actions will appear here when changes are made.</p>
          </div>
        )}

        {/* Logs Table */}
        {!loading && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-zinc-800/50 transition"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Action Badge */}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${ACTION_COLORS[log.action] || "bg-zinc-800 text-zinc-300"}`}>
                        {ACTION_ICONS[log.action] || "•"} {log.action}
                      </span>

                      {/* Entity Info */}
                      <div>
                        <span className="text-zinc-400 mr-2">
                          {ENTITY_ICONS[log.entity_type] || "📄"}
                        </span>
                        <span className="font-medium">{formatEntityType(log.entity_type)}</span>
                        {log.entity_name && (
                          <span className="text-purple-400 ml-2">"{log.entity_name}"</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span title={log.user_email}>{log.user_email?.split("@")[0] || "Unknown"}</span>
                      <span>{formatDate(log.created_at)}</span>
                      <span className="text-xs">{expandedLog === log.id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedLog === log.id && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-950/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="text-zinc-400 mb-2 font-medium">Details</h4>
                        <div className="space-y-1">
                          <p><span className="text-zinc-500">User:</span> {log.user_email}</p>
                          <p><span className="text-zinc-500">Entity ID:</span> {log.entity_id || "N/A"}</p>
                          <p><span className="text-zinc-500">IP Address:</span> {log.ip_address || "N/A"}</p>
                        </div>
                      </div>

                      {(log.old_values || log.new_values) && (
                        <div>
                          <h4 className="text-zinc-400 mb-2 font-medium">Changes</h4>
                          {log.old_values && (
                            <div className="mb-2">
                              <span className="text-red-400 text-xs font-medium">OLD:</span>
                              <pre className="text-xs bg-zinc-900 p-2 rounded mt-1 overflow-auto max-h-32">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <span className="text-green-400 text-xs font-medium">NEW:</span>
                              <pre className="text-xs bg-zinc-900 p-2 rounded mt-1 overflow-auto max-h-32">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-800">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-zinc-400">
              Page {page + 1} of {Math.ceil(total / pageSize)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * pageSize >= total}
              className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

