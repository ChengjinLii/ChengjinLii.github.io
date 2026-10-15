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

The first figure is prioritized; later figures are lazy-loaded. The lightbox
shows the already-loaded display image while decoding the original PNG.

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

## Deploy

Create a GitHub repository named `ChengjinLii.github.io`, then push this directory to the `main` branch. GitHub Pages will serve it at:

```text
https://ChengjinLii.github.io
```
