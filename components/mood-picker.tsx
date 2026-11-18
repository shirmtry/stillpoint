"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MOODS = [
  { value: 1, label: "Cạn kiệt", face: "◡" },
  { value: 2, label: "Mệt", face: "︵" },
  { value: 3, label: "Bình thường", face: "•" },
  { value: 4, label: "Tốt", face: "◠" },
  { value: 5, label: "Sung sức", face: "⌣" },
];

export function MoodPicker({ initial = null }: { initial?: number | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function pick(value: number) {
    setBusy(value);
    setError("");
    try {
      const response = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: value }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message ?? "Không lưu được. Thử lại nhé.");
        return;
      }
      setSelected(value);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Mất kết nối. Thử lại nhé.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {MOODS.map((mood) => {
          const active = selected === mood.value;
          return (
            <button
              key={mood.value}
              type="button"
              onClick={() => void pick(mood.value)}
              disabled={busy !== null}
              aria-label={`Tâm trạng: ${mood.label}`}
              aria-pressed={active}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all",
                active
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border bg-black/15 text-muted hover:border-primary/25 hover:text-foreground",
              )}
            >
              <span className="text-base leading-none">{mood.face}</span>
              <span className="text-[10px] leading-none">{mood.label}</span>
              {busy === mood.value ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex h-4 items-center gap-1.5 text-[11px] text-muted">
        {saved ? (
          <>
            <Check className="h-3 w-3 text-primary" /> Đã ghi nhận. Cảm ơn bạn đã để ý đến mình.
          </>
        ) : (
          <span>Ghi một lần mỗi ngày cũng đủ để thấy xu hướng.</span>
        )}
      </div>
      {error ? <p className="mt-1 text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}