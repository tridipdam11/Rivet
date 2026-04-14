from __future__ import annotations

from app.models.execution import ValidationError, ValidationResult, ValidationType, ValidationWarning
from app.models.workflow import NodeType, Workflow


def validate_workflow(workflow: Workflow) -> ValidationResult:
    errors: list[ValidationError] = []
    warnings: list[ValidationWarning] = []

    node_ids = [node.id for node in workflow.nodes]
    node_id_set = set(node_ids)

    if not workflow.nodes:
        errors.append(
            ValidationError(
                type=ValidationType.REQUIRED_FIELD_MISSING,
                message="Workflow must contain at least one node.",
                field="nodes",
            )
        )

    if len(node_id_set) != len(node_ids):
        errors.append(
            ValidationError(
                type=ValidationType.CONFIGURATION_CONFLICT,
                message="Workflow contains duplicate node ids.",
                field="nodes",
            )
        )

    for edge in workflow.edges:
        if edge.source not in node_id_set:
            errors.append(
                ValidationError(
                    type=ValidationType.INVALID_CONNECTION,
                    message=f"Edge source '{edge.source}' does not exist.",
                    field="edges",
                )
            )
        if edge.target not in node_id_set:
            errors.append(
                ValidationError(
                    type=ValidationType.INVALID_CONNECTION,
                    message=f"Edge target '{edge.target}' does not exist.",
                    field="edges",
                )
            )

    inbound_targets = {edge.target for edge in workflow.edges}
    for node in workflow.nodes:
        if node.data.type in {NodeType.TRIGGER, NodeType.START}:
            continue
        if node.id not in inbound_targets:
            warnings.append(
                ValidationWarning(
                    type=ValidationType.ORPHANED_NODE,
                    message="Node has no incoming connection.",
                    node_id=node.id,
                )
            )

    return ValidationResult(is_valid=not errors, errors=errors, warnings=warnings)
