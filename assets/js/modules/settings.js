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

  save() {
    const keyword = document.getElementById("bgKeywordInput").value.trim();
    localStorage.setItem("dj_bg_keyword", keyword);
    
    const fontSize = document.getElementById("quoteFontSizeSelect").value;
    this.setQuoteFontSize(fontSize);
    
    const widgetSize = document.getElementById("widgetSizeSelect").value;
    this.setWidgetSize(widgetSize);
    
    localStorage.setItem("dj_search_new_tab", document.getElementById("searchNewTab").checked);

    const engine = document.getElementById("searchEngineSelect").value;
    localStorage.setItem("dj_search_engine", engine);
    if (window.search) window.search.currentEngine = engine;
    
    if (engine === "custom") {
      localStorage.setItem("dj_custom_search_url", document.getElementById("customSearchUrlInput").value.trim());
    }
    if (window.updateSearchEngineIcon) updateSearchEngineIcon();

    const showWeather = document.getElementById("showCurrentWeather").checked;
    localStorage.setItem("dj_show_current_weather", showWeather);
    if (window.weather) window.weather.showCurrent = showWeather;
    
    // AI 설정 저장
    const aiDisabled = document.getElementById("aiDisableCheck").checked;
    localStorage.setItem("dj_ai_disabled", aiDisabled);
    const provider = document.getElementById("aiProviderSelect").value;
    localStorage.setItem("dj_ai_provider", provider);
    localStorage.setItem("dj_ai_server_url", document.getElementById("aiServerUrlInput").value.trim());
    localStorage.setItem("dj_ai_api_key", document.getElementById("aiApiKeyInput").value.trim());
    const model = document.getElementById("aiModelSelect").value;
    localStorage.setItem("dj_ai_model", model);
    
    if (window.ai) {
      ai.provider = provider;
      ai.serverUrl = localStorage.getItem("dj_ai_server_url");
      ai.apiKey = localStorage.getItem("dj_ai_api_key");
      ai.model = model;
      ai.updateModelDisplay();
      ai.renderWelcome();
    }
    
    if (window.fetchWeather) fetchWeather();
    utils.changeBackgroundInstant();
    utils.closeModal("settingModal");
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
    const modelSelect = document.getElementById("aiModelSelect");
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
    
    if (window.ai) {
      window.ai.checkConnection();
    }
  },

  setQuoteFontSize(size) {
    document.documentElement.style.setProperty("--quote-font-size", `var(--quote-size-${size})`);
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
window.saveSettings = () => settings.save();
window.toggleCustomSearchUrl = () => settings.toggleCustomSearchUrl();
window.toggleAiSettings = (isDisabled) => settings.toggleAiSettings(isDisabled);
window.onAIProviderChange = () => settings.onAIProviderChange();
window.setTheme = (color) => settings.setTheme(color);
window.setQuoteFontSize = (size) => settings.setQuoteFontSize(size);
window.setWidgetSize = (size) => settings.setWidgetSize(size);
