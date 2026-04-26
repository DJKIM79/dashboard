const weather = {
  locations: JSON.parse(localStorage.getItem("dj_weather_locations")) || [],
  showCurrent: localStorage.getItem("dj_show_current_weather") !== "false",
  callId: 0,
  searchTimeout: null,

  init() {
    this.fetch();
  },

  async fetch() {
    const container = document.getElementById("top-right-widgets");
    if (!container) return;
    container.innerHTML = "";

    const myCallId = ++this.callId;
    const customLocations = this.locations.filter(
      (loc) => loc.type !== "current",
    );

    if (!this.showCurrent && customLocations.length === 0) return;

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
          <span>${i18n.get("weatherHigh")}</span> ${Math.round(daily.temperature_2m_max[0])}°
          <span>${i18n.get("weatherLow")}</span> ${Math.round(daily.temperature_2m_min[0])}°
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
          <div class="weather-loc" style="color:var(--warning-color)">API 오류</div>
          <div class="weather-main" style="font-size:0.8rem">정보 획득 실패</div>
        `;
        document.getElementById("top-right-widgets").appendChild(err);
      }
    }
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
      const item = document.createElement("div");
      item.className = "forecast-item";
      item.innerHTML = `
        <div class="forecast-day ${dayClass}">${dayName}</div>
        <div class="forecast-icon"><i class="fas ${icon}"></i></div>
        <div class="forecast-temp">${max}° / ${min}°</div>
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
      results.innerHTML = `<div class="city-result-item" style="opacity:0.6; cursor:default">검색 중...</div>`;
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
          results.innerHTML = `<div class="city-result-item" style="opacity:0.6; cursor:default">검색 결과가 없습니다.</div>`;
        }
      } catch (e) {
        console.error("Search error:", e);
        results.style.display = "none";
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
    this.renderLocationList();
  },

  removeLocation(id) {
    this.locations = this.locations.filter((l) => l.id !== id);
    this.saveLocations();
    this.fetch();
    this.renderLocationList();
  },

  saveLocations() {
    localStorage.setItem(
      "dj_weather_locations",
      JSON.stringify(this.locations),
    );
  },

  renderLocationList() {
    const list = document.getElementById("weatherLocationList");
    if (!list) return;

    const customLocations = this.locations.filter(
      (loc) => loc.type !== "current",
    );

    if (customLocations.length === 0) {
      list.innerHTML = `<div style="font-size: 0.8rem; opacity: 0.5; padding: 10px; text-align: center;">추가된 도시가 없습니다.</div>`;
      return;
    }

    list.innerHTML = `
      <div class="weather-custom-select" onclick="weather.toggleLocationPopup(event)">
        <span>추가된 도시 (${customLocations.length})</span>
        <i class="fas fa-chevron-down" style="font-size: 0.7rem; opacity: 0.5;"></i>
        <div id="weather-location-popup" class="ai-model-popup weather-popup">
          ${customLocations
            .map(
              (loc) => `
            <div class="ai-model-item" style="cursor: default;">
              <span>${loc.name}</span>
              <i class="fas fa-trash-alt" style="cursor: pointer; color: #ef4444; font-size: 0.8rem;" 
                 onclick="event.stopPropagation(); removeWeatherLocation(${loc.id})"></i>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

    if (!this.clickListenerAdded) {
      document.addEventListener("click", (e) => {
        const popup = document.getElementById("weather-location-popup");
        if (popup && !e.target.closest(".weather-custom-select")) {
          popup.classList.remove("show");
        }
      });
      this.clickListenerAdded = true;
    }
  },

  toggleLocationPopup(e) {
    e.stopPropagation();
    const popup = document.getElementById("weather-location-popup");
    if (popup) {
      popup.classList.toggle("show");
    }
  },
};

window.weather = weather;
window.fetchWeather = weather.fetch.bind(weather);
window.searchCities = weather.searchCities.bind(weather);
window.removeWeatherLocation = weather.removeLocation.bind(weather);
window.renderWeatherLocationList = weather.renderLocationList.bind(weather);
window.weatherLocations = weather.locations;
