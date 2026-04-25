const memo = {
  items: JSON.parse(localStorage.getItem("dj_memos")) || [],

  init() {
    this.render();
  },

  render() {
    const c = document.getElementById("memo-list");
    if (!c) return;
    c.innerHTML = "";
    const folder = document.getElementById("memo-folder");
    if (this.items.length > 0) {
      folder.classList.add("has-items");
    } else {
      folder.classList.remove("has-items", "open");
    }
    this.items.forEach((m) => {
      const div = document.createElement("div");
      div.className = "item-card";
      div.onclick = () => this.openModal(m.id);
      div.oncontextmenu = (e) => showContextMenu(e, "memo", m.id);
      div.innerHTML = `<div class="title">${m.title}</div>`;
      c.appendChild(div);
    });
  },

  openModal(id = null) {
    window.currentEditMemoId = id;
    window.currentContextType = "memo";
    window.currentContextId = id;
    const T = i18n.langData,
      d = document.getElementById("memoDelBtn"),
      m = id ? this.items.find((x) => x.id == id) : null;
    document.getElementById("memoTitle").value = m ? m.title : "";
    document.getElementById("memoContent").value = m ? m.content : "";
    document.getElementById("memoModalTitle").innerText = id
      ? T.modalMemoEdit
      : T.modalMemoAdd;
    if (d) d.style.display = id ? "block" : "none";
    utils.closeModal("settingModal");
    utils.openModal("memoModal");
    setTimeout(() => document.getElementById("memoTitle").focus(), 50);
  },

  add() {
    const t = document.getElementById("memoTitle").value,
      c = document.getElementById("memoContent").value;
    if (t) {
      if (window.currentEditMemoId) {
        const idx = this.items.findIndex((x) => x.id == window.currentEditMemoId);
        this.items[idx] = {
          ...this.items[idx],
          title: t,
          content: c,
        };
      } else {
        this.items.push({ id: Date.now(), title: t, content: c });
      }
      window.memos = this.items;
      this.render();
      utils.saveData();
      utils.closeModal("memoModal");
    }
  },

  delete(id = null) {
    const targetId = id || window.currentEditMemoId;
    this.items = this.items.filter((x) => x.id != targetId);
    window.memos = this.items;
    this.render();
    utils.saveData();
    utils.closeModal("memoModal");
  }
};

window.memo = memo;
window.memos = memo.items; // For backward compatibility
window.renderMemos = () => memo.render();
window.openMemoModal = (id) => memo.openModal(id);
window.addMemo = () => memo.add();
window.deleteCurrentMemo = () => memo.delete();
