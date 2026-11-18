import { config } from "./config";
import { getStore } from "./store";
import { dayKey } from "./utils";

export type SpendBlockReason = "global" | "user" | null;

export interface SpendCheck {
  allowed: boolean;
  reason: SpendBlockReason;
  globalUsd: number;
  userUsd: number;
  globalLimitUsd: number;
  userLimitUsd: number;
}

export interface SpendGuard {
  check(userId: string, estimateUsd: number): Promise<SpendCheck>;
  record(userId: string, usd: number): Promise<void>;
}

abstract class LedgerSpendGuard implements SpendGuard {
  protected abstract readSpend(scope: string, day: string): Promise<number>;
  protected abstract writeSpend(scope: string, day: string, usd: number): Promise<number>;

  async check(userId: string, estimateUsd: number): Promise<SpendCheck> {
    const day = dayKey();
    const [globalUsd, userUsd] = await Promise.all([
      this.readSpend("global", day),
      this.readSpend(`user:${userId}`, day),
    ]);
    const globalLimitUsd = config.spend.dailyGlobalUsd;
    const userLimitUsd = config.spend.dailyUserUsd;
    if (globalUsd + estimateUsd > globalLimitUsd) {
      return { allowed: false, reason: "global", globalUsd, userUsd, globalLimitUsd, userLimitUsd };
    }
    if (userUsd + estimateUsd > userLimitUsd) {
      return { allowed: false, reason: "user", globalUsd, userUsd, globalLimitUsd, userLimitUsd };
    }
    return { allowed: true, reason: null, globalUsd, userUsd, globalLimitUsd, userLimitUsd };
  }

  async record(userId: string, usd: number): Promise<void> {
    if (usd <= 0) return;
    const day = dayKey();
    await Promise.all([
      this.writeSpend("global", day, usd),
      this.writeSpend(`user:${userId}`, day, usd),
    ]);
  }
}

class MongoSpendGuard extends LedgerSpendGuard {
  protected readSpend(scope: string, day: string): Promise<number> {
    return getStore().getSpend(scope, day);
  }

  protected writeSpend(scope: string, day: string, usd: number): Promise<number> {
    return getStore().addSpend(scope, day, usd);
  }
}

class InMemorySpendGuard extends LedgerSpendGuard {
  private ledger(): Map<string, number> {
    const g = globalThis as typeof globalThis & { __stillpointSpend?: Map<string, number> };
    if (!g.__stillpointSpend) g.__stillpointSpend = new Map<string, number>();
    return g.__stillpointSpend;
  }

  protected async readSpend(scope: string, day: string): Promise<number> {
    return this.ledger().get(`${scope}:${day}`) ?? 0;
  }

  protected async writeSpend(scope: string, day: string, usd: number): Promise<number> {
    const key = `${scope}:${day}`;
    const next = (this.ledger().get(key) ?? 0) + usd;
    this.ledger().set(key, next);
    return next;
  }
}

export function getSpendGuard(): SpendGuard {
  const g = globalThis as typeof globalThis & { __stillpointSpendGuard?: SpendGuard };
  if (!g.__stillpointSpendGuard) {
    g.__stillpointSpendGuard = getStore().kind === "mongo" ? new MongoSpendGuard() : new InMemorySpendGuard();
  }
  return g.__stillpointSpendGuard;
}

export function spendLimitMessage(check: SpendCheck): string {
  if (check.allowed) return "";
  if (check.reason === "global") {
    return "StillPoint đã chạm mức chi phí AI an toàn của hệ thống hôm nay. Não của bạn vẫn cần nghỉ — hãy thử phòng thiền âm thanh (Studio) hoặc bài tập thở, không tốn phí AI. Các phiên AI sẽ mở lại sau 0h UTC.";
  }
  return "Bạn đã dùng hết ngân sách AI trong ngày (giới hạn an toàn để tránh phát sinh chi phí). Hãy nghỉ một chút, hoặc tiếp tục với Studio âm thanh. Ngân sách sẽ làm mới sau 0h UTC.";
}