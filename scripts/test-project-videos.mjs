import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const filmURL = './assets/slicerdspace-promo-20261031.mp4';
const coverURL = './assets/slicerdspace-promo-cover-20261031.jpg';
const figureURL = './assets/slicerdspace-figure1-20261031.png';
const websiteURL = 'https://chengjinlii.github.io/SlicerDSpace/';
const screenshots = process.env.UI_SCREENSHOT_DIR;
if (screenshots) mkdirSync(screenshots, { recursive: true });
const bytes = readFileSync(join(root, 'assets', 'slicerdspace-promo-20261031.mp4'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),
  '877f7e3a4dc7afbf4641a609398940a65bf2b21c26d918c3f170efee78c27df9', 'Use the latest branded film unchanged');
assert.equal(bytes.length, 24799408);
const figureBytes = readFileSync(join(root, 'assets', 'slicerdspace-figure1-20261031.png'));
assert.equal(createHash('sha256').update(figureBytes).digest('hex'),
  '8f12a905a738677fa8a944d72adfa0091a02e75fae082fdba9b3d2a2a646065d', 'Use current paper-latex Figure 1');
assert.equal(figureBytes.readUInt32BE(16), 4326);
assert.equal(figureBytes.readUInt32BE(20), 2642);
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
  assert.equal(createHash('sha256').update(Buffer.from(await cover.arrayBuffer())).digest('hex'),
    'e35da16b30e648102062fd40f8834b354e69ce0a86c16d0f8e9e7afc555a9838');
  const figure = await fetch(new URL(figureURL, baseURL));
  assert.equal(figure.status, 200);
  assert.match(figure.headers.get('content-type'), /image\/png/);
  assert.deepEqual(Buffer.from(await figure.arrayBuffer()), figureBytes);
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
      const project = page.locator('#projects .entry').nth(3);
      const projectLinks = project.locator('.entry-links a');
      assert.deepEqual(await projectLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
        [websiteURL, 'https://github.com/ChengjinLii/SlicerDSpace'], 'Website comes before GitHub');
      assert.equal(await projectLinks.first().textContent(), language === 'zh' ? '项目网站' : 'Website');
      assert.equal(await page.evaluate(() => window.siteData.links.slicerSite), websiteURL);
      const websiteBox = await projectLinks.nth(0).boundingBox();
      const githubBox = await projectLinks.nth(1).boundingBox();
      assert.ok(websiteBox.x + websiteBox.width <= githubBox.x, 'Website is visually left of GitHub');
      const film = project.locator('video');
      await film.scrollIntoViewIfNeeded();
      assert.equal(await film.locator('source').getAttribute('src'), filmURL);
      assert.equal(await film.getAttribute('poster'), coverURL);
      assert.equal(await film.getAttribute('preload'), 'none');
      assert.notEqual(await film.getAttribute('controls'), null);
      assert.notEqual(await film.getAttribute('playsinline'), null);
      assert.equal(await film.getAttribute('autoplay'), null);
      assert.deepEqual(mediaRequests, [], 'Do not request either film before playback');
      const illustration = project.locator('.project-details img');
      await illustration.evaluate((image) => image.decode());
      assert.match(await illustration.evaluate((image) => image.currentSrc), /slicerdspace-figure1-20261031-\d+\.avif$/);
      assert.equal(await film.evaluate((video) => video.closest('figure').previousElementSibling.querySelector('img')?.dataset.full),
        figureURL, 'Film follows the latest workflow figure');
      assert.match(await film.locator('..').locator('figcaption').textContent(),
        language === 'zh' ? /SlicerDSpace 宣传片/ : /SlicerDSpace promotional film/);
      assert.doesNotMatch(await film.locator('..').locator('figcaption').textContent(),
        /更名前|SlicerDDSurfer|original .*edition/, 'Remove the pre-rename disclaimer');
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
      if (screenshots) {
        await project.screenshot({ path: join(screenshots, `slicerdspace-${width}-${language}.png`) });
        await project.evaluate((element) => {
          const header = document.querySelector('header').getBoundingClientRect();
          window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - header.height - 16, behavior: 'instant' });
        });
        await page.screenshot({ path: join(screenshots, `slicerdspace-heading-${width}-${language}.png`) });
      }
      await context.close();
      console.log(`PASS ${width}x${height} ${language}: poster, no eager video request, metadata and playback`);
    }
  }
  assert.deepEqual(errors, [], 'No page runtime errors');
} finally {
  await browser?.close();
  server.kill();
}
