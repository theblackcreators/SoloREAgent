import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications";
import { toISODateUTC } from "@/lib/date";

// This endpoint should be called by a cron job (e.g., Vercel Cron or external service)
// It sends daily quest reminders to users who haven't logged today

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = toISODateUTC(new Date());
  const results = {
    remindersCreated: 0,
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
      // Get members who haven't logged today
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
        // Check if user has logged today
        const { data: log } = await supabaseAdmin
          .from("daily_logs")
          .select("id")
          .eq("user_id", member.user_id)
          .eq("cohort_id", cohort.id)
          .eq("log_date", today)
          .maybeSingle();

        if (!log) {
          // User hasn't logged today - send reminder
          try {
            // Check if we already sent a reminder today
            const { data: existingReminder } = await supabaseAdmin
              .from("notifications")
              .select("id")
              .eq("user_id", member.user_id)
              .eq("cohort_id", cohort.id)
              .eq("type", "quest_reminder")
              .gte("created_at", `${today}T00:00:00Z`)
              .maybeSingle();

            if (!existingReminder) {
              await createNotification({
                user_id: member.user_id,
                cohort_id: cohort.id,
                type: "quest_reminder",
                title: "📋 Daily Quests Waiting",
                message: "Don't forget to log your progress today and complete your quests!",
                data: { date: today },
              });
              results.remindersCreated++;
            }
          } catch (e) {
            console.error(`Failed to create reminder for user ${member.user_id}:`, e);
            results.errors++;
          }
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

