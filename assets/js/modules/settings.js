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
        localStorage.getItem("dj_search_new_tab") !== "false";
      const showFileMgmt =
        localStorage.getItem("dj_hide_fileMgmt") !== "true";
      const showWeather =
        localStorage.getItem("dj_show_current_weather") === "true";

      const el = (id) => document.getElementById(id);

      if (el("bgKeywordInput")) el("bgKeywordInput").value = bgKeyword;
      if (el("quoteFontSizeSelect"))
        el("quoteFontSizeSelect").value = quoteFontSize;
      if (el("widgetSizeSelect")) el("widgetSizeSelect").value = widgetSize;
      if (el("searchNewTab")) el("searchNewTab").checked = searchNewTab;
      if (el("showFileMgmtCheckbox")) el("showFileMgmtCheckbox").checked = showFileMgmt;
      if (el("showCurrentWeather"))
        el("showCurrentWeather").checked = showWeather;
      if (el("customSearchUrlInput"))
        el("customSearchUrlInput").value = "";

      const themeColor = localStorage.getItem("dj_theme_color") || "#eab308";
      const themeAdj = localStorage.getItem("dj_theme_adjustment") || "none";

      this.updateThemeAdjustmentUI(themeColor, themeAdj);

      const imgEngine = localStorage.getItem("dj_image_engine") || "flickr";
      if (el("engineUnsplash"))
        el("engineUnsplash").checked = imgEngine === "unsplash";
      if (el("engineFlickr"))
        el("engineFlickr").checked = imgEngine === "flickr";

      this.renderSearchEngineList();
      if (window.renderWeatherLocationList) renderWeatherLocationList();

      const aiProvider = localStorage.getItem("dj_ai_provider") || "none";
      if (el("aiProviderSelect")) {
        el("aiProviderSelect").value = aiProvider;
        this.toggleAiSettings(aiProvider === "none");
      }

      const aiOutputAtOnce =
        localStorage.getItem("dj_ai_output_at_once") !== "false";
      if (el("aiOutputAtOnceCheck"))
        el("aiOutputAtOnceCheck").checked = aiOutputAtOnce;

      if (el("aiServerUrlInput"))
        el("aiServerUrlInput").value =
          localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434";
      if (el("aiApiKeyInput"))
        el("aiApiKeyInput").value = localStorage.getItem("dj_ai_api_key") || "";
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
    localStorage.setItem("dj_search_new_tab", checked);
  },

  renderSearchEngineList() {
    const popupEl = document.getElementById("search-engine-popup");
    const triggerFavicon = document.getElementById("trigger-favicon");
    const triggerName = document.getElementById("trigger-name");
    if (!popupEl) return;
    popupEl.innerHTML = "";

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

      // Update Trigger UI
      if (engine.id === currentEngine) {
        if (triggerFavicon) triggerFavicon.innerHTML = faviconUrl ? `<img src="${faviconUrl}" alt="icon">` : '<i class="fas fa-search"></i>';
        if (triggerName) triggerName.innerText = engine.name;
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
          ${engine.id === currentEngine ? '<i class="fas fa-check-circle engine-active-icon"></i>' : (engine.isDefault ? '<span class="engine-info-tag">기본</span>' : '')}
        </div>
        <div class="engine-actions">
          ${!engine.isDefault ? `<i class="fas fa-trash-alt engine-btn-del" onclick="event.stopPropagation(); settings.deleteCustomSearchEngine('${engine.id}')"></i>` : ''}
        </div>
      `;
      popupEl.appendChild(item);
    });
  },

  toggleSearchEnginePopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("search-engine-popup");
    if (!popup) return;
    
    const isShowing = popup.classList.contains("show");
    
    if (!isShowing) {
        popup.style.display = "block";
        popup.offsetHeight; // Reflow
        popup.classList.add("show");
        
        if (this._seCloseListener) window.removeEventListener("click", this._seCloseListener);
        this._seCloseListener = (evt) => {
            if (!popup.contains(evt.target)) this.closeSearchEnginePopup();
        };
        setTimeout(() => window.addEventListener("click", this._seCloseListener), 1);
    } else {
        this.closeSearchEnginePopup();
    }
  },

  closeSearchEnginePopup() {
    const popup = document.getElementById("search-engine-popup");
    if (!popup || !popup.classList.contains("show")) return;
    popup.classList.remove("show");
    if (this._seCloseListener) {
        window.removeEventListener("click", this._seCloseListener);
        this._seCloseListener = null;
    }
    setTimeout(() => {
        if (!popup.classList.contains("show")) popup.style.display = "none";
    }, 200);
  },

  addCustomSearchEngine() {
    const input = document.getElementById("customSearchUrlInput");
    const url = input.value.trim();
    if (!url) {
        utils.showValidationTip("customSearchUrlInput", "URL을 입력해 주세요.");
        return;
    }

    try {
        const urlObj = new URL(url);
        const customEngines = JSON.parse(localStorage.getItem("dj_search_engines_custom") || "[]");
        
        const isDuplicate = customEngines.some(e => e.url === url) || 
                          ["https://www.google.com/search?q=", "https://search.naver.com/search.naver?query=", "https://chatgpt.com/?q="].includes(url);
        
        if (isDuplicate) {
            utils.showValidationTip("customSearchUrlInput", "이미 추가된 검색 엔진입니다.");
            return;
        }

        const newEngine = {
            id: `custom_${Date.now()}`,
            name: urlObj.hostname.replace("www.", ""),
            url: url,
            domain: urlObj.hostname,
            isDefault: false
        };

        customEngines.push(newEngine);
        localStorage.setItem("dj_search_engines_custom", JSON.stringify(customEngines));
        input.value = "";
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
    this.renderSearchEngineList();
  },

  updateCustomSearchUrl(value) {
    localStorage.setItem("dj_custom_search_url", value.trim());
  },

  updateShowWeather(checked) {
    localStorage.setItem("dj_show_current_weather", checked ? "true" : "false");
    if (window.weather) {
      window.weather.showCurrent = checked;
      window.weather.fetch();
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
    localStorage.setItem("dj_ai_provider", provider);
    const isDisabled = provider === "none";
    localStorage.setItem("dj_ai_disabled", isDisabled);
    this.toggleAiSettings(isDisabled);
    this.onAIProviderChange();
  },

  onAIProviderChange() {
    const provider = localStorage.getItem("dj_ai_provider") || "none";
    const modelSelect = document.getElementById("aiModelSelect");
    const urlInput = document.getElementById("aiServerUrlInput");
    const keyInput = document.getElementById("aiApiKeyInput");
    const keyLabel = document.getElementById("aiKeyLabel");

    if (urlInput && keyInput) {
      if (provider === "local") {
        urlInput.style.display = "block";
        keyInput.style.display = "none";
        if (keyLabel) keyLabel.innerText = "URL";
      } else {
        urlInput.style.display = "none";
        keyInput.style.display = "block";
        if (keyLabel) keyLabel.innerText = "Key";
      }
    }

    if (!modelSelect) return;

    modelSelect.innerHTML = "";
    let models = [];
    if (provider === "ollama") {
      models = ["llama3", "mistral", "gemma"];
    } else if (provider === "openai") {
      models = ["gpt-3.5-turbo", "gpt-4"];
    } else if (provider === "gemini") {
      models = ["gemini-pro"];
    }

    if (models.length > 0) {
        models.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.innerText = m;
            modelSelect.appendChild(opt);
        });
        const savedModel = localStorage.getItem("dj_ai_model");
        if (savedModel && models.includes(savedModel)) {
            modelSelect.value = savedModel;
        } else {
            localStorage.setItem("dj_ai_model", models[0]);
        }
        modelSelect.disabled = false;
    } else {
        const opt = document.createElement("option");
        opt.value = "";
        opt.innerText = "접속 안됨";
        modelSelect.appendChild(opt);
        modelSelect.disabled = true;
    }
  },

  updateAiServerUrl(value) {
    localStorage.setItem("dj_ai_server_url", value.trim());
  },

  updateAiApiKey(value) {
    localStorage.setItem("dj_ai_api_key", value.trim());
  },

  updateAiModel(value) {
    localStorage.setItem("dj_ai_model", value);
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
      panel.style.display = isDisabled ? "none" : "flex";
      panel.style.opacity = isDisabled ? "0.4" : "1";
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
  },

  setWidgetSize(size) {
    document.documentElement.style.setProperty(
      "--widget-scale",
      `var(--widget-scale-${size})`,
    );
    localStorage.setItem("dj_widget_size", size);
    if (window.shortcutMod) shortcutMod.checkLayout();
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
};

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
