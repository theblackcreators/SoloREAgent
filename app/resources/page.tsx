"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { getSupabase } from "@/lib/supabaseClient";

interface Resource {
  id: number;
  title: string;
  description: string;
  category: string;
  content_type: string;
  content: string | null;
  url: string | null;
  difficulty: string;
  tags: string[];
  min_rank: string;
  featured: boolean;
  view_count: number;
  locked: boolean;
  userProgress: {
    viewed: boolean;
    completed: boolean;
    bookmarked: boolean;
    rating: number | null;
  } | null;
}

const CATEGORIES = [
  { key: "all", label: "All", icon: "📚" },
  { key: "scripts", label: "Scripts", icon: "📝" },
  { key: "training", label: "Training", icon: "🎓" },
  { key: "templates", label: "Templates", icon: "📋" },
  { key: "guides", label: "Guides", icon: "📖" },
  { key: "videos", label: "Videos", icon: "🎬" },
  { key: "tools", label: "Tools", icon: "🛠️" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-900/50 text-green-300 border-green-700",
  intermediate: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  advanced: "bg-red-900/50 text-red-300 border-red-700",
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchResources();
  }, [activeCategory]);

  async function fetchResources() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const cohortId = localStorage.getItem("activeCohortId");
      if (!cohortId) return;

      let url = `/api/resources?cohortId=${cohortId}`;
      if (activeCategory !== "all") {
        url += `&category=${activeCategory}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
        setCategoryCounts(data.categories || {});
      }
    } catch (err) {
      console.error("Failed to fetch resources:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsViewed(resource: Resource) {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch("/api/resources", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ resourceId: resource.id, viewed: true }),
      });
    } catch (err) {
      console.error("Failed to mark as viewed:", err);
    }
  }

  async function toggleBookmark(resource: Resource) {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const newBookmarked = !resource.userProgress?.bookmarked;
      
      await fetch("/api/resources", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ resourceId: resource.id, bookmarked: newBookmarked }),
      });

      setResources((prev) =>
        prev.map((r) =>
          r.id === resource.id
            ? { ...r, userProgress: { ...r.userProgress, bookmarked: newBookmarked } as any }
            : r
        )
      );
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  }

  const filteredResources = resources.filter((r) =>
    searchQuery
      ? r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const featuredResources = filteredResources.filter((r) => r.featured && !r.locked);
  const regularResources = filteredResources.filter((r) => !r.featured && !r.locked);
  const lockedResources = filteredResources.filter((r) => r.locked);

  function openResource(resource: Resource) {
    if (resource.locked) return;
    setSelectedResource(resource);
    markAsViewed(resource);
  }

  function getCategoryIcon(category: string) {
    return CATEGORIES.find((c) => c.key === category)?.icon || "📄";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📚 Resource Library</h1>
          <p className="text-zinc-400">Training materials, scripts, and guides to level up your skills</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 pl-10 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => {
            const count = cat.key === "all"
              ? resources.length
              : categoryCounts[cat.key] || 0;
            return (
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
                <span className="ml-2 text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-zinc-400">Loading resources...</p>
          </div>
        ) : (
          <>
            {/* Featured Resources */}
            {featuredResources.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>⭐</span> Featured Resources
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onClick={() => openResource(resource)}
                      onBookmark={() => toggleBookmark(resource)}
                      getCategoryIcon={getCategoryIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Resources */}
            {regularResources.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">All Resources</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regularResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onClick={() => openResource(resource)}
                      onBookmark={() => toggleBookmark(resource)}
                      getCategoryIcon={getCategoryIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Locked Resources */}
            {lockedResources.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>🔒</span> Unlock with Higher Rank
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                  {lockedResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onClick={() => {}}
                      onBookmark={() => {}}
                      getCategoryIcon={getCategoryIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredResources.length === 0 && (
              <div className="text-center py-12 bg-zinc-900 rounded-xl">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-zinc-400">No resources found</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 text-purple-400 hover:text-purple-300"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Resource Detail Modal */}
      {selectedResource && (
        <ResourceModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          getCategoryIcon={getCategoryIcon}
        />
      )}
    </div>
  );
}

/* Resource Card Component */
function ResourceCard({
  resource,
  onClick,
  onBookmark,
  getCategoryIcon,
}: {
  resource: Resource;
  onClick: () => void;
  onBookmark: () => void;
  getCategoryIcon: (cat: string) => string;
}) {
  const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: "bg-green-900/50 text-green-300 border-green-700",
    intermediate: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    advanced: "bg-red-900/50 text-red-300 border-red-700",
  };

  return (
    <div
      onClick={onClick}
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-all ${
        resource.locked
          ? "cursor-not-allowed"
          : "cursor-pointer hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getCategoryIcon(resource.category)}</span>
          {resource.locked && <span className="text-lg">🔒</span>}
        </div>
        <div className="flex items-center gap-2">
          {resource.userProgress?.viewed && !resource.locked && (
            <span className="text-green-400 text-sm">✓ Viewed</span>
          )}
          {!resource.locked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookmark();
              }}
              className={`text-xl ${
                resource.userProgress?.bookmarked
                  ? "text-yellow-400"
                  : "text-zinc-600 hover:text-yellow-400"
              }`}
            >
              {resource.userProgress?.bookmarked ? "⭐" : "☆"}
            </button>
          )}
        </div>
      </div>

      <h3 className="font-bold text-lg mb-2 line-clamp-2">{resource.title}</h3>
      <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{resource.description}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-xs px-2 py-1 rounded border ${
            DIFFICULTY_COLORS[resource.difficulty] || DIFFICULTY_COLORS.beginner
          }`}
        >
          {resource.difficulty}
        </span>
        {resource.locked && (
          <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
            Rank {resource.min_rank}+
          </span>
        )}
        <span className="text-xs text-zinc-500 ml-auto">
          👁 {resource.view_count}
        </span>
      </div>

      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {resource.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* Resource Modal Component */
function ResourceModal({
  resource,
  onClose,
  getCategoryIcon,
}: {
  resource: Resource;
  onClose: () => void;
  getCategoryIcon: (cat: string) => string;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getCategoryIcon(resource.category)}</span>
            <div>
              <h2 className="text-xl font-bold">{resource.title}</h2>
              <p className="text-zinc-400 text-sm">{resource.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {resource.content_type === "markdown" || resource.content_type === "text" ? (
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed">
                {resource.content}
              </pre>
            </div>
          ) : resource.content_type === "link" && resource.url ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-4">This resource links to an external site:</p>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
              >
                Open Resource →
              </a>
            </div>
          ) : resource.content_type === "video" && resource.url ? (
            <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300"
              >
                🎬 Watch Video
              </a>
            </div>
          ) : (
            <p className="text-zinc-400">Content not available for preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}

