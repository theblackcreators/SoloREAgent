import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InviteInput } from "@shared/routes";

export function useCohorts() {
  return useQuery({
    queryKey: [api.admin.cohorts.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.cohorts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cohorts");
      return api.admin.cohorts.list.responses[200].parse(await res.json());
    },
  });
}

export function useInvites(cohortId: string) {
  return useQuery({
    queryKey: [api.admin.invites.list.path, cohortId],
    queryFn: async () => {
      const url = `${api.admin.invites.list.path}?cohortId=${cohortId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invites");
      return api.admin.invites.list.responses[200].parse(await res.json());
    },
    enabled: !!cohortId,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InviteInput) => {
      const res = await fetch(api.admin.invites.create.path, {
        method: api.admin.invites.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create invite");
      return api.admin.invites.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.invites.list.path] });
    },
  });
}

export function useAdminCreateLocation() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.admin.locations.create.path, {
        method: api.admin.locations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create location");
      return api.admin.locations.create.responses[201].parse(await res.json());
    },
  });
}

export function useGeocode(cohortId: string, q: string) {
  return useQuery({
    queryKey: [api.admin.locations.geocode.path, cohortId, q],
    queryFn: async () => {
      const url = `${api.admin.locations.geocode.path}?cohortId=${cohortId}&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Geocoding failed");
      return api.admin.locations.geocode.responses[200].parse(await res.json());
    },
    enabled: !!cohortId && !!q && q.length > 2,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}
