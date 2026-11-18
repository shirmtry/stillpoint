import Link from "next/link";
import { ArrowRight, AudioLines, HeartPulse, MoonStar, ShieldCheck, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { Badge, Button, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Phiên thiền viết riêng cho bạn",
    body: "Chọn 3–5 phút và một mục tiêu. AI viết lời thoại đúng ngữ cảnh và phát trực tiếp từng câu — không phải video có sẵn.",
  },
  {
    icon: AudioLines,
    title: "Soundscape từ một câu mô tả",
    body: "Gõ “mưa trên mái tôn, gió núi”. Studio trộn các lớp âm thanh ngay trên máy bằng Web Audio — không tải gì lên mạng.",
  },
  {
    icon: MoonStar,
    title: "Nhật ký tự tạo nghi thức",
    body: "Viết vài dòng cuối ngày. StillPoint đọc tâm trạng và tạo một nghi thức: bài thở, thiền ngắn, hay một câu chuyện để ngủ.",
  },
];

const STEPS = [
  { n: "01", title: "Đăng nhập", body: "Google hoặc email magic link. Không mật khẩu, không phiền." },
  { n: "02", title: "Chọn một phiên", body: "3–15 phút, có hoặc không có tai nghe. AI lo phần lời." },
  { n: "03", title: "Quay lại việc", body: "Ngắn, đủ, và có thể lặp lại mỗi ngày — kể cả trong giờ làm." },
];

export default async function LandingPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[-18%] h-[420px] w-[420px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute right-[-8%] top-[6%] h-[360px] w-[360px] rounded-full bg-[var(--accent-2)]/15 blur-[120px]" />
      </div>

      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <HeartPulse className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">StillPoint</span>
        </Link>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard">
              <Button size="sm">
                Mở dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">
                  Bắt đầu miễn phí
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24 lg:pt-16">
        <div>
          <Badge tone="accent">
            <Sparkles className="h-3 w-3" /> AI Copilot cho sức khỏe tâm trí
          </Badge>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">
            5 phút mỗi ngày
            <br />
            để não bạn{" "}
            <span className="bg-gradient-to-r from-primary via-teal-200 to-[var(--accent-2)] bg-clip-text text-transparent">
              không bị quá tải
            </span>
            .
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            Dành cho developer, designer và những người làm việc đêm. StillPoint tạo phiên thiền, âm thanh tập
            trung và nghi thức thả lỏng riêng cho từng người — vừa đủ để reset giữa một ngày dày đặc.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={signedIn ? "/dashboard" : "/login"}>
              <Button size="lg">
                {signedIn ? "Vào phiên tiếp theo" : "Bắt đầu miễn phí"} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how">
              <Button variant="outline" size="lg">
                Xem cách hoạt động
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Không cần thẻ · 3 phiên AI miễn phí mỗi ngày · PWA chạy offline
          </p>
        </div>

        <div className="relative">
          <div className="glass glow-ring relative rounded-[2rem] p-6">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Phiên hôm nay</span>
              <Badge tone="accent">Calm · 5 phút</Badge>
            </div>
            <div className="mt-6 flex items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
                <span className="breathe absolute inset-4 rounded-full border border-primary/30" />
                <span className="absolute inset-10 rounded-full border border-primary/20" />
                <span className="text-sm text-primary/90">thở vào… 4</span>
              </div>
            </div>
            <div className="prose-calm mt-6 text-sm">
              <p>Đặt hai chân trên sàn. Để vai rơi xuống thêm một chút, như vừa đặt xuống một chiếc túi nặng.</p>
              <p className="line-clamp-2 text-muted">
                Thở vào trong bốn nhịp. Giữ nhẹ. Thở ra chậm trong sáu nhịp…
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4 text-xs text-muted">
              <span>Giọng đọc: Tiếng Việt</span>
              <span className="flex items-center gap-1.5 text-primary/90">
                <AudioLines className="h-3.5 w-3.5" /> Đang phát trực tiếp
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[15px] font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="glass rounded-[2rem] p-8 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Một vòng lặp nhỏ, lặp lại được</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            StillPoint không cố thay đổi cả cuộc sống của bạn. Nó chỉ làm cho khoảng nghỉ ngắn trở nên dễ bắt đầu
            hơn một chút — mỗi ngày.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n}>
                <span className="text-xs font-medium tracking-[0.2em] text-primary/80">{step.n}</span>
                <h3 className="mt-2 text-[15px] font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" /> AI có ngân sách, không có bất ngờ
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Mỗi lần gọi AI đều được ước tính chi phí trước và ghi lại sau. Chạm trần ngân sách, sản phẩm tự
              chuyển sang chế độ ngoại tuyến thay vì gửi hoá đơn bạn không mong đợi.
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-sm font-medium">
              <MoonStar className="h-4 w-4 text-[var(--accent-2)]" /> Không phải trị liệu
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              StillPoint là công cụ tự chăm sóc. Khi nội dung cho thấy dấu hiệu khủng hoảng, sản phẩm dừng lại
              và hướng bạn đến người thật, cấp cứu hoặc chuyên gia — không cố “huấn luyện” bạn vượt qua.
            </p>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} StillPoint. Làm cho những bộ não làm việc nhiều.</span>
          <span>Không thay thế tư vấn y tế. Nếu bạn cần giúp đỡ ngay, hãy gọi 115.</span>
        </div>
      </footer>
    </div>
  );
}