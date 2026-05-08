"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Save } from "lucide-react";
import { PropertyEditor } from "@/lib/components/PropertyEditor/PropertyEditor";
import { WorkflowCanvas } from "@/lib/components/WorkflowCanvas/WorkflowCanvas";
import { executeWorkflow, loadWorkflow, saveWorkflow } from "@/lib/services/workflowApi";
import { NodeFactory } from "@/lib/services/NodeFactory";
import {
  ExecutionResult,
  NodeExecutionStatus,
  NodeType,
  Workflow,
  WorkflowNode,
  WorkflowStatus,
} from "@/lib/types/workflow";

interface WorkflowBuilderProps {
  initialWorkflow?: Workflow;
  onWorkflowChange?: (workflow: Workflow) => void;
  workflowId?: string;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialWorkflow,
  onWorkflowChange,
  workflowId = "support-agent-workflow",
}) => {
  const nodeFactory = NodeFactory.getInstance();
  const demoWorkflow = useMemo(() => createDemoWorkflow(nodeFactory), [nodeFactory]);
  const [workflow, setWorkflow] = useState<Workflow>(
    initialWorkflow || demoWorkflow
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialWorkflow);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [nodeExecutionStatuses, setNodeExecutionStatuses] = useState<
    Record<string, NodeExecutionStatus>
  >({});

  useEffect(() => {
    if (initialWorkflow) {
      setWorkflow(initialWorkflow);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    loadWorkflow(workflowId)
      .then((loadedWorkflow) => {
        if (!isMounted) {
          return;
        }

        if (loadedWorkflow.nodes.length === 0) {
          setWorkflow(demoWorkflow);
          setStatusMessage("Loaded workflow is empty; showing starter workflow");
          return;
        }

        setWorkflow(loadedWorkflow);
        setStatusMessage("Workflow loaded");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setWorkflow(demoWorkflow);
        setStatusMessage(error instanceof Error ? error.message : "Using demo workflow");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [demoWorkflow, initialWorkflow, workflowId]);

  useEffect(() => {
    if (selectedNodeId && !workflow.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, workflow.nodes]);

  const selectedNode = useMemo(
    () => workflow.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, workflow.nodes]
  );

  const handleWorkflowChange = useCallback((updatedWorkflow: Workflow) => {
    setWorkflow(updatedWorkflow);
    setIsDirty(true);
    setExecutionResult(null);
    setNodeExecutionStatuses({});
    setStatusMessage("Unsaved changes");
    onWorkflowChange?.(updatedWorkflow);
  }, [onWorkflowChange]);

  const handleNodeSelect = useCallback((node: WorkflowNode | null) => {
    setSelectedNodeId(node?.id ?? null);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode["data"]>) => {
      const updatedWorkflow: Workflow = {
        ...workflow,
        nodes: workflow.nodes.map((node) =>
          node.id === nodeId
            ? ({
                ...node,
                data: {
                  ...node.data,
                  ...updates,
                },
              } as WorkflowNode)
            : node
        ),
        metadata: {
          ...workflow.metadata,
          updatedAt: new Date(),
        },
      };

      handleWorkflowChange(updatedWorkflow);
    },
    [handleWorkflowChange, workflow]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setStatusMessage("Saving workflow");

    try {
      const savedWorkflow = await saveWorkflow(workflow);
      setWorkflow(savedWorkflow);
      setIsDirty(false);
      setStatusMessage("Workflow saved");
      onWorkflowChange?.(savedWorkflow);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [onWorkflowChange, workflow]);

  const handleExecute = useCallback(async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    setStatusMessage("Executing workflow");
    setNodeExecutionStatuses(
      Object.fromEntries(
        workflow.nodes.map((node) => [node.id, NodeExecutionStatus.PENDING])
      )
    );

    try {
      const result = await executeWorkflow(workflow);
      const nextStatuses = Object.fromEntries(
        workflow.nodes.map((node) => [
          node.id,
          result.nodeResults[node.id]?.status ??
            (result.executedNodes.includes(node.id)
              ? NodeExecutionStatus.SUCCESS
              : NodeExecutionStatus.SKIPPED),
        ])
      ) as Record<string, NodeExecutionStatus>;

      for (const error of result.errors) {
        if (error.nodeId) {
          nextStatuses[error.nodeId] = NodeExecutionStatus.ERROR;
        }
      }

      setExecutionResult(result);
      setNodeExecutionStatuses(nextStatuses);
      setStatusMessage(
        result.status === "success"
          ? `Execution succeeded (${result.executedNodes.length} nodes)`
          : `Execution ${result.status}`
      );
    } catch (error) {
      setNodeExecutionStatuses(
        Object.fromEntries(
          workflow.nodes.map((node) => [node.id, NodeExecutionStatus.ERROR])
        )
      );
      setStatusMessage(error instanceof Error ? error.message : "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  }, [workflow]);

  return (
    <div className="app-shell flex h-screen w-screen flex-col overflow-hidden">
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold text-slate-950">{workflow.name}</div>
          <div className="truncate text-[12px] text-slate-500">
            {isLoading ? "Loading workflow" : statusMessage}
            {isDirty ? " · Unsaved" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving || isExecuting}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isLoading || isSaving || isExecuting}
            className="primary-button inline-flex h-10 items-center gap-2 px-3 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play size={16} aria-hidden="true" />
            {isExecuting ? "Executing" : "Execute"}
          </button>
        </div>
      </header>

      <div className="relative z-0 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <WorkflowCanvas
            workflow={workflow}
            onWorkflowChange={handleWorkflowChange}
            onNodeSelect={handleNodeSelect}
            selectedNodeId={selectedNodeId}
            isExecuting={isExecuting}
            nodeExecutionStatuses={nodeExecutionStatuses}
            className="h-full w-full"
          />
        </div>
        <aside className="border-l border-slate-200 bg-white">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="text-[13px] font-bold text-slate-950">Properties</div>
              <div className="mt-1 text-[12px] text-slate-500">
                {selectedNode ? selectedNode.data.type.replace(/_/g, " ") : "Select a node"}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {selectedNode ? (
                <PropertyEditor node={selectedNode} onUpdate={handleNodeUpdate} />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-[13px] leading-5 text-slate-500">
                  Select a workflow node to configure labels, prompts, agents, and tools.
                </div>
              )}
            </div>
            {executionResult ? (
              <div className="border-t border-slate-200 px-4 py-3 text-[12px] text-slate-600">
                Last execution: <span className="font-bold">{executionResult.status}</span>
                {executionResult.duration ? ` · ${executionResult.duration}ms` : ""}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
};

function createDemoWorkflow(nodeFactory: NodeFactory): Workflow {
  const trigger = nodeFactory.createNode(NodeType.TRIGGER, {
    id: 'trigger-inbound',
    position: { x: 80, y: 220 },
    label: 'Inbound request',
    description: 'Starts when a new support conversation arrives.',
  });

  const knowledge = nodeFactory.createNode(NodeType.KNOWLEDGE, {
    id: 'knowledge-policy',
    position: { x: 360, y: 90 },
    label: 'Policy knowledge',
    description: 'Searches refund rules and internal support playbooks.',
  });

  const prompt = nodeFactory.createNode(NodeType.PROMPT, {
    id: 'prompt-brief',
    position: { x: 360, y: 330 },
    label: 'Prompt brief',
    description: 'Builds the structured brief for the support agent.',
  });

  const agent = nodeFactory.createNode(NodeType.AGENT, {
    id: 'agent-support',
    position: { x: 660, y: 220 },
    label: 'Support agent',
    description: 'Decides whether to answer directly, fetch data, or escalate.',
  });

  const tool = nodeFactory.createNode(NodeType.TOOL, {
    id: 'tool-crm',
    position: { x: 960, y: 90 },
    label: 'CRM lookup',
    description: 'Pulls account tier, order history, and refund eligibility.',
  });

  const integration = nodeFactory.createNode(NodeType.INTEGRATION, {
    id: 'app-google-docs',
    position: { x: 1260, y: 90 },
    label: 'Google Docs',
    description: 'Writes the approved support summary into a shared Google Docs operations log.',
  });

  const memory = nodeFactory.createNode(NodeType.MEMORY, {
    id: 'memory-session',
    position: { x: 960, y: 330 },
    label: 'Session memory',
    description: 'Stores the running conversation summary and prior actions.',
  });

  const approval = nodeFactory.createNode(NodeType.APPROVAL, {
    id: 'approval-refund',
    position: { x: 1560, y: 220 },
    label: 'Refund approval',
    description: 'Requires a human check before high-value refunds are sent.',
  });

  const output = nodeFactory.createNode(NodeType.OUTPUT, {
    id: 'output-reply',
    position: { x: 1860, y: 220 },
    label: 'Customer reply',
    description: 'Delivers the final response back into the support channel.',
  });

  return {
    id: 'support-agent-workflow',
    name: 'Support Agent Workflow',
    nodes: [trigger, knowledge, prompt, agent, tool, integration, memory, approval, output],
    edges: [
      nodeFactory.createConnection(trigger, knowledge),
      nodeFactory.createConnection(trigger, prompt),
      nodeFactory.createConnection(knowledge, agent),
      nodeFactory.createConnection(prompt, agent),
      nodeFactory.createConnection(agent, tool),
      nodeFactory.createConnection(agent, memory),
      nodeFactory.createConnection(tool, integration),
      nodeFactory.createConnection(integration, approval),
      nodeFactory.createConnection(memory, approval),
      nodeFactory.createConnection(approval, output),
    ],
    metadata: {
      name: 'Support Agent Workflow',
      description: 'An AI agent workflow that retrieves knowledge, uses tools, connects third-party apps, and routes through human approval.',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      tags: ['ai-agent', 'support', 'workflow', 'integrations'],
    },
    status: WorkflowStatus.DRAFT,
    triggers: [],
  };
}
