// 全量优化脚本 - 为所有站点计算最优定价
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

// 聚类时段映射（使用 poiRaw 小写）
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

// poiRaw 到英文类别的映射
const POI_RAW_TO_CAT = {
    'lifestyle services': 'Lifestyle Services',
    'food and beverage services': 'Food and Beverage Services',
    'business and residential': 'Business and Residential'
};

const T = 24, S_MIN = 0.20, S_MAX = 0.80, PHI_MAX = 50;
const C_BASE = 0.05, ETA = 0.2;

// 加载站点数据
const stationsData = loadJSVar('stations-data.js', 'TAZ_POINTS');

// 构建 TAZ -> 类别映射（使用 poiRaw）
const tazCatMap = {};
if (stationsData && Array.isArray(stationsData)) {
    stationsData.forEach(p => {
        if (p.tazid && p.poiRaw) {
            tazCatMap[p.tazid] = p.poiRaw.toLowerCase();
        }
    });
}

console.log('TAZ category mapping loaded:', Object.keys(tazCatMap).length);

// 加载价格和占用率数据
const infCsv = readCSV('inf.csv');
const ePriceCsv = readCSV('e_price.csv');
const sPriceCsv = readCSV('s_price.csv');
const occCsv = readCSV('occupancy.csv');

// 获取所有 TAZ
const allTazIds = [...new Set(infCsv.TAZID)];

console.log(`Total TAZs loaded: ${allTazIds.length}`);

// 获取每个 TAZ 的 charge_count
const tazChargeCount = {};
infCsv.TAZID.forEach((taz, i) => {
    if (!tazChargeCount[taz]) tazChargeCount[taz] = 0;
    tazChargeCount[taz] += infCsv.charge_count[i] || 1;
});

// 获取价格数据列名
const priceTazIds = Object.keys(ePriceCsv).filter(k => !isNaN(k) && k !== 'hour');

// 获取占用率数据
function getOccSeries(tazId) {
    const idx = priceTazIds.indexOf(String(tazId));
    if (idx >= 0 && occCsv[priceTazIds[idx]]) {
        return occCsv[priceTazIds[idx]].slice(0, T);
    }
    return Array(T).fill(0.35);
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
    // 网格搜索最优标签费用
    let bestFees = {1: 0.4, 2: 0.4, 3: 0.4, 4: 0.4};
    let bestProfit = -Infinity;
    
    const searchGrid = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80];
    
    // 简化：只优化4个标签级别
    for (const l1 of searchGrid) {
        for (const l2 of searchGrid) {
            for (const l3 of searchGrid) {
                for (const l4 of searchGrid) {
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
    
    // 精细化搜索
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

// 主优化循环
const allResults = {};

for (const [catName, params] of Object.entries(CATEGORIES)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${catName}`);
    console.log(`${'='.repeat(60)}`);
    
    // 获取该类别的所有站点（需要将 poiRaw 映射到英文类别名）
    const catTazs = allTazIds.filter(taz => {
        const poiRaw = tazCatMap[String(taz)] || tazCatMap[taz];
        const mappedCat = poiRaw ? POI_RAW_TO_CAT[poiRaw] : null;
        return mappedCat === catName && priceTazIds.includes(String(taz));
    });
    console.log(`Stations in category: ${catTazs.length}`);
    
    if (catTazs.length === 0) {
        console.log('No stations found!');
        continue;
    }
    
    const hoursLabels = HOUR_LABELS[catName];
    const catStations = {};
    let totalBaseProfit = 0;
    let totalOptProfit = 0;
    let successCount = 0;
    
    // 优化每个站点
    for (const tazId of catTazs) {
        const ePrices = ePriceCsv[String(tazId)]?.slice(0, T) || Array(T).fill(0.5);
        const sPrices = sPriceCsv[String(tazId)]?.slice(0, T) || Array(T).fill(0.5);
        const occSeries = getOccSeries(tazId);
        
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
            successCount++;
        } catch (err) {
            console.log(`  Error optimizing TAZ ${tazId}: ${err.message}`);
            catStations[tazId] = {1: 0.4, 2: 0.4, 3: 0.4, 4: 0.4};
        }
        
        if (catTazs.indexOf(tazId) % 50 === 0) {
            console.log(`  Progress: ${catTazs.indexOf(tazId) + 1}/${catTazs.length}`);
        }
    }
    
    const profitInc = totalBaseProfit !== 0 ? ((totalOptProfit - totalBaseProfit) / Math.abs(totalBaseProfit) * 100) : 0;
    
    allResults[catName] = {
        profitIncrease: parseFloat(profitInc.toFixed(2)),
        occIncrease: 0,
        baseProfit: parseFloat(totalBaseProfit.toFixed(2)),
        optProfit: parseFloat(totalOptProfit.toFixed(2)),
        stations: catStations
    };
    
    console.log(`\nResults:`);
    console.log(`  Base Profit: ${totalBaseProfit.toFixed(2)}`);
    console.log(`  Opt Profit: ${totalOptProfit.toFixed(2)}`);
    console.log(`  Increase: ${profitInc.toFixed(2)}%`);
    console.log(`  Success: ${successCount}/${catTazs.length}`);
    
    // 打印样本
    const sampleTazs = catTazs.slice(0, 3);
    console.log(`\nSample station results:`);
    sampleTazs.forEach(taz => {
        const s = catStations[taz];
        console.log(`  TAZ ${taz}: L1=${s[1]}, L2=${s[2]}, L3=${s[3]}, L4=${s[4]}`);
    });
}

// 保存结果
const outputPath = path.join(dataPath, 'optimization-results-all.js');
const output = `// 全量优化结果（所有站点）\nwindow.OPTIMIZATION_RESULTS = ${JSON.stringify(allResults, null, 2)};`;

fs.writeFileSync(outputPath, output, 'utf-8');

console.log(`\n${'='.repeat(60)}`);
console.log(`Results saved to: ${outputPath}`);
console.log(`${'='.repeat(60)}`);

// 汇总表
console.log(`\nSummary:`);
console.log('Category                  | Base Profit  | Opt Profit   | Increase');
console.log('------------------------------------------------------------------');
for (const [catName, results] of Object.entries(allResults)) {
    console.log(`${catName.padEnd(24)} | ${results.baseProfit.toFixed(2).padStart(12)} | ${results.optProfit.toFixed(2).padStart(12)} | ${results.profitIncrease.toFixed(2)}%`);
}
