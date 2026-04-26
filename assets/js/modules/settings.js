const settings = {
  openModal() {
    try {
      // Default values for initial load or missing data
      let bgKeyword = localStorage.getItem("dj_bg_keyword");
      if (bgKeyword === null) bgKeyword = "landscape";
      
      const quoteFontSize = localStorage.getItem("dj_quote_font_size") || "medium";
      const widgetSize = localStorage.getItem("dj_widget_size") || "medium";
      const searchNewTab = localStorage.getItem("dj_search_new_tab") !== "false"; // Default true
      const showWeather = localStorage.getItem("dj_show_current_weather") !== "false"; // Default true
      const engine = localStorage.getItem("dj_search_engine") || "google";
      const customUrl = localStorage.getItem("dj_custom_search_url") || "";

      const el = (id) => document.getElementById(id);

      if (el("bgKeywordInput")) el("bgKeywordInput").value = bgKeyword;
      if (el("quoteFontSizeSelect")) el("quoteFontSizeSelect").value = quoteFontSize;
      if (el("widgetSizeSelect")) el("widgetSizeSelect").value = widgetSize;
      if (el("searchNewTab")) el("searchNewTab").checked = searchNewTab;
      if (el("showCurrentWeather")) el("showCurrentWeather").checked = showWeather;
      if (el("searchEngineSelect")) el("searchEngineSelect").value = engine;
      if (el("customSearchUrlInput")) el("customSearchUrlInput").value = customUrl;

      // Theme adjustment checkboxes
      const themeAdj = localStorage.getItem("dj_theme_adjustment") || "none";
      if (el("themeLighter")) el("themeLighter").checked = (themeAdj === "lighter");
      if (el("themeDarker")) el("themeDarker").checked = (themeAdj === "darker");

      // Image engine checkboxes
      const imgEngine = localStorage.getItem("dj_image_engine") || "unsplash";
      if (el("engineUnsplash")) el("engineUnsplash").checked = (imgEngine === "unsplash");
      if (el("engineFlickr")) el("engineFlickr").checked = (imgEngine === "flickr");

      this.toggleCustomSearchUrl();
      if (window.renderWeatherLocationList) renderWeatherLocationList();

      // AI 설정 초기화
      const aiProvider = localStorage.getItem("dj_ai_provider") || "none";
      if (el("aiProviderSelect")) {
        el("aiProviderSelect").value = aiProvider;
        this.toggleAiSettings(aiProvider === "none");
      }

      const aiOutputAtOnce = localStorage.getItem("dj_ai_output_at_once") !== "false"; // Default true
      if (el("aiOutputAtOnceCheck")) el("aiOutputAtOnceCheck").checked = aiOutputAtOnce;

      if (el("aiServerUrlInput")) el("aiServerUrlInput").value = localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434";
      if (el("aiApiKeyInput")) el("aiApiKeyInput").value = localStorage.getItem("dj_ai_api_key") || "";
      this.onAIProviderChange();

      // 도시 검색 입력창 및 결과 초기화
      const cityInput = el("citySearchInput");
      if (cityInput) cityInput.value = "";
      const cityResults = el("citySearchResults");
      if (cityResults) {
        cityResults.innerHTML = "";
        cityResults.style.display = "none";
      }

      // Reset AI connection status and icon color
      const statusSpan = document.getElementById("ai-connection-status");
      if (statusSpan) statusSpan.style.display = "none";
      const refreshIcon = document.querySelector(".ai-refresh-icon");
      if (refreshIcon) refreshIcon.style.color = "#94a3b8";

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
    
    if (engine === 'unsplash') {
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

  updateSearchEngine(engine) {
    localStorage.setItem("dj_search_engine", engine);
    if (window.search) window.search.currentEngine = engine;
    this.toggleCustomSearchUrl();
    if (window.updateSearchEngineIcon) updateSearchEngineIcon();
  },

  updateCustomSearchUrl(url) {
    localStorage.setItem("dj_custom_search_url", url.trim());
    if (window.updateSearchEngineIcon) updateSearchEngineIcon();
  },

  updateShowWeather(show) {
    localStorage.setItem("dj_show_current_weather", show);
    if (window.weather) {
      window.weather.showCurrent = show;
      window.weather.fetch();
    }
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
    if (window.ai) {
      ai.provider = provider;
      // Reset connection and deactivate immediately
      ai.isConnected = false;
      if (typeof ai.updateChatbotAvailability === "function") {
        ai.updateChatbotAvailability(false);
      }
      
      const modelSelect = document.getElementById("aiModelSelect");
      if (modelSelect) {
        modelSelect.disabled = true;
        const msg = window.i18n ? window.i18n.get("aiNeedCheck") : "서버 확인 필요";
        modelSelect.innerHTML = `<option value="">${msg}</option>`;
      }
      // Reset icon color
      const refreshIcon = document.querySelector(".ai-refresh-icon");
      if (refreshIcon) refreshIcon.style.color = "#94a3b8";
    }
    if (window.ui) ui.applyVisibility();
  },

  updateAiServerUrl(url) {
    localStorage.setItem("dj_ai_server_url", url.trim());
    if (window.ai) {
      ai.serverUrl = url.trim();
      // Removed automatic ai.checkConnection()
    }
  },

  updateAiApiKey(key) {
    localStorage.setItem("dj_ai_api_key", key.trim());
    if (window.ai) {
      ai.apiKey = key.trim();
      // Removed automatic ai.checkConnection()
    }
  },

  updateAiModel(model) {
    localStorage.setItem("dj_ai_model", model);
    if (window.ai) {
      ai.model = model;
      ai.isConnected = false;
      if (typeof ai.updateChatbotAvailability === "function") {
        ai.updateChatbotAvailability(false);
      }
      ai.updateModelDisplay();
      ai.renderWelcome();
      if (window.ui) ui.applyVisibility();
    }
  },

  updateThemeAdjustment(type) {
    const lighter = document.getElementById("themeLighter");
    const darker = document.getElementById("themeDarker");
    
    if (type === 'lighter' && lighter.checked) {
      darker.checked = false;
      localStorage.setItem("dj_theme_adjustment", "lighter");
    } else if (type === 'darker' && darker.checked) {
      lighter.checked = false;
      localStorage.setItem("dj_theme_adjustment", "darker");
    } else {
      localStorage.setItem("dj_theme_adjustment", "none");
    }
    
    // Re-apply current theme color with new adjustment
    const currentColor = localStorage.getItem("dj_theme_color") || "#3b82f6";
    this.setTheme(currentColor);
  },

  toggleCustomSearchUrl() {
    const select = document.getElementById("searchEngineSelect");
    const input = document.getElementById("customSearchUrlInput");
    if (select && input) {
      const isCustom = select.value === "custom";
      input.style.display = isCustom ? "block" : "none";
    }
  },

  toggleAiSettings(isDisabled) {
    const panel = document.getElementById("aiSettingsPanel");
    if (panel) {
      if (isDisabled) {
        panel.style.opacity = "0.4";
        panel.style.pointerEvents = "none";
      } else {
        panel.style.opacity = "1";
        panel.style.pointerEvents = "auto";
      }
    }
  },

  onAIProviderChange() {
    const providerEl = document.getElementById("aiProviderSelect");
    if (!providerEl) return;
    
    const provider = providerEl.value;
    const urlInput = document.getElementById("aiServerUrlInput");
    const keyInput = document.getElementById("aiApiKeyInput");
    const keyLabel = document.getElementById("aiKeyLabel");
    
    if (urlInput && keyInput) {
      if (provider === "local") {
        urlInput.style.display = "block";
        keyInput.style.display = "none";
        if (keyLabel) keyLabel.innerText = window.i18n ? window.i18n.get("lblAIUrl") || "주소" : "주소";
      } else {
        urlInput.style.display = "none";
        keyInput.style.display = "block";
        if (keyLabel) keyLabel.innerText = "Key";
      }
    }
  },

  setQuoteFontSize(size) {
    const authorEl = document.getElementById("quote-author");
    const sizes = {
      large: "24px",
      medium: "16px",
      small: "13px"
    };
    
    document.documentElement.style.setProperty("--quote-font-size", `var(--quote-size-${size})`);
    if (authorEl) {
      authorEl.style.fontSize = sizes[size];
      authorEl.style.lineHeight = "1.5";
    }
    localStorage.setItem("dj_quote_font_size", size);
  },

  setWidgetSize(size) {
    document.documentElement.style.setProperty("--widget-scale", `var(--widget-scale-${size})`);
    localStorage.setItem("dj_widget_size", size);
  },

  setTheme(color) {
    const adj = localStorage.getItem("dj_theme_adjustment") || "none";
    let finalColor = color;
    
    if (adj !== "none") {
      finalColor = this.adjustColor(color, adj === "lighter" ? 20 : -20);
    }

    document.documentElement.style.setProperty("--accent-color", finalColor);
    localStorage.setItem("dj_theme_color", color); // Store original base color
    
    const contrast = (finalColor === "#000" || finalColor === "#000000" || finalColor === "#fff" || finalColor === "#ffffff") 
      ? (finalColor.startsWith("#f") ? "#0f172a" : "#fff") 
      : "#0f172a";
      
    document.documentElement.style.setProperty("--accent-contrast", contrast);
  },

  adjustColor(hex, percent) {
    // Basic hex color adjustment
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.min(255, Math.max(0, r + (r * percent / 100)));
    g = Math.min(255, Math.max(0, g + (g * percent / 100)));
    b = Math.min(255, Math.max(0, b + (b * percent / 100)));

    const rr = Math.round(r).toString(16).padStart(2, '0');
    const gg = Math.round(g).toString(16).padStart(2, '0');
    const bb = Math.round(b).toString(16).padStart(2, '0');

    return `#${rr}${gg}${bb}`;
  }
};

window.settings = settings;
window.openSettingModal = () => settings.openModal();
window.toggleCustomSearchUrl = () => settings.toggleCustomSearchUrl();
window.toggleAiSettings = (isDisabled) => settings.toggleAiSettings(isDisabled);
window.onAIProviderChange = () => settings.onAIProviderChange();
window.setTheme = (color) => settings.setTheme(color);
window.setQuoteFontSize = (size) => settings.setQuoteFontSize(size);
window.setWidgetSize = (size) => settings.setWidgetSize(size);
window.updateThemeAdjustment = (type) => settings.updateThemeAdjustment(type);
window.updateImageEngine = (engine) => settings.updateImageEngine(engine);

// Individual update wrappers
window.updateBgKeyword = (val) => settings.updateBgKeyword(val);
window.updateSearchNewTab = (checked) => settings.updateSearchNewTab(checked);
window.updateSearchEngine = (val) => settings.updateSearchEngine(val);
window.updateCustomSearchUrl = (val) => settings.updateCustomSearchUrl(val);
window.updateShowWeather = (show) => settings.updateShowWeather(show);
window.updateAiOutputAtOnce = (checked) => settings.updateAiOutputAtOnce(checked);
window.updateAiProvider = (val) => settings.updateAiProvider(val);
window.updateAiServerUrl = (val) => settings.updateAiServerUrl(val);
window.updateAiApiKey = (val) => settings.updateAiApiKey(val);
window.updateAiModel = (val) => settings.updateAiModel(val);
