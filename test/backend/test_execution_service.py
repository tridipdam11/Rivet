from __future__ import annotations

import unittest

from app.models.workflow import Workflow
from app.services.execution_service import execute_workflow


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


if __name__ == "__main__":
    unittest.main()
