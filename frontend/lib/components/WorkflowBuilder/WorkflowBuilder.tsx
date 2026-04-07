"use client";

import React, { useEffect, useState } from "react";
import { WorkflowCanvas } from "@/lib/components/WorkflowCanvas/WorkflowCanvas";
import { NodeFactory } from "@/lib/services/NodeFactory";
import {
  executeWorkflow,
  listWorkflows,
  loadWorkflow,
  saveWorkflow,
  validateWorkflow,
} from "@/lib/services/workflowApi";
import {
  ExecutionResult,
  NodeType,
  ValidationResult,
  Workflow,
  WorkflowNode,
  WorkflowSummary,
  WorkflowStatus,
} from "@/lib/types/workflow";
import { NodePalette } from "../NodePalette/NodePalette";

interface WorkflowBuilderProps {
  initialWorkflow?: Workflow;
  onWorkflowChange?: (workflow: Workflow) => void;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialWorkflow,
  onWorkflowChange,
}) => {
  const nodeFactory = NodeFactory.getInstance();
  const [workflow, setWorkflow] = useState<Workflow>(
    initialWorkflow || createDemoWorkflow(nodeFactory)
  );
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowSummary[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const commitWorkflow = (updatedWorkflow: Workflow) => {
    setWorkflow(updatedWorkflow);
    setSelectedWorkflowId(updatedWorkflow.id);
    const updatedSelectedNode = selectedNode
      ? updatedWorkflow.nodes.find((node) => node.id === selectedNode.id) ?? null
      : null;
    setSelectedNode(updatedSelectedNode);
    onWorkflowChange?.(updatedWorkflow);
  };

  const refreshSavedWorkflows = async (preferredWorkflowId?: string) => {
    setIsLoadingCatalog(true);

    try {
      const workflows = await listWorkflows();
      setSavedWorkflows(workflows);

      if (preferredWorkflowId) {
        setSelectedWorkflowId(preferredWorkflowId);
      } else if (workflows.length > 0 && !selectedWorkflowId) {
        setSelectedWorkflowId(workflows[0].id);
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to load saved workflows.");
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    void refreshSavedWorkflows(workflow.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWorkflowChange = (updatedWorkflow: Workflow) => {
    setRequestError(null);
    commitWorkflow(updatedWorkflow);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNode) {
      return;
    }

    commitWorkflow({
      ...workflow,
      nodes: workflow.nodes.filter((node) => node.id !== selectedNode.id),
      edges: workflow.edges.filter(
        (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ),
      metadata: {
        ...workflow.metadata,
        updatedAt: new Date(),
      },
    });
  };

  const handleClearCanvas = () => {
    setValidationResult(null);
    setExecutionResult(null);
    setRequestError(null);
    commitWorkflow({
      ...workflow,
      nodes: [],
      edges: [],
      metadata: {
        ...workflow.metadata,
        updatedAt: new Date(),
      },
    });
  };

  const handleValidateWorkflow = async () => {
    setIsValidating(true);
    setRequestError(null);

    try {
      const result = await validateWorkflow(workflow);
      setValidationResult(result);
    } catch (error) {
      setValidationResult(null);
      setRequestError(error instanceof Error ? error.message : "Failed to validate workflow.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    setRequestError(null);

    try {
      const result = await executeWorkflow(workflow);
      setExecutionResult(result);
    } catch (error) {
      setExecutionResult(null);
      setRequestError(error instanceof Error ? error.message : "Failed to execute workflow.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    setRequestError(null);

    try {
      const persistedWorkflow = await saveWorkflow({
        ...workflow,
        metadata: {
          ...workflow.metadata,
          updatedAt: new Date(),
        },
      });
      commitWorkflow(persistedWorkflow);
      await refreshSavedWorkflows(persistedWorkflow.id);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to save workflow.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadWorkflow = async () => {
    if (!selectedWorkflowId) {
      return;
    }

    setIsLoadingWorkflow(true);
    setRequestError(null);

    try {
      const loadedWorkflow = await loadWorkflow(selectedWorkflowId);
      setValidationResult(null);
      setExecutionResult(null);
      commitWorkflow(loadedWorkflow);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to load workflow.");
    } finally {
      setIsLoadingWorkflow(false);
    }
  };

  return (
    <div className="retro-app-shell flex h-screen w-screen flex-col overflow-hidden p-3">
      <NodePalette
        className="shrink-0"
        toolbar={
          <>
            <button
              type="button"
              onClick={handleSaveWorkflow}
              disabled={isSaving || isValidating || isExecuting}
              className="retro-button min-w-32 px-4 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save workflow"}
            </button>
            <button
              type="button"
              onClick={handleValidateWorkflow}
              disabled={workflow.nodes.length === 0 || isValidating || isExecuting || isSaving}
              className="retro-button min-w-32 px-4 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isValidating ? "Validating..." : "Validate workflow"}
            </button>
            <button
              type="button"
              onClick={handleExecuteWorkflow}
              disabled={workflow.nodes.length === 0 || isExecuting || isValidating || isSaving}
              className="retro-button min-w-32 px-4 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExecuting ? "Executing..." : "Run workflow"}
            </button>
            <button
              type="button"
              onClick={handleClearCanvas}
              disabled={workflow.nodes.length === 0 || isValidating || isExecuting || isSaving}
              className="retro-button min-w-32 px-4 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear canvas
            </button>
          </>
        }
      />
      <div className="mt-3 flex min-h-0 flex-1 overflow-hidden">
        <div className="retro-window relative min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-4">
            <div className="retro-window max-w-lg px-4 py-3">
              <div className="retro-label text-[#0c4a4d]">Pipeline</div>
              <div className="mt-2 text-sm font-medium text-[#1b1916]">
                Build and edit your workflow pipeline on the canvas.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="retro-badge">
                  <span className="retro-badge-dot" />
                  {workflow.nodes.length} nodes
                </div>
                <div className="retro-badge">
                  <span className="retro-badge-dot bg-[#2f8f94]" />
                  {workflow.edges.length} links
                </div>
                <div className="retro-badge">
                  <span className="retro-badge-dot bg-[#2b62b7]" />
                  {workflow.id}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="retro-window flex w-72 flex-col gap-2 px-3 py-3">
                <label className="retro-label text-[#5b564a]" htmlFor="workflow-selector">
                  Saved workflows
                </label>
                <select
                  id="workflow-selector"
                  value={selectedWorkflowId}
                  onChange={(event) => setSelectedWorkflowId(event.target.value)}
                  disabled={isLoadingCatalog || isLoadingWorkflow}
                  className="border-2 border-[#24211a] bg-[#c8c0ab] px-2 py-2 text-[12px] text-[#171716] shadow-[inset_2px_2px_0_#7d7666,inset_-2px_-2px_0_#f6f1de]"
                >
                  <option value="">
                    {isLoadingCatalog ? "Loading..." : savedWorkflows.length ? "Select saved workflow" : "No saved workflows"}
                  </option>
                  {savedWorkflows.map((savedWorkflow) => (
                    <option key={savedWorkflow.id} value={savedWorkflow.id}>
                      {savedWorkflow.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLoadWorkflow}
                    disabled={!selectedWorkflowId || isLoadingWorkflow || isSaving}
                    className="retro-button flex-1 px-4 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingWorkflow ? "Loading..." : "Load"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshSavedWorkflows(selectedWorkflowId || workflow.id)}
                    disabled={isLoadingCatalog || isLoadingWorkflow}
                    className="retro-button flex-1 px-4 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>

          <WorkflowCanvas
            workflow={workflow}
            onWorkflowChange={handleWorkflowChange}
            onNodeSelect={setSelectedNode}
            isExecuting={isExecuting}
            className="h-full w-full"
          />
        </div>

        <aside className="ml-3 w-80 shrink-0 border-2 border-[#24211a] bg-[linear-gradient(180deg,rgba(255,247,225,0.25)_0%,transparent_18%),linear-gradient(180deg,#d8d1bb_0%,#c6bea8_100%)] shadow-[inset_2px_2px_0_#f6f1de,inset_-2px_-2px_0_#7d7666,6px_6px_0_rgba(23,23,22,0.35)]">
          <div className="border-b-2 border-[#24211a] p-4">
            <div className="retro-label text-[#5b564a]">Backend status</div>
            <div className="mt-3 space-y-3 text-sm">
              <div className="border-2 border-[#24211a] bg-[#c8c0ab] p-3 shadow-[inset_2px_2px_0_#7d7666,inset_-2px_-2px_0_#f6f1de]">
                <div className="retro-label text-[#5b564a]">Persistence</div>
                <div className="mt-2 text-[13px] text-[#171716]">
                  {savedWorkflows.length} saved workflow{savedWorkflows.length === 1 ? "" : "s"}
                </div>
                <div className="mt-2 text-[12px] text-[#444039]">
                  {selectedWorkflowId ? `Selected: ${selectedWorkflowId}` : "No saved workflow selected"}
                </div>
              </div>

              <div className="border-2 border-[#24211a] bg-[#c8c0ab] p-3 shadow-[inset_2px_2px_0_#7d7666,inset_-2px_-2px_0_#f6f1de]">
                <div className="retro-label text-[#5b564a]">Validation</div>
                <div className="mt-2 text-[13px] text-[#171716]">
                  {validationResult
                    ? validationResult.isValid
                      ? "Valid"
                      : "Invalid"
                    : "Not run yet"}
                </div>
                {validationResult ? (
                  <div className="mt-2 text-[12px] text-[#444039]">
                    {validationResult.errors.length} errors, {validationResult.warnings.length} warnings
                  </div>
                ) : null}
              </div>

              <div className="border-2 border-[#24211a] bg-[#c8c0ab] p-3 shadow-[inset_2px_2px_0_#7d7666,inset_-2px_-2px_0_#f6f1de]">
                <div className="retro-label text-[#5b564a]">Execution</div>
                <div className="mt-2 text-[13px] capitalize text-[#171716]">
                  {executionResult ? executionResult.status : "Not run yet"}
                </div>
                {executionResult ? (
                  <div className="mt-2 text-[12px] text-[#444039]">
                    {executionResult.executedNodes.length} nodes executed
                  </div>
                ) : null}
              </div>

              {requestError ? (
                <div className="border-2 border-[#24211a] bg-[#d9a79d] p-3 text-[12px] leading-5 text-[#31120f] shadow-[inset_2px_2px_0_rgba(125,118,102,0.9),inset_-2px_-2px_0_rgba(246,241,222,0.9)]">
                  {requestError}
                </div>
              ) : null}
            </div>
          </div>

          {selectedNode ? (
            <div className="h-full overflow-y-auto p-4">
              <div className="mb-4 border-2 border-[#24211a] bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_38%),linear-gradient(180deg,#0f5759_0%,#08373a_100%)] px-3 py-3 text-[#f7f2df] shadow-[inset_1px_1px_0_rgba(255,255,255,0.2),inset_-1px_-1px_0_rgba(0,0,0,0.35)]">
                <div className="retro-label text-[#f2e7b8]">Selected node</div>
                <h2 className="retro-display mt-3 text-base font-semibold leading-6 text-[#fff8e8]">
                  {selectedNode.data.label || selectedNode.data.type}
                </h2>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#d8d08b]">{selectedNode.data.type}</p>
              </div>

              <button
                type="button"
                onClick={handleDeleteSelectedNode}
                className="mb-4 block w-full border-2 border-[#24211a] bg-[linear-gradient(180deg,#c96d5b_0%,#934034_100%)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fff5e8] shadow-[inset_2px_2px_0_rgba(255,255,255,0.18),inset_-2px_-2px_0_rgba(0,0,0,0.28)] transition hover:brightness-105 active:translate-x-px active:translate-y-px active:shadow-[inset_-2px_-2px_0_rgba(255,255,255,0.18),inset_2px_2px_0_rgba(0,0,0,0.28)]"
              >
                Delete node
              </button>

              {selectedNode.data.description ? (
                <div className="mb-4 border-2 border-[#24211a] bg-[#c8c0ab] p-3 text-sm leading-6 text-[#2d2a26] shadow-[inset_2px_2px_0_#7d7666,inset_-2px_-2px_0_#f6f1de]">
                  {selectedNode.data.description}
                </div>
              ) : null}

              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div className="border-2 border-[#24211a] bg-[#c8c0ab] p-3 shadow-[inset_2px_2px_0_#7d7666,inset_-2px_-2px_0_#f6f1de]">
                  <div className="retro-label text-[#5b564a]">Node ID</div>
                  <div className="mt-2 break-all text-[13px] text-[#171716]">{selectedNode.id}</div>
                </div>
                <div className="border-2 border-[#24211a] bg-[#c8c0ab] p-3 shadow-[inset_2px_2px_0_#7d7666,inset_-2px_-2px_0_#f6f1de]">
                  <div className="retro-label text-[#5b564a]">Position</div>
                  <div className="mt-2 text-[13px] text-[#171716]">
                    {Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)}
                  </div>
                </div>
              </div>

              <div>
                <div className="retro-label mb-2 text-[#5b564a]">Configuration</div>
                <pre className="overflow-x-auto border-2 border-[#24211a] bg-[#c8c0ab] p-3 text-xs leading-6 text-[#171716] shadow-[inset_2px_2px_0_#7d7666,inset_-2px_-2px_0_#f6f1de]">
                  {JSON.stringify(selectedNode.data, null, 2)}
                </pre>
              </div>

              {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) ? (
                <div className="mt-4">
                  <div className="retro-label mb-2 text-[#5b564a]">Validation feedback</div>
                  <div className="space-y-2">
                    {validationResult.errors
                      .filter((issue) => issue.nodeId === selectedNode.id)
                      .map((issue, index) => (
                        <div
                          key={`error-${index}`}
                          className="border-2 border-[#24211a] bg-[#d9a79d] p-3 text-[12px] leading-5 text-[#31120f] shadow-[inset_2px_2px_0_rgba(125,118,102,0.9),inset_-2px_-2px_0_rgba(246,241,222,0.9)]"
                        >
                          {issue.message}
                        </div>
                      ))}
                    {validationResult.warnings
                      .filter((issue) => issue.nodeId === selectedNode.id)
                      .map((issue, index) => (
                        <div
                          key={`warning-${index}`}
                          className="border-2 border-[#24211a] bg-[#e0cf9f] p-3 text-[12px] leading-5 text-[#43330d] shadow-[inset_2px_2px_0_rgba(125,118,102,0.9),inset_-2px_-2px_0_rgba(246,241,222,0.9)]"
                        >
                          {issue.message}
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="retro-badge">
                <span className="retro-badge-dot bg-[#2b62b7]" />
                Drag a block to begin
              </div>
              <div className="text-sm text-[#444039]">
                Select a block to inspect its agent configuration, app connection settings, tool actions, or delivery details.
              </div>
              {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) ? (
                <div className="w-full space-y-2 text-left">
                  {validationResult.errors.slice(0, 3).map((issue, index) => (
                    <div
                      key={`general-error-${index}`}
                      className="border-2 border-[#24211a] bg-[#d9a79d] p-3 text-[12px] leading-5 text-[#31120f] shadow-[inset_2px_2px_0_rgba(125,118,102,0.9),inset_-2px_-2px_0_rgba(246,241,222,0.9)]"
                    >
                      {issue.message}
                    </div>
                  ))}
                  {validationResult.warnings.slice(0, 2).map((issue, index) => (
                    <div
                      key={`general-warning-${index}`}
                      className="border-2 border-[#24211a] bg-[#e0cf9f] p-3 text-[12px] leading-5 text-[#43330d] shadow-[inset_2px_2px_0_rgba(125,118,102,0.9),inset_-2px_-2px_0_rgba(246,241,222,0.9)]"
                    >
                      {issue.message}
                    </div>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleClearCanvas}
                disabled={workflow.nodes.length === 0 || isValidating || isExecuting || isSaving}
                className="retro-button px-4 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear canvas
              </button>
            </div>
          )}
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
