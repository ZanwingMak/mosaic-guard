// 编辑器画布（Native）：用内嵌 Canvas WebView 承接触摸绘制、预览和导出
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useEditor, MosaicOp } from '@/store/editor';
import { colors, font, radius, spacing } from '@/theme';

export interface Detection {
  id: string;
  type: 'face' | 'text';
  rect: { x: number; y: number; w: number; h: number };
  label?: string;
  confidence?: number;
}

export interface NativeCanvasBridge {
  exportPng: () => Promise<string>;
}

interface Props {
  detections?: Detection[];
  selectedDetectionIds?: Set<string>;
  onToggleDetection?: (id: string) => void;
  onCanvasReady?: (canvas: NativeCanvasBridge) => void;
}

type PendingExport = {
  resolve: (dataUrl: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type NativeCanvasMessage =
  | { type: 'webReady' }
  | { type: 'canvasReady' }
  | { type: 'addOp'; op: MosaicOp }
  | { type: 'toggleDetection'; id: string }
  | { type: 'exportResult'; dataUrl: string }
  | { type: 'error'; message?: string };

/** 原生编辑器画布：把 RN 状态同步到 WebView Canvas，并接收绘制结果 */
export function EditorCanvas({ detections, selectedDetectionIds, onToggleDetection, onCanvasReady }: Props) {
  const webRef = useRef<WebView | null>(null);
  const pendingExportRef = useRef<PendingExport | null>(null);
  const lastPostedImageUriRef = useRef<string | null>(null);

  const image = useEditor((s) => s.image);
  const ops = useEditor((s) => s.ops);
  const tool = useEditor((s) => s.tool);
  const effect = useEditor((s) => s.effect);
  const strength = useEditor((s) => s.strength);
  const brushSize = useEditor((s) => s.brushSize);
  const emoji = useEditor((s) => s.emoji);
  const color = useEditor((s) => s.color);
  const addOp = useEditor((s) => s.addOp);

  const [webReady, setWebReady] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  /** 暴露给上层导出的桥接对象，导出时向 WebView 请求 PNG dataURL */
  const canvasBridge = useMemo<NativeCanvasBridge>(
    () => ({
      exportPng: () =>
        new Promise((resolve, reject) => {
          if (!webRef.current) {
            reject(new Error('原生画布尚未就绪'));
            return;
          }
          if (pendingExportRef.current) {
            clearTimeout(pendingExportRef.current.timer);
            pendingExportRef.current.reject(new Error('新的导出请求已取代旧请求'));
          }
          const timer = setTimeout(() => {
            pendingExportRef.current = null;
            reject(new Error('导出超时，请重试'));
          }, 15000);
          pendingExportRef.current = { resolve, reject, timer };
          webRef.current.postMessage(JSON.stringify({ type: 'export' }));
        }),
    }),
    [],
  );

  /** 将本地文件图片转成 dataURL，确保 WebView Canvas 可安全读取像素 */
  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    setImageUri(null);
    setLoadError('');
    prepareImageUri(image.uri)
      .then((uri) => {
        if (!cancelled) setImageUri(uri);
      })
      .catch((error: any) => {
        if (!cancelled) setLoadError(error?.message || '图片加载失败');
      });
    return () => {
      cancelled = true;
    };
  }, [image]);

  /** 把当前编辑状态发送到 WebView，图片 dataURL 仅在变化或重载后发送 */
  const postEditorState = useCallback(() => {
    if (!webRef.current || !webReady || !image || !imageUri) return;
    const shouldSendImage = lastPostedImageUriRef.current !== imageUri;
    const payload = {
      image: shouldSendImage ? { uri: imageUri, width: image.width, height: image.height } : undefined,
      ops,
      tool,
      effect,
      strength,
      brushSize,
      emoji,
      color,
      detections: detections || [],
      selectedDetectionIds: Array.from(selectedDetectionIds || []),
    };
    webRef.current.postMessage(JSON.stringify({ type: 'state', payload }));
    if (shouldSendImage) lastPostedImageUriRef.current = imageUri;
  }, [
    brushSize,
    color,
    detections,
    effect,
    emoji,
    image,
    imageUri,
    ops,
    selectedDetectionIds,
    strength,
    tool,
    webReady,
  ]);

  useEffect(() => {
    postEditorState();
  }, [postEditorState]);

  /** 组件卸载时清理尚未完成的导出请求 */
  useEffect(() => {
    return () => {
      const pending = pendingExportRef.current;
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingExportRef.current = null;
      pending.reject(new Error('原生画布已关闭'));
    };
  }, []);

  /** 处理 WebView 回传的绘制、导出和检测框点击消息 */
  const handleWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: NativeCanvasMessage;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (message.type === 'webReady') {
        lastPostedImageUriRef.current = null;
        setWebReady(true);
        return;
      }
      if (message.type === 'canvasReady') {
        onCanvasReady?.(canvasBridge);
        return;
      }
      if (message.type === 'addOp') {
        addOp(message.op);
        return;
      }
      if (message.type === 'toggleDetection') {
        onToggleDetection?.(message.id);
        return;
      }
      if (message.type === 'exportResult') {
        const pending = pendingExportRef.current;
        if (!pending) return;
        clearTimeout(pending.timer);
        pendingExportRef.current = null;
        pending.resolve(message.dataUrl);
        return;
      }
      if (message.type === 'error') {
        const pending = pendingExportRef.current;
        if (pending) {
          clearTimeout(pending.timer);
          pendingExportRef.current = null;
          pending.reject(new Error(message.message || '画布处理失败'));
        } else {
          setLoadError(message.message || '画布处理失败');
        }
      }
    },
    [addOp, canvasBridge, onCanvasReady, onToggleDetection],
  );

  if (!image) return null;

  if (loadError) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>图片加载失败</Text>
        <Text style={styles.emptyText}>{loadError}</Text>
      </View>
    );
  }

  if (!imageUri) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.emptyText}>正在准备原生画布…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: NATIVE_CANVAS_HTML }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        onMessage={handleWebMessage}
      />
    </View>
  );
}

/** 推断图片 MIME 类型，用于构造 WebView 可读的 dataURL */
function getImageMime(uri: string) {
  const cleanUri = uri.split('?')[0].toLowerCase();
  if (cleanUri.endsWith('.png')) return 'image/png';
  if (cleanUri.endsWith('.webp')) return 'image/webp';
  if (cleanUri.endsWith('.gif')) return 'image/gif';
  if (cleanUri.endsWith('.heic') || cleanUri.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

/** 准备传入 WebView 的图片地址，本地文件会转成 base64 dataURL */
async function prepareImageUri(uri: string) {
  if (uri.startsWith('data:') || uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return `data:${getImageMime(uri)};base64,${base64}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg0,
  },
  emptyTitle: {
    color: colors.text0,
    fontFamily: font.family,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.text2,
    fontFamily: font.family,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});

const NATIVE_CANVAS_HTML = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <style>
    html, body, #stage {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: ${colors.bg0};
      color: ${colors.text0};
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }
    #stage {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      padding: ${spacing.lg}px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #box {
      position: relative;
      overflow: hidden;
      border-radius: ${radius.lg}px;
      background: ${colors.bg1};
      box-shadow: 0 24px 70px rgba(0,0,0,0.48);
      touch-action: none;
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    #hint {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${colors.text2};
      font-size: 13px;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="stage">
    <div id="box">
      <canvas id="display"></canvas>
      <canvas id="overlay"></canvas>
      <div id="hint">正在加载图片...</div>
    </div>
  </div>
  <script>
    var stage = document.getElementById('stage');
    var box = document.getElementById('box');
    var display = document.getElementById('display');
    var overlay = document.getElementById('overlay');
    var hint = document.getElementById('hint');
    var displayCtx = display.getContext('2d');
    var overlayCtx = overlay.getContext('2d');
    var sourceImg = null;
    var sourceCanvas = null;
    var state = {
      image: null,
      ops: [],
      tool: 'rect',
      effect: 'pixelate',
      strength: 50,
      brushSize: 30,
      emoji: '😎',
      color: '#0B0D12',
      detections: [],
      selectedDetectionIds: []
    };
    var liveStroke = [];
    var liveRect = null;
    var dragStart = null;
    var pointerDown = false;

    /** 向 React Native 发送结构化消息 */
    function postNative(message) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    /** 从 React Native 消息中解析并分发指令 */
    function handleNativeMessage(event) {
      var message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      if (message.type === 'state') applyState(message.payload || {});
      if (message.type === 'export') exportImage();
    }

    /** 应用 RN 传入的编辑状态，图片变化时重新加载底图 */
    function applyState(next) {
      var oldUri = state.image && state.image.uri;
      if (next.image) state.image = next.image;
      state.ops = next.ops || [];
      state.tool = next.tool || state.tool;
      state.effect = next.effect || state.effect;
      state.strength = typeof next.strength === 'number' ? next.strength : state.strength;
      state.brushSize = typeof next.brushSize === 'number' ? next.brushSize : state.brushSize;
      state.emoji = next.emoji || state.emoji;
      state.color = next.color || state.color;
      state.detections = next.detections || [];
      state.selectedDetectionIds = next.selectedDetectionIds || [];
      liveStroke = [];
      liveRect = null;
      dragStart = null;

      var newUri = state.image && state.image.uri;
      if (newUri && newUri !== oldUri) {
        loadImage(newUri);
        return;
      }
      if (sourceImg) {
        resizeCanvas();
        renderAll();
        drawOverlay();
      }
    }

    /** 加载图片并初始化展示 canvas 与原图离屏缓存 */
    function loadImage(uri) {
      hint.style.display = 'flex';
      var img = new Image();
      img.onload = function () {
        sourceImg = img;
        sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = img.naturalWidth;
        sourceCanvas.height = img.naturalHeight;
        sourceCanvas.getContext('2d').drawImage(img, 0, 0);
        display.width = img.naturalWidth;
        display.height = img.naturalHeight;
        overlay.width = img.naturalWidth;
        overlay.height = img.naturalHeight;
        hint.style.display = 'none';
        resizeCanvas();
        renderAll();
        drawOverlay();
        postNative({ type: 'canvasReady' });
      };
      img.onerror = function () {
        postNative({ type: 'error', message: '图片无法载入原生画布' });
      };
      img.src = uri;
    }

    /** 根据 WebView 可视区域等比缩放画布显示尺寸 */
    function resizeCanvas() {
      if (!sourceImg) return;
      var padding = ${spacing.lg * 2};
      var maxW = Math.max(1, stage.clientWidth - padding);
      var maxH = Math.max(1, stage.clientHeight - padding);
      var scale = Math.min(maxW / sourceImg.naturalWidth, maxH / sourceImg.naturalHeight, 1);
      box.style.width = Math.max(1, Math.round(sourceImg.naturalWidth * scale)) + 'px';
      box.style.height = Math.max(1, Math.round(sourceImg.naturalHeight * scale)) + 'px';
    }

    /** 重绘最终画面：底图 + 已落地的所有打码 op */
    function renderAll() {
      if (!sourceImg || !sourceCanvas) return;
      display.width = sourceImg.naturalWidth;
      display.height = sourceImg.naturalHeight;
      displayCtx.clearRect(0, 0, display.width, display.height);
      displayCtx.drawImage(sourceImg, 0, 0, display.width, display.height);
      for (var i = 0; i < state.ops.length; i++) {
        applyOp(displayCtx, sourceCanvas, state.ops[i], display.width, display.height);
      }
    }

    /** 重绘预览层：实时笔触、矩形选区和 AI 检测框 */
    function drawOverlay() {
      if (!sourceImg || !sourceCanvas) return;
      overlay.width = sourceImg.naturalWidth;
      overlay.height = sourceImg.naturalHeight;
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

      if (liveStroke.length) {
        applyOp(overlayCtx, sourceCanvas, {
          id: 'live',
          type: 'brush',
          effect: state.effect,
          strength: state.strength,
          color: state.color,
          emoji: state.emoji,
          points: liveStroke
        }, overlay.width, overlay.height);
      }

      if (liveRect) {
        applyOp(overlayCtx, sourceCanvas, {
          id: 'live',
          type: 'rect',
          effect: state.effect,
          strength: state.strength,
          color: state.color,
          emoji: state.emoji,
          rect: liveRect
        }, overlay.width, overlay.height);
        overlayCtx.save();
        overlayCtx.strokeStyle = '${colors.brand}';
        overlayCtx.lineWidth = 2;
        overlayCtx.setLineDash([6, 4]);
        overlayCtx.strokeRect(liveRect.x, liveRect.y, liveRect.w, liveRect.h);
        overlayCtx.restore();
      }

      for (var i = 0; i < state.detections.length; i++) {
        drawDetection(state.detections[i]);
      }
    }

    /** 绘制单个检测框及选中标记 */
    function drawDetection(detection) {
      var selected = state.selectedDetectionIds.indexOf(detection.id) >= 0;
      overlayCtx.save();
      if (selected) {
        overlayCtx.fillStyle = 'rgba(79,209,197,0.22)';
        overlayCtx.fillRect(detection.rect.x, detection.rect.y, detection.rect.w, detection.rect.h);
        overlayCtx.strokeStyle = '${colors.brand}';
        overlayCtx.lineWidth = 2.5;
        overlayCtx.setLineDash([]);
      } else {
        overlayCtx.strokeStyle = 'rgba(79,209,197,0.7)';
        overlayCtx.lineWidth = 1.6;
        overlayCtx.setLineDash([5, 4]);
      }
      overlayCtx.strokeRect(detection.rect.x, detection.rect.y, detection.rect.w, detection.rect.h);
      overlayCtx.setLineDash([]);
      if (selected) {
        var badge = 18;
        var bx = detection.rect.x + detection.rect.w - badge - 2;
        var by = detection.rect.y + 2;
        overlayCtx.fillStyle = '${colors.brand}';
        overlayCtx.fillRect(bx, by, badge, badge);
        overlayCtx.strokeStyle = '#0B0D12';
        overlayCtx.lineWidth = 2;
        overlayCtx.beginPath();
        overlayCtx.moveTo(bx + 4, by + 9);
        overlayCtx.lineTo(bx + 8, by + 13);
        overlayCtx.lineTo(bx + 14, by + 5);
        overlayCtx.stroke();
      }
      overlayCtx.restore();
    }

    /** 将触摸点从屏幕坐标映射回原图坐标 */
    function toImageCoord(event) {
      var rect = overlay.getBoundingClientRect();
      var sx = overlay.width / rect.width;
      var sy = overlay.height / rect.height;
      return {
        x: (event.clientX - rect.left) * sx,
        y: (event.clientY - rect.top) * sy
      };
    }

    /** 创建唯一 op id，保持和 Web 端历史栈结构一致 */
    function makeOpId() {
      return 'op-native-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    }

    /** 判断当前工具是否需要按矩形框选方式在原生端落地 */
    function isRectLikeTool(tool) {
      return tool === 'rect' || tool === 'smart' || tool === 'face' || tool === 'ocr' || tool === 'watermark';
    }

    /** 判断当前工具是否支持命中检测框 */
    function isDetectionTool(tool) {
      return tool === 'smart' || tool === 'face' || tool === 'ocr' || tool === 'watermark';
    }

    /** 处理触摸开始：根据当前工具进入笔刷或矩形绘制状态 */
    function handlePointerDown(event) {
      if (!sourceImg) return;
      event.preventDefault();
      pointerDown = true;
      var point = toImageCoord(event);
      if (state.tool === 'brush') {
        liveStroke = [{ x: point.x, y: point.y, radius: state.brushSize }];
        drawOverlay();
      } else if (isRectLikeTool(state.tool)) {
        dragStart = point;
        liveRect = { x: point.x, y: point.y, w: 0, h: 0 };
        drawOverlay();
      }
    }

    /** 处理触摸移动：更新实时笔刷轨迹或矩形范围 */
    function handlePointerMove(event) {
      if (!pointerDown || !sourceImg) return;
      event.preventDefault();
      var point = toImageCoord(event);
      if (state.tool === 'brush' && liveStroke.length) {
        liveStroke.push({ x: point.x, y: point.y, radius: state.brushSize });
        drawOverlay();
      } else if (isRectLikeTool(state.tool) && dragStart) {
        liveRect = {
          x: Math.min(dragStart.x, point.x),
          y: Math.min(dragStart.y, point.y),
          w: Math.abs(point.x - dragStart.x),
          h: Math.abs(point.y - dragStart.y)
        };
        drawOverlay();
      }
    }

    /** 处理触摸结束：落地 op 或命中检测框切换选中 */
    function handlePointerUp(event) {
      if (!sourceImg) return;
      event.preventDefault();
      pointerDown = false;
      if (state.tool === 'brush' && liveStroke.length) {
        postNative({
          type: 'addOp',
          op: {
            id: makeOpId(),
            type: 'brush',
            effect: state.effect,
            strength: state.strength,
            color: state.color,
            emoji: state.emoji,
            points: liveStroke
          }
        });
        liveStroke = [];
        drawOverlay();
        return;
      }
      if (isRectLikeTool(state.tool) && liveRect && liveRect.w > 2 && liveRect.h > 2) {
        postNative({
          type: 'addOp',
          op: {
            id: makeOpId(),
            type: 'rect',
            effect: state.effect,
            strength: state.strength,
            color: state.color,
            emoji: state.emoji,
            rect: liveRect
          }
        });
        liveRect = null;
        dragStart = null;
        drawOverlay();
        return;
      }
      var hit = hitDetection(toImageCoord(event));
      if (hit) postNative({ type: 'toggleDetection', id: hit.id });
      liveStroke = [];
      liveRect = null;
      dragStart = null;
      drawOverlay();
    }

    /** 在检测框列表中命中面积最小的框，方便重叠时精确选择 */
    function hitDetection(point) {
      if (!isDetectionTool(state.tool)) return null;
      var hits = state.detections.filter(function (detection) {
        var r = detection.rect;
        return point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h;
      });
      hits.sort(function (a, b) {
        return a.rect.w * a.rect.h - b.rect.w * b.rect.h;
      });
      return hits[0] || null;
    }

    /** 导出当前最终画面为 PNG dataURL */
    function exportImage() {
      try {
        renderAll();
        postNative({ type: 'exportResult', dataUrl: display.toDataURL('image/png') });
      } catch (error) {
        postNative({ type: 'error', message: error && error.message ? error.message : '导出失败' });
      }
    }

    /** 构造 op 的裁剪路径 */
    function buildOpPath(op) {
      var path = new Path2D();
      if (op.type === 'rect' && op.rect) {
        path.rect(op.rect.x, op.rect.y, op.rect.w, op.rect.h);
      } else if (op.type === 'brush' && op.points) {
        for (var i = 0; i < op.points.length; i++) {
          var pt = op.points[i];
          path.moveTo(pt.x + pt.radius, pt.y);
          path.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        }
      }
      return path;
    }

    /** 计算 op 的外接矩形，用于局部像素处理 */
    function getOpBounds(op, imgW, imgH) {
      if (op.type === 'rect' && op.rect) {
        return clampRect(op.rect.x, op.rect.y, op.rect.w, op.rect.h, imgW, imgH);
      }
      if (op.type === 'brush' && op.points && op.points.length) {
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        for (var i = 0; i < op.points.length; i++) {
          var p = op.points[i];
          minX = Math.min(minX, p.x - p.radius);
          minY = Math.min(minY, p.y - p.radius);
          maxX = Math.max(maxX, p.x + p.radius);
          maxY = Math.max(maxY, p.y + p.radius);
        }
        return clampRect(minX, minY, maxX - minX, maxY - minY, imgW, imgH);
      }
      return { x: 0, y: 0, w: 0, h: 0 };
    }

    /** 把矩形裁剪到图片范围内 */
    function clampRect(x, y, w, h, maxW, maxH) {
      var x1 = Math.max(0, Math.floor(x));
      var y1 = Math.max(0, Math.floor(y));
      var x2 = Math.min(maxW, Math.ceil(x + w));
      var y2 = Math.min(maxH, Math.ceil(y + h));
      return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
    }

    /** 按 effect 类型把单个 op 应用到目标上下文 */
    function applyOp(ctx, srcCanvas, op, width, height) {
      if (!op) return;
      if (op.effect === 'pixelate') applyPixelate(ctx, srcCanvas, op, width, height);
      if (op.effect === 'blur') applyBlur(ctx, srcCanvas, op, width, height);
      if (op.effect === 'solid') applySolid(ctx, op);
      if (op.effect === 'sticker') applySticker(ctx, op);
    }

    /** 像素化：缩小再放大局部区域，并用 op 路径裁剪 */
    function applyPixelate(ctx, srcCanvas, op, width, height) {
      var bounds = getOpBounds(op, width, height);
      if (!bounds.w || !bounds.h) return;
      var block = Math.max(4, Math.round((op.strength / 100) * 56 + 4));
      var tmp = document.createElement('canvas');
      tmp.width = Math.max(1, Math.ceil(bounds.w / block));
      tmp.height = Math.max(1, Math.ceil(bounds.h / block));
      var tmpCtx = tmp.getContext('2d');
      tmpCtx.imageSmoothingEnabled = false;
      tmpCtx.drawImage(srcCanvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, tmp.width, tmp.height);
      ctx.save();
      ctx.clip(buildOpPath(op));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.restore();
    }

    /** 模糊：在临时 canvas 中放大边界后滤镜处理，再裁剪贴回 */
    function applyBlur(ctx, srcCanvas, op, width, height) {
      var bounds = getOpBounds(op, width, height);
      if (!bounds.w || !bounds.h) return;
      var blurRadius = Math.round((op.strength / 100) * 36 + 4);
      var pad = blurRadius * 2;
      var bx = Math.max(0, bounds.x - pad);
      var by = Math.max(0, bounds.y - pad);
      var bw = Math.min(width, bounds.x + bounds.w + pad) - bx;
      var bh = Math.min(height, bounds.y + bounds.h + pad) - by;
      var tmp = document.createElement('canvas');
      tmp.width = bw;
      tmp.height = bh;
      var tmpCtx = tmp.getContext('2d');
      tmpCtx.filter = 'blur(' + blurRadius + 'px)';
      tmpCtx.drawImage(srcCanvas, bx, by, bw, bh, 0, 0, bw, bh);
      ctx.save();
      ctx.clip(buildOpPath(op));
      ctx.drawImage(tmp, bx, by);
      ctx.restore();
    }

    /** 纯色遮挡：用配置色填充 op 路径 */
    function applySolid(ctx, op) {
      ctx.save();
      ctx.fillStyle = op.color || '#0B0D12';
      ctx.fill(buildOpPath(op));
      ctx.restore();
    }

    /** 贴纸遮挡：矩形内平铺 emoji，笔刷按轨迹点绘制 */
    function applySticker(ctx, op) {
      var emoji = op.emoji || '😎';
      ctx.save();
      if (op.type === 'rect' && op.rect) {
        var r = op.rect;
        var size = Math.max(24, Math.round((op.strength / 100) * Math.min(r.w, r.h)));
        ctx.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.clip(buildOpPath(op));
        var cols = Math.max(1, Math.ceil(r.w / size));
        var rows = Math.max(1, Math.ceil(r.h / size));
        for (var row = 0; row < rows; row++) {
          for (var col = 0; col < cols; col++) {
            ctx.fillText(emoji, r.x + col * size + size / 2, r.y + row * size + size / 2);
          }
        }
      } else if (op.type === 'brush' && op.points) {
        for (var i = 0; i < op.points.length; i++) {
          var p = op.points[i];
          var brushSize = Math.max(24, p.radius * 2.2);
          ctx.font = brushSize + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(emoji, p.x, p.y);
        }
      }
      ctx.restore();
    }

    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('message', handleNativeMessage);
    window.addEventListener('resize', function () {
      resizeCanvas();
      drawOverlay();
    });
    box.addEventListener('pointerdown', handlePointerDown);
    box.addEventListener('pointermove', handlePointerMove);
    box.addEventListener('pointerup', handlePointerUp);
    box.addEventListener('pointercancel', handlePointerUp);
    postNative({ type: 'webReady' });
  </script>
</body>
</html>
`;
