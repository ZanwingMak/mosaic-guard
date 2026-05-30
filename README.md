# MosaicGuard · 隐马

> 截图里的秘密，交给隐马抹掉。

**🌐 在线体验：https://zanwingmak.github.io/mosaic-guard/**（手机/电脑浏览器直接打开即可）

一个**100% 端侧运行**的图片敏感信息打码工具：人脸、身份证号、手机号、银行卡、邮箱、车牌号、APP 截图里的隐藏水印，AI 自动识别 + 一键打码。
单仓库三端（Web / iOS / Android），底层用 Expo SDK 52 + React Native + react-native-web。

---

## ✨ 功能

| 模块 | 能力 |
| --- | --- |
| **导入** | 文件选择 / 拖拽 / 粘贴截图（Web）、相册 / 相机（iOS / Android） |
| **手动打码** | 自由画笔（可调粗细）、矩形框选 |
| **AI 人脸识别** | TF.js + BlazeFace，离线模型，全图扫描 + 框选确认 |
| **OCR 敏感词** | Tesseract.js 中英双语 OCR，配合校验规则识别：身份证号（含校验码）、手机号、银行卡（Luhn 校验）、邮箱、车牌号、IPv4、QQ 号 |
| **隐藏水印检测** | LSB 位平面提取 + 分块熵 / 边缘密度分析，定位可能的隐写区域 |
| **打码效果** | 像素化 / 高斯模糊 / 纯色遮挡 / Emoji 贴纸，强度可调 |
| **编辑器** | 撤销 / 重做 / 清空 / 实时预览 |
| **导出** | Web 直接下载 PNG；原生端将在下版接入相册保存 |

## 🛡️ 隐私

所有图像处理（含 AI 推理）都在用户设备本地完成。**不会有任何图像、文本、模型推理结果上传到任何服务器。** 整个项目没有后端。

---

## 🚀 启动

```bash
cd mosaic-guard
npm install          # 已含 TF.js / BlazeFace / Tesseract.js
npm run web          # Web 端：http://localhost:8081
```

构建静态站点（可托管到任何静态服务器 / GitHub Pages / Vercel）：

```bash
npm run build:web    # 输出在 dist/
```

iOS / Android 原生运行：

```bash
npm run ios          # 需本机 Xcode
npm run android      # 需 Android Studio
```

> Native 端目前展示图片预览与提示信息；完整的画笔 / AI 流水线放在 Web，下一版本接入
> `@shopify/react-native-skia` 复用同一套 op 数据结构。

---

## 🧱 技术架构

```
mosaic-guard/
├── app/                          # Expo Router 文件式路由
│   ├── _layout.tsx               # 根布局
│   ├── index.tsx                 # 首页：Hero + 导入
│   └── editor.tsx                # 编辑器主页面
└── src/
    ├── components/
    │   ├── ui/                   # Button / Card / Icon / IconButton / Slider
    │   ├── home/                 # DropZone（拖拽上传）/ FeatureGrid（功能展示）
    │   └── editor/
    │       ├── EditorCanvas.web.tsx    # 双 canvas 画布（display + overlay）
    │       ├── EditorCanvas.tsx        # 原生占位
    │       ├── Toolbar.tsx             # 左侧工具选择栏
    │       ├── EffectPanel.tsx         # 右侧效果配置面板
    │       └── AIActionBar.tsx         # 底部 AI 扫描操作条
    ├── lib/
    │   ├── mosaic.ts             # 4 种打码算法 + canvas 渲染
    │   ├── pickImage.ts          # 跨端选图
    │   ├── faceDetection.web.ts  # BlazeFace 推理（Web）
    │   ├── ocr.web.ts            # Tesseract 识别 + 敏感片段定位（Web）
    │   ├── sensitivePatterns.ts  # 敏感正则 + 校验函数
    │   ├── watermark.web.ts      # 隐写检测（LSB + 分块熵）
    │   └── exportImage.web.ts    # 导出 PNG
    ├── store/editor.ts           # zustand：image / ops / tool / effect / undo / redo
    └── theme/tokens.ts           # 颜色 / 字体 / 间距 / 圆角 / 阴影
```

### Op 数据模型

编辑器是 **op-replay** 设计：原图保持不变，所有用户操作以 `MosaicOp` 序列形式保存，每次重渲染从底图开始按顺序回放。这让撤销 / 重做 / 切换效果 / 重导出都简单可靠。

```ts
interface MosaicOp {
  id: string;
  type: 'brush' | 'rect';         // 形状
  effect: 'pixelate' | 'blur' | 'solid' | 'sticker';
  strength: number;               // 1-100
  color?: string;                 // solid 用
  emoji?: string;                 // sticker 用
  points?: { x: number; y: number; radius: number }[];  // brush 用
  rect?: { x: number; y: number; w: number; h: number }; // rect 用
}
```

### 平台分发

通过 Metro 自动解析 `.web.tsx` 和 `.tsx` 后缀：

```
faceDetection.web.ts   ← Web 端用（TF.js）
faceDetection.ts       ← 原生端占位
```

`Platform.OS === 'web'` 判断仅用于 UI 行为差异；模型 / canvas 代码完全通过文件后缀分发，原生 bundle 不会包含 TF.js / Tesseract.js。

---

## 🔬 算法说明

### 像素化
缩小到 `width / blockSize` → 关闭抗锯齿 → 放大回原尺寸 → 用 `Path2D` 裁剪到打码区域。
强度 1-100 映射到 block size 4-60px。

### 高斯模糊
利用 Canvas 原生 `ctx.filter = 'blur(Npx)'`，半径 1-100 → 4-40px。在区域外扩 2×radius 避免边缘伪影。

### 隐藏水印检测
1. 对每个像素提取 R/G/B 通道最低位，合成 LSB 可视化图；
2. 把图分成 24×24 的 block，统计每块的 LSB：
   - 比例 → 香农熵
   - 相邻像素 LSB 转换次数 → 边缘密度
3. 综合分数：自然图像熵高（≈1）、边缘密度接近 0.5；偏离越远越可疑；
4. 阈值化后 BFS 聚类成候选 rect，按面积排序输出前 8 个。
5. 无显著命中时，给出"右下角常见 APP 水印位"的兜底提示。

### 敏感信息匹配
- 身份证：18 位 + 末位校验码（GB 11643-1999）
- 银行卡：13-19 位 + Luhn 算法
- 手机号：1[3-9]\d{9}，前后非数字边界
- 车牌：覆盖普通燃油 + 新能源
- IPv4：四段，每段 0-255 校验
- 邮箱 / QQ 号 / 自定义可扩展

---

## 🧪 测试场景建议

| 场景 | 怎么测 |
| --- | --- |
| 手动打码 | 切到"画笔"或"框选" → 在图上涂抹 / 拖矩形 → 切不同效果看实时差异 |
| 人脸识别 | 任意合影 → 工具栏切"人脸" → 点"扫描人脸" → 自动选中所有人脸 → 点"打码选中" |
| 敏感文字 | 截一张含身份证号 / 手机号的图 → 切"文字" → 点"识别敏感文字" → 检查识别到的标签 |
| 隐写检测 | 任意小红书 / 微博截图 → 切"水印" → 点"检测隐藏水印" → 观察右下角是否被框出 |
| 撤销 / 重做 | 任意操作后点顶部 ⟲ ⟳ |
| 导出 | 顶部"导出"按钮，浏览器直接下载 PNG |

---

## 🚧 已知限制 / 下一步

| 项 | 现状 | 计划 |
| --- | --- | --- |
| 原生端编辑器 | 仅图片预览 + 提示 | v1.1 接入 `@shopify/react-native-skia` |
| 原生端 AI | 不支持 | 用 ML Kit（iOS Vision / Android ML Kit）或 TF Lite |
| OCR 准确度 | 一般场景 ≈ 85% | v1.1 接入 PaddleOCR WASM 提升中文识别 |
| 隐写检测 | 启发式分块熵 | v1.2 引入 DCT 频域分析、专门针对小红书 / 微博水印 pattern 训练 |
| PWA | 暂未启用 | 加 manifest + service worker |

---

## 📜 License

MIT
