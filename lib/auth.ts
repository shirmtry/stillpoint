import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { authConfig } from "./auth.config";
import { config } from "./config";
import { getMongoClientPromise, hasMongo } from "./db";
import { getStore } from "./store";

const providers: NextAuthConfig["providers"] = [];

if (config.google.id && config.google.secret) {
  providers.push(
    Google({
      clientId: config.google.id,
      clientSecret: config.google.secret,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (config.resend.key) {
  providers.push(Resend({ apiKey: config.resend.key, from: config.resend.from }));
}

if (config.demoMode) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {},
      async authorize() {
        const user = await getStore().ensureUser({
          email: "demo@stillpoint.app",
          name: "Demo Explorer",
          image: null,
        });
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: hasMongo()
    ? MongoDBAdapter(getMongoClientPromise(), { databaseName: config.mongodbDb })
    : undefined,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.checkedAt = 0;
      }
      const uid = typeof token.uid === "string" ? token.uid : null;
      const lastCheck = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (uid && Date.now() - lastCheck > 30_000) {
        try {
          const profile = await getStore().getUser(uid);
          if (profile) {
            token.plan = profile.plan;
            token.name = profile.name ?? token.name;
            token.picture = profile.image ?? token.picture;
          } else {
            token.plan = "free";
          }
        } catch {
          token.plan = token.plan === "pro" ? "pro" : "free";
        }
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.uid === "string" ? token.uid : "";
        session.user.plan = token.plan === "pro" ? "pro" : "free";
      }
      return session;
    },
  },
});