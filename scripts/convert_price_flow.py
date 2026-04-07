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


def parse_datetime(value):
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y/%m/%d %H:%M:%S", "%Y/%m/%d"):
        try:
            return datetime.strptime(value, fmt)
        except Exception:
            continue
    raise ValueError(f"Unrecognized date format: {value}")


def get_time_col(header):
    for col in header[:2]:
        if col.lower() in ("date", "day", "time", "datetime"):
            return col
    return header[0]


def build_price_struct(header, data):
    time_col = get_time_col(header)
    t_index = header.index(time_col)
    taz_cols = [c for c in header if c != time_col]
    taz_idx = {c: header.index(c) for c in taz_cols}

    times = [parse_datetime(row[t_index]) for row in data]

    meta_days = sorted({t.strftime("%Y-%m-%d") for t in times})
    meta_months = sorted({t.strftime("%Y-%m") for t in times})

    out = {}
    for taz in taz_cols:
        idx = taz_idx[taz]
        series = [float(row[idx]) if row[idx] else 0.0 for row in data]
        # hourly avg
        hourly_sum = [0.0] * 24
        hourly_cnt = [0] * 24
        for t, v in zip(times, series):
            h = t.hour
            hourly_sum[h] += v
            hourly_cnt[h] += 1
        hourly_avg = [hourly_sum[h] / hourly_cnt[h] if hourly_cnt[h] else 0.0 for h in range(24)]

        # monthly hourly avg
        monthly_hourly = {}
        for m in meta_months:
            m_sum = [0.0] * 24
            m_cnt = [0] * 24
            for t, v in zip(times, series):
                if t.strftime("%Y-%m") == m:
                    h = t.hour
                    m_sum[h] += v
                    m_cnt[h] += 1
            monthly_hourly[m] = [m_sum[h] / m_cnt[h] if m_cnt[h] else 0.0 for h in range(24)]

        # heatmap (days x hours)
        day_map = {d: [0.0] * 24 for d in meta_days}
        day_cnt = {d: [0] * 24 for d in meta_days}
        for t, v in zip(times, series):
            d = t.strftime("%Y-%m-%d")
            h = t.hour
            day_map[d][h] += v
            day_cnt[d][h] += 1
        heat_values = []
        for d in meta_days:
            row = [day_map[d][h] / day_cnt[d][h] if day_cnt[d][h] else 0.0 for h in range(24)]
            heat_values.append(row)

        out[str(taz)] = {
            "hourly": series,
            "hourly_avg": hourly_avg,
            "monthly_hourly_avg": monthly_hourly,
            "heatmap": {"values": heat_values},
        }

    return out, meta_days, meta_months


def build_flow_struct(header, data, months):
    time_col = get_time_col(header)
    t_index = header.index(time_col)
    taz_cols = [c for c in header if c != time_col]
    taz_idx = {c: header.index(c) for c in taz_cols}
    times = [parse_datetime(row[t_index]) for row in data]

    out = {}
    for taz in taz_cols:
        idx = taz_idx[taz]
        series = [float(row[idx]) if row[idx] else 0.0 for row in data]
        monthly = {}
        for m in months:
            m_sum = [0.0] * 24
            m_cnt = [0] * 24
            for t, v in zip(times, series):
                if t.strftime("%Y-%m") == m:
                    h = t.hour
                    m_sum[h] += v
                    m_cnt[h] += 1
            monthly[m] = [m_sum[h] / m_cnt[h] if m_cnt[h] else 0.0 for h in range(24)]
        out[str(taz)] = {"monthly": monthly}
    return out


s_header, s_data = read_csv(os.path.join(base, "s_price.csv"))
e_header, e_data = read_csv(os.path.join(base, "e_price.csv"))
vol_header, vol_data = read_csv(os.path.join(base, "volume.csv"))
occ_header, occ_data = read_csv(os.path.join(base, "occupancy.csv"))

s_struct, meta_days, meta_months = build_price_struct(s_header, s_data)
e_struct, _, _ = build_price_struct(e_header, e_data)

price_data = {
    "meta": {"days": meta_days, "months": meta_months},
    "s_price": s_struct,
    "e_price": e_struct,
}

flow_months = sorted({parse_datetime(row[vol_header.index(get_time_col(vol_header))]).strftime("%Y-%m") for row in vol_data})
flow_data = {
    "meta": {"months": flow_months},
    "volume": build_flow_struct(vol_header, vol_data, flow_months),
    "occupancy": build_flow_struct(occ_header, occ_data, flow_months),
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
