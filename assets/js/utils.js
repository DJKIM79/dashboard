let sharedAudioCtx = null;

const utils = {
  playBeep() {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume();
    }
    const osc = sharedAudioCtx.createOscillator(),
      gain = sharedAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.start();
    setTimeout(() => osc.stop(), 150);
  },

  setBackground(seed) {
    let keyword = localStorage.getItem("dj_bg_keyword");
    if (keyword === null) keyword = "landscape";
    keyword = keyword.trim().replace(/\s+/g, ",");

    const engine = localStorage.getItem("dj_image_engine") || "unsplash";

    // LoremFlickr supports sources by adding them as tags
    // e.g. https://loremflickr.com/1920/1080/nature,unsplash
    const sourceTag = engine === "unsplash" ? "unsplash" : "flickr";
    const tags = keyword ? `${keyword},${sourceTag}` : sourceTag;

    const url = `https://loremflickr.com/1920/1080/${tags}?random=${seed}`;

    document.body.style.backgroundImage = `url('${url}')`;
  },

  changeBackgroundInstant() {
    const seed = Math.floor(Math.random() * 100000);
    localStorage.setItem("dj_bg_seed", seed);
    this.setBackground(seed);
  },

  initTimePicker() {
    this.renderTimeList("notiHourList", 24, "hour");
    this.renderTimeList("notiMinList", 60, "min");

    // Click outside listener for time popups
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-time-picker')) {
        document.querySelectorAll('.time-popup').forEach(p => p.classList.remove('show'));
      }
    });
  },

  renderTimeList(containerId, count, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    const suffix = i18n.userLang === "ko" ? (type === "hour" ? "시" : "분") : (type === "hour" ? "h" : "m");

    for (let i = 0; i < count; i++) {
      const val = String(i).padStart(2, "0");
      const div = document.createElement("div");
      div.className = "time-item";
      div.dataset.value = val;
      div.innerText = `${val}${suffix}`;
      div.onclick = (e) => {
        e.stopPropagation();
        this.selectTime(type, val);
      };
      container.appendChild(div);
    }
  },

  toggleTimePopup(type, e) {
    if (e) e.stopPropagation();
    const popupId = type === "hour" ? "notiHourPopup" : "notiMinPopup";
    const popup = document.getElementById(popupId);
    if (!popup) return;

    const isShowing = popup.classList.contains("show");
    // Close other popups
    document.querySelectorAll('.time-popup').forEach(p => {
      if (p.id !== popupId) p.classList.remove('show');
    });

    // Close calendar popup
    const calPopup = document.getElementById("noti-calendar-popup");
    if (calPopup) calPopup.classList.remove("show");

    if (!isShowing) {
      popup.classList.add("show");
      const currentVal = document.getElementById(type === "hour" ? "notiHour" : "notiMin").value;
      this.scrollToSelected(type, currentVal);
    } else {
      popup.classList.remove("show");
    }
  },

  selectTime(type, val) {
    const displayId = type === "hour" ? "notiHourDisplay" : "notiMinDisplay";
    const inputId = type === "hour" ? "notiHour" : "notiMin";
    const popupId = type === "hour" ? "notiHourPopup" : "notiMinPopup";
    
    const display = document.getElementById(displayId);
    const input = document.getElementById(inputId);
    const popup = document.getElementById(popupId);

    const suffix = i18n.userLang === "ko" ? (type === "hour" ? "시" : "분") : (type === "hour" ? "h" : "m");

    if (display) display.innerText = `${val}${suffix}`;
    if (input) {
      input.value = val;
      // Trigger change if needed
      input.dispatchEvent(new Event('change'));
    }
    
    if (popup) popup.classList.remove("show");
    this.updateTimeSelectionUI(type, val);
  },

  updateTimeSelectionUI(type, val) {
    const listId = type === "hour" ? "notiHourList" : "notiMinList";
    const list = document.getElementById(listId);
    if (!list) return;

    list.querySelectorAll('.time-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === val);
    });
  },

  scrollToSelected(type, val) {
    const listId = type === "hour" ? "notiHourList" : "notiMinList";
    const list = document.getElementById(listId);
    if (!list) return;

    const selectedItem = list.querySelector(`.time-item[data-value="${val}"]`);
    if (selectedItem) {
      this.updateTimeSelectionUI(type, val);
      // 중앙에 오도록 스크롤 계산
      const listHeight = list.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemHeight = selectedItem.clientHeight;
      list.scrollTop = itemTop - listHeight / 2 + itemHeight / 2;
    }
  },

  toggleDaySelector(s) {
    const wrap = document.getElementById("day-selector-wrap");
    const dateInput = document.getElementById("notiDate");
    if (wrap) {
      if (s) wrap.classList.add("show");
      else wrap.classList.remove("show");
    }
    if (dateInput) {
      dateInput.style.opacity = s ? "0.3" : "1";
      dateInput.style.pointerEvents = s ? "none" : "auto";
    }
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("show");
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("show");
  },

  saveData() {
    if (window.shortcutMod)
      localStorage.setItem("dj_shortcuts", JSON.stringify(shortcutMod.items));
    if (window.noti)
      localStorage.setItem("dj_notifications", JSON.stringify(noti.items));
    if (window.memo)
      localStorage.setItem("dj_memos", JSON.stringify(memo.items));
    if (window.weather)
      localStorage.setItem(
        "dj_weather_locations",
        JSON.stringify(weather.locations),
      );
  },

  showValidationTip(elementId, message, type = "error", options = {}) {
    const btn = typeof elementId === "string" ? document.getElementById(elementId) : elementId;
    if (!btn) return;

    // 기존 팁 제거
    const existing = document.querySelector(".validation-tip");
    if (existing) existing.remove();

    const tip = document.createElement("div");
    tip.className = `validation-tip ${type}`;
    if (options.isHtml) tip.innerHTML = message;
    else tip.innerText = message;
    document.body.appendChild(tip);

    const rect = btn.getBoundingClientRect();
    const pos = options.position || "top";

    if (pos === "top") {
      tip.style.left = `${rect.left + rect.width / 2}px`;
      tip.style.top = `${rect.top - 10}px`;
    } else if (pos === "right") {
      tip.classList.add("pos-right");
      tip.style.left = `${rect.right + 25}px`;
      tip.style.top = `${rect.top + rect.height / 2}px`;
    }

    setTimeout(() => {
      tip.classList.add("show");
      if (!options.noAutoHide) {
        setTimeout(() => {
          if (tip.parentNode) {
            tip.classList.remove("show");
            setTimeout(() => tip.remove(), 300);
          }
        }, options.duration || 2000);
      }
    }, 10);
    return tip;
  },

  hideValidationTip() {
    const existing = document.querySelector(".validation-tip");
    if (existing) {
      existing.classList.remove("show");
      setTimeout(() => existing.remove(), 300);
    }
  },

  resetAllData() {
    localStorage.clear();
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
    location.reload();
  },
};

window.utils = utils;
window.openModal = utils.openModal;
window.closeModal = utils.closeModal;
window.toggleDaySelector = utils.toggleDaySelector;
window.setBackground = utils.setBackground.bind(utils);
window.saveData = utils.saveData;
window.playBeep = utils.playBeep;
window.initTimePicker = utils.initTimePicker;
window.changeBackgroundInstant = utils.changeBackgroundInstant.bind(utils);
window.resetAllData = utils.resetAllData;
