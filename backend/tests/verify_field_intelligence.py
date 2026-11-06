import urllib.request
import json
import sys

locations = [
    ("Chennai", 13.0827, 80.2707),
    ("Punjab", 30.73, 76.78),
    ("Sao Paulo", -22.5, -48.0),
    ("Nairobi", -1.2921, 36.8219),
    ("Sydney", -33.8688, 151.2093),
    ("Tokyo (Arbitrary)", 35.6762, 139.6503),
]

all_passed = True
for label, lat, lon in locations:
    url = f"http://127.0.0.1:8000/api/field-intelligence/analyze?latitude={lat}&longitude={lon}&start_date=2025-11-06&end_date=2026-11-06&label={urllib.parse.quote(label)}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            code = resp.getcode()
            data = json.loads(resp.read().decode("utf-8"))
            loc = data["location"]
            period = data["period"]
            stress = data["stress"]
            gdd = data["climate"]["gdd"]["cumulative"]
            precip = data["climate"]["precipitation"]["total_mm"]
            print(f"[PASS] {label:18} | HTTP {code} | Lat={loc['latitude']:.4f}, Lon={loc['longitude']:.4f} | Finalized={period['valid_days']}/{period['days']} ({period['finalized_pct']}%) | GDD={gdd} | Precip={precip}mm | Stress={stress['score']} ({stress['level']}) | Demo={data['is_demo']}")
    except Exception as exc:
        print(f"[FAIL] {label:18} | ERROR: {exc}")
        all_passed = False

if not all_passed:
    sys.exit(1)
print("\nAll 6 target global locations passed successfully!")
