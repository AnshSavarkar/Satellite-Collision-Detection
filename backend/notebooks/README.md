# Notebooks

- Place `collision_risk.ipynb` in this folder.
- The notebook should accept parameters via Papermill:
  - `sat1_name`, `sat2_name`
  - `tle1_line1`, `tle1_line2`
  - `tle2_line1`, `tle2_line2`
- The last cell should print a single line starting with `RESULT_JSON=` followed by a JSON object, for example:

```python
import json
result = {
    "distance_km": distance,
    "relative_speed_km_s": speed,
    "collision_risk": risk,
    "post_maneuver_distance_km": distance_new,
    "post_maneuver_risk": risk_new,
    "maneuver_helped": (risk_new is not None and risk_new < risk)
}
print("RESULT_JSON=" + json.dumps(result))
```

If the notebook is not present or Papermill is unavailable, the backend will compute results inline using the same sgp4 logic.
