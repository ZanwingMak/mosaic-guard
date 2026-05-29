// 圆角图标按钮：编辑器工具栏专用
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, radius, font } from '@/theme';
import { Icon, IconName } from './Icon';

interface Props {
  icon: IconName;
  label?: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'square' | 'pill';
}

export function IconButton({ icon, label, active, onPress, disabled, variant = 'square' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed, hovered }: any) => [
        styles.base,
        variant === 'pill' ? styles.pill : styles.square,
        active && styles.active,
        hovered && !active && !disabled && styles.hover,
        pressed && !disabled && { transform: [{ scale: 0.95 }] },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Icon name={icon} size={18} color={active ? colors.brand : colors.text0} />
      {label ? <Text style={[styles.label, active && { color: colors.brand }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
    // @ts-ignore web
    transitionProperty: 'background-color, border-color, transform',
    transitionDuration: '140ms',
    cursor: 'pointer',
    userSelect: 'none',
  } as any,
  square: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
  },
  hover: {
    backgroundColor: colors.glass,
    borderColor: colors.line,
  },
  active: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  label: { color: colors.text1, fontFamily: font.family, fontSize: 11, fontWeight: '500' },
});
