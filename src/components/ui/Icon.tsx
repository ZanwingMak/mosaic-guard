// 极简 SVG 图标集：用 react-native-svg 统一 Web/Native，两端渲染一致
import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

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

// 每个图标的 path / circle / rect 子节点。统一用 react-native-svg 组件，
// 这样 native 端能正常显示，Web 端通过 react-native-web 兜底也能正常渲染。
const paths: Record<IconName, React.ReactNode> = {
  upload: (
    <>
      <Path d="M12 3v12" />
      <Path d="m7 8 5-5 5 5" />
      <Path d="M5 21h14" />
    </>
  ),
  camera: (
    <>
      <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="3" />
      <Circle cx="9" cy="9" r="1.5" />
      <Path d="m21 15-5-5L5 21" />
    </>
  ),
  brush: (
    <>
      <Path d="M9 11.5 14.5 6c1-1 3.5-1 4.5 0s1 3.5 0 4.5L13.5 16" />
      <Path d="M7 14c-2 0-3 1.5-3 3.5C4 19 5 21 6.5 21S9 19 9 17c0-1.5 1-3 3-3" />
    </>
  ),
  square: <Rect x="4" y="4" width="16" height="16" rx="2" />,
  sparkles: (
    <>
      <Path d="M12 3 13.5 8 18 9.5 13.5 11 12 16l-1.5-5L6 9.5 10.5 8 12 3Z" />
      <Path d="M19 14v3M17.5 15.5h3" />
    </>
  ),
  eye: (
    <>
      <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  shield: (
    <>
      <Path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
      <Path d="m9 12 2 2 4-4" />
    </>
  ),
  undo: (
    <>
      <Path d="M3 7h11a5 5 0 1 1 0 10H8" />
      <Path d="m7 3-4 4 4 4" />
    </>
  ),
  redo: (
    <>
      <Path d="M21 7H10a5 5 0 0 0 0 10h6" />
      <Path d="m17 3 4 4-4 4" />
    </>
  ),
  download: (
    <>
      <Path d="M12 3v12" />
      <Path d="m7 10 5 5 5-5" />
      <Path d="M5 21h14" />
    </>
  ),
  'arrow-left': (
    <>
      <Path d="M19 12H5" />
      <Path d="m12 19-7-7 7-7" />
    </>
  ),
  check: <Path d="m5 12 5 5L20 7" />,
  x: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </>
  ),
  face: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M8.5 14s1.2 2 3.5 2 3.5-2 3.5-2" />
      <Circle cx="9" cy="10" r="0.8" />
      <Circle cx="15" cy="10" r="0.8" />
    </>
  ),
  text: (
    <>
      <Path d="M4 6V4h16v2" />
      <Path d="M12 4v16" />
      <Path d="M9 20h6" />
    </>
  ),
  wand: (
    <>
      <Path d="m4 20 12-12" />
      <Path d="M14 4h2v2M18 6l2 2M20 10h2v2M14 4l-2-2M4 14l-2 2" />
    </>
  ),
  layers: (
    <>
      <Path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <Path d="m3 13 9 5 9-5" />
      <Path d="m3 18 9 5 9-5" />
    </>
  ),
  pixelate: (
    <>
      <Rect x="3" y="3" width="6" height="6" />
      <Rect x="15" y="3" width="6" height="6" />
      <Rect x="9" y="9" width="6" height="6" />
      <Rect x="3" y="15" width="6" height="6" />
      <Rect x="15" y="15" width="6" height="6" />
    </>
  ),
  blur: (
    <>
      <Circle cx="12" cy="12" r="9" opacity={0.3} />
      <Circle cx="12" cy="12" r="6" opacity={0.55} />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  fill: <Rect x="3" y="3" width="18" height="18" rx="3" />,
  sticker: (
    <>
      <Path d="M15 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h9l6-6V6a3 3 0 0 0-3-3Z" />
      <Path d="M15 21v-3a3 3 0 0 1 3-3h3" />
    </>
  ),
  plus: (
    <>
      <Path d="M12 5v14" />
      <Path d="M5 12h14" />
    </>
  ),
  minus: <Path d="M5 12h14" />,
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = '#FFFFFF', strokeWidth = 1.8 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </Svg>
  );
}

export type { IconName };
