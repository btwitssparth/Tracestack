from __future__ import annotations

import httpx
from sqlalchemy import select

from app.core import monitoring
from app.models import CheckResult, Incident


class FakeResponse:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


class FakeClient:
    def __init__(self, response_status: int = 200, error: Exception | None = None, **kwargs) -> None:
        self.response_status = response_status
        self.error = error

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, *args, **kwargs):
        if self.error is not None:
            raise self.error
        return FakeResponse(self.response_status)


def install_http_mock(monkeypatch, *, status_code: int = 200, error: Exception | None = None):
    monkeypatch.setattr(monitoring, "validate_public_http_url", lambda url: None)
    monkeypatch.setattr(
        monitoring.httpx,
        "Client",
        lambda **kwargs: FakeClient(status_code, error, **kwargs),
    )


def run_check(db_session, monitor):
    return monitoring.perform_check(db_session, monitor)


def test_successful_check_persists_status_and_latency(db_session, monitor, monkeypatch):
    install_http_mock(monkeypatch, status_code=200)

    result = run_check(db_session, monitor)

    assert result.success is True
    assert result.status_code == 200
    assert result.response_time_ms is not None
    assert result.error_type is None
    assert monitor.current_status == "up"
    assert monitor.consecutive_successes == 1
    assert monitor.consecutive_failures == 0
    assert len(list(db_session.scalars(select(CheckResult)).all())) == 1
    assert list(db_session.scalars(select(Incident)).all()) == []


def test_incident_opens_after_two_failures_without_duplicates(db_session, monitor, monkeypatch):
    install_http_mock(monkeypatch, status_code=503)

    first = run_check(db_session, monitor)
    assert first.success is False
    assert first.error_type == "unexpected_status"
    assert list(db_session.scalars(select(Incident)).all()) == []

    second = run_check(db_session, monitor)
    incidents = list(db_session.scalars(select(Incident)).all())
    assert second.success is False
    assert len(incidents) == 1
    assert incidents[0].status == "open"
    assert incidents[0].failure_count_at_open == 2

    run_check(db_session, monitor)
    incidents = list(db_session.scalars(select(Incident)).all())
    assert len(incidents) == 1
    assert monitor.consecutive_failures == 3


def test_incident_resolves_after_two_successes_and_new_outage_reopens(db_session, monitor, monkeypatch):
    install_http_mock(monkeypatch, status_code=503)
    run_check(db_session, monitor)
    run_check(db_session, monitor)

    install_http_mock(monkeypatch, status_code=200)
    run_check(db_session, monitor)
    incident = db_session.scalar(select(Incident))
    assert incident.status == "open"

    run_check(db_session, monitor)
    db_session.refresh(incident)
    assert incident.status == "resolved"
    assert incident.resolved_at is not None
    assert monitor.consecutive_successes == 2
    assert monitor.consecutive_failures == 0

    install_http_mock(monkeypatch, status_code=503)
    run_check(db_session, monitor)
    run_check(db_session, monitor)
    incidents = list(db_session.scalars(select(Incident).order_by(Incident.id)).all())
    assert len(incidents) == 2
    assert [item.status for item in incidents] == ["resolved", "open"]


def test_timeout_is_recorded_as_failed_check(db_session, monitor, monkeypatch):
    install_http_mock(monkeypatch, error=httpx.TimeoutException("simulated timeout"))

    result = run_check(db_session, monitor)

    assert result.success is False
    assert result.status_code is None
    assert result.error_type == "timeout"
    assert "timeout" in result.error_message.lower()
    assert monitor.current_status == "down"


def test_connection_error_is_recorded_without_raising(db_session, monitor, monkeypatch):
    install_http_mock(monkeypatch, error=httpx.ConnectError("simulated connection failure"))

    result = run_check(db_session, monitor)

    assert result.success is False
    assert result.error_type == "connection_error"
    assert result.error_message == "The endpoint could not be reached."


def test_unexpected_status_is_success_only_when_it_matches_expected(db_session, monitor, monkeypatch):
    monitor.expected_status_code = 204
    db_session.commit()
    install_http_mock(monkeypatch, status_code=204)

    result = run_check(db_session, monitor)

    assert result.success is True
    assert result.status_code == 204
