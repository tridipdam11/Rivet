import React from 'react';
import type { ReactNode } from 'react';
import { FiSettings } from "react-icons/fi";
import './NodePalette.css';
import { nodePaletteItems } from "./nodePaletteData";

interface NodePaletteProps {
  className?: string;
  toolbar?: ReactNode;
  compact?: boolean;
}

export const NodePalette: React.FC<NodePaletteProps> = ({
  className = '',
  toolbar,
  compact = false,
}) => {
  return (
    <div className={`node-palette ${className}`}>
      <div className="node-palette-header">
        <div>
          <div className="node-palette-eyebrow">Agent Workflow Studio</div>
          <h3 className="display-title">{compact ? "Studio" : "Blocks"}</h3>
          <p className="node-palette-subtitle">
            {compact
              ? "Use the canvas + button to open the draggable block picker."
              : "Drag a block into the canvas and compose your desktop-style automation scene."}
          </p>
        </div>
        <div className="node-palette-header-actions">
          {toolbar ? <div className="node-palette-toolbar">{toolbar}</div> : null}
          <p><FiSettings aria-hidden="true" /> Studio controls</p>
        </div>
      </div>
      {!compact ? (
        <div className="node-palette-items">
          {nodePaletteItems.map((nodeType) => (
            <div
              key={nodeType.type}
              className="node-palette-item"
              style={{
                borderColor: '#e2e8f0',
              }}
            >
              <div
                className="node-palette-item-icon"
                style={{
                  color: nodeType.color,
                  backgroundColor: `${nodeType.color}12`,
                }}
              >
                <nodeType.icon aria-hidden="true" />
              </div>
              <div className="node-palette-item-content">
                <div className="node-palette-item-label">{nodeType.label}</div>
                <div className="node-palette-item-description">{nodeType.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
