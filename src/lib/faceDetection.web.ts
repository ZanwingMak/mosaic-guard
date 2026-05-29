// Web 端人脸检测：动态加载 TF.js + BlazeFace
// 模型懒加载，首次调用约 2-4s（含 ~3MB 下载 + WebGL 初始化）
import type { Detection } from '@/components/editor/EditorCanvas';

let modelPromise: Promise<any> | null = null;

/** 懒加载并缓存模型 */
async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await import('@tensorflow/tfjs-backend-webgl');
      await tf.setBackend('webgl');
      await tf.ready();
      const blazeface = await import('@tensorflow-models/blazeface');
      return blazeface.load();
    })();
  }
  return modelPromise;
}

/** 预热模型（用于首次进入编辑器时后台加载） */
export function preloadFaceModel() {
  loadModel().catch(() => {
    modelPromise = null; // 失败重置，下次重试
  });
}

/**
 * 检测图片中所有人脸
 * @param image 已加载的 HTMLImageElement 或 HTMLCanvasElement
 * @returns Detection[] 在原图坐标系下的人脸框
 */
export async function detectFaces(image: HTMLImageElement | HTMLCanvasElement): Promise<Detection[]> {
  const model = await loadModel();
  const predictions = await model.estimateFaces(image, false);
  return predictions.map((p: any, i: number) => {
    const [x1, y1] = p.topLeft;
    const [x2, y2] = p.bottomRight;
    // 适度外扩（脸部到额头/下巴边缘往往不够），向外扩 15%
    const w = x2 - x1;
    const h = y2 - y1;
    const padX = w * 0.15;
    const padY = h * 0.15;
    return {
      id: `face-${Date.now()}-${i}`,
      type: 'face' as const,
      rect: {
        x: Math.max(0, x1 - padX),
        y: Math.max(0, y1 - padY),
        w: w + padX * 2,
        h: h + padY * 2,
      },
      label: '人脸',
      confidence: p.probability?.[0] ?? 0.9,
    };
  });
}
