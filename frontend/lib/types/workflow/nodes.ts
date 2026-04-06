/**
 * Specific node type definitions for AI agent workflows
 */

import { BaseNode, NodeData, NodeType } from './workflow';

export interface TriggerNode extends BaseNode {
  data: TriggerNodeData;
}

export interface TriggerNodeData extends NodeData {
  type: NodeType.TRIGGER;
  triggerSource: TriggerSource;
  eventName: string;
  schedule?: string;
  filters: AgentCondition[];
}

export enum TriggerSource {
  CHAT = 'chat',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  EMAIL = 'email',
  CRM = 'crm',
}

export interface AgentNode extends BaseNode {
  data: AgentNodeData;
}

export interface AgentNodeData extends NodeData {
  type: NodeType.AGENT;
  role: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxSteps: number;
  allowedTools: string[];
}

export interface PromptNode extends BaseNode {
  data: PromptNodeData;
}

export interface PromptNodeData extends NodeData {
  type: NodeType.PROMPT;
  promptTemplate: string;
  inputVariables: string[];
  outputKey: string;
}

export interface KnowledgeNode extends BaseNode {
  data: KnowledgeNodeData;
}

export interface KnowledgeNodeData extends NodeData {
  type: NodeType.KNOWLEDGE;
  sourceType: KnowledgeSourceType;
  sourceName: string;
  retrievalMode: RetrievalMode;
  topK: number;
}

export enum KnowledgeSourceType {
  FILES = 'files',
  WEBSITE = 'website',
  DATABASE = 'database',
  VECTOR_STORE = 'vector_store',
}

export enum RetrievalMode {
  SEMANTIC = 'semantic',
  HYBRID = 'hybrid',
  KEYWORD = 'keyword',
}

export interface IntegrationNode extends BaseNode {
  data: IntegrationNodeData;
}

export interface IntegrationNodeData extends NodeData {
  type: NodeType.INTEGRATION;
  appType: ThirdPartyAppType;
  appName: string;
  action: string;
  authStatus: IntegrationAuthStatus;
  mappedFields: string[];
}

export enum ThirdPartyAppType {
  EMAIL = 'email',
  GOOGLE = 'google',
  YOUTUBE = 'youtube',
  GOOGLE_DOCS = 'google_docs',
  SLACK = 'slack',
}

export enum IntegrationAuthStatus {
  CONNECTED = 'connected',
  PENDING = 'pending',
  EXPIRED = 'expired',
}

export interface ToolNode extends BaseNode {
  data: ToolNodeData;
}

export interface ToolNodeData extends NodeData {
  type: NodeType.TOOL;
  toolType: ToolType;
  endpoint?: string;
  action: string;
  timeoutMs?: number;
  retries: number;
}

export enum ToolType {
  HTTP = 'http',
  FUNCTION = 'function',
  DATABASE = 'database',
  EMAIL = 'email',
  CRM = 'crm',
}

export interface MemoryNode extends BaseNode {
  data: MemoryNodeData;
}

export interface MemoryNodeData extends NodeData {
  type: NodeType.MEMORY;
  memoryScope: MemoryScope;
  strategy: MemoryStrategy;
  maxItems: number;
}

export enum MemoryScope {
  RUN = 'run',
  SESSION = 'session',
  USER = 'user',
  WORKSPACE = 'workspace',
}

export enum MemoryStrategy {
  APPEND = 'append',
  SUMMARIZE = 'summarize',
  REPLACE = 'replace',
}

export interface ApprovalNode extends BaseNode {
  data: ApprovalNodeData;
}

export interface ApprovalNodeData extends NodeData {
  type: NodeType.APPROVAL;
  approverType: ApproverType;
  instructions: string;
  timeoutMinutes: number;
}

export enum ApproverType {
  HUMAN = 'human',
  TEAM = 'team',
  MANAGER = 'manager',
}

export interface OutputNode extends BaseNode {
  data: OutputNodeData;
}

export interface OutputNodeData extends NodeData {
  type: NodeType.OUTPUT;
  outputType: OutputType;
  destination: string;
  format: string;
}

export enum OutputType {
  CHAT = 'chat',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  DATABASE = 'database',
  DASHBOARD = 'dashboard',
}

export interface AgentCondition {
  id: string;
  field: string;
  operator: ComparisonOperator;
  value: unknown;
}

export enum ComparisonOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
}
