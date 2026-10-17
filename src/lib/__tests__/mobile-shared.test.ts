import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SHARED_FILES, TARGET_DIR, render } from "../../../scripts/sync-mobile-shared.mjs";

// App Expo (mobile/) dùng bản sao của logic trong src/lib. Test này đảm bảo bản sao luôn khớp bản gốc.
// Git trên Windows (core.autocrlf) có thể đổi LF ↔ CRLF khi checkout, nên so sánh sau khi chuẩn hóa xuống dòng.
const normalize = (text: string) => text.replace(/\r\n/g, "\n");

describe("mobile/src/shared đồng bộ với src/lib", () => {
  it.each(SHARED_FILES)("%s khớp bản gốc (chạy `npm run sync:mobile` nếu lỗi)", (file) => {
    const target = join(TARGET_DIR, file);
    expect(existsSync(target)).toBe(true);
    expect(normalize(readFileSync(target, "utf8"))).toBe(normalize(render(file)));
  });
});
