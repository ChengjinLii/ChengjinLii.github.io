# ChengjinLii.github.io

Personal portfolio site for Chengjin Li / 李承锦.

## Local Preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Project Images

Project figures use responsive AVIF images with a WebP fallback. The original
PNGs are kept for full-resolution previews and downloads. After replacing a
source PNG, rebuild display variants with Pillow 12 or newer:

```bash
python3 scripts/optimize-images.py --refresh-webp
```

Each project presents one representative figure before a native, keyboard-accessible
expandable detail section; remaining figures, technical notes, and the StudyHub
video live in the detail section. The lightbox supports both hero and detail
figures and upgrades the already-loaded preview to the original PNG.

## Bot Layout Regression

With Node.js 22+, Python 3, and Playwright installed, run:

```bash
node scripts/test-bot-viewport.mjs
```

The browser check covers Chinese and English desktop/mobile layouts, long chat
histories, continued input, dragging, window resizing, and simulated on-screen
keyboard viewports. It checks that the input, send, and close controls remain
reachable without moving the mascot when a reply appears.

Set `PLAYWRIGHT_MODULE_PATH` and `CHROMIUM_EXECUTABLE_PATH` to use an existing
Playwright installation and Chromium binary. Optionally set `BOT_SCREENSHOT_DIR`
to save screenshots outside the repository.

## Selective UI Regression

The portfolio keeps the original logos, honor emoji, draggable eye-tracking
mascot, collapsible technical details, responsive AVIF/WebP images, and PNG
downloads. Typography, sidebar alignment, mobile navigation, and research/honor
structure selectively borrow from the local `newui` prototype. Tall desktop
profiles scroll in normal document flow rather than shifting focused controls.

Run the layout and behavior checks with the same browser environment variables
documented above:

```bash
node scripts/test-selective-ui.mjs
```

The check covers 24 bilingual viewport combinations, complete single-row mobile
navigation, media and emoji preservation, language-aware chat history, PNG
downloads, focus stability, blocked storage/scripts, and seasonal mascot hats.
Set `UI_SCREENSHOT_DIR` to save screenshots outside the repository.

## Current CV And Project Copy

The Chinese CV download is built from `ChengjinLii/Chengjin-CV` commit
`bdda3069715531b36bb0d4f2472ffd2a8a2f64c1` (source edition v30). The upstream
PDF was older than its TeX source, so the hosted PDF uses the locally compiled
source rather than that older binary. A versioned URL is shared by the sidebar
and Bot. The English CV PDF remains the previous edition because the source
repository currently supplies only Chinese.

Both languages of the project descriptions follow the new CV. StudyHub's
approximately 400 users and 2,000 downloads are explicitly approximate; the
display values and Bot responses read `site-data.js`. The project illustrations,
video, image optimization, lightbox, and download behavior are unchanged.

## Deploy

Create a GitHub repository named `ChengjinLii.github.io`, then push this directory to the `main` branch. GitHub Pages will serve it at:

```text
https://ChengjinLii.github.io
```
