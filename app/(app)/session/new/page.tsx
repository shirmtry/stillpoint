import { SessionComposer } from "@/components/session-composer";

export const metadata = { title: "Phiên mới" };

export default function NewSessionPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Phiên mới</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Năm phút, viết riêng cho bạn.</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Chọn loại phiên và điều đang diễn ra. AI viết lời thoại theo đúng ngữ cảnh, phát trực tiếp từng câu để
          bạn có thể bắt đầu ngay cả khi chưa đọc hết.
        </p>
      </div>
      <SessionComposer />
    </div>
  );
}