const languageButtons = document.querySelectorAll(".lang-btn");
const translatable = document.querySelectorAll("[data-en][data-zh]");
const year = document.querySelector("#year");
const languageStorageKey = "site-language-v2";
let activeLanguage = "zh";

function applyLanguage(language) {
  activeLanguage = language;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  translatable.forEach((node) => {
    node.innerHTML = node.dataset[language];
  });
  document.querySelectorAll("[data-en-placeholder][data-zh-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", node.dataset[`${language}Placeholder`]);
  });
  languageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === language);
  });
  localStorage.setItem(languageStorageKey, language);
}

function languageFromUrl() {
  const value = new URLSearchParams(window.location.search).get("lang");
  return value === "en" || value === "zh" ? value : null;
}

function setLanguageUrl(language) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  window.history.replaceState({}, "", url);
}

languageButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    applyLanguage(button.dataset.lang);
    setLanguageUrl(button.dataset.lang);
  });
});

year.textContent = new Date().getFullYear();
applyLanguage(languageFromUrl() || localStorage.getItem(languageStorageKey) || "zh");

function setupImageLightbox() {
  const projectImages = document.querySelectorAll(".project-details img");
  if (!projectImages.length) return;

  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Image preview");
  lightbox.innerHTML = `
    <button class="image-lightbox__close" type="button" aria-label="Close image preview">×</button>
    <figure class="image-lightbox__frame">
      <img alt="" />
      <figcaption class="image-lightbox__caption"></figcaption>
    </figure>
  `;
  document.body.appendChild(lightbox);

  const previewImage = lightbox.querySelector("img");
  const previewCaption = lightbox.querySelector(".image-lightbox__caption");
  const closeButton = lightbox.querySelector(".image-lightbox__close");

  function openLightbox(sourceImage) {
    const caption = sourceImage.closest("figure")?.querySelector("figcaption")?.textContent.trim();
    previewImage.src = sourceImage.currentSrc || sourceImage.src;
    previewImage.alt = sourceImage.alt || "";
    previewCaption.textContent = caption || sourceImage.alt || "";
    lightbox.classList.add("is-open");
    document.body.classList.add("lightbox-open");
    closeButton.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    previewImage.removeAttribute("src");
  }

  projectImages.forEach((image) => {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `Open larger view: ${image.alt || "project figure"}`);
    image.addEventListener("click", () => openLightbox(image));
    image.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openLightbox(image);
    });
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || event.target === closeButton) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });
}

setupImageLightbox();

function createSnowLayer(canvas, options) {
  if (!canvas) return null;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const layer = {
    canvas,
    context,
    flakes: [],
    options,
    width: 0,
    height: 0,
  };

  function randomFlake() {
    const { radius, speed, wind } = options;
    return {
      x: Math.random() * layer.width,
      y: Math.random() * layer.height,
      r: radius[0] + Math.random() * (radius[1] - radius[0]),
      vy: speed[0] + Math.random() * (speed[1] - speed[0]),
      vx: wind[0] + Math.random() * (wind[1] - wind[0]),
      phase: Math.random() * Math.PI * 2,
    };
  }

  layer.resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    layer.width = Math.max(1, rect.width);
    layer.height = Math.max(1, rect.height);
    canvas.width = Math.floor(layer.width * ratio);
    canvas.height = Math.floor(layer.height * ratio);
    canvas.style.width = `${layer.width}px`;
    canvas.style.height = `${layer.height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    layer.flakes = Array.from({ length: options.count }, randomFlake);
  };

  layer.draw = () => {
    context.clearRect(0, 0, layer.width, layer.height);
    context.fillStyle = options.color;
    layer.flakes.forEach((flake) => {
      flake.phase += 0.012;
      flake.x += flake.vx + Math.sin(flake.phase) * 0.12;
      flake.y += flake.vy;
      if (flake.y > layer.height + flake.r) {
        flake.y = -flake.r;
        flake.x = Math.random() * layer.width;
      }
      if (flake.x > layer.width + flake.r) flake.x = -flake.r;
      if (flake.x < -flake.r) flake.x = layer.width + flake.r;
      context.beginPath();
      context.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
      context.fill();
    });
  };

  return layer;
}

function setupSeasonalTopbar() {
  const topbar = document.querySelector(".topbar.theme-xmas");
  const meteors = document.querySelector(".hero-meteors");
  const farCanvas = document.querySelector(".snow-canvas--far");
  const nearCanvas = document.querySelector(".snow-canvas--near");
  if (!topbar || !meteors || !farCanvas || !nearCanvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.innerWidth <= 640;
  const snowLayers = [
    createSnowLayer(farCanvas, {
      count: isMobile ? 16 : 26,
      color: "rgba(248, 241, 229, 0.38)",
      radius: [0.6, 2.2],
      speed: [0.6, 1.6],
      wind: [-0.2, 1.2],
    }),
    createSnowLayer(nearCanvas, {
      count: isMobile ? 8 : 14,
      color: "rgba(255, 250, 240, 0.32)",
      radius: [1.6, 3.4],
      speed: [1.2, 2.4],
      wind: [-0.4, 1.6],
    }),
  ].filter(Boolean);

  function resizeSnow() {
    snowLayers.forEach((layer) => layer.resize());
  }

  function animateSnow() {
    snowLayers.forEach((layer) => layer.draw());
    window.requestAnimationFrame(animateSnow);
  }

  function randomizeMeteors() {
    if (reduceMotion && !isMobile) {
      meteors.innerHTML = "";
      return;
    }
    const count = Math.random() < 0.5 ? 2 : 3;
    meteors.innerHTML = "";
    Array.from({ length: count }).forEach((_, index) => {
      const meteor = document.createElement("span");
      meteor.className = "hero-meteor";
      meteor.style.top = `${Math.random() * 28 - 8}%`;
      meteor.style.left = `${Math.random() * 45 + 5}%`;
      meteor.style.animationDelay = `${index * 0.7 + Math.random() * 0.35}s`;
      meteors.appendChild(meteor);
    });
  }

  resizeSnow();
  if (!reduceMotion || isMobile) {
    animateSnow();
  }
  randomizeMeteors();
  window.setInterval(randomizeMeteors, 10000);
  window.addEventListener("resize", resizeSnow);
}

if (document.readyState === "complete") {
  setupSeasonalTopbar();
} else {
  window.addEventListener("load", setupSeasonalTopbar, { once: true });
}

const bot = document.querySelector(".floating-sidebar");
const botLauncher = document.querySelector(".floating-sidebar__bubble");
const botPanel = document.querySelector(".floating-sidebar__panel");
const botClose = document.querySelector(".floating-sidebar__close");
const botMessages = document.querySelector(".portfolio-bot__messages");
const botForm = document.querySelector(".portfolio-bot__form");
const botInput = document.querySelector(".portfolio-bot__input");
const botStarters = document.querySelectorAll(".portfolio-bot__starters button");

function clampBotPosition(x, y) {
  if (!bot) return { x, y };
  const width = bot.offsetWidth || 320;
  const height = bot.offsetHeight || 360;
  const minX = 14;
  const minY = 76;
  const maxX = Math.max(minX, window.innerWidth - width - 14);
  const maxY = Math.max(minY, window.innerHeight - height - 14);
  return {
    x: Math.min(Math.max(minX, x), maxX),
    y: Math.min(Math.max(minY, y), maxY),
  };
}

function applyBotPosition(position) {
  if (!bot) return;
  bot.style.left = `${position.x}px`;
  bot.style.top = `${position.y}px`;
  bot.style.right = "auto";
  bot.style.bottom = "auto";
}

let eyeAnimationFrame = null;
let eyeSampleTimer = null;
const lastPointer = { x: 0, y: 0 };
const eyeTarget = { x: 0, y: 0 };
const eyeCurrent = { x: 0, y: 0 };
let hasPointer = false;

window.addEventListener("pointermove", (event) => {
  hasPointer = true;
  lastPointer.x = event.clientX;
  lastPointer.y = event.clientY;
});

function sampleEyeTarget() {
  if (!botLauncher || !hasPointer) return;
  const rect = botLauncher.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = lastPointer.x - centerX;
  const dy = lastPointer.y - centerY;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const maxOffset = 6;
  eyeTarget.x = (dx / distance) * maxOffset;
  eyeTarget.y = (dy / distance) * maxOffset;
}

function animateEyes() {
  if (botLauncher) {
    const lerp = 0.05;
    eyeCurrent.x += (eyeTarget.x - eyeCurrent.x) * lerp;
    eyeCurrent.y += (eyeTarget.y - eyeCurrent.y) * lerp;
    botLauncher.style.setProperty("--eye-x", `${eyeCurrent.x}px`);
    botLauncher.style.setProperty("--eye-y", `${eyeCurrent.y}px`);
  }
  eyeAnimationFrame = requestAnimationFrame(animateEyes);
}

eyeSampleTimer = window.setInterval(sampleEyeTarget, 150);
eyeAnimationFrame = requestAnimationFrame(animateEyes);

let dragStart = null;
let dragOffset = { x: 0, y: 0 };
let isDraggingBot = false;
let didMoveBot = false;
let suppressBotClick = false;

function moveBot(event) {
  if (!bot || !dragStart) return;
  const distance = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y);
  if (!isDraggingBot && distance < 6) return;
  if (!isDraggingBot) {
    const rect = bot.getBoundingClientRect();
    dragOffset = {
      x: dragStart.x - rect.left,
      y: dragStart.y - rect.top,
    };
    isDraggingBot = true;
    bot.classList.add("is-dragging");
  }
  didMoveBot = true;
  const next = clampBotPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y);
  applyBotPosition(next);
}

function stopBotDrag() {
  document.removeEventListener("pointermove", moveBot);
  document.removeEventListener("pointerup", stopBotDrag);
  document.removeEventListener("pointercancel", stopBotDrag);
  dragStart = null;
  bot?.classList.remove("is-dragging");
  if (!isDraggingBot) {
    suppressBotClick = false;
    return;
  }
  isDraggingBot = false;
  suppressBotClick = didMoveBot;
  didMoveBot = false;
  if (suppressBotClick) {
    window.setTimeout(() => {
      suppressBotClick = false;
    }, 0);
  }
}

function startBotDrag(event) {
  if (event.target.closest(".floating-sidebar__close, input, button:not(.floating-sidebar__bubble)")) return;
  event.preventDefault();
  dragStart = { x: event.clientX, y: event.clientY };
  isDraggingBot = false;
  didMoveBot = false;
  if (event.currentTarget.setPointerCapture) {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore browsers that reject pointer capture here.
    }
  }
  document.addEventListener("pointermove", moveBot);
  document.addEventListener("pointerup", stopBotDrag);
  document.addEventListener("pointercancel", stopBotDrag);
}

botLauncher?.addEventListener("pointerdown", startBotDrag);
document.querySelector(".floating-sidebar__header")?.addEventListener("pointerdown", startBotDrag);

window.addEventListener("resize", () => {
  if (!bot || !bot.style.top || !bot.style.left) return;
  const next = clampBotPosition(parseFloat(bot.style.left), parseFloat(bot.style.top));
  applyBotPosition(next);
});

const botAnswers = {
  projects: {
    zh:
      "**代表项目**\n- **StudyHub**：校园知识共享平台，已有 **345 名用户** 与 **1,628 次下载**。\n- **DDSurfer**：dMRI 皮层表面重建工作，已被 **Advanced Science** 录用。\n- **dMRI-Agent**：协议驱动的扩散 MRI 智能体工作流，论文正在投 **Nature Communications**。\n- **SlicerDDSurfer**：面向 3D Slicer 的科研软件扩展，protocol 正在投 **Nature Protocols**。",
    en:
      "**Representative projects**\n- **StudyHub**: an operated campus knowledge-sharing platform with **345 users** and **1,628 downloads**.\n- **DDSurfer**: a dMRI cortical surface reconstruction project accepted by **Advanced Science**.\n- **dMRI-Agent**: a protocol-driven agentic workflow for diffusion MRI, submitted to **Nature Communications**.\n- **SlicerDDSurfer**: a 3D Slicer research software extension, submitted to **Nature Protocols**.",
  },
  research: {
    zh:
      "**科研进展概览**\n- **Advanced Science**：DDSurfer 相关工作已录用，属于 **一区 Top 期刊**，影响因子 **14.1**。\n- **ISMRM 2025**：研究工作接收为 **Oral presentation**。\n- **OHBM 2025**：研究工作接收为 **Poster presentation**。\n- **在投工作**：dMRI-Agent 投 **Nature Communications**；SlicerDDSurfer 投 **Nature Protocols**。",
    en:
      "**Research snapshot**\n- **Advanced Science**: DDSurfer-related work has been accepted by a **JCR Q1 top-tier journal** with Impact Factor **14.1**.\n- **ISMRM 2025**: accepted as an **Oral presentation**.\n- **OHBM 2025**: accepted as a **Poster presentation**.\n- **Submitted manuscripts**: dMRI-Agent to **Nature Communications**; SlicerDDSurfer to **Nature Protocols**.",
  },
  studyhub: {
    zh:
      "**StudyHub 不是纯 demo**\n- 面向校园资料共享、经验分享、求购协作和校园集市场景。\n- 已累计 **345 名用户**、**1,628 次下载**。\n- 做了 **AI 搜索、推荐、内容审核、MCP 接入与 Agent 辅助能力**。\n- 项目网站：`study-hub.cn`",
    en:
      "**StudyHub is not just a demo**\n- It supports campus material sharing, experience posts, requests, and marketplace scenarios.\n- It has reached **345 users** and **1,628 downloads**.\n- It includes **AI search, recommendation, moderation, MCP integration, and agent-assisted features**.\n- Project site: `study-hub.cn`",
  },
  contact: {
    zh:
      "**联系方式**\n- 邮箱：`chengjinli@std.uestc.edu.cn`\n- GitHub：`github.com/ChengjinLii`\n- 项目网站：`study-hub.cn`\n- 地址：电子科技大学清水河校区",
    en:
      "**Contact**\n- Email: `chengjinli@std.uestc.edu.cn`\n- GitHub: `github.com/ChengjinLii`\n- Project site: `study-hub.cn`\n- Address: UESTC Qingshuihe Campus, Chengdu",
  },
  awards: {
    zh:
      "**主要奖项**\n- 研电赛人工智能赛道西南赛区 **一等奖**。\n- 华为杯全国大学生数学建模竞赛国家 **三等奖**，担任队长。\n- 中国国际大学生创新大赛校赛 **金奖**、四川省省赛 **银奖**。\n- 连续四学年获得 **优秀学生奖学金**。\n- 获本科毕业创新奖与 **优秀毕设**。",
    en:
      "**Selected honors**\n- **First Prize** in the AI Track, Southwest Regional Contest, China Graduate Electronics Design Contest.\n- National **Third Prize** in Huawei Cup CUMCM, as team leader.\n- **Gold Award** at UESTC and **Silver Award** at Sichuan provincial round, China International College Students' Innovation Competition.\n- **Outstanding Student Scholarship** for four consecutive academic years.\n- Undergraduate Innovation Award and **Outstanding Undergraduate Thesis**.",
  },
  agent: {
    zh:
      "**dMRI-Agent**\n- 目标：把 diffusion MRI 分析流程转化为可审计、可复现的智能体工作流。\n- 架构：采用 **planner / executor** 协作模式。\n- 能力：支持任务规划、阶段执行、QC 追踪和结构化日志。\n- 状态：相关论文正在投 **Nature Communications**。",
    en:
      "**dMRI-Agent**\n- Goal: convert diffusion MRI analysis into an auditable and reproducible agentic workflow.\n- Architecture: a **planner / executor** collaboration pattern.\n- Capabilities: task planning, staged execution, QC tracking, and structured logs.\n- Status: the related manuscript is submitted to **Nature Communications**.",
  },
  skills: {
    zh:
      "**技术能力**\n- 语言：`Python` / `TypeScript` / `C` / `MATLAB`\n- 医学影像与深度学习：`PyTorch` / `3D Slicer` / `SimpleITK` / `nibabel`\n- 全栈与后端：`FastAPI` / `Next.js` / `MySQL` / `Redis` / `OSS`\n- 工程工具：`Docker` / `Git`",
    en:
      "**Technical stack**\n- Languages: `Python` / `TypeScript` / `C` / `MATLAB`\n- Medical imaging and deep learning: `PyTorch` / `3D Slicer` / `SimpleITK` / `nibabel`\n- Full-stack and backend: `FastAPI` / `Next.js` / `MySQL` / `Redis` / `OSS`\n- Engineering tools: `Docker` / `Git`",
  },
  cv: {
    zh:
      "**简历入口**\n可以直接查看下面两个版本：\n[中文简历](./assets/李承锦-CV-中文.pdf)\n[English CV](./assets/Chengjin-Li-CV-English.pdf)",
    en:
      "**CV links**\nOpen either version directly:\n[Chinese CV](./assets/李承锦-CV-中文.pdf)\n[English CV](./assets/Chengjin-Li-CV-English.pdf)",
  },
  default: {
    zh:
      "我可以回答关于 **项目、论文、奖项、StudyHub、技术栈、联系方式和简历** 的问题。也可以直接点击上方预设问题。",
    en:
      "I can answer questions about **projects, papers, awards, StudyHub, technical skills, contact information, and CV**. You can also click one of the preset questions above.",
  },
};

function openBot() {
  bot?.classList.add("open");
  botPanel.hidden = false;
  botLauncher.setAttribute("aria-expanded", "true");
}

function closeBot() {
  bot?.classList.remove("open");
  botPanel.hidden = true;
  botLauncher.setAttribute("aria-expanded", "false");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function renderLinkButton(line) {
  const match = line.match(/^\[(.+?)\]\((.+?)\)$/);
  if (!match) return null;
  const label = escapeHtml(match[1]);
  const href = escapeHtml(match[2]);
  return `<a class="portfolio-bot__link-button" href="${href}" target="_blank" rel="noopener">${label}</a>`;
}

function renderBotMarkdown(value) {
  const blocks = [];
  let listItems = [];
  let linkButtons = [];

  function flushList() {
    if (listItems.length) {
      blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
      listItems = [];
    }
  }

  function flushLinks() {
    if (linkButtons.length) {
      blocks.push(`<div class="portfolio-bot__link-row">${linkButtons.join("")}</div>`);
      linkButtons = [];
    }
  }

  value.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushLinks();
      return;
    }
    const button = renderLinkButton(trimmed);
    if (button) {
      flushList();
      linkButtons.push(button);
      return;
    }
    if (trimmed.startsWith("- ")) {
      flushLinks();
      listItems.push(renderInlineMarkdown(trimmed.slice(2)));
      return;
    }
    flushList();
    flushLinks();
    blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  });
  flushList();
  flushLinks();
  return blocks.join("");
}

function addBotMessage(role, content) {
  const article = document.createElement("article");
  article.className = `portfolio-bot__message portfolio-bot__message--${role}`;
  if (role === "bot") {
    article.innerHTML = renderBotMarkdown(content);
  } else {
    const paragraph = document.createElement("p");
    paragraph.textContent = content;
    article.appendChild(paragraph);
  }
  botMessages.appendChild(article);
  botMessages.scrollTop = botMessages.scrollHeight;
}

function pickAnswer(raw) {
  const text = raw.toLowerCase();
  if (/studyhub|用户|下载|平台|mcp|搜索|推荐/.test(text)) return botAnswers.studyhub;
  if (/agent|智能体|dmri-agent|dmri agent|workflow|工作流/.test(text)) return botAnswers.agent;
  if (/skill|stack|技术|能力|python|typescript|pytorch|fastapi|next/.test(text)) return botAnswers.skills;
  if (/cv|resume|简历|pdf/.test(text)) return botAnswers.cv;
  if (/paper|论文|advanced|ismrm|ohbm|nature|期刊|会议|在投/.test(text)) return botAnswers.research;
  if (/award|honor|奖|奖学金|毕设|竞赛|华为杯/.test(text)) return botAnswers.awards;
  if (/contact|email|github|联系|邮箱|网站/.test(text)) return botAnswers.contact;
  if (/project|项目|ddsurfer|slicer|dmri/.test(text)) return botAnswers.projects;
  return botAnswers.default;
}

botLauncher?.addEventListener("click", () => {
  if (suppressBotClick) {
    suppressBotClick = false;
    return;
  }
  if (bot?.classList.contains("open")) {
    closeBot();
  } else {
    openBot();
  }
});

botClose?.addEventListener("click", closeBot);

botStarters.forEach((button) => {
  button.addEventListener("click", () => {
    const question = button.dataset[activeLanguage] || button.textContent.trim();
    const answer = botAnswers[button.dataset.question] || botAnswers.default;
    openBot();
    addBotMessage("user", question);
    window.setTimeout(() => addBotMessage("bot", answer[activeLanguage]), 160);
  });
});

botForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = botInput.value.trim();
  if (!value) return;
  botInput.value = "";
  addBotMessage("user", value);
  const answer = pickAnswer(value);
  window.setTimeout(() => addBotMessage("bot", answer[activeLanguage]), 180);
});
