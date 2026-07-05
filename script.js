const languageButtons = document.querySelectorAll(".lang-btn");
const translatable = document.querySelectorAll("[data-en][data-zh]");
const year = document.querySelector("#year");

function applyLanguage(language) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  translatable.forEach((node) => {
    node.textContent = node.dataset[language];
  });
  languageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === language);
  });
  localStorage.setItem("site-language", language);
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.lang));
});

year.textContent = new Date().getFullYear();
applyLanguage(localStorage.getItem("site-language") || "en");
