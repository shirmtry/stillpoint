export type Plan = "free" | "pro";

export type SessionKind = "calm" | "focus" | "winddown";

export type Sentiment = "positive" | "neutral" | "negative" | "crisis";

export type RitualKind = "breathing" | "meditation" | "story" | "support";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: Plan;
  stripeCustomerId: string | null;
  createdAt: Date;
}

export interface AiSessionDoc {
  id: string;
  userId: string;
  kind: SessionKind;
  title: string;
  prompt: string;
  content: string;
  durationSec: number;
  moodBefore: number | null;
  model: string;
  costUsd: number;
  createdAt: Date;
}

export interface NewSessionInput {
  userId: string;
  kind: SessionKind;
  title: string;
  prompt: string;
  durationSec: number;
  moodBefore: number | null;
  model: string;
}

export interface MoodLogDoc {
  id: string;
  userId: string;
  mood: number;
  note: string | null;
  createdAt: Date;
}

export interface SubscriptionDoc {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
  updatedAt: Date;
}

export interface JournalDoc {
  id: string;
  userId: string;
  entry: string;
  sentiment: Sentiment;
  score: number;
  ritualKind: RitualKind;
  ritual: string;
  createdAt: Date;
}

export interface NewJournalInput {
  userId: string;
  entry: string;
  sentiment: Sentiment;
  score: number;
  ritualKind: RitualKind;
  ritual: string;
}

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  calm: "Hạ nhiệt",
  focus: "Vào guồng",
  winddown: "Thả lỏng",
};

export const SESSION_KIND_HINT: Record<SessionKind, string> = {
  calm: "Dừng lại 5 phút, hạ nhịp thở, rũ bỏ căng thẳng.",
  focus: "Một phiên ngắn để não chuyển sang chế độ deep work.",
  winddown: "Kết thúc ngày làm việc, đưa hệ thần kinh về trạng thái nghỉ.",
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
};

export const FREE_DAILY_SESSIONS = 3;