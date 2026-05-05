const quote = {
  init() {
    this.fetch();
  },
  async fetch() {
    const container = document.querySelector(".quote-container");
    const qt = document.getElementById("quote-text"),
      qa = document.getElementById("quote-author");
    const isFirstLoad = !qt || qt.innerText === "..." || qt.innerText === "";
    if (container && !isFirstLoad) container.classList.add("quote-switching");
    const fetchAction = async () => {
      try {
        const res = await fetch(
            i18n.userLang === "ko"
              ? "https://korean-advice-open-api.vercel.app/api/advice"
              : "https://api.quotable.io/random",
          ),
          d = await res.json(),
          text = i18n.userLang === "ko" ? d.message : d.content,
          author =
            d.author || (i18n.userLang === "ko" ? "지혜의 기록" : "Unknown");
        if (text) {
          const section = document.getElementById("quote-section");
          const oldHeight = section && !isFirstLoad ? section.offsetHeight : 0;
          if (qt) qt.innerText = `"${text}"`;
          if (qa) qa.innerText = `- ${author}`;
          if (window.settings) {
            const size = localStorage.getItem("dj_quote_font_size") || "medium";
            settings.setQuoteFontSize(size);
          }
          if (section && oldHeight > 0) {
            const newHeight = section.offsetHeight;
            if (oldHeight !== newHeight) {
              section.style.height = oldHeight + "px";
              section.style.overflow = "hidden";
              section.offsetHeight; // force reflow
              section.style.height = newHeight + "px";
              setTimeout(() => {
                section.style.height = "";
                section.style.overflow = "";
              }, 500);
            }
          }
        } else {
          throw new Error();
        }
      } catch (e) {
        if (qt) qt.innerText = i18n.get("quoteDefault");
        if (qa) qa.innerText = i18n.get("quoteAuthorDefault");
      } finally {
        if (container) container.classList.remove("quote-switching");
        if (window.shortcutMod) shortcutMod.checkLayout();
      }
    };
    if (isFirstLoad) {
      await fetchAction();
    } else {
      setTimeout(fetchAction, 400);
    }
  },
};
window.quote = quote;
window.fetchQuote = quote.fetch.bind(quote);
