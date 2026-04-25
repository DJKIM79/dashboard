const ai = {
  provider: localStorage.getItem("dj_ai_provider") || "none",
  serverUrl: localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434",
  apiKey: localStorage.getItem("dj_ai_api_key") || "",
  model: localStorage.getItem("dj_ai_model") || "",
  isGenerating: false,
  historyCollapsed: false,
  chats: JSON.parse(localStorage.getItem("dj_ai_chats")) || [],
  currentChatId: null,

  init() {
    this.updateModelDisplay();
    this.renderHistory();
    this.loadChat();
  },

  updateModelDisplay() {
    const nameEl = document.getElementById("ai-model-name");
    if (nameEl) {
      nameEl.innerText = this.model || "Settings Required";
    }
  },

  renderWelcome() {
    const msgContainer = document.getElementById("ai-messages");
    if (!msgContainer) return;
    msgContainer.innerHTML = "";
    
    const welcomeText = this.model 
      ? `현재 사용 중인 모델은 ${this.model} 입니다.` 
      : 'AI 설정을 완료해 주세요.';
    this.appendMessage("bot", welcomeText);
  },

  appendMessage(role, text, save = true) {
    const msgContainer = document.getElementById("ai-messages");
    if (!msgContainer) return null;

    const div = document.createElement("div");
    div.className = `ai-message ${role}`;
    div.innerText = text;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    if (save && this.currentChatId) {
      const chat = this.chats.find(c => c.id === this.currentChatId);
      if (chat) {
        chat.messages.push({ role, content: text });
        this.saveChats();
      }
    }
    return div;
  },

  saveChats() {
    localStorage.setItem("dj_ai_chats", JSON.stringify(this.chats));
    this.renderHistory();
  },

  loadChat(id = null) {
    if (!id) {
      if (this.chats.length > 0) {
        this.currentChatId = this.chats[0].id;
      } else {
        this.currentChatId = Date.now();
        this.chats.push({ id: this.currentChatId, title: "새로운 대화", messages: [] });
        this.saveChats();
      }
    } else {
      this.currentChatId = id;
    }
    
    this.renderHistory();
    const chat = this.chats.find(c => c.id === this.currentChatId);
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) msgContainer.innerHTML = "";

    if (chat && chat.messages.length > 0) {
      chat.messages.forEach(m => this.appendMessage(m.role, m.content, false));
    } else {
      this.renderWelcome();
    }
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
    this.chats = this.chats.filter(c => c.id !== id);
    if (this.chats.length === 0) {
      this.currentChatId = Date.now();
      this.chats.push({ id: this.currentChatId, title: "새로운 대화", messages: [] });
    } else if (this.currentChatId === id) {
      this.currentChatId = this.chats[0].id;
    }
    this.saveChats();
    this.loadChat(this.currentChatId);
  },

  async sendMessage() {
    const input = document.getElementById("ai-user-input");
    const text = input.value.trim();
    if (!text || this.isGenerating) return;

    if (!this.model) {
      alert("AI 설정을 먼저 완료해 주세요.");
      settings.openModal();
      return;
    }

    const chat = this.chats.find(c => c.id === this.currentChatId);
    if (chat && chat.title === "새로운 대화") {
      chat.title = text.length > 15 ? text.substring(0, 15) + "..." : text;
      this.saveChats();
    }

    this.appendMessage("user", text);
    input.value = "";
    this.isGenerating = true;

    const botMsgDiv = this.appendMessage("bot", "...");
    // temporarily remove from history until stream finishes
    if (chat) chat.messages.pop();
    
    try {
      if (this.provider === "local") {
        await this.callLocalAI(text, botMsgDiv, chat);
      } else {
        botMsgDiv.innerText = "현재 로컬 AI(Ollama)만 지원됩니다. 다른 API는 곧 추가될 예정입니다.";
        if (chat) {
          chat.messages.push({ role: "bot", content: botMsgDiv.innerText });
          this.saveChats();
        }
      }
    } catch (e) {
      botMsgDiv.innerText = "Error: AI 서버와 통신 중 오류가 발생했습니다.";
      if (chat) {
        chat.messages.push({ role: "bot", content: botMsgDiv.innerText });
        this.saveChats();
      }
      console.error(e);
    } finally {
      this.isGenerating = false;
    }
  },

  async callLocalAI(prompt, msgDiv, chat) {
    const response = await fetch(`${this.serverUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: chat.messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: prompt }]),
        stream: true
      })
    });

    if (!response.ok) throw new Error('Ollama connection failed');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

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
            fullText += json.message.content;
            msgDiv.innerText = fullText;
            document.getElementById("ai-messages").scrollTop = document.getElementById("ai-messages").scrollHeight;
          }
        } catch (e) {}
      }
    }
    
    if (chat) {
      chat.messages.push({ role: "user", content: prompt });
      chat.messages.push({ role: "bot", content: fullText });
      this.saveChats();
    }
  },

  handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      this.sendMessage();
    }
  },

  attachFile() {
    alert("파일 첨부 기능은 곧 업데이트 될 예정입니다.");
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
      toggleIcon.className = this.historyCollapsed ? "fas fa-outdent" : "fas fa-indent";
    }
  },

  async checkConnection() {
    const modelSelect = document.getElementById("aiModelSelect");
    const provider = document.getElementById("aiProviderSelect").value;
    let url = document.getElementById("aiServerUrlInput").value;
    const currentModel = localStorage.getItem("dj_ai_model");
    const statusSpan = document.getElementById("ai-connection-status");

    const showStatus = (msg, color) => {
      if (statusSpan) {
        statusSpan.innerText = msg;
        statusSpan.style.color = color;
        statusSpan.style.display = "inline-block";
        setTimeout(() => {
          statusSpan.style.display = "none";
        }, 3000);
      }
    };

    if (provider === "none") {
      modelSelect.disabled = true;
      modelSelect.innerHTML = `<option value="">접속 안됨</option>`;
      return;
    }

    if (provider === "openai") {
      const models = ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
      modelSelect.innerHTML = models.map(m => `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`).join('');
      modelSelect.disabled = false;
      showStatus(window.i18n ? window.i18n.get("msgConnSuccess") || "서버 접속 성공" : "서버 접속 성공", "#22c55e");
      return;
    }
    if (provider === "gemini") {
      const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"];
      modelSelect.innerHTML = models.map(m => `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`).join('');
      modelSelect.disabled = false;
      showStatus(window.i18n ? window.i18n.get("msgConnSuccess") || "서버 접속 성공" : "서버 접속 성공", "#22c55e");
      return;
    }
    if (provider === "claude") {
      const models = ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"];
      modelSelect.innerHTML = models.map(m => `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`).join('');
      modelSelect.disabled = false;
      showStatus(window.i18n ? window.i18n.get("msgConnSuccess") || "서버 접속 성공" : "서버 접속 성공", "#22c55e");
      return;
    }

    if (!url) {
      modelSelect.disabled = true;
      modelSelect.innerHTML = `<option value="">접속 안됨</option>`;
      showStatus(window.i18n ? window.i18n.get("msgConnFail") || "서버 접속 실패" : "서버 접속 실패", "#ef4444");
      return;
    }

    // localhost를 127.0.0.1로 시도 (CORS 등 이슈 대비)
    let fetchUrl = url;
    if (fetchUrl.includes("localhost")) {
      fetchUrl = fetchUrl.replace("localhost", "127.0.0.1");
    }

    try {
      // 타임아웃 3초 설정
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch(`${fetchUrl}/api/tags`, { 
        method: 'GET',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        modelSelect.disabled = false;
        
        if (data.models && data.models.length > 0) {
          modelSelect.innerHTML = data.models.map(m => 
            `<option value="${m.name}" ${m.name === currentModel ? 'selected' : ''}>${m.name}</option>`
          ).join('');
        } else {
          modelSelect.innerHTML = `<option value="">접속 안됨</option>`;
          modelSelect.disabled = true;
        }
        showStatus(window.i18n ? window.i18n.get("msgConnSuccess") || "서버 접속 성공" : "서버 접속 성공", "#22c55e");
      } else {
        throw new Error();
      }
    } catch (e) {
      // 실패 시 모델 선택창에만 메시지 표시
      modelSelect.disabled = true;
      modelSelect.innerHTML = `<option value="">접속 안됨</option>`;
      showStatus(window.i18n ? window.i18n.get("msgConnFail") || "서버 접속 실패" : "서버 접속 실패", "#ef4444");
    }
  }
};

window.ai = ai;
