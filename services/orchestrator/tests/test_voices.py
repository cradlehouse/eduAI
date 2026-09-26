import io
import wave
from array import array

from orchestrator.voices import assign_speakers, keep_only


def _wav(n: int, rate: int = 1000, ch: int = 1) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(array("h", [1000] * n * ch).tobytes())
    return buf.getvalue()


def _samples(b: bytes) -> array:
    with wave.open(io.BytesIO(b)) as r:
        a = array("h")
        a.frombytes(r.readframes(r.getnframes()))
        return a


def test_keep_only_silences_outside_spans():
    out = _samples(keep_only(_wav(1000), [(0.2, 0.3)], pad=0))
    assert out[100] == 0 and out[250] == 1000 and out[900] == 0


def test_keep_only_stereo():
    out = _samples(keep_only(_wav(1000, ch=2), [(0.5, 0.6)], pad=0))
    assert out[2 * 550] == 1000 and out[2 * 550 + 1] == 1000 and out[0] == 0


LINES = [{"who": "ANGIE", "text": "I got the job. In Tulsa."}, {"who": "BERT", "text": "Then go. Before I talk you out of it."}]


def test_assign_by_diarized_speaker():
    chunks = [{"speaker": "S0", "text": "I got the job", "timestamp": [1.0, 1.7]}, {"speaker": "S0", "text": "in Tulsa", "timestamp": [2.1, 2.6]},
              {"speaker": "S1", "text": "Then go", "timestamp": [4.3, 4.8]}, {"speaker": "S1", "text": "before I talk you out of it", "timestamp": [5.5, 6.6]}]
    out = assign_speakers(chunks, LINES)
    assert out["ANGIE"] == [(1.0, 1.7), (2.1, 2.6)] and out["BERT"] == [(4.3, 4.8), (5.5, 6.6)]


def test_one_detected_speaker_follows_the_script():
    chunks = [{"speaker": "S0", "text": w, "timestamp": [i, i + 0.4]} for i, w in enumerate("I got the job in Tulsa then go before I talk you out of it".split())]
    out = assign_speakers(chunks, LINES)
    assert len(out["ANGIE"]) == 6 and out["BERT"][0] == (6, 6.4)


def test_settle_tracks_placeholders_match_values():
    # Regression: the render settle once had one more value than placeholders.
    import inspect

    from orchestrator.db import Db
    src = inspect.getsource(Db.settle_tracks)
    sql = src[src.index("insert into public.assets"):src.index("returning id")]
    start = src.index('(job["org_id"], job["project_id"], o.kind')
    depth, args = 0, 1
    for ch in src[start:]:
        depth += ch == "("
        depth -= ch == ")"
        args += ch == "," and depth == 1
        if depth == 0:
            break
    assert sql.count("%s") == args
