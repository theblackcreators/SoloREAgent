import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { localISODate } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = localISODate();

  // Get all active cohorts
  const { data: cohorts, error: cohortErr } = await supabaseAdmin
    .from("cohorts")
    .select("id, program_id")
    .eq("is_active", true);

  if (cohortErr) {
    return NextResponse.json({ error: cohortErr.message }, { status: 500 });
  }

  let totalGenerated = 0;

  for (const cohort of cohorts || []) {
    // Get all members in this cohort
    const { data: members } = await supabaseAdmin
      .from("cohort_memberships")
      .select("user_id")
      .eq("cohort_id", cohort.id);

    if (!members || members.length === 0) continue;

    // Get quest templates for this program
    const { data: templates } = await supabaseAdmin
      .from("quest_templates")
      .select("*")
      .eq("program_id", cohort.program_id)
      .eq("active", true);

    if (!templates || templates.length === 0) continue;

    // Generate quests for each member
    for (const member of members) {
      const dailyRows = templates.map((t) => ({
        user_id: member.user_id,
        cohort_id: cohort.id,
        quest_date: today,
        template_id: t.id,
        title: t.title,
        description: t.description,
        quest_type: t.quest_type,
        xp_reward: t.xp_reward,
        stat_rewards: t.stat_rewards,
        completion_rule: t.completion_rule ?? null,
        completed: false,
      }));

      const { error } = await supabaseAdmin
        .from("daily_quests")
        .upsert(dailyRows, {
          onConflict: "user_id,cohort_id,quest_date,template_id",
          ignoreDuplicates: true,
        });

      if (!error) {
        totalGenerated += dailyRows.length;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    date: today,
    totalGenerated,
  });
}

