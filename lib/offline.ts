import type { SessionKind, Sentiment } from "./types";

function moodLine(mood: number | null | undefined): string {
  if (typeof mood !== "number") return "";
  if (mood <= 2) return "Hôm nay có vẻ là một ngày nặng. Bạn không cần làm phiên này thật tốt — chỉ cần được nghỉ một chút.";
  if (mood >= 4) return "Hôm nay bạn đang có năng lượng tốt. Mình giữ phiên này nhẹ để bạn không đốt hết nó.";
  return "Hôm nay ở mức giữa. Mình đi chậm, đủ để bạn thấy nhịp thở của mình.";
}

function intentLine(intent: string | undefined): string {
  const clean = (intent ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return `Bạn vừa nói: “${clean.slice(0, 160)}”. Mình giữ điều đó ở đây, không phán xét.`;
}

export function offlineSession(kind: SessionKind, minutes: number, intent?: string, mood?: number | null): string {
  const moodText = moodLine(mood);
  const note = intentLine(intent);

  if (kind === "focus") {
    return `Mình bắt đầu phiên ${minutes} phút để đưa não vào guồng.

Đặt điện thoại úp xuống, ngoài tầm tay. Đóng những tab không liên quan — không phải để sạch sẽ, mà để não bớt phải quyết định.

Thở ba hơi dài. Thở ra dài hơn hít vào. Vai hạ xuống thêm một chút.

Giờ chọn đúng một việc cho phiên này. Viết nó thành một câu có động từ và có điểm kết thúc rõ ràng. Ví dụ: “viết xong phần mở đầu của báo cáo”, không phải “làm báo cáo”.

${note || "Nếu chưa biết chọn gì, chọn việc bạn đang né nhất — thường đó là việc đang giữ năng lượng của bạn."}

Trong mười phút tới, chỉ cần mở đúng file đó và viết dòng đầu tiên. Dòng đầu tiên không cần hay. Nó chỉ cần tồn tại.

Khi một ý nghĩ khác kéo đến, ghi nó ra giấy nháp một dòng rồi quay lại. Bạn không cần đuổi nó đi; bạn chỉ cần không đi theo nó.

${moodText}

Bắt đầu khi bạn thấy sẵn sàng. Hết phiên, bạn không cần hoàn hảo — chỉ cần có thêm một đoạn tiến bộ.`;
  }

  if (kind === "winddown") {
    return `Ngày làm việc kết thúc ở đây. Không phải khi mọi việc xong — vì sẽ không bao giờ xong — mà khi bạn chọn dừng.

Ngồi yên, hai bàn chân đặt phẳng. Thở ra dài ba lần, mỗi lần chậm hơn lần trước. Để bụng mềm ra.

Mình kể bạn nghe một câu chuyện ngắn.

Ở cuối một bờ biển đá, có một ngọn hải đăng nhỏ. Người giữ đèn ở đó mỗi tối chỉ làm một việc: lau kính, thắp đèn, rồi ngồi xuống nhìn biển. Anh không cố đếm hết những con tàu. Anh không sửa được thời tiết. Anh chỉ giữ cho ngọn đèn sạch và sáng.

Có những đêm sương dày, ánh đèn chỉ đi được vài chục mét. Anh vẫn thắp. Có những đêm trời trong, ánh đèn đi rất xa. Anh cũng vẫn thắp, và không tự khen mình.

Điều anh biết là: ngày mai đèn vẫn cần được lau. Và anh vẫn sẽ có mặt.

${moodText}

Bây giờ, hãy đặt ra một ranh giới nhỏ cho tối nay: một việc bạn sẽ không làm sau giờ này. Có thể là không mở email. Có thể là không sửa thêm một dòng code.

Ngày mai, bước đầu tiên chỉ cần là một dòng: việc đầu tiên bạn sẽ chạm vào. Ghi nó ra, rồi để đó.

Chúc bạn một đêm đủ sâu.`;
  }

  return `Mình cùng dừng lại ${minutes} phút. Không cần làm gì đúng cả — chỉ cần ngồi yên.

Đặt hai chân trên sàn. Thả lỏng hàm. Để vai rơi xuống thêm một chút, như vừa đặt xuống một chiếc túi nặng.

Thở vào bằng mũi trong bốn nhịp. Giữ nhẹ bốn nhịp. Thở ra chậm trong sáu nhịp. Lặp lại ba lần. Nếu đếm lệch, cứ bắt đầu lại — đó cũng là một phần của việc luyện tập.

Bây giờ, quét cơ thể từ trán xuống: trán, quai hàm, cổ, vai, ngực, bụng, bàn tay. Chỗ nào còn bám chặt, chỉ cần nhận ra và mềm ra một chút.

${note}
${moodText}

Trước khi quay lại công việc, hãy chọn một việc nhỏ nhất để làm tiếp theo. Không phải cả danh sách. Chỉ một việc.

Khi bạn sẵn sàng, mở mắt chậm. Buổi làm việc vẫn ở đó, nhưng nhịp thở của bạn đã là của bạn.`;
}

export function offlineJournalRitual(sentiment: Sentiment): { kind: "breathing" | "meditation" | "story"; text: string } {
  if (sentiment === "negative") {
    return {
      kind: "breathing",
      text: `Mình nghe rằng hôm nay nặng. Không cần sửa nó ngay bây giờ.

Đặt hai bàn chân trên sàn và để lưng tựa vào ghế. Hít vào bằng mũi trong bốn nhịp, thở ra chậm trong sáu nhịp. Làm sáu vòng, khoảng hai phút. Nếu ngực còn căng, cứ để nó căng — bạn không cần ép mình thư giãn.

Sau đó, viết ra một câu duy nhất: “Điều đang nặng nhất lúc này là ___.” Không cần giải pháp. Chỉ cần đặt nó ra ngoài đầu.

Nếu cảm giác nặng kéo dài nhiều ngày, hãy nói với một người thật và cân nhắc một chuyên gia tâm lý. Bạn xứng đáng được giúp bởi người có mặt trực tiếp.`,
    };
  }
  if (sentiment === "positive") {
    return {
      kind: "story",
      text: `Có một con mèo sống trên bệ cửa sổ của một căn hộ nhỏ. Mỗi sáng, nó chỉ làm một việc: chọn chỗ ấm nhất và nằm xuống đó. Không kiểm tra xem chỗ khác có tốt hơn không. Không tiếc chỗ nắng đã trôi qua.

Hôm nay bạn đã có một ngày như vậy — một chỗ đủ tốt, một việc đủ xong. Hãy để mình tận hưởng nó thêm vài phút trước khi ngày mới bắt đầu.

Ngồi yên, nhớ lại một khoảnh khắc cụ thể của ngày hôm nay: ánh sáng lúc đó, một câu nói, cảm giác trong ngực. Giữ nó trong ba hơi thở.

Rồi ghi lại một dòng: “Hôm nay mình đã ___.” Để dành cho những ngày sau đọc lại.`,
    };
  }
  return {
    kind: "meditation",
    text: `Mình cùng dành ba phút để đóng lại ngày hôm nay.

Ngồi yên và để hơi thở tự tìm nhịp. Không điều khiển. Chỉ nhận ra: không khí vào, không khí ra.

Khi một ý nghĩ về công việc xuất hiện, hãy gọi tên nó thật ngắn: “đang lo”, “đang tính”, “đang nhớ”. Rồi quay lại với hơi thở. Không cần xua nó đi.

Sau ba phút, chọn một việc duy nhất cho ngày mai và viết nó ra giấy. Không phải danh sách — chỉ một việc.

Đóng nắp laptop. Ngày hôm nay đã đủ.`,
  };
}