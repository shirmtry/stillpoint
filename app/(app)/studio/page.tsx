import { SoundscapeStudio } from "@/components/soundscape-studio";

export const metadata = { title: "Studio âm thanh" };

export default function StudioPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Studio</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Không gian âm thanh của riêng bạn.</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Mô tả bằng lời, StillPoint chọn tỉ lệ mưa, gió, lửa, sóng và nền trầm. Mọi thứ chạy trên máy — không
          gửi âm thanh lên máy chủ, không tốn lượt AI khi bạn chỉnh tay.
        </p>
      </div>
      <SoundscapeStudio />
    </div>
  );
}