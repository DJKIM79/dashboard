const fs = require('fs');

const updateJson = (file, newKeys) => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.assign(data, newKeys);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

updateJson('assets/lang/en.json', {
    "resetConfirmTitle": "Are you sure you want to reset?",
    "resetConfirmDesc": "(All settings and data will be permanently deleted.)",
    "btnConfirmReset": "Reset"
});

updateJson('assets/lang/ko.json', {
    "resetConfirmTitle": "정말로 초기화 하시겠습니까?",
    "resetConfirmDesc": "(모든 설정과 데이터가 영구 삭제됩니다)",
    "btnConfirmReset": "초기화"
});

updateJson('assets/lang/ja.json', {
    "resetConfirmTitle": "本当に初期化しますか？",
    "resetConfirmDesc": "(すべての設定とデータが完全に削除されます)",
    "btnConfirmReset": "初期化"
});

updateJson('assets/lang/zh-CN.json', {
    "resetConfirmTitle": "确定要重置吗？",
    "resetConfirmDesc": "(所有设置和数据将被永久删除)",
    "btnConfirmReset": "重置"
});

updateJson('assets/lang/zh-TW.json', {
    "resetConfirmTitle": "確定要重設嗎？",
    "resetConfirmDesc": "(所有設定和資料將被永久刪除)",
    "btnConfirmReset": "重設"
});

updateJson('assets/lang/fr.json', {
    "resetConfirmTitle": "Voulez-vous réinitialiser ?",
    "resetConfirmDesc": "(Les paramètres et données seront supprimés)",
    "btnConfirmReset": "Réinitialiser"
});

updateJson('assets/lang/de.json', {
    "resetConfirmTitle": "Wirklich zurücksetzen?",
    "resetConfirmDesc": "(Alle Einstellungen und Daten werden gelöscht)",
    "btnConfirmReset": "Zurücksetzen"
});

console.log('Language files updated.');
