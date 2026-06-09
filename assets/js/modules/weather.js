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
    this.setupPermissionListener();
  },
  setupPermissionListener() {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
        permissionStatus.onchange = () => {
          this.fetch(true);
        };
      }).catch(err => console.error("Geolocation permission query error:", err));
    }
  },
  async fetch(force = false) {
    const container = document.getElementById("top-right-widgets");
    if (!container) return;

    const now = Date.now();
    const lastFetch = parseInt(localStorage.getItem("dj_weather_last_fetch") || 0);
    const customLocations = this.locations.filter(loc => loc.id !== 'current');
    const cache = JSON.parse(localStorage.getItem("dj_weather_cache") || "{}");
    const hasError = Object.values(cache).some(c => c && c.error);

    // 1. Throttling Check (1 hour)
    if (!force && !hasError && (now - lastFetch < 3600000)) {
      // Check if we need to verify location movement (only for 'current' weather)
      if (this.showCurrent && cache["current"]) {
        const lastLocCheck = parseInt(localStorage.getItem("dj_weather_last_loc_check") || 0);
        // To prevent location icon flickering on every focus, wait at least 10 mins for next loc check
        if (now - lastLocCheck < 600000) { 
           this.renderAll(cache);
           return;
        }

        // Check current location to see if we moved significantly
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            localStorage.setItem("dj_weather_last_loc_check", Date.now().toString());
            const c = cache["current"];
            const dist = this.getDistance(pos.coords.latitude, pos.coords.longitude, c.lat, c.lon);
            
            if (dist > 5) {
              // Significant movement (> 5km) detected, bypass throttle
              this.performFetch(true);
            } else {
              this.renderAll(cache);
            }
          }, () => {
            this.renderAll(cache); // Geolocation failed, use cache
          }, { timeout: 3000 });
          return;
        }
      }
      
      if (Object.keys(cache).length > 0) {
        this.renderAll(cache);
        return;
      }
    }

    this.performFetch(force);
  },
  async performFetch(force) {
    const container = document.getElementById("top-right-widgets");
    const myCallId = ++this.callId;
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
    loadingEl.innerText = i18n.get("weatherLoading");
    container.appendChild(loadingEl);

    const requestFinished = () => {
      if (myCallId !== this.callId) return;
      pendingRequests--;
      if (pendingRequests <= 0) {
        if (loadingEl && loadingEl.parentNode) {
          loadingEl.remove();
          loadingEl = null;
        }
        localStorage.setItem("dj_weather_last_fetch", Date.now().toString());
        localStorage.setItem("dj_weather_last_loc_check", Date.now().toString());
      }
    };

    if (this.showCurrent) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          if (myCallId !== this.callId) return;
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          let locName = i18n.get("currentLoc");
          try {
            const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=${i18n.userLang}`, {
              headers: { "User-Agent": "OnTo-SmartHub/1.1" },
            });
            const revData = await revRes.json();
            if (revData?.address) {
              const a = revData.address;
              const area = a.city || a.town || a.village || a.suburb || a.hamlet || a.city_district || a.borough;
              if (area) locName = `${i18n.userLang === "ko" ? "현지" : i18n.get("lblCurrentWeather")} (${area})`;
            }
          } catch (e) {}
          await this.getData(lat, lon, locName, "current", myCallId);
          requestFinished();
        }, async (err) => {
          if (myCallId !== this.callId) return;
          const msg = i18n.get("msgLocationFailed");
          this.renderErrorItem("current", i18n.get("currentLoc"), msg);
          requestFinished();
        }, { timeout: 5000 });
      } else {
        this.renderErrorItem("current", i18n.get("currentLoc"), i18n.get("msgLocationFailed"));
        requestFinished();
      }
    }

    customLocations.forEach(loc => {
      this.getData(loc.lat, loc.lon, loc.name, loc.id, myCallId).finally(requestFinished);
    });
  },
  async getData(lat, lon, locName, id, callId) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
      const d = await res.json();
      if (!d.current || !d.daily || (callId !== undefined && callId !== this.callId)) return;
      
      const cache = JSON.parse(localStorage.getItem("dj_weather_cache") || "{}");
      cache[id] = { lat, lon, locName, data: d };
      delete cache[id].error; // Clear error if success
      localStorage.setItem("dj_weather_cache", JSON.stringify(cache));

      this.renderItem(id, locName, lat, lon, d);
    } catch (e) { console.error(e); }
  },
  renderAll(cache) {
    const container = document.getElementById("top-right-widgets");
    container.innerHTML = "";
    if (this.showCurrent && cache["current"]) {
      const c = cache["current"];
      if (c.error) {
        this.renderErrorItem("current", c.locName, c.error);
      } else {
        this.renderItem("current", c.locName, c.lat, c.lon, c.data);
      }
    }
    this.locations.filter(l => l.id !== 'current').forEach(loc => {
      const c = cache[loc.id];
      if (c) this.renderItem(loc.id, c.locName, c.lat, c.lon, c.data);
    });
  },
  renderItem(id, locName, lat, lon, d) {
    const current = d.current, daily = d.daily;
    const container = document.createElement("div");
    container.className = "weather-item";
    container.id = `weather-${id}`;
    container.onclick = () => this.toggleForecast(id, daily, lat, lon);
    container.oncontextmenu = (e) => showContextMenu(e, "weather", id);
    
    // Calculate display order: 'current' always stays on the far right (highest order)
    let order = 1000;
    if (id !== "current") {
      const idx = this.locations.findIndex(l => String(l.id) === String(id));
      if (idx !== -1) order = 100 - idx;
    }
    container.style.order = order;

    const icon = this.getIcon(current.weather_code);
    const iconColor = this.getIconColor(current.weather_code);
    const tempVal = Math.round(current.temperature_2m);
    const tempColor = this.getTempColor(tempVal);
    const maxVal = Math.round(daily.temperature_2m_max[0]);
    const minVal = Math.round(daily.temperature_2m_min[0]);
    container.innerHTML = `
      <div class="weather-loc">${locName}</div>
      <div class="weather-main" style="color: ${tempColor}"><i class="fas ${icon}" style="color: ${iconColor}"></i><span>${tempVal}</span>°</div>
      <div class="weather-hl">
        <span style="color: #ff5f5f;">${i18n.get("weatherHigh")}</span> <span style="color: ${this.getTempColor(maxVal)}">${maxVal}°</span>
        <span style="color: #60a5fa;">${i18n.get("weatherLow")}</span> <span style="color: ${this.getTempColor(minVal)}">${minVal}°</span>
      </div>
      <div id="forecast-${id}" class="forecast-window" onclick="event.stopPropagation()"></div>
    `;
    document.getElementById("top-right-widgets").appendChild(container);
  },
  renderErrorItem(id, locName, msg) {
    const container = document.createElement("div");
    container.className = "weather-item weather-error";
    container.id = `weather-${id}`;
    container.onclick = () => this.fetch(true);
    container.oncontextmenu = (e) => showContextMenu(e, "weather", id);
    
    // Calculate display order: 'current' always stays on the far right (highest order)
    let order = 1000;
    if (id !== "current") {
      const idx = this.locations.findIndex(l => String(l.id) === String(id));
      if (idx !== -1) order = 100 - idx;
    }
    container.style.order = order;

    container.innerHTML = `
      <div class="weather-main"><i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i></div>
      <div class="weather-error-text">${msg}</div>
    `;
    document.getElementById("top-right-widgets").appendChild(container);
    
    // Save error to cache to keep it on refresh until next attempt
    const cache = JSON.parse(localStorage.getItem("dj_weather_cache") || "{}");
    cache[id] = { locName, error: msg };
    localStorage.setItem("dj_weather_cache", JSON.stringify(cache));
  },
  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },
  getTempColor(temp) {
    if (temp >= 35) return "hsl(0, 100%, 60%)";
    if (temp <= -5) return "hsl(230, 100%, 65%)";
    let h = (temp >= 15 && temp <= 20) ? 140 : (temp > 20) ? 140 - ((temp - 20) / 15 * 140) : 230 - (Math.pow((temp + 5) / 20, 0.85) * 90);
    return `hsl(${h}, 100%, 65%)`;
  },
  getIcon: (code) => (code === 0) ? "fa-sun" : (code <= 3) ? "fa-cloud-sun" : [45, 48].includes(code) ? "fa-smog" : [51, 53, 55].includes(code) ? "fa-cloud-rain" : [61, 63, 65, 80, 81, 82].includes(code) ? "fa-cloud-showers-heavy" : [71, 73, 75].includes(code) ? "fa-snowflake" : [95, 96, 99].includes(code) ? "fa-bolt" : "fa-cloud",
  getIconColor: (code) => (code === 0) ? "#ff7a00" : (code <= 3) ? "#dfab84" : [45, 48].includes(code) ? "#a0aec0" : [51, 53, 55].includes(code) ? "#60a5fa" : [61, 63, 65, 80, 81, 82].includes(code) ? "#3b82f6" : [71, 73, 75].includes(code) ? "#ffffff" : [95, 96, 99].includes(code) ? "#ffd32a" : "#cbd5e1",
  toggleForecast(id, daily) {
    const el = document.getElementById(`forecast-${id}`), isActive = el.classList.contains("active");
    document.querySelectorAll(".forecast-window").forEach(w => w.classList.remove("active"));
    if (!isActive) { this.renderForecast(el, daily); el.classList.add("active"); }
  },
  renderForecast(container, daily) {
    container.innerHTML = "";
    const days = i18n.get("days"), now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now); date.setDate(now.getDate() + i);
      const day = date.getDay(), dayText = i === 0 ? i18n.get("today") : days[day], dayClass = day === 0 ? "sun" : day === 6 ? "sat" : "";
      const icon = this.getIcon(daily.weather_code[i]), iconColor = this.getIconColor(daily.weather_code[i]);
      const max = Math.round(daily.temperature_2m_max[i]), min = Math.round(daily.temperature_2m_min[i]);
      const item = document.createElement("div");
      item.className = "forecast-item";
      item.innerHTML = `<div class="forecast-day"><span class="forecast-date ${dayClass}">${date.getDate()}</span><span class="forecast-badge ${dayClass}">${dayText}</span></div><div class="forecast-icon"><i class="fas ${icon}" style="color: ${iconColor}"></i></div><div class="forecast-temp" style="font-weight: 700;"><span style="color: ${this.getTempColor(max)}">${max}°</span> / <span style="color: ${this.getTempColor(min)}">${min}°</span></div>`;
      container.appendChild(item);
    }
  },
  async searchCities(query) {
    const results = document.getElementById("citySearchResults");
    if (!query || query.trim().length < 2) { results.style.display = "none"; return; }
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      results.innerHTML = `<div class="city-result-item" style="opacity:0.6; cursor:default">${i18n.get("msgSearching")}</div>`;
      results.style.display = "block";
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&accept-language=${i18n.userLang}&addressdetails=1`, { headers: { "User-Agent": "OnTo-SmartHub/1.1" } });
        const data = await res.json();
        results.innerHTML = "";
        if (data?.length > 0) {
          data.forEach(item => {
            const a = item.address || {}, city = a.city || a.town || a.village || a.suburb || a.hamlet || a.city_district || item.display_name.split(",")[0];
            const div = document.createElement("div"); div.className = "city-result-item"; div.innerText = `${city}${a.state ? ", " + a.state : ""}${a.country ? " (" + a.country + ")" : ""}`;
            div.onclick = () => this.addLocation(item, city); results.appendChild(div);
          });
        } else { results.innerHTML = `<div class="city-result-item" style="opacity:0.6; cursor:default">${i18n.get("msgNoResults")}</div>`; }
      } catch (e) { results.innerHTML = `<div class="city-result-item" style="opacity:0.6; cursor:default">${i18n.get("msgNoResults")}</div>`; }
    }, 400);
  },
  addLocation(item, cityName) {
    if (this.locations.some(loc => loc.lat == item.lat && loc.lon == item.lon)) { utils.openModal("alertModal"); return; }
    const loc = { type: "custom", name: cityName || item.display_name.split(",")[0], lat: item.lat, lon: item.lon, id: Date.now() };
    this.locations.push(loc); this.saveLocations(); this.fetch(true);
    document.getElementById("citySearchInput").value = ""; document.getElementById("citySearchResults").style.display = "none";
    this.closeCityAddPopup(); this.renderLocationList();
    setTimeout(() => { if (window.utils) utils.showValidationTip("weather-location-trigger", i18n.get("msgCityAdded").replace("{0}", loc.name)); }, 100);
  },
  removeLocation(id) {
    this.locations = this.locations.filter(l => String(l.id) !== String(id));
    this.saveLocations(); this.fetch(true); this.renderLocationList();
  },
  saveLocations() { localStorage.setItem("dj_weather_locations", JSON.stringify(this.locations)); window.weatherLocations = this.locations; },
  renderLocationList() {
    const popupEl = document.getElementById("weather-location-popup"), wrapEl = document.getElementById("weather-select-wrap"), triggerText = document.getElementById("weather-trigger-text");
    if (!popupEl || !wrapEl) return;
    const customLocations = this.locations.filter(loc => loc.type !== "current");
    wrapEl.style.display = "block"; if (triggerText) triggerText.innerText = `${i18n.get("lblCityList")} (${customLocations.length})`;
    popupEl.innerHTML = ""; const listArea = document.createElement("div"); listArea.className = "popup-list-area"; listArea.style.maxHeight = "300px"; listArea.style.overflowY = "auto";
    if (customLocations.length === 0) { listArea.innerHTML = `<div class="ai-model-tip" style="padding: 15px; opacity: 0.5; text-align: center;">${i18n.get("msgNoRegisteredCities")}</div>`; }
    else {
      customLocations.forEach(loc => {
        const item = document.createElement("div"); item.className = "ai-model-item"; item.style.cursor = "default";
        item.innerHTML = `<span style="flex: 1;">${loc.name}</span><i class="fas fa-trash-alt engine-btn-del" style="font-size: 0.8rem;" onclick="event.stopPropagation(); removeWeatherLocation(${loc.id})"></i>`;
        listArea.appendChild(item);
      });
    }
    popupEl.appendChild(listArea);
    const footer = document.createElement("div"); footer.style.borderTop = "1px solid rgba(255,255,255,0.1)"; footer.style.paddingTop = "5px"; footer.style.marginTop = "5px";
    const addBtn = document.createElement("div"); addBtn.className = "engine-item"; addBtn.style.justifyContent = "center";
    addBtn.innerHTML = `<i class="fas fa-square-plus" style="margin-right: 8px; color: var(--accent-color);"></i> ${i18n.get("lblCityAdd")}`;
    addBtn.onclick = (e) => { e.stopPropagation(); this.toggleCityAddPopup(e); this.closeLocationPopup(); };
    footer.appendChild(addBtn); popupEl.appendChild(footer);
  },
  toggleCityAddPopup(e) {
    if (e) e.stopPropagation(); const popup = document.getElementById("city-add-popup"); if (!popup) return;
    if (!popup.classList.contains("show")) { if (window.settings) settings.closeAllPopups("city-add-popup"); popup.style.display = "block"; popup.offsetHeight; popup.classList.add("show"); const input = document.getElementById("citySearchInput"); if (input) { input.value = ""; input.focus(); } document.getElementById("citySearchResults").innerHTML = ""; }
    else { this.closeCityAddPopup(); }
  },
  closeCityAddPopup() { const popup = document.getElementById("city-add-popup"); if (popup) { popup.classList.remove("show"); setTimeout(() => { if (!popup.classList.contains("show")) popup.style.display = "none"; }, 300); } },
  toggleLocationPopup(e) {
    if (e) e.stopPropagation(); const popup = document.getElementById("weather-location-popup"); if (!popup) return;
    if (!popup.classList.contains("show")) { if (window.settings) settings.closeAllPopups("weather-location-popup"); popup.style.display = "block"; popup.offsetHeight; popup.classList.add("show"); }
    else { this.closeLocationPopup(); }
  },
  closeLocationPopup() { const popup = document.getElementById("weather-location-popup"); if (popup) { popup.classList.remove("show"); setTimeout(() => { if (!popup.classList.contains("show")) popup.style.display = "none"; }, 200); } },
};
window.weather = weather; window.fetchWeather = weather.fetch.bind(weather); window.searchCities = weather.searchCities.bind(weather); window.removeWeatherLocation = weather.removeLocation.bind(weather); window.renderWeatherLocationList = weather.renderLocationList.bind(weather); window.weatherLocations = weather.locations;
