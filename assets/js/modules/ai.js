const ai = {
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
    return localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434";
  },
  get apiKey() {
    const provider = this.provider;
    if (provider === "none" || provider === "local") return "";
    return localStorage.getItem(`dj_ai_api_key_${provider}`) || localStorage.getItem("dj_ai_api_key") || "";
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

  getStorageKey() {
    return `dj_ai_chats_${this.provider}_${this.settingsModel.replace(/[:/]/g, "_")}`;
  },

  get chats() {
    if (this.provider === "none" || !this.settingsModel) return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  },

  set chats(val) {
    if (!val) return;
    localStorage.setItem(this.getStorageKey(), JSON.stringify(val));
  },

  init() {
    this.resetUI();

    const allChats = this.chats;
    if (allChats.length > 0) {
      this.currentChatId = allChats[0].id;
    } else {
      this.currentChatId = Date.now();
      const newChat = {
        id: this.currentChatId,
        title: "새 대화",
        messages: [],
        model: this.settingsModel,
      };
      this.chats = [newChat];
    }

    this.renderHistory();
    this.loadChat(this.currentChatId);

    this.updateChatbotAvailability(this.isConnected);
    const savedModels = JSON.parse(
      localStorage.getItem("dj_ai_models_cache") || "[]",
    );
    if (this.isConnected && this.provider !== "none") {
      if (savedModels.length > 0) this.updateModelSelectUI(savedModels);
      this.checkConnection(true);
    } else {
      this.updateChatbotAvailability(false);
      this.updateModelSelectUI([]);
    }

    if (!this.clickListenerAdded) {
      document.addEventListener("click", (e) => {
        if (
          !e.target.closest(".history-title") &&
          !e.target.closest(".ai-model-popup")
        ) {
          document.getElementById("ai-model-popup")?.classList.remove("show");
        }
      });
      this.clickListenerAdded = true;
    }
  },

  resetUI() {
    this.renderWelcome();
    const input = document.getElementById("ai-user-input");
    if (input) input.value = "";
    const historyList = document.getElementById("ai-history-list");
    if (historyList) historyList.innerHTML = "";
    this.isGenerating = false;
  },

  getCurrentChat() {
    return this.chats.find((c) => c.id === this.currentChatId);
  },

  updateModelDisplay() {
    const titleInput = document.getElementById("ai-chat-title-input");
    const historyTitleEl = document.getElementById("ai-history-model-name");
    const chat = this.getCurrentChat();
    if (titleInput) titleInput.value = chat ? chat.title : "새 대화";
    if (historyTitleEl)
      historyTitleEl.innerText = chat?.model || this.settingsModel || "AI Chat";
  },

  updateChatTitle(newTitle) {
    if (!this.currentChatId) return;
    const chats = this.chats;
    const chat = chats.find((c) => c.id === this.currentChatId);
    if (chat) {
      chat.title = newTitle.trim() || "새 대화";
      this.chats = chats;
      this.renderHistory();
    }
  },

  toggleModelPopup(e) {
    e.stopPropagation();
    if (!this.isConnected) return;
    const popup = document.getElementById("ai-model-popup");
    if (!popup) return;
    if (popup.classList.contains("show")) {
      popup.classList.remove("show");
      return;
    }

    const models = JSON.parse(
      localStorage.getItem("dj_ai_models_cache") || "[]",
    );
    popup.innerHTML = "";
    const chat = this.getCurrentChat();
    const activeModel = chat?.model || this.settingsModel;

    if (models.length > 1) {
      models.forEach((m) => {
        const div = document.createElement("div");
        div.className = `ai-model-item ${m === activeModel ? "active" : ""}`;
        div.innerHTML = `<span>${m}</span>${m === activeModel ? '<i class="fas fa-check" style="font-size:0.7rem;"></i>' : ""}`;
        div.onclick = () => {
          this.selectTemporaryModel(m);
          popup.classList.remove("show");
        };
        popup.appendChild(div);
      });
    } else {
      const tip = document.createElement("div");
      tip.className = "ai-model-tip";
      tip.innerText =
        "다른 모델을 사용하려면\n서버에 모델을 추가 설치해주세요.";
      popup.appendChild(tip);
    }
    popup.classList.add("show");
  },

  selectTemporaryModel(m) {
    const chats = this.chats;
    const chat = chats.find((c) => c.id === this.currentChatId);
    if (chat) {
      chat.model = m;
      this.chats = chats;
      this.updateModelDisplay();
    }
  },

  updateChatbotAvailability(isConnected) {
    this.isConnected = isConnected;
    const aiIcon = document.querySelector(".ai-search-icon");
    if (aiIcon) {
      aiIcon.classList.toggle("active", isConnected);
      aiIcon.classList.toggle("can-chat", isConnected);
      aiIcon.style.color = isConnected ? "" : "#94a3b8";
    }
    this.updateStatusUI();
  },

  updateModelSelectUI(models) {
    const triggerName = document.getElementById("ai-model-trigger-name");
    const trigger = document.getElementById("ai-model-trigger");
    
    if (this.isConnected && models.length > 0) {
      const oldModel = this.settingsModel;
      if (!models.includes(oldModel)) {
        localStorage.setItem("dj_ai_model", models[0]);
        if (oldModel !== "") {
          setTimeout(() => {
            this.renderHistory();
            this.loadChat();
          }, 50);
        }
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
        triggerName.innerText = window.i18n ? window.i18n.get("aiNoServer") : "접속 안됨";
      }
      if (trigger) trigger.classList.add("disabled");
    }
  },

  updateStatusUI() {
    const statusSpan = document.getElementById("ai-connection-status");
    const dot = statusSpan?.querySelector(".status-dot");
    const text = statusSpan?.querySelector(".status-text");
    const historyDot = document.getElementById("ai-history-status-dot");
    if (this.isConnected) {
      const green = "#22c55e";
      if (dot) dot.style.background = green;
      if (historyDot) historyDot.style.background = green;
      if (text) {
        let pName =
          this.provider === "local"
            ? "로컬 AI"
            : this.provider.charAt(0).toUpperCase() + this.provider.slice(1);
        text.innerText = `${pName} 연결됨`;
      }
      if (statusSpan) statusSpan.style.color = green;
    } else {
      const gray = "#94a3b8",
        red = "#ef4444";
      if (dot) dot.style.background = gray;
      if (historyDot)
        historyDot.style.background = this.provider !== "none" ? red : gray;
      if (text)
        text.innerText =
          (window.i18n ? window.i18n.get("aiNeedConnect") : "서버 연결 안됨") ||
          "서버 연결 안됨";
      if (statusSpan) statusSpan.style.color = gray;
    }
  },

  async checkConnection(isSilent = false) {
    const provider = localStorage.getItem("dj_ai_provider") || "none";
    const url = document.getElementById("aiServerUrlInput")?.value || this.serverUrl;
    const apiKey = document.getElementById("aiApiKeyInput")?.value.trim() || this.apiKey;
    const checkBtn = document.getElementById("ai-check-btn");
    const tooltip = document.getElementById("ai-check-tooltip");

    const showTooltip = (msg, isSuccess) => {
      if (tooltip) {
        tooltip.innerText = msg;
        const color = isSuccess ? "#22c55e" : "#ef4444";
        tooltip.style.setProperty("--tip-bg", color);
        tooltip.classList.add("show");
        setTimeout(() => tooltip.classList.remove("show"), 3000);
      }
    };

    const finalize = (isConnected, models = []) => {
      if (isConnected) {
        this.updateChatbotAvailability(true);
        this.updateModelSelectUI(models);
      } else {
        this.updateChatbotAvailability(false);
        this.updateModelSelectUI([]);
      }
      
      if (!isSilent) {
        const pName = this.getProviderName(provider);
        showTooltip(isConnected ? `${pName} 연결 성공!` : `${pName} 연결 실패!`, isConnected);
      }
    };

    if (provider === "none") {
      finalize(false);
      return;
    }

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
        // Local or Custom AI (Ollama style)
        if (!url) { finalize(false); return; }
        let fetchUrl = url.includes("localhost") ? url.replace("localhost", "127.0.0.1") : url;
        if (fetchUrl.endsWith("/")) fetchUrl = fetchUrl.slice(0, -1);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const headers = {};
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const res = await fetch(`${fetchUrl}/api/tags`, { 
            headers: headers,
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          finalize(true, (data.models || []).map((m) => m.name));
        } else finalize(false);
      }
    } catch (e) {
      finalize(false);
    }
  },

  getProviderName(provider) {
    const defaultNames = { none: "사용 안 함", local: "로컬 AI", openai: "OpenAI", gemini: "Gemini" };
    if (defaultNames[provider]) return defaultNames[provider];
    const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    const current = customAis.find(a => a.id === provider);
    return current ? current.name : "AI";
  },

  async sendMessage() {
    const input = document.getElementById("ai-user-input");
    const text = input.value.trim();
    if (!text || this.isGenerating) return;
    if (!this.isConnected) {
      alert("AI 서버 연결이 필요합니다.");
      settings.openModal();
      return;
    }

    let chats = this.chats;
    let chat = chats.find((c) => c.id === this.currentChatId);
    if (!chat) {
      this.createNewChat();
      chats = this.chats;
      chat = chats[0];
    }
    const activeModel = chat.model || this.settingsModel;

    if (
      chat.messages.length === 0 &&
      (chat.title === "새 대화" || chat.title === "새로운 대화")
    ) {
      const firstLine = text.split("\n")[0];
      chat.title =
        firstLine.length > 20 ? firstLine.substring(0, 20) + "..." : firstLine;
      this.chats = chats;
      this.updateModelDisplay();
      this.renderHistory();
    }

    this.appendMessage("user", text);
    input.value = "";
    this.isGenerating = true;
    const botMsgDiv = this.appendMessage(
      "bot",
      `<div class="typing-indicator"><span></span><span></span><span></span></div>`,
      false,
      true,
    );

    try {
      const provider = this.provider;
      if (provider === "local" || provider.startsWith("custom_"))
        await this.callLocalAI(text, botMsgDiv, chat, activeModel);
      else if (provider === "openai")
        await this.callOpenAI(text, botMsgDiv, chat, activeModel);
      else if (provider === "gemini")
        await this.callGemini(text, botMsgDiv, chat, activeModel);
      this.updateStatusUI();
    } catch (e) {
      botMsgDiv.innerText = "오류: 서버와 통신할 수 없습니다.";
      this.updateChatbotAvailability(false);
    } finally {
      this.isGenerating = false;
    }
  },

  async callLocalAI(prompt, msgDiv, chat, model) {
    const isStream = !this.outputAtOnce;
    const headers = { "Content-Type": "application/json" };
    if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.serverUrl}/api/chat`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: chat.messages
          .map((m) => ({ role: m.role, content: m.content }))
          .concat([{ role: "user", content: prompt }]),
        stream: isStream,
      }),
    });
    if (!response.ok) throw new Error();
    let fullText = "";
    if (isStream) {
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              if (fullText === "") msgDiv.innerHTML = "";
              fullText += json.message.content;
              msgDiv.innerText = fullText;
              document.getElementById("ai-messages").scrollTop =
                document.getElementById("ai-messages").scrollHeight;
            }
          } catch (e) {}
        }
      }
    } else {
      const json = await response.json();
      fullText = json.message?.content || "";
      msgDiv.innerHTML = "";
      msgDiv.innerText = fullText;
    }
    this.saveMessage(chat.id, prompt, fullText);
  },

  async callOpenAI(prompt, msgDiv, chat, model) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: chat.messages
          .map((m) => ({ role: m.role, content: m.content }))
          .concat([{ role: "user", content: prompt }]),
      }),
    });
    if (!res.ok) throw new Error();
    const json = await res.json(),
      text = json.choices[0].message.content;
    msgDiv.innerHTML = "";
    msgDiv.innerText = text;
    this.saveMessage(chat.id, prompt, text);
  },

  async callGemini(prompt, msgDiv, chat, model) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    if (!res.ok) throw new Error();
    const json = await res.json(),
      text = json.candidates[0].content.parts[0].text;
    msgDiv.innerHTML = "";
    msgDiv.innerText = text;
    this.saveMessage(chat.id, prompt, text);
  },

  saveMessage(chatId, userPrompt, botResponse) {
    const chats = this.chats;
    const c = chats.find((x) => x.id === chatId);
    if (c) {
      c.messages.push({ role: "user", content: userPrompt });
      c.messages.push({ role: "bot", content: botResponse });
      this.chats = chats;
      this.renderHistory();
    }
  },

  handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  },
  renderHistory(searchTerm = "") {
    const list = document.getElementById("ai-history-list");
    if (!list) return;
    list.innerHTML = "";
    const lowerSearch = searchTerm.toLowerCase();
    this.chats.forEach((chat) => {
      if (searchTerm && !chat.title.toLowerCase().includes(lowerSearch)) return;
      const div = document.createElement("div");
      div.className = `ai-history-item ${chat.id === this.currentChatId ? "active" : ""}`;
      div.onclick = () => this.loadChat(chat.id);
      div.innerHTML = `<span>${chat.title}</span><i class="fas fa-trash-alt" onclick="ai.deleteChat(${chat.id}, event)"></i>`;
      list.appendChild(div);
    });
  },
  filterHistory(val) {
    this.renderHistory(val);
  },
  loadChat(id = null) {
    const chats = this.chats;
    if (!id) {
      if (chats.length > 0) this.currentChatId = chats[0].id;
      else {
        this.createNewChat();
        return;
      }
    } else this.currentChatId = id;
    this.renderHistory();
    const chat = this.getCurrentChat();
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) {
      msgContainer.innerHTML = "";
      if (chat)
        chat.messages.forEach((m) =>
          this.appendMessage(m.role, m.content, false),
        );
    }
    this.updateModelDisplay();
  },
  createNewChat() {
    const chats = this.chats;
    const emptyChat = chats.find(
      (c) =>
        c.messages.length === 0 &&
        (c.title === "새 대화" || c.title === "새로운 대화"),
    );
    if (emptyChat) {
      this.loadChat(emptyChat.id);
      return;
    }
    this.currentChatId = Date.now();
    const newChats = [
      {
        id: this.currentChatId,
        title: "새 대화",
        messages: [],
        model: this.settingsModel,
      },
      ...chats,
    ];
    this.chats = newChats;
    this.loadChat(this.currentChatId);
  },
  deleteChat(id, e) {
    e.stopPropagation();
    const chats = this.chats.filter((c) => c.id !== id);
    this.chats = chats;
    if (chats.length === 0) this.createNewChat();
    else if (this.currentChatId === id) this.loadChat(this.chats[0].id);
    else this.renderHistory();
  },
  toggleHistory() {
    this.historyCollapsed = !this.historyCollapsed;
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
  attachFile(e) {
    if (e) e.stopPropagation();
    utils.showValidationTip(
      "ai-attach-wrapper",
      "파일 첨부 기능은 향후에 지원할 예정입니다.",
    );
  },
  hideAttachTip() {
    utils.hideValidationTip();
  },
  appendMessage(role, text, save = true, isHtml = false) {
    const container = document.getElementById("ai-messages");
    if (!container) return null;
    const div = document.createElement("div");
    div.className = `ai-message ${role}`;
    if (isHtml) div.innerHTML = text;
    else div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  },
};

window.ai = ai;
