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
        const typography = [...document.querySelectorAll('.tag-row span, .profile-summary dt, .site-footer')]
          .filter(visible).map((element) => ({ font: parseFloat(getComputedStyle(element).fontSize), transform: getComputedStyle(element).textTransform }));
        return {
          pageOverflow: document.documentElement.scrollWidth > innerWidth,
          navOverflow: nav.scrollWidth > nav.clientWidth,
          header: { top: header.top, bottom: header.bottom, height: header.height }, links, typography,
          h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
          h3: parseFloat(getComputedStyle(document.querySelector('.entry-main h3')).fontSize),
          sidebarMode: getComputedStyle(sidebar).position, sidebarTop: getComputedStyle(sidebar).top,
          sidebarOverflow: getComputedStyle(sidebar).overflowY,
          sidebarHeight: sidebar.getBoundingClientRect().height,
          sidebarMaxHeight: getComputedStyle(sidebar).maxHeight,
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
          projects: [...document.querySelectorAll('#projects .entry')].map((entry) => ({
            name: entry.querySelector('h3').textContent,
            text: entry.textContent,
            number: entry.querySelector('.entry-year').textContent.trim(),
            numberFont: parseFloat(getComputedStyle(entry.querySelector('.entry-year')).fontSize),
            subtitleFont: parseFloat(getComputedStyle(entry.querySelector('.entry-meta')).fontSize),
            tagsFollowSubtitle: entry.querySelector('.entry-meta').nextElementSibling === entry.querySelector('.tag-row'),
            tags: [...entry.querySelectorAll('.tag-row span')].map((tag) => ({
              text: tag.textContent.trim(),
              radius: getComputedStyle(tag).borderRadius,
            })),
          })),
          publication: (() => {
            const element = document.querySelector('#projects .publication-metrics');
            return {
              numberOfFacts: element.querySelectorAll('strong').length,
              facts: [...element.querySelectorAll('strong')].map((node) => node.textContent.trim()),
              labels: [...element.querySelectorAll('em')].map((node) => node.textContent.trim()),
              valueSize: parseFloat(getComputedStyle(element.querySelector('strong')).fontSize),
              borderWidth: getComputedStyle(element).borderTopWidth,
              background: getComputedStyle(element).backgroundImage,
            };
          })(),
          studyhub: {
            data: window.siteData.studyhub,
            displayed: [...document.querySelectorAll('[data-studyhub-metric]')].map((element) => ({
              key: element.dataset.studyhubMetric, text: element.textContent,
            })),
            strip: (() => {
              const element = document.querySelector('#projects .metric-row');
              const first = element.children[0];
              const second = element.children[1];
              return {
                display: getComputedStyle(element).display,
                borderWidth: getComputedStyle(element).borderTopWidth,
                background: getComputedStyle(element).backgroundImage,
                backgroundColor: getComputedStyle(element).backgroundColor,
                separator: getComputedStyle(second, '::before').content,
                valueSize: parseFloat(getComputedStyle(first.querySelector('strong')).fontSize),
                firstBackground: getComputedStyle(first).backgroundColor,
              };
            })(),
          },
          chineseCv: document.querySelector('.sidebar-actions a').getAttribute('href'),
          configuredCv: window.siteData.links.chineseCv,
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
      if (width > 900) {
        assert.equal(layout.sidebarMode, 'sticky', `${label}: desktop sidebar must stick`);
        assert.equal(layout.sidebarOverflow, 'auto', `${label}: tall sidebar must scroll internally`);
        assert.ok(parseFloat(layout.sidebarTop) >= layout.header.height, label);
        assert.ok(layout.sidebarHeight <= parseFloat(layout.sidebarMaxHeight) + 2, label);
        const scrolledSidebar = await page.evaluate(async () => {
          window.scrollTo({ top: 700, behavior: 'instant' });
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const rect = document.querySelector('.profile-sidebar').getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, scrollTop: scrollY };
        });
        assert.ok(scrolledSidebar.scrollTop >= 600, `${label}: page must actually scroll`);
        assert.ok(scrolledSidebar.top >= layout.header.height - 1 &&
          scrolledSidebar.bottom <= height + 1, `${label}: profile must remain visible while page scrolls ${JSON.stringify(scrolledSidebar)}`);
      } else {
        assert.notEqual(layout.sidebarMode, 'sticky', `${label}: mobile sidebar stays in page flow`);
        assert.equal(layout.sidebarOverflow, 'visible', label);
      }
      assert.equal(layout.honors.length, 8);
      assert.ok(layout.honors.every((text) => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)), 'Keep all existing honor emoji');
      assert.ok(layout.years.every((year, index) => index === 0 || year <= layout.years[index - 1]));
      assert.equal(layout.articles, 5);
      assert.equal(layout.figures.length, 6);
      assert.ok(layout.figures.every((figure) => figure.avif && figure.src.endsWith('.png')));
      assert.equal(layout.foldedMedia, 4, 'Four project text disclosures should exist');
      assert.equal(layout.brand, false);
      assert.ok(layout.socialMeta >= 5);
      assert.deepEqual(layout.projects.map((project) => project.name), ['StudyHub', 'DDSurfer', 'dMRI-Agent', 'SlicerDDSurfer']);
      assert.deepEqual(layout.projects.map((project) => project.number), ['01', '02', '03', '04']);
      assert.ok(layout.projects.every((project) => project.numberFont >= 19 && project.subtitleFont >= 14 && project.tagsFollowSubtitle), label);
      assert.deepEqual(layout.projects.map((project) => project.tags.length), [4, 3, 3, 3]);
      assert.ok(layout.projects.every((project) => project.tags.every((tag) => tag.radius === '999px')), label);
      assert.match(layout.projects[0].text, /RRF/);
      assert.match(layout.projects[0].text, /Guard-as-Jev/);
      assert.match(layout.projects[0].text, /GRPO/);
      assert.match(layout.projects[1].text, /25\.5%/);
      assert.match(layout.projects[1].text, language === 'zh' ? /无需额外 T1w 结构像/ : /without an additional T1w scan/i);
      assert.equal(layout.publication.numberOfFacts, 3);
      assert.deepEqual(layout.publication.facts, ['Advanced Science', language === 'zh' ? '一区 TOP' : 'CAS Q1 TOP', '14.1']);
      assert.deepEqual(layout.publication.labels, language === 'zh'
        ? ['期刊', '中科院分区', '影响因子'] : ['Journal', 'CAS ranking', 'IF']);
      assert.equal(layout.publication.borderWidth, '0px');
      assert.equal(layout.publication.background, 'none');
      assert.ok(layout.publication.valueSize >= 21, label);
      assert.match(layout.projects[2].text, language === 'zh' ? /参与设计/ : /Contributed/);
      assert.match(layout.projects[3].text, /Python \/ Qt/);
      assert.ok(layout.studyhub.data.approximate);
      assert.equal(layout.studyhub.strip.display, 'flex', label);
      assert.equal(layout.studyhub.strip.borderWidth, '0px', label);
      assert.equal(layout.studyhub.strip.background, 'none', label);
      assert.equal(layout.studyhub.strip.backgroundColor, 'rgba(0, 0, 0, 0)', label);
      assert.match(layout.studyhub.strip.separator, /·/, label);
      assert.ok(layout.studyhub.strip.valueSize >= 23, label);
      assert.equal(layout.studyhub.strip.firstBackground, 'rgba(0, 0, 0, 0)', label);
      assert.deepEqual(layout.studyhub.displayed.map((metric) => metric.key), ['users', 'downloads']);
      for (const metric of layout.studyhub.displayed) {
        assert.equal(metric.text, `~${layout.studyhub.data[metric.key]}`);
      }
      assert.equal(layout.chineseCv, layout.configuredCv, 'Sidebar and Bot must share the versioned CV URL');
      assert.match(layout.chineseCv, /\?v=/);
      if (screenshots && [1440, 820, 390].includes(width)) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
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
  await page.locator('.lang-btn[data-lang="zh"]').click();
  assert.equal(new URL(page.url()).searchParams.get('lang'), 'zh');
  await page.locator('.lang-btn[data-lang="en"]').click();
  assert.equal(new URL(page.url()).searchParams.get('lang'), 'en');
  const projectToggles = page.locator('.project-text-collapse');
  assert.equal(await projectToggles.count(), 4);
  assert.match(await projectToggles.first().locator('summary').textContent(), /Show technical details/);
  assert.equal(await page.locator('.project-text-collapse[open]').count(), 0);
  assert.equal(await page.locator('.project-details img').count(), 6, 'All project figures remain outside text disclosures');
  assert.ok(await page.locator('.project-video video').isVisible(), 'StudyHub video remains visible');
  await projectToggles.first().locator('summary').click();
  assert.equal(await page.locator('.project-text-collapse[open]').count(), 1);
  assert.ok(await page.locator('.project-highlights li').first().isVisible(), 'Expanded StudyHub details readable');
  await projectToggles.first().locator('summary').click();
  assert.equal(await page.locator('.project-text-collapse[open]').count(), 0);
  await projectToggles.nth(1).locator('summary').click();
  assert.ok(await projectToggles.nth(1).locator('p').first().isVisible(), 'DDSurfer technical paragraphs reveal');
  await projectToggles.nth(1).locator('summary').click();
  await page.locator('.project-details img').first().click();
  assert.equal(await page.locator('.image-lightbox__download').textContent(), 'Download PNG');
  const downloadReady = page.waitForEvent('download');
  await page.locator('.image-lightbox__download').click();
  assert.equal((await downloadReady).suggestedFilename(), 'studyhub-poster.png');
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('.image-lightbox').evaluate((node) => node.inert));
  assert.equal(await page.locator('.image-lightbox').getAttribute('aria-hidden'), 'true');
  await context.close();

  const cvResponse = await fetch(new URL('./assets/\u674e\u627f\u9526-CV-\u4e2d\u6587.pdf?v=bdda306-20261017', baseURL));
  assert.equal(cvResponse.status, 200);
  assert.equal(Buffer.from(await cvResponse.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');

  for (const [width, height, language] of [[1366, 768, 'zh'], [1536, 864, 'en']]) {
    const { page, context } = await open(width, height, language);
    assert.equal(await page.locator('.copy-btn').count(), 0, 'Email copy button should be removed');
    assert.equal(await page.locator('.profile-link-row a[href^="mailto:"]').count(), 1);
    await page.locator('.profile-link-row a').scrollIntoViewIfNeeded();
    const before = await page.locator('.profile-link-row a').boundingBox();
    await page.locator('.profile-link-row a').focus();
    await page.waitForTimeout(100);
    const after = await page.locator('.profile-link-row a').boundingBox();
    assert.ok(Math.abs(before.y - after.y) <= 1, 'Focusing email link must not shift sidebar');
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
  console.log('PASS language-aware chat history, PNG download, email focus, storage/script fallback, and seasonal mascot');
} finally {
  await browser?.close();
  server.kill();
}
