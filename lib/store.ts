import { ObjectId, type Db } from "mongodb";
import { getDb, hasMongo } from "./db";
import type {
  AiSessionDoc,
  JournalDoc,
  MoodLogDoc,
  NewJournalInput,
  NewSessionInput,
  Plan,
  RitualKind,
  Sentiment,
  SessionKind,
  SubscriptionDoc,
  UserProfile,
} from "./types";

type Raw = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asDate(value: unknown, fallback = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function asNullableDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function asPlan(value: unknown): Plan {
  return value === "pro" ? "pro" : "free";
}

function asKind(value: unknown): SessionKind {
  return value === "focus" || value === "winddown" ? value : "calm";
}

function asSentiment(value: unknown): Sentiment {
  return value === "positive" || value === "negative" || value === "crisis" ? value : "neutral";
}

function asRitualKind(value: unknown): RitualKind {
  return value === "breathing" || value === "story" || value === "support" ? value : "meditation";
}

function idOf(value: unknown): string {
  return value instanceof ObjectId ? value.toHexString() : asString(value);
}

function objectId(value: string): ObjectId | null {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function mapUser(raw: Raw): UserProfile {
  return {
    id: idOf(raw._id),
    email: asString(raw.email),
    name: asNullableString(raw.name),
    image: asNullableString(raw.image),
    plan: asPlan(raw.plan),
    stripeCustomerId: asNullableString(raw.stripeCustomerId),
    createdAt: asDate(raw.createdAt),
  };
}

function mapSession(raw: Raw): AiSessionDoc {
  return {
    id: idOf(raw._id),
    userId: asString(raw.userId),
    kind: asKind(raw.kind),
    title: asString(raw.title, "Phiên không tên"),
    prompt: asString(raw.prompt),
    content: asString(raw.content),
    durationSec: asNumber(raw.durationSec, 300),
    moodBefore: asNullableNumber(raw.moodBefore),
    model: asString(raw.model, "offline"),
    costUsd: asNumber(raw.costUsd),
    createdAt: asDate(raw.createdAt),
  };
}

function mapMood(raw: Raw): MoodLogDoc {
  return {
    id: idOf(raw._id),
    userId: asString(raw.userId),
    mood: asNumber(raw.mood, 3),
    note: asNullableString(raw.note),
    createdAt: asDate(raw.createdAt),
  };
}

function mapJournal(raw: Raw): JournalDoc {
  return {
    id: idOf(raw._id),
    userId: asString(raw.userId),
    entry: asString(raw.entry),
    sentiment: asSentiment(raw.sentiment),
    score: asNumber(raw.score),
    ritualKind: asRitualKind(raw.ritualKind),
    ritual: asString(raw.ritual),
    createdAt: asDate(raw.createdAt),
  };
}

function mapSubscription(raw: Raw): SubscriptionDoc {
  return {
    id: idOf(raw._id),
    userId: asString(raw.userId),
    stripeCustomerId: asString(raw.stripeCustomerId),
    stripeSubscriptionId: asNullableString(raw.stripeSubscriptionId),
    status: asString(raw.status, "inactive"),
    priceId: asNullableString(raw.priceId),
    currentPeriodEnd: asNullableDate(raw.currentPeriodEnd),
    updatedAt: asDate(raw.updatedAt),
  };
}

export interface UpsertSubscriptionInput {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
}

export interface Store {
  readonly kind: "mongo" | "memory";
  getUser(id: string): Promise<UserProfile | null>;
  getUserByEmail(email: string): Promise<UserProfile | null>;
  ensureUser(input: { email: string; name?: string | null; image?: string | null }): Promise<UserProfile>;
  setPlan(
    userId: string,
    plan: Plan,
    patch?: { stripeCustomerId?: string | null },
  ): Promise<void>;
  upsertSubscription(input: UpsertSubscriptionInput): Promise<void>;
  getSubscription(userId: string): Promise<SubscriptionDoc | null>;
  createSession(input: NewSessionInput): Promise<AiSessionDoc>;
  finishSession(id: string, content: string, costUsd: number): Promise<void>;
  getSession(id: string, userId: string): Promise<AiSessionDoc | null>;
  listSessions(userId: string, limit: number): Promise<AiSessionDoc[]>;
  countSessionsSince(userId: string, since: Date): Promise<number>;
  addMood(input: { userId: string; mood: number; note?: string | null }): Promise<MoodLogDoc>;
  listMoods(userId: string, since: Date): Promise<MoodLogDoc[]>;
  saveJournal(input: NewJournalInput): Promise<JournalDoc>;
  listJournals(userId: string, limit: number): Promise<JournalDoc[]>;
  getSpend(scope: string, day: string): Promise<number>;
  addSpend(scope: string, day: string, usd: number): Promise<number>;
}

class MongoStore implements Store {
  readonly kind = "mongo" as const;

  private async db(): Promise<Db> {
    return getDb();
  }

  async getUser(id: string): Promise<UserProfile | null> {
    const _id = objectId(id);
    if (!_id) return null;
    const db = await this.db();
    const raw = await db.collection("users").findOne({ _id });
    return raw ? mapUser(raw as Raw) : null;
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const db = await this.db();
    const raw = await db.collection("users").findOne({ email: email.toLowerCase() });
    return raw ? mapUser(raw as Raw) : null;
  }

  async ensureUser(input: { email: string; name?: string | null; image?: string | null }): Promise<UserProfile> {
    const db = await this.db();
    const now = new Date();
    const email = input.email.toLowerCase();
    const set: Raw = { email, updatedAt: now };
    if (input.name) set.name = input.name;
    if (input.image) set.image = input.image;
    const raw = await db.collection("users").findOneAndUpdate(
      { email },
      {
        $set: set,
        $setOnInsert: { createdAt: now, plan: "free", emailVerified: null },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!raw) throw new Error("Unable to create user");
    return mapUser(raw as Raw);
  }

  async setPlan(userId: string, plan: Plan, patch?: { stripeCustomerId?: string | null }): Promise<void> {
    const _id = objectId(userId);
    if (!_id) return;
    const db = await this.db();
    const set: Raw = { plan, updatedAt: new Date() };
    if (patch?.stripeCustomerId !== undefined) set.stripeCustomerId = patch.stripeCustomerId;
    await db.collection("users").updateOne({ _id }, { $set: set });
  }

  async upsertSubscription(input: UpsertSubscriptionInput): Promise<void> {
    const db = await this.db();
    const now = new Date();
    await db.collection("subscriptions").updateOne(
      { userId: input.userId },
      {
        $set: {
          userId: input.userId,
          stripeCustomerId: input.stripeCustomerId,
          stripeSubscriptionId: input.stripeSubscriptionId,
          status: input.status,
          priceId: input.priceId,
          currentPeriodEnd: input.currentPeriodEnd,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  async getSubscription(userId: string): Promise<SubscriptionDoc | null> {
    const db = await this.db();
    const raw = await db.collection("subscriptions").findOne({ userId });
    return raw ? mapSubscription(raw as Raw) : null;
  }

  async createSession(input: NewSessionInput): Promise<AiSessionDoc> {
    const db = await this.db();
    const doc = {
      _id: new ObjectId(),
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      prompt: input.prompt,
      content: "",
      durationSec: input.durationSec,
      moodBefore: input.moodBefore,
      model: input.model,
      costUsd: 0,
      createdAt: new Date(),
    };
    await db.collection("ai_sessions").insertOne(doc);
    return mapSession(doc as unknown as Raw);
  }

  async finishSession(id: string, content: string, costUsd: number): Promise<void> {
    const _id = objectId(id);
    if (!_id) return;
    const db = await this.db();
    await db.collection("ai_sessions").updateOne({ _id }, { $set: { content, costUsd } });
  }

  async getSession(id: string, userId: string): Promise<AiSessionDoc | null> {
    const _id = objectId(id);
    if (!_id) return null;
    const db = await this.db();
    const raw = await db.collection("ai_sessions").findOne({ _id, userId });
    return raw ? mapSession(raw as Raw) : null;
  }

  async listSessions(userId: string, limit: number): Promise<AiSessionDoc[]> {
    const db = await this.db();
    const rows = await db
      .collection("ai_sessions")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return rows.map((row) => mapSession(row as Raw));
  }

  async countSessionsSince(userId: string, since: Date): Promise<number> {
    const db = await this.db();
    return db.collection("ai_sessions").countDocuments({ userId, createdAt: { $gte: since } });
  }

  async addMood(input: { userId: string; mood: number; note?: string | null }): Promise<MoodLogDoc> {
    const db = await this.db();
    const doc = {
      _id: new ObjectId(),
      userId: input.userId,
      mood: input.mood,
      note: input.note ?? null,
      createdAt: new Date(),
    };
    await db.collection("mood_logs").insertOne(doc);
    return mapMood(doc as unknown as Raw);
  }

  async listMoods(userId: string, since: Date): Promise<MoodLogDoc[]> {
    const db = await this.db();
    const rows = await db
      .collection("mood_logs")
      .find({ userId, createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .toArray();
    return rows.map((row) => mapMood(row as Raw));
  }

  async saveJournal(input: NewJournalInput): Promise<JournalDoc> {
    const db = await this.db();
    const doc = {
      _id: new ObjectId(),
      userId: input.userId,
      entry: input.entry,
      sentiment: input.sentiment,
      score: input.score,
      ritualKind: input.ritualKind,
      ritual: input.ritual,
      createdAt: new Date(),
    };
    await db.collection("journal_entries").insertOne(doc);
    return mapJournal(doc as unknown as Raw);
  }

  async listJournals(userId: string, limit: number): Promise<JournalDoc[]> {
    const db = await this.db();
    const rows = await db
      .collection("journal_entries")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return rows.map((row) => mapJournal(row as Raw));
  }

  async getSpend(scope: string, day: string): Promise<number> {
    const db = await this.db();
    const raw = await db.collection("spend_ledger").findOne({ scope, day });
    return raw ? asNumber((raw as Raw).usd) : 0;
  }

  async addSpend(scope: string, day: string, usd: number): Promise<number> {
    const db = await this.db();
    const raw = await db.collection("spend_ledger").findOneAndUpdate(
      { scope, day },
      { $inc: { usd }, $set: { updatedAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    );
    return raw ? asNumber((raw as Raw).usd) : usd;
  }
}

interface MemoryData {
  users: UserProfile[];
  sessions: AiSessionDoc[];
  moods: MoodLogDoc[];
  journals: JournalDoc[];
  subscriptions: SubscriptionDoc[];
  spend: Map<string, number>;
}

class MemoryStore implements Store {
  readonly kind = "memory" as const;

  private data(): MemoryData {
    const g = globalThis as typeof globalThis & { __stillpointMemory?: MemoryData };
    if (!g.__stillpointMemory) {
      g.__stillpointMemory = {
        users: [],
        sessions: [],
        moods: [],
        journals: [],
        subscriptions: [],
        spend: new Map<string, number>(),
      };
    }
    return g.__stillpointMemory;
  }

  async getUser(id: string): Promise<UserProfile | null> {
    return this.data().users.find((user) => user.id === id) ?? null;
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const needle = email.toLowerCase();
    return this.data().users.find((user) => user.email.toLowerCase() === needle) ?? null;
  }

  async ensureUser(input: { email: string; name?: string | null; image?: string | null }): Promise<UserProfile> {
    const existing = await this.getUserByEmail(input.email);
    if (existing) {
      if (input.name) existing.name = input.name;
      if (input.image) existing.image = input.image;
      return existing;
    }
    const user: UserProfile = {
      id: new ObjectId().toHexString(),
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      image: input.image ?? null,
      plan: "free",
      stripeCustomerId: null,
      createdAt: new Date(),
    };
    this.data().users.push(user);
    return user;
  }

  async setPlan(userId: string, plan: Plan, patch?: { stripeCustomerId?: string | null }): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    user.plan = plan;
    if (patch?.stripeCustomerId !== undefined) user.stripeCustomerId = patch.stripeCustomerId;
  }

  async upsertSubscription(input: UpsertSubscriptionInput): Promise<void> {
    const data = this.data();
    const existing = data.subscriptions.find((sub) => sub.userId === input.userId);
    const next: SubscriptionDoc = {
      id: existing?.id ?? new ObjectId().toHexString(),
      userId: input.userId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      status: input.status,
      priceId: input.priceId,
      currentPeriodEnd: input.currentPeriodEnd,
      updatedAt: new Date(),
    };
    data.subscriptions = data.subscriptions.filter((sub) => sub.userId !== input.userId);
    data.subscriptions.push(next);
  }

  async getSubscription(userId: string): Promise<SubscriptionDoc | null> {
    return this.data().subscriptions.find((sub) => sub.userId === userId) ?? null;
  }

  async createSession(input: NewSessionInput): Promise<AiSessionDoc> {
    const doc: AiSessionDoc = {
      id: new ObjectId().toHexString(),
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      prompt: input.prompt,
      content: "",
      durationSec: input.durationSec,
      moodBefore: input.moodBefore,
      model: input.model,
      costUsd: 0,
      createdAt: new Date(),
    };
    this.data().sessions.push(doc);
    return doc;
  }

  async finishSession(id: string, content: string, costUsd: number): Promise<void> {
    const session = this.data().sessions.find((item) => item.id === id);
    if (!session) return;
    session.content = content;
    session.costUsd = costUsd;
  }

  async getSession(id: string, userId: string): Promise<AiSessionDoc | null> {
    return this.data().sessions.find((item) => item.id === id && item.userId === userId) ?? null;
  }

  async listSessions(userId: string, limit: number): Promise<AiSessionDoc[]> {
    return this.data()
      .sessions.filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async countSessionsSince(userId: string, since: Date): Promise<number> {
    return this.data().sessions.filter((item) => item.userId === userId && item.createdAt >= since).length;
  }

  async addMood(input: { userId: string; mood: number; note?: string | null }): Promise<MoodLogDoc> {
    const doc: MoodLogDoc = {
      id: new ObjectId().toHexString(),
      userId: input.userId,
      mood: input.mood,
      note: input.note ?? null,
      createdAt: new Date(),
    };
    this.data().moods.push(doc);
    return doc;
  }

  async listMoods(userId: string, since: Date): Promise<MoodLogDoc[]> {
    return this.data()
      .moods.filter((item) => item.userId === userId && item.createdAt >= since)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async saveJournal(input: NewJournalInput): Promise<JournalDoc> {
    const doc: JournalDoc = {
      id: new ObjectId().toHexString(),
      userId: input.userId,
      entry: input.entry,
      sentiment: input.sentiment,
      score: input.score,
      ritualKind: input.ritualKind,
      ritual: input.ritual,
      createdAt: new Date(),
    };
    this.data().journals.push(doc);
    return doc;
  }

  async listJournals(userId: string, limit: number): Promise<JournalDoc[]> {
    return this.data()
      .journals.filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getSpend(scope: string, day: string): Promise<number> {
    return this.data().spend.get(`${scope}:${day}`) ?? 0;
  }

  async addSpend(scope: string, day: string, usd: number): Promise<number> {
    const key = `${scope}:${day}`;
    const next = (this.data().spend.get(key) ?? 0) + usd;
    this.data().spend.set(key, next);
    return next;
  }
}

export function getStore(): Store {
  const g = globalThis as typeof globalThis & { __stillpointStore?: Store };
  if (!g.__stillpointStore) {
    g.__stillpointStore = hasMongo() ? new MongoStore() : new MemoryStore();
  }
  return g.__stillpointStore;
}