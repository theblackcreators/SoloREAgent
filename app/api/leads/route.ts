import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(req: Request) {
  // Apply strict rate limiting to prevent spam
  const rateLimited = applyRateLimit(req, RATE_LIMITS.strict, "leads");
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const { email, source = "landing_page", leadMagnet } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Check if lead already exists
    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("id, email")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      // Update existing lead with new source/timestamp
      await supabaseAdmin
        .from("leads")
        .update({
          last_seen_at: new Date().toISOString(),
          source: source,
          lead_magnet: leadMagnet || null,
        })
        .eq("id", existing.id);

      return NextResponse.json({
        ok: true,
        message: "Welcome back! Check your email for access.",
        isReturning: true,
      });
    }

    // Create new lead
    const { error: insertErr } = await supabaseAdmin.from("leads").insert({
      email: email.toLowerCase().trim(),
      source: source,
      lead_magnet: leadMagnet || null,
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    });

    if (insertErr) {
      // If table doesn't exist, still return success for demo
      console.error("Lead insert error:", insertErr);
      return NextResponse.json({
        ok: true,
        message: "Thanks for signing up! We'll be in touch soon.",
        demo: true,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "You're in! Check your email for next steps.",
      isNew: true,
    });
  } catch (error) {
    console.error("Lead capture error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

