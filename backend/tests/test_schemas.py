import pytest
from pydantic import ValidationError

from app.schemas import MonitorCreate, validate_http_url_syntax


def test_monitor_create_defaults() -> None:
    monitor = MonitorCreate(name=" Public API ", url="https://example.com/health")
    assert monitor.name == "Public API"
    assert monitor.check_interval_seconds == 300
    assert monitor.expected_status_code == 200
    assert monitor.timeout_seconds == 10


@pytest.mark.parametrize("url", ["ftp://example.com", "example.com", "http://user:pass@example.com"])
def test_rejects_invalid_url_syntax(url: str) -> None:
    with pytest.raises((ValueError, ValidationError)):
        validate_http_url_syntax(url)


def test_rejects_intervals_below_five_minutes() -> None:
    with pytest.raises(ValidationError):
        MonitorCreate(name="API", url="https://example.com", check_interval_seconds=60)
