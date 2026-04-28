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

    document.querySelectorAll(".day-check input").forEach((chk) => {
      chk.checked = n ? n.days.includes(chk.value) : false;
    });

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
    const t = document.getElementById("notiTitle").value,
      h = document.getElementById("notiHour").value,
      m = document.getElementById("notiMin").value,
      r = document.getElementById("isRepeat").checked,
      dt = document.getElementById("notiDate").value,
      days = Array.from(
        document.querySelectorAll(".day-check input:checked"),
      ).map((x) => x.value);

    if (t) {
      const data = {
        id: window.currentEditNotiId || Date.now(),
        title: t,
        desc: document.getElementById("notiDesc").value,
        time: `${h}:${m}`,
        isRepeat: r,
        days,
        date: dt,
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

  check(timeStr, todayStr, now) {
    this.items.forEach((n, idx) => {
      if (
        (n.isRepeat
          ? n.days.includes(String(now.getDay()))
          : n.date === todayStr) &&
        n.time === timeStr
      ) {
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
    document
      .querySelectorAll(".noti-item, .item-card[data-id]")
      .forEach((el) => {
        const n = this.items.find((x) => x.id == el.dataset.id);
        if (n) {
          const [th, tm] = n.time.split(":").map(Number);
          let target = new Date(now);
          target.setHours(th, tm, 0, 0);
          if (!n.isRepeat && n.date) {
            const [y, m, d] = n.date.split("-");
            target.setFullYear(y, m - 1, d);
          } else if (target <= now) target.setDate(target.getDate() + 1);

          const diff = target - now,
            rem = el.querySelector(".remaining");
          if (rem) {
            if (diff > 0) {
              const hTotal = Math.floor(diff / 3600000);
              const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(
                  2,
                  "0",
                ),
                ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
              rem.innerText = `${String(hTotal).padStart(2, "0")}:${mm}:${ss}`;

              // --- 4단계 동적 색상 로직 ---
              if (diff >= 604800000)
                rem.style.color = "#22c55e"; // 1주일 이상: 녹색
              else if (diff >= 86400000)
                rem.style.color = "#38bdf8"; // 1일~1주일: 하늘색
              else if (diff >= 3600000)
                rem.style.color = "#eab308"; // 1시간~1일: 노란색
              else rem.style.color = "#ec4899"; // 1시간 미만: 핑크색
            } else {
              // 만료된 경우: 반복 알림이 아니면 자동 삭제
              if (!n.isRepeat) {
                this.items = this.items.filter((x) => x.id != n.id);
                this.render();
                utils.saveData();
              } else {
                rem.innerText = "00:00:00";
                rem.style.color = "#94a3b8";
              }
            }
          }
        }
      });
  },
};

window.noti = noti;
window.notifications = noti.items; // For backward compatibility
window.renderNotifications = noti.render.bind(noti);
window.openNotiModal = noti.openModal.bind(noti);
window.addNotification = noti.add.bind(noti);
window.deleteCurrentNoti = noti.delete.bind(noti);
