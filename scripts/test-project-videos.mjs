import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const filmURL = './assets/slicerddsurfer-promo.mp4';
const coverURL = './assets/slicerddsurfer-promo-cover.jpg';
const bytes = readFileSync(join(root, 'assets', 'slicerddsurfer-promo.mp4'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),
  '123e1d20ebb637aca1d8a8d2e02ac5967a1e7ebe7a34956edd19b2916d4ba4a1', 'Keep the original film');
const boxes = [];
for (let offset = 0; offset < bytes.length;) {
  const size = bytes.readUInt32BE(offset);
  assert.ok(size >= 8 && offset + size <= bytes.length, 'Valid MP4 box');
  boxes.push(bytes.toString('ascii', offset + 4, offset + 8));
  offset += size;
}
assert.ok(boxes.includes('moov') && boxes.indexOf('moov') < boxes.indexOf('mdat'), 'Fast-start MP4');
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
  const cover = await fetch(new URL(coverURL, baseURL));
  assert.equal(cover.status, 200);
  assert.match(cover.headers.get('content-type'), /image\/jpeg/);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const errors = [];
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    for (const language of ['zh', 'en']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const mediaRequests = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => { if (request.url().includes('.mp4')) mediaRequests.push(request.url()); });
      await page.goto(`${baseURL}/?lang=${language}`);
      await page.evaluate(() => document.fonts.ready);
      const film = page.locator('#projects .entry').nth(3).locator('video');
      await film.scrollIntoViewIfNeeded();
      assert.equal(await film.locator('source').getAttribute('src'), filmURL);
      assert.equal(await film.getAttribute('poster'), coverURL);
      assert.equal(await film.getAttribute('preload'), 'none');
      assert.notEqual(await film.getAttribute('controls'), null);
      assert.notEqual(await film.getAttribute('playsinline'), null);
      assert.equal(await film.getAttribute('autoplay'), null);
      assert.deepEqual(mediaRequests, [], 'Do not request either film before playback');
      assert.equal(await film.evaluate((video) => video.closest('figure').previousElementSibling.querySelector('img')?.dataset.full),
        './assets/slicerdspace-figure1.png', 'Film follows the workflow figure');
      assert.match(await film.locator('..').locator('figcaption').textContent(),
        language === 'zh' ? /SlicerDSpace 宣传片/ : /SlicerDSpace promotional film/);
      const geometry = await film.boundingBox();
      assert.ok(geometry.width <= width && Math.abs(geometry.width / geometry.height - 16 / 9) < 0.03);
      await film.evaluate((video) => { video.preload = 'metadata'; video.load(); });
      await page.waitForFunction(() => {
        const video = document.querySelector('#projects .entry:nth-of-type(4) video');
        return video.readyState >= 1 || video.error;
      });
      const metadata = await film.evaluate((video) => ({
        error: video.error?.message, width: video.videoWidth, height: video.videoHeight, duration: video.duration,
      }));
      assert.equal(metadata.error, undefined);
      assert.equal(metadata.width, 1920);
      assert.equal(metadata.height, 1080);
      assert.ok(Math.abs(metadata.duration - 72) < 0.1);
      await film.evaluate(async (video) => { video.muted = true; await video.play(); });
      await page.waitForFunction(() => document.querySelector('#projects .entry:nth-of-type(4) video').currentTime > 0.2);
      await film.evaluate((video) => video.pause());
      await context.close();
      console.log(`PASS ${width}x${height} ${language}: poster, no eager video request, metadata and playback`);
    }
  }
  assert.deepEqual(errors, [], 'No page runtime errors');
} finally {
  await browser?.close();
  server.kill();
}
