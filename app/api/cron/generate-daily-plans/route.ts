import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateDailyPlan, saveDailyPlan } from "@/lib/aiCoach";
import { toISODateUTC } from "@/lib/date";

/**
 * Cron job to auto-generate AI daily plans for all active users
 * Run this early morning (e.g., 5 AM) so users wake up to their daily plan
 */
export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = toISODateUTC(new Date());
  const results = {
    plansGenerated: 0,
    plansSkipped: 0,
    errors: 0,
  };

  try {
    // Get all active cohorts
    const { data: cohorts, error: cohortErr } = await supabaseAdmin
      .from("cohorts")
      .select("id, name")
      .eq("is_active", true);

    if (cohortErr) throw new Error(cohortErr.message);

    for (const cohort of cohorts || []) {
      // Get all agent members in the cohort
      const { data: members, error: memberErr } = await supabaseAdmin
        .from("cohort_memberships")
        .select("user_id")
        .eq("cohort_id", cohort.id)
        .eq("role", "agent");

      if (memberErr) {
        console.error(`Error fetching members for cohort ${cohort.id}:`, memberErr);
        results.errors++;
        continue;
      }

      for (const member of members || []) {
        try {
          // Check if plan already exists for today
          const { data: existingPlan } = await supabaseAdmin
            .from("ai_daily_tasks")
            .select("id")
            .eq("user_id", member.user_id)
            .eq("cohort_id", cohort.id)
            .eq("task_date", today)
            .limit(1)
            .maybeSingle();

          if (existingPlan) {
            // Plan already exists - skip
            results.plansSkipped++;
            continue;
          }

          // Generate and save daily plan
          const { tasks, context } = await generateDailyPlan(
            member.user_id,
            cohort.id,
            today
          );

          const saveResult = await saveDailyPlan(
            member.user_id,
            cohort.id,
            today,
            tasks,
            context
          );

          if (saveResult.success) {
            results.plansGenerated++;
          } else {
            console.error(
              `Failed to save plan for user ${member.user_id}:`,
              saveResult.error
            );
            results.errors++;
          }
        } catch (e) {
          console.error(`Error generating plan for user ${member.user_id}:`, e);
          results.errors++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      date: today,
      ...results,
    });
  } catch (error: any) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

