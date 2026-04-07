import os
import csv
import json
from datetime import datetime

base = r"D:\Cursor_Project\data"


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = list(reader)
    header = [h.strip() for h in rows[0]]
    data = rows[1:]
    return header, data


def parse_dt(value):
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unsupported datetime format: {value}")


def build_price_struct(header, rows):
    time_col = header[0]
    taz_cols = header[1:]
    times = [parse_dt(r[0]) for r in rows]
    days = sorted({t.strftime("%Y-%m-%d") for t in times})
    months = sorted({t.strftime("%Y-%m") for t in times})

    out = {}
    for idx, taz in enumerate(taz_cols):
        series = [float(r[idx + 1]) if r[idx + 1] else 0.0 for r in rows]

        # hourly avg
        hour_sum = {h: 0.0 for h in range(24)}
        hour_cnt = {h: 0 for h in range(24)}
        for t, val in zip(times, series):
            hour_sum[t.hour] += val
            hour_cnt[t.hour] += 1
        hourly_avg = [hour_sum[h] / hour_cnt[h] if hour_cnt[h] else 0.0 for h in range(24)]

        # monthly hourly avg
        monthly_hourly = {}
        for m in months:
            m_sum = {h: 0.0 for h in range(24)}
            m_cnt = {h: 0 for h in range(24)}
            for t, val in zip(times, series):
                if t.strftime("%Y-%m") == m:
                    m_sum[t.hour] += val
                    m_cnt[t.hour] += 1
            monthly_hourly[m] = [m_sum[h] / m_cnt[h] if m_cnt[h] else 0.0 for h in range(24)]

        # heatmap daily x hour
        day_map = {d: [0.0] * 24 for d in days}
        day_cnt = {d: [0] * 24 for d in days}
        for t, val in zip(times, series):
            d = t.strftime("%Y-%m-%d")
            day_map[d][t.hour] += val
            day_cnt[d][t.hour] += 1
        heat_values = []
        for d in days:
            heat_values.append([
                day_map[d][h] / day_cnt[d][h] if day_cnt[d][h] else 0.0
                for h in range(24)
            ])

        out[str(taz)] = {
            "hourly": series,
            "hourly_avg": hourly_avg,
            "monthly_hourly_avg": monthly_hourly,
            "heatmap": {"values": heat_values},
        }

    return {"meta": {"days": days, "months": months}, "data": out}


def build_flow_struct(header, rows):
    time_col = header[0]
    taz_cols = header[1:]
    times = [parse_dt(r[0]) for r in rows]
    months = sorted({t.strftime("%Y-%m") for t in times})

    out = {}
    for idx, taz in enumerate(taz_cols):
        series = [float(r[idx + 1]) if r[idx + 1] else 0.0 for r in rows]
        monthly = {}
        for m in months:
            m_sum = {h: 0.0 for h in range(24)}
            m_cnt = {h: 0 for h in range(24)}
            for t, val in zip(times, series):
                if t.strftime("%Y-%m") == m:
                    m_sum[t.hour] += val
                    m_cnt[t.hour] += 1
            monthly[m] = [m_sum[h] / m_cnt[h] if m_cnt[h] else 0.0 for h in range(24)]
        out[str(taz)] = {"monthly": monthly}

    return {"meta": {"months": months}, "data": out}


s_header, s_rows = read_csv(os.path.join(base, "s_price.csv"))
e_header, e_rows = read_csv(os.path.join(base, "e_price.csv"))
vol_header, vol_rows = read_csv(os.path.join(base, "volume.csv"))
occ_header, occ_rows = read_csv(os.path.join(base, "occupancy.csv"))

s_struct = build_price_struct(s_header, s_rows)
e_struct = build_price_struct(e_header, e_rows)

price_data = {
    "meta": s_struct["meta"],
    "s_price": s_struct["data"],
    "e_price": e_struct["data"],
}

vol_struct = build_flow_struct(vol_header, vol_rows)
occ_struct = build_flow_struct(occ_header, occ_rows)

flow_data = {
    "meta": vol_struct["meta"],
    "volume": vol_struct["data"],
    "occupancy": occ_struct["data"],
}

with open(os.path.join(base, "price-data.js"), "w", encoding="utf-8") as f:
    f.write("const PRICE_DATA = ")
    json.dump(price_data, f, ensure_ascii=False)
    f.write(";\n")

with open(os.path.join(base, "flow-data.js"), "w", encoding="utf-8") as f:
    f.write("const FLOW_DATA = ")
    json.dump(flow_data, f, ensure_ascii=False)
    f.write(";\n")

print("✅ Generated data/price-data.js and data/flow-data.js")
