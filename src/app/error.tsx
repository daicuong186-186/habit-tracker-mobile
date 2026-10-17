"use client"; // Error boundary bắt buộc là Client Component

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Ở production, lỗi từ Server Component chỉ còn mã digest để đối chiếu với log server
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Không tải được dữ liệu</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Đã có lỗi xảy ra, có thể cơ sở dữ liệu đang tạm thời gặp sự cố. Hãy thử lại sau giây lát.
        </p>
        {digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Mã lỗi: {digest}</p>}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw />
          Thử lại
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
