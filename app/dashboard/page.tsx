"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { computeRank, getNextRank } from "@/lib/ranks";
import Link from "next/link";

type Stats = {
  xp: number;
  rank: string;
  streak: number;
  str: number;
  sta: number;
  agi: number;
  int_stat: number;
  cha: number;
  rep: number;
  gold: number;
};

type Quest = {
  id: number;
  title: string;
  quest_type: string;
  completed: boolean;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [cohortId, setCohortId] = useState<number | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/join";
        return;
      }

      // Try to get cohortId from localStorage
      let cid = localStorage.getItem("cohortId");
      
      // If not in localStorage, get first membership
      if (!cid) {
        const { data: memberships } = await supabase
          .from("cohort_memberships")
          .select("cohort_id")
          .eq("user_id", user.id)
          .limit(1);

        if (!memberships || memberships.length === 0) {
          window.location.href = "/join";
          return;
        }

        cid = String(memberships[0].cohort_id);
        localStorage.setItem("cohortId", cid);
      }

      const cohortIdNum = Number(cid);
      setCohortId(cohortIdNum);

      // Load stats
      const { data: statsData } = await supabase
        .from("member_stats")
        .select("*")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortIdNum)
        .single();

      if (statsData) {
        setStats(statsData as Stats);
      }

      // Load today's quests
      const today = new Date().toISOString().split("T")[0];
      const { data: questsData } = await supabase
        .from("daily_quests")
        .select("id, title, quest_type, completed")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortIdNum)
        .eq("quest_date", today)
        .order("quest_type", { ascending: true });

      if (questsData) {
        setQuests(questsData as Quest[]);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">No stats found. Please join a cohort.</div>
      </div>
    );
  }

  const nextRank = getNextRank(stats.rank as any);
  const xpToNext = nextRank ? nextRank.minXp - stats.xp : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Agent HUD</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <HudCard title="RANK" value={stats.rank} sub={`Next: ${nextRank?.rank || "MAX"}`} />
          <HudCard title="XP" value={stats.xp} sub={nextRank ? `${xpToNext} to next rank` : "Max rank!"} />
          <HudCard title="STREAK" value={`${stats.streak} days`} sub="Keep it going!" />
        </div>

        {/* Today's Quests (Compact) */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Today's Quests</h2>
          <div className="space-y-2">
            {quests.map((q) => (
              <div
                key={q.id}
                className={`p-3 rounded-lg border ${
                  q.completed
                    ? "bg-emerald-950/30 border-emerald-800"
                    : "bg-zinc-900/40 border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{q.title}</span>
                  <span className="text-xs text-zinc-400">{q.quest_type}</span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/today"
            className="mt-4 inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            Log Today's Activity →
          </Link>
        </div>

        {/* All Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="STR" value={stats.str} />
          <StatCard label="STA" value={stats.sta} />
          <StatCard label="AGI" value={stats.agi} />
          <StatCard label="INT" value={stats.int_stat} />
          <StatCard label="CHA" value={stats.cha} />
          <StatCard label="REP" value={stats.rep} />
          <StatCard label="GOLD" value={stats.gold} />
        </div>
      </div>
    </div>
  );
}

function HudCard({ title, value, sub }: { title: string; value: any; sub?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">{value}</div>
      {sub && <div className="mt-2 text-sm text-zinc-300">{sub}</div>}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

