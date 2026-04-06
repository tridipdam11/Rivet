package workflow


type WebhookService string

const (
	WebhookServiceStripe   WebhookService = "stripe"
	WebhookServiceTypeform WebhookService = "typeform"
	WebhookServiceTwilio   WebhookService = "twilio"
	WebhookServiceGithub   WebhookService = "github"
)

type WebhookNodeData struct {
	Service        WebhookService `json:"service"`
	Endpoint       string         `json:"endpoint"`
	Authentication AuthConfig     `json:"authentication"`
	EventTypes     []string       `json:"eventTypes"`
	Secret         *string        `json:"secret,omitempty"`
	IsActive       bool           `json:"isActive"`
}

type WebhookNode struct {
	BaseNode
	Type NodeType        `json:"type"`
	Data WebhookNodeData `json:"data"`
}

// --- API Call Node ---

type HttpMethod string

const (
	HttpMethodGet    HttpMethod = "GET"
	HttpMethodPost   HttpMethod = "POST"
	HttpMethodPut    HttpMethod = "PUT"
	HttpMethodDelete HttpMethod = "DELETE"
	HttpMethodPatch  HttpMethod = "PATCH"
)

type ApiCallNodeData struct {
	Method         HttpMethod        `json:"method"`
	URL            string            `json:"url"`
	Headers        map[string]string `json:"headers"`
	Body           any               `json:"body,omitempty"`
	Authentication AuthConfig        `json:"authentication"`
	RetryConfig    RetryConfig       `json:"retryConfig"`
	Timeout        *int              `json:"timeout,omitempty"`
}

type ApiCallNode struct {
	BaseNode
	Type NodeType        `json:"type"`
	Data ApiCallNodeData `json:"data"`
}

// --- Condition Node ---

type ConditionType string

const (
	ConditionTypeIfElse ConditionType = "if_else"
	ConditionTypeSwitch ConditionType = "switch"
)

type ComparisonOperator string

const (
	ComparisonOperatorEquals              ComparisonOperator = "equals"
	ComparisonOperatorNotEquals           ComparisonOperator = "not_equals"
	ComparisonOperatorGreaterThan         ComparisonOperator = "greater_than"
	ComparisonOperatorLessThan            ComparisonOperator = "less_than"
	ComparisonOperatorGreaterThanOrEqual  ComparisonOperator = "greater_than_or_equal"
	ComparisonOperatorLessThanOrEqual     ComparisonOperator = "less_than_or_equal"
	ComparisonOperatorContains            ComparisonOperator = "contains"
	ComparisonOperatorNotContains         ComparisonOperator = "not_contains"
	ComparisonOperatorStartsWith          ComparisonOperator = "starts_with"
	ComparisonOperatorEndsWith            ComparisonOperator = "ends_with"
	ComparisonOperatorIsEmpty             ComparisonOperator = "is_empty"
	ComparisonOperatorIsNotEmpty          ComparisonOperator = "is_not_empty"
)

type Condition struct {
	ID       string             `json:"id"`
	Field    string             `json:"field"`
	Operator ComparisonOperator `json:"operator"`
	Value    any                `json:"value"`
	Path     string             `json:"path"`
}

type ConditionNodeData struct {
	ConditionType ConditionType `json:"conditionType"`
	Conditions    []Condition   `json:"conditions"`
	DefaultPath   *string       `json:"defaultPath,omitempty"`
}

type ConditionNode struct {
	BaseNode
	Type NodeType          `json:"type"`
	Data ConditionNodeData `json:"data"`
}

// --- Timer Node ---

type TimeUnit string

const (
	TimeUnitSeconds TimeUnit = "seconds"
	TimeUnitMinutes TimeUnit = "minutes"
	TimeUnitHours   TimeUnit = "hours"
	TimeUnitDays    TimeUnit = "days"
)

type TimerType string

const (
	TimerTypeDelay    TimerType = "delay"
	TimerTypeWait     TimerType = "wait"
	TimerTypeSchedule TimerType = "schedule"
)

type TimerNodeData struct {
	Duration  float64   `json:"duration"`
	Unit      TimeUnit  `json:"unit"`
	TimerType TimerType `json:"timerType"`
}

type TimerNode struct {
	BaseNode
	Type NodeType      `json:"type"`
	Data TimerNodeData `json:"data"`
}

// --- Data Transform Node ---

type TransformationType string

const (
	TransformationTypeFormatDate      TransformationType = "format_date"
	TransformationTypeFormatNumber    TransformationType = "format_number"
	TransformationTypeStringUppercase TransformationType = "string_uppercase"
	TransformationTypeStringLowercase TransformationType = "string_lowercase"
	TransformationTypeStringTrim      TransformationType = "string_trim"
	TransformationTypeMathAdd         TransformationType = "math_add"
	TransformationTypeMathSubtract    TransformationType = "math_subtract"
	TransformationTypeMathMultiply    TransformationType = "math_multiply"
	TransformationTypeMathDivide      TransformationType = "math_divide"
	TransformationTypeCustomFunction  TransformationType = "custom_function"
)

// TransformationConfig is a flexible map for different transformation settings.
type TransformationConfig map[string]any

type Schema struct {
	Type       string            `json:"type"`
	Properties map[string]Schema `json:"properties,omitempty"`
	Items      *Schema           `json:"items,omitempty"`
	Required   []string          `json:"required,omitempty"`
}

type FieldMapping struct {
	ID             string              `json:"id"`
	Source         string              `json:"source"`
	Target         string              `json:"target"`
	Transformation *TransformationType `json:"transformation,omitempty"`
}

type Transformation struct {
	ID     string               `json:"id"`
	Type   TransformationType   `json:"type"`
	Config TransformationConfig `json:"config"`
}

type DataTransformNodeData struct {
	InputSchema     *Schema          `json:"inputSchema,omitempty"`
	OutputSchema    *Schema          `json:"outputSchema,omitempty"`
	Mappings        []FieldMapping   `json:"mappings"`
	Transformations []Transformation `json:"transformations"`
}

type DataTransformNode struct {
	BaseNode
	Type NodeType              `json:"type"`
	Data DataTransformNodeData `json:"data"`
}

// --- Loop Node ---

type LoopType string

const (
	LoopTypeFor     LoopType = "for"
	LoopTypeWhile   LoopType = "while"
	LoopTypeForEach LoopType = "for_each"
)

type LoopNodeData struct {
	LoopType   LoopType   `json:"loopType"`
	Iterations *int       `json:"iterations,omitempty"`
	Condition  *Condition `json:"condition,omitempty"`
	ArrayPath  *string    `json:"arrayPath,omitempty"`
}

type LoopNode struct {
	BaseNode
	Type NodeType     `json:"type"`
	Data LoopNodeData `json:"data"`
}