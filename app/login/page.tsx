import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, HeartPulse, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { config } from "@/lib/config";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[-10%] h-[380px] w-[380px] rounded-full bg-primary/12 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[6%] h-[320px] w-[320px] rounded-full bg-[var(--accent-2)]/12 blur-[120px]" />
      </div>

      <header className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <HeartPulse className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">StillPoint</span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Về trang chủ
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="hidden lg:block">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Chào mừng trở lại.
            <br />
            Não bạn đã chờ đủ lâu rồi.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            Đăng nhập để tiếp tục phiên dang dở, xem lại lịch sử, hoặc chỉ đơn giản là ngồi xuống và thở năm
            phút.
          </p>
          <div className="mt-8 space-y-3 text-sm text-muted">
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> JWT session, dữ liệu tách riêng theo tài khoản.
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> 3 phiên AI miễn phí mỗi ngày, không cần thẻ.
            </p>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Đăng nhập</h2>
          <p className="mt-1 text-sm text-muted">Không mật khẩu. Chỉ một cú nhấp hoặc một email.</p>
          <div className="mt-6">
            <LoginForm
              providers={{
                google: Boolean(config.google.id && config.google.secret),
                resend: Boolean(config.resend.key),
                demo: config.demoMode,
              }}
            />
          </div>
          <p className="mt-6 text-[11px] leading-relaxed text-muted">
            Bằng việc tiếp tục, bạn đồng ý rằng StillPoint là công cụ tự chăm sóc, không phải dịch vụ y tế.
          </p>
        </Card>
      </main>
    </div>
  );
}