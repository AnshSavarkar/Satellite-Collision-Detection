"""Debug server starter with error logging"""
import os
import sys
import traceback

# Setup path
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

print("=" * 60)
print("DEBUG: Starting Flask Backend Server")
print("=" * 60)
print(f"Working directory: {os.getcwd()}")
print(f"Python path includes: {backend_dir}")
print()

try:
    print("DEBUG: Importing app module...")
    from app import app
    print("DEBUG: App imported successfully!")
    print(f"DEBUG: Flask app object: {app}")
    print()
    
    print("DEBUG: Starting server on http://127.0.0.1:5000...")
    print("=" * 60)
    print()
    
    # Start background cache warming
    import threading
    import time as _time
    def warmup():
        _time.sleep(5)  # Wait for server to be fully ready
        import requests
        print("\n" + "=" * 60)
        print("CACHE WARMING: Pre-loading all orbit types...")
        print("=" * 60)
        for orbit in ["LEO", "MEO", "GEO", "HEO"]:
            try:
                print(f"  → Warming {orbit} cache...", end=" ", flush=True)
                start = _time.time()
                r = requests.get(f"http://127.0.0.1:5000/api/tle/live?orbit={orbit}&format=tle&json=true", timeout=90)
                elapsed = _time.time() - start
                if r.status_code == 200:
                    count = r.json().get("count", 0)
                    print(f"✓ {count} satellites in {elapsed:.1f}s")
                else:
                    print(f"✗ Failed (status {r.status_code})")
            except Exception as e:
                print(f"✗ Error: {str(e)[:80]}")
        print("=" * 60)
        print("CACHE WARMING: Complete! All requests now instant.")
        print("=" * 60 + "\n")
    
    warmup_thread = threading.Thread(target=warmup, daemon=True)
    warmup_thread.start()
    
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        use_reloader=False,
        threaded=True
    )
except Exception as e:
    print(f"\n!!! ERROR DURING STARTUP !!!")
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
    sys.exit(1)
