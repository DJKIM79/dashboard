
const fs = require('fs');
const path = require('path');

const filePath = '/var/www/html/www/assets/css/style.css';
let content = fs.readFileSync(filePath, 'utf8');

const selectorsToRemove = [
    '#iconPickerArea',
    '.icon-search-container',
    '#iconSearchInput',
    '#iconGrid',
    '.icon-item',
    '.shortcut-icon-group',
    '#iconPreview',
    '#siteIcon',
    '.icon-upload-btn',
    '.icon-list-btn',
    '#memoModal .modal-content',
    '#memoTitle',
    '#memoContent',
    '#memoPreview',
    '.memo-toolbar',
    '.memo-dropdown',
    '.table-picker-grid',
    '.color-grid',
    '.table-editor-container',
    '.table-editor-grid',
    '.table-mgmt-btn',
    '.modal-header-actions',
    '.header-action-btn'
];

// Escaping for regex
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

selectorsToRemove.forEach(selector => {
    // Regex to match the selector and its rule block.
    // Handles selectors on their own line or part of a comma-separated list.
    // This is a simplified approach but should work for most CSS.
    // We look for the selector, followed by any characters until '{', then matching '}'.
    
    // Pattern to match the selector at the start of a rule or after a comma
    // followed by any other selectors or the opening brace '{'
    // and then the entire block including nested braces (unlikely here but good to have)
    
    const escapedSelector = escapeRegExp(selector);
    
    // Match selector followed by optional other selectors and the block
    // This regex is greedy and might catch more than intended if not careful.
    // However, we can use a more surgical approach:
    // Look for the selector specifically at the start of a line or after a comma.
    
    // We'll use a state-machine or a more robust regex to find the blocks.
    // For this task, we can try to find the selector and then find the matching braces.
});

// Since regex for CSS is hard, let's use a simpler approach: 
// split by rules and check each one.
// But CSS can have media queries.

// Actually, for this specific cleanup, I'll use a simpler method:
// I'll look for each selector and remove its entire block.

function removeSelector(css, selector) {
    let index = 0;
    while ((index = css.indexOf(selector, index)) !== -1) {
        // Check if it's a real match (not part of another selector like .icon-item-extended)
        const charBefore = index > 0 ? css[index - 1] : '';
        const charAfter = css[index + selector.length];
        const isWordMatch = !/[a-zA-Z0-9_-]/.test(charBefore) && !/[a-zA-Z0-9_-]/.test(charAfter);
        
        if (isWordMatch) {
            // Find the start of the rule (backwards to find '{' of parent or start of file)
            let start = index;
            while (start > 0 && css[start] !== '}' && css[start] !== '{' && css[start] !== ';') {
                start--;
            }
            if (css[start] === '}' || css[start] === '{' || css[start] === ';') start++;
            
            // Find the opening brace
            let openBrace = css.indexOf('{', index);
            if (openBrace !== -1) {
                // Find the closing brace
                let closeBrace = openBrace + 1;
                let depth = 1;
                while (closeBrace < css.length && depth > 0) {
                    if (css[closeBrace] === '{') depth++;
                    if (css[closeBrace] === '}') depth--;
                    closeBrace++;
                }
                
                // Remove the block
                css = css.slice(0, start) + css.slice(closeBrace);
                index = start; // Resume search from the same point
                continue;
            }
        }
        index += selector.length;
    }
    return css;
}

selectorsToRemove.forEach(sel => {
    content = removeSelector(content, sel);
});

// Clean up double newlines
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

const newStyles = `
/* --- Consolidate & Cleaned Styles --- */

/* Memo Modal Dimensions & Resizing */
#memoModal .modal-content {
  width: fit-content;
  min-width: 600px;
  max-width: 95vw;
  border-radius: 20px;
  background: #1e293b;
  overflow: hidden;
  transition: width 0.3s ease;
}

#memoTitle {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 10px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 12px 15px;
  color: #fff;
  font-family: inherit;
  font-size: 1.1rem;
  font-weight: 600;
  outline: none;
  transition: all 0.2s;
}
#memoTitle:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 56, 189, 248), 0.2);
}

#memoContent, #memoPreview {
  width: 100%;
  min-width: 550px;
  height: 350px;
  min-height: 100px;
  padding: 15px;
  box-sizing: border-box;
  border-radius: 10px;
  margin-bottom: 15px;
  resize: both;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  outline: none;
  transition: all 0.2s;
}

#memoContent {
  display: block;
  background: #0f172a;
  border: 1px solid #334155;
  color: #fff;
  font-size: 1rem;
  line-height: 1.6;
  scrollbar-width: none;
  overflow-x: hidden;
  white-space: pre-wrap;
}
#memoContent:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 56, 189, 248), 0.2);
}
#memoContent.preview-active {
  background: #1e293b !important;
  color: #64748b !important;
  cursor: default;
  pointer-events: none;
}

#memoPreview {
  display: none;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  overflow: auto;
  line-height: 1.6;
  font-family: inherit;
  font-size: 1rem;
}
#memoContent::-webkit-scrollbar, #memoPreview::-webkit-scrollbar {
  display: none;
}

/* Shortcut Modal - Unified Input & Icon */
.shortcut-icon-group {
  display: flex;
  align-items: center;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  transition: all 0.2s;
  margin-bottom: 15px;
  overflow: hidden;
  height: 42px;
}
.shortcut-icon-group:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 56, 189, 248), 0.2);
}

#iconPreview {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s;
}
#iconPreview:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

#siteIcon {
  margin-bottom: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  flex: 1;
  height: 100%;
  padding: 0 12px;
  color: #fff;
  outline: none;
}

.icon-upload-btn {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s;
  flex-shrink: 0;
}
.icon-upload-btn:hover {
  border-color: var(--accent-color);
  color: #fff;
}
.icon-upload-btn:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 56, 189, 248), 0.2);
}

/* Icon Picker - Search & Grid */
#iconPickerArea {
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 0;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
#iconPickerArea.show {
  max-height: 400px;
  opacity: 1;
  margin-bottom: 15px;
  pointer-events: auto;
}

.icon-search-container {
  display: flex;
  align-items: center;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 0 12px;
  transition: all 0.2s;
  margin: 0 0 12px 0;
  height: 40px;
  flex-shrink: 0;
}
.icon-search-container:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 56, 189, 248), 0.2);
}
.icon-search-container i {
  color: #64748b;
  font-size: 0.85rem;
}

#iconSearchInput {
  margin-left: 10px !important;
  margin-bottom: 0 !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: #fff !important;
  width: 100% !important;
  padding: 0 !important;
  height: 100% !important;
  box-shadow: none !important;
  font-size: 0.9rem;
}

#iconGrid {
  display: grid !important;
  grid-template-columns: repeat(6, 1fr) !important;
  gap: 10px;
  height: 250px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 5px;
  box-sizing: border-box;
  justify-items: center;
}
#iconGrid::-webkit-scrollbar { display: none; }

.icon-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  border: 1px solid transparent;
  transition: 0.2s;
}
.icon-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent-color);
  transform: translateY(-2px);
}

/* Other Appended styles ... (Keep Markdown preview, table editor etc.) */
.modal-header-actions { position: absolute; top: 31px; right: 30px; display: flex; align-items: center; gap: 12px; }
.header-action-btn { background: transparent; border: none; color: var(--accent-color); cursor: pointer; font-size: 1.1rem; transition: 0.2s; }
#memoPreview blockquote { border-left: 4px solid var(--accent-color); padding: 10px 15px; color: #94a3b8; margin: 15px 0; font-style: italic; background: rgba(255,255,255,0.05); border-radius: 4px; }
#memoPreview table { width: 100%; border-collapse: collapse; border: 1px solid rgba(255,255,255,0.1); margin: 15px 0; }
#memoPreview th, #memoPreview td { padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1); text-align: left; }
#memoPreview th { background: rgba(255,255,255,0.05); font-weight: 600; color: var(--accent-color); }

/* Table Editor ... */
.table-editor-container { padding: 40px; overflow: auto; max-height: 75vh; }
.table-editor-grid { display: inline-grid; gap: 6px; position: relative; }
.table-editor-input { width: 100px; height: 40px; background: rgba(255, 255, 255, 0.05); border: 1px solid #334155; border-radius: 6px; color: #fff; transition: 0.2s; }
.table-editor-input:focus { border-color: var(--accent-color); box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 56, 189, 248), 0.2); }
`;

fs.writeFileSync(filePath, content.trim() + '\n' + newStyles.trim() + '\n');
console.log('Successfully cleaned up style.css');
