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

    const itemCount = this.items.length;
    if (itemCount === 0) {
      c.classList.remove("shortcut-list-view");
      return;
    }

    // 1. Get container position and available width
    const rect = c.getBoundingClientRect();
    const containerTop = rect.top > 0 ? rect.top : 450; // Fallback to 450 if not yet rendered
    
    // Get actual padding to calculate usable width for items
    const style = window.getComputedStyle(c);
    const paddingLeft = parseFloat(style.paddingLeft) || 50;
    const paddingRight = parseFloat(style.paddingRight) || 50;
    const containerWidth = (c.offsetWidth || window.innerWidth - 100);
    const availableWidth = containerWidth - paddingLeft - paddingRight;
    
    const itemWidth = 140;
    const gap = 15;
    
    // 2. Calculate how many rows are needed in "Square (Grid)" mode
    const itemsPerRow = Math.max(1, Math.floor((availableWidth + gap) / (itemWidth + gap)));
    const rowCount = Math.ceil(itemCount / itemsPerRow);
    
    // 3. Estimate absolute bottom position of the square grid
    // item height 105px, gap 15px
    const squareGridHeight = rowCount * 105 + (rowCount - 1) * gap;
    const absoluteBottom = containerTop + squareGridHeight;
    
    // 4. Threshold: avoid fixed widgets (allow them to get closer)
    const threshold = window.innerHeight - 120;
    
    // 5. Decision: use list-view if it overflows the threshold OR window is very short
    const needsListView = absoluteBottom > threshold || window.innerHeight < 500;

    // 6. Apply class only if state changed
    const isCurrentlyList = c.classList.contains("shortcut-list-view");
    if (needsListView !== isCurrentlyList) {
      if (needsListView) c.classList.add("shortcut-list-view");
      else c.classList.remove("shortcut-list-view");
    }
  },

  render() {
    const c = document.getElementById("shortcut-container");
    if (!c) return;
    
    c.classList.add("grid-layout");
    
    // Decide layout state FIRST before updating DOM content
    this.checkLayout();

    // Now update the content - if state didn't change, no layout jump occurs
    c.innerHTML = "";
    
    this.items.forEach((s, i) => {
      const url = s.url.startsWith("http") ? s.url : `http://${s.url}`,
        div = document.createElement("a");
      div.className = "shortcut-item";
      div.onclick = (e) =>
        this.isDragging
          ? (e.preventDefault(), (this.isDragging = false))
          : (window.location.href = url);
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

    if (!this.resizeListenerAdded) {
      window.addEventListener("resize", () => {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.render(), 100);
      });
      this.resizeListenerAdded = true;
    }

    if (window.shortcutSortable) window.shortcutSortable.destroy();
    window.shortcutSortable = new Sortable(c, {
      animation: 150,
      ghostClass: "shortcut-ghost",
      forceFallback: false, // 브라우저 기본 드래그 사용 (붕 뜨는 현상 방지)
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
          // 정렬 완료 후 레이아웃 재확인 (불필요한 전환 방지)
          this.checkLayout();
          this.render(); 
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
