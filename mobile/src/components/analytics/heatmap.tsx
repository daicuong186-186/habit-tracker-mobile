import { getDay, getMonth } from 'date-fns';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { AppText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { heatLevel, type DayCell } from '@/shared/analytics';
import { WEEKDAY_LONG } from '@/shared/habit-options';
import { parseDateKey } from '@/shared/streak';

const CELL = 13;
const GAP = 3;
const LEVEL_ALPHA = ['', '4d', '80', 'bf', 'ff']; // 30%, 50%, 75%, 100%
const ROW_LABELS = ['T2', '', 'T4', '', 'T6', '', ''];

function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${WEEKDAY_LONG[getDay(parseDateKey(date))]}, ${d}/${m}/${y}`;
}

function describeCell(cell: DayCell, mode: 'all' | 'single'): string {
  if (cell.required === 0) return cell.skipped > 0 ? 'Nghỉ có phép' : 'Không có thói quen cần làm';
  if (mode === 'single') return cell.completed > 0 ? 'Đã hoàn thành' : 'Chưa hoàn thành';
  const percent = Math.round((cell.rate ?? 0) * 100);
  const skipped = cell.skipped > 0 ? ` • ${cell.skipped} nghỉ có phép` : '';
  return `${cell.completed}/${cell.required} thói quen • ${percent}%${skipped}`;
}

/** Bản đồ nhiệt kiểu GitHub: mỗi cột là một tuần (T2 → CN), độ đậm theo tỷ lệ hoàn thành. */
export function Heatmap({
  cells,
  today,
  color,
  mode,
}: {
  cells: DayCell[];
  today: string;
  color: string;
  mode: 'all' | 'single';
}) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [selected, setSelected] = useState<DayCell | null>(null);

  // Đệm đầu/cuối để mỗi cột là một tuần bắt đầu từ Thứ 2
  const leading = cells.length > 0 ? (getDay(parseDateKey(cells[0].date)) + 6) % 7 : 0;
  const slots: (DayCell | null)[] = [...Array<null>(leading).fill(null), ...cells];
  while (slots.length % 7 !== 0) slots.push(null);
  const weeks = Array.from({ length: slots.length / 7 }, (_, i) => slots.slice(i * 7, i * 7 + 7));

  const monthLabels = weeks.map((week) => {
    const first = week.find((c) => c && c.date.endsWith('-01'));
    return first ? `Th${getMonth(parseDateKey(first.date)) + 1}` : '';
  });

  function cellColor(cell: DayCell): string | undefined {
    const level = heatLevel(cell.rate);
    if (level <= 0) return level === 0 ? theme.muted : undefined;
    return `${color}${LEVEL_ALPHA[mode === 'single' ? 4 : level]}`;
  }

  const activeDays = cells.filter((c) => c.completed > 0).length;

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.rowLabels}>
          {ROW_LABELS.map((label, i) => (
            <AppText key={i} variant="caption" secondary style={styles.rowLabel}>
              {label}
            </AppText>
          ))}
        </View>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          // Cuộn về cuối để thấy các tuần gần nhất
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          accessibilityLabel={`Bản đồ nhiệt ${cells.length} ngày: có hoạt động trong ${activeDays} ngày`}>
          <View>
            <View style={styles.months}>
              {monthLabels.map((label, i) => (
                <View key={i} style={styles.monthSlot}>
                  {label !== '' && (
                    <AppText variant="caption" secondary style={styles.monthText}>
                      {label}
                    </AppText>
                  )}
                </View>
              ))}
            </View>
            <View style={styles.weeks}>
              {weeks.map((week, w) => (
                <View key={w} style={styles.week}>
                  {week.map((cell, d) =>
                    cell ? (
                      <Pressable
                        key={cell.date}
                        onPress={() => setSelected(cell)}
                        hitSlop={2}
                        style={[
                          styles.cell,
                          { backgroundColor: cellColor(cell) },
                          heatLevel(cell.rate) === -1 && {
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: cell.skipped > 0 ? color : theme.border,
                            borderStyle: cell.skipped > 0 ? 'dashed' : 'solid',
                          },
                          (cell.date === today || cell.date === selected?.date) && {
                            borderWidth: 2,
                            borderColor: theme.text,
                          },
                        ]}
                      />
                    ) : (
                      <View key={`pad-${d}`} style={styles.cell} />
                    ),
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={[styles.detail, { backgroundColor: theme.muted }]}>
        {selected ? (
          <>
            <AppText variant="label">{formatDate(selected.date)}</AppText>
            <AppText variant="caption" secondary>
              {describeCell(selected, mode)}
            </AppText>
          </>
        ) : (
          <AppText variant="caption" secondary>
            Chạm vào một ô để xem chi tiết ngày đó.
          </AppText>
        )}
      </View>

      <View style={styles.legend}>
        <LegendItem label="Không cần làm" swatch={{ borderWidth: 1, borderColor: theme.border }} />
        <LegendItem label="Nghỉ có phép" swatch={{ borderWidth: 1, borderColor: color, borderStyle: 'dashed' }} />
        {mode === 'all' ? (
          <View style={styles.legendItem}>
            <AppText variant="caption" secondary>
              Ít
            </AppText>
            <View style={[styles.swatch, { backgroundColor: theme.muted }]} />
            {LEVEL_ALPHA.slice(1).map((alpha) => (
              <View key={alpha} style={[styles.swatch, { backgroundColor: `${color}${alpha}` }]} />
            ))}
            <AppText variant="caption" secondary>
              Nhiều
            </AppText>
          </View>
        ) : (
          <>
            <LegendItem label="Chưa làm" swatch={{ backgroundColor: theme.muted }} />
            <LegendItem label="Hoàn thành" swatch={{ backgroundColor: color }} />
          </>
        )}
      </View>
    </View>
  );
}

function LegendItem({ label, swatch }: { label: string; swatch: object }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, swatch]} />
      <AppText variant="caption" secondary>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.one },
  rowLabels: { paddingTop: 16, gap: GAP },
  rowLabel: { height: CELL, fontSize: 9, lineHeight: CELL },
  months: { flexDirection: 'row', gap: GAP, height: 16 },
  monthSlot: { width: CELL, overflow: 'visible' },
  monthText: { fontSize: 9, width: 30 },
  weeks: { flexDirection: 'row', gap: GAP },
  week: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  detail: { borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, minHeight: 44, justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, justifyContent: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
