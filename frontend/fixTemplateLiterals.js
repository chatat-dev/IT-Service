/**
 * Fixes the malformed template literals left by replaceApiUrl.js.
 * The pattern to fix: template literal that ends with '; (quote then semicolon)
 * should end with `; (backtick then semicolon)
 * node fixTemplateLiterals.js
 */
const fs = require('fs');
const path = require('path');

const FRONTEND_APP_DIR = path.join(__dirname, 'app');

// Also fix remaining hardcoded localhost:5250 in ternary first parts
const FIXES = [
    // Fix: ends with '; → ends with `;
    { from: /(`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:5250'\}[^'`\n]*)'(;)/g, to: '$1`$2' },
    // Fix: remaining hardcoded http://localhost:5250 in ternary first parts (e.g., `http://localhost:5250/api/xxx/${id}`)
    { from: /`http:\/\/localhost:5250(\/api\/[^`]*\$\{[^`]*\}[^`]*)`/g, to: '`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:5250\'}$1`' },
    // Fix socket.io connection: io('http://localhost:5250'...) → io(`${...}`...)
    { from: /io\('http:\/\/localhost:5250'/g, to: "io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5250'}`" },
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    for (const fix of FIXES) {
        content = content.replace(fix.from, fix.to);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${filePath}`);
    }
}

function walkDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && item !== 'node_modules') {
            walkDir(fullPath);
        } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
            processFile(fullPath);
        }
    }
}

walkDir(FRONTEND_APP_DIR);
console.log('\n✅ Template literal fix complete!');
