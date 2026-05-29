// 通用按钮：3 种 variant，支持 icon 前缀和加载态
import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, font } from '@/theme';

type Variant = 'primary' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed, hovered }: any) => [
        styles.base,
        sizeStyle[size],
        variantStyle[variant],
        fullWidth && { alignSelf: 'stretch' },
        hovered && !isDisabled && variantHover[variant],
        pressed && !isDisabled && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        isDisabled && { opacity: 0.45 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#0B0D12' : colors.text0} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
          <Text style={[styles.label, labelStyle[variant], sizeLabel[size]]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    // @ts-ignore web only
    transitionProperty: 'transform, background-color, border-color, opacity',
    transitionDuration: '160ms',
    cursor: 'pointer',
    userSelect: 'none',
  } as any,
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontFamily: font.family, fontWeight: '600' },
});

const sizeStyle = StyleSheet.create({
  sm: { paddingHorizontal: 14, paddingVertical: 8 },
  md: { paddingHorizontal: 20, paddingVertical: 12 },
  lg: { paddingHorizontal: 28, paddingVertical: 16 },
});

const sizeLabel = StyleSheet.create({
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 17 },
});

const variantStyle = StyleSheet.create({
  primary: { backgroundColor: colors.brand },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  subtle: { backgroundColor: colors.bg2 },
});

const variantHover = StyleSheet.create({
  primary: { backgroundColor: colors.brandStrong },
  ghost: { borderColor: colors.lineStrong, backgroundColor: colors.glass },
  subtle: { backgroundColor: colors.bg3 },
});

const labelStyle = StyleSheet.create({
  primary: { color: '#0B0D12' },
  ghost: { color: colors.text0 },
  subtle: { color: colors.text0 },
});
