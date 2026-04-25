const i18n = {
  userLang: navigator.language.startsWith("ko") ? "ko" : "en",
  langData: {},

  async init() {
    try {
      const res = await fetch(`assets/lang/${this.userLang}.json`);
      this.langData = await res.json();
    } catch (e) {
      console.error("Failed to load language data", e);
      // Fallback to English if Korean fails, or vice versa
      const fallback = this.userLang === "ko" ? "en" : "ko";
      const res = await fetch(`assets/lang/${fallback}.json`);
      this.langData = await res.json();
    }
    this.apply();
  },

  apply() {
    const T = this.langData;
    if (!T) return;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.innerHTML = T[el.dataset.i18n];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = T[el.dataset.i18nPh];
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = T[el.dataset.i18nTitle];
    });

    const dayMapping = [1, 2, 3, 4, 5, 6, 0];
    document.querySelectorAll(".day-check span").forEach((span, i) => {
      if (T.days) span.innerText = T.days[dayMapping[i]];
    });
  },

  get(key) {
    return this.langData[key] || key;
  }
};

window.i18n = i18n;
