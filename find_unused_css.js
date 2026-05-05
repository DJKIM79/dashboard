const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, 'assets/css/style.css');
const htmlPath = path.join(__dirname, 'index.html');
const jsDir = path.join(__dirname, 'assets/js');
const jsModulesDir = path.join(__dirname, 'assets/js/modules');

const styleContent = fs.readFileSync(stylePath, 'utf-8');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

const jsFiles = [];
fs.readdirSync(jsDir).forEach(file => {
    if (file.endsWith('.js')) jsFiles.push(path.join(jsDir, file));
});
fs.readdirSync(jsModulesDir).forEach(file => {
    if (file.endsWith('.js')) jsFiles.push(path.join(jsModulesDir, file));
});

let jsContent = '';
jsFiles.forEach(file => {
    jsContent += fs.readFileSync(file, 'utf-8') + '\n';
});

const allContent = htmlContent + jsContent;

const classRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
const classes = new Set();
let match;
while ((match = classRegex.exec(styleContent)) !== null) {
    // Exclude pseudo-classes or pseudo-elements not starting with a dot but matched? Wait, the regex catches the dot.
    classes.add(match[1]);
}

const unusedClasses = [];
classes.forEach(cls => {
    if (!allContent.includes(cls)) {
        unusedClasses.push(cls);
    }
});

console.log("Unused CSS Classes:");
console.log(unusedClasses.join(', '));
