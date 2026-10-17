import { describe, expect, it } from "vitest";
import { getDay, subDays } from "date-fns";
import {
  calculateBestStreak,
  calculateCompletionRate,
  calculateCurrentStreak,
  calculateHabitStats,
  isTargetDay,
  parseDateKey,
  parseTargetDays,
  toDateKey,
  type StreakHabit,
  type StreakLog,
} from "../streak";

// Thứ Sáu, 16/10/2026, 15:00 giờ local
const TODAY = new Date(2026, 9, 16, 15, 0, 0);

const daily: StreakHabit = { frequencyType: "DAILY", targetDays: "[]" };
// Thứ 2, 4, 6
const monWedFri: StreakHabit = { frequencyType: "SPECIFIC_DAYS", targetDays: "[1,3,5]" };

/** Log cho ngày cách TODAY `offset` ngày về trước. */
function logAt(offset: number, status: StreakLog["status"] = "COMPLETED", from: Date = TODAY): StreakLog {
  return { date: toDateKey(subDays(from, offset)), status };
}

function completedRange(fromOffset: number, toOffset: number, from: Date = TODAY): StreakLog[] {
  const logs: StreakLog[] = [];
  for (let i = fromOffset; i <= toOffset; i++) logs.push(logAt(i, "COMPLETED", from));
  return logs;
}

describe("helpers", () => {
  it("toDateKey dùng giờ local, không lệch UTC", () => {
    expect(toDateKey(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
    expect(toDateKey(new Date(2025, 11, 31, 23, 59))).toBe("2025-12-31");
  });

  it("parseDateKey trả về 00:00 local đúng ngày", () => {
    const d = parseDateKey("2026-10-16");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 16, 0]);
    expect(getDay(d)).toBe(5); // Thứ Sáu
  });

  it("parseTargetDays xử lý JSON lỗi, giá trị ngoài 0-6 và trùng lặp", () => {
    expect(parseTargetDays("[5,1,3,1]")).toEqual([1, 3, 5]);
    expect(parseTargetDays([0, 6, 7, -1, 2.5])).toEqual([0, 6]);
    expect(parseTargetDays("not-json")).toEqual([]);
    expect(parseTargetDays('{"a":1}')).toEqual([]);
  });

  it("isTargetDay: DAILY luôn đúng, SPECIFIC_DAYS theo targetDays", () => {
    expect(isTargetDay(daily, parseDateKey("2026-10-18"))).toBe(true); // CN
    expect(isTargetDay(monWedFri, parseDateKey("2026-10-16"))).toBe(true); // T6
    expect(isTargetDay(monWedFri, parseDateKey("2026-10-15"))).toBe(false); // T5
  });
});

describe("calculateCurrentStreak - DAILY", () => {
  it("không có log → 0", () => {
    expect(calculateCurrentStreak(daily, [], TODAY)).toBe(0);
  });

  it("đếm cả hôm nay khi hôm nay đã COMPLETED", () => {
    expect(calculateCurrentStreak(daily, completedRange(0, 4), TODAY)).toBe(5);
  });

  it("hôm nay chưa COMPLETED → bắt đầu đếm từ hôm qua", () => {
    expect(calculateCurrentStreak(daily, completedRange(1, 3), TODAY)).toBe(3);
  });

  it("hôm qua bị bỏ lỡ → chuỗi về 0", () => {
    expect(calculateCurrentStreak(daily, completedRange(2, 6), TODAY)).toBe(0);
  });

  it("đứt chuỗi ở giữa → chỉ đếm đoạn gần nhất", () => {
    const logs = [...completedRange(0, 2), ...completedRange(4, 10)];
    expect(calculateCurrentStreak(daily, logs, TODAY)).toBe(3);
  });

  it("không phụ thuộc thứ tự log và bỏ qua ngày tương lai", () => {
    const logs = [logAt(-1), ...completedRange(0, 3)].reverse();
    expect(calculateCurrentStreak(daily, logs, TODAY)).toBe(4);
  });

  it("bỏ qua log có date không hợp lệ", () => {
    const logs = [...completedRange(0, 1), { date: "2026-13-45", status: "COMPLETED" }];
    expect(calculateCurrentStreak(daily, logs, TODAY)).toBe(2);
  });
});

describe("calculateCurrentStreak - SKIPPED", () => {
  it("SKIPPED giữ chuỗi nhưng không cộng điểm", () => {
    const logs = [logAt(0), logAt(1, "SKIPPED"), logAt(2), logAt(3)];
    expect(calculateCurrentStreak(daily, logs, TODAY)).toBe(3);
  });

  it("nhiều ngày SKIPPED liên tiếp vẫn giữ chuỗi", () => {
    const logs = [logAt(1), logAt(2, "SKIPPED"), logAt(3, "SKIPPED"), logAt(4, "SKIPPED"), logAt(5)];
    expect(calculateCurrentStreak(daily, logs, TODAY)).toBe(2);
  });

  it("hôm nay SKIPPED → không đứt, đếm tiếp từ hôm qua", () => {
    const logs = [logAt(0, "SKIPPED"), ...completedRange(1, 2)];
    expect(calculateCurrentStreak(daily, logs, TODAY)).toBe(2);
  });

  it("chỉ có SKIPPED → 0", () => {
    const logs = [logAt(0, "SKIPPED"), logAt(1, "SKIPPED")];
    expect(calculateCurrentStreak(daily, logs, TODAY)).toBe(0);
  });

  it("SKIPPED không nối được qua ngày bị bỏ lỡ", () => {
    const logs = [logAt(1), logAt(2, "SKIPPED"), logAt(4), logAt(5)];
    expect(calculateCurrentStreak(daily, logs, TODAY)).toBe(1);
  });
});

describe("calculateCurrentStreak - SPECIFIC_DAYS", () => {
  // TODAY = T6 16/10. Các ngày mục tiêu trước đó: T4 14, T2 12, T6 9, T4 7, T2 5
  it("ngày không thuộc targetDays không làm đứt chuỗi", () => {
    const logs = ["2026-10-16", "2026-10-14", "2026-10-12", "2026-10-09"].map((date) => ({
      date,
      status: "COMPLETED",
    }));
    expect(calculateCurrentStreak(monWedFri, logs, TODAY)).toBe(4);
  });

  it("hôm nay là ngày mục tiêu nhưng chưa làm → đếm từ trước đó", () => {
    const logs = ["2026-10-14", "2026-10-12"].map((date) => ({ date, status: "COMPLETED" }));
    expect(calculateCurrentStreak(monWedFri, logs, TODAY)).toBe(2);
  });

  it("hôm nay không phải ngày mục tiêu → chuỗi vẫn giữ", () => {
    const saturday = new Date(2026, 9, 17, 10);
    const logs = ["2026-10-16", "2026-10-14"].map((date) => ({ date, status: "COMPLETED" }));
    expect(calculateCurrentStreak(monWedFri, logs, saturday)).toBe(2);
  });

  it("bỏ lỡ một ngày mục tiêu → đứt chuỗi", () => {
    // Thiếu T4 14/10
    const logs = ["2026-10-16", "2026-10-12", "2026-10-09"].map((date) => ({ date, status: "COMPLETED" }));
    expect(calculateCurrentStreak(monWedFri, logs, TODAY)).toBe(1);
  });

  it("COMPLETED vào ngày ngoài lịch không được cộng", () => {
    const logs = ["2026-10-16", "2026-10-15", "2026-10-14"].map((date) => ({ date, status: "COMPLETED" }));
    expect(calculateCurrentStreak(monWedFri, logs, TODAY)).toBe(2);
  });

  it("SKIPPED trên ngày mục tiêu giữ chuỗi", () => {
    const logs: StreakLog[] = [
      { date: "2026-10-16", status: "COMPLETED" },
      { date: "2026-10-14", status: "SKIPPED" },
      { date: "2026-10-12", status: "COMPLETED" },
    ];
    expect(calculateCurrentStreak(monWedFri, logs, TODAY)).toBe(2);
  });

  it("targetDays rỗng → 0", () => {
    const none: StreakHabit = { frequencyType: "SPECIFIC_DAYS", targetDays: "[]" };
    expect(calculateCurrentStreak(none, completedRange(0, 5), TODAY)).toBe(0);
  });
});

describe("calculateCurrentStreak - qua tháng / năm mới", () => {
  it("qua năm mới (31/12 → 01/01)", () => {
    const today = new Date(2026, 0, 2, 9);
    const logs = ["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"].map((date) => ({
      date,
      status: "COMPLETED",
    }));
    expect(calculateCurrentStreak(daily, logs, today)).toBe(4);
  });

  it("qua tháng 2 năm thường (28/02 → 01/03)", () => {
    const today = new Date(2026, 2, 1, 9);
    const logs = ["2026-02-27", "2026-02-28", "2026-03-01"].map((date) => ({ date, status: "COMPLETED" }));
    expect(calculateCurrentStreak(daily, logs, today)).toBe(3);
  });

  it("qua tháng 2 năm nhuận (29/02 → 01/03)", () => {
    const today = new Date(2024, 2, 1, 9);
    const withLeap = ["2024-02-28", "2024-02-29", "2024-03-01"].map((date) => ({ date, status: "COMPLETED" }));
    expect(calculateCurrentStreak(daily, withLeap, today)).toBe(3);
    const missingLeap = ["2024-02-28", "2024-03-01"].map((date) => ({ date, status: "COMPLETED" }));
    expect(calculateCurrentStreak(daily, missingLeap, today)).toBe(1);
  });

  it("SPECIFIC_DAYS qua năm mới", () => {
    // T2 29/12/2025, T4 31/12/2025, T6 02/01/2026
    const today = new Date(2026, 0, 2, 20);
    const logs = ["2025-12-29", "2025-12-31", "2026-01-02"].map((date) => ({ date, status: "COMPLETED" }));
    expect(calculateCurrentStreak(monWedFri, logs, today)).toBe(3);
  });
});

describe("calculateBestStreak", () => {
  it("không có log → 0", () => {
    expect(calculateBestStreak(daily, [])).toBe(0);
  });

  it("lấy chuỗi dài nhất trong lịch sử", () => {
    const logs = [...completedRange(0, 2), ...completedRange(5, 11), ...completedRange(14, 15)];
    expect(calculateBestStreak(daily, logs)).toBe(7);
  });

  it("SKIPPED nối chuỗi nhưng không cộng điểm", () => {
    const logs = [logAt(0), logAt(1), logAt(2, "SKIPPED"), logAt(3), logAt(4), logAt(6)];
    expect(calculateBestStreak(daily, logs)).toBe(4);
  });

  it("SPECIFIC_DAYS bỏ qua ngày ngoài lịch", () => {
    const logs = ["2026-10-05", "2026-10-07", "2026-10-09", "2026-10-12", "2026-10-16"].map((date) => ({
      date,
      status: "COMPLETED",
    }));
    // Thiếu T4 14/10 → chuỗi 4 (05,07,09,12) và chuỗi 1 (16)
    expect(calculateBestStreak(monWedFri, logs)).toBe(4);
  });

  it("chuỗi qua năm mới", () => {
    const logs = ["2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-03"].map((date) => ({
      date,
      status: "COMPLETED",
    }));
    expect(calculateBestStreak(daily, logs)).toBe(4);
  });

  it("best streak luôn >= current streak", () => {
    const logs = [...completedRange(0, 9), ...completedRange(12, 14)];
    const current = calculateCurrentStreak(daily, logs, TODAY);
    expect(current).toBe(10);
    expect(calculateBestStreak(daily, logs)).toBeGreaterThanOrEqual(current);
  });
});

describe("calculateCompletionRate", () => {
  it("không có log → 0", () => {
    expect(calculateCompletionRate(daily, [], TODAY)).toBe(0);
  });

  it("hoàn thành đủ 30 ngày → 100", () => {
    expect(calculateCompletionRate(daily, completedRange(0, 29), TODAY)).toBe(100);
  });

  it("log ngoài cửa sổ 30 ngày không được tính", () => {
    expect(calculateCompletionRate(daily, completedRange(30, 59), TODAY)).toBe(0);
  });

  it("hôm nay chưa làm không bị tính vào mẫu số", () => {
    // 29 ngày trước đó đều hoàn thành, hôm nay chưa
    expect(calculateCompletionRate(daily, completedRange(1, 29), TODAY)).toBe(100);
  });

  it("15/30 ngày hoàn thành → 50", () => {
    const logs = Array.from({ length: 30 }, (_, i) => i)
      .filter((i) => i % 2 === 0)
      .map((i) => logAt(i));
    // today(0) completed; mẫu số = 30, tử số = 15
    expect(calculateCompletionRate(daily, logs, TODAY)).toBe(50);
  });

  it("ngày SKIPPED bị loại khỏi mẫu số", () => {
    // 20 completed, 10 skipped → 20/20
    const logs = Array.from({ length: 30 }, (_, i) => logAt(i, i < 20 ? "COMPLETED" : "SKIPPED"));
    expect(calculateCompletionRate(daily, logs, TODAY)).toBe(100);
  });

  it("SKIPPED + bỏ lỡ: 10 completed, 10 skipped, 10 missed → 50", () => {
    const logs = [
      ...Array.from({ length: 10 }, (_, i) => logAt(i)),
      ...Array.from({ length: 10 }, (_, i) => logAt(i + 10, "SKIPPED")),
    ];
    expect(calculateCompletionRate(daily, logs, TODAY)).toBe(50);
  });

  it("SPECIFIC_DAYS chỉ tính ngày mục tiêu", () => {
    // 30 ngày từ 17/09 đến 16/10/2026 có 13 ngày T2/T4/T6
    const targetKeys: string[] = [];
    for (let i = 0; i < 30; i++) {
      const day = subDays(TODAY, i);
      if ([1, 3, 5].includes(getDay(day))) targetKeys.push(toDateKey(day));
    }
    expect(targetKeys).toHaveLength(13);
    const logs = targetKeys.map((date) => ({ date, status: "COMPLETED" }));
    // Thêm log COMPLETED vào ngày ngoài lịch: không ảnh hưởng
    logs.push({ date: "2026-10-15", status: "COMPLETED" });
    expect(calculateCompletionRate(monWedFri, logs, TODAY)).toBe(100);
    expect(calculateCompletionRate(monWedFri, logs.filter((l) => l.date !== "2026-10-14"), TODAY)).toBe(92); // 12/13
  });

  it("không tính các ngày trước khi tạo thói quen", () => {
    const habit: StreakHabit = { ...daily, createdAt: subDays(TODAY, 4) };
    // 5 ngày kể từ khi tạo, hoàn thành 4 ngày (bỏ lỡ hôm qua)
    const logs = [logAt(0), logAt(2), logAt(3), logAt(4)];
    expect(calculateCompletionRate(habit, logs, TODAY)).toBe(80);
  });

  it("cửa sổ qua năm mới", () => {
    const today = new Date(2026, 0, 5, 12);
    const logs = completedRange(0, 29, today);
    expect(logs.some((l) => l.date.startsWith("2025-12"))).toBe(true);
    expect(calculateCompletionRate(daily, logs, today)).toBe(100);
  });
});

describe("calculateHabitStats", () => {
  it("gộp đủ 3 chỉ số", () => {
    const logs = [...completedRange(0, 2), ...completedRange(4, 8)];
    expect(calculateHabitStats(daily, logs, TODAY)).toEqual({
      currentStreak: 3,
      bestStreak: 5,
      completionRate: 27, // 8/30
    });
  });
});
