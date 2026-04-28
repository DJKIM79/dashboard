const shortcutMod = {
  items: JSON.parse(localStorage.getItem("dj_shortcuts")) || [],
  isDragging: false,
  resizeListenerAdded: false,

  init() {
    this.render();
  },

  // Atomic layout decision without DOM flickering
  checkLayout() {
    const c = document.getElementById("shortcut-container");
    if (!c) return;

    // Use requestAnimationFrame to wait for DOM stability, 
    // then a small timeout to account for CSS transitions.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const itemCount = this.items.length;
        if (itemCount === 0) {
          c.classList.remove("shortcut-list-view");
          return;
        }

        // 1. Get container's absolute position from the top of the document
        // offsetTop is more reliable than getBoundingClientRect for absolute document positioning
        const containerTop = c.offsetTop || 400; 
        
        // 2. Calculate usable width
        const containerWidth = c.offsetWidth || (window.innerWidth - 100);
        const style = window.getComputedStyle(c);
        const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) || 100;
        const availableWidth = containerWidth - paddingX;
        
        const itemWidth = 140;
        const gap = 15;
        
        // 3. Calculate rows and estimated height in Square mode
        const itemsPerRow = Math.max(1, Math.floor((availableWidth + gap) / (itemWidth + gap)));
        const rowCount = Math.ceil(itemCount / itemsPerRow);
        
        // Get the current scale factor from CSS variable
        const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--widget-scale')) || 1;
        
        // Estimated height considering the transform scale (Square item height is 84px)
        const squareGridHeight = (rowCount * 84 + (rowCount - 1) * gap) * scale;
        
        // 4. Decision: Does the grid exceed the visible viewport?
        // Subtract window.scrollY to get position relative to current view
        const absoluteBottom = containerTop + squareGridHeight - window.scrollY;
        
        // Threshold: allow shortcuts to get closer to the bottom (100px buffer)
        const threshold = window.innerHeight - 100;
        
        const needsListView = absoluteBottom > threshold || window.innerHeight < 450;

        // 5. Apply class only if state changed
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
    
    // Pre-calculate layout state before clearing DOM
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
      // Add scroll listener to update layout as user scrolls
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
          // After reordering, check layout again to see if it still fits
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
      // 메모/알림과 동일한 풍선 경고창 적용
      if (!n) {
        utils.showValidationTip("linkSaveBtn", "이름을 입력해 주세요.");
      } else if (!u) {
        utils.showValidationTip("linkSaveBtn", "URL을 입력해 주세요.");
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
