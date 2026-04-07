from __future__ import annotations

import json
import re
from pathlib import Path

from fastapi import HTTPException, status

from app.models.workflow import Workflow, WorkflowSummary

_STORAGE_DIR = Path(__file__).resolve().parents[2] / "data" / "workflows"
_INVALID_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9_.-]+")


def list_workflows() -> list[WorkflowSummary]:
    workflows = [_read_workflow_file(path) for path in _workflow_files()]
    summaries = [
        WorkflowSummary(
            id=workflow.id,
            name=workflow.name,
            status=workflow.status,
            version=workflow.metadata.version,
            updated_at=workflow.metadata.updated_at,
            node_count=len(workflow.nodes),
            edge_count=len(workflow.edges),
        )
        for workflow in workflows
    ]
    return sorted(summaries, key=lambda summary: summary.updated_at, reverse=True)


def get_workflow(workflow_id: str) -> Workflow:
    path = _workflow_path(workflow_id)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{workflow_id}' was not found.",
        )
    return _read_workflow_file(path)


def save_workflow(workflow: Workflow) -> Workflow:
    _STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = _workflow_path(workflow.id)
    path.write_text(
        json.dumps(workflow.model_dump(mode="json", by_alias=True), indent=2),
        encoding="utf-8",
    )
    return workflow


def _workflow_files() -> list[Path]:
    if not _STORAGE_DIR.exists():
        return []
    return sorted(_STORAGE_DIR.glob("*.json"))


def _workflow_path(workflow_id: str) -> Path:
    safe_workflow_id = _INVALID_FILENAME_CHARS.sub("_", workflow_id).strip("._") or "workflow"
    return _STORAGE_DIR / f"{safe_workflow_id}.json"


def _read_workflow_file(path: Path) -> Workflow:
    return Workflow.model_validate_json(path.read_text(encoding="utf-8"))
