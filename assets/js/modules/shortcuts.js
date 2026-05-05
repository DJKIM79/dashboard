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
    requestAnimationFrame(() => {
      setTimeout(() => {
        const itemCount = this.items.length;
        if (itemCount === 0) {
          c.classList.remove("shortcut-list-view");
          return;
        }
        const containerTop = c.offsetTop || 400; 
        const containerWidth = c.offsetWidth || (window.innerWidth - 100);
        const style = window.getComputedStyle(c);
        const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) || 100;
        const availableWidth = containerWidth - paddingX;
        const itemWidth = 140;
        const gap = 15;
        const itemsPerRow = Math.max(1, Math.floor((availableWidth + gap) / (itemWidth + gap)));
        const rowCount = Math.ceil(itemCount / itemsPerRow);
        const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--widget-scale')) || 1;
        const squareGridHeight = (rowCount * 84 + (rowCount - 1) * gap) * scale;
        const absoluteBottom = containerTop + squareGridHeight - window.scrollY;
        const threshold = window.innerHeight - 100;
        const needsListView = absoluteBottom > threshold || window.innerHeight < 450;
        const isCurrentlyList = c.classList.contains("shortcut-list-view");
        if (needsListView !== isCurrentlyList) {
          if (needsListView) c.classList.add("shortcut-list-view");
          else c.classList.remove("shortcut-list-view");
        }
      }, 100);
    });
  },
  render() {
    const c = document.getElementById("shortcut-container");
    if (!c) return;
    c.classList.add("grid-layout");
    this.checkLayout();
    c.innerHTML = "";
    this.items.forEach((s, i) => {
      let hostname = "";
      const finalUrl = s.url.startsWith("http") ? s.url : `http://${s.url}`;
      try {
        hostname = new URL(finalUrl).hostname;
      } catch (e) {
        hostname = s.url;
      }
      const div = document.createElement("a");
      div.className = "shortcut-item";
      div.onclick = (e) =>
        this.isDragging
          ? (e.preventDefault(), (this.isDragging = false))
          : window.open(finalUrl, "_blank");
      div.oncontextmenu = (e) => showContextMenu(e, "shortcut", i);
      div.innerHTML = `
        <div class="shortcut-icon-wrapper">
          <img src="https://icons.duckduckgo.com/ip3/${hostname}.ico" 
               class="shortcut-img"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="shortcut-default-icon" style="display: none;"><i class="fas fa-link"></i></div>
        </div>
        <span>${s.name}</span>
      `;
      c.appendChild(div);
    });
    if (!this.resizeListenerAdded) {
      window.addEventListener("resize", () => {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.checkLayout(), 150);
      });
      window.addEventListener("scroll", () => {
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => this.checkLayout(), 100);
      });
      this.resizeListenerAdded = true;
    }
    if (window.shortcutSortable) window.shortcutSortable.destroy();
    window.shortcutSortable = new Sortable(c, {
      animation: 150,
      ghostClass: "shortcut-ghost",
      chosenClass: "sortable-chosen",
      forceFallback: false,
      onStart: () => {
        this.isDragging = true;
        c.classList.add("sorting-active");
      },
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
    const T = i18n.langData,
      isEdit = index !== null;
    document.getElementById("siteName").value = isEdit
      ? this.items[index].name
      : "";
    document.getElementById("siteUrl").value = isEdit
      ? this.items[index].url
      : "";
    document.getElementById("linkModalTitle").innerText = isEdit
      ? T.modalLinkEdit
      : T.modalLinkAdd;
    document.getElementById("linkSaveBtn").innerText = isEdit
      ? T.btnEdit
      : T.btnSave;
    const dBtn = document.getElementById("linkDelBtn");
    if (dBtn) dBtn.style.display = isEdit ? "block" : "none";
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
      if (!n) {
        utils.showValidationTip("linkSaveBtn", i18n.get("msgInputName"));
      } else if (!u) {
        utils.showValidationTip("linkSaveBtn", i18n.get("msgInputUrl"));
      }
    }
  },
  delete(index) {
    this.items.splice(index, 1);
    this.render();
    utils.saveData();
  },
};
window.shortcutMod = shortcutMod;
window.shortcuts = shortcutMod.items;
window.renderShortcuts = shortcutMod.render.bind(shortcutMod);
window.openLinkModal = shortcutMod.openModal.bind(shortcutMod);
window.addShortcut = shortcutMod.add.bind(shortcutMod);
