// Web 端 OCR：Tesseract.js + 中英混排
// 流程：OCR → 获取每个 word 的 bbox → 文本拼接成完整 string →
//        用 sensitivePatterns 扫描得到字符级 match → 映射回 word 级 bbox → 输出 Detection[]
import type { Detection } from '@/components/editor/EditorCanvas';
import { scanSensitive } from './sensitivePatterns';

let workerPromise: Promise<any> | null = null;

/** 暴露给智选工具复用，避免双份语言包加载 */
export async function getOCRWorker() {
  return getWorker();
}

/** 懒加载 Tesseract worker（中英双语） */
async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
        // 进度回调可在外部消费；这里静默
      });
      return worker;
    })();
  }
  return workerPromise;
}

export function preloadOCR() {
  getWorker().catch(() => {
    workerPromise = null;
  });
}

interface Word {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** 从 canvas/image 提取敏感信息的位置框 */
export async function detectSensitiveText(
  source: HTMLImageElement | HTMLCanvasElement,
): Promise<Detection[]> {
  const worker = await getWorker();
  const { data } = await worker.recognize(source);

  // 拼接全文 + 记录每个 word 的字符 range
  const words: Word[] = (data.words || []).map((w: any) => ({
    text: w.text,
    bbox: w.bbox,
  }));

  let fullText = '';
  const wordRanges: Array<{ start: number; end: number; word: Word }> = [];
  for (const w of words) {
    if (!w.text) continue;
    const start = fullText.length;
    fullText += w.text;
    const end = fullText.length;
    wordRanges.push({ start, end, word: w });
    fullText += ' ';
  }

  const matches = scanSensitive(fullText);
  const raw: Detection[] = [];

  matches.forEach((m, i) => {
    // 找到此 match 覆盖的所有 word，合并 bbox
    const covered = wordRanges.filter((wr) => wr.end > m.start && wr.start < m.end);
    if (!covered.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const wr of covered) {
      const b = wr.word.bbox;
      x0 = Math.min(x0, b.x0);
      y0 = Math.min(y0, b.y0);
      x1 = Math.max(x1, b.x1);
      y1 = Math.max(y1, b.y1);
    }
    const pad = 4;
    raw.push({
      id: `ocr-${Date.now()}-${i}`,
      type: 'text',
      rect: {
        x: Math.max(0, x0 - pad),
        y: Math.max(0, y0 - pad),
        w: x1 - x0 + pad * 2,
        h: y1 - y0 + pad * 2,
      },
      label: `${m.type}: ${maskPreview(m.text)}`,
      confidence: 0.85,
    });
  });

  return dedupOverlap(raw);
}

/** 合并空间高度重叠（IoU > 0.5）的检测框：常见于同一 OCR word 上触发多条规则 */
function dedupOverlap(items: Detection[]): Detection[] {
  const kept: Detection[] = [];
  for (const cur of items) {
    const dupIdx = kept.findIndex((k) => iou(k.rect, cur.rect) > 0.5);
    if (dupIdx === -1) {
      kept.push(cur);
      continue;
    }
    // 已有重叠框：合并 label（用 | 串联多种命中类型），保留较大 rect
    const exist = kept[dupIdx];
    const merged: Detection = {
      ...exist,
      rect: unionRect(exist.rect, cur.rect),
      label: `${exist.label} | ${cur.label}`,
    };
    kept[dupIdx] = merged;
  }
  return kept;
}

function iou(a: { x: number; y: number; w: number; h: number }, b: typeof a): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const ua = a.w * a.h + b.w * b.h - inter;
  return ua > 0 ? inter / ua : 0;
}

function unionRect(a: { x: number; y: number; w: number; h: number }, b: typeof a) {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** 标签预览：仅显示前后字符以保护隐私 */
function maskPreview(s: string): string {
  if (s.length <= 4) return s[0] + '*'.repeat(s.length - 1);
  return s.slice(0, 2) + '*'.repeat(Math.min(4, s.length - 4)) + s.slice(-2);
}
