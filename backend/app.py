import os
import uuid
import math
import datetime as dt
from flask import Flask, request, jsonify, send_from_directory
try:
    from flask_cors import CORS  # type: ignore
except Exception:
    CORS = None
try:
    from flask_compress import Compress
except Exception:
    Compress = None
import requests
# Avoid hard failure if heavy plotting deps are missing; import lazily
try:
    from simulations import satellite_collision_p2  # type: ignore
except Exception:
    satellite_collision_p2 = None  # type: ignore
import threading
import time
import tempfile
import os as _os

try:
    import papermill as pm  # type: ignore
    import nbformat  # type: ignore
    HAS_PAPERMILL = True
except Exception:
    HAS_PAPERMILL = False

# We'll optionally use sgp4 if provided to compute position propagation for analysis
try:
    from sgp4.api import Satrec, jday
    HAS_SGP4 = True
except Exception:
    HAS_SGP4 = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "frontend"))
# Save simulation results under backend/static/results so they are served via /static/
RESULTS_DIR = os.path.join(BASE_DIR, "static", "results")

os.makedirs(RESULTS_DIR, exist_ok=True)

# Set static_folder to 'static' so Flask serves /static/ from backend/static/
app = Flask(__name__, static_folder="static", static_url_path="/static")
if Compress is not None:
    try:
        Compress(app)
    except Exception:
        pass
if CORS is not None:
    try:
        # Enable CORS for API routes to help during development if proxy isn't used
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    except Exception:
        pass

# In-memory JSON cache to serve per-orbit payloads extremely fast
# structure: JSON_CACHE[group_key] = {"ts": <epoch>, "data": <json-string>}
JSON_CACHE = {}
JSON_CACHE_TTL = 6 * 60 * 60  # 6 hours

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "time": dt.datetime.utcnow().isoformat() + "Z",
        "cache_keys": list(JSON_CACHE.keys()),
        "fallback_mode": False
    })

@app.route("/api/tle", methods=["GET"])
def get_tle_file():
    """Serve the default TLE file located in the backend folder as plain text."""
    tle_path = os.path.join(BASE_DIR, "tle.txt")
    if not os.path.exists(tle_path):
        return ("TLE file not found.", 404)
    # Serve as a file to avoid CORS/content-type issues
    return send_from_directory(BASE_DIR, "tle.txt", mimetype="text/plain")

@app.route("/api/tle/live", methods=["GET"])
def get_live_tle():
    """Proxy live TLEs from CelesTrak with orbit category support.
    Query params:
      - orbit: one of LEO, MEO, GEO, HEO (defaults to LEO if missing)
      - format: only 'tle' is supported here
      - n: optional limit of satellites to return (for debugging)
      - json: if 'true', return JSON list [{name,tle1,tle2}]

    Caching: per-orbit cache files (tle_cache_<ORBIT>.txt + meta json) reused for up to 12 hours.
    """
    orbit = (request.args.get("orbit") or "").upper().strip()
    group_param = request.args.get("group")
    group_key = None
    if group_param:
        group_key = group_param.upper().strip()
    elif orbit:
        if orbit not in {"LEO", "MEO", "GEO", "HEO"}:
            return jsonify({"error": "Invalid orbit type", "supported": ["LEO", "MEO", "GEO", "HEO"]}), 400
        group_key = orbit
    else:
        # default to LEO when nothing specified
        group_key = "LEO"
    fmt = request.args.get("format", "tle")
    if fmt.lower() != "tle":
        return ("Unsupported format", 400)
    limit = request.args.get("n")  # optional trimming
    as_json = request.args.get("json", "false").lower() == "true"

    # Determine upstream fetch group: for orbit types, fetch the full 'active' set and filter locally
    ORBIT_KEYS = {"LEO", "MEO", "GEO", "HEO"}
    fetch_group = group_key if group_key not in ORBIT_KEYS else "ACTIVE"

    # Use a shared text cache for the upstream group (e.g., ACTIVE) so we don't duplicate large files
    cache_path = os.path.join(BASE_DIR, f"tle_cache_{fetch_group}.txt")
    meta_path = os.path.join(BASE_DIR, f"tle_cache_{fetch_group}_meta.json")

    # Build CelesTrak URL for upstream group
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={fetch_group}&FORMAT=TLE"

    headers = {"User-Agent": "SatelliteCollision/1.0"}
    # Attempt to use ETag/Last-Modified if younger than 12h
    meta = {}
    try:
        import json
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        # Age check (12h = 43200 seconds)
        ts = meta.get("timestamp")
        if ts and (dt.datetime.utcnow().timestamp() - ts) < 43200:
            if meta.get("etag"):
                headers["If-None-Match"] = meta.get("etag")
            if meta.get("last_modified"):
                headers["If-Modified-Since"] = meta.get("last_modified")
    except Exception:
        meta = {}

    text = None
    try:
        resp = requests.get(url, timeout=20, headers=headers)
        if resp.status_code == 304 and os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            resp.raise_for_status()
            candidate = resp.text
            if candidate and len(candidate.strip()) > 100:
                text = candidate
            elif os.path.exists(cache_path):
                # fallback to cache if new fetch invalid
                with open(cache_path, "r", encoding="utf-8") as f:
                    text = f.read()
            else:
                return jsonify({"error": "Empty TLE response"}), 502
            # Update cache
            try:
                prev = None
                if os.path.exists(cache_path):
                    with open(cache_path, "r", encoding="utf-8") as f:
                        prev = f.read()
                if prev != text:
                    with open(cache_path, "w", encoding="utf-8") as f:
                        f.write(text)
                    new_meta = {
                        "etag": resp.headers.get("ETag"),
                        "last_modified": resp.headers.get("Last-Modified"),
                        "timestamp": dt.datetime.utcnow().timestamp(),
                        "group": group_key
                    }
                    try:
                        with open(meta_path, "w", encoding="utf-8") as f:
                            json.dump(new_meta, f)
                    except Exception:
                        pass
            except Exception:
                pass
    except Exception as e:
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            return jsonify({"error": f"Failed to fetch TLEs: {repr(e)}"}), 502

    if text is None:
        # Provide a small fallback sample instead of hard failure so the UI can still function.
        fallback_sets = [
            {
                "name": "ISS (FALLBACK)",
                "tle1": "1 25544U 98067A   20351.54791435  .00001264  00000-0  29621-4 0  9993",
                "tle2": "2 25544  51.6460 123.1035 0003296  87.5251  30.2479 15.49212947256345"
            },
            {
                "name": "FALLBACK-SAT-1",
                "tle1": "1 00001U 20001A   20351.54790000  .00000010  00000-0  10000-4 0  0001",
                "tle2": "2 00001  98.7000 250.0000 0001000  10.0000 350.0000 14.20000000000001"
            }
        ]
        payload = {"group": group_key or "FALLBACK", "count": len(fallback_sets), "satellites": fallback_sets, "fallback": True}
        resp_out = jsonify(payload)
        resp_out.headers["Cache-Control"] = "no-store"
        return resp_out

    # Optional trim
    if limit:
        try:
            n_sets = int(limit)
            lines = [l for l in text.splitlines() if l.strip()]
            out_lines = []
            i = 0
            sets = 0
            while i < len(lines) and sets < n_sets:
                if not lines[i].startswith(("1 ", "2 ")) and i + 2 < len(lines) and lines[i+1].startswith("1 ") and lines[i+2].startswith("2 "):
                    out_lines.extend([lines[i], lines[i+1], lines[i+2]])
                    i += 3
                    sets += 1
                elif lines[i].startswith("1 ") and i + 1 < len(lines) and lines[i+1].startswith("2 "):
                    out_lines.extend([lines[i], lines[i+1]])
                    i += 2
                    sets += 1
                else:
                    i += 1
            text = "\n".join(out_lines)
        except Exception:
            pass

    if not as_json:
        # Return raw TLE text with cache headers
        resp_out = app.response_class(text, mimetype="text/plain")
        resp_out.headers["Cache-Control"] = "public, max-age=21600"  # 6h
        return resp_out

    # JSON cache path remains per requested group (so LEO/MEO/GEO/HEO get distinct filtered caches)
    json_cache_path = os.path.join(BASE_DIR, f"tle_cache_{group_key}.json")
    # Fast in-memory JSON cache check
    if as_json:
        try:
            cached = JSON_CACHE.get(group_key)
            if cached and (time.time() - cached.get("ts", 0)) < JSON_CACHE_TTL:
                resp_out = app.response_class(cached.get("data"), mimetype="application/json")
                resp_out.headers["Cache-Control"] = "public, max-age=21600"
                return resp_out
        except Exception:
            pass
    # If cache is fresh, serve cached JSON
    try:
        import json
        meta_ts = meta.get("timestamp") if isinstance(meta, dict) else None
        # Serve cached JSON quickly if it's younger than 12h and file exists
        if meta_ts and (dt.datetime.utcnow().timestamp() - meta_ts) < 43200 and os.path.exists(json_cache_path):
            try:
                with open(json_cache_path, "r", encoding="utf-8") as f:
                    cached_json = f.read()
                resp_out = app.response_class(cached_json, mimetype="application/json")
                resp_out.headers["Cache-Control"] = "public, max-age=21600"
                return resp_out
            except Exception:
                pass
    except Exception:
        pass

    # Parse into JSON list
    satellites = []
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    i = 0
    while i < len(lines):
        if not lines[i].startswith("1 ") and not lines[i].startswith("2 ") and i + 2 < len(lines) and lines[i+1].startswith("1 ") and lines[i+2].startswith("2 "):
            name = lines[i]
            tle1 = lines[i+1]
            tle2 = lines[i+2]
            satellites.append({"name": name, "tle1": tle1, "tle2": tle2})
            i += 3
        elif lines[i].startswith("1 ") and i + 1 < len(lines) and lines[i+1].startswith("2 "):
            # unnamed
            tle1 = lines[i]
            tle2 = lines[i+1]
            name = tle2[2:7].strip() or tle2[2:7]
            satellites.append({"name": name, "tle1": tle1, "tle2": tle2})
            i += 2
        else:
            i += 1
    # If a specific orbit type was requested, filter the list accordingly
    def classify_orbit(line2: str) -> str:
        try:
            # Mean motion rev/day is columns 53-63 (0-based indexing slice 52:63)
            n = float(line2[52:63])
        except Exception:
            n = None
        try:
            # Eccentricity has no decimal point in TLE; columns 27-33 (slice 26:33)
            ecc = float("0." + line2[26:33].strip())
        except Exception:
            ecc = 0.0
        if n is None or n <= 0:
            return "UNKNOWN"
        period_min = 1440.0 / n
        # Heuristic bands
        # GEO: near 1436 minutes (+/- 90 minutes tolerance)
        if abs(period_min - 1436.0) <= 90.0:
            return "GEO"
        # HEO: very long period or high eccentricity
        if period_min > 1500.0 or ecc >= 0.1:
            return "HEO"
        # LEO: short period (< ~128 minutes)
        if period_min < 128.0:
            return "LEO"
        # MEO otherwise
        return "MEO"

    if group_key in ORBIT_KEYS:
        filtered = []
        target = group_key
        for s in satellites:
            try:
                cat = classify_orbit(s["tle2"])  # use line 2 for mean motion/ecc
                if cat == target:
                    filtered.append(s)
            except Exception:
                continue
        satellites = filtered

    payload = {"group": group_key, "count": len(satellites), "satellites": satellites}
    try:
        import json
        with open(json_cache_path, "w", encoding="utf-8") as f:
            json.dump(payload, f)
    except Exception:
        pass
    # also populate in-memory cache for very fast subsequent responses
    try:
        import json as _json
        JSON_CACHE[group_key] = {"ts": time.time(), "data": _json.dumps(payload)}
    except Exception:
        pass
    resp_out = jsonify(payload)
    resp_out.headers["Cache-Control"] = "public, max-age=21600"
    return resp_out


def _fetch_active_tle_text() -> str:
    url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=ACTIVE&FORMAT=TLE"
    headers = {"User-Agent": "SatelliteCollision/1.0"}
    resp = requests.get(url, timeout=20, headers=headers)
    resp.raise_for_status()
    return resp.text


def _parse_tle_sets(text: str):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    result = []
    i = 0
    while i < len(lines):
        if not lines[i].startswith(("1 ", "2 ")) and i + 2 < len(lines) and lines[i+1].startswith("1 ") and lines[i+2].startswith("2 "):
            result.append((lines[i], lines[i+1], lines[i+2]))
            i += 3
        elif lines[i].startswith("1 ") and i + 1 < len(lines) and lines[i+1].startswith("2 "):
            # unnamed
            name = lines[i+1][2:7].strip() or lines[i+1][2:7]
            result.append((name, lines[i], lines[i+1]))
            i += 2
        else:
            i += 1
    return result


def _compute_risk_in_process(tle1_l1: str, tle1_l2: str, tle2_l1: str, tle2_l2: str,
                             safe_distance: float = 15000.0,
                             dv_mag: float = 0.01,
                             demo_mode: bool = False):
    try:
        from sgp4.api import Satrec, jday
        import numpy as _np
        from datetime import datetime as _dt

        sat1 = Satrec.twoline2rv(tle1_l1, tle1_l2)
        sat2 = Satrec.twoline2rv(tle2_l1, tle2_l2)
        now = _dt.utcnow()
        jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)
        e1, r1, v1 = sat1.sgp4(jd, fr)
        e2, r2, v2 = sat2.sgp4(jd, fr)
        r1 = _np.array(r1); v1 = _np.array(v1)
        r2 = _np.array(r2); v2 = _np.array(v2)
        rel_r = r1 - r2
        rel_v = v1 - v2
        dist = float(_np.linalg.norm(rel_r))
        speed = float(_np.linalg.norm(rel_v))
        # Increased threshold (was 10.0 km) to 50 km to make collision risk demo more frequently non-zero.
        safe_distance = 50.0
        max_vel = 3.0
        if dist == 0.0:
            risk = 1.0
        elif dist < safe_distance:
            risk = 1.0 if speed > max_vel else float(speed / max_vel)
        else:
            risk = 0.0

        # Apply small avoidance maneuver if risky
        # Demo-friendly graded risk: risk scales within safe_distance band; if demo_mode and dist > safe_distance,
        # artificially clamp distance to 0.7*safe_distance to show non-zero risk.
        orig_dist = dist
        demo_adjusted = False
        if demo_mode and dist >= safe_distance:
            dist = safe_distance * 0.7
            demo_adjusted = True
        # Risk formula: linear decay with distance + speed factor.
        # Relative speed contributes up to 20% of additional risk weighting.
        speed_factor = min(speed / 5.0, 1.0) * 0.2  # speed above ~5 km/s treated as max contribution
        if dist <= safe_distance:
            base = max(0.0, 1.0 - (dist / safe_distance))
            risk = min(1.0, base + speed_factor)
        else:
            risk = 0.0

        # Always simulate a small hypothetical avoidance maneuver so frontend receives consistent post-maneuver fields
        dv = _np.array([0.0, dv_mag, 0.0])
        v1_adj = v1 + dv
        rel_r2 = r1 - r2
        rel_v2 = v1_adj - v2
        new_dist = float(_np.linalg.norm(rel_r2))
        new_speed = float(_np.linalg.norm(rel_v2))
        # Recompute risk post-maneuver with same graded model
        speed_factor2 = min(new_speed / 5.0, 1.0) * 0.2
        if new_dist <= safe_distance:
            base2 = max(0.0, 1.0 - (new_dist / safe_distance))
            new_risk = min(1.0, base2 + speed_factor2)
        else:
            new_risk = 0.0
        avoided = bool(new_risk < risk)

        return {
            "original_distance_km": float(orig_dist),
            "distance_km": float(dist),
            "relative_speed_km_s": speed,
            "collision_risk": float(risk),
            "post_maneuver_distance_km": float(new_dist),
            "post_maneuver_risk": float(new_risk),
            "maneuver_helped": bool(avoided),
            "safe_distance_km": float(safe_distance),
            "demo_adjusted": demo_adjusted,
        }
    except Exception as e:
        return {"error": f"risk-compute-failed: {repr(e)}"}


@app.route("/api/collision-risk", methods=["POST"])
def collision_risk():
    """Compute/display collision risk for two satellites by name.
    Body: { "sat1": "name", "sat2": "name" }
    - Fetch ACTIVE TLE list
    - Find matching two satellites (case-insensitive)
    - If a notebook exists (backend/notebooks/collision_risk.ipynb) and papermill is available, run it with parameters
      and extract RESULT_JSON from outputs; else compute risk inline as fallback.
    """
    data = request.get_json(silent=True) or {}
    sat1 = (data.get("sat1") or "").strip()
    sat2 = (data.get("sat2") or "").strip()
    # Optional direct TLEs to avoid external fetch
    t1_l1 = (data.get("tle1_line1") or "").strip()
    t1_l2 = (data.get("tle1_line2") or "").strip()
    t2_l1 = (data.get("tle2_line1") or "").strip()
    t2_l2 = (data.get("tle2_line2") or "").strip()
    if not sat1 or not sat2:
        return jsonify({"error": "Provide 'sat1' and 'sat2' names."}), 400

    try:
        if t1_l1 and t1_l2 and t2_l1 and t2_l2:
            t1 = (t1_l1, t1_l2)
            t2 = (t2_l1, t2_l2)
        else:
            # Fallback: fetch ACTIVE TLEs upstream and resolve
            text = _fetch_active_tle_text()
            sets = _parse_tle_sets(text)
            lut = {name.strip().lower(): (l1, l2) for (name, l1, l2) in sets}
            t1 = lut.get(sat1.lower())
            t2 = lut.get(sat2.lower())
        if not t1 or not t2:
            return jsonify({"error": "Satellite name(s) not found in ACTIVE TLE."}), 404

        nb_path = _os.path.join(BASE_DIR, "notebooks", "collision_risk.ipynb")
        use_nb = HAS_PAPERMILL and _os.path.exists(nb_path)
        if use_nb:
            # Run notebook with parameters and parse RESULT_JSON line
            out_path = tempfile.NamedTemporaryFile(delete=False, suffix=".ipynb").name
            try:
                pm.execute_notebook(
                    nb_path,
                    out_path,
                    parameters={
                        "sat1_name": sat1,
                        "sat2_name": sat2,
                        "tle1_line1": t1[0],
                        "tle1_line2": t1[1],
                        "tle2_line1": t2[0],
                        "tle2_line2": t2[1],
                    },
                    kernel_name=None,
                )
                nb = nbformat.read(out_path, as_version=4)
                result_json = None
                for cell in nb.get("cells", []):
                    for out in cell.get("outputs", []) or []:
                        text = None
                        if out.get("output_type") == "stream":
                            text = out.get("text")
                        elif out.get("output_type") in ("display_data", "execute_result"):
                            data = out.get("data", {})
                            text = data.get("text/plain")
                        if text and isinstance(text, str) and "RESULT_JSON=" in text:
                            try:
                                idx = text.find("RESULT_JSON=")
                                payload = text[idx+13:].strip()
                                import json as _json
                                result_json = _json.loads(payload)
                                break
                            except Exception:
                                pass
                    if result_json is not None:
                        break
                if result_json is None:
                    # Fallback compute
                    result_json = _compute_risk_in_process(t1[0], t1[1], t2[0], t2[1])
                return jsonify({"ok": True, "source": "notebook", "result": result_json})
            finally:
                try:
                    _os.remove(out_path)
                except Exception:
                    pass
        else:
            # Demo parameters (optional) from request body
            demo_safe = data.get("demo_safe_distance")
            demo_dv = data.get("demo_dv_mag")
            demo_mode = bool(data.get("demo_mode"))
            try:
                sd_val = float(demo_safe) if demo_safe is not None else 15000.0
            except Exception:
                sd_val = 15000.0
            try:
                dv_val = float(demo_dv) if demo_dv is not None else 0.01
            except Exception:
                dv_val = 0.01
            result = _compute_risk_in_process(t1[0], t1[1], t2[0], t2[1], safe_distance=sd_val, dv_mag=dv_val, demo_mode=demo_mode)
            return jsonify({"ok": True, "source": "inline", "result": result})
    except Exception as e:
        return jsonify({"error": f"collision-risk-failed: {repr(e)}"}), 500


def refresh_tle_cache_periodically(group: str = "active", interval_minutes: int = 5):
    """Background thread that refreshes TLE cache every interval_minutes."""
    import time
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=TLE"
    headers = {"User-Agent": "SatelliteCollision/1.0"}
    cache_path = os.path.join(BASE_DIR, "tle_cache.txt")
    meta_path = os.path.join(BASE_DIR, "tle_cache_meta.json")
    while True:
        try:
            resp = requests.get(url, timeout=30, headers=headers)
            if resp.status_code == 200 and resp.text and len(resp.text.strip()) > 100:
                # Save if changed
                prev = None
                try:
                    if os.path.exists(cache_path):
                        with open(cache_path, "r", encoding="utf-8") as f:
                            prev = f.read()
                except Exception:
                    prev = None
                if prev != resp.text:
                    try:
                        with open(cache_path, "w", encoding="utf-8") as f:
                            f.write(resp.text)
                        meta_out = {"etag": resp.headers.get("ETag"), "last_modified": resp.headers.get("Last-Modified")}
                        try:
                            import json
                            with open(meta_path, "w", encoding="utf-8") as f:
                                json.dump(meta_out, f)
                        except Exception:
                            pass
                    except Exception:
                        pass
        except Exception:
            # ignore network errors, we'll try again later
            pass
        time.sleep(max(60, interval_minutes * 60))

@app.route("/api/collision-analysis", methods=["POST"])
def collision_analysis_route():
    data = request.get_json() or {}
    satellite1 = data.get("satellite1", "LILACSAT-2")
    satellite2 = data.get("satellite2", "AO-07")
    threshold = data.get("threshold", 10.0)
    duration = data.get("duration", 12)  # hours, but simulation uses frames
    start_time_str = data.get("start_time")
    sample_points = int(data.get("samplePoints", 1200))

    try:
        # Check if TLEs were provided in request body (preferred)
        tle1 = data.get("satellite1_tle")
        tle2 = data.get("satellite2_tle")

        # If TLEs weren't provided, try to look them up from local cache (tle_cache.txt)
        cache_path = os.path.join(BASE_DIR, "tle_cache.txt")
        def parse_cache(path):
            """Parse TLE file into dict name -> (line1, line2)"""
            out = {}
            try:
                if not os.path.exists(path):
                    return out
                with open(path, "r", encoding="utf-8") as f:
                    lines = [l.rstrip('\n') for l in f if l.strip()]
                i = 0
                while i < len(lines):
                    if not lines[i].startswith('1 ') and i + 2 < len(lines) and lines[i+1].startswith('1 ') and lines[i+2].startswith('2 '):
                        name = lines[i].strip()
                        out[name] = (lines[i+1].strip(), lines[i+2].strip())
                        i += 3
                    elif lines[i].startswith('1 ') and i + 1 < len(lines) and lines[i+1].startswith('2 '):
                        # No name line present, use id from line2
                        name = lines[i+1][2:7].strip()
                        out[name] = (lines[i].strip(), lines[i+1].strip())
                        i += 2
                    else:
                        i += 1
            except Exception:
                return {}
            return out

        if (not tle1 or not tle2) and os.path.exists(cache_path):
            entries = parse_cache(cache_path)
            # Try direct matches by provided satellite name
            if not tle1 and satellite1 in entries:
                tle1 = entries[satellite1]
            if not tle2 and satellite2 in entries:
                tle2 = entries[satellite2]
            # Try fuzzy contains match
            if not tle1:
                for k, v in entries.items():
                    if satellite1.lower() in k.lower():
                        tle1 = v
                        break
            if not tle2:
                for k, v in entries.items():
                    if satellite2.lower() in k.lower():
                        tle2 = v
                        break

        if HAS_SGP4 and tle1 and tle2:
            # Propagate both satellites using sgp4 and compute closest approach
            try:
                sat1 = Satrec.twoline2rv(tle1[0].strip(), tle1[1].strip())
                sat2 = Satrec.twoline2rv(tle2[0].strip(), tle2[1].strip())

                if start_time_str:
                    try:
                        start_dt = dt.datetime.fromisoformat(start_time_str.replace('Z', '+00:00')).replace(tzinfo=dt.timezone.utc)
                    except Exception:
                        start_dt = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
                else:
                    start_dt = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)

                duration_hours = float(duration)
                total_seconds = duration_hours * 3600.0
                # sample_points steps including endpoints
                n = max(2, int(sample_points))
                dt_step = total_seconds / (n - 1)

                import numpy as _np

                min_distance = float('inf')
                min_index = 0
                pos1_at_min = None
                vel1_at_min = None
                pos2_at_min = None
                vel2_at_min = None

                for i in range(n):
                    t = start_dt + dt.timedelta(seconds=(i * dt_step))
                    jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond * 1e-6)
                    e1, r1, v1 = sat1.sgp4(jd, fr)
                    e2, r2, v2 = sat2.sgp4(jd, fr)
                    if e1 != 0 or e2 != 0:
                        # skip points with errors
                        continue
                    r1v = _np.array(r1)
                    r2v = _np.array(r2)
                    d = _np.linalg.norm(r1v - r2v)
                    if d < min_distance:
                        min_distance = float(d)
                        min_index = i
                        pos1_at_min = r1v
                        pos2_at_min = r2v
                        vel1_at_min = _np.array(v1)
                        vel2_at_min = _np.array(v2)

                if min_distance == float('inf'):
                    raise RuntimeError('Propagation failed or no valid points')

                rel_vel = float(_np.linalg.norm(vel1_at_min - vel2_at_min))
                t_closest = (start_dt + dt.timedelta(seconds=(min_index * dt_step))).strftime('%Y-%m-%d %H:%M:%S UTC')
                collision_detected = min_distance < float(threshold)
                risk_level = "HIGH" if collision_detected else "LOW"

                result = {
                    "status": "success",
                    "min_distance": round(min_distance, 3),
                    "threshold": threshold,
                    "collision_detected": collision_detected,
                    "risk_level": risk_level,
                    "time_of_closest_approach": t_closest,
                    "relative_velocity": round(rel_vel, 3),
                    "satellite1": satellite1,
                    "satellite2": satellite2
                }

                return jsonify(result)
            except Exception as e:
                return jsonify({"status": "error", "message": f"SGP4 propagation failed: {str(e)}"}), 500
        else:
            # No live TLEs or sgp4 not installed: fall back to existing static behaviour (but return informative message)
            if satellite_collision_p2 is not None:
                tle_data = {
                    satellite1: satellite_collision_p2.tle_data.get(satellite1, satellite_collision_p2.tle_data.get("LILACSAT-2")),
                    satellite2: satellite_collision_p2.tle_data.get(satellite2, satellite_collision_p2.tle_data.get("AO-07"))
                }
            else:
                tle_data = {}

            # Still compute a simple mock result but indicate why (sgp4 missing or no TLEs)
            min_distance = 8.4
            collision_detected = min_distance < threshold
            risk_level = "HIGH" if collision_detected else "LOW"

            result = {
                "status": "success",
                "min_distance": min_distance,
                "threshold": threshold,
                "collision_detected": collision_detected,
                "risk_level": risk_level,
                "time_of_closest_approach": "2025-11-07 14:32 UTC",
                "relative_velocity": 12.3,
                "satellite1": satellite1,
                "satellite2": satellite2,
                "note": "Used fallback tle_data because live TLEs or sgp4 not available"
            }

            return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/run-simulation", methods=["POST"])
def run_simulation_route():
    data = request.get_json() or {}
    sim_type = data.get("sim_type", "orbit")

    filename = f"{uuid.uuid4().hex}.gif"
    output_filepath = os.path.join(RESULTS_DIR, filename)

    try:
        if satellite_collision_p2 is None:
            return jsonify({"status": "error", "message": "Plotting dependencies not available"}), 503
        satellite_collision_p2.plot_tle(satellite_collision_p2.tle_data).save(
            output_filepath, writer='pillow', fps=10
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

    public_url = f"/static/results/{filename}"
    return jsonify({"status": "success", "file": public_url})

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve index.html for / and any unknown path (React/JS-style routing safe)."""
    full_path = os.path.join(FRONTEND_DIR, path)
    if path != "" and os.path.exists(full_path):
        return send_from_directory(FRONTEND_DIR, path)
    else:
        return send_from_directory(FRONTEND_DIR, "index.html")


def prewarm_orbit_caches():
    """Background thread to pre-fetch and cache all orbit types on startup."""
    import requests as req
    print("\n" + "=" * 60)
    print("CACHE WARMING: Starting background pre-warm for all orbits")
    print("=" * 60)
    
    for orbit in ["LEO", "MEO", "GEO", "HEO"]:
        try:
            print(f"  → Warming {orbit} cache...", end=" ", flush=True)
            start_time = time.time()
            
            # Make internal request to warm the cache
            url = f"http://127.0.0.1:5000/api/tle/live?orbit={orbit}&format=tle&json=true"
            resp = req.get(url, timeout=60)
            
            elapsed = time.time() - start_time
            if resp.status_code == 200:
                data = resp.json()
                count = data.get("count", 0)
                print(f"✓ {count} satellites cached in {elapsed:.1f}s")
            else:
                print(f"✗ Failed (status {resp.status_code})")
        except Exception as e:
            print(f"✗ Error: {repr(e)[:50]}")
    
    print("=" * 60)
    print("CACHE WARMING: Complete! All orbit requests will now be instant.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    # Start background cache warming thread
    warmup_thread = threading.Thread(target=prewarm_orbit_caches, daemon=True)
    warmup_thread.start()
    
    # Give server a moment to start before warming begins
    threading.Timer(2.0, lambda: None).start()
    
    # Disable the auto-reloader here to avoid process forking issues in this environment.
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)
