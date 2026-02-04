import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateDailyPlan, saveDailyPlan } from "@/lib/aiCoach";
import { localISODate } from "@/lib/date";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ?? null;
}

/**
 * GET /api/daily-plan - Get today's AI-generated daily plan
 */
export async function GET(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const cohortId = url.searchParams.get("cohortId");
  const date = url.searchParams.get("date") || localISODate();

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);

  try {
    // Check if plan already exists for today
    const { data: existingTasks, error: fetchError } = await supabaseAdmin
      .from("ai_daily_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("cohort_id", cid)
      .eq("task_date", date)
      .order("priority")
      .order("sequence_order");

    if (fetchError) throw new Error(fetchError.message);

    // If tasks exist, return them
    if (existingTasks && existingTasks.length > 0) {
      // Group by pillar
      const byPillar = {
        fitness: existingTasks.filter((t: any) => t.pillar === "fitness"),
        real_estate: existingTasks.filter((t: any) => t.pillar === "real_estate"),
        social: existingTasks.filter((t: any) => t.pillar === "social"),
      };

      const completed = existingTasks.filter((t: any) => t.completed).length;
      const total = existingTasks.length;

      return NextResponse.json({
        ok: true,
        date,
        tasks: existingTasks,
        byPillar,
        progress: {
          completed,
          total,
          percentage: Math.round((completed / total) * 100),
        },
        generated: false,
      });
    }

    // No tasks exist - generate new plan
    const { tasks, context } = await generateDailyPlan(user.id, cid, date);
    
    // Save to database
    const saveResult = await saveDailyPlan(user.id, cid, date, tasks, context);
    
    if (!saveResult.success) {
      throw new Error(saveResult.error || "Failed to save daily plan");
    }

    // Fetch the saved tasks (to get IDs)
    const { data: savedTasks } = await supabaseAdmin
      .from("ai_daily_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("cohort_id", cid)
      .eq("task_date", date)
      .order("priority")
      .order("sequence_order");

    const byPillar = {
      fitness: (savedTasks || []).filter((t: any) => t.pillar === "fitness"),
      real_estate: (savedTasks || []).filter((t: any) => t.pillar === "real_estate"),
      social: (savedTasks || []).filter((t: any) => t.pillar === "social"),
    };

    return NextResponse.json({
      ok: true,
      date,
      tasks: savedTasks || [],
      byPillar,
      progress: {
        completed: 0,
        total: savedTasks?.length || 0,
        percentage: 0,
      },
      generated: true,
    });
  } catch (error: any) {
    console.error("Daily plan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/daily-plan - Update task completion status
 */
export async function PATCH(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { taskId, completed, skipped, skipReason } = body;

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  try {
    // Verify task belongs to user
    const { data: task, error: fetchError } = await supabaseAdmin
      .from("ai_daily_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update task
    const updates: any = { updated_at: new Date().toISOString() };
    
    if (typeof completed === "boolean") {
      updates.completed = completed;
      updates.completed_at = completed ? new Date().toISOString() : null;
    }
    
    if (typeof skipped === "boolean") {
      updates.skipped = skipped;
      updates.skip_reason = skipReason || null;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("ai_daily_tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    // If completed, award XP
    if (completed && !task.completed) {
      const { data: stats } = await supabaseAdmin
        .from("member_stats")
        .select("xp")
        .eq("user_id", user.id)
        .eq("cohort_id", task.cohort_id)
        .single();

      if (stats) {
        await supabaseAdmin
          .from("member_stats")
          .update({ xp: stats.xp + (task.xp_reward || 0) })
          .eq("user_id", user.id)
          .eq("cohort_id", task.cohort_id);
      }
    }

    return NextResponse.json({
      ok: true,
      task: updated,
      xpAwarded: completed && !task.completed ? task.xp_reward : 0,
    });
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

