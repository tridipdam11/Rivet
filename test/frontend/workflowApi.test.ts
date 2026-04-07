import {
  executeWorkflow,
  listWorkflows,
  loadWorkflow,
  saveWorkflow,
} from "../../frontend/lib/services/workflowApi";
import { ExecutionStatus, NodeExecutionStatus, WorkflowStatus } from "../../frontend/lib/types/workflow";

const fetchMock = jest.fn();

global.fetch = fetchMock as unknown as typeof fetch;

const workflow = {
  id: "support-agent-workflow",
  name: "Support Agent Workflow",
  nodes: [],
  edges: [],
  metadata: {
    name: "Support Agent Workflow",
    description: "Support workflow",
    version: 1,
    createdAt: new Date("2026-04-07T00:00:00.000Z"),
    updatedAt: new Date("2026-04-07T01:00:00.000Z"),
    createdBy: "system",
    tags: ["support"],
  },
  status: WorkflowStatus.DRAFT,
  triggers: [],
};

describe("workflowApi", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("loads workflow summaries and normalizes updatedAt", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "support-agent-workflow",
          name: "Support Agent Workflow",
          status: "draft",
          version: 3,
          updatedAt: "2026-04-07T05:00:00.000Z",
          nodeCount: 4,
          edgeCount: 3,
        },
      ],
    });

    const result = await listWorkflows();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/workflows", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    expect(result[0].updatedAt).toBeInstanceOf(Date);
    expect(result[0].nodeCount).toBe(4);
  });

  it("loads a workflow and normalizes metadata dates", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...workflow,
        metadata: {
          ...workflow.metadata,
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T01:00:00.000Z",
        },
      }),
    });

    const result = await loadWorkflow("support-agent-workflow");

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/workflows/support-agent-workflow", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    expect(result.metadata.createdAt).toBeInstanceOf(Date);
    expect(result.metadata.updatedAt).toBeInstanceOf(Date);
  });

  it("saves a workflow with POST and normalizes the response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...workflow,
        metadata: {
          ...workflow.metadata,
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T01:00:00.000Z",
        },
      }),
    });

    const result = await saveWorkflow(workflow);

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
    expect(result.metadata.updatedAt).toBeInstanceOf(Date);
  });

  it("normalizes execution timestamps returned by the API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        workflowId: workflow.id,
        executionId: "exec-123",
        status: ExecutionStatus.SUCCESS,
        startTime: "2026-04-07T02:00:00.000Z",
        endTime: "2026-04-07T02:00:01.000Z",
        duration: 1,
        executedNodes: ["trigger-1"],
        nodeResults: {
          "trigger-1": {
            nodeId: "trigger-1",
            status: NodeExecutionStatus.SUCCESS,
            startTime: "2026-04-07T02:00:00.000Z",
            endTime: "2026-04-07T02:00:00.500Z",
            duration: 0.5,
            input: {},
            output: { payload: true },
            retryCount: 0,
          },
        },
        errors: [],
        output: { message: "ok" },
        triggerData: { triggers: 1 },
      }),
    });

    const result = await executeWorkflow(workflow);

    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
    expect(result.nodeResults["trigger-1"].startTime).toBeInstanceOf(Date);
    expect(result.status).toBe(ExecutionStatus.SUCCESS);
  });

  it("surfaces API error details", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        detail: "Workflow not found.",
      }),
    });

    await expect(loadWorkflow("missing")).rejects.toThrow("Workflow not found.");
  });
});
