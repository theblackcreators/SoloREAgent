type StatKey = "str" | "sta" | "agi" | "int_stat" | "cha" | "rep" | "gold";

export function xpFromLog(log: {
  workout_done: boolean;
  steps: number;
  convos: number;
  appts: number;
  content_done: boolean;
  learning_minutes: number;
}) {
  // Count mandatory quests completed (need 3 of 4 for streak)
  const mandatoryCount =
    (log.steps >= 7000 ? 1 : 0) +
    (log.workout_done ? 1 : 0) +
    (log.convos >= 5 || log.appts >= 1 ? 1 : 0) +
    (log.learning_minutes >= 20 ? 1 : 0);

  // Base XP: 5 per mandatory quest (up to +20/day)
  let xp = mandatoryCount * 5;

  // Bonus XP for specific achievements
  if (log.workout_done) xp += 10;
  if (log.steps >= 10000) xp += 5;
  if (log.convos >= 5) xp += 10;
  if (log.appts >= 1) xp += 15;
  if (log.content_done) xp += 10;

  return xp;
}

export function statGainsFromLog(log: {
  workout_done: boolean;
  steps: number;
  learning_minutes: number;
  convos: number;
  appts: number;
  content_done: boolean;
}) {
  const gains: Partial<Record<StatKey, number>> = {};

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

