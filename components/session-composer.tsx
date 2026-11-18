"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, Pause, Play, RotateCcw, Square, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardDescription, CardTitle, Label, Textarea } from "@/components/ui";
import { BreathingOrb } from "@/components/breathing-orb";
import { useSpeech } from "@/lib/use-speech";
import { cn } from "@/lib/utils";
import { SESSION_KIND_HINT, SESSION_KIND_LABEL, type SessionKind } from "@/lib/types";

const KINDS: SessionKind[] = ["calm", "focus", "winddown"];
const MINUTES = [3, 5, 10, 15];
const MOODS = [
  { value: 1, label: "Cạn kiệt" },
  { value: 2, label: "Mệt" },
  { value: 3, label: "Giữa" },
  { value: 4, label: "Tốt" },
  { value: 5, label: "Sung sức" },
];

type Status = "idle" | "streaming" | "done" | "error";

export function SessionComposer() {
  const [kind, setKind] = useState<SessionKind>("calm");
  const [minutes, setMinutes] = useState(5);
  const [intent, setIntent] = useState("");
  const [mood, setMood] = useState<number | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const paragraphs = useMemo(
    () => text.split(/\n{2,}/).map((part) => part.trim()).filter((part) => part.length > 0),
    [text],
  );
  const speech = useSpeech(paragraphs);

  useEffect(() => {
    const node = scrollerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [text]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  async function start() {
    speech.stop();
    setStatus("streaming");
    setText("");
    setError("");
    setSessionId(null);
    setAiMode(null);
    setShowUpgrade(false);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch("/api/ai/stream-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, minutes, intent: intent.trim() || undefined, mood }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { message?: string; error?: string }
          | null;
        setStatus("error");
        setError(data?.message ?? "Không tạo được phiên lúc này.");
        setShowUpgrade(data?.error === "QUOTA_EXCEEDED" || data?.error === "SPEND_LIMIT");
        return;
      }

      setSessionId(response.headers.get("x-session-id"));
      setAiMode(response.headers.get("x-ai-mode"));

      const reader = response.body?.getReader();
      if (!reader) {
        setStatus("error");
        setError("Trình duyệt không nhận được luồng nội dung.");
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setText(accumulated);
      }
      accumulated += decoder.decode();
      setText(accumulated);
      setStatus("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
      setError("Đường truyền bị ngắt giữa chừng. Thử lại nhé.");
    } finally {
      controllerRef.current = null;
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    speech.stop();
    setStatus(text ? "done" : "idle");
  }

  const busy = status === "streaming";

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Thiết kế phiên của bạn</CardTitle>
            <CardDescription>Chọn loại, thời lượng và điều đang diễn ra trong đầu.</CardDescription>
          </div>
          <Badge tone="neutral">Không đúng cũng không sao</Badge>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {KINDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              disabled={busy}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                kind === option
                  ? "border-primary/45 bg-primary/[0.08]"
                  : "border-border bg-black/15 hover:border-primary/25",
              )}
            >
              <p className={cn("text-sm font-medium", kind === option ? "text-primary" : "text-foreground")}>
                {SESSION_KIND_LABEL[option]}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{SESSION_KIND_HINT[option]}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Thời lượng</Label>
            <div className="flex gap-1.5">
              {MINUTES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMinutes(value)}
                  disabled={busy}
                  className={cn(
                    "h-9 flex-1 rounded-full border text-xs transition-colors",
                    minutes === value
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {value} phút
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Năng lượng hiện tại (tuỳ chọn)</Label>
            <div className="flex gap-1.5">
              {MOODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMood(mood === item.value ? null : item.value)}
                  disabled={busy}
                  aria-pressed={mood === item.value}
                  title={item.label}
                  className={cn(
                    "h-9 flex-1 rounded-full border text-[11px] transition-colors",
                    mood === item.value
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {item.value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Label htmlFor="intent">Điều gì đang diễn ra? (tuỳ chọn)</Label>
          <Textarea
            id="intent"
            rows={3}
            maxLength={400}
            value={intent}
            disabled={busy}
            onChange={(event) => setIntent(event.target.value)}
            placeholder="Ví dụ: vừa họp xong 2 tiếng, đầu óc ong ong, còn 1 task phải xong trước 6h."
          />
          <div className="mt-1 text-right text-[11px] text-muted">{intent.length}/400</div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {busy ? (
            <Button variant="outline" onClick={cancel}>
              <Square className="h-4 w-4" /> Dừng
            </Button>
          ) : (
            <Button onClick={() => void start()}>
              <Sparkles className="h-4 w-4" /> Bắt đầu phiên {minutes} phút
            </Button>
          )}
          <span className="text-[11px] text-muted">
            Nội dung được tạo theo ngữ cảnh của bạn và không lưu gì ngoài phiên này.
          </span>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Lời thoại</CardTitle>
          <div className="flex items-center gap-2">
            {aiMode === "offline" ? <Badge tone="warn">Ngoại tuyến</Badge> : null}
            {status === "streaming" && text ? (
              <Badge tone="accent">
                <Loader2 className="h-3 w-3 animate-spin" /> Đang viết
              </Badge>
            ) : null}
            {status === "done" ? <Badge tone="accent">Hoàn tất</Badge> : null}
          </div>
        </div>

        {status === "idle" && !text ? (
          <div className="flex flex-col items-center py-10 text-center">
            <BreathingOrb active={false} label="5'" />
            <p className="mt-4 max-w-sm text-sm text-muted">
              Lời thoại sẽ xuất hiện ở đây, từng câu một. Bạn có thể đọc hoặc nghe bằng giọng tiếng Việt của
              trình duyệt.
            </p>
          </div>
        ) : null}

        {status === "streaming" && !text ? (
          <div className="flex flex-col items-center py-10 text-center">
            <BreathingOrb active label="…" />
            <p className="mt-4 text-sm text-muted">Đang viết lời thoại riêng cho bạn…</p>
          </div>
        ) : null}

        {text ? (
          <div
            ref={scrollerRef}
            className="mt-4 max-h-[430px] overflow-y-auto rounded-xl border border-border/70 bg-black/20 p-5"
          >
            <div className="prose-calm text-[15px]">
              {text.split(/\n{2,}/).map((part, index) => (
                <p key={index} className="whitespace-pre-wrap">
                  {part}
                </p>
              ))}
              {status === "streaming" ? (
                <span className="inline-block h-4 w-[7px] animate-pulse rounded-sm bg-primary/80 align-middle" />
              ) : null}
            </div>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-400/5 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <div>
              <p className="text-rose-200">{error}</p>
              {showUpgrade ? (
                <Link href="/dashboard" className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                  Xem gói Pro <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {status === "done" && text ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {speech.supported ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => (speech.speaking && !speech.paused ? speech.pause() : speech.speaking ? speech.resume() : speech.play(0))}
                >
                  {speech.speaking && !speech.paused ? (
                    <>
                      <Pause className="h-4 w-4" /> Tạm dừng
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> {speech.paused ? "Tiếp tục" : "Đọc to"}
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={speech.stop} disabled={!speech.speaking}>
                  <Square className="h-3.5 w-3.5" /> Dừng đọc
                </Button>
              </>
            ) : (
              <span className="text-[11px] text-muted">Trình duyệt này không hỗ trợ đọc tiếng Việt.</span>
            )}
            {sessionId ? (
              <Link href={`/session/${sessionId}`} className="ml-auto">
                <Button size="sm" variant="outline">
                  Mở lại phiên <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => void start()}>
              <RotateCcw className="h-3.5 w-3.5" /> Phiên khác
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}