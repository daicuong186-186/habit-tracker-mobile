# HƯỚNG DẪN DÀNH CHO CLAUDE CODE

## Tổng quan dự án
Ứng dụng Daily Habit Tracker xây dựng bằng Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma (SQLite) và Vitest.
Hãy luôn đọc file @SPEC.md để nắm rõ yêu cầu nghiệp vụ trước khi viết code.

## Các lệnh kiểm tra
- Kiểm tra lỗi TypeScript (BẮT BUỘC chạy sau khi sửa code): npx tsc --noEmit
- Chạy Unit Test: npm test
- Cập nhật Database Schema: npx prisma db push
- Sinh lại Prisma Client: npx prisma generate

## Quy tắc lập trình bắt buộc
1. Chỉ sử dụng Next.js App Router trong src/app/.
2. Xử lý ngày tháng: Luôn dùng date-fns (format(date, 'yyyy-MM-dd')) theo giờ local. Không dùng toISOString() trực tiếp để tránh lệch múi giờ UTC.
3. Kiểm tra phiên bản Prisma trong package.json trước khi cấu hình prisma/schema.prisma và src/lib/prisma.ts.
4. Mọi thuật toán tính Streak phải tách riêng vào src/lib/streak.ts và có Unit Test đi kèm trong src/lib/__tests__/streak.test.ts.
5. Tự kiểm chứng: Luôn chạy npx tsc --noEmit và npm test để tự sửa hết lỗi trước khi hoàn tất nhiệm vụ.
