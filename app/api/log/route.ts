import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { xpFromLog, statGainsFromLog } from "@/lib/engine";
import { computeRank } from "@/lib/ranks";
import { evaluateRule } from "@/lib/ruleEngine";
import { addDaysUTC, parseISODateToUTC, toISODateUTC } from "@/lib/date";

type LogShape = {
  steps: number;
  workout_done: boolean;
  learning_minutes: number;
  calls: number;
  texts: number;
  convos: number;
  leads: number;
  appts: number;
  content_done: boolean;
  notes?: string;
};

function normalizeLog(row: any): LogShape {
  return {
    steps: Number(row?.steps ?? 0),
    workout_done: !!row?.workout_done,
    learning_minutes: Number(row?.learning_minutes ?? 0),
    calls: Number(row?.calls ?? 0),
    texts: Number(row?.texts ?? 0),
    convos: Number(row?.convos ?? 0),
    leads: Number(row?.leads ?? 0),
    appts: Number(row?.appts ?? 0),
    content_done: !!row?.content_done,
    notes: row?.notes ?? "",
  };
}

function mandatoryCountFor(log: LogShape) {
  return (
    (log.steps >= 7000 ? 1 : 0) +
    (log.workout_done ? 1 : 0) +
    (log.learning_minutes >= 20 ? 1 : 0) +
    (log.convos >= 5 || log.appts >= 1 ? 1 : 0)
  );
}

// Fallback quest completion logic for quests without completion_rule
function shouldCompleteQuest(title: string, log: LogShape): boolean {
  const t = title.toLowerCase();

  // Mandatory proxies
  if (t.startsWith("move:")) return log.steps >= 7000;
  if (t.startsWith("train:")) return log.workout_done;
  if (t.startsWith("learn:")) return log.learning_minutes >= 20;
  if (t.startsWith("hunt:"))
    return log.convos >= 5 || log.appts >= 1 || (log.calls >= 20 && log.texts >= 40);

  // Fitness
  if (t.includes("workout") || t.includes("train")) return log.workout_done;
  if (t.includes("10k steps") || t.includes("10,000 steps")) return log.steps >= 10000;

  // Business
  if (t.includes("5 convos")) return log.convos >= 5;
  if (t.includes("1 appt") || t.includes("appointment")) return log.appts >= 1;
  if (t.includes("content")) return log.content_done;

  // Learning
  if (t.includes("20 min") || t.includes("study")) return log.learning_minutes >= 20;

  return false;
}

// Recompute streak ending at anchorDate (logDate being saved)
async function recomputeStreakEndingAt({
  userId,
  cohortId,
  anchorDate,
  lookbackDays = 60,
}: {
  userId: string;
  cohortId: number;
  anchorDate: string;
  lookbackDays?: number;
}) {
  const start = addDaysUTC(anchorDate, -lookbackDays);

  const { data: logs, error } = await supabaseAdmin
    .from("daily_logs")
    .select("log_date, steps, workout_done, learning_minutes, convos, appts")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .gte("log_date", start)
    .lte("log_date", anchorDate)
    .order("log_date", { ascending: false });

  if (error) throw new Error(error.message);

  const byDate = new Map<string, any>();
  (logs || []).forEach((r: any) => byDate.set(r.log_date, r));

  let streak = 0;
  let cursor = anchorDate;

  while (true) {
    const row = byDate.get(cursor);
    if (!row) break;

    const m = mandatoryCountFor({
      steps: Number(row.steps ?? 0),
      workout_done: !!row.workout_done,
      learning_minutes: Number(row.learning_minutes ?? 0),
      calls: 0,
      texts: 0,
      convos: Number(row.convos ?? 0),
      leads: 0,
      appts: Number(row.appts ?? 0),
      content_done: false,
    });

    if (m < 3) break;

    streak += 1;
    cursor = addDaysUTC(cursor, -1);
  }

  return streak;
}

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function POST(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const {
    cohortId,
    logDate,
    steps = 0,
    workout_done = false,
    calls = 0,
    texts = 0,
    convos = 0,
    leads = 0,
    appts = 0,
    content_done = false,
    learning_minutes = 0,
    notes = "",
  } = body;

  if (!cohortId || !logDate) {
    return NextResponse.json(
      { error: "Missing cohortId or logDate" },
      { status: 400 }
    );
  }

  const cid = Number(cohortId);

  // 0) Load previous log for XP/Stat delta (idempotency + edit-safe)
  const { data: prevLogRow, error: prevErr } = await supabaseAdmin
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", cid)
    .eq("log_date", logDate)
    .maybeSingle();

  if (prevErr) {
    return NextResponse.json({ error: prevErr.message }, { status: 400 });
  }

  const prevLog = normalizeLog(prevLogRow);

  const nextLog: LogShape = {
    steps: Number(steps ?? 0),
    workout_done: !!workout_done,
    learning_minutes: Number(learning_minutes ?? 0),
    calls: Number(calls ?? 0),
    texts: Number(texts ?? 0),
    convos: Number(convos ?? 0),
    leads: Number(leads ?? 0),
    appts: Number(appts ?? 0),
    content_done: !!content_done,
    notes: notes ?? "",
  };

  const oldXpGain = prevLogRow
    ? xpFromLog({
        workout_done: prevLog.workout_done,
        steps: prevLog.steps,
        convos: prevLog.convos,
        appts: prevLog.appts,
        content_done: prevLog.content_done,
        learning_minutes: prevLog.learning_minutes,
      })
    : 0;

  const newXpGain = xpFromLog({
    workout_done: nextLog.workout_done,
    steps: nextLog.steps,
    convos: nextLog.convos,
    appts: nextLog.appts,
    content_done: nextLog.content_done,
    learning_minutes: nextLog.learning_minutes,
  });

  const oldGains = prevLogRow
    ? statGainsFromLog({
        workout_done: prevLog.workout_done,
        steps: prevLog.steps,
        learning_minutes: prevLog.learning_minutes,
        convos: prevLog.convos,
        appts: prevLog.appts,
        content_done: prevLog.content_done,
      })
    : {
        str: 0,
        sta: 0,
        agi: 0,
        int_stat: 0,
        cha: 0,
        rep: 0,
        gold: 0,
      };

  const newGains = statGainsFromLog({
    workout_done: nextLog.workout_done,
    steps: nextLog.steps,
    learning_minutes: nextLog.learning_minutes,
    convos: nextLog.convos,
    appts: nextLog.appts,
    content_done: nextLog.content_done,
  });

  const deltaXp = newXpGain - oldXpGain;

  const delta = {
    str: (newGains.str ?? 0) - (oldGains.str ?? 0),
    sta: (newGains.sta ?? 0) - (oldGains.sta ?? 0),
    agi: (newGains.agi ?? 0) - (oldGains.agi ?? 0),
    int_stat: (newGains.int_stat ?? 0) - (oldGains.int_stat ?? 0),
    cha: (newGains.cha ?? 0) - (oldGains.cha ?? 0),
    rep: (newGains.rep ?? 0) - (oldGains.rep ?? 0),
    gold: (newGains.gold ?? 0) - (oldGains.gold ?? 0),
  };

  // 1) Upsert daily log (authoritative record)
  const { error: logErr } = await supabaseAdmin
    .from("daily_logs")
    .upsert(
      {
        user_id: userId,
        cohort_id: cid,
        log_date: logDate,
        steps: nextLog.steps,
        workout_done: nextLog.workout_done,
        calls: nextLog.calls,
        texts: nextLog.texts,
        convos: nextLog.convos,
        leads: nextLog.leads,
        appts: nextLog.appts,
        content_done: nextLog.content_done,
        learning_minutes: nextLog.learning_minutes,
        notes: nextLog.notes ?? "",
      },
      { onConflict: "user_id,cohort_id,log_date" }
    );

  if (logErr)
    return NextResponse.json({ error: logErr.message }, { status: 400 });

  // 2) Fetch member stats
  const { data: statsRow, error: sErr } = await supabaseAdmin
    .from("member_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", cid)
    .single();

  if (sErr)
    return NextResponse.json({ error: sErr.message }, { status: 400 });

  // 3) Update by DELTA only (prevents double-add)
  const nextXpTotal = Math.max(0, Number(statsRow.xp ?? 0) + deltaXp);
  const nextRank = computeRank(nextXpTotal);

  // Recompute streak ending at this logDate (edit-safe)
  let nextStreak = 0;
  try {
    nextStreak = await recomputeStreakEndingAt({
      userId,
      cohortId: cid,
      anchorDate: logDate,
      lookbackDays: 120,
    });
  } catch {
    // Fallback: streak based on this day only
    nextStreak =
      mandatoryCountFor(nextLog) >= 3 ? Number(statsRow.streak ?? 0) + 1 : 0;
  }

  const updatedStats = {
    xp: nextXpTotal,
    rank: nextRank,
    streak: nextStreak,
    str: Number(statsRow.str ?? 0) + delta.str,
    sta: Number(statsRow.sta ?? 0) + delta.sta,
    agi: Number(statsRow.agi ?? 0) + delta.agi,
    int_stat: Number(statsRow.int_stat ?? 0) + delta.int_stat,
    cha: Number(statsRow.cha ?? 0) + delta.cha,
    rep: Number(statsRow.rep ?? 0) + delta.rep,
    gold: Number(statsRow.gold ?? 0) + delta.gold,
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabaseAdmin
    .from("member_stats")
    .update(updatedStats)
    .eq("user_id", userId)
    .eq("cohort_id", cid);

  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 400 });

  // 4) Auto-complete today's quests based on NEW log
  const { data: quests, error: qErr } = await supabaseAdmin
    .from("daily_quests")
    .select("id,title,completed,completion_rule")
    .eq("user_id", userId)
    .eq("cohort_id", cid)
    .eq("quest_date", logDate);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

  const toComplete: number[] = [];
  const toUncomplete: number[] = [];

  for (const q of quests ?? []) {
    const title = (q.title || "").toLowerCase();
    if (title === "dungeon check-in") continue; // handled by map check-in

    const rule = (q as any).completion_rule;
    const should = rule
      ? evaluateRule(rule, nextLog)
      : shouldCompleteQuest(q.title, nextLog);

    if (should && !q.completed) toComplete.push(q.id);
    if (!should && q.completed) toUncomplete.push(q.id);
  }

  if (toComplete.length) {
    const { error } = await supabaseAdmin
      .from("daily_quests")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .in("id", toComplete);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (toUncomplete.length) {
    const { error } = await supabaseAdmin
      .from("daily_quests")
      .update({ completed: false, completed_at: null })
      .in("id", toUncomplete);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    xpGain: newXpGain,
    deltaXp,
    oldXpGain,
    newXpGain,
    deltaStats: delta,
    updatedStats,
    autoCompletedQuestIds: toComplete,
    autoUncompletedQuestIds: toUncomplete,
  });
}

