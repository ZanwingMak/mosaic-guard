// 马赛克渲染核心：基于 HTML5 Canvas 实现 4 种效果
// 每个 op 在原图坐标系下，按形状（brush 笔触 / rect 矩形）和效果应用到指定区域
import type { MosaicOp, ImageSource } from '@/store/editor';

/** 将 dataURL/blob URL 加载为 HTMLImageElement */
export function loadHTMLImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = uri;
  });
}

/** 构造与 op 形状对应的 Path2D（用于裁剪绘制区域） */
export function buildOpPath(op: MosaicOp): Path2D {
  const p = new Path2D();
  if (op.type === 'rect' && op.rect) {
    const { x, y, w, h } = op.rect;
    p.rect(x, y, w, h);
  } else if (op.type === 'brush' && op.points) {
    // 用圆点串联：每个点画一个圆，整体形成连续涂抹路径
    for (const pt of op.points) {
      p.moveTo(pt.x + pt.radius, pt.y);
      p.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
    }
  }
  return p;
}

/** 计算 op 的轴对齐外接矩形（用于局部 putImageData 优化） */
export function getOpBounds(op: MosaicOp, imgW: number, imgH: number) {
  if (op.type === 'rect' && op.rect) {
    return clampRect(op.rect.x, op.rect.y, op.rect.w, op.rect.h, imgW, imgH);
  }
  if (op.type === 'brush' && op.points?.length) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of op.points) {
      minX = Math.min(minX, p.x - p.radius);
      minY = Math.min(minY, p.y - p.radius);
      maxX = Math.max(maxX, p.x + p.radius);
      maxY = Math.max(maxY, p.y + p.radius);
    }
    return clampRect(minX, minY, maxX - minX, maxY - minY, imgW, imgH);
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

function clampRect(x: number, y: number, w: number, h: number, maxW: number, maxH: number) {
  const x1 = Math.max(0, Math.floor(x));
  const y1 = Math.max(0, Math.floor(y));
  const x2 = Math.min(maxW, Math.ceil(x + w));
  const y2 = Math.min(maxH, Math.ceil(y + h));
  return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
}

/**
 * 在目标 canvas 上渲染：先画原图，再按顺序叠加所有 op 的马赛克效果
 * - sourceImg: 原图 HTMLImageElement
 * - ops: 操作序列
 */
export async function renderToCanvas(
  target: HTMLCanvasElement,
  sourceImg: HTMLImageElement,
  ops: MosaicOp[],
) {
  const W = sourceImg.naturalWidth;
  const H = sourceImg.naturalHeight;
  target.width = W;
  target.height = H;
  const ctx = target.getContext('2d');
  if (!ctx) return;

  // 底图
  ctx.drawImage(sourceImg, 0, 0, W, H);

  // 离屏原图（提供取色源）
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = W;
  srcCanvas.height = H;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(sourceImg, 0, 0, W, H);

  for (const op of ops) {
    applyOp(ctx, srcCanvas, op, W, H);
  }
}

/** 单个 op 应用：根据 effect 分发到不同算法 */
export function applyOp(
  ctx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  op: MosaicOp,
  W: number,
  H: number,
) {
  switch (op.effect) {
    case 'pixelate':
      applyPixelate(ctx, srcCanvas, op, W, H);
      break;
    case 'blur':
      applyBlur(ctx, srcCanvas, op, W, H);
      break;
    case 'solid':
      applySolid(ctx, op);
      break;
    case 'sticker':
      applySticker(ctx, op);
      break;
  }
}

/** 像素化：在 bounds 内按 block 平均色块，再裁剪到 op 路径 */
function applyPixelate(
  ctx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  op: MosaicOp,
  W: number,
  H: number,
) {
  const bounds = getOpBounds(op, W, H);
  if (bounds.w === 0 || bounds.h === 0) return;
  // 块大小：strength 1-100 → 4-60 px
  const block = Math.max(4, Math.round((op.strength / 100) * 56 + 4));

  // 缩小再放大法实现像素化（速度最快）
  const tmp = document.createElement('canvas');
  tmp.width = Math.max(1, Math.ceil(bounds.w / block));
  tmp.height = Math.max(1, Math.ceil(bounds.h / block));
  const tCtx = tmp.getContext('2d')!;
  tCtx.imageSmoothingEnabled = false;
  tCtx.drawImage(
    srcCanvas,
    bounds.x, bounds.y, bounds.w, bounds.h,
    0, 0, tmp.width, tmp.height,
  );

  ctx.save();
  const path = buildOpPath(op);
  ctx.clip(path);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();
}

/** 高斯模糊：CSS filter 在临时画布上模糊，再裁剪贴回 */
function applyBlur(
  ctx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  op: MosaicOp,
  W: number,
  H: number,
) {
  const bounds = getOpBounds(op, W, H);
  if (bounds.w === 0 || bounds.h === 0) return;
  // 半径：strength 1-100 → 4-40 px
  const radius = Math.round((op.strength / 100) * 36 + 4);

  // 略微放大 bounds 来吃掉边缘伪影
  const pad = radius * 2;
  const bx = Math.max(0, bounds.x - pad);
  const by = Math.max(0, bounds.y - pad);
  const bw = Math.min(W, bounds.x + bounds.w + pad) - bx;
  const bh = Math.min(H, bounds.y + bounds.h + pad) - by;

  const tmp = document.createElement('canvas');
  tmp.width = bw;
  tmp.height = bh;
  const tCtx = tmp.getContext('2d')!;
  tCtx.filter = `blur(${radius}px)`;
  tCtx.drawImage(srcCanvas, bx, by, bw, bh, 0, 0, bw, bh);

  ctx.save();
  const path = buildOpPath(op);
  ctx.clip(path);
  ctx.drawImage(tmp, bx, by);
  ctx.restore();
}

/** 纯色遮挡 */
function applySolid(ctx: CanvasRenderingContext2D, op: MosaicOp) {
  ctx.save();
  const path = buildOpPath(op);
  ctx.fillStyle = op.color || '#0B0D12';
  ctx.fill(path);
  ctx.restore();
}

/** 贴纸：rect 模式平铺 emoji，brush 模式沿点位放置 */
function applySticker(ctx: CanvasRenderingContext2D, op: MosaicOp) {
  const emoji = op.emoji || '😎';
  ctx.save();
  if (op.type === 'rect' && op.rect) {
    const { x, y, w, h } = op.rect;
    // 大小：strength 越大单个 emoji 越大（最少塞 1 个）
    const size = Math.max(24, Math.round((op.strength / 100) * Math.min(w, h)));
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    // 用路径裁剪后平铺
    const path = buildOpPath(op);
    ctx.clip(path);
    const cols = Math.max(1, Math.ceil(w / size));
    const rows = Math.max(1, Math.ceil(h / size));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillText(emoji, x + c * size + size / 2, y + r * size + size / 2);
      }
    }
  } else if (op.type === 'brush' && op.points) {
    for (const p of op.points) {
      const size = Math.max(24, p.radius * 2.2);
      ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(emoji, p.x, p.y);
    }
  }
  ctx.restore();
}

/** 工具：dataURL → Blob，用于下载 */
export function dataURLToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type { ImageSource };
