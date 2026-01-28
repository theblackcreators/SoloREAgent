import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserIdFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

async function verifyAdmin(userId: string, cohortId: number) {
  const { data: membership } = await supabaseAdmin
    .from("cohort_memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .maybeSingle();

  return membership?.role === "admin";
}

// GET: List all locations for a program
export async function GET(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("programId");

  if (!programId) {
    return NextResponse.json({ error: "Missing programId" }, { status: 400 });
  }

  const pid = Number(programId);

  const { data: locations, error } = await supabaseAdmin
    .from("locations")
    .select("*")
    .eq("program_id", pid)
    .order("zone", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, locations });
}

// POST: Create new location
export async function POST(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cohortId, programId, location } = body;

  if (!cohortId || !programId || !location) {
    return NextResponse.json(
      { error: "Missing cohortId, programId, or location" },
      { status: 400 }
    );
  }

  const cid = Number(cohortId);
  const pid = Number(programId);

  const isAdmin = await verifyAdmin(userId, cid);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Must be admin of this cohort" },
      { status: 403 }
    );
  }

  // Parse lat/lng (handle null, string, or number)
  const lat =
    location.lat === null || location.lat === ""
      ? null
      : Number(location.lat) || null;
  const lng =
    location.lng === null || location.lng === ""
      ? null
      : Number(location.lng) || null;

  const { data: newLocation, error } = await supabaseAdmin
    .from("locations")
    .insert({
      program_id: pid,
      zone: location.zone,
      name: location.name,
      category: location.category,
      address: location.address || null,
      lat,
      lng,
      suggested_mission: location.suggested_mission || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, location: newLocation });
}

// PATCH: Update existing location
export async function PATCH(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cohortId, id, patch } = body;

  if (!cohortId || !id || !patch) {
    return NextResponse.json(
      { error: "Missing cohortId, id, or patch" },
      { status: 400 }
    );
  }

  const cid = Number(cohortId);
  const locationId = Number(id);

  const isAdmin = await verifyAdmin(userId, cid);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Must be admin of this cohort" },
      { status: 403 }
    );
  }

  // Parse lat/lng if present in patch
  const updates: any = { ...patch };
  if ("lat" in updates) {
    updates.lat =
      updates.lat === null || updates.lat === ""
        ? null
        : Number(updates.lat) || null;
  }
  if ("lng" in updates) {
    updates.lng =
      updates.lng === null || updates.lng === ""
        ? null
        : Number(updates.lng) || null;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("locations")
    .update(updates)
    .eq("id", locationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, location: updated });
}

// DELETE: Delete location
export async function DELETE(req: Request) {
  const userId = await getUserIdFromBearer(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohortId");
  const id = searchParams.get("id");

  if (!cohortId || !id) {
    return NextResponse.json(
      { error: "Missing cohortId or id" },
      { status: 400 }
    );
  }

  const cid = Number(cohortId);
  const locationId = Number(id);

  const isAdmin = await verifyAdmin(userId, cid);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Must be admin of this cohort" },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin
    .from("locations")
    .delete()
    .eq("id", locationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

