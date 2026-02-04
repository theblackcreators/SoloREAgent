/**
 * Leveling System Tests
 * Tests XP calculation, rank progression, and stat gains
 */

import { xpFromLog, statGainsFromLog } from "../engine";
import { computeRank, getNextRank, RANKS } from "../ranks";
import { evaluateRule } from "../ruleEngine";

describe("XP Calculation (xpFromLog)", () => {
  test("empty log returns 0 XP", () => {
    const log = {
      workout_done: false,
      steps: 0,
      convos: 0,
      appts: 0,
      content_done: false,
      learning_minutes: 0,
    };
    expect(xpFromLog(log)).toBe(0);
  });

  test("single mandatory quest (7k steps) = 5 XP", () => {
    const log = {
      workout_done: false,
      steps: 7000,
      convos: 0,
      appts: 0,
      content_done: false,
      learning_minutes: 0,
    };
    expect(xpFromLog(log)).toBe(5);
  });

  test("workout gives 5 (mandatory) + 10 (bonus) = 15 XP", () => {
    const log = {
      workout_done: true,
      steps: 0,
      convos: 0,
      appts: 0,
      content_done: false,
      learning_minutes: 0,
    };
    expect(xpFromLog(log)).toBe(15);
  });

  test("10k steps gives 5 (mandatory) + 5 (bonus) = 10 XP", () => {
    const log = {
      workout_done: false,
      steps: 10000,
      convos: 0,
      appts: 0,
      content_done: false,
      learning_minutes: 0,
    };
    expect(xpFromLog(log)).toBe(10);
  });

  test("5 convos gives 5 (mandatory) + 10 (bonus) = 15 XP", () => {
    const log = {
      workout_done: false,
      steps: 0,
      convos: 5,
      appts: 0,
      content_done: false,
      learning_minutes: 0,
    };
    expect(xpFromLog(log)).toBe(15);
  });

  test("1 appointment gives 5 (mandatory) + 15 (bonus) = 20 XP", () => {
    const log = {
      workout_done: false,
      steps: 0,
      convos: 0,
      appts: 1,
      content_done: false,
      learning_minutes: 0,
    };
    expect(xpFromLog(log)).toBe(20);
  });

  test("content created gives 10 XP (no mandatory)", () => {
    const log = {
      workout_done: false,
      steps: 0,
      convos: 0,
      appts: 0,
      content_done: true,
      learning_minutes: 0,
    };
    expect(xpFromLog(log)).toBe(10);
  });

  test("20 learning minutes gives 5 XP (mandatory only)", () => {
    const log = {
      workout_done: false,
      steps: 0,
      convos: 0,
      appts: 0,
      content_done: false,
      learning_minutes: 20,
    };
    expect(xpFromLog(log)).toBe(5);
  });

  test("maximum daily XP = 70", () => {
    const log = {
      workout_done: true,      // 5 + 10 = 15
      steps: 10000,            // 5 + 5 = 10
      convos: 5,               // 5 + 10 = 15 (but mandatory already counted via appts)
      appts: 1,                // 5 + 15 = 20 (mandatory shared with convos)
      content_done: true,      // 10
      learning_minutes: 20,    // 5
    };
    // 4 mandatory × 5 = 20
    // + workout bonus 10
    // + 10k steps bonus 5
    // + convos bonus 10
    // + appts bonus 15
    // + content bonus 10
    // = 70 XP
    expect(xpFromLog(log)).toBe(70);
  });
});

describe("Rank Progression (computeRank)", () => {
  test("0 XP = Rank E", () => {
    expect(computeRank(0)).toBe("E");
  });

  test("499 XP = Rank E", () => {
    expect(computeRank(499)).toBe("E");
  });

  test("500 XP = Rank D", () => {
    expect(computeRank(500)).toBe("D");
  });

  test("1499 XP = Rank D", () => {
    expect(computeRank(1499)).toBe("D");
  });

  test("1500 XP = Rank C", () => {
    expect(computeRank(1500)).toBe("C");
  });

  test("3000 XP = Rank B", () => {
    expect(computeRank(3000)).toBe("B");
  });

  test("5000 XP = Rank A", () => {
    expect(computeRank(5000)).toBe("A");
  });

  test("7500 XP = Rank S", () => {
    expect(computeRank(7500)).toBe("S");
  });

  test("10000 XP = Rank S (max)", () => {
    expect(computeRank(10000)).toBe("S");
  });
});

describe("Stat Gains (statGainsFromLog)", () => {
  test("empty log returns no gains", () => {
    const log = {
      workout_done: false,
      steps: 0,
      learning_minutes: 0,
      convos: 0,
      appts: 0,
      content_done: false,
    };
    const gains = statGainsFromLog(log);
    expect(gains).toEqual({});
  });

  test("workout gives STR +1, STA +1", () => {
    const log = {
      workout_done: true,
      steps: 0,
      learning_minutes: 0,
      convos: 0,
      appts: 0,
      content_done: false,
    };
    const gains = statGainsFromLog(log);
    expect(gains.str).toBe(1);
    expect(gains.sta).toBe(1);
  });

  test("10k steps gives STA +1", () => {
    const log = {
      workout_done: false,
      steps: 10000,
      learning_minutes: 0,
      convos: 0,
      appts: 0,
      content_done: false,
    };
    const gains = statGainsFromLog(log);
    expect(gains.sta).toBe(1);
  });

  test("workout + 10k steps gives STR +1, STA +2", () => {
    const log = {
      workout_done: true,
      steps: 10000,
      learning_minutes: 0,
      convos: 0,
      appts: 0,
      content_done: false,
    };
    const gains = statGainsFromLog(log);
    expect(gains.str).toBe(1);
    expect(gains.sta).toBe(2);
  });

  test("20 learning minutes gives INT +1", () => {
    const log = {
      workout_done: false,
      steps: 0,
      learning_minutes: 20,
      convos: 0,
      appts: 0,
      content_done: false,
    };
    const gains = statGainsFromLog(log);
    expect(gains.int_stat).toBe(1);
  });

  test("5 convos gives CHA +1", () => {
    const log = {
      workout_done: false,
      steps: 0,
      learning_minutes: 0,
      convos: 5,
      appts: 0,
      content_done: false,
    };
    const gains = statGainsFromLog(log);
    expect(gains.cha).toBe(1);
  });

  test("1 appointment gives CHA +2, REP +1", () => {
    const log = {
      workout_done: false,
      steps: 0,
      learning_minutes: 0,
      convos: 0,
      appts: 1,
      content_done: false,
    };
    const gains = statGainsFromLog(log);
    expect(gains.cha).toBe(2);
    expect(gains.rep).toBe(1);
  });

  test("content created gives REP +1", () => {
    const log = {
      workout_done: false,
      steps: 0,
      learning_minutes: 0,
      convos: 0,
      appts: 0,
      content_done: true,
    };
    const gains = statGainsFromLog(log);
    expect(gains.rep).toBe(1);
  });
});

describe("Quest Rule Engine (evaluateRule)", () => {
  test("simple field comparison - steps >= 7000", () => {
    const rule = { field: "steps", op: "gte", value: 7000 };
    expect(evaluateRule(rule, { steps: 7000, workout_done: false, learning_minutes: 0, calls: 0, texts: 0, convos: 0, leads: 0, appts: 0, content_done: false })).toBe(true);
    expect(evaluateRule(rule, { steps: 6999, workout_done: false, learning_minutes: 0, calls: 0, texts: 0, convos: 0, leads: 0, appts: 0, content_done: false })).toBe(false);
  });

  test("boolean field - workout_done = true", () => {
    const rule = { field: "workout_done", op: "eq", value: true };
    expect(evaluateRule(rule, { steps: 0, workout_done: true, learning_minutes: 0, calls: 0, texts: 0, convos: 0, leads: 0, appts: 0, content_done: false })).toBe(true);
    expect(evaluateRule(rule, { steps: 0, workout_done: false, learning_minutes: 0, calls: 0, texts: 0, convos: 0, leads: 0, appts: 0, content_done: false })).toBe(false);
  });

  test("any condition - convos >= 5 OR appts >= 1", () => {
    const rule = {
      any: [
        { field: "convos", op: "gte", value: 5 },
        { field: "appts", op: "gte", value: 1 },
      ],
    };
    const baseLog = { steps: 0, workout_done: false, learning_minutes: 0, calls: 0, texts: 0, convos: 0, leads: 0, appts: 0, content_done: false };

    expect(evaluateRule(rule, { ...baseLog, convos: 5 })).toBe(true);
    expect(evaluateRule(rule, { ...baseLog, appts: 1 })).toBe(true);
    expect(evaluateRule(rule, { ...baseLog, convos: 3, appts: 0 })).toBe(false);
  });

  test("all condition - calls >= 20 AND texts >= 40", () => {
    const rule = {
      all: [
        { field: "calls", op: "gte", value: 20 },
        { field: "texts", op: "gte", value: 40 },
      ],
    };
    const baseLog = { steps: 0, workout_done: false, learning_minutes: 0, calls: 0, texts: 0, convos: 0, leads: 0, appts: 0, content_done: false };

    expect(evaluateRule(rule, { ...baseLog, calls: 20, texts: 40 })).toBe(true);
    expect(evaluateRule(rule, { ...baseLog, calls: 20, texts: 39 })).toBe(false);
    expect(evaluateRule(rule, { ...baseLog, calls: 19, texts: 40 })).toBe(false);
  });

  test("complex HUNT rule - convos >= 5 OR appts >= 1 OR (calls >= 20 AND texts >= 40)", () => {
    const rule = {
      any: [
        { field: "convos", op: "gte", value: 5 },
        { field: "appts", op: "gte", value: 1 },
        {
          all: [
            { field: "calls", op: "gte", value: 20 },
            { field: "texts", op: "gte", value: 40 },
          ],
        },
      ],
    };
    const baseLog = { steps: 0, workout_done: false, learning_minutes: 0, calls: 0, texts: 0, convos: 0, leads: 0, appts: 0, content_done: false };

    // Test each path
    expect(evaluateRule(rule, { ...baseLog, convos: 5 })).toBe(true);
    expect(evaluateRule(rule, { ...baseLog, appts: 1 })).toBe(true);
    expect(evaluateRule(rule, { ...baseLog, calls: 20, texts: 40 })).toBe(true);
    expect(evaluateRule(rule, { ...baseLog, calls: 20, texts: 39 })).toBe(false);
    expect(evaluateRule(rule, { ...baseLog })).toBe(false);
  });
});

describe("Days to Rank Up", () => {
  test("calculate days from E to D at max XP/day", () => {
    const maxDailyXp = 70;
    const xpNeeded = 500; // E to D
    const days = Math.ceil(xpNeeded / maxDailyXp);
    expect(days).toBe(8); // ~8 days at max effort
  });

  test("calculate days from E to S at max XP/day", () => {
    const maxDailyXp = 70;
    const xpNeeded = 7500; // E to S
    const days = Math.ceil(xpNeeded / maxDailyXp);
    expect(days).toBe(108); // ~108 days at max effort
  });

  test("calculate days from E to S at average XP/day (40)", () => {
    const avgDailyXp = 40;
    const xpNeeded = 7500;
    const days = Math.ceil(xpNeeded / avgDailyXp);
    expect(days).toBe(188); // ~188 days at average effort
  });
});

