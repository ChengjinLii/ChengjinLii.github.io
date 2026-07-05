const languageButtons = document.querySelectorAll(".lang-btn");
const translatable = document.querySelectorAll("[data-en][data-zh]");
const year = document.querySelector("#year");
const languageStorageKey = "site-language-v2";

function applyLanguage(language) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  translatable.forEach((node) => {
    node.innerHTML = node.dataset[language];
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
