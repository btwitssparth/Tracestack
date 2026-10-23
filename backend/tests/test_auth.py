import pytest
from fastapi import HTTPException

from app.core.auth import require_api_key


def test_api_key_auth_succeeds_with_matching_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TRACESTACK_API_KEY", "test-secret")
    assert require_api_key("test-secret") is None


def test_api_key_auth_rejects_missing_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TRACESTACK_API_KEY", "test-secret")
    with pytest.raises(HTTPException) as exc_info:
        require_api_key(None)
    assert exc_info.value.status_code == 401


def test_api_key_auth_rejects_invalid_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TRACESTACK_API_KEY", "test-secret")
    with pytest.raises(HTTPException) as exc_info:
        require_api_key("wrong-secret")
    assert exc_info.value.status_code == 401


def test_api_key_auth_fails_closed_when_unconfigured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TRACESTACK_API_KEY", raising=False)
    with pytest.raises(HTTPException) as exc_info:
        require_api_key("any-key")
    assert exc_info.value.status_code == 503
