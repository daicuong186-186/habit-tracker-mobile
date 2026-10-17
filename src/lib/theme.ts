// Theme sáng/tối/theo hệ thống, lưu trong localStorage và áp dụng bằng class "dark" trên <html>.

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "themechange";

/**
 * Script chạy đồng bộ trong <head> trước lần vẽ đầu tiên để không bị nháy theme.
 * Giữ logic khớp với applyTheme() bên dưới.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Không lưu được (chế độ riêng tư...) — vẫn áp dụng cho phiên hiện tại
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
