"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type Location = {
  id: number;
  zone: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  suggested_mission: string | null;
  checked_in: boolean;
};

const ZONES = ["EaDo", "Humble/Atascocita", "Kingwood", "Summerwood"];

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [programId, setProgramId] = useState<number | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("All");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadMap();
  }, []);

  useEffect(() => {
    if (map.current && locations.length > 0) {
      updateMarkers();
    }
  }, [locations, selectedZone]);

  async function loadMap() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/join";
        return;
      }

      const cid = localStorage.getItem("cohortId");
      if (!cid) {
        window.location.href = "/dashboard";
        return;
      }

      const cohortIdNum = Number(cid);
      setCohortId(cohortIdNum);

      // Get program ID
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("program_id")
        .eq("id", cohortIdNum)
        .single();

      if (cohortData) {
        setProgramId(cohortData.program_id);

        // Load locations
        const { data: locationsData } = await supabase
          .from("locations")
          .select("*")
          .eq("program_id", cohortData.program_id);

        if (locationsData) {
          // Check which locations user has checked in
          const { data: checkIns } = await supabase
            .from("location_check_ins")
            .select("location_id")
            .eq("user_id", user.id)
            .eq("cohort_id", cohortIdNum);

          const checkedInIds = new Set(checkIns?.map((c) => c.location_id) || []);

          const locs = locationsData.map((loc) => ({
            ...loc,
            checked_in: checkedInIds.has(loc.id),
          }));

          setLocations(locs);
        }
      }

      // Initialize Mapbox
      if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
        console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
        return;
      }

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      if (mapContainer.current) {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [-95.3698, 29.7604], // Houston
          zoom: 10,
        });
      }
    } catch (error) {
      console.error("Error loading map:", error);
    } finally {
      setLoading(false);
    }
  }

  function updateMarkers() {
    if (!map.current) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll(".mapboxgl-marker");
    existingMarkers.forEach((m) => m.remove());

    const filtered =
      selectedZone === "All"
        ? locations
        : locations.filter((loc) => loc.zone === selectedZone);

    filtered.forEach((loc) => {
      if (loc.lat === null || loc.lng === null) return;

      const el = document.createElement("div");
      el.className = "w-8 h-8 rounded-full border-2 cursor-pointer";
      el.style.backgroundColor = loc.checked_in ? "#84cc16" : "#52525b";
      el.style.borderColor = loc.checked_in ? "#65a30d" : "#3f3f46";

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.lng, loc.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-bold">${loc.name}</h3>
              <p class="text-sm text-gray-400">${loc.category}</p>
              ${loc.suggested_mission ? `<p class="text-xs mt-1">${loc.suggested_mission}</p>` : ""}
              ${loc.checked_in ? '<p class="text-green-400 text-xs mt-1">✓ Checked In</p>' : ""}
            </div>
          `)
        )
        .addTo(map.current!);
    });
  }

  async function handleCheckIn(locationId: number) {
    if (!cohortId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("location_check_ins").insert({
        user_id: user.id,
        cohort_id: cohortId,
        location_id: locationId,
        checked_in_at: new Date().toISOString(),
      });

      if (error) {
        setFeedback(`❌ ${error.message}`);
        return;
      }

      // Update local state
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId ? { ...loc, checked_in: true } : loc
        )
      );

      setFeedback("✅ Checked in! Dungeon quest auto-completed.");
    } catch (error: any) {
      setFeedback(`❌ ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading map...</div>
      </div>
    );
  }

  const filtered =
    selectedZone === "All"
      ? locations
      : locations.filter((loc) => loc.zone === selectedZone);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Sidebar */}
        <div className="lg:w-96 bg-zinc-900 border-r border-zinc-800 p-6 overflow-y-auto">
          <h1 className="text-3xl font-bold mb-6">Dungeon Map</h1>

          {/* Zone Filter */}
          <div className="mb-6">
            <label className="block text-sm text-zinc-400 mb-2">Zone</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              <option value="All">All Zones</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          {/* Locations List */}
          <div className="space-y-3">
            {filtered.map((loc) => (
              <div
                key={loc.id}
                className={`p-4 rounded-lg border ${
                  loc.checked_in
                    ? "bg-emerald-950/30 border-emerald-800"
                    : "bg-zinc-800/40 border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{loc.name}</h3>
                    <p className="text-xs text-zinc-400">{loc.category}</p>
                    <p className="text-xs text-zinc-500">{loc.zone}</p>
                  </div>
                  {!loc.checked_in && (
                    <button
                      onClick={() => handleCheckIn(loc.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      Check In
                    </button>
                  )}
                  {loc.checked_in && (
                    <span className="text-emerald-400">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {feedback && (
            <div className="mt-4 text-sm text-center">{feedback}</div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1">
          <div ref={mapContainer} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}

