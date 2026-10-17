"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  THEME_CHANGE_EVENT,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  readThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
];

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    applyTheme(readThemePreference()); // đồng bộ khi đổi theme ở tab khác
    onChange();
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Inline script áp dụng theme trước khi trình duyệt vẽ trang (tránh nháy sáng).
 * Trên client đổi type thành "text/plain" để React không cảnh báo về thẻ <script>.
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}

export function ThemeToggle() {
  // Server luôn trả "system"; client đọc localStorage nên không lệch khi hydrate
  const preference = useSyncExternalStore(subscribe, readThemePreference, () => "system" as const);

  // Khi theo hệ thống, cập nhật ngay khi người dùng đổi chế độ sáng/tối của OS
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Đổi giao diện sáng/tối" />}>
        {/* Icon chọn theo class "dark" trên <html> nên đúng ngay từ lần render đầu */}
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setThemePreference(value)}>
            <Icon />
            <span className="flex-1">{label}</span>
            {preference === value && <Check className="text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
