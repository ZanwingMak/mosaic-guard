// 编辑器画布（Web 实现）
// 双 canvas 架构：display 显示已落地的所有 op，overlay 显示进行中的笔触/选区/检测框
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useEditor, MosaicOp } from '@/store/editor';
import { loadHTMLImage, renderToCanvas, applyOp } from '@/lib/mosaic';
import { colors, radius, font } from '@/theme';

export interface Detection {
  id: string;
  type: 'face' | 'text';
  rect: { x: number; y: number; w: number; h: number };
  label?: string;     // OCR 命中的内容（可选）
  confidence?: number;
}

interface Props {
  detections?: Detection[];                                // 待用户确认的检测框
  selectedDetectionIds?: Set<string>;                       // 已选中
  onToggleDetection?: (id: string) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;     // 暴露最终合成 canvas（用于导出/AI）
}

export function EditorCanvas({ detections, selectedDetectionIds, onToggleDetection, onCanvasReady }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const offscreenSrcRef = useRef<HTMLCanvasElement | null>(null);

  const image = useEditor((s) => s.image);
  const ops = useEditor((s) => s.ops);
  const tool = useEditor((s) => s.tool);
  const effect = useEditor((s) => s.effect);
  const strength = useEditor((s) => s.strength);
  const brushSize = useEditor((s) => s.brushSize);
  const emoji = useEditor((s) => s.emoji);
  const color = useEditor((s) => s.color);
  const addOp = useEditor((s) => s.addOp);

  const [scale, setScale] = useState(1);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  // 图片真正加载完成后再渲染 canvas（不能依赖 ref 的变化触发重渲染）
  const [imageReady, setImageReady] = useState(false);
  // 当前鼠标悬停在哪个检测框上（用于高亮 + 改 cursor 提示可点击）
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 当前正在拖拽的笔触/矩形（图像坐标）
  const liveStrokeRef = useRef<Array<{ x: number; y: number; radius: number }>>([]);
  const liveRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  /** 加载图片到 HTMLImageElement */
  useEffect(() => {
    if (!image) return;
    let aborted = false;
    setImageReady(false);
    loadHTMLImage(image.uri).then(async (img) => {
      if (aborted) return;
      imgRef.current = img;
      // 离屏原图缓存（提供取色源）
      const src = document.createElement('canvas');
      src.width = img.naturalWidth;
      src.height = img.naturalHeight;
      src.getContext('2d')!.drawImage(img, 0, 0);
      offscreenSrcRef.current = src;
      setImageReady(true); // 触发重渲染，挂载 canvas
    });
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  /** imageReady 切到 true 之后再把图绘到 display canvas 上 */
  useEffect(() => {
    if (!imageReady) return;
    renderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageReady]);

  /** 完整重渲染：display 画底图 + 所有 op */
  const renderAll = useCallback(async () => {
    const img = imgRef.current;
    const canvas = displayRef.current;
    if (!img || !canvas) return;
    await renderToCanvas(canvas, img, ops);
    onCanvasReady?.(canvas);
  }, [ops, onCanvasReady]);

  useEffect(() => {
    renderAll();
  }, [renderAll]);

  /**
   * 响应容器尺寸变化 + 图片就绪：重算缩放比
   * 关键修复：之前 observer 首次回调时图还没加载完，错过了 imgRef.current 就绪后的重算。
   * 缩放策略：
   *  - 竖图 + 横屏容器：按宽度 fit（不超过 1.0），竖向滚动浏览
   *  - 其它情况：按小边 fit，不溢出
   */
  useEffect(() => {
    if (!containerRef.current || !imageReady) return;
    const el = containerRef.current;
    const recalc = () => {
      const img = imgRef.current;
      if (!img) return;
      const rect = el.getBoundingClientRect();
      const padding = 24 * 2; // innerCenterStyle 的 padding
      const w = Math.max(0, rect.width - padding);
      const h = Math.max(0, rect.height - padding);
      setViewport({ w, h });
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const containerRatio = w / h;
      const fitMin = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const fitWidth = Math.min(w / img.naturalWidth, 1.0);
      const s = imgRatio < 0.85 && containerRatio > 1.1 ? fitWidth : fitMin;
      setScale(s > 0 ? s : 1);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageReady]);

  /** 屏幕坐标 → 原图坐标 */
  const toImageCoord = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = overlayRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
    },
    [],
  );

  /** Pointer 事件：根据 tool 走不同处理 */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    if (tool !== 'brush' && tool !== 'rect') return;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    const p = toImageCoord(e.clientX, e.clientY);
    if (tool === 'brush') {
      liveStrokeRef.current = [{ x: p.x, y: p.y, radius: brushSize }];
      drawOverlay();
    } else if (tool === 'rect') {
      dragStartRef.current = p;
      liveRectRef.current = { x: p.x, y: p.y, w: 0, h: 0 };
      drawOverlay();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // 检测框悬停高亮（在 face/ocr/smart/watermark 工具下都生效）
    if (detections?.length && (tool === 'smart' || tool === 'face' || tool === 'ocr' || tool === 'watermark')) {
      const p = toImageCoord(e.clientX, e.clientY);
      const inside = detections.filter(
        (d) => p.x >= d.rect.x && p.x <= d.rect.x + d.rect.w && p.y >= d.rect.y && p.y <= d.rect.y + d.rect.h,
      );
      if (inside.length) {
        inside.sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h);
        if (inside[0].id !== hoveredId) setHoveredId(inside[0].id);
      } else if (hoveredId) {
        setHoveredId(null);
      }
    }
    if (tool === 'brush' && liveStrokeRef.current.length) {
      const p = toImageCoord(e.clientX, e.clientY);
      liveStrokeRef.current.push({ x: p.x, y: p.y, radius: brushSize });
      drawOverlay();
    } else if (tool === 'rect' && dragStartRef.current) {
      const p = toImageCoord(e.clientX, e.clientY);
      const s = dragStartRef.current;
      liveRectRef.current = {
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      };
      drawOverlay();
    }
  };

  const handlePointerUp = () => {
    if (tool === 'brush' && liveStrokeRef.current.length) {
      const op: MosaicOp = {
        id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'brush',
        effect,
        strength,
        color,
        emoji,
        points: liveStrokeRef.current,
      };
      addOp(op);
      liveStrokeRef.current = [];
    } else if (tool === 'rect' && liveRectRef.current && liveRectRef.current.w > 2 && liveRectRef.current.h > 2) {
      const op: MosaicOp = {
        id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'rect',
        effect,
        strength,
        color,
        emoji,
        rect: liveRectRef.current,
      };
      addOp(op);
      liveRectRef.current = null;
      dragStartRef.current = null;
    }
    drawOverlay();
  };

  /** 重绘 overlay：实时笔触预览 + 检测框 */
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 进行中的笔触
    if (liveStrokeRef.current.length && offscreenSrcRef.current) {
      const previewOp: MosaicOp = {
        id: 'live',
        type: 'brush',
        effect,
        strength,
        color,
        emoji,
        points: liveStrokeRef.current,
      };
      applyOp(ctx, offscreenSrcRef.current, previewOp, img.naturalWidth, img.naturalHeight);
    }
    // 进行中的矩形
    if (liveRectRef.current && offscreenSrcRef.current) {
      const previewOp: MosaicOp = {
        id: 'live',
        type: 'rect',
        effect,
        strength,
        color,
        emoji,
        rect: liveRectRef.current,
      };
      applyOp(ctx, offscreenSrcRef.current, previewOp, img.naturalWidth, img.naturalHeight);
      // 描边
      ctx.strokeStyle = colors.brand;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(
        liveRectRef.current.x,
        liveRectRef.current.y,
        liveRectRef.current.w,
        liveRectRef.current.h,
      );
      ctx.setLineDash([]);
    }

    // 检测框：默认只画浅色虚线；悬停/选中再加品牌色填充。不再画浮动 label
    if (detections?.length) {
      for (const d of detections) {
        const selected = selectedDetectionIds?.has(d.id);
        const hovered = hoveredId === d.id;
        if (selected) {
          ctx.fillStyle = 'rgba(79,209,197,0.22)';
          ctx.fillRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
          ctx.strokeStyle = colors.brand;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        } else if (hovered) {
          ctx.fillStyle = 'rgba(79,209,197,0.14)';
          ctx.fillRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
          ctx.strokeStyle = colors.brand;
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
        } else {
          // 默认虚线：品牌色 + 较低透明度，浅底深底都能看清
          ctx.strokeStyle = 'rgba(79,209,197,0.7)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
        }
        ctx.strokeRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
        ctx.setLineDash([]);

        // 选中：右上角内角画一个极小的 ✓ 徽章
        if (selected) {
          const badge = 16;
          const bx = d.rect.x + d.rect.w - badge - 2;
          const by = d.rect.y + 2;
          ctx.fillStyle = colors.brand;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(bx, by, badge, badge, 4) : ctx.rect(bx, by, badge, badge);
          ctx.fill();
          ctx.strokeStyle = '#0B0D12';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(bx + 4, by + 8);
          ctx.lineTo(bx + 7, by + 11);
          ctx.lineTo(bx + 12, by + 5);
          ctx.stroke();
        }
      }
    }
  }, [effect, strength, color, emoji, detections, selectedDetectionIds, hoveredId]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  /** 点击检测框：切换选中（在 overlay 上做命中测试） */
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!detections?.length || !onToggleDetection) return;
    if (tool !== 'face' && tool !== 'ocr' && tool !== 'smart' && tool !== 'watermark') return;
    const p = toImageCoord(e.clientX, e.clientY);
    // 多框重叠时取面积最小的（更精确）
    const hits = detections.filter(
      (d) => p.x >= d.rect.x && p.x <= d.rect.x + d.rect.w && p.y >= d.rect.y && p.y <= d.rect.y + d.rect.h,
    );
    if (!hits.length) return;
    hits.sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h);
    onToggleDetection(hits[0].id);
  };

  const cursor =
    tool === 'brush' ? 'crosshair' : tool === 'rect' ? 'crosshair' : detections?.length ? 'pointer' : 'default';

  if (!image || !imageReady || !imgRef.current) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>正在加载图片…</Text>
      </View>
    );
  }

  const dispW = imgRef.current.naturalWidth * scale;
  const dispH = imgRef.current.naturalHeight * scale;

  return (
    <View
      // @ts-ignore web ref
      ref={containerRef}
      style={styles.container}
    >
      {/* @ts-ignore 滚动外壳：竖图 / 高分辨率图超出容器时可纵横向滚动浏览 */}
      <div style={scrollWrapStyle}>
        {/* @ts-ignore 居中内层：用 minHeight 100% 让短图依旧垂直居中 */}
        <div style={innerCenterStyle}>
          {/* @ts-ignore canvas 实体容器；flexShrink:0 防止被父级 flex 压扁 */}
          <div
            style={{
              width: dispW,
              height: dispH,
              flexShrink: 0,
              position: 'relative',
              cursor,
              touchAction: 'none',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => setHoveredId(null)}
            onClick={handleClick}
          >
            {/* @ts-ignore */}
            <canvas
              ref={displayRef as any}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
            {/* @ts-ignore */}
            <canvas
              ref={overlayRef as any}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </View>
  );
}

// 外层滚动壳（占满 container，溢出时滚动）
const scrollWrapStyle: any = {
  width: '100%',
  height: '100%',
  overflow: 'auto',
  display: 'flex',
};
// 内层居中：用 flexbox 居中 + minHeight 100% 让短图也能垂直居中
const innerCenterStyle: any = {
  margin: 'auto',
  padding: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '100%',
  minHeight: '100%',
  boxSizing: 'border-box',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
    // 内部 scrollWrapStyle + innerCenterStyle 自行处理居中与 padding
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: colors.text2, fontFamily: font.family, fontSize: 14 },
});
