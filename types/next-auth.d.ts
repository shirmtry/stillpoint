import type { DefaultSession } from "next-auth";
import type { Plan } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: Plan;
    } & DefaultSession["user"];
  }

  interface User {
    plan?: Plan;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    plan?: Plan;
    checkedAt?: number;
  }
}