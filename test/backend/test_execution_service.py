from __future__ import annotations

import unittest
from unittest.mock import patch

from app.models.workflow import Workflow
from app.services.execution_service import execute_workflow
from app.services.llm_services import LLMResponse


def build_workflow_payload() -> dict:
    timestamp = "2026-04-07T10:00:00Z"
    return {
        "id": "support-agent-workflow",
        "name": "Support Agent Workflow",
        "nodes": [
            {
                "id": "trigger-inbound",
                "position": {"x": 80, "y": 220},
                "data": {
                    "type": "trigger",
                    "config": {"isValid": True, "errors": []},
                    "label": "Inbound request",
                    "description": "Starts when a new support conversation arrives.",
                    "triggerSource": "chat",
                    "eventName": "new.customer.message",
                    "filters": [],
                },
            },
            {
                "id": "prompt-brief",
                "position": {"x": 360, "y": 330},
                "data": {
                    "type": "prompt",
                    "config": {"isValid": True, "errors": []},
                    "label": "Prompt brief",
                    "description": "Builds the structured brief for the support agent.",
                    "promptTemplate": "Summarize {customer_message}",
                    "inputVariables": ["customer_message"],
                    "outputKey": "agent_brief",
                },
            },
            {
                "id": "output-reply",
                "position": {"x": 660, "y": 220},
                "data": {
                    "type": "output",
                    "config": {"isValid": True, "errors": []},
                    "label": "Customer reply",
                    "description": "Delivers the final response back into the support channel.",
                    "outputType": "chat",
                    "destination": "customer-reply",
                    "format": "markdown",
                },
            },
        ],
        "edges": [
            {"id": "edge-trigger-prompt", "source": "trigger-inbound", "target": "prompt-brief", "sourceHandle": None, "targetHandle": None, "type": "smoothstep"},
            {"id": "edge-prompt-output", "source": "prompt-brief", "target": "output-reply", "sourceHandle": None, "targetHandle": None, "type": "smoothstep"},
        ],
        "metadata": {
            "name": "Support Agent Workflow",
            "description": "Support workflow",
            "version": 1,
            "createdAt": timestamp,
            "updatedAt": timestamp,
            "createdBy": "system",
            "tags": ["support"],
        },
        "status": "draft",
        "triggers": [],
    }


class ExecutionServiceTests(unittest.TestCase):
    def test_execute_workflow_builds_terminal_output(self) -> None:
        workflow = Workflow.model_validate(build_workflow_payload())

        result = execute_workflow(workflow)

        self.assertEqual(result.status, "success")
        self.assertIn("output-reply", result.output["terminalNodeOutputs"])
        self.assertEqual(result.node_results["prompt-brief"].status, "success")

    def test_execute_workflow_detects_cycles(self) -> None:
        payload = build_workflow_payload()
        payload["edges"] = [
            {"id": "edge-trigger-prompt", "source": "trigger-inbound", "target": "prompt-brief", "sourceHandle": None, "targetHandle": None, "type": "smoothstep"},
            {"id": "edge-prompt-trigger", "source": "prompt-brief", "target": "trigger-inbound", "sourceHandle": None, "targetHandle": None, "type": "smoothstep"},
        ]
        workflow = Workflow.model_validate(payload)

        result = execute_workflow(workflow)

        self.assertEqual(result.status, "error")
        self.assertEqual(result.errors[0].type, "workflow_error")

    def test_execute_workflow_runs_iterator_code_and_mapper_nodes(self) -> None:
        payload = build_workflow_payload()
        payload["nodes"] = [
            {
                "id": "trigger-inbound",
                "position": {"x": 80, "y": 220},
                "data": {
                    "type": "trigger",
                    "config": {"isValid": True, "errors": []},
                    "label": "Inbound request",
                    "triggerSource": "chat",
                    "eventName": "new.customer.message",
                    "filters": [],
                },
            },
            {
                "id": "set-items",
                "position": {"x": 220, "y": 220},
                "data": {
                    "type": "data_mapper",
                    "config": {"isValid": True, "errors": []},
                    "label": "Set items",
                    "mode": "set",
                    "variableKey": "prices",
                    "value": [10, 20, 30],
                    "mappings": [],
                },
            },
            {
                "id": "iterate-prices",
                "position": {"x": 360, "y": 220},
                "data": {
                    "type": "iterator",
                    "config": {"isValid": True, "errors": []},
                    "label": "Iterate prices",
                    "listPath": "sharedData.prices",
                    "itemKey": "price",
                    "indexKey": "priceIndex",
                    "outputKey": "iteratedPrices",
                    "maxItems": 10,
                },
            },
            {
                "id": "markup-price",
                "position": {"x": 500, "y": 220},
                "data": {
                    "type": "code",
                    "config": {"isValid": True, "errors": []},
                    "label": "Markup price",
                    "language": "python",
                    "code": "result = sharedData['price'] * 1.2 + 5",
                    "outputKey": "totalPrice",
                },
            },
            {
                "id": "map-output",
                "position": {"x": 640, "y": 220},
                "data": {
                    "type": "data_mapper",
                    "config": {"isValid": True, "errors": []},
                    "label": "Map output",
                    "mode": "map",
                    "mappings": [
                        {"source": "sharedData.totalPrice", "target": "invoice.total"},
                        {"source": "sharedData.priceIndex", "target": "invoice.lastIndex"},
                    ],
                },
            },
        ]
        payload["edges"] = [
            {"id": "edge-trigger-set", "source": "trigger-inbound", "target": "set-items", "type": "smoothstep"},
            {"id": "edge-set-iterate", "source": "set-items", "target": "iterate-prices", "type": "smoothstep"},
            {"id": "edge-iterate-code", "source": "iterate-prices", "target": "markup-price", "type": "smoothstep"},
            {"id": "edge-code-map", "source": "markup-price", "target": "map-output", "type": "smoothstep"},
        ]
        workflow = Workflow.model_validate(payload)

        result = execute_workflow(workflow)

        self.assertEqual(result.status, "success")
        self.assertEqual(result.node_results["iterate-prices"].output["count"], 3)
        self.assertEqual(result.node_results["markup-price"].output["result"], 41.0)
        self.assertEqual(result.node_results["map-output"].output["mapped"]["invoice"]["total"], 41.0)

    @patch("app.services.execution_service.call_llm_provider")
    def test_execute_workflow_with_agent_node(self, mock_call_llm) -> None:
        mock_call_llm.return_value = LLMResponse(
            content="Hello! I am your AI assistant.",
            tool_calls=[],
            usage={"total_tokens": 10},
            raw_response={}
        )

        payload = build_workflow_payload()
        payload["nodes"] = [
            {
                "id": "trigger-inbound",
                "position": {"x": 80, "y": 220},
                "data": {
                    "type": "trigger",
                    "config": {"isValid": True, "errors": []},
                    "label": "Inbound request",
                    "triggerSource": "chat",
                    "eventName": "new.customer.message",
                    "filters": [],
                },
            },
            {
                "id": "prompt-brief",
                "position": {"x": 360, "y": 330},
                "data": {
                    "type": "prompt",
                    "config": {"isValid": True, "errors": []},
                    "label": "Prompt brief",
                    "promptTemplate": "Analyze: {customer_message}",
                    "inputVariables": ["customer_message"],
                    "outputKey": "renderedPrompt",
                },
            },
            {
                "id": "agent-solver",
                "position": {"x": 600, "y": 330},
                "data": {
                    "type": "agent",
                    "config": {"isValid": True, "errors": []},
                    "label": "AI Agent",
                    "role": "support-agent",
                    "model": "gpt-4o",
                    "system_prompt": "You are a helpful assistant.",
                    "temperature": 0.7,
                    "max_steps": 5,
                    "allowed_tools": [],
                },
            },
        ]
        payload["edges"] = [
            {"id": "e1", "source": "trigger-inbound", "target": "prompt-brief"},
            {"id": "e2", "source": "prompt-brief", "target": "agent-solver"},
        ]
        workflow = Workflow.model_validate(payload)

        result = execute_workflow(workflow)

        self.assertEqual(result.status, "success")
        self.assertIn("agent-solver", result.node_results)
        self.assertEqual(result.node_results["agent-solver"].output["content"], "Hello! I am your AI assistant.")

        # Verify call_llm_provider was called with correct parameters
        mock_call_llm.assert_called_once()
        args, kwargs = mock_call_llm.call_args
        self.assertEqual(kwargs["model"], "gpt-4o")
        self.assertEqual(kwargs["temperature"], 0.7)


if __name__ == "__main__":
    unittest.main()
