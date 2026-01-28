"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { useSearchParams } from "next/navigation";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams?.get("code") || "");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleJoin() {
    if (!code.trim()) {
      setFeedback("❌ Please enter an invite code");
      return;
    }

    setLoading(true);
    setFeedback("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setFeedback("❌ Please sign in first");
        setLoading(false);
        return;
      }

      const res = await authedFetch("/api/join", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          displayName: displayName.trim() || null,
          email: email.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        localStorage.setItem("cohortId", String(data.cohortId));
        setFeedback("✅ Successfully joined! Redirecting...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        setFeedback(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setFeedback(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4">Solo RE Agent</h1>
          <p className="text-zinc-400">Enter your invite code to join a cohort</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Invite Code *</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100 uppercase"
                placeholder="ABCD1234"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={12}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Display Name (optional)</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Email (optional)</label>
              <input
                type="email"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded-lg font-semibold mt-6"
            >
              {loading ? "Joining..." : "Join Cohort"}
            </button>

            {feedback && (
              <div className="mt-4 text-center text-sm">{feedback}</div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-zinc-500">
          Don't have an invite code? Contact your program admin.
        </div>
      </div>
    </div>
  );
}

