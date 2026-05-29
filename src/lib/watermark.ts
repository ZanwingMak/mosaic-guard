// 原生占位
import type { Detection } from '@/components/editor/EditorCanvas';

export interface WatermarkScanResult {
  visualizationDataURL: string;
  detections: Detection[];
  summary: { suspiciousBlocks: number; totalBlocks: number; avgEntropy: number };
}

export async function scanHiddenWatermark(_source: any): Promise<WatermarkScanResult> {
  throw new Error('隐写检测目前仅在 Web 端可用');
}
