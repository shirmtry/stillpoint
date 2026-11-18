import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { JournalComposer, type JournalHistoryItem } from "@/components/journal-composer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhật ký" };

export default async function JournalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const journals = await getStore().listJournals(session.user.id, 12);
  const history: JournalHistoryItem[] = journals.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    entry: item.entry,
    sentiment: item.sentiment,
    ritualKind: item.ritualKind,
    ritual: item.ritual,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Nhật ký</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Một trang giấy, một nghi thức.</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          StillPoint đọc tâm trạng trong đoạn bạn viết và tạo đúng một nghi thức để làm ngay — thở, thiền ngắn,
          hoặc một câu chuyện để thả lỏng.
        </p>
      </div>
      <JournalComposer history={history} />
    </div>
  );
}