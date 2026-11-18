import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: {
    default: "StillPoint — 5 phút mỗi ngày để não bạn không bị quá tải",
    template: "%s · StillPoint",
  },
  description:
    "AI companion cho sức khỏe tâm trí của người làm việc trí óc: phiên thiền được viết riêng, soundscape từ một câu mô tả, và nhật ký thả lỏng thông minh.",
  applicationName: "StillPoint",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "StillPoint", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070a12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}