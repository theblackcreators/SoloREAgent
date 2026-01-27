import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, bigint, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth"; // Import users from auth module

export * from "./models/auth";

// --- ENUMS ---
export const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export const QUEST_TYPES = ["fitness", "business", "learning", "location", "mandatory"] as const;
export const MEMBER_ROLES = ["agent", "coach", "admin"] as const;

// --- TABLES ---

// Programs (Template for a leveling system)
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  city: text("city").default("Greater Houston"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cohorts (Running instance of a program)
export const cohorts = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id),
  name: text("name").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cohort Memberships (User in a cohort)
export const cohortMemberships = pgTable("cohort_memberships", {
  id: serial("id").primaryKey(),
  cohortId: integer("cohort_id").notNull().references(() => cohorts.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role", { enum: MEMBER_ROLES }).notNull().default("agent"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Member Stats (Gamified stats per user per cohort)
export const memberStats = pgTable("member_stats", {
  id: serial("id").primaryKey(),
  cohortId: integer("cohort_id").notNull().references(() => cohorts.id),
  userId: text("user_id").notNull().references(() => users.id),
  xp: integer("xp").default(0).notNull(),
  rank: text("rank", { enum: RANKS }).default("E").notNull(),
  streak: integer("streak").default(0).notNull(),
  str: integer("str").default(10).notNull(),
  sta: integer("sta").default(12).notNull(),
  agi: integer("agi").default(8).notNull(),
  int: integer("int_stat").default(15).notNull(), // 'int' is reserved
  cha: integer("cha").default(10).notNull(),
  rep: integer("rep").default(5).notNull(),
  gold: integer("gold").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quest Templates (Definitions)
export const questTemplates = pgTable("quest_templates", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id),
  questType: text("quest_type", { enum: QUEST_TYPES }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  xpReward: integer("xp_reward").default(0).notNull(),
  statRewards: jsonb("stat_rewards").default({}).notNull(), // { str: 1, sta: 1 }
  requiredInputs: jsonb("required_inputs").default({}).notNull(), // { steps: "number" }
  completionRule: jsonb("completion_rule"), // { "field": "steps", "op": "gte", "value": 7000 }
  minRank: text("min_rank", { enum: RANKS }).default("E").notNull(),
  isActive: boolean("active").default(true).notNull(),
});

// Daily Quests (Instantiated for a user)
export const dailyQuests = pgTable("daily_quests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  cohortId: integer("cohort_id").notNull().references(() => cohorts.id),
  questDate: date("quest_date").notNull(),
  templateId: integer("template_id").references(() => questTemplates.id),
  title: text("title").notNull(),
  description: text("description"),
  questType: text("quest_type", { enum: QUEST_TYPES }).notNull(),
  xpReward: integer("xp_reward").default(0).notNull(),
  statRewards: jsonb("stat_rewards").default({}).notNull(),
  completionRule: jsonb("completion_rule"), // Snapshot of rule
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
});

// Daily Logs (User activity inputs)
export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  cohortId: integer("cohort_id").notNull().references(() => cohorts.id),
  logDate: date("log_date").notNull(),
  steps: integer("steps").default(0),
  workoutDone: boolean("workout_done").default(false),
  learningMinutes: integer("learning_minutes").default(0),
  calls: integer("calls").default(0),
  texts: integer("texts").default(0),
  convos: integer("convos").default(0),
  leads: integer("leads").default(0),
  appts: integer("appts").default(0),
  contentDone: boolean("content_done").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Locations ("Dungeons")
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id),
  zone: text("zone").notNull(), // EaDo, Kingwood, etc.
  name: text("name").notNull(),
  category: text("category").notNull(), // park, coffee, etc.
  address: text("address"),
  lat: text("lat"), // Storing as text to avoid precision issues, or use decimal/double if supported
  lng: text("lng"),
  suggestedMission: text("suggested_mission"),
});

// Location Check-ins
export const locationCheckins = pgTable("location_checkins", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  checkinDate: date("checkin_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invite Codes
export const cohortInvites = pgTable("cohort_invites", {
  id: serial("id").primaryKey(),
  cohortId: integer("cohort_id").notNull().references(() => cohorts.id),
  code: text("code").notNull().unique(),
  role: text("role", { enum: MEMBER_ROLES }).default("agent").notNull(),
  maxUses: integer("max_uses").default(1).notNull(),
  uses: integer("uses").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invite Redemptions
export const inviteRedemptions = pgTable("invite_redemptions", {
  id: serial("id").primaryKey(),
  inviteId: integer("invite_id").notNull().references(() => cohortInvites.id),
  cohortId: integer("cohort_id").notNull().references(() => cohorts.id),
  userId: text("user_id").notNull().references(() => users.id),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

// --- RELATIONS ---

export const programsRelations = relations(programs, ({ many }) => ({
  cohorts: many(cohorts),
  questTemplates: many(questTemplates),
  locations: many(locations),
}));

export const cohortsRelations = relations(cohorts, ({ one, many }) => ({
  program: one(programs, {
    fields: [cohorts.programId],
    references: [programs.id],
  }),
  memberships: many(cohortMemberships),
  invites: many(cohortInvites),
}));

export const cohortMembershipsRelations = relations(cohortMemberships, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [cohortMemberships.cohortId],
    references: [cohorts.id],
  }),
  user: one(users, {
    fields: [cohortMemberships.userId],
    references: [users.id],
  }),
}));

export const memberStatsRelations = relations(memberStats, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [memberStats.cohortId],
    references: [cohorts.id],
  }),
  user: one(users, {
    fields: [memberStats.userId],
    references: [users.id],
  }),
}));

export const dailyQuestsRelations = relations(dailyQuests, ({ one }) => ({
  user: one(users, {
    fields: [dailyQuests.userId],
    references: [users.id],
  }),
  cohort: one(cohorts, {
    fields: [dailyQuests.cohortId],
    references: [cohorts.id],
  }),
  template: one(questTemplates, {
    fields: [dailyQuests.templateId],
    references: [questTemplates.id],
  }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  program: one(programs, {
    fields: [locations.programId],
    references: [programs.id],
  }),
  checkins: many(locationCheckins),
}));

export const locationCheckinsRelations = relations(locationCheckins, ({ one }) => ({
  user: one(users, {
    fields: [locationCheckins.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [locationCheckins.locationId],
    references: [locations.id],
  }),
}));

// --- SCHEMAS ---

export const insertProgramSchema = createInsertSchema(programs).omit({ id: true, createdAt: true });
export const insertCohortSchema = createInsertSchema(cohorts).omit({ id: true, createdAt: true });
export const insertQuestTemplateSchema = createInsertSchema(questTemplates).omit({ id: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true });
export const insertInviteSchema = createInsertSchema(cohortInvites).omit({ id: true, uses: true, createdAt: true, createdBy: true });
export const insertLogSchema = createInsertSchema(dailyLogs).omit({ id: true, createdAt: true });

// --- TYPES ---
export type Program = typeof programs.$inferSelect;
export type Cohort = typeof cohorts.$inferSelect;
export type MemberStat = typeof memberStats.$inferSelect;
export type DailyQuest = typeof dailyQuests.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type LocationCheckin = typeof locationCheckins.$inferSelect;
export type CohortInvite = typeof cohortInvites.$inferSelect;

// Request/Response Types
export type LogInput = z.infer<typeof insertLogSchema>;
export type LocationInput = z.infer<typeof insertLocationSchema>;
export type InviteInput = z.infer<typeof insertInviteSchema>;
