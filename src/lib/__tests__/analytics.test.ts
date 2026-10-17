import { describe, expect, it } from "vitest";
import {
  buildDailySeries,
  calculateWeekdayRates,
  getDayProgress,
  heatLevel,
  isDueOn,
  summarizeSeries,
  type AnalyticsHabit,
} from "../analytics";

// Thứ Sáu, 16/10/2026
const TODAY = "2026-10-16";

function habit(overrides: Partial<AnalyticsHabit> = {}): AnalyticsHabit {
  return { frequencyType: "DAILY", targetDays: [0, 1, 2, 3, 4, 5, 6], createdDate: "2026-01-01", logs: [], ...overrides };
}

// Thứ 2, 4, 6
const monWedFri = (logs: AnalyticsHabit["logs"] = [], createdDate = "2026-01-01") =>
  habit({ frequencyType: "SPECIFIC_DAYS", targetDays: [1, 3, 5], createdDate, logs });

describe("isDueOn", () => {
  it("bỏ qua ngày trước khi tạo thói quen", () => {
    const h = habit({ createdDate: "2026-10-10" });
    expect(isDueOn(h, "2026-10-09")).toBe(false);
    expect(isDueOn(h, "2026-10-10")).toBe(true);
  });

  it("SPECIFIC_DAYS chỉ cần làm vào đúng thứ", () => {
    expect(isDueOn(monWedFri(), "2026-10-16")).toBe(true); // Thứ 6
    expect(isDueOn(monWedFri(), "2026-10-15")).toBe(false); // Thứ 5
  });
});

describe("getDayProgress", () => {
  it("đếm COMPLETED, không tính SKIPPED vào mẫu số", () => {
    const habits = [
      habit({ logs: [{ date: TODAY, status: "COMPLETED" }] }),
      habit({ logs: [{ date: TODAY, status: "SKIPPED" }] }),
      habit(),
    ];
    expect(getDayProgress(habits, TODAY)).toEqual({ completed: 1, required: 2, skipped: 1 });
  });

  it("thói quen không theo lịch hoặc chưa được tạo không được tính", () => {
    const habits = [monWedFri(), habit({ createdDate: "2026-10-17" })];
    expect(getDayProgress(habits, "2026-10-15")).toEqual({ completed: 0, required: 0, skipped: 0 });
  });
});

describe("buildDailySeries", () => {
  it("trả về đúng số ngày, từ cũ đến mới và kết thúc ở hôm nay", () => {
    const cells = buildDailySeries([habit()], TODAY, 365);
    expect(cells).toHaveLength(365);
    expect(cells[0].date).toBe("2025-10-17");
    expect(cells[364].date).toBe(TODAY);
  });

  it("xử lý đúng năm nhuận và chuyển tháng", () => {
    const cells = buildDailySeries([], "2028-03-01", 3);
    expect(cells.map((c) => c.date)).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  });

  it("tính rate theo ngày và null khi không có gì cần làm", () => {
    const habits = [
      habit({ logs: [{ date: "2026-10-15", status: "COMPLETED" }] }),
      habit({
        logs: [
          { date: "2026-10-15", status: "COMPLETED" },
          { date: "2026-10-14", status: "SKIPPED" },
        ],
      }),
    ];
    const cells = buildDailySeries(habits, TODAY, 3);
    expect(cells.map((c) => [c.date, c.rate])).toEqual([
      ["2026-10-14", 0], // 1 cần làm (1 nghỉ có phép), chưa làm
      ["2026-10-15", 1],
      [TODAY, 0],
    ]);

    const allSkipped = buildDailySeries([habit({ logs: [{ date: TODAY, status: "SKIPPED" }] })], TODAY, 1);
    expect(allSkipped[0]).toMatchObject({ rate: null, skipped: 1, required: 0 });
  });

  it("khớp kết quả với getDayProgress", () => {
    const habits = [
      monWedFri([{ date: "2026-10-12", status: "COMPLETED" }]),
      habit({ logs: [{ date: "2026-10-13", status: "SKIPPED" }] }),
    ];
    for (const cell of buildDailySeries(habits, TODAY, 7)) {
      const { completed, required, skipped } = getDayProgress(habits, cell.date);
      expect({ completed: cell.completed, required: cell.required, skipped: cell.skipped }).toEqual({
        completed,
        required,
        skipped,
      });
    }
  });
});

describe("heatLevel", () => {
  it("phân mức theo tỷ lệ", () => {
    expect(heatLevel(null)).toBe(-1);
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(0.2)).toBe(1);
    expect(heatLevel(0.5)).toBe(2);
    expect(heatLevel(0.8)).toBe(3);
    expect(heatLevel(1)).toBe(4);
  });
});

describe("calculateWeekdayRates", () => {
  it("trả về theo thứ tự T2 → CN", () => {
    const rates = calculateWeekdayRates(buildDailySeries([habit()], TODAY, 14), TODAY);
    expect(rates.map((r) => r.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("tính tỷ lệ theo thứ và loại bỏ ngày hôm nay", () => {
    // 2 tuần: 05/10 → 16/10 (hôm nay là Thứ 6). Hoàn thành mọi Thứ 2, một Thứ 3.
    const h = habit({
      createdDate: "2026-10-05",
      logs: [
        { date: "2026-10-05", status: "COMPLETED" }, // T2
        { date: "2026-10-12", status: "COMPLETED" }, // T2
        { date: "2026-10-06", status: "COMPLETED" }, // T3
      ],
    });
    const rates = calculateWeekdayRates(buildDailySeries([h], TODAY, 30), TODAY);
    const byDay = Object.fromEntries(rates.map((r) => [r.weekday, r]));

    expect(byDay[1]).toMatchObject({ completed: 2, required: 2, rate: 100 });
    expect(byDay[2]).toMatchObject({ completed: 1, required: 2, rate: 50 });
    // Thứ 6: chỉ có 09/10 (hôm nay 16/10 bị loại)
    expect(byDay[5]).toMatchObject({ completed: 0, required: 1, rate: 0 });
    // CN: chỉ có 11/10
    expect(byDay[0]).toMatchObject({ required: 1 });
  });

  it("trả về null khi thứ đó chưa có dữ liệu", () => {
    const rates = calculateWeekdayRates(buildDailySeries([monWedFri()], TODAY, 30), TODAY);
    expect(rates.find((r) => r.weekday === 2)?.rate).toBeNull();
  });
});

describe("summarizeSeries", () => {
  it("tổng hợp số lần hoàn thành, ngày hoàn hảo và tỷ lệ chung (không tính hôm nay)", () => {
    const habits = [
      habit({
        createdDate: "2026-10-13",
        logs: [
          { date: "2026-10-13", status: "COMPLETED" },
          { date: "2026-10-14", status: "COMPLETED" },
          { date: TODAY, status: "COMPLETED" },
        ],
      }),
      habit({ createdDate: "2026-10-13", logs: [{ date: "2026-10-13", status: "COMPLETED" }] }),
    ];
    const summary = summarizeSeries(buildDailySeries(habits, TODAY, 10), TODAY);

    expect(summary.totalCompleted).toBe(4);
    expect(summary.activeDays).toBe(3);
    expect(summary.perfectDays).toBe(1); // 13/10
    // 13–15/10: 3 hoàn thành / 6 cần làm
    expect(summary.overallRate).toBe(50);
  });

  it("overallRate là null khi chưa có dữ liệu", () => {
    expect(summarizeSeries(buildDailySeries([], TODAY, 10), TODAY).overallRate).toBeNull();
  });
});
