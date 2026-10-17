"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BarChart3, CircleCheck, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Hôm nay", icon: ListChecks },
  { href: "/analytics", label: "Thống kê", icon: BarChart3 },
  { href: "/archived", label: "Lưu trữ", icon: Archive },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <nav className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-2 px-4">
        {/* Ẩn logo trên mobile để đủ chỗ cho 3 tab */}
        <Link href="/" className="hidden items-center gap-2 font-semibold sm:flex">
          <CircleCheck className="size-5 text-emerald-500" />
          <span>Habit Tracker</span>
        </Link>
        <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-3",
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </div>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
