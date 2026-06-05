// 编辑器画布（Native）：v1 不做原生 Skia 编辑，
// 仅做"图片预览 + 引导跳 Web 版"——让原生端用户也能完成完整闭环。
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Linking } from 'react-native';
import { useEditor } from '@/store/editor';
import { colors, font, radius, spacing } from '@/theme';
import { Icon } from '@/components/ui';

// Web 版 demo 地址（GitHub Pages 部署），与 README 顶部 badge 一致
const WEB_DEMO_URL = 'https://zanwingmak.github.io/mosaic-guard/';

export interface Detection {
  id: string;
  type: 'face' | 'text';
  rect: { x: number; y: number; w: number; h: number };
  label?: string;
  confidence?: number;
}

interface Props {
  detections?: Detection[];
  selectedDetectionIds?: Set<string>;
  onToggleDetection?: (id: string) => void;
  onCanvasReady?: (canvas: any) => void;
}

export function EditorCanvas(_props: Props) {
  const image = useEditor((s) => s.image);
  if (!image) return null;

  return (
    <View style={styles.container}>
      <Image source={{ uri: image.uri }} style={styles.image} resizeMode="contain" />
      <View style={styles.cta}>
        <View style={styles.ctaHeader}>
          <View style={styles.ctaIcon}>
            <Icon name="sparkles" size={18} color={colors.brand} />
          </View>
          <Text style={styles.ctaTitle}>用 Web 版完整编辑</Text>
        </View>
        <Text style={styles.ctaDesc}>
          AI 人脸识别、敏感文字 OCR、隐写检测、画笔 / 矩形 / Emoji 打码、导出 PNG —— 这些功能目前都在 Web 版可用，全程端侧处理。
        </Text>
        <Pressable
          style={({ pressed }: any) => [styles.ctaBtn, pressed && { transform: [{ scale: 0.97 }] }]}
          onPress={() => Linking.openURL(WEB_DEMO_URL)}
        >
          <Icon name="eye" size={16} color="#0B0D12" />
          <Text style={styles.ctaBtnLabel}>在浏览器打开 Web 版</Text>
        </Pressable>
        <Text style={styles.ctaHint}>原生 Skia 编辑器在路上，将复用同一套 op 数据结构</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: spacing.lg, gap: spacing.lg },
  image: { width: '100%', height: '45%', borderRadius: radius.md },
  cta: {
    width: '100%',
    maxWidth: 480,
    padding: spacing.xl,
    backgroundColor: colors.bg2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
  },
  ctaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ctaIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: { color: colors.text0, fontFamily: font.family, fontSize: 16, fontWeight: '700' },
  ctaDesc: { color: colors.text2, fontFamily: font.family, fontSize: 13, lineHeight: 20 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: colors.brand,
    marginTop: spacing.sm,
  },
  ctaBtnLabel: { color: '#0B0D12', fontFamily: font.family, fontSize: 15, fontWeight: '700' },
  ctaHint: {
    color: colors.text3,
    fontFamily: font.family,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
