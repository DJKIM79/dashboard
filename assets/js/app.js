// Global Variables
window.currentEditNotiId = null;
window.currentEditMemoId = null;
window.currentShortcutIndex = null;
window.currentContextType = null;
window.currentContextId = null;

const app = {
  async init() {
    // 0. Set default values if not exists
    if (localStorage.getItem("dj_theme_color") === null)
      localStorage.setItem("dj_theme_color", "#eab308");
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
        tutorial.show();
        localStorage.setItem("dj_tutorial_done", "true");
      }, 800);
    } else {
      // If tutorial is not showing, focus search input again to be sure
      setTimeout(() => {
        const input = document.getElementById("searchInput");
        if (input) input.focus();
      }, 500);
    }
  },

  showDeleteConfirm() {
    const menu = document.getElementById("globalContextMenu");
    if (menu) menu.style.display = "none";
    // Close existing modals to prevent overlap
    utils.closeModal("memoModal");
    utils.closeModal("notiModal");
    utils.closeModal("settingModal");
    utils.openModal("deleteConfirmModal");
  },

  addCurrentItem() {
    const menu = document.getElementById("globalContextMenu");
    if (menu) menu.style.display = "none";
    if (window.currentContextType === "weather") {
      settings.openModal();
      setTimeout(() => {
        const input = document.getElementById("citySearchInput");
        if (input) input.focus();
      }, 100);
    }
  },

  editCurrentItem() {
    const menu = document.getElementById("globalContextMenu");
    if (menu) menu.style.display = "none";
    const type = window.currentContextType;
    const id = window.currentContextId;

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
    const type = window.currentContextType;
    const id = window.currentContextId;

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
