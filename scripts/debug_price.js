const fs = require('fs');
const content = fs.readFileSync('d:/Cursor_Project/data/price-data-1.js', 'utf8');
const idx = content.indexOf('"595"');
console.log('Found at:', idx);
if (idx > 0) {
    const after = content.substring(idx, idx + 500);
    console.log('Context:', after);
    // Find if there's daily
    const dailyIdx = content.indexOf('"daily"', idx);
    console.log('daily at:', dailyIdx);
    if (dailyIdx > 0 && dailyIdx < idx + 1000) {
        console.log('daily context:', content.substring(dailyIdx, dailyIdx + 300));
    }
}
