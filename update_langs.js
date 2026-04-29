const fs = require('fs');

const updateJson = (file, newKeys) => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.assign(data, newKeys);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

updateJson('assets/lang/en.json', {
    "optJa": "Japanese",
    "optZhCn": "Chinese (Simp)",
    "optZhTw": "Chinese (Trad)",
    "optFr": "French",
    "optDe": "German"
});

updateJson('assets/lang/ko.json', {
    "optJa": "일본어",
    "optZhCn": "중국어(간체)",
    "optZhTw": "중국어(번체)",
    "optFr": "프랑스어",
    "optDe": "독일어"
});

console.log('en.json and ko.json updated.');
