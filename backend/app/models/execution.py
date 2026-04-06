from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import Field

from app.models.auth import RivetModel


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class NodeExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    SKIPPED = "skipped"
    RETRYING = "retrying"


class ErrorType(str, Enum):
    VALIDATION_ERROR = "validation_error"
    RUNTIME_ERROR = "runtime_error"
    NETWORK_ERROR = "network_error"
    AUTHENTICATION_ERROR = "authentication_error"
    TIMEOUT_ERROR = "timeout_error"
    CONFIGURATION_ERROR = "configuration_error"
    DATA_TRANSFORMATION_ERROR = "data_transformation_error"
    WORKFLOW_ERROR = "workflow_error"


class NodeErrorType(str, Enum):
    INVALID_CONFIGURATION = "invalid_configuration"
    MISSING_REQUIRED_FIELD = "missing_required_field"
    API_REQUEST_FAILED = "api_request_failed"
    WEBHOOK_PROCESSING_FAILED = "webhook_processing_failed"
    CONDITION_EVALUATION_FAILED = "condition_evaluation_failed"
    DATA_TRANSFORMATION_FAILED = "data_transformation_failed"
    TIMER_EXECUTION_FAILED = "timer_execution_failed"
    LOOP_EXECUTION_FAILED = "loop_execution_failed"


class ExecutionEnvironment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class ValidationType(str, Enum):
    REQUIRED_FIELD_MISSING = "required_field_missing"
    INVALID_FORMAT = "invalid_format"
    INVALID_TYPE = "invalid_type"
    CIRCULAR_DEPENDENCY = "circular_dependency"
    ORPHANED_NODE = "orphaned_node"
    INVALID_CONNECTION = "invalid_connection"
    CONFIGURATION_CONFLICT = "configuration_conflict"


class NodeError(RivetModel):
    type: NodeErrorType
    message: str
    details: Any | None = None
    timestamp: datetime
    stack: str | None = None


class ExecutionError(RivetModel):
    id: str
    type: ErrorType
    message: str
    details: Any | None = None
    node_id: str | None = None
    timestamp: datetime
    stack: str | None = None


class NodeResult(RivetModel):
    node_id: str
    status: NodeExecutionStatus
    start_time: datetime
    end_time: datetime | None = None
    duration: float | None = None
    input: Any | None = None
    output: Any | None = None
    error: NodeError | None = None
    retry_count: int | None = None


class ExecutionResult(RivetModel):
    workflow_id: str
    execution_id: str
    status: ExecutionStatus
    start_time: datetime
    end_time: datetime | None = None
    duration: float | None = None
    executed_nodes: list[str] = Field(default_factory=list)
    node_results: dict[str, NodeResult] = Field(default_factory=dict)
    errors: list[ExecutionError] = Field(default_factory=list)
    output: Any | None = None
    trigger_data: Any | None = None


class ExecutionMetadata(RivetModel):
    start_time: datetime
    trigger_type: str
    trigger_data: Any | None = None
    user_id: str | None = None
    environment: ExecutionEnvironment


class ExecutionContext(RivetModel):
    workflow_id: str
    execution_id: str
    current_node_id: str
    data: dict[str, Any] = Field(default_factory=dict)
    variables: dict[str, Any] = Field(default_factory=dict)
    metadata: ExecutionMetadata


class ValidationError(RivetModel):
    type: ValidationType
    message: str
    field: str | None = None
    node_id: str | None = None


class ValidationWarning(RivetModel):
    type: ValidationType
    message: str
    field: str | None = None
    node_id: str | None = None


class ValidationResult(RivetModel):
    is_valid: bool
    errors: list[ValidationError] = Field(default_factory=list)
    warnings: list[ValidationWarning] = Field(default_factory=list)
