import { z } from "zod";
import { generateTextFor, parseJsonLoose } from "@/lib/ai";
import { apiError, clientIp, currentUser } from "@/lib/api";
import { isAiEnabled } from "@/lib/config";
import { costFromUsage, estimateCostUsd, modelForPlan } from "@/lib/pricing";
import { soundscapeSystem, soundscapeUserPrompt } from "@/lib/prompts";
import { limitRequest } from "@/lib/rate-limit";
import { heuristicSoundscape, normalizeSoundscape, type SoundscapeSpec } from "@/lib/soundscape";
import { getSpendGuard, spendLimitMessage } from "@/lib/spend-guard";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OUTPUT_TOKENS = 220;

const bodySchema = z.object({
  prompt: z.string().trim().min(3, "Mô tả cần ít nhất 3 ký tự.").max(300),
});

export async function POST(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Mô tả không hợp lệ.");
  }
  const prompt = parsed.data.prompt;

  const ipLimit = await limitRequest(`soundscape:ip:${clientIp(request)}`, 10, "1 m");
  if (!ipLimit.success) {
    return apiError(429, "RATE_LIMITED", "Chậm lại một chút nhé — thử lại sau vài chục giây.");
  }

  if (!isAiEnabled) {
    const spec = heuristicSoundscape(prompt);
    return Response.json({ spec, notice: "Đang chạy bộ trộn âm thanh ngoại tuyến (chưa cấu hình AI Gateway)." });
  }

  const store = getStore();
  const profile = await store.getUser(user.id);
  const plan = profile?.plan ?? user.plan;
  const modelId = modelForPlan(plan);
  const system = soundscapeSystem();
  const userPrompt = soundscapeUserPrompt(prompt);
  const estimate = estimateCostUsd(modelId, system.length + userPrompt.length, MAX_OUTPUT_TOKENS);

  const guard = getSpendGuard();
  const check = await guard.check(user.id, estimate);
  if (!check.allowed) {
    const spec = heuristicSoundscape(prompt);
    return Response.json({ spec, notice: spendLimitMessage(check) });
  }

  try {
    const generated = await generateTextFor({
      plan,
      system,
      prompt: userPrompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.6,
    });
    const parsedJson = parseJsonLoose(generated.text);
    const spec: SoundscapeSpec = normalizeSoundscape(parsedJson, prompt);
    const cost = costFromUsage(modelId, generated.usage, estimate);
    await guard.record(user.id, cost);
    return Response.json({ spec });
  } catch (error) {
    console.error("[soundscape] AI error", error);
    const spec = heuristicSoundscape(prompt);
    return Response.json({ spec, notice: "AI đang bận, đã chuyển sang bộ trộn ngoại tuyến." });
  }
}