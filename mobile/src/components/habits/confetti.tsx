import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#f59e0b', '#06b6d4'];
const PIECES = 70;
const DURATION = 2600;

interface Piece {
  x: number;
  drift: number;
  delay: number;
  size: number;
  color: string;
  spin: number;
  progress: Animated.Value;
}

function makePieces(width: number): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    x: Math.random() * width,
    drift: (Math.random() - 0.5) * 160,
    delay: Math.random() * 400,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    spin: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4),
    progress: new Animated.Value(0),
  }));
}

/**
 * Pháo giấy rơi từ trên xuống, chạy lại mỗi khi `fireKey` tăng.
 * Bỏ qua khi người dùng bật "Giảm chuyển động" (Reduce Motion).
 */
export function Confetti({ fireKey }: { fireKey: number }) {
  const { width, height } = useWindowDimensions();
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    if (fireKey === 0) return;
    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      const next = makePieces(width);
      setPieces(next);
      animation = Animated.parallel(
        next.map((p) =>
          Animated.timing(p.progress, {
            toValue: 1,
            duration: DURATION,
            delay: p.delay,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ),
      );
      animation.start(({ finished }) => finished && !cancelled && setPieces(null));
    });

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [fireKey, width]);

  if (!pieces) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 0.6,
            borderRadius: 1,
            backgroundColor: p.color,
            opacity: p.progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
              { translateX: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              {
                rotate: p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin * 360}deg`] }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
