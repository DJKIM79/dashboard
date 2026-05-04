const weather = {
  locations: JSON.parse(localStorage.getItem("dj_weather_locations")) || [],
  showCurrent: localStorage.getItem("dj_show_current_weather") === "true",
  callId: 0,
  searchTimeout: null,

  init() {
    this.showCurrent = localStorage.getItem("dj_show_current_weather") === "true";
    this.locations = JSON.parse(localStorage.getItem("dj_weather_locations")) || [];
    this.fetch();
    this.renderLocationList();
  },

  async fetch() {
    const container = document.getElementById("top-right-widgets");
    if (!container) return;
    
    // Clear only current weather items to avoid flickering if possible, 
    // but for simplicity and reliability, we ensure the current state is reflected.
    const myCallId = ++this.callId;
    
    // If we're not showing current and have no locations, just clear and return
    const customLocations = this.locations.filter(loc => loc.id !== 'current');
    if (!this.showCurrent && customLocations.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = "";
    let pendingRequests = (this.showCurrent ? 1 : 0) + customLocations.length;
    let loadingEl = document.createElement("div");
    loadingEl.className = "weather-item";
    loadingEl.style.opacity = "0.6";
    loadingEl.style.cursor = "default";
    loadingEl.innerText = i18n.get("weatherLoading");
    container.appendChild(loadingEl);

    const requestFinished = () => {
      if (myCallId !== this.callId) return;
      pendingRequests--;
      if (pendingRequests <= 0 && loadingEl && loadingEl.parentNode) {
        loadingEl.remove();
        loadingEl = null;
      }
    };

    if (this.showCurrent) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (myCallId !== this.callId) return;
            const lat = pos.coords.latitude,
              lon = pos.coords.longitude;
            let locName = i18n.get("currentLoc");
            try {
              const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=${i18n.userLang}`;
              const revRes = await fetch(reverseUrl, {
                headers: { "User-Agent": "OnTo-SmartHub/1.1" },
              });
              const revData = await revRes.json();
              if (myCallId === this.callId && revData?.address) {
                const a = revData.address;
                const area =
                  a.city ||
                  a.town ||
                  a.village ||
                  a.suburb ||
                  a.hamlet ||
                  a.city_district ||
                  a.borough;
                if (area)
                  locName = `${i18n.userLang === "ko" ? "현지" : i18n.get("lblCurrentWeather")} (${area})`;
              }
            } catch (e) {}
            await this.getData(lat, lon, locName, "current", myCallId);
            requestFinished();
          },
          async () => {
            if (myCallId !== this.callId) return;
            await this.getData(
              36.48,
              127.08,
              i18n.get("weatherDefault"),
              "current",
              myCallId,
            );
            requestFinished();
          },
          { timeout: 5000 },
        );
      } else {
        this.getData(
          36.48,
          127.08,
          i18n.get("weatherDefault"),
          "current",
          myCallId,
        ).then(requestFinished);
      }
    }

    customLocations.forEach((loc) => {
      this.getData(loc.lat, loc.lon, loc.name, loc.id, myCallId).finally(
        requestFinished,
      );
    });
  },

  async getData(lat, lon, locName, id, callId) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
      );
      if (!res.ok) throw new Error("Weather API failed");
      const d = await res.json();
      if (!d.current || !d.daily) throw new Error("Invalid weather data");

      if (callId !== undefined && callId !== this.callId) return;

      const current = d.current;
      const daily = d.daily;

      const container = document.createElement("div");
      container.className = "weather-item";
      container.id = `weather-${id}`;
      container.onclick = (e) => {
        e.stopPropagation();
        this.toggleForecast(id, daily, lat, lon);
      };
      container.oncontextmenu = (e) => showContextMenu(e, "weather", id);

      const icon = this.getIcon(current.weather_code);

      container.innerHTML = `
        <div class="weather-loc">${locName}</div>
        <div class="weather-main">
          <i class="fas ${icon}"></i>
          <span>${Math.round(current.temperature_2m)}</span>°
        </div>
        <div class="weather-hl">
          <span style="color: #ff5f5f;">${i18n.get("weatherHigh")}</span> ${Math.round(daily.temperature_2m_max[0])}°
          <span style="color: #60a5fa;">${i18n.get("weatherLow")}</span> ${Math.round(daily.temperature_2m_min[0])}°
        </div>
        <div id="forecast-${id}" class="forecast-window" onclick="event.stopPropagation()"></div>
      `;
      document.getElementById("top-right-widgets").appendChild(container);
    } catch (e) {
      console.error(e);
      if (callId !== undefined && callId !== this.callId) return;
      if (id === "current") {
        const err = document.createElement("div");
        err.className = "weather-item";
        err.style.opacity = "0.7";
        err.innerHTML = `
          <div class="weather-loc" style="color:var(--warning-color)">${i18n.get("msgApiError")}</div>
          <div class="weather-main" style="font-size:0.8rem">${i18n.get("msgWeatherFail")}</div>
        `;
        document.getElementById("top-right-widgets").appendChild(err);
      }
    }
  },

  getTempColor(temp) {
    // T >= 35: Deep Red (Hue 0)
    // 15 <= T <= 20: Emerald Green (Hue 140)
    // T <= -5: Deep Cold Blue (Hue 230)
    
    if (temp >= 35) return "hsl(0, 100%, 60%)";
    if (temp <= -5) return "hsl(230, 100%, 65%)";
    
    let h;
    if (temp >= 15 && temp <= 20) {
      h = 140; // Emerald Green
    } else if (temp > 20) {
      // 20 (Green) to 35 (Red)
      const ratio = (temp - 20) / 15;
      h = 140 - (ratio * 140);
    } else {
      // -5 (Blue) to 15 (Green)
      // Interpolate Hue from 230 down to 140
      const ratio = (temp - (-5)) / 20;
      // Use a slight power curve (0.85) to smooth out the perceptual jump 
      // around the Cyan range (approx. 5°C), making the transition feel more natural.
      h = 230 - (Math.pow(ratio, 0.85) * 90);
    }
    
    return `hsl(${h}, 100%, 65%)`;
  },

  getIcon(code) {
    if (code === 0) return "fa-sun";
    if (code <= 3) return "fa-cloud-sun";
    if ([45, 48].includes(code)) return "fa-smog";
    if ([51, 53, 55].includes(code)) return "fa-cloud-rain";
    if ([61, 63, 65, 80, 81, 82].includes(code))
      return "fa-cloud-showers-heavy";
    if ([71, 73, 75].includes(code)) return "fa-snowflake";
    if ([95, 96, 99].includes(code)) return "fa-bolt";
    return "fa-cloud";
  },

  toggleForecast(id, daily) {
    const el = document.getElementById(`forecast-${id}`);
    const isActive = el.classList.contains("active");
    document
      .querySelectorAll(".forecast-window")
      .forEach((w) => w.classList.remove("active"));
    if (!isActive) {
      this.renderForecast(el, daily);
      el.classList.add("active");
    }
  },

  renderForecast(container, daily) {
    container.innerHTML = "";
    const days = i18n.get("days");
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const day = date.getDay();
      const dayName = i === 0 ? i18n.get("today") : days[day];
      const dayClass = day === 0 ? "sun" : day === 6 ? "sat" : "";
      const icon = this.getIcon(daily.weather_code[i]);
      const max = Math.round(daily.temperature_2m_max[i]);
      const min = Math.round(daily.temperature_2m_min[i]);
      const maxColor = this.getTempColor(max);
      const minColor = this.getTempColor(min);
      
      const item = document.createElement("div");
      item.className = "forecast-item";
      item.innerHTML = `
        <div class="forecast-day ${dayClass}">${dayName}</div>
        <div class="forecast-icon"><i class="fas ${icon}"></i></div>
        <div class="forecast-temp" style="font-weight: 700;">
          <span style="color: ${maxColor}">${max}°</span> / 
          <span style="color: ${minColor}">${min}°</span>
        </div>
      `;
      container.appendChild(item);
    }
  },

  async searchCities(query) {
    const results = document.getElementById("citySearchResults");
    if (!query || query.trim().length < 2) {
      results.style.display = "none";
      return;
    }

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      const msgSearching = window.i18n ? i18n.get("msgSearching") : "검색 중...";
      results.innerHTML = `<div class="city-result-item" style="opacity:0.6; cursor:default">${msgSearching}</div>`;
      results.style.display = "block";

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&accept-language=${i18n.userLang}&addressdetails=1`;
        const res = await fetch(url, {
          headers: { "User-Agent": "OnTo-SmartHub/1.1" },
        });
        const data = await res.json();
        results.innerHTML = "";
        if (data && data.length > 0) {
          data.forEach((item) => {
            const addr = item.address || {};
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.suburb ||
              addr.hamlet ||
              addr.city_district ||
              item.display_name.split(",")[0];
            const state = addr.state || addr.province || "";
            const country = addr.country || "";
            const div = document.createElement("div");
            div.className = "city-result-item";
            div.innerText = `${city}${state ? ", " + state : ""}${country ? " (" + country + ")" : ""}`;
            div.onclick = () => this.addLocation(item, city);
            results.appendChild(div);
          });
        } else {
          const msgNoResults = window.i18n ? i18n.get("msgNoResults") : "검색 결과가 없습니다.";
          results.innerHTML = `<div class="city-result-item" style="opacity:0.6; cursor:default">${msgNoResults}</div>`;
        }
      } catch (e) {
        console.error("Search error:", e);
        const msgNoResults = window.i18n ? i18n.get("msgNoResults") : "검색 결과가 없습니다.";
        results.innerHTML = `<div class="city-result-item" style="opacity:0.6; cursor:default">${msgNoResults}</div>`;
      }
    }, 400);
  },

  addLocation(item, cityName) {
    const isDuplicate = this.locations.some(
      (loc) => loc.lat == item.lat && loc.lon == item.lon,
    );

    if (isDuplicate) {
      utils.openModal("alertModal");
      return;
    }

    const loc = {
      type: "custom",
      name: cityName || item.display_name.split(",")[0],
      lat: item.lat,
      lon: item.lon,
      id: Date.now(),
    };
    this.locations.push(loc);
    this.saveLocations();
    this.fetch();
    document.getElementById("citySearchInput").value = "";
    document.getElementById("citySearchResults").style.display = "none";
    this.closeCityAddPopup();
    this.renderLocationList();

    // Show success feedback tip
    setTimeout(() => {
        if (window.utils) {
            const msg = window.i18n ? i18n.get("msgCityAdded").replace("{0}", loc.name) : `${loc.name}가 추가되었습니다.`;
            utils.showValidationTip("weather-location-trigger", msg);
        }
    }, 100);

  },

  removeLocation(id) {
    const idStr = String(id);
    this.locations = this.locations.filter((l) => String(l.id) !== idStr);
    this.saveLocations();
    this.fetch();
    this.renderLocationList();
  },

  saveLocations() {
    localStorage.setItem(
      "dj_weather_locations",
      JSON.stringify(this.locations),
    );
    window.weatherLocations = this.locations;
  },

  renderLocationList() {
    const popupEl = document.getElementById("weather-location-popup");
    const wrapEl = document.getElementById("weather-select-wrap");
    const triggerText = document.getElementById("weather-trigger-text");
    if (!popupEl || !wrapEl) return;

    const customLocations = this.locations.filter(
      (loc) => loc.type !== "current",
    );

    const lblCityList = window.i18n ? i18n.get("lblCityList") : "도시 목록";
    wrapEl.style.display = "block";
    if (triggerText) triggerText.innerText = `${lblCityList} (${customLocations.length})`;
    
    popupEl.innerHTML = "";
    
    const listArea = document.createElement("div");
    listArea.className = "popup-list-area";
    listArea.style.maxHeight = "300px";
    listArea.style.overflowY = "auto";
    
    if (customLocations.length === 0) {
        const msgNoRegisteredCities = window.i18n ? i18n.get("msgNoRegisteredCities") : "등록된 도시가 없습니다.";
        listArea.innerHTML = `<div class="ai-model-tip" style="padding: 15px; opacity: 0.5; text-align: center;">${msgNoRegisteredCities}</div>`;
    } else {
        customLocations.forEach(loc => {
            const item = document.createElement("div");
            item.className = "ai-model-item";
            item.style.cursor = "default";
            item.innerHTML = `
                <span style="flex: 1;">${loc.name}</span>
                <i class="fas fa-trash-alt engine-btn-del" style="font-size: 0.8rem;" 
                   onclick="event.stopPropagation(); removeWeatherLocation(${loc.id})"></i>
            `;
            listArea.appendChild(item);
        });
    }
    popupEl.appendChild(listArea);

    const footer = document.createElement("div");
    footer.style.borderTop = "1px solid rgba(255,255,255,0.1)";
    footer.style.paddingTop = "5px";
    footer.style.marginTop = "5px";
    
    const addBtn = document.createElement("div");
    addBtn.className = "engine-item";
    addBtn.style.justifyContent = "center";
    addBtn.innerHTML = `<i class="fas fa-square-plus" style="margin-right: 8px; color: var(--accent-color);"></i> ${window.i18n ? window.i18n.get("lblCityAdd") : "도시 추가"}`;
    addBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleCityAddPopup(e);
        this.closeLocationPopup();
    };
    footer.appendChild(addBtn);
    popupEl.appendChild(footer);
  },

  toggleCityAddPopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("city-add-popup");
    if (!popup) return;
    
    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        if (window.settings) settings.closeAllPopups("city-add-popup");
        popup.style.display = "block";
        popup.offsetHeight;
        popup.classList.add("show");
        const input = document.getElementById("citySearchInput");
        if (input) {
            input.value = "";
            input.focus();
        }
        document.getElementById("citySearchResults").innerHTML = "";
    } else {
        this.closeCityAddPopup();
    }
  },

  closeCityAddPopup() {
    const popup = document.getElementById("city-add-popup");
    if (popup) {
        popup.classList.remove("show");
        setTimeout(() => {
            if (!popup.classList.contains("show")) popup.style.display = "none";
        }, 300);
    }
  },

  toggleLocationPopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById("weather-location-popup");
    if (!popup) return;
    
    const isShowing = popup.classList.contains("show");
    if (!isShowing) {
        if (window.settings) settings.closeAllPopups("weather-location-popup");
        popup.style.display = "block";
        popup.offsetHeight; // Reflow
        popup.classList.add("show");
    } else {
        this.closeLocationPopup();
    }
  },

  closeLocationPopup() {
    const popup = document.getElementById("weather-location-popup");
    if (!popup) return;
    popup.classList.remove("show");
    setTimeout(() => {
        if (!popup.classList.contains("show")) popup.style.display = "none";
    }, 200);
  },
};

window.weather = weather;
window.fetchWeather = weather.fetch.bind(weather);
window.searchCities = weather.searchCities.bind(weather);
window.removeWeatherLocation = weather.removeLocation.bind(weather);
window.renderWeatherLocationList = weather.renderLocationList.bind(weather);
window.weatherLocations = weather.locations;
