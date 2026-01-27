import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type LogInput } from "@shared/routes";
import { z } from "zod";

export function useDashboard(cohortId?: string) {
  // If no cohortId is passed, we might rely on the backend to pick a default active one
  // or return empty. For now, we assume the UI handles selection or defaults.
  const queryParams = cohortId ? { cohortId } : { cohortId: "1" }; // Default to ID 1 for MVP

  return useQuery({
    queryKey: [api.dashboard.get.path, queryParams.cohortId],
    queryFn: async () => {
      const url = buildUrl(api.dashboard.get.path) + `?cohortId=${queryParams.cohortId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return api.dashboard.get.responses[200].parse(await res.json());
    },
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

export function useCreateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LogInput) => {
      // Coerce number strings to numbers
      const payload = {
        ...data,
        steps: Number(data.steps || 0),
        learningMinutes: Number(data.learningMinutes || 0),
        calls: Number(data.calls || 0),
        texts: Number(data.texts || 0),
        convos: Number(data.convos || 0),
        leads: Number(data.leads || 0),
        appts: Number(data.appts || 0),
      };
      
      const validated = api.log.create.input.parse(payload);
      
      const res = await fetch(api.log.create.path, {
        method: api.log.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
           // Try to parse error message
           const err = await res.json();
           throw new Error(err.message || "Validation failed");
        }
        throw new Error("Failed to submit log");
      }
      return api.log.create.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
    },
  });
}

export function useJoinCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(api.join.path, {
        method: api.join.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      
      if (!res.ok) {
         const err = await res.json().catch(() => ({}));
         throw new Error(err.message || "Failed to join cohort");
      }
      return api.join.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
    }
  });
}
