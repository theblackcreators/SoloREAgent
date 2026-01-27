import { z } from 'zod';
import { 
  insertLogSchema, 
  insertLocationSchema, 
  insertInviteSchema,
  memberStats, 
  dailyQuests, 
  locations,
  cohortInvites,
  programs,
  cohorts
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // --- AUTH / ONBOARDING ---
  join: {
    method: 'POST' as const,
    path: '/api/join',
    input: z.object({
      code: z.string().min(1),
    }),
    responses: {
      200: z.object({ ok: z.boolean(), cohortId: z.number(), role: z.string() }),
      400: errorSchemas.validation,
      401: errorSchemas.unauthorized,
    },
  },
  
  // --- DASHBOARD / HUD ---
  dashboard: {
    get: {
      method: 'GET' as const,
      path: '/api/dashboard',
      input: z.object({
        cohortId: z.string(), // Query param
      }),
      responses: {
        200: z.object({
          stats: z.custom<typeof memberStats.$inferSelect>(),
          quests: z.array(z.custom<typeof dailyQuests.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
  },

  // --- LOGGING ---
  log: {
    create: {
      method: 'POST' as const,
      path: '/api/log',
      input: insertLogSchema,
      responses: {
        200: z.object({
          ok: z.boolean(),
          xpGain: z.number(),
          deltaXp: z.number(),
          updatedStats: z.custom<typeof memberStats.$inferSelect>(),
          autoCompletedQuestIds: z.array(z.number()),
        }),
        400: errorSchemas.validation,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/log/history',
      input: z.object({
        cohortId: z.string(),
      }),
      responses: {
        200: z.array(insertLogSchema), // Approximate return type
      },
    }
  },

  // --- MAP / LOCATIONS ---
  locations: {
    list: {
      method: 'GET' as const,
      path: '/api/locations',
      input: z.object({
        cohortId: z.string(),
      }),
      responses: {
        200: z.array(z.custom<typeof locations.$inferSelect>()),
      },
    },
    checkin: {
      method: 'POST' as const,
      path: '/api/locations/checkin',
      input: z.object({
        locationId: z.number(),
        cohortId: z.number(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },

  // --- ADMIN ---
  admin: {
    invites: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/invites',
        input: z.object({
          cohortId: z.string(),
        }),
        responses: {
          200: z.array(z.custom<typeof cohortInvites.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/admin/invites',
        input: insertInviteSchema,
        responses: {
          201: z.custom<typeof cohortInvites.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
    },
    locations: {
      create: {
        method: 'POST' as const,
        path: '/api/admin/locations',
        input: insertLocationSchema,
        responses: {
          201: z.custom<typeof locations.$inferSelect>(),
        },
      },
      geocode: {
        method: 'GET' as const,
        path: '/api/admin/geocode',
        input: z.object({
          cohortId: z.string(),
          q: z.string(),
        }),
        responses: {
          200: z.object({
            results: z.array(z.object({
              id: z.string(),
              name: z.string(),
              place_name: z.string(),
              address: z.string(),
              lat: z.number().nullable(),
              lng: z.number().nullable(),
            })),
          }),
        },
      },
    },
    cohorts: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/cohorts', // My cohorts where I am admin
        responses: {
          200: z.array(z.custom<typeof cohorts.$inferSelect>()),
        },
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
