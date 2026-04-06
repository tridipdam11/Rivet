/**
 * Execution result and error type definations
 */

// Export result interface
export interface ExecutionResult {
    workflowId: string
    executionId: string
    status: ExecutionStatus
    startTime: Date
    endTime?: Date
    duration?: number
    executedNodes: string[]
    nodeResults: Record<string, NodeResult>
    errors: ExecutionError[]
    output: unknown
    triggerData?: unknown
}

export enum ExecutionStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    SUCCESS = 'success',
    ERROR = 'error',
    PAUSED = 'paused',
    CANCELLED = 'cancelled'
}

// Node execution result interface 
export interface NodeResult {
    nodeId: string
    status: NodeExecutionStatus
    startTime: Date
    endTime?: Date
    duration?: number
    input: unknown
    output: unknown
    error?: NodeError
    retryCount?: number
}

export enum NodeExecutionStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    SUCCESS = 'success',
    ERROR = 'error',
    SKIPPED = 'skipped',
    RETRYING = 'retrying'
}

// Error interfaces
export interface ExecutionError {
    id: string;
    type: ErrorType;
    message: string;
    details?: unknown;
    nodeId?: string;
    timestamp: Date;
    stack?: string;
}

export interface NodeError {
    type: NodeErrorType;
    message: string;
    details?: unknown;
    timestamp: Date;
    stack?: string;
}

export enum ErrorType {
    VALIDATION_ERROR = 'validation_error',
    RUNTIME_ERROR = 'runtime_error',
    NETWORK_ERROR = 'network_error',
    AUTHENTICATION_ERROR = 'authentication_error',
    TIMEOUT_ERROR = 'timeout_error',
    CONFIGURATION_ERROR = 'configuration_error',
    DATA_TRANSFORMATION_ERROR = 'data_transformation_error',
    WORKFLOW_ERROR = 'workflow_error'
}

export enum NodeErrorType {
    INVALID_CONFIGURATION = 'invalid_configuration',
    MISSING_REQUIRED_FIELD = 'missing_required_field',
    API_REQUEST_FAILED = 'api_request_failed',
    WEBHOOK_PROCESSING_FAILED = 'webhook_processing_failed',
    CONDITION_EVALUATION_FAILED = 'condition_evaluation_failed',
    DATA_TRANSFORMATION_FAILED = 'data_transformation_failed',
    TIMER_EXECUTION_FAILED = 'timer_execution_failed',
    LOOP_EXECUTION_FAILED = 'loop_execution_failed'
}

// Execution context interface
export interface ExecutionContext {
    workflowId: string;
    executionId: string;
    currentNodeId: string;
    data: Record<string, unknown>;
    variables: Record<string, unknown>;
    metadata: ExecutionMetadata;
}

export interface ExecutionMetadata {
    startTime: Date;
    triggerType: string;
    triggerData: unknown;
    userId?: string;
    environment: ExecutionEnvironment;
}

export enum ExecutionEnvironment {
    DEVELOPMENT = 'development',
    STAGING = 'staging',
    PRODUCTION = 'production'
}

// Validation result interface
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    type: ValidationType;
    message: string;
    field?: string;
    nodeId?: string;
}

export interface ValidationWarning {
    type: ValidationType;
    message: string;
    field?: string;
    nodeId?: string;
}

export enum ValidationType {
    REQUIRED_FIELD_MISSING = 'required_field_missing',
    INVALID_FORMAT = 'invalid_format',
    INVALID_TYPE = 'invalid_type',
    CIRCULAR_DEPENDENCY = 'circular_dependency',
    ORPHANED_NODE = 'orphaned_node',
    INVALID_CONNECTION = 'invalid_connection',
    CONFIGURATION_CONFLICT = 'configuration_conflict'
}