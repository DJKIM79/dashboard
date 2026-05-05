const settings = {
  openModal() {
    try {
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
      if (el("engineNone"))
        el("engineNone").checked = imgEngine === "none";
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
          modelTriggerName.innerText = localStorage.getItem("dj_ai_model") || (window.i18n ? i18n.get("aiNoServer") : window.i18n ? i18n.get("aiNoServer") : "접속 안됨");
      }
      if (el("aiOutputAtOnceCheck"))
        el("aiOutputAtOnceCheck").checked = aiOutputAtOnce;
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
    const none = document.getElementById("engineNone");
    const unsplash = document.getElementById("engineUnsplash");
    const flickr = document.getElementById("engineFlickr");
    
    if (none) none.checked = engine === "none";
    if (unsplash) unsplash.checked = engine === "unsplash";
    if (flickr) flickr.checked = engine === "flickr";
    
    localStorage.setItem("dj_image_engine", engine);
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
      if (exceptId) {
          const exceptEl = document.getElementById(exceptId);
          if (exceptEl && p.contains(exceptEl)) return;
      }
      if (p.id === "search-engine-popup") this.closeSearchEnginePopup();
      else if (p.id === "engine-add-popup") this.closeEngineAddPopup();
      else if (p.id === "ai-provider-popup") this.closeAIPopup();
      else if (p.id === "ai-custom-add-container") this.closeCustomAIPopup();
      else if (p.id === "ai-model-select-popup") this.closeModelPopup();
      else if (p.id === "lang-popup") this.closeLangPopup();
      else if (p.id === "protocol-popup") {
        p.classList.remove("show");
        setTimeout(() => { if (!p.classList.contains("show")) p.style.display = "none"; }, 200);
      }
      else if (p.id === "weather-location-popup") {
        if (window.weather) weather.closeLocationPopup();
      } else if (p.id === "city-add-popup") {
        if (window.weather) weather.closeCityAddPopup();
      } else {
        p.classList.remove("show");
        if (p.classList.contains("engine-popup") || p.classList.contains("ai-model-popup") || p.classList.contains("weather-popup")) {
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
          ${engine.isDefault ? `<span class="engine-info-tag">${window.i18n ? i18n.get("lblDefault") : "기본"}</span>` : `<i class="fas fa-trash-alt engine-btn-del" onclick="event.stopPropagation(); settings.deleteCustomSearchEngine('${engine.id}')"></i>`}
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
    addBtn.innerHTML = `<i class="fas fa-square-plus" style="margin-right: 8px; color: var(--accent-color);"></i> ${window.i18n ? i18n.get("lblSearchEngineAdd") : "검색 엔진 추가"}`;
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
    if (popup) {
        popup.classList.remove("show");
        setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 200);
    }
  },
  addCustomSearchEngine() {
    const nameInput = document.getElementById("customSearchNameInput");
    const urlInput = document.getElementById("customSearchUrlInput");
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name) {
        utils.showValidationTip("customSearchNameInput", window.i18n ? i18n.get("msgInputName") : window.i18n ? i18n.get("msgInputName") : "이름을 입력해 주세요.");
        return;
    }
    if (!url) {
        utils.showValidationTip("customSearchUrlInput", window.i18n ? i18n.get("msgInputUrl") : window.i18n ? i18n.get("msgInputUrl") : "URL을 입력해 주세요.");
        return;
    }
    try {
        const urlObj = new URL(url);
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
            utils.showValidationTip("customSearchUrlInput", window.i18n ? i18n.get("msgEngineExists") : "이미 추가된 검색 엔진입니다.");
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
        utils.showValidationTip("customSearchUrlInput", window.i18n ? i18n.get("msgInvalidUrl") : "올바른 URL 형식이 아닙니다.");
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
    if (oldProvider && oldProvider !== "none" && oldModel) {
        localStorage.setItem(`dj_ai_last_model_${oldProvider}`, oldModel);
    }
    localStorage.setItem("dj_ai_provider", provider);
    const isDisabled = provider === "none";
    localStorage.setItem("dj_ai_disabled", isDisabled);
    this.toggleAiSettings(isDisabled);
    this.updateAIProviderTriggerUI();
    const restoredModel = localStorage.getItem(`dj_ai_last_model_${provider}`) || "";
    this.updateAiModel(restoredModel);
    this.onAIProviderChange();
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
        if (provider !== "none") {
            ai.checkConnection();
        }
    }
    },
  onAIProviderChange() {
    const provider = localStorage.getItem("dj_ai_provider") || "none";
    const keyInput = document.getElementById("aiApiKeyInput");
    const keyLabel = document.getElementById("aiKeyLabel");
    const customAddArea = document.getElementById("ai-custom-add-container");
    if (keyInput) {
      if (keyLabel) keyLabel.innerText = "Key";
      keyInput.value = localStorage.getItem(`dj_ai_api_key_${provider}`) || localStorage.getItem("dj_ai_api_key") || "";
    }
    if (customAddArea) {
        customAddArea.classList.remove("show"); // Hide by default
    }
    this.updateAIProviderTriggerUI();
  },
  toggleAIPopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("ai-provider-popup");
    if (!popup) return;
    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups("ai-provider-popup");
        this.renderAIList();
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
    if (popup) {
        popup.classList.remove("show");
        setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 200);
    }
  },
  renderAIList() {
    const popupEl = document.getElementById("ai-provider-popup");
    if (!popupEl) return;
    popupEl.innerHTML = "";
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
        { id: "none", name: window.i18n ? i18n.get("optNone") : "사용 안 함", icon: "fas fa-ban" },
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
          ${aiItem.id === 'none' || aiItem.id === 'openai' || aiItem.id === 'gemini' 
            ? `<span class="engine-info-tag">${window.i18n ? i18n.get("lblDefault") : "기본"}</span>` 
            : `<i class="fas fa-trash-alt engine-btn-del" onclick="event.stopPropagation(); settings.deleteCustomAI('${aiItem.id}')"></i>`}
        </div>
      `;
      listContainer.appendChild(item);
    });
    const addBtn = document.createElement("div");
    addBtn.className = "engine-item";
    addBtn.style.justifyContent = "center";
    addBtn.innerHTML = `<i class="fas fa-square-plus" style="margin-right: 8px; color: var(--accent-color);"></i> ${window.i18n ? i18n.get("lblCustomAiAdd") : "사용자 AI 추가"}`;
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
    if (!window.ai || !ai.isConnected) return;
    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups("ai-model-select-popup");
        this.renderModelList();
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
    if (popup) {
        popup.classList.remove("show");
        setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 200);
    }
  },
  renderModelList() {
    const popupEl = document.getElementById("ai-model-select-popup");
    if (!popupEl) return;
    popupEl.innerHTML = "";
    const currentModel = localStorage.getItem("dj_ai_model") || "";
    const models = JSON.parse(localStorage.getItem("dj_ai_models_cache") || "[]");
    if (models.length === 0) {
        popupEl.innerHTML = `<div class="engine-item" style="justify-content: center; opacity: 0.5;">${window.i18n ? i18n.get("msgAiNoModel") : "모델 없음"}</div>`;
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
        triggerName.innerText = value || (window.i18n ? i18n.get("aiNoServer") : window.i18n ? i18n.get("aiNoServer") : "접속 안됨");
    }
    if (trigger) {
        if (!value) trigger.classList.add("disabled");
        else trigger.classList.remove("disabled");
    }
    if (window.ai && oldModel !== value) {
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
        none: { name: window.i18n ? i18n.get("optNone") : "사용 안 함", icon: "fas fa-ban" },
        openai: { name: "OpenAI", icon: "fas fa-circle-nodes" },
        gemini: { name: "Gemini", icon: "fas fa-wand-magic-sparkles" }
    };
    if (defaults[currentProvider]) {
        if (triggerName) triggerName.innerText = defaults[currentProvider].name;
        if (triggerIcon) triggerIcon.className = defaults[currentProvider].icon;
    } else {
        const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
        const current = customAis.find(a => a.id === currentProvider);
        if (triggerName) triggerName.innerText = current ? current.name : window.i18n ? i18n.get("optNone") : "사용 안 함";
        if (triggerIcon) triggerIcon.className = current ? (current.icon || "fas fa-network-wired") : "fas fa-ban";
    }
  },
  toggleProtocolPopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("protocol-popup");
    if (!popup) return;
    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        this.closeAllPopups("protocol-popup");
        this.renderProtocolList();
        popup.style.display = "block";
        popup.classList.add("show");
    } else {
        popup.classList.remove("show");
        setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 200);
    }
  },
  renderProtocolList() {
    const popup = document.getElementById("protocol-popup");
    if (!popup) return;
    const protocols = [
        { id: "openai", name: window.i18n ? i18n.get("lblProtocolOpenAi") : "OpenAI 호환" },
        { id: "anthropic", name: window.i18n ? i18n.get("lblProtocolAnthropic") : "Anthropic" }
    ];
    const current = document.getElementById("customAiProtocol").value;
    popup.innerHTML = "";
    protocols.forEach(p => {
        const item = document.createElement("div");
        item.className = `ai-model-item ${p.id === current ? "active" : ""}`;
        item.innerHTML = `<span>${p.name}</span>`;
        item.onclick = (e) => {
            e.stopPropagation();
            document.getElementById("customAiProtocol").value = p.id;
            document.getElementById("protocol-trigger-text").innerText = p.name;
            popup.classList.remove("show");
            setTimeout(() => popup.style.display = "none", 200);
        };
        popup.appendChild(item);
    });
  },
  async addCustomAI(e) {
    if (e) e.stopPropagation();
    const addBtn = document.querySelector("#ai-custom-add-container .btn-save");
    if (addBtn && addBtn.classList.contains("loading")) return;
    const nameInput = document.getElementById("customAiNameInput");
    const urlInput = document.getElementById("customAiUrlInput");
    const keyInput = document.getElementById("customAiKeyInput");
    const protocolHidden = document.getElementById("customAiProtocol");
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const apiKey = keyInput ? keyInput.value.trim() : "";
    const protocol = protocolHidden ? protocolHidden.value : "openai";
    if (!name || !url) {
        utils.showValidationTip(name ? "customAiUrlInput" : "customAiNameInput", window.i18n ? i18n.get("msgInputNameUrl") : "이름과 주소를 모두 입력해 주세요.");
        return;
    }
    if (!url.match(/^https?:\/\//)) {
        url = url.replace(/^https?:\/?\/?/, "");
        url = "http://" + url;
        urlInput.value = url;
    }
    const customAis = JSON.parse(localStorage.getItem("dj_ai_custom_providers") || "[]");
    const defaultAis = [
        { id: "none", name: window.i18n ? i18n.get("optNone") : "사용 안 함" },
        { id: "openai", name: "OpenAI" },
        { id: "gemini", name: "Gemini" }
    ];
    const isDuplicate = defaultAis.some(a => a.name === name) || customAis.some(a => a.name === name);
    if (isDuplicate) {
        utils.showValidationTip("customAiNameInput", window.i18n ? i18n.get("msgNameExists") : "이미 존재하는 이름입니다.");
        nameInput.focus();
        return;
    }
    try {
        new URL(url);
    } catch (e) {
        utils.showValidationTip("customAiUrlInput", window.i18n ? i18n.get("msgInvalidUrl") : "올바른 URL 형식이 아닙니다.");
        return;
    }
    if (addBtn) {
        addBtn.classList.add("loading");
        addBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>${window.i18n ? i18n.get("msgChecking") : "확인 중..."}</span>`;
    }
    try {
        let isReachable = false;
        let reachError = window.i18n ? i18n.get("msgAiConnError") : "AI 서버에 접속할 수 없습니다. 주소와 프로토콜을 확인해 주세요.";
        let fetchUrl = url.endsWith("/") ? url.slice(0, -1) : url;
        if (protocol === "openai" && fetchUrl.endsWith("/v1")) {
            fetchUrl = fetchUrl.slice(0, -3);
        }
        const checkReachable = async (targetUrl) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            try {
                let fullPath = targetUrl;
                let testPath = "";
                if (protocol === "openai") {
                    testPath = "/v1/models";
                    fullPath = targetUrl + testPath;
                } else if (protocol === "ollama") {
                    testPath = "/api/tags";
                    fullPath = targetUrl + testPath;
                } else if (protocol === "anthropic") {
                    fullPath = targetUrl;
                } else if (protocol === "gemini") {
                    fullPath = targetUrl;
                }
                const headers = { "Accept": "application/json" };
                if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
                const res = await fetch(fullPath, { headers, signal: controller.signal });
                if (res.status === 401 || res.status === 403) {
                    return { ok: false, error: window.i18n ? i18n.get("msgAiKeyError") : "API Key가 올바르지 않거나 권한이 없습니다." };
                }
                const contentType = res.headers.get("content-type");
                const isJson = contentType && contentType.includes("application/json");
                if (protocol === "openai") {
                    if (res.ok && isJson) {
                        const data = await res.json();
                        if (data && data.data && Array.isArray(data.data)) return { ok: true };
                        return { ok: false, error: window.i18n ? i18n.get("msgAiOpenAiError") : "OpenAI 규격과 일치하지 않는 서버 응답입니다." };
                    }
                    if (res.status === 404 && isJson) {
                        return { ok: true };
                    }
                } else if (protocol === "ollama") {
                    if (res.ok && isJson) {
                        const data = await res.json();
                        if (data && data.models && Array.isArray(data.models)) return { ok: true };
                        return { ok: false, error: window.i18n ? i18n.get("msgAiOllamaError") : "Ollama 규격과 일치하지 않는 서버 응답입니다." };
                    }
                } else {
                    const isLocal = targetUrl.includes("127.0.0.1") || targetUrl.includes("localhost");
                    if (isLocal) {
                        return { ok: false, error: window.i18n ? i18n.get("msgAiLocalError") : "로컬 주소는 OpenAI 호환 또는 Ollama 프로토콜을 사용해야 합니다." };
                    }
                    if (res.ok) return { ok: true };
                }
                return { ok: false, error: `API 경로를 찾을 수 없거나 프로토콜이 맞지 않습니다. (Status: ${res.status})` };
            } catch (e) {
                return { ok: false, error: window.i18n ? i18n.get("msgAiConnError") : "서버에 접속할 수 없습니다. 주소와 포트, CORS 설정을 확인해 주세요." };
            } finally {
                clearTimeout(timeoutId);
            }
        };
        const result = await checkReachable(fetchUrl);
        isReachable = result.ok;
        reachError = result.error || reachError;
        if (!isReachable && url.startsWith("http://") && !urlInput.value.includes("://") && !reachError.includes("API Key")) {
            const httpsUrl = fetchUrl.replace("http://", "https://");
            const retryResult = await checkReachable(httpsUrl);
            if (retryResult.ok) {
                isReachable = true;
                fetchUrl = httpsUrl;
            }
        }
        if (!isReachable) {
            const tipId = reachError.includes("API Key") ? "customAiKeyInput" : "customAiUrlInput";
            utils.showValidationTip(tipId, reachError, "error");
            if (addBtn) {
                addBtn.classList.remove("loading");
                addBtn.innerHTML = `<span>${window.i18n ? i18n.get("btnCheckAdd") : "추가"}</span>`;
            }
            return; // 여기서 함수 실행 종료
        }
        const newAi = {
            id: `custom_${Date.now()}`,
            name: name,
            url: fetchUrl,
            protocol: protocol,
            icon: "fas fa-network-wired",
            isDefault: false
        };
        customAis.push(newAi);
        localStorage.setItem("dj_ai_custom_providers", JSON.stringify(customAis));
        if (apiKey) {
            localStorage.setItem(`dj_ai_api_key_${newAi.id}`, apiKey);
        }
        nameInput.value = "";
        urlInput.value = "";
        if (keyInput) keyInput.value = "";
        const container = document.getElementById("ai-custom-add-container");
        if (container) {
            container.classList.remove("show");
            setTimeout(() => {
                if (!container.classList.contains("show")) container.style.display = "none";
            }, 200);
        }
        this.updateAiProvider(newAi.id);
        if (addBtn) {
            addBtn.classList.remove("loading");
            addBtn.innerHTML = `<span>${window.i18n ? i18n.get("btnCheckAdd") : "추가"}</span>`;
        }
    } catch (err) {
        utils.showValidationTip("customAiUrlInput", window.i18n ? i18n.get("msgAiUnknownError") : "접속 확인 중 오류가 발생했습니다.");
        if (addBtn) {
            addBtn.classList.remove("loading");
            addBtn.innerHTML = `<span>${window.i18n ? i18n.get("btnCheckAdd") : "추가"}</span>`;
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
  updateAiApiKey(value) {
    const provider = localStorage.getItem("dj_ai_provider") || "none";
    if (provider !== "none") {
        const key = value.trim();
        if (key) {
            localStorage.setItem(`dj_ai_api_key_${provider}`, key);
        } else {
            localStorage.removeItem(`dj_ai_api_key_${provider}`);
        }
    }
    if (this._aiCheckTimeout) clearTimeout(this._aiCheckTimeout);
    this._aiCheckTimeout = setTimeout(() => {
        if (window.ai) ai.checkConnection();
    }, 1000);
  },
  updateThemeAdjustment(type) {
    const themeColor = localStorage.getItem("dj_theme_color") || "#3b82f6";
    const currentAdj = localStorage.getItem("dj_theme_adjustment") || "none";
    if (type === currentAdj) {
      localStorage.setItem("dj_theme_adjustment", "none");
    } else {
      localStorage.setItem("dj_theme_adjustment", type);
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
    const swatches = document.querySelectorAll(".color-swatch");
    const expandHex = (hex) => {
      if (hex.length === 4) {
        return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      return hex.toLowerCase();
    };
    const targetColor = expandHex(color);
    swatches.forEach((s) => {
      s.classList.remove("active");
      const onclickAttr = s.getAttribute("onclick") || "";
      if (onclickAttr.includes(`'${color}'`) || onclickAttr.includes(`"${color}"`)) {
        s.classList.add("active");
      }
    });
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
        popup.style.display = "block";
        popup.classList.add("show");
    } else {
        popup.classList.remove("show");
        setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 200);
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
        this.toggleCustomSelect(popupId, e);
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
    const getContrast = (hex) => {
      const expanded = expandHex(hex);
      const r = parseInt(expanded.slice(1, 3), 16);
      const g = parseInt(expanded.slice(3, 5), 16);
      const b = parseInt(expanded.slice(5, 7), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#0f172a" : "#ffffff";
    };
    const contrast = getContrast(finalColor);
    document.documentElement.style.setProperty("--accent-contrast", contrast);
    this.updateThemeAdjustmentUI(color, adj);

    const isBlackTheme = finalColor === "#000" || finalColor === "#000000";
    if (isBlackTheme) {
      document.body.classList.add("theme-black");
    } else {
      document.body.classList.remove("theme-black");
    }

    // If background engine is 'none', background color might need to update based on the new theme
    if (localStorage.getItem("dj_image_engine") === "none" && window.utils) {
      utils.changeBackgroundInstant();
    }
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
        popup.style.display = "block";
        popup.style.visibility = "hidden";
        const wrap = document.getElementById("lang-select-wrap");
        if (wrap) wrap.style.zIndex = "100";
        const rect = trigger.getBoundingClientRect();
        const modalContent = trigger.closest('.modal-content');
        const modalHeader = modalContent.querySelector('h3').getBoundingClientRect();
        popup.classList.add("show");
        setTimeout(() => {
            popup.style.top = "auto";
            popup.style.bottom = "100%";
            popup.style.marginTop = "0";
            popup.style.marginBottom = "5px";
            const triggerRect = trigger.getBoundingClientRect();
            const availableHeight = triggerRect.top - modalHeader.bottom - 15; // 5px margin-bottom + 10px spacing
            popup.style.maxHeight = Math.max(100, availableHeight) + "px";
            popup.style.visibility = "visible";
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
    if (popup) {
        popup.classList.remove("show");
        setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 200);
    }
    if (wrap) wrap.style.zIndex = "";
  },
  renderLangList() {
    const popupEl = document.getElementById("lang-popup");
    if (!popupEl) return;
    popupEl.innerHTML = "";
    const currentLang = localStorage.getItem("dj_user_lang") || "auto";
    const mandatory = [
        { id: "auto", label: "optAuto" },
        { id: "ko", label: "optKo" },
        { id: "en", label: "optEn" },
        { id: "ja", label: "optJa" },
        { id: "zh-CN", label: "optZhCn" },
        { id: "zh-TW", label: "optZhTw" },
        { id: "fr", label: "optFr" },
        { id: "de", label: "optDe" }
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
        this.closeLangPopup();
        if (window.i18n) i18n.setLanguage(lang.id);
    };
    const label = window.i18n ? i18n.get(lang.label) : lang.id;
    item.innerHTML = `
      <div class="engine-name" style="padding-left: 5px;">${label}</div>
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
        const langMap = { auto: "optAuto", ko: "optKo", en: "optEn", ja: "optJa", "zh-CN": "optZhCn", "zh-TW": "optZhTw", fr: "optFr", de: "optDe" };
        const labelKey = langMap[currentLang] || "optAuto";
        triggerText.setAttribute("data-i18n", labelKey);
        if (window.i18n) triggerText.innerText = i18n.get(labelKey);
    }
  },
};
document.addEventListener("click", (e) => {
    const activePopups = document.querySelectorAll(".ai-model-popup.show, .engine-popup.show, .weather-popup.show");
    if (activePopups.length > 0) {
        if (e.target.closest('[data-outside-ignore]')) return;
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
window.updateAiApiKey = settings.updateAiApiKey.bind(settings);
window.updateAiModel = settings.updateAiModel.bind(settings);
window.updateLangUI = settings.updateLangUI.bind(settings);
