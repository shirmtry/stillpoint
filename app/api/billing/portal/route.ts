import { apiError, currentUser } from "@/lib/api";
import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const user = await currentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");

  const stripe = getStripe();
  if (!stripe) {
    return apiError(503, "BILLING_DISABLED", "Thanh toán chưa được cấu hình trên môi trường này.");
  }

  const profile = await getStore().getUser(user.id);
  if (!profile?.stripeCustomerId) {
    return apiError(400, "NO_CUSTOMER", "Chưa có hồ sơ thanh toán. Hãy nâng cấp Pro trước.");
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${config.appUrl}/dashboard`,
  });

  return Response.json({ url: portal.url });
}