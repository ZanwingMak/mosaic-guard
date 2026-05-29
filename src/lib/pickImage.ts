// 跨端选图：Web 用文件 input，Native 用 expo-image-picker
import { Platform } from 'react-native';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  fileName?: string;
}

/** 读取本地图片 → base64 dataURL（Web 实现） */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 把 dataURL / blob URL 加载为 HTMLImageElement 拿到真实尺寸 */
function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

/** 弹出文件选择器（Web）/相册（Native），返回所选图片 */
export async function pickImage(source: 'gallery' | 'camera'): Promise<PickedImage | null> {
  if (Platform.OS === 'web') {
    return pickImageWeb(source === 'camera');
  }
  // 原生：动态 import，避免 Web bundle 体积
  const ImagePicker = await import('expo-image-picker');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, width: a.width ?? 0, height: a.height ?? 0, fileName: a.fileName ?? undefined };
}

function pickImageWeb(useCamera: boolean): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) input.setAttribute('capture', 'environment');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const uri = await readFileAsDataURL(file);
      const { width, height } = await loadImageDimensions(uri);
      resolve({ uri, width, height, fileName: file.name });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Web 端：从 file 对象解析（拖拽用） */
export async function pickFromFile(file: File): Promise<PickedImage | null> {
  if (!file.type.startsWith('image/')) return null;
  const uri = await readFileAsDataURL(file);
  const { width, height } = await loadImageDimensions(uri);
  return { uri, width, height, fileName: file.name };
}
