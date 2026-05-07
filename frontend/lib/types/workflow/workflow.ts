/**
 * Core workflow data models and type definitions
 */

import { TriggerConfig } from './auth';
import {
  TriggerNode,
  StartNode,
  IfNode,
  SwitchNode,
  MergeNode,
  WaitNode,
  NoOpNode,
  IteratorNode,
  CodeNode,
  DataMapperNode,
  AgentNode,
  PromptNode,
  KnowledgeNode,
  IntegrationNode,
  ToolNode,
  MemoryNode,
  ApprovalNode,
  OutputNode,
} from './nodes';

export interface Position {
  x: number;
  y: number;
}

export enum NodeType {
  TRIGGER = 'trigger',
  START = 'start',
  IF = 'if',
  SWITCH = 'switch',
  MERGE = 'merge',
  WAIT = 'wait',
  NOOP = 'noop',
  ITERATOR = 'iterator',
  CODE = 'code',
  DATA_MAPPER = 'data_mapper',
  AGENT = 'agent',
  PROMPT = 'prompt',
  KNOWLEDGE = 'knowledge',
  INTEGRATION = 'integration',
  TOOL = 'tool',
  MEMORY = 'memory',
  APPROVAL = 'approval',
  OUTPUT = 'output',
}

export interface BaseNode {
  id: string;
  position: Position;
  data: NodeData;
}

export interface NodeData {
  type: NodeType;
  config: NodeConfig;
  label?: string;
  description?: string;
  [key: string]: unknown;
}

export interface NodeConfig {
  isValid?: boolean;
  errors?: string[];
  [key: string]: unknown;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  data?: EdgeData;
}

export interface EdgeData {
  label?: string;
  condition?: string;
  [key: string]: unknown;
}

export interface WorkflowMetadata {
  name: string;
  description?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: WorkflowMetadata;
  status: WorkflowStatus;
  triggers: TriggerConfig[];
}

export interface WorkflowSummary {
  id: string;
  name: string;
  status: WorkflowStatus;
  version: number;
  updatedAt: Date;
  nodeCount: number;
  edgeCount: number;
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export type WorkflowNode =
  | TriggerNode
  | StartNode
  | IfNode
  | SwitchNode
  | MergeNode
  | WaitNode
  | NoOpNode
  | IteratorNode
  | CodeNode
  | DataMapperNode
  | AgentNode
  | PromptNode
  | KnowledgeNode
  | IntegrationNode
  | ToolNode
  | MemoryNode
  | ApprovalNode
  | OutputNode;
