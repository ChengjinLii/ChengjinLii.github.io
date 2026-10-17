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
    zh:
      `**代表项目**\n- **StudyHub**：全栈知识共享与 AI 学习平台，累计 **${studyhubMetric("users", "zh")} 名用户**、**${studyhubMetric("downloads", "zh")} 次下载**，覆盖 RAG、增量 Wiki、MCP 与 Agent。\n- **DDSurfer**：弱监督双流 dMRI 皮层重建工作，已发表于 **${researchData.journal?.venue || "Advanced Science"}**。\n- **dMRI-Agent**：参与设计 Planner–Executor 与 Protocol 驱动的医学影像任务编排，相关论文**在投**。\n- **SlicerDDSurfer**：基于 Python / Qt 的 3D Slicer 多算法集成平台，protocol 正在投 **${submissions[1]?.venue || "Nature Protocols"}**。`,
    en:
      `**Representative projects**\n- **StudyHub**: a full-stack knowledge and AI learning platform with **${studyhubMetric("users", "en")} users** and **${studyhubMetric("downloads", "en")} downloads**, combining RAG, incremental Wiki, MCP, and agents.\n- **DDSurfer**: weakly supervised dual-stream cortical reconstruction from dMRI, published in **${researchData.journal?.venue || "Advanced Science"}**.\n- **dMRI-Agent**: contributed to Planner-Executor and Protocol-based medical imaging orchestration; the manuscript is **submitted**.\n- **SlicerDDSurfer**: a Python / Qt platform integrating multiple algorithms in 3D Slicer, submitted to **${submissions[1]?.venue || "Nature Protocols"}**.`,
  },
  research: {
    zh:
      `**科研进展概览**\n- **${researchData.journal?.venue || "Advanced Science"} ${researchData.journal?.year || "2026"}**：${researchData.journal?.zh || "DDSurfer 论文已发表，期刊为 **中科院一区 Top**，影响因子 **14.1**。"}\n- **${researchData.conferences?.[0]?.venue || "ISMRM 2025"}**：${researchData.conferences?.[0]?.zh || "研究工作接收为 **Oral presentation**。"}\n- **${researchData.conferences?.[1]?.venue || "OHBM 2025"}**：${researchData.conferences?.[1]?.zh || "研究工作接收为 **Poster presentation**。"}\n- **在投工作**：${submissionTextZh || "dMRI-Agent：**在投**；SlicerDDSurfer 投 **Nature Protocols**"}。`,
    en:
      `**Research snapshot**\n- **${researchData.journal?.venue || "Advanced Science"} ${researchData.journal?.year || "2026"}**: ${researchData.journal?.en || "DDSurfer is published in a **CAS Zone 1 Top journal** with Impact Factor **14.1**."}\n- **${researchData.conferences?.[0]?.venue || "ISMRM 2025"}**: ${researchData.conferences?.[0]?.en || "Accepted as an **Oral presentation**."}\n- **${researchData.conferences?.[1]?.venue || "OHBM 2025"}**: ${researchData.conferences?.[1]?.en || "Accepted as a **Poster presentation**."}\n- **Submitted manuscripts**: ${submissionTextEn || "dMRI-Agent: **Submitted**; SlicerDDSurfer to **Nature Protocols**"}.`,
  },
  studyhub: {
    zh:
      `**StudyHub：真实运营的 AI 学习平台**\n- 负责全栈架构、开发、持续运营、社群与用户反馈，累计 **${studyhubMetric("users", "zh")} 名用户**、**${studyhubMetric("downloads", "zh")} 次下载**。\n- **RAG / Wiki**：结构感知切分、Parent-Child 索引、BM25 + 向量召回 + RRF + Rerank，以及增量 Wiki 与可追溯引用。\n- **Agent / 后训练**：Qwen3.5-9B、MCP、ReAct / Plan-and-Execute、vLLM，并开展 LoRA / SFT 与 GRPO 实验。\n- **安全审核**：Qwen3Guard-Gen-0.6B 与 ShieldGemma 2-4B 双路审核，结合 Guard-as-Jev 概率评分与人工复核。\n- 项目网站：\`${(links.studyhub || "https://study-hub.cn").replace(/^https?:\/\//, "")}\``,
    en:
      `**StudyHub: an operated AI learning platform**\n- Led full-stack development, deployment, operations, and user feedback; reached **${studyhubMetric("users", "en")} users** and **${studyhubMetric("downloads", "en")} downloads**.\n- **RAG / Wiki**: structure-aware chunking, parent-child indexing, BM25 + vector retrieval + RRF + reranking, and an incremental Wiki with traceable citations.\n- **Agents / post-training**: Qwen3.5-9B, MCP, ReAct / Plan-and-Execute, vLLM, and LoRA / SFT / GRPO experiments.\n- **Safety**: text/image moderation with Qwen3Guard-Gen-0.6B and ShieldGemma 2-4B, Guard-as-Jev probability scoring, and human review.\n- Project site: \`${(links.studyhub || "https://study-hub.cn").replace(/^https?:\/\//, "")}\``,
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
    zh:
      "**dMRI-Agent**\n- 角色：参与设计医学影像 **Planner–Executor** 分层架构。\n- 协议：通过 **Protocol** 封装领域知识、工具依赖、步骤和 QC 规则，支持多阶段规划与人在环控制。\n- 工程：基于 **LangChain / FastAPI** 实现工具调用、3D Slicer 模块发现、权限校验、异常恢复、上下文压缩与 JSONL 轨迹追踪。\n- 状态：相关论文**在投**。",
    en:
      "**dMRI-Agent**\n- Role: contributed to a **Planner-Executor** architecture for medical imaging.\n- Protocols: package domain knowledge, tool dependencies, steps, and QC rules for multi-stage planning and human-in-the-loop control.\n- Engineering: **LangChain / FastAPI** tool calling, 3D Slicer module discovery, permission checks, recovery, context compression, and JSONL traces.\n- Status: a related manuscript has been **submitted**.",
  },
  skills: {
    zh:
      "**技术能力**\n- 语言：`Python` / `TypeScript`\n- 医学影像与深度学习：`PyTorch` / `3D Slicer` / `SimpleITK` / `nibabel`\n- 全栈与后端：`FastAPI` / `Next.js` / `MySQL` / `Redis` / `OSS`\n- 工程工具：`Docker` / `Git`",
    en:
      "**Technical stack**\n- Languages: `Python` / `TypeScript`\n- Medical imaging and deep learning: `PyTorch` / `3D Slicer` / `SimpleITK` / `nibabel`\n- Full-stack and backend: `FastAPI` / `Next.js` / `MySQL` / `Redis` / `OSS`\n- Engineering tools: `Docker` / `Git`",
  },
  cv: {
    zh:
      `**简历入口**\n中文简历已更新为 Chengjin-CV 仓库版本；英文 PDF 暂保留原版。\n[中文简历](${links.chineseCv || "./assets/李承锦-CV-中文.pdf?v=bdda306-20261017"})\n[English CV](${links.englishCv || "./assets/Chengjin-Li-CV-English.pdf"})`,
    en:
      `**CV links**\nThe Chinese CV now follows the Chengjin-CV repository; the English PDF remains the previous edition.\n[Chinese CV](${links.chineseCv || "./assets/李承锦-CV-中文.pdf?v=bdda306-20261017"})\n[English CV](${links.englishCv || "./assets/Chengjin-Li-CV-English.pdf"})`,
  },
  default: {
    zh:
      "我可以回答关于 **项目、论文、奖项、StudyHub、技术栈、联系方式和简历** 的问题。也可以直接点击上方预设问题。",
    en:
      "I can answer questions about **projects, papers, awards, StudyHub, technical skills, contact information, and CV**. You can also click one of the preset questions above.",
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
  if (/cv|resume|简历|pdf/.test(text)) return botAnswers.cv;
  if (/studyhub|用户|下载|平台|mcp|搜索|推荐/.test(text)) return botAnswers.studyhub;
  if (/agent|智能体|dmri-agent|dmri agent|workflow|工作流/.test(text)) return botAnswers.agent;
  if (/skill|stack|技术|能力|python|typescript|pytorch|fastapi|next/.test(text)) return botAnswers.skills;
  if (/paper|论文|advanced|ismrm|ohbm|nature|期刊|会议|在投/.test(text)) return botAnswers.research;
  if (/award|honor|academic star|奖|奖学金|毕设|竞赛|华为杯|学术之星|荣耀/.test(text)) return botAnswers.awards;
  if (/contact|email|github|联系|邮箱|网站/.test(text)) return botAnswers.contact;
  if (/project|项目|ddsurfer|slicer|dmri/.test(text)) return botAnswers.projects;
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
