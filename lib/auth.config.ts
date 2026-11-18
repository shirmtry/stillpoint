import type { NextAuthConfig } from "next-auth";

export const PROTECTED_PREFIXES = ["/dashboard", "/session", "/studio", "/journal"] as const;

/**
 * Edge-safe half of the Auth.js config. It is imported by middleware, so it
 * must not pull the MongoDB adapter or any Node-only dependency.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const path = request.nextUrl.pathname;
      const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
      if (isProtected) return isLoggedIn;
      if (isLoggedIn && (path === "/login" || path === "/register")) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;