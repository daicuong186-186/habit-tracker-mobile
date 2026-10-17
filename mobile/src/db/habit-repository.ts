import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { HabitData, StatusData } from '@/shared/habit-validation';
import { parseTargetDays, toDateKey, type FrequencyType, type LogStatus } from '@/shared/streak';

export interface HabitLog {
  date: string;
  status: LogStatus;
  note: string | null;
}

export interface Habit {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  /** 0 = CN ... 6 = T7 */
  targetDays: number[];
  archived: boolean;
  /** ISO timestamp */
  createdAt: string;
  /** Ngày tạo "YYYY-MM-DD" theo giờ local */
  createdDate: string;
  logs: HabitLog[];
}

interface HabitRow {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  frequencyType: string;
  targetDays: string;
  archived: number;
  createdAt: string;
}

interface LogRow {
  habitId: string;
  date: string;
  status: string;
  note: string | null;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function toHabit(row: HabitRow, logs: HabitLog[]): Habit {
  const frequencyType: FrequencyType = row.frequencyType === 'SPECIFIC_DAYS' ? 'SPECIFIC_DAYS' : 'DAILY';
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    color: row.color,
    frequencyType,
    targetDays: frequencyType === 'DAILY' ? ALL_DAYS : parseTargetDays(row.targetDays),
    archived: row.archived === 1,
    createdAt: row.createdAt,
    createdDate: toDateKey(new Date(row.createdAt)),
    logs,
  };
}

/** Đọc toàn bộ thói quen (kể cả đã lưu trữ) kèm lịch sử log, sắp theo ngày tạo. */
export async function loadHabits(db: SQLiteDatabase): Promise<Habit[]> {
  const [habitRows, logRows] = await Promise.all([
    db.getAllAsync<HabitRow>('SELECT * FROM Habit ORDER BY createdAt ASC'),
    db.getAllAsync<LogRow>('SELECT habitId, date, status, note FROM HabitLog ORDER BY date ASC'),
  ]);

  const logsByHabit = new Map<string, HabitLog[]>();
  for (const row of logRows) {
    if (row.status !== 'COMPLETED' && row.status !== 'SKIPPED') continue;
    const list = logsByHabit.get(row.habitId) ?? [];
    list.push({ date: row.date, status: row.status, note: row.note });
    logsByHabit.set(row.habitId, list);
  }

  return habitRows.map((row) => toHabit(row, logsByHabit.get(row.id) ?? []));
}

export async function insertHabit(db: SQLiteDatabase, data: HabitData): Promise<Habit> {
  const row: HabitRow = {
    id: randomUUID(),
    ...data,
    archived: 0,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    `INSERT INTO Habit (id, title, description, icon, color, frequencyType, targetDays, archived, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.title,
    row.description,
    row.icon,
    row.color,
    row.frequencyType,
    row.targetDays,
    row.archived,
    row.createdAt,
  );
  return toHabit(row, []);
}

export async function updateHabitRow(db: SQLiteDatabase, id: string, data: HabitData): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE Habit SET title = ?, description = ?, icon = ?, color = ?, frequencyType = ?, targetDays = ?
     WHERE id = ?`,
    data.title,
    data.description,
    data.icon,
    data.color,
    data.frequencyType,
    data.targetDays,
    id,
  );
  return result.changes > 0;
}

export async function deleteHabitRow(db: SQLiteDatabase, id: string): Promise<boolean> {
  // HabitLog bị xóa theo nhờ ON DELETE CASCADE (PRAGMA foreign_keys = ON trong migrateDbIfNeeded)
  const result = await db.runAsync('DELETE FROM Habit WHERE id = ?', id);
  return result.changes > 0;
}

export async function setHabitArchived(db: SQLiteDatabase, id: string, archived: boolean): Promise<boolean> {
  const result = await db.runAsync('UPDATE Habit SET archived = ? WHERE id = ?', archived ? 1 : 0, id);
  return result.changes > 0;
}

/**
 * Đặt trạng thái của thói quen trong một ngày (tương đương toggleHabitStatus của bản web).
 * - status = null: xóa log ngày đó.
 * - COMPLETED / SKIPPED: upsert; note === undefined thì giữ nguyên ghi chú cũ.
 */
export async function upsertHabitLog(db: SQLiteDatabase, habitId: string, date: string, data: StatusData) {
  if (data.status === null) {
    await db.runAsync('DELETE FROM HabitLog WHERE habitId = ? AND date = ?', habitId, date);
    return;
  }

  const keepNote = data.note === undefined;
  await db.runAsync(
    `INSERT INTO HabitLog (id, habitId, date, status, note, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(habitId, date) DO UPDATE SET
       status = excluded.status,
       note = CASE WHEN ? THEN HabitLog.note ELSE excluded.note END`,
    randomUUID(),
    habitId,
    date,
    data.status,
    data.note ?? null,
    new Date().toISOString(),
    keepNote ? 1 : 0,
  );
}
