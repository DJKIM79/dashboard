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
    if (provider === "openai") return localStorage.getItem("dj_ai_api_key") || "";
    if (provider === "gemini") return localStorage.getItem("dj_ai_api_key_gemini") || "";
    // Custom providers
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

  getStorageKey() {
    return `dj_ai_chats_${this.provider}`;
  },

  get chats() {
    if (this.provider === "none") return [];
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
        // Focus textarea when clicking the input area (background)
        if (e.target.closest(".ai-chat-input-area") && !e.target.closest("button") && !e.target.closest("#ai-attach-wrapper")) {
            document.getElementById("ai-user-input")?.focus();
        }

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
        
        // Hide delete confirmation tip when clicking outside
        if (document.querySelector(".validation-tip.ai-delete-confirm") && !e.target.closest(".validation-tip")) {
            utils.hideValidationTip();
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
    if (titleInput) titleInput.value = chat ? this.getDisplayTitle(chat.title) : this.getDisplayTitle("");
    if (historyTitleEl) {
      // Prioritize the model used in the specific chat
      historyTitleEl.innerText = chat?.model || this.settingsModel || "AI Chat";
    }

    const actionsEl = document.querySelector(".ai-actions");
    if (actionsEl) {
      const hasRealMessages = chat && chat.messages.some(m => m.role === "user" || m.role === "bot");
      // 제목 옆에는 삭제 대신 텍스트 내보내기 버튼 표시
      actionsEl.innerHTML = (chat && hasRealMessages) 
        ? `<i class="fas fa-file-arrow-down ai-btn-export" onclick="ai.exportChatToText(${chat.id}, event)" title="${window.i18n ? window.i18n.get("txtExportText") : "텍스트로 내보내기"}"></i>` 
        : "";
    }
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
    // Do not check for connection here, rely on cache if available
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
          popup.classList.remove("show");
          setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
          }, 200);
        };
        popup.appendChild(div);
      });
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
        // Record the last successful model BEFORE changing (for rollback)
        if (!chat._lastModel) chat._lastModel = oldModel;
        
        chat.model = m;
        
        // 실사용 메시지(user 또는 bot)가 있는 경우에만 시스템 메시지 추가
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
      
      // If we have a saved model but it's not in the new list, pick the first one
      if (savedModel && !models.includes(savedModel)) {
        localStorage.setItem("dj_ai_model", models[0]);
        // No need to reload history, just select the new available model
        this.selectTemporaryModel(models[0]);
      } else if (!savedModel) {
        // If no model was selected at all, pick the first one
        localStorage.setItem("dj_ai_model", models[0]);
      }
      // If savedModel is IN the list, we do nothing and keep it.
      
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
    const historyDot = document.getElementById("ai-history-status-dot");

    if (this._statusInterval) {
        clearInterval(this._statusInterval);
        this._statusInterval = null;
    }

    if (state === "checking") {
      const gray = "#94a3b8";
      if (dot) dot.style.background = gray;
      if (historyDot) historyDot.style.background = gray;
      
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
      if (historyDot) historyDot.style.background = green;
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
      if (historyDot) historyDot.style.background = hasProvider ? red : gray;
      if (text) {
        text.innerText = hasProvider ? window.i18n ? window.i18n.get("msgConnFail") : "서버 연결 실패" : (window.i18n ? window.i18n.get("aiNeedConnect") : window.i18n ? window.i18n.get("aiNeedConnect") : "서버 연결 안됨");
      }
      if (statusSpan) statusSpan.style.color = hasProvider ? red : gray;
    }
  },

  async checkConnection(isSilent = false) {
    const provider = localStorage.getItem("dj_ai_provider") || "none";
    const apiKey = document.getElementById("aiApiKeyInput")?.value.trim() || this.apiKey;
    
    // Custom AI는 this.serverUrl에서 등록된 URL을 가져옴
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
        // Custom Provider
        if (!url) { finalize(false); return; }
        let fetchUrl = url.endsWith("/") ? url.slice(0, -1) : url;
        
        // Find custom provider protocol
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
          } else {
            // OpenAI default health check
            const headers = { "Content-Type": "application/json" };
            
            // 로컬 호스트가 아닌데 API Key가 없으면 즉시 실패 처리
            const isLocal = fetchUrl.includes("127.0.0.1") || fetchUrl.includes("localhost");
            if (!apiKey && !isLocal) {
                finalize(false);
                return;
            }

            if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
            
            // OpenAI 호환 경로 정규화 (/v1 중복 방지)
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
                // OpenAI 규격인지 확인 (data 배열 존재 여부)
                if (data && data.data && Array.isArray(data.data)) {
                    finalize(true, data.data.map(m => m.id).sort());
                } else {
                    finalize(false); // 주소는 맞으나 규격이 다름
                }
            } else {
                // 401, 403 에러면 실패로 간주 (단, 로컬 호스트 제외)
                if ((res.status === 401 || res.status === 403) && !isLocal) {
                    finalize(false);
                } else if (res.status === 404 && isJson) {
                    // LM Studio 등은 404를 줄 수 있으나 응답은 JSON이어야 함
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

  async sendMessage() {
    const input = document.getElementById("ai-user-input");
    const text = input.value.trim();
    if (!text || this.isGenerating) return;
    if (!this.isConnected) {
      alert(window.i18n ? window.i18n.get("aiNeedConnectHover") : "AI 서버 연결이 필요합니다.");
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

    // Immediately update title if this is the first real message
    if (!chat.messages.some(m => m.role === "user") && this.isDefaultTitle(chat.title)) {
        const firstLine = text.split("\n")[0];
        chat.title = firstLine.length > 20 ? firstLine.substring(0, 20) + "..." : firstLine;
        this.chats = chats;
        this.updateModelDisplay();
        this.renderHistory();
    }

    const activeModel = chat.model || this.settingsModel;

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
      if (provider.startsWith("custom_"))
        await this.callLocalAI(text, botMsgDiv, chat, activeModel);
      else if (provider === "openai")
        await this.callOpenAI(text, botMsgDiv, chat, activeModel);
      else if (provider === "gemini")
        await this.callGemini(text, botMsgDiv, chat, activeModel);
      
      this.updateStatusUI();
      // Only after success, ensure history and title are updated
      this.renderHistory();
    } catch (e) {
      if (e.message === "Model permission error") {
        // handleModelError has already been called inside callXXXAI
        // Do not update chatbot availability to false because server is actually connected
      } else {
        botMsgDiv.innerText = window.i18n ? window.i18n.get("msgAiErrorComm") : "오류: 서버와 통신할 수 없습니다.";
        this.updateChatbotAvailability(false);
      }
    } finally {
      this.isGenerating = false;
    }
  },

  handleModelError(model) {
    const chats = this.chats;
    const chat = chats.find((c) => c.id === this.currentChatId);

    if (chat && chat._lastModel && chat._lastModel !== model) {
        const rollbackModel = chat._lastModel;
        const msg = `<i class="fas fa-exclamation-circle" style="color: #ef4444; margin-right: 6px;"></i>${window.i18n ? window.i18n.get("msgAiModelNotSupported").replace("{0}", rollbackModel) : "모델이 지원되지 않아 원래 모델(" + rollbackModel + ")로 복귀합니다."}`;
        
        // Switch model silently and show the red error message
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
  async callLocalAI(prompt, msgDiv, chat, model) {
    const isStream = !this.outputAtOnce;
    const provider = this.provider;
    
    // Custom AI 프로토콜 가져오기
    const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    const currentCustom = customAis.find(a => a.id === provider);
    const protocol = currentCustom ? currentCustom.protocol : "openai";

    const headers = { "Content-Type": "application/json" };
    if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let url = "";
    let body = {};

    if (protocol === "ollama") {
        url = `${this.serverUrl}/api/chat`;
        body = {
            model: model,
            messages: chat.messages
              .map((m) => ({ role: m.role, content: m.content }))
              .concat([{ role: "user", content: prompt }]),
            stream: isStream,
        };
    } else if (protocol === "anthropic") {
        url = `${this.serverUrl}/v1/messages`;
        body = {
            model: model,
            messages: chat.messages
              .filter(m => m.role !== "system")
              .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }))
              .concat([{ role: "user", content: prompt }]),
            max_tokens: 4096,
            stream: isStream,
        };
        const systemMsg = chat.messages.find(m => m.role === "system");
        if (systemMsg) body.system = systemMsg.content;
    } else if (protocol === "gemini") {
        url = `${this.serverUrl}/v1beta/models/${model}:generateContent`;
        body = {
            contents: chat.messages
              .filter(m => m.role !== "system")
              .map(m => ({
                  role: m.role === "bot" ? "model" : "user",
                  parts: [{ text: m.content }]
              }))
              .concat([{ role: "user", parts: [{ text: prompt }] }])
        };
    } else {
        // OpenAI protocol
        let fetchUrl = this.serverUrl;
        if (fetchUrl.endsWith("/")) fetchUrl = fetchUrl.slice(0, -1);

        // /v1 중복 방지 정규화
        const baseUrl = fetchUrl.endsWith("/v1") ? fetchUrl.slice(0, -3) : fetchUrl;
        url = `${baseUrl}/v1/chat/completions`;

        body = {
            model: model,
            messages: chat.messages
              .map((m) => ({ role: m.role === "bot" ? "assistant" : m.role, content: m.content }))
              .concat([{ role: "user", content: prompt }]),
            stream: isStream,
        };
    }

    const fetchOptions = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    };
    
    // Anthropic special header
    if (protocol === "anthropic" && this.apiKey) {
        headers["x-api-key"] = this.apiKey;
        headers["anthropic-version"] = "2023-06-01";
        delete headers["Authorization"];
    }
    
    // Gemini special handling
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
              // OpenAI stream format is 'data: {...}'
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
    this.saveMessage(chat.id, prompt, text);
  },

  saveMessage(chatId, userPrompt, botResponse) {
    const chats = this.chats;
    const c = chats.find((x) => x.id === chatId);
    if (c) {
      const now = Date.now();
      c.messages.push({ role: "user", content: userPrompt, timestamp: now });
      c.messages.push({ role: "bot", content: botResponse, timestamp: now });
      // Store current model as the last known GOOD model for this chat
      c._lastModel = c.model || this.settingsModel;
      this.chats = chats;
      this.renderHistory();
      this.updateModelDisplay();
    }
  },

  handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  },
  renderHistory(searchTerm = "", addedChatId = null) {
    const list = document.getElementById("ai-history-list");
    if (!list) return;
    list.innerHTML = "";
    const lowerSearch = searchTerm.toLowerCase();
    this.chats.forEach((chat) => {
      if (searchTerm && !chat.title.toLowerCase().includes(lowerSearch)) return;
      const div = document.createElement("div");
      div.className = `ai-history-item ${chat.id === this.currentChatId ? "active" : ""}`;
      if (chat.id === addedChatId) {
        div.classList.add("chat-adding");
      }
      div.dataset.id = chat.id;
      div.onclick = () => this.loadChat(chat.id);
      
      // 제목이 변경되었거나 메시지가 있는 경우 휴지통 표시
      const isDefaultTitle = this.isDefaultTitle(chat.title);
      const hasRealMessages = chat.messages.some(m => m.role === "user" || m.role === "bot");
      const isDeletable = !isDefaultTitle || hasRealMessages;
      
      div.innerHTML = `<span>${this.getDisplayTitle(chat.title)}</span>${isDeletable ? `<i class="fas fa-trash-alt" onclick="ai.deleteChat(${chat.id}, event)"></i>` : ""}`;
      list.appendChild(div);
    });
  },
  filterHistory(val) {
    this.renderHistory(val);
  },
  loadChat(id = null, addedChatId = null) {
    const chats = this.chats;
    if (!id) {
      if (chats.length > 0) this.currentChatId = chats[0].id;
      else {
        this.createNewChat();
        return;
      }
    } else this.currentChatId = id;
    this.renderHistory("", addedChatId);
    const chat = this.getCurrentChat();
    const msgContainer = document.getElementById("ai-messages");
    if (msgContainer) {
      msgContainer.innerHTML = "";
      if (chat)
        chat.messages.forEach((m) =>
          this.appendMessage(m.role, m.content, false, m.role.startsWith("system")),
        );
    }
    this.updateModelDisplay();
  },
  createNewChat() {
    const chats = this.chats;
    // 제목이 기본값이고 메시지가 없는 진짜 '빈 대화'만 찾아서 재사용
    const emptyChat = chats.find(
      (c) =>
        this.isDefaultTitle(c.title) &&
        (!c.messages || c.messages.length === 0 || !c.messages.some(m => m.role === "user" || m.role === "bot")),
    );
    if (emptyChat) {
      this.loadChat(emptyChat.id);
      return;
    }
    const newId = Date.now();
    this.currentChatId = newId;
    const newChat = {
      id: newId,
      title: "새 대화",
      messages: [],
      model: this.settingsModel,
    };
    const newChats = [newChat, ...chats];
    this.chats = newChats;
    this.loadChat(newId, newId);
  },
  deleteChat(id, e) {
    if (e) e.stopPropagation();
    const target = e ? e.target : null;
    if (!target) return;

    const html = `
      <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
        <span style="font-size: 0.8rem; white-space: nowrap;">삭제하시겠습니까?</span>
        <button class="btn-del-confirm" onclick="ai.performDeleteChat(${id})" style="width: 100%;">${window.i18n ? window.i18n.get("btnDeleteConfirm") : "삭제"}</button>
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
        const chats = this.chats.filter((c) => c.id !== id);
        this.chats = chats;
        if (chats.length === 0) this.createNewChat();
        else if (this.currentChatId === id) this.loadChat(this.chats[0].id);
        else this.renderHistory();
    };

    if (item) {
        item.classList.add("chat-deleting");
        // CSS 애니메이션 시간(0.4s)에 맞춰 대기 후 실제 삭제 로직 수행
        setTimeout(executeDelete, 400);
    } else {
        executeDelete();
    }
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
      window.i18n ? window.i18n.get("msgAttachFuture") : "파일 첨부 기능은 향후에 지원할 예정입니다.",
    );
  },
  hideAttachTip() {
    utils.hideValidationTip();
  },
  exportChatToText(id, e) {
    if (e) e.stopPropagation();
    const chat = this.chats.find(c => c.id === id);
    if (!chat || chat.messages.length === 0) return;

    let content = `[AI Chat Export]\n`;
    content += `Title: ${chat.title}\n`;
    content += `Model: ${chat.model || this.settingsModel}\n`;
    content += `Date: ${new Date(chat.id).toLocaleString()}\n`;
    content += `------------------------------------------\n\n`;

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
      
      content += `[${roleName}]${timeStr}\n${textContent}\n\n`;
    });

    content += `------------------------------------------\n`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileName = `${chat.title.replace(/[/\\?%*:|"<>]/g, '-')}_${new Date().getTime()}.txt`;
    
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },
  appendMessage(role, text, save = true, isHtml = false) {
    const container = document.getElementById("ai-messages");
    if (!container) return null;
    const div = document.createElement("div");
    div.className = `ai-message ${role}`;
    
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

    if (isHtml) div.innerHTML = text;
    else div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  },
};

window.ai = ai;
