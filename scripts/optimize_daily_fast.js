// 多日全量优化脚本 - 优化版本
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

// 读取 JS
function loadJSVar(filename, varName) {
    const content = fs.readFileSync(path.join(dataPath, filename), 'utf-8');
    const match = content.match(new RegExp(`${varName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;`));
    if (match) return JSON.parse(match[1]);
    return null;
}

// 参数
const HOUR_LABELS = {
    'Lifestyle Services': {1: [10, 11, 14, 15, 16, 17, 18], 2: [7, 8, 9, 12, 13, 19, 20, 21], 3: [22, 23], 4: [0, 1, 2, 3, 4, 5, 6]},
    'Food and Beverage Services': {1: [14, 15, 16, 17, 18, 19], 2: [8, 9, 10, 20, 21, 22, 23], 3: [2, 3, 4, 5, 6, 7, 11, 12, 13], 4: [0, 1]},
    'Business and Residential': {1: [10, 11, 14, 15, 16, 17, 18], 2: [7, 8, 9, 12, 13, 19, 20], 3: [21, 22, 23], 4: [0, 1, 2, 3, 4, 5, 6]}
};

const CATEGORIES = {
    'Lifestyle Services': {const: 6.4749, b_t: 0.0038, beta1: -5.5852},
    'Business and Residential': {const: 5.0514, b_t: 0.0045, beta1: -2.2836},
    'Food and Beverage Services': {const: 6.6915, b_t: 0.0052, beta1: -6.0837}
};

const POI_RAW_TO_CAT = {
    'lifestyle services': 'Lifestyle Services',
    'food and beverage services': 'Food and Beverage Services',
    'business and residential': 'Business and Residential'
};

const T = 24, S_MIN = 0.20, S_MAX = 0.80;
const C_BASE = 0.05, ETA = 0.2;

// 加载站点数据
const stationsData = loadJSVar('stations-data.js', 'TAZ_POINTS');
const tazCatMap = {};
if (stationsData && Array.isArray(stationsData)) {
    stationsData.forEach(p => {
        if (p.tazid && p.poiRaw) tazCatMap[p.tazid] = p.poiRaw.toLowerCase();
    });
}

console.log('Loading data...');
const occCsv = readCSV('occupancy.csv');
const ePriceCsv = readCSV('e_price.csv');
const sPriceCsv = readCSV('s_price.csv');

const priceTazIds = Object.keys(ePriceCsv).filter(k => !isNaN(k) && k !== 'hour');
console.log(`Total stations: ${priceTazIds.length}`);

// 获取所有日期
const times = occCsv.time || [];
const dateSet = new Set();
times.forEach(t => {
    if (t && t.includes('-')) dateSet.add(t.split(' ')[0]);
});
const allDates = Array.from(dateSet).sort();
console.log(`Total dates: ${allDates.length}`);
console.log(`Date range: ${allDates[0]} to ${allDates[allDates.length - 1]}`);

// 按日期分组
const dateRowIndices = {};
times.forEach((t, idx) => {
    if (t && t.includes('-')) {
        const date = t.split(' ')[0];
        if (!dateRowIndices[date]) dateRowIndices[date] = [];
        dateRowIndices[date].push(idx);
    }
});

function getHourlyData(csvData, tazId, date) {
    const rows = dateRowIndices[date] || [];
    return rows.map(r => csvData[String(tazId)]?.[r] || 0.5);
}

// 快速优化 - 简化为只优化2个参数
function optimizeStation(ePrices, occSeries, params, hoursLabels) {
    let bestFees = {1: 0.5, 2: 0.5, 3: 0.5, 4: 0.5};
    let bestProfit = -Infinity;
    const occMax = Math.max(...occSeries, 0.01);
    
    // 优化 L1 和 L3（高峰和低谷），L2/L4 设为中间值
    const grid = [0.20, 0.35, 0.50, 0.65, 0.80];
    
    for (const l1 of grid) {
        for (const l2 of grid) {
            for (const l3 of grid) {
                for (const l4 of grid) {
                    const fees = {1: l1, 2: l2, 3: l3, 4: l4};
                    let profit = 0;
                    
                    for (let h = 0; h < T; h++) {
                        let label = 2;
                        for (const [l, hours] of Object.entries(hoursLabels)) {
                            if (hours.includes(h)) { label = parseInt(l); break; }
                        }
                        const P = Math.max(0.01, fees[label] + ePrices[h]);
                        const lnQ = params.const + params.b_t * (h + 1) + params.beta1 * Math.log(P);
                        const Q = Math.exp(Math.max(-10, Math.min(10, lnQ)));
                        const cv = C_BASE * (1 + ETA * Math.pow(occSeries[h] / occMax, 2));
                        profit += Q * (fees[label] - cv);
                    }
                    
                    if (profit > bestProfit) {
                        bestProfit = profit;
                        bestFees = {...fees};
                    }
                }
            }
        }
    }
    
    return { fees: bestFees, profit: bestProfit };
}

// 主循环
console.log('\nStarting optimization...');
const allResults = {};
const startTime = Date.now();

for (let d = 0; d < allDates.length; d++) {
    const date = allDates[d];
    const dateResults = {};
    
    for (const [catName, params] of Object.entries(CATEGORIES)) {
        const hoursLabels = HOUR_LABELS[catName];
        const catStations = {};
        let totalBaseProfit = 0, totalOptProfit = 0;
        
        const catTazs = priceTazIds.filter(taz => {
            const poiRaw = tazCatMap[taz];
            return poiRaw && POI_RAW_TO_CAT[poiRaw] === catName;
        });
        
        for (const tazId of catTazs) {
            const ePrices = getHourlyData(ePriceCsv, tazId, date);
            const sPrices = getHourlyData(sPriceCsv, tazId, date);
            const occSeries = getHourlyData(occCsv, tazId, date).map(v => v || 0.35);
            
            if (ePrices.length !== 24) continue;
            
            const occMax = Math.max(...occSeries, 0.01);
            let baseProfit = 0;
            for (let h = 0; h < T; h++) {
                const P = Math.max(0.01, sPrices[h] + ePrices[h]);
                const lnQ = params.const + params.b_t * (h + 1) + params.beta1 * Math.log(P);
                const Q = Math.exp(Math.max(-10, Math.min(10, lnQ)));
                const cv = C_BASE * (1 + ETA * Math.pow(occSeries[h] / occMax, 2));
                baseProfit += Q * (sPrices[h] - cv);
            }
            totalBaseProfit += baseProfit;
            
            try {
                const { fees, profit: optProfit } = optimizeStation(ePrices, occSeries, params, hoursLabels);
                catStations[tazId] = {
                    1: parseFloat(fees[1].toFixed(4)),
                    2: parseFloat(fees[2].toFixed(4)),
                    3: parseFloat(fees[3].toFixed(4)),
                    4: parseFloat(fees[4].toFixed(4))
                };
                totalOptProfit += optProfit;
            } catch (err) {
                catStations[tazId] = {1: 0.5, 2: 0.5, 3: 0.5, 4: 0.5};
            }
        }
        
        const profitInc = totalBaseProfit !== 0 ? ((totalOptProfit - totalBaseProfit) / Math.abs(totalBaseProfit) * 100) : 0;
        dateResults[catName] = {
            profitIncrease: parseFloat(profitInc.toFixed(2)),
            baseProfit: parseFloat(totalBaseProfit.toFixed(2)),
            optProfit: parseFloat(totalOptProfit.toFixed(2)),
            stations: catStations
        };
    }
    
    allResults[date] = dateResults;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const eta = ((Date.now() - startTime) / (d + 1) * (allDates.length - d - 1) / 1000).toFixed(0);
    console.log(`[${elapsed}s] ${date} (${d + 1}/${allDates.length}) - ETA: ${eta}s`);
}

// 保存
console.log('\nSaving results...');
const outputPath = path.join(dataPath, 'optimization-results-daily.js');
fs.writeFileSync(outputPath, `window.OPTIMIZATION_RESULTS_DAILY = ${JSON.stringify(allResults)};`, 'utf-8');

// 摘要
const summary = {};
for (const [date, results] of Object.entries(allResults)) {
    let totalBase = 0, totalOpt = 0;
    for (const catResults of Object.values(results)) {
        totalBase += catResults.baseProfit;
        totalOpt += catResults.optProfit;
    }
    summary[date] = {
        totalBaseProfit: parseFloat(totalBase.toFixed(2)),
        totalOptProfit: parseFloat(totalOpt.toFixed(2)),
        totalProfitInc: parseFloat(((totalOpt - totalBase) / Math.abs(totalBase) * 100).toFixed(2))
    };
}
fs.writeFileSync(path.join(dataPath, 'optimization-summary-daily.js'), 
    `window.OPTIMIZATION_SUMMARY_DAILY = ${JSON.stringify(summary)};`, 'utf-8');

console.log(`\nDone! Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
console.log(`Results saved to: ${outputPath}`);
