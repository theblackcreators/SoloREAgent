"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { computeRank, getNextRank, RANKS, Rank } from "@/lib/ranks";
import Link from "next/link";
import {
  Trophy,
  Zap,
  Flame,
  Target,
  Dumbbell,
  BookOpen,
  Users,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  Play,
  Shield,
  Swords,
  Heart,
  Brain,
  Sparkles,
  Coins,
} from "lucide-react";

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
  xp_reward?: number;
};

// Demo data for when Supabase isn't configured or user has no data
const DEMO_STATS: Stats = {
  xp: 2450,
  rank: "C",
  streak: 12,
  str: 45,
  sta: 38,
  agi: 52,
  int_stat: 41,
  cha: 35,
  rep: 28,
  gold: 1250,
};

const DEMO_QUESTS: Quest[] = [
  { id: 1, title: "Complete 7,000 steps", quest_type: "MOVE", completed: true, xp_reward: 5 },
  { id: 2, title: "Complete a workout", quest_type: "TRAIN", completed: true, xp_reward: 5 },
  { id: 3, title: "Learn for 20 minutes", quest_type: "LEARN", completed: false, xp_reward: 5 },
  { id: 4, title: "Make 5 prospecting contacts", quest_type: "HUNT", completed: false, xp_reward: 5 },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured - showing demo mode");
      setIsDemoMode(true);
      setStats(DEMO_STATS);
      setQuests(DEMO_QUESTS);
      setLoading(false);
      return;
    }

    try {
      // Dynamic import to avoid errors when Supabase isn't configured
      const { supabase } = await import("@/lib/supabaseClient");

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Show demo mode for unauthenticated users
        setIsDemoMode(true);
        setStats(DEMO_STATS);
        setQuests(DEMO_QUESTS);
        setLoading(false);
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
          // No cohort - show demo mode with message
          setIsDemoMode(true);
          setStats(DEMO_STATS);
          setQuests(DEMO_QUESTS);
          setError("You haven't joined a cohort yet. Showing demo data.");
          setLoading(false);
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
      } else {
        // No stats - show demo mode
        setIsDemoMode(true);
        setStats(DEMO_STATS);
        setQuests(DEMO_QUESTS);
        setError("No stats found. Showing demo data.");
        setLoading(false);
        return;
      }

      // Load today's quests
      const today = new Date().toISOString().split("T")[0];
      const { data: questsData } = await supabase
        .from("daily_quests")
        .select("id, title, quest_type, completed, xp_reward")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortIdNum)
        .eq("quest_date", today)
        .order("quest_type", { ascending: true });

      if (questsData && questsData.length > 0) {
        setQuests(questsData as Quest[]);
      } else {
        // No quests for today - use demo quests
        setQuests(DEMO_QUESTS);
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);
      // On error, show demo mode
      setIsDemoMode(true);
      setStats(DEMO_STATS);
      setQuests(DEMO_QUESTS);
      setError("Unable to load data. Showing demo mode.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-zinc-400 font-mono">LOADING AGENT HUD...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <EmptyState />;
  }

  const currentRank = stats.rank as Rank;
  const nextRank = getNextRank(currentRank);
  const currentRankData = RANKS.find(r => r.rank === currentRank);
  const xpInCurrentRank = stats.xp - (currentRankData?.minXp || 0);
  const xpToNext = nextRank ? nextRank.minXp - stats.xp : 0;
  const xpRangeForRank = nextRank ? nextRank.minXp - (currentRankData?.minXp || 0) : 1;
  const progressPercent = nextRank ? Math.min(100, (xpInCurrentRank / xpRangeForRank) * 100) : 100;

  const completedQuests = quests.filter(q => q.completed).length;
  const totalQuests = quests.length;
  const questProgress = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Agent HUD</h1>
              <p className="text-sm text-zinc-400">
                {isDemoMode ? "Demo Mode" : "Your daily command center"}
              </p>
            </div>
            {isDemoMode && (
              <Link
                href="/join"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Join a Cohort
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Demo/Error Banner */}
        {(isDemoMode || error) && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 font-medium">
                {isDemoMode ? "Demo Mode Active" : "Notice"}
              </p>
              <p className="text-amber-300/70 text-sm mt-1">
                {error || "You're viewing sample data. Join a cohort to track your real progress!"}
              </p>
              <div className="flex gap-3 mt-3">
                <Link
                  href="/join"
                  className="text-sm text-amber-400 hover:text-amber-300 font-medium"
                >
                  Join a Cohort →
                </Link>
                <Link
                  href="/demo"
                  className="text-sm text-zinc-400 hover:text-zinc-300"
                >
                  View Full Demo
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Rank Card */}
          <div className="bg-gradient-to-br from-purple-900/40 to-zinc-900 border border-purple-800/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-purple-300 font-medium">CURRENT RANK</span>
              <Trophy className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black ${getRankColor(currentRank)}`}>
                {currentRank}
              </div>
              <div>
                <div className="text-2xl font-bold">{getRankName(currentRank)}</div>
                <div className="text-sm text-zinc-400">
                  {nextRank ? `${xpToNext.toLocaleString()} XP to ${nextRank.rank}-Rank` : "Maximum Rank!"}
                </div>
              </div>
            </div>
            {nextRank && (
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>{currentRank}-Rank</span>
                  <span>{nextRank.rank}-Rank</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* XP Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-zinc-400 font-medium">TOTAL XP</span>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-4xl font-bold text-yellow-500 mb-2">
              {stats.xp.toLocaleString()}
            </div>
            <div className="text-sm text-zinc-400">
              Experience Points Earned
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Daily Average</span>
                <span className="text-zinc-200 font-medium">~{Math.round(stats.xp / Math.max(stats.streak, 1))} XP</span>
              </div>
            </div>
          </div>

          {/* Streak Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-zinc-400 font-medium">CURRENT STREAK</span>
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-4xl font-bold text-orange-500 mb-2">
              {stats.streak} <span className="text-xl text-zinc-400">days</span>
            </div>
            <div className="text-sm text-zinc-400">
              {stats.streak >= 7 ? "🔥 On fire! Keep it going!" : "Build your streak!"}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Streak Bonus</span>
                <span className="text-emerald-400 font-medium">+{Math.min(stats.streak, 7) * 2} XP/day</span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Quests */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Today&apos;s Quests
            </h2>
            <div className="text-sm text-zinc-400">
              {completedQuests}/{totalQuests} completed
            </div>
          </div>

          {/* Quest Progress Bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                questProgress >= 75 ? "bg-emerald-500" : questProgress >= 50 ? "bg-yellow-500" : "bg-purple-500"
              }`}
              style={{ width: `${questProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <Link
              href="/today"
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold text-center transition-colors flex items-center justify-center gap-2"
            >
              Log Today&apos;s Activity
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              href="/plan"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
            >
              View Plan
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Agent Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="STR" value={stats.str} icon={<Swords className="w-4 h-4" />} color="red" />
            <StatCard label="STA" value={stats.sta} icon={<Heart className="w-4 h-4" />} color="pink" />
            <StatCard label="AGI" value={stats.agi} icon={<Zap className="w-4 h-4" />} color="yellow" />
            <StatCard label="INT" value={stats.int_stat} icon={<Brain className="w-4 h-4" />} color="blue" />
            <StatCard label="CHA" value={stats.cha} icon={<Sparkles className="w-4 h-4" />} color="purple" />
            <StatCard label="REP" value={stats.rep} icon={<Shield className="w-4 h-4" />} color="green" />
            <StatCard label="GOLD" value={stats.gold} icon={<Coins className="w-4 h-4" />} color="amber" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction href="/leaderboard" icon={<Trophy className="w-6 h-6" />} label="Leaderboard" />
          <QuickAction href="/achievements" icon={<Target className="w-6 h-6" />} label="Achievements" />
          <QuickAction href="/resources" icon={<BookOpen className="w-6 h-6" />} label="Resources" />
          <QuickAction href="/shop" icon={<Coins className="w-6 h-6" />} label="Shop" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Welcome, Agent</h1>
        <p className="text-zinc-400 mb-6">
          Your journey to S-Rank begins here. Join a cohort to start tracking your progress and completing quests.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/join"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-colors"
          >
            Join a Cohort
          </Link>
          <Link
            href="/demo"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
          >
            View Demo
          </Link>
        </div>
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  const questIcons: Record<string, React.ReactNode> = {
    MOVE: <TrendingUp className="w-5 h-5" />,
    TRAIN: <Dumbbell className="w-5 h-5" />,
    LEARN: <BookOpen className="w-5 h-5" />,
    HUNT: <Target className="w-5 h-5" />,
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        quest.completed
          ? "bg-emerald-950/30 border-emerald-800/50"
          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          quest.completed ? "bg-emerald-900/50 text-emerald-400" : "bg-zinc-800 text-zinc-400"
        }`}>
          {questIcons[quest.quest_type] || <Target className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <div className={`font-medium ${quest.completed ? "text-emerald-300" : "text-zinc-200"}`}>
            {quest.title}
          </div>
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <span>{quest.quest_type}</span>
            {quest.xp_reward && <span>• +{quest.xp_reward} XP</span>}
          </div>
        </div>
        {quest.completed && (
          <div className="text-emerald-400 text-sm font-medium">✓</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    red: "text-red-400 bg-red-900/20",
    pink: "text-pink-400 bg-pink-900/20",
    yellow: "text-yellow-400 bg-yellow-900/20",
    blue: "text-blue-400 bg-blue-900/20",
    purple: "text-purple-400 bg-purple-900/20",
    green: "text-green-400 bg-green-900/20",
    amber: "text-amber-400 bg-amber-900/20",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-purple-800/50 hover:bg-zinc-900/80 transition-all flex flex-col items-center gap-2 text-zinc-400 hover:text-purple-400"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    E: "bg-zinc-700 text-zinc-300",
    D: "bg-green-900/50 text-green-400",
    C: "bg-blue-900/50 text-blue-400",
    B: "bg-purple-900/50 text-purple-400",
    A: "bg-orange-900/50 text-orange-400",
    S: "bg-gradient-to-br from-yellow-500 to-orange-500 text-yellow-900",
  };
  return colors[rank] || colors.E;
}

function getRankName(rank: string): string {
  const names: Record<string, string> = {
    E: "Rookie",
    D: "Apprentice",
    C: "Agent",
    B: "Veteran",
    A: "Elite",
    S: "Legend",
  };
  return names[rank] || "Unknown";
}

