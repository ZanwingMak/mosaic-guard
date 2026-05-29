// 生成含订单号 / 流水号的测试图
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  const dataURL = await page.evaluate(() => {
    const W = 1000, H = 500;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#F5F5F8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Order History', 40, 60);
    ctx.font = '22px monospace';
    ctx.fillText('Order: USR12842NOkJBaj21779868107', 40, 130);
    ctx.fillText('Order: USR12842NOPWFa1R1777278578', 40, 180);
    ctx.fillText('Phone: 13812345678', 40, 250);
    ctx.fillText('Card: 4111111111111111', 40, 310);
    ctx.fillText('Tracking: SF1234567890CN', 40, 380);
    return c.toDataURL('image/png');
  });
  const buf = Buffer.from(dataURL.replace(/^data:image\/png;base64,/, ''), 'base64');
  const out = path.join(__dirname, 'fixtures', 'order-mock.png');
  fs.writeFileSync(out, buf);
  console.log(`[gen] ${out} (${buf.length} bytes)`);
  await browser.close();
})();
