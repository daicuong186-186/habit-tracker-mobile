import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SHARED_FILES, TARGET_DIR, render } from "../../../scripts/sync-mobile-shared.mjs";

// App Expo (mobile/) dùng bản sao của logic trong src/lib. Test này đảm bảo bản sao luôn khớp bản gốc.
describe("mobile/src/shared đồng bộ với src/lib", () => {
  it.each(SHARED_FILES)("%s khớp bản gốc (chạy `npm run sync:mobile` nếu lỗi)", (file) => {
    const target = join(TARGET_DIR, file);
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, "utf8")).toBe(render(file));
  });
});
