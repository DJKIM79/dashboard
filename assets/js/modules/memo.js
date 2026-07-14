// 260525 21:41 Stable
const memo = {
  items: JSON.parse(localStorage.getItem("dj_memos")) || [],
  init() {
    this.render();
  },
  render() {
    const c = document.getElementById("memo-list");
    if (!c) return;
    c.innerHTML = "";
    const folder = document.getElementById("memo-folder");
    if (this.items.length > 0) {
      folder.classList.add("has-items");
    } else {
      folder.classList.remove("has-items", "open");
    }
    this.items.forEach((m) => {
      const div = document.createElement("div");
      div.className = "item-card";
      div.onclick = () => this.openModal(m.id);
      div.oncontextmenu = (e) => showContextMenu(e, "memo", m.id);
      div.innerHTML = `<div class="title">${m.title}</div>`;
      c.appendChild(div);
    });
  },
  openModal(id = null) {
    window.currentEditMemoId = id;
    window.currentContextType = "memo";
    window.currentContextId = id;
    const T = i18n.langData,
      d = document.getElementById("memoDelBtn"),
      m = id ? this.items.find((x) => x.id == id) : null;
    document.getElementById("memoTitle").value = m ? m.title : "";
    const contentArea = document.getElementById("memoContent");
    const previewArea = document.getElementById("memoPreview");
    contentArea.value = m ? m.content : "";
    
    // Set initial export button state
    const exportBtn = document.getElementById("memoExportBtn");
    if (exportBtn) {
        exportBtn.disabled = contentArea.value.trim() === "";
    }

    // Reset preview state
    contentArea.style.display = "block";
    previewArea.style.display = "none";
    contentArea.classList.remove("preview-active");
    const toolbar = document.querySelector(".memo-toolbar");
    if (toolbar) toolbar.classList.remove("disabled");
    const toggleBtn = document.getElementById("memoToggleView");
    if (toggleBtn) {
        toggleBtn.classList.remove("active");
        if (window.i18n) {
            toggleBtn.title = i18n.get("tipViewPreview");
            toggleBtn.setAttribute("data-i18n-title", "tipViewPreview");
        }
    }
    
    const modalContent = document.querySelector("#memoModal .modal-content");
    
    // Set individual size or default
    const defaultContentW = localStorage.getItem("dj_memo_default_w") || "450px"; 
    const defaultContentH = localStorage.getItem("dj_memo_default_h") || "350px";
    
    let targetContentW = defaultContentW;
    let targetContentH = defaultContentH;

    if (m && m.width && m.height) {
        targetContentW = m.width;
        targetContentH = m.height;
    }

    // Apply dimensions to the children so the parent (fit-content) follows them
    contentArea.style.width = targetContentW;
    contentArea.style.height = targetContentH;
    previewArea.style.width = targetContentW;
    previewArea.style.height = targetContentH;
    
    // Clear parent width so fit-content takes over child's size instantly
    if (modalContent) {
        modalContent.style.width = "";
    }
    
    // Force a reflow for safety
    if (modalContent) void modalContent.offsetWidth;

    const modalTitle = document.getElementById("memoModalTitle");
    if (modalTitle) {
        modalTitle.innerText = id ? (T.modalMemoEdit || "메모 수정") : (T.modalMemoAdd || "메모 추가");
    }
    
    const sBtn = document.getElementById("memoSaveBtn");
    if (sBtn) {
        sBtn.innerText = id ? (T.btnClose || "닫기") : (T.btnSaveMemo || "추가");
        sBtn.style.display = "block";
    }
    if (d) d.style.display = "none";
    utils.closeModal("settingModal");
    utils.openModal("memoModal");
    
    this.initTablePicker();
    setTimeout(() => {
        if (id) {
            document.getElementById("memoContent").focus();
        } else {
            document.getElementById("memoTitle").focus();
        }
    }, 50);

    // Setup real-time saving for existing memo
    if (id) {
        const titleInput = document.getElementById("memoTitle");
        const contentInput = document.getElementById("memoContent");
        const saveHandler = () => this.autoSave();
        titleInput.oninput = saveHandler;
        contentInput.oninput = saveHandler;
    } else {
        document.getElementById("memoTitle").oninput = null;
        document.getElementById("memoContent").oninput = (e) => this.handleInput(e);
    }
  },
  autoSave() {
    const t = document.getElementById("memoTitle").value,
      contentArea = document.getElementById("memoContent"),
      previewArea = document.getElementById("memoPreview"),
      c = contentArea.value;
    
    if (!contentArea || !previewArea) return;

    const isPreview = previewArea.style.display === "block";
    // Capture actual current dimensions (offsetWidth is more reliable after manual resize)
    const currentW = isPreview ? previewArea.offsetWidth : contentArea.offsetWidth;
    const currentH = isPreview ? previewArea.offsetHeight : contentArea.offsetHeight;
    const w = currentW + "px";
    const h = currentH + "px";

    if (window.currentEditMemoId) {
        if (!t) return; // Don't auto-save if title is empty (prevents accidental data loss)
        const idx = this.items.findIndex((x) => x.id == window.currentEditMemoId);
        if (idx !== -1) {
            this.items[idx] = {
                ...this.items[idx],
                title: t,
                content: c,
                width: w,
                height: h
            };
            window.memos = this.items;
            this.render();
            utils.saveData();
        }
    } else {
        // For new memos, remember the size as default for the next "Add"
        localStorage.setItem("dj_memo_default_w", w);
        localStorage.setItem("dj_memo_default_h", h);
    }
    
    // Also update preview if active
    this.handleInput();
  },
  add() {
    const t = document.getElementById("memoTitle").value,
      contentArea = document.getElementById("memoContent"),
      previewArea = document.getElementById("memoPreview"),
      c = contentArea.value;

    const isPreview = previewArea.style.display === "block";
    const currentW = isPreview ? previewArea.offsetWidth : contentArea.offsetWidth;
    const currentH = isPreview ? previewArea.offsetHeight : contentArea.offsetHeight;
    const w = currentW + "px";
    const h = currentH + "px";

    if (t) {      if (window.currentEditMemoId) {
        const idx = this.items.findIndex(
          (x) => x.id == window.currentEditMemoId,
        );
        this.items[idx] = {
          ...this.items[idx],
          title: t,
          content: c,
          width: w,
          height: h
        };
      } else {
        this.items.push({ id: Date.now(), title: t, content: c, width: w, height: h });
      }
      window.memos = this.items;
      this.render();
      utils.saveData();
      utils.closeModal("memoModal");
    } else {
      utils.showValidationTip("memoSaveBtn", i18n.get("msgInputTitle"));
    }
  },
  applyFormat(prefix, suffix = "") {
    const el = document.getElementById("memoContent");
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    let before = text.substring(0, start);
    const after = text.substring(end);

    // Smart line break logic for block elements (---, Tables)
    const isBlock = prefix.includes('---') || prefix.trim().startsWith('|');
    if (isBlock) {
        prefix = prefix.replace(/^\n+/, '');
        if (before.length > 0 && !before.endsWith('\n')) {
            before += '\n';
        }
    }

    el.value = before + prefix + selected + suffix + after;
    el.focus();
    
    if (prefix.includes('\n')) {
        const insertEnd = before.length + prefix.length + selected.length + suffix.length;
        el.selectionStart = el.selectionEnd = insertEnd;
    } else {
        const offset = (isBlock && !text.substring(0, start).endsWith('\n')) ? 1 : 0;
        el.selectionStart = start + prefix.length + offset;
        el.selectionEnd = el.selectionStart + selected.length;
    }
    
    this.handleInput();
    this.autoSave(); // Trigger auto-save for programmatic changes
    this.closeAllDropdowns();
  },
  toggleDropdown(id, e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    
    // Fallback for button identification
    const btn = e ? (e.currentTarget || (e.target && e.target.closest(".memo-toolbar-btn"))) : null;
    const isShowing = dropdown.classList.contains("show");
    
    this.closeAllDropdowns();
    
    if (!isShowing) {
      dropdown.classList.add("show");
      if (btn) btn.classList.add("dropdown-active");
      
      if (id === 'tableDropdown') {
          this.updateTablePicker(2, 1);
      }
      
      const closeHandler = (ev) => {
        // If the click is outside both the dropdown AND the button that opened it
        if (!dropdown.contains(ev.target) && (!btn || !btn.contains(ev.target))) {
          this.closeAllDropdowns();
          document.removeEventListener("click", closeHandler);
        }
      };
      // Short delay to avoid catching the current click event bubbling up
      setTimeout(() => document.addEventListener("click", closeHandler), 10);
    }
  },
  closeAllDropdowns() {
    document.querySelectorAll(".memo-dropdown").forEach(d => d.classList.remove("show"));
    document.querySelectorAll(".memo-toolbar-btn").forEach(b => b.classList.remove("dropdown-active"));
  },
  togglePreview() {
    const contentArea = document.getElementById("memoContent");
    const previewArea = document.getElementById("memoPreview");
    const toolbar = document.querySelector(".memo-toolbar");
    const btn = document.getElementById("memoToggleView");
    if (!contentArea || !previewArea) return;
    
    const isPreview = previewArea.style.display === "block";

    if (isPreview) {
      // Return to edit mode
      contentArea.style.width = previewArea.style.width;
      contentArea.style.height = previewArea.style.height;
      
      previewArea.style.display = "none";
      contentArea.style.display = "block";
      contentArea.classList.remove("preview-active");
      if (toolbar) toolbar.classList.remove("disabled");
      if (btn) {
          btn.classList.remove("active");
          if (window.i18n) {
              btn.title = i18n.get("tipViewPreview");
              btn.setAttribute("data-i18n-title", "tipViewPreview");
          }
      }
      contentArea.focus();
    } else {
      // Switch to preview mode
      if (window.utils && utils.renderMarkdown) {
        previewArea.innerHTML = utils.renderMarkdown(contentArea.value);
      }
      
      // Ensure dimensions are identical
      const currentW = contentArea.offsetWidth;
      const currentH = contentArea.offsetHeight;
      previewArea.style.width = currentW + "px";
      previewArea.style.height = currentH + "px";
      
      contentArea.style.display = "none";
      previewArea.style.display = "block";
      contentArea.classList.add("preview-active");
      if (toolbar) toolbar.classList.add("disabled");
      if (btn) {
          btn.classList.add("active");
          if (window.i18n) {
              btn.title = i18n.get("tipViewSource");
              btn.setAttribute("data-i18n-title", "tipViewSource");
          }
      }
    }
  },
  exportToMd() {
    const title = document.getElementById("memoTitle").value || "untitled";
    const content = document.getElementById("memoContent").value;
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.md`;
    a.click();
  },
  addLink() {
    const titleInput = document.getElementById("customPromptInput1");
    const urlInput = document.getElementById("customPromptInput2");
    const confirmBtn = document.getElementById("customPromptConfirmBtn");
    
    titleInput.value = "";
    urlInput.value = "https://";
    
    const confirmHandler = () => {
        const text = titleInput.value.trim();
        const url = urlInput.value.trim();
        if (text && url) {
            this.applyFormat(`[${text}](${url})`);
        }
        utils.closeModal("customPromptModal");
        confirmBtn.removeEventListener("click", confirmHandler);
    };
    
    confirmBtn.onclick = confirmHandler;
    utils.openModal("customPromptModal");
    setTimeout(() => titleInput.focus(), 50);
  },
  applyColor(color) {
    this.applyFormat(`{color:${color}}(`, ")");
  },
  handleInput(e) {
    const previewArea = document.getElementById("memoPreview");
    const contentArea = document.getElementById("memoContent");
    const exportBtn = document.getElementById("memoExportBtn");
    
    if (exportBtn && contentArea) {
        exportBtn.disabled = contentArea.value.trim() === "";
    }
    
    if (previewArea && previewArea.style.display === "block" && window.utils && utils.renderMarkdown) {
      previewArea.innerHTML = utils.renderMarkdown(contentArea.value);
    }
  },
  initTablePicker() {
    const grid = document.getElementById("tablePickerGrid");
    if (!grid) return;

    // Create a pool of 400 cells (20x20) once
    grid.innerHTML = "";
    for (let i = 0; i < 400; i++) {
        const cell = document.createElement("div");
        cell.className = "table-picker-cell";
        grid.appendChild(cell);
    }

    // Use event delegation for better performance and to stop "shaking"
    grid.onmousemove = (e) => {
        const cell = e.target.closest(".table-picker-cell");
        if (!cell) return;
        
        const cells = Array.from(grid.children);
        const index = cells.indexOf(cell);
        const currentMaxC = grid.style.gridTemplateColumns ? parseInt(grid.style.gridTemplateColumns.match(/\d+/)) : 2;
        
        const r = Math.floor(index / currentMaxC) + 1;
        const c = (index % currentMaxC) + 1;
        this.updateTablePicker(r, c);
    };

    grid.onclick = (e) => {
        const cell = e.target.closest(".table-picker-cell");
        if (!cell) return;
        
        const cells = Array.from(grid.children);
        const index = cells.indexOf(cell);
        const currentMaxC = grid.style.gridTemplateColumns ? parseInt(grid.style.gridTemplateColumns.match(/\d+/)) : 2;
        
        const r = Math.floor(index / currentMaxC) + 1;
        const c = (index % currentMaxC) + 1;
        this.openTableEditor(r, c);
    };

    this.updateTablePicker(2, 1); // Defaults to 2x1
  },
  updateTablePicker(rows, cols) {
    const info = document.getElementById("tablePickerInfo");
    // Minimum 2 rows and 1 column
    const displayRows = Math.max(2, rows);
    const displayCols = Math.max(1, cols);
    if (info) info.innerText = `${displayRows} x ${displayCols}`;

    const grid = document.getElementById("tablePickerGrid");
    if (!grid) return;

    // Grid size logic: always show a grid that allows growing
    // Start with a minimum of 2x2 for visual growth, but info can show 2x1
    const maxR = Math.min(20, Math.max(3, rows + 1));
    const maxC = Math.min(20, Math.max(3, cols + 1));

    // Update grid structure without clearing innerHTML to prevent shaking
    grid.style.gridTemplateColumns = `repeat(${maxC}, 18px)`;
    
    const cells = grid.children;
    for (let i = 0; i < cells.length; i++) {
        if (i < maxR * maxC) {
            cells[i].style.display = "block";
            const r = Math.floor(i / maxC) + 1;
            const c = (i % maxC) + 1;
            if (r <= displayRows && c <= displayCols) {
                cells[i].classList.add("active");
            } else {
                cells[i].classList.remove("active");
            }
        } else {
            cells[i].style.display = "none";
        }
    }
  },
  resetTablePicker() {
    this.updateTablePicker(2, 1);
  },
  openTableEditor(rows, cols) {
    this.closeAllDropdowns();
    this.currentTableData = Array.from({ length: Math.max(2, rows) }, (_, r) => 
        Array.from({ length: Math.max(1, cols) }, () => "")
    );
    this.renderTableEditorGrid();
    utils.openModal("tableEditorModal");
  },
  renderTableEditorGrid() {
    const grid = document.getElementById("tableEditorGrid");
    const container = document.querySelector(".table-editor-container");
    if (!grid || !container) return;
    
    // Record old size for animation
    const oldW = container.offsetWidth;
    const oldH = container.offsetHeight;
    
    const rows = this.currentTableData.length;
    const cols = this.currentTableData[0].length;
    
    grid.style.gridTemplateColumns = `repeat(${cols}, 130px)`;
    grid.innerHTML = "";

    // Render inputs
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const input = document.createElement("input");
            input.type = "text";
            input.className = "table-editor-input" + (r === 0 ? " header-input" : "");
            input.value = this.currentTableData[r][c];
            input.placeholder = r === 0 ? (i18n.get("lblHeader") || "제목") : (i18n.get("lblCell") || "본문");
            input.oninput = (e) => { this.currentTableData[r][c] = e.target.value; };
            // Set context menu for row/column management
            input.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.showContextMenu) {
                    showContextMenu(e, "table", { r, c });
                }
            };
            grid.appendChild(input);
        }
    }
    
    // Animate container size change
    if (oldW > 0 && oldH > 0) {
        // Temporarily lock to old size
        container.style.width = oldW + "px";
        container.style.height = oldH + "px";
        container.style.overflow = "hidden";
        
        requestAnimationFrame(() => {
            // Get new natural size (grid size dictates container size)
            const newW = grid.offsetWidth; 
            const newH = grid.offsetHeight;
            
            container.style.width = newW + "px";
            container.style.height = newH + "px";
            
            setTimeout(() => {
                container.style.width = "";
                container.style.height = "";
                container.style.overflow = "auto";
            }, 300); // Matches CSS transition duration
        });
    }
  },
  addRow() {
    const menu = document.getElementById("globalContextMenu");
    const r = parseInt(menu.dataset.r);
    const cols = this.currentTableData[0].length;
    this.currentTableData.splice(r + 1, 0, Array(cols).fill(""));
    this.renderTableEditorGrid();
  },
  delRow() {
    const menu = document.getElementById("globalContextMenu");
    const r = parseInt(menu.dataset.r);
    // Prevents deleting header (row 0) and ensures at least one data row remains (total length > 2)
    if (r > 0 && this.currentTableData.length > 2) {
        this.currentTableData.splice(r, 1);
        this.renderTableEditorGrid();
    }
  },
  addCol() {
    const menu = document.getElementById("globalContextMenu");
    const c = parseInt(menu.dataset.c);
    this.currentTableData.forEach(row => {
        row.splice(c + 1, 0, "");
    });
    this.renderTableEditorGrid();
  },
  delCol() {
    const menu = document.getElementById("globalContextMenu");
    const c = parseInt(menu.dataset.c);
    // Enforce at least one column
    if (this.currentTableData[0].length > 1) {
        this.currentTableData.forEach(row => {
            row.splice(c, 1);
        });
        this.renderTableEditorGrid();
    }
  },  insertTableFromEditor() {
    const data = this.currentTableData;
    if (!data || data.length === 0) return;
    
    const cols = data[0].length;
    // Markdown table generation
    let md = "| " + data[0].map(v => v.trim() || " ").join(" | ") + " |\n";
    md += "| " + Array(cols).fill("---").join(" | ") + " |\n";
    
    for (let r = 1; r < data.length; r++) {
        md += "| " + data[r].map(v => v.trim() || " ").join(" | ") + " |\n";
    }
    
    this.applyFormat(md);
    utils.closeModal("tableEditorModal");
  },
  delete(id = null) {
    const targetId = id || window.currentEditMemoId;
    this.items = this.items.filter((x) => x.id != targetId);
    window.memos = this.items;
    this.render();
    utils.saveData();
    utils.closeModal("memoModal");
  },
};
window.memo = memo;
window.memos = memo.items; // For backward compatibility
window.renderMemos = memo.render.bind(memo);
window.openMemoModal = memo.openModal.bind(memo);
window.addMemo = memo.add.bind(memo);
window.deleteCurrentMemo = memo.delete.bind(memo);
