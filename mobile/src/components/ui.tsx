import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------- Text ----------

type TextVariant = 'title' | 'heading' | 'body' | 'label' | 'caption';

export function AppText({
  variant = 'body',
  secondary,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  secondary?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[textStyles[variant], { color: secondary ? theme.textSecondary : theme.text }, style]}>
      {children}
    </Text>
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15 },
  label: { fontSize: 14, fontWeight: '500' },
  caption: { fontSize: 12 },
});

// ---------- Button ----------

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive';

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  accessibilityLabel,
}: {
  label?: string;
  icon?: ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.primary, fg: theme.primaryText, border: theme.primary },
    outline: { bg: theme.card, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.text, border: 'transparent' },
    destructive: { bg: theme.destructiveSoft, fg: theme.destructive, border: theme.destructiveSoft },
  };
  const colors = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.bg, borderColor: colors.border, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
        !label && styles.iconButton,
        style,
      ]}>
      {loading ? <ActivityIndicator size="small" color={colors.fg} /> : icon}
      {label && <Text style={[styles.buttonLabel, { color: colors.fg }]}>{label}</Text>}
    </Pressable>
  );
}

// ---------- Card ----------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>{children}</View>
  );
}

// ---------- Screen ----------

/** Khung màn hình: vùng an toàn + cuộn dọc + tiêu đề lớn. Native tabs không có header nên tự vẽ. */
export function Screen({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <View style={styles.screenInner}>
          <View style={styles.screenHeader}>
            <View style={styles.flex}>
              {subtitle && <AppText variant="label" secondary>{subtitle}</AppText>}
              <AppText variant="title">{title}</AppText>
            </View>
            {action}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Error banner ----------

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: theme.destructiveSoft }]}>
      <AppText style={[styles.flex, { color: theme.destructive }]}>{message}</AppText>
      <Pressable onPress={onDismiss} accessibilityLabel="Đóng thông báo" hitSlop={8}>
        <X size={18} color={theme.destructive} />
      </Pressable>
    </View>
  );
}

// ---------- Sheet ----------

/**
 * Bảng trượt từ dưới lên (Modal trong suốt + nền mờ). Dùng cho form, ghi chú và menu thao tác.
 * Chạm nền hoặc nút Back (Android) để đóng.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.card, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          {title && (
            <View style={styles.sheetHeader}>
              <AppText variant="heading" style={styles.flex}>
                {title}
              </AppText>
              <Pressable onPress={onClose} accessibilityLabel="Đóng" hitSlop={10}>
                <X size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
          )}
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetItem({
  label,
  icon,
  onPress,
  destructive,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.sheetItem, pressed && { backgroundColor: theme.muted }]}>
      {icon}
      <AppText style={destructive ? { color: theme.destructive } : undefined}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconButton: { paddingHorizontal: 0, width: 44 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  screenContent: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.six },
  screenInner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  screenHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginVertical: Spacing.two },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: Spacing.three },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
  },
});
