// 多日全量优化脚本 - 为所有站点、所有天计算最优定价
const fs = require('fs');
const path = require('path');

// 加载数据
const dataPath = path.join(__dirname, '../data/');

// 读取 CSV 辅助函数
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

// 读取 JS 变量文件
function loadJSVar(filename, varName) {
    const content = fs.readFileSync(path.join(dataPath, filename), 'utf-8');
    const match = content.match(new RegExp(`${varName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;`));
    if (match) {
        return JSON.parse(match[1]);
    }
    return null;
}

// 聚类时段映射
const HOUR_LABELS = {
    'Lifestyle Services': {1: [10, 11, 14, 15, 16, 17, 18], 2: [7, 8, 9, 12, 13, 19, 20, 21], 3: [22, 23], 4: [0, 1, 2, 3, 4, 5, 6]},
    'Food and Beverage Services': {1: [14, 15, 16, 17, 18, 19], 2: [8, 9, 10, 20, 21, 22, 23], 3: [2, 3, 4, 5, 6, 7, 11, 12, 13], 4: [0, 1]},
    'Business and Residential': {1: [10, 11, 14, 15, 16, 17, 18], 2: [7, 8, 9, 12, 13, 19, 20], 3: [21, 22, 23], 4: [0, 1, 2, 3, 4, 5, 6]}
};

// 论文参数
const CATEGORIES = {
    'Lifestyle Services': {rho: -0.0724, beta1: -5.5852, beta2: 0.4636, const: 6.4749, b_t: 0.0038},
    'Business and Residential': {rho: -0.2358, beta1: -2.2836, beta2: 1.5628, const: 5.0514, b_t: 0.0045},
    'Food and Beverage Services': {rho: 0.0274, beta1: -6.0837, beta2: -0.2428, const: 6.6915, b_t: 0.0052}
};

const T = 24, S_MIN = 0.20, S_MAX = 0.80, PHI_MAX = 50;
const C_BASE = 0.05, ETA = 0.2;

// 加载站点数据
const stationsData = loadJSVar('stations-data.js', 'TAZ_POINTS');

// 构建 TAZ -> 类别映射
const tazCatMap = {};
if (stationsData && Array.isArray(stationsData)) {
    stationsData.forEach(p => {
        if (p.tazid && p.poiRaw) {
            tazCatMap[p.tazid] = p.poiRaw.toLowerCase();
        }
    });
}

// poiRaw 到英文类别的映射
const POI_RAW_TO_CAT = {
    'lifestyle services': 'Lifestyle Services',
    'food and beverage services': 'Food and Beverage Services',
    'business and residential': 'Business and Residential'
};

console.log('Loading data...');

// 加载价格和占用率数据
const occCsv = readCSV('occupancy.csv');
const ePriceCsv = readCSV('e_price.csv');
const sPriceCsv = readCSV('s_price.csv');

// 获取价格数据列名
const priceTazIds = Object.keys(ePriceCsv).filter(k => !isNaN(k) && k !== 'hour');

console.log(`Total stations: ${priceTazIds.length}`);

// 获取所有日期
const times = occCsv.time || [];
const dateSet = new Set();
times.forEach(t => {
    if (t && t.includes('-')) {
        const date = t.split(' ')[0];  // "2022-09-01 00:00:00" -> "2022-09-01"
        dateSet.add(date);
    }
});
const allDates = Array.from(dateSet).sort();
console.log(`Total dates: ${allDates.length}`);
console.log(`Date range: ${allDates[0]} to ${allDates[allDates.length - 1]}`);

// 按日期分组行索引
const dateRowIndices = {};
times.forEach((t, idx) => {
    if (t && t.includes('-')) {
        const date = t.split(' ')[0];
        if (!dateRowIndices[date]) dateRowIndices[date] = [];
        dateRowIndices[date].push(idx);
    }
});

// 获取某日期某站点的小时数据
function getHourlyData(csvData, tazId, date) {
    const rows = dateRowIndices[date] || [];
    return rows.map(r => csvData[String(tazId)]?.[r] || 0.5);
}

// 获取占用率数据
function getOccSeries(tazId, date) {
    const data = getHourlyData(occCsv, tazId, date);
    return data.length === 24 ? data : Array(T).fill(0.35);
}

// 计算单站点需求
function calcDemand(sFee, ePrice, params, hour) {
    const P = Math.max(0.01, sFee + ePrice);
    const lnQ = params.const + params.b_t * (hour + 1) + params.beta1 * Math.log(P);
    return Math.exp(Math.max(-10, Math.min(10, lnQ)));
}

// 计算单站点利润
function calcStationProfit(sFees, ePrices, occSeries, params) {
    let totalProfit = 0;
    const occMax = Math.max(...occSeries, 0.01);
    
    for (let h = 0; h < T; h++) {
        const Q = calcDemand(sFees[h], ePrices[h], params, h);
        const cv = C_BASE * (1 + ETA * Math.pow(occSeries[h] / occMax, 2));
        totalProfit += Q * (sFees[h] - cv);
    }
    return totalProfit;
}

// 获取某小时对应的标签
function getHourLabel(hoursLabels, hour) {
    for (const [label, hours] of Object.entries(hoursLabels)) {
        if (hours.includes(hour)) return parseInt(label);
    }
    return 1;
}

// 获取标签对应的服务费
function getLabelFee(optFees, hoursLabels, hour) {
    const label = getHourLabel(hoursLabels, hour);
    return optFees[label] || 0.5;
}

// 单站点优化 - 使用网格搜索
function optimizeStation(ePrices, occSeries, params, hoursLabels) {
    let bestFees = {1: 0.4, 2: 0.4, 3: 0.4, 4: 0.4};
    let bestProfit = -Infinity;
    
    // 粗搜索
    const coarseGrid = [0.20, 0.35, 0.50, 0.65, 0.80];
    for (const l1 of coarseGrid) {
        for (const l2 of coarseGrid) {
            for (const l3 of coarseGrid) {
                for (const l4 of coarseGrid) {
                    const fees = {1: l1, 2: l2, 3: l3, 4: l4};
                    const hourlyFees = Array(T).fill(0).map((_, h) => getLabelFee(fees, hoursLabels, h));
                    const profit = calcStationProfit(hourlyFees, ePrices, occSeries, params);
                    if (profit > bestProfit) {
                        bestProfit = profit;
                        bestFees = {...fees};
                    }
                }
            }
        }
    }
    
    // 精细搜索
    const fineGrid = [];
    for (let v = S_MIN; v <= S_MAX; v += 0.05) fineGrid.push(v);
    
    for (const l1 of fineGrid) {
        for (const l2 of fineGrid) {
            for (const l3 of fineGrid) {
                for (const l4 of fineGrid) {
                    const fees = {1: l1, 2: l2, 3: l3, 4: l4};
                    const hourlyFees = Array(T).fill(0).map((_, h) => getLabelFee(fees, hoursLabels, h));
                    const profit = calcStationProfit(hourlyFees, ePrices, occSeries, params);
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

// 主优化循环 - 每天每个站点
console.log('\nStarting optimization...');

const allResults = {};
let processedDates = 0;
const totalDates = allDates.length;

for (const date of allDates) {
    processedDates++;
    console.log(`\nProcessing ${date} (${processedDates}/${totalDates})`);
    
    const dateResults = {};
    
    for (const [catName, params] of Object.entries(CATEGORIES)) {
        const hoursLabels = HOUR_LABELS[catName];
        const catStations = {};
        
        // 获取该类别的所有站点
        const catTazs = priceTazIds.filter(taz => {
            const poiRaw = tazCatMap[taz];
            const mappedCat = poiRaw ? POI_RAW_TO_CAT[poiRaw] : null;
            return mappedCat === catName;
        });
        
        let totalBaseProfit = 0;
        let totalOptProfit = 0;
        
        for (const tazId of catTazs) {
            const ePrices = getHourlyData(ePriceCsv, tazId, date);
            const sPrices = getHourlyData(sPriceCsv, tazId, date);
            const occSeries = getOccSeries(tazId, date);
            
            if (ePrices.length !== 24) continue;
            
            // 计算基础利润
            const baseProfit = calcStationProfit(sPrices, ePrices, occSeries, params);
            totalBaseProfit += baseProfit;
            
            // 优化
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
                catStations[tazId] = {1: 0.4, 2: 0.4, 3: 0.4, 4: 0.4};
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
    
    if (processedDates % 10 === 0) {
        console.log(`  Progress: ${processedDates}/${totalDates}`);
    }
}

// 保存结果
const outputPath = path.join(dataPath, 'optimization-results-daily.js');
const output = `// 多日全量优化结果（所有站点、所有天）\nwindow.OPTIMIZATION_RESULTS_DAILY = ${JSON.stringify(allResults, null, 2)};`;

fs.writeFileSync(outputPath, output, 'utf-8');

console.log(`\n${'='.repeat(60)}`);
console.log(`Results saved to: ${outputPath}`);
console.log(`${'='.repeat(60)}`);

// 生成摘要文件
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

const summaryPath = path.join(dataPath, 'optimization-summary-daily.js');
const summaryOutput = `// 多日优化摘要\nwindow.OPTIMIZATION_SUMMARY_DAILY = ${JSON.stringify(summary, null, 2)};`;
fs.writeFileSync(summaryPath, summaryOutput, 'utf-8');

console.log(`Summary saved to: ${summaryPath}`);
console.log('\nDone!');
