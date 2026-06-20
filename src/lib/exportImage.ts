// 原生导出：从 Canvas 桥接对象获取 PNG，并保存到系统相册
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

interface NativeExportCanvas {
  exportPng?: () => Promise<string>;
}

/** 从 dataURL 中提取 base64 内容 */
function getBase64FromDataUrl(dataUrl: string) {
  const parts = dataUrl.split(',');
  if (parts.length < 2) throw new Error('导出图片数据无效');
  return parts[1];
}

/** 清理文件名，避免写入缓存目录时包含非法路径字符 */
function sanitizeFilename(filename: string) {
  return filename.replace(/[\\/:\*\?"<>\|]/g, '-').replace(/\s+/g, '-');
}

/** 将原生 Canvas 桥接对象导出为 PNG，并保存到相册 */
export async function exportCanvas(canvas: NativeExportCanvas, filename = 'mosaic-guard.png') {
  if (!canvas?.exportPng) throw new Error('原生画布尚未就绪');
  const dataUrl = await canvas.exportPng();
  const base64 = getBase64FromDataUrl(dataUrl);
  const safeFilename = sanitizeFilename(filename.endsWith('.png') ? filename : `${filename}.png`);
  const fileUri = `${FileSystem.cacheDirectory}${safeFilename}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('没有相册权限，无法保存导出的图片');
  }

  await MediaLibrary.saveToLibraryAsync(fileUri);
  return fileUri;
}
