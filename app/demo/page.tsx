"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";

// ============================================
// CONSTANTS (from lib/ranks.ts and lib/engine.ts)
// ============================================
const RANKS = [
  { rank: "E", minXp: 0, label: "Novice" },
  { rank: "D", minXp: 500, label: "Apprentice" },
  { rank: "C", minXp: 1500, label: "Agent" },
  { rank: "B", minXp: 3000, label: "Senior Agent" },
  { rank: "A", minXp: 5000, label: "Elite Agent" },
  { rank: "S", minXp: 7500, label: "Legendary" },
];

const RANK_COLORS: Record<string, string> = {
  E: "border-zinc-600 bg-zinc-800/50 text-zinc-300",
  D: "border-green-600 bg-green-900/20 text-green-400",
  C: "border-blue-600 bg-blue-900/20 text-blue-400",
  B: "border-purple-600 bg-purple-900/20 text-purple-400",
  A: "border-orange-600 bg-orange-900/20 text-orange-400",
  S: "border-yellow-500 bg-yellow-900/20 text-yellow-400",
};

const SECTIONS = [
  { key: "calculator", label: "XP Calculator", icon: "⚡" },
  { key: "ranks", label: "Rank System", icon: "🏆" },
  { key: "stats", label: "Stat Gains", icon: "📈" },
];

// ============================================
// CALCULATION FUNCTIONS
// ============================================
function computeRank(xp: number): string {
  let current = "E";
  for (const r of RANKS) {
    if (xp >= r.minXp) current = r.rank;
  }
  return current;
}

function getNextRank(rank: string) {
  const idx = RANKS.findIndex((r) => r.rank === rank);
  return idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

interface LogData {
  steps: number;
  workout_done: boolean;
  learning_minutes: number;
  convos: number;
  appts: number;
  content_done: boolean;
  calls: number;
  texts: number;
}

function xpFromLog(log: LogData) {
  const mandatoryCount =
    (log.steps >= 7000 ? 1 : 0) +
    (log.workout_done ? 1 : 0) +
    (log.convos >= 5 || log.appts >= 1 ? 1 : 0) +
    (log.learning_minutes >= 20 ? 1 : 0);

  let xp = mandatoryCount * 5;
  if (log.workout_done) xp += 10;
  if (log.steps >= 10000) xp += 5;
  if (log.convos >= 5) xp += 10;
  if (log.appts >= 1) xp += 15;
  if (log.content_done) xp += 10;
  return xp;
}

function statGainsFromLog(log: LogData) {
  const gains: Record<string, number> = {};
  if (log.workout_done) {
    gains.str = (gains.str ?? 0) + 1;
    gains.sta = (gains.sta ?? 0) + 1;
  }
  if (log.steps >= 10000) {
    gains.sta = (gains.sta ?? 0) + 1;
  }
  if (log.learning_minutes >= 20) {
    gains.int = (gains.int ?? 0) + 1;
  }
  if (log.convos >= 5) {
    gains.cha = (gains.cha ?? 0) + 1;
  }
  if (log.appts >= 1) {
    gains.cha = (gains.cha ?? 0) + 2;
    gains.rep = (gains.rep ?? 0) + 1;
  }
  if (log.content_done) {
    gains.rep = (gains.rep ?? 0) + 1;
  }
  return gains;
}

function getMandatoryQuests(log: LogData) {
  return [
    { name: "MOVE", done: log.steps >= 7000, req: "7,000+ steps" },
    { name: "TRAIN", done: log.workout_done, req: "Complete workout" },
    { name: "LEARN", done: log.learning_minutes >= 20, req: "20+ min learning" },
    { name: "HUNT", done: log.convos >= 5 || log.appts >= 1, req: "5+ convos OR 1+ appt" },
  ];
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function LevelingDemoPage() {
  const [activeSection, setActiveSection] = useState("calculator");

  // Activity inputs
  const [steps, setSteps] = useState(7000);
  const [workout, setWorkout] = useState(true);
  const [learning, setLearning] = useState(20);
  const [convos, setConvos] = useState(5);
  const [appts, setAppts] = useState(0);
  const [content, setContent] = useState(false);
  const [calls, setCalls] = useState(0);
  const [texts, setTexts] = useState(0);

  // Current XP for rank demo
  const [currentXp, setCurrentXp] = useState(450);

  const log: LogData = useMemo(
    () => ({ steps, workout_done: workout, learning_minutes: learning, convos, appts, content_done: content, calls, texts }),
    [steps, workout, learning, convos, appts, content, calls, texts]
  );

  const dailyXp = useMemo(() => xpFromLog(log), [log]);
  const statGains = useMemo(() => statGainsFromLog(log), [log]);
  const mandatoryQuests = useMemo(() => getMandatoryQuests(log), [log]);
  const questsCompleted = mandatoryQuests.filter((q) => q.done).length;

  const currentRank = computeRank(currentXp);
  const nextRank = getNextRank(currentRank);
  const xpAfterLog = currentXp + dailyXp;
  const newRank = computeRank(xpAfterLog);
  const rankUp = newRank !== currentRank;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🎮 Leveling System Demo</h1>
          <p className="text-zinc-400">
            Explore how XP, ranks, and stats are calculated in the Elite Agent System
          </p>
        </div>

        {/* Section Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeSection === section.key
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {section.icon} {section.label}
            </button>
          ))}
        </div>

        {/* XP Calculator Section */}
        {activeSection === "calculator" && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Left: Activity Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">📝 Daily Activity Input</h2>

              <div className="space-y-5">
                {/* Steps Slider */}
                <div>
                  <label className="flex justify-between text-sm text-zinc-400 mb-2">
                    <span>👟 Steps</span>
                    <span className={steps >= 10000 ? "text-green-400 font-medium" : steps >= 7000 ? "text-purple-400 font-medium" : "text-zinc-400"}>
                      {steps.toLocaleString()}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="15000"
                    step="500"
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>0</span>
                  <span className="text-purple-400">7k (MOVE)</span>
                  <span className="text-green-400">10k (+bonus)</span>
                  <span>15k</span>
                </div>
              </div>

              {/* Workout Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-sm text-zinc-300">💪 Workout Completed</span>
                <button
                  onClick={() => setWorkout(!workout)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    workout ? "bg-purple-600" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                      workout ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Learning Minutes */}
              <div>
                <label className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>📚 Learning Minutes</span>
                  <span className={learning >= 20 ? "text-purple-400 font-medium" : "text-zinc-400"}>{learning} min</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={learning}
                  onChange={(e) => setLearning(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              {/* Conversations */}
              <div>
                <label className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>🗣️ Conversations</span>
                  <span className={convos >= 5 ? "text-purple-400 font-medium" : "text-zinc-400"}>{convos}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={convos}
                  onChange={(e) => setConvos(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              {/* Appointments */}
              <div>
                <label className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>📅 Appointments</span>
                  <span className={appts >= 1 ? "text-purple-400 font-medium" : "text-zinc-400"}>{appts}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={appts}
                  onChange={(e) => setAppts(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              {/* Content Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-sm text-zinc-300">📱 Content Created</span>
                <button
                  onClick={() => setContent(!content)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    content ? "bg-purple-600" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                      content ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-3">Quick Presets:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSteps(0); setWorkout(false); setLearning(0); setConvos(0); setAppts(0); setContent(false); }}
                  className="px-4 py-2 text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium transition-all"
                >
                  Empty Day
                </button>
                <button
                  onClick={() => { setSteps(7000); setWorkout(true); setLearning(20); setConvos(5); setAppts(0); setContent(false); }}
                  className="px-4 py-2 text-sm bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 rounded-lg font-medium transition-all"
                >
                  Basic Day (35 XP)
                </button>
                <button
                  onClick={() => { setSteps(10000); setWorkout(true); setLearning(20); setConvos(5); setAppts(1); setContent(true); }}
                  className="px-4 py-2 text-sm bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50 rounded-lg font-medium transition-all"
                >
                  Max Day (70 XP)
                </button>
              </div>
            </div>
          </div>

          {/* Right: XP Results */}
          <div className="space-y-6">
            {/* Daily XP Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">⚡ Today's XP</h2>
                <span className="text-3xl font-bold text-purple-400">{dailyXp} XP</span>
              </div>

              {/* Progress bar to max */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Daily Progress</span>
                  <span>{dailyXp}/70 XP</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-purple-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((dailyXp / 70) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* XP Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-zinc-800/50 rounded-lg">
                  <span className="text-zinc-400">Mandatory Quests ({questsCompleted}/4)</span>
                  <span className="font-medium">{questsCompleted * 5} XP</span>
                </div>
                {workout && (
                  <div className="flex justify-between p-2 bg-emerald-900/20 rounded-lg text-emerald-400">
                    <span>+ Workout Bonus</span>
                    <span className="font-medium">+10 XP</span>
                  </div>
                )}
                {steps >= 10000 && (
                  <div className="flex justify-between p-2 bg-emerald-900/20 rounded-lg text-emerald-400">
                    <span>+ 10K Steps Bonus</span>
                    <span className="font-medium">+5 XP</span>
                  </div>
                )}
                {convos >= 5 && (
                  <div className="flex justify-between p-2 bg-emerald-900/20 rounded-lg text-emerald-400">
                    <span>+ 5+ Convos Bonus</span>
                    <span className="font-medium">+10 XP</span>
                  </div>
                )}
                {appts >= 1 && (
                  <div className="flex justify-between p-2 bg-emerald-900/20 rounded-lg text-emerald-400">
                    <span>+ Appointment Bonus</span>
                    <span className="font-medium">+15 XP</span>
                  </div>
                )}
                {content && (
                  <div className="flex justify-between p-2 bg-emerald-900/20 rounded-lg text-emerald-400">
                    <span>+ Content Bonus</span>
                    <span className="font-medium">+10 XP</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mandatory Quests Status */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">📜 Mandatory Quests</h3>
                <span className={`text-sm px-3 py-1 rounded-lg font-medium ${
                  questsCompleted >= 3
                    ? "bg-emerald-900/50 border border-emerald-600 text-emerald-300"
                    : "bg-zinc-800 text-zinc-400"
                }`}>
                  {questsCompleted >= 3 ? "✓ Streak Safe" : `${3 - questsCompleted} more for streak`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {mandatoryQuests.map((q) => (
                  <div
                    key={q.name}
                    className={`p-4 rounded-xl border transition-all ${
                      q.done
                        ? "bg-emerald-950/20 border-emerald-800"
                        : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{q.done ? "✅" : "⬜"}</span>
                      <span className="font-semibold">{q.name}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{q.req}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Rank System Section */}
        {activeSection === "ranks" && (
          <RankProgressionSection currentXp={currentXp} setCurrentXp={setCurrentXp} dailyXp={dailyXp} />
        )}

        {/* Stat Gains Section */}
        {activeSection === "stats" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">📈 Stat Gains System</h2>

            {/* Current Activity Gains */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-zinc-300 mb-4">From Current Activity Settings</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { stat: "STR", gain: statGains.str || 0, icon: "💪" },
                  { stat: "STA", gain: statGains.sta || 0, icon: "🏃" },
                  { stat: "AGI", gain: 0, icon: "⚡" },
                  { stat: "INT", gain: statGains.int || 0, icon: "🧠" },
                  { stat: "CHA", gain: statGains.cha || 0, icon: "🗣️" },
                  { stat: "REP", gain: statGains.rep || 0, icon: "⭐" },
                ].map((s) => (
                  <div key={s.stat} className={`rounded-xl border p-4 text-center transition-all ${
                    s.gain > 0
                      ? "bg-purple-900/20 border-purple-600"
                      : "bg-zinc-800/50 border-zinc-700"
                  }`}>
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-xs text-zinc-400 mb-1">{s.stat}</div>
                    <div className={`text-2xl font-bold ${s.gain > 0 ? "text-purple-400" : "text-zinc-600"}`}>
                      {s.gain > 0 ? `+${s.gain}` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stat Gain Rules */}
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-medium text-zinc-300 mb-4">How Stats Are Earned</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { stat: "STR", icon: "💪", rules: ["Workout completed: +1"] },
                  { stat: "STA", icon: "🏃", rules: ["Workout completed: +1", "10,000+ steps: +1"] },
                  { stat: "INT", icon: "🧠", rules: ["20+ learning minutes: +1"] },
                  { stat: "CHA", icon: "🗣️", rules: ["5+ conversations: +1", "1+ appointment: +2"] },
                  { stat: "REP", icon: "⭐", rules: ["1+ appointment: +1", "Content created: +1"] },
                  { stat: "AGI", icon: "⚡", rules: ["Coming soon..."] },
                ].map((item) => (
                  <div key={item.stat} className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-semibold">{item.stat}</span>
                    </div>
                    <ul className="text-sm text-zinc-400 space-y-1">
                      {item.rules.map((rule, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-purple-400">•</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// RANK PROGRESSION COMPONENT
// ============================================
function RankProgressionSection({ currentXp, setCurrentXp, dailyXp }: { currentXp: number; setCurrentXp: (xp: number) => void; dailyXp: number }) {
  const currentRank = computeRank(currentXp);
  const nextRank = getNextRank(currentRank);
  const xpAfterLog = currentXp + dailyXp;
  const newRank = computeRank(xpAfterLog);
  const rankUp = newRank !== currentRank;

  // Progress within current rank
  const currentRankData = RANKS.find((r) => r.rank === currentRank)!;
  const progressInRank = nextRank
    ? ((currentXp - currentRankData.minXp) / (nextRank.minXp - currentRankData.minXp)) * 100
    : 100;

  return (
    <div className="space-y-6">
      {/* XP Simulator Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">🏆 Rank Progression Simulator</h2>

        {/* XP Slider */}
        <div className="mb-6">
          <label className="flex justify-between text-sm text-zinc-400 mb-2">
            <span>Simulate XP Level</span>
            <span className="text-purple-400 font-medium">{currentXp.toLocaleString()} XP</span>
          </label>
          <input
            type="range"
            min="0"
            max="8000"
            step="50"
            value={currentXp}
            onChange={(e) => setCurrentXp(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        {/* Current Rank Display */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`px-6 py-4 rounded-xl border-2 text-center min-w-[100px] ${RANK_COLORS[currentRank]}`}>
            <div className="text-4xl font-bold">{currentRank}</div>
            <div className="text-xs mt-1">{RANKS.find((r) => r.rank === currentRank)?.label}</div>
          </div>
          {nextRank && (
            <>
              <div className="flex-1">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>Progress to Rank {nextRank.rank}</span>
                  <span>{Math.round(progressInRank)}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-purple-400 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${progressInRank}%` }}
                  />
                </div>
                <div className="text-sm text-zinc-500 mt-2">
                  {(nextRank.minXp - currentXp).toLocaleString()} XP needed
                </div>
              </div>
              <div className={`px-6 py-4 rounded-xl border-2 text-center min-w-[100px] opacity-50 ${RANK_COLORS[nextRank.rank]}`}>
                <div className="text-4xl font-bold">{nextRank.rank}</div>
                <div className="text-xs mt-1">{nextRank.label}</div>
              </div>
            </>
          )}
          {!nextRank && (
            <div className="flex-1 text-center">
              <span className="text-yellow-400 font-bold text-lg">🎉 Maximum Rank Achieved!</span>
            </div>
          )}
        </div>

        {/* After Log Preview */}
        {dailyXp > 0 && (
          <div className={`p-4 rounded-xl border ${
            rankUp
              ? "bg-yellow-900/30 border-yellow-600"
              : "bg-zinc-800/50 border-zinc-700"
          }`}>
            <p className="text-sm">
              After logging today&apos;s activity:
              <span className="font-bold text-purple-400 ml-2">{currentXp} + {dailyXp} = {xpAfterLog} XP</span>
              {rankUp && <span className="ml-3 text-yellow-400 font-bold">🎉 RANK UP to {newRank}!</span>}
            </p>
          </div>
        )}
      </div>

      {/* All Ranks Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">All Ranks</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {RANKS.map((r) => {
            const isAchieved = currentXp >= r.minXp;
            const isCurrent = currentRank === r.rank;
            return (
              <div
                key={r.rank}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  isCurrent
                    ? `${RANK_COLORS[r.rank]} ring-2 ring-offset-2 ring-offset-zinc-900 ring-purple-500`
                    : isAchieved
                      ? RANK_COLORS[r.rank]
                      : "border-zinc-700 bg-zinc-800/30 opacity-50"
                }`}
              >
                <div className="text-3xl font-bold">{r.rank}</div>
                <div className="text-xs text-zinc-400 mt-1">{r.minXp.toLocaleString()} XP</div>
                <div className="text-xs mt-1 font-medium">{r.label}</div>
                {isCurrent && <div className="text-xs text-purple-400 mt-2">← Current</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Calculator */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">⏱️ Time to S-Rank Calculator</h3>
        <p className="text-sm text-zinc-400 mb-4">From your current {currentXp.toLocaleString()} XP</p>

        {currentXp >= 7500 ? (
          <div className="text-center py-4">
            <span className="text-2xl">🏆</span>
            <p className="text-yellow-400 font-bold mt-2">You&apos;ve reached S-Rank!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-4">
              <div className="text-sm text-emerald-400 mb-1">Max Effort (70 XP/day)</div>
              <div className="text-3xl font-bold text-emerald-300">
                {Math.ceil((7500 - currentXp) / 70)} days
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                ~{Math.ceil(Math.ceil((7500 - currentXp) / 70) / 30)} months
              </div>
            </div>
            <div className="bg-purple-900/20 border border-purple-700 rounded-xl p-4">
              <div className="text-sm text-purple-400 mb-1">Average Effort (40 XP/day)</div>
              <div className="text-3xl font-bold text-purple-300">
                {Math.ceil((7500 - currentXp) / 40)} days
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                ~{Math.ceil(Math.ceil((7500 - currentXp) / 40) / 30)} months
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

