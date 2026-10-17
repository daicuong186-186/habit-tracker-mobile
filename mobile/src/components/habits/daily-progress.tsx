import { PartyPopper } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function DailyProgress({
  completed,
  required,
  skipped,
}: {
  completed: number;
  /** Số thói quen cần làm trong ngày (không tính SKIPPED) */
  required: number;
  skipped: number;
}) {
  const theme = useTheme();
  const percent = required === 0 ? 0 : Math.min(100, Math.round((completed / required) * 100));
  const isComplete = required > 0 && completed >= required;

  return (
    <Card style={isComplete && { backgroundColor: theme.successSoft, borderColor: theme.success }}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="label" secondary>
            Tiến độ trong ngày
          </AppText>
          {required === 0 ? (
            <AppText secondary>Không có thói quen cần làm</AppText>
          ) : isComplete ? (
            <View style={styles.inline}>
              <PartyPopper size={16} color={theme.success} />
              <AppText style={{ color: theme.success, fontWeight: '600' }}>Tuyệt vời! Đã hoàn thành tất cả</AppText>
            </View>
          ) : (
            <AppText>
              Đã hoàn thành{' '}
              <AppText style={styles.bold}>
                {completed}/{required}
              </AppText>{' '}
              thói quen
            </AppText>
          )}
          {skipped > 0 && (
            <AppText variant="caption" secondary>
              {skipped} nghỉ có phép
            </AppText>
          )}
        </View>
        <AppText variant="title" style={isComplete && { color: theme.success }}>
          {percent}%
        </AppText>
      </View>

      <View
        style={[styles.track, { backgroundColor: theme.muted }]}
        accessibilityRole="progressbar"
        accessibilityLabel="Tiến độ hoàn thành trong ngày"
        accessibilityValue={{ min: 0, max: 100, now: percent }}>
        <View
          style={[styles.fill, { width: `${percent}%`, backgroundColor: isComplete ? theme.success : theme.primary }]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three, marginBottom: Spacing.three },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  bold: { fontWeight: '700' },
  track: { height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full },
});
