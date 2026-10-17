import { Suspense } from "react";
import { getDashboardData } from "@/actions/habit-actions";
import { Dashboard } from "@/components/habits/Dashboard";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      {/* cacheComponents: dữ liệu theo request (searchParams, DB) phải nằm trong Suspense */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function DashboardLoader({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { date } = await searchParams;
  const data = await getDashboardData(typeof date === "string" ? date : "");
  return <Dashboard data={data} />;
}

function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true" aria-label="Đang tải">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-8 w-64 rounded bg-muted" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-muted" />
      </div>
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="h-20 rounded-2xl bg-muted" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
