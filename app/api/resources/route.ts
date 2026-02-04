import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ?? null;
}

/**
 * GET /api/resources - Get resources for a program
 */
export async function GET(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const cohortId = url.searchParams.get("cohortId");
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const featured = url.searchParams.get("featured");

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);

  try {
    // Get program ID from cohort
    const { data: cohort } = await supabaseAdmin
      .from("cohorts")
      .select("program_id")
      .eq("id", cid)
      .single();

    if (!cohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    // Get user's rank for access control
    const { data: stats } = await supabaseAdmin
      .from("member_stats")
      .select("rank")
      .eq("user_id", user.id)
      .eq("cohort_id", cid)
      .single();

    const userRank = stats?.rank || "E";
    const rankOrder = ["E", "D", "C", "B", "A", "S"];
    const userRankIndex = rankOrder.indexOf(userRank);

    // Build query
    let query = supabaseAdmin
      .from("resources")
      .select("*")
      .eq("program_id", cohort.program_id)
      .eq("active", true)
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    if (featured === "true") {
      query = query.eq("featured", true);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: resources, error } = await query;

    if (error) throw new Error(error.message);

    // Get user's progress for these resources
    const resourceIds = (resources || []).map((r: any) => r.id);
    const { data: progress } = await supabaseAdmin
      .from("user_resource_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("resource_id", resourceIds);

    const progressMap = new Map((progress || []).map((p: any) => [p.resource_id, p]));

    // Filter by rank access and add progress
    const accessibleResources = (resources || [])
      .filter((r: any) => {
        const minRankIndex = rankOrder.indexOf(r.min_rank || "E");
        return userRankIndex >= minRankIndex;
      })
      .map((r: any) => ({
        ...r,
        userProgress: progressMap.get(r.id) || null,
        locked: false,
      }));

    // Also include locked resources (for display)
    const lockedResources = (resources || [])
      .filter((r: any) => {
        const minRankIndex = rankOrder.indexOf(r.min_rank || "E");
        return userRankIndex < minRankIndex;
      })
      .map((r: any) => ({
        ...r,
        userProgress: null,
        locked: true,
      }));

    // Get category counts
    const categories = ["scripts", "training", "templates", "guides", "videos", "tools"];
    const categoryCounts: Record<string, number> = {};
    for (const cat of categories) {
      categoryCounts[cat] = (resources || []).filter((r: any) => r.category === cat).length;
    }

    return NextResponse.json({
      ok: true,
      resources: [...accessibleResources, ...lockedResources],
      categories: categoryCounts,
      userRank,
      total: (resources || []).length,
      accessible: accessibleResources.length,
    });
  } catch (error: any) {
    console.error("Resources error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/resources - Update user progress on a resource
 */
export async function PATCH(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { resourceId, viewed, completed, rating, bookmarked, progressPercent, notes } = body;

  if (!resourceId) {
    return NextResponse.json({ error: "Missing resourceId" }, { status: 400 });
  }

  try {
    const updates: any = { updated_at: new Date().toISOString() };

    if (viewed !== undefined) {
      updates.viewed = viewed;
      if (viewed) updates.viewed_at = new Date().toISOString();
    }
    if (completed !== undefined) {
      updates.completed = completed;
      if (completed) updates.completed_at = new Date().toISOString();
    }
    if (rating !== undefined) updates.rating = rating;
    if (bookmarked !== undefined) updates.bookmarked = bookmarked;
    if (progressPercent !== undefined) updates.progress_percent = progressPercent;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabaseAdmin
      .from("user_resource_progress")
      .upsert({
        user_id: user.id,
        resource_id: resourceId,
        ...updates,
      }, { onConflict: "user_id,resource_id" })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Increment view count if first view
    if (viewed) {
      await supabaseAdmin.rpc("increment_resource_views", { rid: resourceId });
    }

    return NextResponse.json({ ok: true, progress: data });
  } catch (error: any) {
    console.error("Update progress error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

