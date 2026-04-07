// 每日原始占用率数据 - 用于模拟器按日期显示
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/');

// 读取 CSV
function readCSV(filename) {
    const lines = fs.readFileSync(path.join(dataPath, filename), 'utf-8').split('\n');
    const headers = lines[0].split(',');
    const data = {};
    headers.forEach((h, i) => data[h.trim()] = []);
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(',');
        headers.forEach((h, j) => {
            const v = vals[j]?.trim();
            data[h][i-1] = isNaN(v) ? v : parseFloat(v);
        });
    }
    return data;
}

console.log('Loading daily occupancy data...');
const occCsv = readCSV('occupancy.csv');
const times = occCsv.time || [];

// 按日期分组
const dateRowIndices = {};
times.forEach((t, idx) => {
    if (t && t.includes('-')) {
        const date = t.split(' ')[0];
        if (!dateRowIndices[date]) dateRowIndices[date] = [];
        dateRowIndices[date].push(idx);
    }
});

// 获取数据列名
const tazIds = Object.keys(occCsv).filter(k => !isNaN(k) && k !== 'time');

console.log(`Total stations: ${tazIds.length}`);
console.log(`Total dates: ${Object.keys(dateRowIndices).length}`);

// 构建每日数据
const dailyData = {};
for (const [date, rows] of Object.entries(dateRowIndices)) {
    const stationData = {};
    for (const tazId of tazIds) {
        const dailyHours = rows.map(r => occCsv[tazId]?.[r] || 35);
        if (dailyHours.length === 24) {
            stationData[tazId] = dailyHours;
        }
    }
    dailyData[date] = stationData;
}

console.log(`Daily data entries: ${Object.keys(dailyData).length}`);

// 保存
const outputPath = path.join(dataPath, 'daily-occupancy.js');
const output = `window.DAILY_OCCUPANCY = ${JSON.stringify(dailyData)};`;

fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`Saved to: ${outputPath}`);
console.log('Done!');
