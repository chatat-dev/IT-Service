/**
 * Run this script once to replace all hardcoded localhost:5250 in frontend files.
 * node replaceApiUrl.js
 */
const fs = require('fs');
const path = require('path');

const FRONTEND_APP_DIR = path.join(__dirname, 'app');
const OLD_URL = 'http://localhost:5250';
const NEW_URL = `\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5250'}`;

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(OLD_URL)) return;

    // Replace all instances: handle both 'string' and `template` contexts
    // For non-template strings: 'http://localhost:5250/...' → `${API_URL}/...`
    // Convert single-quoted URLs to template literals
    let newContent = content
        .replace(new RegExp(`'${OLD_URL}`, 'g'), `\`\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5250'}`)
        .replace(new RegExp(`"${OLD_URL}`, 'g'), `\`\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5250'}`);

    // Close open template literals that were single-quoted
    // e.g. `${API}/api/tickets' → `${API}/api/tickets`
    newContent = newContent.replace(/(`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:5250'\}[^`'"]*)'(?=,|\)|\s)/g, '$1`');
    newContent = newContent.replace(/(`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:5250'\}[^`'"]*)"(?=,|\)|\s)/g, '$1`');

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
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
console.log('\n✅ All done! Restart Next.js dev server for changes to take effect.');
