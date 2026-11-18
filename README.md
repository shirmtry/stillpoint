# StillPoint

**AI companion cho sức khỏe tâm trí** — “5 phút mỗi ngày để não bạn không bị quá tải”.

StillPoint là một SaaS full-stack cho developer, designer và người làm việc đêm: một phiên thiền ngắn được AI viết riêng, một không gian âm thanh trộn ngay trên máy, và một nghi thức thả lỏng sinh ra từ nhật ký cuối ngày.

- **Live demo** (sau khi deploy): `https://stillpoint.vercel.app`
- **Free**: 3 phiên AI/ngày · **Pro**: không giới hạn (Stripe Checkout + Customer Portal)

---

## 1. Tính năng

| Tính năng | Cách hoạt động |
| --- | --- |
| **Phiên thiền streaming** | `streamText` của Vercel AI SDK 6 qua AI Gateway, trả về dạng text stream; UI đọc từng câu, TTS bằng Web Speech API (tiếng Việt). |
| **Soundscape generator** | Một câu mô tả → AI chọn tỉ lệ 5 lớp (mưa/gió/lửa/sóng/nền) → Web Audio API trộn 5 loop cục bộ, low-pass, master gain, hẹn giờ tự dừng. Không upload gì lên server. |
| **Smart wind-down journal** | Phân tích cảm xúc offline (lexicon VI/EN) → chọn loại nghi thức (thở / thiền / truyện) → AI viết nghi thức; có đường riêng an toàn cho dấu hiệu khủng hoảng. |
| **Dashboard** | Gói hiện tại, số phiên hôm nay, lịch sử phát lại, biểu đồ tâm trạng 30 ngày (Recharts), nút nâng cấp/quản lý gói. |
| **PWA** | `@ducanh2912/next-pwa`; cache âm thanh `CacheFirst` + range requests để nghe offline. |
| **Desktop** | Tauri 2 wrapper, NSIS **per-user** (không cần quyền admin). |

---

## 2. Stack

- Next.js **15.5** (App Router) · React **19** · TypeScript strict (`noUncheckedIndexedAccess`)
- Tailwind CSS **4** (CSS-first tokens) + UI primitives kiểu shadcn + Framer Motion + lucide-react + Recharts
- **AI SDK 6** (`ai`, `@ai-sdk/gateway`) · model mặc định `openai/gpt-4o-mini`, Pro dùng `AI_MODEL_PREMIUM`
- **MongoDB Atlas** driver chính thức (`mongodb@6`), **không Mongoose**
- **Auth.js v5 (next-auth beta)** + `@auth/mongodb-adapter`: Google OAuth, Email magic link (Resend), JWT session
- **Stripe** Checkout + Webhooks + Customer Portal
- **Upstash Redis** rate limit (sliding window), có fallback in-process khi dev
- PWA: `@ducanh2912/next-pwa` · Desktop: Tauri 2

---

## 3. Chạy local

```bash
npm install
cp .env.example .env.local
# điền tối thiểu AUTH_SECRET; để DEMO_MODE=true để đăng nhập một chạm
npx auth secret            # hoặc: openssl rand -base64 32
npm run dev                # http://localhost:3000
```

Không cần MongoDB/Stripe/AI key để chạy thử:

- `MONGODB_URI` trống → repository dùng **in-memory store** (mất khi restart).
- `AI_GATEWAY_API_KEY` trống → **offline generator** viết lời thoại/nghi thức/soundscape deterministic, stream giả lập 20ms/chunk, chi phí $0.
- `DEMO_MODE=true` + `NODE_ENV !== "production"` → nút **“Vào bằng tài khoản demo”**.
- Stripe trống → nút nâng cấp bị vô hiệu kèm gợi ý cấu hình.

Scripts:

```bash
npm run dev         # dev server
npm run typecheck   # tsc --noEmit
npm run build       # production build (PWA service worker được sinh)
npm start           # chạy bản build
bash scripts/make-assets.sh   # tái tạo icon + 5 audio loop bằng ffmpeg
```

`scripts/make-assets.sh` cần ffmpeg có `libmp3lame` và font Segoe UI (Windows). Trên macOS/Linux đổi `FONT=` sang font hệ thống.

---

## 4. Biến môi trường

Xem `.env.example`. Tóm tắt:

| Biến | Bắt buộc | Ghi chú |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL công khai, dùng cho redirect Stripe |
| `AUTH_SECRET` | ✅ | `npx auth secret` |
| `AUTH_TRUST_HOST` | prod | `true` trên Vercel |
| `MONGODB_URI`, `MONGODB_DB` | prod | Atlas SRV string; DB mặc định `stillpoint` |
| `GOOGLE_CLIENT_ID/SECRET` | tuỳ | Bật Google OAuth |
| `AUTH_RESEND_KEY`, `EMAIL_FROM` | tuỳ | Bật magic link |
| `AI_GATEWAY_API_KEY` | tuỳ | Không có → offline mode |
| `AI_MODEL`, `AI_MODEL_PREMIUM` | tuỳ | Mặc định `openai/gpt-4o-mini` / `anthropic/claude-3-5-sonnet` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | tuỳ | Bật thanh toán |
| `STRIPE_PRICE_PRO_MONTHLY/YEARLY` | tuỳ | `price_...` ID |
| `SPEND_DAILY_LIMIT_USD` | ✅ | Trần chi phí AI toàn hệ thống/ngày, mặc định **$2** |
| `SPEND_DAILY_LIMIT_USER_USD` | ✅ | Trần/người/ngày, mặc định **$0.5** |
| `UPSTASH_REDIS_REST_URL/TOKEN` | prod | Không có → limiter in-process (không dùng được trên multi-instance) |
| `DEMO_MODE` | dev only | **Phải là `false` ở production** (code tự tắt khi `NODE_ENV=production`) |

---

## 5. MongoDB Atlas M0

1. Tạo cluster **M0 (Free)** tại [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → thêm user mật khẩu mạnh (role `readWrite` trên DB `stillpoint`).
3. **Network Access** → `Add IP Address`:
   - Local: IP hiện tại.
   - Vercel: `0.0.0.0/0` (serverless không có IP cố định) — chấp nhận được với user DB giới hạn quyền.
4. **Connect → Drivers** → copy chuỗi `mongodb+srv://...` vào `MONGODB_URI`.
5. Index được tạo tự động ở lần đọc DB đầu tiên (`lib/db.ts`).

Collections: `users`, `accounts`, `sessions`, `verification_tokens` (Auth.js), `ai_sessions`, `mood_logs`, `journal_entries`, `subscriptions`, `spend_ledger`.

---

## 6. Auth.js (Google + Magic link)

- **Google**: Google Cloud Console → OAuth consent screen → Credentials → OAuth client (Web).
  Authorized redirect URI: `https://<domain>/api/auth/callback/google` (và `http://localhost:3000/api/auth/callback/google`).
- **Resend**: tạo API key, verify domain gửi, đặt `AUTH_RESEND_KEY` + `EMAIL_FROM`.
- Session dùng **JWT** (`strategy: "jwt"`); `jwt` callback refresh `plan` từ DB tối đa mỗi 30 giây, nên webhook Stripe có hiệu lực gần như tức thì.
- **Middleware** (`middleware.ts`) chặn `/dashboard`, `/session/*`, `/studio`, `/journal` ở edge bằng `auth.config.ts` (không import Mongo).

---

## 7. Stripe

1. Tạo Product **StillPoint Pro** với 2 Price (monthly/yearly, recurring).
2. Điền `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`.
3. Webhook endpoint `https://<domain>/api/billing/webhook`, events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Local test:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
# copy whsec_... vào STRIPE_WEBHOOK_SECRET rồi restart dev
stripe trigger checkout.session.completed
```

5. Customer Portal: trong Stripe Dashboard → Billing → Customer portal → bật các thao tác (huỷ, đổi gói, cập nhật thẻ). Không cần code thêm.

Luồng: `POST /api/billing/checkout` → Checkout Session (`client_reference_id = userId`, `subscription_data.metadata.userId`) → redirect `?success=true` → webhook xác thực chữ ký bằng `stripe.webhooks.constructEvent` → cập nhật `users.plan` + `subscriptions`.

---

## 8. Kiểm soát chi phí & abuse (“sống còn”)

- **SpendGuard** (`lib/spend-guard.ts`): interface `check(userId, estimate)` / `record(userId, usd)`.
  - `InMemorySpendGuard` cho dev; `MongoSpendGuard` aggregate collection `spend_ledger` theo `(day, scope)`.
  - **Trước mọi lời gọi AI** (stream session, soundscape, journal): ước tính token → USD (`lib/pricing.ts`, ~3.6 ký tự/token, bảng giá theo model) → chặn nếu vượt trần **global $2/ngày** hoặc **user $0.5/ngày**.
  - Sau khi stream xong (`onFinish`) hoặc sau `generateText`: ghi chi phí thật từ `usage`.
  - Khi chặn: API trả `402` kèm thông điệp thân thiện; journal/soundscape tự chuyển sang bản ngoại tuyến thay vì làm hỏng trải nghiệm.
- **Rate limit** (`lib/rate-limit.ts`, Upstash sliding window):
  - `/api/ai/stream-session`: 15/phút/IP, 20/giờ/user
  - `/api/ai/soundscape`: 10/phút/IP
  - `/api/ai/journal`: 20/phút/IP, 40/giờ/user
  - `/api/mood`: 30/giờ/user
- **Quota Free**: đếm `ai_sessions` trong ngày UTC; phiên thứ 4 trả `402 QUOTA_EXCEEDED`.
- **Crisis path** (`lib/safety.ts`): phát hiện dấu hiệu tự hại → **không gọi AI**, trả nội dung hỗ trợ + hướng dẫn gọi 115/người thân.
- Middleware bảo vệ toàn bộ route app; API cũng tự kiểm tra `auth()` (defense in depth).

Ví dụ chi phí: `gpt-4o-mini` ($0.15/$0.60 per 1M token). Một phiên ~350 token vào + ~450 token ra ≈ **$0.00032**. Trần $0.5/user ≈ 1.500 phiên/ngày/user; trần $2 toàn hệ thống bảo vệ hoá đơn.

---

## 9. Deploy lên Vercel

```bash
git init && git add . && git commit -m "feat: StillPoint"
gh repo create stillpoint --public --source=. --push
vercel link
vercel env add AUTH_SECRET production
# lặp lại cho các biến ở mục 4
vercel --prod
```

Sau deploy:

1. Cập nhật `NEXT_PUBLIC_APP_URL=https://<domain>` → redeploy.
2. Thêm redirect URI Google + webhook Stripe với domain thật.
3. Kiểm tra PWA: DevTools → Application → Manifest/Service Worker; mở `/studio`, phát audio, tắt mạng, audio vẫn chạy (cache `stillpoint-audio-v1`).

**Không commit `.env.local`** — đã nằm trong `.gitignore`; repo chỉ chứa `.env.example`.

---

## 10. Desktop (.exe, Tauri 2)

Yêu cầu máy build: **Rust** (rustup), **Visual Studio Build Tools** (C++ workload), **WebView2** (Windows 10/11 có sẵn).

```bash
npm install -D @tauri-apps/cli@^2
# sửa src-tauri/tauri.conf.json → app.windows[0].url = domain thật
npx tauri icon public/icons/icon-512.png     # sinh .ico/.icns vào src-tauri/icons
npm run tauri:build
```

Kết quả: `src-tauri/target/release/bundle/nsis/StillPoint_1.0.0_x64-setup.exe`, cài **per-user** (`installMode: "currentUser"`), không cần admin. App là webview trỏ tới bản production nên luôn cập nhật theo web.

> Repo này được tạo trên máy **không có Rust**, nên `.exe` chưa được build; toàn bộ config/script đã sẵn sàng.

**Android (.apk, tuỳ chọn)**: dùng Capacitor — `npm i @capacitor/core @capacitor/cli @capacitor/android`, `npx cap init`, `npx cap add android`, trỏ `server.url` về domain, `npx cap sync && cd android && ./gradlew assembleDebug`. PWA đã đủ cho nhu cầu “cài lên điện thoại”.

---

## 11. Cấu trúc

```
app/
  api/ai/stream-session/route.ts   # streaming + quota + SpendGuard
  api/ai/soundscape/route.ts
  api/ai/journal/route.ts
  api/billing/{checkout,portal,webhook}/route.ts
  api/mood/route.ts
  (app)/dashboard | session/new | session/[id] | studio | journal
  login/page.tsx, page.tsx (landing), layout.tsx
components/  ui/, session-composer, session-player, soundscape-studio, journal-composer, mood-chart, …
lib/  db, store, auth(.config), spend-guard, rate-limit, usage, prompts, offline, safety, sentiment, pricing, soundscape, use-speech
public/  audio/*.mp3, icons/*, manifest.json
scripts/make-assets.sh
src-tauri/  wrapper Tauri 2 (NSIS per-user)
```

---

## 12. Giới hạn đã biết

- TTS dùng giọng hệ thống của trình duyệt; chất lượng phụ thuộc thiết bị. Có thể thay bằng ElevenLabs trong `lib/use-speech.ts` mà không đổi UI.
- Offline mode là bản deterministic, không thay thế chất lượng AI thật; dùng để dev/demo và làm fallback khi hết ngân sách.
- In-memory store chỉ phù hợp dev; production phải có `MONGODB_URI`.
- StillPoint **không phải dịch vụ y tế**. Với dấu hiệu khủng hoảng, sản phẩm hướng người dùng tới hỗ trợ thực tế (115, người thân, chuyên gia).