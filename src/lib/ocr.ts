// 原生占位
import type { Detection } from '@/components/editor/EditorCanvas';

export function preloadOCR() {}

export async function detectSensitiveText(_source: any): Promise<Detection[]> {
  throw new Error('OCR 文字识别目前仅在 Web 端可用');
}
