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
          allChats.push(...chats);
        } catch (e) { console.error("Failed to parse chats for", p, e); }
      }
    });

    if (this._currentEmptyChat) {
      if (!allChats.some(c => c.id === this._currentEmptyChat.id)) {
        allChats.push(this._currentEmptyChat);
      }
    }

    return allChats.sort((a, b) => {
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

    const byProvider = {};
    allProviders.forEach(p => byProvider[p] = []);

    val.forEach(c => {
      // Don't save chats with no messages
      const hasRealMessages = c.messages && c.messages.some(m => m.role === "user" || m.role === "bot");
      if (!hasRealMessages) return;

      const p = c.provider || this.provider;
      if (p === "none") return;
      if (!byProvider[p]) byProvider[p] = [];
      byProvider[p].push(c);
    });

    Object.keys(byProvider).forEach(p => {
      localStorage.setItem(`dj_ai_chats_${p}`, JSON.stringify(byProvider[p]));
    });
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
  updateModelDisplay() {
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
        const msg = window.i18n ? window.i18n.get("msgAiChatLocked").replace("{0}", pName) : `대화를 이어가려면 AI를 ${pName} 로 변경하세요.`;
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

    const actionsEl = document.querySelector(".ai-actions");
    if (actionsEl) {
      const hasRealMessages = chat && chat.messages.some(m => m.role === "user" || m.role === "bot");
      if (chat && hasRealMessages) {
        let actionsHtml = "";
        
        // Global Attachment icon
        const allAttachments = [];
        chat.messages.forEach(m => {
          if (m.attachments) {
            allAttachments.push(...m.attachments.filter(a => !a.deleted));
          }
        });
        
        if (allAttachments.length > 0) {
          actionsHtml += `
            <div class="header-attachment-wrapper">
              <i class="fas fa-paperclip" onclick="ai.toggleAttachmentPopover(event)" title="${window.i18n ? window.i18n.get("tipAttachList") : "첨부된 파일 목록"}"></i>
              <div id="ai-header-attachment-popover" class="attachment-popover"></div>
            </div>`;
        }
        
        // Export icon
        actionsHtml += `<i class="fas fa-file-arrow-down ai-btn-export" onclick="ai.exportChatToText(${chat.id}, event)" title="${window.i18n ? window.i18n.get("txtExportText") : "텍스트로 내보내기"}"></i>`;
        
        actionsEl.innerHTML = actionsHtml;
      } else {
        actionsEl.innerHTML = "";
      }
    }
  },
  updateChatTitle(newTitle) {
    if (!this.currentChatId) return;
    const chats = this.chats;
    const chat = chats.find((c) => c.id === this.currentChatId) || (this._currentEmptyChat?.id === this.currentChatId ? this._currentEmptyChat : null);
    if (chat) {
      chat.title = newTitle.trim() || "새 대화";
      chat.updatedAt = Date.now();
      this.chats = chats;
      this.renderHistory("", chat.id);
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
      info += `\n\n(Session Metadata - Active Files: ${activeAttachments.length})`;
      activeAttachments.forEach(a => {
        info += `\n- ${a.name} (${a.type && a.type.startsWith("image/") ? "Image" : "File"})`;
      });
    }
    
    if (deletedAttachments.length > 0) {
      info += `\n\n(Session Metadata - Deleted Files: ${deletedAttachments.length})`;
      deletedAttachments.forEach(a => {
        info += `\n- ${a.name} (Status: DELETED)`;
      });
    }
    
    return content + info;
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

        body = {
            model: model,
            messages: [{ role: "system", content: systemMsg }]
              .concat(chat.messages
                .filter(m => m.role !== "system")
                .map((m) => ({ role: m.role, content: this.formatMessageContent(m) })))
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

        body = {
            model: model,
            system: systemText,
            messages: chat.messages
              .filter(m => m.role !== "system")
              .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: this.formatMessageContent(m) }))
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
        const history = chat.messages
            .filter(m => m.role !== "system")
            .map(m => ({
                role: m.role === "bot" ? "model" : "user",
                parts: [{ text: this.formatMessageContent(m) }]
            }));
        
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

        body = {
            model: model,
            messages: [{ role: "system", content: systemMsg }]
              .concat(chat.messages
                .filter(m => m.role !== "system")
                .map((m) => ({ role: m.role === "bot" ? "assistant" : m.role, content: this.formatMessageContent(m) })))
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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "system", content: this.getSystemBasePrompt() }]
          .concat(chat.messages
            .map((m) => ({ role: m.role === "bot" ? "assistant" : m.role, content: this.formatMessageContent(m) })))
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

    const history = chat.messages
      .filter(m => m.role !== "system")
      .map(m => ({
          role: m.role === "bot" ? "model" : "user",
          parts: [{ text: this.formatMessageContent(m) }]
      }));

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
      if (attachments && attachments.length > 0) {
        userMsg.attachments = attachments.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          size: a.size
        }));
      }
      c.messages.push(userMsg);
      c.messages.push({ role: "bot", content: botResponse, timestamp: now });

      // Auto title for new chats
      if (this.isDefaultTitle(c.title)) {
          const firstLine = userPrompt.split("\n")[0].trim();
          c.title = firstLine.length > 100 ? firstLine.substring(0, 100) + "..." : (firstLine || "새 대화");
      }

      c._lastModel = c.model || this.settingsModel;
      if (!c.provider) c.provider = this.provider;
      c.updatedAt = now;

      if (c === this._currentEmptyChat) {
          this._currentEmptyChat = null;
          this.chats = [c, ...this.chats.filter(x => x.id !== c.id)];
      } else {
          this.chats = chats;
      }
      this.renderHistory("", chatId); // Pass chatId to trigger animation
      this.updateModelDisplay();
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
    const isOther = chatProvider !== currentProvider;
    if (isOther) div.classList.add("other-model");
    
    div.dataset.id = chat.id;
    div.onclick = () => this.loadChat(chat.id);
    
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
    div.innerHTML = `<span>${this.getDisplayTitle(chat.title)}</span><i class="fas fa-trash-alt" onclick="ai.deleteChat(${chat.id}, event)"></i>`;
    return div;
  },
  renderHistory(searchTerm = "", updatedChatId = null) {
    const list = document.getElementById("ai-history-list");
    if (!list) return;
    
    const lowerSearch = searchTerm.toLowerCase();
    const currentProvider = this.provider;
    const sortedChats = this.chats.filter(chat => {
        const hasMessages = chat.messages && chat.messages.some(m => m.role === "user" || m.role === "bot");
        const isCurrent = chat.id === this.currentChatId;
        
        // Show if: 1. It has real messages, OR 2. It's the one we're currently looking at
        const shouldShow = hasMessages || isCurrent;
        if (!shouldShow) return false;

        if (!searchTerm) return true;
        return chat.title.toLowerCase().includes(lowerSearch);
    });

    // If search is active or list is empty, full rebuild
    if (searchTerm || list.children.length === 0) {
        list.innerHTML = "";
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

    // Remove old
    Array.from(list.children).forEach(child => {
        const id = parseInt(child.dataset.id);
        if (!sortedChats.some(c => c.id === id)) {
            child.remove();
        }
    });

    // FLIP: Last, Invert - Capture immediately after DOM changes
    const animatedItems = [];
    Array.from(list.children).forEach(child => {
        // Skip animating items that are currently in their initial height-expansion phase
        if (child.classList.contains("chat-new-item")) return;

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
        (!c.messages || c.messages.length === 0 || !c.messages.some(m => m.role === "user" || m.role === "bot")) &&
        (c.provider || this.provider) === this.provider
    );
    if (emptyChat) {
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
  deleteChat(id, e) {
    if (e) e.stopPropagation();
    const target = e ? e.target : null;
    if (!target) return;

    const chats = this.chats;
    const chat = chats.find(c => c.id === id) || (this._currentEmptyChat?.id === id ? this._currentEmptyChat : null);
    
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
    this.historyCollapsed = !this.historyCollapsed;
    if (this.historyCollapsed) {
      const popup = document.getElementById("ai-model-popup");
      if (popup && popup.classList.contains("show")) {
        popup.classList.remove("show");
        setTimeout(() => {
          if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 200);
      }
    }
    document
      .getElementById("ai-history")
      ?.classList.toggle("collapsed", this.historyCollapsed);
    document.getElementById("ai-history-toggle").className = this
      .historyCollapsed
      ? "fas fa-angles-right"
      : "fas fa-angles-left";
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
