from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Union

from pydantic import Field

from app.models.auth import RivetModel, TriggerConfig


class NodeType(str, Enum):
    TRIGGER = "trigger"
    AGENT = "agent"
    PROMPT = "prompt"
    KNOWLEDGE = "knowledge"
    INTEGRATION = "integration"
    TOOL = "tool"
    MEMORY = "memory"
    APPROVAL = "approval"
    OUTPUT = "output"


class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class ComparisonOperator(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"


class TriggerSource(str, Enum):
    CHAT = "chat"
    WEBHOOK = "webhook"
    SCHEDULE = "schedule"
    EMAIL = "email"
    CRM = "crm"


class KnowledgeSourceType(str, Enum):
    FILES = "files"
    WEBSITE = "website"
    DATABASE = "database"
    VECTOR_STORE = "vector_store"


class RetrievalMode(str, Enum):
    SEMANTIC = "semantic"
    HYBRID = "hybrid"
    KEYWORD = "keyword"


class ThirdPartyAppType(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"
    YOUTUBE = "youtube"
    GOOGLE_DOCS = "google_docs"
    SLACK = "slack"


class IntegrationAuthStatus(str, Enum):
    CONNECTED = "connected"
    PENDING = "pending"
    EXPIRED = "expired"


class ToolType(str, Enum):
    HTTP = "http"
    FUNCTION = "function"
    DATABASE = "database"
    EMAIL = "email"
    CRM = "crm"


class MemoryScope(str, Enum):
    RUN = "run"
    SESSION = "session"
    USER = "user"
    WORKSPACE = "workspace"


class MemoryStrategy(str, Enum):
    APPEND = "append"
    SUMMARIZE = "summarize"
    REPLACE = "replace"


class ApproverType(str, Enum):
    HUMAN = "human"
    TEAM = "team"
    MANAGER = "manager"


class OutputType(str, Enum):
    CHAT = "chat"
    EMAIL = "email"
    WEBHOOK = "webhook"
    DATABASE = "database"
    DASHBOARD = "dashboard"


class Position(RivetModel):
    x: float
    y: float


class NodeConfig(RivetModel):
    is_valid: bool | None = None
    errors: list[str] = Field(default_factory=list)


class BaseNodeData(RivetModel):
    type: NodeType
    config: NodeConfig = Field(default_factory=NodeConfig)
    label: str | None = None
    description: str | None = None


class AgentCondition(RivetModel):
    id: str
    field: str
    operator: ComparisonOperator
    value: Any


class TriggerNodeData(BaseNodeData):
    type: Literal[NodeType.TRIGGER]
    trigger_source: TriggerSource
    event_name: str
    schedule: str | None = None
    filters: list[AgentCondition] = Field(default_factory=list)


class AgentNodeData(BaseNodeData):
    type: Literal[NodeType.AGENT]
    role: str
    model: str
    system_prompt: str
    temperature: float
    max_steps: int
    allowed_tools: list[str] = Field(default_factory=list)


class PromptNodeData(BaseNodeData):
    type: Literal[NodeType.PROMPT]
    prompt_template: str
    input_variables: list[str] = Field(default_factory=list)
    output_key: str


class KnowledgeNodeData(BaseNodeData):
    type: Literal[NodeType.KNOWLEDGE]
    source_type: KnowledgeSourceType
    source_name: str
    retrieval_mode: RetrievalMode
    top_k: int


class IntegrationNodeData(BaseNodeData):
    type: Literal[NodeType.INTEGRATION]
    app_type: ThirdPartyAppType
    app_name: str
    action: str
    auth_status: IntegrationAuthStatus
    mapped_fields: list[str] = Field(default_factory=list)


class ToolNodeData(BaseNodeData):
    type: Literal[NodeType.TOOL]
    tool_type: ToolType
    endpoint: str | None = None
    action: str
    timeout_ms: int | None = None
    retries: int


class MemoryNodeData(BaseNodeData):
    type: Literal[NodeType.MEMORY]
    memory_scope: MemoryScope
    strategy: MemoryStrategy
    max_items: int


class ApprovalNodeData(BaseNodeData):
    type: Literal[NodeType.APPROVAL]
    approver_type: ApproverType
    instructions: str
    timeout_minutes: int


class OutputNodeData(BaseNodeData):
    type: Literal[NodeType.OUTPUT]
    output_type: OutputType
    destination: str
    format: str


NodeData = Union[
    TriggerNodeData,
    AgentNodeData,
    PromptNodeData,
    KnowledgeNodeData,
    IntegrationNodeData,
    ToolNodeData,
    MemoryNodeData,
    ApprovalNodeData,
    OutputNodeData,
]


class WorkflowNode(RivetModel):
    id: str
    position: Position
    data: NodeData = Field(discriminator="type")


class EdgeData(RivetModel):
    label: str | None = None
    condition: str | None = None


class WorkflowEdge(RivetModel):
    id: str
    source: str
    target: str
    source_handle: str | None = None
    target_handle: str | None = None
    type: str | None = None
    data: EdgeData | None = None


class WorkflowMetadata(RivetModel):
    name: str
    description: str | None = None
    version: int
    created_at: datetime
    updated_at: datetime
    created_by: str
    tags: list[str] = Field(default_factory=list)


class Workflow(RivetModel):
    id: str
    name: str
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)
    metadata: WorkflowMetadata
    status: WorkflowStatus
    triggers: list[TriggerConfig] = Field(default_factory=list)
