// 原生占位：v1 暂不支持原生端 AI
import type { Detection } from '@/components/editor/EditorCanvas';

export function preloadFaceModel() {}

export async function detectFaces(_image: any): Promise<Detection[]> {
  throw new Error('AI 人脸检测目前仅在 Web 端可用');
}
