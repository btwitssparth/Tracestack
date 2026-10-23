from datetime import datetime
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator


MonitorStatus = Literal["unknown", "up", "down"]
IncidentStatus = Literal["open", "resolved"]


def validate_http_url_syntax(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("URL must be an absolute http:// or https:// URL")
    if parsed.username or parsed.password:
        raise ValueError("URLs containing username/password credentials are not allowed")
    if parsed.fragment:
        raise ValueError("URL fragments are not allowed")
    if any(ord(char) < 32 for char in value):
        raise ValueError("URL cannot contain control characters")
    return value


class MonitorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=8, max_length=2048)
    check_interval_seconds: int = Field(default=300, ge=300, le=86400)
    expected_status_code: int = Field(default=200, ge=100, le=599)
    timeout_seconds: int = Field(default=10, ge=1, le=30)
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return validate_http_url_syntax(value)


class MonitorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    url: str | None = Field(default=None, min_length=8, max_length=2048)
    check_interval_seconds: int | None = Field(default=None, ge=300, le=86400)
    expected_status_code: int | None = Field(default=None, ge=100, le=599)
    timeout_seconds: int | None = Field(default=None, ge=1, le=30)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        return validate_http_url_syntax(value) if value is not None else None


class MonitorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    url: str
    check_interval_seconds: int
    expected_status_code: int
    timeout_seconds: int
    is_active: bool
    current_status: MonitorStatus
    consecutive_failures: int
    consecutive_successes: int
    last_checked_at: datetime | None
    next_check_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CheckResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    monitor_id: int
    checked_at: datetime
    success: bool
    status_code: int | None
    response_time_ms: float | None
    error_type: str | None
    error_message: str | None


class IncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    monitor_id: int
    title: str
    status: IncidentStatus
    started_at: datetime
    resolved_at: datetime | None
    failure_count_at_open: int
    summary: str | None
