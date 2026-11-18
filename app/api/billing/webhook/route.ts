import type Stripe from "stripe";
import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe";
import { getStore, type Store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const raw = (subscription as unknown as { current_period_end?: number }).current_period_end;
  return typeof raw === "number" ? new Date(raw * 1000) : null;
}

async function syncSubscription(store: Store, subscription: Stripe.Subscription, userIdOverride?: string): Promise<void> {
  const userId = userIdOverride ?? subscription.metadata.userId ?? null;
  if (!userId) return;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const active = subscription.status === "active" || subscription.status === "trialing";
  const priceId = subscription.items.data[0]?.price.id ?? null;

  await store.setPlan(userId, active ? "pro" : "free", { stripeCustomerId: customerId });
  await store.upsertSubscription({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    priceId,
    currentPeriodEnd: subscriptionPeriodEnd(subscription),
  });
}

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripe();
  if (!stripe || !config.stripe.webhookSecret) {
    return new Response("Stripe webhook is not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature header", { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
  } catch (error) {
    console.error("[stripe] signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  const store = getStore();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkout = event.data.object;
        const userId = checkout.client_reference_id ?? checkout.metadata?.userId ?? null;
        const customerId =
          typeof checkout.customer === "string" ? checkout.customer : checkout.customer?.id ?? null;
        const subscriptionId =
          typeof checkout.subscription === "string"
            ? checkout.subscription
            : checkout.subscription?.id ?? null;
        if (!userId) break;

        await store.setPlan(userId, "pro", { stripeCustomerId: customerId });
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(store, subscription, userId);
        } else if (customerId) {
          await store.upsertSubscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            status: "active",
            priceId: null,
            currentPeriodEnd: null,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(store, event.data.object);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("[stripe] webhook handling failed", event.type, error);
    return new Response("Webhook handler error", { status: 500 });
  }

  return Response.json({ received: true });
}