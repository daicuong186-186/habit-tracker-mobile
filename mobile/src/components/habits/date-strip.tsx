import { differenceInCalendarDays, format, getDay, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DayProgress } from '@/shared/analytics';
import { WEEKDAY_SHORT } from '@/shared/habit-options';
import { parseDateKey, toDateKey } from '@/shared/streak';

const DAYS_PER_PAGE = 7;

function weekOffsetOf(date: string, today: string): number {
  const diff = differenceInCalendarDays(parseDateKey(today), parseDateKey(date));
  return Math.max(0, Math.floor(diff / DAYS_PER_PAGE));
}

export function DateStrip({
  selectedDate,
  today,
  getDayProgress,
  onSelectDate,
}: {
  selectedDate: string;
  today: string;
  getDayProgress: (date: string) => DayProgress;
  onSelectDate: (date: string) => void;
}) {
  const theme = useTheme();
  const [weekOffset, setWeekOffset] = useState(() => weekOffsetOf(selectedDate, today));

  const end = subDays(parseDateKey(today), weekOffset * DAYS_PER_PAGE);
  const days = Array.from({ length: DAYS_PER_PAGE }, (_, i) => subDays(end, DAYS_PER_PAGE - 1 - i));
  const rangeLabel = `${format(days[0], 'dd/MM')} – ${format(days[DAYS_PER_PAGE - 1], 'dd/MM/yyyy')}`;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={() => setWeekOffset((w) => w + 1)} accessibilityLabel="Tuần trước" hitSlop={10}>
          <ChevronLeft size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <AppText variant="label" secondary>
            {rangeLabel}
          </AppText>
          {weekOffset > 0 && (
            <Pressable
              onPress={() => {
                setWeekOffset(0);
                onSelectDate(today);
              }}
              style={[styles.todayPill, { borderColor: theme.border }]}>
              <AppText variant="caption">Tuần này</AppText>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          accessibilityLabel="Tuần sau"
          hitSlop={10}
          style={{ opacity: weekOffset === 0 ? 0.3 : 1 }}>
          <ChevronRight size={22} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.days}>
        {days.map((day) => {
          const key = toDateKey(day);
          const isSelected = key === selectedDate;
          const isToday = key === today;
          const { completed, required } = getDayProgress(key);
          const isDone = required > 0 && completed >= required;
          const isPartial = completed > 0 && !isDone;
          const fg = isSelected ? theme.primaryText : theme.text;

          return (
            <Pressable
              key={key}
              onPress={() => onSelectDate(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${WEEKDAY_SHORT[getDay(day)]} ${format(day, 'dd/MM')}${isDone ? ', đã hoàn thành đủ' : ''}`}
              style={[
                styles.day,
                isSelected && { backgroundColor: theme.primary },
                !isSelected && isToday && { borderColor: theme.textSecondary, borderWidth: 1 },
              ]}>
              <AppText variant="caption" style={{ color: isSelected ? theme.primaryText : theme.textSecondary }}>
                {isToday ? 'Nay' : WEEKDAY_SHORT[getDay(day)]}
              </AppText>
              <AppText variant="heading" style={{ color: fg }}>
                {format(day, 'd')}
              </AppText>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isDone ? '#10b981' : isPartial ? '#f59e0b' : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  todayPill: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  days: { flexDirection: 'row', gap: Spacing.one },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
