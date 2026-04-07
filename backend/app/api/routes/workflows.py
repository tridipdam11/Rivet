from fastapi import APIRouter

from app.models.execution import ExecutionResult, ValidationResult
from app.models.workflow import Workflow, WorkflowSummary
from app.services.execution_service import execute_workflow
from app.services.workflow_store import get_workflow, list_workflows, save_workflow
from app.services.workflow_validation import validate_workflow

router = APIRouter()


@router.get("", response_model=list[WorkflowSummary])
def list_workflows_route() -> list[WorkflowSummary]:
    return list_workflows()


@router.get("/{workflow_id}", response_model=Workflow)
def get_workflow_route(workflow_id: str) -> Workflow:
    return get_workflow(workflow_id)


@router.post("", response_model=Workflow)
def save_workflow_route(workflow: Workflow) -> Workflow:
    return save_workflow(workflow)


@router.post("/validate", response_model=ValidationResult)
def validate_workflow_route(workflow: Workflow) -> ValidationResult:
    return validate_workflow(workflow)


@router.post("/execute", response_model=ExecutionResult)
def execute_workflow_route(workflow: Workflow) -> ExecutionResult:
    return execute_workflow(workflow)
