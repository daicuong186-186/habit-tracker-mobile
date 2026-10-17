"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeekdayRate } from "@/lib/analytics";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/habit-options";

interface WeekdayChartProps {
  rates: WeekdayRate[];
  color: string;
}

interface ChartDatum extends WeekdayRate {
  label: string;
  value: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartDatum }[] }) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="rounded-lg bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="font-medium">{WEEKDAY_LONG[datum.weekday]}</p>
      <p className="text-muted-foreground">
        {datum.rate === null
          ? "Chưa có dữ liệu"
          : `${datum.rate}% • ${datum.completed}/${datum.required} lượt hoàn thành`}
      </p>
    </div>
  );
}

export function WeekdayChart({ rates, color }: WeekdayChartProps) {
  const data: ChartDatum[] = rates.map((r) => ({ ...r, label: WEEKDAY_SHORT[r.weekday], value: r.rate ?? 0 }));

  return (
    <div>
      <div className="h-56 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Tỷ lệ hoàn thành theo thứ trong tuần</caption>
        <thead>
          <tr>
            <th scope="col">Thứ</th>
            <th scope="col">Tỷ lệ</th>
            <th scope="col">Hoàn thành / Cần làm</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.weekday}>
              <th scope="row">{WEEKDAY_LONG[r.weekday]}</th>
              <td>{r.rate === null ? "Chưa có dữ liệu" : `${r.rate}%`}</td>
              <td>
                {r.completed}/{r.required}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
