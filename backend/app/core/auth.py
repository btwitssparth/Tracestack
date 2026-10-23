import hmac
import os

from fastapi import Header, HTTPException, status


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    """Require the configured TraceStack API key for protected API routes."""
    expected_key = os.getenv("TRACESTACK_API_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API authentication is not configured",
        )

    if x_api_key is None or not hmac.compare_digest(x_api_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
