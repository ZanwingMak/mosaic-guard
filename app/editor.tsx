// 编辑器主页面：组合左侧工具栏 + 中央画布 + 右侧效果面板 + 底部 AI 操作条
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, radius, spacing } from '@/theme';
import { Button, Icon } from '@/components/ui';
import { EditorCanvas, Detection } from '@/components/editor/EditorCanvas';
import { Toolbar } from '@/components/editor/Toolbar';
import { EffectPanel } from '@/components/editor/EffectPanel';
import { AIActionBar } from '@/components/editor/AIActionBar';
import { useEditor, MosaicOp } from '@/store/editor';
import { detectFaces, preloadFaceModel } from '@/lib/faceDetection';
import { detectSensitiveText, preloadOCR } from '@/lib/ocr';
import { scanHiddenWatermark } from '@/lib/watermark';
import { smartDetect } from '@/lib/smartDetect';
import { exportCanvas } from '@/lib/exportImage';

export default function Editor() {
  const router = useRouter();
  const image = useEditor((s) => s.image);
  const ops = useEditor((s) => s.ops);
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const effect = useEditor((s) => s.effect);
  const strength = useEditor((s) => s.strength);
  const color = useEditor((s) => s.color);
  const emoji = useEditor((s) => s.emoji);
  const addOp = useEditor((s) => s.addOp);
  const removeOp = useEditor((s) => s.removeOp);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const clear = useEditor((s) => s.clear);

  const [canvasEl, setCanvasEl] = useState<any>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [selectedDetectionIds, setSelectedDetectionIds] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<string>('');
  // 智选模式：detection id → 对应的 op id，用于"再次点击撤销"
  const [smartOpMap, setSmartOpMap] = useState<Map<string, string>>(new Map());

  // 没图就回首页
  useEffect(() => {
    if (!image) router.replace('/');
  }, [image, router]);

  // 测试钩子：把当前检测结果暴露到 window，供 E2E 用
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__detections__ = detections;
  }, [detections]);

  // 进入编辑器时后台预加载模型
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    preloadFaceModel();
    preloadOCR();
  }, []);

  // App 端 AI 检测仍为占位，首次进入时默认给用户可直接操作的框选工具
  useEffect(() => {
    if (Platform.OS !== 'web' && tool === 'smart') setTool('rect');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换工具时清空检测结果
  useEffect(() => {
    setDetections([]);
    setSelectedDetectionIds(new Set());
    setSmartOpMap(new Map());
    setScanSummary('');
  }, [tool]);

  /** 触发对应工具的"扫描" */
  const runScan = useCallback(async () => {
    if (!canvasEl) return;
    setScanning(true);
    try {
      if (tool === 'smart') {
        const res = await smartDetect(canvasEl);
        setDetections(res);
        setSelectedDetectionIds(new Set());
        setSmartOpMap(new Map());
        const faces = res.filter((d) => d.type === 'face').length;
        const texts = res.length - faces;
        setScanSummary(`文字 ${texts} 行 · 人脸 ${faces} 张`);
      } else if (tool === 'face') {
        const res = await detectFaces(canvasEl);
        setDetections(res);
        // 默认全选（人脸一般都要打码）
        setSelectedDetectionIds(new Set(res.map((d) => d.id)));
        setScanSummary(`识别 ${res.length} 张人脸`);
      } else if (tool === 'ocr') {
        const res = await detectSensitiveText(canvasEl);
        setDetections(res);
        setSelectedDetectionIds(new Set(res.map((d) => d.id)));
        setScanSummary(`命中 ${res.length} 处敏感文字`);
      } else if (tool === 'watermark') {
        const res = await scanHiddenWatermark(canvasEl);
        setDetections(res.detections);
        setSelectedDetectionIds(new Set());
        setScanSummary(
          `可疑块 ${res.summary.suspiciousBlocks} / ${res.summary.totalBlocks}，平均熵 ${res.summary.avgEntropy}`,
        );
      }
    } catch (err: any) {
      // web 用 alert，native 用 Alert.alert（避免 ReferenceError）
      const msg = err?.message || '扫描失败';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('扫描失败', msg);
    } finally {
      setScanning(false);
    }
  }, [canvasEl, tool]);

  /** 把所有选中的检测框，按当前 effect 应用为打码 op */
  const applySelected = useCallback(() => {
    const ids = selectedDetectionIds;
    if (!ids.size) return;
    const targets = detections.filter((d) => ids.has(d.id));
    for (const d of targets) {
      const op: MosaicOp = {
        id: `op-ai-${Date.now()}-${d.id}`,
        type: 'rect',
        effect,
        strength,
        color,
        emoji,
        rect: d.rect,
      };
      addOp(op);
    }
    setDetections([]);
    setSelectedDetectionIds(new Set());
    setScanSummary('');
  }, [detections, selectedDetectionIds, effect, strength, color, emoji, addOp]);

  const toggleDetection = useCallback(
    (id: string) => {
      // 智选模式：点击立刻 addOp，再次点击 removeOp（即"点一下打码、再点撤销"）
      if (tool === 'smart') {
        const existingOpId = smartOpMap.get(id);
        if (existingOpId) {
          removeOp(existingOpId);
          setSmartOpMap((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          setSelectedDetectionIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          return;
        }
        const d = detections.find((x) => x.id === id);
        if (!d) return;
        const newOpId = `op-smart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        addOp({
          id: newOpId,
          type: 'rect',
          effect,
          strength,
          color,
          emoji,
          rect: d.rect,
        });
        setSmartOpMap((prev) => new Map(prev).set(id, newOpId));
        setSelectedDetectionIds((prev) => new Set(prev).add(id));
        return;
      }
      // 其他 AI 工具：维持"先选后批量打码"
      setSelectedDetectionIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [tool, smartOpMap, detections, addOp, removeOp, effect, strength, color, emoji],
  );

  const onCanvasReady = useCallback((c: any) => {
    setCanvasEl(c);
  }, []);

  const onExport = useCallback(async () => {
    if (!canvasEl) return;
    try {
      await exportCanvas(canvasEl, `mosaic-guard-${Date.now()}.png`);
      if (Platform.OS !== 'web') Alert.alert('导出成功', '图片已保存到系统相册');
    } catch (err: any) {
      const msg = err?.message || '导出失败';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('导出失败', msg);
    }
  }, [canvasEl]);

  const showAIBar =
    Platform.OS === 'web' && (tool === 'smart' || tool === 'face' || tool === 'ocr' || tool === 'watermark');
  const { width: winW } = useWindowDimensions();
  const isMobile = winW < 768;
  // native 端避开状态栏 / Home Indicator
  const insets = useSafeAreaInsets();

  if (!image) return null;

  const aiBar = showAIBar ? (
    <AIActionBar
      scanning={scanning}
      detectionCount={detections.length}
      selectedCount={selectedDetectionIds.size}
      onScan={runScan}
      onApply={applySelected}
      onClear={() => {
        setDetections([]);
        setSelectedDetectionIds(new Set());
        setScanSummary('');
      }}
      scanSummary={scanSummary}
    />
  ) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* 顶栏：移动端只留必要元素 */}
      <View style={[styles.topbar, isMobile && styles.topbarMobile]}>
        <Pressable
          onPress={() => router.replace('/')}
          style={({ hovered }: any) => [
            styles.back,
            isMobile && styles.backMobile,
            hovered && { backgroundColor: colors.glass },
          ]}
        >
          <Icon name="arrow-left" size={16} color={colors.text0} />
          {!isMobile && <Text style={styles.backLabel}>返回</Text>}
        </Pressable>

        <View style={styles.center}>
          <Text style={styles.title}>编辑</Text>
          {!isMobile && (
            <Text style={styles.meta}>
              {image.width} × {image.height} · {ops.length} 次操作
            </Text>
          )}
          {isMobile && (
            <Text style={styles.meta}>{ops.length} 次操作</Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={undo}
            disabled={!ops.length}
            style={({ hovered }: any) => [
              styles.iconBtn,
              hovered && ops.length > 0 && { backgroundColor: colors.glass },
              !ops.length && { opacity: 0.35 },
            ]}
          >
            <Icon name="undo" size={16} color={colors.text0} />
          </Pressable>
          <Pressable
            onPress={redo}
            style={({ hovered }: any) => [styles.iconBtn, hovered && { backgroundColor: colors.glass }]}
          >
            <Icon name="redo" size={16} color={colors.text0} />
          </Pressable>
          {!isMobile && (
            <Pressable
              onPress={clear}
              style={({ hovered }: any) => [styles.iconBtn, hovered && { backgroundColor: colors.glass }]}
            >
              <Icon name="x" size={16} color={colors.text0} />
            </Pressable>
          )}
          <Button
            label={isMobile ? '' : '导出'}
            icon={<Icon name="download" size={16} color="#0B0D12" />}
            onPress={onExport}
            size={isMobile ? 'sm' : 'md'}
          />
        </View>
      </View>

      {isMobile ? (
        // 移动端：上下布局
        <>
          <View style={styles.canvasWrap}>
            <EditorCanvas
              detections={detections}
              selectedDetectionIds={selectedDetectionIds}
              onToggleDetection={toggleDetection}
              onCanvasReady={onCanvasReady}
            />
            {aiBar}
          </View>
          <View style={styles.mobileDock}>
            <Toolbar compact />
            <EffectPanel compact />
          </View>
        </>
      ) : (
        // 桌面：三栏布局
        <View style={styles.body}>
          <Toolbar />
          <View style={styles.canvasWrap}>
            <EditorCanvas
              detections={detections}
              selectedDetectionIds={selectedDetectionIds}
              onToggleDetection={toggleDetection}
              onCanvasReady={onCanvasReady}
            />
            {aiBar}
          </View>
          <EffectPanel />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg0 },
  topbar: {
    height: 60,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg1,
    gap: spacing.md,
  },
  topbarMobile: {
    height: 52,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    cursor: 'pointer' as any,
  },
  backMobile: {
    paddingHorizontal: 8,
  },
  mobileDock: {
    backgroundColor: colors.bg1,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  backLabel: { color: colors.text0, fontFamily: font.family, fontSize: 13, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center' },
  title: { color: colors.text0, fontFamily: font.family, fontSize: 14, fontWeight: '700' },
  meta: { color: colors.text3, fontFamily: font.mono, fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    cursor: 'pointer' as any,
  },
  body: { flex: 1, flexDirection: 'row' },
  canvasWrap: { flex: 1, flexDirection: 'column' },
});
