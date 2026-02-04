"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { getSupabase } from "@/lib/supabaseClient";

interface ProfileData {
  user: {
    id: string;
    email: string;
    emailConfirmedAt: string | null;
    createdAt: string;
    lastSignInAt: string;
  };
  profile: {
    display_name: string | null;
  };
  memberships: Array<{
    cohort_id: number;
    role: string;
    joined_at: string;
    cohorts: { id: number; name: string; start_date: string; is_active: boolean };
  }>;
  stats: { xp: number; rank: string; streak: number; gold: number } | null;
}

export default function ProfilePage() {
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [data, setData] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("activeCohortId");
    if (stored) setCohortId(Number(stored));
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setData(result);
        setDisplayName(result.profile?.display_name || "");
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        fetchProfile();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to update profile" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResendVerification() {
    setResending(true);
    setMessage(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Verification email sent! Check your inbox." });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to send verification email" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to send verification email" });
    } finally {
      setResending(false);
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header cohortId={cohortId} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">👤 Profile Settings</h1>
        <p className="text-zinc-400 mb-8">Manage your account and preferences</p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Message Banner */}
            {message && (
              <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-900/30 border border-green-700 text-green-400" : "bg-red-900/30 border border-red-700 text-red-400"}`}>
                {message.text}
              </div>
            )}

            {/* Email Verification Banner */}
            {!data.user.emailConfirmedAt && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 font-medium">⚠️ Email not verified</p>
                    <p className="text-yellow-500 text-sm">Please verify your email to access all features</p>
                  </div>
                  <button
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Resend Email"}
                  </button>
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-100">{data.user.email}</span>
                    {data.user.emailConfirmedAt && (
                      <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded">✓ Verified</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Stats */}
            {data.stats && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Current Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBox label="XP" value={data.stats.xp} />
                  <StatBox label="Rank" value={data.stats.rank} />
                  <StatBox label="Streak" value={`${data.stats.streak} days`} />
                  <StatBox label="Gold" value={data.stats.gold} />
                </div>
              </div>
            )}

            {/* Cohort Memberships */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Cohort Memberships</h2>
              {data.memberships.length === 0 ? (
                <p className="text-zinc-400">No cohort memberships yet</p>
              ) : (
                <div className="space-y-3">
                  {data.memberships.map((m) => (
                    <div key={m.cohort_id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <p className="font-medium">{m.cohorts?.name || `Cohort ${m.cohort_id}`}</p>
                        <p className="text-sm text-zinc-400">Joined {formatDate(m.joined_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${m.role === "admin" ? "bg-red-900/40 text-red-400" : m.role === "coach" ? "bg-blue-900/40 text-blue-400" : "bg-zinc-700 text-zinc-300"}`}>
                          {m.role}
                        </span>
                        {m.cohorts?.is_active && (
                          <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded">Active</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Details */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Account Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">Account Created:</span>
                  <span className="ml-2 text-zinc-100">{formatDate(data.user.createdAt)}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Last Sign In:</span>
                  <span className="ml-2 text-zinc-100">{formatDate(data.user.lastSignInAt)}</span>
                </div>
                <div>
                  <span className="text-zinc-400">User ID:</span>
                  <span className="ml-2 text-zinc-500 font-mono text-xs">{data.user.id}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-zinc-400 py-12">Failed to load profile data</div>
        )}
      </main>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
      <p className="text-zinc-400 text-xs">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

