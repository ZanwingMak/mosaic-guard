// 编辑器画布（Native 占位）：本期 v1 在原生端只展示图片与提示
// 真正的 canvas 编辑放在 .web.tsx；后续可接入 @shopify/react-native-skia 复用同一套 op 模型
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useEditor } from '@/store/editor';
import { colors, font, spacing } from '@/theme';

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
      <View style={styles.note}>
        <Text style={styles.noteTitle}>原生编辑器即将上线</Text>
        <Text style={styles.noteText}>
          完整的画笔、选区、AI 识别、隐写检测目前在 Web 端可用。原生端的 Skia 实现将在下个版本接入。
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  image: { width: '100%', height: '70%' },
  note: { padding: spacing.lg, backgroundColor: colors.bg2, borderRadius: 16, maxWidth: 480 },
  noteTitle: { color: colors.text0, fontFamily: font.family, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  noteText: { color: colors.text2, fontFamily: font.family, fontSize: 13, lineHeight: 20 },
});
