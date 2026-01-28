"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";

type Cohort = {
  id: number;
  name: string;
};

type Invite = {
  id: number;
  code: string;
  role: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

export default function AdminInvitesPage() {
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  
  // Form state
  const [role, setRole] = useState("agent");
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohortId) {
      loadInvites();
    }
  }, [selectedCohortId]);

  async function loadCohorts() {
    try {
      const res = await authedFetch("/api/admin/my-cohorts");
      const data = await res.json();

      if (data.ok) {
        setCohorts(data.cohorts);
        if (data.cohorts.length > 0) {
          setSelectedCohortId(data.cohorts[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading cohorts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvites() {
    if (!selectedCohortId) return;

    try {
      const res = await authedFetch(
        `/api/admin/list-invites?cohortId=${selectedCohortId}`
      );
      const data = await res.json();

      if (data.ok) {
        setInvites(data.invites);
      }
    } catch (error) {
      console.error("Error loading invites:", error);
    }
  }

  async function handleCreateInvite() {
    if (!selectedCohortId) return;

    setFeedback("");

    try {
      const res = await authedFetch("/api/admin/create-invite", {
        method: "POST",
        body: JSON.stringify({
          cohortId: selectedCohortId,
          role,
          maxUses: maxUses || null,
          expiresAt: expiresAt || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setFeedback(`✅ Invite created: ${data.invite.code}`);
        loadInvites();
        // Reset form
        setRole("agent");
        setMaxUses(null);
        setExpiresAt("");
      } else {
        setFeedback(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setFeedback(`❌ ${error.message}`);
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    setFeedback(`✅ Copied: ${code}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Invite Management</h1>

        {/* Cohort Selector */}
        <div className="mb-8">
          <label className="block text-sm text-zinc-400 mb-2">Select Cohort</label>
          <select
            className="w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
            value={selectedCohortId || ""}
            onChange={(e) => setSelectedCohortId(Number(e.target.value))}
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Create Invite Form */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Create New Invite</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Role</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="agent">Agent</option>
                <option value="coach">Coach</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Max Uses (optional)</label>
              <input
                type="number"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                placeholder="Unlimited"
                value={maxUses || ""}
                onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Expires At (optional)</label>
              <input
                type="datetime-local"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={handleCreateInvite}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            Create Invite
          </button>

          {feedback && <div className="mt-4 text-sm">{feedback}</div>}
        </div>

        {/* Invites List */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-6">Existing Invites</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-3 text-zinc-400 font-medium">Code</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Role</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Uses</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Expires</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Status</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-zinc-800/50">
                    <td className="p-3 font-mono">{inv.code}</td>
                    <td className="p-3">{inv.role}</td>
                    <td className="p-3">
                      {inv.uses} {inv.max_uses ? `/ ${inv.max_uses}` : ""}
                    </td>
                    <td className="p-3 text-sm text-zinc-400">
                      {inv.expires_at
                        ? new Date(inv.expires_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          inv.active
                            ? "bg-green-900/40 text-green-300"
                            : "bg-red-900/40 text-red-300"
                        }`}
                      >
                        {inv.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => copyToClipboard(inv.code)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

