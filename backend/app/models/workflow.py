from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated, Any, Literal, TypeAlias, Union

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
    config: NodeConfig = Field(default_factory=NodeConfig)
    label: str | None = None
    description: str | None = None


class AgentCondition(RivetModel):
    id: str
    field: str
    operator: ComparisonOperator
    value: Any


class TriggerNodeData(BaseNodeData):
    type: Literal["trigger"]
    trigger_source: TriggerSource
    event_name: str
    schedule: str | None = None
    filters: list[AgentCondition] = Field(default_factory=list)


class AgentNodeData(BaseNodeData):
    type: Literal["agent"]
    role: str
    model: str
    system_prompt: str
    temperature: float
    max_steps: int
    allowed_tools: list[str] = Field(default_factory=list)


class PromptNodeData(BaseNodeData):
    type: Literal["prompt"]
    prompt_template: str
    input_variables: list[str] = Field(default_factory=list)
    output_key: str


class KnowledgeNodeData(BaseNodeData):
    type: Literal["knowledge"]
    source_type: KnowledgeSourceType
    source_name: str
    retrieval_mode: RetrievalMode
    top_k: int


class IntegrationNodeData(BaseNodeData):
    type: Literal["integration"]
    app_type: ThirdPartyAppType
    app_name: str
    action: str
    auth_status: IntegrationAuthStatus
    mapped_fields: list[str] = Field(default_factory=list)


class ToolNodeData(BaseNodeData):
    type: Literal["tool"]
    tool_type: ToolType
    endpoint: str | None = None
    action: str
    timeout_ms: int | None = None
    retries: int


class MemoryNodeData(BaseNodeData):
    type: Literal["memory"]
    memory_scope: MemoryScope
    strategy: MemoryStrategy
    max_items: int


class ApprovalNodeData(BaseNodeData):
    type: Literal["approval"]
    approver_type: ApproverType
    instructions: str
    timeout_minutes: int


class OutputNodeData(BaseNodeData):
    type: Literal["output"]
    output_type: OutputType
    destination: str
    format: str


NodeData: TypeAlias = Annotated[
    Union[
    TriggerNodeData,
    AgentNodeData,
    PromptNodeData,
    KnowledgeNodeData,
    IntegrationNodeData,
    ToolNodeData,
    MemoryNodeData,
    ApprovalNodeData,
    OutputNodeData,
    ],
    Field(discriminator="type"),
]


class WorkflowNode(RivetModel):
    id: str
    position: Position
    data: NodeData


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


class WorkflowSummary(RivetModel):
    id: str
    name: str
    status: WorkflowStatus
    version: int
    updated_at: datetime
    node_count: int
    edge_count: int
