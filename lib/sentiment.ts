import type { RitualKind, Sentiment } from "./types";
import { clamp, stripMarks } from "./utils";

const POSITIVE = [
  "vui",
  "hanh phuc",
  "tu hao",
  "nhe nhom",
  "biet on",
  "on",
  "tot",
  "thanh cong",
  "hai long",
  "phan khich",
  "binh tinh",
  "thu gian",
  "hung khoi",
  "xong viec",
  "de chiu",
  "ro rang",
  "manh me",
  "hy vong",
  "happy",
  "calm",
  "grateful",
  "proud",
  "relieved",
  "good",
  "great",
  "excited",
  "content",
  "peaceful",
  "productive",
  "hopeful",
];

const NEGATIVE = [
  "met",
  "kiet suc",
  "cang thang",
  "lo lang",
  "buc",
  "tuc",
  "buon",
  "chan",
  "trong rong",
  "qua tai",
  "burnout",
  "stress",
  "anxious",
  "overwhelmed",
  "sad",
  "angry",
  "tired",
  "exhausted",
  "frustrated",
  "worried",
  "lon xon",
  "mat tap trung",
  "khong ngu",
  "co don",
  "nang ne",
  "te",
  "toi te",
];

const INTENSIFIERS = ["rat", "cuc", "qua", "vo cung", "extremely", "really", "so "];

export interface SentimentResult {
  sentiment: Sentiment;
  score: number;
  positiveHits: number;
  negativeHits: number;
}

export function analyzeSentiment(text: string): SentimentResult {
  const normalized = ` ${stripMarks(text)} `;
  let positiveHits = 0;
  let negativeHits = 0;
  for (const word of POSITIVE) {
    if (normalized.includes(` ${word}`) || normalized.includes(`${word} `)) positiveHits += 1;
  }
  for (const word of NEGATIVE) {
    if (normalized.includes(` ${word}`) || normalized.includes(`${word} `)) negativeHits += 1;
  }
  const intensified = INTENSIFIERS.some((word) => normalized.includes(word)) ? 1.35 : 1;
  const raw = (positiveHits - negativeHits) * 0.6 * intensified;
  const score = Math.round(clamp(Math.tanh(raw / 2), -1, 1) * 100) / 100;
  const sentiment: Sentiment = score >= 0.3 ? "positive" : score <= -0.3 ? "negative" : "neutral";
  return { sentiment, score, positiveHits, negativeHits };
}

export function ritualKindFor(sentiment: Sentiment): RitualKind {
  if (sentiment === "negative") return "breathing";
  if (sentiment === "positive") return "story";
  return "meditation";
}

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Tích cực",
  neutral: "Trung tính",
  negative: "Nặng nề",
  crisis: "Cần hỗ trợ",
};