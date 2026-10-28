import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chineseCvURL = './assets/ChengjinLi_CV.pdf?v=20261028-70c709e';
const englishCvURL = './assets/Chengjin-Li-CV-English.pdf?v=20261029-en-c6c9760';
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
  for (const url of [chineseCvURL, englishCvURL]) {
    const response = await fetch(new URL(url, baseURL));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/pdf/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    assert.deepEqual(bytes, readFileSync(join(root, new URL(url, baseURL).pathname)));
    if (url === chineseCvURL) assert.equal(createHash('sha256').update(bytes).digest('hex'),
      'c13d4fac4f5b35a7cd8dfe0b117c3dd4d482d978698d02d920c490ada3fa546f',
      'Chinese CV must be the compiled 70c709e source edition');
    if (url === englishCvURL) assert.equal(createHash('sha256').update(bytes).digest('hex'),
      'c95749dea65b07a2f5497d801c54fada45141b2235e2e6d2e5d4863d8c1933cc',
      'English CV must be the synchronized c6c9760 source edition');
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const errors = [];
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    for (const language of ['zh', 'en']) {
      for (const mode of ['normal', 'no-config', 'no-javascript']) {
        const context = await browser.newContext({
          viewport: { width, height }, reducedMotion: 'reduce', javaScriptEnabled: mode !== 'no-javascript',
        });
        const page = await context.newPage();
        page.on('pageerror', (error) => errors.push(error.message));
        if (mode === 'no-config') await page.route('**/site-data.js?*', (route) => route.abort());
        await page.goto(`${baseURL}/?lang=${language}`);
        const label = `${width}x${height} ${language} ${mode}`;
        const links = page.locator('.sidebar-actions a');
        assert.equal(await links.nth(0).getAttribute('href'), chineseCvURL, label);
        assert.equal(await links.nth(1).getAttribute('href'), englishCvURL, label);
        assert.equal(await page.locator('[data-latest-href]').count(), 0, 'No stale availability probe');
        if (mode !== 'no-javascript') {
          assert.equal(await page.locator('html').getAttribute('lang'), language === 'zh' ? 'zh-CN' : 'en', label);
          if (mode === 'normal') {
            assert.equal(await page.evaluate(() => window.siteData.links.chineseCv), chineseCvURL, label);
            assert.equal(await page.evaluate(() => window.siteData.links.englishCv), englishCvURL, label);
          }
          await page.locator('.floating-sidebar__bubble').click();
          await page.locator('button[data-question="cv"]').click();
          await page.waitForFunction(() => document.querySelectorAll('.portfolio-bot__message--bot').length === 2);
          const answer = await page.locator('.portfolio-bot__message--bot').last().innerText();
          assert.match(answer, language === 'zh' ? /双页版/ : /two-page editions/, label);
          assert.doesNotMatch(answer, /保留原版|unchanged/, label);
          assert.deepEqual(await page.locator('.portfolio-bot__message--bot').last()
            .locator('.portfolio-bot__link-button').evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
          [chineseCvURL, englishCvURL], label);
        }
        await context.close();
        console.log(`PASS ${label}: CV links and fallback`);
      }
    }
  }
  assert.deepEqual(errors, [], 'No page runtime errors');
  console.log('PASS exact PDF bytes, MIME types, bilingual desktop/mobile links, Bot, and configuration/script fallbacks');
} finally {
  await browser?.close();
  server.kill();
}
