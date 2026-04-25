const shortcutMod = {
  items: JSON.parse(localStorage.getItem("dj_shortcuts")) || [],
  isDragging: false,

  init() {
    this.render();
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
      div.onclick = (e) =>
        this.isDragging
          ? (e.preventDefault(), (this.isDragging = false))
          : (window.location.href = url);
      div.oncontextmenu = (e) => showContextMenu(e, "shortcut", i);
      div.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=128&domain=${new URL(url).hostname}"><span>${s.name}</span>`;
      c.appendChild(div);
    });

    requestAnimationFrame(() => {
      const items = c.querySelectorAll(".shortcut-item");
      if (items.length === 0) return;
      
      let rows = 0;
      let lastTop = -1;
      items.forEach(item => {
        const top = item.offsetTop;
        if (top !== lastTop) {
          rows++;
          lastTop = top;
        }
      });

      if (rows >= 3) {
        c.classList.add("shortcut-list-view");
      } else {
        c.classList.remove("shortcut-list-view");
      }
    });

    if (window.shortcutSortable) window.shortcutSortable.destroy();
    window.shortcutSortable = new Sortable(c, {
      animation: 150,
      delay: 400,
      delayOnTouchOnly: true,
      onStart: () => (this.isDragging = true),
      onEnd: (evt) => {
        const item = this.items.splice(evt.oldIndex, 1)[0];
        this.items.splice(evt.newIndex, 0, item);
        utils.saveData();
        setTimeout(() => (this.isDragging = false), 100);
        this.render();
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
    utils.openModal("linkModal");
    setTimeout(() => document.getElementById("siteName").focus(), 50);
  },

  add() {
    const n = document.getElementById("siteName").value,
      u = document.getElementById("siteUrl").value;
    if (n && u) {
      if (window.currentShortcutIndex !== null) {
        this.items[window.currentShortcutIndex] = { name: n, url: u };
      } else {
        this.items.push({ name: n, url: u });
      }
      this.render();
      utils.saveData();
      utils.closeModal("linkModal");
    }
  },

  delete(index) {
    this.items.splice(index, 1);
    this.render();
    utils.saveData();
  }
};

window.shortcutMod = shortcutMod;
window.shortcuts = shortcutMod.items; // For backward compatibility
window.renderShortcuts = () => shortcutMod.render();
window.openLinkModal = (index) => shortcutMod.openModal(index);
window.addShortcut = () => shortcutMod.add();
