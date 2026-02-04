/**
 * Leveling System Verification Script
 * Run with: node scripts/verify-leveling.mjs
 */

// ============================================
// RANK THRESHOLDS
// ============================================
const RANKS = [
  { rank: "E", minXp: 0 },
  { rank: "D", minXp: 500 },
  { rank: "C", minXp: 1500 },
  { rank: "B", minXp: 3000 },
  { rank: "A", minXp: 5000 },
  { rank: "S", minXp: 7500 },
];

function computeRank(xp) {
  let current = "E";
  for (const r of RANKS) {
    if (xp >= r.minXp) current = r.rank;
  }
  return current;
}

// ============================================
// XP CALCULATION
// ============================================
function xpFromLog(log) {
  const mandatoryCount =
    (log.steps >= 7000 ? 1 : 0) +
    (log.workout_done ? 1 : 0) +
    (log.convos >= 5 || log.appts >= 1 ? 1 : 0) +
    (log.learning_minutes >= 20 ? 1 : 0);

  let xp = mandatoryCount * 5;

  if (log.workout_done) xp += 10;
  if (log.steps >= 10000) xp += 5;
  if (log.convos >= 5) xp += 10;
  if (log.appts >= 1) xp += 15;
  if (log.content_done) xp += 10;

  return xp;
}

// ============================================
// STAT GAINS
// ============================================
function statGainsFromLog(log) {
  const gains = {};

  if (log.workout_done) {
    gains.str = (gains.str ?? 0) + 1;
    gains.sta = (gains.sta ?? 0) + 1;
  }
  if (log.steps >= 10000) {
    gains.sta = (gains.sta ?? 0) + 1;
  }
  if (log.learning_minutes >= 20) {
    gains.int_stat = (gains.int_stat ?? 0) + 1;
  }
  if (log.convos >= 5) {
    gains.cha = (gains.cha ?? 0) + 1;
  }
  if (log.appts >= 1) {
    gains.cha = (gains.cha ?? 0) + 2;
    gains.rep = (gains.rep ?? 0) + 1;
  }
  if (log.content_done) {
    gains.rep = (gains.rep ?? 0) + 1;
  }

  return gains;
}

// ============================================
// TEST SCENARIOS
// ============================================
console.log("🎮 Elite Agent System - Leveling Verification\n");
console.log("=".repeat(50));

// Test 1: Empty log
console.log("\n📋 Test 1: Empty Log");
const emptyLog = { workout_done: false, steps: 0, convos: 0, appts: 0, content_done: false, learning_minutes: 0 };
console.log(`   XP: ${xpFromLog(emptyLog)} (expected: 0)`);
console.log(`   ✅ ${xpFromLog(emptyLog) === 0 ? "PASS" : "FAIL"}`);

// Test 2: Workout only
console.log("\n📋 Test 2: Workout Only");
const workoutLog = { workout_done: true, steps: 0, convos: 0, appts: 0, content_done: false, learning_minutes: 0 };
console.log(`   XP: ${xpFromLog(workoutLog)} (expected: 15 = 5 mandatory + 10 bonus)`);
console.log(`   ✅ ${xpFromLog(workoutLog) === 15 ? "PASS" : "FAIL"}`);

// Test 3: 10k steps
console.log("\n📋 Test 3: 10K Steps");
const stepsLog = { workout_done: false, steps: 10000, convos: 0, appts: 0, content_done: false, learning_minutes: 0 };
console.log(`   XP: ${xpFromLog(stepsLog)} (expected: 10 = 5 mandatory + 5 bonus)`);
console.log(`   ✅ ${xpFromLog(stepsLog) === 10 ? "PASS" : "FAIL"}`);

// Test 4: Maximum daily XP
console.log("\n📋 Test 4: Maximum Daily XP");
const maxLog = { workout_done: true, steps: 10000, convos: 5, appts: 1, content_done: true, learning_minutes: 20 };
const maxXp = xpFromLog(maxLog);
console.log(`   XP: ${maxXp} (expected: 70)`);
console.log(`   Breakdown:`);
console.log(`     - 4 mandatory quests × 5 = 20`);
console.log(`     - Workout bonus = 10`);
console.log(`     - 10k steps bonus = 5`);
console.log(`     - 5+ convos bonus = 10`);
console.log(`     - 1+ appt bonus = 15`);
console.log(`     - Content bonus = 10`);
console.log(`     - Total = 70`);
console.log(`   ✅ ${maxXp === 70 ? "PASS" : "FAIL"}`);

// Test 5: Rank progression
console.log("\n📋 Test 5: Rank Progression");
const rankTests = [
  { xp: 0, expected: "E" },
  { xp: 499, expected: "E" },
  { xp: 500, expected: "D" },
  { xp: 1499, expected: "D" },
  { xp: 1500, expected: "C" },
  { xp: 3000, expected: "B" },
  { xp: 5000, expected: "A" },
  { xp: 7500, expected: "S" },
];
let allPass = true;
for (const t of rankTests) {
  const result = computeRank(t.xp);
  const pass = result === t.expected;
  if (!pass) allPass = false;
  console.log(`   ${t.xp} XP → Rank ${result} (expected: ${t.expected}) ${pass ? "✅" : "❌"}`);
}
console.log(`   ${allPass ? "✅ ALL PASS" : "❌ SOME FAILED"}`);

// Test 6: Stat gains
console.log("\n📋 Test 6: Stat Gains from Max Log");
const gains = statGainsFromLog(maxLog);
console.log(`   STR: +${gains.str ?? 0} (expected: 1 from workout)`);
console.log(`   STA: +${gains.sta ?? 0} (expected: 2 from workout + 10k steps)`);
console.log(`   INT: +${gains.int_stat ?? 0} (expected: 1 from learning)`);
console.log(`   CHA: +${gains.cha ?? 0} (expected: 3 from convos + appt)`);
console.log(`   REP: +${gains.rep ?? 0} (expected: 2 from appt + content)`);

// Test 7: Days to rank up
console.log("\n📋 Test 7: Days to Rank Up");
console.log(`   At max XP/day (70):`);
console.log(`     E → D: ${Math.ceil(500/70)} days`);
console.log(`     E → C: ${Math.ceil(1500/70)} days`);
console.log(`     E → B: ${Math.ceil(3000/70)} days`);
console.log(`     E → A: ${Math.ceil(5000/70)} days`);
console.log(`     E → S: ${Math.ceil(7500/70)} days`);
console.log(`   At average XP/day (40):`);
console.log(`     E → S: ${Math.ceil(7500/40)} days (~6 months)`);

console.log("\n" + "=".repeat(50));
console.log("✅ Leveling system verification complete!");

