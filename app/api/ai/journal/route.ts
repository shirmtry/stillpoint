import { z } from "zod";
import { generateTextFor } from "@/lib/ai";
import { apiError, clientIp, currentUser } from "@/lib/api";
import { isAiEnabled } from "@/lib/config";
import { offlineJournalRitual } from "@/lib/offline";
import { costFromUsage, estimateCostUsd, modelForPlan } from "@/lib/pricing";
import { journalSystem, journalUserPrompt } from "@/lib/prompts";
import { limitRequest } from "@/lib/rate-limit";
import { CRISIS_SUPPORT, detectCrisis } from "@/lib/safety";
import { analyzeSentiment, ritualKindFor } from "@/lib/sentiment";
import { getSpendGuard, spendLimitMessage } from "@/lib/spend-guard";
import { getStore } from "@/lib/store";
import type { RitualKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OUTPUT_TOKENS = 420;

const bodySchema = z.object({
  entry: z.string().trim().min(10, "Hãy viết ít nhất một câu.").max(4000),
});

export async function POST(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Nội dung không hợp lệ.");
  }
  const entry = parsed.data.entry;

  const [ipLimit, userLimit] = await Promise.all([
    limitRequest(`journal:ip:${clientIp(request)}`, 20, "1 m"),
    limitRequest(`journal:user:${user.id}`, 40, "1 h"),
  ]);
  if (!ipLimit.success || !userLimit.success) {
    return apiError(429, "RATE_LIMITED", "Bạn đã viết khá nhiều. Nghỉ một chút rồi quay lại nhé.");
  }

  const store = getStore();

  // Safety first: never send a crisis disclosure through the casual "coach" path.
  if (detectCrisis(entry)) {
    const saved = await store.saveJournal({
      userId: user.id,
      entry,
      sentiment: "crisis",
      score: -1,
      ritualKind: "support",
      ritual: CRISIS_SUPPORT,
    });
    return Response.json({
      id: saved.id,
      sentiment: "crisis",
      score: -1,
      ritualKind: "support",
      ritual: CRISIS_SUPPORT,
      crisis: true,
    });
  }

  const analysis = analyzeSentiment(entry);
  const ritualKind = ritualKindFor(analysis.sentiment);

  const finish = async (kind: RitualKind, ritual: string, notice?: string) => {
    const saved = await store.saveJournal({
      userId: user.id,
      entry,
      sentiment: analysis.sentiment,
      score: analysis.score,
      ritualKind: kind,
      ritual,
    });
    return Response.json({
      id: saved.id,
      sentiment: analysis.sentiment,
      score: analysis.score,
      ritualKind: kind,
      ritual,
      ...(notice ? { notice } : {}),
    });
  };

  if (!isAiEnabled) {
    const offline = offlineJournalRitual(analysis.sentiment);
    return finish(offline.kind, offline.text);
  }

  const profile = await store.getUser(user.id);
  const plan = profile?.plan ?? user.plan;
  const modelId = modelForPlan(plan);
  const system = journalSystem();
  const prompt = journalUserPrompt(entry, analysis.sentiment, ritualKind);
  const estimate = estimateCostUsd(modelId, system.length + prompt.length, MAX_OUTPUT_TOKENS);

  const guard = getSpendGuard();
  const check = await guard.check(user.id, estimate);
  if (!check.allowed) {
    const offline = offlineJournalRitual(analysis.sentiment);
    return finish(offline.kind, offline.text, spendLimitMessage(check));
  }

  try {
    const generated = await generateTextFor({
      plan,
      system,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.8,
    });
    const cost = costFromUsage(modelId, generated.usage, estimate);
    await guard.record(user.id, cost);
    const text = generated.text.trim();
    if (!text) {
      const offline = offlineJournalRitual(analysis.sentiment);
      return finish(offline.kind, offline.text, "AI trả về nội dung rỗng, đã dùng nghi thức ngoại tuyến.");
    }
    return finish(ritualKind, text);
  } catch (error) {
    console.error("[journal] AI error", error);
    const offline = offlineJournalRitual(analysis.sentiment);
    return finish(offline.kind, offline.text, "AI đang bận, đã dùng nghi thức ngoại tuyến.");
  }
}