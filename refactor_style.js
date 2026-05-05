const fs = require('fs');

const stylePath = '/Volumes/data/html/www/assets/css/style.css';
let css = fs.readFileSync(stylePath, 'utf8');

const classesToRemove = [
  'location-list', 'location-tag', 'clock-switching', 'setting-inline-field',
  'field-quote-size', 'field-weather-toggle', 'compact-select', 'toggle-group',
  'toggle-item', 'setting-footer', 'ai-check-tooltip', 'engine-add-container'
];

classesToRemove.forEach(cls => {
  // Try to remove full block: .class { ... }
  const blockRegex = new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`, 'g');
  css = css.replace(blockRegex, '');
  
  // Try to remove pseudo-selectors: .class:hover { ... } or .class::after { ... }
  const pseudoRegex = new RegExp(`\\.${cls}(:\\w+|::\\w+)\\s*\\{[^}]*\\}`, 'g');
  css = css.replace(pseudoRegex, '');
  
  // Try to remove nested or specific like .parent .class { ... }
  const nestedRegex = new RegExp(`[^}]*\\.${cls}[^{]*\\{[^}]*\\}`, 'g');
  css = css.replace(nestedRegex, '');
  
  // Clean up any remaining lines that mention the class in a comma separated list
  // e.g. .some-class, .classToRemove, .other-class {
  // This is a bit tricky, but we can do a simple string replace for the comma list
  css = css.replace(new RegExp(`\\.${cls}\\s*,`, 'g'), '');
  css = css.replace(new RegExp(`,\\s*\\.${cls}\\b`, 'g'), '');
});

// Fix some specific comma separated lists that might have been left broken
// e.g. ",\n.popup-list-area::-webkit-scrollbar" -> "\n.popup-list-area::-webkit-scrollbar"
css = css.replace(/,\s*\{/g, ' {');

fs.writeFileSync(stylePath, css);
console.log('Removed unused classes from style.css');
