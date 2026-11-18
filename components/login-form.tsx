"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Loader2, Mail, UserRound } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

export interface LoginProviderFlags {
  google: boolean;
  resend: boolean;
  demo: boolean;
}

type MailStatus = "idle" | "sending" | "sent" | "error";

export function LoginForm({ providers }: { providers: LoginProviderFlags }) {
  const [email, setEmail] = useState("");
  const [mailStatus, setMailStatus] = useState<MailStatus>("idle");
  const [mailError, setMailError] = useState("");
  const [busy, setBusy] = useState<"google" | "demo" | null>(null);

  const anyProvider = providers.google || providers.resend || providers.demo;

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setMailStatus("sending");
    setMailError("");
    try {
      const result = await signIn("resend", {
        email: email.trim(),
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (result?.error) {
        setMailStatus("error");
        setMailError("Không gửi được link. Kiểm tra lại email hoặc thử Google.");
      } else {
        setMailStatus("sent");
      }
    } catch {
      setMailStatus("error");
      setMailError("Không kết nối được dịch vụ đăng nhập. Thử lại sau.");
    }
  }

  return (
    <div className="space-y-6">
      {providers.google ? (
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy !== null}
          onClick={() => {
            setBusy("google");
            void signIn("google", { callbackUrl: "/dashboard" });
          }}
        >
          {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
          Tiếp tục với Google
        </Button>
      ) : null}

      {providers.google && providers.resend ? (
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="hairline flex-1" />
          hoặc
          <span className="hairline flex-1" />
        </div>
      ) : null}

      {providers.resend ? (
        mailStatus === "sent" ? (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-relaxed">
            <p className="flex items-center gap-2 font-medium text-primary">
              <Mail className="h-4 w-4" /> Kiểm tra hộp thư của bạn
            </p>
            <p className="mt-1.5 text-muted">
              Mình đã gửi một link đăng nhập tới <span className="text-foreground">{email}</span>. Link dùng
              một lần và hết hạn sau 24 giờ.
            </p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div>
              <Label htmlFor="email">Email magic link</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="ban@congty.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={mailStatus === "sending"}>
              {mailStatus === "sending" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Gửi link đăng nhập
            </Button>
            {mailStatus === "error" ? <p className="text-xs text-rose-300">{mailError}</p> : null}
          </form>
        )
      ) : null}

      {providers.demo ? (
        <div className="rounded-xl border border-dashed border-border bg-black/20 p-4">
          <p className="text-xs leading-relaxed text-muted">
            Chế độ demo cục bộ: đăng nhập một chạm, dữ liệu lưu ở tầng lưu trữ đang cấu hình (MongoDB hoặc bộ
            nhớ tạm).
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            disabled={busy !== null}
            onClick={() => {
              setBusy("demo");
              void signIn("demo", { callbackUrl: "/dashboard" });
            }}
          >
            {busy === "demo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            Vào bằng tài khoản demo
          </Button>
        </div>
      ) : null}

      {!anyProvider ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm leading-relaxed text-amber-200">
          Chưa cấu hình nhà cung cấp đăng nhập. Thêm <code className="text-amber-100">GOOGLE_CLIENT_ID</code>,
          <code className="text-amber-100">AUTH_RESEND_KEY</code>, hoặc bật{" "}
          <code className="text-amber-100">DEMO_MODE=true</code> trong <code>.env.local</code>.
        </div>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.68-.06-1.33-.18-1.95H12v3.7h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.74 2.98-4.3 2.98-7.27Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.5l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.06v2.58A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.41 13.86a6 6 0 0 1 0-3.72V7.56H3.06a10 10 0 0 0 0 8.88l3.35-2.58Z" />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2 10 10 0 0 0 3.06 7.56l3.35 2.58C7.2 7.8 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}