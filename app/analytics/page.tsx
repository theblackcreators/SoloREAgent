"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { getSupabase } from "@/lib/supabaseClient";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface AnalyticsData {
  period: { start: string; end: string; days: number };
  currentStats: any;
  xpHistory: { date: string; xp: number }[];
  questStats: { total: number; completed: number; byType: Record<string, { total: number; completed: number }> };
  statProgression: { str: number; sta: number; agi: number; int: number; cha: number; rep: number };
  activityMap: Record<string, number>;
  logsCount: number;
}

export default function AnalyticsPage() {
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const stored = localStorage.getItem("activeCohortId");
    if (stored) setCohortId(Number(stored));
  }, []);

  useEffect(() => {
    if (!cohortId) return;
    fetchAnalytics();
  }, [cohortId, days]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/analytics?cohortId=${cohortId}&days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  // Prepare chart data
  const xpChartData = data?.xpHistory.map((item, idx, arr) => {
    const cumulative = arr.slice(0, idx + 1).reduce((sum, i) => sum + i.xp, 0);
    return { date: item.date.slice(5), daily: item.xp, cumulative };
  }) || [];

  const questTypeData = Object.entries(data?.questStats.byType || {}).map(([type, stats]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    completed: stats.completed,
    incomplete: stats.total - stats.completed,
    rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  }));

  const radarData = data ? [
    { stat: "STR", value: data.statProgression.str, fullMark: 100 },
    { stat: "STA", value: data.statProgression.sta, fullMark: 100 },
    { stat: "AGI", value: data.statProgression.agi, fullMark: 100 },
    { stat: "INT", value: data.statProgression.int, fullMark: 100 },
    { stat: "CHA", value: data.statProgression.cha, fullMark: 100 },
    { stat: "REP", value: data.statProgression.rep, fullMark: 100 },
  ] : [];

  const completionRate = data?.questStats.total 
    ? Math.round((data.questStats.completed / data.questStats.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header cohortId={cohortId} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            📊 Analytics Dashboard
          </h1>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          </div>
        ) : !data ? (
          <div className="text-center text-zinc-500 py-12">No data available</div>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard title="Total XP" value={data.currentStats?.xp || 0} icon="⚡" />
              <SummaryCard title="Current Rank" value={data.currentStats?.rank || "E"} icon="🏆" />
              <SummaryCard title="Streak" value={`${data.currentStats?.streak || 0} days`} icon="🔥" />
              <SummaryCard title="Quest Rate" value={`${completionRate}%`} icon="✅" />
            </div>

            {/* XP Growth Chart */}
            <ChartCard title="XP Growth Over Time">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={xpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46" }} />
                  <Legend />
                  <Line type="monotone" dataKey="cumulative" name="Total XP" stroke="#a855f7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="daily" name="Daily XP" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quest Completion by Type */}
              <ChartCard title="Quest Completion by Type">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={questTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis type="number" stroke="#71717a" fontSize={12} />
                    <YAxis dataKey="type" type="category" stroke="#71717a" fontSize={12} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46" }} />
                    <Bar dataKey="completed" name="Completed" fill="#22c55e" stackId="a" />
                    <Bar dataKey="incomplete" name="Incomplete" fill="#ef4444" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Stat Radar */}
              <ChartCard title="Stat Distribution">
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis dataKey="stat" stroke="#71717a" fontSize={12} />
                    <PolarRadiusAxis stroke="#3f3f46" fontSize={10} />
                    <Radar name="Stats" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="text-2xl font-bold text-zinc-100">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">{title}</h3>
      {children}
    </div>
  );
}

