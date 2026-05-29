// 复现：拖拽文件到 DropZone 是否会触发导入
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle' });

  // 读取测试图
  const filePath = path.join(__dirname, 'fixtures', 'test-image.png');
  const buf = fs.readFileSync(filePath);
  const dataURL = 'data:image/png;base64,' + buf.toString('base64');

  // 找 DropZone 的边界
  const zone = page.locator('text=把图片拖到这里').locator('..').locator('..');
  const box = await zone.boundingBox();
  console.log('DropZone box:', box);

  // 用 evaluate 在页面里手动派发一个真正的 DragEvent（带 DataTransfer + File）
  const dispatched = await page.evaluate(async ({ dataURL, cx, cy }) => {
    // 把 dataURL 还原成 File
    const res = await fetch(dataURL);
    const blob = await res.blob();
    const file = new File([blob], 'test.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);

    const target = document.elementFromPoint(cx, cy);
    if (!target) return { ok: false, reason: 'no element at point' };

    // 构造三连：dragenter → dragover → drop
    const mkEvt = (type) => {
      const e = new DragEvent(type, { bubbles: true, cancelable: true });
      // DragEvent 的 dataTransfer 通常只读；强行替换
      Object.defineProperty(e, 'dataTransfer', { value: dt });
      return e;
    };
    target.dispatchEvent(mkEvt('dragenter'));
    target.dispatchEvent(mkEvt('dragover'));
    target.dispatchEvent(mkEvt('drop'));
    return { ok: true, tag: target.tagName, cls: target.className };
  }, { dataURL, cx: box.x + box.width / 2, cy: box.y + box.height / 2 });

  console.log('dispatch result:', dispatched);
  await page.waitForTimeout(2000);
  console.log('URL after drop:', page.url());
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'repro-drop.png') });
  await browser.close();
})();
