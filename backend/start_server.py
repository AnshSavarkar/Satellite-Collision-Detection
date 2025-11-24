#!/usr/bin/env python
"""
Simple Flask server starter script.
Run this in a separate terminal to keep the backend running.
"""
import os
import sys

# Ensure we're in the backend directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

# Import the Flask app
from app import app

# NOTE: If external requests to CelesTrak return 403 (rate limiting or blocking),
# you can set CELESTRAK_DISABLED=1 to serve a graceful error instead of failing cache warm.

# Allow overriding port via env BACKEND_PORT (default 5050 to avoid macOS AirPlay using 5000)
PORT = int(os.environ.get("BACKEND_PORT", "5050"))

if __name__ == "__main__":
    print("=" * 60)
    print("Starting Flask Backend Server")
    print("=" * 60)
    print(f"Backend directory: {backend_dir}")
    print(f"Server will run on: http://127.0.0.1:{PORT}")
    print("Press CTRL+C to stop the server")
    print("=" * 60)
    print()

    import threading, time, requests
    warmup_disabled = os.environ.get("WARMUP_DISABLED") == "1"

    def warmup():
        print("\n" + "=" * 60)
        print("CACHE WARMING: Pre-loading all orbit types...")
        print("=" * 60)
        for orbit in ["LEO", "MEO", "GEO", "HEO"]:
            try:
                print(f"  → Warming {orbit} cache...", end=" ", flush=True)
                start = time.time()
                r = requests.get(
                    f"http://127.0.0.1:{PORT}/api/tle/live?orbit={orbit}&format=tle&json=true",
                    timeout=60,
                    headers={"User-Agent": "CacheWarm/1.0"}
                )
                elapsed = time.time() - start
                if r.status_code == 200:
                    count = r.json().get("count", 0)
                    print(f"✓ {count} satellites in {elapsed:.1f}s")
                else:
                    print(f"✗ Failed (status {r.status_code})")
            except Exception as e:
                print(f"✗ Error: {repr(e)[:50]}")
        print("=" * 60)
        print("CACHE WARMING: Complete! All requests now instant.")
        print("=" * 60 + "\n")

    try:
        if not warmup_disabled:
            threading.Thread(target=warmup, daemon=True).start()
        else:
            print("Cache warmup skipped (WARMUP_DISABLED=1).")
        app.run(
            host="127.0.0.1",
            port=PORT,
            debug=True,
            use_reloader=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"\nServer error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
