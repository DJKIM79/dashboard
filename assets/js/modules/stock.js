// 260527 FINAL STABLE VERSION - FIXED CREATION LOGIC
const stock = {
  items: JSON.parse(localStorage.getItem("dj_stocks")) || [],
  isSecretMode: localStorage.getItem("dj_stock_secret_mode") === "true",
  updateInterval: parseInt(localStorage.getItem("dj_stock_interval") || 10) * 1000,
  intervalId: null,
  nextOpenTimeoutId: null,
  stockCodes: [], 
  isLoadingCodes: false,
  searchTimeout: null,
  searchAbortController: null,
  tooltipTimeout: null,
  tooltipHideTimeout: null,
  isDragging: false,
  sortableInstance: null,
  
  isSupported() {
    const lang = localStorage.getItem("dj_language") || "auto";
    const actualLang = (lang === "auto") ? (window.i18n ? i18n.userLang : "en") : lang;
    const supported = ["ko", "en", "ja", "zh-CN", "zh-TW"];
    return supported.includes(actualLang);
  },

  formatPrice(val, item) {
    if (val === undefined || val === null || isNaN(val)) return "-";
    const isUS = item && (item.nation === "미국" || (item.code && (item.code.endsWith('.O') || item.code.endsWith('.N') || item.code.endsWith('.A'))));
    if (isUS) {
      return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (val % 1 !== 0) {
      return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },

  getCurrency(item) {
    if (!item) return "KRW";
    const code = item.code || "";
    const nation = item.nation || "";

    if (nation === "미국" || code.endsWith(".O") || code.endsWith(".N") || code.endsWith(".A")) {
      return "USD";
    }
    if (nation === "일본" || code.endsWith(".T")) {
      return "JPY";
    }
    if (nation === "중국" || code.endsWith(".SS") || code.endsWith(".SZ")) {
      return "CNY";
    }
    if (nation === "홍콩" || code.endsWith(".HK")) {
      return "HKD";
    }
    if (nation === "대만" || code.endsWith(".TW")) {
      return "TWD";
    }
    return "KRW";
  },

  getCurrencySymbol(currency) {
    const symbols = {
      "USD": "$",
      "KRW": "₩",
      "JPY": "¥",
      "CNY": "¥",
      "HKD": "$",
      "TWD": "$"
    };
    return symbols[currency] || currency;
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
    }, true);
    
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
    if (!popup || popup.style.display === 'none') return;
    
    popup.classList.remove('show');
    
    // Wait for transition to finish (0.25s as defined in CSS)
    setTimeout(() => {
      if (!popup.classList.contains('show')) {
        popup.style.display = 'none';
        popup.dataset.currentId = '';
      }
    }, 250);
  },
  
  toggleSecretMode() {
    const menu = document.getElementById("globalContextMenu");
    let id = undefined;
    if (menu && menu.dataset.type === "stock") {
      id = menu.dataset.id;
    }

    if (!id) return;

    const item = this.items.find(x => String(x.id) === String(id));
    if (!item) return;

    const currentMode = item.isSecretMode !== undefined ? item.isSecretMode : this.isSecretMode;
    item.isSecretMode = !currentMode;
    this.saveData();

    if (window.utils && utils.hideValidationTip) {
      utils.hideValidationTip();
    }

    const list = document.getElementById("stock-list");
    if (!list) return;

    const card = list.querySelector(`.stock-card[data-id="${id}"]`);
    if (card) {
      if (item.isSecretMode) {
        card.classList.add("secret");
      } else {
        card.classList.remove("secret");
      }
      this.updateDOM();
    } else {
      this.render();
    }
  },
  
  updateIntervalSetting(seconds) {
    this.updateInterval = seconds * 1000;
    this.startInterval();
  },
  
  isMarketOpenNow(item, now = new Date()) {
    const day = now.getDay();
    if (day === 0 || day === 6) return false; // Weekend closed

    const currency = this.getCurrency(item);
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeNum = hours * 100 + minutes;

    if (currency === "KRW") {
      return timeNum >= 900 && timeNum <= 1530;
    }
    if (currency === "JPY") {
      return timeNum >= 900 && timeNum <= 1500;
    }
    if (currency === "CNY" || currency === "HKD" || currency === "TWD") {
      return timeNum >= 1000 && timeNum <= 1700;
    }
    if (currency === "USD") {
      return timeNum >= 2200 || timeNum <= 600;
    }
    return false;
  },

  getNextMarketOpenMs(item, now = new Date()) {
    const currency = this.getCurrency(item);
    let targetDay = new Date(now);
    
    let targetHour = 9;
    let targetMin = 0;

    if (currency === "KRW" || currency === "JPY") {
      targetHour = 9;
      targetMin = 0;
    } else if (currency === "CNY" || currency === "HKD" || currency === "TWD") {
      targetHour = 10;
      targetMin = 0;
    } else if (currency === "USD") {
      targetHour = 22;
      targetMin = 0;
    }

    targetDay.setHours(targetHour, targetMin, 0, 0);

    if (targetDay.getTime() <= now.getTime()) {
      targetDay.setDate(targetDay.getDate() + 1);
    }

    while (targetDay.getDay() === 0 || targetDay.getDay() === 6) {
      targetDay.setDate(targetDay.getDate() + 1);
    }

    return targetDay.getTime() - now.getTime();
  },

  startInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.nextOpenTimeoutId) {
      clearTimeout(this.nextOpenTimeoutId);
      this.nextOpenTimeoutId = null;
    }
    if (this.items.length === 0 || !this.isSupported()) return;

    this.updatePrices();

    const scheduleNext = () => {
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      if (this.nextOpenTimeoutId) {
        clearTimeout(this.nextOpenTimeoutId);
        this.nextOpenTimeoutId = null;
      }
      
      const now = new Date();
      const hasOpenMarket = this.items.some(item => this.isMarketOpenNow(item, now));

      if (hasOpenMarket) {
        this.intervalId = setInterval(async () => {
          const prevHasOpenMarket = this.items.some(item => this.isMarketOpenNow(item));
          await this.updatePrices();
          const nextHasOpenMarket = this.items.some(item => this.isMarketOpenNow(item));

          if (prevHasOpenMarket !== nextHasOpenMarket) {
            scheduleNext();
          }
        }, this.updateInterval);
      } else {
        console.log("All stock markets closed. Scheduling next open time and running slow sync (30m).");

        this.intervalId = setInterval(() => {
          this.updatePrices().then(() => {
            const currentHasOpenMarket = this.items.some(item => this.isMarketOpenNow(item));
            if (currentHasOpenMarket) {
              scheduleNext();
            }
          });
        }, 1800000); // 30 minutes

        const delays = this.items.map(item => this.getNextMarketOpenMs(item, now));
        const nextOpenDelay = Math.min(...delays);

        this.nextOpenTimeoutId = setTimeout(() => {
          this.startInterval();
        }, nextOpenDelay);
      }
    };

    scheduleNext();
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
            window.isApplyingSyncData = true;
            this.saveData();
            window.isApplyingSyncData = false;
            this.updateDOM();

            const popup = document.getElementById("global-stock-detail");
            if (popup && popup.style.display === 'block' && popup.dataset.currentId) {
                this.renderDetail(popup.dataset.currentId, popup, true);
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
      if (this.isDragging) return; // Wait until drag ends to fix count mismatch
      this.render();
      return;
    }

    // Mismatch detection
    for (let idx = 0; idx < this.items.length; idx++) {
      const n = this.items[idx];
      const div = cards[idx];
      if (!div || div.dataset.id !== String(n.id)) {
        if (this.isDragging) return; // Don't re-render while user is moving items
        this.render();
        return;
      }
    }

    this.items.forEach((n, idx) => {
      const div = cards[idx];
      const chg = n.changePercent || 0;
      const sign = chg >= 0 ? "+" : "";
      const chgClass = chg > 0 ? "up" : chg < 0 ? "down" : "same";

      div.classList.remove("up", "down", "same", "secret-up", "secret-down", "secret-same");

      const isItemSecretMode = n.isSecretMode !== undefined ? n.isSecretMode : this.isSecretMode;
      if (isItemSecretMode) {
        div.classList.add(`secret-${chgClass}`);
        div.classList.add("secret");
      } else {
        div.classList.add(chgClass);
        div.classList.remove("secret");
      }

      // Update Secret View
      const valView = div.querySelector(".stock-secret-view .val-view");
      const percentView = div.querySelector(".stock-secret-view .percent-view");
      if (valView) {
        valView.innerText = this.formatPrice(Math.abs(n.change || 0), n);
      }
      if (percentView) {
        percentView.innerText = Math.abs(chg).toFixed(2);
      }

      // Update Expanded View
      const price = this.formatPrice(n.currentPrice || n.basePrice || 0, n);
      const priceEl = div.querySelector(".stock-expanded-view .stock-price");
      if (priceEl) {
        priceEl.className = `stock-price ${chgClass}`;
        priceEl.innerText = price;
      }

      const expandedChangeEl = div.querySelector(".stock-expanded-view .stock-change");
      if (expandedChangeEl) {
        expandedChangeEl.className = `remaining stock-change ${chgClass}`;
        expandedChangeEl.innerText = `${sign}${chg.toFixed(2)}%`;
      }
    });
  },
  
  saveData() {
    localStorage.setItem("dj_stocks", JSON.stringify(this.items));
    if (window.settings && typeof settings.syncToServer === "function") {
      settings.syncToServer();
    }
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
      const chgClass = chg > 0 ? "up" : chg < 0 ? "down" : "same";

      const isItemSecretMode = n.isSecretMode !== undefined ? n.isSecretMode : this.isSecretMode;
      if (isItemSecretMode) {
        div.classList.add("secret");
        div.classList.add(`secret-${chgClass}`);
      } else {
        div.classList.add(chgClass);
      }

      const price = this.formatPrice(n.currentPrice || n.basePrice || 0, n);
      const isShowVal = n.secretDisplayType === "val";
      const changeValText = isShowVal 
        ? this.formatPrice(Math.abs(n.change || 0), n)
        : Math.abs(chg).toFixed(2);

      div.innerHTML = `
        <div class="stock-expanded-view">
          <div class="title" style="color: var(--accent-color);">${n.name}</div>
          <div class="noti-info stock-info">
            <span class="stock-price ${chgClass}">${price}</span>
            <span class="remaining stock-change ${chgClass}">${sign}${chg.toFixed(2)}%</span>
          </div>
        </div>
        <div class="stock-secret-view">
          <div class="noti-info stock-info">
            <div class="stock-digit-group">
              <div class="stock-digit-strip" style="transform: translateY(${n.secretDisplayType === "val" ? "0px" : "-24px"})">
                <div class="stock-digit"><span class="stock-change val-view">${this.formatPrice(Math.abs(n.change || 0), n)}</span></div>
                <div class="stock-digit"><span class="stock-change percent-view">${Math.abs(chg).toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      div.onclick = (e) => {
        if (this.isDragging) {
          this.isDragging = false;
          e.stopPropagation();
          return;
        }
        const isItemSecretMode = n.isSecretMode !== undefined ? n.isSecretMode : this.isSecretMode;
        if (isItemSecretMode) {
          e.stopPropagation();
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          if (this.tooltipHideTimeout) clearTimeout(this.tooltipHideTimeout);
          if (window.utils && utils.hideValidationTip) {
            utils.hideValidationTip();
          }
          n.secretDisplayType = n.secretDisplayType === "val" ? "percent" : "val";
          this.saveData();
          
          const strip = div.querySelector(".stock-digit-strip");
          if (strip) {
            strip.style.transform = `translateY(${n.secretDisplayType === "val" ? "0px" : "-24px"})`;
          }
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
        if (this.isDragging) return;
        const isItemSecretMode = n.isSecretMode !== undefined ? n.isSecretMode : this.isSecretMode;
        if (isItemSecretMode && window.utils && utils.showValidationTip) {
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          if (this.tooltipHideTimeout) clearTimeout(this.tooltipHideTimeout);

          this.tooltipTimeout = setTimeout(() => {
            if (this.isDragging) return;
            const currentItem = this.items.find(item => String(item.id) === div.dataset.id);
            const currentChg = currentItem ? (currentItem.changePercent || 0) : 0;
            const type = currentChg > 0 ? "up" : currentChg < 0 ? "down" : "same";
            
            const isShowVal = currentItem ? (currentItem.secretDisplayType === "val") : (n.secretDisplayType === "val");
            let unit = "%";
            if (isShowVal) {
              const currency = this.getCurrency(currentItem || n);
              unit = this.getCurrencySymbol(currency);
            }
            
            const unitStyle = type === "same"
              ? "background: rgba(0, 0, 0, 0.12); border: 1px solid rgba(0, 0, 0, 0.2); color: #000;"
              : "background: rgba(255, 255, 255, 0.35); border: 1px solid rgba(255, 255, 255, 0.45); color: #fff;";
            const unitHtml = `<span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 6px; font-weight: 800; ${unitStyle} margin-left: 6px; display: inline-block; line-height: 1; vertical-align: middle;">${unit}</span>`;
            const name = currentItem ? currentItem.name : n.name;
            const message = `${name}${unitHtml}`;

            utils.showValidationTip(div, message, type, { noAutoHide: true, isHtml: true });

            this.tooltipHideTimeout = setTimeout(() => {
              if (window.utils && utils.hideValidationTip) utils.hideValidationTip();
            }, 1500);
          }, 1000);
        }
      };

      div.onmouseleave = (e) => {
        if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
        if (this.tooltipHideTimeout) clearTimeout(this.tooltipHideTimeout);
        if (window.utils && utils.hideValidationTip) {
          utils.hideValidationTip();
        }
      };

      listContainer.appendChild(div);
    });

    if (window.Sortable && listContainer) {
      if (this.sortableInstance) {
        this.sortableInstance.destroy();
      }
      this.sortableInstance = new Sortable(listContainer, {
        animation: 250,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        ghostClass: "stock-ghost",
        chosenClass: "sortable-chosen",
        onStart: () => {
          this.isDragging = true;
          listContainer.classList.add("sorting-active");
          const ctxMenu = document.getElementById("globalContextMenu");
          if (ctxMenu) ctxMenu.style.display = "none";
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          if (this.tooltipHideTimeout) clearTimeout(this.tooltipHideTimeout);
          if (window.utils && utils.hideValidationTip) {
            utils.hideValidationTip();
          }
        },
        onEnd: (evt) => {
          setTimeout(() => (this.isDragging = false), 100);
          listContainer.classList.remove("sorting-active");
          this.updateOrderFromDOM();
        },
      });
    }
    
    setTimeout(() => this.updateScrollArrows(), 150);
  },

  updateOrderFromDOM() {
    const listContainer = document.getElementById("stock-list");
    if (!listContainer) return;
    const newItems = [];
    listContainer.querySelectorAll('.stock-card').forEach(el => {
      const id = el.dataset.id;
      const item = this.items.find(n => String(n.id) === String(id));
      if (item) newItems.push(item);
    });
    if (newItems.length === this.items.length) {
      this.items = newItems;
      this.saveData();
      this.render();
    }
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

    this.renderDetail(idStr, popup, false);
    popup.dataset.currentId = idStr;
    
    const rect = targetEl.getBoundingClientRect();
    
    // Position calculation
    const popupWidth = 250; // Defined in CSS/init
    const left = (rect.left + rect.width / 2 - popupWidth / 2);
    
    // If popup is already showing, just move it (keeps the transition animation)
    // If popup is hidden, move it instantly without transition before showing
    if (!isShowing) {
        popup.style.transition = 'none';
        popup.style.display = 'block';
        popup.style.left = left + "px";
        
        // Use a small timeout or force reflow to get correct height
        const h = popup.offsetHeight;
        popup.style.top = (rect.top - h - 10) + "px";
        
        // Force reflow to apply 'transition: none' and position
        popup.offsetHeight;
        
        // Restore transition and show
        popup.style.transition = '';
    } else {
        popup.style.left = left + "px";
        const h = popup.offsetHeight;
        popup.style.top = (rect.top - h - 10) + "px";
    }
    
    popup.classList.add('show');
    this.updatePrices();
  },
  
  renderDetail(id, container, isUpdate = false) {
    const item = this.items.find(i => String(i.id) === String(id));
    if (!item) return;

    const currentPrice = item.currentPrice || 0;
    const change = item.change || 0;
    const changePercent = item.changePercent || 0;
    const chgClass = change > 0 ? "up" : change < 0 ? "down" : "same";
    
    const changeText = (change >= 0 ? "+" : "") + this.formatPrice(change, item);
    const percentText = (changePercent >= 0 ? "+" : "") + changePercent.toFixed(2);

    const statusMap = {
      OPEN: { text: window.i18n ? i18n.get("marketOpen") : "장중", style: "background: #fcd34d; color: #000;" },
      CLOSE: { text: window.i18n ? i18n.get("marketClosed") : "장종료", style: "background: #374151; color: #fff;" }
    };
    const defaultStatus = { text: window.i18n ? i18n.get("marketClosed") : "장종료", style: "background: #374151; color: #fff;" };
    const marketStatus = statusMap[item.marketStatus] || defaultStatus;

    if (isUpdate) {
      // 10s interval background update: refresh values without rebuilding DOM (prevents chart flickering)
      const priceEl = container.querySelector(".detail-price-val");
      const changeEl = container.querySelector(".detail-change-val");
      const statusEl = container.querySelector(".detail-status-val");

      if (priceEl) {
        priceEl.className = `stock-price ${chgClass} detail-price-val`;
        priceEl.innerText = this.formatPrice(currentPrice, item);
      }
      if (changeEl) {
        changeEl.className = `stock-change ${chgClass} detail-change-val`;
        changeEl.innerText = `${changeText} (${percentText}%)`;
      }
      if (statusEl) {
        statusEl.innerText = marketStatus.text;
        statusEl.style.cssText = `font-size: 0.7rem; padding: 3px 8px; border-radius: 6px; font-weight: 600; ${marketStatus.style}`;
      }
      
      const prevValEl = container.querySelector(".detail-prev-val");
      const highValEl = container.querySelector(".detail-high-val");
      const lowValEl = container.querySelector(".detail-low-val");
      const tradeValEl = container.querySelector(".detail-trade-val");

      if (prevValEl) prevValEl.innerText = item.basePrice ? this.formatPrice(item.basePrice, item) : "-";
      if (highValEl) {
        highValEl.innerText = item.high ? this.formatPrice(item.high, item) : "-";
        highValEl.style.color = item.high ? "#ef4444" : "#fff";
      }
      if (lowValEl) {
        lowValEl.innerText = item.low ? this.formatPrice(item.low, item) : "-";
        lowValEl.style.color = item.low ? "#3b82f6" : "#fff";
      }
      if (tradeValEl) tradeValEl.innerText = item.tradingValue ? this.formatTradingValue(item.tradingValue, item) : "-";

      // Also refresh candles if needed (fetchCandles has its own 30m check)
      this.fetchCandles(id);
      return;
    }

    const currency = this.getCurrencySymbol(this.getCurrency(item));
    const currencyIndicator = `<div class="detail-currency-val" style="font-size: 0.75rem; padding: 2px 6px; border-radius: 6px; font-weight: 800; background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.3); color: #94a3b8; margin-left: 6px; display: inline-block;">${currency}</div>`;
    const statusIndicator = `
      <div style="display: flex; align-items: center;">
        <div class="detail-status-val" style="font-size: 0.7rem; padding: 3px 8px; border-radius: 6px; font-weight: 600; ${marketStatus.style}">${marketStatus.text}</div>
        ${currencyIndicator}
      </div>
    `;

    const code = item.code || "N/A";
    const prevClose = item.basePrice ? this.formatPrice(item.basePrice, item) : "-";
    const high = item.high ? this.formatPrice(item.high, item) : "-";
    const low = item.low ? this.formatPrice(item.low, item) : "-";
    const tradingVal = item.tradingValue ? this.formatTradingValue(item.tradingValue, item) : "-";
    
    const ftwHigh = item.fiftyTwoWeekHigh ? this.formatPrice(item.fiftyTwoWeekHigh, item) : "-";
    const ftwLow = item.fiftyTwoWeekLow ? this.formatPrice(item.fiftyTwoWeekLow, item) : "-";

    const label52H = window.i18n ? i18n.get("lbl52WeekHighShort") : "52주 ▲";
    const label52L = window.i18n ? i18n.get("lbl52WeekLowShort") : "52주 ▼";
    const labelPrev = "전일";
    const labelHigh = window.i18n ? i18n.get("lblHighPrice") : "고가";
    const labelLow = window.i18n ? i18n.get("lblLowPrice") : "저가";
    const labelTrade = "거래";
    const labelChart = window.i18n ? i18n.get("lblDailyChart") : "일봉 차트";

    const ftwHighHTML = item.fiftyTwoWeekHigh ? `<div style="display: flex; justify-content: space-between;"><span>${label52H}</span><span style="color: #ef4444;">${ftwHigh}</span></div>` : '';
    const ftwLowHTML = item.fiftyTwoWeekLow ? `<div style="display: flex; justify-content: space-between;"><span>${label52L}</span><span style="color: #3b82f6;">${ftwLow}</span></div>` : '';

    const chartId = `stock-chart-${id}`;

    container.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
        <span>${item.name} <span style="font-size: 0.7rem; color: #94a3b8; font-weight: normal;">${code}</span></span>
        <span class="stock-price ${chgClass} detail-price-val" style="font-size: 1.1rem;">${this.formatPrice(currentPrice, item)}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        ${statusIndicator}
        <div class="stock-change ${chgClass} detail-change-val" style="text-align: right; font-family: 'JetBrains Mono'; font-size: 0.8rem;">
          ${changeText} (${percentText}%)
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 15px; font-size: 0.75rem; color: #94a3b8; margin-bottom: 12px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between;"><span>${labelPrev}</span><span class="detail-prev-val" style="color: #fff;">${prevClose}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>${labelTrade}</span><span class="detail-trade-val" style="color: #fff;">${tradingVal}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>${labelHigh}</span><span class="detail-high-val" style="color: #ef4444;">${high}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>${labelLow}</span><span class="detail-low-val" style="color: #3b82f6;">${low}</span></div>
        ${ftwHighHTML}
        ${ftwLowHTML}
      </div>
      
      <div style="margin-top: 8px; font-size: 0.7rem; color: #94a3b8; text-align: center; margin-bottom: 8px;">${labelChart}</div>
      <div style="display: flex; height: 120px; gap: 5px; position: relative; padding-left: 45px;">
        <div id="chart-y-axis" style="position: absolute; left: 0; top: 5px; bottom: 5px; width: 40px; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.6rem; color: #ffffff; border-right: 1px solid rgba(255,255,255,0.05); padding-right: 5px; text-align: right;"></div>
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

    const now = Date.now();
    const hasCache = item.cachedCandles && item.cachedCandles.length > 0;
    
    // Check if 30 minutes (1800000ms) have elapsed
    const lastFetch = item.lastCandlesFetchTime || 0;
    const isWithin30Mins = (now - lastFetch) < 1800000;

    // Skip network request and use cache if 30 minutes haven't passed
    if (hasCache && isWithin30Mins) {
        const chartId = `stock-chart-${id}`;
        const container = document.getElementById(chartId);
        // If already rendered, skip to avoid flicker
        if (container && container.children.length > 0) return;
        
        this.renderChart(id, item.cachedCandles);
        return;
    }

    try {
        const res = await fetch(`stock_proxy.php?type=candle&codes=${item.code}`);
        const data = await res.json();
        if (data.success && data.candles && data.candles.length > 0) {
            item.cachedCandles = data.candles;
            item.lastCandlesFetchTime = now;
            window.isApplyingSyncData = true;
            this.saveData();
            window.isApplyingSyncData = false;
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
        const item = this.items.find(i => String(i.id) === String(id));
        yAxis.innerHTML = `
            <span>${this.formatPrice(max, item)}</span>
            <span style="opacity:0.8">${this.formatPrice(min + range/2, item)}</span>
            <span>${this.formatPrice(min, item)}</span>
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
    const titleEl = document.getElementById("stockModalTitle");
    
    if (id !== null) {
      const item = this.items.find(i => String(i.id) === String(id));
      if (item) {
        input.value = item.name;
      }
      delBtn.style.display = "block";
      if (titleEl) {
        titleEl.setAttribute("data-i18n", "modalStockEdit");
        if (window.i18n) titleEl.innerText = i18n.get("modalStockEdit");
      }
    } else {
      input.value = "";
      delBtn.style.display = "none";
      if (titleEl) {
        titleEl.setAttribute("data-i18n", "modalStockAdd");
        if (window.i18n) titleEl.innerText = i18n.get("modalStockAdd");
      }
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
    if (this.items.length === 0) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.nextOpenTimeoutId) {
        clearTimeout(this.nextOpenTimeoutId);
        this.nextOpenTimeoutId = null;
      }
    }
    if (window.utils && utils.closeModal) {
      utils.closeModal('stockModal');
    } else if (window.openModal) {
      window.closeModal('stockModal');
    }
  }
};

window.stock = stock;
