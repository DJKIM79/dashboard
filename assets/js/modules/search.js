const search = {
  currentEngine: localStorage.getItem("dj_search_engine") || "google",

  init() {
    this.updateIcon();
  },

  updateIcon() {
    const engine = this.currentEngine;
    const iconEl = document.getElementById("search-engine-current");
    if (!iconEl) return;
    
    const domains = {
      google: "google.com",
      naver: "naver.com",
      chatgpt: "openai.com",
    };

    if (engine === "custom") {
      const customUrl = localStorage.getItem("dj_custom_search_url") || "";
      try {
        const domain = new URL(customUrl).hostname;
        iconEl.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=64&domain=${domain}" alt="custom">`;
      } catch (e) {
        iconEl.innerHTML = `<i class="fas fa-link"></i>`;
      }
    } else {
      iconEl.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=64&domain=${domains[engine]}" alt="${engine}">`;
    }
  },

  renderMenu() {
    const menu = document.getElementById("search-engine-menu");
    if (!menu) return;
    menu.innerHTML = "";
    
    const engines = [
      { id: "google", domain: "google.com" },
      { id: "naver", domain: "naver.com" },
      { id: "chatgpt", domain: "openai.com" }
    ];

    engines.forEach(engine => {
      if (engine.id === this.currentEngine) return;
      
      const div = document.createElement("div");
      div.className = "engine-option";
      div.onclick = (e) => this.quickSelect(engine.id, e);
      div.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=64&domain=${engine.domain}" alt="${engine.id}">`;
      menu.appendChild(div);
    });
  },

  toggleMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("search-engine-menu");
    if (!menu) return;
    
    if (!menu.classList.contains("active")) {
      this.renderMenu();
    }
    menu.classList.toggle("active");
  },

  quickSelect(engine, e) {
    if (e) e.stopPropagation();
    this.currentEngine = engine;
    this.updateIcon();
    const menu = document.getElementById("search-engine-menu");
    if (menu) menu.classList.remove("active");
  },

  perform() {
    const input = document.getElementById("searchInput");
    const query = input.value.trim();
    if (!query) return;

    const engine = this.currentEngine;
    let url = "";

    switch (engine) {
      case "google":
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        break;
      case "naver":
        url = `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
        break;
      case "chatgpt":
        url = `https://chatgpt.com/?q=${encodeURIComponent(query)}`;
        break;
      case "custom":
        const customBase = localStorage.getItem("dj_custom_search_url");
        if (customBase) {
          url = customBase + encodeURIComponent(query);
        } else {
          url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
        break;
      default:
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }

    // Reset to saved engine after search (one-time use logic)
    this.currentEngine = localStorage.getItem("dj_search_engine") || "google";
    this.updateIcon();
    input.value = "";

    const openInNewTab = localStorage.getItem("dj_search_new_tab") === "true";
    if (openInNewTab) {
      window.open(url, "_blank");
    } else {
      window.location.href = url;
    }
  }
};

window.search = search;
window.currentSearchEngine = search.currentEngine; // Keep in sync for other modules
window.toggleSearchEngineMenu = (e) => search.toggleMenu(e);
window.quickSelectEngine = (engine, e) => search.quickSelect(engine, e);
window.updateSearchEngineIcon = () => search.updateIcon();
window.performSearch = () => search.perform();
