"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { Badge, Button, Card, Progress } from "@/components/ui";
import { useSpeech } from "@/lib/use-speech";
import { cn } from "@/lib/utils";

const RATES = [0.85, 0.95, 1.05, 1.15];

export function SessionPlayer({
  content,
  kindLabel,
  createdLabel,
  durationMin,
}: {
  content: string;
  kindLabel: string;
  createdLabel: string;
  durationMin: number;
}) {
  const paragraphs = useMemo(
    () => content.split(/\n{2,}/).map((part) => part.trim()).filter((part) => part.length > 0),
    [content],
  );
  const speech = useSpeech(paragraphs);
  const active = speech.index;

  if (paragraphs.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Phiên này không có nội dung (có thể bị gián đoạn khi tạo). Hãy tạo một phiên mới.
        </p>
      </Card>
    );
  }

  const playing = speech.speaking && !speech.paused;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{kindLabel}</Badge>
            <span className="text-xs text-muted">
              {createdLabel} · {durationMin} phút
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => speech.setRate(rate)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  Math.abs(speech.rate - rate) < 0.001
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border text-muted hover:text-foreground",
                )}
              >
                {rate.toFixed(2)}×
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Button
            size="lg"
            className="rounded-full"
            disabled={!speech.supported}
            onClick={() => {
              if (playing) speech.pause();
              else if (speech.paused) speech.resume();
              else speech.play(0);
            }}
          >
            {playing ? (
              <>
                <Pause className="h-4 w-4" /> Tạm dừng
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> {speech.paused ? "Tiếp tục" : "Phát phiên"}
              </>
            )}
          </Button>
          <Button variant="secondary" size="lg" onClick={speech.stop} disabled={!speech.speaking}>
            <Square className="h-4 w-4" /> Dừng
          </Button>
          <Button variant="ghost" size="lg" onClick={() => speech.play(0)} disabled={!speech.supported}>
            <RotateCcw className="h-4 w-4" /> Từ đầu
          </Button>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted">
            <Volume2 className="h-3.5 w-3.5" />
            {speech.supported ? "Giọng đọc tiếng Việt của trình duyệt" : "Trình duyệt không hỗ trợ TTS"}
          </div>
        </div>

        <div className="mt-5">
          <Progress value={active >= 0 ? active + 1 : 0} max={paragraphs.length} />
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>{active >= 0 ? `Đoạn ${active + 1}/${paragraphs.length}` : "Chưa phát"}</span>
            <span>Nhấn vào một đoạn để phát từ đó</span>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="prose-calm px-6 py-7 text-[15px]">
          {paragraphs.map((paragraph, index) => {
            const isActive = active === index;
            return (
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: active === -1 || isActive ? 1 : 0.5, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
                onClick={() => speech.play(index)}
                className={cn(
                  "cursor-pointer rounded-lg py-1 transition-colors",
                  isActive ? "text-foreground" : "text-[#c6d0de]",
                )}
              >
                {paragraph}
              </motion.p>
            );
          })}
        </div>
      </Card>
    </div>
  );
}