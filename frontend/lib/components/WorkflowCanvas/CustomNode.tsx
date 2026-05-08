"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  NodeExecutionStatus,
  NodeData,
  NodeType,
} from '../../types/workflow';

interface EditableNodeData extends NodeData {
  executionStatus?: NodeExecutionStatus;
}

const nodeAppearance: Record<NodeType, { badge: string; color: string }> = {
  [NodeType.TRIGGER]: { badge: 'TR', color: '#0f766e' },
  [NodeType.START]: { badge: 'ST', color: '#0f766e' },
  [NodeType.IF]: { badge: 'IF', color: '#7c3aed' },
  [NodeType.SWITCH]: { badge: 'SW', color: '#7c3aed' },
  [NodeType.MERGE]: { badge: 'MG', color: '#b45309' },
  [NodeType.WAIT]: { badge: 'WT', color: '#ca8a04' },
  [NodeType.NOOP]: { badge: 'NP', color: '#6b7280' },
  [NodeType.ITERATOR]: { badge: 'IT', color: '#0891b2' },
  [NodeType.CODE]: { badge: 'CD', color: '#be123c' },
  [NodeType.DATA_MAPPER]: { badge: 'DM', color: '#4f46e5' },
  [NodeType.AGENT]: { badge: 'AI', color: '#6d28d9' },
  [NodeType.PROMPT]: { badge: 'PR', color: '#7c3aed' },
  [NodeType.KNOWLEDGE]: { badge: 'KB', color: '#b45309' },
  [NodeType.INTEGRATION]: { badge: 'IN', color: '#0f766e' },
  [NodeType.TOOL]: { badge: 'TL', color: '#be123c' },
  [NodeType.MEMORY]: { badge: 'MM', color: '#4f46e5' },
  [NodeType.APPROVAL]: { badge: 'AP', color: '#ca8a04' },
  [NodeType.OUTPUT]: { badge: 'OP', color: '#15803d' },
};

const executionAppearance: Record<NodeExecutionStatus, { label: string; color: string; background: string }> = {
  [NodeExecutionStatus.PENDING]: { label: 'Pending', color: '#64748b', background: '#f8fafc' },
  [NodeExecutionStatus.RUNNING]: { label: 'Running', color: '#7c3aed', background: '#f5f3ff' },
  [NodeExecutionStatus.SUCCESS]: { label: 'Success', color: '#15803d', background: '#f0fdf4' },
  [NodeExecutionStatus.ERROR]: { label: 'Error', color: '#dc2626', background: '#fef2f2' },
  [NodeExecutionStatus.SKIPPED]: { label: 'Skipped', color: '#64748b', background: '#f1f5f9' },
  [NodeExecutionStatus.RETRYING]: { label: 'Retrying', color: '#b45309', background: '#fffbeb' },
};

export const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as EditableNodeData;
  const appearance = nodeAppearance[nodeData.type];
  const executionStatus = nodeData.executionStatus
    ? executionAppearance[nodeData.executionStatus]
    : null;
  const isValid = nodeData.config?.isValid !== false;
  const hasErrors = nodeData.config?.errors && nodeData.config.errors.length > 0;

  return (
    <div
      className={`custom-node ${selected ? 'selected' : ''} ${!isValid ? 'invalid' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${appearance.color}12 0%, transparent 42%), #ffffff`,
        border: `2px solid ${executionStatus?.color ?? '#0f172a'}`,
        borderRadius: '16px',
        padding: '16px',
        minWidth: '250px',
        boxShadow:
          selected
            ? `0 0 0 4px ${appearance.color}20, 0 18px 36px rgba(15, 23, 42, 0.16)`
            : '0 10px 24px rgba(15, 23, 42, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: appearance.color,
          width: '14px',
          height: '14px',
          borderRadius: '999px',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '46px',
            height: '46px',
            border: '1px solid #dbe3ef',
            borderRadius: '14px',
            background: `${appearance.color}12`,
            color: appearance.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {appearance.badge}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '999px',
              background: `${appearance.color}14`,
              color: appearance.color,
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            {nodeData.type.replace(/_/g, ' ')}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: '16px',
              color: '#0f172a',
              marginBottom: '4px',
            }}
          >
            {nodeData.label || nodeData.type.replace(/_/g, ' ')}
          </div>
          {nodeData.description ? (
            <div
              style={{
                fontSize: '12px',
                color: '#475569',
                lineHeight: 1.4,
                maxWidth: '200px',
              }}
            >
              {nodeData.description}
            </div>
          ) : (
            <div
              style={{
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              Ready for configuration
            </div>
          )}
        </div>
      </div>

      {hasErrors && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#ff5a49',
            color: '#fff',
            width: '18px',
            height: '18px',
            border: '2px solid #fff',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
          }}
        >
          !
        </div>
      )}

      {executionStatus ? (
        <div
          style={{
            position: 'absolute',
            right: '10px',
            bottom: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: `1px solid ${executionStatus.color}30`,
            borderRadius: '999px',
            background: executionStatus.background,
            color: executionStatus.color,
            padding: '5px 8px',
            fontSize: '10px',
            fontWeight: 800,
            boxShadow: '0 6px 14px rgba(15, 23, 42, 0.08)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '999px',
              background: executionStatus.color,
            }}
          />
          {executionStatus.label}
        </div>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: appearance.color,
          width: '14px',
          height: '14px',
          borderRadius: '999px',
        }}
      />
    </div>
  );
};
