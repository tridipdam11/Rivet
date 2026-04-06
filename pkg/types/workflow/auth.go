package workflow

import "time"

type AuthConfig struct {
	Type         AuthType          `json:"type"`
	Credentials  map[string]string `json:"credentials"`
	RefreshToken *string           `json:"refreshToken,omitempty"`
	ExpiresAt    *time.Time        `json:"expiresAt,omitempty"`
	IsValid      *bool             `json:"isValid,omitempty"`
}

type AuthType string

const (
	AuthTypeNONE         AuthType = "none"
	AuthTypeAPI_KEY      AuthType = "api_key"
	AuthTypeBEARER_TOKEN AuthType = "bearer_token"
	AuthTypeBASIC_AUTH   AuthType = "basic_auth"
	AuthTypeOAUTH2       AuthType = "oauth2"
)

type RetryConfig struct {
	Enabled         bool              `json:"enabled"`
	MaxAttempts     int64             `json:"max_attempts"`
	BackoffStrategy BackoffStrategy   `json:"backoff_strategy"`
	BaseDelay       int64             `json:"base_delay"`
	MaxDelay        int64             `json:"max_delay"`
	RetryConditions []RetryConditions `json:"retry_conditions"`
}

type BackoffStrategy string

const (
	BackoffStrategyLINEAR      BackoffStrategy = "linear"
	BackoffStrategyEXPONENTIAL BackoffStrategy = "exponential"
	BackoffStrategyFIXED       BackoffStrategy = "fixed"
)

type RetryConditions struct {
	Type  RetryConditionsType
	Value any
}

type RetryConditionsType string

const (
	RetryConditionsTypeSTATUS_CODE RetryConditionsType = "status_code"
	RetryConditionsTypeERROR_TYPE  RetryConditionsType = "error_type"
	RetryConditionsTypeTIMEOUT     RetryConditionsType = "timeout"
)

type WebhookConfig struct {
	ID         string    `json:"id"`
	WorkflowID string    `json:"workflowId"`
	Service    string    `json:"service"`
	Endpoint   string    `json:"endpoint"`
	Secret     string    `json:"secret"`
	Events     []string  `json:"events"`
	IsActive   bool      `json:"isActive"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type TriggerType string

const (
	TriggerTypeWebhook  TriggerType = "webhook"
	TriggerTypeSchedule TriggerType = "schedule"
	TriggerTypeManual   TriggerType = "manual"
	TriggerTypeEvent    TriggerType = "event"
)

type TriggerConfig struct {
	ID   string      `json:"id"`
	Type TriggerType `json:"type"`

	Config   map[string]any `json:"config"`
	IsActive bool           `json:"isActive"`
}
