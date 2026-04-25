const ui = {
  currentContextType: null,
  currentContextId: null,

  toggleFolder(id, event) {
    if (event) event.stopPropagation();
    document
      .querySelectorAll(".fab-menu")
      .forEach((m) => m.classList.remove("active"));
    document
      .querySelectorAll(".smart-folder")
      .forEach((f) =>
        f.id !== id
          ? f.classList.remove("open")
          : f.classList.toggle("open"),
      );
  },

  toggleFab(id, event) {
    if (event) event.stopPropagation();
    document
      .querySelectorAll(".smart-folder")
      .forEach((f) => f.classList.remove("open"));
    document
      .querySelectorAll(".fab-menu")
      .forEach((m) =>
        m.id !== id
          ? m.classList.remove("active")
          : m.classList.toggle("active"),
      );
  },

  applyVisibility() {
    const types = ["weather", "quote", "search", "shortcut", "ai", "memo", "noti", "calendar", "clock"];
    const widgetMap = {
      weather: "top-right-widgets",
      quote: "quote-section",
      search: "search-section",
      shortcut: "shortcut-container",
      ai: "ai-chatbot-container",
      memo: "memo-folder",
      noti: "noti-folder",
      calendar: "calendar-container",
      clock: "clock-container",
    };
    types.forEach((type) => {
      const isHidden = localStorage.getItem(`dj_hide_${type}`) === "true";
      const el = document.getElementById(widgetMap[type]);
      const sideIcon = document.getElementById(`side-${type}`);
      if (el) el.classList.toggle("widget-hidden", isHidden);
      if (sideIcon) sideIcon.classList.toggle("active", !isHidden);
    });
  },

  toggleWidget(type) {
    if (type === "ai" && !localStorage.getItem("dj_ai_model")) {
      const isHidden = localStorage.getItem("dj_hide_ai") === "true";
      // 만약 위젯이 현재 숨겨진 상태에서 켜려고 하는 경우에만 설정창 유도
      if (isHidden) {
        settings.openModal();
        return;
      }
    }
    const key = `dj_hide_${type}`;
    const isCurrentlyHidden = localStorage.getItem(key) === "true";
    localStorage.setItem(key, isCurrentlyHidden ? "false" : "true");
    this.applyVisibility();
  },

  showContextMenu(e, type, id) {
    e.preventDefault();
    e.stopPropagation();
    this.currentContextType = type;
    this.currentContextId = id;
    // Sync with global for other modules if needed
    window.currentContextType = type;
    window.currentContextId = id;

    const menu = document.getElementById("globalContextMenu");
    if (!menu) return;
    
    const addItem = document.getElementById("ctx-add");
    const editItem = document.getElementById("ctx-edit");
    const delItem = document.getElementById("ctx-del");
    const hideItem = document.getElementById("ctx-hide");
    
    if (addItem) addItem.style.display = "none";
    if (editItem) editItem.style.display = "none";
    if (delItem) delItem.style.display = "none";
    if (hideItem) hideItem.style.display = "block";

    if (type === "shortcut") {
      if (editItem) editItem.style.display = "block";
      if (delItem) delItem.style.display = "block";
      if (hideItem) hideItem.style.display = "none";
    } else if (type === "weather") {
      if (addItem) addItem.style.display = "block";
      if (delItem) delItem.style.display = "block";
      if (id !== "current" && editItem) {
        editItem.style.display = "block";
      }
    } else if (["memo", "noti"].includes(type)) {
      if (editItem) editItem.style.display = "block";
      if (delItem) delItem.style.display = "block";
    }

    menu.style.display = "block";
    
    let x = e.pageX || e.touches?.[0].pageX;
    let y = e.pageY || e.touches?.[0].pageY;
    
    if (x + 130 > window.innerWidth) x = window.innerWidth - 140;
    const menuHeight = menu.offsetHeight;
    if (y + menuHeight > window.innerHeight + window.scrollY) {
      y = y - menuHeight;
    }
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  },

  hideCurrentWidget() {
    const menu = document.getElementById("globalContextMenu");
    if (menu) menu.style.display = "none";
    if (["shortcut", "memo", "noti"].includes(this.currentContextType)) {
      this.toggleWidget(this.currentContextType);
    } else {
      this.toggleWidget(this.currentContextType);
    }
  },

  init() {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".fab-container"))
        document
          .querySelectorAll(".fab-menu")
          .forEach((m) => m.classList.remove("active"));
      if (!e.target.closest(".smart-folder"))
        document
          .querySelectorAll(".smart-folder")
          .forEach((f) => f.classList.remove("open"));
      
      const ctxMenu = document.getElementById("globalContextMenu");
      if (ctxMenu) ctxMenu.style.display = "none";
      
      if (!e.target.closest(".weather-item"))
        document
          .querySelectorAll(".forecast-window")
          .forEach((w) => w.classList.remove("active"));
          
      if (!e.target.closest(".search-engine-icon")) {
        const menu = document.getElementById("search-engine-menu");
        if (menu) menu.classList.remove("active");
      }
      
      if (!e.target.closest(".city-search-container")) {
        const results = document.getElementById("citySearchResults");
        if (results) results.style.display = "none";
      }
    });
  }
};

window.ui = ui;
window.toggleFolder = (id, e) => ui.toggleFolder(id, e);
window.toggleFab = (id, e) => ui.toggleFab(id, e);
window.toggleWidget = (type) => ui.toggleWidget(type);
window.applyVisibility = () => ui.applyVisibility();
window.showContextMenu = (e, type, id) => ui.showContextMenu(e, type, id);
window.hideCurrentWidget = () => ui.hideCurrentWidget();
