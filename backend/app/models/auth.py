from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class RivetModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
        use_enum_values=True,
        extra="allow",
    )


class AuthType(str, Enum):
    NONE = "none"
    API_KEY = "api_key"
    BEARER_TOKEN = "bearer_token"
    BASIC_AUTH = "basic_auth"
    OAUTH2 = "oauth2"


class AuthConfig(RivetModel):
    type: AuthType
    credentials: dict[str, str] = Field(default_factory=dict)
    refresh_token: str | None = None
    expires_at: datetime | None = None
    is_valid: bool | None = None


class BackoffStrategy(str, Enum):
    LINEAR = "linear"
    EXPONENTIAL = "exponential"
    FIXED = "fixed"


class RetryConditionType(str, Enum):
    STATUS_CODE = "status_code"
    ERROR_TYPE = "error_type"
    TIMEOUT = "timeout"


class RetryCondition(RivetModel):
    type: RetryConditionType
    value: Any


class RetryConfig(RivetModel):
    enabled: bool = False
    max_attempts: int = 0
    backoff_strategy: BackoffStrategy = BackoffStrategy.FIXED
    base_delay: int = 0
    max_delay: int = 0
    retry_conditions: list[RetryCondition] = Field(default_factory=list)


class TriggerType(str, Enum):
    WEBHOOK = "webhook"
    SCHEDULE = "schedule"
    MANUAL = "manual"
    EVENT = "event"


class TriggerConfig(RivetModel):
    id: str
    type: TriggerType
    config: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
