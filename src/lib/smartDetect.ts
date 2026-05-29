// 原生占位
import type { Detection } from '@/components/editor/EditorCanvas';

export async function smartDetect(_source: any): Promise<Detection[]> {
  throw new Error('智选目前仅在 Web 端可用');
}
