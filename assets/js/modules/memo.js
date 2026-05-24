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
    const defaultContentH = "350px";
    
    let targetContentW = ""; // Default (will use CSS min-width)
    let targetContentH = defaultContentH;

    if (m && m.width && m.height) {
        targetContentW = m.width;
        targetContentH = m.height;
        if (!String(targetContentW).includes("px") && !String(targetContentW).includes("%")) targetContentW += "px";
        if (!String(targetContentH).includes("px") && !String(targetContentH).includes("%")) targetContentH += "px";
    }

    // Apply dimensions to the children
    contentArea.style.width = targetContentW || "100%";
    contentArea.style.height = targetContentH;
    previewArea.style.width = targetContentW || "100%";
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
        sBtn.innerText = id ? (T.lblSave || "저장") : (T.btnSaveMemo || "추가");
        // Hide button when editing, use real-time saving instead
        sBtn.style.display = id ? "none" : "block";
    }
    if (d) d.style.display = id ? "block" : "none";
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
    if (!window.currentEditMemoId) return;
    const t = document.getElementById("memoTitle").value,
      contentArea = document.getElementById("memoContent"),
      previewArea = document.getElementById("memoPreview"),
      c = contentArea.value;
    
    if (!t) return; // Don't save if title is empty
    
    const isPreview = previewArea.style.display === "block";
    const w = isPreview ? previewArea.style.width : contentArea.style.width;
    const h = isPreview ? previewArea.style.height : contentArea.style.height;

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
    
    // Also update preview if active
    this.handleInput();
  },
  add() {
    const t = document.getElementById("memoTitle").value,
      contentArea = document.getElementById("memoContent"),
      previewArea = document.getElementById("memoPreview"),
      c = contentArea.value;
    
    const isPreview = previewArea.style.display === "block";
    const w = isPreview ? previewArea.style.width : contentArea.style.width;
    const h = isPreview ? previewArea.style.height : contentArea.style.height;
      
    if (t) {
      if (window.currentEditMemoId) {
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
    this.closeAllDropdowns();
  },
  toggleDropdown(id, e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById(id);
    const btn = e.currentTarget;
    const isShowing = dropdown.classList.contains("show");
    
    this.closeAllDropdowns();
    
    if (!isShowing) {
      dropdown.classList.add("show");
      btn.classList.add("dropdown-active");
      
      if (id === 'tableDropdown') {
          this.updateTablePicker(2, 1); // Defaults to 2x1
      }
      
      const closeHandler = (ev) => {
        if (!dropdown.contains(ev.target) && !btn.contains(ev.target)) {
          this.closeAllDropdowns();
          document.removeEventListener("click", closeHandler);
        }
      };
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
    const isPreview = previewArea.style.display === "block";

    if (isPreview) {
      // Return to edit mode
      contentArea.style.width = previewArea.style.width;
      contentArea.style.height = previewArea.style.height;
      
      previewArea.style.display = "none";
      contentArea.style.display = "block";
      contentArea.classList.remove("preview-active");
      toolbar.classList.remove("disabled");
      btn.classList.remove("active");
      if (window.i18n) {
          btn.title = i18n.get("tipViewPreview");
          btn.setAttribute("data-i18n-title", "tipViewPreview");
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
      toolbar.classList.add("disabled");
      btn.classList.add("active");
      if (window.i18n) {
          btn.title = i18n.get("tipViewSource");
          btn.setAttribute("data-i18n-title", "tipViewSource");
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
    if (previewArea && previewArea.style.display === "block" && window.utils && utils.renderMarkdown) {
      previewArea.innerHTML = utils.renderMarkdown(document.getElementById("memoContent").value);
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
    if (!grid) return;
    
    const rows = this.currentTableData.length;
    const cols = this.currentTableData[0].length;
    
    grid.style.gridTemplateColumns = `repeat(${cols}, 100px)`;
    grid.innerHTML = "";

    // 1. Unified Background Panels for each side - Set to span correctly
    const rowMinusPanel = document.createElement("div");
    rowMinusPanel.className = "table-mgmt-row-minus";
    rowMinusPanel.style.gridRow = `1 / span ${rows}`;
    rowMinusPanel.style.left = "-70px";
    
    const rowPlusPanel = document.createElement("div");
    rowPlusPanel.className = "table-mgmt-row-plus";
    rowPlusPanel.style.gridRow = `1 / span ${rows}`;
    rowPlusPanel.style.gridColumn = cols;
    rowPlusPanel.style.right = "-70px";
    
    const colMinusPanel = document.createElement("div");
    colMinusPanel.className = "table-mgmt-col-minus";
    colMinusPanel.style.gridColumn = `1 / span ${cols}`;
    colMinusPanel.style.top = "-70px";
    
    const colPlusPanel = document.createElement("div");
    colPlusPanel.className = "table-mgmt-col-plus";
    colPlusPanel.style.gridColumn = `1 / span ${cols}`;
    colPlusPanel.style.gridRow = rows;
    colPlusPanel.style.bottom = "-70px";

    // 2. Add Row buttons to their respective panels
    for (let r = 0; r < rows; r++) {
        // Row Minus (Left)
        const delBtn = document.createElement("button");
        delBtn.className = "table-mgmt-btn delete";
        delBtn.innerHTML = '<i class="fas fa-minus"></i>';
        if (r === 0 || rows <= 2) delBtn.style.visibility = "hidden";
        delBtn.onclick = () => {
            if (r > 0 && this.currentTableData.length > 2) {
                this.currentTableData.splice(r, 1);
                this.renderTableEditorGrid();
            }
        };
        rowMinusPanel.appendChild(delBtn);

        // Row Plus (Right)
        const addBtn = document.createElement("button");
        addBtn.className = "table-mgmt-btn";
        addBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addBtn.onclick = () => {
            this.currentTableData.splice(r + 1, 0, Array(cols).fill(""));
            this.renderTableEditorGrid();
        };
        rowPlusPanel.appendChild(addBtn);

        // Render inputs
        for (let c = 0; c < cols; c++) {
            const input = document.createElement("input");
            input.type = "text";
            input.className = "table-editor-input" + (r === 0 ? " header-input" : "");
            input.value = this.currentTableData[r][c];
            input.placeholder = r === 0 ? "Header" : "Cell";
            input.oninput = (e) => { this.currentTableData[r][c] = e.target.value; };
            grid.appendChild(input);
        }
    }

    // 3. Add Column buttons to their respective panels
    for (let c = 0; c < cols; c++) {
        // Col Minus (Top)
        const delColBtn = document.createElement("button");
        delColBtn.className = "table-mgmt-btn delete";
        delColBtn.innerHTML = '<i class="fas fa-minus"></i>';
        if (cols <= 1) delColBtn.style.visibility = "hidden";
        delColBtn.onclick = () => {
            if (this.currentTableData[0].length > 1) {
                this.currentTableData.forEach(row => row.splice(c, 1));
                this.renderTableEditorGrid();
            }
        };
        colMinusPanel.appendChild(delColBtn);

        // Col Plus (Bottom)
        const addColBtn = document.createElement("button");
        addColBtn.className = "table-mgmt-btn";
        addColBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addColBtn.onclick = () => {
            this.currentTableData.forEach(row => row.splice(c + 1, 0, ""));
            this.renderTableEditorGrid();
        };
        colPlusPanel.appendChild(addColBtn);
    }

    grid.appendChild(rowMinusPanel);
    grid.appendChild(rowPlusPanel);
    grid.appendChild(colMinusPanel);
    grid.appendChild(colPlusPanel);

    // Add the visual frame LAST to ensure it stays in background without displacing
    const frame = document.createElement("div");
    frame.className = "table-main-frame";
    frame.style.gridColumn = `1 / span ${cols}`;
    frame.style.gridRow = `1 / span ${rows}`;
    grid.appendChild(frame);
  },
  insertTableFromEditor() {
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
