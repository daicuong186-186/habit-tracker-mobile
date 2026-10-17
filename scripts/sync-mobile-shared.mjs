// Sao chép logic thuần (streak, thống kê, kiểm tra dữ liệu...) từ src/lib sang app Expo.
// Nguồn gốc duy nhất là src/lib — KHÔNG sửa trực tiếp các file trong mobile/src/shared.
// Chạy: npm run sync:mobile (test src/lib/__tests__/mobile-shared.test.ts sẽ báo lỗi nếu quên).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SHARED_FILES = ["streak.ts", "analytics.ts", "habit-options.ts", "habit-validation.ts"];
export const HEADER = "// FILE TỰ ĐỘNG SINH từ src/lib — sửa ở bản gốc rồi chạy `npm run sync:mobile`.\n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCE_DIR = join(root, "src", "lib");
export const TARGET_DIR = join(root, "mobile", "src", "shared");

export function render(file) {
  return HEADER + readFileSync(join(SOURCE_DIR, file), "utf8");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(TARGET_DIR, { recursive: true });
  for (const file of SHARED_FILES) {
    writeFileSync(join(TARGET_DIR, file), render(file));
    console.log(`✓ mobile/src/shared/${file}`);
  }
}
