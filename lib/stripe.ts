import Stripe from "stripe";
import { config } from "./config";

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!config.stripe.secretKey) return null;
  if (!cached) {
    cached = new Stripe(config.stripe.secretKey, { maxNetworkRetries: 2, typescript: true });
  }
  return cached;
}

export function priceIdFor(interval: "monthly" | "yearly"): string {
  return interval === "yearly" ? config.stripe.priceYearly : config.stripe.priceMonthly;
}