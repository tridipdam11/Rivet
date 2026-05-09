from __future__ import annotations

import json
import subprocess
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import requests

from app.models.execution import (
    ErrorType,
    ExecutionError,
    ExecutionResult,
    ExecutionStatus,
    NodeError,
    NodeErrorType,
    NodeExecutionStatus,
    NodeResult,
)
from app.models.workflow import (
    AgentNodeData,
    ApprovalNodeData,
    CodeNodeData,
    DataMapperNodeData,
    IfNodeData,
    IntegrationNodeData,
    IteratorNodeData,
    KnowledgeNodeData,
    LoopNodeData,
    MemoryNodeData,
    MergeNodeData,
    NoOpNodeData,
    NodeType,
    OutputNodeData,
    PromptNodeData,
    StartNodeData,
    SwitchNodeData,
    ToolNodeData,
    ToolType,
    TriggerNodeData,
    WaitNodeData,
    Workflow,
    WorkflowEdge,
    WorkflowNode,
)
from app.services.llm_services import call_llm_provider
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

    node_map = {node.id: node for node in workflow.nodes}
    inbound_edges: dict[str, list[str]] = {node.id: [] for node in workflow.nodes}
    outbound_edges: dict[str, list[str]] = {node.id: [] for node in workflow.nodes}
    pending_dependencies: dict[str, int] = {node.id: 0 for node in workflow.nodes}

    for edge in workflow.edges:
        outbound_edges[edge.source].append(edge.target)
        inbound_edges[edge.target].append(edge.source)
        pending_dependencies[edge.target] += 1

    runnable = deque(
        sorted(node_id for node_id, dependency_count in pending_dependencies.items() if dependency_count == 0)
    )
    if not runnable and workflow.nodes:
        return _cycle_result(workflow, execution_id, started_at)

    node_results: dict[str, NodeResult] = {}
    executed_nodes: list[str] = []
    execution_errors: list[ExecutionError] = []
    node_outputs: dict[str, Any] = {}
    shared_data: dict[str, Any] = {
        "workflowId": workflow.id,
        "workflowName": workflow.name,
        "metadata": workflow.metadata.model_dump(mode="json", by_alias=True),
    }

    step_index = 0
    while runnable:
        node_id = runnable.popleft()
        node = node_map[node_id]
        node_input = _build_node_input(node, inbound_edges[node_id], node_outputs, shared_data)
        node_start = started_at + timedelta(milliseconds=step_index * 25)
        node_end = node_start + timedelta(milliseconds=10)

        try:
            output = _execute_node(node, node_input, shared_data, node_map, workflow.edges, outbound_edges, inbound_edges)
            node_results[node_id] = NodeResult(
                node_id=node_id,
                status=NodeExecutionStatus.SUCCESS,
                start_time=node_start,
                end_time=node_end,
                duration=(node_end - node_start).total_seconds(),
                input=node_input,
                output=output,
                retry_count=0,
            )
            node_outputs[node_id] = output
            executed_nodes.append(node_id)
        except Exception as exc:
            print(f"Node {node_id} failed: {str(exc)}")
            node_error = NodeError(
                type=NodeErrorType.DATA_TRANSFORMATION_FAILED,
                message=str(exc),
                details={"nodeType": node.data.type},
                timestamp=node_end,
            )
            node_results[node_id] = NodeResult(
                node_id=node_id,
                status=NodeExecutionStatus.ERROR,
                start_time=node_start,
                end_time=node_end,
                duration=(node_end - node_start).total_seconds(),
                input=node_input,
                output=None,
                error=node_error,
                retry_count=0,
            )
            execution_errors.append(
                ExecutionError(
                    id=str(uuid4()),
                    type=ErrorType.RUNTIME_ERROR,
                    message=str(exc),
                    details={"nodeType": node.data.type},
                    node_id=node_id,
                    timestamp=node_end,
                )
            )
            return _build_execution_result(
                workflow=workflow,
                execution_id=execution_id,
                started_at=started_at,
                ended_at=node_end,
                status=ExecutionStatus.ERROR,
                executed_nodes=executed_nodes,
                node_results=node_results,
                errors=execution_errors,
                node_outputs=node_outputs,
            )

        for target_id in outbound_edges[node_id]:
            pending_dependencies[target_id] -= 1
            if pending_dependencies[target_id] == 0:
                runnable.append(target_id)

        step_index += 1

    remaining_nodes = [node_id for node_id, dependency_count in pending_dependencies.items() if dependency_count > 0]
    if remaining_nodes:
        blocked_at = started_at + timedelta(milliseconds=step_index * 25)
        execution_errors.append(
            ExecutionError(
                id=str(uuid4()),
                type=ErrorType.WORKFLOW_ERROR,
                message="Workflow execution could not resolve all node dependencies.",
                details={"blockedNodes": remaining_nodes},
                timestamp=blocked_at,
            )
        )
        for node_id in remaining_nodes:
            node_results[node_id] = NodeResult(
                node_id=node_id,
                status=NodeExecutionStatus.SKIPPED,
                start_time=blocked_at,
                end_time=blocked_at,
                duration=0.0,
                input=_build_node_input(node_map[node_id], inbound_edges[node_id], node_outputs, shared_data),
                output=None,
                retry_count=0,
            )

        return _build_execution_result(
            workflow=workflow,
            execution_id=execution_id,
            started_at=started_at,
            ended_at=blocked_at,
            status=ExecutionStatus.ERROR,
            executed_nodes=executed_nodes,
            node_results=node_results,
            errors=execution_errors,
            node_outputs=node_outputs,
        )

    ended_at = started_at if not node_results else max(
        result.end_time or result.start_time for result in node_results.values()
    )
    return _build_execution_result(
        workflow=workflow,
        execution_id=execution_id,
        started_at=started_at,
        ended_at=ended_at,
        status=ExecutionStatus.SUCCESS,
        executed_nodes=executed_nodes,
        node_results=node_results,
        errors=execution_errors,
        node_outputs=node_outputs,
    )


def _cycle_result(workflow: Workflow, execution_id: str, started_at: datetime) -> ExecutionResult:
    error = ExecutionError(
        id=str(uuid4()),
        type=ErrorType.WORKFLOW_ERROR,
        message="Workflow has no executable starting node. Check for circular dependencies.",
        details={"nodeCount": len(workflow.nodes), "edgeCount": len(workflow.edges)},
        timestamp=started_at,
    )
    return ExecutionResult(
        workflow_id=workflow.id,
        execution_id=execution_id,
        status=ExecutionStatus.ERROR,
        start_time=started_at,
        end_time=started_at,
        duration=0.0,
        executed_nodes=[],
        node_results={},
        errors=[error],
        output={"message": error.message},
        trigger_data={"triggers": len(workflow.triggers)},
    )


def _build_execution_result(
    *,
    workflow: Workflow,
    execution_id: str,
    started_at: datetime,
    ended_at: datetime,
    status: ExecutionStatus,
    executed_nodes: list[str],
    node_results: dict[str, NodeResult],
    errors: list[ExecutionError],
    node_outputs: dict[str, Any],
) -> ExecutionResult:
    terminal_nodes = [
        node.id for node in workflow.nodes if not any(edge.source == node.id for edge in workflow.edges)
    ]
    final_outputs = {node_id: node_outputs[node_id] for node_id in terminal_nodes if node_id in node_outputs}

    return ExecutionResult(
        workflow_id=workflow.id,
        execution_id=execution_id,
        status=status,
        start_time=started_at,
        end_time=ended_at,
        duration=(ended_at - started_at).total_seconds(),
        executed_nodes=executed_nodes,
        node_results=node_results,
        errors=errors,
        output={
            "message": "Workflow execution completed." if status == ExecutionStatus.SUCCESS else "Workflow execution failed.",
            "workflowName": workflow.name,
            "executedNodeCount": len(executed_nodes),
            "terminalNodeOutputs": final_outputs,
            "nodeOutputs": node_outputs,
        },
        trigger_data={
            "triggers": len(workflow.triggers),
            "triggerNodes": [node.id for node in workflow.nodes if node.data.type == NodeType.TRIGGER],
        },
    )


def _build_node_input(
    node: WorkflowNode,
    upstream_node_ids: list[str],
    node_outputs: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    upstream_outputs = {node_id: node_outputs[node_id] for node_id in upstream_node_ids if node_id in node_outputs}
    return {
        "nodeId": node.id,
        "nodeType": node.data.type,
        "workflow": {
            "id": shared_data["workflowId"],
            "name": shared_data["workflowName"],
        },
        "upstream": upstream_outputs,
        "sharedData": shared_data,
    }


def _execute_node(
    node: WorkflowNode,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
    node_map: dict[str, WorkflowNode],
    edges: list[WorkflowEdge] | None = None,
    outbound_edges: dict[str, list[str]] | None = None,
    inbound_edges: dict[str, list[str]] | None = None,
) -> dict[str, Any]:
    data = node.data

    if data.type == NodeType.TRIGGER:
        return _execute_trigger_node(data, node_input, shared_data)
    if data.type == NodeType.START:
        return _execute_start_node(data, node_input, shared_data)
    if data.type == NodeType.IF:
        return _execute_if_node(data, node_input, shared_data)
    if data.type == NodeType.SWITCH:
        return _execute_switch_node(data, node_input, shared_data)
    if data.type == NodeType.MERGE:
        return _execute_merge_node(data, node_input, shared_data)
    if data.type == NodeType.WAIT:
        return _execute_wait_node(data, node_input, shared_data)
    if data.type == NodeType.NOOP:
        return _execute_noop_node(data, node_input, shared_data)
    if data.type == NodeType.ITERATOR:
        return _execute_iterator_node(data, node_input, shared_data)
    if data.type == NodeType.LOOP:
        return _execute_loop_node(data, node_input, shared_data, node_map, edges, outbound_edges, inbound_edges)
    if data.type == NodeType.CODE:
        return _execute_code_node(data, node_input, shared_data)
    if data.type == NodeType.DATA_MAPPER:
        return _execute_data_mapper_node(data, node_input, shared_data)
    if data.type == NodeType.KNOWLEDGE:
        return _execute_knowledge_node(data, node_input, shared_data)
    if data.type == NodeType.PROMPT:
        return _execute_prompt_node(data, node_input, shared_data)
    if data.type == NodeType.AGENT:
        return _execute_agent_node(data, node_input, shared_data, node_map)
    if data.type == NodeType.TOOL:
        return _execute_tool_node(data, node_input, shared_data)
    if data.type == NodeType.INTEGRATION:
        return _execute_integration_node(data, node_input, shared_data)
    if data.type == NodeType.MEMORY:
        return _execute_memory_node(data, node_input, shared_data)
    if data.type == NodeType.APPROVAL:
        return _execute_approval_node(data, node_input, shared_data)
    if data.type == NodeType.OUTPUT:
        return _execute_output_node(data, node_input, shared_data)

    raise ValueError(f"Unsupported node type '{data.type}'.")


def _execute_trigger_node(
    data: TriggerNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    payload = {
        "eventName": data.event_name,
        "triggerSource": data.trigger_source,
        "filters": [flt.model_dump(mode="json", by_alias=True) for flt in data.filters],
        "receivedAt": datetime.now(timezone.utc).isoformat(),
    }
    shared_data["trigger"] = payload
    return {
        "label": data.label,
        "description": data.description,
        "payload": payload,
        "upstreamCount": len(node_input["upstream"]),
    }


def _execute_start_node(
    data: StartNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    result = {
        "entryLabel": data.entry_label,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "upstreamCount": len(node_input["upstream"]),
    }
    shared_data["start"] = result
    return result


def _execute_if_node(
    data: IfNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    result = {
        "condition": data.condition,
        "trueLabel": data.true_label,
        "falseLabel": data.false_label,
        "selectedBranch": data.true_label,
    }
    shared_data["lastBranch"] = result
    return result


def _execute_switch_node(
    data: SwitchNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    selected_case = data.cases[0] if data.cases else data.default_case
    result = {
        "expression": data.expression,
        "cases": data.cases,
        "defaultCase": data.default_case,
        "selectedCase": selected_case,
    }
    shared_data["lastSwitch"] = result
    return result


def _execute_merge_node(
    data: MergeNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    result = {
        "mergeStrategy": data.merge_strategy,
        "mergedNodeIds": list(node_input["upstream"].keys()),
        "mergedCount": len(node_input["upstream"]),
    }
    shared_data["lastMerge"] = result
    return result


def _execute_wait_node(
    data: WaitNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    result = {
        "delayAmount": data.delay_amount,
        "delayUnit": data.delay_unit,
        "status": "scheduled",
    }
    shared_data["wait"] = result
    return result


def _execute_noop_node(
    data: NoOpNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    return {
        "note": data.note,
        "status": "passed_through",
        "upstreamKeys": list(node_input["upstream"].keys()),
    }


def _execute_iterator_node(
    data: IteratorNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    items = _resolve_path(data.list_path, node_input, shared_data)
    if items is None and not data.list_path:
        items = _first_list_value(node_input["upstream"].values())
    if not isinstance(items, list):
        raise ValueError(f"Iterator list path '{data.list_path}' did not resolve to a list.")
    if len(items) > data.max_items:
        raise ValueError(f"Iterator received {len(items)} items, exceeding maxItems {data.max_items}.")

    iterations = [
        {
            data.index_key: index,
            data.item_key: item,
        }
        for index, item in enumerate(items)
    ]
    shared_data[data.output_key] = items
    shared_data["iterator"] = {
        "itemKey": data.item_key,
        "indexKey": data.index_key,
        "outputKey": data.output_key,
        "count": len(items),
    }
    if items:
        shared_data[data.item_key] = items[-1]
        shared_data[data.index_key] = len(items) - 1

    return {
        "listPath": data.list_path,
        "itemKey": data.item_key,
        "indexKey": data.index_key,
        "outputKey": data.output_key,
        "count": len(items),
        "items": items,
        "iterations": iterations,
    }


def _execute_loop_node(
    data: LoopNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
    node_map: dict[str, WorkflowNode],
    edges: list[WorkflowEdge] | None = None,
    outbound_edges: dict[str, list[str]] | None = None,
    inbound_edges: dict[str, list[str]] | None = None,
) -> dict[str, Any]:
    items = _resolve_path(data.list_path, node_input, shared_data)
    if items is None and not data.list_path:
        items = _first_list_value(node_input["upstream"].values())

    if items is None:
        items = []

    if not isinstance(items, list):
        raise ValueError(f"Loop list path '{data.list_path}' did not resolve to a list.")

    if len(items) > data.max_items:
        raise ValueError(f"Loop received {len(items)} items, exceeding maxItems {data.max_items}.")

    results = []
    for index, item in enumerate(items):
        shared_data[data.item_key] = item
        shared_data[data.index_key] = index

        iteration_outputs: dict[str, Any] = {}
        for body_node_id in data.loop_body_node_ids:
            if body_node_id not in node_map:
                continue

            body_node = node_map[body_node_id]
            body_inbound = inbound_edges.get(body_node_id, []) if inbound_edges else []
            body_node_input = _build_node_input(body_node, body_inbound, iteration_outputs, shared_data)

            output = _execute_node(
                body_node,
                body_node_input,
                shared_data,
                node_map,
                edges=edges,
                outbound_edges=outbound_edges,
                inbound_edges=inbound_edges,
            )
            iteration_outputs[body_node_id] = output

        if data.loop_output_node_id and data.loop_output_node_id in iteration_outputs:
            results.append(iteration_outputs[data.loop_output_node_id])
        else:
            results.append(iteration_outputs)

    shared_data[data.output_key] = results
    return {
        "listPath": data.list_path,
        "itemKey": data.item_key,
        "indexKey": data.index_key,
        "outputKey": data.output_key,
        "count": len(items),
        "results": results,
    }


def _execute_code_node(
    data: CodeNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    if data.language == "python":
        result = _execute_python_snippet(data.code, node_input, shared_data)
    elif data.language == "javascript":
        result = _execute_javascript_snippet(data.code, node_input, shared_data)
    else:
        raise ValueError(f"Unsupported script language '{data.language}'.")

    shared_data[data.output_key] = result
    return {
        "language": data.language,
        "outputKey": data.output_key,
        "result": result,
    }


def _execute_data_mapper_node(
    data: DataMapperNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    if data.mode == "set":
        if not data.variable_key:
            raise ValueError("Data mapper set mode requires variableKey.")
        value = data.value if data.source_path is None else _resolve_path(data.source_path, node_input, shared_data)
        shared_data[data.variable_key] = value
        return {
            "mode": data.mode,
            "variableKey": data.variable_key,
            "value": value,
        }

    mapped: dict[str, Any] = {}
    for mapping in data.mappings:
        value = _resolve_path(mapping.source, node_input, shared_data)
        if value is None:
            value = mapping.default
        _assign_path(mapped, mapping.target, value)

    shared_data.setdefault("mappedData", {}).update(mapped)
    return {
        "mode": data.mode,
        "mapped": mapped,
    }


def _execute_knowledge_node(
    data: KnowledgeNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    documents = [
        {
            "source": data.source_name,
            "mode": data.retrieval_mode,
            "snippet": f"Retrieved context for {shared_data['workflowName']}.",
        }
    ]
    result = {
        "sourceType": data.source_type,
        "sourceName": data.source_name,
        "topK": data.top_k,
        "documents": documents,
    }
    shared_data.setdefault("knowledge", []).append(result)
    return result


def _execute_prompt_node(
    data: PromptNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    compiled_inputs = {
        variable: _resolve_input_variable(variable, node_input["upstream"], shared_data)
        for variable in data.input_variables
    }
    rendered_prompt = data.prompt_template.format(
        **{key: value if not isinstance(value, (dict, list)) else str(value) for key, value in compiled_inputs.items()}
    )
    shared_data[data.output_key] = rendered_prompt
    return {
        "outputKey": data.output_key,
        "inputVariables": compiled_inputs,
        "renderedPrompt": rendered_prompt,
    }


def _execute_agent_node(
    data: AgentNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
    node_map: dict[str, WorkflowNode]
) -> dict[str, Any]:
    prompt_context = _first_matching_value(node_input["upstream"].values(), "renderedPrompt")
    knowledge_context = _collect_field_values(node_input["upstream"].values(), "documents")
    
    # 1. Build Tool Manifest (OpenAI format)
    available_tools = []
    for tool_id in data.allowed_tools:
        if tool_id in node_map:
            tool_node = node_map[tool_id]
            if tool_node.data.type == NodeType.TOOL:
                t_data = tool_node.data
                available_tools.append({
                    "type": "function",
                    "function": {
                        "name": t_data.action,
                        "description": t_data.description or f"Executes tool: {t_data.action}",
                        "parameters": t_data.parameters_schema or {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    }
                })

    # Construct conversation history
    messages = [
       {"role": "system", "content": f"{data.system_prompt}\n\nContext: {knowledge_context}"},
       {"role": "user", "content": prompt_context}  
    ]

    # 2. Call LLM with the Manifest
    provider = "openai" if data.model and (data.model.startswith("gpt") or data.model.startswith("o1")) else "gemini"

    response = call_llm_provider(
        provider=provider,
        model=data.model or "gemini-2.5-flash",
        messages=messages,
        tools=available_tools if available_tools else None,
        temperature=data.temperature,
    )

    decision = {
        "role": data.role,
        "model": data.model,
        "content": response.content,
        "toolCalls": response.tool_calls,
        "usage": response.usage,
        "systemPrompt": data.system_prompt,
        "maxSteps": data.max_steps,
        "usedPrompt": prompt_context,
        "knowledgeHits": len(knowledge_context),
        "allowedTools": data.allowed_tools,
        "decision": "proceed_with_tools" if response.tool_calls else "respond_directly",
    }
    
    shared_data["agentDecision"] = decision
    # Also expose the content directly for prompt nodes or output nodes
    shared_data["lastAgentResponse"] = response.content
    
    return decision


def _execute_tool_node(
    data: ToolNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    agent_decision = shared_data.get("agentDecision", {})
    tool_calls = agent_decision.get("toolCalls", [])

    args = {}
    if tool_calls:
        args = json.loads(tool_calls[0].get("function", {}).get("arguments", "{}"))

    result_data = None
    status = "success"
    
    try: 
        if data.tool_type == ToolType.HTTP:
            endpoint_url = data.endpoint
            if not endpoint_url:
                raise ValueError(f"HTTP tool '{data.action}' requires an endpoint URL.")
            
            response = requests.request(
                method="POST", 
                url=endpoint_url,
                json=args or node_input.get("upstream"),
                timeout=(data.timeout_ms or 5000) / 1000.0
            )
            response.raise_for_status()
            result_data = response.json()
        
        elif data.tool_type == ToolType.FUNCTION:
            result_data = {"message": f"Simulated function call: {data.action}"}

        else:
            raise ValueError(f"Unsupported tool type: {data.tool_type}")
        
    except Exception as e:
        status = "error"
        result_data = {"error": str(e)}

    result = {
        "toolType": data.tool_type,
        "action": data.action,
        "status": status,
        "result": f"Executed {data.action} against configured tool.",
    }
    shared_data.setdefault("toolResults", []).append(result)
    shared_data["lastToolResult"] = result_data

    return result


def _execute_integration_node(
    data: IntegrationNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    upstream_summary = list(node_input["upstream"].keys())
    result = {
        "appType": data.app_type,
        "appName": data.app_name,
        "action": data.action,
        "authStatus": data.auth_status,
        "mappedFields": data.mapped_fields,
        "consumedFrom": upstream_summary,
        "status": "synced",
    }
    shared_data.setdefault("integrations", []).append(result)
    return result


def _execute_memory_node(
    data: MemoryNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    memory_entry = {
        "scope": data.memory_scope,
        "strategy": data.strategy,
        "maxItems": data.max_items,
        "snapshot": {
            "agentDecision": shared_data.get("agentDecision"),
            "upstreamNodeIds": list(node_input["upstream"].keys()),
        },
    }
    shared_data.setdefault("memory", []).append(memory_entry)
    return memory_entry


def _execute_approval_node(
    data: ApprovalNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    approval = {
        "approverType": data.approver_type,
        "instructions": data.instructions,
        "timeoutMinutes": data.timeout_minutes,
        "status": "approved",
        "reason": "Auto-approved by backend simulation.",
        "dependentNodes": list(node_input["upstream"].keys()),
    }
    shared_data["approval"] = approval
    return approval


def _execute_output_node(
    data: OutputNodeData,
    node_input: dict[str, Any],
    shared_data: dict[str, Any],
) -> dict[str, Any]:
    approval_state = shared_data.get("approval", {})
    result = {
        "outputType": data.output_type,
        "destination": data.destination,
        "format": data.format,
        "approved": approval_state.get("status") == "approved" if approval_state else True,
        "content": {
            "agentDecision": shared_data.get("agentDecision"),
            "toolResults": shared_data.get("toolResults", []),
            "integrations": shared_data.get("integrations", []),
        },
    }
    shared_data.setdefault("deliveries", []).append(result)
    return result


def _resolve_input_variable(variable: str, upstream: dict[str, Any], shared_data: dict[str, Any]) -> Any:
    if variable in shared_data:
        return shared_data[variable]

    for payload in upstream.values():
        if isinstance(payload, dict) and variable in payload:
            return payload[variable]

    return f"<missing:{variable}>"


def _resolve_path(path: str, node_input: dict[str, Any], shared_data: dict[str, Any]) -> Any:
    if not path:
        return None

    roots = {
        "input": node_input,
        "upstream": node_input["upstream"],
        "sharedData": shared_data,
        "shared": shared_data,
    }
    head, *tail = path.split(".")
    if head in roots:
        return _read_path(roots[head], tail)
    if path in shared_data:
        return shared_data[path]

    upstream_value = _read_path(node_input["upstream"], path.split("."))
    if upstream_value is not None:
        return upstream_value
    return _read_path(shared_data, path.split("."))


def _read_path(value: Any, parts: list[str]) -> Any:
    current = value
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit():
            index = int(part)
            current = current[index] if index < len(current) else None
        else:
            return None
        if current is None:
            return None
    return current


def _assign_path(target: dict[str, Any], path: str, value: Any) -> None:
    parts = [part for part in path.split(".") if part]
    if not parts:
        return

    current = target
    for part in parts[:-1]:
        child = current.get(part)
        if not isinstance(child, dict):
            child = {}
            current[part] = child
        current = child
    current[parts[-1]] = value


def _execute_python_snippet(code: str, node_input: dict[str, Any], shared_data: dict[str, Any]) -> Any:
    namespace = {
        "input": node_input,
        "upstream": node_input["upstream"],
        "sharedData": shared_data,
        "shared": shared_data,
        "result": None,
    }
    safe_builtins = {
        "abs": abs,
        "bool": bool,
        "dict": dict,
        "float": float,
        "int": int,
        "len": len,
        "list": list,
        "max": max,
        "min": min,
        "round": round,
        "str": str,
        "sum": sum,
    }
    exec(code, {"__builtins__": safe_builtins}, namespace)
    return namespace.get("result")


def _execute_javascript_snippet(code: str, node_input: dict[str, Any], shared_data: dict[str, Any]) -> Any:
    wrapper = """
const fs = require('fs');
const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const input = payload.input;
const upstream = input.upstream;
const sharedData = payload.sharedData;
let result;
Promise.resolve((async () => {
  %s
  return result;
})()).then((value) => {
  process.stdout.write(JSON.stringify(value === undefined ? null : value));
}).catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});
""" % "\n  ".join(code.splitlines())
    completed = subprocess.run(
        ["node", "-e", wrapper],
        input=json.dumps({"input": node_input, "sharedData": shared_data}),
        capture_output=True,
        text=True,
        timeout=2,
        check=False,
    )
    if completed.returncode != 0:
        raise ValueError(completed.stderr.strip() or "JavaScript snippet failed.")
    return json.loads(completed.stdout or "null")


def _first_list_value(values: Any) -> list[Any] | None:
    for value in values:
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            for nested in value.values():
                if isinstance(nested, list):
                    return nested
    return None


def _first_matching_value(values: Any, key: str) -> Any:
    for value in values:
        if isinstance(value, dict) and key in value:
            return value[key]
    return None


def _collect_field_values(values: Any, key: str) -> list[Any]:
    collected: list[Any] = []
    for value in values:
        if isinstance(value, dict) and key in value:
            field_value = value[key]
            if isinstance(field_value, list):
                collected.extend(field_value)
            else:
                collected.append(field_value)
    return collected
