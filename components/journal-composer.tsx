"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Pause, Play, PenLine, Sparkles, Square } from "lucide-react";
import { Badge, Button, Card, CardDescription, CardTitle, Label, Textarea } from "@/components/ui";
import { useSpeech } from "@/lib/use-speech";
import { SENTIMENT_LABEL } from "@/lib/sentiment";
import { cn } from "@/lib/utils";
import type { RitualKind, Sentiment } from "@/lib/types";

export interface JournalHistoryItem {
  id: string;
  createdAt: string;
  entry: string;
  sentiment: Sentiment;
  ritualKind: RitualKind;
  ritual: string;
}

interface JournalResult {
  sentiment: Sentiment;
  score: number;
  ritualKind: RitualKind;
  ritual: string;
  notice?: string;
  crisis?: boolean;
}

const RITUAL_LABEL: Record<RitualKind, string> = {
  breathing: "Bài thở",
  meditation: "Thiền ngắn",
  story: "Câu chuyện",
  support: "Hỗ trợ khẩn cấp",
};

const SENTIMENT_TONE: Record<Sentiment, "accent" | "neutral" | "warn" | "danger"> = {
  positive: "accent",
  neutral: "neutral",
  negative: "warn",
  crisis: "danger",
};

const PROMPTS = [
  "Hôm nay mình kiệt vì…",
  "Một điều tốt đã xảy ra…",
  "Điều mình vẫn còn mang theo…",
];

export function JournalComposer({ history }: { history: JournalHistoryItem[] }) {
  const router = useRouter();
  const [entry, setEntry] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JournalResult | null>(null);
  const [error, setError] = useState("");

  const ritualParagraphs = useMemo(
    () =>
      (result?.ritual ?? "")
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    [result],
  );
  const speech = useSpeech(ritualParagraphs);

  async function submit() {
    if (entry.trim().length < 10) {
      setError("Viết thêm một chút nhé — ít nhất một câu đầy đủ.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    speech.stop();
    try {
      const response = await fetch("/api/ai/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: entry.trim() }),
      });
      const data = (await response.json().catch(() => null)) as
        | (JournalResult & { message?: string })
        | null;
      if (!response.ok || !data) {
        setError(data?.message ?? "Không tạo được nghi thức. Thử lại nhé.");
        return;
      }
      setResult({
        sentiment: data.sentiment,
        score: data.score,
        ritualKind: data.ritualKind,
        ritual: data.ritual,
        notice: data.notice,
        crisis: data.crisis,
      });
      router.refresh();
    } catch {
      setError("Mất kết nối. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Đóng lại ngày hôm nay</CardTitle>
            <CardDescription>Viết như nói với chính mình. Không ai khác đọc.</CardDescription>
          </div>
          <Badge tone="violet">
            <PenLine className="h-3 w-3" /> Nhật ký
          </Badge>
        </div>

        <div className="mt-4">
          <Label htmlFor="entry">Vài dòng cuối ngày</Label>
          <Textarea
            id="entry"
            rows={6}
            maxLength={4000}
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            placeholder="Hôm nay mình họp liên tục, đến tối thì không còn muốn nói chuyện với ai. Nhưng mình đã xong phần khó nhất…"
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setEntry((previous) => (previous ? `${previous}\n${prompt}` : prompt))}
                  className="rounded-full border border-border px-3 py-1 text-[11px] text-muted hover:border-primary/30 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-muted">{entry.length}/4000</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void submit()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Đang đọc và thiết kế nghi thức…" : "Tạo nghi thức cho tối nay"}
          </Button>
          <span className="text-[11px] text-muted">AI chỉ đọc đoạn này, không lưu gì khác.</span>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
      </Card>

      {result ? (
        <Card
          className={cn(
            result.crisis ? "border-rose-400/30 bg-rose-400/[0.04]" : "border-primary/20",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={SENTIMENT_TONE[result.sentiment]}>{SENTIMENT_LABEL[result.sentiment]}</Badge>
            <Badge tone="neutral">{RITUAL_LABEL[result.ritualKind]}</Badge>
            {!result.crisis ? (
              <span className="text-[11px] text-muted">điểm cảm xúc {result.score.toFixed(2)} (−1 → 1)</span>
            ) : null}
          </div>

          {result.crisis ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-black/20 p-3 text-xs leading-relaxed text-rose-100/90">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <p>
                Nội dung này cho thấy bạn đang cần hỗ trợ trực tiếp. StillPoint dừng phần “huấn luyện” và chỉ
                hiển thị hướng dẫn an toàn bên dưới.
              </p>
            </div>
          ) : null}

          <div className="prose-calm mt-4 text-[15px]">
            {ritualParagraphs.map((part, index) => (
              <p key={index} className="whitespace-pre-wrap">
                {part}
              </p>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {speech.supported ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    speech.speaking && !speech.paused
                      ? speech.pause()
                      : speech.speaking
                        ? speech.resume()
                        : speech.play(0)
                  }
                >
                  {speech.speaking && !speech.paused ? (
                    <>
                      <Pause className="h-4 w-4" /> Tạm dừng
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> {speech.paused ? "Tiếp tục" : "Nghe nghi thức"}
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={speech.stop} disabled={!speech.speaking}>
                  <Square className="h-3.5 w-3.5" /> Dừng
                </Button>
              </>
            ) : null}
            {result.notice ? <span className="text-[11px] text-amber-200/90">{result.notice}</span> : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Những ngày trước</CardTitle>
        <CardDescription>Nghi thức cũ vẫn còn đây để bạn quay lại khi cần.</CardDescription>

        {history.length === 0 ? (
          <p className="mt-5 text-sm text-muted">Chưa có mục nào. Trang này sẽ dày lên theo thời gian.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((item) => (
              <li key={item.id}>
                <details className="group rounded-xl border border-border/70 bg-black/15 px-4 py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-xs text-muted marker:hidden">
                    <span className="text-foreground/90">
                      {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                    <Badge tone={SENTIMENT_TONE[item.sentiment]}>{SENTIMENT_LABEL[item.sentiment]}</Badge>
                    <span>{RITUAL_LABEL[item.ritualKind]}</span>
                    <span className="ml-auto text-[11px] text-muted/70 group-open:hidden">Mở</span>
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                    <p className="text-xs italic leading-relaxed text-muted">“{item.entry}”</p>
                    <div className="prose-calm text-sm">
                      {item.ritual.split(/\n{2,}/).map((part, index) => (
                        <p key={index} className="whitespace-pre-wrap">
                          {part}
                        </p>
                      ))}
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}