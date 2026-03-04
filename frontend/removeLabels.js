const fs = require('fs');

const file1 = './app/it/computers/add/page.js';
const file2 = './app/it/computers/[id]/page.js';

const stripNumbers = (file) => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        // Match a space, followed by an opening parenthesis, any digits, and a closing parenthesis
        const regex = / \(\d+\)/g;

        if (regex.test(content)) {
            content = content.replace(regex, '');
            fs.writeFileSync(file, content);
            console.log(`✅ Successfully processed: ${file}`);
        } else {
            console.log(`ℹ️ No numbers found in: ${file}`);
        }
    } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
    }
};

stripNumbers(file1);
stripNumbers(file2);
