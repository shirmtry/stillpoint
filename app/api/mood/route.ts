import { z } from "zod";
import { apiError, currentUser } from "@/lib/api";
import { limitRequest } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  mood: z.number().int().min(1).max(5),
  note: z.string().trim().max(280).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "BAD_REQUEST", "Mức tâm trạng phải từ 1 đến 5.");

  const limit = await limitRequest(`mood:user:${user.id}`, 30, "1 h");
  if (!limit.success) return apiError(429, "RATE_LIMITED", "Bạn đã ghi khá nhiều lần. Thử lại sau nhé.");

  const mood = await getStore().addMood({
    userId: user.id,
    mood: parsed.data.mood,
    note: parsed.data.note ?? null,
  });

  return Response.json({ id: mood.id, mood: mood.mood, createdAt: mood.createdAt.toISOString() });
}