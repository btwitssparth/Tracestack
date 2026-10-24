import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.auth import require_authenticated_user


def test_auth_rejects_missing_bearer_credentials() -> None:
    with pytest.raises(HTTPException) as exc_info:
        require_authenticated_user(None)

    assert exc_info.value.status_code == 401
    assert exc_info.value.headers["WWW-Authenticate"] == "Bearer"


def test_auth_fails_closed_when_supabase_is_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="some-token",
    )

    with pytest.raises(HTTPException) as exc_info:
        require_authenticated_user(credentials)

    assert exc_info.value.status_code == 503


def test_auth_rejects_token_when_jwks_verification_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")

    def fail_verification():
        raise RuntimeError("simulated JWKS failure")

    monkeypatch.setattr("app.core.auth.get_jwks_client", fail_verification)
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="invalid-token",
    )

    with pytest.raises(HTTPException) as exc_info:
        require_authenticated_user(credentials)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired access token"
