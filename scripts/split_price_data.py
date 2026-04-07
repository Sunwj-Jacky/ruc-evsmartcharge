import json
from pathlib import Path

base = Path(r"D:\Cursor_Project\data")
src = base / "price-data.js"

text = src.read_text(encoding="utf-8").strip()
prefix = "const PRICE_DATA ="
if not text.startswith(prefix):
    raise ValueError("Unexpected format in price-data.js")

payload = text[len(prefix):].strip()
if payload.endswith(";"):
    payload = payload[:-1]

obj = json.loads(payload)

meta = obj.get("meta", {})
s_price = obj.get("s_price", {})
e_price = obj.get("e_price", {})

keys = sorted(set(s_price.keys()) | set(e_price.keys()), key=lambda x: int(x) if str(x).isdigit() else str(x))
if not keys:
    raise ValueError("No station keys found")

# 3 nearly equal chunks
n = len(keys)
size = (n + 2) // 3
chunks = [keys[0:size], keys[size:2*size], keys[2*size:]]

parts = []
for i, chunk_keys in enumerate(chunks, start=1):
    part = {
        "meta": meta if i == 1 else {},
        "s_price": {k: s_price[k] for k in chunk_keys if k in s_price},
        "e_price": {k: e_price[k] for k in chunk_keys if k in e_price},
    }
    out = base / f"price-data-{i}.js"
    out.write_text(
        f"window.PRICE_DATA_PART_{i} = " + json.dumps(part, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    parts.append((i, len(chunk_keys), out.name))

print("Split complete:")
for i, cnt, name in parts:
    print(f"  part {i}: {cnt} keys -> {name}")
