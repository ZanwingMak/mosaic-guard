// 功能展示网格：4 张 Bento 卡，凸显能力
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Icon } from '@/components/ui';
import { colors, font, spacing } from '@/theme';

const items = [
  {
    icon: 'face' as const,
    title: '人脸智能识别',
    desc: '一键找出并打码所有人脸，离线本地推理，不上传任何画面',
    accent: '#4FD1C5',
  },
  {
    icon: 'text' as const,
    title: 'OCR 敏感词捕获',
    desc: '自动识别身份证号、手机号、银行卡、邮箱、车牌等，按需勾选打码',
    accent: '#FBBF24',
  },
  {
    icon: 'brush' as const,
    title: '4 种马赛克效果',
    desc: '像素化 / 高斯模糊 / 纯色遮挡 / Emoji 贴纸，按场景自由切换',
    accent: '#F87171',
  },
  {
    icon: 'eye' as const,
    title: '隐藏水印检测',
    desc: 'LSB 位平面 + 频域分析，看穿小红书/微博等截图里的隐写信息',
    accent: '#A78BFA',
  },
];

export function FeatureGrid() {
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <Card key={it.title} style={styles.card} padding={24}>
          <View style={[styles.iconWrap, { backgroundColor: it.accent + '22', borderColor: it.accent }]}>
            <Icon name={it.icon} size={20} color={it.accent} />
          </View>
          <Text style={styles.title}>{it.title}</Text>
          <Text style={styles.desc}>{it.desc}</Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    width: '100%',
    maxWidth: 1080,
    justifyContent: 'center',
  },
  card: {
    flexGrow: 1,
    flexBasis: 240,
    minWidth: 240,
    maxWidth: 320,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text0, fontFamily: font.family, fontSize: 16, fontWeight: '700' },
  desc: { color: colors.text2, fontFamily: font.family, fontSize: 13, lineHeight: 20 },
});
