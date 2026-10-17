import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'habit-tracker.db';

/** Tăng số này và thêm nhánh migration bên dưới mỗi khi đổi schema. */
const DATABASE_VERSION = 1;

/**
 * Chạy trong <SQLiteProvider onInit>, trước khi UI render.
 * Schema giống bản web (prisma/schema.prisma) để dữ liệu có thể trao đổi qua lại.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // foreign_keys là thiết lập theo từng kết nối nên phải bật mỗi lần mở DB (cần cho ON DELETE CASCADE)
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = result?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS Habit (
        id            TEXT PRIMARY KEY NOT NULL,
        title         TEXT NOT NULL,
        description   TEXT,
        icon          TEXT NOT NULL DEFAULT 'CheckCircle2',
        color         TEXT NOT NULL DEFAULT '#10b981',
        frequencyType TEXT NOT NULL DEFAULT 'DAILY',
        targetDays    TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
        archived      INTEGER NOT NULL DEFAULT 0,
        createdAt     TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS HabitLog (
        id        TEXT PRIMARY KEY NOT NULL,
        habitId   TEXT NOT NULL REFERENCES Habit(id) ON DELETE CASCADE,
        date      TEXT NOT NULL,
        status    TEXT NOT NULL,
        note      TEXT,
        createdAt TEXT NOT NULL,
        UNIQUE (habitId, date)
      );
      CREATE INDEX IF NOT EXISTS HabitLog_date_idx ON HabitLog(date);
    `);
    currentVersion = 1;
  }

  // if (currentVersion === 1) { ...migration v2...; currentVersion = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
