import {
  ExecutionError,
  ExecutionResult,
  NodeError,
  NodeResult,
  ValidationResult,
  Workflow,
  WorkflowSummary,
} from "@/lib/types/workflow";

const WORKFLOW_API_BASE_PATH = "/api/v1/workflows";

type RequestFailurePayload = {
  detail?: string | { message?: string } | Array<{ msg?: string }>;
};

type ExecutionResultPayload = Omit<ExecutionResult, "startTime" | "endTime" | "errors" | "nodeResults"> & {
  startTime: string;
  endTime?: string;
  errors: Array<Omit<ExecutionError, "timestamp"> & { timestamp: string }>;
  nodeResults: Record<
    string,
    Omit<NodeResult, "startTime" | "endTime" | "error"> & {
      startTime: string;
      endTime?: string;
      error?: Omit<NodeError, "timestamp"> & { timestamp: string };
    }
  >;
};

type WorkflowPayload = Omit<Workflow, "metadata"> & {
  metadata: Omit<Workflow["metadata"], "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  };
};

type WorkflowSummaryPayload = Omit<WorkflowSummary, "updatedAt"> & {
  updatedAt: string;
};

async function postWorkflow<T>(path: string, workflow: Workflow): Promise<T> {
  const response = await fetch(`${WORKFLOW_API_BASE_PATH}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as RequestFailurePayload;

      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail.length > 0) {
        message = payload.detail.map((item) => item.msg ?? "Request failed").join(", ");
      } else if (hasMessageDetail(payload.detail)) {
        message = payload.detail.message;
      }
    } catch {
      // Keep the fallback error message when the response body is empty or invalid.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function getWorkflowData<T>(path: string): Promise<T> {
  const response = await fetch(`${WORKFLOW_API_BASE_PATH}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as RequestFailurePayload;

      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail.length > 0) {
        message = payload.detail.map((item) => item.msg ?? "Request failed").join(", ");
      } else if (hasMessageDetail(payload.detail)) {
        message = payload.detail.message;
      }
    } catch {
      // Keep fallback message when parsing fails.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

function hasMessageDetail(detail: RequestFailurePayload["detail"]): detail is { message: string } {
  return Boolean(
    detail &&
      !Array.isArray(detail) &&
      typeof detail === "object" &&
      typeof detail.message === "string"
  );
}

function normalizeNodeError(error: ExecutionResultPayload["nodeResults"][string]["error"]): NodeError | undefined {
  if (!error) {
    return undefined;
  }

  return {
    ...error,
    timestamp: new Date(error.timestamp),
  };
}

function normalizeExecutionResult(payload: ExecutionResultPayload): ExecutionResult {
  return {
    ...payload,
    startTime: new Date(payload.startTime),
    endTime: payload.endTime ? new Date(payload.endTime) : undefined,
    errors: payload.errors.map((error) => ({
      ...error,
      timestamp: new Date(error.timestamp),
    })),
    nodeResults: Object.fromEntries(
      Object.entries(payload.nodeResults).map(([nodeId, nodeResult]) => [
        nodeId,
        {
          ...nodeResult,
          startTime: new Date(nodeResult.startTime),
          endTime: nodeResult.endTime ? new Date(nodeResult.endTime) : undefined,
          error: normalizeNodeError(nodeResult.error),
        },
      ])
    ),
  };
}

function normalizeWorkflow(payload: WorkflowPayload): Workflow {
  return {
    ...payload,
    metadata: {
      ...payload.metadata,
      createdAt: new Date(payload.metadata.createdAt),
      updatedAt: new Date(payload.metadata.updatedAt),
    },
  };
}

function normalizeWorkflowSummary(payload: WorkflowSummaryPayload): WorkflowSummary {
  return {
    ...payload,
    updatedAt: new Date(payload.updatedAt),
  };
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  const payload = await getWorkflowData<WorkflowSummaryPayload[]>("");
  return payload.map(normalizeWorkflowSummary);
}

export async function loadWorkflow(workflowId: string): Promise<Workflow> {
  const payload = await getWorkflowData<WorkflowPayload>(`/${workflowId}`);
  return normalizeWorkflow(payload);
}

export async function saveWorkflow(workflow: Workflow): Promise<Workflow> {
  const payload = await postWorkflow<WorkflowPayload>("", workflow);
  return normalizeWorkflow(payload);
}

export async function validateWorkflow(workflow: Workflow): Promise<ValidationResult> {
  return postWorkflow<ValidationResult>("/validate", workflow);
}

export async function executeWorkflow(workflow: Workflow): Promise<ExecutionResult> {
  const payload = await postWorkflow<ExecutionResultPayload>("/execute", workflow);
  return normalizeExecutionResult(payload);
}
