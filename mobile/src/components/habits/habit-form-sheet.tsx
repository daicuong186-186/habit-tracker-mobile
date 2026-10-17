import { Check } from 'lucide-react-native';
import { createElement, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { HABIT_ICONS, tint } from '@/components/habit-icon';
import { AppText, Button, Sheet } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { Habit } from '@/db/habit-repository';
import { useTheme } from '@/hooks/use-theme';
import { useHabits } from '@/state/habits-store';
import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_ICON,
  HABIT_COLORS,
  HABIT_ICON_NAMES,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  isHabitIconName,
  type HabitIconName,
} from '@/shared/habit-options';
import { DESCRIPTION_MAX, TITLE_MAX, type HabitInput } from '@/shared/habit-validation';
import type { FrequencyType } from '@/shared/streak';

export function HabitFormSheet({
  visible,
  habit,
  onClose,
}: {
  visible: boolean;
  /** Có giá trị = chế độ sửa */
  habit: Habit | null;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={habit ? 'Chỉnh sửa thói quen' : 'Thêm thói quen mới'}>
      {/* key: reset state form mỗi lần mở cho thói quen khác */}
      {visible && <HabitForm key={habit?.id ?? 'new'} habit={habit} onDone={onClose} />}
    </Sheet>
  );
}

function HabitForm({ habit, onDone }: { habit: Habit | null; onDone: () => void }) {
  const theme = useTheme();
  const { createHabit, updateHabit } = useHabits();
  const [title, setTitle] = useState(habit?.title ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [icon, setIcon] = useState<HabitIconName>(
    habit && isHabitIconName(habit.icon) ? habit.icon : DEFAULT_HABIT_ICON,
  );
  const [color, setColor] = useState(habit?.color ?? DEFAULT_HABIT_COLOR);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(habit?.frequencyType ?? 'DAILY');
  const [targetDays, setTargetDays] = useState<number[]>(
    habit?.frequencyType === 'SPECIFIC_DAYS' ? habit.targetDays : [1, 2, 3, 4, 5],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputStyle = [styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }];

  function toggleDay(day: number) {
    setTargetDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b)));
  }

  async function submit() {
    const input: HabitInput = {
      title,
      description,
      icon,
      color,
      frequencyType,
      targetDays: frequencyType === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : targetDays,
    };
    setSaving(true);
    const result = habit ? await updateHabit(habit.id, input) : await createHabit(input);
    setSaving(false);
    if (result.ok) onDone();
    else setError(result.error);
  }

  return (
    <View style={styles.form}>
      <View style={[styles.preview, { backgroundColor: theme.muted }]}>
        <View style={[styles.previewIcon, { backgroundColor: tint(color) }]}>
          {createElement(HABIT_ICONS[icon], { size: 22, color })}
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={1}>
            {title.trim() || 'Tên thói quen'}
          </AppText>
          <AppText variant="caption" secondary numberOfLines={1}>
            {description.trim() || 'Xem trước'}
          </AppText>
        </View>
      </View>

      <Field label="Tên thói quen *">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ví dụ: Uống 2 lít nước"
          placeholderTextColor={theme.textSecondary}
          maxLength={TITLE_MAX}
          autoFocus={!habit}
          returnKeyType="next"
          style={inputStyle}
        />
      </Field>

      <Field label="Mô tả">
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ghi chú thêm (không bắt buộc)"
          placeholderTextColor={theme.textSecondary}
          maxLength={DESCRIPTION_MAX}
          multiline
          style={[inputStyle, styles.multiline]}
        />
      </Field>

      <Field label="Biểu tượng">
        <View style={styles.grid}>
          {HABIT_ICON_NAMES.map((name) => {
            const selected = name === icon;
            return (
              <Pressable
                key={name}
                onPress={() => setIcon(name)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={name}
                style={[
                  styles.iconCell,
                  { borderColor: selected ? color : theme.border, backgroundColor: selected ? tint(color) : 'transparent' },
                ]}>
                {createElement(HABIT_ICONS[name], { size: 20, color: selected ? color : theme.textSecondary })}
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Màu sắc">
        <View style={styles.colors}>
          {HABIT_COLORS.map((c) => {
            const selected = c.value === color.toLowerCase();
            return (
              <Pressable
                key={c.value}
                onPress={() => setColor(c.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={c.label}
                style={[
                  styles.swatch,
                  { backgroundColor: c.value },
                  selected && { borderWidth: 3, borderColor: theme.text },
                ]}>
                {selected && <Check size={16} strokeWidth={3} color="#ffffff" />}
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Tần suất">
        <View style={[styles.segmented, { backgroundColor: theme.muted }]}>
          {(
            [
              ['DAILY', 'Hàng ngày'],
              ['SPECIFIC_DAYS', 'Chọn ngày'],
            ] as const
          ).map(([value, label]) => {
            const selected = frequencyType === value;
            return (
              <Pressable
                key={value}
                onPress={() => setFrequencyType(value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.segment, selected && { backgroundColor: theme.card }]}>
                <AppText variant="label" secondary={!selected}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {frequencyType === 'SPECIFIC_DAYS' && (
          <View style={styles.days}>
            {WEEK_ORDER.map((day) => {
              const selected = targetDays.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={WEEKDAY_LONG[day]}
                  style={[
                    styles.dayChip,
                    selected ? { backgroundColor: color, borderColor: color } : { borderColor: theme.border },
                  ]}>
                  <AppText variant="label" style={[styles.bold, selected ? styles.white : { color: theme.textSecondary }]}>
                    {WEEKDAY_SHORT[day]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )}
      </Field>

      {error && (
        <View style={[styles.error, { backgroundColor: theme.destructiveSoft }]} accessibilityRole="alert">
          <AppText style={{ color: theme.destructive }}>{error}</AppText>
        </View>
      )}

      <View style={styles.footer}>
        <Button label="Hủy" variant="outline" onPress={onDone} style={styles.flex} disabled={saving} />
        <Button
          label={habit ? 'Lưu thay đổi' : 'Tạo thói quen'}
          onPress={() => void submit()}
          loading={saving}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: Spacing.four, paddingBottom: Spacing.two },
  preview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md },
  previewIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  field: { gap: Spacing.two },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 10, fontSize: 16 },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  iconCell: {
    width: '10.5%',
    minWidth: 38,
    aspectRatio: 1,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: Radius.md },
  segment: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Radius.sm },
  days: { flexDirection: 'row', gap: Spacing.one },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderWidth: 1, borderRadius: Radius.sm },
  bold: { fontWeight: '700' },
  white: { color: '#ffffff' },
  error: { padding: Spacing.three, borderRadius: Radius.md },
  footer: { flexDirection: 'row', gap: Spacing.two },
});
