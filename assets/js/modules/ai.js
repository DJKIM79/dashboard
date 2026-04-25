const ai = {
  provider: localStorage.getItem("dj_ai_provider") || "local",
  serverUrl: localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434",
  apiKey: localStorage.getItem("dj_ai_api_key") || "",
  model: localStorage.getItem("dj_ai_model") || "",
  isGenerating: false,
  historyCollapsed: false,

  init() {
    this.updateModelDisplay();
    this.renderWelcome();
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

  appendMessage(role, text) {
    const msgContainer = document.getElementById("ai-messages");
    if (!msgContainer) return;

    const div = document.createElement("div");
    div.className = `ai-message ${role}`;
    div.innerText = text;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    return div;
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

    this.appendMessage("user", text);
    input.value = "";
    this.isGenerating = true;

    const botMsgDiv = this.appendMessage("bot", "...");
    
    try {
      if (this.provider === "local") {
        await this.callLocalAI(text, botMsgDiv);
      } else {
        botMsgDiv.innerText = "현재 로컬 AI(Ollama)만 지원됩니다. 다른 API는 곧 추가될 예정입니다.";
      }
    } catch (e) {
      botMsgDiv.innerText = "Error: AI 서버와 통신 중 오류가 발생했습니다.";
      console.error(e);
    } finally {
      this.isGenerating = false;
    }
  },

  async callLocalAI(prompt, msgDiv) {
    const response = await fetch(`${this.serverUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
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
  },

  handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  },

  clearChat() {
    this.renderWelcome();
  },

  toggleHistory() {
    this.historyCollapsed = !this.historyCollapsed;
    const panel = document.getElementById("ai-history");
    if (panel) panel.classList.toggle("collapsed", this.historyCollapsed);
  },

  async checkConnection() {
    const modelSelect = document.getElementById("aiModelSelect");
    const provider = document.getElementById("aiProviderSelect").value;
    let url = document.getElementById("aiServerUrlInput").value;

    if (provider !== "local") {
      modelSelect.disabled = true;
      return;
    }

    if (!url) {
      modelSelect.disabled = true;
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
        
        const currentModel = localStorage.getItem("dj_ai_model");
        if (data.models && data.models.length > 0) {
          modelSelect.innerHTML = data.models.map(m => 
            `<option value="${m.name}" ${m.name === currentModel ? 'selected' : ''}>${m.name}</option>`
          ).join('');
        } else {
          modelSelect.innerHTML = `<option value="">설치된 모델이 없습니다.</option>`;
          modelSelect.disabled = true;
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      // 실패 시 모델 선택창에만 메시지 표시
      modelSelect.disabled = true;
      modelSelect.innerHTML = `<option value="">서버 오류</option>`;
    }
  }
};

window.ai = ai;
