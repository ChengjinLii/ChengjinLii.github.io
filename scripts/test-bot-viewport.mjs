import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const screenshotDirectory = process.env.BOT_SCREENSHOT_DIR;
if (screenshotDirectory) mkdirSync(screenshotDirectory, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const socket = createServer();
  socket.on('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const { port } = socket.address();
    socket.close(() => resolve(port));
  });
});
const baseURL = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  cwd: root, stdio: 'ignore',
});
let browser;

try {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fetch(baseURL);
      break;
    } catch (error) {
      if (attempt >= 50) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /ResizeObserver/.test(message.text())) errors.push(message.text());
  });
  const settle = () => page.evaluate(async () => {
    const panel = document.querySelector('.floating-sidebar__panel');
    await Promise.all(panel.getAnimations().map((animation) => animation.finished.catch(() => {})));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  async function navigate(width, height, language = 'zh') {
    await page.setViewportSize({ width, height });
    await page.goto(`${baseURL}/?lang=${language}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
  }
  const mascot = () => page.locator('.floating-sidebar').boundingBox();
  async function assertUnmoved(before, label) {
    const after = await mascot();
    assert.ok(Math.abs(after.x - before.x) <= 1 && Math.abs(after.y - before.y) <= 1,
      `${label}: mascot moved from ${JSON.stringify(before)} to ${JSON.stringify(after)}`);
  }
  async function assertFits(label) {
    await settle();
    const layout = await page.evaluate(() => {
      const panel = document.querySelector('.floating-sidebar__panel');
      const rect = panel.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0;
      const top = viewport?.offsetTop || 0;
      const messages = document.querySelector('.portfolio-bot__messages');
      return {
        panel: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
        viewport: { top, left, bottom: top + (viewport?.height || innerHeight), right: left + (viewport?.width || innerWidth) },
        controls: ['.portfolio-bot__input', '.portfolio-bot__form button', '.floating-sidebar__close'].map((selector) => {
          const element = document.querySelector(selector);
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          return { selector, top: box.top, bottom: box.bottom, left: box.left, right: box.right, reachable: element === hit || element.contains(hit) };
        }),
        messageHeight: messages.clientHeight,
        messageOverflow: messages.scrollHeight > messages.clientHeight,
        panelOverflow: panel.scrollWidth > panel.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        viewportWidth: innerWidth,
        modal: panel.getAttribute('aria-modal'),
        mobile: matchMedia('(max-width: 680px)').matches,
      };
    });
    const context = `${label}: ${JSON.stringify(layout)}`;
    assert.ok(layout.panel.top >= layout.viewport.top - 1 && layout.panel.bottom <= layout.viewport.bottom + 1, context);
    assert.ok(layout.panel.left >= layout.viewport.left - 1 && layout.panel.right <= layout.viewport.right + 1, context);
    for (const control of layout.controls) {
      assert.ok(control.top >= layout.panel.top && control.bottom <= layout.panel.bottom &&
        control.left >= layout.panel.left && control.right <= layout.panel.right && control.reachable, context);
    }
    assert.ok(layout.messageHeight >= 12, context);
    assert.equal(layout.panelOverflow, false, context);
    if (layout.viewportWidth >= 320) assert.equal(layout.pageOverflow, false, context);
    assert.equal(layout.modal, layout.mobile ? 'true' : null, context);
    return layout;
  }
  async function ask(question) {
    const messages = page.locator('.portfolio-bot__message--bot');
    const count = await messages.count();
    await page.locator('.portfolio-bot__input').fill(question);
    await page.locator('.portfolio-bot__form button').click();
    await page.waitForFunction((expected) => document.querySelectorAll('.portfolio-bot__message--bot').length === expected, count + 1);
  }
  const sizes = [[1600, 1000], [1280, 720], [1024, 600], [800, 600], [900, 480],
    [720, 360], [681, 320], [680, 360], [568, 320], [390, 667],
    [320, 480], [240, 320], [240, 200], [1024, 240], [800, 180]];
  for (const [width, height] of sizes) {
    for (const language of ['zh', 'en']) {
      const label = `${width}x${height} ${language}`;
      await navigate(width, height, language);
      const before = await mascot();
      await page.locator('.floating-sidebar__bubble').click();
      await assertFits(`${label} open`);
      await assertUnmoved(before, label);
      await ask(language === 'zh' ? '\u6709\u54ea\u4e9b\u8bba\u6587\u548c\u5728\u6295\u5de5\u4f5c\uff1f' : 'What papers and submissions does he have?');
      await assertFits(`${label} reply`);
      await page.evaluate(() => {
        for (let i = 0; i < 12; i += 1) {
          addBotMessage('user', 'x'.repeat(160));
          addBotMessage('bot', botAnswers.projects[activeLanguage]);
        }
      });
      const layout = await assertFits(`${label} history`);
      assert.ok(layout.messageOverflow, `${label}: long history must scroll inside the message list`);
      await assertUnmoved(before, label);
      await ask(language === 'zh' ? '\u4f60\u597d' : 'Hello');
      await assertFits(`${label} send again`);
      if (screenshotDirectory && ['1280x720', '568x320', '320x480'].includes(`${width}x${height}`)) {
        await page.screenshot({ path: join(screenshotDirectory, `${width}x${height}-${language}.png`) });
      }
      await page.locator('.floating-sidebar__close').click();
      assert.equal(await page.locator('.floating-sidebar__bubble').getAttribute('aria-expanded'), 'false');
    }
    console.log(`PASS ${width}x${height}: Chinese and English`);
  }
  await navigate(1280, 720);
  await page.locator('.floating-sidebar__bubble').click();
  for (const [x, y] of [[14, 76], [1200, 76], [1200, 640], [14, 640]]) {
    await page.evaluate(([x, y]) => applyBotPosition(clampBotPosition(x, y)), [x, y]);
    const before = await mascot();
    await ask('projects');
    await assertFits(`dragged anchor ${x},${y}`);
    await assertUnmoved(before, 'dragged anchor');
  }
  const bubble = await page.locator('.floating-sidebar__bubble').boundingBox();
  await page.mouse.move(bubble.x + bubble.width / 2, bubble.y + bubble.height / 2);
  await page.mouse.down();
  await page.mouse.move(800, 300, { steps: 10 });
  await page.mouse.up();
  await assertFits('pointer drag');
  for (const [width, height] of [[1024, 600], [568, 320], [390, 667], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await assertFits(`resize ${width}x${height}`);
    await ask('CV');
    await assertFits('reply after resize');
  }
  await navigate(390, 844);
  await page.locator('.floating-sidebar__bubble').click();
  for (const viewport of [
    { height: 320, width: 390, offsetTop: 0, offsetLeft: 0 },
    { height: 200, width: 350, offsetTop: 100, offsetLeft: 20 },
  ]) {
    await page.evaluate((values) => {
      for (const [key, value] of Object.entries(values)) {
        Object.defineProperty(window.visualViewport, key, { configurable: true, get: () => value });
      }
      window.visualViewport.dispatchEvent(new Event('resize'));
    }, viewport);
    await assertFits(`simulated keyboard ${JSON.stringify(viewport)}`);
    await ask('Hello');
    await assertFits('reply with simulated keyboard');
  }
  await page.evaluate(() => {
    for (const key of ['height', 'width', 'offsetTop', 'offsetLeft']) delete window.visualViewport[key];
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await assertFits('keyboard closed');
  assert.deepEqual(errors, [], 'No runtime or resize-observer errors');
  console.log('PASS 30 bilingual viewport scenarios, edge anchors, dragging, live resizing, and simulated keyboard viewports');
} finally {
  await browser?.close();
  server.kill();
}
