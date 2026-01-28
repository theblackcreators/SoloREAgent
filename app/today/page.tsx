"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";

type Quest = {
  id: number;
  title: string;
  description: string;
  quest_type: string;
  completed: boolean;
};

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  
  // Form state
  const [steps, setSteps] = useState(0);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [learningMinutes, setLearningMinutes] = useState(0);
  const [calls, setCalls] = useState(0);
  const [texts, setTexts] = useState(0);
  const [convos, setConvos] = useState(0);
  const [leads, setLeads] = useState(0);
  const [appts, setAppts] = useState(0);
  const [contentDone, setContentDone] = useState(false);
  const [notes, setNotes] = useState("");

  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadToday();
  }, []);

  async function loadToday() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/join";
        return;
      }

      const cid = localStorage.getItem("cohortId");
      if (!cid) {
        window.location.href = "/dashboard";
        return;
      }

      const cohortIdNum = Number(cid);
      setCohortId(cohortIdNum);

      const today = new Date().toISOString().split("T")[0];

      // Load existing log if any
      const { data: logData } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortIdNum)
        .eq("log_date", today)
        .maybeSingle();

      if (logData) {
        setSteps(logData.steps || 0);
        setWorkoutDone(logData.workout_done || false);
        setLearningMinutes(logData.learning_minutes || 0);
        setCalls(logData.calls || 0);
        setTexts(logData.texts || 0);
        setConvos(logData.convos || 0);
        setLeads(logData.leads || 0);
        setAppts(logData.appts || 0);
        setContentDone(logData.content_done || false);
        setNotes(logData.notes || "");
      }

      // Load quests
      const { data: questsData } = await supabase
        .from("daily_quests")
        .select("id, title, description, quest_type, completed")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortIdNum)
        .eq("quest_date", today)
        .order("quest_type", { ascending: true });

      if (questsData) {
        setQuests(questsData as Quest[]);
      }
    } catch (error) {
      console.error("Error loading today:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!cohortId) return;

    setSaving(true);
    setFeedback("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      const res = await authedFetch("/api/log", {
        method: "POST",
        body: JSON.stringify({
          cohortId,
          logDate: today,
          steps,
          workout_done: workoutDone,
          learning_minutes: learningMinutes,
          calls,
          texts,
          convos,
          leads,
          appts,
          content_done: contentDone,
          notes,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setFeedback(`✅ Saved! +${data.newXpGain} XP gained today!`);
        // Reload quests to see auto-completed ones
        await loadToday();
      } else {
        setFeedback(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setFeedback(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Today's Log</h1>

        {/* Daily Log Form */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Activity</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <InputField label="Steps" type="number" value={steps} onChange={(v: string) => setSteps(Number(v))} />
            <InputField label="Learning Minutes" type="number" value={learningMinutes} onChange={(v: string) => setLearningMinutes(Number(v))} />
            <InputField label="Calls" type="number" value={calls} onChange={(v: string) => setCalls(Number(v))} />
            <InputField label="Texts" type="number" value={texts} onChange={(v: string) => setTexts(Number(v))} />
            <InputField label="Convos" type="number" value={convos} onChange={(v: string) => setConvos(Number(v))} />
            <InputField label="Leads" type="number" value={leads} onChange={(v: string) => setLeads(Number(v))} />
            <InputField label="Appts" type="number" value={appts} onChange={(v: string) => setAppts(Number(v))} />
          </div>

          <div className="space-y-4 mb-6">
            <CheckboxField label="Workout Done" checked={workoutDone} onChange={setWorkoutDone} />
            <CheckboxField label="Content Done" checked={contentDone} onChange={setContentDone} />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-zinc-400 mb-2">Notes</label>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded-lg font-semibold"
          >
            {saving ? "Saving..." : "Save Log"}
          </button>

          {feedback && <div className="mt-4 text-center">{feedback}</div>}
        </div>

        {/* Quests */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-6">Today's Quests</h2>
          <div className="space-y-3">
            {quests.map((q) => (
              <div
                key={q.id}
                className={`p-4 rounded-lg border ${
                  q.completed
                    ? "bg-emerald-950/30 border-emerald-800"
                    : "bg-zinc-800/40 border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{q.title}</span>
                      <QuestTypeBadge type={q.quest_type} />
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{q.description}</p>
                  </div>
                  {q.completed && (
                    <span className="text-emerald-400 text-xl">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-zinc-400">
            💡 Tip: Complete 3 of 4 mandatory quests (MOVE, TRAIN, HUNT, LEARN) to maintain your streak!
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-2">{label}</label>
      <input
        type={type}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="w-5 h-5 rounded border-zinc-700 bg-zinc-800"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-zinc-100">{label}</span>
    </label>
  );
}

function QuestTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    mandatory: "bg-red-900/40 text-red-300 border-red-800",
    fitness: "bg-orange-900/40 text-orange-300 border-orange-800",
    business: "bg-blue-900/40 text-blue-300 border-blue-800",
    learning: "bg-purple-900/40 text-purple-300 border-purple-800",
    location: "bg-green-900/40 text-green-300 border-green-800",
  };

  const color = colors[type] || "bg-zinc-800 text-zinc-400 border-zinc-700";

  return (
    <span className={`text-xs px-2 py-1 rounded border ${color}`}>
      {type}
    </span>
  );
}

