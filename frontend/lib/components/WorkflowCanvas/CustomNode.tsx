"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  NodeData,
  NodeType,
  TriggerSource,
  KnowledgeSourceType,
  RetrievalMode,
  ThirdPartyAppType,
  IntegrationAuthStatus,
  ToolType,
  MemoryScope,
  MemoryStrategy,
  ApproverType,
  OutputType,
} from '../../types/workflow';

interface EditableNodeData extends NodeData {
  onUpdate?: (nodeId: string, updates: Partial<NodeData>) => void;
  isEditing?: boolean;
  onToggleEdit?: (nodeId: string) => void;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: '2px solid #24211a',
  background: '#f4efd9',
  color: '#171716',
  padding: '6px 8px',
  fontSize: '12px',
  lineHeight: 1.4,
  boxShadow: 'inset 1px 1px 0 #7d7666, inset -1px -1px 0 #fffdf2',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#5b564a',
  marginBottom: '4px',
};

const nodeAppearance: Record<NodeType, { badge: string; color: string }> = {
  [NodeType.TRIGGER]: { badge: 'TR', color: '#0f766e' },
  [NodeType.AGENT]: { badge: 'AI', color: '#1d4ed8' },
  [NodeType.PROMPT]: { badge: 'PR', color: '#7c3aed' },
  [NodeType.KNOWLEDGE]: { badge: 'KB', color: '#b45309' },
  [NodeType.INTEGRATION]: { badge: 'IN', color: '#0f766e' },
  [NodeType.TOOL]: { badge: 'TL', color: '#be123c' },
  [NodeType.MEMORY]: { badge: 'MM', color: '#4f46e5' },
  [NodeType.APPROVAL]: { badge: 'AP', color: '#ca8a04' },
  [NodeType.OUTPUT]: { badge: 'OP', color: '#15803d' },
};

export const CustomNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as EditableNodeData;
  const appearance = nodeAppearance[nodeData.type];
  const isValid = nodeData.config?.isValid !== false;
  const hasErrors = nodeData.config?.errors && nodeData.config.errors.length > 0;
  const isEditing = selected && nodeData.isEditing;
  const handleFieldChange =
    (field: 'label' | 'description') =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      nodeData.onUpdate?.(id, {
        [field]: event.target.value,
      });
    };
  const handleTextUpdate =
    (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      nodeData.onUpdate?.(id, {
        [field]: event.target.value,
      });
    };
  const handleNumberUpdate =
    (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      nodeData.onUpdate?.(id, {
        [field]: Number.isNaN(parsed) ? 0 : parsed,
      });
    };
  const handleListUpdate =
    (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      nodeData.onUpdate?.(id, {
        [field]: event.target.value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
    };

  const renderEditor = () => {
    switch (nodeData.type) {
      case NodeType.TRIGGER:
        return (
          <>
            <div>
              <div style={labelStyle}>Trigger source</div>
              <select
                className="nodrag"
                value={String(nodeData.triggerSource)}
                onChange={handleTextUpdate('triggerSource')}
                style={fieldStyle}
              >
                {Object.values(TriggerSource).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Event name</div>
              <input
                className="nodrag"
                value={String(nodeData.eventName ?? '')}
                onChange={handleTextUpdate('eventName')}
                placeholder="new.customer.message"
                style={fieldStyle}
              />
            </div>
          </>
        );
      case NodeType.AGENT:
        return (
          <>
            <div>
              <div style={labelStyle}>Role</div>
              <input className="nodrag" value={String(nodeData.role ?? '')} onChange={handleTextUpdate('role')} style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>Model</div>
              <input className="nodrag" value={String(nodeData.model ?? '')} onChange={handleTextUpdate('model')} style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>System prompt</div>
              <textarea
                className="nodrag"
                value={String(nodeData.systemPrompt ?? '')}
                onChange={handleTextUpdate('systemPrompt')}
                rows={4}
                style={{ ...fieldStyle, resize: 'none' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={labelStyle}>Temperature</div>
                <input className="nodrag" type="number" step="0.1" value={String(nodeData.temperature ?? 0)} onChange={handleNumberUpdate('temperature')} style={fieldStyle} />
              </div>
              <div>
                <div style={labelStyle}>Max steps</div>
                <input className="nodrag" type="number" value={String(nodeData.maxSteps ?? 0)} onChange={handleNumberUpdate('maxSteps')} style={fieldStyle} />
              </div>
            </div>
            <div>
              <div style={labelStyle}>Allowed tools</div>
              <input
                className="nodrag"
                value={Array.isArray(nodeData.allowedTools) ? nodeData.allowedTools.join(', ') : ''}
                onChange={handleListUpdate('allowedTools')}
                placeholder="crm_lookup, send_email"
                style={fieldStyle}
              />
            </div>
          </>
        );
      case NodeType.PROMPT:
        return (
          <>
            <div>
              <div style={labelStyle}>Prompt template</div>
              <textarea
                className="nodrag"
                value={String(nodeData.promptTemplate ?? '')}
                onChange={handleTextUpdate('promptTemplate')}
                rows={5}
                style={{ ...fieldStyle, resize: 'none' }}
              />
            </div>
            <div>
              <div style={labelStyle}>Input variables</div>
              <input
                className="nodrag"
                value={Array.isArray(nodeData.inputVariables) ? nodeData.inputVariables.join(', ') : ''}
                onChange={handleListUpdate('inputVariables')}
                placeholder="customer_message, profile"
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Output key</div>
              <input className="nodrag" value={String(nodeData.outputKey ?? '')} onChange={handleTextUpdate('outputKey')} style={fieldStyle} />
            </div>
          </>
        );
      case NodeType.KNOWLEDGE:
        return (
          <>
            <div>
              <div style={labelStyle}>Source type</div>
              <select className="nodrag" value={String(nodeData.sourceType)} onChange={handleTextUpdate('sourceType')} style={fieldStyle}>
                {Object.values(KnowledgeSourceType).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Source name</div>
              <input className="nodrag" value={String(nodeData.sourceName ?? '')} onChange={handleTextUpdate('sourceName')} style={fieldStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={labelStyle}>Retrieval</div>
                <select className="nodrag" value={String(nodeData.retrievalMode)} onChange={handleTextUpdate('retrievalMode')} style={fieldStyle}>
                  {Object.values(RetrievalMode).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Top K</div>
                <input className="nodrag" type="number" value={String(nodeData.topK ?? 0)} onChange={handleNumberUpdate('topK')} style={fieldStyle} />
              </div>
            </div>
          </>
        );
      case NodeType.INTEGRATION:
        return (
          <>
            <div>
              <div style={labelStyle}>App type</div>
              <select className="nodrag" value={String(nodeData.appType)} onChange={handleTextUpdate('appType')} style={fieldStyle}>
                {Object.values(ThirdPartyAppType).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Connected app</div>
              <input className="nodrag" value={String(nodeData.appName ?? '')} onChange={handleTextUpdate('appName')} placeholder="Slack" style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>Action</div>
              <input className="nodrag" value={String(nodeData.action ?? '')} onChange={handleTextUpdate('action')} placeholder="send_email_update" style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>Auth status</div>
              <select className="nodrag" value={String(nodeData.authStatus)} onChange={handleTextUpdate('authStatus')} style={fieldStyle}>
                {Object.values(IntegrationAuthStatus).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Mapped fields</div>
              <input
                className="nodrag"
                value={Array.isArray(nodeData.mappedFields) ? nodeData.mappedFields.join(', ') : ''}
                onChange={handleListUpdate('mappedFields')}
                placeholder="customer_email, refund_status"
                style={fieldStyle}
              />
            </div>
          </>
        );
      case NodeType.TOOL:
        return (
          <>
            <div>
              <div style={labelStyle}>Tool type</div>
              <select className="nodrag" value={String(nodeData.toolType)} onChange={handleTextUpdate('toolType')} style={fieldStyle}>
                {Object.values(ToolType).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Action</div>
              <input className="nodrag" value={String(nodeData.action ?? '')} onChange={handleTextUpdate('action')} style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>Endpoint</div>
              <input className="nodrag" value={String(nodeData.endpoint ?? '')} onChange={handleTextUpdate('endpoint')} style={fieldStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={labelStyle}>Timeout ms</div>
                <input className="nodrag" type="number" value={String(nodeData.timeoutMs ?? 0)} onChange={handleNumberUpdate('timeoutMs')} style={fieldStyle} />
              </div>
              <div>
                <div style={labelStyle}>Retries</div>
                <input className="nodrag" type="number" value={String(nodeData.retries ?? 0)} onChange={handleNumberUpdate('retries')} style={fieldStyle} />
              </div>
            </div>
          </>
        );
      case NodeType.MEMORY:
        return (
          <>
            <div>
              <div style={labelStyle}>Scope</div>
              <select className="nodrag" value={String(nodeData.memoryScope)} onChange={handleTextUpdate('memoryScope')} style={fieldStyle}>
                {Object.values(MemoryScope).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Strategy</div>
              <select className="nodrag" value={String(nodeData.strategy)} onChange={handleTextUpdate('strategy')} style={fieldStyle}>
                {Object.values(MemoryStrategy).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Max items</div>
              <input className="nodrag" type="number" value={String(nodeData.maxItems ?? 0)} onChange={handleNumberUpdate('maxItems')} style={fieldStyle} />
            </div>
          </>
        );
      case NodeType.APPROVAL:
        return (
          <>
            <div>
              <div style={labelStyle}>Approver</div>
              <select className="nodrag" value={String(nodeData.approverType)} onChange={handleTextUpdate('approverType')} style={fieldStyle}>
                {Object.values(ApproverType).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Instructions</div>
              <textarea
                className="nodrag"
                value={String(nodeData.instructions ?? '')}
                onChange={handleTextUpdate('instructions')}
                rows={4}
                style={{ ...fieldStyle, resize: 'none' }}
              />
            </div>
            <div>
              <div style={labelStyle}>Timeout minutes</div>
              <input className="nodrag" type="number" value={String(nodeData.timeoutMinutes ?? 0)} onChange={handleNumberUpdate('timeoutMinutes')} style={fieldStyle} />
            </div>
          </>
        );
      case NodeType.OUTPUT:
        return (
          <>
            <div>
              <div style={labelStyle}>Output type</div>
              <select className="nodrag" value={String(nodeData.outputType)} onChange={handleTextUpdate('outputType')} style={fieldStyle}>
                {Object.values(OutputType).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Destination</div>
              <input className="nodrag" value={String(nodeData.destination ?? '')} onChange={handleTextUpdate('destination')} style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>Format</div>
              <input className="nodrag" value={String(nodeData.format ?? '')} onChange={handleTextUpdate('format')} style={fieldStyle} />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`custom-node ${selected ? 'selected' : ''} ${!isValid ? 'invalid' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${appearance.color}22 0%, transparent 34%), linear-gradient(180deg, #efe7d3 0%, #c9c1aa 100%)`,
        border: `2px solid ${selected ? '#d9893d' : '#24211a'}`,
        padding: '14px',
        minWidth: '220px',
        boxShadow:
          selected
            ? 'inset 2px 2px 0 #fff8e8, inset -2px -2px 0 #7d7666, 0 0 0 2px rgba(217,137,61,0.35), 5px 5px 0 rgba(23,23,22,0.14)'
            : 'inset 2px 2px 0 #f6f1de, inset -2px -2px 0 #7d7666, 4px 4px 0 rgba(23,23,22,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: appearance.color,
          width: '12px',
          height: '12px',
          borderRadius: 0,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '2px solid #24211a',
            background: `linear-gradient(180deg, #fff8e8 0%, ${appearance.color}22 100%)`,
            color: appearance.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            flexShrink: 0,
            boxShadow: 'inset 1px 1px 0 #fffdf2, inset -1px -1px 0 #7d7666, 2px 2px 0 rgba(23,23,22,0.08)',
          }}
        >
          {appearance.badge}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid #24211a',
              background: appearance.color,
              color: '#f7f2df',
              padding: '3px 7px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            {nodeData.type.replace(/_/g, ' ')}
          </div>
          {isEditing ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              <input
                className="nodrag"
                value={nodeData.label ?? ''}
                onChange={handleFieldChange('label')}
                placeholder="Node label"
                style={{
                  ...fieldStyle,
                  fontSize: '14px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              />
              <textarea
                className="nodrag"
                value={nodeData.description?.toString() ?? ''}
                onChange={handleFieldChange('description')}
                placeholder="Describe what this node does"
                rows={3}
                style={{
                  resize: 'none',
                  ...fieldStyle,
                  color: '#3f3a32',
                }}
              />
              <div
                style={{
                  borderTop: '2px dashed rgba(36, 33, 26, 0.5)',
                  paddingTop: '8px',
                  display: 'grid',
                  gap: '8px',
                }}
              >
                {renderEditor()}
              </div>
            </div>
          ) : (
            <>
              <div
              style={{
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#171716',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  textShadow: '1px 1px 0 rgba(255, 248, 232, 0.35)',
                }}
              >
                {nodeData.label || nodeData.type.replace(/_/g, ' ')}
              </div>
              {nodeData.description ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#3f3a32',
                    lineHeight: 1.4,
                    maxWidth: '180px',
                  }}
                >
                  {nodeData.description}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#5e584c',
                  }}
                >
                  Ready for configuration
                </div>
              )}
              {selected ? (
                <button
                  type="button"
                  className="nodrag"
                  onClick={(event) => {
                    event.stopPropagation();
                    nodeData.onToggleEdit?.(id);
                  }}
                  style={{
                    marginTop: '10px',
                    border: '2px solid #24211a',
                    background: 'linear-gradient(180deg, #eee7d1 0%, #c9c1aa 100%)',
                    color: '#171716',
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    boxShadow: 'inset 1px 1px 0 #f6f1de, inset -1px -1px 0 #7d7666',
                    cursor: 'pointer',
                  }}
                >
                  Edit node
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {hasErrors && (
        <div
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#9b3b2e',
            color: '#fff5e8',
            width: '16px',
            height: '16px',
            border: '1px solid #24211a',
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

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: appearance.color,
          width: '12px',
          height: '12px',
          borderRadius: 0,
        }}
      />
    </div>
  );
};
