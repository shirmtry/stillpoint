import { clamp, stripMarks } from "./utils";

export const LAYER_IDS = ["rain", "wind", "fire", "waves", "drone"] as const;
export type LayerId = (typeof LAYER_IDS)[number];
export type LayerLevels = Record<LayerId, number>;

export const LAYER_META: Record<LayerId, { label: string; hint: string; file: string }> = {
  rain: { label: "Mưa", hint: "trắng và đều, che tiếng ồn văn phòng", file: "/audio/rain.mp3" },
  wind: { label: "Gió", hint: "rừng núi, chậm và rộng", file: "/audio/wind.mp3" },
  fire: { label: "Lửa", hint: "lách tách ấm, nhịp nhanh nhẹ", file: "/audio/fire.mp3" },
  waves: { label: "Sóng", hint: "biển lên xuống, đều như hơi thở", file: "/audio/waves.mp3" },
  drone: { label: "Nền", hint: "tone trầm giữ không gian", file: "/audio/drone.mp3" },
};

export interface SoundscapeSpec {
  name: string;
  description: string;
  layers: LayerLevels;
  filterHz: number;
  pulseBpm: number;
  source: "ai" | "heuristic";
}

const EMPTY: LayerLevels = { rain: 0, wind: 0, fire: 0, waves: 0, drone: 0 };

function keywordHit(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function heuristicSoundscape(prompt: string): SoundscapeSpec {
  const text = stripMarks(prompt);
  const layers: LayerLevels = { ...EMPTY };

  if (keywordHit(text, ["mua", "rain", "giong", "storm", "thac", "waterfall"])) layers.rain = 0.62;
  if (keywordHit(text, ["gio", "wind", "breeze", "rung", "forest", "nui", "mountain"])) layers.wind = 0.48;
  if (keywordHit(text, ["lua", "fire", "trai", "campfire", "lo sua", "fireplace"])) layers.fire = 0.5;
  if (keywordHit(text, ["song", "bien", "wave", "ocean", "beach", "bien dong"])) layers.waves = 0.58;
  if (keywordHit(text, ["toi", "night", "dem", "sau", "deep", "space", "khong gian", "thien", "meditat", "focus", "tap trung", "van"])) layers.drone = 0.42;

  const active = LAYER_IDS.filter((id) => layers[id] > 0);
  if (active.length < 2) {
    if (layers.rain === 0) layers.rain = 0.5;
    if (layers.drone === 0) layers.drone = 0.38;
    layers.wind = layers.wind || 0.22;
  }

  const soft = keywordHit(text, ["nhe", "soft", "diu", "calm", "em", "ru ngu"]);
  const bright = keywordHit(text, ["sang", "bright", "crisp", "ro", "tach", "tinh tao"]);
  const fast = keywordHit(text, ["nhanh", "fast", "sprint", "gap", "deadline"]);

  const description = prompt.trim() || "Một không gian âm thanh tĩnh tại.";
  const name = prompt.trim() ? prompt.trim().split(/\s+/).slice(0, 5).join(" ") : "Không gian tĩnh";

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    description,
    layers,
    filterHz: soft ? 1400 : bright ? 6200 : 3200,
    pulseBpm: fast ? 92 : soft ? 52 : 64,
    source: "heuristic",
  };
}

function asLevel(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, 0, 1) : 0;
}

/**
 * Normalizes an AI response into a safe spec. Anything invalid falls back to
 * the deterministic heuristic so the studio always works.
 */
export function normalizeSoundscape(raw: unknown, prompt: string): SoundscapeSpec {
  const fallback = heuristicSoundscape(prompt);
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const rawLayers = record.layers;
  if (!rawLayers || typeof rawLayers !== "object") return fallback;
  const layerRecord = rawLayers as Record<string, unknown>;
  const layers: LayerLevels = {
    rain: asLevel(layerRecord.rain),
    wind: asLevel(layerRecord.wind),
    fire: asLevel(layerRecord.fire),
    waves: asLevel(layerRecord.waves),
    drone: asLevel(layerRecord.drone),
  };
  const activeCount = LAYER_IDS.filter((id) => layers[id] > 0.04).length;
  if (activeCount < 2) return fallback;

  const filterHz = typeof record.filterHz === "number" ? clamp(record.filterHz, 400, 8000) : fallback.filterHz;
  const pulseBpm = typeof record.pulseBpm === "number" ? clamp(record.pulseBpm, 40, 110) : fallback.pulseBpm;
  const name = typeof record.name === "string" && record.name.trim() ? record.name.trim().slice(0, 60) : fallback.name;
  const description =
    typeof record.description === "string" && record.description.trim()
      ? record.description.trim().slice(0, 180)
      : fallback.description;

  return { name, description, layers, filterHz, pulseBpm, source: "ai" };
}