export const RANKS = [
  { rank: "E", minXp: 0 },
  { rank: "D", minXp: 500 },
  { rank: "C", minXp: 1500 },
  { rank: "B", minXp: 3000 },
  { rank: "A", minXp: 5000 },
  { rank: "S", minXp: 7500 },
] as const;

export type Rank = (typeof RANKS)[number]["rank"];

export function computeRank(xp: number): Rank {
  let current: Rank = "E";
  for (const r of RANKS) {
    if (xp >= r.minXp) current = r.rank;
  }
  return current;
}

export function getNextRank(currentRank: Rank): { rank: Rank; minXp: number } | null {
  const idx = RANKS.findIndex((r) => r.rank === currentRank);
  if (idx === -1 || idx === RANKS.length - 1) return null;
  return RANKS[idx + 1];
}

export function getXpForRank(rank: Rank): number {
  const found = RANKS.find((r) => r.rank === rank);
  return found?.minXp ?? 0;
}

