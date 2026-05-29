// 生成 1179×2556 模拟手机聊天截图（iPhone 15 Pro Max 实际分辨率）
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  const dataURL = await page.evaluate(() => {
    const W = 1179, H = 2556;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#EFEFF4';
    ctx.fillRect(0, 0, W, H);
    // 状态栏区
    ctx.fillStyle = '#000';
    ctx.font = 'bold 64px -apple-system, sans-serif';
    ctx.fillText('17:04', 80, 130);
    // 标题
    ctx.font = 'bold 64px -apple-system, sans-serif';
    ctx.fillText('TEST CHAT (25)', 280, 280);
    // 模拟若干聊天气泡
    const bubbles = [
      { from: 'left', text: '我关了 可以访问了' },
      { from: 'left', text: 'host 吗？' },
      { from: 'left', text: '这个 你看下' },
      { from: 'right', text: '之前验收商城时开始用代理' },
      { from: 'right', text: '没开代理就进不了用户中心' },
    ];
    ctx.font = '48px -apple-system';
    let y = 420;
    for (const b of bubbles) {
      const w = 700;
      const x = b.from === 'left' ? 200 : W - 200 - w;
      ctx.fillStyle = b.from === 'left' ? '#fff' : '#A5E07A';
      ctx.beginPath();
      const r = 24;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + 120 - r);
      ctx.quadraticCurveTo(x + w, y + 120, x + w - r, y + 120);
      ctx.lineTo(x + r, y + 120);
      ctx.quadraticCurveTo(x, y + 120, x, y + 120 - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillText(b.text, x + 30, y + 75);
      y += 200;
    }
    // 模拟敏感信息
    ctx.fillStyle = '#000';
    ctx.font = 'bold 56px monospace';
    ctx.fillText('13812345678', 200, y + 150);
    return c.toDataURL('image/png');
  });
  const b64 = dataURL.replace(/^data:image\/png;base64,/, '');
  const buf = Buffer.from(b64, 'base64');
  const out = path.join(__dirname, 'fixtures', 'portrait-mock.png');
  fs.writeFileSync(out, buf);
  console.log(`[gen] ${out} (${buf.length} bytes)`);
  await browser.close();
})();
