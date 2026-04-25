// Global Variables
window.shortcuts = JSON.parse(localStorage.getItem("dj_shortcuts")) || [];
window.notifications = JSON.parse(localStorage.getItem("dj_notifications")) || [];
window.memos = JSON.parse(localStorage.getItem("dj_memos")) || [];
window.weatherLocations = JSON.parse(localStorage.getItem("dj_weather_locations")) || [];
window.showCurrentWeather = localStorage.getItem("dj_show_current_weather") !== "false";
window.currentEditNotiId = null;
window.currentEditMemoId = null;
window.currentShortcutIndex = null;
window.currentContextType = null;
window.currentContextId = null;

const app = {
  async init() {
    // 1. Initialize i18n first
    await i18n.init();
    
    // 2. Initialize Utils & UI
    utils.initTimePicker();
    ui.init();
    
    // 3. Initialize Settings (Theme, etc.)
    const savedTheme = localStorage.getItem("dj_theme_color");
    if (savedTheme) settings.setTheme(savedTheme);
    
    const savedFontSize = localStorage.getItem("dj_quote_font_size") || "medium";
    settings.setQuoteFontSize(savedFontSize);
    
    const savedWidgetSize = localStorage.getItem("dj_widget_size") || "medium";
    settings.setWidgetSize(savedWidgetSize);

    // 4. Background and Initial Data Fetch
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

    // 5. Set up Intervals
    setInterval(() => clock.update(), 1000);
    clock.update();

    // 6. Tutorial Check
    if (!localStorage.getItem("dj_tutorial_done")) {
      setTimeout(() => {
        tutorial.show();
        localStorage.setItem("dj_tutorial_done", "true");
      }, 800);
    }
  },

  showDeleteConfirm() {
    const menu = document.getElementById("globalContextMenu");
    if (menu) menu.style.display = "none";
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
        window.showCurrentWeather = false;
        localStorage.setItem("dj_show_current_weather", false);
        weather.showCurrent = false;
      } else {
        weather.removeLocation(id);
      }
      weather.fetch();
    }
    utils.saveData();
  },

  requestNotiPermission() {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
};

window.app = app;
window.showDeleteConfirm = () => app.showDeleteConfirm();
window.addCurrentItem = () => app.addCurrentItem();
window.editCurrentItem = () => app.editCurrentItem();
window.deleteCurrentItem = () => app.deleteCurrentItem();
window.requestNotiPermission = () => app.requestNotiPermission();

window.addEventListener("DOMContentLoaded", () => {
  app.init();
});
