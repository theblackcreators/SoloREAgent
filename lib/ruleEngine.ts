export type LogInput = {
  steps: number;
  workout_done: boolean;
  learning_minutes: number;
  calls: number;
  texts: number;
  convos: number;
  leads: number;
  appts: number;
  content_done: boolean;
};

type Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

type Condition =
  | { field: keyof LogInput; op: Op; value: any }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { atLeast: { count: number; of: Condition[] } };

function getField(log: LogInput, field: keyof LogInput) {
  return (log as any)[field];
}

function compare(a: any, op: Op, b: any): boolean {
  switch (op) {
    case "eq":
      return a === b;
    case "neq":
      return a !== b;
    case "gt":
      return a > b;
    case "gte":
      return a >= b;
    case "lt":
      return a < b;
    case "lte":
      return a <= b;
    default:
      return false;
  }
}

export function evaluateRule(rule: any, log: LogInput): boolean {
  if (!rule) return false;

  // Leaf condition
  if (typeof rule.field === "string" && typeof rule.op === "string") {
    const v = getField(log, rule.field as keyof LogInput);
    return compare(v, rule.op as Op, rule.value);
  }

  // all / any / not
  if (Array.isArray(rule.all))
    return rule.all.every((c: any) => evaluateRule(c, log));
  if (Array.isArray(rule.any))
    return rule.any.some((c: any) => evaluateRule(c, log));
  if (rule.not) return !evaluateRule(rule.not, log);

  // atLeast N of
  if (rule.atLeast?.count && Array.isArray(rule.atLeast.of)) {
    const count = Number(rule.atLeast.count);
    const passes = rule.atLeast.of.reduce(
      (acc: number, c: any) => acc + (evaluateRule(c, log) ? 1 : 0),
      0
    );
    return passes >= count;
  }

  return false;
}

