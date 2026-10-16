import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const screenshots = process.env.UI_SCREENSHOT_DIR;
if (screenshots) mkdirSync(screenshots, { recursive: true });
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
    try { await fetch(baseURL); break; } catch (error) {
      if (attempt >= 50) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const errors = [];
  async function open(width, height, language, options = {}) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    if (options.blockStorage) await page.addInitScript(() => {
      Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
    });
    if (options.blockScript) await page.route('**/script.js?*', (route) => route.abort());
    if (options.date) await page.clock.setFixedTime(new Date(options.date));
    await page.goto(`${baseURL}/?lang=${language}`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      const animations = [...document.querySelectorAll('.reveal')].flatMap((element) => element.getAnimations());
      await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
    });
    return { page, context };
  }

  const viewports = [[1600, 1200], [1440, 900], [1366, 768], [1024, 600], [820, 1180],
    [690, 800], [680, 360], [568, 320], [430, 932], [390, 844], [360, 740], [320, 640]];
  for (const [width, height] of viewports) {
    for (const language of ['zh', 'en']) {
      const { page, context } = await open(width, height, language);
      const layout = await page.evaluate(() => {
        const nav = document.querySelector('.nav-links');
        const header = document.querySelector('.topbar').getBoundingClientRect();
        const sidebar = document.querySelector('.profile-sidebar');
        const links = [...nav.querySelectorAll('a')].map((link) => {
          const range = document.createRange();
          range.selectNodeContents(link);
          const rect = range.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return { text: link.textContent, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, reachable: link === hit || link.contains(hit) };
        });
        const visible = (element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
        const typography = [...document.querySelectorAll('.entry-badges span, .tag-row span, .profile-summary dt, .copy-btn, .site-footer')]
          .filter(visible).map((element) => ({ font: parseFloat(getComputedStyle(element).fontSize), transform: getComputedStyle(element).textTransform }));
        return {
          pageOverflow: document.documentElement.scrollWidth > innerWidth,
          navOverflow: nav.scrollWidth > nav.clientWidth,
          header: { top: header.top, bottom: header.bottom, height: header.height }, links, typography,
          h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
          h3: parseFloat(getComputedStyle(document.querySelector('.entry-main h3')).fontSize),
          sidebarMode: getComputedStyle(sidebar).position, sidebarTop: getComputedStyle(sidebar).top,
          sidebarWidth: sidebar.getBoundingClientRect().width,
          actionWidth: document.querySelector('.sidebar-actions').getBoundingClientRect().width,
          summaryWidth: document.querySelector('.profile-summary').getBoundingClientRect().width,
          years: [...document.querySelectorAll('.honor-year')].map((node) => parseInt(node.textContent, 10)),
          honors: [...document.querySelectorAll('.honor-text')].map((node) => node.textContent),
          figures: [...document.querySelectorAll('.project-details img')].map((image) => ({ src: image.dataset.full, avif: !!image.closest('picture').querySelector('source[type="image/avif"]') })),
          articles: document.querySelectorAll('.compact-list article').length,
          foldedMedia: document.querySelectorAll('details').length,
          brand: !!document.querySelector('.brand'),
          socialMeta: document.querySelectorAll('meta[property^="og:"]').length,
        };
      });
      const label = `${width}x${height} ${language}`;
      assert.equal(layout.pageOverflow, false, `${label}: no horizontal page overflow`);
      assert.equal(layout.navOverflow, false, `${label}: navigation must not clip or scroll`);
      assert.equal(layout.links.length, 5);
      for (const link of layout.links) assert.ok(link.left >= 0 && link.right <= width && link.top >= layout.header.top &&
        link.bottom <= layout.header.bottom && link.reachable, `${label}: ${JSON.stringify(link)}`);
      assert.ok(layout.h1 > layout.h3, `${label}: name is larger than project headings`);
      assert.ok(layout.typography.every((item) => item.font >= 12 && item.transform !== 'uppercase'), label);
      if (width <= 680) {
        assert.ok(layout.header.height <= 58, `${label}: single-row mobile header`);
        assert.ok(Math.abs(layout.actionWidth - layout.sidebarWidth) <= 1, `${label}: CV buttons stretch across sidebar`);
        assert.ok(Math.abs(layout.summaryWidth - layout.sidebarWidth) <= 1, `${label}: summary stretches across sidebar`);
      }
      if (layout.sidebarMode === 'sticky') assert.ok(parseFloat(layout.sidebarTop) >= layout.header.height, label);
      assert.equal(layout.honors.length, 8);
      assert.ok(layout.honors.every((text) => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)), 'Keep all existing honor emoji');
      assert.ok(layout.years.every((year, index) => index === 0 || year <= layout.years[index - 1]));
      assert.equal(layout.articles, 5);
      assert.equal(layout.figures.length, 6);
      assert.ok(layout.figures.every((figure) => figure.avif && figure.src.endsWith('.png')));
      assert.equal(layout.foldedMedia, 0);
      assert.equal(layout.brand, false);
      assert.ok(layout.socialMeta >= 5);
      if (screenshots && [1440, 820, 390].includes(width)) {
        await page.locator('.project-details img').first().evaluate((image) => image.decode());
        await page.screenshot({ path: join(screenshots, `homepage-${width}-${language}.png`) });
      }
      await context.close();
    }
    console.log(`PASS ${width}x${height}: bilingual layout, complete navigation, media and emoji preservation`);
  }

  const { page, context } = await open(390, 844, 'zh');
  await page.locator('.floating-sidebar__bubble').click();
  await page.locator('.portfolio-bot__input').fill('\u4f60\u597d');
  await page.locator('.portfolio-bot__form button').click();
  await page.waitForFunction(() => document.querySelectorAll('.portfolio-bot__message--bot').length === 2);
  await page.evaluate(() => applyLanguage('en'));
  assert.match(await page.locator('.portfolio-bot__message--bot').last().textContent(), /Hello/);
  assert.equal(await page.locator('.portfolio-bot__message--user').last().textContent(), '\u4f60\u597d');
  await page.locator('.floating-sidebar__close').click();
  await page.locator('.language-toggle').click();
  assert.equal(new URL(page.url()).searchParams.get('lang'), 'zh');
  await page.locator('.language-toggle').click();
  assert.equal(new URL(page.url()).searchParams.get('lang'), 'en');
  await page.locator('.project-details img').first().click();
  assert.equal(await page.locator('.image-lightbox__download').textContent(), 'Download PNG');
  const downloadReady = page.waitForEvent('download');
  await page.locator('.image-lightbox__download').click();
  assert.equal((await downloadReady).suggestedFilename(), 'studyhub-poster.png');
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('.image-lightbox').evaluate((node) => node.inert));
  assert.equal(await page.locator('.image-lightbox').getAttribute('aria-hidden'), 'true');
  await context.close();

  for (const [width, height, language] of [[1366, 768, 'zh'], [1536, 864, 'en']]) {
    const { page, context } = await open(width, height, language);
    await page.evaluate(() => {
      scrollTo(0, 3000);
      document.querySelector('.copy-btn').addEventListener('click', () => { window.copyClicks = (window.copyClicks || 0) + 1; });
    });
    await page.locator('.sidebar-actions a').first().focus();
    await page.locator('.copy-btn').scrollIntoViewIfNeeded();
    const before = await page.locator('.copy-btn').boundingBox();
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    const during = await page.locator('.copy-btn').boundingBox();
    await page.mouse.up();
    assert.ok(Math.abs(before.y - during.y) <= 1, 'Focus must not shift the copy button while pressed');
    assert.equal(await page.evaluate(() => window.copyClicks), 1);
    await context.close();
  }
  for (const options of [{ blockStorage: true }, { blockScript: true }]) {
    const { page, context } = await open(390, 844, 'en', options);
    assert.equal(await page.locator('body').evaluate((node) => getComputedStyle(node).visibility), 'visible');
    assert.ok(await page.locator('h1').isVisible());
    if (options.blockStorage) {
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      await page.locator('.floating-sidebar__bubble').click();
      assert.equal(await page.locator('.floating-sidebar__bubble').getAttribute('aria-expanded'), 'true');
    }
    await context.close();
  }
  for (const [date, hat] of [['2026-10-16T12:00:00Z', false], ['2026-12-25T12:00:00Z', true],
    ['2027-01-05T12:00:00Z', true], ['2027-01-06T12:00:00Z', false]]) {
    const { page, context } = await open(1440, 900, 'zh', { date });
    assert.equal(await page.locator('.floating-sidebar').evaluate((node) => node.classList.contains('hat-santa')), hat);
    await context.close();
  }
  assert.deepEqual(errors, [], 'No page runtime errors');
  console.log('PASS language-aware chat history, PNG download, focus stability, storage/script fallback, and seasonal mascot');
} finally {
  await browser?.close();
  server.kill();
}
