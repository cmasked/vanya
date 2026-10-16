import httpx
import pytest
from test_api import setup, headers, student

def test_speech_adapter_validation_and_failures(setup, monkeypatch):
    client, app, dsn, token, stranger, facilitator, ft = setup
    monkeypatch.setenv("SPEECH_ADAPTER_URL", "https://speech-adapter.invalid/transcribe")
    monkeypatch.setenv("SPEECH_ADAPTER_KEY", "isolated_test_only")
    monkeypatch.setenv("SPEECH_LANGUAGES", "en-IN,ta-IN")
    calls = []
    class Adapter:
        def __init__(self, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def post(self, endpoint, **kwargs):
            calls.append((endpoint, kwargs))
            return httpx.Response(200, json={"text": "Demo answer", "language": "ta-IN"},
                                  request=httpx.Request("POST", endpoint))
    monkeypatch.setattr(httpx, "AsyncClient", Adapter)
    url = "/api/v1/voice/transcribe?language=ta-IN"
    h = {**headers(token), "Content-Type": "audio/mp4"}
    assert client.post(url, content=b"recording").status_code == 401
    response = client.post(url, headers=h, content=b"recording")
    assert response.status_code == 200 and response.json() == {"text": "Demo answer", "language": "ta-IN"}
    assert calls[0][1]["content"] == b"recording"
    assert calls[0][1]["headers"]["X-Speech-Language"] == "ta-IN"
    assert calls[0][1]["headers"]["Authorization"] == "Bearer isolated_test_only"
    assert client.post("/api/v1/voice/transcribe?language=unsupported", headers=h,
                       content=b"recording").status_code == 422
    assert client.post(url, headers={**h, "Content-Type": "text/plain"},
                       content=b"recording").status_code == 415
    assert client.post(url, headers=h, content=b"").status_code == 422
    assert client.post(url, headers=h, content=b"x" * (8 * 1024 * 1024 + 1)).status_code == 413
    async def unavailable(self, endpoint, **kwargs):
        raise httpx.ConnectError("unavailable")
    monkeypatch.setattr(Adapter, "post", unavailable)
    assert client.post(url, headers=h, content=b"recording").status_code == 503
