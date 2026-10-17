import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/database';
import { HabitsProvider } from '@/state/habits-store';

// Giữ splash cho đến khi HabitsProvider đọc xong dữ liệu từ SQLite
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Dữ liệu lưu hoàn toàn trên máy (offline) trong file SQLite */}
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <HabitsProvider>
          <AppTabs />
        </HabitsProvider>
      </SQLiteProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
