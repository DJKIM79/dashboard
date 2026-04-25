const clock = {
  use24Hour: localStorage.getItem("dj_use_24hour") !== "false",
  firedMinute: "",

  getFormattedTime() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    
    if (this.use24Hour) {
      return `${String(h).padStart(2, "0")}:${m}:${s}`;
    } else {
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12;
      h = h ? h : 12; 
      return `${h}:${m}:${s}<span class="clock-ampm">${ampm}</span>`;
    }
  },

  toggleTimeFormat() {
    const timeEl = document.getElementById("clock-time");
    if (!timeEl || timeEl.classList.contains("animating")) return;
    
    timeEl.classList.add("animating");
    timeEl.style.opacity = "0";
    timeEl.style.transform = "scale(0.95)";
    
    setTimeout(() => {
      this.use24Hour = !this.use24Hour;
      localStorage.setItem("dj_use_24hour", this.use24Hour);
      timeEl.innerHTML = this.getFormattedTime();
      timeEl.style.opacity = "1";
      timeEl.style.transform = "scale(1)";
      
      setTimeout(() => {
        timeEl.classList.remove("animating");
        timeEl.style.opacity = "";
        timeEl.style.transform = "";
      }, 300);
    }, 300);
  },

  update() {
    const now = new Date();
    const displayTime = this.getFormattedTime();
    
    const clockEl = document.getElementById("clock-time");
    if (clockEl && !clockEl.classList.contains("animating")) {
      clockEl.innerHTML = displayTime;
    }
    
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${h}:${m}`;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    
    if (this.firedMinute !== timeStr) {
      this.firedMinute = timeStr;
      // Trigger other time-based updates
      if (window.calendar && window.currentCalDate) {
        if (window.currentCalDate.getFullYear() === now.getFullYear() && window.currentCalDate.getMonth() === now.getMonth()) {
          window.calendar.render();
        }
      }
      if (window.noti) {
        window.noti.check(timeStr, todayStr, now);
      }
    }
    
    if (window.noti) {
      window.noti.updateRemaining(now);
    }
  }
};

window.clock = clock;
window.toggleTimeFormat = () => clock.toggleTimeFormat();
