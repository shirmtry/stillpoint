"use client";

import { useState } from "react";
import { CreditCard, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui";
import type { Plan } from "@/lib/types";

type Action = "monthly" | "yearly" | "portal";

export function BillingActions({
  plan,
  hasCustomer,
  enabled,
}: {
  plan: Plan;
  hasCustomer: boolean;
  enabled: boolean;
}) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");

  async function go(action: Action) {
    setBusy(action);
    setError("");
    try {
      const endpoint = action === "portal" ? "/api/billing/portal" : "/api/billing/checkout";
      const body = action === "portal" ? undefined : JSON.stringify({ interval: action });
      const response = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const data = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!response.ok || !data?.url) {
        setError(data?.message ?? "Không mở được cổng thanh toán. Thử lại sau.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Mất kết nối tới máy chủ thanh toán.");
    } finally {
      setBusy(null);
    }
  }

  if (!enabled) {
    return (
      <div>
        <Button variant="outline" size="sm" disabled>
          <CreditCard className="h-4 w-4" /> Chưa cấu hình Stripe
        </Button>
        <p className="mt-2 text-[11px] text-muted">
          Thêm <code>STRIPE_SECRET_KEY</code> và mã giá Pro để bật thanh toán.
        </p>
      </div>
    );
  }

  if (plan === "pro") {
    return (
      <div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasCustomer || busy !== null}
          onClick={() => void go("portal")}
        >
          {busy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
          Quản lý gói
        </Button>
        {!hasCustomer ? (
          <p className="mt-2 text-[11px] text-muted">Chưa có hồ sơ Stripe cho tài khoản này.</p>
        ) : null}
        {error ? <p className="mt-2 text-[11px] text-rose-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy !== null} onClick={() => void go("monthly")}>
          {busy === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Nâng cấp Pro
        </Button>
        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => void go("yearly")}>
          {busy === "yearly" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Trả theo năm
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted">Phiên không giới hạn · huỷ bất cứ lúc nào qua Stripe.</p>
      {error ? <p className="mt-2 text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}