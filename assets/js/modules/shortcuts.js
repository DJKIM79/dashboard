const shortcutMod = {
  items: JSON.parse(localStorage.getItem("dj_shortcuts")) || [],
  isDragging: false,
  resizeListenerAdded: false,

  init() {
    this.render();
  },

  checkLayout() {
    const c = document.getElementById("shortcut-container");
    if (!c) return;
    
    // Reset first to measure original height
    c.classList.remove("shortcut-list-view");
    
    const items = c.querySelectorAll(".shortcut-item");
    if (items.length === 0) return;
    
    // Check if the bottom of the last item exceeds 85% of window height
    const lastItem = items[items.length - 1];
    const rect = lastItem.getBoundingClientRect();
    const threshold = window.innerHeight * 0.85;

    if (rect.bottom > threshold) {
      c.classList.add("shortcut-list-view");
    }
  },

  render() {
    const c = document.getElementById("shortcut-container");
    if (!c) return;
    c.innerHTML = "";
    c.className = "grid-layout";
    
    this.items.forEach((s, i) => {
      const url = s.url.startsWith("http") ? s.url : `http://${s.url}`,
        div = document.createElement("a");
      div.className = "shortcut-item";
      div.onclick = (e) => this.isDragging ? (e.preventDefault(), (this.isDragging = false)) : (window.location.href = url);
      div.oncontextmenu = (e) => showContextMenu(e, "shortcut", i);
      
      div.innerHTML = `
        <div class="shortcut-icon-wrapper">
          <img src="https://www.google.com/s2/favicons?sz=128&domain=${new URL(url).hostname}" 
               class="shortcut-img"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'; this.parentElement.classList.add('no-favicon')">
          <div class="shortcut-default-icon" style="display: none;"><i class="fas fa-link"></i></div>
        </div>
        <span>${s.name}</span>
      `;
      c.appendChild(div);
    });

    requestAnimationFrame(() => this.checkLayout());

    if (!this.resizeListenerAdded) {
      window.addEventListener("resize", () => {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.checkLayout(), 200);
      });
      this.resizeListenerAdded = true;
    }

    if (window.shortcutSortable) window.shortcutSortable.destroy();
    window.shortcutSortable = new Sortable(c, {
      animation: 250, 
      ghostClass: "shortcut-ghost",
      chosenClass: "shortcut-chosen",
      dragClass: "shortcut-drag",
      forceFallback: true, 
      onStart: () => { this.isDragging = true; c.classList.add("sorting-active"); },
      onEnd: (evt) => {
        setTimeout(() => (this.isDragging = false), 100);
        c.classList.remove("sorting-active");
        if (evt.oldIndex !== evt.newIndex) {
          const item = this.items.splice(evt.oldIndex, 1)[0];
          this.items.splice(evt.newIndex, 0, item);
          utils.saveData();
          this.checkLayout();
        }
      },
    });
  },

  openModal(index = null) {
    window.currentShortcutIndex = index;
    const T = i18n.langData, isEdit = index !== null;
    document.getElementById("siteName").value = isEdit ? this.items[index].name : "";
    document.getElementById("siteUrl").value = isEdit ? this.items[index].url : "";
    document.getElementById("linkModalTitle").innerText = isEdit ? T.modalLinkEdit : T.modalLinkAdd;
    document.getElementById("linkSaveBtn").innerText = isEdit ? T.btnEdit : T.btnSave;
    utils.closeModal("settingModal");
    utils.openModal("linkModal");
    setTimeout(() => document.getElementById("siteName").focus(), 50);
  },

  add() {
    const n = document.getElementById("siteName").value,
      u = document.getElementById("siteUrl").value;
    if (n && u) {
      if (window.currentShortcutIndex !== null)
        this.items[window.currentShortcutIndex] = { name: n, url: u };
      else this.items.push({ name: n, url: u });
      window.shortcuts = this.items;
      this.render();
      utils.saveData();
      utils.closeModal("linkModal");
    } else {
      // 메모/알림과 동일한 풍선 경고창 적용
      if (!n) {
        utils.showValidationTip("linkSaveBtn", "이름을 입력해 주세요.");
      } else if (!u) {
        utils.showValidationTip("linkSaveBtn", "URL을 입력해 주세요.");
      }
    }
  },

  delete(index) { this.items.splice(index, 1); this.render(); utils.saveData(); }
};

window.shortcutMod = shortcutMod;
window.shortcuts = shortcutMod.items;
window.renderShortcuts = () => shortcutMod.render();
window.openLinkModal = (index) => shortcutMod.openModal(index);
window.addShortcut = () => shortcutMod.add();
