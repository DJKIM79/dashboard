const ui = {
  toggleFolder(id, event) {
    if (event) event.stopPropagation();
    document
      .querySelectorAll(".fab-menu")
      .forEach((m) => m.classList.remove("active"));
    document
      .querySelectorAll(".smart-folder")
      .forEach((f) =>
        f.id !== id ? f.classList.remove("open") : f.classList.toggle("open"),
      );
  },
  toggleFab(id, event) {
    if (event) event.stopPropagation();
    document.querySelectorAll(".fab-menu").forEach((m) => {
      if (m.id !== id) m.classList.remove("active");
    });
    const searchMenu = document.getElementById("search-engine-menu");
    if (searchMenu) searchMenu.classList.remove("active");
    document
      .querySelectorAll(".smart-folder")
      .forEach((f) => f.classList.remove("open"));
    const target = document.getElementById(id);
    if (target) target.classList.toggle("active");
  },
  applyVisibility() {
    const types = [
      "weather",
      "quote",
      "search",
      "shortcut",
      "ai",
      "memo",
      "noti",
      "calendar",
      "clock",
      "fileMgmt",
    ];
    const widgetMap = {
      weather: "top-right-widgets",
      quote: "quote-section",
      search: "search-section",
      shortcut: "shortcut-container",
      ai: ["ai-chatbot-container", "ai-overlay"],
      memo: "memo-folder",
      noti: "noti-folder",
      calendar: "calendar-container",
      clock: "clock-container",
      fileMgmt: "top-left-widgets",
    };
    types.forEach((type) => {
      let isHidden = localStorage.getItem(`dj_hide_${type}`) === "true";
      if (localStorage.getItem(`dj_hide_${type}`) === null) {
        if (type === "ai") isHidden = true;
        else isHidden = false;
      }
      const targets = Array.isArray(widgetMap[type])
        ? widgetMap[type]
        : [widgetMap[type]];
      targets.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          if (type === "fileMgmt") {
             const hideFile = localStorage.getItem("dj_hide_fileMgmt") === "true";
             el.classList.toggle("widget-hidden", hideFile);
             
             // Sync with checkbox in settings
             const checkbox = document.getElementById("showFileMgmtCheckbox");
             if (checkbox) checkbox.checked = !hideFile;
          } else {
             el.classList.toggle("widget-hidden", isHidden);
          }
        }
      });
      const sideIcon = document.getElementById(`side-${type}`);
      if (sideIcon) sideIcon.classList.toggle("active", !isHidden);
    });
    if (window.shortcutMod) {
       shortcutMod.checkLayout();
       setTimeout(() => shortcutMod.checkLayout(), 550);
    }
  },
  toggleWidget(type) {
    if (type === "ai") {
      if (!window.ai || !ai.isConnected) {
        utils.closeModal("settingModal"); // Ensure any existing modal is closed
        if (window.settings) settings.openModal();
        return;
      }
    }
    utils.closeModal("settingModal");
    const key = `dj_hide_${type}`;
    let isCurrentlyHidden = localStorage.getItem(key) === "true";
    if (localStorage.getItem(key) === null) {
      if (type === "ai") isCurrentlyHidden = true;
      else isCurrentlyHidden = false;
    }
    const newState = !isCurrentlyHidden;
    localStorage.setItem(key, newState);
    if (type === "ai" && newState === true) {
      const input = document.getElementById("ai-user-input");
      if (input) input.value = "";
    }
    this.applyVisibility();
    if (type === "ai" && !newState) {
      setTimeout(() => {
        const input = document.getElementById("ai-user-input");
        if (input) input.focus();
      }, 150);
    }
  },
  showContextMenu(e, type, id) {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById("globalContextMenu");
    if (!menu) return;
    menu.dataset.type = type || "";
    menu.dataset.id = id !== undefined ? id : "";
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
      if (delItem) delItem.style.display = id ? "block" : "none";
      if (addItem) addItem.style.display = "none";
      if (editItem) editItem.style.display = "none";
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
    if (!menu) return;
    const type = menu.dataset.type;
    menu.style.display = "none";
    if (type) {
      this.toggleWidget(type);
    }
  },
  init() {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".fab-container")) {
        document
          .querySelectorAll(".fab-menu")
          .forEach((m) => m.classList.remove("active"));
      }
      if (!e.target.closest(".search-engine-icon")) {
        const menu = document.getElementById("search-engine-menu");
        if (menu) menu.classList.remove("active");
      }
      if (!e.target.closest(".smart-folder")) {
        document
          .querySelectorAll(".smart-folder")
          .forEach((f) => f.classList.remove("open"));
      }
      const ctxMenu = document.getElementById("globalContextMenu");
      if (ctxMenu) ctxMenu.style.display = "none";
      if (!e.target.closest(".weather-item")) {
        document
          .querySelectorAll(".forecast-window")
          .forEach((w) => w.classList.remove("active"));
      }
      if (!e.target.closest(".city-search-container")) {
        const results = document.getElementById("citySearchResults");
        if (results) results.style.display = "none";
      }
    });
  },
};
window.ui = ui;
window.toggleFolder = ui.toggleFolder.bind(ui);
window.toggleFab = ui.toggleFab.bind(ui);
window.toggleWidget = ui.toggleWidget.bind(ui);
window.applyVisibility = ui.applyVisibility.bind(ui);
window.showContextMenu = ui.showContextMenu.bind(ui);
window.hideCurrentWidget = ui.hideCurrentWidget.bind(ui);
