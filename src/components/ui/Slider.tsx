// 跨端滑块：Web 用原生 input range，Native 用简化拖拽
import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors, font, spacing } from '@/theme';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}

export function Slider({ label, value, min, max, step = 1, onChange, suffix = '' }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {value}
          {suffix}
        </Text>
      </View>
      {Platform.OS === 'web' ? (
        // @ts-ignore inline DOM input on web
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e: any) => onChange(Number(e.target.value))}
          style={webInputStyle}
        />
      ) : (
        // 原生端先用占位；可后续接 @react-native-community/slider
        <View style={styles.nativeBar} />
      )}
    </View>
  );
}

const webInputStyle = {
  width: '100%',
  accentColor: colors.brand,
  cursor: 'pointer',
  height: 22,
} as any;

const styles = StyleSheet.create({
  wrap: { gap: 6, paddingVertical: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.text1, fontFamily: font.family, fontSize: 13 },
  value: { color: colors.brand, fontFamily: font.mono, fontSize: 13, fontWeight: '600' },
  nativeBar: {
    height: 6,
    backgroundColor: colors.bg3,
    borderRadius: 999,
    marginTop: spacing.xs,
  },
});
