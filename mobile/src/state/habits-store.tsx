import * as SplashScreen from 'expo-splash-screen';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  deleteHabitRow,
  insertHabit,
  loadHabits,
  setHabitArchived,
  updateHabitRow,
  upsertHabitLog,
  type Habit,
  type HabitLog,
} from '@/db/habit-repository';
import { validateHabitInput, validateStatusInput, type HabitInput } from '@/shared/habit-validation';
import {
  calculateHabitStats,
  parseDateKey,
  parseTargetDays,
  toDateKey,
  type HabitStats,
  type LogStatus,
} from '@/shared/streak';

export type ActionResult = { ok: true } | { ok: false; error: string };

interface HabitsContextValue {
  /** Mọi thói quen, kể cả đã lưu trữ */
  habits: Habit[];
  activeHabits: Habit[];
  archivedHabits: Habit[];
  /** Thống kê tính theo hôm nay (streak, kỷ lục, % 30 ngày) */
  statsById: Map<string, HabitStats>;
  /** Hôm nay "YYYY-MM-DD", tự cập nhật khi qua ngày hoặc khi mở lại app */
  today: string;
  loaded: boolean;
  error: string | null;
  clearError: () => void;
  createHabit: (input: HabitInput) => Promise<ActionResult>;
  updateHabit: (id: string, input: HabitInput) => Promise<ActionResult>;
  deleteHabit: (id: string) => Promise<ActionResult>;
  archiveHabit: (id: string, archived: boolean) => Promise<ActionResult>;
  setStatus: (habitId: string, date: string, status: LogStatus | null, note?: string) => Promise<ActionResult>;
}

const HabitsContext = createContext<HabitsContextValue | null>(null);

function errorMessage(error: unknown, fallback: string): string {
  console.error(error);
  return fallback;
}

function msUntilTomorrow(): number {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return tomorrow.getTime() - now.getTime() + 1000;
}

function applyLog(logs: HabitLog[], date: string, status: LogStatus | null, note: string | null | undefined) {
  const existing = logs.find((l) => l.date === date);
  const others = logs.filter((l) => l.date !== date);
  if (status === null) return others;
  const nextNote = note === undefined ? (existing?.note ?? null) : note;
  return [...others, { date, status, note: nextNote }].sort((a, b) => a.date.localeCompare(b.date));
}

export function HabitsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(() => toDateKey(new Date()));

  const reload = useCallback(async () => {
    try {
      setHabits(await loadHabits(db));
    } catch (e) {
      setError(errorMessage(e, 'Không đọc được dữ liệu. Hãy thử khởi động lại ứng dụng.'));
    } finally {
      setLoaded(true);
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  // "Hôm nay" đổi khi qua nửa đêm hoặc khi người dùng mở lại app sau một thời gian
  useEffect(() => {
    const refreshToday = () => setToday(toDateKey(new Date()));
    let timer = setTimeout(function tick() {
      refreshToday();
      timer = setTimeout(tick, msUntilTomorrow());
    }, msUntilTomorrow());
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refreshToday());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  /** Cập nhật giao diện ngay, ghi DB sau; lỗi thì đọc lại DB để quay về trạng thái đúng. */
  const mutate = useCallback(
    async (optimistic: (prev: Habit[]) => Habit[], write: () => Promise<boolean | void>, fallback: string) => {
      setError(null);
      setHabits(optimistic);
      try {
        if ((await write()) === false) {
          await reload();
          return { ok: false, error: 'Không tìm thấy thói quen.' } as const;
        }
        return { ok: true } as const;
      } catch (e) {
        const message = errorMessage(e, fallback);
        setError(message);
        await reload();
        return { ok: false, error: message } as const;
      }
    },
    [reload],
  );

  const createHabit = useCallback(
    async (input: HabitInput): Promise<ActionResult> => {
      const parsed = validateHabitInput(input);
      if (!parsed.ok) return parsed;
      try {
        const habit = await insertHabit(db, parsed.data);
        setHabits((prev) => [...prev, habit]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorMessage(e, 'Không thể tạo thói quen. Vui lòng thử lại.') };
      }
    },
    [db],
  );

  const updateHabit = useCallback(
    async (id: string, input: HabitInput): Promise<ActionResult> => {
      const parsed = validateHabitInput(input);
      if (!parsed.ok) return parsed;
      const { targetDays, ...rest } = parsed.data;
      return mutate(
        (prev) =>
          prev.map((h) =>
            h.id === id
              ? {
                  ...h,
                  ...rest,
                  targetDays: rest.frequencyType === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : parseTargetDays(targetDays),
                }
              : h,
          ),
        () => updateHabitRow(db, id, parsed.data),
        'Không thể cập nhật thói quen. Vui lòng thử lại.',
      );
    },
    [db, mutate],
  );

  const deleteHabit = useCallback(
    (id: string) =>
      mutate(
        (prev) => prev.filter((h) => h.id !== id),
        () => deleteHabitRow(db, id),
        'Không thể xóa thói quen. Vui lòng thử lại.',
      ),
    [db, mutate],
  );

  const archiveHabit = useCallback(
    (id: string, archived: boolean) =>
      mutate(
        (prev) => prev.map((h) => (h.id === id ? { ...h, archived } : h)),
        () => setHabitArchived(db, id, archived),
        'Không thể lưu trữ thói quen. Vui lòng thử lại.',
      ),
    [db, mutate],
  );

  const setStatus = useCallback(
    async (habitId: string, date: string, status: LogStatus | null, note?: string): Promise<ActionResult> => {
      const parsed = validateStatusInput(date, status, note, toDateKey(new Date()));
      if (!parsed.ok) {
        setError(parsed.error);
        return parsed;
      }
      const data = parsed.data;
      return mutate(
        (prev) =>
          prev.map((h) => (h.id === habitId ? { ...h, logs: applyLog(h.logs, date, data.status, data.note) } : h)),
        () => upsertHabitLog(db, habitId, date, data),
        'Không thể cập nhật trạng thái. Vui lòng thử lại.',
      );
    },
    [db, mutate],
  );

  const value = useMemo<HabitsContextValue>(() => {
    const todayDate = parseDateKey(today);
    return {
      habits,
      activeHabits: habits.filter((h) => !h.archived),
      archivedHabits: habits.filter((h) => h.archived),
      statsById: new Map(habits.map((h) => [h.id, calculateHabitStats(h, h.logs, todayDate)])),
      today,
      loaded,
      error,
      clearError: () => setError(null),
      createHabit,
      updateHabit,
      deleteHabit,
      archiveHabit,
      setStatus,
    };
  }, [habits, today, loaded, error, createHabit, updateHabit, deleteHabit, archiveHabit, setStatus]);

  return <HabitsContext value={value}>{children}</HabitsContext>;
}

export function useHabits(): HabitsContextValue {
  const context = use(HabitsContext);
  if (!context) throw new Error('useHabits phải được dùng bên trong <HabitsProvider>');
  return context;
}

const EMPTY_STATS: HabitStats = { currentStreak: 0, bestStreak: 0, completionRate: 0 };

export function useHabitStats(id: string): HabitStats {
  return useHabits().statsById.get(id) ?? EMPTY_STATS;
}
