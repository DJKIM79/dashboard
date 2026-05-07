const shortcutMod = {
  items: JSON.parse(localStorage.getItem("dj_shortcuts")) || [],
  isDragging: false,
  resizeListenerAdded: false,
  popularIcons: [
    // Essentials
    "fa-home", "fa-star", "fa-heart", "fa-search", "fa-user", "fa-gear", "fa-bell", "fa-envelope",
    "fa-camera", "fa-video", "fa-music", "fa-gamepad", "fa-tv", "fa-laptop", "fa-mobile", "fa-print",
    "fa-globe", "fa-location-dot", "fa-map", "fa-calendar", "fa-clock", "fa-folder", "fa-file", "fa-link",
    "fa-paper-plane", "fa-shopping-cart", "fa-credit-card", "fa-wallet", "fa-bank", "fa-chart-line", "fa-code", "fa-terminal",
    "fa-cloud", "fa-bolt", "fa-sun", "fa-moon", "fa-snowflake", "fa-wind", "fa-water", "fa-fire",
    "fa-plus", "fa-minus", "fa-check", "fa-xmark", "fa-info", "fa-question", "fa-exclamation", "fa-trash",
    "fa-eye", "fa-lock", "fa-unlock", "fa-key", "fa-shield", "fa-bookmark", "fa-flag", "fa-tag",
    
    // Communication & Social
    "fa-comment", "fa-comments", "fa-message", "fa-hashtag", "fa-at", "fa-share-nodes", "fa-rss", "fa-broadcast-tower",
    "fa-phone", "fa-headset", "fa-microphone", "fa-video-slash", "fa-envelope-open", "fa-paperclip", "fa-inbox", "fa-outbox",
    "fa-google", "fa-facebook", "fa-twitter", "fa-instagram", "fa-youtube", "fa-github", "fa-discord", "fa-slack",
    "fa-linkedin", "fa-twitch", "fa-reddit", "fa-tiktok", "fa-whatsapp", "fa-telegram", "fa-medium", "fa-pinterest",
    "fa-apple", "fa-windows", "fa-android", "fa-linux", "fa-chrome", "fa-firefox", "fa-edge", "fa-safari",

    // Business & Office
    "fa-briefcase", "fa-chart-pie", "fa-chart-bar", "fa-chart-area", "fa-calculator", "fa-compass", "fa-pen-nib", "fa-marker",
    "fa-pen", "fa-pencil", "fa-eraser", "fa-paste", "fa-copy", "fa-scissors", "fa-file-lines", "fa-file-pdf",
    "fa-file-excel", "fa-file-word", "fa-file-powerpoint", "fa-file-code", "fa-file-archive", "fa-file-image", "fa-database", "fa-server",
    "fa-cube", "fa-cubes", "fa-network-wired", "fa-microchip", "fa-hard-drive", "fa-sd-card", "fa-sim-card", "fa-wifi",

    // Media & Entertainment
    "fa-play", "fa-pause", "fa-stop", "fa-forward", "fa-backward", "fa-eject", "fa-volume-high", "fa-volume-low",
    "fa-volume-off", "fa-volume-xmark", "fa-headphones", "fa-radio", "fa-compact-disc", "fa-ticket", "fa-film", "fa-clapperboard",
    "fa-camera-retro", "fa-image", "fa-images", "fa-paintbrush", "fa-palette", "fa-masks-theater", "fa-dice", "fa-trophy",
    "fa-medal", "fa-puzzle-piece", "fa-chess", "fa-vr-cardboard", "fa-joystick", "fa-ghost", "fa-robot", "fa-wand-magic-sparkles",

    // Shopping & Food
    "fa-bag-shopping", "fa-basket-shopping", "fa-cart-plus", "fa-store", "fa-shop", "fa-tag", "fa-tags", "fa-gift",
    "fa-barcode", "fa-qrcode", "fa-truck", "fa-box", "fa-boxes-stacked", "fa-coins", "fa-money-bill", "fa-money-check",
    "fa-utensils", "fa-mug-hot", "fa-coffee", "fa-glass-water", "fa-wine-glass", "fa-beer-mug-empty", "fa-pizza-slice", "fa-burger",
    "fa-ice-cream", "fa-cake-candles", "fa-cookie", "fa-apple-whole", "fa-carrot", "fa-egg", "fa-fish", "fa-drumstick-bite",

    // Travel & Places
    "fa-plane", "fa-train", "fa-bus", "fa-car", "fa-bicycle", "fa-motorcycle", "fa-ship", "fa-rocket",
    "fa-hotel", "fa-building", "fa-hospital", "fa-school", "fa-university", "fa-landmark", "fa-church", "fa-mosque",
    "fa-tree", "fa-mountain", "fa-campground", "fa-tent", "fa-umbrella-beach", "fa-compass", "fa-map-location-dot", "fa-signs-post",
    "fa-gas-pump", "fa-charging-station", "fa-parking", "fa-traffic-light", "fa-road", "fa-map-pin", "fa-anchor", "fa-suitcase",

    // Tools & Objects
    "fa-hammer", "fa-wrench", "fa-screwdriver", "fa-screwdriver-wrench", "fa-toolbox", "fa-plug", "fa-battery-full", "fa-lightbulb",
    "fa-torch", "fa-magnifying-glass-plus", "fa-magnifying-glass-minus", "fa-eye-dropper", "fa-brush", "fa-fill-drip", "fa-flask", "fa-vial",
    "fa-stethoscope", "fa-kit-medical", "fa-dna", "fa-atom", "fa-book", "fa-book-open", "fa-newspaper", "fa-graduation-cap",
    "fa-paper-plane", "fa-anchor", "fa-bullseye", "fa-life-ring", "fa-crown", "fa-gem", "fa-key", "fa-umbrella",

    // Sports & Health
    "fa-dumbbell", "fa-person-running", "fa-person-swimming", "fa-person-hiking", "fa-bicycle", "fa-table-tennis-paddle-ball", "fa-golf-ball-tee", "fa-basketball",
    "fa-football", "fa-volleyball", "fa-baseball-bat-ball", "fa-heart-pulse", "fa-brain", "fa-lungs", "fa-bone", "fa-pills",
    "fa-first-aid", "fa-hospital", "fa-truck-medical", "fa-user-doctor", "fa-user-nurse", "fa-stethoscope", "fa-syringe", "fa-bandage",

    // Nature & Animals
    "fa-leaf", "fa-seedling", "fa-tree", "fa-mountain-sun", "fa-cloud-sun", "fa-cloud-moon", "fa-rainbow", "fa-paw",
    "fa-cat", "fa-dog", "fa-fish", "fa-horse", "fa-hippo", "fa-spider", "fa-bug", "fa-worm",
    "fa-dove", "fa-crow", "fa-kiwi-bird", "fa-otter", "fa-dragon", "fa-bacteria", "fa-virus", "fa-shrimp",

    // Science & Tech
    "fa-atom", "fa-flask", "fa-vials", "fa-microscope", "fa-dna", "fa-satellite-dish", "fa-satellite", "fa-telescope",
    "fa-rocket", "fa-shuttle-space", "fa-earth-americas", "fa-compass", "fa-brain", "fa-memory", "fa-processor", "fa-ethernet",
    "fa-bolt", "fa-charging-station", "fa-battery-half", "fa-microchip", "fa-hard-drive", "fa-wifi", "fa-signal", "fa-tower-broadcast",

    // Miscellaneous
    "fa-poo", "fa-skull", "fa-ghost", "fa-mask", "fa-hat-wizard", "fa-broom", "fa-magic-wand-sparkles", "fa-clover",
    "fa-shapes", "fa-icons", "fa-music", "fa-guitar", "fa-drum", "fa-microphone-lines", "fa-headphones-simple", "fa-compact-disc"
  ],
  init() {
    this.render();
  },
  checkLayout() {
    const c = document.getElementById("shortcut-container");
    if (!c || c.classList.contains("widget-hidden")) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        const itemCount = this.items.length;
        if (itemCount === 0) {
          c.classList.remove("shortcut-list-view");
          return;
        }
        const rect = c.getBoundingClientRect();
        const containerTop = rect.top + window.scrollY;
        const containerWidth = rect.width || (window.innerWidth - 100);
        const style = window.getComputedStyle(c);
        const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) || 100;
        const availableWidth = containerWidth - paddingX;
        const itemWidth = 140;
        const gap = 15;
        const itemsPerRow = Math.max(1, Math.floor((availableWidth + gap) / (itemWidth + gap)));
        const rowCount = Math.ceil(itemCount / itemsPerRow);
        const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--widget-scale')) || 1;
        const squareGridHeight = (rowCount * 84 + (rowCount - 1) * gap) * scale;
        const absoluteBottom = containerTop + squareGridHeight;
        const threshold = window.innerHeight - 100;
        const needsListView = absoluteBottom > threshold || window.innerHeight < 450;
        const isCurrentlyList = c.classList.contains("shortcut-list-view");
        if (needsListView !== isCurrentlyList) {
          if (needsListView) c.classList.add("shortcut-list-view");
          else c.classList.remove("shortcut-list-view");
        }
      }, 50);
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

      let iconHtml = "";
      if (s.icon) {
        if (s.icon.startsWith("http") || s.icon.startsWith("data:")) {
          iconHtml = `<img src="${s.icon}" class="shortcut-img">`;
        } else if (s.icon.startsWith("fa-") || s.icon.startsWith("fas ") || s.icon.startsWith("fab ") || s.icon.startsWith("far ")) {
          const iconClass = s.icon.includes("fa-") && !s.icon.includes(" ") ? `fas ${s.icon}` : s.icon;
          iconHtml = `<div class="shortcut-default-icon" style="display: flex;"><i class="${iconClass}"></i></div>`;
        } else {
          iconHtml = `
            <img src="https://icons.duckduckgo.com/ip3/${hostname}.ico" 
                 class="shortcut-img"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="shortcut-default-icon" style="display: none;"><i class="fas fa-link"></i></div>
          `;
        }
      } else {
        iconHtml = `
          <img src="https://icons.duckduckgo.com/ip3/${hostname}.ico" 
               class="shortcut-img"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="shortcut-default-icon" style="display: none;"><i class="fas fa-link"></i></div>
        `;
      }

      div.innerHTML = `
        <div class="shortcut-icon-wrapper">
          ${iconHtml}
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
    document.getElementById("siteIcon").value = isEdit
      ? (this.items[index].icon || "")
      : "";
    document.getElementById("linkModalTitle").innerText = isEdit
      ? T.modalLinkEdit
      : T.modalLinkAdd;
    document.getElementById("linkSaveBtn").innerText = isEdit
      ? T.btnEdit
      : T.btnSave;
    const dBtn = document.getElementById("linkDelBtn");
    if (dBtn) dBtn.style.display = isEdit ? "block" : "none";
    
    // Reset picker
    const picker = document.getElementById("iconPickerArea");
    if (picker) {
      picker.classList.remove("show");
    }
    const searchInput = document.getElementById("iconSearchInput");
    if (searchInput) searchInput.value = "";
    
    this.updatePreview();
    utils.closeModal("settingModal");
    utils.openModal("linkModal");
    setTimeout(() => document.getElementById("siteName").focus(), 50);
  },
  toggleIconPicker() {
    const area = document.getElementById("iconPickerArea");
    if (!area) return;
    const isShowing = area.classList.contains("show");
    if (isShowing) {
      area.classList.remove("show");
    } else {
      this.renderIconList();
      area.classList.add("show");
      setTimeout(() => document.getElementById("iconSearchInput")?.focus(), 50);
    }
  },
  renderIconList(filter = "") {
    const grid = document.getElementById("iconGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const filtered = filter 
      ? this.popularIcons.filter(icon => icon.includes(filter.toLowerCase())) 
      : this.popularIcons;
    
    filtered.forEach(icon => {
      const div = document.createElement("div");
      div.style.cssText = "display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.05); cursor:pointer; transition:0.2s; border:1px solid transparent; flex-shrink:0;";
      div.innerHTML = `<i class=\"fas ${icon}\" style=\"font-size: 0.95rem; opacity: 0.8;\"></i>`;
      div.onmouseenter = () => {
        div.style.background = "rgba(255,255,255,0.1)";
        div.style.borderColor = "var(--accent-color)";
      };
      div.onmouseleave = () => {
        div.style.background = "rgba(255,255,255,0.05)";
        div.style.borderColor = "transparent";
      };
      div.onclick = () => this.selectIcon(icon);
      grid.appendChild(div);
    });
  },
  filterIcons(val) {
    this.renderIconList(val);
  },
  selectIcon(icon) {
    document.getElementById("siteIcon").value = icon;
    this.updatePreview();
    const area = document.getElementById("iconPickerArea");
    if (area) {
      area.classList.remove("show");
    }
  },
  add() {
    const n = document.getElementById("siteName").value,
      u = document.getElementById("siteUrl").value,
      ic = document.getElementById("siteIcon").value;
    if (n && u) {
      const item = { name: n, url: u, icon: ic };
      if (window.currentShortcutIndex !== null)
        this.items[window.currentShortcutIndex] = item;
      else this.items.push(item);
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
  updatePreview() {
    const val = document.getElementById("siteIcon").value;
    const preview = document.getElementById("iconPreview");
    if (!preview) return;
    if (!val) {
      preview.innerHTML = '<i class="fas fa-icons" style="opacity: 0.5;"></i>';
      return;
    }
    if (val.startsWith("http") || val.startsWith("data:")) {
      preview.innerHTML = `<img src="${val}" style="width:100%; height:100%; object-fit:cover;">`;
    } else if (val.startsWith("fa-") || val.startsWith("fas ") || val.startsWith("fab ") || val.startsWith("far ")) {
      const iconClass = val.includes("fa-") && !val.includes(" ") ? `fas ${val}` : val;
      preview.innerHTML = `<i class="${iconClass}"></i>`;
    } else {
      preview.innerHTML = '<i class="fas fa-icons" style="opacity: 0.5;"></i>';
    }
  },
  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 200 * 1024) { // 200KB limit for localStorage safety
      alert("파일 크기가 너무 큽니다. 200KB 이하의 이미지를 사용해 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById("siteIcon").value = event.target.result;
      this.updatePreview();
    };
    reader.readAsDataURL(file);
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
