import React from 'react';
import type { ReactNode } from 'react';
import { NodeType } from '../../types/workflow';
import './NodePalette.css';

interface NodePaletteItem {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const nodeTypes: NodePaletteItem[] = [
  {
    type: NodeType.START,
    label: 'Start',
    description: 'Entry point for a flow-control branch or a manually sequenced workflow segment.',
    icon: 'ST',
    color: '#0f766e',
  },
  {
    type: NodeType.IF,
    label: 'IF',
    description: 'Conditionally route execution between true and false branches.',
    icon: 'IF',
    color: '#2563eb',
  },
  {
    type: NodeType.SWITCH,
    label: 'Switch',
    description: 'Branch across multiple cases from one evaluated expression.',
    icon: 'SW',
    color: '#7c3aed',
  },
  {
    type: NodeType.MERGE,
    label: 'Merge',
    description: 'Combine upstream branches back into one flow.',
    icon: 'MG',
    color: '#b45309',
  },
  {
    type: NodeType.WAIT,
    label: 'Wait',
    description: 'Pause execution for a configured delay.',
    icon: 'WT',
    color: '#ca8a04',
  },
  {
    type: NodeType.NOOP,
    label: 'NoOp',
    description: 'Do nothing and pass data through for layout or structure.',
    icon: 'NP',
    color: '#6b7280',
  },
  {
    type: NodeType.TRIGGER,
    label: 'Trigger',
    description: 'Start the workflow from chat, webhooks, schedules, or inbox events.',
    icon: 'TR',
    color: '#0f766e',
  },
  {
    type: NodeType.AGENT,
    label: 'Agent',
    description: 'Run an LLM-powered worker with tools, instructions, and multi-step reasoning.',
    icon: 'AI',
    color: '#1d4ed8',
  },
  {
    type: NodeType.PROMPT,
    label: 'Prompt',
    description: 'Assemble structured prompt inputs before the agent executes.',
    icon: 'PR',
    color: '#7c3aed',
  },
  {
    type: NodeType.KNOWLEDGE,
    label: 'Knowledge',
    description: 'Retrieve context from files, docs, databases, or vector stores.',
    icon: 'KB',
    color: '#b45309',
  },
  {
    type: NodeType.INTEGRATION,
    label: 'Third-party app',
    description: 'Connect one external app such as Email, Google, YouTube, Google Docs, or Slack.',
    icon: 'IN',
    color: '#0f766e',
  },
  {
    type: NodeType.TOOL,
    label: 'Tool',
    description: 'Call external APIs, functions, CRM actions, or internal services.',
    icon: 'TL',
    color: '#be123c',
  },
  {
    type: NodeType.MEMORY,
    label: 'Memory',
    description: 'Persist session state, summaries, and reusable agent memory.',
    icon: 'MM',
    color: '#4f46e5',
  },
  {
    type: NodeType.APPROVAL,
    label: 'Approval',
    description: 'Pause for a human checkpoint before sensitive actions are sent.',
    icon: 'AP',
    color: '#ca8a04',
  },
  {
    type: NodeType.OUTPUT,
    label: 'Output',
    description: 'Deliver the final answer to chat, email, dashboards, or webhooks.',
    icon: 'OP',
    color: '#15803d',
  },
];

interface NodePaletteProps {
  className?: string;
  toolbar?: ReactNode;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ className = '', toolbar }) => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={`node-palette ${className}`}>
      <div className="node-palette-header">
        <div>
          <div className="node-palette-eyebrow">Agent Workflow Studio</div>
          <h3 className="retro-display">Blocks</h3>
        </div>
        <div className="node-palette-header-actions">
          {toolbar ? <div className="node-palette-toolbar">{toolbar}</div> : null}
          <p>Drag a block into the canvas.</p>
        </div>
      </div>

      <div className="node-palette-items">
        {nodeTypes.map((nodeType) => (
          <div
            key={nodeType.type}
            className="node-palette-item"
            draggable
            onDragStart={(event) => onDragStart(event, nodeType.type)}
            style={{
              borderColor: '#24211a',
            }}
          >
            <div
              className="node-palette-item-icon"
              style={{
                color: nodeType.color,
                boxShadow: `inset 1px 1px 0 #fffdf2, inset -1px -1px 0 #7d7666, 0 0 0 2px ${nodeType.color}20`,
              }}
            >
              {nodeType.icon}
            </div>
            <div className="node-palette-item-content">
              <div className="node-palette-item-label">{nodeType.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
