"use client";

import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  NodeExecutionStatus,
  NodeData,
} from '../../types/workflow';
import { nodePaletteItems } from '../NodePalette/nodePaletteData';

interface EditableNodeData extends NodeData {
  executionStatus?: NodeExecutionStatus;
}

const executionAppearance: Record<NodeExecutionStatus, { color: string; background: string }> = {
  [NodeExecutionStatus.PENDING]: { color: '#64748b', background: '#f8fafc' },
  [NodeExecutionStatus.RUNNING]: { color: '#7c3aed', background: '#f5f3ff' },
  [NodeExecutionStatus.SUCCESS]: { color: '#15803d', background: '#f0fdf4' },
  [NodeExecutionStatus.ERROR]: { color: '#dc2626', background: '#fef2f2' },
  [NodeExecutionStatus.SKIPPED]: { color: '#64748b', background: '#f1f5f9' },
  [NodeExecutionStatus.RETRYING]: { color: '#b45309', background: '#fffbeb' },
};

export const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as EditableNodeData;
  
  const paletteItem = useMemo(() => 
    nodePaletteItems.find(item => item.type === nodeData.type) || nodePaletteItems[0],
    [nodeData.type]
  );

  const executionStatus = nodeData.executionStatus
    ? executionAppearance[nodeData.executionStatus]
    : null;
    
  const isValid = nodeData.config?.isValid !== false;
  const hasErrors = nodeData.config?.errors && nodeData.config.errors.length > 0;
  const Icon = paletteItem.icon;

  return (
    <div className="flex flex-col items-center" style={{ width: 'fit-content' }}>
      <div
        className={`custom-node ${selected ? 'selected' : ''} ${!isValid ? 'invalid' : ''}`}
        style={{
          background: selected ? '#ffffff' : `${paletteItem.color}08`,
          border: `2px solid ${executionStatus?.color ?? (selected ? paletteItem.color : '#cbd5e1')}`,
          borderRadius: '18px',
          width: '72px',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: selected
            ? `0 0 0 4px ${paletteItem.color}20, 0 12px 28px rgba(15, 23, 42, 0.15)`
            : '0 6px 14px rgba(15, 23, 42, 0.06)',
          position: 'relative',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: paletteItem.color,
            width: '12px',
            height: '12px',
            border: '2px solid #fff',
            left: '-7px',
          }}
        />

        <div style={{ color: paletteItem.color, fontSize: '32px', display: 'flex' }}>
          <Icon />
        </div>

        {hasErrors && (
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
              color: '#fff',
              width: '22px',
              height: '22px',
              border: '2.5px solid #fff',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 900,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            !
          </div>
        )}

        {executionStatus && nodeData.executionStatus !== NodeExecutionStatus.PENDING && (
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              width: '18px',
              height: '18px',
              borderRadius: '999px',
              background: executionStatus.color,
              border: '2.5px solid #fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          />
        )}

        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: paletteItem.color,
            width: '12px',
            height: '12px',
            border: '2px solid #fff',
            right: '-7px',
          }}
        />
      </div>
      
      <div 
        style={{
          marginTop: '12px',
          fontSize: '12px',
          fontWeight: 700,
          color: selected ? '#0f172a' : '#475569',
          textAlign: 'center',
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          textShadow: '0 1px 2px rgba(255,255,255,0.9)',
          letterSpacing: '0.01em'
        }}
      >
        {nodeData.label || paletteItem.label}
      </div>
    </div>
  );
};