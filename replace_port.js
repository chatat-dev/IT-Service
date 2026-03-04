const fs = require('fs');
const path = require('path');

const walk = function (dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
};

const frontendDir = path.join(__dirname, 'frontend', 'app');
const files = walk(frontendDir);

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('http://localhost:5000')) {
        content = content.replace(/http:\/\/localhost:5000/g, 'http://localhost:5250');
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
});

console.log('Replaced localhost:5000 with localhost:5250 in ' + count + ' files.');
