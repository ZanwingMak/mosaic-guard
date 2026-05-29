// 用 Playwright 临时启动一个空白页，借浏览器 canvas 合成一张测试图
// 含：标题 + 4 行敏感信息 + 右下角隐写式高频点阵 + 一个简易"人脸"形状（脸/眼/嘴）
// 输出：./fixtures/test-image.png
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generate() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  const dataURL = await page.evaluate(() => {
    const W = 900, H = 700;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // 浅灰底
    ctx.fillStyle = '#F2F2F4';
    ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.fillStyle = '#101418';
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.fillText('TEST DOCUMENT · 测试图', 40, 70);

    // 敏感信息四行（英文为主，便于 Tesseract 默认稳定识别）
    ctx.fillStyle = '#000';
    ctx.font = 'bold 30px Menlo, monospace';
    ctx.fillText('ID: 110108199001011237', 40, 150);
    ctx.fillText('Phone: 13812345678', 40, 200);
    ctx.fillText('Email: test@example.com', 40, 250);
    ctx.fillText('Card: 4111111111111111', 40, 300);

    // 左下：一个粗糙的"人脸"几何图形（BlazeFace 多半识别不到，但不影响其它流程）
    ctx.fillStyle = '#F2C5A0';
    ctx.beginPath();
    ctx.ellipse(180, 500, 80, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(150, 480, 6, 0, Math.PI * 2); ctx.fill(); // 左眼
    ctx.beginPath(); ctx.arc(210, 480, 6, 0, Math.PI * 2); ctx.fill(); // 右眼
    ctx.beginPath(); ctx.arc(180, 530, 14, 0, Math.PI); ctx.stroke();   // 嘴

    // 右下：模拟隐写水印——一片高频规则点阵，LSB 检测应能挑出来
    const startX = 600, startY = 560, w = 260, h = 100;
    const img = ctx.getImageData(startX, startY, w, h);
    // 在每个像素的 R 通道 LSB 上嵌入棋盘格图案
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const bit = ((x + y) % 2 === 0) ? 1 : 0;
        // 直接把 R 的最低位设为 bit（保留高 7 位）
        img.data[i] = (img.data[i] & 0xFE) | bit;
        img.data[i + 1] = (img.data[i + 1] & 0xFE) | bit;
        img.data[i + 2] = (img.data[i + 2] & 0xFE) | bit;
      }
    }
    ctx.putImageData(img, startX, startY);

    return c.toDataURL('image/png');
  });

  const b64 = dataURL.replace(/^data:image\/png;base64,/, '');
  const buf = Buffer.from(b64, 'base64');
  const outDir = path.join(__dirname, 'fixtures');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'test-image.png');
  fs.writeFileSync(outPath, buf);
  console.log(`[gen] saved ${outPath} (${buf.length} bytes)`);
  await browser.close();
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
