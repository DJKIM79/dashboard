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

    // 도시 검색 입력창 및 결과 초기화 (확실하게 하기 위해 modal 열기 직전에 수행)
    const cityInput = document.getElementById("citySearchInput");
    if (cityInput) {
      cityInput.value = "";
    }
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
    
    localStorage.setItem(
      "dj_search_new_tab",
      document.getElementById("searchNewTab").checked
    );

    const engine = document.getElementById("searchEngineSelect").value;
    localStorage.setItem("dj_search_engine", engine);
    if (window.search) window.search.currentEngine = engine;
    
    if (engine === "custom") {
      localStorage.setItem(
        "dj_custom_search_url",
        document.getElementById("customSearchUrlInput").value.trim()
      );
    }
    if (window.updateSearchEngineIcon) updateSearchEngineIcon();

    const showWeather = document.getElementById("showCurrentWeather").checked;
    localStorage.setItem("dj_show_current_weather", showWeather);
    if (window.weather) window.weather.showCurrent = showWeather;
    
    if (window.fetchWeather) fetchWeather();
    utils.changeBackgroundInstant();
    utils.closeModal("settingModal");
  },

  toggleCustomSearchUrl() {
    const isCustom = document.getElementById("searchEngineSelect").value === "custom";
    document.getElementById("customSearchUrlInput").style.display = isCustom ? "block" : "none";
  },

  setQuoteFontSize(size) {
    document.documentElement.style.setProperty(
      "--quote-font-size",
      `var(--quote-size-${size})`
    );
    localStorage.setItem("dj_quote_font_size", size);
  },

  setWidgetSize(size) {
    document.documentElement.style.setProperty(
      "--widget-scale",
      `var(--widget-scale-${size})`
    );
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
window.setTheme = (color) => settings.setTheme(color);
window.setQuoteFontSize = (size) => settings.setQuoteFontSize(size);
window.setWidgetSize = (size) => settings.setWidgetSize(size);
