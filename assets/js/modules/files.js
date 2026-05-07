const files = {
  export() {
    const d = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("dj_")) {
        try {
          const val = localStorage.getItem(key);
          d[key] = JSON.parse(val);
        } catch (e) {
          d[key] = localStorage.getItem(key);
        }
      }
    }
    // Ensure we have the latest window variables
    if (window.shortcuts) d.dj_shortcuts = window.shortcuts;
    if (window.notifications) d.dj_notifications = window.notifications;
    if (window.memos) d.dj_memos = window.memos;

    const blob = new Blob([JSON.stringify(d, null, 2)], {
        type: "application/json",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `onto_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  },
  import(e) {
    const f = e.target.files[0];
    if (!f) return;

    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);

        const modal = document.getElementById("restoreConfirmModal");
        if (modal) {
          const confirmBtn = document.getElementById("btnConfirmRestore");
          
          if (confirmBtn) {
            confirmBtn.onclick = () => {
              const setLocal = (key, val) => {
                if (val !== undefined && val !== null) {
                  if (typeof val === "object")
                    localStorage.setItem(key, JSON.stringify(val));
                  else localStorage.setItem(key, val);
                }
              };

              // Handle legacy format
              if (d.shortcuts) setLocal("dj_shortcuts", d.shortcuts);
              if (d.notifications) setLocal("dj_notifications", d.notifications);
              if (d.memos) setLocal("dj_memos", d.memos);
              if (d.theme) setLocal("dj_theme_color", d.theme);
              if (d.seed) setLocal("dj_bg_seed", d.seed);
              if (d.bgKeyword) setLocal("dj_bg_keyword", d.bgKeyword);

              // Handle new format
              for (const key in d) {
                if (key.startsWith("dj_")) {
                  setLocal(key, d[key]);
                }
              }
              location.reload();
            };

            utils.openModal("restoreConfirmModal");
          }
        }
      } catch (err) {
        console.error("Failed to import data", err);
        alert(window.i18n ? i18n.get("msgImportError") : "Failed to import data.");
      } finally {
        e.target.value = ""; 
      }
    };
    r.readAsText(f);
  },
};
window.files = files;
window.exportData = files.export.bind(files);
window.importData = files.import.bind(files);
