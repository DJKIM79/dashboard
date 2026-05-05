const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const stylePath = path.join(__dirname, 'assets/css/style.css');
const jsDir = path.join(__dirname, 'assets/js');
const jsModulesDir = path.join(__dirname, 'assets/js/modules');

const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
const styleContent = fs.readFileSync(stylePath, 'utf-8');

const jsFiles = [];
fs.readdirSync(jsDir).forEach(file => {
    if (file.endsWith('.js')) jsFiles.push({ path: path.join(jsDir, file), name: file });
});
fs.readdirSync(jsModulesDir).forEach(file => {
    if (file.endsWith('.js')) jsFiles.push({ path: path.join(jsModulesDir, file), name: file });
});

const jsContent = jsFiles.map(f => fs.readFileSync(f.path, 'utf-8')).join('\n');

const idRegex = /id="([^"]+)"/g;
const ids = new Set();
let match;
while ((match = idRegex.exec(htmlContent)) !== null) {
    ids.add(match[1]);
}

const unusedIds = [];
ids.forEach(id => {
    // Check if used in CSS
    const cssRegex = new RegExp(`#${id}[\\s\\{:,\\.#>\\[]`, 'g');
    const usedInCss = cssRegex.test(styleContent) || styleContent.includes(`#${id}`);
    
    // Check if used in JS
    const jsRegex = new RegExp(`['"\`]${id}['"\`]`, 'g');
    const usedInJs = jsRegex.test(jsContent) || jsContent.includes(`getElementById('${id}')`) || jsContent.includes(`getElementById("${id}")`);
    
    // Check if used in HTML itself (e.g. href="#id" or aria-controls="id")
    const htmlRefRegex = new RegExp(`href="#${id}"|aria-controls="${id}"|for="${id}"`, 'g');
    const usedInHtml = htmlRefRegex.test(htmlContent);
    
    if (!usedInCss && !usedInJs && !usedInHtml) {
        unusedIds.push(id);
    }
});

console.log("Unused HTML IDs:");
console.log(unusedIds.join(', '));
