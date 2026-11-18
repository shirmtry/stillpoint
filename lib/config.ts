function toBool(value: string | undefined, fallback = false): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function toNum(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  mongodbUri: (process.env.MONGODB_URI ?? "").trim(),
  mongodbDb: (process.env.MONGODB_DB ?? "").trim() || "stillpoint",
  demoMode: toBool(process.env.DEMO_MODE) && process.env.NODE_ENV !== "production",
  ai: {
    apiKey: (process.env.AI_GATEWAY_API_KEY ?? "").trim(),
    model: (process.env.AI_MODEL ?? "").trim() || "openai/gpt-4o-mini",
    premiumModel: (process.env.AI_MODEL_PREMIUM ?? "").trim() || "anthropic/claude-3-5-sonnet",
  },
  spend: {
    dailyGlobalUsd: toNum(process.env.SPEND_DAILY_LIMIT_USD, 2),
    dailyUserUsd: toNum(process.env.SPEND_DAILY_LIMIT_USER_USD, 0.5),
  },
  stripe: {
    secretKey: (process.env.STRIPE_SECRET_KEY ?? "").trim(),
    webhookSecret: (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim(),
    priceMonthly: (process.env.STRIPE_PRICE_PRO_MONTHLY ?? "").trim(),
    priceYearly: (process.env.STRIPE_PRICE_PRO_YEARLY ?? "").trim(),
  },
  upstash: {
    url: (process.env.UPSTASH_REDIS_REST_URL ?? "").trim(),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),
  },
  google: {
    id: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
    secret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
  },
  resend: {
    key: (process.env.AUTH_RESEND_KEY ?? "").trim(),
    from: (process.env.EMAIL_FROM ?? "").trim() || "StillPoint <onboarding@resend.dev>",
  },
} as const;

export const isAiEnabled = config.ai.apiKey.length > 0;
export const hasUpstash = config.upstash.url.length > 0 && config.upstash.token.length > 0;