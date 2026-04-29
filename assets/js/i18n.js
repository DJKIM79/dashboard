const i18n = {
  userLang: localStorage.getItem("dj_user_lang") || (navigator.language.startsWith("ko") ? "ko" : "en"),
  langData: {},

  async init() {
    try {
      const langToLoad = this.userLang === "auto" ? (navigator.language.startsWith("ko") ? "ko" : "en") : this.userLang;
      const res = await fetch(`assets/lang/${langToLoad}.json`);
      this.langData = await res.json();
    } catch (e) {
      console.error("Failed to load language data", e);
      // Fallback
      const fallback = navigator.language.startsWith("ko") ? "ko" : "en";
      const res = await fetch(`assets/lang/${fallback}.json`);
      this.langData = await res.json();
    }
    this.apply();
  },

  apply() {
    const T = this.langData;
    if (!T) return;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (T[key]) el.innerHTML = T[key];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const key = el.dataset.i18nPh;
      if (T[key]) el.placeholder = T[key];
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.dataset.i18nTitle;
      if (T[key]) el.title = T[key];
    });
    document.querySelectorAll("[data-i18n-value]").forEach((el) => {
      const key = el.dataset.i18nValue;
      if (T[key]) el.value = T[key];
    });

    const dayMapping = [1, 2, 3, 4, 5, 6, 0];
    document.querySelectorAll('input[name="repeatDay"] + span').forEach((span, i) => {
      if (T.days && dayMapping[i] !== undefined) span.innerText = T.days[dayMapping[i]];
    });

    const weekMapping = [0, 1, 2, 3, 4, 5]; // 1주~5주, 말일
    document.querySelectorAll('input[name="weekSpecific"] + span').forEach((span, i) => {
      if (T.weeks && weekMapping[i] !== undefined) span.innerText = T.weeks[weekMapping[i]];
    });
  },

  get(key) {
    return this.langData[key] || key;
  },

  setLanguage(lang) {
    localStorage.setItem("dj_user_lang", lang);
    const modal = document.getElementById("settingModal");
    if (modal && modal.classList.contains("show")) {
      modal.classList.remove("show");
      setTimeout(() => {
        location.reload();
      }, 300);
    } else {
      location.reload();
    }
  }
};

window.i18n = i18n;
