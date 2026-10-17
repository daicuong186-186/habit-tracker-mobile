import { Archive, ArchiveRestore, CalendarDays, Trash2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { HabitIcon, tint } from '@/components/habit-icon';
import { AppText, Button, Card, ErrorBanner, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { Habit } from '@/db/habit-repository';
import { useTheme } from '@/hooks/use-theme';
import { useHabits } from '@/state/habits-store';
import { formatSchedule } from '@/shared/habit-options';

export default function ArchivedScreen() {
  const theme = useTheme();
  const { archivedHabits, statsById, archiveHabit, deleteHabit, error, clearError } = useHabits();
  const [restored, setRestored] = useState<string | null>(null);

  async function restore(habit: Habit) {
    const result = await archiveHabit(habit.id, false);
    if (result.ok) setRestored(habit.title);
  }

  function confirmDelete(habit: Habit) {
    Alert.alert('Xóa thói quen?', `"${habit.title}" cùng toàn bộ lịch sử check-in sẽ bị xóa vĩnh viễn.`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa vĩnh viễn', style: 'destructive', onPress: () => void deleteHabit(habit.id) },
    ]);
  }

  return (
    <Screen title="Đã lưu trữ" subtitle="Ẩn khỏi Hôm nay & Thống kê, lịch sử được giữ nguyên">
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      {restored && (
        <View style={[styles.notice, { backgroundColor: theme.successSoft }]}>
          <AppText style={{ color: theme.success }}>Đã khôi phục “{restored}” về danh sách hằng ngày.</AppText>
        </View>
      )}

      {archivedHabits.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.border }]}>
          <Archive size={32} color={theme.textSecondary} />
          <AppText variant="heading">Không có thói quen nào được lưu trữ</AppText>
          <AppText secondary style={styles.center}>
            Lưu trữ giúp tạm ẩn thói quen mà vẫn giữ nguyên lịch sử. Nhấn giữ một thẻ thói quen và chọn “Lưu trữ”.
          </AppText>
        </View>
      ) : (
        archivedHabits.map((habit) => {
          const stats = statsById.get(habit.id);
          const totalCompleted = habit.logs.filter((l) => l.status === 'COMPLETED').length;
          return (
            <Card key={habit.id} style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: tint(habit.color) }]}>
                  <HabitIcon name={habit.icon} size={20} color={habit.color} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading" numberOfLines={1}>
                    {habit.title}
                  </AppText>
                  <View style={styles.meta}>
                    <View style={styles.metaItem}>
                      <CalendarDays size={13} color={theme.textSecondary} />
                      <AppText variant="caption" secondary>
                        {formatSchedule(habit.frequencyType, habit.targetDays)}
                      </AppText>
                    </View>
                    <View style={styles.metaItem}>
                      <Trophy size={13} color={theme.textSecondary} />
                      <AppText variant="caption" secondary>
                        Kỷ lục {stats?.bestStreak ?? 0} ngày
                      </AppText>
                    </View>
                    <AppText variant="caption" secondary>
                      {totalCompleted} lượt hoàn thành
                    </AppText>
                  </View>
                </View>
              </View>
              <View style={styles.row}>
                <Button
                  label="Khôi phục"
                  variant="outline"
                  icon={<ArchiveRestore size={18} color={theme.text} />}
                  onPress={() => void restore(habit)}
                  style={styles.flex}
                />
                <Button
                  label="Xóa"
                  variant="destructive"
                  icon={<Trash2 size={18} color={theme.destructive} />}
                  onPress={() => confirmDelete(habit)}
                  style={styles.flex}
                />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  notice: { padding: Spacing.three, borderRadius: Radius.md },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
  },
  card: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
