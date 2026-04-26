const clock = {
  is24Hour: localStorage.getItem("dj_clock_24h") !== "false",
  lastTimeStr: "",
  initialized: false,

  init() {
    this.renderContainer();
    this.initialized = true;
    this.update(true);
  },

  renderContainer() {
    const timeEl = document.getElementById("clock-time");
    if (!timeEl) return;

    timeEl.innerHTML = `
      ${this.createDigitGroup("h1")}${this.createDigitGroup("h2")}
      <span class="clock-separator">:</span>
      ${this.createDigitGroup("m1")}${this.createDigitGroup("m2")}
      <span class="clock-separator">:</span>
      ${this.createDigitGroup("s1")}${this.createDigitGroup("s2")}
      <span id="clock-ampm-container"></span>
    `;
  },

  createDigitGroup(id) {
    // 무한 롤링 느낌을 위해 0-9 뒤에 다시 0을 하나 더 추가 (0-1-2-3-4-5-6-7-8-9-0)
    let digits = "";
    for (let i = 0; i <= 9; i++) {
      digits += `<div class="clock-digit">${i}</div>`;
    }
    digits += `<div class="clock-digit">0</div>`; // 9 다음의 0

    return `
      <div class="clock-digit-group">
        <div id="digit-${id}" class="clock-digit-strip">
          ${digits}
        </div>
      </div>
    `;
  },

  toggleFormat() {
    const timeEl = document.getElementById("clock-time");
    if (timeEl) timeEl.classList.add("animating");

    setTimeout(() => {
      this.is24Hour = !this.is24Hour;
      localStorage.setItem("dj_clock_24h", this.is24Hour);
      this.update(true);

      setTimeout(() => {
        if (timeEl) timeEl.classList.remove("animating");
      }, 300);
    }, 300);
  },

  update(force = false) {
    const timeEl = document.getElementById("clock-time");
    if (timeEl && timeEl.classList.contains("animating") && !force) return;

    if (!this.initialized && !force) {
      this.init();
      return;
    }

    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    let ampm = "";
    if (!this.is24Hour) {
      ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
    }

    let hStr = h.toString();
    // 12시간제일 때 앞자리 0 제거 (05시 -> 5시)
    if (!this.is24Hour && hStr.length === 1) {
      hStr = " " + hStr; // 한 자릿수일 때 앞에 공백 추가 (자리 맞춤용)
    } else {
      hStr = hStr.padStart(2, "0");
    }

    const timeStr =
      hStr + m.toString().padStart(2, "0") + s.toString().padStart(2, "0");

    if (force || timeStr !== this.lastTimeStr) {
      if (!document.getElementById("digit-h1")) this.renderContainer();

      for (let i = 0; i < 6; i++) {
        const id = ["h1", "h2", "m1", "m2", "s1", "s2"][i];
        const val = timeStr[i];

        const elGroup = document.getElementById(`digit-${id}`)?.parentElement;
        if (id === "h1") {
          // 12시간제에서 앞자리가 공백이면 숨김 처리
          if (val === " ") {
            if (elGroup) elGroup.style.display = "none";
          } else {
            if (elGroup) elGroup.style.display = "flex";
            this.animateDigit(id, val);
          }
        } else {
          this.animateDigit(id, val);
        }
      }

      this.updateAMPM(ampm);
      this.lastTimeStr = timeStr;
    }
  },

  animateDigit(id, value) {
    const el = document.getElementById(`digit-${id}`);
    if (!el) return;

    const newValue = parseInt(value);
    const lastValue = parseInt(
      this.lastTimeStr[["h1", "h2", "m1", "m2", "s1", "s2"].indexOf(id)] || "0",
    );

    // 9에서 0으로 넘어가는 특수 상황 처리
    if (lastValue === 9 && newValue === 0) {
      // 1. 우선 10번째 위치(추가된 0)로 부드럽게 이동
      el.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.transform = `translateY(-${10 * 1.2}em)`;

      // 2. 애니메이션 완료 후, 몰래 첫 번째 0 위치로 순간 이동
      setTimeout(() => {
        el.style.transition = "none";
        el.style.transform = `translateY(0)`;
      }, 650);
    } else {
      // 일반적인 이동 (0->1, 1->2 등)
      el.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.transform = `translateY(-${newValue * 1.2}em)`;
    }
  },

  updateAMPM(text) {
    const container = document.getElementById("clock-ampm-container");
    if (!container) return;
    if (text) {
      const cls = text.toLowerCase(); // am 또는 pm
      container.innerHTML = `<span class="clock-ampm ${cls}">${text}</span>`;
      container.style.display = "flex";
      container.style.alignItems = "center";
    } else {
      container.innerHTML = "";
      container.style.display = "none";
    }
  },
};

window.clock = clock;
window.toggleTimeFormat = clock.toggleFormat.bind(clock);
