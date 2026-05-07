/**
 * NodeFactory - Factory pattern implementation for creating AI agent workflow nodes
 */

import {
  WorkflowNode,
  NodeType,
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
  Position,
  WorkflowEdge,
  NodeData,
  NodeConfig,
  ValidationResult,
  ValidationType,
  TriggerSource,
  MergeStrategy,
  DelayUnit,
  ScriptLanguage,
  DataMapperMode,
  ComparisonOperator,
  KnowledgeSourceType,
  RetrievalMode,
  ThirdPartyAppType,
  IntegrationAuthStatus,
  ToolType,
  MemoryScope,
  MemoryStrategy,
  ApproverType,
  OutputType,
} from '../types/workflow';

export interface CreateNodeOptions {
  id?: string;
  position: Position;
  label?: string;
  description?: string;
}

export class NodeFactory {
  private static instance: NodeFactory;

  private constructor() {}

  public static getInstance(): NodeFactory {
    if (!NodeFactory.instance) {
      NodeFactory.instance = new NodeFactory();
    }
    return NodeFactory.instance;
  }

  public createNode(type: NodeType, options: CreateNodeOptions): WorkflowNode {
    const nodeId = options.id || this.generateNodeId(type);

    switch (type) {
      case NodeType.TRIGGER:
        return this.createTriggerNode(nodeId, options);
      case NodeType.START:
        return this.createStartNode(nodeId, options);
      case NodeType.IF:
        return this.createIfNode(nodeId, options);
      case NodeType.SWITCH:
        return this.createSwitchNode(nodeId, options);
      case NodeType.MERGE:
        return this.createMergeNode(nodeId, options);
      case NodeType.WAIT:
        return this.createWaitNode(nodeId, options);
      case NodeType.NOOP:
        return this.createNoOpNode(nodeId, options);
      case NodeType.ITERATOR:
        return this.createIteratorNode(nodeId, options);
      case NodeType.CODE:
        return this.createCodeNode(nodeId, options);
      case NodeType.DATA_MAPPER:
        return this.createDataMapperNode(nodeId, options);
      case NodeType.AGENT:
        return this.createAgentNode(nodeId, options);
      case NodeType.PROMPT:
        return this.createPromptNode(nodeId, options);
      case NodeType.KNOWLEDGE:
        return this.createKnowledgeNode(nodeId, options);
      case NodeType.INTEGRATION:
        return this.createIntegrationNode(nodeId, options);
      case NodeType.TOOL:
        return this.createToolNode(nodeId, options);
      case NodeType.MEMORY:
        return this.createMemoryNode(nodeId, options);
      case NodeType.APPROVAL:
        return this.createApprovalNode(nodeId, options);
      case NodeType.OUTPUT:
        return this.createOutputNode(nodeId, options);
      default:
        throw new Error(`Unsupported node type: ${type}`);
    }
  }

  public createConnection(
    source: WorkflowNode,
    target: WorkflowNode,
    overrides: Partial<WorkflowEdge> = {}
  ): WorkflowEdge {
    return {
      id: overrides.id ?? `edge-${source.id}-${target.id}`,
      source: source.id,
      target: target.id,
      sourceHandle: overrides.sourceHandle ?? null,
      targetHandle: overrides.targetHandle ?? null,
      type: overrides.type ?? 'smoothstep',
      data: overrides.data,
    };
  }

  public canConnect(
    source: WorkflowNode,
    target: WorkflowNode,
    edges: WorkflowEdge[] = []
  ): boolean {
    if (source.id === target.id) {
      return false;
    }

    return !edges.some(
      (edge) =>
        edge.source === source.id &&
        edge.target === target.id &&
        edge.sourceHandle === null &&
        edge.targetHandle === null
    );
  }

  public validateNode(node: WorkflowNode): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    if (!node.id) {
      errors.push({
        type: ValidationType.REQUIRED_FIELD_MISSING,
        message: 'Node id is required.',
        field: 'id',
        nodeId: node.id,
      });
    }

    if (!node.data.label) {
      warnings.push({
        type: ValidationType.REQUIRED_FIELD_MISSING,
        message: 'Node label is empty.',
        field: 'label',
        nodeId: node.id,
      });
    }

    switch (node.data.type) {
      case NodeType.TRIGGER:
        if (!node.data.eventName) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Trigger event name is required.',
            field: 'eventName',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.START:
        if (!node.data.entryLabel) {
          warnings.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Start entry label is empty.',
            field: 'entryLabel',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.IF:
        if (!node.data.condition) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'IF condition is required.',
            field: 'condition',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.SWITCH:
        if (!node.data.expression) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Switch expression is required.',
            field: 'expression',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.MERGE:
        if (!node.data.mergeStrategy) {
          warnings.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Merge strategy is empty.',
            field: 'mergeStrategy',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.WAIT:
        if (node.data.delayAmount < 0) {
          errors.push({
            type: ValidationType.INVALID_TYPE,
            message: 'Wait delay must be zero or greater.',
            field: 'delayAmount',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.NOOP:
        break;
      case NodeType.ITERATOR:
        if (!node.data.listPath) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Iterator list path is required.',
            field: 'listPath',
            nodeId: node.id,
          });
        }
        if (node.data.maxItems <= 0) {
          errors.push({
            type: ValidationType.INVALID_TYPE,
            message: 'Iterator max items must be greater than zero.',
            field: 'maxItems',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.CODE:
        if (!node.data.code) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Code snippet is required.',
            field: 'code',
            nodeId: node.id,
          });
        }
        if (!node.data.outputKey) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Code output key is required.',
            field: 'outputKey',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.DATA_MAPPER:
        if (node.data.mode === DataMapperMode.SET && !node.data.variableKey) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Data mapper variable key is required.',
            field: 'variableKey',
            nodeId: node.id,
          });
        }
        if (node.data.mode === DataMapperMode.MAP && node.data.mappings.length === 0) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Data mapper needs at least one mapping.',
            field: 'mappings',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.AGENT:
        if (!node.data.model) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Agent model is required.',
            field: 'model',
            nodeId: node.id,
          });
        }
        if (!node.data.systemPrompt) {
          warnings.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Agent system prompt is empty.',
            field: 'systemPrompt',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.PROMPT:
        if (!node.data.promptTemplate) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Prompt template is required.',
            field: 'promptTemplate',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.KNOWLEDGE:
        if (!node.data.sourceName) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Knowledge source name is required.',
            field: 'sourceName',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.INTEGRATION:
        if (!node.data.appName) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Integration app name is required.',
            field: 'appName',
            nodeId: node.id,
          });
        }
        if (!node.data.action) {
          warnings.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Third-party app action is empty.',
            field: 'action',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.TOOL:
        if (!node.data.action) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Tool action is required.',
            field: 'action',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.MEMORY:
        if (node.data.maxItems <= 0) {
          errors.push({
            type: ValidationType.INVALID_TYPE,
            message: 'Memory max items must be greater than zero.',
            field: 'maxItems',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.APPROVAL:
        if (!node.data.instructions) {
          warnings.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Approval instructions are empty.',
            field: 'instructions',
            nodeId: node.id,
          });
        }
        break;
      case NodeType.OUTPUT:
        if (!node.data.destination) {
          errors.push({
            type: ValidationType.REQUIRED_FIELD_MISSING,
            message: 'Output destination is required.',
            field: 'destination',
            nodeId: node.id,
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public createDefaultData(type: NodeType, options: CreateNodeOptions): NodeData {
    return this.createNode(type, options).data;
  }

  private createBaseConfig(): NodeConfig {
    return {
      isValid: true,
      errors: [],
    };
  }

  private createBaseNodeData(
    type: NodeType,
    options: CreateNodeOptions
  ): Pick<NodeData, 'type' | 'label' | 'description' | 'config'> {
    return {
      type,
      label: options.label ?? this.getDefaultLabel(type),
      description: options.description ?? '',
      config: this.createBaseConfig(),
    };
  }

  private createTriggerNode(id: string, options: CreateNodeOptions): TriggerNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.TRIGGER, options),
        type: NodeType.TRIGGER,
        triggerSource: TriggerSource.CHAT,
        eventName: 'new.customer.message',
        filters: [
          {
            id: `${id}-filter-1`,
            field: 'priority',
            operator: ComparisonOperator.EQUALS,
            value: 'high',
          },
        ],
      },
    };
  }

  private createStartNode(id: string, options: CreateNodeOptions): StartNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.START, options),
        type: NodeType.START,
        entryLabel: 'manual_start',
      },
    };
  }

  private createIfNode(id: string, options: CreateNodeOptions): IfNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.IF, options),
        type: NodeType.IF,
        condition: 'priority == "high"',
        trueLabel: 'yes',
        falseLabel: 'no',
      },
    };
  }

  private createSwitchNode(id: string, options: CreateNodeOptions): SwitchNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.SWITCH, options),
        type: NodeType.SWITCH,
        expression: 'ticket_type',
        cases: ['billing', 'support', 'sales'],
        defaultCase: 'default',
      },
    };
  }

  private createMergeNode(id: string, options: CreateNodeOptions): MergeNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.MERGE, options),
        type: NodeType.MERGE,
        mergeStrategy: MergeStrategy.WAIT_FOR_ALL,
      },
    };
  }

  private createWaitNode(id: string, options: CreateNodeOptions): WaitNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.WAIT, options),
        type: NodeType.WAIT,
        delayAmount: 5,
        delayUnit: DelayUnit.MINUTES,
      },
    };
  }

  private createNoOpNode(id: string, options: CreateNodeOptions): NoOpNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.NOOP, options),
        type: NodeType.NOOP,
        note: 'Structural placeholder',
      },
    };
  }

  private createIteratorNode(id: string, options: CreateNodeOptions): IteratorNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.ITERATOR, options),
        type: NodeType.ITERATOR,
        listPath: 'upstream.knowledge.documents',
        itemKey: 'currentItem',
        indexKey: 'currentIndex',
        outputKey: 'iteratorItems',
        maxItems: 100,
      },
    };
  }

  private createCodeNode(id: string, options: CreateNodeOptions): CodeNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.CODE, options),
        type: NodeType.CODE,
        language: ScriptLanguage.PYTHON,
        code: 'result = sharedData.get("price", 0) * 1.2',
        outputKey: 'scriptResult',
      },
    };
  }

  private createDataMapperNode(id: string, options: CreateNodeOptions): DataMapperNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.DATA_MAPPER, options),
        type: NodeType.DATA_MAPPER,
        mode: DataMapperMode.MAP,
        mappings: [
          {
            source: 'sharedData.trigger.eventName',
            target: 'event.name',
          },
        ],
      },
    };
  }

  private createAgentNode(id: string, options: CreateNodeOptions): AgentNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.AGENT, options),
        type: NodeType.AGENT,
        role: 'Support agent',
        model: 'gpt-4.1-mini',
        systemPrompt: 'Resolve the task using the provided context and tools.',
        temperature: 0.3,
        maxSteps: 6,
        allowedTools: ['crm_lookup', 'send_email'],
      },
    };
  }

  private createPromptNode(id: string, options: CreateNodeOptions): PromptNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.PROMPT, options),
        type: NodeType.PROMPT,
        promptTemplate:
          'Summarize the customer issue, propose a next action, and decide whether escalation is needed.',
        inputVariables: ['customer_message', 'customer_profile', 'conversation_history'],
        outputKey: 'agent_brief',
      },
    };
  }

  private createKnowledgeNode(id: string, options: CreateNodeOptions): KnowledgeNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.KNOWLEDGE, options),
        type: NodeType.KNOWLEDGE,
        sourceType: KnowledgeSourceType.VECTOR_STORE,
        sourceName: 'support-handbook',
        retrievalMode: RetrievalMode.HYBRID,
        topK: 5,
      },
    };
  }

  private createIntegrationNode(id: string, options: CreateNodeOptions): IntegrationNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.INTEGRATION, options),
        type: NodeType.INTEGRATION,
        appType: ThirdPartyAppType.GOOGLE,
        appName: 'Google Docs',
        action: 'append_summary',
        authStatus: IntegrationAuthStatus.CONNECTED,
        mappedFields: ['customer_email', 'refund_status', 'agent_summary'],
      },
    };
  }

  private createToolNode(id: string, options: CreateNodeOptions): ToolNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.TOOL, options),
        type: NodeType.TOOL,
        toolType: ToolType.HTTP,
        endpoint: 'https://api.example.com/customers/{id}',
        action: 'crm_lookup',
        timeoutMs: 20000,
        retries: 2,
      },
    };
  }

  private createMemoryNode(id: string, options: CreateNodeOptions): MemoryNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.MEMORY, options),
        type: NodeType.MEMORY,
        memoryScope: MemoryScope.SESSION,
        strategy: MemoryStrategy.SUMMARIZE,
        maxItems: 20,
      },
    };
  }

  private createApprovalNode(id: string, options: CreateNodeOptions): ApprovalNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.APPROVAL, options),
        type: NodeType.APPROVAL,
        approverType: ApproverType.HUMAN,
        instructions: 'Approve refunds over $500 before the agent sends the final response.',
        timeoutMinutes: 30,
      },
    };
  }

  private createOutputNode(id: string, options: CreateNodeOptions): OutputNode {
    return {
      id,
      position: options.position,
      data: {
        ...this.createBaseNodeData(NodeType.OUTPUT, options),
        type: NodeType.OUTPUT,
        outputType: OutputType.CHAT,
        destination: 'customer-reply',
        format: 'markdown',
      },
    };
  }

  private generateNodeId(type: NodeType): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private getDefaultLabel(type: NodeType): string {
    switch (type) {
      case NodeType.TRIGGER:
        return 'Trigger';
      case NodeType.START:
        return 'Start';
      case NodeType.IF:
        return 'IF';
      case NodeType.SWITCH:
        return 'Switch';
      case NodeType.MERGE:
        return 'Merge';
      case NodeType.WAIT:
        return 'Wait';
      case NodeType.NOOP:
        return 'NoOp';
      case NodeType.ITERATOR:
        return 'Iterator';
      case NodeType.CODE:
        return 'Code';
      case NodeType.DATA_MAPPER:
        return 'Data Mapper';
      case NodeType.AGENT:
        return 'Agent';
      case NodeType.PROMPT:
        return 'Prompt';
      case NodeType.KNOWLEDGE:
        return 'Knowledge';
      case NodeType.INTEGRATION:
        return 'Integration';
      case NodeType.TOOL:
        return 'Tool';
      case NodeType.MEMORY:
        return 'Memory';
      case NodeType.APPROVAL:
        return 'Approval';
      case NodeType.OUTPUT:
        return 'Output';
      default:
        return 'Node';
    }
  }
}
