import { 
  users, programs, cohorts, cohortMemberships, memberStats, 
  questTemplates, dailyQuests, dailyLogs, locations, locationCheckins, 
  cohortInvites, inviteRedemptions,
  type User, type InsertUser, type Program, type Cohort, type MemberStat, 
  type DailyQuest, type DailyLog, type Location, type CohortInvite,
  type LogInput, type LocationInput, type InviteInput
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  // Auth & User
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Onboarding
  getInviteByCode(code: string): Promise<CohortInvite | undefined>;
  redeemInvite(inviteId: number, cohortId: number, userId: string): Promise<void>;
  createMembership(userId: string, cohortId: number, role: string): Promise<void>;
  initMemberStats(userId: string, cohortId: number): Promise<void>;
  
  // Dashboard
  getMemberStats(userId: string, cohortId: number): Promise<MemberStat | undefined>;
  getDailyQuests(userId: string, cohortId: number, date: string): Promise<DailyQuest[]>;
  ensureDailyQuests(userId: string, cohortId: number, date: string): Promise<void>;

  // Logging & XP Engine
  getDailyLog(userId: string, cohortId: number, date: string): Promise<DailyLog | undefined>;
  upsertDailyLog(log: LogInput & { userId: string; cohortId: number }): Promise<DailyLog>;
  updateMemberStats(userId: string, cohortId: number, updates: Partial<MemberStat>): Promise<MemberStat>;
  updateQuestCompletion(questIds: number[], completed: boolean): Promise<void>;

  // Admin / Locations
  getAdminCohorts(userId: string): Promise<Cohort[]>;
  getLocations(programId: number): Promise<Location[]>;
  createLocation(input: LocationInput & { programId: number }): Promise<Location>;
  checkinLocation(userId: string, locationId: number): Promise<void>;
  
  // Admin / Invites
  getInvites(cohortId: number): Promise<CohortInvite[]>;
  createInvite(input: InviteInput & { cohortId: number; createdBy: string }): Promise<CohortInvite>;

  // Helpers
  getCohort(id: number): Promise<Cohort | undefined>;
}

export class DatabaseStorage implements IStorage {
  // --- Auth Delegates ---
  async getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return authStorage.upsertUser(insertUser as any); 
  }

  // --- Onboarding ---
  async getInviteByCode(code: string): Promise<CohortInvite | undefined> {
    const [invite] = await db.select().from(cohortInvites).where(eq(cohortInvites.code, code));
    return invite;
  }

  async redeemInvite(inviteId: number, cohortId: number, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Record redemption
      await tx.insert(inviteRedemptions).values({
        inviteId,
        cohortId,
        userId,
      });
      // 2. Increment uses
      await tx.update(cohortInvites)
        .set({ uses: sql`${cohortInvites.uses} + 1` })
        .where(eq(cohortInvites.id, inviteId));
    });
  }

  async createMembership(userId: string, cohortId: number, role: string): Promise<void> {
    await db.insert(cohortMemberships).values({
      userId,
      cohortId,
      role: role as any,
    });
  }

  async initMemberStats(userId: string, cohortId: number): Promise<void> {
    await db.insert(memberStats).values({
      userId,
      cohortId,
      xp: 0,
      rank: "E",
      str: 10,
      sta: 12,
      agi: 8,
      int: 15,
      cha: 10,
      rep: 5,
      gold: 0,
    });
  }

  // --- Dashboard ---
  async getMemberStats(userId: string, cohortId: number): Promise<MemberStat | undefined> {
    const [stats] = await db.select()
      .from(memberStats)
      .where(and(eq(memberStats.userId, userId), eq(memberStats.cohortId, cohortId)));
    return stats;
  }

  async getDailyQuests(userId: string, cohortId: number, date: string): Promise<DailyQuest[]> {
    return db.select()
      .from(dailyQuests)
      .where(and(
        eq(dailyQuests.userId, userId),
        eq(dailyQuests.cohortId, cohortId),
        eq(dailyQuests.questDate, date)
      ));
  }

  async ensureDailyQuests(userId: string, cohortId: number, date: string): Promise<void> {
    // Check if quests exist
    const existing = await this.getDailyQuests(userId, cohortId, date);
    if (existing.length > 0) return;

    // Fetch templates from the program associated with this cohort
    const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId));
    if (!cohort) return;

    const templates = await db.select()
      .from(questTemplates)
      .where(and(
        eq(questTemplates.programId, cohort.programId),
        eq(questTemplates.isActive, true)
      ));

    if (templates.length === 0) return;

    // Instantiate daily quests
    const toInsert = templates.map(t => ({
      userId,
      cohortId,
      questDate: date,
      templateId: t.id,
      title: t.title,
      description: t.description,
      questType: t.questType,
      xpReward: t.xpReward,
      statRewards: t.statRewards,
      completionRule: t.completionRule, // Snapshot!
      completed: false
    }));

    await db.insert(dailyQuests).values(toInsert);
  }

  // --- Logging ---
  async getDailyLog(userId: string, cohortId: number, date: string): Promise<DailyLog | undefined> {
    const [log] = await db.select()
      .from(dailyLogs)
      .where(and(
        eq(dailyLogs.userId, userId),
        eq(dailyLogs.cohortId, cohortId),
        eq(dailyLogs.logDate, date)
      ));
    return log;
  }

  async upsertDailyLog(log: LogInput & { userId: string; cohortId: number }): Promise<DailyLog> {
    const [saved] = await db.insert(dailyLogs)
      .values(log)
      .onConflictDoUpdate({
        target: [dailyLogs.userId, dailyLogs.cohortId, dailyLogs.logDate],
        set: log
      })
      .returning();
    return saved;
  }

  async updateMemberStats(userId: string, cohortId: number, updates: Partial<MemberStat>): Promise<MemberStat> {
    const [updated] = await db.update(memberStats)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(memberStats.userId, userId), eq(memberStats.cohortId, cohortId)))
      .returning();
    return updated;
  }

  async updateQuestCompletion(questIds: number[], completed: boolean): Promise<void> {
    if (questIds.length === 0) return;
    
    await db.update(dailyQuests)
      .set({ 
        completed, 
        completedAt: completed ? new Date() : null 
      })
      .where(sql`${dailyQuests.id} IN ${questIds}`);
  }

  // --- Admin / Locations ---
  async getAdminCohorts(userId: string): Promise<Cohort[]> {
    // Find cohorts where user is admin
    const memberships = await db.select()
      .from(cohortMemberships)
      .where(and(eq(cohortMemberships.userId, userId), eq(cohortMemberships.role, "admin")));
    
    if (memberships.length === 0) return [];
    
    const ids = memberships.map(m => m.cohortId);
    return db.select().from(cohorts).where(sql`${cohorts.id} IN ${ids}`);
  }

  async getLocations(programId: number): Promise<Location[]> {
    return db.select().from(locations).where(eq(locations.programId, programId));
  }

  async createLocation(input: LocationInput & { programId: number }): Promise<Location> {
    const [loc] = await db.insert(locations).values(input).returning();
    return loc;
  }

  async checkinLocation(userId: string, locationId: number): Promise<void> {
    await db.insert(locationCheckins).values({
      userId,
      locationId,
      checkinDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    });
  }

  // --- Admin / Invites ---
  async getInvites(cohortId: number): Promise<CohortInvite[]> {
    return db.select().from(cohortInvites).where(eq(cohortInvites.cohortId, cohortId));
  }

  async createInvite(input: InviteInput & { cohortId: number; createdBy: string }): Promise<CohortInvite> {
    const [invite] = await db.insert(cohortInvites).values(input).returning();
    return invite;
  }

  async getCohort(id: number): Promise<Cohort | undefined> {
    const [c] = await db.select().from(cohorts).where(eq(cohorts.id, id));
    return c;
  }
}

export const storage = new DatabaseStorage();
