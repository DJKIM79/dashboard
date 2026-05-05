const files = {
  export() {
    const d = {
      shortcuts: window.shortcuts,
      notifications: window.notifications,
      memos: window.memos,
      theme: localStorage.getItem("dj_theme_color"),
      seed: localStorage.getItem("dj_bg_seed"),
      bgKeyword: localStorage.getItem("dj_bg_keyword"),
    };
    const blob = new Blob([JSON.stringify(d, null, 2)], {
        type: "application/json",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "onto.json";
    a.click();
  },
  import(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.shortcuts) {
          window.shortcuts = d.shortcuts;
          window.shortcutMod.items = d.shortcuts;
          localStorage.setItem("dj_shortcuts", JSON.stringify(d.shortcuts));
        }
        if (d.notifications) {
          window.notifications = d.notifications;
          window.noti.items = d.notifications;
          localStorage.setItem(
            "dj_notifications",
            JSON.stringify(d.notifications),
          );
        }
        if (d.memos) {
          window.memos = d.memos;
          window.memo.items = d.memos;
          localStorage.setItem("dj_memos", JSON.stringify(d.memos));
        }
        if (d.theme) settings.setTheme(d.theme);
        if (d.bgKeyword) localStorage.setItem("dj_bg_keyword", d.bgKeyword);
        if (d.seed) {
          localStorage.setItem("dj_bg_seed", d.seed);
          utils.setBackground(d.seed);
        }
        renderShortcuts();
        renderNotifications();
        renderMemos();
        alert(i18n.get("alertRestore"));
      } catch (err) {
        console.error("Failed to import data", err);
        alert(i18n.get("msgImportError"));
      }
    };
    r.readAsText(f);
  },
};
window.files = files;
window.exportData = files.export.bind(files);
window.importData = files.import.bind(files);
