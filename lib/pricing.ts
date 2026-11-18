import { config } from "./config";

export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

const DEFAULT_PRICE: ModelPrice = { inputPerMTok: 1, outputPerMTok: 3 };

const PRICES: Record<string, ModelPrice> = {
  "openai/gpt-4o-mini": { inputPerMTok: 0.15, outputPerMTok: 0.6 },
  "openai/gpt-4.1-mini": { inputPerMTok: 0.4, outputPerMTok: 1.6 },
  "anthropic/claude-3-5-sonnet": { inputPerMTok: 3, outputPerMTok: 15 },
  "anthropic/claude-3-5-haiku": { inputPerMTok: 0.8, outputPerMTok: 4 },
};

export function priceFor(model: string): ModelPrice {
  return PRICES[model] ?? DEFAULT_PRICE;
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Rough but conservative: 1 token ≈ 3.6 characters for mixed VI/EN text. */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 3.6);
}

export function estimateCostUsd(model: string, promptChars: number, maxOutputTokens: number): number {
  const price = priceFor(model);
  const inputTokens = estimateTokens(promptChars);
  return roundUsd((inputTokens / 1e6) * price.inputPerMTok + (maxOutputTokens / 1e6) * price.outputPerMTok);
}

export interface TokenUsage {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
}

export function costFromUsage(model: string, usage: TokenUsage | undefined, fallbackUsd: number): number {
  if (!usage || (!usage.inputTokens && !usage.outputTokens)) return fallbackUsd;
  const price = priceFor(model);
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  return roundUsd((input / 1e6) * price.inputPerMTok + (output / 1e6) * price.outputPerMTok);
}

export function modelForPlan(plan: "free" | "pro"): string {
  return plan === "pro" ? config.ai.premiumModel : config.ai.model;
}