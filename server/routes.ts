import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth";
import { RANKS, programs, cohorts, questTemplates, locations, cohortInvites } from "@shared/schema";
import { db } from "./db";

// --- ENGINE LOGIC (XP & Rules) ---

function computeRank(xp: number) {
  if (xp >= 7500) return "S";
  if (xp >= 5000) return "A";
  if (xp >= 3000) return "B";
  if (xp >= 1500) return "C";
  if (xp >= 500) return "D";
  return "E";
}

function calculateXpAndStats(log: any) {
  // Simple logic based on the spec
  let xp = 0;
  const gains = { str: 0, sta: 0, agi: 0, int: 0, cha: 0, rep: 0, gold: 0 };

  // Mandatory proxies
  const mandatoryCount =
    (log.steps >= 7000 ? 1 : 0) +
    (log.workoutDone ? 1 : 0) +
    ((log.convos >= 5 || log.appts >= 1) ? 1 : 0) +
    (log.learningMinutes >= 20 ? 1 : 0);

  xp += mandatoryCount * 5; 

  if (log.workoutDone) { xp += 10; gains.str++; gains.sta++; }
  if (log.steps >= 10000) { xp += 5; gains.sta++; }
  if (log.convos >= 5) { xp += 10; gains.cha++; }
  if (log.appts >= 1) { xp += 15; gains.cha += 2; gains.rep++; }
  if (log.contentDone) { xp += 10; gains.rep++; }
  if (log.learningMinutes >= 20) { gains.int++; }

  return { xp, gains, mandatoryCount };
}

function evaluateRule(rule: any, log: any): boolean {
  if (!rule) return false;
  
  // Simple "all" condition support for MVP
  if (rule.all && Array.isArray(rule.all)) {
    return rule.all.every((cond: any) => {
      const val = log[cond.field];
      if (cond.op === 'gte') return val >= cond.value;
      if (cond.op === 'eq') return val === cond.value;
      return false;
    });
  }
  
  // Fallback for "any"
  if (rule.any && Array.isArray(rule.any)) {
    return rule.any.some((cond: any) => {
       // Recursive check for nested 'all'
       if (cond.all) return evaluateRule(cond, log);

       const val = log[cond.field];
       if (cond.op === 'gte') return val >= cond.value;
       if (cond.op === 'eq') return val === cond.value;
       return false;
    });
  }

  return false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // 1. Setup Auth Routes
  registerAuthRoutes(app);

  // 2. API Routes

  // --- JOIN ---
  app.post(api.join.path, isAuthenticated, async (req: any, res) => {
    try {
      const { code } = api.join.input.parse(req.body);
      const userId = req.user.claims.sub;

      const invite = await storage.getInviteByCode(code);
      if (!invite || !invite.isActive || (invite.maxUses > 0 && invite.uses >= invite.maxUses)) {
        return res.status(400).json({ message: "Invalid or expired invite code" });
      }

      // Check if already member
      // (Simplified: assumption is UI handles "already joined" state, but backend should ideally check)
      
      await storage.createMembership(userId, invite.cohortId, invite.role);
      await storage.initMemberStats(userId, invite.cohortId);
      await storage.redeemInvite(invite.id, invite.cohortId, userId);

      res.json({ ok: true, cohortId: invite.cohortId, role: invite.role });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  // --- DASHBOARD ---
  app.get(api.dashboard.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cohortId = Number(req.query.cohortId);
      
      if (!cohortId) return res.status(400).json({ message: "cohortId required" });

      const today = new Date().toISOString().split('T')[0];
      await storage.ensureDailyQuests(userId, cohortId, today);

      const stats = await storage.getMemberStats(userId, cohortId);
      const quests = await storage.getDailyQuests(userId, cohortId, today);

      if (!stats) return res.status(404).json({ message: "Stats not found" });

      res.json({ stats, quests });
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  // --- LOGGING (The Engine) ---
  app.post(api.log.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.log.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const { cohortId, logDate } = input;

      // 1. Get previous log to calc delta
      const prevLog = await storage.getDailyLog(userId, cohortId, logDate);
      
      // 2. Upsert new log
      const newLog = await storage.upsertDailyLog({ ...input, userId });

      // 3. Calculate Deltas
      const prevCalc = prevLog ? calculateXpAndStats(prevLog) : { xp: 0, gains: { str:0, sta:0, agi:0, int:0, cha:0, rep:0, gold:0 } };
      const newCalc = calculateXpAndStats(newLog);

      const deltaXp = newCalc.xp - prevCalc.xp;
      const deltaGains = {
        str: newCalc.gains.str - prevCalc.gains.str,
        sta: newCalc.gains.sta - prevCalc.gains.sta,
        agi: newCalc.gains.agi - prevCalc.gains.agi,
        int: newCalc.gains.int - prevCalc.gains.int,
        cha: newCalc.gains.cha - prevCalc.gains.cha,
        rep: newCalc.gains.rep - prevCalc.gains.rep,
        gold: newCalc.gains.gold - prevCalc.gains.gold,
      };

      // 4. Update Stats
      const currentStats = await storage.getMemberStats(userId, cohortId);
      if (currentStats) {
        const nextXp = Math.max(0, currentStats.xp + deltaXp);
        const nextRank = computeRank(nextXp);
        
        // Streak logic (simplified: if mandatory >= 3, +1 streak if not already counted today)
        // Real streak logic requires lookback, sticking to MVP stateless-ish check here
        // Ideally: we verify if streak was ALREADY incremented for this day.
        // For MVP: we just trust the current streak + 1 if criteria met today. 
        // A robust system would store "streakLastUpdated" date.
        
        await storage.updateMemberStats(userId, cohortId, {
          xp: nextXp,
          rank: nextRank,
          str: currentStats.str + deltaGains.str,
          sta: currentStats.sta + deltaGains.sta,
          agi: currentStats.agi + deltaGains.agi,
          int: currentStats.int + deltaGains.int,
          cha: currentStats.cha + deltaGains.cha,
          rep: currentStats.rep + deltaGains.rep,
          gold: currentStats.gold + deltaGains.gold,
        });
      }

      // 5. Auto-complete Quests
      const quests = await storage.getDailyQuests(userId, cohortId, logDate);
      const toComplete: number[] = [];
      const toUncomplete: number[] = []; // Not handling uncomplete for safety in MVP

      for (const q of quests) {
        if (q.title === "Dungeon Check-In") continue; // Handled via map
        if (q.completionRule) {
           if (evaluateRule(q.completionRule, newLog)) {
             if (!q.completed) toComplete.push(q.id);
           }
        }
      }

      await storage.updateQuestCompletion(toComplete, true);

      // Return updated state
      const finalStats = await storage.getMemberStats(userId, cohortId);
      
      res.json({
        ok: true,
        xpGain: newCalc.xp,
        deltaXp,
        updatedStats: finalStats,
        autoCompletedQuestIds: toComplete
      });

    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error(err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  // --- LOCATIONS ---
  app.get(api.locations.list.path, isAuthenticated, async (req: any, res) => {
    const cohortId = Number(req.query.cohortId);
    const cohort = await storage.getCohort(cohortId);
    if (!cohort) return res.status(404).json({ message: "Cohort not found" });
    
    const locations = await storage.getLocations(cohort.programId);
    res.json(locations);
  });

  app.post(api.locations.checkin.path, isAuthenticated, async (req: any, res) => {
    const { locationId, cohortId } = req.body;
    const userId = req.user.claims.sub;
    
    await storage.checkinLocation(userId, locationId);
    
    // Auto-complete "Dungeon Check-In" quest
    const today = new Date().toISOString().split('T')[0];
    const quests = await storage.getDailyQuests(userId, cohortId, today);
    const dungeonQuest = quests.find(q => q.title === "Dungeon Check-In");
    
    if (dungeonQuest && !dungeonQuest.completed) {
      await storage.updateQuestCompletion([dungeonQuest.id], true);
    }

    res.json({ ok: true, message: "Checked in" });
  });

  // --- ADMIN ---
  app.get(api.admin.invites.list.path, isAuthenticated, async (req: any, res) => {
    const cohortId = Number(req.query.cohortId);
    const invites = await storage.getInvites(cohortId);
    res.json(invites);
  });

  app.post(api.admin.invites.create.path, isAuthenticated, async (req: any, res) => {
    const input = api.admin.invites.create.input.parse(req.body);
    const userId = req.user.claims.sub;
    
    const invite = await storage.createInvite({ ...input, createdBy: userId });
    res.status(201).json(invite);
  });

  app.get(api.admin.locations.geocode.path, isAuthenticated, async (req: any, res) => {
    const { q } = req.query;
    
    // Free Geocoding via Nominatim (OpenStreetMap)
    // No token needed, but respect usage policy (User-Agent)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`, {
        headers: { 'User-Agent': 'SoloREAgent/1.0' }
      });
      const data = await response.json();
      
      const results = data.map((d: any) => ({
        id: d.place_id,
        name: d.display_name.split(',')[0],
        place_name: d.display_name,
        address: d.display_name,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
      }));
      
      res.json({ results });
    } catch (e) {
      res.status(500).json({ message: "Geocoding failed" });
    }
  });
  
  app.get(api.admin.cohorts.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const cohorts = await storage.getAdminCohorts(userId);
    res.json(cohorts);
  });
  
  app.post(api.admin.locations.create.path, isAuthenticated, async (req: any, res) => {
     const input = api.admin.locations.create.input.parse(req.body);
     const loc = await storage.createLocation(input);
     res.status(201).json(loc);
  });

  // Seed Data Trigger (for testing)
  // Call it only if no programs exist
  await seedData();

  return httpServer;
}

async function seedData() {
  const result = await db.select().from(programs).limit(1);
  if (result.length > 0) return;

  console.log("Seeding initial data...");
  
  // 1. Program
  const [prog] = await db.insert(programs).values({
    name: "Solo Leveling: Houston Agent",
    description: "12-month gamified fitness + real estate pipeline program.",
    city: "Greater Houston"
  }).returning();

  // 2. Cohort
  const [cohort] = await db.insert(cohorts).values({
    programId: prog.id,
    name: "Houston S1 2026",
    startsOn: "2026-01-27",
    endsOn: "2027-01-26",
    isActive: true
  }).returning();

  // 3. Quest Templates
  const templates = [
    {
      title: "MOVE: 7,000+ steps",
      description: "Walk in your zone.",
      questType: "mandatory",
      xpReward: 5,
      statRewards: { sta: 1 },
      completionRule: { all: [{ field: "steps", op: "gte", value: 7000 }] },
      requiredInputs: { steps: "number" }
    },
    {
      title: "TRAIN: Strength Session",
      description: "15–25 min strength.",
      questType: "mandatory",
      xpReward: 5,
      statRewards: { str: 1, sta: 1 },
      completionRule: { all: [{ field: "workoutDone", op: "eq", value: true }] },
      requiredInputs: { workoutDone: "boolean" }
    },
    {
      title: "HUNT: Prospecting Block",
      description: "60–120 min outreach.",
      questType: "mandatory",
      xpReward: 5,
      statRewards: { cha: 1 },
      completionRule: { any: [
        { field: "convos", op: "gte", value: 5 },
        { field: "appts", op: "gte", value: 1 }
      ]},
      requiredInputs: { convos: "number" }
    },
    {
      title: "Dungeon Check-In",
      description: "Visit a location.",
      questType: "location",
      xpReward: 10,
      statRewards: { rep: 1 },
      completionRule: null, // manual
      requiredInputs: {}
    }
  ];

  for (const t of templates) {
    await db.insert(questTemplates).values({
      programId: prog.id,
      questType: t.questType as any,
      title: t.title,
      description: t.description,
      xpReward: t.xpReward,
      statRewards: t.statRewards,
      completionRule: t.completionRule,
      requiredInputs: t.requiredInputs,
    });
  }
  
  // 4. Locations
  await db.insert(locations).values({
    programId: prog.id,
    zone: "EaDo",
    name: "Buffalo Bayou Park",
    category: "park",
    address: "1800 Allen Pkwy, Houston, TX",
    lat: "29.7620",
    lng: "-95.3773",
    suggestedMission: "Walk + 5 micro-convos"
  });

  // 5. Initial Invite
  await db.insert(cohortInvites).values({
    cohortId: cohort.id,
    code: "HUNTER-2026",
    role: "agent",
    maxUses: 100,
    isActive: true
  });
  
  console.log("Seeding complete. Use code HUNTER-2026 to join.");
}
