import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Headphones,
  PenLine,
  Sparkles,
  Timer,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { getUsage } from "@/lib/usage";
import { formatDateVi, formatTimeVi } from "@/lib/utils";
import { FREE_DAILY_SESSIONS, SESSION_KIND_LABEL, type SessionKind } from "@/lib/types";
import { Badge, Button, Card, CardDescription, CardTitle, Progress } from "@/components/ui";
import { MoodPicker } from "@/components/mood-picker";
import { MoodChart, type MoodPoint } from "@/components/mood-chart";
import { BillingActions } from "@/components/billing-actions";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan" };

const KIND_TONE: Record<SessionKind, "accent" | "violet" | "warn"> = {
  calm: "accent",
  focus: "violet",
  winddown: "warn",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function toChartData(moods: Array<{ createdAt: Date; mood: number }>): MoodPoint[] {
  const byDay = new Map<string, { sum: number; count: number }>();
  for (const log of moods) {
    const day = log.createdAt.toISOString().slice(0, 10);
    const current = byDay.get(day) ?? { sum: 0, count: 0 };
    current.sum += log.mood;
    current.count += 1;
    byDay.set(day, current);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => {
      const [, month = "", date = ""] = day.split("-");
      return {
        label: `${date}/${month}`,
        full: day,
        mood: Math.round((value.sum / Math.max(1, value.count)) * 10) / 10,
      };
    });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = await searchParams;

  const store = getStore();
  let profile = await store.getUser(session.user.id);
  if (!profile && session.user.email) {
    profile = await store.ensureUser({
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    });
  }
  const plan = profile?.plan ?? session.user.plan;
  const userId = session.user.id;

  const [usage, moods, recentSessions, subscription] = await Promise.all([
    getUsage(store, userId, plan),
    store.listMoods(userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    store.listSessions(userId, 6),
    plan === "pro" ? store.getSubscription(userId) : Promise.resolve(null),
  ]);

  const chartData = toChartData(moods);
  const firstName = (profile?.name ?? session.user.name ?? "").split(" ")[0] || "bạn";
  const billingEnabled = Boolean(config.stripe.secretKey && config.stripe.priceMonthly);

  return (
    <div className="space-y-6">
      {params.success ? (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/[0.07] p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-primary">Thanh toán thành công</p>
            <p className="mt-0.5 text-muted">
              Gói Pro sẽ được kích hoạt ngay khi Stripe gửi webhook xác nhận (thường dưới 10 giây). Tải lại trang
              nếu chưa thấy thay đổi.
            </p>
          </div>
        </div>
      ) : null}
      {params.canceled ? (
        <div className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm text-muted">
          Bạn đã huỷ thanh toán. Không có khoản nào bị trừ.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Tổng quan</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1.5 text-sm text-muted">Hôm nay bạn muốn reset ở đâu?</p>
        </div>
        <Link href="/session/new">
          <Button>
            <Sparkles className="h-4 w-4" /> Bắt đầu phiên mới
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Phiên hôm nay</CardTitle>
            <Badge tone={plan === "pro" ? "violet" : "accent"}>{plan === "pro" ? "Pro" : "Free"}</Badge>
          </div>
          {plan === "pro" ? (
            <>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{usage.used}</p>
              <p className="mt-1 text-xs text-muted">phiên hôm nay · không giới hạn</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {usage.used}
                <span className="text-base font-normal text-muted"> / {FREE_DAILY_SESSIONS}</span>
              </p>
              <Progress value={usage.used} max={FREE_DAILY_SESSIONS} className="mt-3" />
              <p className="mt-2 text-xs text-muted">
                {usage.remaining === 0
                  ? "Đã dùng hết hôm nay — làm mới sau 0h UTC."
                  : `Còn ${usage.remaining} phiên miễn phí.`}
              </p>
            </>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Gói của bạn</CardTitle>
            {plan === "pro" ? (
              <BadgeCheck className="h-4 w-4 text-violet-300" />
            ) : (
              <Timer className="h-4 w-4 text-muted" />
            )}
          </div>
          <p className="mt-4 text-lg font-semibold">{plan === "pro" ? "StillPoint Pro" : "StillPoint Free"}</p>
          <p className="mt-1 text-xs text-muted">
            {plan === "pro"
              ? subscription
                ? `Trạng thái: ${subscription.status}${
                    subscription.currentPeriodEnd
                      ? ` · gia hạn ${formatDateVi(subscription.currentPeriodEnd)}`
                      : ""
                  }`
                : "Pro đang hoạt động."
              : `${FREE_DAILY_SESSIONS} phiên AI mỗi ngày, đầy đủ Studio và Nhật ký.`}
          </p>
          <div className="mt-4">
            <BillingActions
              plan={plan}
              hasCustomer={Boolean(profile?.stripeCustomerId)}
              enabled={billingEnabled}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Check-in nhanh</CardTitle>
          <CardDescription>Không cần đúng. Chỉ cần thành thật một chút.</CardDescription>
          <div className="mt-4">
            <MoodPicker initial={moods.at(-1)?.mood ?? null} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tâm trạng 30 ngày</CardTitle>
              <CardDescription>Trung bình theo ngày, thang 1–5.</CardDescription>
            </div>
            <CalendarDays className="h-4 w-4 text-muted" />
          </div>
          <div className="mt-4">
            {chartData.length >= 2 ? (
              <MoodChart data={chartData} />
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
                <p className="text-sm text-muted">Cần ít nhất 2 ngày dữ liệu để thấy xu hướng.</p>
                <p className="mt-1 text-xs text-muted/70">Check-in hôm nay và ngày mai nhé.</p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="flex flex-col justify-between">
            <div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Headphones className="h-4 w-4" />
              </span>
              <CardTitle className="mt-3">Studio âm thanh</CardTitle>
              <CardDescription>
                Trộn mưa, gió, lửa, sóng ngay trên máy. Không gọi AI, không tốn lượt.
              </CardDescription>
            </div>
            <Link href="/studio" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              Mở Studio <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
          <Card className="flex flex-col justify-between">
            <div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                <PenLine className="h-4 w-4" />
              </span>
              <CardTitle className="mt-3">Nhật ký tối nay</CardTitle>
              <CardDescription>Viết vài dòng, nhận một nghi thức thả lỏng được viết riêng.</CardDescription>
            </div>
            <Link href="/journal" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              Viết nhật ký <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Phiên gần đây</CardTitle>
            <CardDescription>Nghe lại bằng giọng đọc tiếng Việt của trình duyệt.</CardDescription>
          </div>
          <Link href="/session/new" className="text-xs text-muted hover:text-foreground">
            Tạo mới
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted">Chưa có phiên nào. Bắt đầu bằng một phiên 3 phút.</p>
            <Link href="/session/new" className="mt-3">
              <Button size="sm" variant="secondary">
                <Sparkles className="h-4 w-4" /> Tạo phiên đầu tiên
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/70">
            {recentSessions.map((item) => {
              const preview = item.content
                ? item.content.replace(/\s+/g, " ").trim().slice(0, 120)
                : "Chưa có nội dung (phiên bị gián đoạn hoặc đang tạo).";
              return (
                <li key={item.id}>
                  <Link
                    href={`/session/${item.id}`}
                    className="group flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={KIND_TONE[item.kind]}>{SESSION_KIND_LABEL[item.kind]}</Badge>
                        <span className="truncate text-sm font-medium">{item.title}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">{preview}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                      <span>
                        {formatDateVi(item.createdAt)} · {formatTimeVi(item.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" /> {Math.round(item.durationSec / 60)} phút
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}