// 编辑器右侧：效果选择 + 强度 + 画笔大小 + 颜色/emoji
// compact 模式：紧凑横排，用于移动端底部 dock
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';
import { Icon, Slider } from '@/components/ui';
import { useEditor, Effect } from '@/store/editor';

const effects: Array<{ key: Effect; icon: any; label: string; hint: string }> = [
  { key: 'pixelate', icon: 'pixelate', label: '像素化', hint: '马赛克小方块' },
  { key: 'blur', icon: 'blur', label: '模糊', hint: '柔和虚化' },
  { key: 'solid', icon: 'fill', label: '纯色', hint: '完全遮挡' },
  { key: 'sticker', icon: 'sticker', label: 'Emoji', hint: '俏皮贴纸' },
];

const emojis = ['😎', '😊', '🌟', '🌈', '🐱', '🚀', '🤖', '🎭'];
const colorOptions = ['#0B0D12', '#FFFFFF', '#4FD1C5', '#F87171', '#FBBF24', '#A78BFA'];

interface Props {
  compact?: boolean;
}

export function EffectPanel({ compact }: Props) {
  const effect = useEditor((s) => s.effect);
  const setEffect = useEditor((s) => s.setEffect);
  const strength = useEditor((s) => s.strength);
  const setStrength = useEditor((s) => s.setStrength);
  const brushSize = useEditor((s) => s.brushSize);
  const setBrushSize = useEditor((s) => s.setBrushSize);
  const emoji = useEditor((s) => s.emoji);
  const setEmoji = useEditor((s) => s.setEmoji);
  const color = useEditor((s) => s.color);
  const setColor = useEditor((s) => s.setColor);
  const tool = useEditor((s) => s.tool);
  // 移动端把进阶参数（强度 / 画笔尺寸 / 配色）收进可折叠抽屉
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    const effectMeta = effects.find((e) => e.key === effect);
    return (
      <View style={styles.compactWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactRow}
        >
          {effects.map((e) => (
            <Pressable
              key={e.key}
              onPress={() => setEffect(e.key)}
              style={({ pressed }: any) => [
                styles.compactEffect,
                effect === e.key && styles.compactEffectActive,
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
            >
              <Icon name={e.icon} size={16} color={effect === e.key ? colors.brand : colors.text0} />
              <Text style={[styles.compactEffectLabel, effect === e.key && { color: colors.brand }]}>{e.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={({ pressed }: any) => [
              styles.compactEffect,
              { borderColor: colors.line },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Icon name={expanded ? 'minus' : 'plus'} size={14} color={colors.text1} />
            <Text style={styles.compactEffectLabel}>{expanded ? '收起' : '参数'}</Text>
          </Pressable>
        </ScrollView>
        {expanded && (
          <View style={styles.compactExpand}>
            <Slider
              label={
                effect === 'pixelate'
                  ? '像素粒度'
                  : effect === 'blur'
                  ? '模糊强度'
                  : effect === 'sticker'
                  ? '贴纸大小'
                  : '强度'
              }
              value={strength}
              min={1}
              max={100}
              onChange={setStrength}
              suffix="%"
            />
            {tool === 'brush' && (
              <Slider label="画笔大小" value={brushSize} min={6} max={120} onChange={setBrushSize} suffix="px" />
            )}
            {effect === 'sticker' && (
              <View style={{ gap: 6 }}>
                <Text style={styles.swatchLabel}>Emoji</Text>
                <View style={styles.swatchRow}>
                  {emojis.map((e) => (
                    <Pressable
                      key={e}
                      onPress={() => setEmoji(e)}
                      style={({ pressed }: any) => [
                        styles.swatch,
                        emoji === e && styles.swatchActive,
                        pressed && { transform: [{ scale: 0.95 }] },
                      ]}
                    >
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {effect === 'solid' && (
              <View style={{ gap: 6 }}>
                <Text style={styles.swatchLabel}>颜色</Text>
                <View style={styles.swatchRow}>
                  {colorOptions.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={({ pressed }: any) => [
                        styles.colorChip,
                        { backgroundColor: c },
                        color === c && styles.colorChipActive,
                        pressed && { transform: [{ scale: 0.95 }] },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>效果</Text>
      <View style={styles.effectGrid}>
        {effects.map((e) => (
          <Pressable
            key={e.key}
            onPress={() => setEffect(e.key)}
            style={({ pressed, hovered }: any) => [
              styles.effect,
              effect === e.key && styles.effectActive,
              hovered && effect !== e.key && { backgroundColor: colors.glass, borderColor: colors.line },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Icon name={e.icon} size={18} color={effect === e.key ? colors.brand : colors.text0} />
            <Text style={[styles.effectLabel, effect === e.key && { color: colors.brand }]}>{e.label}</Text>
            <Text style={styles.effectHint}>{e.hint}</Text>
          </Pressable>
        ))}
      </View>

      <Slider
        label={
          effect === 'pixelate'
            ? '像素粒度'
            : effect === 'blur'
            ? '模糊强度'
            : effect === 'sticker'
            ? '贴纸大小'
            : '强度'
        }
        value={strength}
        min={1}
        max={100}
        onChange={setStrength}
        suffix="%"
      />

      {tool === 'brush' && (
        <Slider label="画笔大小" value={brushSize} min={6} max={120} onChange={setBrushSize} suffix="px" />
      )}

      {effect === 'sticker' && (
        <View style={styles.swatchSection}>
          <Text style={styles.swatchLabel}>选择 Emoji</Text>
          <View style={styles.swatchRow}>
            {emojis.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={({ hovered, pressed }: any) => [
                  styles.swatch,
                  emoji === e && styles.swatchActive,
                  hovered && { borderColor: colors.lineStrong },
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {effect === 'solid' && (
        <View style={styles.swatchSection}>
          <Text style={styles.swatchLabel}>遮挡颜色</Text>
          <View style={styles.swatchRow}>
            {colorOptions.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={({ hovered, pressed }: any) => [
                  styles.colorChip,
                  { backgroundColor: c },
                  color === c && styles.colorChipActive,
                  hovered && { transform: [{ scale: 1.05 }] },
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 280,
    backgroundColor: colors.bg1,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    padding: spacing.xl,
    gap: spacing.md,
  },
  section: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  effectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  effect: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 2,
    // @ts-ignore web
    transitionProperty: 'border-color, background-color, transform',
    transitionDuration: '160ms',
    cursor: 'pointer',
  } as any,
  effectActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  effectLabel: { color: colors.text0, fontFamily: font.family, fontSize: 13, fontWeight: '600', marginTop: 4 },
  effectHint: { color: colors.text3, fontFamily: font.family, fontSize: 11 },
  swatchSection: { gap: 8, marginTop: spacing.sm },
  swatchLabel: { color: colors.text2, fontFamily: font.family, fontSize: 12 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  swatchActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.line,
    cursor: 'pointer' as any,
  },
  colorChipActive: { borderColor: colors.brand },
  // 移动端紧凑模式
  compactWrap: {
    backgroundColor: colors.bg1,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  compactRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
    flexDirection: 'row',
  },
  compactEffect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg2,
  },
  compactEffectActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  compactEffectLabel: { color: colors.text1, fontFamily: font.family, fontSize: 12, fontWeight: '600' },
  compactExpand: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
