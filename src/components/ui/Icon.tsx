// 极简 SVG 图标集：纯 inline SVG，不依赖图标库（避免 emoji + 减少包体）
import React from 'react';
import { Platform, View } from 'react-native';

type IconName =
  | 'upload'
  | 'camera'
  | 'image'
  | 'brush'
  | 'square'
  | 'sparkles'
  | 'eye'
  | 'shield'
  | 'undo'
  | 'redo'
  | 'download'
  | 'arrow-left'
  | 'check'
  | 'x'
  | 'face'
  | 'text'
  | 'wand'
  | 'layers'
  | 'pixelate'
  | 'blur'
  | 'fill'
  | 'sticker'
  | 'plus'
  | 'minus';

const paths: Record<IconName, React.ReactNode> = {
  upload: (
    <>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  brush: (
    <>
      <path d="M9 11.5 14.5 6c1-1 3.5-1 4.5 0s1 3.5 0 4.5L13.5 16" />
      <path d="M7 14c-2 0-3 1.5-3 3.5C4 19 5 21 6.5 21S9 19 9 17c0-1.5 1-3 3-3" />
    </>
  ),
  square: <rect x="4" y="4" width="16" height="16" rx="2" />,
  sparkles: (
    <>
      <path d="M12 3 13.5 8 18 9.5 13.5 11 12 16l-1.5-5L6 9.5 10.5 8 12 3Z" />
      <path d="M19 14v3M17.5 15.5h3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  undo: (
    <>
      <path d="M3 7h11a5 5 0 1 1 0 10H8" />
      <path d="m7 3-4 4 4 4" />
    </>
  ),
  redo: (
    <>
      <path d="M21 7H10a5 5 0 0 0 0 10h6" />
      <path d="m17 3 4 4-4 4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  face: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14s1.2 2 3.5 2 3.5-2 3.5-2" />
      <circle cx="9" cy="10" r=".8" />
      <circle cx="15" cy="10" r=".8" />
    </>
  ),
  text: (
    <>
      <path d="M4 6V4h16v2" />
      <path d="M12 4v16" />
      <path d="M9 20h6" />
    </>
  ),
  wand: (
    <>
      <path d="m4 20 12-12" />
      <path d="M14 4h2v2M18 6l2 2M20 10h2v2M14 4l-2-2M4 14l-2 2" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 18 9 5 9-5" />
    </>
  ),
  pixelate: (
    <>
      <rect x="3" y="3" width="6" height="6" />
      <rect x="15" y="3" width="6" height="6" />
      <rect x="9" y="9" width="6" height="6" />
      <rect x="3" y="15" width="6" height="6" />
      <rect x="15" y="15" width="6" height="6" />
    </>
  ),
  blur: (
    <>
      <circle cx="12" cy="12" r="9" opacity="0.3" />
      <circle cx="12" cy="12" r="6" opacity="0.55" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  fill: <rect x="3" y="3" width="18" height="18" rx="3" />,
  sticker: (
    <>
      <path d="M15 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h9l6-6V6a3 3 0 0 0-3-3Z" />
      <path d="M15 21v-3a3 3 0 0 1 3-3h3" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.8 }: Props) {
  const child = paths[name];

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size }}>
        {/* @ts-ignore Web only inline SVG */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {child}
        </svg>
      </View>
    );
  }
  // 原生端：暂未集成 react-native-svg；这里返回占位避免崩
  return <View style={{ width: size, height: size }} />;
}

export type { IconName };
