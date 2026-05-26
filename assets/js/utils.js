let sharedAudioCtx = null;
// 260525 21:41 Stable
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
    const engine = localStorage.getItem("dj_image_engine") || "unsplash";
    document.body.dataset.bgEngine = engine;
    
    if (engine === "none") {
      document.body.style.backgroundImage = "none";
      document.body.style.backgroundColor = "#0f172a";
      return;
    }

    let keyword = localStorage.getItem("dj_bg_keyword");
    if (keyword === null) keyword = "landscape";
    keyword = keyword.trim().replace(/\s+/g, ",");
    
    const sourceTag = engine === "unsplash" ? "unsplash" : "flickr";
    const tags = keyword ? `${keyword},${sourceTag}` : sourceTag;
    const url = `https://loremflickr.com/1920/1080/${tags}?random=${seed}`;
    document.body.style.backgroundImage = `url('${url}')`;
    document.body.style.backgroundColor = "#0f172a"; // Match 'none' background color to avoid white flash
  },
  changeBackgroundInstant() {
    const seed = Math.floor(Math.random() * 100000);
    localStorage.setItem("dj_bg_seed", seed);
    this.setBackground(seed);
  },
  initTimePicker() {
    this.renderTimeList("notiHourList", 24, "hour");
    this.renderTimeList("notiMinList", 60, "min");
    
    // Add listeners to re-render time lists when date or hour changes
    const notiDate = document.getElementById("notiDate");
    if (notiDate) {
        // We need to detect when the value is set programmatically or by the calendar
        // The calendar doesn't trigger 'change' event on the input, so we'll check in toggleTimePopup
    }
    const notiHour = document.getElementById("notiHour");
    if (notiHour) {
        notiHour.addEventListener('change', () => {
            this.renderTimeList("notiMinList", 60, "min");
        });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-time-picker')) {
        document.querySelectorAll('.time-popup').forEach(p => p.classList.remove('show'));
      }
    });
  },
  renderTimeList(containerId, count, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const notiDateVal = document.getElementById("notiDate") ? document.getElementById("notiDate").value : null;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const isToday = notiDateVal === todayStr;
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const activeLang = i18n.userLang;
    let suffix = type === "hour" ? "h" : "m";
    if (activeLang === "ko") suffix = type === "hour" ? "시" : "분";
    else if (activeLang === "ja") suffix = type === "hour" ? "時" : "分";
    else if (activeLang.startsWith("zh")) suffix = type === "hour" ? "时" : "分";
    for (let i = 0; i < count; i++) {
      if (isToday) {
          if (type === "hour" && i < currentHour) continue;
          if (type === "min") {
              const selectedHour = parseInt(document.getElementById("notiHour").value);
              if (selectedHour === currentHour && i < currentMin) continue;
          }
      }

      const val = String(i).padStart(2, "0");
      const div = document.createElement("div");
      div.className = "time-item";
      div.dataset.value = val;
      div.innerText = `${val}${suffix}`;
      div.onclick = (e) => {
        e.stopPropagation();
        this.selectTime(type, val);
      };
      container.appendChild(div);
    }
  },
  toggleTimePopup(type, e) {
    if (e) e.stopPropagation();
    const popupId = type === "hour" ? "notiHourPopup" : "notiMinPopup";
    const popup = document.getElementById(popupId);
    if (!popup) return;
    const isShowing = popup.classList.contains("show");
    document.querySelectorAll('.time-popup').forEach(p => {
      if (p.id !== popupId) p.classList.remove('show');
    });
    const calPopup = document.getElementById("noti-calendar-popup");
    if (calPopup) calPopup.classList.remove("show");
    if (!isShowing) {
      // Re-render the list to reflect current date/hour constraints
      const count = type === "hour" ? 24 : 60;
      this.renderTimeList(type === "hour" ? "notiHourList" : "notiMinList", count, type);
      
      popup.classList.add("show");
      const currentVal = document.getElementById(type === "hour" ? "notiHour" : "notiMin").value;
      this.scrollToSelected(type, currentVal);
    } else {
      popup.classList.remove("show");
    }
  },
  selectTime(type, val) {
    const displayId = type === "hour" ? "notiHourDisplay" : "notiMinDisplay";
    const inputId = type === "hour" ? "notiHour" : "notiMin";
    const popupId = type === "hour" ? "notiHourPopup" : "notiMinPopup";
    const display = document.getElementById(displayId);
    const input = document.getElementById(inputId);
    const popup = document.getElementById(popupId);
    const activeLang = i18n.userLang;
    let suffix = type === "hour" ? "h" : "m";
    if (activeLang === "ko") suffix = type === "hour" ? "시" : "분";
    else if (activeLang === "ja") suffix = type === "hour" ? "時" : "分";
    else if (activeLang.startsWith("zh")) suffix = type === "hour" ? "时" : "分";
    if (display) display.innerText = `${val}${suffix}`;
    if (input) {
      input.value = val;
      input.dispatchEvent(new Event('change'));
    }
    if (popup) popup.classList.remove("show");
    this.updateTimeSelectionUI(type, val);
  },
  updateTimeSelectionUI(type, val) {
    const listId = type === "hour" ? "notiHourList" : "notiMinList";
    const list = document.getElementById(listId);
    if (!list) return;
    list.querySelectorAll('.time-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === val);
    });
  },
  scrollToSelected(type, val) {
    const listId = type === "hour" ? "notiHourList" : "notiMinList";
    const list = document.getElementById(listId);
    if (!list) return;
    const selectedItem = list.querySelector(`.time-item[data-value="${val}"]`);
    if (selectedItem) {
      this.updateTimeSelectionUI(type, val);
      const listHeight = list.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemHeight = selectedItem.clientHeight;
      list.scrollTop = itemTop - listHeight / 2 + itemHeight / 2;
    }
  },
  toggleDaySelector(s, skipAnim = false) {
    const wrap = document.getElementById("day-selector-wrap");
    const dateInput = document.getElementById("notiDate");
    if (wrap) {
      if (skipAnim) {
        wrap.style.transition = "none";
        if (s) wrap.classList.add("show");
        else wrap.classList.remove("show");
        void wrap.offsetHeight; // force reflow
        wrap.style.transition = "";
      } else {
        if (!s) {
          wrap.classList.remove("show");
        } else {
          wrap.classList.add("show");
        }
      }
    }
    if (dateInput) {
      dateInput.style.opacity = s ? "0.3" : "1";
      dateInput.style.pointerEvents = s ? "none" : "auto";
    }
  },
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("show");
  },
  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove("show");
      // Trigger auto-save for memos to remember resized dimensions
      if (id === "memoModal" && window.memo && typeof memo.autoSave === "function") {
          memo.autoSave();
      }
    }
  },  saveData() {
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
  showValidationTip(elementId, message, type = "error", options = {}) {
    const btn = typeof elementId === "string" ? document.getElementById(elementId) : elementId;
    if (!btn) return;
    const existing = document.querySelector(".validation-tip");
    if (existing) existing.remove();
    const tip = document.createElement("div");
    tip.className = `validation-tip ${type}`;
    if (options.isHtml) tip.innerHTML = message;
    else tip.innerText = message;
    document.body.appendChild(tip);
    const rect = btn.getBoundingClientRect();
    const pos = options.position || "top";
    if (pos === "top") {
      tip.style.left = `${rect.left + rect.width / 2}px`;
      tip.style.top = `${rect.top - 10}px`;
    } else if (pos === "right") {
      tip.classList.add("pos-right");
      tip.style.left = `${rect.right + 25}px`;
      tip.style.top = `${rect.top + rect.height / 2}px`;
    } else if (pos === "left") {
      tip.classList.add("pos-left");
      tip.style.left = `${rect.left - 15}px`;
      tip.style.top = `${rect.top + rect.height / 2}px`;
    } else if (pos === "bottom") {
      tip.classList.add("pos-bottom");
      tip.style.left = `${rect.left + rect.width / 2}px`;
      tip.style.top = `${rect.bottom + 10}px`;
    }
    setTimeout(() => {
      tip.classList.add("show");
      if (!options.noAutoHide) {
        setTimeout(() => {
          if (tip.parentNode) {
            tip.classList.remove("show");
            setTimeout(() => tip.remove(), 300);
          }
        }, options.duration || 2000);
      }
    }, 10);
    return tip;
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
  renderMarkdown(text) {
    if (!text) return "";
    let html = text.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));

    // Bold, Italic, Strikethrough
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/~~(.*?)~~/g, "<del>$1</del>");

    // Code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Colors
    html = html.replace(/\{color:(.*?)\}\((.*?)\)/g, "<span style=\"color:$1\">$2</span>");

    // Headings
    html = html.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
    html = html.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
    html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="md-link">$1</a>');

    // Blockquotes (Matches escaped &gt; from earlier replacement, allows leading spaces)
    html = html.replace(/^\s*&gt; ?(.*$)/gim, "<blockquote>$1</blockquote>");
    html = html.replace(/<\/blockquote>(\r?\n)<blockquote>/g, "$1");

    // HR
    html = html.replace(/^\s*---$/gim, "<hr>");

    // Checkboxes
    html = html.replace(/^-\s+\[ \]\s+(.*$)/gim, '<li class="task-list-item"><input type="checkbox"> $1</li>');
    html = html.replace(/^-\s+\[x\]\s+(.*$)/gim, '<li class="task-list-item"><input type="checkbox" checked> $1</li>');

    // Unordered Lists
    html = html.replace(/^\s*-\s+(?!\[)(.*$)/gim, "<ul><li>$1</li></ul>");
    html = html.replace(/<\/ul>\n<ul>/g, "\n");

    // Ordered Lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, "<ol><li>$1</li></ol>");
    html = html.replace(/<\/ol>\n<ol>/g, "\n");
    
    // Tables
    const tableRegex = /^\|(?:.*\|)+\r?\n\|(?:[-: ]+[-| :]*)\|\r?\n(?:\|(?:.*\|)+(?:\r?\n|$))+/gm;
    html = html.replace(tableRegex, (match) => {
        const rows = match.trim().split(/\r?\n/);
        const header = rows[0].split('|').slice(1, -1).map(cell => `<th>${cell.trim()}</th>`).join('');
        
        let body = '';
        for (let i = 2; i < rows.length; i++) {
            const cells = rows[i].split('|').slice(1, -1).map(cell => `<td>${cell.trim()}</td>`).join('');
            body += `<tr>${cells}</tr>`;
        }
        
        return `<div class="md-table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
    });

    // Handle newlines but skip if already inside some block elements
    html = html.split('\n').map(line => {
      if (line.match(/^<(ul|ol|li|h|blockquote|div|table|thead|tbody|tr|th|td|hr)/i)) return line;
      return line + "<br />";
    }).join('\n');
    
    return html;
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
