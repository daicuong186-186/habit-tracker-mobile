# Habit Tracker — Mobile (Expo)

Phiên bản React Native (Expo SDK 58) của Habit Tracker. Chạy **hoàn toàn offline**: dữ liệu lưu trong
file SQLite trên máy (`habit-tracker.db`, qua `expo-sqlite`), không cần server hay tài khoản.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/app/` | Màn hình (Expo Router, native tabs): `index` (Hôm nay), `analytics` (Thống kê), `archived` (Lưu trữ) |
| `src/db/` | Schema + migration SQLite (`database.ts`) và các câu lệnh đọc/ghi (`habit-repository.ts`) |
| `src/state/habits-store.tsx` | Store dùng chung: kiểm tra dữ liệu → cập nhật UI ngay → ghi SQLite |
| `src/components/` | Giao diện: DateStrip, DailyProgress (pháo giấy), HabitCard, form, Heatmap, biểu đồ theo thứ |
| `src/shared/` | **File tự sinh** từ `../src/lib` (streak, analytics, kiểm tra dữ liệu...). Không sửa trực tiếp |

### Logic dùng chung với bản web

Thuật toán Streak/thống kê chỉ có **một nguồn duy nhất** là `src/lib` của bản web. Sau khi sửa ở đó:

```bash
# ở thư mục gốc repo
npm run sync:mobile   # chép sang mobile/src/shared
npm test              # test mobile-shared.test.ts báo lỗi nếu quên đồng bộ
```

## Chạy thử

```bash
npm install
npx expo start
```

Quét QR bằng app **Expo Go** trên iPhone/Android (các module đang dùng — SQLite, Haptics, Crypto, SVG —
đều có sẵn trong Expo Go nên chưa cần development build).

Kiểm tra trước khi commit: `npm run typecheck` và `npx expo lint`.

## Build file .ipa cho iOS trên đám mây (EAS Build)

Yêu cầu: tài khoản [Expo](https://expo.dev) (miễn phí) và **Apple Developer Program** (trả phí) —
Apple bắt buộc để ký file .ipa cài lên máy thật. Không cần máy Mac.

```bash
# 1. Đăng nhập và liên kết project (ghi extra.eas.projectId vào app.json)
npx eas-cli@latest login
npx eas-cli@latest init

# 2a. Bản cài thử nội bộ (ad hoc) — đăng ký iPhone trước, rồi build
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview

# 2b. Bản phát hành App Store / TestFlight
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production   # tải lên App Store Connect
```

Lần build đầu, EAS CLI sẽ hỏi đăng nhập Apple và tự tạo certificate + provisioning profile.
Khi xong, trang build trên expo.dev có link tải file **.ipa**.

| Profile (`eas.json`) | Phân phối | Dùng khi |
|---|---|---|
| `preview` | `internal` (ad hoc) | Cài thử trên các iPhone đã đăng ký bằng `device:create` (tối đa 100 máy/năm) |
| `production` | `store` | Gửi lên TestFlight / App Store; build number tự tăng (`appVersionSource: remote`) |

Thông tin cần kiểm tra trong `app.json` trước khi build:
- `ios.bundleIdentifier`: `com.daicuong.habittracker` — phải là duy nhất trên App Store, đổi nếu cần.
- `version`: số phiên bản hiển thị (build number do EAS quản lý).
- Icon/splash hiện là ảnh mặc định của Expo trong `assets/` — thay bằng logo của bạn.
