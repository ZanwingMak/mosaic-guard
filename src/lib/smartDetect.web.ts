// 智选：扫描整图，把所有「值得打码的候选」都找出来
// 来源：1) OCR 所有非空文字行  2) BlazeFace 所有人脸
// 用户点击任一框即可打码，再点撤销（联动 editor 状态）
import type { Detection } from '@/components/editor/EditorCanvas';
import { getOCRWorker } from './ocr.web';
import { detectFaces } from './faceDetection.web';

/** 并发跑 OCR + 人脸检测，合并候选 */
export async function smartDetect(
  source: HTMLImageElement | HTMLCanvasElement,
): Promise<Detection[]> {
  const [textDets, faceDets] = await Promise.allSettled([
    detectAllTextLines(source),
    detectFaces(source),
  ]);
  const out: Detection[] = [];
  if (faceDets.status === 'fulfilled') {
    // 人脸 label 改成更直观的"人脸"，避免和"识别到的内容预览"风格冲突
    for (const f of faceDets.value) out.push({ ...f, label: '人脸' });
  }
  if (textDets.status === 'fulfilled') out.push(...textDets.value);
  return out;
}

/** 用 Tesseract 抓所有"词"作为候选
 * - 英文：按空格切分，"ID:" 和 "110108..." 分两个框 → 用户能精确只打码值
 * - 中文：因为没有空格，整段是一个 word（一个气泡 = 一个候选）
 * 这种粒度兼顾"精准"与"不过碎"
 */
async function detectAllTextLines(
  source: HTMLImageElement | HTMLCanvasElement,
): Promise<Detection[]> {
  const worker = await getOCRWorker();
  const { data } = await worker.recognize(source);
  const out: Detection[] = [];
  const words = (data.words || []) as Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }>;
  words.forEach((w, i) => {
    const text = (w.text || '').trim();
    if (!text) return;
    // 单字符的纯英数当作噪点（例如标点、误识别的'l'/'I'）
    if (text.length < 2 && !/[一-鿿]/.test(text)) return;
    const { x0, y0, x1, y1 } = w.bbox;
    const ww = x1 - x0;
    const hh = y1 - y0;
    if (ww <= 4 || hh <= 4) return;
    // 置信度极低（<30）的多半是误识别，丢弃
    if ((w.confidence ?? 0) < 30) return;
    const pad = Math.max(2, Math.round(hh * 0.1));
    out.push({
      id: `smart-text-${Date.now()}-${i}`,
      type: 'text',
      rect: {
        x: Math.max(0, x0 - pad),
        y: Math.max(0, y0 - pad),
        w: ww + pad * 2,
        h: hh + pad * 2,
      },
      label: text.length > 14 ? text.slice(0, 12) + '…' : text,
      confidence: (w.confidence ?? 0) / 100,
    });
  });
  return out;
}
