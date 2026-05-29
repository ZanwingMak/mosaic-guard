// 智选模式 E2E：扫描 → 点击打码 → 再点撤销
const { chromium } = require('playwright');
const path = require('path');

const URL = 'http://localhost:8082';
const FIXTURE = path.join(__dirname, 'fixtures', 'test-image.png');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getOpCount(page) {
  const txt = (await page.locator('text=/\\d+ 次操作/').first().textContent().catch(() => '')) || '';
  // 顶栏完整文本是 "900 × 700 · 1 次操作"，要紧贴"次操作"的那个数字
  const m = txt.match(/(\d+)\s*次操作/);
  return m ? parseInt(m[1], 10) : -1;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('选择图片', { exact: true }).click(),
  ]);
  await chooser.setFiles(FIXTURE);
  await page.waitForURL('**/editor');
  await page.getByText('编辑', { exact: true }).waitFor();
  await sleep(2000);

  // 切换到智选
  await page.getByText('智选', { exact: true }).first().click();
  await sleep(300);
  // 触发扫描
  await page.getByText('一键智选全图', { exact: true }).last().click();
  console.log('扫描中（首次 OCR + face 模型加载需时间）...');
  await page.waitForFunction(
    () => /文字 \d+ 行 · 人脸 \d+ 张/.test(document.body.textContent || ''),
    { timeout: 180000 },
  );
  await sleep(1500);

  // 抓底部摘要
  const summary = await page.locator('text=/文字 \\d+ 行 · 人脸 \\d+ 张/').first().textContent();
  console.log('扫描结果：', summary);

  // 从测试钩子拿真实检测列表 + canvas 屏幕坐标
  const info = await page.evaluate(() => {
    const ds = window.__detections__;
    const cs = document.querySelectorAll('canvas');
    if (!ds || !ds.length || cs.length < 2) return null;
    const overlay = cs[1];
    const r = overlay.getBoundingClientRect();
    return {
      detections: ds.map((d) => ({ id: d.id, type: d.type, label: d.label, rect: d.rect })),
      bitmap: { w: overlay.width, h: overlay.height },
      rect: { left: r.left, top: r.top, w: r.width, h: r.height },
    };
  });
  if (!info) throw new Error('window.__detections__ 不存在');
  console.log(`检测框：${info.detections.length} 个（types: ${[...new Set(info.detections.map((d) => d.type))].join(',')}）`);
  info.detections.slice(0, 4).forEach((d) =>
    console.log(`  · ${d.type} "${d.label}" @ (${Math.round(d.rect.x)},${Math.round(d.rect.y)}) ${Math.round(d.rect.w)}×${Math.round(d.rect.h)}`),
  );

  const sxOf = (imgX) => info.rect.left + (imgX / info.bitmap.w) * info.rect.w;
  const syOf = (imgY) => info.rect.top + (imgY / info.bitmap.h) * info.rect.h;
  const centerOf = (d) => ({
    x: sxOf(d.rect.x + d.rect.w / 2),
    y: syOf(d.rect.y + d.rect.h / 2),
  });

  const d0 = info.detections[0];
  const d1 = info.detections[1] || info.detections[0];
  const p0 = centerOf(d0);
  const p1 = centerOf(d1);

  const opsBefore = await getOpCount(page);
  console.log('点击前 ops =', opsBefore);

  await page.mouse.click(p0.x, p0.y);
  await sleep(400);
  const opsAfter1 = await getOpCount(page);
  console.log(`点 d0 (${d0.label}) 后 ops =`, opsAfter1);

  await page.mouse.click(p0.x, p0.y);
  await sleep(400);
  const opsAfter2 = await getOpCount(page);
  console.log('再点 d0（撤销）后 ops =', opsAfter2);

  await page.mouse.click(p1.x, p1.y);
  await sleep(400);
  const opsAfter3 = await getOpCount(page);
  console.log(`点 d1 (${d1.label}) 后 ops =`, opsAfter3);

  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'smart-after-clicks.png') });

  console.log('console errors:', errors.length, errors.slice(0, 3));

  const ok =
    opsAfter1 === opsBefore + 1 && opsAfter2 === opsBefore && opsAfter3 === opsBefore + 1 && errors.length === 0;
  console.log(ok ? '\n✅ 智选点击切换 OK' : '\n❌ 状态不符预期');

  await browser.close();
  process.exit(ok ? 0 : 1);
})();
