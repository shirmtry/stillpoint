import { gateway } from "@ai-sdk/gateway";
import { generateText, type LanguageModelUsage } from "ai";
import { modelForPlan } from "./pricing";
import type { Plan } from "./types";

export function buildModel(plan: Plan): { modelId: string; model: ReturnType<typeof gateway> } {
  const modelId = modelForPlan(plan);
  return { modelId, model: gateway(modelId) };
}

export interface GeneratedText {
  text: string;
  usage: LanguageModelUsage | undefined;
}

export async function generateTextFor(input: {
  plan: Plan;
  system: string;
  prompt: string;
  maxOutputTokens: number;
  temperature?: number;
}): Promise<GeneratedText> {
  const { model } = buildModel(input.plan);
  const result = await generateText({
    model,
    system: input.system,
    prompt: input.prompt,
    maxOutputTokens: input.maxOutputTokens,
    temperature: input.temperature ?? 0.8,
  });
  return { text: result.text, usage: result.usage };
}

export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}