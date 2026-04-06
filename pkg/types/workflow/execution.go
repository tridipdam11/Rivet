package workflow

import "time"

// --- Execution Result & Status ---

type ExecutionStatus string

const (
	ExecutionStatusPending   ExecutionStatus = "pending"
	ExecutionStatusRunning   ExecutionStatus = "running"
	ExecutionStatusSuccess   ExecutionStatus = "success"
	ExecutionStatusError     ExecutionStatus = "error"
	ExecutionStatusPaused    ExecutionStatus = "paused"
	ExecutionStatusCancelled ExecutionStatus = "cancelled"
)

type ExecutionResult struct {
	WorkflowID    string                `json:"workflowId"`
	ExecutionID   string                `json:"executionId"`
	Status        ExecutionStatus       `json:"status"`
	StartTime     time.Time             `json:"startTime"`
	EndTime       *time.Time            `json:"endTime,omitempty"`
	Duration      *float64              `json:"duration,omitempty"` // in seconds
	ExecutedNodes []string              `json:"executedNodes"`
	NodeResults   map[string]NodeResult `json:"nodeResults"`
	Errors        []ExecutionError      `json:"errors"`
	Output        any                   `json:"output"`
	TriggerData   any                   `json:"triggerData,omitempty"`
}

type NodeExecutionStatus string

const (
	NodeExecutionStatusPending   NodeExecutionStatus = "pending"
	NodeExecutionStatusRunning   NodeExecutionStatus = "running"
	NodeExecutionStatusSuccess   NodeExecutionStatus = "success"
	NodeExecutionStatusError     NodeExecutionStatus = "error"
	NodeExecutionStatusSkipped   NodeExecutionStatus = "skipped"
	NodeExecutionStatusRetrying  NodeExecutionStatus = "retrying"
)

type NodeResult struct {
	NodeID      string              `json:"nodeId"`
	Status      NodeExecutionStatus `json:"status"`
	StartTime   time.Time           `json:"startTime"`
	EndTime     *time.Time          `json:"endTime,omitempty"`
	Duration    *float64            `json:"duration,omitempty"` // in seconds
	Input       any                 `json:"input"`
	Output      any                 `json:"output"`
	Error       *NodeError          `json:"error,omitempty"`
	RetryCount  *int                `json:"retryCount,omitempty"`
}

// --- Error Types ---

type ErrorType string

const (
	ErrorTypeValidationError          ErrorType = "validation_error"
	ErrorTypeRuntimeError             ErrorType = "runtime_error"
	ErrorTypeNetworkError             ErrorType = "network_error"
	ErrorTypeAuthenticationError      ErrorType = "authentication_error"
	ErrorTypeTimeoutError             ErrorType = "timeout_error"
	ErrorTypeConfigurationError       ErrorType = "configuration_error"
	ErrorTypeDataTransformationError  ErrorType = "data_transformation_error"
	ErrorTypeWorkflowError            ErrorType = "workflow_error"
)

type NodeErrorType string

const (
	NodeErrorTypeInvalidConfiguration      NodeErrorType = "invalid_configuration"
	NodeErrorTypeMissingRequiredField    NodeErrorType = "missing_required_field"
	NodeErrorTypeAPIRequestFailed        NodeErrorType = "api_request_failed"
	NodeErrorTypeWebhookProcessingFailed NodeErrorType = "webhook_processing_failed"
	NodeErrorTypeConditionEvalFailed     NodeErrorType = "condition_evaluation_failed"
	NodeErrorTypeDataTransformFailed     NodeErrorType = "data_transformation_failed"
	NodeErrorTypeTimerExecFailed         NodeErrorType = "timer_execution_failed"
	NodeErrorTypeLoopExecFailed          NodeErrorType = "loop_execution_failed"
)

type ExecutionError struct {
	ID        string    `json:"id"`
	Type      ErrorType `json:"type"`
	Message   string    `json:"message"`
	Details   any       `json:"details,omitempty"`
	NodeID    *string   `json:"nodeId,omitempty"`
	Timestamp time.Time `json:"timestamp"`
	Stack     *string   `json:"stack,omitempty"`
}

type NodeError struct {
	Type      NodeErrorType `json:"type"`
	Message   string        `json:"message"`
	Details   any           `json:"details,omitempty"`
	Timestamp time.Time     `json:"timestamp"`
	Stack     *string       `json:"stack,omitempty"`
}

// --- Execution Context ---

type ExecutionEnvironment string

const (
	ExecutionEnvironmentDevelopment ExecutionEnvironment = "development"
	ExecutionEnvironmentStaging     ExecutionEnvironment = "staging"
	ExecutionEnvironmentProduction  ExecutionEnvironment = "production"
)

type ExecutionMetadata struct {
	StartTime     time.Time            `json:"startTime"`
	TriggerType   string               `json:"triggerType"`
	TriggerData   any                  `json:"triggerData"`
	UserID        *string              `json:"userId,omitempty"`
	Environment   ExecutionEnvironment `json:"environment"`
}

type ExecutionContext struct {
	WorkflowID    string            `json:"workflowId"`
	ExecutionID   string            `json:"executionId"`
	CurrentNodeID string            `json:"currentNodeId"`
	Data          map[string]any    `json:"data"`
	Variables     map[string]any    `json:"variables"`
	Metadata      ExecutionMetadata `json:"metadata"`
}

// --- Validation Result ---

type ValidationType string

const (
	ValidationTypeRequiredFieldMissing ValidationType = "required_field_missing"
	ValidationTypeInvalidFormat      ValidationType = "invalid_format"
	ValidationTypeInvalidType        ValidationType = "invalid_type"
	ValidationTypeCircularDependency ValidationType = "circular_dependency"
	ValidationTypeOrphanedNode       ValidationType = "orphaned_node"
	ValidationTypeInvalidConnection  ValidationType = "invalid_connection"
	ValidationTypeConfigConflict     ValidationType = "configuration_conflict"
)

type ValidationError struct {
	Type    ValidationType `json:"type"`
	Message string         `json:"message"`
	Field   *string        `json:"field,omitempty"`
	NodeID  *string        `json:"nodeId,omitempty"`
}

type ValidationWarning struct {
	Type    ValidationType `json:"type"`
	Message string         `json:"message"`
	Field   *string        `json:"field,omitempty"`
	NodeID  *string        `json:"nodeId,omitempty"`
}

type ValidationResult struct {
	IsValid  bool                `json:"isValid"`
	Errors   []ValidationError   `json:"errors"`
	Warnings []ValidationWarning `json:"warnings"`
}