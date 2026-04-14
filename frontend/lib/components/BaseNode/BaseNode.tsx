"use client";

/**
 * BaseNode - Base component with common functionality for all workflow nodes
 */

import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  WorkflowNode,
  NodeData,
  ExecutionStatus,
  NodeType,
} from '../../types/workflow';

const nodeAppearance: Record<NodeType, { badge: string; color: string }> = {
  [NodeType.TRIGGER]: { badge: 'TR', color: '#0f766e' },
  [NodeType.START]: { badge: 'ST', color: '#0f766e' },
  [NodeType.IF]: { badge: 'IF', color: '#2563eb' },
  [NodeType.SWITCH]: { badge: 'SW', color: '#7c3aed' },
  [NodeType.MERGE]: { badge: 'MG', color: '#b45309' },
  [NodeType.WAIT]: { badge: 'WT', color: '#ca8a04' },
  [NodeType.NOOP]: { badge: 'NP', color: '#6b7280' },
  [NodeType.AGENT]: { badge: 'AI', color: '#1d4ed8' },
  [NodeType.PROMPT]: { badge: 'PR', color: '#7c3aed' },
  [NodeType.KNOWLEDGE]: { badge: 'KB', color: '#b45309' },
  [NodeType.INTEGRATION]: { badge: 'IN', color: '#0f766e' },
  [NodeType.TOOL]: { badge: 'TL', color: '#be123c' },
  [NodeType.MEMORY]: { badge: 'MM', color: '#4f46e5' },
  [NodeType.APPROVAL]: { badge: 'AP', color: '#ca8a04' },
  [NodeType.OUTPUT]: { badge: 'OP', color: '#15803d' },
};

export interface BaseNodeProps extends NodeProps {
  onNodeSelect?: (nodeId: string, nodeData: NodeData) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  showHandles?: boolean;
  isExecuting?: boolean;
  executionStatus?: ExecutionStatus;
  children?: React.ReactNode;
}

export const BaseNodeComponent: React.FC<BaseNodeProps> = ({
  id,
  data,
  selected,
  onNodeSelect,
  showHandles = true,
  isExecuting = false,
  executionStatus,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const nodeData = data as NodeData;

  const handleNodeClick = useCallback(() => {
    if (onNodeSelect) {
      onNodeSelect(id, nodeData);
    }
  }, [id, nodeData, onNodeSelect]);

  const getExecutionStatusColor = (status?: string): string => {
    switch (status) {
      case 'pending':
        return '#FFC107';
      case 'running':
        return '#2196F3';
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'skipped':
        return '#9E9E9E';
      default:
        return 'transparent';
    }
  };

  const appearance = nodeAppearance[nodeData.type];
  const isValid = nodeData.config?.isValid !== false;
  const hasErrors = nodeData.config?.errors && nodeData.config.errors.length > 0;
  const nodeColor = appearance.color;
  const executionColor = getExecutionStatusColor(executionStatus);

  return (
    <div
      className={`base-node ${selected ? 'selected' : ''} ${!isValid ? 'invalid' : ''} ${isExecuting ? 'executing' : ''}`}
      onClick={handleNodeClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'white',
        border: `2px solid ${selected ? '#1976d2' : nodeColor}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '150px',
        boxShadow: selected || isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {showHandles && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: nodeColor,
            width: '12px',
            height: '12px',
            border: '2px solid white',
          }}
        />
      )}

      {isExecuting && executionStatus && (
        <div
          className="execution-status"
          style={{
            position: 'absolute',
            top: '-8px',
            left: '-8px',
            background: executionColor,
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            border: '2px solid white',
            zIndex: 10,
          }}
        />
      )}

      <div className="node-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: nodeColor }}>{appearance.badge}</span>
        <div style={{ flex: 1 }}>
          <div
            className="node-title"
            style={{
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              marginBottom: '2px',
            }}
          >
            {nodeData.label || nodeData.type.replace('_', ' ').toUpperCase()}
          </div>
          <div
            className="node-type"
            style={{
              fontSize: '12px',
              color: '#666',
              textTransform: 'capitalize',
            }}
          >
            {nodeData.type.replace('_', ' ')}
          </div>
        </div>
      </div>

      {nodeData.description && (
        <div
          className="node-description"
          style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '8px',
            lineHeight: '1.3',
          }}
        >
          {nodeData.description}
        </div>
      )}

      {children}

      {hasErrors && (
        <div
          className="error-indicator"
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#f44336',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            zIndex: 10,
          }}
          title={nodeData.config?.errors?.join(', ')}
        >
          !
        </div>
      )}

      {isValid && !hasErrors && (
        <div
          className="valid-indicator"
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#4CAF50',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            zIndex: 10,
          }}
          title="Node configuration is valid"
        >
          ok
        </div>
      )}

      {showHandles && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: nodeColor,
            width: '12px',
            height: '12px',
            border: '2px solid white',
          }}
        />
      )}
    </div>
  );
};
