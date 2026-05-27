// 260527 FINAL STABLE VERSION - FIXED CREATION LOGIC
const stock = {
  items: JSON.parse(localStorage.getItem("dj_stocks")) || [],
  isSecretMode: localStorage.getItem("dj_stock_secret_mode") === "true",
  updateInterval: parseInt(localStorage.getItem("dj_stock_interval") || 10) * 1000,
  intervalId: null,
  stockCodes: [], 
  isLoadingCodes: false,
  searchTimeout: null,
  searchAbortController: null,
  
  isSupported() {
    const lang = localStorage.getItem("dj_language") || "auto";
    const actualLang = (lang === "auto") ? (window.i18n ? i18n.userLang : "en") : lang;
    const supported = ["ko", "en", "ja", "zh-CN", "zh-TW"];
    return supported.includes(actualLang);
  },

  init() {
    this.render();
    if (this.isSupported()) {
      this.startInterval();
    }
    
    // Window active/focus event listeners to restore polling if needed
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.isSupported()) {
        this.startInterval();
      }
    });
    window.addEventListener("focus", () => {
      if (this.isSupported()) {
        this.startInterval();
      }
    });
    
    // Global click listener for closing
    window.addEventListener('click', (e) => {
      const popup = document.getElementById("global-stock-detail");
      if (popup && popup.style.display === 'block') {
        if (!popup.contains(e.target) && !e.target.closest('.stock-card')) {
          this.closeDetailPopup();
        }
      }
    });
    
    window.addEventListener("resize", () => {
      this.updateScrollArrows();
      this.closeDetailPopup();
    });

    const list = document.getElementById("stock-list");
    if (list) {
      list.addEventListener("scroll", () => this.updateScrollArrows());
    }
  },

  closeDetailPopup() {
    const popup = document.getElementById("global-stock-detail");
    if (!popup) return;
    popup.style.display = 'none';
    popup.classList.remove('show');
    popup.dataset.currentId = '';
  },
  
  toggleSecretMode() {
    this.isSecretMode = !this.isSecretMode;
    localStorage.setItem("dj_stock_secret_mode", String(this.isSecretMode));
    
    if (window.utils && utils.hideValidationTip) {
      utils.hideValidationTip();
    }
    
    const list = document.getElementById("stock-list");
    if (!list) {
      this.render();
      return;
    }

    list.classList.add("fade-out-active");

    setTimeout(() => {
      this.render();
      
      setTimeout(() => {
        const listAgain = document.getElementById("stock-list");
        if (listAgain) {
          listAgain.classList.remove("fade-out-active");
        }
      }, 50);
    }, 200);
  },
  
  updateIntervalSetting(seconds) {
    this.updateInterval = seconds * 1000;
    this.startInterval();
  },
  
  startInterval() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.items.length === 0 || !this.isSupported()) return;
    this.updatePrices();
    this.intervalId = setInterval(() => {
      const hasOpenMarket = this.items.some(item => !item.marketStatus || item.marketStatus === 'OPEN');
      if (hasOpenMarket) {
        this.updatePrices();
      } else {
        console.log("All stock markets closed. Pausing background updates.");
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      }
    }, this.updateInterval);
  },
  
  async updatePrices() {
    if (this.items.length === 0) return;
    const codes = this.items.map(item => item.code).join(',');

    try {
        const response = await fetch(`stock_proxy.php?codes=${codes}`);
        const data = await response.json();

        if (data.success && data.stocks) {
            this.items.forEach(item => {
                const stockData = data.stocks.find(s => s.code === item.code);
                if (stockData) {
                    item.name = stockData.name;
                    item.basePrice = stockData.previousClose;
                    item.currentPrice = stockData.currentPrice;
                    item.change = stockData.changePrice;
                    item.changePercent = stockData.changeRate;
                    item.open = stockData.openPrice;
                    item.high = stockData.highPrice;
                    item.low = stockData.lowPrice;
                    item.volume = stockData.volume;
                    item.tradingValue = stockData.tradingValue;
                    item.fiftyTwoWeekHigh = stockData.fiftyTwoWeekHigh;
                    item.fiftyTwoWeekLow = stockData.fiftyTwoWeekLow;
                    item.marketStatus = stockData.marketStatus;
                }
            });
            this.saveData();
            this.updateDOM();

            const popup = document.getElementById("global-stock-detail");
            if (popup && popup.style.display === 'block' && popup.dataset.currentId) {
                this.renderDetail(popup.dataset.currentId, popup);
            }
        }
    } catch (e) {
        console.error("Stock update error:", e);
    }
  },
  
  updateDOM() {
    const listContainer = document.getElementById("stock-list");
    if (!listContainer) return;

    const cards = listContainer.querySelectorAll(".stock-card");
    if (cards.length !== this.items.length) {
      this.render();
      return;
    }

    this.items.forEach((n, idx) => {
      const div = cards[idx];
      if (!div || div.dataset.id !== String(n.id)) {
        this.render();
        return;
      }

      const chg = n.changePercent || 0;
      const sign = chg >= 0 ? "+" : "";

      div.classList.remove("secret-up", "secret-down");

      if (this.isSecretMode) {
        if (chg > 0) {
          div.classList.add("secret-up");
        } else if (chg < 0) {
          div.classList.add("secret-down");
        }

        const changeValText = Math.abs(chg).toFixed(2);
        const changeEl = div.querySelector(".stock-change");
        if (changeEl) {
          changeEl.innerText = changeValText;
        }
      } else {
        const price = (n.currentPrice || n.basePrice || 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
        const chgClass = chg > 0 ? "up" : chg < 0 ? "down" : "same";

        const priceEl = div.querySelector(".stock-price");
        if (priceEl) {
          priceEl.className = `stock-price ${chgClass}`;
          priceEl.innerText = price;
        }

        const changeEl = div.querySelector(".stock-change");
        if (changeEl) {
          changeEl.className = `remaining stock-change ${chgClass}`;
          changeEl.innerText = `${sign}${chg.toFixed(2)}%`;
        }
      }
    });
  },
  
  saveData() {
    localStorage.setItem("dj_stocks", JSON.stringify(this.items));
  },
  
  render() {
    // 1. Ensure the popup container exists
    let popup = document.getElementById("global-stock-detail");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "global-stock-detail";
      popup.className = "stock-detail-window engine-popup";
      popup.style.cssText = "position: fixed; width: 250px; z-index: 4000; cursor: default; display: none; background: #1e293b; border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.6);";
      popup.onclick = (e) => e.stopPropagation();
      document.body.appendChild(popup);
    }

    const listContainer = document.getElementById("stock-list");
    if (!listContainer) return;
    
    const container = document.getElementById("stock-container");
    if (this.items.length === 0) {
      if (container) container.style.display = "none";
      return;
    }
    if (container) container.style.display = "flex";

    listContainer.innerHTML = "";
    this.items.forEach(n => {
      const div = document.createElement("div");
      div.className = "item-card stock-card";
      div.dataset.id = String(n.id);
      
      const chg = n.changePercent || 0;
      const sign = chg >= 0 ? "+" : "";

      div.classList.remove("secret-up", "secret-down");

      if (this.isSecretMode) {
        if (chg > 0) {
          div.classList.add("secret-up");
        } else if (chg < 0) {
          div.classList.add("secret-down");
        }

        const changeValText = Math.abs(chg).toFixed(2);
        const alignment = chg >= 0 ? "left" : "right";
        
        div.style.display = "flex";
        div.style.justifyContent = alignment === "left" ? "flex-start" : "flex-end";
        div.style.alignItems = "center";
        div.style.minWidth = "60px";
        div.style.maxWidth = "60px";
        
        div.innerHTML = `
          <div class="noti-info stock-info" style="width: 100%; margin-top: 0; justify-content: ${alignment === "left" ? "flex-start" : "flex-end"};">
            <span class="stock-change" style="color: #94a3b8; font-family: 'JetBrains Mono'; font-weight: bold;">${changeValText}</span>
          </div>
        `;
      } else {
        const price = (n.currentPrice || n.basePrice || 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
        const chgClass = chg > 0 ? "up" : chg < 0 ? "down" : "same";
        
        div.style.display = "";
        div.style.justifyContent = "";
        div.style.alignItems = "";
        div.style.minWidth = "";
        div.style.maxWidth = "";

        div.innerHTML = `
          <div class="title" style="color: var(--accent-color);">${n.name}</div>
          <div class="noti-info stock-info">
            <span class="stock-price ${chgClass}">${price}</span>
            <span class="remaining stock-change ${chgClass}">${sign}${chg.toFixed(2)}%</span>
          </div>
        `;
      }
      
      div.onclick = (e) => {
        if (this.isSecretMode) {
          e.stopPropagation();
          return;
        }
        if (window.utils && utils.closeAllUIPopups) utils.closeAllUIPopups(true);
        e.stopPropagation();
        this.toggleDetail(String(n.id), div);
      };

      div.oncontextmenu = (e) => {
          if (window.showContextMenu) {
              e.preventDefault();
              showContextMenu(e, 'stock', n.id);
          }
      };

      div.onmouseenter = (e) => {
        if (this.isSecretMode && window.utils && utils.showValidationTip) {
          const type = chg > 0 ? "up" : chg < 0 ? "down" : "same";
          utils.showValidationTip(div, n.name, type, { noAutoHide: true });
        }
      };

      div.onmouseleave = (e) => {
        if (window.utils && utils.hideValidationTip) {
          utils.hideValidationTip();
        }
      };

      listContainer.appendChild(div);
    });
    
    setTimeout(() => this.updateScrollArrows(), 150);
  },
  
  toggleDetail(id, targetEl) {
    const popup = document.getElementById("global-stock-detail");
    if (!popup) return;

    const idStr = String(id);
    const isShowing = popup.style.display === 'block';
    const currentId = popup.dataset.currentId;

    if (isShowing && currentId === idStr) {
        this.closeDetailPopup();
        return;
    }

    this.renderDetail(idStr, popup);
    popup.dataset.currentId = idStr;
    
    const rect = targetEl.getBoundingClientRect();
    
    // Show instantly
    popup.style.display = 'block';
    const h = popup.offsetHeight;
    popup.style.left = (rect.left + rect.width / 2 - 125) + "px";
    popup.style.top = (rect.top - h - 10) + "px";
    
    popup.classList.add('show');
    this.updatePrices();
  },
  
  renderDetail(id, container) {
    const item = this.items.find(i => String(i.id) === String(id));
    if (!item) return;

    const currentPrice = item.currentPrice || 0;
    const change = item.change || 0;
    const changePercent = item.changePercent || 0;
    const chgClass = change > 0 ? "up" : change < 0 ? "down" : "same";
    
    const changeText = (change >= 0 ? "+" : "") + change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const percentText = (changePercent >= 0 ? "+" : "") + changePercent.toFixed(2);

    const statusMap = {
      OPEN: { text: window.i18n ? i18n.get("marketOpen") : "장중", style: "background: #fcd34d; color: #000;" },
      CLOSE: { text: window.i18n ? i18n.get("marketClosed") : "장종료", style: "background: #374151; color: #fff;" }
    };
    const defaultStatus = { text: window.i18n ? i18n.get("marketClosed") : "장종료", style: "background: #374151; color: #fff;" };
    const marketStatus = statusMap[item.marketStatus] || defaultStatus;
    const statusIndicator = `<div style="font-size: 0.7rem; padding: 3px 8px; border-radius: 6px; font-weight: 600; ${marketStatus.style}">${marketStatus.text}</div>`;

    const code = item.code || "N/A";
    const open = item.open ? item.open.toLocaleString() : "-";
    const high = item.high ? item.high.toLocaleString() : "-";
    const low = item.low ? item.low.toLocaleString() : "-";
    const tradingVal = item.tradingValue ? this.formatTradingValue(item.tradingValue, item) : "-";
    
    const ftwHigh = item.fiftyTwoWeekHigh ? item.fiftyTwoWeekHigh.toLocaleString() : "-";
    const ftwLow = item.fiftyTwoWeekLow ? item.fiftyTwoWeekLow.toLocaleString() : "-";

    const label52H = window.i18n ? i18n.get("lbl52WeekHigh") : "52주 최고";
    const label52L = window.i18n ? i18n.get("lbl52WeekLow") : "52주 최저";
    const labelOpen = window.i18n ? i18n.get("lblOpenPrice") : "시가";
    const labelHigh = window.i18n ? i18n.get("lblHighPrice") : "고가";
    const labelLow = window.i18n ? i18n.get("lblLowPrice") : "저가";
    const labelTrade = window.i18n ? i18n.get("lblTradingValue") : "거래대금";
    const labelChart = window.i18n ? i18n.get("lblDailyChart") : "일봉 차트";

    const ftwHighHTML = item.fiftyTwoWeekHigh ? `<div style="display: flex; justify-content: space-between;"><span>${label52H}</span><span style="color: #ef4444;">${ftwHigh}</span></div>` : '';
    const ftwLowHTML = item.fiftyTwoWeekLow ? `<div style="display: flex; justify-content: space-between;"><span>${label52L}</span><span style="color: #3b82f6;">${ftwLow}</span></div>` : '';

    const chartId = `stock-chart-${id}`;

    container.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
        <span>${item.name} <span style="font-size: 0.7rem; color: #94a3b8; font-weight: normal;">${code}</span></span>
        <span class="stock-price ${chgClass}" style="font-size: 1.1rem;">${currentPrice.toLocaleString()}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        ${statusIndicator}
        <div class="stock-change ${chgClass}" style="text-align: right; font-family: 'JetBrains Mono'; font-size: 0.8rem;">
          ${changeText} (${percentText}%)
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 15px; font-size: 0.75rem; color: #94a3b8; margin-bottom: 12px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between;"><span>${labelOpen}</span><span style="color: #fff;">${open}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>${labelHigh}</span><span style="color: #ef4444;">${high}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>${labelTrade}</span><span style="color: #fff;">${tradingVal}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>${labelLow}</span><span style="color: #3b82f6;">${low}</span></div>
        ${ftwHighHTML}
        ${ftwLowHTML}
      </div>
      
      <div style="margin-top: 8px; font-size: 0.7rem; color: #94a3b8; text-align: center; margin-bottom: 8px;">${labelChart}</div>
      <div style="display: flex; height: 120px; gap: 5px; position: relative; padding-left: 45px;">
        <div id="chart-y-axis" style="position: absolute; left: 0; top: 5px; bottom: 5px; width: 40px; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.6rem; color: #64748b; border-right: 1px solid rgba(255,255,255,0.05); padding-right: 5px; text-align: right;"></div>
        <div id="${chartId}" style="flex: 1; background: rgba(255,255,255,0.02); border-radius: 4px; display: flex; align-items: flex-end; padding: 5px; gap: 2px; position: relative;"></div>
      </div>
    `;

    this.fetchCandles(id);
  },

  formatTradingValue(val, item = null) {
    const numVal = parseFloat(val);
    if (isNaN(numVal) || numVal <= 0) return "-";

    const lang = window.i18n ? i18n.userLang : "en";

    const formatDecimal = (v, precision) => {
      const formatted = v.toFixed(precision);
      let clean = formatted;
      if (clean.includes('.')) {
        while (clean.endsWith('0')) {
          clean = clean.slice(0, -1);
        }
        if (clean.endsWith('.')) {
          clean = clean.slice(0, -1);
        }
      }
      return clean;
    };

    if (lang === "ko") {
      if (numVal >= 1e12) return formatDecimal(numVal / 1e12, 1) + "조";
      if (numVal >= 1e8) return formatDecimal(numVal / 1e8, 1) + "억";
      if (numVal >= 1e4) return formatDecimal(numVal / 1e4, 1) + "만";
      return numVal.toLocaleString();
    } else if (lang === "ja") {
      if (numVal >= 1e12) return formatDecimal(numVal / 1e12, 1) + "兆";
      if (numVal >= 1e8) return formatDecimal(numVal / 1e8, 1) + "億";
      if (numVal >= 1e4) return formatDecimal(numVal / 1e4, 1) + "万";
      return numVal.toLocaleString();
    } else if (lang === "zh-CN") {
      if (numVal >= 1e12) return formatDecimal(numVal / 1e12, 1) + "兆";
      if (numVal >= 1e8) return formatDecimal(numVal / 1e8, 1) + "亿";
      if (numVal >= 1e4) return formatDecimal(numVal / 1e4, 1) + "万";
      return numVal.toLocaleString();
    } else if (lang === "zh-TW") {
      if (numVal >= 1e12) return formatDecimal(numVal / 1e12, 1) + "兆";
      if (numVal >= 1e8) return formatDecimal(numVal / 1e8, 1) + "億";
      if (numVal >= 1e4) return formatDecimal(numVal / 1e4, 1) + "萬";
      return numVal.toLocaleString();
    } else {
      if (numVal >= 1e12) return formatDecimal(numVal / 1e12, 2) + "T";
      if (numVal >= 1e9) return formatDecimal(numVal / 1e9, 2) + "B";
      if (numVal >= 1e6) return formatDecimal(numVal / 1e6, 2) + "M";
      if (numVal >= 1e3) return formatDecimal(numVal / 1e3, 2) + "K";
      return numVal.toLocaleString();
    }
  },

  async fetchCandles(id) {
    const item = this.items.find(i => String(i.id) === String(id));
    if (!item) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    
    if (item.cachedCandles && item.cachedCandles.length > 0) {
        const lastCandle = item.cachedCandles[item.cachedCandles.length - 1];
        if (lastCandle.time === todayStr) {
            this.renderChart(id, item.cachedCandles);
            return;
        }
    }

    try {
        const res = await fetch(`stock_proxy.php?type=candle&codes=${item.code}`);
        const data = await res.json();
        if (data.success && data.candles && data.candles.length > 0) {
            item.cachedCandles = data.candles;
            this.renderChart(id, data.candles);
        } else {
            this.renderAlternativeInfo(id);
        }
    } catch (e) {
        console.error("Candle fetch error:", e);
        this.renderAlternativeInfo(id);
    }
  },

  renderChart(id, candles) {
    const chartId = `stock-chart-${id}`;
    const container = document.getElementById(chartId);
    const yAxis = document.getElementById("chart-y-axis");
    if (!container || !candles || candles.length === 0) {
      if(container) container.innerHTML = '';
      if(yAxis) yAxis.innerHTML = '';
      return;
    }

    const prices = candles.flatMap(c => [c.high, c.low]);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const range = max - min || 1;

    if (yAxis) {
        yAxis.innerHTML = `
            <span>${max.toLocaleString()}</span>
            <span style="opacity:0.5">${(min + range/2).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
            <span>${min.toLocaleString()}</span>
        `;
    }

    container.innerHTML = '';
    container.style.gap = "2px";
    
    candles.forEach((c) => {
        const isUp = c.close >= c.open;
        const color = isUp ? '#ef4444' : '#3b82f6';
        
        const candleWrap = document.createElement("div");
        candleWrap.style.cssText = "flex: 1; height: 100%; position: relative; display: flex; flex-direction: column; align-items: center;";
        
        const wick = document.createElement("div");
        const wickTop = ((max - c.high) / range) * 100;
        const wickHeight = ((c.high - c.low) / range) * 100;
        wick.style.cssText = `position: absolute; top: ${wickTop}%; width: 1px; height: ${wickHeight}%; background: ${color}; opacity: 0.6;`;
        
        const body = document.createElement("div");
        const bodyTop = ((max - Math.max(c.open, c.close)) / range) * 100;
        const bodyHeight = (Math.abs(c.open - c.close) / range) * 100;
        body.style.cssText = `position: absolute; top: ${bodyTop}%; width: 100%; height: ${Math.max(1, bodyHeight)}%; background: ${color}; border-radius: 1px;`;
        
        candleWrap.appendChild(wick);
        candleWrap.appendChild(body);
        container.appendChild(candleWrap);
    });
  },

  renderAlternativeInfo(id) {
    const chartId = `stock-chart-${id}`;
    const container = document.getElementById(chartId);
    if (container) container.innerHTML = '';
    const yAxis = document.getElementById("chart-y-axis");
    if (yAxis) yAxis.innerHTML = "";
  },

  handleSearchInput(val) {
    val = val.trim();
    const resultsContainer = document.getElementById("stockSearchResults");
    if (!val || val.length < 2) {
      this.closeSearchResults();
      return;
    }

    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (this.searchAbortController) this.searchAbortController.abort();
    
    this.searchTimeout = setTimeout(async () => {
        this.searchAbortController = new AbortController();
        try {
            const res = await fetch(`stock_proxy.php?type=search&keyword=${encodeURIComponent(val)}`, {
                signal: this.searchAbortController.signal
            });
            const data = await res.json();
            
            if (data.success && data.results && data.results.length > 0) {
                resultsContainer.innerHTML = "";
                const list = document.createElement("div");
                list.className = "popup-list-area";
                data.results.forEach(m => {
                    const item = document.createElement("div");
                    item.className = "engine-item";
                    item.style.padding = "10px 15px";
                    item.innerHTML = `<span>${m.name}</span> <span style="font-size:0.75rem; color:#94a3b8; float:right;">${m.code} (${m.nation})</span>`;
                    item.onclick = () => {
                        this.selectStock(m);
                    };
                    list.appendChild(item);
                });
                resultsContainer.appendChild(list);
                resultsContainer.style.display = "block";
            } else {
                this.closeSearchResults();
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.error("Search error:", e);
        }
    }, 300);
  },
  
  closeSearchResults() {
    const el = document.getElementById("stockSearchResults");
    if (el) {
      el.style.display = "none";
      el.innerHTML = "";
    }
  },


  scroll(dir) {
    const list = document.getElementById("stock-list");
    if (!list) return;
    const scrollAmount = 150;
    list.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
    setTimeout(() => this.updateScrollArrows(), 300);
  },
  
  updateScrollArrows() {
    const list = document.getElementById("stock-list");
    const leftBtn = document.getElementById("stock-scroll-left");
    const rightBtn = document.getElementById("stock-scroll-right");
    if (!list || !leftBtn || !rightBtn) return;
    
    if (list.scrollWidth > list.clientWidth + 2) {
      leftBtn.classList.add('show');
      rightBtn.classList.add('show');
      
      if (list.scrollLeft <= 0) {
        leftBtn.classList.add("disabled");
      } else {
        leftBtn.classList.remove("disabled");
      }
      
      if (list.scrollLeft + list.clientWidth >= list.scrollWidth - 2) {
        rightBtn.classList.add("disabled");
      } else {
        rightBtn.classList.remove("disabled");
      }
    } else {
      leftBtn.classList.remove('show');
      rightBtn.classList.remove('show');
    }
  },
  
  openModal(id = null) {
    const modal = document.getElementById("stockModal");
    if (!modal) return;
    
    window.currentEditStockId = id;
    const delBtn = document.getElementById("stockDelBtn");
    const input = document.getElementById("stockSearchInput");
    
    if (id !== null) {
      const item = this.items.find(i => String(i.id) === String(id));
      if (item) {
        input.value = item.name;
      }
      delBtn.style.display = "block";
    } else {
      input.value = "";
      delBtn.style.display = "none";
    }
    
    this.closeSearchResults();
    
    if (window.utils && utils.openModal) {
      utils.openModal("stockModal");
    } else if (window.openModal) {
      window.openModal("stockModal");
    } else {
      modal.style.display = "flex";
      modal.offsetHeight;
      modal.classList.add("show");
    }
    setTimeout(() => input.focus(), 100);
  },
  
  selectStock(stockData) {
    this.closeSearchResults();
    const input = document.getElementById("stockSearchInput");
    if (input) input.value = stockData.name;
    
    if (window.currentEditStockId !== null && window.currentEditStockId !== undefined) {
      const idx = this.items.findIndex(i => String(i.id) === String(window.currentEditStockId));
      if (idx !== -1) {
        this.items[idx].name = stockData.name;
        this.items[idx].code = stockData.code;
        this.items[idx].nation = stockData.nation;
        this.items[idx].cachedCandles = null;
      }
    } else {
      const newStock = {
        id: Date.now(),
        name: stockData.name,
        code: stockData.code,
        nation: stockData.nation,
      };
      this.items.push(newStock);
    }
    
    this.saveData();
    this.render();
    this.startInterval();
    if (window.closeModal) window.closeModal('stockModal');
  },
  
  deleteItem(id) {
    this.items = this.items.filter(i => String(i.id) !== String(id));
    this.saveData();
    this.render();
    if (this.items.length === 0 && this.intervalId) clearInterval(this.intervalId);
    if (window.utils && utils.closeModal) {
      utils.closeModal('stockModal');
    } else if (window.openModal) {
      window.closeModal('stockModal');
    }
  }
};

window.stock = stock;
