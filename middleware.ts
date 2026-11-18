import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (req.auth) return;
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Bạn cần đăng nhập để tiếp tục." },
      { status: 401 },
    );
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/session/:path*",
    "/studio/:path*",
    "/journal/:path*",
    "/login",
    "/api/ai/:path*",
  ],
};