"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { getSupabase } from "@/lib/supabaseClient";

interface Achievement {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  rarity: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: "border-zinc-600 bg-zinc-800/50",
  uncommon: "border-green-600 bg-green-900/20",
  rare: "border-blue-600 bg-blue-900/20",
  epic: "border-purple-600 bg-purple-900/20",
  legendary: "border-yellow-500 bg-yellow-900/20",
};

const RARITY_TEXT: Record<string, string> = {
  common: "text-zinc-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const CATEGORY_ICONS: Record<string, string> = {
  streak: "🔥",
  rank: "⭐",
  quest: "📜",
  activity: "🏃",
  special: "💎",
};

export default function AchievementsPage() {
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const stored = localStorage.getItem("activeCohortId");
    if (stored) setCohortId(Number(stored));
  }, []);

  useEffect(() => {
    if (!cohortId) return;
    fetchAchievements();
  }, [cohortId]);

  async function fetchAchievements() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/achievements?cohortId=${cohortId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch achievements:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredAchievements = achievements.filter((a) => {
    if (filter === "all") return true;
    if (filter === "unlocked") return a.unlocked;
    if (filter === "locked") return !a.unlocked;
    return a.category === filter;
  });

  const categories = [...new Set(achievements.map((a) => a.category))];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header cohortId={cohortId} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent mb-2">
          🏆 Achievements
        </h1>
        <p className="text-zinc-400 mb-8">Unlock badges by completing milestones</p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Unlocked" value={`${stats.totalUnlocked}/${stats.totalAvailable}`} icon="🏆" />
                <StatCard label="Completion" value={`${stats.completionRate}%`} icon="📊" />
                <StatCard label="XP Earned" value={stats.totalXpEarned} icon="⚡" />
                <StatCard label="Legendary" value={`${stats.byRarity?.legendary?.unlocked || 0}/${stats.byRarity?.legendary?.total || 0}`} icon="⭐" />
              </div>
            )}

            {/* Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>All</FilterBtn>
              <FilterBtn active={filter === "unlocked"} onClick={() => setFilter("unlocked")}>✅ Unlocked</FilterBtn>
              <FilterBtn active={filter === "locked"} onClick={() => setFilter("locked")}>🔒 Locked</FilterBtn>
              {categories.map((cat) => (
                <FilterBtn key={cat} active={filter === cat} onClick={() => setFilter(cat)}>
                  {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </FilterBtn>
              ))}
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    ach.unlocked
                      ? RARITY_COLORS[ach.rarity]
                      : "border-zinc-800 bg-zinc-900/50 opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{ach.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{ach.name}</span>
                        {ach.unlocked && <span className="text-green-400 text-xs">✓</span>}
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{ach.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={RARITY_TEXT[ach.rarity]}>{ach.rarity}</span>
                        <span className="text-purple-400">+{ach.xp_reward} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredAchievements.length === 0 && (
              <div className="text-center text-zinc-500 py-12">
                No achievements found for this filter
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-purple-600 text-white"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

