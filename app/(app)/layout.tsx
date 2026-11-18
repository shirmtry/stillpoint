import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { SiteNav } from "@/components/site-nav";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let plan: Plan = session.user.plan;
  try {
    const profile = await getStore().getUser(session.user.id);
    if (profile) plan = profile.plan;
  } catch {
    // DB hiccup: keep the plan from the token so the shell still renders.
  }

  return (
    <div className="min-h-dvh">
      <SiteNav plan={plan} email={session.user.email ?? null} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
    </div>
  );
}