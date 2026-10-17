"use client"; // Error boundary bắt buộc là Client Component

import { useEffect } from "react";
import { ThemeScript } from "@/components/ThemeToggle";
import "./globals.css";

// Thay thế root layout khi chính layout gặp lỗi, nên phải tự khai báo <html>, <body>, style và theme.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <title>Đã có lỗi xảy ra • Habit Tracker</title>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen items-center justify-center bg-background p-4 font-sans text-foreground antialiased">
        <main className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Ứng dụng gặp sự cố</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Đã có lỗi không mong muốn. Hãy thử tải lại trang.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
