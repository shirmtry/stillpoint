import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { formatDateVi, formatTimeVi } from "@/lib/utils";
import { SESSION_KIND_LABEL } from "@/lib/types";
import { SessionPlayer } from "@/components/session-player";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const item = await getStore().getSession(id, session.user.id);
  if (!item) notFound();

  return (
    <div className="space-y-5">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Tổng quan
      </Link>

      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          {formatDateVi(item.createdAt)} · {formatTimeVi(item.createdAt)}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{item.title}</h1>
        {item.prompt ? <p className="mt-1.5 text-sm text-muted">“{item.prompt}”</p> : null}
      </div>

      <SessionPlayer
        content={item.content}
        kindLabel={SESSION_KIND_LABEL[item.kind]}
        createdLabel={`${formatDateVi(item.createdAt)} ${formatTimeVi(item.createdAt)}`}
        durationMin={Math.round(item.durationSec / 60)}
      />
    </div>
  );
}