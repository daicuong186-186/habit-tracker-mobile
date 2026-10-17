import { Suspense } from "react";
import type { Metadata } from "next";
import { getDashboardData } from "@/actions/habit-actions";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export const metadata: Metadata = {
  title: "Thống kê • Habit Tracker",
};

export default function AnalyticsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Thống kê</h1>
        <p className="text-sm text-muted-foreground">Nhìn lại hành trình xây dựng thói quen trong một năm qua.</p>
      </header>
      {/* cacheComponents: dữ liệu DB theo request phải nằm trong Suspense */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsLoader />
      </Suspense>
    </main>
  );
}

async function AnalyticsLoader() {
  const { habits, today } = await getDashboardData("");
  return <AnalyticsView habits={habits} today={today} />;
}

function AnalyticsSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true" aria-label="Đang tải">
      <div className="h-8 w-2/3 rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-52 rounded-2xl bg-muted" />
      <div className="h-72 rounded-2xl bg-muted" />
    </div>
  );
}
