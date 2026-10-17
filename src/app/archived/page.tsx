import { Suspense } from "react";
import type { Metadata } from "next";
import { getArchivedHabits } from "@/actions/habit-actions";
import { ArchivedList } from "@/components/habits/ArchivedList";

export const metadata: Metadata = {
  title: "Lưu trữ • Habit Tracker",
};

export default function ArchivedPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Thói quen đã lưu trữ</h1>
        <p className="text-sm text-muted-foreground">
          Thói quen lưu trữ không xuất hiện ở Dashboard và Thống kê, nhưng lịch sử vẫn được giữ nguyên.
        </p>
      </header>
      {/* cacheComponents: dữ liệu DB theo request phải nằm trong Suspense */}
      <Suspense fallback={<ArchivedSkeleton />}>
        <ArchivedLoader />
      </Suspense>
    </main>
  );
}

async function ArchivedLoader() {
  const habits = await getArchivedHabits();
  return <ArchivedList habits={habits} />;
}

function ArchivedSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
