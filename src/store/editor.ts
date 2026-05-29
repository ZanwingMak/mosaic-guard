// 编辑器全局状态：当前图片、操作历史、工具配置
import { create } from 'zustand';

export type Tool = 'brush' | 'rect' | 'smart' | 'face' | 'ocr' | 'watermark';
export type Effect = 'pixelate' | 'blur' | 'solid' | 'sticker';

// 单个打码操作记录（在原图坐标系下）
export interface MosaicOp {
  id: string;
  type: 'brush' | 'rect'; // 形状类型
  effect: Effect;          // 马赛克效果
  strength: number;        // 强度（像素粒度 / 模糊半径 / 透明度）
  color?: string;          // solid 模式颜色
  emoji?: string;          // sticker 模式 emoji
  // brush: 一连串点位 [{x,y,radius}]
  // rect:  单个矩形 {x,y,w,h}
  points?: Array<{ x: number; y: number; radius: number }>;
  rect?: { x: number; y: number; w: number; h: number };
}

export interface ImageSource {
  uri: string;           // base64 / blob url
  width: number;
  height: number;
}

interface EditorState {
  image: ImageSource | null;
  ops: MosaicOp[];
  redoStack: MosaicOp[];
  tool: Tool;
  effect: Effect;
  strength: number;       // 当前强度 0-100
  brushSize: number;      // 画笔半径 px (原图坐标)
  emoji: string;          // sticker 默认
  color: string;          // solid 默认
  setImage: (img: ImageSource | null) => void;
  setTool: (t: Tool) => void;
  setEffect: (e: Effect) => void;
  setStrength: (n: number) => void;
  setBrushSize: (n: number) => void;
  setEmoji: (s: string) => void;
  setColor: (s: string) => void;
  addOp: (op: MosaicOp) => void;
  removeOp: (id: string) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useEditor = create<EditorState>((set, get) => ({
  image: null,
  ops: [],
  redoStack: [],
  tool: 'smart',
  effect: 'pixelate',
  strength: 50,
  brushSize: 30,
  emoji: '😎',
  color: '#0B0D12',
  setImage: (image) => set({ image, ops: [], redoStack: [] }),
  setTool: (tool) => set({ tool }),
  setEffect: (effect) => set({ effect }),
  setStrength: (strength) => set({ strength }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setEmoji: (emoji) => set({ emoji }),
  setColor: (color) => set({ color }),
  addOp: (op) => set({ ops: [...get().ops, op], redoStack: [] }),
  removeOp: (id) => set({ ops: get().ops.filter((o) => o.id !== id) }),
  undo: () => {
    const { ops, redoStack } = get();
    if (!ops.length) return;
    const last = ops[ops.length - 1];
    set({ ops: ops.slice(0, -1), redoStack: [...redoStack, last] });
  },
  redo: () => {
    const { ops, redoStack } = get();
    if (!redoStack.length) return;
    const last = redoStack[redoStack.length - 1];
    set({ ops: [...ops, last], redoStack: redoStack.slice(0, -1) });
  },
  clear: () => set({ ops: [], redoStack: [] }),
}));
