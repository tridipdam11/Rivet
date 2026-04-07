from __future__ import annotations

import unittest
from pathlib import Path
import shutil
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


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


class WorkflowApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.storage_dir = Path("d:/vscode/Projects/rivet/test/.tmp/workflow-store") / self._testMethodName
        if self.storage_dir.exists():
            shutil.rmtree(self.storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        patcher = patch("app.services.workflow_store._STORAGE_DIR", self.storage_dir)
        self.addCleanup(patcher.stop)
        self.addCleanup(self._cleanup_storage_dir)
        patcher.start()

    def _cleanup_storage_dir(self) -> None:
        if self.storage_dir.exists():
            shutil.rmtree(self.storage_dir, ignore_errors=True)

    def test_save_and_load_workflow(self) -> None:
        payload = build_workflow_payload()

        save_response = self.client.post("/api/v1/workflows", json=payload)
        self.assertEqual(save_response.status_code, 200)
        self.assertEqual(save_response.json()["id"], payload["id"])

        list_response = self.client.get("/api/v1/workflows")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)
        self.assertEqual(list_response.json()[0]["nodeCount"], 3)

        load_response = self.client.get(f"/api/v1/workflows/{payload['id']}")
        self.assertEqual(load_response.status_code, 200)
        self.assertEqual(load_response.json()["metadata"]["name"], payload["metadata"]["name"])

    def test_execute_route_processes_workflow(self) -> None:
        payload = build_workflow_payload()

        response = self.client.post("/api/v1/workflows/execute", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "success")
        self.assertEqual(body["executedNodes"], ["trigger-inbound", "prompt-brief", "output-reply"])
        self.assertIn("nodeOutputs", body["output"])
        self.assertIn("output-reply", body["output"]["terminalNodeOutputs"])

    def test_execute_route_returns_validation_errors(self) -> None:
        payload = build_workflow_payload()
        payload["nodes"] = []

        response = self.client.post("/api/v1/workflows/execute", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["errors"][0]["type"], "validation_error")


if __name__ == "__main__":
    unittest.main()
