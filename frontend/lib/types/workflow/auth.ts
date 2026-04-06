/**
 * Authentication and configuration type definitions
 */

// Authentication interface
export interface AuthConfig {
    type: AuthType
    credentials: Record<string, string>
    refreshToken?: string
    expiresAt?: Date;
    isValid?: boolean
}

export enum AuthType {
    NONE = 'none',
    API_KEY = 'api_key',
    BEARER_TOKEN = 'bearer_token',
    BASIC_AUTH = 'basic_auth',
    OAUTH2 = 'oauth2'
}

// Retry configuration interface
export interface RetryConfig {
    enabled: boolean
    maxAttempts: number
    backoffStrategy: BackoffStrategy
    baseDelay: number
    maxDelay: number
    retryConditions: RetryCondition[]
}

export enum BackoffStrategy {
    LINEAR = 'linear',
    EXPONENTIAL = 'exponential',
    FIXED = 'fixed'
}

export interface RetryCondition {
    type: RetryConditionType
    value: unknown
}

export enum RetryConditionType {
    STATUS_CODE = 'status_code',
    ERROR_TYPE = 'error_type',
    TIMEOUT = 'timeout'
}

// Webhook configuration interface
export interface WebhookConfig {
    id: string
    workflowId: string
    service: string
    endpoint: string
    secret: string
    events: string[]
    isActive: boolean
    createdAt: Date;
    updatedAt: Date;
}

// Trigger configuration interface
export interface TriggerConfig {
    id: string
    type: TriggerType
    config: TriggerConfigData
    isActive: boolean
}

export enum TriggerType {
    WEBHOOK = 'webhook',
    SCHEDULE = 'schedule',
    MANUAL = 'manual',
    EVENT = 'event'
}

export interface TriggerConfigData {
    [key: string]: unknown
}