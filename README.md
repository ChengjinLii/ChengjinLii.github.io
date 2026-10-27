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

## Project Films

StudyHub and SlicerDDSurfer each have an inline video below their project figure,
using the same responsive player, poster, and bilingual caption. Both use
`preload="none"`, native controls, and `playsinline`; neither autoplays.

The SlicerDDSurfer film and cover are copied without re-encoding from its
`docs/site/media/SlicerDDSurfer_promo_1080p.mp4` and
`docs/site/assets/img/poster.jpg`. The film is a 1080p H.264/AAC MP4 with its
metadata before media data for progressive playback. Original quality is kept,
and the 47,838,648-byte film is fetched only when playback is requested.

Run `node scripts/test-project-videos.mjs` with the browser environment variables
below to check media requests, bilingual captions, metadata, and playback.

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
mascot, fully expanded project figures, responsive AVIF/WebP images, and PNG
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

The Chinese CV download is [ChengjinLi_CV.pdf](assets/ChengjinLi_CV.pdf),
compiled from `Chengjin_CV.tex` at `ChengjinLii/Chengjin-CV` commit
`64c84499e4c3fefb79ab1e220246e9e9cde71d15` with XeLaTeX (two A4 pages).
Missing image dependencies were recovered losslessly from the previously supplied
PDF; the tracked TeX source was not edited. The sidebar and Bot share a versioned
URL; the link also works without JavaScript and requires no availability probe.
When updating the CV, replace
this file and update the version in `index.html`, `site-data.js`, `script.js`,
and both CV regression scripts. The English CV PDF remains unchanged.

Run `node scripts/test-cv-download.mjs` with the Playwright environment variables
above to check PDF bytes, MIME types, bilingual desktop/mobile download links,
Bot buttons, and fallbacks when configuration or JavaScript is unavailable.

Both languages of the project descriptions follow the new CV. StudyHub's
approximately 400 users and 2,000 downloads are explicitly approximate; the
display values and Bot responses read `site-data.js`. The project illustrations,
films, image optimization, lightbox, and download behavior are preserved.

## Deploy

Create a GitHub repository named `ChengjinLii.github.io`, then push this directory to the `main` branch. GitHub Pages will serve it at:

```text
https://ChengjinLii.github.io
```
