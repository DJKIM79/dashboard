const ai = {
  isDefaultTitle(title) {
    if (!title) return true;
    return title === "새 대화" || title === "새로운 대화" || title === "New Chat" || title === (window.i18n ? window.i18n.get("aiNewChatDefault") : "새 대화");
  },
  getDisplayTitle(title) {
    return this.isDefaultTitle(title) ? (window.i18n ? window.i18n.get("aiNewChatDefault") : "새 대화") : title;
  },
  get provider() {
    return localStorage.getItem("dj_ai_provider") || "none";
  },
  get serverUrl() {
    const provider = this.provider;
    if (provider.startsWith("custom_")) {
        const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
        const current = customAis.find(a => a.id === provider);
        return current ? current.url : "";
    }
    return localStorage.getItem("dj_ai_server_url") || "";
  },
  get apiKey() {
    const provider = this.provider;
    if (provider === "none") return "";
    return localStorage.getItem(`dj_ai_api_key_${provider}`) || "";
  },
  get settingsModel() {
    return localStorage.getItem("dj_ai_model") || "";
  },
  get isConnected() {
    return localStorage.getItem("dj_ai_is_connected") === "true";
  },
  set isConnected(val) {
    localStorage.setItem("dj_ai_is_connected", val);
  },
  outputAtOnce: localStorage.getItem("dj_ai_output_at_once") !== "false",
  isGenerating: false,
  historyCollapsed: false,
  currentChatId: null,
  lastSuccessfulModel: localStorage.getItem("dj_ai_last_success_model") || null,
  attachments: [],
  db: null,
  abortController: null,
  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isGenerating = false;
    const typing = document.querySelector(".typing-indicator");
    if (typing) {
        const parent = typing.closest(".ai-message.bot");
        if (parent) parent.remove();
        else typing.remove();
    }
  },
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("dj_ai_files", 1);
      request.onerror = () => reject("IndexedDB error");
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("files")) {
          const store = db.createObjectStore("files", { keyPath: "id" });
          store.createIndex("chatId", "chatId", { unique: false });
        }
      };
    });
  },
  async saveFileToDB(file, chatId) {
    if (!this.db) await this.initDB();
    const id = `${Date.now()}_${file.name}`;
    const entry = { id, chatId, file, name: file.name, type: file.type };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("files", "readwrite");
      tx.objectStore("files").add(entry);
      tx.oncomplete = () => resolve(entry);
      tx.onerror = () => reject();
    });
  },
  async getFilesByChatId(chatId) {
    if (!this.db) await this.initDB();
    return new Promise((resolve) => {
      const tx = this.db.transaction("files", "readonly");
      const index = tx.objectStore("files").index("chatId");
      const request = index.getAll(chatId);
      request.onsuccess = () => resolve(request.result);
    });
  },
  async deleteFilesByChatId(chatId) {
    if (!this.db) await this.initDB();
    const files = await this.getFilesByChatId(chatId);
    if (files.length === 0) return;
    const tx = this.db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    files.forEach(f => store.delete(f.id));
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  },
  setupInputListeners() {
    const input = document.getElementById("ai-user-input");
    const container = document.querySelector(".ai-chat-input-area");
    if (!input || !container) return;

    input.addEventListener("paste", (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      const files = [];
      for (const item of items) {
        if (item.kind === "file") {
          files.push(item.getAsFile());
        }
      }
      if (files.length > 0) {
        this.addFiles(files);
      }
    });

    container.addEventListener("dragenter", (e) => {
      e.preventDefault();
      container.classList.add("drag-over");
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!container.classList.contains("drag-over")) {
        container.classList.add("drag-over");
      }
    });

    container.addEventListener("dragleave", (e) => {
      const rect = container.getBoundingClientRect();
      if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
        container.classList.remove("drag-over");
      }
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
      container.classList.remove("drag-over");
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        this.addFiles(files);
      }
    });
  },
  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.addFiles(files);
    e.target.value = "";
  },
  async addFiles(files) {
    const chat = this.getCurrentChat();
    if (!chat) return;
    
    for (const file of files) {
      if (this.attachments.some(a => a.name === file.name && a.size === file.size)) continue;
      
      try {
        const entry = await this.saveFileToDB(file, chat.id);
        this.attachments.push({
          id: entry.id,
          name: file.name,
          type: file.type,
          size: file.size,
          data: file
        });
      } catch (err) {
        console.error("Failed to save file", err);
      }
    }
    this.renderFilePreviews();
    document.getElementById("ai-user-input")?.focus();
  },
  renderFilePreviews() {
    const container = document.getElementById("ai-file-previews");
    if (!container) return;
    container.innerHTML = "";
    this.attachments.forEach((file, index) => {
      const div = document.createElement("div");
      div.className = "ai-file-preview-item";
      
      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        const url = URL.createObjectURL(file.data);
        img.src = url;
        img.onload = () => URL.revokeObjectURL(url);
        div.appendChild(img);
      } else {
        const icon = document.createElement("i");
        icon.className = "fas fa-file file-icon";
        div.appendChild(icon);
      }
      
      const removeBtn = document.createElement("div");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        this.removeAttachment(index);
      };
      div.appendChild(removeBtn);
      
      container.appendChild(div);
    });
  },
  removeAttachment(index) {
    this.attachments.splice(index, 1);
    this.renderFilePreviews();
  },
  clearAttachments() {
    this.attachments = [];
    this.renderFilePreviews();
  },
  _currentEmptyChat: null,
  get isChatLocked() {
    const chat = this.getCurrentChat();
    if (!chat) return false;
    
    // Empty chats are never locked
    const hasRealMessages = chat.messages && chat.messages.some(m => m.role === "user" || m.role === "bot");
    if (!hasRealMessages) return false;
    
    const chatProvider = chat.provider || this.provider;
    return chatProvider !== this.provider;
  },
  getStorageKey(p = this.provider) {
    return `dj_ai_chats_${p}`;
  },
  get chats() {
    const allProviders = ["openai", "gemini"];
    const custom = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    custom.forEach(p => allProviders.push(p.id));

    let allChats = [];
    allProviders.forEach(p => {
      const data = localStorage.getItem(`dj_ai_chats_${p}`);
      if (data) {
        try {
          const chats = JSON.parse(data);
          chats.forEach(c => {
            if (!c.provider) c.provider = p;
          });
          // Filter out completely empty chats to permanently delete them on load
          const validChats = chats.filter(c => c.messages && c.messages.some(m => m.role === "user" || m.role === "bot"));
          allChats.push(...validChats);
        } catch (e) { console.error("Failed to parse chats for", p, e); }
      }
    });

    if (this._currentEmptyChat) {
      if (!allChats.some(c => c.id === this._currentEmptyChat.id)) {
        allChats.push(this._currentEmptyChat);
      }
    }

    // Deduplicate by chat.id to clean up any corrupted state
    const uniqueChats = [];
    const seenIds = new Set();
    allChats.forEach(c => {
        if (!seenIds.has(c.id)) {
            seenIds.add(c.id);
            uniqueChats.push(c);
        }
    });

    return uniqueChats.sort((a, b) => {
        const timeA = a.updatedAt || a.id || 0;
        const timeB = b.updatedAt || b.id || 0;
        return timeB - timeA;
    });
  },
  set chats(val) {
    if (!val) return;

    const allProviders = ["openai", "gemini"];
    const custom = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    custom.forEach(p => allProviders.push(p.id));

    // Group chats by provider
    const grouped = {};
    allProviders.forEach(p => {
        grouped[p] = [];
    });

    val.forEach(c => {
        const provider = c.provider || this.provider;
        if (provider && provider !== "none") {
            if (!grouped[provider]) {
                grouped[provider] = [];
            }
            c.provider = provider;
            grouped[provider].push(c);
        }
    });

    // Save each provider's chats
    Object.keys(grouped).forEach(p => {
        const validChats = grouped[p].filter(c => {
            return c.messages && c.messages.some(m => m.role === "user" || m.role === "bot");
        });
        localStorage.setItem(`dj_ai_chats_${p}`, JSON.stringify(validChats));
    });

    if (!window.isApplyingSyncData && window.settings && typeof settings.syncToServer === "function") {
        settings.syncToServer();
    }
  },
  init() {
    this.resetUI();
    // Only count chats with real messages for initial loading
    const allChats = this.chats.filter(c => c.messages && c.messages.some(m => m.role === "user" || m.role === "bot"));
    
    if (allChats.length > 0) {
      this.currentChatId = allChats[0].id;
      this._currentEmptyChat = null;
    } else {
      this.currentChatId = Date.now();
      this._currentEmptyChat = {
        id: this.currentChatId,
        title: "새 대화",
        messages: [],
        model: this.settingsModel,
        provider: this.provider,
        updatedAt: this.currentChatId
      };
    }
    this.renderHistory();
    this.loadChat(this.currentChatId);
    this.updateChatbotAvailability(this.isConnected);
    this.setupInputListeners();
    this.initDB().catch(console.error);
    this.updateModelDisplay();
    window.addEventListener("resize", () => this.updateTagScrollVisibility());

    const savedModels = JSON.parse(
      localStorage.getItem("dj_ai_models_cache") || "[]",
    );
    if (this.provider !== "none") {
      if (this.isConnected && savedModels.length > 0) {
        this.updateModelSelectUI(savedModels);
      }
      this.checkConnection(true);
    } else {
      this.updateChatbotAvailability(false);
      this.updateModelSelectUI([]);
    }
    if (!this.clickListenerAdded) {
      document.addEventListener("click", (e) => {
        if (e.target.closest(".ai-chat-input-area") && !e.target.closest("button") && !e.target.closest("#ai-attach-wrapper")) {
            const input = document.getElementById("ai-user-input");
            if (input && !input.disabled) input.focus();
        }
        
        // 1. Handle Header attachment popover closing
        if (!e.target.closest(".attachment-trigger") && !e.target.closest(".attachment-popover") && !e.target.closest(".validation-tip")) {
          document.querySelectorAll(".attachment-popover.show").forEach(p => p.classList.remove("show"));
        }

        // 2. Handle Message attachment tooltips closing
        if (!e.target.closest(".ai-message-attachment-badge") && !e.target.closest(".attachment-tooltip")) {
          document.querySelectorAll(".attachment-tooltip.show").forEach(t => t.classList.remove("show"));
        }

        // 3. Close any validation tip when clicking outside
        if (document.querySelector(".validation-tip.show") && !e.target.closest(".validation-tip") && !e.target.closest(".popover-delete-btn") && !e.target.closest(".ai-history-item i")) {
            utils.hideValidationTip();
        }

        // 4. Handle Model popup closing
        if (
          !e.target.closest(".history-title") &&
          !e.target.closest(".ai-model-popup")
        ) {
          const popup = document.getElementById("ai-model-popup");
          if (popup && popup.classList.contains("show")) {
            popup.classList.remove("show");
            setTimeout(() => {
              if (!popup.classList.contains("show")) popup.style.display = "none";
            }, 200);
          }
        }

        // 5. Handle Tag Filter popup closing
        if (
          !e.target.closest("#ai-history-tag-btn") &&
          !e.target.closest("#ai-history-tag-popup")
        ) {
          const tagPopup = document.getElementById("ai-history-tag-popup");
          if (tagPopup && tagPopup.classList.contains("show")) {
            tagPopup.classList.remove("show");
            tagPopup.classList.add("hide");
            setTimeout(() => {
              if (!tagPopup.classList.contains("show")) {
                tagPopup.style.display = "none";
                tagPopup.classList.remove("hide");
              }
            }, 200);
          }
        }

        // 6. Handle Floating Search closing
        if (
          !e.target.closest(".ai-history-search-container") &&
          !e.target.closest("#ai-history-search")
        ) {
          const searchInput = document.getElementById("ai-history-search");
          const panel = document.getElementById("ai-history");
          if (panel && panel.classList.contains("collapsed") && searchInput && searchInput.classList.contains("show")) {
            searchInput.classList.remove("show");
            searchInput.classList.add("hide");
            setTimeout(() => {
                if (!searchInput.classList.contains("show")) searchInput.classList.remove("hide");
            }, 200);
          }
        }
      });
      this.clickListenerAdded = true;
    }
  },
  resetUI() {
    this.renderWelcome();
    const input = document.getElementById("ai-user-input");
    if (input) {
      input.value = "";
      input.disabled = false;
      input.placeholder = window.i18n ? window.i18n.get("aiInputPh") : "메시지를 입력 후, Ctrl + Enter를 입력하세요.";
    }
    const sendBtn = document.getElementById("ai-send-btn");
    if (sendBtn) sendBtn.disabled = false;
    const attachBtn = document.getElementById("ai-attach-btn");
    if (attachBtn) attachBtn.disabled = false;
    
    const historyList = document.getElementById("ai-history-list");
    if (historyList) historyList.innerHTML = "";
    this.isGenerating = false;
  },
  getCurrentChat() {
    return this.chats.find((c) => c.id === this.currentChatId) || this._currentEmptyChat;
  },
  toggleMemory(state) {
    const chat = this.getCurrentChat();
    if (!chat) return;
    if (typeof state === 'boolean') {
        chat.memoryMode = state;
    } else {
        chat.memoryMode = chat.memoryMode === false ? true : false;
    }
    
    const chats = this.chats;
    const c = chats.find(x => x.id === chat.id);
    if (c) {
        c.memoryMode = chat.memoryMode;
        this.chats = chats;
    } else if (this._currentEmptyChat?.id === chat.id) {
        this._currentEmptyChat.memoryMode = chat.memoryMode;
    }
    this.updateMemoryUI(true);
  },
  updateMemoryUI(animate = false) {
    const chat = this.getCurrentChat();
    const isMemoryOn = chat ? chat.memoryMode !== false : true;
    const btnOn = document.getElementById("ai-btn-memory-on");
    const btnOff = document.getElementById("ai-btn-memory-off");
    if (btnOn && btnOff) {
      if (isMemoryOn) {
          btnOn.style.display = "inline-block";
          btnOff.style.display = "none";
          if (animate) {
              btnOn.classList.remove("icon-crossover");
              void btnOn.offsetWidth; // force reflow
              btnOn.classList.add("icon-crossover");
          }
      } else {
          btnOn.style.display = "none";
          btnOff.style.display = "inline-block";
          if (animate) {
              btnOff.classList.remove("icon-crossover");
              void btnOff.offsetWidth; // force reflow
              btnOff.classList.add("icon-crossover");
          }
      }
    }
  },
  getChatContext(chat) {
    if (chat.memoryMode === false) return [];
    
    let lastSummaryIdx = -1;
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].isSummary) {
        lastSummaryIdx = i;
        break;
      }
    }
    
    if (lastSummaryIdx !== -1) {
        let sliced = chat.messages.slice(lastSummaryIdx);
        if (sliced.length > 0 && sliced[0].role === "bot") {
            sliced.unshift({ role: "user", content: "이전 대화 맥락을 요약해서 알려줄래?" });
        }
        return sliced;
    }
    return chat.messages;
  },
  updateModelDisplay() {
    this.updateMemoryUI();
    const titleInput = document.getElementById("ai-chat-title-input");
    const historyTitleEl = document.getElementById("ai-history-model-name");
    const chat = this.getCurrentChat();
    
    // Handle input area lock
    const isLocked = this.isChatLocked;
    const input = document.getElementById("ai-user-input");
    const sendBtn = document.getElementById("ai-send-btn");
    const attachBtn = document.getElementById("ai-attach-btn");
    const inputArea = document.querySelector(".ai-chat-input-area");

    if (titleInput) {
      titleInput.value = chat ? this.getDisplayTitle(chat.title) : this.getDisplayTitle("");
      titleInput.disabled = isLocked;
    }
    if (historyTitleEl) {
      historyTitleEl.innerText = chat?.model || this.settingsModel || "AI Chat";
      if (isLocked) {
          historyTitleEl.style.pointerEvents = "none";
          historyTitleEl.style.opacity = "0.5";
      } else {
          historyTitleEl.style.pointerEvents = "auto";
          historyTitleEl.style.opacity = "1";
      }
    }
    
    if (input) {
      input.disabled = isLocked;
      if (isLocked) {
        const chatProvider = chat?.provider || this.provider;
        const pName = this.getProviderName(chatProvider);
        const msg = window.i18n ? window.i18n.get("msgAiChatLocked").replace("{0}", pName) : `대화를 이어가려면 ${pName}로 변경하십시오.`;
        input.placeholder = msg;
        input.value = "";
        input.classList.add("locked-placeholder");
      } else {
        input.placeholder = window.i18n ? window.i18n.get("aiInputPh") : "메시지를 입력 후, Ctrl + Enter를 입력하세요.";
        input.classList.remove("locked-placeholder");
      }
    }
    if (sendBtn) sendBtn.disabled = isLocked;
    if (attachBtn) attachBtn.disabled = isLocked;
    
    if (inputArea) {
      if (isLocked) inputArea.classList.add("locked");
      else inputArea.classList.remove("locked");
    }

    this.renderChatTags(chat);

    const actionsEl = document.querySelector(".ai-actions");
    if (actionsEl) {
      if (chat) {
        actionsEl.innerHTML = "";
        
        // Tag Add icon
        const tagAddBtn = document.createElement("i");
        tagAddBtn.id = "ai-header-tag-add-btn";
        tagAddBtn.className = "fas fa-tag";
        tagAddBtn.title = window.i18n ? window.i18n.get("tipAddTag") : "태그 추가";
        const hasRealMessages = chat.messages.some(m => m.role === "user" || m.role === "bot");
        const isShell = this._currentEmptyChat && chat.id === this._currentEmptyChat.id;

        if (isLocked || (isShell && !hasRealMessages) || (!hasRealMessages && this.isDefaultTitle(chat.title))) {
            tagAddBtn.style.opacity = "0.3";
            tagAddBtn.style.pointerEvents = "none";
        } else {
            tagAddBtn.onclick = () => this.openTagModal();
        }
        actionsEl.appendChild(tagAddBtn);

        if (hasRealMessages) {
          // Global Attachment icon
          const allAttachments = [];
          chat.messages.forEach(m => {
            if (m.attachments) {
              allAttachments.push(...m.attachments.filter(a => !a.deleted));
            }
          });
          
          if (allAttachments.length > 0) {
            const attachListBtn = document.createElement("i");
            attachListBtn.className = "fas fa-paperclip";
            attachListBtn.title = window.i18n ? window.i18n.get("tipAttachList") : "첨부된 파일 목록";
            attachListBtn.onclick = (e) => this.toggleAttachmentPopover(e);
            
            const wrapper = document.createElement("div");
            wrapper.className = "header-attachment-wrapper";
            wrapper.appendChild(attachListBtn);
            
            const popover = document.createElement("div");
            popover.id = "ai-header-attachment-popover";
            popover.className = "attachment-popover";
            wrapper.appendChild(popover);
            
            actionsEl.appendChild(wrapper);
          }
          
          // Export icon
          const exportBtn = document.createElement("i");
          exportBtn.className = "fas fa-file-arrow-down ai-btn-export";
          exportBtn.title = window.i18n ? window.i18n.get("txtExportText") : "텍스트로 내보내기";
          exportBtn.onclick = (e) => this.exportChatToText(chat.id, e);
          actionsEl.appendChild(exportBtn);
        }
      } else {
        actionsEl.innerHTML = "";
      }
    }
  },
  parseTitleAndTags(rawTitle, requireDelimiter = false) {
    if (!rawTitle) return { title: "", tags: [] };
    const tags = [];
    const regex = requireDelimiter
      ? /#([^\s,	]+)([ \s,	])/g
      : /#([^\s,	]+)([ \s,	]|$)/g;

    let titleStr = rawTitle.replace(regex, (match, tag, delimiter) => {
      tags.push(tag);
      return delimiter || ""; // Return the delimiter to maintain spacing if needed, but the requirement says "disappear"
    });
    return { title: titleStr, tags };
  },
  handleTitleInput(val) {
    if (!this.currentChatId) return;
    const parsed = this.parseTitleAndTags(val, true);
    const chats = this.chats;
    const chat = chats.find((c) => c.id === this.currentChatId) || (this._currentEmptyChat?.id === this.currentChatId ? this._currentEmptyChat : null);
    
    if (chat && parsed.tags.length > 0) {
        chat.tags = [...new Set([...(chat.tags || []), ...parsed.tags])];
        this.renderChatTags(chat);
        
        // Requirement 3: Remove tag from title input in real-time
        const titleInput = document.getElementById("ai-chat-title-input");
        if (titleInput) {
            const start = titleInput.selectionStart;
            titleInput.value = parsed.title;
            // Try to keep cursor position if possible, but real-time removal is tricky
            const newPos = Math.max(0, start - (val.length - parsed.title.length));
            titleInput.setSelectionRange(newPos, newPos);
        }
        
        // Also update internal title if it's not the initial input
        chat.title = parsed.title.trim() || "새 대화";
        this.chats = chats;
        this.renderHistory("", chat.id);
    }
  },
  updateChatTitle(newTitle) {
    if (!this.currentChatId) return;
    const chats = this.chats;
    const chat = chats.find((c) => c.id === this.currentChatId) || (this._currentEmptyChat?.id === this.currentChatId ? this._currentEmptyChat : null);
    if (chat) {
      const parsed = this.parseTitleAndTags(newTitle);
      chat.title = parsed.title || "새 대화";
      if (parsed.tags.length > 0) {
          chat.tags = [...new Set([...(chat.tags || []), ...parsed.tags])];
      }
      chat.updatedAt = Date.now();
      this.chats = chats;
      
      const titleInput = document.getElementById("ai-chat-title-input");
      if (titleInput) titleInput.value = chat.title;
      this.renderChatTags(chat);

      this.renderHistory("", chat.id);
    }
  },
  renderChatTags(chat, toggledTag = null) {
    const container = document.getElementById("ai-chat-tags-container");
    const wrapper = document.querySelector(".ai-header-tags-wrapper");
    if (!container) return;
    container.innerHTML = "";
    const hasTags = chat && chat.tags && chat.tags.length > 0;
    if (hasTags) {
      chat.tags.forEach(tag => {
        const chip = document.createElement("div");
        const isActive = this.activeTagFilters && this.activeTagFilters.includes(tag);
        const isAnimating = toggledTag === tag;
        
        // Define animation class based on whether it was toggled ON or OFF
        let animClass = "";
        if (isAnimating) {
            animClass = isActive ? "filling" : "emptying";
        }
        
        chip.className = `ai-tag-chip ${isActive ? "active" : ""} ${animClass}`;
        
        const span = document.createElement("span");
        span.innerText = `#${tag}`;
        chip.appendChild(span);
        
        if (!this.isChatLocked) {
            const delIcon = document.createElement("i");
            delIcon.className = "fas fa-times delete-tag";
            delIcon.onclick = (e) => {
                e.stopPropagation();
                this.deleteTag(chat.id, tag);
            };
            chip.appendChild(delIcon);
        }
        
        chip.onclick = (e) => {
            if (e.target.classList.contains("delete-tag")) return;
            e.stopPropagation();
            
            // Toggle tag in filters
            if (!this.activeTagFilters) this.activeTagFilters = [];
            const index = this.activeTagFilters.indexOf(tag);
            if (index === -1) {
                this.activeTagFilters.push(tag);
            } else {
                this.activeTagFilters.splice(index, 1);
            }
            
            this.updateTagFilterIconUI();
            this.renderHistory();
            
            // Pass the tag name to renderChatTags so only this tag animates
            this.renderChatTags(chat, tag);
            
            // Also update checkboxes if popup is open
            const popup = document.getElementById("ai-history-tag-popup");
            if (popup && popup.classList.contains("show")) {
                // We need to re-render the popup to show updated checkbox state
                this.toggleTagFilterPopup(); 
                this.toggleTagFilterPopup(); 
            }
        };
        
        container.appendChild(chip);
      });
    }
    if (wrapper) {
        wrapper.style.display = hasTags ? "flex" : "none";
    }
    this.updateTagScrollVisibility();
    this.updateTagFilterIconUI();
  },
  updateTagFilterIconUI() {
    const btn = document.getElementById("ai-history-tag-btn");
    if (!btn) return;
    const isActive = this.activeTagFilters && this.activeTagFilters.length > 0;
    btn.classList.toggle("active", isActive);
  },
  updateTagScrollVisibility() {
    const container = document.getElementById("ai-chat-tags-container");
    if (!container) return;
    const leftBtn = document.querySelector(".tag-scroll-btn.fa-caret-left");
    const rightBtn = document.querySelector(".tag-scroll-btn.fa-caret-right");
    if (leftBtn && rightBtn) {
        // Use a small delay to ensure rendering and animations are stable
        setTimeout(() => {
            const hasOverflow = container.scrollWidth > container.clientWidth + 2; // 2px buffer
            leftBtn.style.display = hasOverflow ? "block" : "none";
            rightBtn.style.display = hasOverflow ? "block" : "none";

            if (hasOverflow) {
                // Update disabled state based on scroll position
                const scrollLeft = container.scrollLeft;
                const maxScroll = container.scrollWidth - container.clientWidth;
                
                // Tolerance of 1px for rounding issues
                leftBtn.classList.toggle("disabled", scrollLeft <= 1);
                rightBtn.classList.toggle("disabled", scrollLeft >= maxScroll - 1);
            }
        }, 50);
    }
  },
  scrollTags(direction) {
    const container = document.getElementById("ai-chat-tags-container");
    if (!container) return;
    const scrollAmount = 150;
    container.scrollLeft += direction * scrollAmount;
    
    // Update button states after scroll
    setTimeout(() => this.updateTagScrollVisibility(), 100);
    // Also listen for scroll events if not already
    if (!container.dataset.hasScrollListener) {
        container.addEventListener("scroll", () => this.updateTagScrollVisibility(), { passive: true });
        container.dataset.hasScrollListener = "true";
    }
  },
  openTagModal(isManage = false) {
    if (this.isChatLocked) return;
    const modal = document.getElementById("aiTagModal");
    if (!modal) return;
    
    const titleEl = modal.querySelector("h3");
    if (titleEl) {
        const key = isManage ? "modalTagManage" : "modalTagAdd";
        titleEl.setAttribute("data-i18n", key);
        if (window.i18n) titleEl.innerHTML = window.i18n.get(key);
        else titleEl.innerText = isManage ? "태그 관리" : "태그 추가";
    }
    
    modal.style.display = "flex";
    void modal.offsetWidth;
    modal.classList.add("show");
    
    const input = document.getElementById("aiTagInput");
    if (input) {
        input.value = "";
        input.setAttribute("data-i18n-ph", "tagInputPh");
        if (window.i18n) input.placeholder = window.i18n.get("tagInputPh");
        else input.placeholder = "태그를 입력하여 주세요";
        setTimeout(() => input.focus(), 100);
    }
    this.renderModalTags();
  },
  closeTagModal() {
    const modal = document.getElementById("aiTagModal");
    if (modal) {
        modal.classList.remove("show");
        setTimeout(() => {
            if (!modal.classList.contains("show")) modal.style.display = "none";
        }, 300);
    }
  },
  handleTagInputKeyDown(e) {
    // Delimiters: space, comma, tab, Enter
    const delimiters = [" ", ",", "Tab", "Enter"];
    if (delimiters.includes(e.key)) {
        e.preventDefault();
        const input = e.target;
        const val = input.value.trim();
        if (val) {
            const cleanTags = val.split(/[ ,	]+/).map(t => t.replace(/^#+/, "")).filter(t => t);
            if (cleanTags.length > 0) {
                const chats = this.chats;
                const chat = chats.find(c => c.id === this.currentChatId) || (this._currentEmptyChat?.id === this.currentChatId ? this._currentEmptyChat : null);
                if (chat) {
                    chat.tags = [...new Set([...(chat.tags || []), ...cleanTags])];
                    this.chats = chats;
                    this.renderChatTags(chat);
                    this.renderModalTags();
                    chat.updatedAt = Date.now();
                    this.renderHistory("", chat.id);
                }
            }
            input.value = "";
        }
    }
  },
  addTagFromInput() {
    const input = document.getElementById("aiTagInput");
    if (!input) return;
    const val = input.value.trim();
    if (val) {
        const cleanTags = val.split(/[ ,	]+/).map(t => t.replace(/^#+/, "")).filter(t => t);
        if (cleanTags.length > 0) {
            const chats = this.chats;
            const chat = chats.find(c => c.id === this.currentChatId) || (this._currentEmptyChat?.id === this.currentChatId ? this._currentEmptyChat : null);
            if (chat) {
                chat.tags = [...new Set([...(chat.tags || []), ...cleanTags])];
                this.chats = chats;
                this.renderChatTags(chat);
                this.renderModalTags();
                chat.updatedAt = Date.now();
                this.renderHistory("", chat.id);
            }
        }
        input.value = "";
        this.closeTagModal();
    } else {
        this.closeTagModal();
    }
  },
  renderModalTags() {
    const container = document.getElementById("aiModalTagsPreview");
    if (!container) return;
    container.innerHTML = "";
    const chat = this.getCurrentChat();
    if (chat && chat.tags && chat.tags.length > 0) {
        container.classList.add("has-tags");
        chat.tags.forEach(tag => {
            const chip = document.createElement("div");
            chip.className = "ai-tag-chip";
            
            const span = document.createElement("span");
            span.innerText = `#${tag}`;
            chip.appendChild(span);
            
            const delIcon = document.createElement("i");
            delIcon.className = "fas fa-times delete-tag";
            delIcon.style.display = "inline-block"; // Always show in modal
            delIcon.onclick = (e) => {
                e.stopPropagation();
                this.deleteTag(chat.id, tag);
                this.renderModalTags();
            };
            chip.appendChild(delIcon);
            
            container.appendChild(chip);
        });
    } else {
        container.classList.remove("has-tags");
    }
  },
  promptAddTag() {
    // Legacy - replaced by openTagModal
    this.openTagModal();
  },
  editTag(chatId, oldTag) {
    if (this.isChatLocked) return;
    const newTag = prompt("태그 수정:", oldTag);
    if (newTag !== null) {
        const cleanTag = newTag.trim().replace(/^#+/, "");
        const chats = this.chats;
        const chat = chats.find(c => c.id === chatId) || (this._currentEmptyChat?.id === chatId ? this._currentEmptyChat : null);
        if (chat && chat.tags) {
            if (!cleanTag) {
                // if they cleared the prompt, treat as delete
                this.deleteTag(chatId, oldTag);
                return;
            }
            const idx = chat.tags.indexOf(oldTag);
            if (idx > -1) {
                chat.tags[idx] = cleanTag;
                // remove duplicates
                chat.tags = [...new Set(chat.tags)];
                this.chats = chats;
                this.renderChatTags(chat);
                chat.updatedAt = Date.now();
                this.renderHistory("", chat.id);
            }
        }
    }
  },
  deleteTag(chatId, tagToRemove) {
    if (this.isChatLocked) return;
    const chats = this.chats;
    const chat = chats.find(c => c.id === chatId) || (this._currentEmptyChat?.id === chatId ? this._currentEmptyChat : null);
    if (chat && chat.tags) {
        chat.tags = chat.tags.filter(t => t !== tagToRemove);
        this.chats = chats;
        this.renderChatTags(chat);
        chat.updatedAt = Date.now();
        this.renderHistory("", chat.id);
        
        // Refresh popup if it is currently open to reflect the deleted tag
        const popup = document.getElementById("ai-history-tag-popup");
        if (popup && (popup.classList.contains("show") || popup.style.display === "flex")) {
            this.toggleTagFilterPopup(); // hide
            this.toggleTagFilterPopup(); // show
        }
    }
  },
  closeModelPopup() {
    const popup = document.getElementById("ai-model-popup");
    if (popup && popup.classList.contains("show")) {
      popup.classList.remove("show");
      setTimeout(() => {
        if (!popup.classList.contains("show")) popup.style.display = "none";
      }, 200);
    }
  },
  toggleModelPopup(e) {
    e.stopPropagation();
    utils.hideValidationTip();
    const popup = document.getElementById("ai-model-popup");
    if (!popup) return;
    if (popup.classList.contains("show")) {
      popup.classList.remove("show");
      setTimeout(() => {
        if (!popup.classList.contains("show")) popup.style.display = "none";
      }, 200);
      return;
    }
    const models = JSON.parse(
      localStorage.getItem("dj_ai_models_cache") || "[]"
    );
    popup.innerHTML = "";
    const chat = this.getCurrentChat();
    const activeModel = chat?.model || this.settingsModel;
    if (models.length > 0) {
      models.forEach((m) => {
        const div = document.createElement("div");
        div.className = `ai-model-item ${m === activeModel ? "active" : ""}`;
        div.innerHTML = `<span>${m}</span>${m === activeModel ? '<i class="fas fa-check" style="font-size:0.7rem;"></i>' : ""}`;
        div.onclick = (evt) => {
          evt.stopPropagation();
          this.selectTemporaryModel(m);
          this.closeModelPopup();
        };
        popup.appendChild(div);
      });
      setTimeout(() => {
        const activeItem = popup.querySelector(".ai-model-item.active");
        if (activeItem) {
          const containerHeight = popup.clientHeight;
          const itemOffsetTop = activeItem.offsetTop;
          const itemHeight = activeItem.offsetHeight;
          popup.scrollTop = itemOffsetTop - containerHeight / 2 + itemHeight / 2;
        }
      }, 50);
    } else {
      const tip = document.createElement("div");
      tip.className = "ai-model-tip";
      tip.style.padding = "10px";
      tip.style.fontSize = "0.8rem";
      tip.style.color = "#94a3b8";
      tip.innerText = this.isConnected ? 
        window.i18n ? window.i18n.get("msgAiModelSelectTip1") : "다른 모델을 사용하려면\n서버에 모델을 추가 설치해주세요." :
        window.i18n ? window.i18n.get("msgAiModelSelectTip2") : "서버에 연결되면\n모델 목록이 표시됩니다.";
      popup.appendChild(tip);
    }
    popup.style.display = "block";
    popup.classList.add("show");
  },
  selectTemporaryModel(m) {
    const chats = this.chats;
    const chat = chats.find((c) => c.id === this.currentChatId);
    if (chat) {
      const oldModel = chat.model || this.settingsModel;
      if (oldModel !== m) {
        if (!chat._lastModel) chat._lastModel = oldModel;
        chat.model = m;
        const hasRealMessages = chat.messages.some(m => m.role === "user" || m.role === "bot");
        if (hasRealMessages) {
          const msg = `<i class="fas fa-exclamation-triangle" style="color: #eab308; margin-right: 6px;"></i>${window.i18n ? window.i18n.get("msgAiModelChange").replace("{0}", m) : "모델이 " + m + "(으)로 변경되었습니다."}`;
          chat.messages.push({ 
            role: "system", 
            content: msg,
            timestamp: Date.now()
          });
          this.appendMessage("system", msg, true, true);
        }
        this.chats = chats;
        this.updateModelDisplay();
      }
    }
  },
  updateChatbotAvailability(isConnected) {
    this.isConnected = isConnected;
    const aiIcon = document.querySelector(".ai-search-icon");
    if (aiIcon) {
      aiIcon.classList.toggle("active", isConnected);
      aiIcon.classList.toggle("can-chat", isConnected);
      aiIcon.style.color = isConnected ? "" : "#94a3b8";
      const tooltipKey = isConnected ? "sideAI" : "aiNeedConnectHover";
      aiIcon.dataset.i18nTitle = tooltipKey;
      if (window.i18n) {
        aiIcon.setAttribute("title", window.i18n.get(tooltipKey) || "");
      }
    }
    this.updateStatusUI();
  },
  updateModelSelectUI(models) {
    const triggerName = document.getElementById("ai-model-trigger-name");
    const trigger = document.getElementById("ai-model-trigger");
    if (this.isConnected && models.length > 0) {
      const savedModel = localStorage.getItem("dj_ai_model");
      if (savedModel && !models.includes(savedModel)) {
        localStorage.setItem("dj_ai_model", models[0]);
        this.selectTemporaryModel(models[0]);
      } else if (!savedModel) {
        localStorage.setItem("dj_ai_model", models[0]);
      }
      localStorage.setItem("dj_ai_models_cache", JSON.stringify(models));
      if (triggerName) {
        triggerName.innerText = this.settingsModel;
      }
      if (trigger) trigger.classList.remove("disabled");
      this.updateModelDisplay();
    } else {
      localStorage.setItem("dj_ai_models_cache", JSON.stringify([]));
      if (triggerName) {
        triggerName.innerText = window.i18n ? window.i18n.get("aiNoServer") : window.i18n ? window.i18n.get("aiNoServer") : "접속 안됨";
      }
      if (trigger) trigger.classList.add("disabled");
    }
  },
  updateStatusUI(state = "normal") {
    const statusSpan = document.getElementById("ai-connection-status");
    const dot = statusSpan?.querySelector(".status-dot");
    const text = statusSpan?.querySelector(".status-text");
    if (this._statusInterval) {
        clearInterval(this._statusInterval);
        this._statusInterval = null;
    }
    if (state === "checking") {
      const gray = "#94a3b8";
      if (dot) dot.style.background = gray;
      let count = 0;
      const updateText = () => {
        count = (count % 3) + 1;
        const dots = ".".repeat(count);
        const checkingText = window.i18n ? window.i18n.get("msgAiChecking") : "서버 확인 중";
        if (text) text.innerText = `${checkingText}${dots}`;
      };
      updateText();
      this._statusInterval = setInterval(updateText, 500);
      if (statusSpan) statusSpan.style.color = gray;
      return;
    }
    if (this.isConnected) {
      const green = "#22c55e";
      if (dot) dot.style.background = green;
      if (text) {
        let pName = this.getProviderName(this.provider);
        text.innerText = `${window.i18n ? window.i18n.get("msgAiConnected").replace("{0}", pName) : pName + " 연결됨"}`;
      }
      if (statusSpan) statusSpan.style.color = green;
    } else {
      const gray = "#94a3b8",
        red = "#ef4444";
      const hasProvider = this.provider !== "none";
      if (dot) dot.style.background = hasProvider ? red : gray;
      if (text) {
        text.innerText = hasProvider ? window.i18n ? window.i18n.get("msgConnFail") : "서버 연결 실패" : (window.i18n ? window.i18n.get("aiNeedConnect") : window.i18n ? window.i18n.get("aiNeedConnect") : "서버 연결 안됨");
      }
      if (statusSpan) statusSpan.style.color = hasProvider ? red : gray;
    }
  },
  async checkConnection(isSilent = false) {
    const provider = localStorage.getItem("dj_ai_provider") || "none";
    const apiKeyInput = document.getElementById("aiApiKeyInput");
    const apiKey = (isSilent || !apiKeyInput) ? this.apiKey : apiKeyInput.value.trim();
    let url = this.serverUrl; 
    if (provider === "none") {
        this.updateChatbotAvailability(false);
        this.updateModelSelectUI([]);
        return;
    }
    this.updateStatusUI("checking");
    const finalize = (isConnected, models = []) => {
      this.updateChatbotAvailability(isConnected);
      this.updateModelSelectUI(models);
      if (!isSilent) {
        const pName = this.getProviderName(provider);
        utils.showValidationTip("ai-provider-trigger", isConnected ? `${window.i18n ? window.i18n.get("msgAiConnSuccess").replace("{0}", pName) : pName + " 연결 성공!"}` : `${window.i18n ? window.i18n.get("msgAiConnFail").replace("{0}", pName) : pName + " 연결 실패!"}`, isConnected ? "success" : "error");
      }
    };
    try {
      if (provider === "openai") {
        if (!apiKey) { finalize(false); return; }
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          finalize(true, data.data.filter((m) => m.id.startsWith("gpt-")).map((m) => m.id).sort());
        } else finalize(false);
      } else if (provider === "gemini") {
        if (!apiKey) { finalize(false); return; }
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          finalize(true, data.models.filter((m) => m.supportedGenerationMethods.includes("generateContent")).map((m) => m.name.replace("models/", "")));
        } else finalize(false);
      } else {
        if (!url) { finalize(false); return; }
        let fetchUrl = url.endsWith("/") ? url.slice(0, -1) : url;
        const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
        const currentCustom = customAis.find(a => a.id === provider);
        const protocol = currentCustom ? currentCustom.protocol : "openai";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        try {
          if (protocol === "ollama") {
            const res = await fetch(`${fetchUrl}/api/tags`, { 
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            const contentType = res.headers.get("content-type");
            const isJson = contentType && contentType.includes("application/json");
            if (res.ok && isJson) {
                const data = await res.json();
                if (data && data.models && Array.isArray(data.models)) {
                    finalize(true, data.models.map(m => m.name));
                } else {
                    finalize(false); // 규격 불일치
                }
            } else finalize(false);
          } else if (protocol === "gemini") {
            const checkUrl = `${fetchUrl}/v1beta/models?key=${apiKey}`;
            const res = await fetch(checkUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                finalize(true, data.models.filter((m) => m.supportedGenerationMethods.includes("generateContent")).map((m) => m.name.replace("models/", "")));
            } else finalize(false);
          } else {
            const headers = { "Content-Type": "application/json" };
            const isLocal = fetchUrl.includes("127.0.0.1") || fetchUrl.includes("localhost");
            if (!apiKey && !isLocal && !isSilent) {
                finalize(false);
                return;
            }
            if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
            let checkUrlNormalized = fetchUrl.endsWith("/v1") ? fetchUrl.slice(0, -3) : fetchUrl;
            const res = await fetch(`${checkUrlNormalized}/v1/models`, { 
                headers: headers,
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            const contentType = res.headers.get("content-type");
            const isJson = contentType && contentType.includes("application/json");
            if (res.ok && isJson) {
                const data = await res.json();
                if (data && data.data && Array.isArray(data.data)) {
                    finalize(true, data.data.map(m => m.id).sort());
                } else {
                    finalize(false); // 주소는 맞으나 규격이 다름
                }
            } else {
                if ((res.status === 401 || res.status === 403) && !isLocal) {
                    finalize(false);
                } else if (res.status === 404 && isJson) {
                    finalize(true);
                } else {
                    finalize(false);
                }
            }
          }
        } catch (err) {
          clearTimeout(timeoutId);
          finalize(false);
        }
      }
    } catch (e) {
      finalize(false);
    }
  },
  getProviderName(provider) {
    const defaultNames = { none: window.i18n ? window.i18n.get("optNone") : "사용 안 함", openai: "OpenAI", gemini: "Gemini" };
    if (defaultNames[provider]) return defaultNames[provider];
    const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    const current = customAis.find(a => a.id === provider);
    return current ? current.name : "AI";
  },
  focusInput() {
    const input = document.getElementById("ai-user-input");
    if (!input) return;
    setTimeout(() => input.focus(), 50);
  },
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file instanceof Blob ? file : file.data);
    });
  },
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file instanceof Blob ? file : file.data);
    });
  },
  async sendMessage() {
    if (this.isChatLocked) return;
    const input = document.getElementById("ai-user-input");
    const text = input?.value.trim();
    if (this.isGenerating) return;
    if (!text && this.attachments.length === 0) {
      this.focusInput();
      return;
    }
    if (!this.isConnected) {
      this.showErrorModal();
      return;
    }
    let chat = this.getCurrentChat();
    if (!chat) {
      this.createNewChat();
      chat = this._currentEmptyChat;
    }
    const activeModel = chat.model || this.settingsModel;
    const currentAttachments = [...this.attachments];
    
    // UI displays original text + attachment icons
    this.appendMessage("user", text, true, false, currentAttachments, true);
    if (input) input.value = "";
    this.clearAttachments();
    this.focusInput();
    this.isGenerating = true;
    const botMsgDiv = this.appendMessage(
      "bot",
      `<div class="typing-indicator"><span></span><span></span><span></span></div>`,
      false,
      true,
      [],
      true
    );
    try {
      const provider = this.provider;
      if (provider.startsWith("custom_"))
        await this.callLocalAI(text, botMsgDiv, chat, activeModel, currentAttachments);
      else if (provider === "openai")
        await this.callOpenAI(text, botMsgDiv, chat, activeModel, currentAttachments);
      else if (provider === "gemini")
        await this.callGemini(text, botMsgDiv, chat, activeModel, currentAttachments);
      this.updateStatusUI();
      this.updateModelDisplay();
      this.renderHistory();
    } catch (e) {
      if (e.message === "Model permission error") {
      } else {
        botMsgDiv.innerText = window.i18n ? window.i18n.get("msgAiErrorComm") : "오류: 서버와 통신할 수 없습니다.";
        this.updateChatbotAvailability(false);
        setTimeout(() => this.showErrorModal(), 300);
      }
    } finally {
      this.isGenerating = false;
      this.focusInput();
    }
  },
  handleModelError(model) {
    const chats = this.chats;
    const chat = chats.find((c) => c.id === this.currentChatId) || (this._currentEmptyChat?.id === this.currentChatId ? this._currentEmptyChat : null);
    if (chat && chat._lastModel && chat._lastModel !== model) {
        const rollbackModel = chat._lastModel;
        const msg = `<i class="fas fa-exclamation-circle" style="color: #ef4444; margin-right: 6px;"></i>${window.i18n ? window.i18n.get("msgAiModelNotSupported").replace("{0}", rollbackModel) : "모델이 지원되지 않아 원래 모델(" + rollbackModel + ")로 복귀합니다."}`;
        chat.model = rollbackModel;
        chat.messages.push({ 
          role: "system", 
          content: msg,
          timestamp: Date.now()
        });
        this.chats = chats;
        this.updateModelDisplay();
        this.appendMessage("system-error", msg, true, true);
    } else {
        const msg = `<i class="fas fa-exclamation-circle" style="color: #ef4444; margin-right: 6px;"></i>${window.i18n ? window.i18n.get("msgAiModelUnauthorized").replace("{0}", model) : "모델(" + model + ") 사용 권한이 없거나 지원되지 않습니다."}`;
        this.appendMessage("system-error", msg, true, true);
    }
  },
  getSystemBasePrompt() {
    return "You are a helpful AI assistant in a web interface that supports file uploads. The interface provides you with metadata about files (name, type, status). If a file is marked as 'DELETED', its content is no longer accessible, but you must remember its presence in the conversation history to answer questions about what was uploaded or deleted during this session.";
  },
  async prepareAIInput(originalPrompt, attachments = []) {
    let aiPrompt = originalPrompt || "";
    const activeAttachments = (attachments || []).filter(a => !a.deleted);
    const deletedAttachments = (attachments || []).filter(a => a.deleted);

    let attachmentInfo = "";
    if (activeAttachments.length > 0) {
      attachmentInfo += `\n\n[CONTEXT: The user has just uploaded ${activeAttachments.length} active file(s)]`;
      for (const file of activeAttachments) {
        const isImage = file.type && file.type.startsWith("image/");
        attachmentInfo += `\n- File Name: ${file.name} (Type: ${isImage ? "Image" : "Document"})`;
        
        if (!isImage) {
          try {
            const content = await this.readFileContent(file);
            file.textContent = content;
            attachmentInfo += `\n[Content of ${file.name}]:\n${content}\n---`;
          } catch (e) {
            console.error(`Failed to read file ${file.name}`, e);
          }
        }
      }
    }

    if (deletedAttachments.length > 0) {
      attachmentInfo += `\n\n[CONTEXT: The following files were attached but have been DELETED. You cannot access their contents, but you should know they were part of this message]:`;
      deletedAttachments.forEach(file => {
        attachmentInfo += `\n- ${file.name} (Status: DELETED)`;
      });
    }

    if (attachmentInfo) {
      aiPrompt = attachmentInfo + "\n\n" + aiPrompt;
    }
    return aiPrompt;
  },
  formatMessageContent(msg) {
    let content = msg.content;
    const activeAttachments = (msg.attachments || []).filter(a => !a.deleted);
    const deletedAttachments = (msg.attachments || []).filter(a => a.deleted);
    
    let info = "";
    if (activeAttachments.length > 0) {
      info += `\n\n[CONTEXT: The user has uploaded ${activeAttachments.length} active file(s)]`;
      activeAttachments.forEach(a => {
        const isImage = a.type && a.type.startsWith("image/");
        info += `\n- File Name: ${a.name} (Type: ${isImage ? "Image" : "Document"})`;
        if (a.textContent) {
           info += `\n[Content of ${a.name}]:\n${a.textContent}\n---`;
        }
      });
    }
    
    if (deletedAttachments.length > 0) {
      info += `\n\n[CONTEXT: The following files were attached but have been DELETED. You cannot access their contents, but you should know they were part of this message]:`;
      deletedAttachments.forEach(a => {
        info += `\n- ${a.name} (Status: DELETED)`;
      });
    }
    
    return info ? info + "\n\n" + content : content;
  },
  async buildChatContextPayload(chat, protocol) {
    const contextMsgs = this.getChatContext(chat).filter(m => m.role !== "system");
    const payload = [];

    let allFiles = [];
    try {
       allFiles = await this.getFilesByChatId(chat.id);
    } catch(e) {}
    const fileMap = {};
    allFiles.forEach(f => fileMap[f.id] = f.file || f.data);

    for (const m of contextMsgs) {
      const role = m.role === "bot" ? (protocol === "gemini" ? "model" : "assistant") : "user";
      const textContent = this.formatMessageContent(m); 
      const activeAttachments = (m.attachments || []).filter(a => !a.deleted);
      const images = activeAttachments.filter(a => a.type && a.type.startsWith("image/"));

      if (images.length > 0) {
         if (protocol === "gemini") {
             const parts = [{ text: textContent }];
             for (const img of images) {
                 const fileBlob = fileMap[img.id];
                 if (fileBlob) {
                     try {
                         const base64 = await this.fileToBase64(fileBlob);
                         parts.push({ inline_data: { mime_type: img.type, data: base64 } });
                     } catch(e) {}
                 }
             }
             payload.push({ role, parts });
         } else if (protocol === "anthropic") {
             const content = [{ type: "text", text: textContent }];
             for (const img of images) {
                 const fileBlob = fileMap[img.id];
                 if (fileBlob) {
                     try {
                         const base64 = await this.fileToBase64(fileBlob);
                         content.push({ type: "image", source: { type: "base64", media_type: img.type, data: base64 } });
                     } catch(e) {}
                 }
             }
             payload.push({ role: m.role === "bot" ? "assistant" : "user", content });
         } else if (protocol === "ollama") {
             const msgObj = { role, content: textContent, images: [] };
             for (const img of images) {
                 const fileBlob = fileMap[img.id];
                 if (fileBlob) {
                     try {
                         const base64 = await this.fileToBase64(fileBlob);
                         msgObj.images.push(base64);
                     } catch(e) {}
                 }
             }
             payload.push(msgObj);
         } else {
             const content = [{ type: "text", text: textContent }];
             for (const img of images) {
                 const fileBlob = fileMap[img.id];
                 if (fileBlob) {
                     try {
                         const base64 = await this.fileToBase64(fileBlob);
                         content.push({ type: "image_url", image_url: { url: `data:${img.type};base64,${base64}` } });
                     } catch(e) {}
                 }
             }
             payload.push({ role, content });
         }
      } else {
         if (protocol === "gemini") {
             payload.push({ role, parts: [{ text: textContent }] });
         } else if (protocol === "anthropic") {
             payload.push({ role: m.role === "bot" ? "assistant" : "user", content: textContent });
         } else {
             payload.push({ role, content: textContent });
         }
      }
    }
    return payload;
  },
  async callLocalAI(originalPrompt, msgDiv, chat, model, attachments = []) {
    const isStream = !this.outputAtOnce;
    const provider = this.provider;
    const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    const currentCustom = customAis.find(a => a.id === provider);
    const protocol = currentCustom ? currentCustom.protocol : "openai";
    const headers = { "Content-Type": "application/json" };
    if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const aiPrompt = await this.prepareAIInput(originalPrompt, attachments);

    let url = "";
    let body = {};
    if (protocol === "ollama") {
        const userMsg = { role: "user", content: aiPrompt };
        if (attachments && attachments.length > 0) {
            userMsg.images = [];
            for (const file of attachments) {
                if (file.type && file.type.startsWith("image/")) {
                    try {
                        userMsg.images.push(await this.fileToBase64(file));
                    } catch (e) { console.error(e); }
                }
            }
        }
        url = `${this.serverUrl}/api/chat`;
        
        let systemMsg = this.getSystemBasePrompt();
        const existingSystem = chat.messages.find(m => m.role === "system");
        if (existingSystem) systemMsg += "\n\n" + existingSystem.content.replace(/<[^>]*>/g, '');

        const pastMessages = await this.buildChatContextPayload(chat, "ollama");
        body = {
            model: model,
            messages: [{ role: "system", content: systemMsg }]
              .concat(pastMessages)
              .concat([userMsg]),
            stream: isStream,
        };
    } else if (protocol === "anthropic") {
        const userContent = [{ type: "text", text: aiPrompt }];
        if (attachments && attachments.length > 0) {
            for (const file of attachments) {
                if (file.type && file.type.startsWith("image/")) {
                    try {
                        const base64 = await this.fileToBase64(file);
                        userContent.push({
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: file.type,
                                data: base64
                            }
                        });
                    } catch (e) { console.error(e); }
                }
            }
        }
        url = `${this.serverUrl}/v1/messages`;
        
        let systemText = this.getSystemBasePrompt();
        const existingSystem = chat.messages.find(m => m.role === "system");
        if (existingSystem) systemText += "\n\n" + existingSystem.content.replace(/<[^>]*>/g, '');

        const pastMessages = await this.buildChatContextPayload(chat, "anthropic");
        body = {
            model: model,
            system: systemText,
            messages: pastMessages
              .concat([{ role: "user", content: userContent }]),
            max_tokens: 4096,
            stream: isStream,
        };
    } else if (protocol === "gemini") {
        const parts = [{ text: aiPrompt }];
        if (attachments && attachments.length > 0) {
            for (const file of attachments) {
                if (file.type && file.type.startsWith("image/")) {
                    try {
                        const base64 = await this.fileToBase64(file);
                        parts.push({
                            inline_data: {
                                mime_type: file.type,
                                data: base64
                            }
                        });
                    } catch (e) { console.error(e); }
                }
            }
        }
        url = `${this.serverUrl}/v1beta/models/${model}:generateContent`;
        const history = await this.buildChatContextPayload(chat, "gemini");
        
        let systemText = this.getSystemBasePrompt();
        const existingSystem = chat.messages.find(m => m.role === "system");
        if (existingSystem) systemText += "\n\n" + existingSystem.content.replace(/<[^>]*>/g, '');

        body = {
            contents: history.concat([{ role: "user", parts: parts }]),
            system_instruction: { parts: [{ text: systemText }] }
        };
    } else {
        const userContent = [{ type: "text", text: aiPrompt }];
        if (attachments && attachments.length > 0) {
            for (const file of attachments) {
                if (file.type && file.type.startsWith("image/")) {
                    try {
                        const base64 = await this.fileToBase64(file);
                        userContent.push({
                            type: "image_url",
                            image_url: {
                                url: `data:${file.type};base64,${base64}`
                            }
                        });
                    } catch (e) { console.error(e); }
                }
            }
        }
        let fetchUrl = this.serverUrl;
        if (fetchUrl.endsWith("/")) fetchUrl = fetchUrl.slice(0, -1);
        const baseUrl = fetchUrl.endsWith("/v1") ? fetchUrl.slice(0, -3) : fetchUrl;
        url = `${baseUrl}/v1/chat/completions`;

        let systemMsg = this.getSystemBasePrompt();
        const existingSystem = chat.messages.find(m => m.role === "system");
        if (existingSystem) systemMsg += "\n\n" + existingSystem.content.replace(/<[^>]*>/g, '');

        const pastMessages = await this.buildChatContextPayload(chat, protocol);
        body = {
            model: model,
            messages: [{ role: "system", content: systemMsg }]
              .concat(pastMessages)
              .concat([{ role: "user", content: userContent }]),
            stream: isStream,
        };
    }
    const fetchOptions = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    };
    if (protocol === "anthropic" && this.apiKey) {
        headers["x-api-key"] = this.apiKey;
        headers["anthropic-version"] = "2023-06-01";
        delete headers["Authorization"];
    }
    if (protocol === "gemini" && this.apiKey) {
        url += `?key=${this.apiKey}`;
    }
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
        msgDiv.remove();
        this.handleModelError(model);
        throw new Error("Model permission error");
    }
    this.lastSuccessfulModel = model;
    localStorage.setItem("dj_ai_last_success_model", model);
    let fullText = "";
    if (isStream && protocol !== "gemini") { // Gemini native custom usually doesn't stream well with this simple reader
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            if (protocol === "ollama") {
              const json = JSON.parse(trimmed);
              if (json.message?.content) {
                if (fullText === "") msgDiv.innerHTML = "";
                fullText += json.message.content;
                msgDiv.innerText = fullText;
              }
            } else if (protocol === "anthropic") {
                if (trimmed.startsWith("data: ")) {
                    const json = JSON.parse(trimmed.slice(6));
                    const content = json.delta?.text || "";
                    if (content) {
                        if (fullText === "") msgDiv.innerHTML = "";
                        fullText += content;
                        msgDiv.innerText = fullText;
                    }
                }
            } else {
              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6);
                if (dataStr === "[DONE]") continue;
                const json = JSON.parse(dataStr);
                const content = json.choices[0]?.delta?.content || "";
                if (content) {
                  if (fullText === "") msgDiv.innerHTML = "";
                  fullText += content;
                  msgDiv.innerText = fullText;
                }
              }
            }
            document.getElementById("ai-messages").scrollTop =
                document.getElementById("ai-messages").scrollHeight;
          } catch (e) {}
        }
      }
    } else {
      const json = await response.json();
      if (protocol === "ollama") {
        fullText = json.message?.content || "";
      } else if (protocol === "anthropic") {
        fullText = json.content[0]?.text || "";
      } else if (protocol === "gemini") {
        fullText = json.candidates[0]?.content?.parts[0]?.text || "";
      } else {
        fullText = json.choices[0]?.message?.content || "";
      }
      msgDiv.innerHTML = "";
      msgDiv.innerText = fullText;
    }
    this.saveMessage(chat.id, originalPrompt, fullText, attachments);
  },
  async callOpenAI(originalPrompt, msgDiv, chat, model, attachments = []) {
    const aiPrompt = await this.prepareAIInput(originalPrompt, attachments);

    let content = [{ type: "text", text: aiPrompt }];
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        if (file.type && file.type.startsWith("image/")) {
          try {
            const base64 = await this.fileToBase64(file);
            content.push({
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64}`
              }
            });
          } catch (e) {
            console.error("Failed to convert image to base64", e);
          }
        }
      }
    }

    const pastMessages = await this.buildChatContextPayload(chat, "openai");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "system", content: this.getSystemBasePrompt() }]
          .concat(pastMessages)
          .concat([{ role: "user", content: content }]),
      }),
    });
    if (!res.ok) {
        msgDiv.remove();
        this.handleModelError(model);
        throw new Error("Model permission error");
    }
    this.lastSuccessfulModel = model;
    localStorage.setItem("dj_ai_last_success_model", model);
    const json = await res.json(),
      text = json.choices[0].message.content;
    msgDiv.innerHTML = "";
    msgDiv.innerText = text;
    this.saveMessage(chat.id, originalPrompt, text, attachments);
  },
  async callGemini(originalPrompt, msgDiv, chat, model, attachments = []) {
    const aiPrompt = await this.prepareAIInput(originalPrompt, attachments);

    const parts = [{ text: aiPrompt }];
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        if (file.type && file.type.startsWith("image/")) {
          try {
            const base64 = await this.fileToBase64(file);
            parts.push({
              inline_data: {
                mime_type: file.type,
                data: base64
              }
            });
          } catch (e) {
            console.error("Failed to convert image to base64", e);
          }
        }
      }
    }

    const history = await this.buildChatContextPayload(chat, "gemini");

    let systemText = this.getSystemBasePrompt();
    const systemMsg = chat.messages.find(m => m.role === "system");
    if (systemMsg) systemText += "\n\n" + systemMsg.content.replace(/<[^>]*>/g, '');

    const body = {
        contents: history.concat([{ role: "user", parts: parts }]),
        system_instruction: { parts: [{ text: systemText }] }
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
        msgDiv.remove();
        this.handleModelError(model);
        throw new Error("Model permission error");
    }
    this.lastSuccessfulModel = model;
    localStorage.setItem("dj_ai_last_success_model", model);
    const json = await res.json(),
      text = json.candidates[0].content.parts[0].text;
    msgDiv.innerHTML = "";
    msgDiv.innerText = text;
    this.saveMessage(chat.id, originalPrompt, text, attachments);
  },
  saveMessage(chatId, userPrompt, botResponse, attachments = []) {
    const chats = this.chats;
    let c = chats.find((x) => x.id === chatId);
    if (!c && this._currentEmptyChat?.id === chatId) {
        c = this._currentEmptyChat;
    }
    if (c) {
      const now = Date.now();
      const userMsg = { role: "user", content: userPrompt, timestamp: now };
      if (c.memoryMode === false) userMsg.memoryOff = true;
      if (attachments && attachments.length > 0) {
        userMsg.attachments = attachments.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          size: a.size,
          textContent: a.textContent
        }));
      }
      c.messages.push(userMsg);
      
      const botMsg = { role: "bot", content: botResponse, timestamp: now };
      if (c.memoryMode === false) botMsg.memoryOff = true;
      c.messages.push(botMsg);

      // Auto title for new chats
      if (this.isDefaultTitle(c.title)) {
          const firstLine = userPrompt.split("\n")[0].trim();
          let newTitle = firstLine.length > 100 ? firstLine.substring(0, 100) + "..." : (firstLine || "새 대화");
          const parsed = this.parseTitleAndTags(newTitle);
          c.title = parsed.title;
          if (parsed.tags.length > 0) {
              c.tags = [...new Set([...(c.tags || []), ...parsed.tags])];
          }
      }

      c._lastModel = c.model || this.settingsModel;
      if (!c.provider) c.provider = this.provider;
      c.updatedAt = now;

      if (c === this._currentEmptyChat) {
          const emptyId = this._currentEmptyChat.id;
          this._currentEmptyChat = null;
          
          // Force immediate removal from DOM before any re-render
          const list = document.getElementById("ai-history-list");
          if (list) {
            const ghost = list.querySelector(`.ai-history-item[data-id="${emptyId}"]`);
            if (ghost) {
                ghost.style.display = "none";
                ghost.remove();
            }
          }
          
          this.chats = [c, ...this.chats.filter(x => x.id !== c.id)];
      } else {
          this.chats = chats;
      }
      this.renderHistory("", chatId); // Pass chatId to trigger animation
      this.updateModelDisplay();
      
      // Check if we need to summarize
      if (c.memoryMode !== false) {
          let lastSummaryIdx = -1;
          for (let i = c.messages.length - 1; i >= 0; i--) {
            if (c.messages[i].isSummary) {
              lastSummaryIdx = i;
              break;
            }
          }
          const msgsAfterSummary = lastSummaryIdx !== -1 ? c.messages.slice(lastSummaryIdx + 1) : c.messages;
          const pairCount = Math.floor(msgsAfterSummary.filter(m => m.role === "user" || m.role === "bot").length / 2);
          if (pairCount >= 10) {
              this.summarizeChat(chatId);
          }
      }
    }
  },
  async summarizeChat(chatId) {
    const chats = this.chats;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    let lastSummaryIdx = -1;
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].isSummary) {
        lastSummaryIdx = i;
        break;
      }
    }
    const msgsToSummarize = lastSummaryIdx !== -1 ? chat.messages.slice(lastSummaryIdx + 1) : chat.messages;
    
    let conversationText = "";
    msgsToSummarize.forEach(m => {
        let prefix = m.memoryOff ? "[단순/독립 질문] " : "";
        if (m.role === "user") conversationText += `User: ${prefix}${m.content}\n\n`;
        else if (m.role === "bot") conversationText += `AI: ${prefix}${m.content}\n\n`;
    });
    
    const prompt = `다음 대화 내용을 전체적으로 간략하게 요약해줘. [단순/독립 질문] 표시는 이전 대화 맥락과 무관하게 개별적으로 질문한 내용이니, 이 점을 고려해서 전체 흐름과 문맥을 정리해줘. 다음 대화에 배경 지식(컨텍스트)으로 사용할 수 있도록 핵심만 포함해서 하나의 문단으로 작성해줘:\n\n${conversationText}`;
    const model = chat.model || this.settingsModel;
    const provider = chat.provider || this.provider;
    let summaryText = "";
    
    try {
        if (provider === "gemini" || (provider.startsWith("custom_") && JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]").find(a => a.id === provider)?.protocol === "gemini")) {
            const url = provider.startsWith("custom_") ? `${this.serverUrl}/v1beta/models/${model}:generateContent` : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
            });
            if (res.ok) {
                const json = await res.json();
                summaryText = json.candidates[0].content.parts[0].text;
            }
        } else if (provider === "anthropic" || (provider.startsWith("custom_") && JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]").find(a => a.id === provider)?.protocol === "anthropic")) {
            const url = provider.startsWith("custom_") ? `${this.serverUrl}/v1/messages` : `https://api.anthropic.com/v1/messages`;
            const headers = { "Content-Type": "application/json" };
            if (!provider.startsWith("custom_") && this.apiKey) {
                headers["x-api-key"] = this.apiKey;
                headers["anthropic-version"] = "2023-06-01";
            }
            const res = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ model: model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] })
            });
            if (res.ok) {
                const json = await res.json();
                summaryText = json.content[0].text;
            }
        } else {
            const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
            const currentCustom = customAis.find(a => a.id === provider);
            const protocol = currentCustom ? currentCustom.protocol : "openai";
            let url = provider.startsWith("custom_") ? (protocol === "ollama" ? `${this.serverUrl}/api/chat` : `${this.serverUrl}/v1/chat/completions`) : "https://api.openai.com/v1/chat/completions";
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (provider.startsWith("custom_") && protocol !== "ollama" && !url.endsWith("/chat/completions")) {
                const baseUrl = url.endsWith("/v1") ? url.slice(0, -3) : url;
                url = `${baseUrl}/v1/chat/completions`;
            }

            const headers = { "Content-Type": "application/json" };
            if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;
            
            const body = protocol === "ollama" ? 
                { model: model, messages: [{ role: "user", content: prompt }], stream: false } :
                { model: model, messages: [{ role: "user", content: prompt }] };
                
            const res = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (res.ok) {
                if (protocol === "ollama") {
                    const text = await res.text();
                    try { summaryText = JSON.parse(text).message.content; } catch(e) {}
                } else {
                    const json = await res.json();
                    summaryText = json.choices[0].message.content;
                }
            }
        }
        
        if (summaryText) {
            const freshChats = this.chats;
            const c = freshChats.find(x => x.id === chatId);
            if (c) {
                c.messages.push({
                    role: "bot",
                    content: "이전 10개의 대화가 요약되었습니다.\n\n[요약 내용]\n" + summaryText,
                    isSummary: true,
                    timestamp: Date.now()
                });
                this.chats = freshChats;
                if (this.currentChatId === chatId) {
                    this.appendMessage("system", "대화 10개가 누적되어 이전 컨텍스트가 요약되었습니다.", false, true);
                }
            }
        }
    } catch (e) {
        console.error("Failed to summarize chat", e);
    }
  },
  handleKeyDown(e) {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      if (!this.isChatLocked) this.sendMessage();
    } else if (e.key === "Escape") {
      e.target.blur();
    }
  },
  createHistoryItemElement(chat, currentProvider, animatedId = null, isTrulyNew = false) {
    const div = document.createElement("div");
    div.className = `ai-history-item ${chat.id === this.currentChatId ? "active" : ""}`;
    
    if (isTrulyNew) {
        div.classList.add("chat-new-item");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                div.classList.add("visible");
                setTimeout(() => div.classList.remove("chat-new-item", "visible"), 500);
            });
        });
    }

    const chatProvider = chat.provider || currentProvider;
    const isShell = this._currentEmptyChat && chat.id === this._currentEmptyChat.id;
    const isOther = !isShell && chatProvider !== currentProvider;
    if (isOther) div.classList.add("other-model");
    
    div.dataset.id = chat.id;
    div.onclick = () => this.loadChat(chat.id);
    div.oncontextmenu = (e) => ui.showContextMenu(e, "ai-chat", chat.id);
    
    // Add tooltip for last activity
    const lastTime = chat.updatedAt || chat.id;
    if (lastTime) {
        const d = new Date(lastTime);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const timeStr = window.i18n ? 
            window.i18n.get("aiLastChat") ? window.i18n.get("aiLastChat").replace("{0}", `${yyyy}-${mm}-${dd} ${hh}:${min}`) : `마지막 대화: ${yyyy}-${mm}-${dd} ${hh}:${min}` :
            `마지막 대화: ${yyyy}-${mm}-${dd} ${hh}:${min}`;
        div.title = timeStr;
    }

    const isDefaultTitle = this.isDefaultTitle(chat.title);
    const isLocked = chat.locked;
    let icon = "";
    if (!isDefaultTitle || isLocked) {
      if (isLocked) {
        icon = `<i class="fas fa-lock" onclick="ai.toggleLock(${chat.id}, event)"></i>`;
      } else {
        icon = `<i class="fas fa-trash-alt" onclick="ai.deleteChat(${chat.id}, event)"></i>`;
      }
    }
    div.innerHTML = `<span>${this.getDisplayTitle(chat.title)}</span>${icon}`;
    return div;
  },
  renderHistory(searchTerm = "", updatedChatId = null) {
    const list = document.getElementById("ai-history-list");
    if (!list) return;
    
    const lowerSearch = searchTerm.toLowerCase();
    const currentProvider = this.provider;
    const activeTags = this.activeTagFilters || [];

    // IMMEDIATELY remove 'active' from all existing items to hide trash icons before animation
    Array.from(list.children).forEach(child => {
        if (parseInt(child.dataset.id) !== this.currentChatId) {
            child.classList.remove("active");
        }
    });
    
    const sortedChats = this.chats.filter(chat => {
        const hasMessages = chat.messages && chat.messages.some(m => m.role === "user" || m.role === "bot");
        const isCurrent = chat.id === this.currentChatId;
        const isShell = this._currentEmptyChat && chat.id === this._currentEmptyChat.id;
        
        // Show if: 1. It has real messages, OR 2. It's the one we're currently looking at, OR 3. It's the empty shell
        const shouldShow = hasMessages || isCurrent || isShell;
        if (!shouldShow) return false;

        // Check text search
        if (searchTerm) {
            const searchTerms = lowerSearch.split(/\s+/).filter(t => t);
            const chatTitleLower = chat.title.toLowerCase();
            if (searchTerms.some(term => !chatTitleLower.includes(term))) return false;
        }
        
        // Check tag filters
        if (activeTags.length > 0) {
            if (!chat.tags) return false; 
            // OR logic: Show if any of the active tags are present
            const hasAnyTag = activeTags.some(tag => chat.tags.includes(tag));
            if (!hasAnyTag) return false;
        }

        return true;
    });

    // If search is active or list is empty, full rebuild
    if (searchTerm || list.children.length === 0) {
        // Find existing items to remove with animation
        Array.from(list.children).forEach(child => {
            const id = parseInt(child.dataset.id);
            if (!sortedChats.some(c => c.id === id) && !child.classList.contains("chat-exit")) {
                child.classList.add("chat-exit");
                setTimeout(() => child.remove(), 400);
            } else if (!child.classList.contains("chat-exit")) {
                // If it should stay, we'll rebuild later, but for now just hide it to avoid double
                child.style.display = "none"; 
                child.remove();
            }
        });
        
        sortedChats.forEach(chat => {
            list.appendChild(this.createHistoryItemElement(chat, currentProvider, updatedChatId));
        });
        return;
    }

    // FLIP: First - Capture all positions before modification
    const firstRects = new Map();
    Array.from(list.children).forEach(child => {
        firstRects.set(child.dataset.id, child.getBoundingClientRect());
    });

    // Surgical updates
    sortedChats.forEach((chat, index) => {
        let existing = list.querySelector(`.ai-history-item[data-id="${chat.id}"]`);
        if (existing) {
            // Update state
            const isOther = (chat.provider || currentProvider) !== currentProvider;
            existing.classList.toggle("active", chat.id === this.currentChatId);
            existing.classList.toggle("other-model", isOther);
            existing.querySelector("span").innerText = this.getDisplayTitle(chat.title);
            
            // Update icon if lock state changed or title state changed
            const isDefaultTitle = this.isDefaultTitle(chat.title);
            const isLocked = chat.locked;
            let iconEl = existing.querySelector("i");
            if (isDefaultTitle && !isLocked) {
                if (iconEl) iconEl.remove();
            } else {
                if (!iconEl) {
                    iconEl = document.createElement("i");
                    existing.appendChild(iconEl);
                }
                if (isLocked) {
                    iconEl.className = "fas fa-lock";
                    iconEl.onclick = (e) => this.toggleLock(chat.id, e);
                } else {
                    iconEl.className = "fas fa-trash-alt";
                    iconEl.onclick = (e) => this.deleteChat(chat.id, e);
                }
            }

            // Re-order if needed
            if (list.children[index] !== existing) {
                list.insertBefore(existing, list.children[index]);
            }
        } else {
            // Add new - use the height-expansion animation
            const div = this.createHistoryItemElement(chat, currentProvider, updatedChatId, true);
            list.insertBefore(div, list.children[index]);
        }
    });

    // Remove old with animation
    Array.from(list.children).forEach(child => {
        const id = parseInt(child.dataset.id);
        if (!sortedChats.some(c => c.id === id)) {
            if (!child.classList.contains("chat-exit")) {
                child.classList.remove("active"); // REMOVE ACTIVE to hide trash icon during exit
                child.classList.add("chat-exit");
                setTimeout(() => {
                    if (child.parentNode === list) child.remove();
                }, 400);
            }
        }
    });

    // FLIP: Last, Invert - Capture immediately after DOM changes
    const animatedItems = [];
    Array.from(list.children).forEach(child => {
        // Skip animating items that are currently in their initial height-expansion phase or exiting
        if (child.classList.contains("chat-new-item") || child.classList.contains("chat-exit")) return;

        const id = child.dataset.id;
        const firstRect = firstRects.get(id);
        
        // Calculate inversion
        let invertY = 0;
        if (firstRect) {
            const lastRect = child.getBoundingClientRect();
            invertY = firstRect.top - lastRect.top;
        }

        if (invertY !== 0) {
            child.style.transition = "none";
            child.style.transform = `translateY(${invertY}px)`;
            if (id === String(updatedChatId)) child.style.opacity = "0.7";
            animatedItems.push({ el: child, id: id });
        }
    });

    // FLIP: Play - Trigger in the next available frame
    if (animatedItems.length > 0) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                animatedItems.forEach(({ el, id }) => {
                    el.classList.add("chat-moving");
                    el.style.transition = "";
                    el.style.transform = "";
                    if (id === String(updatedChatId)) el.style.opacity = "1";
                    
                    setTimeout(() => {
                        el.classList.remove("chat-moving");
                        el.style.opacity = "";
                        el.style.transform = "";
                    }, 550);
                });
            });
        });
    }
  },
  filterHistory(val) {
    this.renderHistory(val);
  },
  loadChat(id = null, addedChatId = null) {
    const chats = this.chats;
    this.stopGeneration(); // Stop any ongoing generation
    if (!id) {
      if (chats.length > 0) this.currentChatId = chats[0].id;
      else {
        this.createNewChat();
        return;
      }
    } else this.currentChatId = id;
    this.clearAttachments();
    this.renderHistory("", addedChatId);
    const chat = this.getCurrentChat();
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) {
      msgContainer.innerHTML = "";
      if (chat)
        chat.messages.forEach((m) =>
          this.appendMessage(m.role, m.content, false, m.role.startsWith("system"), m.attachments),
        );
      
      // Trigger transition animation
      msgContainer.classList.remove("content-loading");
      void msgContainer.offsetWidth; // Force reflow
      msgContainer.classList.add("content-loading");
    }
    this.updateModelDisplay();
    const container = document.getElementById("ai-chatbot-container");
    if (container && !container.classList.contains("widget-hidden")) {
      const input = document.getElementById("ai-user-input");
      if (input && !input.disabled) input.focus();
    }
  },
  createNewChat() {
    const chats = this.chats;
    const emptyChat = chats.find(
      (c) =>
        this.isDefaultTitle(c.title) &&
        (!c.messages || c.messages.length === 0 || !c.messages.some(m => m.role === "user" || m.role === "bot"))
    );
    if (emptyChat) {
      // Update provider to current one when reusing the shell
      emptyChat.provider = this.provider;
      emptyChat.model = this.settingsModel;
      this.loadChat(emptyChat.id);
      return;
    }
    const newId = Date.now();
    this.currentChatId = newId;
    this.clearAttachments(); // Explicitly clear any pending attachments
    this._currentEmptyChat = {
      id: newId,
      title: "새 대화",
      messages: [],
      model: this.settingsModel,
      provider: this.provider,
      updatedAt: newId
    };
    this.loadChat(newId, newId);
  },
  cleanupEmptyShell() {
    if (this._currentEmptyChat) {
      const emptyId = this._currentEmptyChat.id;
      this._currentEmptyChat = null;
      
      const list = document.getElementById("ai-history-list");
      if (list) {
        const ghost = list.querySelector(`.ai-history-item[data-id="${emptyId}"]`);
        if (ghost) {
            ghost.style.display = "none";
            ghost.remove();
        }
      }

      // If current chat was the empty shell, load the first available chat or clear UI
      if (this.currentChatId === emptyId) {
        const validChats = this.chats.filter(c => c.messages && c.messages.some(m => m.role === "user" || m.role === "bot"));
        if (validChats.length > 0) {
          this.loadChat(validChats[0].id);
        } else {
          // No chats remain
          const msgContainer = document.getElementById("ai-messages");
          if (msgContainer) msgContainer.innerHTML = "";
          this.updateModelDisplay();
        }
      } else {
        this.renderHistory();
      }
    }
  },
  toggleLock(id, e) {
    if (e) e.stopPropagation();
    const target = e ? e.target : null;
    if (!target) {
        // Fallback for context menu call
        this.performToggleLock(id);
        return;
    }

    const chat = this.chats.find(c => c.id === id) || (this._currentEmptyChat?.id === id ? this._currentEmptyChat : null);
    if (!chat) return;

    const isLocked = chat.locked;
    const msg = isLocked ? "잠금 해제하시겠습니까?" : "잠금하시겠습니까?";
    const btnText = isLocked ? "해제" : "잠금";

    const html = `
      <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; min-width: 120px;">
        <span style="font-size: 0.85rem; white-space: nowrap; font-weight: 600; color: #f1f5f9;">${msg}</span>
        <button class="btn-lock-confirm" onclick="ai.performToggleLock(${id})">${btnText}</button>
      </div>
    `;
    utils.showValidationTip(target, html, "ai-lock-confirm", {
      position: "right",
      isHtml: true,
      noAutoHide: true
    });
  },
  performToggleLock(id) {
    utils.hideValidationTip();
    const chats = this.chats;
    const chat = chats.find(c => c.id === id) || (this._currentEmptyChat?.id === id ? this._currentEmptyChat : null);
    if (chat) {
        chat.locked = !chat.locked;
        this.chats = chats;
        this.renderHistory();
        this.updateModelDisplay();
    }
  },
  exportChatFromCtx() {
    const menu = document.getElementById("globalContextMenu");
    const id = parseInt(menu.dataset.id);
    if (id) this.exportChatToText(id);
  },
  toggleLockFromCtx() {
    const menu = document.getElementById("globalContextMenu");
    const id = parseInt(menu.dataset.id);
    if (id) this.toggleLock(id);
  },
  addTagFromCtx() {
    const menu = document.getElementById("globalContextMenu");
    const id = parseInt(menu.dataset.id);
    if (id) {
        if (this.currentChatId !== id) {
            this.loadChat(id);
        }
        this.openTagModal();
    }
  },
  deleteChatFromCtx() {
    const menu = document.getElementById("globalContextMenu");
    const id = parseInt(menu.dataset.id);
    if (id) {
        const chat = this.chats.find(c => c.id === id);
        if (chat && chat.locked) return;

        const list = document.getElementById("ai-history-list");
        const item = list?.querySelector(`.ai-history-item[data-id="${id}"]`);
        const icon = item?.querySelector("i");
        this.deleteChat(id, { target: icon || item, stopPropagation: () => {} });
    }
  },
  deleteChat(id, e) {
    if (e) e.stopPropagation();
    const target = e ? e.target : null;
    if (!target) return;

    const chats = this.chats;
    const chat = chats.find(c => c.id === id) || (this._currentEmptyChat?.id === id ? this._currentEmptyChat : null);

    if (chat && chat.locked) return;

    const isDefaultTitle = chat ? this.isDefaultTitle(chat.title) : false;
    const hasRealMessages = chat ? chat.messages.some(m => m.role === "user" || m.role === "bot") : false;

    // Immediate delete if it's an empty "New Chat"
    if (isDefaultTitle && !hasRealMessages) {
        this.performDeleteChat(id);
        return;
    }

    const html = `
      <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; min-width: 120px;">
        <span style="font-size: 0.85rem; white-space: nowrap; font-weight: 600; color: #f1f5f9;">삭제하시겠습니까?</span>
        <button class="btn-del-confirm" onclick="ai.performDeleteChat(${id})">${window.i18n ? window.i18n.get("btnDeleteConfirm") : "삭제"}</button>
      </div>
    `;
    utils.showValidationTip(target, html, "ai-delete-confirm", {
      position: "right",
      isHtml: true,
      noAutoHide: true
    });
  },
  performDeleteChat(id) {
    utils.hideValidationTip();
    const list = document.getElementById("ai-history-list");
    const item = list?.querySelector(`.ai-history-item[data-id="${id}"]`);
    const executeDelete = () => {
        // Handle _currentEmptyChat deletion
        if (this._currentEmptyChat && this._currentEmptyChat.id === id) {
            this._currentEmptyChat = null;
        }

        const chats = this.chats.filter((c) => c.id !== id);
        this.chats = chats;
        this.deleteFilesByChatId(id).catch(console.error);

        // Remove from DOM immediately to prevent any leftovers
        const el = list?.querySelector(`.ai-history-item[data-id="${id}"]`);
        if (el) el.remove();
        
        if (this.chats.filter(c => c.messages && c.messages.some(m => m.role === "user" || m.role === "bot")).length === 0 && !this._currentEmptyChat) {
            this.createNewChat();
        } else if (this.currentChatId === id) {
            const remaining = this.chats;
            if (remaining.length > 0) this.loadChat(remaining[0].id);
            else this.createNewChat();
        } else {
            this.renderHistory();
        }
    };
    if (item) {
        item.classList.add("chat-deleting");
        setTimeout(executeDelete, 400);
    } else {
        executeDelete();
    }
  },
  toggleHistory(e) {
    if (e) e.stopPropagation();
    utils.hideValidationTip();
    
    // Instantly close popups when toggling history to prevent position jumping
    const popupsToClose = ["ai-model-popup", "ai-history-tag-popup"];
    popupsToClose.forEach(id => {
      const popup = document.getElementById(id);
      if (popup) {
        popup.classList.remove("show", "hide");
        popup.style.display = "none";
      }
    });

    // Close floating search instantly when toggling history
    const searchInput = document.getElementById("ai-history-search");
    if (searchInput) {
        searchInput.classList.remove("show", "hide");
    }

    this.historyCollapsed = !this.historyCollapsed;
    document
      .getElementById("ai-history")
      ?.classList.toggle("collapsed", this.historyCollapsed);
    document.getElementById("ai-history-toggle").className = this
      .historyCollapsed
      ? "fas fa-angles-right"
      : "fas fa-angles-left";
  },
  toggleFloatingSearch(e) {
    if (e) e.stopPropagation();
    
    // Close tag popup if open
    const tagPopup = document.getElementById("ai-history-tag-popup");
    if (tagPopup && (tagPopup.classList.contains("show") || tagPopup.style.display === "flex")) {
      tagPopup.classList.remove("show");
      tagPopup.classList.add("hide");
      setTimeout(() => {
        if (!tagPopup.classList.contains("show")) {
          tagPopup.style.display = "none";
          tagPopup.classList.remove("hide");
        }
      }, 200);
    }

    const panel = document.getElementById("ai-history");
    const input = document.getElementById("ai-history-search");
    if (!panel || !input) return;

    if (panel.classList.contains("collapsed")) {
        if (input.classList.contains("show")) {
            input.classList.remove("show");
            input.classList.add("hide");
            setTimeout(() => {
                if (!input.classList.contains("show")) input.classList.remove("hide");
            }, 200);
        } else {
            input.classList.remove("hide");
            input.classList.add("show");
            input.focus();
        }
    }
  },
  handleSearchBlur(e) {
    const input = e.target;
    const panel = document.getElementById("ai-history");
    if (panel && panel.classList.contains("collapsed")) {
        // Delay slightly to check if we clicked on something else important
        setTimeout(() => {
            if (input.classList.contains("show")) {
                input.classList.remove("show");
                input.classList.add("hide");
                setTimeout(() => {
                    if (!input.classList.contains("show")) input.classList.remove("hide");
                }, 200);
            }
        }, 200);
    }
  },
  toggleTagFilterPopup(e) {
    if (e) e.stopPropagation();

    // Close floating search if open
    const searchInput = document.getElementById("ai-history-search");
    if (searchInput && searchInput.classList.contains("show")) {
        searchInput.classList.remove("show");
        searchInput.classList.add("hide");
        setTimeout(() => {
            if (!searchInput.classList.contains("show")) searchInput.classList.remove("hide");
        }, 200);
    }

    const popup = document.getElementById("ai-history-tag-popup");
    if (!popup) return;
    
    if (popup.classList.contains("show") || popup.style.display === "flex") {
      popup.classList.remove("show");
      popup.classList.add("hide");
      setTimeout(() => {
        if (!popup.classList.contains("show")) {
          popup.style.display = "none";
          popup.classList.remove("hide");
        }
      }, 200);
      return;
    }

    // Close other popups
    const modelPopup = document.getElementById("ai-model-popup");
    if (modelPopup) modelPopup.style.display = "none";

    popup.innerHTML = "";
    
    // Collect all unique tags
    const allTags = new Set();
    this.chats.forEach(c => {
        if (c.tags) c.tags.forEach(t => allTags.add(t));
    });
    
    if (this._currentEmptyChat && this._currentEmptyChat.tags) {
        this._currentEmptyChat.tags.forEach(t => allTags.add(t));
    }
    
    const sortedTags = Array.from(allTags).sort();
    
    if (sortedTags.length === 0) {
        popup.innerHTML = `<div style="padding: 10px; font-size: 0.8rem; color: #94a3b8; text-align: center;">등록된 태그가 없습니다.</div>`;
    } else {
        sortedTags.forEach(tag => {
            const isActive = this.activeTagFilters && this.activeTagFilters.includes(tag);
            const item = document.createElement("div");
            item.className = `tag-filter-item ${isActive ? "active" : ""}`;
            
            const span = document.createElement("span");
            span.className = "tag-filter-text";
            span.innerText = tag;
            item.appendChild(span);

            const checkIcon = document.createElement("i");
            checkIcon.className = "fas fa-check";
            checkIcon.style.fontSize = "0.7rem";
            checkIcon.style.opacity = "0.8";
            if (!isActive) checkIcon.style.display = "none";
            item.appendChild(checkIcon);
            
            item.onclick = (evt) => {
                evt.stopPropagation();
                this.toggleTagFilter(tag);
                const nowActive = this.activeTagFilters && this.activeTagFilters.includes(tag);
                if (nowActive) {
                    item.classList.add("active");
                } else {
                    item.classList.remove("active");
                }
                checkIcon.style.display = nowActive ? "inline-block" : "none";
                
                // Update "No Tag Filter" state
                const noFilterItem = popup.querySelector('.tag-filter-item.all-tags');
                if (noFilterItem) {
                    const isAllActive = (!this.activeTagFilters || this.activeTagFilters.length === 0);
                    if (isAllActive) {
                        noFilterItem.classList.add("active");
                    } else {
                        noFilterItem.classList.remove("active");
                    }
                    const noFilterCheck = noFilterItem.querySelector('i');
                    if (noFilterCheck) noFilterCheck.style.display = isAllActive ? "inline-block" : "none";
                }
            };
            
            popup.appendChild(item);
        });
    }

    // Add separator
    const separator = document.createElement("div");
    separator.style.height = "1px";
    separator.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    separator.style.margin = "4px 0";
    popup.appendChild(separator);

    // Add "No Tag Filter" option at the bottom
    const allItem = document.createElement("div");
    const isAllActiveInitial = !this.activeTagFilters || this.activeTagFilters.length === 0;
    allItem.className = `tag-filter-item all-tags ${isAllActiveInitial ? "active" : ""}`;
    
    const allSpan = document.createElement("span");
    allSpan.innerText = window.i18n ? window.i18n.get("aiNoTagFilter") : "태그 필터 없음";
    allSpan.className = "tag-filter-text";
    allItem.appendChild(allSpan);

    const allCheckIcon = document.createElement("i");
    allCheckIcon.className = "fas fa-check";
    allCheckIcon.style.fontSize = "0.7rem";
    allCheckIcon.style.opacity = "0.8";
    if (!isAllActiveInitial) {
        allCheckIcon.style.display = "none";
    }
    allItem.appendChild(allCheckIcon);

    allItem.onclick = (evt) => {
        evt.stopPropagation();
        this.activeTagFilters = [];
        this.renderHistory();
        const chat = this.getCurrentChat();
        if (chat) this.renderChatTags(chat);
        this.updateTagFilterIconUI();
        
        // Refresh popup visually without closing it
        Array.from(popup.querySelectorAll('.tag-filter-item:not(.all-tags)')).forEach(node => {
            node.classList.remove('active');
            const chk = node.querySelector('i.fa-check');
            if (chk) chk.style.display = "none";
        });
        allItem.classList.add('active');
        allCheckIcon.style.display = "inline-block";
    };
    
    popup.appendChild(allItem);
    
    popup.style.display = "flex";
    popup.classList.add("show");
  },
  activeTagFilters: [],
  toggleTagFilter(tag) {
    if (!this.activeTagFilters) this.activeTagFilters = [];
    const index = this.activeTagFilters.indexOf(tag);
    if (index === -1) {
        this.activeTagFilters.push(tag);
    } else {
        this.activeTagFilters.splice(index, 1);
    }
    this.renderHistory();
    // Synchronize with chat header tags
    const chat = this.getCurrentChat();
    if (chat) this.renderChatTags(chat);

    this.updateTagFilterIconUI();
    const searchInput = document.getElementById("ai-history-search");
    const searchTerm = searchInput ? searchInput.value : "";
    this.filterHistory(searchTerm);
  },
  renderWelcome() {
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) msgContainer.innerHTML = "";
  },
  exportChatToText(id, e) {
    if (e) e.stopPropagation();
    const chatId = id || this.currentChatId;
    const chat = this.chats.find(c => c.id === chatId);
    if (!chat || chat.messages.length === 0) return;

    // Collect all unique attachments for the header
    const allAttachments = [];
    const seenFileIds = new Set();
    chat.messages.forEach(m => {
      if (m.attachments) {
        m.attachments.forEach(a => {
          if (!seenFileIds.has(a.id)) {
            seenFileIds.add(a.id);
            allAttachments.push({
              name: a.name,
              timestamp: m.timestamp
            });
          }
        });
      }
    });

    let content = `[AI Chat Export]\n`;
    content += `Title: ${chat.title}\n`;
    content += `Model: ${chat.model || this.settingsModel}\n`;
    content += `Date: ${new Date(chat.id).toLocaleString()}\n`;
    content += `------------------------------------------\n`;

    if (allAttachments.length > 0) {
      content += `첨부된 파일 목록\n`;
      allAttachments.forEach((file) => {
        let timeStr = "";
        if (file.timestamp) {
          const d = new Date(file.timestamp);
          timeStr = ` (${d.toLocaleString()})`;
        }
        content += `${file.name}${timeStr}\n`;
      });
      content += `------------------------------------------\n`;
    }

    chat.messages.forEach(msg => {
      let roleName = "AI";
      let textContent = msg.content;
      if (msg.role === "user") roleName = "User";
      else if (msg.role === "system" || msg.role === "system-error") {
        roleName = "System";
        textContent = textContent.replace(/<[^>]*>/g, '');
      }
      let timeStr = "";
      if (msg.timestamp) {
        const d = new Date(msg.timestamp);
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        const ss = d.getSeconds().toString().padStart(2, '0');
        timeStr = ` - ${hh}:${mm}:${ss}`;
      }
      content += `[${roleName}]${timeStr}\n${textContent}\n`;
      
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(a => {
          content += `\n[첨부 파일: ${a.name}]`;
        });
        content += `\n`;
      }
      content += `\n`;
    });
    content += `------------------------------------------\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    
    // Custom filename format: Title_YYYY_MM_DD_SS
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateStr = `${year}${month}${day}_${seconds}`;
    const fileName = `${chat.title.replace(/[/\\?%*:|"<>]/g, '-')}_${dateStr}.txt`;

    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },
  async toggleAttachmentPopover(e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById("ai-header-attachment-popover");
    if (!popover) return;
    
    const wasShowing = popover.classList.contains("show");
    document.querySelectorAll(".attachment-popover.show").forEach(p => p.classList.remove("show"));
    
    if (!wasShowing) {
      this.renderAttachmentList();
      popover.classList.add("show");
    }
  },
  async renderAttachmentList() {
    const popover = document.getElementById("ai-header-attachment-popover");
    if (!popover) return;
    
    const chat = this.getCurrentChat();
    if (!chat) return;
    
    const allAttachments = [];
    chat.messages.forEach(m => {
      if (m.attachments) allAttachments.push(...m.attachments);
    });
    
    // Header popover only shows non-deleted unique files
    const uniqueAttachments = [];
    const seenIds = new Set();
    allAttachments.forEach(a => {
      if (!a.deleted && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        uniqueAttachments.push(a);
      }
    });

    if (uniqueAttachments.length === 0) {
      popover.classList.remove("show");
      popover.innerHTML = "";
      return;
    }

    popover.innerHTML = "";
    const isLocked = this.isChatLocked;
    for (const file of uniqueAttachments) {
      const item = document.createElement("div");
      item.className = "popover-file-item";
      
      const infoDiv = document.createElement("div");
      infoDiv.className = "file-info";
      
      if (file.type && file.type.startsWith("image/")) {
        const img = document.createElement("img");
        try {
          if (!this.db) await this.initDB();
          const tx = this.db.transaction("files", "readonly");
          const store = tx.objectStore("files");
          const req = store.get(file.id);
          req.onsuccess = () => {
            if (req.result && req.result.file instanceof Blob) {
              const url = URL.createObjectURL(req.result.file);
              img.src = url;
              img.onload = () => URL.revokeObjectURL(url);
            }
          };
        } catch (err) {}
        infoDiv.appendChild(img);
      } else {
        const icon = document.createElement("i");
        icon.className = (file.type && (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md"))) 
          ? "fas fa-file-lines file-main-icon" 
          : "fas fa-file file-main-icon";
        infoDiv.appendChild(icon);
      }
      
      const nameSpan = document.createElement("span");
      nameSpan.innerText = file.name;
      infoDiv.appendChild(nameSpan);
      item.appendChild(infoDiv);

      if (!isLocked) {
        const delBtn = document.createElement("div");
        delBtn.className = "popover-delete-btn";
        delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        delBtn.onclick = (evt) => {
          evt.stopPropagation();
          this.showDeleteFileConfirm(evt.target, file.id);
        };
        item.appendChild(delBtn);
      }

      item.onclick = () => this.downloadAttachment(file.id, file.name);
      popover.appendChild(item);
    }
  },
  showDeleteFileConfirm(target, fileId) {
    const html = `
      <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; min-width: 120px;">
        <span style="font-size: 0.85rem; white-space: nowrap; font-weight: 600; color: #f1f5f9;">삭제하시겠습니까?</span>
        <button class="btn-del-confirm" onclick="ai.deleteAttachmentCompletely('${fileId}')" style="width: 100%; height: 32px; background: #ef4444; color: #fff; border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s;">${window.i18n ? window.i18n.get("btnDeleteConfirm") : "삭제"}</button>
      </div>
    `;
    utils.showValidationTip(target, html, "ai-file-delete-confirm", {
      position: "bottom",
      isHtml: true,
      noAutoHide: true
    });
  },
  async downloadAttachment(id, name) {
    try {
      if (!this.db) await this.initDB();
      const tx = this.db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.file instanceof Blob) {
          const url = URL.createObjectURL(req.result.file);
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }
      };
    } catch (e) {
      console.error("Download failed", e);
    }
  },
  async deleteAttachmentCompletely(id) {
    try {
      utils.hideValidationTip();
      if (!this.db) await this.initDB();
      // 1. Delete from IndexedDB
      const tx = this.db.transaction("files", "readwrite");
      tx.objectStore("files").delete(id);
      
      // 2. Mark as deleted in conversation history
      const chats = this.chats;
      const chat = chats.find(c => c.id === this.currentChatId);
      if (chat) {
        chat.messages.forEach(m => {
          if (m.attachments) {
            m.attachments.forEach(a => {
              if (a.id === id) a.deleted = true;
            });
          }
        });
        this.chats = chats;
      }
      
      // 3. UI Update without closing popover
      this.updateModelDisplay();
      this.renderAttachmentList();
      this.refreshMessages();
    } catch (e) {
      console.error("Delete failed", e);
    }
  },
  refreshMessages() {
    const chat = this.getCurrentChat();
    if (!chat) return;
    const container = document.getElementById("ai-messages");
    if (container) {
      container.innerHTML = "";
      chat.messages.forEach(m => {
        this.appendMessage(m.role, m.content, false, m.role.startsWith("system"), m.attachments);
      });
    }
  },
  appendMessage(role, text, save = true, isHtml = false, attachments = [], isNew = false) {
    const container = document.getElementById("ai-messages");
    if (!container) return null;
    const div = document.createElement("div");
    div.className = `ai-message ${role}`;
    if (isNew) div.classList.add("new-message");
    
    if (role === "system" || role === "system-error") {
      div.style.width = "auto";
      div.style.maxWidth = "90%";
      div.style.textAlign = "center";
      div.style.fontSize = "0.75rem";
      div.style.color = role === "system-error" ? "#ef4444" : "#94a3b8";
      div.style.margin = "15px auto";
      div.style.padding = "6px 20px";
      div.style.background = "rgba(255,255,255,0.03)";
      div.style.border = role === "system-error" ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(255,255,255,0.03)";
      div.style.borderRadius = "20px";
      div.style.alignSelf = "center";
      div.style.boxSizing = "border-box";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
    }

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    if (isHtml) contentDiv.innerHTML = text;
    else contentDiv.innerText = text;
    div.appendChild(contentDiv);

    // Render attachments if any
    if (attachments && attachments.length > 0) {
      // 1. Add Badge Icon at top-right
      const badge = document.createElement("div");
      badge.className = "ai-message-attachment-badge";
      badge.innerHTML = '<i class="fas fa-paperclip"></i>';
      div.appendChild(badge);

      // 2. Add Hover Tooltip (Changed to Click to toggle)
      const tooltip = document.createElement("div");
      tooltip.className = "attachment-tooltip";
      
      // If it's the first message, show tooltip below
      if (container.children.length === 0) {
        tooltip.classList.add("pos-bottom");
      }
      
      badge.onclick = (e) => {
        e.stopPropagation();
        const wasShowing = tooltip.classList.contains("show");
        // Close all other tooltips first
        document.querySelectorAll(".attachment-tooltip.show").forEach(t => t.classList.remove("show"));
        if (!wasShowing) tooltip.classList.add("show");
      };

      attachments.forEach(file => {
        const item = document.createElement("div");
        item.className = "tooltip-file-item";
        if (file.deleted) item.classList.add("deleted");
        
        const icon = document.createElement("i");
        icon.className = (file.type && (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md"))) 
          ? "fas fa-file-lines" 
          : (file.type && file.type.startsWith("image/") ? "fas fa-image" : "fas fa-file");
        
        const nameSpan = document.createElement("span");
        nameSpan.innerText = file.name;
        
        item.appendChild(icon);
        item.appendChild(nameSpan);
        item.onclick = (e) => {
          e.stopPropagation();
          if (file.deleted) return;
          this.downloadAttachment(file.id, file.name);
        };
        tooltip.appendChild(item);
      });
      div.appendChild(tooltip);
    }

    container.appendChild(div);
    if (isNew) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
        container.scrollTop = container.scrollHeight;
    }
    return div;
  },
  showErrorModal() {
    utils.openModal("aiErrorModal");
  },
  closeErrorModal() {
    utils.closeModal("aiErrorModal");
    localStorage.setItem("dj_hide_ai", "true");
    ui.applyVisibility();
  },
  handleErrorSettings() {
    utils.closeModal("aiErrorModal");
    localStorage.setItem("dj_hide_ai", "true");
    ui.applyVisibility();
    settings.openModal();
  },
};
window.ai = ai;
