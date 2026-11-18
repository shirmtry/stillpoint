"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Sparkles, Timer } from "lucide-react";
import { Badge, Button, Card, CardDescription, CardTitle, Input, Label } from "@/components/ui";
import {
  LAYER_IDS,
  LAYER_META,
  heuristicSoundscape,
  type LayerId,
  type LayerLevels,
  type SoundscapeSpec,
} from "@/lib/soundscape";
import { cn } from "@/lib/utils";

const PRESETS = [
  "Mưa đêm Hà Nội, gió nhẹ ngoài cửa sổ",
  "Rừng thông sương sớm, không gian tối",
  "Lửa trại và tiếng sóng biển xa",
  "Tone trầm cho deep work, rất nhẹ",
];

const TIMERS = [0, 15, 30, 45];

interface LayerNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export function SoundscapeStudio() {
  const [prompt, setPrompt] = useState(PRESETS[0] ?? "");
  const [spec, setSpec] = useState<SoundscapeSpec>(() => heuristicSoundscape(PRESETS[0] ?? "mưa đêm"));
  const [levels, setLevels] = useState<LayerLevels>(() => heuristicSoundscape(PRESETS[0] ?? "mưa đêm").layers);
  const [master, setMaster] = useState(0.75);
  const [brightness, setBrightness] = useState(spec.filterHz);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [remaining, setRemaining] = useState<number | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const buffersRef = useRef<Partial<Record<LayerId, AudioBuffer>>>({});
  const nodesRef = useRef<Partial<Record<LayerId, LayerNode>>>({});
  const levelsRef = useRef<LayerLevels>(levels);

  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  const ensureGraph = useCallback((): { ctx: AudioContext; filter: BiquadFilterNode; masterNode: GainNode } | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AudioCtor = window.AudioContext;
      if (!AudioCtor) return null;
      const ctx = new AudioCtor();
      const masterNode = ctx.createGain();
      masterNode.gain.value = 0.75;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3200;
      filter.Q.value = 0.5;
      masterNode.connect(filter);
      filter.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = masterNode;
      filterRef.current = filter;
    }
    return { ctx: ctxRef.current, filter: filterRef.current!, masterNode: masterRef.current! };
  }, []);

  const stopPlayback = useCallback(() => {
    for (const id of LAYER_IDS) {
      const node = nodesRef.current[id];
      if (!node) continue;
      try {
        node.source.stop();
      } catch {
        // already stopped
      }
      node.source.disconnect();
      node.gain.disconnect();
      delete nodesRef.current[id];
    }
    setPlaying(false);
    setRemaining(null);
  }, []);

  const startPlayback = useCallback(async () => {
    setError("");
    const graph = ensureGraph();
    if (!graph) {
      setError("Trình duyệt không hỗ trợ Web Audio.");
      return;
    }
    const { ctx, filter } = graph;
    try {
      await ctx.resume();
    } catch {
      // Safari can reject resume without a gesture; the click should cover it
    }
    const activeLayers = LAYER_IDS.filter((id) => levelsRef.current[id] > 0.02);
    if (activeLayers.length === 0) {
      setError("Bật ít nhất một lớp âm thanh trước khi phát.");
      return;
    }
    filter.frequency.setTargetAtTime(brightness, ctx.currentTime, 0.15);

    for (const id of activeLayers) {
      let buffer = buffersRef.current[id];
      if (!buffer) {
        const response = await fetch(LAYER_META[id].file);
        if (!response.ok) {
          setError(`Không tải được lớp “${LAYER_META[id].label}”. Chạy script tạo audio rồi thử lại.`);
          continue;
        }
        const bytes = await response.arrayBuffer();
        try {
          buffer = await ctx.decodeAudioData(bytes);
        } catch {
          setError(`File âm thanh “${LAYER_META[id].label}” không hợp lệ.`);
          continue;
        }
        buffersRef.current[id] = buffer;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(filter);
      source.start();
      gain.gain.setTargetAtTime(levelsRef.current[id] * 0.9, ctx.currentTime, 0.2);
      nodesRef.current[id] = { source, gain };
    }
    setPlaying(true);
    if (timerMinutes > 0) setRemaining(timerMinutes * 60);
  }, [brightness, ensureGraph, timerMinutes]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (const id of LAYER_IDS) {
      const node = nodesRef.current[id];
      if (node) node.gain.gain.setTargetAtTime(levels[id] * 0.9, ctx.currentTime, 0.1);
    }
  }, [levels]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx && filterRef.current) {
      filterRef.current.frequency.setTargetAtTime(brightness, ctx.currentTime, 0.1);
    }
  }, [brightness]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx && masterRef.current) {
      masterRef.current.gain.setTargetAtTime(master, ctx.currentTime, 0.08);
    }
  }, [master]);

  useEffect(() => {
    if (!playing || timerMinutes <= 0) {
      setRemaining(null);
      return;
    }
    setRemaining(timerMinutes * 60);
    const interval = setInterval(() => {
      setRemaining((previous) => {
        if (previous === null) return null;
        if (previous <= 1) {
          stopPlayback();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, timerMinutes, stopPlayback]);

  useEffect(() => {
    return () => {
      for (const id of LAYER_IDS) {
        const node = nodesRef.current[id];
        if (node) {
          try {
            node.source.stop();
          } catch {
            // ignore
          }
        }
      }
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  async function generate() {
    if (prompt.trim().length < 3) return;
    setLoading(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/ai/soundscape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = (await response.json().catch(() => null)) as
        | { spec?: SoundscapeSpec; notice?: string; message?: string }
        | null;
      if (!response.ok || !data?.spec) {
        setError(data?.message ?? "Không tạo được soundscape.");
        return;
      }
      if (playing) stopPlayback();
      setSpec(data.spec);
      setLevels(data.spec.layers);
      setBrightness(data.spec.filterHz);
      if (data.notice) setNotice(data.notice);
      else setNotice("Bản trộn đã sẵn sàng. Bấm Phát để nghe.");
    } catch {
      setError("Mất kết nối tới máy chủ. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Mô tả không gian âm thanh</CardTitle>
        <CardDescription>
          Một câu cũng đủ. AI chọn tỉ lệ giữa các lớp; toàn bộ quá trình trộn diễn ra trên máy bạn.
        </CardDescription>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={prompt}
            maxLength={300}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void generate();
            }}
            placeholder="Ví dụ: mưa nhẹ trên mái tôn, gió núi xa"
          />
          <Button onClick={() => void generate()} disabled={loading || prompt.trim().length < 3}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Tạo bản trộn
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setPrompt(preset)}
              className="rounded-full border border-border px-3 py-1 text-[11px] text-muted transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {preset}
            </button>
          ))}
        </div>
        {notice ? <p className="mt-3 text-[11px] text-primary/90">{notice}</p> : null}
        {error ? <p className="mt-3 text-[11px] text-rose-300">{error}</p> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{spec.name}</CardTitle>
              <CardDescription>{spec.description}</CardDescription>
            </div>
            <Badge tone={spec.source === "ai" ? "accent" : "neutral"}>
              {spec.source === "ai" ? "AI phối" : "Ngoại tuyến"}
            </Badge>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <Button
              onClick={() => (playing ? stopPlayback() : void startPlayback())}
              className="h-12 w-12 rounded-full p-0"
              aria-label={playing ? "Dừng" : "Phát"}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div>
              <p className="text-sm font-medium">{playing ? "Đang phát" : "Sẵn sàng"}</p>
              <p className="text-[11px] text-muted">
                {playing && remaining !== null
                  ? `Tự dừng sau ${formatRemaining(remaining)}`
                  : "Tai nghe giúp tách khỏi tiếng ồn văn phòng."}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Timer className="h-3.5 w-3.5 text-muted" />
              {TIMERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTimerMinutes(value)}
                  className={cn(
                    "rounded-full border px-2 py-1 text-[11px]",
                    timerMinutes === value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted",
                  )}
                >
                  {value === 0 ? "∞" : `${value}m`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {LAYER_IDS.map((id) => (
              <div key={id}>
                <div className="flex items-center justify-between text-xs">
                  <span className={levels[id] > 0.02 ? "text-foreground" : "text-muted"}>
                    {LAYER_META[id].label}
                    <span className="ml-2 text-[10px] text-muted/80">{LAYER_META[id].hint}</span>
                  </span>
                  <span className="tabular-nums text-muted">{Math.round(levels[id] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={levels[id]}
                  onChange={(event) =>
                    setLevels((previous) => ({ ...previous, [id]: Number(event.target.value) }))
                  }
                  className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#7dd3c0]"
                  aria-label={`Âm lượng ${LAYER_META[id].label}`}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Cân chỉnh</CardTitle>
          <CardDescription>Thay đổi nhỏ cũng tạo khác biệt khi nghe lâu.</CardDescription>

          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs">
                <Label className="mb-0">Âm lượng tổng</Label>
                <span className="tabular-nums text-muted">{Math.round(master * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={master}
                onChange={(event) => setMaster(Number(event.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#7dd3c0]"
                aria-label="Âm lượng tổng"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <Label className="mb-0">Độ sáng (low-pass)</Label>
                <span className="tabular-nums text-muted">{Math.round(brightness)} Hz</span>
              </div>
              <input
                type="range"
                min={400}
                max={8000}
                step={100}
                value={brightness}
                onChange={(event) => setBrightness(Number(event.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#7dd3c0]"
                aria-label="Độ sáng"
              />
              <p className="mt-1.5 text-[11px] text-muted">Thấp = tối và ấm. Cao = rõ và nhiều chi tiết.</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-black/20 p-3 text-[11px] leading-relaxed text-muted">
              Nhịp gợi ý cho phiên này: <span className="text-foreground">{spec.pulseBpm} BPM</span>. Các lớp
              được trộn bằng Web Audio và loop cục bộ — PWA cache sẵn để dùng offline.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}