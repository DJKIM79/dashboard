const calendar = {
  currentDate: new Date(),

  changeMonth(val) {
    this.currentDate.setMonth(this.currentDate.getMonth() + val);
    this.render();
  },

  render() {
    const year = this.currentDate.getFullYear(),
      month = this.currentDate.getMonth(),
      todayDate = new Date(),
      isCurrentMonth =
        todayDate.getFullYear() === year && todayDate.getMonth() === month,
      today = todayDate.getDate();

    const monthsEn = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthYearEl = document.getElementById("cal-month-year");
    if (monthYearEl) {
      monthYearEl.innerText =
        i18n.userLang === "ko"
          ? `${year}.${String(month + 1).padStart(2, "0")}`
          : `${monthsEn[month]} ${year}`;
    }

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

    const grid = document.getElementById("calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay(),
      lastDate = new Date(year, month + 1, 0).getDate(),
      prevLastDate = new Date(year, month, 0).getDate();

    for (let i = firstDay; i > 0; i--) {
      const div = document.createElement("div");
      div.className = "calendar-day other-month";
      div.innerText = prevLastDate - i + 1;
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
      grid.appendChild(div);
    }
    for (let i = 1; grid.children.length < 42; i++) {
      const div = document.createElement("div");
      div.className = "calendar-day other-month";
      div.innerText = i;
      grid.appendChild(div);
    }
  },
};

window.calendar = calendar;
window.currentCalDate = calendar.currentDate; // For backward compatibility
window.changeMonth = calendar.changeMonth.bind(calendar);
window.renderCalendar = calendar.render.bind(calendar);
