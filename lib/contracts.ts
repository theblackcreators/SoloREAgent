import { z } from "zod";

export const IdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform(Number),
]);

export const LogPayloadSchema = z.object({
  userId: z.string().min(1),
  cohortId: IdSchema,
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().nonnegative().default(0),
  workout_done: z.boolean().default(false),
  learning_minutes: z.number().int().nonnegative().default(0),
  calls: z.number().int().nonnegative().default(0),
  texts: z.number().int().nonnegative().default(0),
  convos: z.number().int().nonnegative().default(0),
  leads: z.number().int().nonnegative().default(0),
  appts: z.number().int().nonnegative().default(0),
  content_done: z.boolean().default(false),
  notes: z.string().default(""),
});

export const AdminGeocodeQuerySchema = z.object({
  cohortId: IdSchema,
  q: z.string().min(2),
});

export const LocationCreateSchema = z.object({
  cohortId: IdSchema,
  programId: IdSchema,
  location: z.object({
    zone: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    address: z.string().nullable().optional(),
    lat: z.union([z.number(), z.string(), z.null()]).optional(),
    lng: z.union([z.number(), z.string(), z.null()]).optional(),
    suggested_mission: z.string().nullable().optional(),
  }),
});

export const LocationPatchSchema = z.object({
  cohortId: IdSchema,
  id: IdSchema,
  patch: z.record(z.any()),
});

