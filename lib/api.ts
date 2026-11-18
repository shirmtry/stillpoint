import { NextResponse } from "next/server";
import { auth } from "./auth";
import type { Plan } from "./types";

export interface AuthedUser {
  id: string;
  email: string;
  plan: Plan;
}

export async function currentUser(): Promise<AuthedUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    plan: user.plan === "pro" ? "pro" : "free",
  };
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function apiError(status: number, code: string, message: string, extra?: Record<string, unknown>): NextResponse {
  return json({ error: code, message, ...extra }, status);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first && first.trim()) return first.trim();
  }
  return request.headers.get("x-real-ip") ?? "local";
}

export function describeZodError(error: { issues: Array<{ message: string }> }): string {
  return error.issues.map((issue) => issue.message).join("; ") || "Dữ liệu không hợp lệ.";
}