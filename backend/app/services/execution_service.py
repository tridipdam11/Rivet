from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.models.execution import (
    ErrorType,
    ExecutionError,
    ExecutionResult,
    ExecutionStatus,
    NodeExecutionStatus,
    NodeResult,
)
from app.models.workflow import Workflow
from app.services.workflow_validation import validate_workflow


def execute_workflow(workflow: Workflow) -> ExecutionResult:
    validation = validate_workflow(workflow)
    started_at = datetime.now(timezone.utc)
    execution_id = str(uuid4())

    if not validation.is_valid:
        return ExecutionResult(
            workflow_id=workflow.id,
            execution_id=execution_id,
            status=ExecutionStatus.ERROR,
            start_time=started_at,
            end_time=started_at,
            duration=0.0,
            executed_nodes=[],
            node_results={},
            errors=[
                ExecutionError(
                    id=str(uuid4()),
                    type=ErrorType.VALIDATION_ERROR,
                    message=error.message,
                    details={"field": error.field, "nodeId": error.node_id},
                    node_id=error.node_id,
                    timestamp=started_at,
                )
                for error in validation.errors
            ],
            output={"validation": validation.model_dump(by_alias=True)},
        )

    node_results = {
        node.id: NodeResult(
            node_id=node.id,
            status=NodeExecutionStatus.SUCCESS,
            start_time=started_at,
            end_time=started_at,
            duration=0.0,
            input={},
            output={"nodeType": node.data.type},
            retry_count=0,
        )
        for node in workflow.nodes
    }

    return ExecutionResult(
        workflow_id=workflow.id,
        execution_id=execution_id,
        status=ExecutionStatus.SUCCESS,
        start_time=started_at,
        end_time=started_at,
        duration=0.0,
        executed_nodes=[node.id for node in workflow.nodes],
        node_results=node_results,
        errors=[],
        output={
            "message": "Stub execution completed.",
            "nodeCount": len(workflow.nodes),
        },
        trigger_data={"triggers": len(workflow.triggers)},
    )
