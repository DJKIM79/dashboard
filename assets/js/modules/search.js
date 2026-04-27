const search = {
  currentEngine: localStorage.getItem("dj_search_engine") || "google",

  init() {
    this.currentEngine = localStorage.getItem("dj_search_engine") || "google";
    this.updateIcon();
    const input = document.getElementById("searchInput");
    if (input) {
      setTimeout(() => input.focus(), 100);
    }
  },

  getAllEngines() {
    const defaultEngines = [
      { id: "google", name: "Google", domain: "google.com", isDefault: true },
      { id: "naver", name: "Naver", domain: "naver.com", isDefault: true }
    ];
    const customEngines = JSON.parse(localStorage.getItem("dj_search_engines_custom") || "[]");
    return [...defaultEngines, ...customEngines];
  },

  updateIcon() {
    const engineId = this.currentEngine;
    const iconEl = document.getElementById("search-engine-current");
    if (!iconEl) return;

    const allEngines = this.getAllEngines();
    const engine = allEngines.find(e => e.id === engineId) || allEngines[0];

    let faviconUrl = "";
    if (engine.isDefault) {
      faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${engine.domain}`;
    } else {
      try {
        const domain = new URL(engine.url).hostname;
        faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
      } catch (e) { faviconUrl = ""; }
    }

    if (faviconUrl) {
      iconEl.innerHTML = `<img src="${faviconUrl}" alt="${engine.name}">`;
    } else {
      iconEl.innerHTML = `<i class="fas fa-search"></i>`;
    }
  },

  renderMenu() {
    const menu = document.getElementById("search-engine-menu");
    if (!menu) return;
    menu.innerHTML = "";

    const allEngines = this.getAllEngines();

    allEngines.forEach((engine) => {
      if (engine.id === this.currentEngine) return;

      const div = document.createElement("div");
      div.className = "engine-option";
      div.onclick = (e) => this.quickSelect(engine.id, e);
      
      let faviconUrl = "";
      if (engine.isDefault) {
        faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${engine.domain}`;
      } else {
        try {
          const domain = new URL(engine.url).hostname;
          faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
        } catch (e) { faviconUrl = ""; }
      }

      if (faviconUrl) {
        div.innerHTML = `<img src="${faviconUrl}" alt="${engine.name}">`;
      } else {
        div.innerHTML = `<i class="fas fa-search" style="font-size: 0.8rem; color: #94a3b8;"></i>`;
      }
      menu.appendChild(div);
    });
  },

  toggleMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("search-engine-menu");
    if (!menu) return;

    if (!menu.classList.contains("active")) {
      this.renderMenu();
      document
        .querySelectorAll(".fab-menu")
        .forEach((m) => m.classList.remove("active"));
    }
    menu.classList.toggle("active");
  },

  quickSelect(engineId, e) {
    if (e) e.stopPropagation();
    this.currentEngine = engineId;
    this.updateIcon();
    const menu = document.getElementById("search-engine-menu");
    if (menu) menu.classList.remove("active");

    const input = document.getElementById("searchInput");
    if (input) input.focus();
  },

  perform() {
    const input = document.getElementById("searchInput");
    const query = input.value.trim();
    if (!query) return;

    const allEngines = this.getAllEngines();
    const engine = allEngines.find(e => e.id === this.currentEngine) || allEngines[0];
    
    let url = "";
    if (engine.isDefault) {
      const q = encodeURIComponent(query);
      if (engine.id === "google") url = `https://www.google.com/search?q=${q}`;
      else if (engine.id === "naver") url = `https://search.naver.com/search.naver?query=${q}`;
    } else {
      url = engine.url + encodeURIComponent(query);
    }

    if (!url) url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    // Do not reset currentEngine here, let it persist until refresh as per user request
    this.updateIcon();
    input.value = "";

    const val = localStorage.getItem("dj_search_new_tab");
    const openInNewTab = val === "true" || val === true || val === null; 
    
    // DEBUG ALERT - To be removed after testing
    // alert(`URL: ${url}\nVal: ${val}\nOpenInNewTab: ${openInNewTab}`);

    if (openInNewTab) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.location.href = url;
    }
  },
};

window.search = search;
window.currentSearchEngine = search.currentEngine;
window.toggleSearchEngineMenu = search.toggleMenu.bind(search);
window.quickSelectEngine = search.quickSelect.bind(search);
window.updateSearchEngineIcon = search.updateIcon.bind(search);
window.performSearch = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  search.perform(e);
  return false;
};
