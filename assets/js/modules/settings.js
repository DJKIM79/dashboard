const settings = {
  openModal() {
    const bgKeyword = localStorage.getItem("dj_bg_keyword") || "";
    const quoteFontSize = localStorage.getItem("dj_quote_font_size") || "medium";
    const widgetSize = localStorage.getItem("dj_widget_size") || "medium";
    const searchNewTab = localStorage.getItem("dj_search_new_tab") === "true";
    const showWeather = localStorage.getItem("dj_show_current_weather") !== "false";
    const engine = localStorage.getItem("dj_search_engine") || "google";
    const customUrl = localStorage.getItem("dj_custom_search_url") || "";

    document.getElementById("bgKeywordInput").value = bgKeyword;
    document.getElementById("quoteFontSizeSelect").value = quoteFontSize;
    document.getElementById("widgetSizeSelect").value = widgetSize;
    document.getElementById("searchNewTab").checked = searchNewTab;
    document.getElementById("showCurrentWeather").checked = showWeather;
    document.getElementById("searchEngineSelect").value = engine;
    document.getElementById("customSearchUrlInput").value = customUrl;

    this.toggleCustomSearchUrl();
    if (window.renderWeatherLocationList) renderWeatherLocationList();

    // AI 설정 초기화
    const aiDisabled = localStorage.getItem("dj_ai_disabled") === "true";
    document.getElementById("aiDisableCheck").checked = aiDisabled;
    this.toggleAiSettings(aiDisabled);

    const aiProvider = localStorage.getItem("dj_ai_provider") || "local";
    document.getElementById("aiProviderSelect").value = aiProvider;
    document.getElementById("aiServerUrlInput").value = localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434";
    document.getElementById("aiApiKeyInput").value = localStorage.getItem("dj_ai_api_key") || "";
    this.onAIProviderChange();

    // 도시 검색 입력창 및 결과 초기화
    const cityInput = document.getElementById("citySearchInput");
    if (cityInput) cityInput.value = "";
    const cityResults = document.getElementById("citySearchResults");
    if (cityResults) {
      cityResults.innerHTML = "";
      cityResults.style.display = "none";
    }

    utils.openModal("settingModal");
  },

  updateBgKeyword(value) {
    localStorage.setItem("dj_bg_keyword", value.trim());
    if (this.bgTimeout) clearTimeout(this.bgTimeout);
    this.bgTimeout = setTimeout(() => {
      utils.changeBackgroundInstant();
    }, 1000);
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

  updateAiDisabled(disabled) {
    localStorage.setItem("dj_ai_disabled", disabled);
    this.toggleAiSettings(disabled);
    if (window.ui) ui.applyVisibility();
  },

  updateAiProvider(provider) {
    localStorage.setItem("dj_ai_provider", provider);
    this.onAIProviderChange();
    if (window.ai) {
      ai.provider = provider;
      ai.checkConnection();
    }
  },

  updateAiServerUrl(url) {
    localStorage.setItem("dj_ai_server_url", url.trim());
    if (window.ai) {
      ai.serverUrl = url.trim();
      ai.checkConnection();
    }
  },

  updateAiApiKey(key) {
    localStorage.setItem("dj_ai_api_key", key.trim());
    if (window.ai) {
      ai.apiKey = key.trim();
      ai.checkConnection();
    }
  },

  updateAiModel(model) {
    localStorage.setItem("dj_ai_model", model);
    if (window.ai) {
      ai.model = model;
      ai.updateModelDisplay();
      ai.renderWelcome();
      if (window.ui) ui.applyVisibility();
    }
  },

  toggleCustomSearchUrl() {
    const isCustom = document.getElementById("searchEngineSelect").value === "custom";
    document.getElementById("customSearchUrlInput").style.display = isCustom ? "block" : "none";
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
    const provider = document.getElementById("aiProviderSelect").value;
    const urlInput = document.getElementById("aiServerUrlInput");
    const keyInput = document.getElementById("aiApiKeyInput");
    const keyLabel = document.getElementById("aiKeyLabel");
    
    if (provider === "local") {
      urlInput.style.display = "block";
      keyInput.style.display = "none";
      if (keyLabel) keyLabel.innerText = window.i18n ? window.i18n.get("lblAIUrl") || "주소" : "주소";
    } else {
      urlInput.style.display = "none";
      keyInput.style.display = "block";
      if (keyLabel) keyLabel.innerText = "Key";
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
    document.documentElement.style.setProperty("--accent-color", color);
    localStorage.setItem("dj_theme_color", color);
    const contrast = (color === "#000" || color === "#000000") ? "#fff" : "#0f172a";
    document.documentElement.style.setProperty("--accent-contrast", contrast);
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

// Individual update wrappers
window.updateBgKeyword = (val) => settings.updateBgKeyword(val);
window.updateSearchNewTab = (checked) => settings.updateSearchNewTab(checked);
window.updateSearchEngine = (val) => settings.updateSearchEngine(val);
window.updateCustomSearchUrl = (val) => settings.updateCustomSearchUrl(val);
window.updateShowWeather = (show) => settings.updateShowWeather(show);
window.updateAiDisabled = (disabled) => settings.updateAiDisabled(disabled);
window.updateAiProvider = (val) => settings.updateAiProvider(val);
window.updateAiServerUrl = (val) => settings.updateAiServerUrl(val);
window.updateAiApiKey = (val) => settings.updateAiApiKey(val);
window.updateAiModel = (val) => settings.updateAiModel(val);
