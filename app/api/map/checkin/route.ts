import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ?? null;
}

// Calculate distance between two coordinates in meters (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Maximum distance allowed for check-in (in meters)
const MAX_CHECKIN_DISTANCE = 200; // 200 meters

// XP reward for check-ins
const CHECKIN_XP_REWARD = 15;

// POST /api/map/checkin - Check in at a location with geolocation validation
export async function POST(req: Request) {
  // Apply rate limiting (API-level)
  const rateLimited = applyRateLimit(req, RATE_LIMITS.api, "map-checkin");
  if (rateLimited) return rateLimited;

  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { locationId, cohortId, userLat, userLng } = body;

  if (!locationId || !cohortId) {
    return NextResponse.json({ error: "Missing locationId or cohortId" }, { status: 400 });
  }

  if (typeof userLat !== "number" || typeof userLng !== "number") {
    return NextResponse.json(
      { error: "Location required. Please enable GPS and try again." },
      { status: 400 }
    );
  }

  try {
    // Get the location details
    const { data: location, error: locError } = await supabaseAdmin
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .single();

    if (locError || !location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Check if location has coordinates
    if (location.lat === null || location.lng === null) {
      return NextResponse.json(
        { error: "This location does not have GPS coordinates configured" },
        { status: 400 }
      );
    }

    // Calculate distance between user and location
    const distance = calculateDistance(userLat, userLng, location.lat, location.lng);

    if (distance > MAX_CHECKIN_DISTANCE) {
      return NextResponse.json(
        {
          error: `You are too far from this location (${Math.round(distance)}m away). Must be within ${MAX_CHECKIN_DISTANCE}m to check in.`,
          distance: Math.round(distance),
          maxDistance: MAX_CHECKIN_DISTANCE,
        },
        { status: 400 }
      );
    }

    // Check if already checked in
    const { data: existingCheckIn } = await supabaseAdmin
      .from("location_check_ins")
      .select("id")
      .eq("user_id", user.id)
      .eq("cohort_id", cohortId)
      .eq("location_id", locationId)
      .single();

    if (existingCheckIn) {
      return NextResponse.json(
        { error: "You have already checked in at this location" },
        { status: 400 }
      );
    }

    // Insert check-in
    const { error: insertError } = await supabaseAdmin.from("location_check_ins").insert({
      user_id: user.id,
      cohort_id: cohortId,
      location_id: locationId,
      checked_in_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Award XP for check-in
    const { data: currentStats } = await supabaseAdmin
      .from("member_stats")
      .select("xp")
      .eq("user_id", user.id)
      .eq("cohort_id", cohortId)
      .single();

    if (currentStats) {
      await supabaseAdmin
        .from("member_stats")
        .update({ xp: currentStats.xp + CHECKIN_XP_REWARD })
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId);
    }

    // Check for first check-in achievement
    const { count } = await supabaseAdmin
      .from("location_check_ins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("cohort_id", cohortId);

    const awarded = await checkAndAwardAchievements(user.id, cohortId, {
      isFirstCheckin: count === 1,
    });

    return NextResponse.json({
      ok: true,
      message: "Checked in successfully!",
      location: location.name,
      distance: Math.round(distance),
      xpEarned: CHECKIN_XP_REWARD,
      achievements: awarded.map((a) => ({ name: a.name, icon: a.icon, xp: a.xp_reward })),
    });
  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

