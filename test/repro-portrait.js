// 复现：导入竖屏图，截图编辑器看渲染结果
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle' });
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('选择图片', { exact: true }).click(),
  ]);
  await chooser.setFiles(path.join(__dirname, 'fixtures', 'portrait-mock.png'));
  await page.waitForURL('**/editor');
  await page.waitForTimeout(3000);
  // 报告关键指标
  const info = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas'));
    if (canvases.length === 0) return { canvases: 0 };
    const c = canvases[0];
    const rect = c.getBoundingClientRect();
    return {
      canvases: canvases.length,
      bitmap: { w: c.width, h: c.height },
      css: { w: Math.round(rect.width), h: Math.round(rect.height) },
      ratio_bitmap: (c.width / c.height).toFixed(3),
      ratio_css: (rect.width / rect.height).toFixed(3),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'repro-portrait.png') });
  await browser.close();
})();
