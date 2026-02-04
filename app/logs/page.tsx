"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { getSupabase } from "@/lib/supabaseClient";

interface LogEntry {
  date: string;
  steps: number;
  workout_done: boolean;
  learning_minutes: number;
  calls: number;
  texts: number;
  convos: number;
  leads: number;
  appts: number;
  content_done: boolean;
  notes: string;
  completedQuests: number;
  totalQuests: number;
  xpEarned: number;
}

interface CalendarDay {
  hasLog: boolean;
  quests: number;
  completed: number;
}

export default function LogsHistoryPage() {
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [calendar, setCalendar] = useState<Record<string, CalendarDay>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    const stored = localStorage.getItem("activeCohortId");
    if (stored) setCohortId(Number(stored));
  }, []);

  useEffect(() => {
    if (!cohortId) return;
    fetchLogs();
  }, [cohortId, month]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const [year, mon] = month.split("-").map(Number);
      const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${year}-${String(mon).padStart(2, "0")}-${lastDay}`;

      const res = await fetch(
        `/api/logs/history?cohortId=${cohortId}&startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setCalendar(data.calendar || {});
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function renderCalendar() {
    const [year, mon] = month.split("-").map(Number);
    const firstDay = new Date(year, mon - 1, 1).getDay();
    const daysInMonth = new Date(year, mon, 0).getDate();
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDay).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    return weeks.map((w, wi) => (
      <tr key={wi}>
        {w.map((day, di) => {
          if (!day) return <td key={di} className="p-1" />;
          const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const info = calendar[dateStr];
          const log = logs.find(l => l.date === dateStr);
          const isToday = dateStr === new Date().toISOString().split("T")[0];

          return (
            <td key={di} className="p-1">
              <button
                onClick={() => log && setSelectedLog(log)}
                disabled={!info?.hasLog}
                className={`w-full aspect-square rounded-lg text-sm font-medium transition-all ${
                  info?.hasLog
                    ? info.completed === info.quests && info.quests > 0
                      ? "bg-green-600 hover:bg-green-500 text-white"
                      : "bg-purple-600/70 hover:bg-purple-500 text-white"
                    : "bg-zinc-800 text-zinc-500"
                } ${isToday ? "ring-2 ring-purple-400" : ""}`}
              >
                {day}
              </button>
            </td>
          );
        })}
      </tr>
    ));
  }

  const monthName = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]) - 1).toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header cohortId={cohortId} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-8">
          📅 Log History
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Calendar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-zinc-800 rounded-lg">◀</button>
              <h2 className="text-xl font-semibold">{monthName}</h2>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-zinc-800 rounded-lg">▶</button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                      <th key={d} className="p-1 text-xs text-zinc-500 font-medium">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderCalendar()}</tbody>
              </table>
            )}

            <div className="flex gap-4 mt-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600" /> All quests done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-600/70" /> Logged</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-zinc-800" /> No log</span>
            </div>
          </div>

          {/* Selected Log Details */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Log Details</h2>
            {selectedLog ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">{new Date(selectedLog.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                  <span className="text-purple-400 font-bold">+{selectedLog.xpEarned} XP</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Steps" value={selectedLog.steps.toLocaleString()} icon="👟" />
                  <StatBox label="Workout" value={selectedLog.workout_done ? "✅ Done" : "❌ Skipped"} icon="💪" />
                  <StatBox label="Learning" value={`${selectedLog.learning_minutes} min`} icon="📚" />
                  <StatBox label="Calls" value={selectedLog.calls} icon="📞" />
                  <StatBox label="Texts" value={selectedLog.texts} icon="💬" />
                  <StatBox label="Convos" value={selectedLog.convos} icon="🗣️" />
                  <StatBox label="Leads" value={selectedLog.leads} icon="🎯" />
                  <StatBox label="Appts" value={selectedLog.appts} icon="📅" />
                </div>

                <div className="pt-3 border-t border-zinc-800">
                  <span className="text-sm text-zinc-400">Quests: </span>
                  <span className={selectedLog.completedQuests === selectedLog.totalQuests ? "text-green-400" : "text-yellow-400"}>
                    {selectedLog.completedQuests}/{selectedLog.totalQuests} completed
                  </span>
                </div>

                {selectedLog.notes && (
                  <div className="pt-3 border-t border-zinc-800">
                    <span className="text-sm text-zinc-400">Notes:</span>
                    <p className="text-zinc-300 mt-1">{selectedLog.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-12">
                Click a logged day to view details
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

