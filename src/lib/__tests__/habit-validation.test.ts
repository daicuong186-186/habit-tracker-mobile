import { describe, expect, it } from "vitest";
import { isDateKey, isNonEmptyId, validateHabitInput, validateStatusInput } from "../habit-validation";

const TODAY = "2026-10-16";

const valid = {
  title: "  Uống nước  ",
  description: "  2 lít mỗi ngày ",
  icon: "Droplets",
  color: "#06B6D4",
  frequencyType: "DAILY",
  targetDays: [],
};

describe("isDateKey", () => {
  it("chỉ nhận ngày YYYY-MM-DD có thật", () => {
    expect(isDateKey("2026-10-16")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-1-5")).toBe(false);
    expect(isDateKey(20261016)).toBe(false);
  });
});

describe("isNonEmptyId", () => {
  it("từ chối chuỗi rỗng, quá dài hoặc không phải chuỗi", () => {
    expect(isNonEmptyId("abc")).toBe(true);
    expect(isNonEmptyId("   ")).toBe(false);
    expect(isNonEmptyId("x".repeat(65))).toBe(false);
    expect(isNonEmptyId(1)).toBe(false);
  });
});

describe("validateHabitInput", () => {
  it("chuẩn hóa dữ liệu hợp lệ", () => {
    const result = validateHabitInput(valid);
    expect(result).toEqual({
      ok: true,
      data: {
        title: "Uống nước",
        description: "2 lít mỗi ngày",
        icon: "Droplets",
        color: "#06b6d4",
        frequencyType: "DAILY",
        targetDays: "[0,1,2,3,4,5,6]",
      },
    });
  });

  it("mô tả rỗng được lưu là null", () => {
    const result = validateHabitInput({ ...valid, description: "   " });
    expect(result.ok && result.data.description).toBeNull();
  });

  it("SPECIFIC_DAYS sắp xếp, loại trùng và bắt buộc ít nhất một ngày", () => {
    const result = validateHabitInput({ ...valid, frequencyType: "SPECIFIC_DAYS", targetDays: [5, 1, 3, 1] });
    expect(result.ok && result.data.targetDays).toBe("[1,3,5]");
    expect(validateHabitInput({ ...valid, frequencyType: "SPECIFIC_DAYS", targetDays: [] }).ok).toBe(false);
    expect(validateHabitInput({ ...valid, frequencyType: "SPECIFIC_DAYS", targetDays: [7] }).ok).toBe(false);
  });

  it.each([
    ["tên rỗng", { title: "  " }],
    ["tên quá 100 ký tự", { title: "a".repeat(101) }],
    ["mô tả quá 500 ký tự", { description: "a".repeat(501) }],
    ["icon ngoài danh sách", { icon: "Rocket" }],
    ["màu không phải hex 6 ký tự", { color: "red" }],
    ["tần suất lạ", { frequencyType: "WEEKLY" }],
  ])("từ chối %s", (_label, patch) => {
    expect(validateHabitInput({ ...valid, ...patch }).ok).toBe(false);
  });

  it("từ chối dữ liệu không phải object", () => {
    expect(validateHabitInput(null).ok).toBe(false);
  });
});

describe("validateStatusInput", () => {
  it("chuẩn hóa ghi chú: undefined giữ nguyên, rỗng thành null", () => {
    expect(validateStatusInput(TODAY, "COMPLETED", undefined, TODAY)).toEqual({
      ok: true,
      data: { status: "COMPLETED", note: undefined },
    });
    expect(validateStatusInput(TODAY, "SKIPPED", "   ", TODAY)).toEqual({
      ok: true,
      data: { status: "SKIPPED", note: null },
    });
    expect(validateStatusInput(TODAY, null, " ốm ", TODAY)).toEqual({ ok: true, data: { status: null, note: "ốm" } });
  });

  it("không cho ghi nhận ngày tương lai hoặc ngày sai định dạng", () => {
    expect(validateStatusInput("2026-10-17", "COMPLETED", undefined, TODAY).ok).toBe(false);
    expect(validateStatusInput("16/10/2026", "COMPLETED", undefined, TODAY).ok).toBe(false);
  });

  it("từ chối trạng thái lạ và ghi chú quá dài", () => {
    expect(validateStatusInput(TODAY, "DONE", undefined, TODAY).ok).toBe(false);
    expect(validateStatusInput(TODAY, "COMPLETED", "a".repeat(501), TODAY).ok).toBe(false);
  });
});
