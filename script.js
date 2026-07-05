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

languageButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.lang));
});

year.textContent = new Date().getFullYear();
applyLanguage(localStorage.getItem(languageStorageKey) || "zh");

const bot = document.querySelector(".floating-sidebar");
const botLauncher = document.querySelector(".floating-sidebar__bubble");
const botPanel = document.querySelector(".floating-sidebar__panel");
const botClose = document.querySelector(".floating-sidebar__close");
const botMessages = document.querySelector(".portfolio-bot__messages");
const botForm = document.querySelector(".portfolio-bot__form");
const botInput = document.querySelector(".portfolio-bot__input");
const botStarters = document.querySelectorAll(".portfolio-bot__starters button");

window.addEventListener("pointermove", (event) => {
  if (!botLauncher) return;
  const rect = botLauncher.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const maxOffset = 6;
  botLauncher.style.setProperty("--eye-x", `${(dx / distance) * maxOffset}px`);
  botLauncher.style.setProperty("--eye-y", `${(dy / distance) * maxOffset}px`);
});

const botAnswers = {
  projects: {
    zh:
      "代表项目包括 StudyHub、DDSurfer、dMRI-Agent 和 SlicerDDSurfer。StudyHub 是真实运营的校园知识共享平台，已有 345 名用户和 1,628 次下载；DDSurfer 已被 Advanced Science 录用；dMRI-Agent 和 SlicerDDSurfer 分别对应智能体工作流和 3D Slicer 扩展。",
    en:
      "Representative projects include StudyHub, DDSurfer, dMRI-Agent, and SlicerDDSurfer. StudyHub is an operated campus knowledge-sharing platform with 345 users and 1,628 downloads; DDSurfer has been accepted by Advanced Science; dMRI-Agent and SlicerDDSurfer focus on agentic workflows and a 3D Slicer extension.",
  },
  research: {
    zh:
      "目前包括 1 篇期刊论文、2 篇会议展示和 2 篇在投论文：DDSurfer 已被 Advanced Science 录用；研究工作被 ISMRM 2025 接收为 Oral Presentation，被 OHBM 2025 接收为 Poster Presentation；dMRI-Agent 正在投 Nature Communications，SlicerDDSurfer 正在投 Nature Protocols。",
    en:
      "The portfolio includes 1 journal paper, 2 conference presentations, and 2 submitted manuscripts: DDSurfer has been accepted by Advanced Science; work has been accepted by ISMRM 2025 as an Oral Presentation and by OHBM 2025 as a Poster Presentation; dMRI-Agent is submitted to Nature Communications, and SlicerDDSurfer is submitted to Nature Protocols.",
  },
  studyhub: {
    zh:
      "StudyHub 的亮点是把真实校园资料共享、求购协作和集市场景，与 AI 搜索、推荐、审核、只读安全 MCP 工具接口和学习 Agent 底座结合起来。它不是纯 demo，而是有真实用户和下载数据的平台。",
    en:
      "StudyHub combines real campus material sharing, requests, and marketplace scenarios with AI search, recommendation, moderation, a read-only secure MCP tool interface, and a learning-agent foundation. It is not only a demo; it has real users and download data.",
  },
  contact: {
    zh:
      "可以通过邮箱 chengjinli@std.uestc.edu.cn 联系，也可以访问 GitHub：github.com/ChengjinLii。StudyHub 项目网站是 study-hub.cn。",
    en:
      "You can contact him via chengjinli@std.uestc.edu.cn or visit GitHub: github.com/ChengjinLii. The StudyHub project site is study-hub.cn.",
  },
  awards: {
    zh:
      "主要奖项包括研电赛人工智能赛道西南赛区一等奖、华为杯数模国家三等奖、中国国际大学生创新大赛校赛金奖/省赛银奖、连续四学年优秀学生奖学金、本科毕业创新奖和优秀毕设。",
    en:
      "Key honors include First Prize in the AI Track of the China Graduate Electronics Design Contest Southwest Regional Contest, National Third Prize in Huawei Cup CUMCM, Gold/Silver awards in the China International College Students' Innovation Competition, four consecutive Outstanding Student Scholarships, Undergraduate Innovation Award, and Outstanding Undergraduate Thesis.",
  },
  default: {
    zh:
      "我可以回答关于李承锦的项目、论文、奖项、StudyHub、联系方式和简历的问题。你也可以直接点上面的预设问题。",
    en:
      "I can answer questions about Chengjin's projects, papers, awards, StudyHub, contact information, and CV. You can also click one of the preset questions above.",
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

function addBotMessage(role, content) {
  const article = document.createElement("article");
  article.className = `portfolio-bot__message portfolio-bot__message--${role}`;
  const paragraph = document.createElement("p");
  paragraph.textContent = content;
  article.appendChild(paragraph);
  botMessages.appendChild(article);
  botMessages.scrollTop = botMessages.scrollHeight;
}

function pickAnswer(raw) {
  const text = raw.toLowerCase();
  if (/studyhub|用户|下载|平台|mcp|agent|搜索|推荐/.test(text)) return botAnswers.studyhub;
  if (/paper|论文|advanced|ismrm|ohbm|nature|期刊|会议|在投/.test(text)) return botAnswers.research;
  if (/award|honor|奖|奖学金|毕设|竞赛|华为杯/.test(text)) return botAnswers.awards;
  if (/contact|email|github|联系|邮箱|网站/.test(text)) return botAnswers.contact;
  if (/project|项目|ddsurfer|slicer|dmri/.test(text)) return botAnswers.projects;
  return botAnswers.default;
}

botLauncher?.addEventListener("click", () => {
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
