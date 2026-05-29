// 导出：Web 端走浏览器下载
import { downloadBlob, dataURLToBlob } from './mosaic';

export async function exportCanvas(canvas: HTMLCanvasElement, filename = 'mosaic-guard.png') {
  const dataURL = canvas.toDataURL('image/png');
  const blob = dataURLToBlob(dataURL);
  downloadBlob(blob, filename);
}
