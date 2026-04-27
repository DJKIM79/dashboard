const calendar = {
  currentDate: new Date(),
  isMonthSelectorOpen: false,

  init() {
    // Listen for clicks outside the calendar to close month selector
    window.addEventListener('click', (e) => {
      const container = document.getElementById("calendar-container");
      if (this.isMonthSelectorOpen && container && !container.contains(e.target)) {
        this.isMonthSelectorOpen = false;
        this.render();
      }
    });
  },

  changeMonth(val) {
    const grid = document.getElementById("calendar-grid");
    if (grid) {
      grid.classList.remove("slide-left", "slide-right", "pop-in");
      void grid.offsetWidth; // Trigger reflow
      grid.classList.add(val > 0 ? "slide-left" : "slide-right");
    }

    this.currentDate.setMonth(this.currentDate.getMonth() + val);
    this.render();
  },

  resetToToday() {
    const grid = document.getElementById("calendar-grid");
    if (grid) {
      grid.classList.remove("slide-left", "slide-right", "pop-in");
      void grid.offsetWidth; // Trigger reflow
      grid.classList.add("pop-in");
    }
    this.currentDate = new Date();
    this.isMonthSelectorOpen = false;
    this.render();
  },

  handleWidgetClick(e) {
    // If month selector is open, any click inside (that didn't stop propagation) closes it
    if (this.isMonthSelectorOpen) {
      this.isMonthSelectorOpen = false;
      this.render();
      return;
    }

    // Trigger month selector only when clicking the title area or empty spaces (not arrows/days)
    if (e.target.id === "cal-month-year" || e.target.classList.contains('calendar-header-center')) {
      this.isMonthSelectorOpen = true;
      this.render();
    }
  },

  selectMonth(monthIndex) {
    this.currentDate.setMonth(monthIndex);
    this.isMonthSelectorOpen = false;
    this.render();
  },
  
  addAlarmFromDate(y, m, d) {
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (window.noti) {
      window.noti.openModal(null, dateStr);
    }
  },

  render() {
    const year = this.currentDate.getFullYear(),
      month = this.currentDate.getMonth(),
      todayDate = new Date(),
      isCurrentMonth =
        todayDate.getFullYear() === year && todayDate.getMonth() === month,
      today = todayDate.getDate();

    const monthsEn = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // Update Header
    const monthYearEl = document.getElementById("cal-month-year");
    if (monthYearEl) {
      monthYearEl.innerText =
        i18n.userLang === "ko"
          ? `${year}.${String(month + 1).padStart(2, "0")}`
          : `${monthsEn[month]} ${year}`;
    }

    // Toggle Month Selector View
    const monthSelector = document.getElementById("month-selector");
    const calendarBody = document.getElementById("calendar-body");

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

    // Render Days Header
    const daysHeader = document.getElementById("cal-days-header");
    if (daysHeader) {
      daysHeader.innerHTML = "";
      (i18n.userLang === "ko"
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

    // Render Grid
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay(),
      lastDate = new Date(year, month + 1, 0).getDate(),
      prevLastDate = new Date(year, month, 0).getDate();

    // Previous month days
    for (let i = firstDay; i > 0; i--) {
      const div = document.createElement("div");
      div.className = "calendar-day other-month";
      const d = prevLastDate - i + 1;
      div.innerText = d;
      const prevMonthDate = new Date(year, month - 1, d);
      div.onclick = (e) => {
          e.stopPropagation();
          this.addAlarmFromDate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), prevMonthDate.getDate());
      };
      grid.appendChild(div);
    }
    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const div = document.createElement("div");
      div.className = "calendar-day";
      div.innerText = i;
      const d = new Date(year, month, i).getDay();
      if (d === 0) div.classList.add("sun");
      if (d === 6) div.classList.add("sat");
      if (isCurrentMonth && i === today) div.classList.add("today");
      div.onclick = (e) => {
          e.stopPropagation();
          this.addAlarmFromDate(year, month, i);
      };
      grid.appendChild(div);
    }
    // Next month days
    for (let i = 1; grid.children.length < 42; i++) {
      const div = document.createElement("div");
      div.className = "calendar-day other-month";
      div.innerText = i;
      const nextMonthDate = new Date(year, month + 1, i);
      div.onclick = (e) => {
          e.stopPropagation();
          this.addAlarmFromDate(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextMonthDate.getDate());
      };
      grid.appendChild(div);
    }
  },

  renderMonthSelector() {
    const selector = document.getElementById("month-selector");
    if (!selector) return;
    selector.innerHTML = "";

    const monthsKo = [
      "1월", "2월", "3월", "4월", "5월", "6월",
      "7월", "8월", "9월", "10월", "11월", "12월",
    ];
    const monthsEn = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const months = i18n.userLang === "ko" ? monthsKo : monthsEn;
    const currentMonth = this.currentDate.getMonth();

    months.forEach((m, i) => {
      const div = document.createElement("div");
      div.className = "month-item";
      if (i === currentMonth) div.classList.add("current");
      div.innerText = m;
      div.onclick = (e) => {
        e.stopPropagation();
        this.selectMonth(i);
      };
      selector.appendChild(div);
    });
  },
};

window.calendar = calendar;
window.currentCalDate = calendar.currentDate;
window.changeMonth = calendar.changeMonth.bind(calendar);
window.renderCalendar = calendar.render.bind(calendar);
calendar.init();
