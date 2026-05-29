// 玻璃质感卡片
import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, radius, shadow } from '@/theme';

interface Props extends ViewProps {
  variant?: 'flat' | 'glass';
  padding?: number;
}

export function Card({ variant = 'flat', padding = 20, style, children, ...rest }: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'glass' ? styles.glass : styles.flat,
        { padding },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  flat: {
    backgroundColor: colors.bg1,
    borderColor: colors.line,
    ...shadow.card,
  },
  glass: {
    backgroundColor: colors.glassStrong,
    borderColor: colors.line,
    // @ts-ignore web only
    backdropFilter: 'blur(20px) saturate(140%)',
    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  } as any,
});
