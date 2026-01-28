"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { parseLatLng } from "@/lib/parseLatLng";

type Cohort = {
  id: number;
  name: string;
  program_id: number;
};

type Location = {
  id: number;
  zone: string;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  suggested_mission: string | null;
};

const ZONES = ["EaDo", "Humble/Atascocita", "Kingwood", "Summerwood"];

export default function AdminLocationsPage() {
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [programId, setProgramId] = useState<number | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [zoneFilter, setZoneFilter] = useState("All");
  
  // Add form state
  const [zone, setZone] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [suggestedMission, setSuggestedMission] = useState("");
  
  // Coordinate helper
  const [coordInput, setCoordInput] = useState("");
  const [coordPreview, setCoordPreview] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | "">("");
  
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohortId) {
      loadCohortDetails();
    }
  }, [selectedCohortId]);

  useEffect(() => {
    if (programId) {
      loadLocations();
    }
  }, [programId]);

  useEffect(() => {
    const parsed = parseLatLng(coordInput);
    setCoordPreview(parsed);
  }, [coordInput]);

  async function loadCohorts() {
    try {
      const res = await authedFetch("/api/admin/my-cohorts");
      const data = await res.json();

      if (data.ok) {
        setCohorts(data.cohorts);
        if (data.cohorts.length > 0) {
          setSelectedCohortId(data.cohorts[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading cohorts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCohortDetails() {
    if (!selectedCohortId) return;

    try {
      const res = await authedFetch(
        `/api/admin/program-by-cohort?cohortId=${selectedCohortId}`
      );
      const data = await res.json();

      if (data.ok) {
        setProgramId(data.cohort.program_id);
      }
    } catch (error) {
      console.error("Error loading cohort details:", error);
    }
  }

  async function loadLocations() {
    if (!programId) return;

    try {
      const res = await authedFetch(`/api/admin/locations?programId=${programId}`);
      const data = await res.json();

      if (data.ok) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  }

  async function handleAddLocation() {
    if (!selectedCohortId || !programId) return;

    setFeedback("");

    try {
      const res = await authedFetch("/api/admin/locations", {
        method: "POST",
        body: JSON.stringify({
          cohortId: selectedCohortId,
          programId,
          location: {
            zone,
            name,
            category,
            address: address || null,
            lat: lat ? Number(lat) : null,
            lng: lng ? Number(lng) : null,
            suggested_mission: suggestedMission || null,
          },
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setFeedback("✅ Location added!");
        loadLocations();
        // Reset form
        setZone("");
        setName("");
        setCategory("");
        setAddress("");
        setLat("");
        setLng("");
        setSuggestedMission("");
      } else {
        setFeedback(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setFeedback(`❌ ${error.message}`);
    }
  }

  async function handleUpdateLocation(id: number, field: string, value: any) {
    if (!selectedCohortId) return;

    try {
      await authedFetch("/api/admin/locations", {
        method: "PATCH",
        body: JSON.stringify({
          cohortId: selectedCohortId,
          id,
          patch: { [field]: value },
        }),
      });

      loadLocations();
    } catch (error) {
      console.error("Error updating location:", error);
    }
  }

  async function handleDeleteLocation(id: number) {
    if (!selectedCohortId) return;
    if (!confirm("Delete this location?")) return;

    try {
      await authedFetch(
        `/api/admin/locations?cohortId=${selectedCohortId}&id=${id}`,
        { method: "DELETE" }
      );

      loadLocations();
      setFeedback("✅ Location deleted");
    } catch (error: any) {
      setFeedback(`❌ ${error.message}`);
    }
  }

  function applyCoordinatesToForm() {
    if (!coordPreview) return;
    setLat(String(coordPreview.lat));
    setLng(String(coordPreview.lng));
    setFeedback("✅ Coordinates applied to form");
  }

  function applyCoordinatesToLocation() {
    if (!coordPreview || !selectedLocationId) return;

    const id = Number(selectedLocationId);
    handleUpdateLocation(id, "lat", coordPreview.lat);
    handleUpdateLocation(id, "lng", coordPreview.lng);
    setFeedback("✅ Coordinates applied to location");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  const filtered =
    zoneFilter === "All"
      ? locations
      : locations.filter((loc) => loc.zone === zoneFilter);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Location Management</h1>

        {/* Cohort Selector */}
        <div className="mb-8">
          <label className="block text-sm text-zinc-400 mb-2">Select Cohort</label>
          <select
            className="w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
            value={selectedCohortId || ""}
            onChange={(e) => setSelectedCohortId(Number(e.target.value))}
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Coordinate Helper */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Coordinate Helper</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Paste a Google Maps link or raw coordinates (lat,lng) to extract coordinates
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Input</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                placeholder="https://maps.google.com/... or 29.7604,-95.3698"
                value={coordInput}
                onChange={(e) => setCoordInput(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Detected</label>
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100">
                {coordPreview
                  ? `${coordPreview.lat}, ${coordPreview.lng}`
                  : "No coordinates detected"}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={applyCoordinatesToForm}
              disabled={!coordPreview}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded-lg text-sm"
            >
              Apply to Add Form
            </button>

            <div className="flex gap-2">
              <select
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>

              <button
                onClick={applyCoordinatesToLocation}
                disabled={!coordPreview || !selectedLocationId}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 rounded-lg text-sm"
              >
                Apply to Location
              </button>
            </div>

            <button
              onClick={() => {
                setCoordInput("");
                setCoordPreview(null);
              }}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Add Location Form */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Add New Location</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Zone *</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              >
                <option value="">Select zone...</option>
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Name *</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Category *</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Address</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Latitude</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Longitude</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-2">Suggested Mission</label>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-100"
              rows={2}
              value={suggestedMission}
              onChange={(e) => setSuggestedMission(e.target.value)}
            />
          </div>

          <button
            onClick={handleAddLocation}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            Add Location
          </button>

          {feedback && <div className="mt-4 text-sm">{feedback}</div>}
        </div>

        {/* Locations Table */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Locations</h2>

            <select
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
            >
              <option value="All">All Zones</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-3 text-zinc-400 font-medium">Zone</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Name</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Category</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Lat</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Lng</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loc) => (
                  <tr key={loc.id} className="border-b border-zinc-800/50">
                    <td className="p-3">{loc.zone}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        className="bg-transparent border-none text-zinc-100 w-full"
                        defaultValue={loc.name}
                        onBlur={(e) => handleUpdateLocation(loc.id, "name", e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        className="bg-transparent border-none text-zinc-100 w-full"
                        defaultValue={loc.category}
                        onBlur={(e) => handleUpdateLocation(loc.id, "category", e.target.value)}
                      />
                    </td>
                    <td className="p-3 text-sm text-zinc-400">
                      {loc.lat?.toFixed(4) || "—"}
                    </td>
                    <td className="p-3 text-sm text-zinc-400">
                      {loc.lng?.toFixed(4) || "—"}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

