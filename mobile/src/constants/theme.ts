/**
 * Bảng màu sáng/tối, tương đương các token neutral của bản web (shadcn).
 * App theo chế độ sáng/tối của hệ điều hành (app.json: userInterfaceStyle = "automatic").
 */

export const Colors = {
  light: {
    text: '#0a0a0a',
    textSecondary: '#737373',
    background: '#fafafa',
    card: '#ffffff',
    muted: '#f0f0f0',
    border: '#e5e5e5',
    primary: '#171717',
    primaryText: '#fafafa',
    destructive: '#dc2626',
    destructiveSoft: '#fee2e2',
    success: '#059669',
    successSoft: '#d1fae5',
    streak: '#ea580c',
    streakSoft: '#ffedd5',
    skipped: '#0369a1',
    skippedSoft: '#e0f2fe',
  },
  dark: {
    text: '#fafafa',
    textSecondary: '#a3a3a3',
    background: '#0a0a0a',
    card: '#171717',
    muted: '#262626',
    border: '#2e2e2e',
    primary: '#e5e5e5',
    primaryText: '#171717',
    destructive: '#f87171',
    destructiveSoft: '#3f1d1d',
    success: '#34d399',
    successSoft: '#063d2c',
    streak: '#fb923c',
    streakSoft: '#3d2410',
    skipped: '#7dd3fc',
    skippedSoft: '#0c2d40',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const MaxContentWidth = 720;
