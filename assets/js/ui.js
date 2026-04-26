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
        f.id !== id ? f.classList.remove("open") : f.classList.toggle("open"),
      );
  },

  toggleFab(id, event) {
    if (event) event.stopPropagation();

    // Close other FAB menus
    document.querySelectorAll(".fab-menu").forEach((m) => {
      if (m.id !== id) m.classList.remove("active");
    });

    // Close search engine menu
    const searchMenu = document.getElementById("search-engine-menu");
    if (searchMenu) searchMenu.classList.remove("active");

    // Close smart folders
    document
      .querySelectorAll(".smart-folder")
      .forEach((f) => f.classList.remove("open"));

    // Toggle the target FAB
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
    };
    types.forEach((type) => {
      let isHidden = localStorage.getItem(`dj_hide_${type}`) === "true";

      // 초기 상태(null)일 때, AI 챗봇만 기본적으로 숨김
      if (localStorage.getItem(`dj_hide_${type}`) === null) {
        if (type === "ai") isHidden = true;
        else isHidden = false;
      }

      const targets = Array.isArray(widgetMap[type])
        ? widgetMap[type]
        : [widgetMap[type]];

      targets.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("widget-hidden", isHidden);
      });

      const sideIcon = document.getElementById(`side-${type}`);
      if (sideIcon) sideIcon.classList.toggle("active", !isHidden);
    });
  },

  toggleWidget(type) {
    if (type === "ai") {
      // Use strictly isConnected status
      if (!window.ai || !ai.isConnected) {
        utils.closeModal("settingModal"); // Ensure any existing modal is closed
        if (window.settings) settings.openModal();
        return;
      }
    }

    // If opening any widget, we might want to close the settings modal
    utils.closeModal("settingModal");

    const key = `dj_hide_${type}`;
    let isCurrentlyHidden = localStorage.getItem(key) === "true";

    // 초기 설정값이 없을 때(null)의 기본 상태를 toggle 로직에도 반영
    if (localStorage.getItem(key) === null) {
      if (type === "ai") isCurrentlyHidden = true;
      else isCurrentlyHidden = false;
    }

    const newState = !isCurrentlyHidden;
    localStorage.setItem(key, newState);

    // AI 위젯을 닫는 시점에 입력창 비우기
    if (type === "ai" && newState === true) {
      const input = document.getElementById("ai-user-input");
      if (input) input.value = "";
    }

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
      if (delItem) delItem.style.display = id ? "block" : "none";
      // Ensure Edit and Add are hidden for memo/noti
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
    if (menu) menu.style.display = "none";
    if (["shortcut", "memo", "noti"].includes(this.currentContextType)) {
      this.toggleWidget(this.currentContextType);
    } else {
      this.toggleWidget(this.currentContextType);
    }
  },

  init() {
    document.addEventListener("click", (e) => {
      // 1. Close FAB menus if clicked outside
      if (!e.target.closest(".fab-container")) {
        document
          .querySelectorAll(".fab-menu")
          .forEach((m) => m.classList.remove("active"));
      }

      // 2. Close search engine menu if clicked outside
      if (!e.target.closest(".search-engine-icon")) {
        const menu = document.getElementById("search-engine-menu");
        if (menu) menu.classList.remove("active");
      }

      // 3. Close smart folders if clicked outside
      if (!e.target.closest(".smart-folder")) {
        document
          .querySelectorAll(".smart-folder")
          .forEach((f) => f.classList.remove("open"));
      }

      // 4. Close context menu
      const ctxMenu = document.getElementById("globalContextMenu");
      if (ctxMenu) ctxMenu.style.display = "none";

      // 5. Close weather forecast windows if clicked outside
      if (!e.target.closest(".weather-item")) {
        document
          .querySelectorAll(".forecast-window")
          .forEach((w) => w.classList.remove("active"));
      }

      // 6. Close city search results if clicked outside
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
