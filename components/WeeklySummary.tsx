"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";

interface WeeklySummaryData {
  period: { start: string; end: string };
  thisWeek: {
    xpEarned: number;
    questsCompleted: number;
    totalQuests: number;
    completionRate: number;
    daysLogged: number;
  };
  lastWeek: {
    xpEarned: number;
    questsCompleted: number;
    completionRate: number;
    daysLogged: number;
  };
  comparison: {
    xpChange: number;
    daysChange: number;
    rateChange: number;
  };
  currentStats: {
    totalXp: number;
    rank: string;
    streak: number;
  };
}

export function WeeklySummary({ cohortId }: { cohortId: number | null }) {
  const [data, setData] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cohortId) return;
    fetchSummary();
  }, [cohortId]);

  async function fetchSummary() {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/weekly-summary?cohortId=${cohortId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch weekly summary:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="h-20 bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const { thisWeek, comparison, currentStats } = data;

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-zinc-900 border border-purple-800/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
        📊 This Week&apos;s Progress
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <MetricCard
          label="XP Earned"
          value={thisWeek.xpEarned}
          change={comparison.xpChange}
          icon="⚡"
        />
        <MetricCard
          label="Quests Done"
          value={`${thisWeek.questsCompleted}/${thisWeek.totalQuests}`}
          change={comparison.rateChange}
          suffix="%"
          icon="✅"
        />
        <MetricCard
          label="Days Logged"
          value={`${thisWeek.daysLogged}/7`}
          change={comparison.daysChange}
          noPercent
          icon="📅"
        />
        <MetricCard
          label="Current Streak"
          value={`${currentStats.streak} days`}
          icon="🔥"
        />
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-400 pt-3 border-t border-zinc-800">
        <span>Total XP: <span className="text-purple-400 font-semibold">{currentStats.totalXp.toLocaleString()}</span></span>
        <span>Rank: <span className="text-purple-400 font-semibold">{currentStats.rank}</span></span>
        <span>Completion Rate: <span className={thisWeek.completionRate >= 70 ? "text-green-400" : "text-yellow-400"}>{thisWeek.completionRate}%</span></span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  suffix = "",
  noPercent = false,
  icon,
}: {
  label: string;
  value: string | number;
  change?: number;
  suffix?: string;
  noPercent?: boolean;
  icon: string;
}) {
  const showChange = change !== undefined && change !== 0;
  const isPositive = (change || 0) > 0;

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3">
      <div className="flex items-center gap-1 text-zinc-400 text-xs mb-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-zinc-100">{value}</span>
        {showChange && (
          <span className={`text-xs ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "↑" : "↓"} {Math.abs(change)}{noPercent ? "" : "%"}{suffix}
          </span>
        )}
      </div>
    </div>
  );
}

