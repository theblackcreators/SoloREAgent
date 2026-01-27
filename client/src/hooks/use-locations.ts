import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type LocationInput } from "@shared/routes";

export function useLocations(cohortId: string = "1") {
  return useQuery({
    queryKey: [api.locations.list.path, cohortId],
    queryFn: async () => {
      const url = `${api.locations.list.path}?cohortId=${cohortId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch locations");
      return api.locations.list.responses[200].parse(await res.json());
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ locationId, cohortId }: { locationId: number; cohortId: number }) => {
      const res = await fetch(api.locations.checkin.path, {
        method: api.locations.checkin.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, cohortId }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Check-in failed");
      return api.locations.checkin.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
    },
  });
}

// ADMIN HOOKS

export function useAdminCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LocationInput) => {
      const res = await fetch(api.admin.locations.create.path, {
        method: api.admin.locations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create location");
      return api.admin.locations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.locations.list.path] });
    },
  });
}

export function useGeocode(cohortId: string, query: string, enabled: boolean) {
  return useQuery({
    queryKey: [api.admin.locations.geocode.path, query],
    queryFn: async () => {
      if (!query) return { results: [] };
      const url = `${api.admin.locations.geocode.path}?cohortId=${cohortId}&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Geocode failed");
      return api.admin.locations.geocode.responses[200].parse(await res.json());
    },
    enabled: enabled && query.length > 3,
  });
}
