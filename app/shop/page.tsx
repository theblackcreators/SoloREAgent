"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { getSupabase } from "@/lib/supabaseClient";

interface ShopItem {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  gold_cost: number;
  effects: any;
  min_rank: string;
  featured: boolean;
  canAfford: boolean;
  hasAccess: boolean;
  owned: number;
  usesRemaining: number;
  purchasable: boolean;
  reason: string | null;
}

interface ActiveEffect {
  effect_type: string;
  effect_data: any;
  expires_at: string;
}

const CATEGORIES = [
  { key: "all", label: "All", icon: "🛒" },
  { key: "boost", label: "Boosts", icon: "⚡" },
  { key: "consumable", label: "Consumables", icon: "🎫" },
  { key: "cosmetic", label: "Cosmetics", icon: "✨" },
  { key: "unlock", label: "Unlocks", icon: "🔓" },
  { key: "special", label: "Special", icon: "🌟" },
];

const CATEGORY_COLORS: Record<string, string> = {
  boost: "border-yellow-500 bg-yellow-900/20",
  consumable: "border-blue-500 bg-blue-900/20",
  cosmetic: "border-purple-500 bg-purple-900/20",
  unlock: "border-green-500 bg-green-900/20",
  special: "border-red-500 bg-red-900/20",
};

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [userGold, setUserGold] = useState(0);
  const [userRank, setUserRank] = useState("E");
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchShop();
  }, []);

  async function fetchShop() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const cohortId = localStorage.getItem("activeCohortId");
      if (!cohortId) return;

      const res = await fetch(`/api/shop?cohortId=${cohortId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setUserGold(data.userGold || 0);
        setUserRank(data.userRank || "E");
        setActiveEffects(data.activeEffects || []);
      }
    } catch (err) {
      console.error("Failed to fetch shop:", err);
    } finally {
      setLoading(false);
    }
  }

  async function purchaseItem(item: ShopItem) {
    if (!item.purchasable) return;
    setPurchasing(item.id);
    setMessage(null);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const cohortId = localStorage.getItem("activeCohortId");
      if (!cohortId) return;

      const res = await fetch("/api/shop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ cohortId: Number(cohortId), itemId: item.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Purchase successful!" });
        setUserGold(data.newGoldBalance);
        fetchShop(); // Refresh to update owned status
      } else {
        setMessage({ type: "error", text: data.error || "Purchase failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Purchase failed" });
    } finally {
      setPurchasing(null);
    }
  }

  const filteredItems = activeCategory === "all" 
    ? items 
    : items.filter((i) => i.category === activeCategory);

  const featuredItems = filteredItems.filter((i) => i.featured);
  const regularItems = filteredItems.filter((i) => !i.featured);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with Gold Balance */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">🛒 Shop</h1>
            <p className="text-zinc-400">Spend your gold on boosts and rewards</p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl px-6 py-3">
            <div className="text-sm text-yellow-400">Your Gold</div>
            <div className="text-2xl font-bold text-yellow-300">💰 {userGold.toLocaleString()}</div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-900/50 border border-green-600 text-green-300" : "bg-red-900/50 border border-red-600 text-red-300"}`}>
            {message.text}
          </div>
        )}

        {/* Active Effects */}
        {activeEffects.length > 0 && (
          <div className="mb-6 p-4 bg-purple-900/30 border border-purple-600 rounded-xl">
            <h3 className="font-bold mb-2">✨ Active Effects</h3>
            <div className="flex flex-wrap gap-2">
              {activeEffects.map((effect, i) => (
                <span key={i} className="px-3 py-1 bg-purple-800/50 rounded-full text-sm">
                  {effect.effect_type === "xp_boost" && "⚡ XP Boost"}
                  {effect.effect_type === "gold_boost" && "💰 Gold Boost"}
                  <span className="text-purple-400 ml-2">
                    expires {new Date(effect.expires_at).toLocaleTimeString()}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeCategory === cat.key
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-zinc-400">Loading shop...</p>
          </div>
        ) : (
          <>
            {/* Featured Items */}
            {featuredItems.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>⭐</span> Featured
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredItems.map((item) => (
                    <ShopItemCard
                      key={item.id}
                      item={item}
                      onPurchase={() => purchaseItem(item)}
                      purchasing={purchasing === item.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Items */}
            {regularItems.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Available Items</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regularItems.map((item) => (
                    <ShopItemCard
                      key={item.id}
                      item={item}
                      onPurchase={() => purchaseItem(item)}
                      purchasing={purchasing === item.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="text-center py-12 bg-zinc-900 rounded-xl">
                <div className="text-4xl mb-4">🏪</div>
                <p className="text-zinc-400">No items available in this category</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ShopItemCard({
  item,
  onPurchase,
  purchasing,
}: {
  item: ShopItem;
  onPurchase: () => void;
  purchasing: boolean;
}) {
  const CATEGORY_COLORS: Record<string, string> = {
    boost: "border-yellow-500 bg-yellow-900/20",
    consumable: "border-blue-500 bg-blue-900/20",
    cosmetic: "border-purple-500 bg-purple-900/20",
    unlock: "border-green-500 bg-green-900/20",
    special: "border-red-500 bg-red-900/20",
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        CATEGORY_COLORS[item.category] || "border-zinc-700 bg-zinc-900"
      } ${!item.purchasable ? "opacity-60" : "hover:shadow-lg"}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-4xl">{item.icon}</span>
        {item.owned > 0 && (
          <span className="text-xs px-2 py-1 bg-green-800/50 text-green-300 rounded">
            Owned: {item.owned}
          </span>
        )}
      </div>

      <h3 className="font-bold text-lg mb-1">{item.name}</h3>
      <p className="text-zinc-400 text-sm mb-4">{item.description}</p>

      {/* Effect Info */}
      {item.effects?.duration_hours && (
        <div className="text-xs text-zinc-500 mb-2">
          ⏱️ Duration: {item.effects.duration_hours} hours
        </div>
      )}

      {/* Price and Buy Button */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1 text-yellow-400 font-bold">
          💰 {item.gold_cost.toLocaleString()}
        </div>

        {!item.hasAccess ? (
          <span className="text-xs text-zinc-500">🔒 Rank {item.min_rank}+</span>
        ) : item.purchasable ? (
          <button
            onClick={onPurchase}
            disabled={purchasing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 rounded-lg font-medium transition-colors"
          >
            {purchasing ? "..." : "Buy"}
          </button>
        ) : (
          <span className="text-xs text-zinc-500">{item.reason}</span>
        )}
      </div>
    </div>
  );
}

