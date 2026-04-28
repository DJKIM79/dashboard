const noti = {
  items: JSON.parse(localStorage.getItem("dj_notifications")) || [],
  calendarDate: new Date(),

  init() {
    this.render();
    
    // Click outside listener for custom calendar
    window.addEventListener('click', (e) => {
      const popup = document.getElementById("noti-calendar-popup");
      const trigger = document.getElementById("notiDate");
      if (popup && popup.classList.contains("show") && !popup.contains(e.target) && e.target !== trigger) {
        popup.classList.remove("show");
      }
    });
  },

  toggleCalendar(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("noti-calendar-popup");
    if (!popup) return;
    const isShowing = popup.classList.contains("show");
    popup.classList.toggle("show", !isShowing);
    if (!isShowing) {
      const currentVal = document.getElementById("notiDate").value;
      if (currentVal) {
        const [y, m, d] = currentVal.split("-");
        this.calendarDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      } else {
        this.calendarDate = new Date();
      }
      this.renderCalendar();
    }
  },

  changeCalendarMonth(val) {
    this.calendarDate.setMonth(this.calendarDate.getMonth() + val);
    this.renderCalendar();
  },

  resetCalendarToToday() {
    this.calendarDate = new Date();
    this.renderCalendar();
  },

  selectCalendarDate(y, m, d) {
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    document.getElementById("notiDate").value = dateStr;
    document.getElementById("noti-calendar-popup").classList.remove("show");
  },

  renderCalendar() {
    const year = this.calendarDate.getFullYear(),
      month = this.calendarDate.getMonth(),
      todayDate = new Date(),
      isCurrentMonth =
        todayDate.getFullYear() === year && todayDate.getMonth() === month,
      today = todayDate.getDate();

    const monthsEn = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const monthYearEl = document.getElementById("noti-cal-month-year");
    if (monthYearEl) {
      monthYearEl.innerText =
        window.i18n && i18n.userLang === "ko"
          ? `${year}.${String(month + 1).padStart(2, "0")}`
          : `${monthsEn[month]} ${year}`;
    }

    const daysHeader = document.getElementById("noti-cal-days-header");
    if (daysHeader) {
      daysHeader.innerHTML = "";
      (window.i18n && i18n.userLang === "ko"
        ? ["일", "월", "화", "수", "목", "금", "토"]
        : ["S", "M", "T", "W", "T", "F", "S"]
      ).forEach((label, i) => {
        const div = document.createElement("div");
        div.innerText = label;
        if (i === 0) div.style.color = "#ef4444";
        if (i === 6) div.style.color = "#3b82f6";
        daysHeader.appendChild(div);
      });
    }

    const grid = document.getElementById("noti-calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay(),
      lastDate = new Date(year, month + 1, 0).getDate(),
      prevLastDate = new Date(year, month, 0).getDate();

    const createDay = (d, isOtherMonth, isToday) => {
        const div = document.createElement("div");
        div.innerText = d;
        div.style.padding = "5px";
        div.style.borderRadius = "6px";
        div.style.cursor = "pointer";
        div.style.transition = "0.2s";
        div.style.fontSize = "0.8rem";
        div.style.textAlign = "center";
        
        if (isOtherMonth) {
            div.style.opacity = "0.3";
        } else {
            if (isToday) {
                div.style.background = "var(--accent-color)";
                div.style.color = "var(--accent-contrast)";
                div.style.fontWeight = "bold";
            }
            div.onmouseover = () => { if (!isToday) div.style.background = "rgba(255,255,255,0.1)"; };
            div.onmouseout = () => { if (!isToday) div.style.background = "transparent"; };
        }
        return div;
    };

    // Prev month
    for (let i = firstDay; i > 0; i--) {
      const d = prevLastDate - i + 1;
      const div = createDay(d, true, false);
      const prevMonthDate = new Date(year, month - 1, d);
      div.onclick = (e) => {
          e.stopPropagation();
          this.selectCalendarDate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), prevMonthDate.getDate());
      };
      grid.appendChild(div);
    }
    // Current month
    for (let i = 1; i <= lastDate; i++) {
      const isToday = isCurrentMonth && i === today;
      const div = createDay(i, false, isToday);
      const dIndex = new Date(year, month, i).getDay();
      if (dIndex === 0 && !isToday) div.style.color = "#ef4444";
      if (dIndex === 6 && !isToday) div.style.color = "#3b82f6";
      div.onclick = (e) => {
          e.stopPropagation();
          this.selectCalendarDate(year, month, i);
      };
      grid.appendChild(div);
    }
    // Next month
    const totalCells = firstDay + lastDate;
    const nextDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= nextDays; i++) {
      const div = createDay(i, true, false);
      const nextMonthDate = new Date(year, month + 1, i);
      div.onclick = (e) => {
          e.stopPropagation();
          this.selectCalendarDate(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextMonthDate.getDate());
      };
      grid.appendChild(div);
    }
  },

  render() {
    const c = document.getElementById("noti-list");
    if (!c) return;
    c.innerHTML = "";
    const folder = document.getElementById("noti-folder");
    if (this.items.length > 0) {
      folder.classList.add("has-items");
    } else {
      folder.classList.remove("has-items", "open");
    }

    this.items
      .sort((a, b) => {
        const aT = a.isRepeat ? "9999-12-31" : a.date || "9999-12-31",
          bT = b.isRepeat ? "9999-12-31" : b.date || "9999-12-31";
        return aT === bT ? a.time.localeCompare(b.time) : aT.localeCompare(bT);
      })
      .forEach((n) => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.dataset.id = n.id;
        div.onclick = () => this.openModal(n.id);
        div.oncontextmenu = (e) => showContextMenu(e, "noti", n.id);
        div.innerHTML = `
          <div class="title">${n.title}</div>
          <div class="noti-info">
            <span>${n.time}</span>
            <span class="remaining">--:--</span>
          </div>
        `;
        c.appendChild(div);
      });
  },

  repeatYearOffset: 0,
  selectedRepeatYears: [],

  toggleWeekMode() {
    const mode = document.querySelector('input[name="weekMode"]:checked').value;
    document.getElementById("repeat-week-interval-container").style.display = mode === "interval" ? "grid" : "none";
    document.getElementById("repeat-week-specific-container").style.display = mode === "specific" ? "grid" : "none";
  },

  updateSelectedRepeatYears() {
    document.querySelectorAll('input[name="repeatYear"]').forEach(el => {
      const y = parseInt(el.value);
      if (el.checked && !this.selectedRepeatYears.includes(y)) {
        this.selectedRepeatYears.push(y);
      } else if (!el.checked && this.selectedRepeatYears.includes(y)) {
        this.selectedRepeatYears = this.selectedRepeatYears.filter(year => year !== y);
      }
    });
  },

  shiftRepeatYears(val) {
    this.updateSelectedRepeatYears();
    this.repeatYearOffset += val;
    this.renderRepeatYears(this.selectedRepeatYears, val);
  },

  renderRepeatYears(selectedYears = [], slideDir = 0) {
    const container = document.getElementById("repeat-years-container");
    if (!container) return;
    
    if (slideDir !== 0) {
        container.classList.remove("year-slide-left", "year-slide-right");
        void container.offsetWidth; // Trigger reflow
        container.classList.add(slideDir > 0 ? "year-slide-left" : "year-slide-right");
    }

    container.innerHTML = "";
    const baseYear = new Date().getFullYear() + (this.repeatYearOffset * 5);

    for (let i = 0; i < 5; i++) {
        const y = baseYear + i;
        const label = document.createElement("label");
        label.className = "day-check";
        label.innerHTML = `<input type="checkbox" name="repeatYear" value="${y}" ${selectedYears.includes(y) ? "checked" : ""}/><span>${y}</span>`;
        label.querySelector('input').addEventListener('change', () => this.updateSelectedRepeatYears());
        container.appendChild(label);
    }
  },

  renderRepeatMonths(selectedMonths = []) {
    const container = document.getElementById("repeat-months-container");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
        const label = document.createElement("label");
        label.className = "day-check";
        label.innerHTML = `<input type="checkbox" name="repeatMonth" value="${i}" ${selectedMonths.includes(i) ? "checked" : ""}/><span>${i}월</span>`;
        container.appendChild(label);
    }
  },

  openModal(id = null, specificDate = null) {
    window.currentEditNotiId = id;
    window.currentContextType = "noti";
    window.currentContextId = id;
    const T = i18n.langData,
      dBtn = document.getElementById("notiDelBtn"),
      sBtn = document.getElementById("notiSaveBtn");
    const now = new Date(),
      today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const n = id ? this.items.find((x) => x.id == id) : null;

    document.getElementById("notiTitle").value = n ? n.title : "";
    document.getElementById("notiDesc").value = n ? n.desc || "" : "";

    const [h, m] = n
      ? n.time.split(":")
      : [
          String(now.getHours()).padStart(2, "0"),
          String(now.getMinutes()).padStart(2, "0"),
        ];

    document.getElementById("notiHour").value = h;
    document.getElementById("notiMin").value = m;

    // Set date: priority is (existing noti date) > (specifically passed date) > (today)
    let defaultDate = today;
    if (n && n.date) defaultDate = n.date;
    else if (specificDate) defaultDate = specificDate;

    document.getElementById("notiDate").value = defaultDate;
    document.getElementById("isRepeat").checked = n ? n.isRepeat : false;

    if (window.toggleDaySelector) toggleDaySelector(n ? n.isRepeat : false);

    // Advanced Repeat Logic
    const rule = n && n.repeatRule ? n.repeatRule : {
        years: [now.getFullYear()],
        months: [now.getMonth() + 1],
        weekMode: "interval",
        weekInterval: 1,
        weekSpecific: [],
        days: n && n.days ? n.days.map(Number) : []
    };

    this.repeatYearOffset = 0;
    this.selectedRepeatYears = [...rule.years];
    this.renderRepeatYears(this.selectedRepeatYears);
    this.renderRepeatMonths(rule.months);

    document.querySelector(`input[name="weekMode"][value="${rule.weekMode}"]`).checked = true;
    this.toggleWeekMode();

    document.querySelectorAll('input[name="weekInterval"]').forEach(el => el.checked = (parseInt(el.value) === rule.weekInterval));
    document.querySelectorAll('input[name="weekSpecific"]').forEach(el => el.checked = rule.weekSpecific.includes(parseInt(el.value)));
    document.querySelectorAll('input[name="repeatDay"]').forEach(el => el.checked = rule.days.includes(parseInt(el.value)));

    document.getElementById("notiModalTitle").innerText = id
      ? T.modalNotiEdit
      : T.modalNotiAdd;
    sBtn.innerText = id ? T.btnEditNoti : T.btnAddNoti;
    sBtn.dataset.i18n = id ? "btnEditNoti" : "btnAddNoti";
    if (dBtn) dBtn.style.display = id ? "block" : "none";

    utils.closeModal("settingModal");
    utils.openModal("notiModal");
    setTimeout(() => document.getElementById("notiTitle").focus(), 50);
  },

  add() {
    this.updateSelectedRepeatYears();
    const t = document.getElementById("notiTitle").value,
      h = document.getElementById("notiHour").value,
      m = document.getElementById("notiMin").value,
      r = document.getElementById("isRepeat").checked,
      dt = document.getElementById("notiDate").value;

    const repeatRule = {
        years: this.selectedRepeatYears,
        months: Array.from(document.querySelectorAll('input[name="repeatMonth"]:checked')).map(el => parseInt(el.value)),
        weekMode: document.querySelector('input[name="weekMode"]:checked').value,
        weekInterval: parseInt(document.querySelector('input[name="weekInterval"]:checked')?.value || 1),
        weekSpecific: Array.from(document.querySelectorAll('input[name="weekSpecific"]:checked')).map(el => parseInt(el.value)),
        days: Array.from(document.querySelectorAll('input[name="repeatDay"]:checked')).map(el => parseInt(el.value))
    };

    // For backwards compatibility with older functions checking `n.days`
    const days = repeatRule.days.map(String);

    if (t) {
      const data = {
        id: window.currentEditNotiId || Date.now(),
        title: t,
        desc: document.getElementById("notiDesc").value,
        time: `${h}:${m}`,
        isRepeat: r,
        repeatRule: repeatRule,
        days: days,
        date: dt,
        createdDate: window.currentEditNotiId ? (this.items.find(x => x.id === window.currentEditNotiId)?.createdDate || dt) : dt
      };
      if (window.currentEditNotiId) {
        const idx = this.items.findIndex(
          (x) => x.id == window.currentEditNotiId,
        );
        this.items[idx] = data;
      } else {
        this.items.push(data);
      }
      window.notifications = this.items;
      this.render();
      utils.saveData();
      utils.closeModal("notiModal");
    } else {
      utils.showValidationTip("notiSaveBtn", "제목을 입력해 주세요.");
    }
  },
  delete(id = null) {
    const targetId = id || window.currentEditNotiId;
    this.items = this.items.filter((x) => x.id != targetId);
    window.notifications = this.items;
    this.render();
    utils.saveData();
    utils.closeModal("notiModal");
  },

  isMatch(n, targetDate) {
    const rule = n.repeatRule;
    if (!rule) return n.days.includes(String(targetDate.getDay()));
    
    if (rule.years.length > 0 && !rule.years.includes(targetDate.getFullYear())) return false;
    if (rule.months.length > 0 && !rule.months.includes(targetDate.getMonth() + 1)) return false;
    if (rule.days.length > 0 && !rule.days.includes(targetDate.getDay())) return false;

    if (rule.weekMode === "specific") {
      if (rule.weekSpecific.length > 0) {
        // week 1 is 1st-7th, week 2 is 8th-14th
        const weekOfMonth = Math.floor((targetDate.getDate() - 1) / 7) + 1;
        if (!rule.weekSpecific.includes(weekOfMonth)) return false;
      }
    } else if (rule.weekMode === "interval" && rule.weekInterval > 1) {
      const created = new Date(n.createdDate || n.date || Date.now());
      const startSunday = new Date(created.getFullYear(), created.getMonth(), created.getDate() - created.getDay());
      const targetSunday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() - targetDate.getDay());
      
      startSunday.setHours(0, 0, 0, 0);
      targetSunday.setHours(0, 0, 0, 0);
      
      const diffWeeks = Math.round((targetSunday - startSunday) / (24 * 60 * 60 * 1000 * 7));
      if (diffWeeks < 0 || diffWeeks % rule.weekInterval !== 0) return false;
    }
    
    return true;
  },

  getNextValidDate(n, now) {
    const [th, tm] = n.time.split(":").map(Number);
    let target = new Date(now);
    target.setHours(th, tm, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    
    if (!n.isRepeat) {
      if (n.date) {
        const [y, m, d] = n.date.split("-");
        const fixedTarget = new Date(y, m - 1, d, th, tm, 0, 0);
        if (fixedTarget <= now) return null;
        return fixedTarget;
      }
      return target;
    }
    
    // Check up to 5 years (approx 1825 days) ahead
    for (let i = 0; i <= 1825; i++) {
      if (this.isMatch(n, target)) {
        return target;
      }
      target.setDate(target.getDate() + 1);
    }
    return null;
  },

  check(timeStr, todayStr, now) {
    this.items.forEach((n, idx) => {
      let match = false;
      if (!n.isRepeat) {
          match = (n.date === todayStr);
      } else {
          match = this.isMatch(n, now);
      }

      if (match && n.time === timeStr) {
        if (Notification.permission === "granted")
          new Notification(n.title, { body: n.desc });
        utils.playBeep();
        if (!n.isRepeat) {
          this.items.splice(idx, 1);
          this.render();
          utils.saveData();
        }
      }
    });
  },

  updateRemaining(now) {
    let itemsChanged = false;
    document
      .querySelectorAll(".noti-item, .item-card[data-id]")
      .forEach((el) => {
        const n = this.items.find((x) => x.id == el.dataset.id);
        if (n) {
          const target = this.getNextValidDate(n, now);
          const rem = el.querySelector(".remaining");
          if (rem) {
            if (target) {
              const diff = target - now;
              const hTotal = Math.floor(diff / 3600000);
              const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
              const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");

              if (hTotal >= 24) {
                 const dTotal = Math.floor(hTotal / 24);
                 rem.innerText = `${dTotal}일 ${String(hTotal % 24).padStart(2, "0")}:${mm}:${ss}`;
              } else {
                 rem.innerText = `${String(hTotal).padStart(2, "0")}:${mm}:${ss}`;
              }

              if (diff >= 604800000) rem.style.color = "#22c55e"; // 1주일 이상
              else if (diff >= 86400000) rem.style.color = "#38bdf8"; // 1일~1주일
              else if (diff >= 3600000) rem.style.color = "#eab308"; // 1시간~1일
              else rem.style.color = "#ec4899"; // 1시간 미만
            } else {
              if (!n.isRepeat) {
                this.items = this.items.filter((x) => x.id != n.id);
                itemsChanged = true;
              } else {
                rem.innerText = "조건 없음";
                rem.style.color = "#94a3b8";
              }
            }
          }
        }
      });
      
      if (itemsChanged) {
          this.render();
          utils.saveData();
      }
  },
};

window.noti = noti;
window.notifications = noti.items; // For backward compatibility
window.renderNotifications = noti.render.bind(noti);
window.openNotiModal = noti.openModal.bind(noti);
window.addNotification = noti.add.bind(noti);
window.deleteCurrentNoti = noti.delete.bind(noti);
