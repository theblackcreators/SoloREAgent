import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ?? null;
}

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

/**
 * GET /api/shop - Get shop items and user's gold balance
 */
export async function GET(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const cohortId = url.searchParams.get("cohortId");
  const category = url.searchParams.get("category");

  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const cid = Number(cohortId);

  try {
    // Get program ID and user's stats
    const [cohortResult, statsResult] = await Promise.all([
      supabaseAdmin.from("cohorts").select("program_id").eq("id", cid).single(),
      supabaseAdmin.from("member_stats").select("gold, rank").eq("user_id", user.id).eq("cohort_id", cid).single(),
    ]);

    if (!cohortResult.data) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    const userGold = statsResult.data?.gold || 0;
    const userRank = statsResult.data?.rank || "E";
    const userRankIndex = RANK_ORDER.indexOf(userRank);

    // Build query for shop items
    let query = supabaseAdmin
      .from("shop_items")
      .select("*")
      .eq("program_id", cohortResult.data.program_id)
      .eq("active", true)
      .order("sort_order")
      .order("gold_cost");

    if (category) {
      query = query.eq("category", category);
    }

    const { data: items, error } = await query;
    if (error) throw new Error(error.message);

    // Get user's purchases for these items
    const itemIds = (items || []).map((i: any) => i.id);
    const { data: purchases } = await supabaseAdmin
      .from("user_purchases")
      .select("item_id, quantity, uses_remaining, status")
      .eq("user_id", user.id)
      .eq("cohort_id", cid)
      .in("item_id", itemIds);

    const purchaseMap = new Map();
    (purchases || []).forEach((p: any) => {
      const existing = purchaseMap.get(p.item_id) || { count: 0, uses: 0 };
      purchaseMap.set(p.item_id, {
        count: existing.count + p.quantity,
        uses: existing.uses + (p.uses_remaining || 0),
      });
    });

    // Format items with accessibility info
    const formattedItems = (items || []).map((item: any) => {
      const minRankIndex = RANK_ORDER.indexOf(item.min_rank || "E");
      const canAfford = userGold >= item.gold_cost;
      const hasAccess = userRankIndex >= minRankIndex;
      const userPurchase = purchaseMap.get(item.id);
      const atLimit = item.max_purchases && userPurchase?.count >= item.max_purchases;

      return {
        ...item,
        canAfford,
        hasAccess,
        owned: userPurchase?.count || 0,
        usesRemaining: userPurchase?.uses || 0,
        purchasable: canAfford && hasAccess && !atLimit,
        reason: !hasAccess ? `Requires Rank ${item.min_rank}` : !canAfford ? "Not enough gold" : atLimit ? "Already owned" : null,
      };
    });

    // Get active effects
    const { data: activeEffects } = await supabaseAdmin
      .from("user_active_effects")
      .select("*")
      .eq("user_id", user.id)
      .eq("cohort_id", cid)
      .gt("expires_at", new Date().toISOString());

    return NextResponse.json({
      ok: true,
      items: formattedItems,
      userGold,
      userRank,
      activeEffects: activeEffects || [],
      categories: ["boost", "consumable", "cosmetic", "unlock", "special"],
    });
  } catch (error: any) {
    console.error("Shop error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/shop - Purchase an item
 */
export async function POST(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { cohortId, itemId, quantity = 1 } = body;

  if (!cohortId || !itemId) {
    return NextResponse.json({ error: "Missing cohortId or itemId" }, { status: 400 });
  }

  const cid = Number(cohortId);

  try {
    // Get user's stats and the item
    const [statsResult, itemResult] = await Promise.all([
      supabaseAdmin.from("member_stats").select("gold, rank").eq("user_id", user.id).eq("cohort_id", cid).single(),
      supabaseAdmin.from("shop_items").select("*").eq("id", itemId).single(),
    ]);

    if (!itemResult.data) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = itemResult.data;
    const userGold = statsResult.data?.gold || 0;
    const userRank = statsResult.data?.rank || "E";
    const totalCost = item.gold_cost * quantity;

    // Validate purchase
    if (userGold < totalCost) {
      return NextResponse.json({ error: "Not enough gold", required: totalCost, available: userGold }, { status: 400 });
    }

    const userRankIndex = RANK_ORDER.indexOf(userRank);
    const minRankIndex = RANK_ORDER.indexOf(item.min_rank || "E");
    if (userRankIndex < minRankIndex) {
      return NextResponse.json({ error: `Requires Rank ${item.min_rank}` }, { status: 400 });
    }

    // Check purchase limit
    if (item.max_purchases) {
      const { data: existingPurchases } = await supabaseAdmin
        .from("user_purchases")
        .select("quantity")
        .eq("user_id", user.id)
        .eq("item_id", itemId);

      const totalOwned = (existingPurchases || []).reduce((sum: number, p: any) => sum + p.quantity, 0);
      if (totalOwned + quantity > item.max_purchases) {
        return NextResponse.json({ error: "Purchase limit reached" }, { status: 400 });
      }
    }

    // Process purchase: deduct gold and create purchase record
    const { error: goldError } = await supabaseAdmin
      .from("member_stats")
      .update({ gold: userGold - totalCost })
      .eq("user_id", user.id)
      .eq("cohort_id", cid);

    if (goldError) throw new Error(goldError.message);

    // Determine uses for consumables
    const effects = item.effects || {};
    const uses = effects.uses ? effects.uses * quantity : null;

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("user_purchases")
      .insert({
        user_id: user.id,
        cohort_id: cid,
        item_id: itemId,
        gold_spent: totalCost,
        quantity,
        uses_remaining: uses,
        status: "active",
      })
      .select()
      .single();

    if (purchaseError) throw new Error(purchaseError.message);

    // Apply immediate effects (boosts)
    if (effects.type && ["xp_boost", "gold_boost"].includes(effects.type)) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (effects.duration_hours || 24));

      await supabaseAdmin.from("user_active_effects").upsert({
        user_id: user.id,
        cohort_id: cid,
        purchase_id: purchase.id,
        effect_type: effects.type,
        effect_data: effects,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: "user_id,cohort_id,effect_type" });
    }

    return NextResponse.json({
      ok: true,
      purchase,
      newGoldBalance: userGold - totalCost,
      message: `Successfully purchased ${item.name}!`,
    });
  } catch (error: any) {
    console.error("Purchase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

