import pandas as pd
import numpy as np
from scipy.optimize import minimize
import os
import json

# 聚类时段映射
hour_labels = {
    'Lifestyle Services': {1: [10, 11, 14, 15, 16, 17, 18], 2: [7, 8, 9, 12, 13, 19, 20, 21], 3: [22, 23],
                           4: [0, 1, 2, 3, 4, 5, 6]},
    'Food and Beverage Services': {1: [14, 15, 16, 17, 18, 19], 2: [8, 9, 10, 20, 21, 22, 23],
                                   3: [2, 3, 4, 5, 6, 7, 11, 12, 13], 4: [0, 1]},
    'Business and Residential': {1: [10, 11, 14, 15, 16, 17, 18], 2: [7, 8, 9, 12, 13, 19, 20], 3: [21, 22, 23],
                                 4: [0, 1, 2, 3, 4, 5, 6]}
}

# 论文参数（每个类别使用相同的参数）
categories_params = {
    'Lifestyle Services': {'rho': -0.0724, 'beta1': -5.5852, 'beta2': 0.4636, 'const': 6.4749, 'b_t': 0.0038},
    'Business and Residential': {'rho': -0.2358, 'beta1': -2.2836, 'beta2': 1.5628, 'const': 5.0514, 'b_t': 0.0045},
    'Food and Beverage Services': {'rho': 0.0274, 'beta1': -6.0837, 'beta2': -0.2428, 'const': 6.6915, 'b_t': 0.0052}
}

T, S_MIN, S_MAX, PHI_MAX = 24, 0.20, 0.80, 50
C_BASE, ETA = 0.05, 0.2

# TAZ类别映射（基于poiCategory）
TAZ_CATEGORY_MAP = {
    'lifestyle services': 'Lifestyle Services',
    'food and beverage services': 'Food and Beverage Services',
    'business and residential': 'Business and Residential'
}


def run_optimization_all():
    path = "./data/"
    inf_df = pd.read_csv(os.path.join(path, 'inf.csv'))
    e_price_df = pd.read_csv(os.path.join(path, 'e_price.csv')).iloc[:T]
    s_price_hist_df = pd.read_csv(os.path.join(path, 's_price.csv')).iloc[:T]
    occ_df = pd.read_csv(os.path.join(path, 'occupancy.csv')).iloc[:T]
    dist_mat = np.loadtxt(os.path.join(path, 'distance.csv'), delimiter=',')
    adj_mat = np.loadtxt(os.path.join(path, 'adj.csv'), delimiter=',')

    # 获取所有唯一的TAZ
    unique_tazs = []
    for tid in inf_df['TAZID']:
        if tid not in unique_tazs:
            unique_tazs.append(tid)
        if len(unique_tazs) == 276:
            break
    taz_to_idx = {taz: i for i, taz in enumerate(unique_tazs)}
    ts_taz_ids = [int(col) for col in e_price_df.columns if col.isdigit()]

    # 获取每个TAZ的类别（基于站点数据）
    stations_data_path = os.path.join(path, '../data/stations-data.js')
    # 读取站点数据获取poiCategory
    import re
    with open(os.path.join(path, '../data/stations-data.js'), 'r') as f:
        content = f.read()
    # 解析TAZ_POINTS
    taz_cat_map = {}  # tazid -> category
    matches = re.findall(r'\{"tazid":\s*"(\d+)",[^}]*poiCategory":\s*"([^"]+)"', content)
    for tazid, poi_cat in matches:
        cat = TAZ_CATEGORY_MAP.get(poi_cat.lower(), 'Business and Residential')
        taz_cat_map[int(tazid)] = cat

    print(f"Total TAZs with category: {len(taz_cat_map)}")

    # 结果存储
    all_results = {}

    # 按类别分组处理
    for cat_name, params in categories_params.items():
        print(f"\n{'='*60}")
        print(f"Processing: {cat_name}")
        print(f"{'='*60}")

        # 获取该类别的所有站点
        cat_tazs = [taz for taz in unique_tazs if taz in taz_cat_map and taz_cat_map[taz] == cat_name]
        cat_tazs = [t for t in cat_tazs if t in ts_taz_ids and t in taz_to_idx]
        N = len(cat_tazs)
        print(f"Stations in category: {N}")

        if N == 0:
            print("No stations found!")
            continue

        # 提取数据
        taz_counts = inf_df[inf_df['TAZID'].isin(cat_tazs)].groupby('TAZID')['charge_count'].sum().reindex(cat_tazs).values
        E = e_price_df[[str(tid) for tid in cat_tazs]].values
        S_h = s_price_hist_df[[str(tid) for tid in cat_tazs]].values
        Occ = occ_df[[str(tid) for tid in cat_tazs]].values

        # 空间矩阵
        idx = [taz_to_idx[tid] for tid in cat_tazs]
        W = adj_mat[np.ix_(idx, idx)] * (1.0 / (dist_mat[np.ix_(idx, idx)] ** 2 + 1e-6))
        np.fill_diagonal(W, 0)
        row_sums = W.sum(axis=1)
        W = np.divide(W, row_sums[:, np.newaxis], out=np.zeros_like(W), where=row_sums[:, np.newaxis] != 0)
        S_inv = np.linalg.inv(np.eye(N) - params['rho'] * W)

        def calc_profit(S_matrix):
            p_total = 0
            for t in range(24):
                P = np.clip(E[t, :] + S_matrix[t, :], 0.01, 10.0)
                ln_Q = S_inv @ (params['const'] + params['b_t'] * (t + 1) +
                                 params['beta1'] * np.log(P) +
                                 params['beta2'] * (W @ np.log(P)))
                Q_t = np.exp(np.clip(ln_Q, -10, 10))
                cv_t = C_BASE * (1 + ETA * (Occ[t, :] / (Occ[t, :].max() + 1e-6)) ** 2)
                p_total += np.sum(Q_t * (S_matrix[t, :] - cv_t))
            return p_total

        base_p = calc_profit(S_h)
        labels = hour_labels[cat_name]

        def objective(s_flat):
            S_lab = s_flat.reshape((4, N))
            S_full = np.zeros((24, N))
            for l, hs in labels.items():
                S_full[hs, :] = S_lab[l - 1, :]
            return -calc_profit(S_full) / 1000.0

        # 约束
        cons = []
        for t in range(24):
            def cap_con(s_flat, t=t):
                S_lab = s_flat.reshape((4, N))
                curr_l = [l for l, hs in labels.items() if t in hs][0]
                P = np.clip(E[t, :] + S_lab[curr_l - 1, :], 0.01, 10.0)
                ln_Q = S_inv @ (params['const'] + params['b_t'] * (t + 1) +
                                 params['beta1'] * np.log(P) +
                                 params['beta2'] * (W @ np.log(P)))
                return (taz_counts * PHI_MAX) - np.exp(np.clip(ln_Q, -10, 10))
            cons.append({'type': 'ineq', 'fun': cap_con})

        print(f"Optimizing {N} stations with {4*N} variables...")
        res = minimize(objective, np.full(4 * N, 0.5), method='SLSQP',
                       bounds=[(S_MIN, S_MAX)] * (4 * N),
                       constraints=cons,
                       options={'maxiter': 2000, 'ftol': 1e-4})

        print(f"Optimization result: {res.message}")

        if res.success or 'Iteration limit' in res.message:
            opt_p = -res.fun * 1000.0
            S_opt_lab = res.x.reshape((4, N))

            print(f"\nBase Profit: {base_p:.2f}, Opt Profit: {opt_p:.2f}")
            print(f"Profit Increase: {(opt_p - base_p) / abs(base_p) * 100:.2f}%")

            # 存储结果
            cat_results = {
                'profitIncrease': (opt_p - base_p) / abs(base_p) * 100,
                'occIncrease': 0,  # 计算占用率变化
                'baseProfit': base_p,
                'optProfit': opt_p,
                'stations': {}
            }

            # 为每个站点存储优化结果
            for i, tid in enumerate(cat_tazs):
                cat_results['stations'][str(tid)] = {
                    1: float(S_opt_lab[0, i]),
                    2: float(S_opt_lab[1, i]),
                    3: float(S_opt_lab[2, i]),
                    4: float(S_opt_lab[3, i])
                }

            all_results[cat_name] = cat_results

            # 打印部分站点结果
            print(f"\nSample station results (first 5):")
            for i, tid in enumerate(cat_tazs[:5]):
                print(f"  TAZ {tid}: L1={S_opt_lab[0,i]:.4f}, L2={S_opt_lab[1,i]:.4f}, L3={S_opt_lab[2,i]:.4f}, L4={S_opt_lab[3,i]:.4f}")
        else:
            print(f"Optimization Failed: {res.message}")

    # 保存结果
    output_path = os.path.join(path, '../optimization-results-all.js')
    with open(output_path, 'w') as f:
        f.write("// 全量优化结果（所有站点）\n")
        f.write("window.OPTIMIZATION_RESULTS = ")
        json.dump(all_results, f, indent=2, ensure_ascii=False)
        f.write(";")

    print(f"\n\nResults saved to: {output_path}")

    # 打印汇总表
    print(f"\n{'='*80}")
    print(f"{'Category':<28} | {'Base Profit':<12} | {'Opt Profit':<12} | {'Increase':<10}")
    print("-" * 80)
    for cat_name, results in all_results.items():
        print(f"{cat_name:<28} | {results['baseProfit']:12.2f} | {results['optProfit']:12.2f} | {results['profitIncrease']:8.2f}%")


if __name__ == "__main__":
    run_optimization_all()
