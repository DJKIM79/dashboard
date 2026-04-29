// Global Variables
window.currentEditNotiId = null;
window.currentEditMemoId = null;
window.currentShortcutIndex = null;

const app = {
  async init() {
    this.initDefaults();
    await i18n.init();
    this.initModules();
    this.clearTutorialData();
    this.setupIntervals();
    this.checkTutorial();
  },

  initDefaults() {
    const defaults = {
      "dj_theme_color": "#ffffff",
      "dj_theme_adjustment": "none",
      "dj_image_engine": "flickr",
      "dj_ai_output_at_once": "false",
      "dj_bg_keyword": "",
      "dj_search_new_tab": "true",
      "dj_show_current_weather": "true",
      "dj_hide_fileMgmt": "false",
      "dj_quote_font_size": "medium",
      "dj_widget_size": "medium"
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
      }
    }

    if (localStorage.getItem("dj_ai_provider") === null) {
      localStorage.setItem("dj_ai_provider", "none");
      localStorage.setItem("dj_ai_disabled", "true");
    }

    // Force AI chatbot to be closed on startup
    localStorage.setItem("dj_hide_ai", "true");

    // Initialize default custom search engines on first run
    if (localStorage.getItem("dj_search_engines_custom") === null) {
      const initialCustomEngines = [
        { id: "custom_chatgpt", name: "ChatGPT", url: "https://chatgpt.com/?q=", domain: "chatgpt.com", isDefault: false },
        { id: "custom_youtube", name: "YouTube", url: "https://www.youtube.com/results?search_query=", domain: "youtube.com", isDefault: false },
        { id: "custom_bing", name: "Bing", url: "https://www.bing.com/search?q=", domain: "bing.com", isDefault: false }
      ];
      localStorage.setItem("dj_search_engines_custom", JSON.stringify(initialCustomEngines));
    }
  },

  initModules() {
    utils.initTimePicker();
    ui.init();
    ui.applyVisibility();

    const savedTheme = localStorage.getItem("dj_theme_color");
    if (savedTheme) settings.setTheme(savedTheme, true);

    settings.setQuoteFontSize(localStorage.getItem("dj_quote_font_size") || "medium");
    settings.setWidgetSize(localStorage.getItem("dj_widget_size") || "medium");

    const sd = localStorage.getItem("dj_bg_seed") || Math.floor(Math.random() * 10000);
    utils.setBackground(sd);

    quote.init();
    weather.init();
    ai.init();
    shortcutMod.init();
    noti.init();
    memo.init();
    calendar.render();
    ui.applyVisibility();
    search.init();
  },

  clearTutorialData() {
    let dataChanged = false;
    if (window.shortcutMod && window.shortcutMod.items) {
      const beforeCount = window.shortcutMod.items.length;
      window.shortcutMod.items = window.shortcutMod.items.filter(s => !s._isTutorial);
      if (window.shortcutMod.items.length !== beforeCount) {
        window.shortcuts = window.shortcutMod.items;
        dataChanged = true;
      }
    }
    if (window.memo && window.memo.items) {
      const beforeCount = window.memo.items.length;
      window.memo.items = window.memo.items.filter(m => !String(m.id).startsWith("tut_memo_"));
      if (window.memo.items.length !== beforeCount) {
        window.memos = window.memo.items;
        dataChanged = true;
      }
    }
    if (window.noti && window.noti.items) {
      const beforeCount = window.noti.items.length;
      window.noti.items = window.noti.items.filter(n => !String(n.id).startsWith("tut_noti_"));
      if (window.noti.items.length !== beforeCount) {
        window.notifications = window.noti.items;
        dataChanged = true;
      }
    }
    if (dataChanged && window.utils && utils.saveData) {
      utils.saveData();
    }
  },

  setupIntervals() {
    setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      clock.update();
      if (window.noti) {
        noti.check(timeStr, todayStr, now);
        noti.updateRemaining(now);
      }
    }, 1000);
    clock.update();
  },

  checkTutorial() {
    if (!localStorage.getItem("dj_tutorial_done")) {
      setTimeout(() => {
        tutorial.showIntro();
      }, 800);
    } else {
      setTimeout(() => {
        const input = document.getElementById("searchInput");
        if (input) input.focus();
      }, 500);
    }
  },

  showDeleteConfirm(type, id) {
    const menu = document.getElementById("globalContextMenu");
    const confirmModal = document.getElementById("deleteConfirmModal");

    // Inherit from context menu if not provided
    if (!type && menu) {
      type = menu.dataset.type;
      id = menu.dataset.id;
    }

    if (confirmModal) {
      confirmModal.dataset.type = type || "";
      confirmModal.dataset.id = id || "";
    }

    if (menu) menu.style.display = "none";
    // Close existing modals to prevent overlap
    utils.closeModal("memoModal");
    utils.closeModal("notiModal");
    utils.closeModal("settingModal");
    utils.openModal("deleteConfirmModal");
  },

  addCurrentItem() {
    const menu = document.getElementById("globalContextMenu");
    const type = menu ? menu.dataset.type : null;
    if (menu) menu.style.display = "none";

    if (type === "weather") {
      settings.openModal();
      setTimeout(() => {
        const input = document.getElementById("citySearchInput");
        if (input) input.focus();
      }, 100);
    }
  },

  editCurrentItem() {
    const menu = document.getElementById("globalContextMenu");
    if (!menu) return;
    const type = menu.dataset.type;
    const id = menu.dataset.id;
    menu.style.display = "none";

    if (type === "shortcut") shortcutMod.openModal(id);
    else if (type === "memo") memo.openModal(id);
    else if (type === "noti") noti.openModal(id);
    else if (type === "weather") {
      settings.openModal();
      setTimeout(() => {
        const input = document.getElementById("citySearchInput");
        if (input) input.focus();
      }, 100);
    }
  },

  deleteCurrentItem() {
    utils.closeModal("deleteConfirmModal");
    const confirmModal = document.getElementById("deleteConfirmModal");
    if (!confirmModal) return;
    const type = confirmModal.dataset.type;
    const id = confirmModal.dataset.id;

    if (type === "shortcut") {
      shortcutMod.delete(id);
    } else if (type === "memo") {
      memo.delete(id);
    } else if (type === "noti") {
      noti.delete(id);
    } else if (type === "weather") {
      if (id === "current") {
        if (window.settings && typeof settings.updateShowWeather === "function") {
          settings.updateShowWeather(false);
          // UI sync if modal is open
          const check = document.getElementById("showCurrentWeather");
          if (check) check.checked = false;
        } else {
          localStorage.setItem("dj_show_current_weather", "false");
          if (window.weather) {
            weather.showCurrent = false;
            weather.fetch();
          }
        }
      } else {
        if (window.weather) {
          weather.removeLocation(id);
          // removeLocation internally calls fetch and renderLocationList
        }
      }
    }
    
    // Clear dataset after action
    confirmModal.dataset.type = "";
    confirmModal.dataset.id = "";
    
    utils.saveData();
  },

  requestNotiPermission() {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  },
};

window.app = app;
window.showDeleteConfirm = app.showDeleteConfirm.bind(app);
window.addCurrentItem = app.addCurrentItem.bind(app);
window.editCurrentItem = app.editCurrentItem.bind(app);
window.deleteCurrentItem = app.deleteCurrentItem.bind(app);
window.requestNotiPermission = app.requestNotiPermission.bind(app);

window.addEventListener("DOMContentLoaded", () => {
  app.init();
});
