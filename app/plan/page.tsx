"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { getSupabase } from "@/lib/supabaseClient";

interface Task {
  id: number;
  pillar: "fitness" | "real_estate" | "social";
  title: string;
  description: string;
  action: string;
  timing: string;
  duration_minutes: number;
  why_it_matters: string;
  priority: number;
  completed: boolean;
  skipped: boolean;
  xp_reward: number;
}

interface Progress {
  completed: number;
  total: number;
  percentage: number;
}

const PILLAR_CONFIG = {
  fitness: { emoji: "💪", label: "Fitness", color: "emerald" },
  real_estate: { emoji: "🏠", label: "Real Estate", color: "blue" },
  social: { emoji: "🤝", label: "Social", color: "purple" },
};

export default function DailyPlanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<Progress>({ completed: 0, total: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [activePillar, setActivePillar] = useState<string>("all");

  useEffect(() => {
    fetchDailyPlan();
  }, []);

  async function fetchDailyPlan() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const cohortId = localStorage.getItem("activeCohortId");
      if (!cohortId) return;

      const res = await fetch(`/api/daily-plan?cohortId=${cohortId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setProgress(data.progress || { completed: 0, total: 0, percentage: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch daily plan:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(taskId: number, completed: boolean) {
    setUpdating(taskId);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/daily-plan", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ taskId, completed }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
        );
        // Update progress
        const newCompleted = tasks.filter((t) => 
          t.id === taskId ? completed : t.completed
        ).length;
        setProgress({
          completed: newCompleted,
          total: tasks.length,
          percentage: Math.round((newCompleted / tasks.length) * 100),
        });
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setUpdating(null);
    }
  }

  const filteredTasks = activePillar === "all" 
    ? tasks 
    : tasks.filter((t) => t.pillar === activePillar);

  const pillarProgress = (pillar: string) => {
    const pillarTasks = tasks.filter((t) => t.pillar === pillar);
    const completed = pillarTasks.filter((t) => t.completed).length;
    return { completed, total: pillarTasks.length };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
            <div className="h-32 bg-zinc-800 rounded"></div>
            <div className="h-24 bg-zinc-800 rounded"></div>
            <div className="h-24 bg-zinc-800 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🎯 Your Daily Plan</h1>
          <p className="text-zinc-400">
            AI-generated tasks optimized for your success. Just execute.
          </p>
        </div>

        {/* Progress Overview */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-8 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Today's Progress</h2>
            <span className="text-2xl font-bold text-purple-400">
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-4 mb-4">
            <div
              className="bg-gradient-to-r from-purple-600 to-purple-400 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-sm text-zinc-400">
            {progress.completed} of {progress.total} tasks completed
          </p>
        </div>

        {/* Pillar Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActivePillar("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activePillar === "all"
                ? "bg-purple-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            All Tasks
          </button>
          {Object.entries(PILLAR_CONFIG).map(([key, config]) => {
            const p = pillarProgress(key);
            return (
              <button
                key={key}
                onClick={() => setActivePillar(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activePillar === key
                    ? `bg-${config.color}-600 text-white`
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
                <span className="text-xs opacity-75">
                  ({p.completed}/{p.total})
                </span>
              </button>
            );
          })}
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-4xl mb-4">📋</p>
              <p>No tasks for this category</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const config = PILLAR_CONFIG[task.pillar];
              const isExpanded = expandedTask === task.id;

              return (
                <div
                  key={task.id}
                  className={`bg-zinc-900 rounded-xl border transition-all ${
                    task.completed
                      ? "border-emerald-800 bg-emerald-950/20"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {/* Task Header */}
                  <div className="p-4 flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task.id, !task.completed)}
                      disabled={updating === task.id}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                        task.completed
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-zinc-600 hover:border-purple-500"
                      } ${updating === task.id ? "opacity-50" : ""}`}
                    >
                      {task.completed && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{config.emoji}</span>
                        <h3 className={`font-semibold ${task.completed ? "line-through text-zinc-500" : ""}`}>
                          {task.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-zinc-400">
                        <span>⏰ {task.timing}</span>
                        {task.duration_minutes > 0 && (
                          <span>⏱️ {task.duration_minutes} min</span>
                        )}
                        <span className="text-purple-400">+{task.xp_reward} XP</span>
                      </div>
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-zinc-800 mt-2">
                      <div className="pt-4 space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-zinc-400 mb-1">What to do:</h4>
                          <p className="text-white">{task.action}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-zinc-400 mb-1">Why it matters:</h4>
                          <p className="text-zinc-300 text-sm italic">{task.why_it_matters}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Motivational Footer */}
        {progress.percentage === 100 && (
          <div className="mt-8 text-center py-8 bg-gradient-to-r from-purple-900/50 to-emerald-900/50 rounded-xl border border-purple-800">
            <p className="text-4xl mb-2">🎉</p>
            <h3 className="text-xl font-bold text-white mb-2">Perfect Day!</h3>
            <p className="text-zinc-300">You crushed every task. Your future self thanks you.</p>
          </div>
        )}
      </main>
    </div>
  );
}

