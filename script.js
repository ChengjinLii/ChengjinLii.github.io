const languageButtons = document.querySelectorAll(".lang-btn");
const languageListeners = [];
const year = document.querySelector("#year");
const siteData = window.siteData || {};
const languageStorageKey = "site-language-v2";
let activeLanguage = "zh";

function studyhubMetric(key, language) {
  const data = siteData.studyhub || {};
  const value = data[key] || (key === "users" ? "400" : "2,000");
  const prefix = data.approximate !== false ? "~" : "";
  return `${prefix}${value}`;
}

function applyLanguage(language) {
  language = language === "en" ? "en" : "zh";
  activeLanguage = language;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-en][data-zh]").forEach((node) => {
    node.innerHTML = node.dataset[language];
  });
  document.querySelectorAll("[data-studyhub-metric]").forEach((node) => {
    node.textContent = studyhubMetric(node.dataset.studyhubMetric, language);
  });
  document.querySelectorAll("[data-en-title][data-zh-title]").forEach((node) => {
    node.setAttribute("title", node.dataset[`${language}Title`]);
    node.setAttribute("aria-label", node.dataset[`${language}Title`]);
  });
  document.querySelectorAll("[data-en-placeholder][data-zh-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", node.dataset[`${language}Placeholder`]);
  });
  languageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === language);
    if (button.dataset.lang === language) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
  languageListeners.forEach((listener) => listener(language));
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {
    // A blocked storage API must not prevent the rest of the page from loading.
  }
}

function savedLanguage() {
  try {
    const value = localStorage.getItem(languageStorageKey);
    return value === "en" || value === "zh" ? value : null;
  } catch {
    return null;
  }
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

function setupBackToTop() {
  const button = document.querySelector(".back-to-top");
  if (!button) return;

  const updateVisibility = () => {
    const visible = window.scrollY > 420;
    button.classList.toggle("is-visible", visible);
    button.tabIndex = visible ? 0 : -1;
  };

  button.addEventListener("click", () => {
    document.querySelector("#top")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();
}

function setupSectionNavigation() {
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const aboutLink = links.find((link) => link.getAttribute("href") === "#about");
  aboutLink?.addEventListener("click", (event) => {
    event.preventDefault();
    // A stuck sidebar cannot reliably be positioned by native anchor scrolling.
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.hash !== "#about") {
      window.history.pushState({}, "", aboutLink.href);
    }
  });
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!links.length || !sections.length || !("IntersectionObserver" in window)) return;

  const linkById = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.classList.remove("is-current"));
      linkById.get(visible.target.id)?.classList.add("is-current");
    },
    { rootMargin: "-18% 0px -62%", threshold: [0.05, 0.25, 0.5] },
  );

  sections.forEach((section) => observer.observe(section));
}

function setupHeaderOffset() {
  const header = document.querySelector(".topbar");
  if (!header) return;

  const updateOffset = () => {
    document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight + 24}px`);
  };

  if ("ResizeObserver" in window) {
    new ResizeObserver(updateOffset).observe(header);
  }
  window.addEventListener("resize", updateOffset, { passive: true });
  updateOffset();
}

function setupProfileSidebar() {
  const sidebar = document.querySelector(".profile-sidebar");
  const header = document.querySelector(".topbar");
  if (!sidebar || !header) return;

  const updatePosition = () => {
    sidebar.style.setProperty("--profile-sticky-top", `${header.offsetHeight + 24}px`);
    // CSS limits tall desktop profiles to the visible height, so they remain sticky.
    // Tablet and mobile layout explicitly resets the scroll container.
  };

  if ("ResizeObserver" in window) {
    new ResizeObserver(updatePosition).observe(header);
  }
  window.addEventListener("resize", updatePosition, { passive: true });
  updatePosition();
}

languageButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    applyLanguage(button.dataset.lang);
    setLanguageUrl(button.dataset.lang);
  });
});

year.textContent = new Date().getFullYear();
applyLanguage(languageFromUrl() || savedLanguage() || "zh");
document.querySelectorAll('a[href^="https://"], a[href^="http://"]').forEach((link) => {
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});
setupBackToTop();
setupSectionNavigation();
setupHeaderOffset();
setupProfileSidebar();

function setupImageLightbox() {
  const projectImages = document.querySelectorAll(".project-details img");
  if (!projectImages.length) return;

  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.inert = true;
  lightbox.innerHTML = `
    <button class="image-lightbox__close" type="button">×</button>
    <figure class="image-lightbox__frame">
      <img alt="" decoding="async" />
      <figcaption class="image-lightbox__meta">
        <span class="image-lightbox__caption"></span>
        <a class="image-lightbox__download" href="#" download>下载原图 PNG</a>
      </figcaption>
    </figure>
  `;
  document.body.appendChild(lightbox);

  const previewImage = lightbox.querySelector("img");
  const previewCaption = lightbox.querySelector(".image-lightbox__caption");
  const downloadLink = lightbox.querySelector(".image-lightbox__download");
  const closeButton = lightbox.querySelector(".image-lightbox__close");
  let previewRequest = 0;
  let activeSource = null;

  const refreshLabels = (language) => {
    lightbox.setAttribute("aria-label", language === "zh" ? "图片预览" : "Image preview");
    closeButton.setAttribute("aria-label", language === "zh" ? "关闭图片预览" : "Close image preview");
    downloadLink.textContent = language === "zh" ? "下载原图 PNG" : "Download PNG";
    projectImages.forEach((image) => {
      image.setAttribute("aria-label", language === "zh"
        ? `查看大图：${image.alt || "项目图示"}`
        : `Open larger view: ${image.alt || "project figure"}`);
    });
    if (activeSource) {
      previewCaption.textContent = activeSource.closest("figure")?.querySelector("figcaption")?.textContent.trim() || activeSource.alt;
    }
  };
  languageListeners.push(refreshLabels);
  refreshLabels(activeLanguage);

  function openLightbox(sourceImage) {
    const request = ++previewRequest;
    activeSource = sourceImage;
    const caption = sourceImage.closest("figure")?.querySelector("figcaption")?.textContent.trim();
    const fullImage = sourceImage.dataset.full || sourceImage.currentSrc || sourceImage.src;
    const cleanUrl = new URL(fullImage, window.location.href);
    const filename = cleanUrl.pathname.split("/").pop() || "project-figure.png";
    previewImage.width = sourceImage.width;
    previewImage.height = sourceImage.height;
    previewImage.src = sourceImage.currentSrc || sourceImage.src;
    previewImage.alt = sourceImage.alt || "";
    previewCaption.textContent = caption || sourceImage.alt || "";
    downloadLink.href = fullImage;
    downloadLink.download = filename.replace(/\?.*$/, "");
    lightbox.inert = false;
    lightbox.setAttribute("aria-hidden", "false");
    lightbox.classList.add("is-open");
    document.body.classList.add("lightbox-open");
    closeButton.focus();

    // Reuse the loaded display image immediately, then upgrade without a blank preview.
    const original = new Image();
    original.decoding = "async";
    original.onload = async () => {
      try {
        await original.decode();
      } catch {
        return;
      }
      if (request === previewRequest && lightbox.classList.contains("is-open")) {
        previewImage.src = fullImage;
      }
    };
    original.src = fullImage;
  }

  function closeLightbox() {
    ++previewRequest;
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    previewImage.removeAttribute("src");
    activeSource?.focus({ preventScroll: true });
    activeSource = null;
    lightbox.inert = true;
    lightbox.setAttribute("aria-hidden", "true");
  }

  projectImages.forEach((image) => {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
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
    if (!lightbox.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.stopImmediatePropagation();
      closeLightbox();
    } else if (event.key === "Tab") {
      const first = closeButton;
      const last = downloadLink;
      if (!lightbox.contains(document.activeElement)
        || (event.shiftKey && document.activeElement === first)
        || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
      event.stopImmediatePropagation();
    }
  });
}

setupImageLightbox();

const bot = document.querySelector(".floating-sidebar");
const botLauncher = document.querySelector(".floating-sidebar__bubble");
const botPanel = document.querySelector(".floating-sidebar__panel");
const botClose = document.querySelector(".floating-sidebar__close");
const botBackdrop = document.querySelector(".bot-backdrop");
const botMobileViewport = window.matchMedia("(max-width: 680px)");
const botMessages = document.querySelector(".portfolio-bot__messages");
const botForm = document.querySelector(".portfolio-bot__form");
const botInput = document.querySelector(".portfolio-bot__input");
const botStarters = document.querySelectorAll(".portfolio-bot__starters button");

function clampBotPosition(x, y) {
  if (!bot) return { x, y };
  const width = bot.offsetWidth || 320;
  const height = bot.offsetHeight || 360;
  const minX = 14;
  const minY = botMobileViewport.matches
    ? (document.querySelector(".topbar")?.getBoundingClientRect().bottom || 76) + 12
    : 76;
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
  positionBotPanel();
}

function positionBotPanel() {
  if (!bot?.classList.contains("open") || !botPanel) return;
  const mobile = botMobileViewport.matches;
  if (botBackdrop) botBackdrop.hidden = !mobile;
  const viewport = window.visualViewport;
  const visibleTop = viewport?.offsetTop || 0;
  const visibleLeft = viewport?.offsetLeft || 0;
  const visibleWidth = viewport?.width || window.innerWidth;
  const visibleHeight = viewport?.height || window.innerHeight;
  const headerBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom || 0;
  let top = Math.max(visibleTop, headerBottom) + 12;
  const keyboardOpen = visibleHeight < window.innerHeight * 0.75;
  const bottomInset = mobile && !keyboardOpen && visibleHeight >= 480 ? 84 : 12;
  const bottom = visibleTop + visibleHeight - bottomInset;
  // A short viewport or on-screen keyboard leaves the composer priority over navigation.
  if (bottom - top < 180) top = visibleTop + 12;
  const availableHeight = Math.max(0, bottom - top);
  const maxHeight = mobile ? availableHeight : Math.min(visibleHeight * 0.78, availableHeight);
  const width = Math.max(0, mobile ? visibleWidth - 32 : Math.min(370, visibleWidth - 32));

  botPanel.style.bottom = "auto";
  botPanel.style.width = `${width}px`;
  botPanel.style.maxHeight = `${maxHeight}px`;
  botPanel.classList.toggle("is-compact", maxHeight < 360);
  botPanel.classList.toggle("is-tiny", maxHeight < 240);
  if (mobile) botPanel.setAttribute("aria-modal", "true");
  else botPanel.removeAttribute("aria-modal");

  // Reposition only the dialog; opening or growing a reply must not move the mascot.
  const anchor = bot.getBoundingClientRect();
  const panelWidth = botPanel.offsetWidth;
  let x = visibleLeft + (visibleWidth - panelWidth) / 2;
  if (!mobile) {
    x = anchor.right + 16;
    if (x + panelWidth > visibleLeft + visibleWidth - 16) x = anchor.left - panelWidth - 16;
  }
  x = Math.max(visibleLeft + 16, Math.min(x, visibleLeft + visibleWidth - panelWidth - 16));
  const preferredY = mobile ? bottom - botPanel.offsetHeight : anchor.top;
  const y = Math.max(top, Math.min(preferredY, bottom - botPanel.offsetHeight));
  botPanel.style.left = `${x - anchor.left}px`;
  botPanel.style.top = `${y - anchor.top}px`;
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
  const maxOffset = 5; // Match StudyHub: keep both eyes safely inside the round face.
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
  if (bot?.style.top && bot.style.left) {
    const next = clampBotPosition(parseFloat(bot.style.left), parseFloat(bot.style.top));
    applyBotPosition(next);
  }
  positionBotPanel();
});

botMobileViewport.addEventListener("change", positionBotPanel);
window.visualViewport?.addEventListener("resize", positionBotPanel);
window.visualViewport?.addEventListener("scroll", positionBotPanel);
if (botPanel && "ResizeObserver" in window) {
  new ResizeObserver(positionBotPanel).observe(botPanel);
}

const links = siteData.links || {};
const contact = siteData.contact || {};
const researchData = siteData.research || {};
const awardData = siteData.awards || {};
const submissions = researchData.submissions || [];
const submissionTextZh = submissions
  .map((item) => item.venue ? `${item.project} 投 **${item.venue}**` : `${item.project}：**在投**`)
  .join("；");
const submissionTextEn = submissions
  .map((item) => item.venue ? `${item.project} to **${item.venue}**` : `${item.project}: **Submitted**`)
  .join("; ");
const awardListZh = awardData.zh || [];
const awardListEn = awardData.en || [];
const botAnswers = {
  greeting: {
    zh: "你好！我是 **Chengjin Bot**。你可以问我李承锦的项目、科研、技术能力或简历。",
    en: "Hello! I'm **Chengjin Bot**. Ask me about Chengjin Li's projects, research, technical skills, or CV.",
  },
  identity: {
    zh: "我是 **Chengjin Bot**，李承锦个人主页的资料助手。我根据本站整理好的资料，介绍他的项目、科研成果、技术能力和联系方式。",
    en: "I'm **Chengjin Bot**, the guide to Chengjin Li's portfolio. I use the information prepared for this site to answer questions about his projects, research, skills, and contact details.",
  },
  thanks: {
    zh: "不客气！需要项目、论文或简历信息，随时问我。",
    en: "You're welcome! Ask anytime about projects, papers, or the CV.",
  },
  goodbye: {
    zh: "再见！有需要时，点击我的悬浮图标就能继续提问。",
    en: "Goodbye! Click my floating icon whenever you'd like to ask another question.",
  },
  projects: {
    zh: `**代表项目**\n- **StudyHub**：校园资料共享与 AI 学习平台，约 ${studyhubMetric("users", "zh")} 名用户、${studyhubMetric("downloads", "zh")} 次下载；包含 RAG、增量 Wiki、Agent 问答和多模态审核。\n- **DDSurfer**：基于 dMRI 的弱监督皮层表面重建，第一作者论文发表于 **${researchData.journal?.venue || "Advanced Science"}**（2026）。\n- **dMRI-Agent**：参与 Protocol 驱动的 Planner–Executor 架构、3D Slicer 工具调用及质量控制。\n- **SlicerDDSurfer**：主导基于 3D Slicer 的 dMRI GUI/CLI 分析扩展，集成 DDSeg、DDParcel、DDSurfer 等流程。`,
    en: `**Representative projects**\n- **StudyHub**: a campus resource and AI learning platform with about ${studyhubMetric("users", "en")} users and ${studyhubMetric("downloads", "en")} downloads; includes RAG, an incremental Wiki, agent Q&A, and multimodal moderation.\n- **DDSurfer**: weakly supervised cortical surface reconstruction from dMRI, published as first author in **${researchData.journal?.venue || "Advanced Science"}** (2026).\n- **dMRI-Agent**: contributions to Protocol-driven Planner–Executor workflows, 3D Slicer tool use, and QC.\n- **SlicerDDSurfer**: an open-source dMRI GUI/CLI extension integrating DDSeg, DDParcel, DDSurfer, and downstream analysis.`,
  },
  research: {
    zh:
      `**科研进展概览**\n- **${researchData.journal?.venue || "Advanced Science"} ${researchData.journal?.year || "2026"}**：${researchData.journal?.zh || "DDSurfer 论文已发表，期刊为 **中科院一区 Top**，影响因子 **14.1**。"}\n- **${researchData.conferences?.[0]?.venue || "ISMRM 2025"}**：${researchData.conferences?.[0]?.zh || "研究工作接收为 **Oral presentation**。"}\n- **${researchData.conferences?.[1]?.venue || "OHBM 2025"}**：${researchData.conferences?.[1]?.zh || "研究工作接收为 **Poster presentation**。"}\n- **在投工作**：${submissionTextZh || "dMRI-Agent：**在投**；SlicerDDSurfer 投 **Nature Protocols**"}。`,
    en:
      `**Research snapshot**\n- **${researchData.journal?.venue || "Advanced Science"} ${researchData.journal?.year || "2026"}**: ${researchData.journal?.en || "DDSurfer is published in a **CAS Zone 1 Top journal** with Impact Factor **14.1**."}\n- **${researchData.conferences?.[0]?.venue || "ISMRM 2025"}**: ${researchData.conferences?.[0]?.en || "Accepted as an **Oral presentation**."}\n- **${researchData.conferences?.[1]?.venue || "OHBM 2025"}**: ${researchData.conferences?.[1]?.en || "Accepted as a **Poster presentation**."}\n- **Submitted manuscripts**: ${submissionTextEn || "dMRI-Agent: **Submitted**; SlicerDDSurfer to **Nature Protocols**"}.`,
  },
  studyhub: {
    zh: `**StudyHub：从校园产品到 AI 知识工作流**\n- **产品与运营**：主导架构、核心开发、部署与推广，约 ${studyhubMetric("users", "zh")} 名用户、${studyhubMetric("downloads", "zh")} 次下载。\n- **RAG**：结构感知切分、Parent-Child 索引、BM25 + BGE-M3、RRF 融合与 Qwen3-Reranker 重排。\n- **增量 Wiki**：Map-Reduce 实体与概念聚合，Chunk 级缓存、来源追溯、失效知识撤回。\n- **Agent**：Qwen3.5-9B、MCP、ReAct / Plan-and-Execute、引用反馈修复、上下文压缩和受控收尾。\n- **后训练与审核**：LoRA-based SFT / GRPO 对照实验；Qwen3Guard 与 ShieldGemma 的置信度分流、人工复核。\n- 项目：[StudyHub](${links.studyhub || "https://study-hub.cn"}) · [源代码](${links.studyhubRepo || "https://github.com/ChengjinLii/studyhub"})`,
    en: `**StudyHub: campus product and AI knowledge workflows**\n- **Product**: led architecture, development, deployment and outreach; about ${studyhubMetric("users", "en")} users and ${studyhubMetric("downloads", "en")} downloads.\n- **RAG**: structure-aware chunking, parent-child indexing, BM25 + BGE-M3, RRF fusion and Qwen3 reranking.\n- **Incremental Wiki**: Map-Reduce extraction and aggregation, chunk-level caching, source traceability and source retraction.\n- **Agent**: Qwen3.5-9B, MCP, ReAct / Plan-and-Execute, citation feedback, context compaction and controlled termination.\n- **Training and safety**: LoRA-based SFT / GRPO comparisons; Qwen3Guard and ShieldGemma with confidence-based human review.\n- Links: [StudyHub](${links.studyhub || "https://study-hub.cn"}) · [Source](${links.studyhubRepo || "https://github.com/ChengjinLii/studyhub"})`,
  },
  rag: {
    zh: `**StudyHub 的 RAG 怎么设计？**\n- **解析与切分**：PDF/OCR 解析、结构感知 Chunk 切分、Parent-Child 分层索引，让召回与回答上下文兼顾。\n- **召回与重排**：BM25 关键词检索 + BGE-M3 向量召回，采用 RRF 融合候选，再用 Qwen3-Reranker-0.6B 排序。\n- **实验**：固定 SciFact 子集上，相较 RRF 基线，Hit@5 从 **87.5% 到 96.9%**，MRR@5 从 **0.828 到 0.932**。\n这是检索子集对照，并非整个知识库问答的通用准确率。`,
    en: `**How does StudyHub RAG work?**\n- **Parsing and indexing**: PDF/OCR extraction, structure-aware chunks and parent-child indexes.\n- **Retrieval**: BM25 plus BGE-M3 vector search, RRF candidate fusion and Qwen3-Reranker-0.6B.\n- **Evaluation**: on a fixed SciFact subset, Hit@5 improved **87.5% → 96.9%** and MRR@5 **0.828 → 0.932** relative to RRF.\nThese are subset retrieval metrics, not end-to-end QA accuracy.`,
  },
  wiki: {
    zh: `**StudyHub 增量 Wiki 的核心**\n- **Map**：从资料 Chunk 抽取有原文依据的实体、概念与知识声明。\n- **Reduce**：按实体与概念聚合跨文档知识，为条目保留文档、Chunk、版本及原文引句等来源。\n- **增量更新**：复用未变 Chunk 的抽取结果；新增资料补充知识，删除资料时撤回对应来源，无来源支撑的条目不再保留。\n它是可追溯的知识页面聚合，不等同于已实现知识图谱或 GraphRAG。`,
    en: `**How the incremental Wiki works**\n- **Map**: extract source-grounded entities, concepts and claims from document chunks.\n- **Reduce**: aggregate claims across documents, retaining document, chunk, revision and quotation provenance.\n- **Updates**: reuse unchanged chunk extraction; append new sources and retract deleted ones, dropping claims that lose all support.\nIt is a source-traceable Wiki, not a graph database or a GraphRAG implementation.`,
  },
  harness: {
    zh: `**StudyHub Agent 的执行策略与 Harness**\n- **ReAct** 是核心循环：模型决定工具调用，读取结果，再继续执行。\n- **Plan-and-Execute** 是额外的先规划再执行模式；按任务复杂度自动路由是正在完善的设计方向，不能把它与已完成的 Harness 对照实验混为一谈。\n- **Harness**：工具调用与参数校验、引用反馈修复、结构化拒答、上下文压缩及受控收尾。\n- 对比基础 ReAct 的重点是执行可靠性和预算异常控制，不是证明 Plan-and-Execute 一定优于 ReAct。`,
    en: `**StudyHub Agent strategy and Harness**\n- **ReAct** is the core tool-use loop: choose actions, read observations and iterate.\n- **Plan-and-Execute** adds a brief plan-first mode. Automatic complexity-based routing is a design direction being completed; it has not been established as the source of Harness evaluation gains.\n- **Harness** adds tool/parameter checks, citation feedback and repair, structured refusals, context compaction and controlled termination.\nThe controlled comparison targets execution reliability, not proof that Plan-and-Execute outperforms ReAct.`,
  },
  training: {
    zh: `**StudyHub 的 Tool Calling 后训练**\n- 使用 **LoRA** 作为参数高效微调方式，分别开展 **SFT**（监督微调）与后续 **GRPO**（强化学习优化）对照。\n- 在固定 BFCL 小子集上，工具调用成功率由 **87.5% 提升至 93.8%**；观察到的增益来自 SFT 阶段，后续 GRPO 没有进一步提升该子集结果。\n- 这不是 BFCL 官方全量榜单成绩。`,
    en: `**Tool-calling post-training**\n- Applied **LoRA** as the parameter-efficient adaptation method for **SFT**, followed by comparative **GRPO** optimization.\n- On a fixed small BFCL subset, success increased from **87.5% to 93.8%** after SFT; GRPO did not add further gains on that subset.\n- This is not an official full BFCL leaderboard result.`,
  },
  moderation: {
    zh: `**多模态内容审核怎么做？**\n- **文本**：Qwen3Guard-Gen-0.6B；**图像与 OCR 图文**：结合 ShieldGemma 2-4B 的风险判断与图文分流。\n- 依据**候选类别概率与置信度**分流：高置信度自动通过/拒绝，低置信度和争议内容转人工复核。\n- 一组 XSTest 文本离线评测中，**65.6% 自动覆盖率**，自动处理样本未观察到错误；另一独立测试为 **46.9% 覆盖率**，且出现 1 次误拒。\n- 自动覆盖率反映无需人工的比例；AUROC 衡量排序，不等于自动覆盖率或审核准确率。`,
    en: `**How is multimodal moderation handled?**\n- **Text**: Qwen3Guard-Gen-0.6B; **images and OCR-assisted content**: ShieldGemma 2-4B and modality-specific routing.\n- Candidate-class probabilities and confidence thresholds route high-confidence cases to automatic approve/reject decisions; uncertain or controversial cases go to human review.\n- One offline XSTest text set showed **65.6% automatic coverage** with no observed auto-decision errors. A separate holdout showed **46.9% coverage** and one false rejection.\n- Coverage measures automation; AUROC measures ranking, not coverage or accuracy.`,
  },
  ddsurfer: {
    zh: `**DDSurfer 的技术要点**\n- **任务**：无需额外 T1w，直接从扩散磁共振成像（dMRI）重建白质表面及软脑膜表面。\n- **方法**：弱监督 Dual-Stream + Cross-SE，使用 Unidirectional Boundary Loss、几何正则与微分同胚形变缓解伪标签噪声和边界偏差。\n- **结果**：体积相似性 **0.944/0.923 → 0.985/0.980**；两类区域影像测量离散度降低 **25.5%/31.7%**，并在 4 个外部数据集（203 名受试者）验证。\n- **论文**：第一作者，**Advanced Science (2026)**，[DOI 10.1002/advs.76596](https://doi.org/10.1002/advs.76596)。`,
    en: `**DDSurfer technical overview**\n- **Task**: reconstruct white-matter and pial cortical surfaces from dMRI without an additional T1-weighted scan.\n- **Method**: weakly supervised Dual-Stream + Cross-SE, Unidirectional Boundary Loss, geometric regularization and diffeomorphic deformation.\n- **Results**: volumetric similarity **0.944/0.923 → 0.985/0.980**; regional measurement variability reduced by **25.5%/31.7%**, with four external datasets (203 subjects).\n- **Paper**: first-author work in **Advanced Science (2026)**, [DOI](https://doi.org/10.1002/advs.76596).`,
  },
  slicer: {
    zh: `**SlicerDDSurfer 做什么？**\n- 面向 dMRI 的开源 **3D Slicer 扩展**，集成 DDSeg、DDParcel、DDSurfer 和下游影像分析。\n- 统一 GUI/CLI 参数、模型资源与运行记录，支持自动加载数据和处理结果。\n- 采用阶段编排、依赖与输入检查、QC、缓存复用和结果溯源；已在 Linux 的 3D Slicer 5.10 环境验证真实数据工作流。\n- [查看源码](${links.slicerRepo || "https://github.com/ChengjinLii/SlicerDDSurfer"})`,
    en: `**What does SlicerDDSurfer provide?**\n- An open-source **3D Slicer extension** for dMRI, integrating DDSeg, DDParcel, DDSurfer and downstream image analysis.\n- Shared GUI/CLI options, model resources and execution records, plus automatic loading of inputs and outputs.\n- Staged workflows with dependency/input checks, QC, caching and provenance, tested with real data on 3D Slicer 5.10 for Linux.\n- [Source code](${links.slicerRepo || "https://github.com/ChengjinLii/SlicerDDSurfer"})`,
  },
  contact: {
    zh:
      `**联系方式**\n- 邮箱：\`${contact.email || "chengjinli@std.uestc.edu.cn"}\`\n- GitHub：\`${(links.github || "https://github.com/ChengjinLii").replace(/^https?:\/\//, "")}\`\n- 项目网站：\`${(links.studyhub || "https://study-hub.cn").replace(/^https?:\/\//, "")}\`\n- 地址：${contact.addressZh || "四川省成都市高新区（西区）西源大道2006号，电子科技大学清水河校区，邮编 611731"}`,
    en:
      `**Contact**\n- Email: \`${contact.email || "chengjinli@std.uestc.edu.cn"}\`\n- GitHub: \`${(links.github || "https://github.com/ChengjinLii").replace(/^https?:\/\//, "")}\`\n- Project site: \`${(links.studyhub || "https://study-hub.cn").replace(/^https?:\/\//, "")}\`\n- Address: ${contact.addressEn || "UESTC Qingshuihe Campus, No. 2006 Xiyuan Ave, West Hi-Tech Zone, Chengdu, Sichuan 611731, China"}`,
  },
  awards: {
    zh:
      `**主要奖项**\n${(awardListZh.length ? awardListZh : ["2026 年中国研究生电子设计竞赛人工智能赛道西南赛区 **一等奖**。"]).map((item) => `- ${item}`).join("\n")}`,
    en:
      `**Selected honors**\n${(awardListEn.length ? awardListEn : ["2026 **First Prize** in the AI Track, Southwest Regional Contest, China Graduate Electronics Design Contest."]).map((item) => `- ${item}`).join("\n")}`,
  },
  agent: {
    zh: `**dMRI-Agent：Protocol 驱动的医学影像 Agent**\n- **角色**：参与 Planner–Executor 架构、外部分析软件集成和实验验证。\n- **Protocol**：把专家流程整理为输入输出、工具依赖、阶段 QC 与异常处置明确的可加载规范。\n- **工程**：面向 3D Slicer 的受控工具调用、模块发现、参数/权限校验、异常恢复和 JSONL 轨迹。\n- **验证**：在 5 类图像分析工作流中完成基准任务与人工参考结果复现；相关论文在投。`,
    en: `**dMRI-Agent: Protocol-driven medical imaging**\n- **Role**: contributed to the Planner–Executor architecture, external tool integration and evaluation.\n- **Protocols**: encode expert procedures with inputs/outputs, dependencies, stage QC and error handling.\n- **Engineering**: controlled 3D Slicer tool calls, module discovery, parameter/permission validation, recovery and JSONL traces.\n- **Evaluation**: completed benchmark workflows in five medical imaging task categories, with reference outputs reproduced; manuscript submitted.`,
  },
  skills: {
    zh: `**技术能力**\n- **AI Coding**：Codex、Claude Code、Antigravity、Hermes、Muse。\n- **模型开发**：PyTorch、Hugging Face Transformers、vLLM；涉及模型微调、Tool Calling 与推理部署。\n- **应用与工程**：Python、TypeScript、Next.js、FastAPI、MySQL、Redis、Docker、Linux、Git。\n- **医学影像**：3D Slicer、SimpleITK、dMRI 预处理、分割与三维表面重建。`,
    en: `**Technical skills**\n- **AI coding**: Codex, Claude Code, Antigravity, Hermes, Muse.\n- **Model work**: PyTorch, Hugging Face Transformers and vLLM; fine-tuning, tool calling and inference serving.\n- **Applications and engineering**: Python, TypeScript, Next.js, FastAPI, MySQL, Redis, Docker, Linux and Git.\n- **Medical imaging**: 3D Slicer, SimpleITK, dMRI preprocessing, segmentation and 3D surface reconstruction.`,
  },
  cv: {
    zh: `**简历下载**\n可下载本站提供的中英文 PDF；最新项目细节亦可在 [GitHub 简历源码](https://github.com/ChengjinLii/Chengjin-CV) 查看。\n[中文简历](${links.chineseCv || "./assets/李承锦-CV-中文.pdf"})\n[English CV](${links.englishCv || "./assets/Chengjin-Li-CV-English.pdf"})`,
    en: `**Download the CV**\nThe site hosts Chinese and English PDF editions. The [CV source repository](https://github.com/ChengjinLii/Chengjin-CV) also contains the latest project wording.\n[Chinese CV](${links.chineseCv || "./assets/李承锦-CV-中文.pdf"})\n[English CV](${links.englishCv || "./assets/Chengjin-Li-CV-English.pdf"})`,
  },
  default: {
    zh: `可以问我关于 **StudyHub、RAG 检索、增量 Wiki、Agent Harness、后训练、内容审核、DDSurfer、dMRI-Agent、SlicerDDSurfer、技术能力、论文和简历** 的问题；也可以点击预设问题。`,
    en: `Ask me about **StudyHub, RAG, the incremental Wiki, Agent Harness, post-training, moderation, DDSurfer, dMRI-Agent, SlicerDDSurfer, skills, research or the CV**. You can also choose a preset question.`,
  },
};

function openBot() {
  const wasOpen = bot?.classList.contains("open");
  bot?.classList.add("open");
  document.body.classList.add("bot-open");
  botPanel.hidden = false;
  botLauncher.setAttribute("aria-expanded", "true");
  positionBotPanel();
  if (!wasOpen && botMobileViewport.matches) botClose?.focus({ preventScroll: true });
}

function closeBot() {
  bot?.classList.remove("open");
  document.body.classList.remove("bot-open");
  botPanel.hidden = true;
  botPanel.removeAttribute("aria-modal");
  if (botBackdrop) botBackdrop.hidden = true;
  botLauncher.setAttribute("aria-expanded", "false");
  botLauncher?.focus({ preventScroll: true });
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
  return `<a class="portfolio-bot__link-button" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
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
  if (typeof content === "object") {
    for (const language of ["zh", "en"]) {
      article.dataset[language] = role === "bot"
        ? renderBotMarkdown(content[language])
        : `<p>${escapeHtml(content[language])}</p>`;
    }
    article.innerHTML = article.dataset[activeLanguage];
  } else if (role === "bot") {
    article.innerHTML = renderBotMarkdown(content);
  } else {
    const paragraph = document.createElement("p");
    paragraph.textContent = content;
    article.appendChild(paragraph);
  }
  botMessages.appendChild(article);
  positionBotPanel();
  botMessages.scrollTop = botMessages.scrollHeight;
}

function pickAnswer(raw) {
  const text = raw.toLowerCase().trim();
  if (/你是谁|你叫什么|你的名字|介绍(?:一下)?你自己|who\s+(?:are|r)\s+(?:you|u)|what(?:'s|\s+is)\s+your\s+name/.test(text)) return botAnswers.identity;
  if (/你(?:能|可以).*(?:做|帮|回答)|你会(?:什么|些什么)|你有什么(?:功能|能力)|怎么(?:用|提问)|what\s+can\s+you\s+do|how\s+(?:do|can)\s+i\s+(?:use|ask)|^help[!?.\s]*$/.test(text)) return botAnswers.default;
  if (/简历|求职|resume|\bcv\b|下载简历/.test(text)) return botAnswers.cv;
  if (/dmri[-\s]?agent|mri_agent|医学影像智能体|医学影像agent/.test(text)) return botAnswers.agent;
  if (/slicerddsurfer|slicer[\s-]*ddsurfer|3d\s*slicer\s*插件|slicer扩展/.test(text)) return botAnswers.slicer;
  if (/ddsurfer|皮层|脑表面|cortical|surface reconstruction|弱监督三维/.test(text)) return botAnswers.ddsurfer;
  if (/guard|审核|安全策略|moderation|shieldgemma|\bocr\b|置信度|人工复核|xstest|拒判/.test(text)) return botAnswers.moderation;
  if (/\bwiki\b|map[-\s]?reduce|增量知识|知识聚合|来源追溯|chunk\s*缓存|失效知识/.test(text)) return botAnswers.wiki;
  if (/\brag\b|rerank|重排|bm25|bge[-\s]?m3|parent[-\s]?child|知识检索|向量召回|rrf|scifact/.test(text)) return botAnswers.rag;
  if (/lora|\bsft\b|grpo|bfcl|tool[-\s]?calling|后训练|强化学习|微调/.test(text)) return botAnswers.training;
  if (/react|plan[-\s]?(?:and[-\s]?)?execute|harness|引用修复|执行策略|复杂度路由|动态路由|上下文压缩|受控收尾/.test(text)) return botAnswers.harness;
  if (/studyhub|用户|下载|平台|\bmcp\b|推荐|校园/.test(text)) return botAnswers.studyhub;
  if (/agent|智能体|workflow|工作流|任务规划/.test(text)) return botAnswers.harness;
  if (/skill|stack|技术|能力|python|typescript|pytorch|fastapi|next|vllm|transformers/.test(text)) return botAnswers.skills;
  if (/paper|论文|advanced|ismrm|ohbm|nature|期刊|会议|在投/.test(text)) return botAnswers.research;
  if (/award|honor|academic star|奖|奖学金|毕设|竞赛|华为杯|学术之星|荣耀/.test(text)) return botAnswers.awards;
  if (/contact|email|github|联系|邮箱|网站/.test(text)) return botAnswers.contact;
  if (/project|项目|dmri/.test(text)) return botAnswers.projects;
  if (/^(你好(?:呀|啊)?|您好|嗨|哈[喽啰]|早上好|下午好|晚上好|hi|hello|hey)(?:[！!。，,.?？\s]|$)/.test(text)) return botAnswers.greeting;
  if (/谢谢|感谢|多谢|thanks|thank\s*you|thx/.test(text)) return botAnswers.thanks;
  if (/再见|拜拜|goodbye|bye|see\s+you/.test(text)) return botAnswers.goodbye;
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
botBackdrop?.addEventListener("click", closeBot);

document.addEventListener("keydown", (event) => {
  if (!bot?.classList.contains("open")) return;
  if (event.key === "Escape") {
    closeBot();
    return;
  }
  if (event.key !== "Tab" || !botMobileViewport.matches) return;
  const controls = [...botPanel.querySelectorAll("button, input, a[href]")]
    .filter((control) => !control.disabled && control.getClientRects().length);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) return;
  const outside = !botPanel.contains(document.activeElement);
  if (outside || (event.shiftKey && document.activeElement === first)
    || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
});

botStarters.forEach((button) => {
  button.addEventListener("click", () => {
    const question = { zh: button.dataset.zh, en: button.dataset.en };
    const answer = botAnswers[button.dataset.question] || botAnswers.default;
    openBot();
    addBotMessage("user", question);
    window.setTimeout(() => addBotMessage("bot", answer), 160);
  });
});

botForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = botInput.value.trim();
  if (!value) return;
  botInput.value = "";
  addBotMessage("user", value);
  const answer = pickAnswer(value);
  window.setTimeout(() => addBotMessage("bot", answer), 180);
});

languageListeners.push(() => {
  positionBotPanel();
  if (botMessages) botMessages.scrollTop = botMessages.scrollHeight;
});

const today = new Date();
const month = today.getMonth() + 1;
const day = today.getDate();
bot?.classList.toggle("hat-santa", (month === 12 && day >= 15) || (month === 1 && day <= 5));
