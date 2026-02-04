"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { getSupabase } from "@/lib/supabaseClient";

interface LeaderboardEntry {
  position: number;
  userId: string;
  displayName: string;
  xp: number;
  rank: string;
  streak: number;
  stats: { str: number; sta: number; agi: number; int: number; cha: number; rep: number };
  gold: number;
  isCurrentUser: boolean;
}

const RANK_COLORS: Record<string, string> = {
  E: "bg-zinc-600",
  D: "bg-green-600",
  C: "bg-blue-600",
  B: "bg-purple-600",
  A: "bg-orange-500",
  S: "bg-gradient-to-r from-yellow-400 to-amber-500",
};

const RANK_TEXT: Record<string, string> = {
  E: "text-zinc-400",
  D: "text-green-400",
  C: "text-blue-400",
  B: "text-purple-400",
  A: "text-orange-400",
  S: "text-yellow-400",
};

export default function LeaderboardPage() {
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankFilter, setRankFilter] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("activeCohortId");
    if (stored) setCohortId(Number(stored));
  }, []);

  useEffect(() => {
    if (!cohortId) return;
    fetchLeaderboard();
  }, [cohortId, rankFilter]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams({ cohortId: String(cohortId) });
      if (rankFilter) params.append("rank", rankFilter);

      const res = await fetch(`/api/leaderboard?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setLeaderboard(json.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }

  function getPositionBadge(pos: number) {
    if (pos === 1) return "🥇";
    if (pos === 2) return "🥈";
    if (pos === 3) return "🥉";
    return `#${pos}`;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header cohortId={cohortId} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            🏆 Leaderboard
          </h1>
          <select
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          >
            <option value="">All Ranks</option>
            <option value="S">S-Rank Only</option>
            <option value="A">A-Rank Only</option>
            <option value="B">B-Rank Only</option>
            <option value="C">C-Rank Only</option>
            <option value="D">D-Rank Only</option>
            <option value="E">E-Rank Only</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">No agents found</div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  entry.isCurrentUser
                    ? "bg-purple-900/30 border-purple-500"
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {/* Position */}
                <div className="w-12 text-center font-bold text-xl">
                  {getPositionBadge(entry.position)}
                </div>

                {/* Rank Badge */}
                <div className={`w-10 h-10 rounded-lg ${RANK_COLORS[entry.rank]} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{entry.rank}</span>
                </div>

                {/* Name & Stats */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100 truncate">
                      {entry.displayName}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </div>
                  <div className="text-sm text-zinc-500 flex gap-4 mt-1">
                    <span>🔥 {entry.streak} day streak</span>
                    <span>💰 {entry.gold} gold</span>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right">
                  <div className={`text-2xl font-bold ${RANK_TEXT[entry.rank]}`}>
                    {entry.xp.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">XP</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

