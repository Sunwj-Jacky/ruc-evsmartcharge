// 获取深圳历史天气数据 - 使用 Open-Meteo API（免费无需API Key）
const fs = require('fs');
const path = require('path');
const https = require('https');

const dataPath = path.join(__dirname, '../data/');

// 日期范围 (与优化数据一致)
const startDate = '2022-09-01';
const endDate = '2023-02-28';

// 深圳坐标 (宝安机场附近)
const LAT = 22.63;
const LON = 113.81;

// Open-Meteo 天气代码映射到 nRAIN (0-10)
function weatherCodeToRain(code) {
    // https://open-meteo.com/en/docs 天气代码
    // 0=晴, 1-3=多云, 45/48=雾, 51-67=毛毛雨到中雨, 71-77=雪, 80-82=阵雨, 85-86=阵雪, 95-99=雷暴
    if (code === 0) return 0;          // 晴
    if (code >= 1 && code <= 3) return 0; // 多云
    if (code === 45 || code === 48) return 0; // 雾
    if (code >= 51 && code <= 55) return 2;  // 毛毛雨
    if (code >= 56 && code <= 57) return 2;  // 冻毛毛雨
    if (code >= 61 && code <= 63) return 4;  // 小到中雨
    if (code >= 65 && code <= 67) return 6;  // 大雨
    if (code >= 71 && code <= 77) return 0;  // 雪
    if (code >= 80 && code <= 82) return 5;  // 阵雨
    if (code >= 85 && code <= 86) return 0;  // 阵雪
    if (code >= 95 && code <= 99) return 8;  // 雷暴
    return 0;
}

// 从 Open-Meteo API 获取数据
function fetchWeatherData(startDate, endDate) {
    return new Promise((resolve, reject) => {
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Asia%2FShanghai`;
        
        console.log('Fetching weather data from Open-Meteo...');
        console.log('URL:', url);
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// 主函数
async function main() {
    try {
        const weatherData = await fetchWeatherData(startDate, endDate);
        
        if (!weatherData.daily) {
            console.error('No daily data returned');
            return;
        }
        
        const dates = weatherData.daily.time;
        const tempMax = weatherData.daily.temperature_2m_max;
        const tempMin = weatherData.daily.temperature_2m_min;
        const precip = weatherData.daily.precipitation_sum;
        const weatherCodes = weatherData.daily.weathercode;
        
        const dailyWeather = {};
        
        for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const code = weatherCodes[i];
            const nRain = weatherCodeToRain(code);
            const temp = {
                max: tempMax[i],
                min: tempMin[i],
                avg: ((tempMax[i] + tempMin[i]) / 2).toFixed(1)
            };
            
            // 判断是否为工作日 - 使用本地时区
            // 2022-09-01 是星期四 (工作日)
            const d = new Date(date + 'T00:00:00');  // 添加时间部分确保本地时区
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            dailyWeather[date] = {
                temperature: temp,
                nRain: nRain,
                precipitation: precip[i],
                isWeekend: isWeekend,
                weatherDesc: getWeatherDesc(code)
            };
        }
        
        console.log(`Got weather data for ${Object.keys(dailyWeather).length} days`);
        
        // 保存到文件
        const outputPath = path.join(dataPath, 'shenzhen-weather.js');
        const output = `// 深圳历史天气数据 (来源: Open-Meteo Archive API)\nwindow.SHENGZHEN_WEATHER = ${JSON.stringify(dailyWeather, null, 2)};`;
        fs.writeFileSync(outputPath, output, 'utf-8');
        console.log(`Saved to: ${outputPath}`);
        
        // 打印统计
        let rainyDays = 0;
        let weekendDays = 0;
        let avgTemp = 0;
        Object.values(dailyWeather).forEach(w => {
            if (w.nRain > 0) rainyDays++;
            if (w.isWeekend) weekendDays++;
            avgTemp += parseFloat(w.temperature.avg);
        });
        console.log(`\n统计:`);
        console.log(`  雨天数: ${rainyDays}`);
        console.log(`  周末天数: ${weekendDays}`);
        console.log(`  平均温度: ${(avgTemp / Object.keys(dailyWeather).length).toFixed(1)}°C`);
        
    } catch (e) {
        console.error('Error:', e.message);
    }
}

function getWeatherDesc(code) {
    const descs = {
        0: '晴',
        1: '晴间多云', 2: '多云', 3: '阴',
        45: '雾', 48: '霜雾',
        51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
        56: '冻毛毛雨', 57: '冻毛毛雨',
        61: '小雨', 63: '中雨', 65: '大雨',
        66: '冻雨', 67: '冻雨',
        71: '小雪', 73: '中雪', 75: '大雪',
        77: '雪粒',
        80: '阵雨', 81: '中阵雨', 82: '大阵雨',
        85: '阵雪', 86: '大阵雪',
        95: '雷暴', 96: '雷暴+冰雹', 99: '雷暴+大冰雹'
    };
    return descs[code] || '未知';
}

main();
