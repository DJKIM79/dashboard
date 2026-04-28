const noti = {
  items: JSON.parse(localStorage.getItem("dj_notifications")) || [],
  calendarDate: new Date(),
  currentCalendarTarget: "notiDate", // "notiDate" or "repeatEndDate"
  isMonthSelectorOpen: false,

  init() {
    this.render();

    // Click outside listener for custom calendar
    window.addEventListener('click', (e) => {
      const popup = document.getElementById("noti-calendar-popup");
      const trigger1 = document.getElementById("notiDate");
      const trigger2 = document.getElementById("repeatEndDate");
      if (popup && popup.classList.contains("show") && !popup.contains(e.target) && e.target !== trigger1 && e.target !== trigger2) {
        if (this.isMonthSelectorOpen) {
          this.isMonthSelectorOpen = false;
        }
        popup.classList.remove("show");
      }
    });
  },

  toggleCalendar(e, targetId = "notiDate") {
    if (e) e.stopPropagation();
    const popup = document.getElementById("noti-calendar-popup");
    if (!popup) return;

    // Close all time popups
    document.querySelectorAll('.time-popup').forEach(p => p.classList.remove('show'));

    const isShowing = popup.classList.contains("show");

    // If clicking same target, toggle. If clicking different target while open, keep open but move.
    if (isShowing && this.currentCalendarTarget === targetId) {
        this.isMonthSelectorOpen = false;
        popup.classList.remove("show");
        return;
    }

    this.currentCalendarTarget = targetId;
    const targetEl = document.getElementById(targetId);

    // Position the popup relative to the target
    const parent = targetEl.parentElement;
    if (parent && parent.contains(popup)) {
        // Already in correct parent
    } else {
        parent.appendChild(popup);
    }

    // Set position to upwards for both notiDate and repeatEndDate
    popup.style.bottom = "100%";
    popup.style.top = "auto";
    popup.style.marginTop = "0";
    popup.style.marginBottom = "5px";

    this.isMonthSelectorOpen = false;
    popup.classList.add("show");

    let currentVal = targetEl.value;
    if (currentVal && currentVal.includes("-")) {
      const [y, m, d] = currentVal.split("-");
      this.calendarDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else {
      this.calendarDate = new Date();
    }
    this.renderCalendar();
  },

  changeCalendarMonth(val) {
    const grid = document.getElementById("noti-calendar-grid");
    if (grid) {
      grid.classList.remove("slide-left", "slide-right", "pop-in");
      void grid.offsetWidth;
      grid.classList.add(val > 0 ? "slide-left" : "slide-right");
    }
    this.calendarDate.setMonth(this.calendarDate.getMonth() + val);
    this.renderCalendar();
  },

  changeCalendarYear(val) {
    this.calendarDate.setFullYear(this.calendarDate.getFullYear() + val);
    this.renderCalendar();
  },

  resetCalendarToToday() {
    const grid = document.getElementById("noti-calendar-grid");
    if (grid) {
      grid.classList.remove("slide-left", "slide-right", "pop-in");
      void grid.offsetWidth;
      grid.classList.add("pop-in");
    }
    this.calendarDate = new Date();
    this.isMonthSelectorOpen = false;
    this.renderCalendar();
  },

  handleCalendarClick(e) {
    if (this.isMonthSelectorOpen) {
      this.isMonthSelectorOpen = false;
      this.renderCalendar();
      return;
    }
    if (e.target.id === "noti-cal-month-year" || e.target.classList.contains('calendar-header-center')) {
      this.isMonthSelectorOpen = true;
      this.renderCalendar();
    }
  },

  selectCalendarMonth(monthIndex) {
    this.calendarDate.setMonth(monthIndex);
    this.isMonthSelectorOpen = false;
    this.renderCalendar();
  },

  selectCalendarDate(y, m, d) {
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const targetEl = document.getElementById(this.currentCalendarTarget);
    if (targetEl) targetEl.value = dateStr;
    document.getElementById("noti-calendar-popup").classList.remove("show");
  },

  renderCalendar() {
    const year = this.calendarDate.getFullYear(),
      month = this.calendarDate.getMonth(),
      todayDate = new Date(),
      todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()),
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

    // Month Selector
    const monthSelector = document.getElementById("noti-month-selector");
    const calendarBody = document.getElementById("noti-calendar-body");
    if (this.isMonthSelectorOpen) {
      monthSelector.classList.add("active");
      calendarBody.style.opacity = "0";
      calendarBody.style.pointerEvents = "none";
      this.renderMonthSelector();
    } else {
      monthSelector.classList.remove("active");
      calendarBody.style.opacity = "1";
      calendarBody.style.pointerEvents = "auto";
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
        if (i === 0) div.classList.add("sun");
        if (i === 6) div.classList.add("sat");
        daysHeader.appendChild(div);
      });
    }

    const grid = document.getElementById("noti-calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay(),
      lastDate = new Date(year, month + 1, 0).getDate(),
      prevLastDate = new Date(year, month, 0).getDate();

    const createDay = (d, mOffset, isToday) => {
        const div = document.createElement("div");
        div.className = "calendar-day";
        div.innerText = d;
        
        const targetDate = new Date(year, month + mOffset, d);
        const isPast = targetDate < todayStart;

        if (mOffset !== 0) div.classList.add("other-month");
        if (isToday) div.classList.add("today");
        
        const dIndex = targetDate.getDay();
        if (dIndex === 0) div.classList.add("sun");
        if (dIndex === 6) div.classList.add("sat");

        if (isPast) {
          div.style.opacity = "0.15";
          div.style.cursor = "default";
          div.style.pointerEvents = "none";
        } else {
          div.onclick = (e) => {
            e.stopPropagation();
            this.selectCalendarDate(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
          };
        }
        return div;
    };

    // Prev month
    for (let i = firstDay; i > 0; i--) {
      const d = prevLastDate - i + 1;
      grid.appendChild(createDay(d, -1, false));
    }
    // Current month
    for (let i = 1; i <= lastDate; i++) {
      const isToday = isCurrentMonth && i === today;
      grid.appendChild(createDay(i, 0, isToday));
    }
    // Next month
    for (let i = 1; grid.children.length < 42; i++) {
      grid.appendChild(createDay(i, 1, false));
    }
  },

  renderMonthSelector() {
    const selector = document.getElementById("noti-month-selector");
    if (!selector) return;
    selector.innerHTML = "";

    const year = this.calendarDate.getFullYear();
    const currentMonth = this.calendarDate.getMonth();
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();

    // Year Header
    const yearHeader = document.createElement("div");
    yearHeader.className = "month-selector-year-header";
    
    const isPastYear = year <= todayYear;
    const leftIcon = document.createElement("i");
    leftIcon.className = "fas fa-caret-left";
    if (isPastYear) {
      leftIcon.style.opacity = "0.1";
      leftIcon.style.cursor = "default";
    } else {
      leftIcon.onclick = (e) => { e.stopPropagation(); this.changeCalendarYear(-1); };
    }

    const yearSpan = document.createElement("span");
    yearSpan.innerText = year;

    const rightIcon = document.createElement("i");
    rightIcon.className = "fas fa-caret-right";
    rightIcon.onclick = (e) => { e.stopPropagation(); this.changeCalendarYear(1); };

    yearHeader.appendChild(leftIcon);
    yearHeader.appendChild(yearSpan);
    yearHeader.appendChild(rightIcon);
    selector.appendChild(yearHeader);

    // Month Grid
    const monthGrid = document.createElement("div");
    monthGrid.className = "month-selector-grid";

    const monthsKo = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const months = i18n.userLang === "ko" ? monthsKo : monthsEn;

    months.forEach((m, i) => {
      const div = document.createElement("div");
      div.className = "month-item";
      if (i === currentMonth) div.classList.add("current");
      div.innerText = m;

      const isPastMonth = year === todayYear && i < todayMonth;
      if (isPastMonth) {
        div.style.opacity = "0.15";
        div.style.cursor = "default";
        div.style.pointerEvents = "none";
      } else {
        div.onclick = (e) => {
          e.stopPropagation();
          this.selectCalendarMonth(i);
        };
      }
      monthGrid.appendChild(div);
    });

    selector.appendChild(monthGrid);
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
    if (this.repeatYearOffset + val < 0) return; // Prevent going to past years
    this.updateSelectedRepeatYears();
    this.repeatYearOffset += val;
    this.renderRepeatYears(this.selectedRepeatYears, val);
  },

  toggleAll(name) {
    const inputs = document.querySelectorAll(`input[name="${name}"]`);
    if (inputs.length === 0) return;
    const allChecked = Array.from(inputs).every(el => el.checked);
    inputs.forEach(el => el.checked = !allChecked);
    if (name === 'repeatYear') this.updateSelectedRepeatYears();
    this.updateToggleAllLabel(name);
  },

  updateToggleAllLabel(name) {
    const btn = document.getElementById(`toggle-all-${name}`);
    if (!btn) return;
    const inputs = document.querySelectorAll(`input[name="${name}"]`);
    if (inputs.length === 0) return;
    const allChecked = Array.from(inputs).every(el => el.checked);
    btn.innerText = i18n.get(allChecked ? "btnDeselectAll" : "btnSelectAll");
    btn.style.color = allChecked ? "#f97316" : "#3b82f6";
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

    // Update left chevron state
    const leftChevron = document.getElementById("repeat-year-left");
    if (leftChevron) {
      if (this.repeatYearOffset <= 0) {
        leftChevron.style.opacity = "0.2";
        leftChevron.style.cursor = "default";
        leftChevron.style.pointerEvents = "none";
      } else {
        leftChevron.style.opacity = "0.7";
        leftChevron.style.cursor = "pointer";
        leftChevron.style.pointerEvents = "auto";
      }
    }

    for (let i = 0; i < 5; i++) {
        const y = baseYear + i;
        const label = document.createElement("label");
        label.className = "day-check";
        label.innerHTML = `<input type="checkbox" name="repeatYear" value="${y}" ${selectedYears.includes(y) ? "checked" : ""}/><span>${y}</span>`;
        label.querySelector('input').addEventListener('change', () => {
          this.updateSelectedRepeatYears();
          this.updateToggleAllLabel('repeatYear');
        });
        container.appendChild(label);
    }
    this.updateToggleAllLabel('repeatYear');
  },

  renderRepeatMonths(selectedMonths = []) {
    const container = document.getElementById("repeat-months-container");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
        const label = document.createElement("label");
        label.className = "day-check";
        label.innerHTML = `<input type="checkbox" name="repeatMonth" value="${i}" ${selectedMonths.includes(i) ? "checked" : ""}/><span>${i}월</span>`;
        label.querySelector('input').addEventListener('change', () => this.updateToggleAllLabel('repeatMonth'));
        container.appendChild(label);
    }
    this.updateToggleAllLabel('repeatMonth');
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
    
    // Update custom display values
    const hSuffix = i18n.userLang === "ko" ? "시" : "h";
    const mSuffix = i18n.userLang === "ko" ? "분" : "m";
    const hDisplay = document.getElementById("notiHourDisplay");
    const mDisplay = document.getElementById("notiMinDisplay");
    if (hDisplay) hDisplay.innerText = `${h}${hSuffix}`;
    if (mDisplay) mDisplay.innerText = `${m}${mSuffix}`;

    // Set date: priority is (existing noti date) > (specifically passed date) > (today)
    let defaultDate = today;
    if (n && n.date) defaultDate = n.date;
    else if (specificDate) defaultDate = specificDate;

    document.getElementById("notiDate").value = defaultDate;
    document.getElementById("isRepeat").checked = n ? n.isRepeat : false;

    if (window.toggleDaySelector) toggleDaySelector(n ? n.isRepeat : false);

    // Advanced Repeat Logic
    const rule = n && n.repeatRule ? n.repeatRule : {
        years: [],
        months: [],
        weekSpecific: [],
        days: [],
        endDate: ""
    };

    this.repeatYearOffset = 0;
    this.selectedRepeatYears = [...rule.years];
    this.renderRepeatYears(this.selectedRepeatYears);
    this.renderRepeatMonths(rule.months);

    document.querySelectorAll('input[name="weekSpecific"]').forEach(el => el.checked = rule.weekSpecific.includes(parseInt(el.value)));
    document.querySelectorAll('input[name="repeatDay"]').forEach(el => el.checked = rule.days.includes(parseInt(el.value)));
    
    this.updateToggleAllLabel('repeatDay');
    this.updateToggleAllLabel('weekSpecific');
    
    document.getElementById("repeatEndDate").value = rule.endDate || "(종료일 없음)";

    document.getElementById("notiModalTitle").innerText = id
      ? T.modalNotiEdit
      : T.modalNotiAdd;
    sBtn.innerText = id ? T.btnEditNoti : T.btnAddNoti;
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

    const rawEndDate = document.getElementById("repeatEndDate").value;
    const repeatRule = {
        years: this.selectedRepeatYears,
        months: Array.from(document.querySelectorAll('input[name="repeatMonth"]:checked')).map(el => parseInt(el.value)),
        weekSpecific: Array.from(document.querySelectorAll('input[name="weekSpecific"]:checked')).map(el => parseInt(el.value)),
        days: Array.from(document.querySelectorAll('input[name="repeatDay"]:checked')).map(el => parseInt(el.value)),
        endDate: rawEndDate === "(종료일 없음)" ? "" : rawEndDate
    };

    // For backwards compatibility with older functions checking `n.days`
    const days = repeatRule.days.map(String);

    if (t) {
      if (r) {
        if (repeatRule.days.length === 0) {
            return utils.showValidationTip("notiSaveBtn", "반복할 요일을 선택해 주세요.");
        }
        if (repeatRule.weekSpecific.length === 0) {
            return utils.showValidationTip("notiSaveBtn", "반복할 주차를 선택해 주세요.");
        }
        if (repeatRule.months.length === 0) {
            return utils.showValidationTip("notiSaveBtn", "반복할 월을 선택해 주세요.");
        }
        if (repeatRule.years.length === 0) {
            return utils.showValidationTip("notiSaveBtn", "반복할 년도를 선택해 주세요.");
        }
      }

      const data = {
        id: window.currentEditNotiId || Date.now(),
        title: t,
        desc: document.getElementById("notiDesc").value,
        time: `${h}:${m}`,
        isRepeat: r,
        repeatRule: r ? repeatRule : null,
        days: r ? days : [],
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
    if (!rule) {
        if (!n.days || n.days.length === 0) return false;
        return n.days.includes(String(targetDate.getDay()));
    }
    
    if (rule.years.length > 0 && !rule.years.includes(targetDate.getFullYear())) return false;
    if (rule.months.length > 0 && !rule.months.includes(targetDate.getMonth() + 1)) return false;
    if (rule.days.length > 0 && !rule.days.includes(targetDate.getDay())) return false;

    if (rule.weekSpecific && rule.weekSpecific.length > 0) {
      // week 1 is 1st-7th, week 2 is 8th-14th
      const weekOfMonth = Math.floor((targetDate.getDate() - 1) / 7) + 1;
      const lastDateOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      const isLastWeek = (targetDate.getDate() + 7 > lastDateOfMonth);
      
      const match = rule.weekSpecific.includes(weekOfMonth) || (rule.weekSpecific.includes(9) && isLastWeek);
      if (!match) return false;
    }

    if (rule.excludeDates && rule.excludeDates.length > 0) {
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
        if (rule.excludeDates.includes(dateStr)) return false;
    }

    if (rule.endDate) {
        const targetStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
        if (targetStr > rule.endDate) return false;
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
