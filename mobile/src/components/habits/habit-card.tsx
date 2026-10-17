import { CalendarDays, Check, CirclePause, Ellipsis, Flame, StickyNote, Trophy } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { HabitIcon, tint } from '@/components/habit-icon';
import { AppText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { Habit, HabitLog } from '@/db/habit-repository';
import { useTheme } from '@/hooks/use-theme';
import { formatSchedule } from '@/shared/habit-options';
import type { HabitStats } from '@/shared/streak';

export function HabitCard({
  habit,
  stats,
  log,
  offDay = false,
  onToggle,
  onOpenMenu,
  onOpenNote,
}: {
  habit: Habit;
  stats: HabitStats;
  /** Log của ngày đang chọn (nếu có) */
  log?: HabitLog;
  /** Không cần làm trong ngày đang chọn */
  offDay?: boolean;
  onToggle: () => void;
  onOpenMenu: () => void;
  onOpenNote: () => void;
}) {
  const theme = useTheme();
  const isCompleted = log?.status === 'COMPLETED';
  const isSkipped = log?.status === 'SKIPPED';

  return (
    <Pressable
      onLongPress={onOpenMenu}
      accessibilityHint="Nhấn giữ để mở tùy chọn"
      style={[
        styles.card,
        {
          backgroundColor: isCompleted ? tint(habit.color, '14') : isSkipped ? theme.muted : theme.card,
          borderColor: theme.border,
          borderLeftColor: habit.color,
          opacity: offDay && !log ? 0.75 : 1,
        },
      ]}>
      <View style={[styles.iconBox, { backgroundColor: tint(habit.color) }]}>
        <HabitIcon name={habit.icon} size={22} color={habit.color} />
      </View>

      <View style={styles.body}>
        <AppText
          variant="heading"
          numberOfLines={1}
          style={isCompleted && {
            color: theme.textSecondary,
            textDecorationLine: 'line-through',
            textDecorationColor: habit.color,
          }}>
          {habit.title}
        </AppText>
        {habit.description && (
          <AppText variant="label" secondary numberOfLines={2} style={styles.normalWeight}>
            {habit.description}
          </AppText>
        )}

        <View style={styles.meta}>
          <View
            style={[
              styles.streakBadge,
              { backgroundColor: stats.currentStreak > 0 ? theme.streakSoft : theme.muted },
            ]}
            accessibilityLabel={`Chuỗi hiện tại ${stats.currentStreak} ngày`}>
            <Flame
              size={13}
              color={stats.currentStreak > 0 ? theme.streak : theme.textSecondary}
              fill={stats.currentStreak > 0 ? '#fb923c' : 'transparent'}
            />
            <AppText
              variant="caption"
              style={[styles.bold, { color: stats.currentStreak > 0 ? theme.streak : theme.textSecondary }]}>
              {stats.currentStreak} ngày
            </AppText>
          </View>
          <View style={styles.metaItem} accessibilityLabel={`Kỷ lục ${stats.bestStreak} ngày`}>
            <Trophy size={13} color={theme.textSecondary} />
            <AppText variant="caption" secondary>
              Kỷ lục {stats.bestStreak}
            </AppText>
          </View>
          <AppText variant="caption" secondary>
            {stats.completionRate}% / 30 ngày
          </AppText>
          <View style={styles.metaItem}>
            <CalendarDays size={13} color={theme.textSecondary} />
            <AppText variant="caption" secondary>
              {formatSchedule(habit.frequencyType, habit.targetDays)}
            </AppText>
          </View>
        </View>

        {(isSkipped || log?.note) && (
          <View style={styles.meta}>
            {isSkipped && (
              <View style={[styles.streakBadge, { backgroundColor: theme.skippedSoft }]}>
                <CirclePause size={13} color={theme.skipped} />
                <AppText variant="caption" style={{ color: theme.skipped, fontWeight: '500' }}>
                  Nghỉ có phép
                </AppText>
              </View>
            )}
            {log?.note && (
              <Pressable onPress={onOpenNote} style={[styles.metaItem, styles.flexShrink]}>
                <StickyNote size={13} color={theme.textSecondary} />
                <AppText variant="caption" secondary numberOfLines={1} style={styles.italic}>
                  {log.note}
                </AppText>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ checked: isCompleted }}
          accessibilityLabel={isCompleted ? `Bỏ đánh dấu hoàn thành "${habit.title}"` : `Đánh dấu hoàn thành "${habit.title}"`}
          hitSlop={6}
          style={({ pressed }) => [
            styles.check,
            isCompleted
              ? { backgroundColor: habit.color, borderColor: habit.color }
              : { borderColor: isSkipped ? theme.border : tint(habit.color, '80'), backgroundColor: theme.card },
            pressed && styles.pressed,
          ]}>
          {isSkipped ? (
            <CirclePause size={22} color={theme.textSecondary} />
          ) : (
            <Check
              size={26}
              strokeWidth={3}
              color={isCompleted ? '#ffffff' : habit.color}
              style={{ opacity: isCompleted ? 1 : 0.3 }}
            />
          )}
        </Pressable>
        <Pressable onPress={onOpenMenu} accessibilityLabel={`Tùy chọn cho "${habit.title}"`} hitSlop={10}>
          <Ellipsis size={20} color={theme.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
  },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  normalWeight: { fontWeight: '400' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  flexShrink: { flexShrink: 1 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  actions: { alignItems: 'center', gap: Spacing.two },
  check: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.9 }] },
});
