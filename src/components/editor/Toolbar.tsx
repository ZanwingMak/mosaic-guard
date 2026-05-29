// 编辑器工具栏：桌面竖排（侧栏）/ 移动端横排（底部条）
import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, font, spacing } from '@/theme';
import { IconButton } from '@/components/ui';
import { useEditor, Tool } from '@/store/editor';

const tools: Array<{ key: Tool; icon: any; label: string }> = [
  { key: 'smart', icon: 'wand', label: '智选' },
  { key: 'brush', icon: 'brush', label: '画笔' },
  { key: 'rect', icon: 'square', label: '框选' },
  { key: 'face', icon: 'face', label: '人脸' },
  { key: 'ocr', icon: 'text', label: '文字' },
  { key: 'watermark', icon: 'eye', label: '水印' },
];

interface Props {
  compact?: boolean; // 移动端横排
}

export function Toolbar({ compact }: Props) {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);

  if (compact) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.compactList}
        style={styles.compactWrap}
      >
        {tools.map((t) => (
          <IconButton
            key={t.key}
            icon={t.icon}
            label={t.label}
            active={tool === t.key}
            onPress={() => setTool(t.key)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>工具</Text>
      <View style={styles.list}>
        {tools.map((t) => (
          <IconButton
            key={t.key}
            icon={t.icon}
            label={t.label}
            active={tool === t.key}
            onPress={() => setTool(t.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 88,
    backgroundColor: colors.bg1,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  title: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  list: { gap: spacing.sm, alignItems: 'center' },
  // 移动端横排
  compactWrap: {
    backgroundColor: colors.bg1,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexGrow: 0,
  },
  compactList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
});
