const settings = {
  openModal() {
    try {
      let bgKeyword = localStorage.getItem("dj_bg_keyword");
      if (bgKeyword === null) bgKeyword = "landscape";
      
      const quoteFontSize = localStorage.getItem("dj_quote_font_size") || "medium";
      const widgetSize = localStorage.getItem("dj_widget_size") || "medium";
      const searchNewTab = localStorage.getItem("dj_search_new_tab") !== "false";
      const showWeather = localStorage.getItem("dj_show_current_weather") !== "false";
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

      const themeColor = localStorage.getItem("dj_theme_color") || "#3b82f6";
      const themeAdj = localStorage.getItem("dj_theme_adjustment") || "none";
      
      this.updateThemeAdjustmentUI(themeColor, themeAdj);

      const imgEngine = localStorage.getItem("dj_image_engine") || "unsplash";
      if (el("engineUnsplash")) el("engineUnsplash").checked = (imgEngine === "unsplash");
      if (el("engineFlickr")) el("engineFlickr").checked = (imgEngine === "flickr");

      this.toggleCustomSearchUrl();
      if (window.renderWeatherLocationList) renderWeatherLocationList();

      const aiProvider = localStorage.getItem("dj_ai_provider") || "none";
      if (el("aiProviderSelect")) {
        el("aiProviderSelect").value = aiProvider;
        this.toggleAiSettings(aiProvider === "none");
      }

      const aiOutputAtOnce = localStorage.getItem("dj_ai_output_at_once") !== "false";
      if (el("aiOutputAtOnceCheck")) el("aiOutputAtOnceCheck").checked = aiOutputAtOnce;

      if (el("aiServerUrlInput")) el("aiServerUrlInput").value = localStorage.getItem("dj_ai_server_url") || "http://127.0.0.1:11434";
      if (el("aiApiKeyInput")) el("aiApiKeyInput").value = localStorage.getItem("dj_ai_api_key") || "";
      this.onAIProviderChange();

      if (window.ai && typeof ai.updateStatusUI === "function") ai.updateStatusUI();

      utils.openModal("settingModal");
    } catch (e) {
      console.error("openModal error:", e);
      utils.openModal("settingModal");
    }
  },

  updateBgKeyword(value) {
    localStorage.setItem("dj_bg_keyword", value.trim());
    if (this.bgTimeout) clearTimeout(this.bgTimeout);
    this.bgTimeout = setTimeout(() => { utils.changeBackgroundInstant(); }, 1000);
  },

  updateImageEngine(engine) {
    const unsplash = document.getElementById("engineUnsplash");
    const flickr = document.getElementById("engineFlickr");
    if (engine === 'unsplash') { flickr.checked = false; unsplash.checked = true; localStorage.setItem("dj_image_engine", "unsplash"); }
    else { unsplash.checked = false; flickr.checked = true; localStorage.setItem("dj_image_engine", "flickr"); }
    utils.changeBackgroundInstant();
  },

  updateSearchNewTab(checked) { localStorage.setItem("dj_search_new_tab", checked); },
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
    if (window.weather) { window.weather.showCurrent = show; window.weather.fetch(); }
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
      localStorage.removeItem("dj_ai_models_cache");
      ai.updateChatbotAvailability(false);
      ai.updateModelSelectUI([]);
      
      // 아이콘 색상 초기화
      const refreshIcon = document.querySelector(".ai-refresh-icon");
      if (refreshIcon) refreshIcon.style.color = "#94a3b8";
      
      if (typeof ai.updateStatusUI === "function") ai.updateStatusUI();
    }
    if (window.ui) ui.applyVisibility();
  },

  updateAiServerUrl(url) { localStorage.setItem("dj_ai_server_url", url.trim()); if (window.ai) { ai.serverUrl = url.trim(); } },
  updateAiApiKey(key) { localStorage.setItem("dj_ai_api_key", key.trim()); if (window.ai) { ai.apiKey = key.trim(); } },
  updateAiModel(model) {
    localStorage.setItem("dj_ai_model", model);
    if (window.ai) { ai.model = model; ai.updateModelDisplay(); ai.renderWelcome(); if (window.ui) ui.applyVisibility(); }
  },

  updateThemeAdjustment(type) {
    const lighter = document.getElementById("themeLighter");
    const darker = document.getElementById("themeDarker");
    const themeColor = localStorage.getItem("dj_theme_color") || "#3b82f6";
    
    if (type === 'lighter' && lighter.checked) {
      darker.checked = false;
      localStorage.setItem("dj_theme_adjustment", "lighter");
    } else if (type === 'darker' && darker.checked) {
      lighter.checked = false;
      localStorage.setItem("dj_theme_adjustment", "darker");
    } else {
      localStorage.setItem("dj_theme_adjustment", "none");
    }
    
    this.setTheme(themeColor, true); // explicitly not resetting adj
  },

  updateThemeAdjustmentUI(color, adjustment) {
    const lighter = document.getElementById("themeLighter");
    const darker = document.getElementById("themeDarker");
    if (!lighter || !darker) return;

    const isWhite = (color === "#fff" || color === "#ffffff");
    const isBlack = (color === "#000" || color === "#000000");

    lighter.disabled = isWhite;
    darker.disabled = isBlack;

    lighter.checked = (adjustment === "lighter");
    darker.checked = (adjustment === "darker");
    
    lighter.parentElement.style.opacity = isWhite ? "0.3" : "1";
    lighter.parentElement.style.pointerEvents = isWhite ? "none" : "auto";
    darker.parentElement.style.opacity = isBlack ? "0.3" : "1";
    darker.parentElement.style.pointerEvents = isBlack ? "none" : "auto";
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
      panel.style.opacity = isDisabled ? "0.4" : "1";
      panel.style.pointerEvents = isDisabled ? "none" : "auto";
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
        urlInput.style.display = "block"; keyInput.style.display = "none";
        if (keyLabel) keyLabel.innerText = window.i18n ? window.i18n.get("lblAIUrl") || "주소" : "주소";
      } else {
        urlInput.style.display = "none"; keyInput.style.display = "block";
        if (keyLabel) keyLabel.innerText = "Key";
      }
    }
  },

  setQuoteFontSize(size) {
    const authorEl = document.getElementById("quote-author");
    const sizes = { large: "24px", medium: "16px", small: "13px" };
    document.documentElement.style.setProperty("--quote-font-size", `var(--quote-size-${size})`);
    if (authorEl) { authorEl.style.fontSize = sizes[size]; authorEl.style.lineHeight = "1.5"; }
    localStorage.setItem("dj_quote_font_size", size);
  },

  setWidgetSize(size) {
    document.documentElement.style.setProperty("--widget-scale", `var(--widget-scale-${size})`);
    localStorage.setItem("dj_widget_size", size);
  },

  setTheme(color, keepAdj = false) {
    if (!keepAdj) {
      localStorage.setItem("dj_theme_adjustment", "none");
    }
    
    const adj = localStorage.getItem("dj_theme_adjustment") || "none";
    let finalColor = color;
    
    if (adj !== "none") {
      const isWhite = (color === "#fff" || color === "#ffffff");
      const isBlack = (color === "#000" || color === "#000000");

      if (isWhite && adj === "darker") finalColor = "#e2e8f0";
      else if (isBlack && adj === "lighter") finalColor = "#1e293b"; // 더 어두운 톤으로 조정
      else finalColor = this.adjustColor(color, adj === "lighter" ? 20 : -20);
    }

    document.documentElement.style.setProperty("--accent-color", finalColor);
    localStorage.setItem("dj_theme_color", color);
    
    const contrast = (finalColor === "#000" || finalColor === "#000000" || finalColor === "#fff" || finalColor === "#ffffff") 
      ? (finalColor.startsWith("#f") ? "#0f172a" : "#fff") 
      : "#0f172a";
      
    document.documentElement.style.setProperty("--accent-contrast", contrast);
    this.updateThemeAdjustmentUI(color, adj);
  },

  adjustColor(hex, percent) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r + (r * percent / 100)));
    g = Math.min(255, Math.max(0, g + (g * percent / 100)));
    b = Math.min(255, Math.max(0, b + (b * percent / 100)));
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
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
