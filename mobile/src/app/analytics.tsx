import { BarChart3, Flame, Trophy } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Heatmap } from '@/components/analytics/heatmap';
import { WeekdayChart } from '@/components/analytics/weekday-chart';
import { HabitIcon, tint } from '@/components/habit-icon';
import { AppText, Card, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { Habit } from '@/db/habit-repository';
import { useTheme } from '@/hooks/use-theme';
import { useHabits } from '@/state/habits-store';
import {
  HEATMAP_DAYS,
  buildDailySeries,
  calculateWeekdayRates,
  summarizeSeries,
  type WeekdayRate,
} from '@/shared/analytics';
import { DEFAULT_HABIT_COLOR, WEEKDAY_LONG } from '@/shared/habit-options';

function describeWeekdays(rates: WeekdayRate[]): string | null {
  const known = rates.filter((r): r is WeekdayRate & { rate: number } => r.rate !== null);
  if (known.length < 2) return null;
  const best = known.reduce((a, b) => (b.rate > a.rate ? b : a));
  const worst = known.reduce((a, b) => (b.rate < a.rate ? b : a));
  if (best.rate === worst.rate) return `Bạn duy trì đều đặn ${best.rate}% ở mọi ngày trong tuần.`;
  return `Bạn làm tốt nhất vào ${WEEKDAY_LONG[best.weekday]} (${best.rate}%) và cần cố gắng hơn vào ${WEEKDAY_LONG[worst.weekday]} (${worst.rate}%).`;
}

export default function AnalyticsScreen() {
  const theme = useTheme();
  const { activeHabits: habits, statsById, today } = useHabits();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = habits.find((h) => h.id === selectedId) ?? null;
  const scope = useMemo(() => (selected ? [selected] : habits), [selected, habits]);
  const color = selected?.color ?? DEFAULT_HABIT_COLOR;

  const cells = useMemo(() => buildDailySeries(scope, today, HEATMAP_DAYS), [scope, today]);
  const weekdayRates = useMemo(() => calculateWeekdayRates(cells, today), [cells, today]);
  const summary = useMemo(() => summarizeSeries(cells, today), [cells, today]);
  const insight = describeWeekdays(weekdayRates);

  const statsOf = (h: Habit) => statsById.get(h.id)!;
  const topStreak = scope.reduce<Habit | null>(
    (best, h) => (!best || statsOf(h).currentStreak > statsOf(best).currentStreak ? h : best),
    null,
  );

  if (habits.length === 0) {
    return (
      <Screen title="Thống kê">
        <View style={[styles.empty, { borderColor: theme.border }]}>
          <BarChart3 size={36} color={theme.textSecondary} />
          <AppText variant="heading">Chưa có dữ liệu thống kê</AppText>
          <AppText secondary style={styles.center}>
            Tạo thói quen và check-in mỗi ngày để xem bản đồ nhiệt và xu hướng của bạn.
          </AppText>
        </View>
      </Screen>
    );
  }

  const tiles = [
    { label: 'Lượt hoàn thành', value: summary.totalCompleted.toString(), hint: `${HEATMAP_DAYS} ngày qua` },
    {
      label: 'Tỷ lệ hoàn thành',
      value: summary.overallRate === null ? '—' : `${summary.overallRate}%`,
      hint: 'Không tính ngày nghỉ',
    },
    { label: 'Ngày hoàn hảo', value: summary.perfectDays.toString(), hint: 'Đạt 100% thói quen' },
    selected
      ? {
          label: 'Kỷ lục chuỗi',
          value: `${statsOf(selected).bestStreak} ngày`,
          hint: `Hiện tại: ${statsOf(selected).currentStreak} ngày`,
        }
      : {
          label: 'Chuỗi dài nhất',
          value: `${topStreak ? statsOf(topStreak).currentStreak : 0} ngày`,
          hint: topStreak && statsOf(topStreak).currentStreak > 0 ? topStreak.title : 'Bắt đầu chuỗi mới!',
        },
  ];

  return (
    <Screen title="Thống kê" subtitle="Hành trình một năm qua">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Tất cả" active={selected === null} onPress={() => setSelectedId(null)} />
        {habits.map((h) => (
          <Chip key={h.id} label={h.title} dot={h.color} active={h.id === selectedId} onPress={() => setSelectedId(h.id)} />
        ))}
      </ScrollView>

      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <Card key={tile.label} style={styles.tile}>
            <AppText variant="caption" secondary>
              {tile.label}
            </AppText>
            <AppText variant="title" style={styles.tileValue}>
              {tile.value}
            </AppText>
            <AppText variant="caption" secondary numberOfLines={1}>
              {tile.hint}
            </AppText>
          </Card>
        ))}
      </View>

      <Card style={styles.section}>
        <AppText variant="heading">Bản đồ nhiệt {HEATMAP_DAYS} ngày</AppText>
        <AppText variant="label" secondary style={styles.normal}>
          {selected ? `Lịch sử check-in của "${selected.title}".` : 'Mỗi ô là tỷ lệ hoàn thành các thói quen trong ngày.'}
        </AppText>
        <Heatmap key={selectedId ?? 'all'} cells={cells} today={today} color={color} mode={selected ? 'single' : 'all'} />
      </Card>

      <Card style={styles.section}>
        <AppText variant="heading">Tỷ lệ hoàn thành theo thứ</AppText>
        <AppText variant="label" secondary style={styles.normal}>
          {insight ?? 'Cần thêm dữ liệu để so sánh các ngày trong tuần.'}
        </AppText>
        <WeekdayChart key={selectedId ?? 'all'} rates={weekdayRates} color={color} />
      </Card>

      {!selected && (
        <Card style={styles.section}>
          <AppText variant="heading">Theo từng thói quen</AppText>
          {habits.map((h, i) => (
            <Pressable
              key={h.id}
              onPress={() => setSelectedId(h.id)}
              style={[styles.habitRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
              <View style={[styles.habitIcon, { backgroundColor: tint(h.color) }]}>
                <HabitIcon name={h.icon} size={16} color={h.color} />
              </View>
              <AppText numberOfLines={1} style={styles.flex}>
                {h.title}
              </AppText>
              <Flame size={14} color={statsOf(h).currentStreak > 0 ? theme.streak : theme.textSecondary} />
              <AppText variant="caption" secondary>
                {statsOf(h).currentStreak}
              </AppText>
              <Trophy size={14} color={theme.textSecondary} />
              <AppText variant="caption" secondary>
                {statsOf(h).bestStreak}
              </AppText>
              <AppText variant="caption" style={styles.rate}>
                {statsOf(h).completionRate}%
              </AppText>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Chip({ label, active, dot, onPress }: { label: string; active: boolean; dot?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        active ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border },
      ]}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <AppText variant="label" numberOfLines={1} style={{ color: active ? theme.primaryText : theme.textSecondary }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  normal: { fontWeight: '400', marginBottom: Spacing.two },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
  },
  chips: { gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 200,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tile: { flexGrow: 1, flexBasis: '45%', gap: 2 },
  tileValue: { fontSize: 24 },
  section: { gap: Spacing.one },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  habitIcon: { width: 30, height: 30, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  rate: { width: 40, textAlign: 'right', fontWeight: '700' },
});
