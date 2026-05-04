const stock = {
  items: JSON.parse(localStorage.getItem("dj_stocks")) || [],
  updateInterval: null,
  searchTimeout: null,
  options: JSON.parse(localStorage.getItem("dj_stock_options")) || {
    hide: false,
    showName: true,
    showPrice: true,
    changeType: "price", // "none", "price", "percent"
  },

  init() {
    this.items = JSON.parse(localStorage.getItem("dj_stocks")) || [];
    this.options = JSON.parse(localStorage.getItem("dj_stock_options")) || {
      hide: false,
      showName: true,
      showPrice: true,
      changeType: "price",
    };
    this.render();
    this.startAutoUpdate();
  },

  startAutoUpdate() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => this.updateData(), 5000);
    this.updateData();
  },

  async updateData() {
    if (this.items.length === 0 || this.options.hide) return;

    const codes = this.items.map((item) => item.code).join(",");
    try {
      // Naver Finance Realtime API
      // SERVICE_ITEM_CODE is used for multiple stocks
      const res = await fetch(
        `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM_CODE:${codes}`,
      );
      if (!res.ok) throw new Error("Stock API failed");
      const data = await res.json();

      if (data && data.result && data.result.areas) {
        const stockData = data.result.areas[0].datas;
        let changed = false;
        this.items.forEach((item) => {
          const d = stockData.find((s) => s.cd === item.code);
          if (d) {
            // Check if data changed to avoid unnecessary re-renders
            if (
              item.price !== d.nv ||
              item.changePrice !== d.cv ||
              String(item.direction) !== String(d.rf)
            ) {
              changed = true;
            }
            item.price = d.nv;
            item.changePrice = d.cv;
            item.changeRate = d.cr;
            item.direction = String(d.rf); // 1: 상한, 2: 상승, 3: 보합, 4: 하락, 5: 하남
          }
        });
        if (changed) this.render();
      }
    } catch (e) {
      console.error("Stock fetch error:", e);
    }
  },

  render() {
    const c = document.getElementById("stock-list");
    if (!c) return;

    const folder = document.getElementById("stock-folder");
    if (this.items.length > 0 && !this.options.hide) {
      folder.classList.add("has-items");
    } else {
      folder.classList.remove("has-items", "open");
    }

    c.innerHTML = "";
    this.items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "item-card stock-item";
      div.onclick = () => this.openStockPage(item.code);
      div.oncontextmenu = (e) => showContextMenu(e, "stock", item.id);

      let html = "";
      if (this.options.showName) {
        html += `<div class="title">${item.name}</div>`;
      }

      let bottomHtml = "";
      if (this.options.showPrice) {
        bottomHtml += `<span class="stock-price">${(item.price || 0).toLocaleString()}</span>`;
      }

      if (this.options.changeType !== "none") {
        const isRise = item.direction === "1" || item.direction === "2";
        const isFall = item.direction === "4" || item.direction === "5";
        const colorClass = isRise ? "rise" : isFall ? "fall" : "even";
        const sign = isRise ? "▲" : isFall ? "▼" : "";

        const val =
          this.options.changeType === "price"
            ? (item.changePrice || 0).toLocaleString()
            : (item.changeRate || 0).toFixed(2) + "%";
        bottomHtml += `<span class="stock-change ${colorClass}">${sign}${val}</span>`;
      }

      if (bottomHtml) {
        html += `<div class="stock-bottom">${bottomHtml}</div>`;
      }

      div.innerHTML = html;
      c.appendChild(div);
    });
  },

  openStockPage(code) {
    window.open(
      `https://finance.naver.com/item/main.naver?code=${code}`,
      "_blank",
    );
  },

  handleSearchInput(query) {
    clearTimeout(this.searchTimeout);
    if (!query || query.trim().length < 1) {
      document.getElementById("stockSearchResults").style.display = "none";
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      const results = await this.search(query);
      this.renderSearchResults(results);
    }, 300);
  },

  async search(query) {
    try {
      const res = await fetch(
        `https://ac.finance.naver.com/ac?q=${encodeURIComponent(query)}&target=stock`,
      );
      const data = await res.json();
      if (data && data.items && data.items[0]) {
        return data.items[0].map((item) => ({
          name: item[0][0],
          code: item[1][0],
        }));
      }
    } catch (e) {
      console.error("Stock search error:", e);
    }
    return [];
  },

  renderSearchResults(results) {
    const container = document.getElementById("stockSearchResults");
    if (!container) return;

    container.innerHTML = "";
    if (results.length === 0) {
      container.innerHTML = `<div class="stock-result-item" style="opacity:0.5; cursor:default;">${i18n.get("msgNoResults")}</div>`;
    } else {
      results.forEach((res) => {
        const div = document.createElement("div");
        div.className = "stock-result-item";
        div.innerHTML = `
          <span class="res-name">${res.name}</span>
          <span class="res-code">${res.code}</span>
        `;
        div.onclick = () => this.add(res.name, res.code);
        container.appendChild(div);
      });
    }
    container.style.display = "block";
  },

  add(name, code) {
    if (this.items.some((item) => item.code === code)) {
      utils.showValidationTip("stockSearchInput", i18n.get("msgStockExists"));
      return;
    }
    const newItem = {
      id: Date.now(),
      name: name,
      code: code,
      price: 0,
      changePrice: 0,
      changeRate: 0,
      direction: "3",
    };
    this.items.push(newItem);
    this.save();
    this.render();
    this.updateData();
    utils.closeModal("stockModal");
    
    // Show success feedback
    const sideIcon = document.getElementById("side-stock");
    if (sideIcon) {
        utils.showValidationTip(sideIcon, i18n.get("msgStockAdded").replace("{0}", name), "success");
    }
  },

  delete(id) {
    this.items = this.items.filter((item) => item.id != id);
    this.save();
    this.render();
  },

  save() {
    utils.saveData();
  },

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    localStorage.setItem("dj_stock_options", JSON.stringify(this.options));
    this.render();
    ui.applyVisibility();
  },

  openModal() {
    utils.closeModal("settingModal");
    utils.openModal("stockModal");
    const input = document.getElementById("stockSearchInput");
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 100);
    }
    const results = document.getElementById("stockSearchResults");
    if (results) results.style.display = "none";
  },
};

window.stock = stock;
window.openStockModal = stock.openModal.bind(stock);
window.handleStockSearch = stock.handleSearchInput.bind(stock);
