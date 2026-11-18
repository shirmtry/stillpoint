import { z } from "zod";
import { apiError, currentUser } from "@/lib/api";
import { config } from "@/lib/config";
import { getStripe, priceIdFor } from "@/lib/stripe";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");

  const stripe = getStripe();
  if (!stripe) {
    return apiError(503, "BILLING_DISABLED", "Thanh toán chưa được cấu hình trên môi trường này.");
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError(400, "BAD_REQUEST", "Chu kỳ thanh toán không hợp lệ.");

  const priceId = priceIdFor(parsed.data.interval);
  if (!priceId) return apiError(503, "BILLING_DISABLED", "Chưa cấu hình giá gói Pro.");

  const store = getStore();
  let profile = await store.getUser(user.id);
  if (!profile) {
    profile = await store.ensureUser({ email: user.email, name: null, image: null });
  }
  if (profile.plan === "pro") {
    return apiError(409, "ALREADY_PRO", "Bạn đang dùng Pro. Hãy dùng “Quản lý gói” để thay đổi.");
  }

  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await store.setPlan(user.id, profile.plan, { stripeCustomerId: customerId });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${config.appUrl}/dashboard?success=true`,
    cancel_url: `${config.appUrl}/dashboard?canceled=true`,
  });

  if (!checkout.url) return apiError(502, "STRIPE_ERROR", "Stripe không trả về đường dẫn thanh toán.");
  return Response.json({ url: checkout.url });
}