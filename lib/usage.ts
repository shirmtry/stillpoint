import type { Store } from "./store";
import { FREE_DAILY_SESSIONS, type Plan } from "./types";
import { startOfUtcDay } from "./utils";

export interface UsageInfo {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export async function getUsage(store: Store, userId: string, plan: Plan): Promise<UsageInfo> {
  const used = await store.countSessionsSince(userId, startOfUtcDay());
  if (plan === "pro") return { used, limit: null, remaining: null };
  return { used, limit: FREE_DAILY_SESSIONS, remaining: Math.max(0, FREE_DAILY_SESSIONS - used) };
}

export function quotaExceeded(plan: Plan, used: number): boolean {
  return plan === "free" && used >= FREE_DAILY_SESSIONS;
}