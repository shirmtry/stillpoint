"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Headphones, HeartPulse, LayoutDashboard, LogOut, PenLine, Sparkles } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";

const LINKS = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/session/new", label: "Phiên mới", icon: Sparkles },
  { href: "/studio", label: "Studio", icon: Headphones },
  { href: "/journal", label: "Nhật ký", icon: PenLine },
];

export function SiteNav({ plan, email }: { plan: Plan; email: string | null }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/session/new" ? pathname === "/session/new" || pathname.startsWith("/session/") : pathname === href;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-[#070a12]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <HeartPulse className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">StillPoint</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm transition-colors",
                isActive(link.href)
                  ? "bg-white/[0.07] text-foreground"
                  : "text-muted hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Badge tone={plan === "pro" ? "violet" : "accent"}>{plan === "pro" ? "Pro" : "Free"}</Badge>
          <span className="hidden max-w-[160px] truncate text-xs text-muted lg:block">{email}</span>
          <Button
            variant="ghost"
            size="icon"
            title="Đăng xuất"
            aria-label="Đăng xuất"
            onClick={() => {
              void signOut({ callbackUrl: "/" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:hidden">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs",
              isActive(link.href) ? "bg-white/[0.08] text-foreground" : "text-muted",
            )}
          >
            <link.icon className="h-3.5 w-3.5" />
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}