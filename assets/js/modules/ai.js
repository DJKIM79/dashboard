const ai = {
  provider: localStorage.getItem("dj_ai_provider") || "none",
  serverUrl: localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434",
  apiKey: localStorage.getItem("dj_ai_api_key") || "",
  model: localStorage.getItem("dj_ai_model") || "",
  outputAtOnce: localStorage.getItem("dj_ai_output_at_once") !== "false",
  isGenerating: false,
  historyCollapsed: false,
  isConnected: false,
  
  // Storage keys depend on provider and model
  getStorageKey() {
    return `dj_ai_chats_${this.provider}_${this.model.replace(/[:/]/g, '_')}`;
  },

  get chats() {
    if (this.provider === "none" || !this.model) return [];
    return JSON.parse(localStorage.getItem(this.getStorageKey()) || "[]");
  },

  set chats(val) {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(val));
  },

  currentChatId: null,

  init() {
    this.updateModelDisplay();
    this.renderHistory();
    this.loadChat();
    // On start, we don't know the connection status yet
    this.updateChatbotAvailability(false);
  },

  updateModelDisplay() {
    const nameEl = document.getElementById("ai-model-name");
    if (nameEl) {
      const chats = this.chats;
      const chat = chats.find(c => c.id === this.currentChatId);
      nameEl.innerText = chat ? chat.title : (this.model || "AI Chat");
    }
  },

  updateChatbotAvailability(isConnected) {
    this.isConnected = isConnected;
    const aiIcon = document.querySelector(".ai-search-icon");
    if (aiIcon) {
      aiIcon.classList.toggle("active", isConnected);
      aiIcon.classList.toggle("can-chat", isConnected);
      if (!isConnected) {
        aiIcon.style.color = "#94a3b8"; // Ensure gray color when disconnected
      } else {
        aiIcon.style.color = ""; // Revert to CSS controlled color (accent-color via can-chat)
      }
    }
  },

  renderWelcome() {
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) msgContainer.innerHTML = "";
  },

  appendMessage(role, text, save = true, isHtml = false) {
    const msgContainer = document.getElementById("ai-messages");
    if (!msgContainer) return null;

    const div = document.createElement("div");
    div.className = `ai-message ${role}`;
    if (isHtml) {
      div.innerHTML = text;
    } else {
      div.innerText = text;
    }
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    if (save && this.currentChatId) {
      const chats = this.chats;
      const chat = chats.find(c => c.id === this.currentChatId);
      if (chat) {
        chat.messages.push({ role, content: text });
        this.chats = chats; // Save back to localStorage
        this.renderHistory();
      }
    }
    return div;
  },

  loadChat(id = null) {
    const chats = this.chats;
    if (!id) {
      if (chats.length > 0) {
        this.currentChatId = chats[0].id;
      } else {
        this.createNewChat();
        return;
      }
    } else {
      this.currentChatId = id;
    }
    
    this.renderHistory();
    const chat = chats.find(c => c.id === this.currentChatId);
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) msgContainer.innerHTML = "";

    if (chat && chat.messages.length > 0) {
      chat.messages.forEach(m => this.appendMessage(m.role, m.content, false));
    }
    this.updateModelDisplay();
  },

  createNewChat() {
    const chats = this.chats;
    if (chats.length > 0) {
      const firstChat = chats[0];
      if (firstChat.messages.length === 0 && (firstChat.title === "새로운 대화" || firstChat.title === "New Chat")) {
        this.loadChat(firstChat.id);
        return;
      }
    }

    this.currentChatId = Date.now();
    const title = window.i18n ? window.i18n.get("aiNewChat") || "새로운 대화" : "새로운 대화";
    chats.unshift({ id: this.currentChatId, title: title, messages: [] });
    this.chats = chats;
    this.loadChat(this.currentChatId);
  },

  renderHistory() {
    const list = document.getElementById("ai-history-list");
    if (!list) return;
    list.innerHTML = "";

    this.chats.forEach(chat => {
      const div = document.createElement("div");
      div.className = `ai-history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
      div.onclick = () => this.loadChat(chat.id);
      
      div.innerHTML = `
        <span>${chat.title}</span>
        <i class="fas fa-trash-alt" onclick="ai.deleteChat(${chat.id}, event)"></i>
      `;
      list.appendChild(div);
    });
  },

  deleteChat(id, e) {
    e.stopPropagation();
    let chats = this.chats;
    chats = chats.filter(c => c.id !== id);
    this.chats = chats;
    
    if (chats.length === 0) {
      this.createNewChat();
    } else if (this.currentChatId === id) {
      this.currentChatId = chats[0].id;
      this.loadChat(this.currentChatId);
    } else {
      this.renderHistory();
    }
  },

  async sendMessage() {
    const input = document.getElementById("ai-user-input");
    const text = input.value.trim();
    if (!text || this.isGenerating) return;

    if (!this.isConnected) {
      alert("AI 서버 연결이 필요합니다. 설정에서 서버 체크를 해주세요.");
      settings.openModal();
      return;
    }

    const chats = this.chats;
    const chat = chats.find(c => c.id === this.currentChatId);
    if (chat && (chat.title === "새로운 대화" || chat.title === "New Chat")) {
      chat.title = text.length > 15 ? text.substring(0, 15) + "..." : text;
      this.chats = chats;
    }

    this.appendMessage("user", text);
    input.value = "";
    this.isGenerating = true;

    const typingHtml = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    const botMsgDiv = this.appendMessage("bot", typingHtml, false, true);
    
    try {
      if (this.provider === "local") {
        await this.callLocalAI(text, botMsgDiv, chat);
      } else if (this.provider === "openai") {
        await this.callOpenAI(text, botMsgDiv, chat);
      } else if (this.provider === "gemini") {
        await this.callGemini(text, botMsgDiv, chat);
      } else {
        botMsgDiv.innerText = "선택하신 API 서비스는 현재 준비 중입니다.";
        if (chat) {
          const chats = this.chats;
          const c = chats.find(x => x.id === chat.id);
          c.messages.push({ role: "bot", content: botMsgDiv.innerText });
          this.chats = chats;
        }
      }
    } catch (e) {
      botMsgDiv.innerText = "Error: AI 서버와 통신 중 오류가 발생했습니다.";
      console.error(e);
    } finally {
      this.isGenerating = false;
    }
  },

  async callLocalAI(prompt, msgDiv, chat) {
    const isStream = !this.outputAtOnce;
    const response = await fetch(`${this.serverUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: chat.messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: prompt }]),
        stream: isStream
      })
    });

    if (!response.ok) throw new Error('Ollama connection failed');

    let fullText = '';
    if (isStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let isFirstChunk = true;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message && json.message.content) {
              if (isFirstChunk) { msgDiv.innerHTML = ""; isFirstChunk = false; }
              fullText += json.message.content;
              msgDiv.innerText = fullText;
              document.getElementById("ai-messages").scrollTop = document.getElementById("ai-messages").scrollHeight;
            }
          } catch (e) {}
        }
      }
    } else {
      const json = await response.json();
      if (json.message && json.message.content) {
        fullText = json.message.content;
        msgDiv.innerHTML = "";
        msgDiv.innerText = fullText;
        document.getElementById("ai-messages").scrollTop = document.getElementById("ai-messages").scrollHeight;
      }
    }
    
    if (chat) {
      const chats = this.chats;
      const c = chats.find(x => x.id === chat.id);
      c.messages.push({ role: "user", content: prompt });
      c.messages.push({ role: "bot", content: fullText });
      this.chats = chats;
    }
  },

  async callOpenAI(prompt, msgDiv, chat) {
    // Basic implementation for non-streaming OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: chat.messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: prompt }])
      })
    });
    if (!response.ok) throw new Error('OpenAI request failed');
    const json = await response.json();
    const fullText = json.choices[0].message.content;
    msgDiv.innerHTML = "";
    msgDiv.innerText = fullText;
    
    if (chat) {
      const chats = this.chats;
      const c = chats.find(x => x.id === chat.id);
      c.messages.push({ role: "user", content: prompt });
      c.messages.push({ role: "bot", content: fullText });
      this.chats = chats;
    }
  },

  async callGemini(prompt, msgDiv, chat) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }] // Simplified context for now
      })
    });
    if (!response.ok) throw new Error('Gemini request failed');
    const json = await response.json();
    const fullText = json.candidates[0].content.parts[0].text;
    msgDiv.innerHTML = "";
    msgDiv.innerText = fullText;
    
    if (chat) {
      const chats = this.chats;
      const c = chats.find(x => x.id === chat.id);
      c.messages.push({ role: "user", content: prompt });
      c.messages.push({ role: "bot", content: fullText });
      this.chats = chats;
    }
  },

  handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  },

  attachFile() {
    const btn = document.querySelector(".ai-icon-btn");
    if (!btn) return;
    const tip = document.createElement("div");
    tip.className = "ai-tooltip";
    tip.innerText = "조금만 기달려 주세요.";
    document.body.appendChild(tip);
    const rect = btn.getBoundingClientRect();
    tip.style.left = `${rect.left + rect.width / 2}px`;
    tip.style.top = `${rect.top - 10}px`;
    setTimeout(() => {
      tip.classList.add("show");
      setTimeout(() => {
        tip.classList.remove("show");
        setTimeout(() => tip.remove(), 300);
      }, 2000);
    }, 10);
  },

  clearChat() {
    this.renderWelcome();
  },

  toggleHistory() {
    this.historyCollapsed = !this.historyCollapsed;
    const panel = document.getElementById("ai-history");
    const toggleIcon = document.getElementById("ai-history-toggle");
    if (panel) panel.classList.toggle("collapsed", this.historyCollapsed);
    if (toggleIcon) {
      toggleIcon.className = this.historyCollapsed ? "fas fa-angles-right" : "fas fa-angles-left";
    }
  },

  async checkConnection() {
    const modelSelect = document.getElementById("aiModelSelect");
    const provider = document.getElementById("aiProviderSelect").value;
    let url = document.getElementById("aiServerUrlInput").value;
    const apiKey = document.getElementById("aiApiKeyInput").value.trim();
    const currentModel = localStorage.getItem("dj_ai_model");
    const statusSpan = document.getElementById("ai-connection-status");
    const refreshIcon = document.querySelector(".ai-refresh-icon");

    if (!modelSelect) return;
    if (refreshIcon) refreshIcon.style.color = "#94a3b8";

    const showStatus = (msg, color) => {
      if (statusSpan) {
        statusSpan.innerText = msg;
        statusSpan.style.color = color;
        statusSpan.style.display = "inline-block";
        setTimeout(() => statusSpan.style.display = "none", 6000);
      }
      if (refreshIcon) refreshIcon.style.color = color;
    };

    const updateModelSelect = (models, isDisabled = false) => {
      if (models.length > 0) {
        modelSelect.innerHTML = models.map(m => 
          `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`
        ).join('');
        modelSelect.disabled = isDisabled;
        this.updateChatbotAvailability(true);
      } else {
        const msg = window.i18n ? window.i18n.get("aiCheckFail") : "확인 불가";
        modelSelect.innerHTML = `<option value="">${msg}</option>`;
        modelSelect.disabled = true;
        this.updateChatbotAvailability(false);
      }
    };

    if (provider === "none") {
      modelSelect.disabled = true;
      modelSelect.innerHTML = `<option value="">${window.i18n ? window.i18n.get("aiNoServer") : "접속 안됨"}</option>`;
      this.updateChatbotAvailability(false);
      return;
    }

    if (provider === "openai") {
      if (!apiKey) {
        modelSelect.innerHTML = `<option value="">${window.i18n ? window.i18n.get("aiNeedKey") : "Key 필요"}</option>`;
        modelSelect.disabled = true;
        this.updateChatbotAvailability(false);
        showStatus(window.i18n ? window.i18n.get("msgConnFail") : "실패", "#ef4444");
        return;
      }
      try {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        if (res.ok) {
          const data = await res.json();
          const models = data.data.filter(m => m.id.startsWith("gpt-")).map(m => m.id).sort();
          updateModelSelect(models);
          showStatus(window.i18n ? window.i18n.get("msgConnSuccess") : "성공", "#22c55e");
        } else { throw new Error(); }
      } catch (e) {
        updateModelSelect([], true);
        showStatus(window.i18n ? window.i18n.get("msgConnFail") : "실패", "#ef4444");
      }
      return;
    }

    if (provider === "gemini") {
      if (!apiKey) {
        modelSelect.innerHTML = `<option value="">${window.i18n ? window.i18n.get("aiNeedKey") : "Key 필요"}</option>`;
        modelSelect.disabled = true;
        this.updateChatbotAvailability(false);
        showStatus(window.i18n ? window.i18n.get("msgConnFail") : "실패", "#ef4444");
        return;
      }
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          const models = data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""));
          updateModelSelect(models);
          showStatus(window.i18n ? window.i18n.get("msgConnSuccess") : "성공", "#22c55e");
        } else { throw new Error(); }
      } catch (e) {
        updateModelSelect([], true);
        showStatus(window.i18n ? window.i18n.get("msgConnFail") : "실패", "#ef4444");
      }
      return;
    }

    if (provider === "claude") {
      if (!apiKey) {
        modelSelect.innerHTML = `<option value="">${window.i18n ? window.i18n.get("aiNeedKey") : "Key 필요"}</option>`;
        modelSelect.disabled = true;
        this.updateChatbotAvailability(false);
        showStatus(window.i18n ? window.i18n.get("msgConnFail") : "실패", "#ef4444");
      } else {
        const models = ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"];
        updateModelSelect(models);
        showStatus(window.i18n ? window.i18n.get("msgConnSuccess") : "성공", "#22c55e");
      }
      return;
    }

    if (!url) {
      modelSelect.disabled = true;
      modelSelect.innerHTML = `<option value="">${window.i18n ? window.i18n.get("aiNoServer") : "접속 안됨"}</option>`;
      this.updateChatbotAvailability(false);
      showStatus(window.i18n ? window.i18n.get("msgConnFail") : "실패", "#ef4444");
      return;
    }

    let fetchUrl = url.includes("localhost") ? url.replace("localhost", "127.0.0.1") : url;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${fetchUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          const models = data.models.map(m => m.name);
          updateModelSelect(models);
          showStatus(window.i18n ? window.i18n.get("msgConnSuccess") : "성공", "#22c55e");
        } else { throw new Error(); }
      } else { throw new Error(); }
    } catch (e) {
      updateModelSelect([], true);
      showStatus(window.i18n ? window.i18n.get("msgConnFail") : "실패", "#ef4444");
    }
  }
};

window.ai = ai;
