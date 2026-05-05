const calendar = {
  currentDate: new Date(),
  isMonthSelectorOpen: false,
  init() {
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
  changeYear(val) {
    this.currentDate.setFullYear(this.currentDate.getFullYear() + val);
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
    if (this.isMonthSelectorOpen) {
      this.isMonthSelectorOpen = false;
      this.render();
      return;
    }
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
    const lang = window.i18n ? window.i18n.userLang : "en";
    const monthYearEl = document.getElementById("cal-month-year");
    if (monthYearEl) {
      if (lang.startsWith("ko")) {
        monthYearEl.innerText = `${year}.${String(month + 1).padStart(2, "0")}`;
      } else {
        monthYearEl.innerText = new Intl.DateTimeFormat(lang, { year: "numeric", month: "short" }).format(this.currentDate);
      }
    }
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
    const daysHeader = document.getElementById("cal-days-header");
    if (daysHeader) {
      daysHeader.innerHTML = "";
      const dayNames = [];
      for (let i = 0; i < 7; i++) {
        // 2023-01-01 was Sunday
        dayNames.push(new Intl.DateTimeFormat(lang, { weekday: "narrow" }).format(new Date(2023, 0, i + 1)));
      }
      dayNames.forEach((label, i) => {
        const div = document.createElement("div");
        div.innerText = label;
        if (i === 0) div.classList.add("sun");
        if (i === 6) div.classList.add("sat");
        daysHeader.appendChild(div);
      });
    }
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const firstDay = new Date(year, month, 1).getDay(),
      lastDate = new Date(year, month + 1, 0).getDate(),
      prevLastDate = new Date(year, month, 0).getDate();
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
    const year = this.currentDate.getFullYear();
    const currentMonth = this.currentDate.getMonth();
    const yearHeader = document.createElement("div");
    yearHeader.className = "month-selector-year-header";
    yearHeader.innerHTML = `
      <i class="fas fa-caret-left" onclick="calendar.changeYear(-1); event.stopPropagation();"></i>
      <span>${year}</span>
      <i class="fas fa-caret-right" onclick="calendar.changeYear(1); event.stopPropagation();"></i>
    `;
    selector.appendChild(yearHeader);
    const monthGrid = document.createElement("div");
    monthGrid.className = "month-selector-grid";
    const lang = window.i18n ? window.i18n.userLang : "en";
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(new Intl.DateTimeFormat(lang, { month: "short" }).format(new Date(2023, i, 1)));
    }
    months.forEach((m, i) => {
      const div = document.createElement("div");
      div.className = "month-item";
      if (i === currentMonth) div.classList.add("current");
      div.innerText = m;
      div.onclick = (e) => {
        e.stopPropagation();
        this.selectMonth(i);
      };
      monthGrid.appendChild(div);
    });
    selector.appendChild(monthGrid);
  },
};
window.calendar = calendar;
window.currentCalDate = calendar.currentDate;
window.changeMonth = calendar.changeMonth.bind(calendar);
window.renderCalendar = calendar.render.bind(calendar);
calendar.init();
