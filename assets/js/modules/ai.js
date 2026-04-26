const ai = {
  get provider() { return localStorage.getItem("dj_ai_provider") || "none"; },
  get serverUrl() { return localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434"; },
  get apiKey() { return localStorage.getItem("dj_ai_api_key") || ""; },
  // settingsModel: 환경 설정에서 선택한 기본 모델
  get settingsModel() { return localStorage.getItem("dj_ai_model") || ""; },
  get isConnected() { return localStorage.getItem("dj_ai_is_connected") === "true"; },
  set isConnected(val) { localStorage.setItem("dj_ai_is_connected", val); },

  outputAtOnce: localStorage.getItem("dj_ai_output_at_once") !== "false",
  isGenerating: false,
  historyCollapsed: false,
  
  // 채팅 목록은 여전히 제공자+기본모델별로 관리하여 데이터 분리 유지
  getStorageKey() {
    return `dj_ai_chats_${this.provider}_${this.settingsModel.replace(/[:/]/g, '_')}`;
  },

  get chats() {
    if (this.provider === "none" || !this.settingsModel) return [];
    return JSON.parse(localStorage.getItem(this.getStorageKey()) || "[]");
  },

  set chats(val) {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(val));
  },

  currentChatId: null,

  init() {
    this.renderHistory();
    this.loadChat(); // 내부에서 updateModelDisplay 호출됨
    
    const savedModels = JSON.parse(localStorage.getItem("dj_ai_models_cache") || "[]");
    
    if (this.isConnected && this.provider !== "none") {
      if (savedModels.length > 0) this.updateModelSelectUI(savedModels);
      this.updateChatbotAvailability(true);
      this.checkConnection(true);
    } else {
      this.updateChatbotAvailability(false);
      this.updateModelSelectUI([]);
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.history-title') && !e.target.closest('.ai-model-popup')) {
        document.getElementById('ai-model-popup')?.classList.remove('show');
      }
    });
  },

  // 현재 활성화된 채팅 객체 가져오기
  getCurrentChat() {
    return this.chats.find(c => c.id === this.currentChatId);
  },

  updateModelDisplay() {
    const titleInput = document.getElementById("ai-chat-title-input");
    const historyTitleEl = document.getElementById("ai-history-model-name");
    const chat = this.getCurrentChat();
    
    if (titleInput) {
      titleInput.value = chat ? chat.title : "새 대화";
    }
    if (historyTitleEl) {
      // 채팅창 자체에 설정된 모델이 있으면 그것을, 없으면 기본 설정 모델을 표시
      const activeModel = chat?.model || this.settingsModel;
      historyTitleEl.innerText = activeModel || "AI Chat";
    }
  },

  updateChatTitle(newTitle) {
    if (!this.currentChatId) return;
    const chats = this.chats;
    const chat = chats.find(c => c.id === this.currentChatId);
    if (chat) {
      chat.title = newTitle.trim() || "새 대화";
      this.chats = chats;
      this.renderHistory();
    }
  },

  toggleModelPopup(e) {
    e.stopPropagation();
    if (!this.isConnected) return;
    
    const popup = document.getElementById('ai-model-popup');
    if (!popup) return;

    if (popup.classList.contains('show')) {
      popup.classList.remove('show');
      return;
    }

    const models = JSON.parse(localStorage.getItem("dj_ai_models_cache") || "[]");
    popup.innerHTML = "";

    const chat = this.getCurrentChat();
    const activeModel = chat?.model || this.settingsModel;

    if (models.length > 1) {
      models.forEach(m => {
        const div = document.createElement('div');
        div.className = `ai-model-item ${m === activeModel ? 'active' : ''}`;
        div.innerHTML = `<span>${m}</span>${m === activeModel ? '<i class="fas fa-check" style="font-size:0.7rem;"></i>' : ''}`;
        div.onclick = () => {
          this.selectTemporaryModel(m);
          popup.classList.remove('show');
        };
        popup.appendChild(div);
      });
    } else {
      const tip = document.createElement('div');
      tip.className = "ai-model-tip";
      tip.innerText = "다른 모델을 사용하려면\n서버에 모델을 추가 설치해주세요.";
      popup.appendChild(tip);
    }

    popup.classList.add('show');
  },

  // 특정 채팅창의 모델만 임시 변경
  selectTemporaryModel(m) {
    const chats = this.chats;
    const chat = chats.find(c => c.id === this.currentChatId);
    if (chat) {
      chat.model = m; // 해당 채팅 객체에 모델 정보 저장
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
    const modelSelect = document.getElementById("aiModelSelect");
    if (!modelSelect) return;

    if (this.isConnected && models.length > 0) {
      modelSelect.innerHTML = models.map(m => 
        `<option value="${m}" ${m === this.settingsModel ? 'selected' : ''}>${m}</option>`
      ).join('');
      modelSelect.disabled = false;
      localStorage.setItem("dj_ai_models_cache", JSON.stringify(models));
      this.updateModelDisplay();
    } else {
      const msg = window.i18n ? window.i18n.get("aiNoServer") : "서버 연결 안됨";
      modelSelect.innerHTML = `<option value="">${msg}</option>`;
      modelSelect.disabled = true;
    }
  },

  updateStatusUI() {
    const statusSpan = document.getElementById("ai-connection-status");
    const dot = statusSpan?.querySelector(".status-dot");
    const text = statusSpan?.querySelector(".status-text");
    const T = window.i18n ? window.i18n.langData : {};
    const historyDot = document.getElementById("ai-history-status-dot");
    
    if (this.isConnected) {
      const green = "#22c55e";
      if (dot) dot.style.background = green;
      if (historyDot) historyDot.style.background = green;
      if (text) {
        let pName = this.provider.charAt(0).toUpperCase() + this.provider.slice(1);
        if (this.provider === 'local') pName = "로컬 AI";
        text.innerText = `${pName} 연결됨`;
      }
      if (statusSpan) statusSpan.style.color = green;
    } else {
      const gray = "#94a3b8";
      const red = "#ef4444";
      if (dot) dot.style.background = gray; 
      if (historyDot) historyDot.style.background = (this.provider !== 'none') ? red : gray;
      if (text) text.innerText = T.aiNeedConnect || "서버 연결 안됨";
      if (statusSpan) statusSpan.style.color = gray;
    }
  },

  async checkConnection(isSilent = false) {
    const providerEl = document.getElementById("aiProviderSelect");
    const provider = providerEl ? providerEl.value : this.provider;
    const url = document.getElementById("aiServerUrlInput")?.value || this.serverUrl;
    const apiKey = document.getElementById("aiApiKeyInput")?.value.trim() || this.apiKey;
    
    const tempMsgSpan = document.getElementById("ai-temp-msg");
    const refreshIcon = document.querySelector(".ai-refresh-icon");

    const finalize = (isConnected, models = []) => {
      if (isConnected) {
        this.updateChatbotAvailability(true);
        this.updateModelSelectUI(models);
      } else if (!isSilent) {
        this.updateChatbotAvailability(false);
        this.updateModelSelectUI([]);
      }
      
      if (!isSilent) {
        const pName = provider === 'local' ? '로컬 AI' : provider.charAt(0).toUpperCase() + provider.slice(1);
        if (tempMsgSpan) {
          tempMsgSpan.innerText = isConnected ? `${pName} 연결 성공!` : `${pName} 연결 실패!`;
          tempMsgSpan.style.color = isConnected ? "#22c55e" : "#ef4444";
          tempMsgSpan.style.display = "inline-block";
          setTimeout(() => tempMsgSpan.style.display = "none", 4000);
        }
        if (refreshIcon) refreshIcon.style.color = isConnected ? "#22c55e" : "#ef4444";
      }
    };

    if (provider === "none") { finalize(false); return; }

    try {
      if (provider === "openai") {
        if (!apiKey) { finalize(false); return; }
        const res = await fetch("https://api.openai.com/v1/models", { headers: { "Authorization": `Bearer ${apiKey}` } });
        if (res.ok) {
          const data = await res.json();
          const models = data.data.filter(m => m.id.startsWith("gpt-")).map(m => m.id).sort();
          finalize(true, models);
        } else { finalize(false); }
      } else if (provider === "gemini") {
        if (!apiKey) { finalize(false); return; }
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          const models = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).map(m => m.name.replace("models/", ""));
          finalize(true, models);
        } else { finalize(false); }
      } else if (provider === "claude") {
        if (!apiKey) finalize(false);
        else finalize(true, ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]);
      } else if (provider === "local") {
        if (!url) { finalize(false); return; }
        let fetchUrl = url.includes("localhost") ? url.replace("localhost", "127.0.0.1") : url;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${fetchUrl}/api/tags`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          finalize(true, (data.models || []).map(m => m.name));
        } else { finalize(false); }
      }
    } catch (e) { finalize(false); }
  },

  async sendMessage() {
    const input = document.getElementById("ai-user-input");
    const text = input.value.trim();
    if (!text || this.isGenerating) return;
    if (!this.isConnected) { alert("AI 서버 연결이 필요합니다."); settings.openModal(); return; }
    
    const chats = this.chats;
    const chat = this.getCurrentChat();
    if (!chat) return;

    // 현재 채팅에 설정된 모델 사용 (없으면 기본값)
    const activeModel = chat.model || this.settingsModel;
    
    if (chat.messages.length === 0 && (chat.title === "새 대화" || chat.title === "새로운 대화")) {
      const firstLine = text.split('\n')[0];
      chat.title = firstLine.length > 20 ? firstLine.substring(0, 20) + "..." : firstLine;
      this.chats = chats;
      this.updateModelDisplay();
    }
    
    this.appendMessage("user", text);
    input.value = "";
    this.isGenerating = true;
    const botMsgDiv = this.appendMessage("bot", `<div class="typing-indicator"><span></span><span></span><span></span></div>`, false, true);
    
    try {
      if (this.provider === "local") await this.callLocalAI(text, botMsgDiv, chat, activeModel);
      else if (this.provider === "openai") await this.callOpenAI(text, botMsgDiv, chat, activeModel);
      else if (this.provider === "gemini") await this.callGemini(text, botMsgDiv, chat, activeModel);
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
    const response = await fetch(`${this.serverUrl}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: model, 
        messages: chat.messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: prompt }]), 
        stream: isStream 
      })
    });
    if (!response.ok) throw new Error();
    let fullText = '';
    if (isStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              if (fullText === '') msgDiv.innerHTML = "";
              fullText += json.message.content;
              msgDiv.innerText = fullText;
              document.getElementById("ai-messages").scrollTop = document.getElementById("ai-messages").scrollHeight;
            }
          } catch (e) {}
        }
      }
    } else {
      const json = await response.json();
      fullText = json.message?.content || "";
      msgDiv.innerText = fullText;
    }
    this.saveMessage(chat.id, prompt, fullText);
  },

  async callOpenAI(prompt, msgDiv, chat, model) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ 
        model: model, 
        messages: chat.messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: prompt }]) 
      })
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    const text = json.choices[0].message.content;
    msgDiv.innerText = text;
    this.saveMessage(chat.id, prompt, text);
  },

  async callGemini(prompt, msgDiv, chat, model) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    const text = json.candidates[0].content.parts[0].text;
    msgDiv.innerText = text;
    this.saveMessage(chat.id, prompt, text);
  },

  saveMessage(chatId, userPrompt, botResponse) {
    const chats = this.chats;
    const c = chats.find(x => x.id === chatId);
    if (c) { 
      c.messages.push({ role: "user", content: userPrompt }); 
      c.messages.push({ role: "bot", content: botResponse }); 
      this.chats = chats; 
      this.renderHistory(); 
    }
  },

  handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.sendMessage(); } },
  
  renderHistory(searchTerm = "") {
    const list = document.getElementById("ai-history-list");
    if (!list) return;
    list.innerHTML = "";
    const lowerSearch = searchTerm.toLowerCase();
    this.chats.forEach(chat => {
      if (searchTerm && !chat.title.toLowerCase().includes(lowerSearch)) return;
      const div = document.createElement("div");
      div.className = `ai-history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
      div.onclick = () => this.loadChat(chat.id);
      div.innerHTML = `<span>${chat.title}</span><i class="fas fa-trash-alt" onclick="ai.deleteChat(${chat.id}, event)"></i>`;
      list.appendChild(div);
    });
  },

  filterHistory(val) { this.renderHistory(val); },

  loadChat(id = null) {
    const chats = this.chats;
    if (!id) { 
      if (chats.length > 0) this.currentChatId = chats[0].id; 
      else { this.createNewChat(); return; } 
    } else {
      this.currentChatId = id;
    }
    this.renderHistory();
    const chat = this.getCurrentChat();
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) { 
      msgContainer.innerHTML = ""; 
      if (chat) chat.messages.forEach(m => this.appendMessage(m.role, m.content, false)); 
    }
    this.updateModelDisplay();
  },

  createNewChat() {
    const chats = this.chats;
    // 1. 이미 비어있는 '새 대화'가 있는지 확인
    const emptyChat = chats.find(c => c.messages.length === 0 && (c.title === "새 대화" || c.title === "새로운 대화"));
    
    if (emptyChat) {
      // 있다면 새로 만들지 않고 해당 대화로 이동
      this.loadChat(emptyChat.id);
      return;
    }

    // 2. 없다면 새로 생성
    this.currentChatId = Date.now();
    chats.unshift({ 
      id: this.currentChatId, 
      title: "새 대화", 
      messages: [],
      model: this.settingsModel // 생성 시점의 환경 설정 모델을 기본으로 저장
    });
    this.chats = chats;
    this.loadChat(this.currentChatId);
  },

  deleteChat(id, e) {
    e.stopPropagation();
    this.chats = this.chats.filter(c => c.id !== id);
    if (this.chats.length === 0) this.createNewChat();
    else if (this.currentChatId === id) this.loadChat(this.chats[0].id);
    else this.renderHistory();
  },

  toggleHistory() {
    this.historyCollapsed = !this.historyCollapsed;
    document.getElementById("ai-history")?.classList.toggle("collapsed", this.historyCollapsed);
    document.getElementById("ai-history-toggle").className = this.historyCollapsed ? "fas fa-angles-right" : "fas fa-angles-left";
  },

  renderWelcome() {
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) msgContainer.innerHTML = "";
  },

  appendMessage(role, text, save = true, isHtml = false) {
    const container = document.getElementById("ai-messages");
    if (!container) return null;
    const div = document.createElement("div");
    div.className = `ai-message ${role}`;
    if (isHtml) div.innerHTML = text; else div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }
};

window.ai = ai;
