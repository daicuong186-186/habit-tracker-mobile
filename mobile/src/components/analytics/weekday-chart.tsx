import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WeekdayRate } from '@/shared/analytics';
import { WEEKDAY_LONG, WEEKDAY_SHORT } from '@/shared/habit-options';

const PLOT_HEIGHT = 180;
const TICKS = [100, 75, 50, 25, 0];

/** Biểu đồ cột tỷ lệ hoàn thành theo thứ (T2 → CN). Một chuỗi dữ liệu → một màu. */
export function WeekdayChart({ rates, color }: { rates: WeekdayRate[]; color: string }) {
  const theme = useTheme();
  const [selected, setSelected] = useState<WeekdayRate | null>(null);

  return (
    <View style={styles.root}>
      <View style={styles.chart}>
        <View style={styles.yAxis}>
          {TICKS.map((t) => (
            <AppText key={t} variant="caption" secondary style={styles.tick}>
              {t}%
            </AppText>
          ))}
        </View>
        <View style={styles.plot}>
          {TICKS.map((t) => (
            <View
              key={t}
              style={[styles.gridLine, { top: PLOT_HEIGHT * (1 - t / 100), backgroundColor: theme.border }]}
            />
          ))}
          <View style={styles.bars}>
            {rates.map((r) => (
              <Pressable
                key={r.weekday}
                onPress={() => setSelected(r)}
                accessibilityRole="button"
                accessibilityLabel={`${WEEKDAY_LONG[r.weekday]}: ${r.rate === null ? 'chưa có dữ liệu' : `${r.rate}%`}`}
                style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(r.rate ?? 0, 0) * (PLOT_HEIGHT / 100),
                      backgroundColor: color,
                      opacity: selected && selected.weekday !== r.weekday ? 0.45 : 1,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.xAxis}>
        {rates.map((r) => (
          <AppText key={r.weekday} variant="caption" secondary style={styles.xLabel}>
            {WEEKDAY_SHORT[r.weekday]}
          </AppText>
        ))}
      </View>

      <View style={[styles.detail, { backgroundColor: theme.muted }]}>
        <AppText variant="caption" secondary>
          {selected
            ? `${WEEKDAY_LONG[selected.weekday]}: ${
                selected.rate === null
                  ? 'chưa có dữ liệu'
                  : `${selected.rate}% • ${selected.completed}/${selected.required} lượt hoàn thành`
              }`
            : 'Chạm vào một cột để xem chi tiết.'}
        </AppText>
      </View>
    </View>
  );
}

const Y_AXIS_WIDTH = 38;

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  chart: { flexDirection: 'row', height: PLOT_HEIGHT },
  yAxis: { width: Y_AXIS_WIDTH, justifyContent: 'space-between', marginTop: -7, marginBottom: -7 },
  tick: { fontSize: 10, lineHeight: 14 },
  plot: { flex: 1 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', maxWidth: 36, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  xAxis: { flexDirection: 'row', marginLeft: Y_AXIS_WIDTH, gap: Spacing.two },
  xLabel: { flex: 1, textAlign: 'center' },
  detail: { borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, minHeight: 36, justifyContent: 'center' },
});
