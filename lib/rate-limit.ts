import type { Duration } from "@upstash/ratelimit";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { hasUpstash } from "./config";

export interface RateResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

type MemoryGlobal = typeof globalThis & {
  __stillpointRate?: Map<string, number[]>;
  __stillpointLimiters?: Map<string, Ratelimit>;
  __stillpointRedis?: Redis;
};

const g = globalThis as MemoryGlobal;

function windowToMs(window: string): number {
  const [amountRaw, unitRaw] = window.split(" ");
  const amount = Number(amountRaw);
  const unit = (unitRaw ?? "s").toLowerCase();
  const unitMs = unit.startsWith("ms") ? 1 : unit.startsWith("s") ? 1000 : unit.startsWith("m") ? 60_000 : unit.startsWith("h") ? 3_600_000 : 86_400_000;
  return (Number.isFinite(amount) ? amount : 1) * unitMs;
}

function memoryLimit(key: string, limit: number, window: string): RateResult {
  if (!g.__stillpointRate) g.__stillpointRate = new Map<string, number[]>();
  const buckets = g.__stillpointRate;
  const now = Date.now();
  const span = windowToMs(window);
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < span);
  const success = hits.length < limit;
  if (success) hits.push(now);
  buckets.set(key, hits);
  const oldest = hits[0] ?? now;
  return {
    success,
    limit,
    remaining: Math.max(0, limit - hits.length),
    reset: oldest + span,
  };
}

function upstashLimit(key: string, limit: number, window: string): Promise<RateResult> {
  if (!g.__stillpointRedis) {
    g.__stillpointRedis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL ?? "", token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "" });
  }
  if (!g.__stillpointLimiters) g.__stillpointLimiters = new Map<string, Ratelimit>();
  const cacheKey = `${limit}:${window}`;
  let limiter = g.__stillpointLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: g.__stillpointRedis,
      limiter: Ratelimit.slidingWindow(limit, window as Duration),
      prefix: "stillpoint:rl",
      analytics: false,
    });
    g.__stillpointLimiters.set(cacheKey, limiter);
  }
  return limiter.limit(key).then((result) => ({
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }));
}

/**
 * Sliding-window rate limit. Uses Upstash Redis when configured (needed on
 * serverless: in-process counters reset on every cold start), otherwise a
 * process-local fallback that is good enough for local dev.
 */
export async function limitRequest(key: string, limit: number, window: string): Promise<RateResult> {
  if (!hasUpstash) return memoryLimit(key, limit, window);
  try {
    return await upstashLimit(key, limit, window);
  } catch {
    return memoryLimit(key, limit, window);
  }
}