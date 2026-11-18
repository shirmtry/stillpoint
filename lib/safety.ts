import { stripMarks } from "./utils";

const CRISIS_PATTERNS: RegExp[] = [
  /tu tu/,
  /tu sat/,
  /muon chet/,
  /khong muon song/,
  /ket thuc cuoc doi/,
  /tu lam dau/,
  /cat tay/,
  /lam hai ban than/,
  /nhay lau/,
  /uong thuoc ngu/,
  /suicid/,
  /kill myself/,
  /end my life/,
  /self[- ]?harm/,
  /hurt myself/,
  /want to die/,
  /better off dead/,
];

/**
 * Conservative crisis screen. It only decides whether to skip the "coach" tone
 * and answer with grounding + real-world help; it is not a clinical classifier.
 */
export function detectCrisis(text: string): boolean {
  const normalized = stripMarks(text);
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const CRISIS_SUPPORT = `Mình nghe thấy bạn đang đau, và mình rất mừng vì bạn đã nói ra.

Mình là một ứng dụng, không thể ở cạnh bạn trong lúc này — nhưng bạn không cần đối mặt một mình. Hãy làm ba việc nhỏ này ngay bây giờ:

1. Nói với một người bạn tin tưởng, ngay hôm nay. Chỉ cần một câu: "Mình đang không ổn và mình cần bạn ở cạnh."
2. Nếu bạn đang nghĩ đến việc làm đau bản thân, hãy gọi 115 (cấp cứu) hoặc đến phòng cấp cứu gần nhất. Ở nhiều nơi còn có đường dây can thiệp khủng hoảng 24/7 — nếu bạn cho mình biết quốc gia, mình sẽ chỉ đúng số.
3. Đặt những thứ có thể gây hại ra xa tầm tay, và ở lại nơi có người khác.

Bạn không phải là gánh nặng. Cảm giác này là thật, nhưng nó không phải toàn bộ con người bạn, và nó có thể thay đổi khi có người giúp.

Khi bạn thấy an toàn hơn, mình vẫn ở đây.`;

export function crisisRitual(): string {
  return CRISIS_SUPPORT;
}