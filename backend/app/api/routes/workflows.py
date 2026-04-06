from fastapi import APIRouter

from app.models.execution import ExecutionResult, ValidationResult
from app.models.workflow import Workflow
from app.services.execution_service import execute_workflow
from app.services.workflow_validation import validate_workflow

router = APIRouter()


@router.post("/validate", response_model=ValidationResult)
def validate_workflow_route(workflow: Workflow) -> ValidationResult:
    return validate_workflow(workflow)


@router.post("/execute", response_model=ExecutionResult)
def execute_workflow_route(workflow: Workflow) -> ExecutionResult:
    return execute_workflow(workflow)
