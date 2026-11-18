import { streamText } from "ai";
import { z } from "zod";
import { buildModel } from "@/lib/ai";
import { apiError, clientIp, currentUser } from "@/lib/api";
import { config, isAiEnabled } from "@/lib/config";
import { offlineSession } from "@/lib/offline";
import { costFromUsage, estimateCostUsd, modelForPlan } from "@/lib/pricing";
import { limitRequest } from "@/lib/rate-limit";
import { sessionSystem, sessionUserPrompt } from "@/lib/prompts";
import { getSpendGuard, spendLimitMessage } from "@/lib/spend-guard";
import { getStore } from "@/lib/store";
import type { SessionKind } from "@/lib/types";
import { quotaExceeded } from "@/lib/usage";
import { startOfUtcDay, titleFromPrompt } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kind: z.enum(["calm", "focus", "winddown"]),
  minutes: z.number().int().min(2).max(15).default(5),
  intent: z.string().trim().max(400).optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
});

const MAX_OUTPUT_TOKENS = 900;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkText(text: string): string[] {
  const tokens = text.split(/(\s+)/).filter((token) => token.length > 0);
  const chunks: string[] = [];
  let buffer = "";
  for (const token of tokens) {
    buffer += token;
    if (buffer.length >= 14) {
      chunks.push(buffer);
      buffer = "";
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

function streamChunks(sessionId: string, text: string, model: string, mode: string, onDone: () => Promise<void>): Response {
  const encoder = new TextEncoder();
  const chunks = chunkText(text);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
          await sleep(20);
        }
      } catch {
        // client disconnected; still persist what was generated
      }
      try {
        await onDone();
      } catch (error) {
        console.error("[stream-session] finalize failed", error);
      }
      try {
        controller.close();
      } catch {
        // already closed
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "x-session-id": sessionId,
      "x-model": model,
      "x-ai-mode": mode,
    },
  });
}

function defaultTitle(kind: SessionKind): string {
  if (kind === "focus") return "Khởi động tập trung";
  if (kind === "winddown") return "Thả lỏng cuối ngày";
  return "Phiên hạ nhiệt";
}

export async function POST(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập để bắt đầu phiên.");

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "BAD_REQUEST", "Thông tin phiên không hợp lệ.");
  }
  const { kind, minutes, intent, mood } = parsed.data;

  const [ipLimit, userLimit] = await Promise.all([
    limitRequest(`ai:ip:${clientIp(request)}`, 15, "1 m"),
    limitRequest(`ai:user:${user.id}`, 20, "1 h"),
  ]);
  if (!ipLimit.success) {
    return apiError(429, "RATE_LIMITED", "Hơi nhanh rồi. Chờ khoảng một phút rồi thử lại nhé.", {
      retryAfter: Math.max(1, Math.ceil((ipLimit.reset - Date.now()) / 1000)),
    });
  }
  if (!userLimit.success) {
    return apiError(429, "RATE_LIMITED", "Bạn đã tạo khá nhiều phiên trong một giờ. Nghỉ một chút rồi quay lại nhé.");
  }

  const store = getStore();
  const profile = await store.getUser(user.id);
  const plan = profile?.plan ?? user.plan;
  const used = await store.countSessionsSince(user.id, startOfUtcDay());

  if (quotaExceeded(plan, used)) {
    return apiError(
      402,
      "QUOTA_EXCEEDED",
      "Bạn đã dùng hết 3 phiên miễn phí hôm nay. Nâng cấp Pro để tạo phiên không giới hạn, hoặc quay lại sau 0h UTC.",
      { plan, used, limit: 3 },
    );
  }

  const system = sessionSystem(kind);
  const prompt = sessionUserPrompt({ kind, minutes, intent, mood });
  const modelId = modelForPlan(plan);
  const estimate = estimateCostUsd(modelId, system.length + prompt.length, MAX_OUTPUT_TOKENS);

  const guard = getSpendGuard();
  const spendCheck = await guard.check(user.id, estimate);
  if (!spendCheck.allowed) {
    return apiError(402, "SPEND_LIMIT", spendLimitMessage(spendCheck), {
      spentGlobal: spendCheck.globalUsd,
      spentUser: spendCheck.userUsd,
      limitGlobal: spendCheck.globalLimitUsd,
      limitUser: spendCheck.userLimitUsd,
    });
  }

  const session = await store.createSession({
    userId: user.id,
    kind,
    title: titleFromPrompt(intent, `${defaultTitle(kind)} · ${minutes} phút`),
    prompt: intent ?? "",
    durationSec: minutes * 60,
    moodBefore: mood ?? null,
    model: isAiEnabled ? modelId : "offline",
  });

  if (typeof mood === "number") {
    await store.addMood({ userId: user.id, mood }).catch(() => undefined);
  }

  if (!isAiEnabled) {
    const text = offlineSession(kind, minutes, intent, mood);
    return streamChunks(session.id, text, "offline", "offline", async () => {
      await store.finishSession(session.id, text, 0);
    });
  }

  const { model } = buildModel(plan);
  const result = streamText({
    model,
    system,
    prompt,
    temperature: 0.85,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    onFinish: async ({ text, usage }) => {
      const cost = costFromUsage(modelId, usage, estimate);
      try {
        await store.finishSession(session.id, text, cost);
        await guard.record(user.id, cost);
      } catch (error) {
        console.error("[stream-session] persist failed", error);
      }
    },
    onError: async ({ error }) => {
      console.error("[stream-session] AI error", error);
      try {
        await store.finishSession(
          session.id,
          "Không thể tạo phiên lúc này. Đường truyền AI đang bận — bạn thử lại sau một phút nhé. Trong lúc chờ, Studio âm thanh vẫn hoạt động.",
          0,
        );
      } catch {
        // best effort
      }
    },
  });

  const upstream = result.toTextStreamResponse();
  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", "no-store, no-transform");
  headers.set("x-session-id", session.id);
  headers.set("x-model", modelId);
  headers.set("x-ai-mode", "live");
  headers.set("x-plan", plan);
  headers.set("x-app-url", config.appUrl);

  return new Response(upstream.body, { status: 200, headers });
}