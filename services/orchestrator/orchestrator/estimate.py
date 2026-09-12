"""Resource estimate frozen into the receipt (RESOURCE_NEUTRALITY.md).

Money is estimated by the database (eduai.estimate_cents, the single evaluator). This module only
turns a profile's resource_model into Wh / gCO2e / mL for the receipt. Undisclosed ⇒ {} (the settle
function appends the disclosure tier). Never invent a number the profile does not carry.
"""

from __future__ import annotations

from typing import Any


def resource_estimate(resource_model: dict[str, Any] | None, inputs: dict[str, Any], duration_field: str = "duration_s") -> dict[str, Any]:
    rm = resource_model or {}
    basis = rm.get("basis")
    if basis not in ("measured", "third_party"):
        return {}
    seconds = _num(inputs.get(duration_field)) or _num(rm.get("default_seconds")) or 5.0
    wh: float | None = None
    if _num(rm.get("gpu_watts")) and basis == "measured":
        # measured: watts × wall-clock (generation time ≈ length × seconds_per_output_second if given)
        gen_s = seconds * (_num(rm.get("seconds_per_output_second")) or 1.0)
        wh = _num(rm["gpu_watts"]) * gen_s / 3600.0
    elif _num(rm.get("wh_at_5s")):
        exp = _num(rm.get("length_exponent")) or 1.0
        wh = _num(rm["wh_at_5s"]) * (seconds / 5.0) ** exp
    if wh is None:
        return {}
    out: dict[str, Any] = {"basis": basis, "wh": round(wh, 3), "seconds": seconds}
    if _num(rm.get("g_co2e_per_kwh")) is not None:
        out["g_co2e"] = round(wh / 1000.0 * _num(rm["g_co2e_per_kwh"]), 3)
    if _num(rm.get("ml_water_per_kwh")) is not None:
        out["ml_water"] = round(wh / 1000.0 * _num(rm["ml_water_per_kwh"]), 3)
    if rm.get("measured_at"):
        out["measured_at"] = rm["measured_at"]
    return out


def _num(v: Any) -> float | None:
    try:
        return float(v) if v is not None and v != "" else None
    except (TypeError, ValueError):
        return None
