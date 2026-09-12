from orchestrator.registry import asset_kind_for, ext_for, extract_outputs, map_inputs, validate_inputs

SCHEMA = {"type": "object", "required": ["prompt"], "properties": {
    "prompt": {"type": "string", "maxLength": 20, "x-ui": {"widget": "textarea"}},
    "image": {"type": "string", "format": "asset-ref"},
    "duration_s": {"type": "integer", "enum": [5, 8], "default": 5}}}


def test_validate_ok_and_errors():
    assert validate_inputs(SCHEMA, {"prompt": "hi", "duration_s": 5}) == []
    errs = validate_inputs(SCHEMA, {"duration_s": 6})
    assert any("prompt" in e for e in errs) and any("duration_s" in e for e in errs)


def test_map_inputs_rename_format_drop_fixed():
    adapter = {"input_map": {"duration_s": {"to": "duration", "suffix": "s"}, "image": "image_url", "camera_motion": None},
               "fixed": {"generate_audio": False}}
    out = map_inputs(adapter, {"prompt": "p", "duration_s": 8, "image": "https://x/y.png", "camera_motion": "pan"})
    assert out == {"prompt": "p", "duration": "8s", "image_url": "https://x/y.png", "generate_audio": False}


def test_map_inputs_fixed_does_not_override_user_value():
    assert map_inputs({"fixed": {"seed": 1}}, {"seed": 7}) == {"seed": 7}


def test_extract_outputs_declared_keys_then_walk():
    payload = {"video": {"url": "https://v/a.mp4", "content_type": "video/mp4", "file_size": 10}, "seed": 3,
               "extra": {"url": "https://v/b.png", "content_type": "image/png"}}
    files = extract_outputs({"outputs": ["video"]}, payload)
    assert [f.url for f in files] == ["https://v/a.mp4"] and files[0].key == "video"
    files = extract_outputs({}, payload)
    assert sorted(f.url for f in files) == ["https://v/a.mp4", "https://v/b.png"]


def test_extract_outputs_lists():
    payload = {"images": [{"url": "https://i/1.png", "content_type": "image/png"}, {"url": "https://i/2.png", "content_type": "image/png"}]}
    files = extract_outputs({"outputs": ["images"]}, payload)
    assert [f.key for f in files] == ["images[0]", "images[1]"]


def test_kind_and_ext():
    assert asset_kind_for("video/mp4") == "video" and asset_kind_for("audio/wav") == "audio" and asset_kind_for("text/plain") == "document"
    assert ext_for("video/mp4", "https://x/y/abc.MP4?sig=1") == "mp4"
    assert ext_for("audio/mpeg", "https://x/noext") == "mp3"
