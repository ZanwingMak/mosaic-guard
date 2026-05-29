// 首页中心区：拖拽上传 / 文件选择 / 相机
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing, font } from '@/theme';
import { Icon } from '@/components/ui';
import { useEditor } from '@/store/editor';
import { pickImage, pickFromFile } from '@/lib/pickImage';

export function DropZone() {
  const router = useRouter();
  const setImage = useEditor((s) => s.setImage);
  const [hovering, setHovering] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handlePick = async (source: 'gallery' | 'camera') => {
    const img = await pickImage(source);
    if (img) {
      setImage(img);
      router.push('/editor');
    }
  };

  // Web 端拖拽：RN Web 的 <View> 不会把 onDragOver/onDrop 透传到 DOM 事件，
  // 必须用原生 <div> 兜底；用 useEffect+ref 直接绑 addEventListener 避免 React 合成事件层吞掉
  const dropRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = dropRef.current;
    if (!el) return;
    const onOver = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    };
    const onLeave = (e: DragEvent) => {
      // 只在真正离开 DropZone 时取消高亮（避免子元素 enter/leave 抖动）
      if (e.relatedTarget && el.contains(e.relatedTarget as Node)) return;
      setDragOver(false);
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const img = await pickFromFile(file);
      if (img) {
        setImage(img);
        router.push('/editor');
      }
    };
    el.addEventListener('dragover', onOver);
    el.addEventListener('dragleave', onLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onOver);
      el.removeEventListener('dragleave', onLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [router, setImage]);

  // Web：透明的真 div 包住整个 DropZone 接住拖拽事件；样式仍由内部 View 负责
  const Wrapper: any = Platform.OS === 'web' ? 'div' : React.Fragment;
  const wrapperProps: any =
    Platform.OS === 'web'
      ? {
          ref: dropRef,
          style: { width: '100%', maxWidth: 720, display: 'flex', justifyContent: 'center' },
        }
      : {};

  return (
    <Wrapper {...wrapperProps}>
    <View
      style={[styles.zone, dragOver && styles.zoneDragOver]}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      <View style={styles.iconBubble}>
        <Icon name="upload" size={28} color={colors.brand} />
      </View>
      <Text style={styles.headline}>把图片拖到这里</Text>
      <Text style={styles.sub}>支持 JPG / PNG / WebP / HEIC，全程在你的设备上处理</Text>

      <View style={styles.row}>
        <Pressable
          style={({ pressed, hovered }: any) => [
            styles.cta,
            styles.ctaPrimary,
            hovered && { backgroundColor: colors.brandStrong },
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => handlePick('gallery')}
        >
          <Icon name="image" size={18} color="#0B0D12" />
          <Text style={[styles.ctaLabel, { color: '#0B0D12' }]}>选择图片</Text>
        </Pressable>

        <Pressable
          style={({ pressed, hovered }: any) => [
            styles.cta,
            styles.ctaGhost,
            hovered && { borderColor: colors.lineStrong, backgroundColor: colors.glass },
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => handlePick('camera')}
        >
          <Icon name="camera" size={18} color={colors.text0} />
          <Text style={styles.ctaLabel}>拍照打码</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>{Platform.OS === 'web' ? '也可以直接 Cmd+V 粘贴截图' : '可直接调用系统相机或相册'}</Text>
    </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  zone: {
    width: '100%',
    maxWidth: 720,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed' as any,
    borderRadius: radius.xl,
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    // @ts-ignore web
    transitionProperty: 'border-color, background-color',
    transitionDuration: '200ms',
  } as any,
  zoneDragOver: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  headline: {
    color: colors.text0,
    fontFamily: font.family,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sub: {
    color: colors.text2,
    fontFamily: font.family,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
    // @ts-ignore web
    transitionProperty: 'transform, background-color, border-color',
    transitionDuration: '160ms',
    cursor: 'pointer',
  } as any,
  ctaPrimary: { backgroundColor: colors.brand },
  ctaGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  ctaLabel: { color: colors.text0, fontFamily: font.family, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.text3, fontFamily: font.family, fontSize: 12, marginTop: spacing.lg },
});
