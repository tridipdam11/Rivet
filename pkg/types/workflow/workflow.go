package workflow

import (
	"time"
)

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type NodeType string

const (
	NodeTypeWebhook       NodeType = "webhook"
	NodeTypeAPICall       NodeType = "api_call"
	NodeTypeCondition     NodeType = "condition"
	NodeTypeTimerNode     NodeType = "timer"
	NodeTypeDataTransform NodeType = "data_transform"
	NodeTypeLoop          NodeType = "loop"
)

type BaseNode struct {
	Id       string     `json:"id"`
	Type     NodeType   `json:"type"`
	Position Position   `json:"position"`
	Data     NodeData   `json:"data"`
	Config   NodeConfig `json:"config"`
}

type NodeData struct {
	Label       string         `json:"label,omitempty"`
	Description string         `json:"description,omitempty"`
	Other       map[string]any `json:"-"`
}

type NodeConfig struct {
	IsValid string         `json:"is_valid,omitempty"`
	Errors  []string       `json:"errors,omitempty"`
	Other   map[string]any `json:"-"`
}

type WorkflowEdge struct {
	Id           string   `json:"id"`
	Source       string   `json:"source"`
	Target       string   `json:"target"`
	SourceHandle string   `json:"source_handle,omitempty"`
	TargetHandle string   `json:"target_handle,omitempty"`
	Type         string   `json:"type,omitempty"`
	Data         EdgeData `json:"data,omitempty"`
}

type EdgeData struct {
	Label     string         `json:"label,omitempty"`
	Condition string         `json:"condition,omitempty"`
	Other     map[string]any `json:"-"`
}

type WorkflowMetadata struct {
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Version     int64     `json:"version"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	CreatedBy   string    `json:"created_by"`
	Tags        []string  `json:"tags,omitempty"`
}

type WorkflowStatus string

const (
	WorkflowStatusDRAFT    WorkflowStatus = "draft"
	WorkflowStatusACTIVE   WorkflowStatus = "active"
	WorkflowStatusINACTIVE WorkflowStatus = "inactive"
	WorkflowStatusARCHIVED WorkflowStatus = "archived"
)

type WorkflowNode interface {
	isWorkflowNode()
}

type Workflow struct {
	Id       string           `json:"id"`
	Name     string           `json:"name"`
	Nodes    []WorkflowNode   `json:"nodes"`
	Edge     []WorkflowEdge   `json:"edge"`
	Metadata WorkflowMetadata `json:"metadata"`
	Status   WorkflowStatus   `json:"status"`
	Triggers []TriggerConfig  `json:"triggers"`
}


