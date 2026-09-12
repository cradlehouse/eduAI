from orchestrator.estimate import resource_estimate


def test_undisclosed_is_empty():
    assert resource_estimate({"basis": "undisclosed"}, {"duration_s": 5}) == {}
    assert resource_estimate({}, {"duration_s": 5}) == {}
    assert resource_estimate(None, {}) == {}


def test_third_party_without_numbers_is_empty():
    assert resource_estimate({"basis": "third_party", "note": "tbd"}, {"duration_s": 5}) == {}


def test_third_party_scales_with_length():
    rm = {"basis": "third_party", "wh_at_5s": 10, "length_exponent": 1.0, "g_co2e_per_kwh": 400, "ml_water_per_kwh": 1800}
    r = resource_estimate(rm, {"duration_s": 10})
    assert r["wh"] == 20 and r["g_co2e"] == 8 and r["ml_water"] == 36 and r["basis"] == "third_party"


def test_measured_uses_watts_and_time():
    rm = {"basis": "measured", "gpu_watts": 720, "seconds_per_output_second": 10, "measured_at": "2026-09-01"}
    r = resource_estimate(rm, {"duration_s": 5})
    assert r["wh"] == 10 and r["measured_at"] == "2026-09-01"
