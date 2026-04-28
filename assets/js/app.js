// Global Variables
window.currentEditNotiId = null;
window.currentEditMemoId = null;
window.currentShortcutIndex = null;

const app = {
  async init() {
    // 0. Set default values if not exists
    if (localStorage.getItem("dj_theme_color") === null)
      localStorage.setItem("dj_theme_color", "#ffffff");
    if (localStorage.getItem("dj_theme_adjustment") === null)
      localStorage.setItem("dj_theme_adjustment", "none");
    if (localStorage.getItem("dj_image_engine") === null)
      localStorage.setItem("dj_image_engine", "flickr");
    if (localStorage.getItem("dj_ai_output_at_once") === null)
      localStorage.setItem("dj_ai_output_at_once", "false");
    if (localStorage.getItem("dj_bg_keyword") === null)
      localStorage.setItem("dj_bg_keyword", "");
    if (localStorage.getItem("dj_search_new_tab") === null)
      localStorage.setItem("dj_search_new_tab", "true");
    if (localStorage.getItem("dj_show_current_weather") === null)
      localStorage.setItem("dj_show_current_weather", "true");
    if (localStorage.getItem("dj_hide_fileMgmt") === null)
      localStorage.setItem("dj_hide_fileMgmt", "false");
    if (localStorage.getItem("dj_quote_font_size") === null)
      localStorage.setItem("dj_quote_font_size", "medium");
    if (localStorage.getItem("dj_widget_size") === null)
      localStorage.setItem("dj_widget_size", "medium");
    if (localStorage.getItem("dj_ai_provider") === null) {
      localStorage.setItem("dj_ai_provider", "none");
      localStorage.setItem("dj_ai_disabled", "true");
    }

    // Force AI chatbot to be closed on startup
    localStorage.setItem("dj_hide_ai", "true");

    // 0.1 Initialize default custom search engines on first run
    if (localStorage.getItem("dj_search_engines_custom") === null) {
      const initialCustomEngines = [
        { id: "custom_chatgpt", name: "ChatGPT", url: "https://chatgpt.com/?q=", domain: "chatgpt.com", isDefault: false },
        { id: "custom_youtube", name: "YouTube", url: "https://www.youtube.com/results?search_query=", domain: "youtube.com", isDefault: false },
        { id: "custom_bing", name: "Bing", url: "https://www.bing.com/search?q=", domain: "bing.com", isDefault: false }
      ];
      localStorage.setItem("dj_search_engines_custom", JSON.stringify(initialCustomEngines));
    }

    // 1. Initialize i18n first
    await i18n.init();

    // 2. Initialize Utils & UI
    utils.initTimePicker();
    ui.init();
    ui.applyVisibility(); // Apply saved widget visibility states

    // 3. Initialize Settings (Theme, etc.)
    const savedTheme = localStorage.getItem("dj_theme_color");
    if (savedTheme) settings.setTheme(savedTheme, true);

    const savedFontSize =
      localStorage.getItem("dj_quote_font_size") || "medium";
    settings.setQuoteFontSize(savedFontSize);

    const savedWidgetSize = localStorage.getItem("dj_widget_size") || "medium";
    settings.setWidgetSize(savedWidgetSize);

    // 4. Background and Initial Data Fetch
    const sd =
      localStorage.getItem("dj_bg_seed") || Math.floor(Math.random() * 10000);
    utils.setBackground(sd);

    quote.init();
    weather.init();
    ai.init();
    shortcutMod.init();
    noti.init();
    memo.init();

    // 튜토리얼 임시 데이터 클리어
    if (window.shortcutMod && window.shortcutMod.items) {
      const beforeCount = window.shortcutMod.items.length;
      window.shortcutMod.items = window.shortcutMod.items.filter(s => !s._isTutorial);
      if (window.shortcutMod.items.length !== beforeCount) {
        window.shortcuts = window.shortcutMod.items;
        if (window.utils && utils.saveData) utils.saveData();
      }
    }
    if (window.memo && window.memo.items) {
      const beforeCount = window.memo.items.length;
      window.memo.items = window.memo.items.filter(m => !String(m.id).startsWith("tut_memo_"));
      if (window.memo.items.length !== beforeCount) {
        window.memos = window.memo.items;
        if (window.utils && utils.saveData) utils.saveData();
      }
    }
    if (window.noti && window.noti.items) {
      const beforeCount = window.noti.items.length;
      window.noti.items = window.noti.items.filter(n => !String(n.id).startsWith("tut_noti_"));
      if (window.noti.items.length !== beforeCount) {
        window.notifications = window.noti.items;
        if (window.utils && utils.saveData) utils.saveData();
      }
    }

    calendar.render();
    ui.applyVisibility();
    search.init();

    // 5. Set up Intervals
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

    // 6. Tutorial Check
    if (!localStorage.getItem("dj_tutorial_done")) {
      setTimeout(() => {
        tutorial.showIntro();
      }, 800);
    } else {
      // If tutorial is not showing, focus search input again to be sure
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
        weather.removeLocation(id);
        weather.fetch();
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
