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
    const h = document.getElementById("notiHour"),
      m = document.getElementById("notiMin");
    if (!h || !m) return;

    const hSuffix = i18n.userLang === "ko" ? "시" : "h",
      mSuffix = i18n.userLang === "ko" ? "분" : "m";

    h.innerHTML = "";
    m.innerHTML = "";

    for (let i = 0; i < 24; i++)
      h.options.add(
        new Option(
          `${String(i).padStart(2, "0")}${hSuffix}`,
          String(i).padStart(2, "0"),
        ),
      );
    for (let i = 0; i < 60; i++)
      m.options.add(
        new Option(
          `${String(i).padStart(2, "0")}${mSuffix}`,
          String(i).padStart(2, "0"),
        ),
      );
  },

  toggleDaySelector(s) {
    const wrap = document.getElementById("day-selector-wrap");
    const dateInput = document.getElementById("notiDate");
    if (wrap) wrap.style.display = s ? "block" : "none";
    if (dateInput) dateInput.disabled = s;
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "block";
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
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

  showValidationTip(elementId, message) {
    const btn = document.getElementById(elementId);
    if (!btn) return;

    // 기존 팁 제거
    const existing = document.querySelector(".validation-tip");
    if (existing) existing.remove();

    const tip = document.createElement("div");
    tip.className = "validation-tip";
    tip.innerText = message;
    document.body.appendChild(tip);

    const rect = btn.getBoundingClientRect();
    tip.style.left = `${rect.left + rect.width / 2}px`;
    tip.style.top = `${rect.top - 10}px`;

    setTimeout(() => {
      tip.classList.add("show");
      setTimeout(() => {
        if (tip.parentNode) {
          tip.classList.remove("show");
          setTimeout(() => tip.remove(), 300);
        }
      }, 2000);
    }, 10);
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
