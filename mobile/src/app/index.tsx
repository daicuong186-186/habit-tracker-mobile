import { getDay } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  Archive,
  ChevronDown,
  CirclePause,
  ListChecks,
  Pencil,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  Undo2,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Confetti } from '@/components/habits/confetti';
import { DailyProgress } from '@/components/habits/daily-progress';
import { DateStrip } from '@/components/habits/date-strip';
import { HabitCard } from '@/components/habits/habit-card';
import { HabitFormSheet } from '@/components/habits/habit-form-sheet';
import { AppText, Button, ErrorBanner, Screen, Sheet, SheetItem } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { Habit } from '@/db/habit-repository';
import { useTheme } from '@/hooks/use-theme';
import { useHabits } from '@/state/habits-store';
import { getDayProgress, isDueOn } from '@/shared/analytics';
import { WEEKDAY_LONG } from '@/shared/habit-options';
import { NOTE_MAX } from '@/shared/habit-validation';
import { parseDateKey } from '@/shared/streak';

const UNDO_TIMEOUT_MS = 6000;

function formatLongDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${WEEKDAY_LONG[getDay(parseDateKey(date))]}, ${d}/${m}/${y}`;
}

export default function TodayScreen() {
  const theme = useTheme();
  const { activeHabits: habits, statsById, today, error, clearError, setStatus, archiveHabit, deleteHabit } =
    useHabits();

  const [selectedDate, setSelectedDate] = useState(today);
  const date = selectedDate > today ? today : selectedDate;
  const isToday = date === today;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [menuHabit, setMenuHabit] = useState<Habit | null>(null);
  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [archived, setArchived] = useState<Habit | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  const dueHabits = habits.filter((h) => isDueOn(h, date));
  const otherHabits = habits.filter((h) => !isDueOn(h, date));
  const progress = getDayProgress(habits, date);
  const isComplete = progress.required > 0 && progress.completed >= progress.required;

  // Pháo giấy + rung khi vừa đạt 100% trong cùng một ngày (không bắn khi mở app hay đổi ngày)
  const previous = useRef({ date, isComplete });
  useEffect(() => {
    const prev = previous.current;
    if (prev.date === date && !prev.isComplete && isComplete) {
      setConfettiKey((k) => k + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    previous.current = { date, isComplete };
  }, [date, isComplete]);

  useEffect(() => {
    if (!archived) return;
    const timer = setTimeout(() => setArchived(null), UNDO_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [archived]);

  const logOf = (habit: Habit) => habit.logs.find((l) => l.date === date);

  function toggle(habit: Habit) {
    const completed = logOf(habit)?.status === 'COMPLETED';
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void setStatus(habit.id, date, completed ? null : 'COMPLETED');
  }

  function openNote(habit: Habit) {
    setMenuHabit(null);
    setNoteDraft(logOf(habit)?.note ?? '');
    setNoteHabit(habit);
  }

  function saveNote() {
    if (!noteHabit) return;
    // Ghi chú gắn với log của ngày; chưa có trạng thái thì lưu kèm "hoàn thành"
    void setStatus(noteHabit.id, date, logOf(noteHabit)?.status ?? 'COMPLETED', noteDraft);
    setNoteHabit(null);
  }

  function confirmDelete(habit: Habit) {
    setMenuHabit(null);
    Alert.alert(
      'Xóa thói quen?',
      `"${habit.title}" cùng toàn bộ lịch sử check-in sẽ bị xóa vĩnh viễn. Nếu chỉ muốn tạm ẩn, hãy chọn "Lưu trữ".`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa vĩnh viễn', style: 'destructive', onPress: () => void deleteHabit(habit.id) },
      ],
    );
  }

  async function archive(habit: Habit) {
    setMenuHabit(null);
    const result = await archiveHabit(habit.id, true);
    if (result.ok) setArchived(habit);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function renderCard(habit: Habit, offDay: boolean) {
    return (
      <HabitCard
        key={habit.id}
        habit={habit}
        stats={statsById.get(habit.id)!}
        log={logOf(habit)}
        offDay={offDay}
        onToggle={() => toggle(habit)}
        onOpenMenu={() => setMenuHabit(habit)}
        onOpenNote={() => openNote(habit)}
      />
    );
  }

  const menuLog = menuHabit ? logOf(menuHabit) : undefined;

  return (
    <View style={styles.flex}>
      <Screen
        title="Thói quen hằng ngày"
        subtitle={formatLongDate(today)}
        action={
          habits.length > 0 && (
            <Button icon={<Plus size={22} color={theme.primaryText} />} onPress={openCreate} accessibilityLabel="Thêm thói quen" />
          )
        }>
        {error && <ErrorBanner message={error} onDismiss={clearError} />}

        {habits.length === 0 ? (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.successSoft }]}>
              <ListChecks size={40} color={theme.success} />
              <Sparkles size={22} color="#f59e0b" style={styles.sparkle} />
            </View>
            <AppText variant="heading">Chưa có thói quen nào</AppText>
            <AppText secondary style={styles.center}>
              Những thay đổi lớn bắt đầu từ thói quen nhỏ. Hãy tạo thói quen đầu tiên và giữ chuỗi ngày liên tiếp của
              bạn!
            </AppText>
            <Button label="Tạo thói quen đầu tiên" icon={<Plus size={18} color={theme.primaryText} />} onPress={openCreate} />
          </View>
        ) : (
          <>
            <DateStrip
              selectedDate={date}
              today={today}
              getDayProgress={(d) => getDayProgress(habits, d)}
              onSelectDate={setSelectedDate}
            />
            <DailyProgress completed={progress.completed} required={progress.required} skipped={progress.skipped} />

            <View style={styles.sectionHeader}>
              <ListChecks size={20} color={theme.textSecondary} />
              <AppText variant="heading" style={styles.flex}>
                {isToday ? 'Cần làm hôm nay' : `Cần làm • ${formatLongDate(date)}`}{' '}
                <AppText secondary>({dueHabits.length})</AppText>
              </AppText>
            </View>
            {dueHabits.length > 0 ? (
              <View style={styles.list}>{dueHabits.map((h) => renderCard(h, false))}</View>
            ) : (
              <View style={[styles.noneToday, { borderColor: theme.border }]}>
                <AppText secondary style={styles.center}>
                  Không có thói quen nào theo lịch trong ngày này. Nghỉ ngơi thôi! 🌿
                </AppText>
              </View>
            )}

            {otherHabits.length > 0 && (
              <View style={[styles.others, { backgroundColor: theme.muted }]}>
                <Pressable
                  onPress={() => setShowOthers((v) => !v)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showOthers }}
                  style={styles.othersHeader}>
                  <AppText variant="label" secondary style={styles.flex}>
                    Thói quen ngày khác ({otherHabits.length})
                  </AppText>
                  <ChevronDown
                    size={18}
                    color={theme.textSecondary}
                    style={{ transform: [{ rotate: showOthers ? '180deg' : '0deg' }] }}
                  />
                </Pressable>
                {showOthers && <View style={styles.list}>{otherHabits.map((h) => renderCard(h, true))}</View>}
              </View>
            )}
          </>
        )}
      </Screen>

      <Sheet visible={menuHabit !== null} onClose={() => setMenuHabit(null)} title={menuHabit?.title}>
        {menuHabit && (
          <View>
            {menuLog?.status === 'SKIPPED' ? (
              <SheetItem
                label="Bỏ nghỉ có phép"
                icon={<Undo2 size={20} color={theme.text} />}
                onPress={() => {
                  void setStatus(menuHabit.id, date, null);
                  setMenuHabit(null);
                }}
              />
            ) : (
              <SheetItem
                label="Nghỉ có phép"
                icon={<CirclePause size={20} color={theme.text} />}
                onPress={() => {
                  void setStatus(menuHabit.id, date, 'SKIPPED');
                  setMenuHabit(null);
                }}
              />
            )}
            <SheetItem
              label={menuLog?.note ? 'Sửa ghi chú' : 'Thêm ghi chú'}
              icon={<StickyNote size={20} color={theme.text} />}
              onPress={() => openNote(menuHabit)}
            />
            <SheetItem
              label="Chỉnh sửa"
              icon={<Pencil size={20} color={theme.text} />}
              onPress={() => {
                setEditing(menuHabit);
                setMenuHabit(null);
                setFormOpen(true);
              }}
            />
            <SheetItem
              label="Lưu trữ"
              icon={<Archive size={20} color={theme.text} />}
              onPress={() => void archive(menuHabit)}
            />
            <SheetItem
              label="Xóa"
              destructive
              icon={<Trash2 size={20} color={theme.destructive} />}
              onPress={() => confirmDelete(menuHabit)}
            />
          </View>
        )}
      </Sheet>

      <Sheet visible={noteHabit !== null} onClose={() => setNoteHabit(null)} title="Ghi chú trong ngày">
        <View style={styles.noteForm}>
          <AppText secondary>
            {noteHabit?.title}
            {noteHabit && !logOf(noteHabit) && ' — lưu ghi chú sẽ đồng thời đánh dấu hoàn thành.'}
          </AppText>
          <TextInput
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="Hôm nay bạn thế nào? (vd: chạy 5km, đọc 20 trang...)"
            placeholderTextColor={theme.textSecondary}
            maxLength={NOTE_MAX}
            multiline
            autoFocus
            style={[styles.noteInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
          />
          <View style={styles.row}>
            <Button label="Hủy" variant="outline" onPress={() => setNoteHabit(null)} style={styles.flex} />
            <Button label="Lưu ghi chú" onPress={saveNote} style={styles.flex} />
          </View>
        </View>
      </Sheet>

      <HabitFormSheet visible={formOpen} habit={editing} onClose={() => setFormOpen(false)} />

      {archived && (
        <View style={[styles.toast, { backgroundColor: theme.text }]} accessibilityLiveRegion="polite">
          <Archive size={16} color={theme.background} />
          <AppText numberOfLines={1} style={[styles.flex, { color: theme.background }]}>
            Đã lưu trữ “{archived.title}”
          </AppText>
          <Pressable
            onPress={() => {
              void archiveHabit(archived.id, false);
              setArchived(null);
            }}
            hitSlop={8}>
            <AppText style={[styles.bold, { color: theme.background }]}>Hoàn tác</AppText>
          </Pressable>
        </View>
      )}

      <Confetti fireKey={confettiKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing.two },
  list: { gap: Spacing.three },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
  },
  emptyIcon: { width: 80, height: 80, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', top: -8, right: -10 },
  noneToday: { borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.lg, padding: Spacing.four },
  others: { borderRadius: Radius.lg, padding: Spacing.two, gap: Spacing.two },
  othersHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.two },
  noteForm: { gap: Spacing.three, paddingBottom: Spacing.two },
  noteInput: { minHeight: 96, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, fontSize: 16, textAlignVertical: 'top' },
  toast: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
});
