// 隐藏水印 / 隐写检测（Web）
// 策略：
//  1) LSB 位平面提取：抓取每个像素的最低位，正常自然图像在此位上接近随机；
//     若某区域 LSB 模式具有低熵 / 强结构 / 边缘特征 → 可能藏有水印
//  2) 局部高频能量分析：blocks 内部相邻像素差值的方差，
//     某些"对人眼不可见"的水印（如阿尔法噪声叠加）会在高频段留下规律性
//  3) 输出两件东西：
//     - 可视化 dataURL（把可疑像素放大成黑白图，便于肉眼审查）
//     - 候选 detection rects（按可疑分数聚类）
import type { Detection } from '@/components/editor/EditorCanvas';

export interface WatermarkScanResult {
  visualizationDataURL: string;   // LSB 强化后的可视化图（与原图同尺寸）
  detections: Detection[];        // 可疑区域候选框
  summary: {
    suspiciousBlocks: number;
    totalBlocks: number;
    avgEntropy: number;
  };
}

/** 对图像进行隐写扫描 */
export async function scanHiddenWatermark(
  source: HTMLImageElement | HTMLCanvasElement,
): Promise<WatermarkScanResult> {
  const W = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const H = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

  const sample = document.createElement('canvas');
  sample.width = W;
  sample.height = H;
  const sctx = sample.getContext('2d')!;
  sctx.drawImage(source as any, 0, 0, W, H);
  const src = sctx.getImageData(0, 0, W, H);

  // 1) 生成 LSB 可视化（同尺寸 R/G/B 的最低位拼合放大）
  const vis = document.createElement('canvas');
  vis.width = W;
  vis.height = H;
  const vctx = vis.getContext('2d')!;
  const visData = vctx.createImageData(W, H);
  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i] & 1;
    const g = src.data[i + 1] & 1;
    const b = src.data[i + 2] & 1;
    // 三通道 LSB 联合：任一为 1 即亮
    const v = (r | g | b) * 255;
    visData.data[i] = v;
    visData.data[i + 1] = v;
    visData.data[i + 2] = v;
    visData.data[i + 3] = 255;
  }
  vctx.putImageData(visData, 0, 0);

  // 2) 分块统计 LSB 熵与梯度
  const BLOCK = 24;
  const cols = Math.floor(W / BLOCK);
  const rows = Math.floor(H / BLOCK);
  const scores: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let totalEntropy = 0;
  let totalBlocks = 0;

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const startX = bx * BLOCK;
      const startY = by * BLOCK;
      // 统计 LSB 0 / 1 的频次（R 通道近似即可）
      let ones = 0;
      let edges = 0;
      const totalPx = BLOCK * BLOCK;
      let prev = 0;
      for (let y = 0; y < BLOCK; y++) {
        for (let x = 0; x < BLOCK; x++) {
          const idx = ((startY + y) * W + (startX + x)) * 4;
          const bit = src.data[idx] & 1;
          ones += bit;
          if (x > 0 && bit !== prev) edges++;
          prev = bit;
        }
      }
      const p1 = ones / totalPx;
      const p0 = 1 - p1;
      // 熵：理想自然 LSB ≈ 1（高熵），结构性水印熵会偏低
      const entropy =
        (p1 > 0 ? -p1 * Math.log2(p1) : 0) + (p0 > 0 ? -p0 * Math.log2(p0) : 0);
      // 边缘密度：水印中边缘转换频率往往异常高或异常低
      const edgeRatio = edges / (BLOCK * (BLOCK - 1));
      // 综合分数：熵接近 1 + 边缘比例接近 0.5 → 正常（接近 0）
      // 否则 → 可疑（接近 1）
      const normalScore =
        Math.max(0, Math.min(1, entropy)) * (1 - Math.abs(edgeRatio - 0.5) * 2);
      const suspicion = 1 - normalScore;
      scores[by][bx] = suspicion;
      totalEntropy += entropy;
      totalBlocks++;
    }
  }
  const avgEntropy = totalBlocks ? totalEntropy / totalBlocks : 0;

  // 3) 阈值化 + 连通块聚类成候选 rect
  const THRESHOLD = 0.55;
  const flag: boolean[][] = scores.map((row) => row.map((v) => v > THRESHOLD));
  const visited = scores.map((row) => row.map(() => false));
  const clusters: Array<{ minR: number; maxR: number; minC: number; maxC: number; count: number }> = [];

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      if (!flag[by][bx] || visited[by][bx]) continue;
      // BFS
      const stack = [{ r: by, c: bx }];
      let minR = by, maxR = by, minC = bx, maxC = bx, count = 0;
      while (stack.length) {
        const { r, c } = stack.pop()!;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        if (visited[r][c] || !flag[r][c]) continue;
        visited[r][c] = true;
        count++;
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
        stack.push({ r: r + 1, c }, { r: r - 1, c }, { r, c: c + 1 }, { r, c: c - 1 });
      }
      // 只保留有一定面积的连通区域（避开噪点）
      if (count >= 6) {
        clusters.push({ minR, maxR, minC, maxC, count });
      }
    }
  }

  const detections: Detection[] = clusters
    .sort((a, b) => b.count - a.count)
    .slice(0, 8) // 最多 8 个候选
    .map((cl, i) => ({
      id: `wm-${Date.now()}-${i}`,
      type: 'text', // 复用文本通道方便点击选中
      rect: {
        x: cl.minC * BLOCK,
        y: cl.minR * BLOCK,
        w: (cl.maxC - cl.minC + 1) * BLOCK,
        h: (cl.maxR - cl.minR + 1) * BLOCK,
      },
      label: `可疑水印区 #${i + 1}`,
      confidence: Math.min(0.99, 0.5 + cl.count / 60),
    }));

  // 4) 加入常见 app 截图水印的预设可疑位置（右下角 + 底部条带）
  // 当主算法没找到东西时，作为兜底提示用户检查这些区域
  if (detections.length === 0) {
    const presetW = Math.round(W * 0.4);
    const presetH = Math.round(H * 0.08);
    detections.push({
      id: `wm-preset-br`,
      type: 'text',
      rect: { x: W - presetW, y: H - presetH, w: presetW, h: presetH },
      label: '常见 APP 水印位（右下）',
      confidence: 0.3,
    });
  }

  return {
    visualizationDataURL: vis.toDataURL('image/png'),
    detections,
    summary: {
      suspiciousBlocks: clusters.reduce((s, c) => s + c.count, 0),
      totalBlocks,
      avgEntropy: Number(avgEntropy.toFixed(3)),
    },
  };
}
