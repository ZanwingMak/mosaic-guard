// 设计令牌：颜色、间距、字体、圆角、阴影
// 风格：深色玻璃质感 + 单点品牌色（青绿），克制不花哨
export const colors = {
  // 背景层级
  bg0: '#0B0D12', // 页面底
  bg1: '#12151C', // 卡片底
  bg2: '#1A1F2A', // 高一级表面
  bg3: '#242B39', // 悬浮表面

  // 边框 / 分隔
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.14)',

  // 文本
  text0: '#F5F7FA', // 主文本
  text1: '#B8C0CE', // 次文本
  text2: '#7A8499', // 辅助文本
  text3: '#525B6E', // 占位文本

  // 品牌
  brand: '#4FD1C5', // 主色：青绿（克制不刺眼）
  brandSoft: 'rgba(79,209,197,0.12)',
  brandStrong: '#2DBDB1',

  // 语义
  danger: '#F87171',
  warn: '#FBBF24',
  success: '#34D399',

  // 玻璃质感
  glass: 'rgba(255,255,255,0.04)',
  glassStrong: 'rgba(255,255,255,0.08)',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
};

// 字体：Web 走系统 + Geist，Native 走系统
export const font = {
  family:
    "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
  mono: "'Geist Mono', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },
  pop: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 36,
    elevation: 12,
  },
};
