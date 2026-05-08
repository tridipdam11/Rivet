import type { IconType } from "react-icons";
import {
  FaBolt,
  FaBook,
  FaClock,
  FaCode,
  FaCodeBranch,
  FaCodeMerge,
  FaDatabase,
  FaListOl,
  FaMinus,
  FaPaperPlane,
  FaPlug,
  FaRobot,
  FaShuffle,
  FaUserCheck,
  FaWrench,
} from "react-icons/fa6";
import { LuBetweenHorizontalStart, LuMessageSquareQuote } from "react-icons/lu";
import { NodeType } from "../../types/workflow";

export interface NodePaletteItem {
  type: NodeType;
  label: string;
  description: string;
  icon: IconType;
  color: string;
}

export const nodePaletteItems: NodePaletteItem[] = [
  {
    type: NodeType.START,
    label: "Start",
    description: "Entry point for a flow-control branch or a manually sequenced workflow segment.",
    icon: LuBetweenHorizontalStart,
    color: "#0f766e",
  },
  {
    type: NodeType.IF,
    label: "IF",
    description: "Conditionally route execution between true and false branches.",
    icon: FaCodeBranch,
    color: "#7c3aed",
  },
  {
    type: NodeType.SWITCH,
    label: "Switch",
    description: "Branch across multiple cases from one evaluated expression.",
    icon: FaShuffle,
    color: "#7c3aed",
  },
  {
    type: NodeType.MERGE,
    label: "Merge",
    description: "Combine upstream branches back into one flow.",
    icon: FaCodeMerge,
    color: "#b45309",
  },
  {
    type: NodeType.WAIT,
    label: "Wait",
    description: "Pause execution for a configured delay.",
    icon: FaClock,
    color: "#ca8a04",
  },
  {
    type: NodeType.NOOP,
    label: "NoOp",
    description: "Do nothing and pass data through for layout or structure.",
    icon: FaMinus,
    color: "#6b7280",
  },
  {
    type: NodeType.ITERATOR,
    label: "Iterator",
    description: "Run a downstream step for each item in a list.",
    icon: FaListOl,
    color: "#0891b2",
  },
  {
    type: NodeType.CODE,
    label: "Code",
    description: "Transform data with a small Python or JavaScript snippet.",
    icon: FaCode,
    color: "#be123c",
  },
  {
    type: NodeType.DATA_MAPPER,
    label: "Data mapper",
    description: "Set shared variables or map fields between node payloads.",
    icon: FaDatabase,
    color: "#4f46e5",
  },
  {
    type: NodeType.TRIGGER,
    label: "Trigger",
    description: "Start the workflow from chat, webhooks, schedules, or inbox events.",
    icon: FaBolt,
    color: "#0f766e",
  },
  {
    type: NodeType.AGENT,
    label: "Agent",
    description: "Run an LLM-powered worker with tools, instructions, and multi-step reasoning.",
    icon: FaRobot,
    color: "#6d28d9",
  },
  {
    type: NodeType.PROMPT,
    label: "Prompt",
    description: "Assemble structured prompt inputs before the agent executes.",
    icon: LuMessageSquareQuote,
    color: "#7c3aed",
  },
  {
    type: NodeType.KNOWLEDGE,
    label: "Knowledge",
    description: "Retrieve context from files, docs, databases, or vector stores.",
    icon: FaBook,
    color: "#b45309",
  },
  {
    type: NodeType.INTEGRATION,
    label: "Third-party app",
    description: "Connect one external app such as Email, Google, YouTube, Google Docs, or Slack.",
    icon: FaPlug,
    color: "#0f766e",
  },
  {
    type: NodeType.TOOL,
    label: "Tool",
    description: "Call external APIs, functions, CRM actions, or internal services.",
    icon: FaWrench,
    color: "#be123c",
  },
  {
    type: NodeType.MEMORY,
    label: "Memory",
    description: "Persist session state, summaries, and reusable agent memory.",
    icon: FaDatabase,
    color: "#4f46e5",
  },
  {
    type: NodeType.APPROVAL,
    label: "Approval",
    description: "Pause for a human checkpoint before sensitive actions are sent.",
    icon: FaUserCheck,
    color: "#ca8a04",
  },
  {
    type: NodeType.OUTPUT,
    label: "Output",
    description: "Deliver the final answer to chat, email, dashboards, or webhooks.",
    icon: FaPaperPlane,
    color: "#15803d",
  },
];
