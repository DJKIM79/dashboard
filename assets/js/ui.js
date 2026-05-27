// 260525 21:41 Stable
const ui = {
  toggleFolder(id, event) {
    if (event) event.stopPropagation();
    document
      .querySelectorAll(".fab-menu")
      .forEach((m) => m.classList.remove("active"));
    document
      .querySelectorAll(".fab-main")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".smart-folder")
      .forEach((f) =>
        f.id !== id ? f.classList.remove("open") : f.classList.toggle("open"),
      );
  },
  toggleFab(id, event) {
    if (event) event.stopPropagation();
    document.querySelectorAll(".fab-menu").forEach((m) => {
      if (m.id !== id) {
        m.classList.remove("active");
        const container = m.closest(".fab-container");
        if (container) {
          const mainBtn = container.querySelector(".fab-main");
          if (mainBtn) mainBtn.classList.remove("active");
        }
      }
    });
    const searchMenu = document.getElementById("search-engine-menu");
    if (searchMenu) searchMenu.classList.remove("active");
    document
      .querySelectorAll(".smart-folder")
      .forEach((f) => f.classList.remove("open"));
    const target = document.getElementById(id);
    if (target) {
      target.classList.toggle("active");
      const container = target.closest(".fab-container");
      if (container) {
        const mainBtn = container.querySelector(".fab-main");
        if (mainBtn) {
          mainBtn.classList.toggle("active", target.classList.contains("active"));
        }
      }
    }
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
      "stock",
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
      stock: "stock-container",
    };
    types.forEach((type) => {
      let isHidden = localStorage.getItem(`dj_hide_${type}`) === "true";
      if (localStorage.getItem(`dj_hide_${type}`) === null) {
        if (type === "ai") isHidden = true;
        else isHidden = false;
      }

      // Language check for stock widget
      if (type === "stock") {
        const lang = localStorage.getItem("dj_language") || "auto";
        const actualLang = (lang === "auto") ? (window.i18n ? i18n.userLang : "en") : lang;
        const supported = ["ko", "en", "ja", "zh-CN", "zh-TW"];
        if (!supported.includes(actualLang)) {
           isHidden = true;
        }
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
      if (sideIcon) {
        sideIcon.classList.toggle("active", !isHidden);
        
        // Language check for stock icon visibility in sidebar
        if (type === "stock") {
          const lang = localStorage.getItem("dj_language") || "auto";
          const actualLang = (lang === "auto") ? (window.i18n ? i18n.userLang : "en") : lang;
          const supported = ["ko", "en", "ja", "zh-CN", "zh-TW"];
          if (!supported.includes(actualLang)) {
             sideIcon.style.display = 'none';
          } else {
             sideIcon.style.display = '';
          }
        }
      }
    });
    if (window.shortcutMod) {
       shortcutMod.checkLayout();
       setTimeout(() => shortcutMod.checkLayout(), 550);
    }
  },
  toggleWidget(type) {
    if (type === "stock") {
      if (window.stock && !stock.isSupported()) return;
    }
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
      if (window.ai && typeof window.ai.cleanupEmptyShell === "function") window.ai.cleanupEmptyShell();
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
    const addRowItem = document.getElementById("ctx-add-row");
    const addColItem = document.getElementById("ctx-add-col");
    const delRowItem = document.getElementById("ctx-del-row");
    const delColItem = document.getElementById("ctx-del-col");
    const rowGroup = document.getElementById("ctx-row-group");
    const colGroup = document.getElementById("ctx-col-group");
    const aiGroup = document.getElementById("ctx-ai-group");
    const stockSecretItem = document.getElementById("ctx-stock-secret");

    if (addItem) addItem.style.display = "none";
    if (editItem) editItem.style.display = "none";
    if (delItem) delItem.style.display = "none";
    if (hideItem) hideItem.style.display = "flex";
    if (rowGroup) rowGroup.style.display = "none";
    if (colGroup) colGroup.style.display = "none";
    if (aiGroup) aiGroup.style.display = "none";
    if (addRowItem) addRowItem.style.display = "none";
    if (addColItem) addColItem.style.display = "none";
    if (delRowItem) delRowItem.style.display = "none";
    if (delColItem) delColItem.style.display = "none";
    if (stockSecretItem) stockSecretItem.style.display = "none";
    if (type === "shortcut") {
      if (addItem) addItem.style.display = "flex";
      if (editItem) editItem.style.display = id !== undefined ? "flex" : "none";
      if (delItem) delItem.style.display = id !== undefined ? "flex" : "none";
      if (hideItem) hideItem.style.display = "flex";
    } else if (type === "weather") {
      if (addItem) addItem.style.display = "flex";
      if (delItem) delItem.style.display = "flex";
      if (id !== "current" && editItem) {
        editItem.style.display = "flex";
      }
    } else if (["memo", "noti", "stock"].includes(type)) {
      if (addItem) addItem.style.display = "flex";
      if (editItem) editItem.style.display = id ? "flex" : "none";
      if (delItem) delItem.style.display = id ? "flex" : "none";
      
      if (type === "stock") {
        if (stockSecretItem) {
          stockSecretItem.style.display = "flex";
          const secretText = document.getElementById("ctx-stock-secret-text");
          if (secretText) {
            const isSecret = window.stock && window.stock.isSecretMode;
            const key = isSecret ? "cmNormal" : "cmSecret";
            secretText.setAttribute("data-i18n", key);
            if (window.i18n) {
              secretText.innerText = i18n.get(key);
            } else {
              secretText.innerText = isSecret ? "확대" : "축소";
            }
          }
        }
      }
    } else if (type === "table") {
        if (hideItem) hideItem.style.display = "none";
        const rowGroup = document.getElementById("ctx-row-group");
        const colGroup = document.getElementById("ctx-col-group");
        if (rowGroup) rowGroup.style.display = "flex";
        if (colGroup) colGroup.style.display = "flex";

        // Disable delete row if it's header or if only 2 rows remain (header + 1 data)
        const rows = window.memo && memo.currentTableData ? memo.currentTableData.length : 0;
        if (delRowItem) {
            delRowItem.style.display = "flex";
            if (id.r > 0 && rows > 2) {
                delRowItem.classList.remove("disabled");
            } else {
                delRowItem.classList.add("disabled");
            }
        }
        if (addRowItem) addRowItem.style.display = "flex";

        // Disable delete column if only 1 column remains
        const cols = window.memo && memo.currentTableData && memo.currentTableData[0] ? memo.currentTableData[0].length : 0;
        if (delColItem) {
            delColItem.style.display = "flex";
            if (cols > 1) {
                delColItem.classList.remove("disabled");
            } else {
                delColItem.classList.add("disabled");
            }
        }
        if (addColItem) addColItem.style.display = "flex";

        menu.dataset.r = id.r;
        menu.dataset.c = id.c;
    } else if (type === "ai-chat") {
      if (hideItem) hideItem.style.display = "none";
      if (aiGroup) {
        aiGroup.style.display = "block";
        const chat = window.ai && ai.chats ? ai.chats.find(c => c.id === id) : null;
        const isLocked = chat && chat.locked;
        const lockIcon = document.querySelector("#ctx-ai-lock i");
        const lockText = document.getElementById("ctx-ai-lock-text");
        if (lockIcon) {
          lockIcon.className = isLocked ? "fas fa-unlock cm-icon" : "fas fa-lock cm-icon";
        }
        if (lockText) {
          const key = isLocked ? "cmAiUnlock" : "cmAiLock";
          lockText.setAttribute("data-i18n", key);
          if (window.i18n) lockText.innerText = i18n.get(key);
          else lockText.innerText = isLocked ? "대화 잠금 해제" : "대화 잠금";
        }
        // Hide delete if locked
        const delBtn = document.getElementById("ctx-ai-del");
        if (delBtn) {
          if (isLocked) delBtn.style.display = "none";
          else delBtn.style.display = "flex";
        }
      }
    }    menu.style.display = "block";
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
        document
          .querySelectorAll(".fab-main")
          .forEach((b) => b.classList.remove("active"));
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
      // Do not close context menu if clicking on a disabled item
      if (ctxMenu && !e.target.closest(".context-menu .disabled")) {
          ctxMenu.style.display = "none";
      }
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
