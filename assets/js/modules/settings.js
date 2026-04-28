const settings = {
  openModal() {
    try {
      // Close AI widget if it's open
      if (localStorage.getItem("dj_hide_ai") !== "true") {
        localStorage.setItem("dj_hide_ai", "true");
        if (window.ui) ui.applyVisibility();
      }

      let bgKeyword = localStorage.getItem("dj_bg_keyword");
      if (bgKeyword === null) bgKeyword = "";

      const quoteFontSize =
        localStorage.getItem("dj_quote_font_size") || "medium";
      const widgetSize = localStorage.getItem("dj_widget_size") || "medium";
      const searchNewTab =
        localStorage.getItem("dj_search_new_tab") === "true";
      const showFileMgmt =
        localStorage.getItem("dj_hide_fileMgmt") !== "true";
      const showWeather =
        localStorage.getItem("dj_show_current_weather") === "true";
      const aiOutputAtOnce =
        localStorage.getItem("dj_ai_output_at_once") === "true";

      const el = (id) => document.getElementById(id);

      if (el("bgKeywordInput")) el("bgKeywordInput").value = bgKeyword;
      
      // Update custom selects initial text
      const quoteSizeText = el("quote-size-text");
      if (quoteSizeText) {
        const sizeMap = { small: "optSmall", medium: "optMedium", large: "optLarge" };
        quoteSizeText.setAttribute("data-i18n", sizeMap[quoteFontSize]);
        if (window.i18n) quoteSizeText.innerText = i18n.get(sizeMap[quoteFontSize]);
      }
      
      const widgetSizeText = el("widget-size-text");
      if (widgetSizeText) {
        const sizeMap = { small: "optSmall", medium: "optMedium", large: "optLarge" };
        widgetSizeText.setAttribute("data-i18n", sizeMap[widgetSize]);
        if (window.i18n) widgetSizeText.innerText = i18n.get(sizeMap[widgetSize]);
      }

      if (el("searchNewTab")) el("searchNewTab").checked = searchNewTab;
      if (el("showFileMgmtCheckbox")) el("showFileMgmtCheckbox").checked = showFileMgmt;
      if (el("showCurrentWeather"))
        el("showCurrentWeather").checked = showWeather;
      if (el("customSearchUrlInput"))
        el("customSearchUrlInput").value = "";

      const themeColor = localStorage.getItem("dj_theme_color") || "#eab308";
      const themeAdj = localStorage.getItem("dj_theme_adjustment") || "none";

      this.updateThemeAdjustmentUI(themeColor, themeAdj);
      this.updateLangUI();

      const imgEngine = localStorage.getItem("dj_image_engine") || "flickr";
      if (el("engineUnsplash"))
        el("engineUnsplash").checked = imgEngine === "unsplash";
      if (el("engineFlickr"))
        el("engineFlickr").checked = imgEngine === "flickr";

      this.updateSearchEngineTriggerUI();
      this.renderSearchEngineList();
      if (window.renderWeatherLocationList) renderWeatherLocationList();

      this.updateAIProviderTriggerUI();
      this.toggleAiSettings(localStorage.getItem("dj_ai_provider") === "none");
      
      const modelTriggerName = el("ai-model-trigger-name");
      if (modelTriggerName) {
          modelTriggerName.innerText = localStorage.getItem("dj_ai_model") || (window.i18n ? i18n.get("aiNoServer") : "접속 안됨");
      }

      if (el("aiOutputAtOnceCheck"))
        el("aiOutputAtOnceCheck").checked = aiOutputAtOnce;

      if (el("aiServerUrlInput"))
        el("aiServerUrlInput").value =
          localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434";
      this.onAIProviderChange();

      if (window.ai && typeof ai.updateStatusUI === "function")
        ai.updateStatusUI();

      utils.openModal("settingModal");
    } catch (e) {
      console.error("openModal error:", e);
      utils.openModal("settingModal");
    }
  },

  updateBgKeyword(value) {
    localStorage.setItem("dj_bg_keyword", value.trim());
    if (this.bgTimeout) clearTimeout(this.bgTimeout);
    this.bgTimeout = setTimeout(() => {
      utils.changeBackgroundInstant();
    }, 1000);
  },

  updateImageEngine(engine) {
    const unsplash = document.getElementById("engineUnsplash");
    const flickr = document.getElementById("engineFlickr");
    if (engine === "unsplash") {
      flickr.checked = false;
      unsplash.checked = true;
      localStorage.setItem("dj_image_engine", "unsplash");
    } else {
      unsplash.checked = false;
      flickr.checked = true;
      localStorage.setItem("dj_image_engine", "flickr");
    }
    utils.changeBackgroundInstant();
  },

  updateSearchNewTab(checked) {
    localStorage.setItem("dj_search_new_tab", checked ? "true" : "false");
  },

  updateSearchEngineTriggerUI() {
    const triggerFavicon = document.getElementById("trigger-favicon");
    const triggerName = document.getElementById("trigger-name");
    if (!triggerFavicon && !triggerName) return;

    const currentEngineId = localStorage.getItem("dj_search_engine") || "google";
    const defaultEngines = [
      { id: "google", name: "Google", domain: "google.com", isDefault: true },
      { id: "naver", name: "Naver", domain: "naver.com", isDefault: true }
    ];
    const customEngines = JSON.parse(localStorage.getItem("dj_search_engines_custom") || "[]");
    const allEngines = [...defaultEngines, ...customEngines];
    const engine = allEngines.find(e => e.id === currentEngineId) || defaultEngines[0];

    let faviconUrl = "";
    if (engine.isDefault) {
      faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${engine.domain}`;
    } else {
      try {
        const domain = new URL(engine.url).hostname;
        faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
      } catch (e) { faviconUrl = ""; }
    }

    if (triggerFavicon) {
      triggerFavicon.innerHTML = faviconUrl ? `<img src="${faviconUrl}" alt="icon">` : '<i class="fas fa-search"></i>';
    }
    if (triggerName) {
      triggerName.innerText = engine.name;
    }
  },

  closeAllPopups(exceptId = null) {
    const popups = document.querySelectorAll(
      ".ai-model-popup, .engine-popup, .weather-popup",
    );
    popups.forEach((p) => {
      if (p.id && p.id === exceptId) return;

      if (p.id === "search-engine-popup") this.closeSearchEnginePopup();
      else if (p.id === "engine-add-popup") this.closeEngineAddPopup();
      else if (p.id === "ai-provider-popup") this.closeAIPopup();
      else if (p.id === "ai-custom-add-container") this.closeCustomAIPopup();
      else if (p.id === "ai-model-select-popup") this.closeModelPopup();
      else if (p.id === "lang-popup") this.closeLangPopup();
      else if (p.id === "weather-location-popup") {
        if (window.weather) weather.closeLocationPopup();
      } else if (p.id === "city-add-popup") {
        if (window.weather) weather.closeCityAddPopup();
      } else {
        p.classList.remove("show");
        if (p.classList.contains("engine-popup")) {
           setTimeout(() => {
              if (!p.classList.contains("show")) p.style.display = "none";
           }, 200);
        }
      }
    });
  },

  renderSearchEngineList() {
    const popupEl = document.getElementById("search-engine-popup");
    if (!popupEl) return;
    popupEl.innerHTML = "";
    
    const listArea = document.createElement("div");
    listArea.className = "popup-list-area";
    listArea.style.maxHeight = "300px";
    listArea.style.overflowY = "auto";

    const currentEngine = localStorage.getItem("dj_search_engine") || "google";
    const customEngines = JSON.parse(localStorage.getItem("dj_search_engines_custom") || "[]");
    
    const defaultEngines = [
      { id: "google", name: "Google", domain: "google.com", isDefault: true },
      { id: "naver", name: "Naver", domain: "naver.com", isDefault: true }
    ];

    const allEngines = [...defaultEngines, ...customEngines];

    allEngines.forEach(engine => {
      const item = document.createElement("div");
      item.className = `engine-item ${engine.id === currentEngine ? "active" : ""}`;
      
      let faviconUrl = "";
      if (engine.isDefault) {
        faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${engine.domain}`;
      } else {
        try {
          const domain = new URL(engine.url).hostname;
          faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
        } catch(e) { faviconUrl = ""; }
      }

      item.onclick = (e) => {
          e.stopPropagation();
          this.updateSearchEngine(engine.id);
          this.closeSearchEnginePopup();
      };

      item.innerHTML = `
        <div class="engine-favicon">
          ${faviconUrl ? `<img src="${faviconUrl}" alt="icon">` : '<i class="fas fa-search"></i>'}
        </div>
        <div class="engine-name">${engine.name}</div>
        <div class="engine-status">
          ${engine.id === currentEngine ? '<i class="fas fa-check-circle engine-active-icon"></i>' : ''}
        </div>
        <div class="engine-actions">
          ${engine.isDefault ? '<span class="engine-info-tag">기본</span>' : `<i class="fas fa-trash-alt engine-btn-del" onclick="event.stopPropagation(); settings.deleteCustomSearchEngine('${engine.id}')"></i>`}
        </div>
      `;
      listArea.appendChild(item);
    });
    popupEl.appendChild(listArea);

    const footer = document.createElement("div");
    footer.style.borderTop = "1px solid rgba(255,255,255,0.1)";
    footer.style.paddingTop = "5px";
    footer.style.marginTop = "5px";
    
    const addBtn = document.createElement("div");
    addBtn.className = "engine-item";
    addBtn.style.justifyContent = "center";
    addBtn.innerHTML = '<i class="fas fa-square-plus" style="margin-right: 8px; color: var(--accent-color);"></i> 검색 엔진 추가';
    addBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleEngineAddPopup(e);
        this.closeSearchEnginePopup();
    };
    footer.appendChild(addBtn);
    popupEl.appendChild(footer);
  },

  toggleEngineAddPopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("engine-add-popup");
    if (!popup) return;
    
    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups("engine-add-popup");
        popup.style.display = "block";
        popup.offsetHeight;
        popup.classList.add("show");
        
        const nameInput = document.getElementById("customSearchNameInput");
        const urlInput = document.getElementById("customSearchUrlInput");
        if (nameInput) nameInput.value = "";
        if (urlInput) urlInput.value = "";
        if (nameInput) nameInput.focus();
    } else {
        this.closeEngineAddPopup();
    }
  },

  closeEngineAddPopup() {
    const popup = document.getElementById("engine-add-popup");
    if (popup) {
        popup.classList.remove("show");
        setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 300);
    }
  },

  toggleSearchEnginePopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("search-engine-popup");
    if (!popup) return;
    
    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups("search-engine-popup");
        this.renderSearchEngineList();
        popup.classList.add("show");
    } else {
        this.closeSearchEnginePopup();
    }
  },

  closeSearchEnginePopup() {
    const popup = document.getElementById("search-engine-popup");
    if (popup) popup.classList.remove("show");
  },

  addCustomSearchEngine() {
    const nameInput = document.getElementById("customSearchNameInput");
    const urlInput = document.getElementById("customSearchUrlInput");
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!name) {
        utils.showValidationTip("customSearchNameInput", "이름을 입력해 주세요.");
        return;
    }
    if (!url) {
        utils.showValidationTip("customSearchUrlInput", "URL을 입력해 주세요.");
        return;
    }

    try {
        const urlObj = new URL(url);
        
        // Normalize URL for comparison (remove www. and query value if present)
        const normalize = (u) => {
            try {
                const urlObj = new URL(u);
                const hostname = urlObj.hostname.replace(/^www\./, '');
                let result = `${urlObj.protocol}//${hostname}${urlObj.pathname}${urlObj.search}`;
                
                const parts = result.split(/[?&]/);
                if (parts.length > 1) {
                    const lastPart = parts[parts.length - 1];
                    if (lastPart.includes('=')) {
                        result = result.substring(0, result.lastIndexOf('=') + 1);
                    }
                }
                // Remove trailing slash if no query
                if (!urlObj.search && result.endsWith('/')) {
                    result = result.slice(0, -1);
                }
                return result;
            } catch(e) { return u; }
        };

        const normalizedUrl = normalize(url);
        const customEngines = JSON.parse(localStorage.getItem("dj_search_engines_custom") || "[]");
        
        const builtInEngines = ["https://www.google.com/search?q=", "https://search.naver.com/search.naver?query=", "https://chatgpt.com/?q="];
        
        const isDuplicate = customEngines.some(e => normalize(e.url) === normalizedUrl) || 
                          builtInEngines.some(e => normalize(e) === normalizedUrl);
        
        if (isDuplicate) {
            utils.showValidationTip("customSearchUrlInput", "이미 추가된 검색 엔진입니다.");
            return;
        }

        const newEngine = {
            id: `custom_${Date.now()}`,
            name: name,
            url: normalizedUrl, // Store the normalized version for better consistency
            domain: urlObj.hostname,
            isDefault: false
        };

        customEngines.push(newEngine);
        localStorage.setItem("dj_search_engines_custom", JSON.stringify(customEngines));
        nameInput.value = "";
        urlInput.value = "";
        this.closeEngineAddPopup();
        this.renderSearchEngineList();
        if (window.search && typeof search.renderMenu === "function") search.renderMenu();
    } catch (e) {
        utils.showValidationTip("customSearchUrlInput", "올바른 URL 형식이 아닙니다.");
    }
  },

  deleteCustomSearchEngine(id) {
    let customEngines = JSON.parse(localStorage.getItem("dj_search_engines_custom") || "[]");
    customEngines = customEngines.filter(e => e.id !== id);
    localStorage.setItem("dj_search_engines_custom", JSON.stringify(customEngines));
    if (localStorage.getItem("dj_search_engine") === id) this.updateSearchEngine("google");
    else this.renderSearchEngineList();
    if (window.search && typeof search.renderMenu === "function") search.renderMenu();
  },

  updateSearchEngine(engine) {
    localStorage.setItem("dj_search_engine", engine);
    if (window.search) {
        search.currentEngine = engine;
        search.updateIcon();
    }
    this.updateSearchEngineTriggerUI();
    this.renderSearchEngineList();
  },

  updateCustomSearchUrl(value) {
    localStorage.setItem("dj_custom_search_url", value.trim());
  },

  updateShowWeather(checked) {
    localStorage.setItem("dj_show_current_weather", checked ? "true" : "false");
    if (window.weather) {
      weather.showCurrent = checked;
      // Use setTimeout to ensure localStorage is settled before fetch
      setTimeout(() => weather.fetch(), 50);
    }
  },

  toggleFileMgmt(checked) {
    localStorage.setItem("dj_hide_fileMgmt", checked ? "false" : "true");
    if (window.ui) ui.applyVisibility();
  },

  updateAiOutputAtOnce(checked) {
    localStorage.setItem("dj_ai_output_at_once", checked);
    if (window.ai) ai.outputAtOnce = checked;
  },

  updateAiProvider(provider) {
    const oldProvider = localStorage.getItem("dj_ai_provider");
    const oldModel = localStorage.getItem("dj_ai_model");
    
    // Save current model for the old provider before switching
    if (oldProvider && oldProvider !== "none" && oldModel) {
        localStorage.setItem(`dj_ai_last_model_${oldProvider}`, oldModel);
    }

    localStorage.setItem("dj_ai_provider", provider);
    const isDisabled = provider === "none";
    localStorage.setItem("dj_ai_disabled", isDisabled);
    this.toggleAiSettings(isDisabled);
    this.updateAIProviderTriggerUI();
    
    // Restore the last used model for the new provider, or clear if none
    const restoredModel = localStorage.getItem(`dj_ai_last_model_${provider}`) || "";
    this.updateAiModel(restoredModel);
    
    this.onAIProviderChange();
    
    // AI 변경 시 즉시 상태 업데이트
    if (window.ai) {
        ai.isConnected = false;
        ai.updateModelSelectUI([]);
        ai.updateChatbotAvailability(false);
        ai.init(); // 대화 목록 및 상태 재초기화
        const icon = document.querySelector(".ai-search-icon");
        if (icon) {
            icon.classList.remove("active");
            icon.style.color = "#94a3b8";
        }
        // 공급자 변경 시 즉시 서버 연결 체크
        if (provider !== "none") {
            ai.checkConnection();
        }
    }
    },
  onAIProviderChange() {
    const provider = localStorage.getItem("dj_ai_provider") || "none";
    const urlInput = document.getElementById("aiServerUrlInput");
    const keyInput = document.getElementById("aiApiKeyInput");
    const keyLabel = document.getElementById("aiKeyLabel");
    const customAddArea = document.getElementById("ai-custom-add-container");

    if (urlInput && keyInput) {
      if (provider === "local") {
        urlInput.style.display = "block";
        keyInput.style.display = "none";
        if (keyLabel) keyLabel.innerText = "URL";
        urlInput.value = localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434";
      } else if (provider.startsWith("custom_")) {
        urlInput.style.display = "none";
        keyInput.style.display = "block";
        if (keyLabel) keyLabel.innerText = "Key";
        keyInput.value = localStorage.getItem(`dj_ai_api_key_${provider}`) || "";
      } else {
        urlInput.style.display = "none";
        keyInput.style.display = "block";
        if (keyLabel) keyLabel.innerText = "Key";
        keyInput.value = localStorage.getItem(`dj_ai_api_key_${provider}`) || localStorage.getItem("dj_ai_api_key") || "";
      }
    }
    
    if (customAddArea) {
        customAddArea.classList.remove("show"); // Hide by default
    }
  },

  toggleAIPopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("ai-provider-popup");
    if (!popup) return;

    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups("ai-provider-popup");
        this.renderAIList();
        
        // Scroll active item into view
        setTimeout(() => {
          const listContainer = popup.querySelector(".popup-list-area");
          if (listContainer) {
             const activeItem = listContainer.querySelector(".active");
             if (activeItem) {
                 activeItem.scrollIntoView({ block: "center", behavior: "smooth" });
             }
          }
        }, 10);
        popup.classList.add("show");
    } else {
        this.closeAIPopup();
    }
  },

  closeAIPopup() {
    const popup = document.getElementById("ai-provider-popup");
    if (popup) popup.classList.remove("show");
  },

  renderAIList() {
    const popupEl = document.getElementById("ai-provider-popup");
    if (!popupEl) return;
    popupEl.innerHTML = "";
    
    // Create list container and footer
    const listContainer = document.createElement("div");
    listContainer.className = "popup-list-area";
    listContainer.style.overflowY = "auto";
    listContainer.style.flex = "1";
    
    const footer = document.createElement("div");
    footer.className = "popup-footer-area";
    footer.style.borderTop = "1px solid rgba(255,255,255,0.1)";
    footer.style.paddingTop = "5px";
    footer.style.marginTop = "5px";

    const currentProvider = localStorage.getItem("dj_ai_provider") || "none";
    const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");

    const defaultAis = [
        { id: "none", name: "사용 안 함", icon: "fas fa-ban" },
        { id: "local", name: "로컬 AI", icon: "fas fa-desktop" },
        { id: "openai", name: "OpenAI", icon: "fas fa-circle-nodes" },
        { id: "gemini", name: "Gemini", icon: "fas fa-wand-magic-sparkles" }
    ];

    const allAis = [...defaultAis, ...customAis];

    allAis.forEach(aiItem => {
      const item = document.createElement("div");
      item.className = `engine-item ${aiItem.id === currentProvider ? "active" : ""}`;
      
      item.onclick = (e) => {
          e.stopPropagation();
          this.updateAiProvider(aiItem.id);
          this.closeAIPopup();
      };

      item.innerHTML = `
        <div class="engine-favicon">
          <i class="${aiItem.icon || 'fas fa-network-wired'}"></i>
        </div>
        <div class="engine-name">${aiItem.name}</div>
        <div class="engine-status">
          ${aiItem.id === currentProvider ? '<i class="fas fa-check-circle engine-active-icon"></i>' : ''}
        </div>
        <div class="engine-actions">
          ${aiItem.id === 'none' || aiItem.id === 'local' || aiItem.id === 'openai' || aiItem.id === 'gemini' 
            ? '<span class="engine-info-tag">기본</span>' 
            : `<i class="fas fa-trash-alt engine-btn-del" onclick="event.stopPropagation(); settings.deleteCustomAI('${aiItem.id}')"></i>`}
        </div>
      `;
      listContainer.appendChild(item);
    });

    // Add "+" button to footer
    const addBtn = document.createElement("div");
    addBtn.className = "engine-item";
    addBtn.style.justifyContent = "center";
    addBtn.innerHTML = '<i class="fas fa-square-plus" style="margin-right: 8px; color: var(--accent-color);"></i> 사용자 AI 추가';
    addBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleCustomAIPopup(e);
        this.closeAIPopup();
    };
    footer.appendChild(addBtn);
    
    popupEl.appendChild(listContainer);
    popupEl.appendChild(footer);
  },

  toggleModelSelectPopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("ai-model-select-popup");
    if (!popup) return;
    
    // 연결 안된 상태면 안뜸
    if (!window.ai || !ai.isConnected) return;

    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups("ai-model-select-popup");
        this.renderModelList();
        
        // Scroll active item into view
        setTimeout(() => {
          const activeItem = popup.querySelector(".active");
          if (activeItem) {
              activeItem.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }, 10);
        popup.classList.add("show");
    } else {
        this.closeModelPopup();
    }
  },

  closeModelPopup() {
    const popup = document.getElementById("ai-model-select-popup");
    if (popup) popup.classList.remove("show");
  },

  renderModelList() {
    const popupEl = document.getElementById("ai-model-select-popup");
    if (!popupEl) return;
    popupEl.innerHTML = "";

    const currentModel = localStorage.getItem("dj_ai_model") || "";
    const models = JSON.parse(localStorage.getItem("dj_ai_models_cache") || "[]");

    if (models.length === 0) {
        popupEl.innerHTML = '<div class="engine-item" style="justify-content: center; opacity: 0.5;">모델 없음</div>';
        return;
    }

    models.forEach(modelName => {
      const item = document.createElement("div");
      item.className = `engine-item ${modelName === currentModel ? "active" : ""}`;
      
      item.onclick = (e) => {
          e.stopPropagation();
          this.updateAiModel(modelName);
          this.closeModelPopup();
      };

      item.innerHTML = `
        <div class="engine-name" style="padding-left: 5px;">${modelName}</div>
        <div class="engine-status">
          ${modelName === currentModel ? '<i class="fas fa-check-circle engine-active-icon"></i>' : ''}
        </div>
      `;
      popupEl.appendChild(item);
    });
  },

  updateAiModel(value) {
    const oldModel = localStorage.getItem("dj_ai_model");
    localStorage.setItem("dj_ai_model", value);
    const triggerName = document.getElementById("ai-model-trigger-name");
    const trigger = document.getElementById("ai-model-trigger");
    if (triggerName) {
        triggerName.innerText = value || (window.i18n ? i18n.get("aiNoServer") : "접속 안됨");
    }
    if (trigger) {
        if (!value) trigger.classList.add("disabled");
        else trigger.classList.remove("disabled");
    }
    
    if (window.ai && oldModel !== value) {
        // 전역 설정 모델이 바뀌면, 현재 열린 대화창의 모델도 즉시 변경하고 시스템 메시지 표시
        ai.selectTemporaryModel(value);
    } else if (window.ai && typeof ai.updateModelDisplay === "function") {
        ai.updateModelDisplay();
    }
  },

  toggleCustomAIPopup(e) {
    if (e) e.stopPropagation();
    const container = document.getElementById("ai-custom-add-container");
    if (!container) return;
    
    const isShowing = container.classList.contains("show");
    
    if (!isShowing) {
        this.closeAllPopups("ai-custom-add-container");
        container.classList.add("show");
        
        // AI 이름 입력창에 포커스
        const nameInput = document.getElementById("customAiNameInput");
        if (nameInput) setTimeout(() => nameInput.focus(), 100);
    } else {
        this.closeCustomAIPopup();
    }
  },

  closeCustomAIPopup() {
    const container = document.getElementById("ai-custom-add-container");
    if (container) container.classList.remove("show");
  },

  updateAIProviderTriggerUI() {
    const triggerName = document.getElementById("ai-trigger-name");
    const triggerIcon = document.getElementById("ai-trigger-icon");
    const currentProvider = localStorage.getItem("dj_ai_provider") || "none";
    
    const defaults = {
        none: { name: "사용 안 함", icon: "fas fa-ban" },
        local: { name: "로컬 AI", icon: "fas fa-desktop" },
        openai: { name: "OpenAI", icon: "fas fa-circle-nodes" },
        gemini: { name: "Gemini", icon: "fas fa-wand-magic-sparkles" }
    };

    if (defaults[currentProvider]) {
        if (triggerName) triggerName.innerText = defaults[currentProvider].name;
        if (triggerIcon) triggerIcon.className = defaults[currentProvider].icon;
    } else {
        const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
        const current = customAis.find(a => a.id === currentProvider);
        if (triggerName) triggerName.innerText = current ? current.name : "사용 안 함";
        if (triggerIcon) triggerIcon.className = current ? (current.icon || "fas fa-network-wired") : "fas fa-ban";
    }
  },

  async addCustomAI() {
    const nameInput = document.getElementById("customAiNameInput");
    const urlInput = document.getElementById("customAiUrlInput");
    const addBtn = document.querySelector("#ai-custom-add-container .btn-save");
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
        utils.showValidationTip(name ? "customAiUrlInput" : "customAiNameInput", "이름과 주소를 모두 입력해 주세요.");
        return;
    }

    const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    
    // 중복 체크
    if (customAis.some(a => a.name === name)) {
        utils.showValidationTip("customAiNameInput", "이미 존재하는 이름입니다.");
        return;
    }
    
    // URL 형식 간단 확인
    try {
        new URL(url);
    } catch (e) {
        utils.showValidationTip("customAiUrlInput", "올바른 URL 형식이 아닙니다.");
        return;
    }

    // 접속 테스트 시도
    if (addBtn) {
        addBtn.classList.add("loading");
        const originalText = addBtn.innerHTML;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>확인 중...</span>';
    }

    try {
        // 임시로 해당 URL로 접속 테스트 (ai.js의 checkConnection 로직 활용)
        // 직접 fetch하여 /v1/models (OpenAI 호환) 또는 /api/tags (Ollama 호환) 확인
        let isReachable = false;
        let fetchUrl = url.endsWith("/") ? url.slice(0, -1) : url;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        
        try {
            // 1. OpenAI 호환성 체크 (/v1/models)
            const resOpenAI = await fetch(`${fetchUrl}/v1/models`, { 
                headers: { "Accept": "application/json" },
                signal: controller.signal 
            });
            if (resOpenAI.ok) {
                const contentType = resOpenAI.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await resOpenAI.json();
                    if (data && (Array.isArray(data.data) || Array.isArray(data.models))) {
                        isReachable = true;
                    }
                }
            }
        } catch (e) {
            // 에러 발생 시 다음 단계 시도
        }

        if (!isReachable) {
            try {
                // 2. Ollama 호환성 체크 (/api/tags)
                const resOllama = await fetch(`${fetchUrl}/api/tags`, { 
                    headers: { "Accept": "application/json" },
                    signal: controller.signal 
                });
                if (resOllama.ok) {
                    const contentType = resOllama.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const data = await resOllama.json();
                        if (data && Array.isArray(data.models)) {
                            isReachable = true;
                        }
                    }
                }
            } catch (e2) {}
        }
        clearTimeout(timeoutId);

        if (!isReachable) {
            utils.showValidationTip("customAiUrlInput", "AI 서버에 접속할 수 없습니다. 주소를 확인해 주세요.", "error");
            if (addBtn) {
                addBtn.classList.remove("loading");
                addBtn.innerHTML = '<span>추가</span>';
            }
            return;
        }

        const newAi = {
            id: `custom_${Date.now()}`,
            name: name,
            url: url,
            icon: "fas fa-network-wired",
            isDefault: false
        };

        customAis.push(newAi);
        localStorage.setItem("dj_ai_custom_providers", JSON.stringify(customAis));
        
        nameInput.value = "";
        urlInput.value = "";
        document.getElementById("ai-custom-add-container").classList.remove("show");
        
        this.updateAiProvider(newAi.id);
        
        if (addBtn) {
            addBtn.classList.remove("loading");
            addBtn.innerHTML = '<span>추가</span>';
        }
    } catch (err) {
        utils.showValidationTip("customAiUrlInput", "접속 확인 중 오류가 발생했습니다.");
        if (addBtn) {
            addBtn.classList.remove("loading");
            addBtn.innerHTML = '<span>추가</span>';
        }
    }
  },

  deleteCustomAI(id) {
    let customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    customAis = customAis.filter(a => a.id !== id);
    localStorage.setItem("dj_ai_custom_providers", JSON.stringify(customAis));
    
    if (localStorage.getItem("dj_ai_provider") === id) {
        this.updateAiProvider("none");
    }
    this.renderAIList();
  },


  updateAiServerUrl(value) {
    localStorage.setItem("dj_ai_server_url", value.trim());
    if (this._aiCheckTimeout) clearTimeout(this._aiCheckTimeout);
    this._aiCheckTimeout = setTimeout(() => {
        if (window.ai) ai.checkConnection();
    }, 1000);
  },

  updateAiApiKey(value) {
    const provider = localStorage.getItem("dj_ai_provider") || "none";
    if (provider !== "none" && provider !== "local") {
        localStorage.setItem(`dj_ai_api_key_${provider}`, value.trim());
    }
    if (this._aiCheckTimeout) clearTimeout(this._aiCheckTimeout);
    this._aiCheckTimeout = setTimeout(() => {
        if (window.ai) ai.checkConnection();
    }, 1000);
  },

  updateThemeAdjustment(type) {
    const lighter = document.getElementById("themeLighter");
    const darker = document.getElementById("themeDarker");
    const themeColor = localStorage.getItem("dj_theme_color") || "#3b82f6";

    if (type === "lighter") {
      localStorage.setItem("dj_theme_adjustment", "lighter");
    } else if (type === "darker") {
      localStorage.setItem("dj_theme_adjustment", "darker");
    } else {
      localStorage.setItem("dj_theme_adjustment", "none");
    }
    this.setTheme(themeColor, true);
  },

  updateThemeAdjustmentUI(color, adjustment) {
    const lighter = document.getElementById("themeLighter");
    const darker = document.getElementById("themeDarker");
    if (!lighter || !darker) return;
    const isWhite = color === "#fff" || color === "#ffffff",
      isBlack = color === "#000" || color === "#000000";
    lighter.disabled = isWhite;
    darker.disabled = isBlack;
    lighter.checked = adjustment === "lighter";
    darker.checked = adjustment === "darker";
    lighter.parentElement.style.opacity = isWhite ? "0.3" : "1";
    lighter.parentElement.style.pointerEvents = isWhite ? "none" : "auto";
    darker.parentElement.style.opacity = isBlack ? "0.3" : "1";
    darker.parentElement.style.pointerEvents = isBlack ? "none" : "auto";
  },

  toggleCustomSearchUrl() {
    const select = document.getElementById("searchEngineSelect"),
      input = document.getElementById("customSearchUrlInput");
    if (select && input)
      input.style.display = select.value === "custom" ? "block" : "none";
  },

  toggleAiSettings(isDisabled) {
    const panel = document.getElementById("aiSettingsPanel");
    if (panel) {
      panel.style.visibility = isDisabled ? "hidden" : "visible";
      panel.style.opacity = isDisabled ? "0" : "1";
      panel.style.pointerEvents = isDisabled ? "none" : "auto";
    }
  },

  setQuoteFontSize(size) {
    document.documentElement.style.setProperty(
      "--quote-font-size",
      `var(--quote-size-${size})`,
    );
    document.documentElement.style.setProperty(
      "--quote-author-font-size",
      `var(--quote-author-size-${size})`,
    );
    localStorage.setItem("dj_quote_font_size", size);
    
    // Update trigger text
    const textEl = document.getElementById("quote-size-text");
    if (textEl) {
        const sizeMap = { small: "optSmall", medium: "optMedium", large: "optLarge" };
        textEl.setAttribute("data-i18n", sizeMap[size]);
        if (window.i18n) textEl.innerText = i18n.get(sizeMap[size]);
    }
  },

  setWidgetSize(size) {
    document.documentElement.style.setProperty(
      "--widget-scale",
      `var(--widget-scale-${size})`,
    );
    localStorage.setItem("dj_widget_size", size);
    if (window.shortcutMod) shortcutMod.checkLayout();
    
    // Update trigger text
    const textEl = document.getElementById("widget-size-text");
    if (textEl) {
        const sizeMap = { small: "optSmall", medium: "optMedium", large: "optLarge" };
        textEl.setAttribute("data-i18n", sizeMap[size]);
        if (window.i18n) textEl.innerText = i18n.get(sizeMap[size]);
    }
  },

  toggleCustomSelect(popupId, event) {
    if (event) event.stopPropagation();
    const popup = document.getElementById(popupId);
    if (!popup) return;

    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups(popupId);
        this.renderCustomSelectOptions(popupId);
        popup.classList.add("show");
    } else {
        popup.classList.remove("show");
    }
  },

  renderCustomSelectOptions(popupId) {
    const popup = document.getElementById(popupId);
    if (!popup) return;

    const type = popupId.includes("quote") ? "quote" : "widget";
    const currentValue = localStorage.getItem(type === "quote" ? "dj_quote_font_size" : "dj_widget_size") || "medium";
    
    const options = [
      { value: "small", label: "optSmall" },
      { value: "medium", label: "optMedium" },
      { value: "large", label: "optLarge" }
    ];

    popup.innerHTML = "";
    options.forEach((opt) => {
      const item = document.createElement("div");
      item.className = `ai-model-item ${opt.value === currentValue ? "active" : ""}`;
      item.innerHTML = `<span data-i18n="${opt.label}">${window.i18n ? i18n.get(opt.label) : opt.value}</span>`;
      item.onclick = (e) => {
        e.stopPropagation();
        this.selectCustomOption(type, opt.value);
        popup.classList.remove("show");
      };
      popup.appendChild(item);
    });
  },

  selectCustomOption(type, value) {
    if (type === "quote") {
      this.setQuoteFontSize(value);
    } else {
      this.setWidgetSize(value);
    }
  },

  setTheme(color, keepAdj = true) {
    if (keepAdj === false) localStorage.setItem("dj_theme_adjustment", "none");
    const adj = localStorage.getItem("dj_theme_adjustment") || "none";
    
    // Helper to expand short hex #fff -> #ffffff
    const expandHex = (hex) => {
      if (hex.length === 4) {
        return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      return hex;
    };

    let finalColor = color;
    if (adj !== "none") {
      const isWhite = color === "#fff" || color === "#ffffff",
        isBlack = color === "#000" || color === "#000000";
      if (isWhite && adj === "darker") finalColor = "#cbd5e1";
      else if (isBlack && adj === "lighter") finalColor = "#0f172a";
      else finalColor = this.adjustColor(color, adj === "lighter" ? 35 : -35);
    }
    document.documentElement.style.setProperty("--accent-color", finalColor);
    localStorage.setItem("dj_theme_color", color);
    
    // Calculate contrast color based on brightness
    const getContrast = (hex) => {
      const expanded = expandHex(hex);
      const r = parseInt(expanded.slice(1, 3), 16);
      const g = parseInt(expanded.slice(3, 5), 16);
      const b = parseInt(expanded.slice(5, 7), 16);
      // Brightness formula (YIQ)
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#0f172a" : "#ffffff";
    };

    const contrast = getContrast(finalColor);
    document.documentElement.style.setProperty("--accent-contrast", contrast);
    this.updateThemeAdjustmentUI(color, adj);
  },

  adjustColor(hex, percent) {
    const expandHex = (h) => {
      if (h.length === 4) {
        return "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
      }
      return h;
    };
    const expanded = expandHex(hex);
    let r = parseInt(expanded.slice(1, 3), 16),
      g = parseInt(expanded.slice(3, 5), 16),
      b = parseInt(expanded.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r + (r * percent) / 100));
    g = Math.min(255, Math.max(0, g + (g * percent) / 100));
    b = Math.min(255, Math.max(0, b + (b * percent) / 100));
    return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
  },

  toggleLangPopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("lang-popup");
    const trigger = document.getElementById("lang-trigger");
    if (!popup || !trigger) return;

    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups("lang-popup");
        this.renderLangList();
        
        // Positioning Logic
        popup.style.display = "block";
        popup.style.visibility = "hidden";
        popup.style.width = trigger.offsetWidth + "px";
        
        // Ensure parent wrap has high z-index while popup is open
        const wrap = document.getElementById("lang-select-wrap");
        if (wrap) wrap.style.zIndex = "100";
        
        const rect = trigger.getBoundingClientRect();
        const modalContent = trigger.closest('.modal-content');
        const modalHeader = modalContent.querySelector('h3').getBoundingClientRect();
        
        // Set initial state
        popup.classList.add("show");
        
        // Wait for render
        setTimeout(() => {
            const popupRect = popup.getBoundingClientRect();
            const itemHeight = 40; // average item height with padding
            const minDownHeight = itemHeight * 3; // space for 3 items
            const spaceBelow = window.innerHeight - rect.bottom - 20;
            
            // Should we go up or down?
            // If space below is enough for 3 items, go down. Otherwise go up.
            if (spaceBelow >= minDownHeight) {
                // Down
                popup.style.top = "100%";
                popup.style.bottom = "auto";
                popup.style.marginTop = "5px";
                popup.style.marginBottom = "0";
            } else {
                // Up
                popup.style.top = "auto";
                popup.style.bottom = "100%";
                popup.style.marginTop = "0";
                popup.style.marginBottom = "5px";
            }
            
            // Limit top to not overlap header when opening upward
            const currentPopupRect = popup.getBoundingClientRect();
            if (currentPopupRect.top < modalHeader.bottom + 10) {
                const overlap = modalHeader.bottom + 10 - currentPopupRect.top;
                popup.style.maxHeight = Math.max(100, currentPopupRect.height - overlap) + "px";
            } else {
                popup.style.maxHeight = "280px";
            }
            
            popup.style.visibility = "visible";

            // Scroll active item into view
            const activeItem = popup.querySelector(".active");
            if (activeItem) {
                activeItem.scrollIntoView({ block: "center", behavior: "smooth" });
            }
        }, 10);
    } else {
        this.closeLangPopup();
    }
  },

  closeLangPopup() {
    const popup = document.getElementById("lang-popup");
    const wrap = document.getElementById("lang-select-wrap");
    if (popup) popup.classList.remove("show");
    if (wrap) wrap.style.zIndex = "";
  },

  renderLangList() {
    const popupEl = document.getElementById("lang-popup");
    if (!popupEl) return;
    popupEl.innerHTML = "";

    const currentLang = localStorage.getItem("dj_user_lang") || "auto";
    
    // Top 3 mandatory items
    const mandatory = [
        { id: "auto", label: "optAuto", icon: "fas fa-language" },
        { id: "ko", label: "optKo", icon: "fas fa-font" },
        { id: "en", label: "optEn", icon: "fas fa-italic" }
    ];

    mandatory.forEach(lang => {
      const item = this.createLangItem(lang, currentLang);
      popupEl.appendChild(item);
    });
  },

  createLangItem(lang, currentLang) {
    const item = document.createElement("div");
    item.className = `engine-item ${lang.id === currentLang ? "active" : ""}`;
    
    item.onclick = (e) => {
        e.stopPropagation();
        if (window.i18n) i18n.setLanguage(lang.id);
    };

    const label = window.i18n ? i18n.get(lang.label) : lang.id;
    item.innerHTML = `
      <div class="engine-favicon">
        <i class="${lang.icon}"></i>
      </div>
      <div class="engine-name">${label}</div>
      <div class="engine-status">
        ${lang.id === currentLang ? '<i class="fas fa-check-circle engine-active-icon"></i>' : ''}
      </div>
    `;
    return item;
  },

  updateLangUI() {
    const triggerText = document.getElementById("lang-trigger-text");
    if (triggerText) {
        const currentLang = localStorage.getItem("dj_user_lang") || "auto";
        const langMap = { auto: "optAuto", ko: "optKo", en: "optEn" };
        const labelKey = langMap[currentLang] || "optAuto";
        triggerText.setAttribute("data-i18n", labelKey);
        if (window.i18n) triggerText.innerText = i18n.get(labelKey);
    }
  },
};

// Global click listener to close all settings popups when clicking outside
document.addEventListener("click", (e) => {
    // If click is not inside a popup and not stopped by a trigger's stopPropagation,
    // it means it's an "outside" click.
    const activePopups = document.querySelectorAll(".ai-model-popup.show, .engine-popup.show, .weather-popup.show");
    if (activePopups.length > 0) {
        let clickedInsidePopup = false;
        activePopups.forEach(p => {
            if (p.contains(e.target)) clickedInsidePopup = true;
        });
        
        if (!clickedInsidePopup) {
            settings.closeAllPopups();
        }
    }
});

window.settings = settings;
window.openSettingModal = settings.openModal.bind(settings);
window.toggleCustomSearchUrl = settings.toggleCustomSearchUrl.bind(settings);
window.toggleAiSettings = settings.toggleAiSettings.bind(settings);
window.onAIProviderChange = settings.onAIProviderChange.bind(settings);
window.setTheme = settings.setTheme.bind(settings);
window.setQuoteFontSize = settings.setQuoteFontSize.bind(settings);
window.setWidgetSize = settings.setWidgetSize.bind(settings);
window.updateThemeAdjustment = settings.updateThemeAdjustment.bind(settings);
window.updateImageEngine = settings.updateImageEngine.bind(settings);
window.updateBgKeyword = settings.updateBgKeyword.bind(settings);
window.updateSearchNewTab = settings.updateSearchNewTab.bind(settings);
window.updateSearchEngine = settings.updateSearchEngine.bind(settings);
window.updateCustomSearchUrl = settings.updateCustomSearchUrl.bind(settings);
window.updateShowWeather = settings.updateShowWeather.bind(settings);
window.toggleFileMgmt = settings.toggleFileMgmt.bind(settings);
window.updateAiOutputAtOnce = settings.updateAiOutputAtOnce.bind(settings);
window.updateAiProvider = settings.updateAiProvider.bind(settings);
window.updateAiServerUrl = settings.updateAiServerUrl.bind(settings);
window.updateAiApiKey = settings.updateAiApiKey.bind(settings);
window.updateAiModel = settings.updateAiModel.bind(settings);
window.updateLangUI = settings.updateLangUI.bind(settings);
