// 移动端视口验证：iPhone 14 (390×844)
const { chromium, devices } = require('playwright');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const iphone = devices['iPhone 14'];
  const ctx = await browser.newContext({
    ...iphone,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctx.newPage();

  // ── 1) 首页移动端 ──
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle' });
  await sleep(800);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'mobile-01-home.png') });
  console.log('✓ 首页截图');

  // ── 2) 导入图片 ──
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('选择图片', { exact: true }).click(),
  ]);
  await chooser.setFiles(path.join(__dirname, 'fixtures', 'portrait-mock.png'));
  await page.waitForURL('**/editor');
  await sleep(2000);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'mobile-02-editor-empty.png') });
  console.log('✓ 编辑器加载');

  // 智选默认是第一个工具，激活看看
  await page.getByText('智选', { exact: true }).first().click();
  await sleep(300);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'mobile-03-tool-smart.png') });
  console.log('✓ 智选 tool 选中');

  // 展开效果参数
  await page.getByText('参数', { exact: true }).first().click();
  await sleep(300);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'mobile-04-effects-expand.png') });
  console.log('✓ 效果参数展开');

  // 触发智选扫描
  await page.getByText('一键智选全图', { exact: true }).last().click();
  console.log('扫描中…');
  await page.waitForFunction(
    () => /文字 \d+ 行 · 人脸 \d+ 张/.test(document.body.textContent || ''),
    null, { timeout: 180000 }
  );
  await sleep(1500);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'mobile-05-scan-done.png') });
  console.log('✓ 智选扫描完成');

  await browser.close();
  console.log('\n所有 mobile-*.png 已写入 test/screenshots/');
})();
