"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

type QuestTemplate = {
  id: number;
  program_id: number;
  title: string;
  description: string | null;
  quest_type: string;
  xp_reward: number;
  completion_rule: any;
  active: boolean;
  created_at: string;
};

type Cohort = { id: number; name: string; program_id: number };

const QUEST_TYPES = ["mandatory", "fitness", "business", "learning", "location"];
const LOG_FIELDS = ["steps", "workout_done", "learning_minutes", "calls", "texts", "convos", "leads", "appts", "content_done"];
const OPERATORS = [
  { value: "eq", label: "= (equals)" },
  { value: "neq", label: "≠ (not equals)" },
  { value: "gt", label: "> (greater than)" },
  { value: "gte", label: "≥ (greater or equal)" },
  { value: "lt", label: "< (less than)" },
  { value: "lte", label: "≤ (less or equal)" },
];

export default function AdminQuestsPage() {
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [feedback, setFeedback] = useState("");

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("mandatory");
  const [formXp, setFormXp] = useState(5);
  const [formActive, setFormActive] = useState(true);
  
  // Simple rule builder state
  const [ruleField, setRuleField] = useState("steps");
  const [ruleOp, setRuleOp] = useState("gte");
  const [ruleValue, setRuleValue] = useState<string>("7000");

  useEffect(() => { loadCohorts(); }, []);
  useEffect(() => { if (selectedCohort) loadTemplates(); }, [selectedCohort]);

  async function loadCohorts() {
    try {
      const res = await authedFetch("/api/admin/my-cohorts");
      const data = await res.json();
      if (data.ok && data.cohorts.length > 0) {
        setCohorts(data.cohorts);
        setSelectedCohort(data.cohorts[0]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadTemplates() {
    if (!selectedCohort) return;
    try {
      const res = await authedFetch(`/api/admin/quest-templates?programId=${selectedCohort.program_id}`);
      const data = await res.json();
      if (data.ok) setTemplates(data.templates || []);
    } catch (e) { console.error(e); }
  }

  function resetForm() {
    setEditingId(null);
    setFormTitle("");
    setFormDesc("");
    setFormType("mandatory");
    setFormXp(5);
    setFormActive(true);
    setRuleField("steps");
    setRuleOp("gte");
    setRuleValue("7000");
  }

  function editTemplate(t: QuestTemplate) {
    setEditingId(t.id);
    setFormTitle(t.title);
    setFormDesc(t.description || "");
    setFormType(t.quest_type);
    setFormXp(t.xp_reward);
    setFormActive(t.active);
    // Parse simple rule
    if (t.completion_rule?.field) {
      setRuleField(t.completion_rule.field);
      setRuleOp(t.completion_rule.op || "gte");
      const v = t.completion_rule.value;
      setRuleValue(typeof v === "boolean" ? (v ? "true" : "false") : String(v));
    }
  }

  function buildRule() {
    const isBool = ruleField === "workout_done" || ruleField === "content_done";
    return { field: ruleField, op: ruleOp, value: isBool ? ruleValue === "true" : Number(ruleValue) };
  }

  async function handleSave() {
    if (!selectedCohort || !formTitle.trim()) {
      setFeedback("❌ Title is required");
      return;
    }
    setFeedback("");
    const payload = {
      programId: selectedCohort.program_id,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      questType: formType,
      xpReward: formXp,
      completionRule: buildRule(),
      active: formActive,
      ...(editingId ? { id: editingId } : {}),
    };

    try {
      const res = await authedFetch("/api/admin/quest-templates", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback(`✅ Quest template ${editingId ? "updated" : "created"}`);
        resetForm();
        loadTemplates();
      } else {
        setFeedback(`❌ ${data.error}`);
      }
    } catch (e: any) { setFeedback(`❌ ${e.message}`); }
  }

  async function handleDelete(id: number) {
    if (!selectedCohort || !confirm("Delete this template?")) return;
    try {
      const res = await authedFetch(
        `/api/admin/quest-templates?id=${id}&programId=${selectedCohort.program_id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.ok) {
        setFeedback("✅ Deleted");
        loadTemplates();
      } else {
        setFeedback(`❌ ${data.error}`);
      }
    } catch (e: any) { setFeedback(`❌ ${e.message}`); }
  }

  async function handleToggle(t: QuestTemplate) {
    if (!selectedCohort) return;
    try {
      await authedFetch("/api/admin/quest-templates", {
        method: "PATCH",
        body: JSON.stringify({ id: t.id, programId: selectedCohort.program_id, active: !t.active }),
      });
      loadTemplates();
    } catch (e) { console.error(e); }
  }

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>;

  const isBoolField = ruleField === "workout_done" || ruleField === "content_done";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">⚔️ Quest Template Management</h1>

        {/* Cohort Selector */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-2">Select Cohort</label>
          <select
            className="w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg p-3"
            value={selectedCohort?.id || ""}
            onChange={(e) => setSelectedCohort(cohorts.find(c => c.id === Number(e.target.value)) || null)}
          >
            {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Create/Edit Form */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">{editingId ? "Edit Quest Template" : "Create New Quest Template"}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Title *</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g., MOVE: 7k Steps" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Quest Type</label>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3" value={formType} onChange={e => setFormType(e.target.value)}>
                {QUEST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-2">Description</label>
            <textarea className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 h-20" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Walk at least 7,000 steps today" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">XP Reward</label>
              <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3" value={formXp} onChange={e => setFormXp(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="active" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="w-5 h-5" />
              <label htmlFor="active" className="text-zinc-300">Active</label>
            </div>
          </div>

          {/* Simple Rule Builder */}
          <div className="border border-zinc-700 rounded-lg p-4 mb-4 bg-zinc-800/50">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Completion Rule</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select className="bg-zinc-700 border border-zinc-600 rounded-lg p-2" value={ruleField} onChange={e => setRuleField(e.target.value)}>
                {LOG_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="bg-zinc-700 border border-zinc-600 rounded-lg p-2" value={ruleOp} onChange={e => setRuleOp(e.target.value)}>
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {isBoolField ? (
                <select className="bg-zinc-700 border border-zinc-600 rounded-lg p-2" value={ruleValue} onChange={e => setRuleValue(e.target.value)}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input type="number" className="bg-zinc-700 border border-zinc-600 rounded-lg p-2" value={ruleValue} onChange={e => setRuleValue(e.target.value)} placeholder="Value" />
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Rule: When <span className="text-purple-400">{ruleField}</span> is <span className="text-blue-400">{OPERATORS.find(o => o.value === ruleOp)?.label}</span> <span className="text-green-400">{ruleValue}</span></p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">{editingId ? "Update" : "Create"}</button>
            {editingId && <button onClick={resetForm} className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg">Cancel</button>}
          </div>
          {feedback && <div className="mt-4 text-sm">{feedback}</div>}
        </div>

        {/* Templates List */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-6">Quest Templates ({templates.length})</h2>
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className={`flex items-center gap-4 p-4 rounded-xl border ${t.active ? "border-zinc-700 bg-zinc-800/50" : "border-zinc-800 bg-zinc-900/50 opacity-60"}`}>
                <div className={`w-2 h-2 rounded-full ${t.active ? "bg-green-500" : "bg-zinc-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">{t.quest_type}</span>
                    <span className="text-xs text-purple-400">+{t.xp_reward} XP</span>
                  </div>
                  {t.description && <p className="text-sm text-zinc-500 truncate">{t.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(t)} className="text-sm px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600">{t.active ? "Disable" : "Enable"}</button>
                  <button onClick={() => editTemplate(t)} className="text-sm px-3 py-1 rounded bg-blue-600 hover:bg-blue-700">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-sm px-3 py-1 rounded bg-red-600 hover:bg-red-700">Delete</button>
                </div>
              </div>
            ))}
            {templates.length === 0 && <p className="text-zinc-500 text-center py-8">No quest templates found</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

