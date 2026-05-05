const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'assets/js');
const jsModulesDir = path.join(__dirname, 'assets/js/modules');

const jsFiles = [];
fs.readdirSync(jsDir).forEach(file => {
    if (file.endsWith('.js')) jsFiles.push({ path: path.join(jsDir, file), name: file });
});
fs.readdirSync(jsModulesDir).forEach(file => {
    if (file.endsWith('.js')) jsFiles.push({ path: path.join(jsModulesDir, file), name: file });
});

const fileContents = jsFiles.map(f => ({ ...f, content: fs.readFileSync(f.path, 'utf-8') }));
const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

const allContent = fileContents.map(f => f.content).join('\n') + htmlContent;

const functionRegex = /function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(/g;
const arrowRegex = /(const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(async\s+)?(?:\([^)]*\)|[a-zA-Z_$][0-9a-zA-Z_$]*)\s*=>/g;
const methodRegex = /([a-zA-Z_$][0-9a-zA-Z_$]*)\s*:\s*(async\s+)?function\s*\(/g;
const shortMethodRegex = /(?<!function\s+)([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\([^)]*\)\s*\{/g;

const functions = new Map(); // name -> { type, file }

fileContents.forEach(f => {
    let match;
    while ((match = functionRegex.exec(f.content)) !== null) {
        functions.set(match[1], { file: f.name, type: 'function' });
    }
    while ((match = arrowRegex.exec(f.content)) !== null) {
        functions.set(match[2], { file: f.name, type: 'arrow' });
    }
});

const unused = [];
functions.forEach((info, name) => {
    // exclude common lifecycle or standard names
    if (['init', 'setup', 'DOMContentLoaded'].includes(name)) return;
    
    // count occurrences
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    const matches = allContent.match(regex);
    if (matches && matches.length === 1) { // 1 means only the definition
        unused.push({ name, ...info });
    }
});

console.log("Unused functions:");
console.log(unused);
