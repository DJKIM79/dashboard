const utils = {
  playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(),
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.start();
    setTimeout(() => osc.stop(), 150);
  },

  setBackground(seed) {
    const keyword = (
      localStorage.getItem("dj_bg_keyword") || "landscape"
    ).replace(/\s+/g, ",");
    document.body.style.backgroundImage = `url('https://loremflickr.com/1920/1080/${keyword}?random=${seed}')`;
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
        )
      );
    for (let i = 0; i < 60; i++)
      m.options.add(
        new Option(
          `${String(i).padStart(2, "0")}${mSuffix}`,
          String(i).padStart(2, "0"),
        )
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
    if (window.shortcutMod) localStorage.setItem("dj_shortcuts", JSON.stringify(shortcutMod.items));
    if (window.noti) localStorage.setItem("dj_notifications", JSON.stringify(noti.items));
    if (window.memo) localStorage.setItem("dj_memos", JSON.stringify(memo.items));
    if (window.weather) localStorage.setItem("dj_weather_locations", JSON.stringify(weather.locations));
  }
};

window.utils = utils;
window.openModal = utils.openModal;
window.closeModal = utils.closeModal;
window.toggleDaySelector = (s) => utils.toggleDaySelector(s);
window.setBackground = (seed) => utils.setBackground(seed);
window.saveData = () => utils.saveData();
window.playBeep = () => utils.playBeep();
window.initTimePicker = () => utils.initTimePicker();
window.changeBackgroundInstant = () => utils.changeBackgroundInstant();
