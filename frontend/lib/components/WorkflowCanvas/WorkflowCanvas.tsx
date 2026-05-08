"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiPlus } from "react-icons/fi";
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  OnNodeDrag,
  NodeTypes,
  NodeMouseHandler,
  MarkerType,
  Panel,
  SelectionMode,
  OnSelectionChangeFunc,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  NodeExecutionStatus,
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeConfig,
} from '../../types/workflow';
import { NodeFactory } from '../../services/NodeFactory';
import { CustomNode } from './CustomNode';
import { nodePaletteItems } from '../NodePalette/nodePaletteData';
import './WorkflowCanvas.css';

type CanvasNodeData = WorkflowNode['data'] & {
  nodeType?: NodeType;
  executionStatus?: NodeExecutionStatus;
};

const nodeTypes: NodeTypes = {
  [NodeType.TRIGGER]: CustomNode,
  [NodeType.START]: CustomNode,
  [NodeType.IF]: CustomNode,
  [NodeType.SWITCH]: CustomNode,
  [NodeType.MERGE]: CustomNode,
  [NodeType.WAIT]: CustomNode,
  [NodeType.NOOP]: CustomNode,
  [NodeType.ITERATOR]: CustomNode,
  [NodeType.CODE]: CustomNode,
  [NodeType.DATA_MAPPER]: CustomNode,
  [NodeType.AGENT]: CustomNode,
  [NodeType.PROMPT]: CustomNode,
  [NodeType.KNOWLEDGE]: CustomNode,
  [NodeType.INTEGRATION]: CustomNode,
  [NodeType.TOOL]: CustomNode,
  [NodeType.MEMORY]: CustomNode,
  [NodeType.APPROVAL]: CustomNode,
  [NodeType.OUTPUT]: CustomNode,
};

const animatedEdgeStyle = {
  stroke: '#64748b',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
};

interface WorkflowCanvasProps {
  workflow: Workflow;
  onWorkflowChange?: (workflow: Workflow) => void;
  onNodeSelect?: (node: WorkflowNode | null) => void;
  selectedNodeId?: string | null;
  isExecuting?: boolean;
  nodeExecutionStatuses?: Record<string, NodeExecutionStatus>;
  className?: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  onWorkflowChange,
  onNodeSelect,
  selectedNodeId = null,
  isExecuting = false,
  nodeExecutionStatuses = {},
  className = '',
}) => {
  const nodeFactory = NodeFactory.getInstance();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(SelectionMode.Partial);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const mapWorkflowNodeToCanvasNode = useCallback(
    (node: WorkflowNode): Node => {
      return {
        id: node.id,
        type: node.data.type,
        position: node.position,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          nodeType: node.data.type,
          config: node.data.config,
        } as CanvasNodeData,
      };
    },
    [selectedNodeId]
  );

  const mapWorkflowEdgeToCanvasEdge = useCallback((edge: WorkflowEdge): Edge => {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      },
      style: animatedEdgeStyle,
      data: edge.data,
    };
  }, []);

  const toWorkflowNode = useCallback((node: Node): WorkflowNode => {
    return {
      id: node.id,
      position: node.position,
      data: {
        ...(node.data as object),
        type: node.data.type as NodeType,
        config: node.data.config as NodeConfig,
      } as WorkflowNode['data'],
      } as WorkflowNode;
  }, []);

  const initialNodes = useMemo(() => workflow.nodes.map(mapWorkflowNodeToCanvasNode), [
    mapWorkflowNodeToCanvasNode,
    workflow.nodes,
  ]);
  const initialEdges = useMemo(() => workflow.edges.map(mapWorkflowEdgeToCanvasEdge), [
    mapWorkflowEdgeToCanvasEdge,
    workflow.edges,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((currentNodes) =>
      workflow.nodes.map((wfNode) => {
        const mappedNode = mapWorkflowNodeToCanvasNode(wfNode);
        const existingNode = currentNodes.find((n) => n.id === wfNode.id);

        return {
          ...mappedNode,
          selected: mappedNode.selected || existingNode?.selected || false,
        };
      })
    );
  }, [mapWorkflowNodeToCanvasNode, setNodes, workflow.nodes]);

  useEffect(() => {
    setEdges(workflow.edges.map(mapWorkflowEdgeToCanvasEdge));
  }, [mapWorkflowEdgeToCanvasEdge, setEdges, workflow.edges]);

  const canvasNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...(node.data as CanvasNodeData),
          executionStatus: nodeExecutionStatuses[node.id],
        },
      })),
    [nodeExecutionStatuses, nodes]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeSelect?.(toWorkflowNode(node));
    },
    [onNodeSelect, toWorkflowNode]
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        onNodeSelect?.(toWorkflowNode(selectedNodes[0]));
        return;
      }

      if (selectedNodes.length === 0 && selectedNodeId) {
        // Skip nulling selection if we are just reacting to a workflow change
        // React Flow might briefly report 0 nodes when we swap them
        return;
      }

      onNodeSelect?.(null);
    },
    [onNodeSelect, selectedNodeId, toWorkflowNode]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64748b',
            },
            style: animatedEdgeStyle,
          },
          eds
        )
      );

      if (onWorkflowChange) {
        const newWorkflowEdge: WorkflowEdge = {
          id: `edge-${connection.source}-${connection.target}`,
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'smoothstep',
        };

        onWorkflowChange({
          ...workflow,
          edges: [...workflow.edges, newWorkflowEdge],
        });
      }
    },
    [setEdges, onWorkflowChange, workflow]
  );

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      if (onWorkflowChange) {
        const deletedNodeIds = changes
          .filter((change) => change.type === 'remove')
          .map((change) => change.id);

        if (deletedNodeIds.length === 0) {
          return;
        }

        onWorkflowChange({
          ...workflow,
          nodes: workflow.nodes.filter((node) => !deletedNodeIds.includes(node.id)),
          edges: deletedNodeIds.length
            ? workflow.edges.filter(
                (edge) =>
                  !deletedNodeIds.includes(edge.source) && !deletedNodeIds.includes(edge.target)
              )
            : workflow.edges,
        });
      }
    },
    [onNodesChange, onWorkflowChange, workflow]
  );

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_, draggedNode) => {
      if (!onWorkflowChange) {
        return;
      }

      onWorkflowChange({
        ...workflow,
        nodes: workflow.nodes.map((node) =>
          node.id === draggedNode.id
            ? {
                ...node,
                position: draggedNode.position,
              }
            : node
        ),
        metadata: {
          ...workflow.metadata,
          updatedAt: new Date(),
        },
      });
    },
    [onWorkflowChange, workflow]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);

      if (onWorkflowChange) {
        const deletedEdgeIds = changes
          .filter((change) => change.type === 'remove')
          .map((change) => change.id);

        if (deletedEdgeIds.length > 0) {
          onWorkflowChange({
            ...workflow,
            edges: workflow.edges.filter((edge) => !deletedEdgeIds.includes(edge.id)),
          });
        }
      }
    },
    [onEdgesChange, onWorkflowChange, workflow]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType =
        event.dataTransfer.getData('application/reactflow') ||
        event.dataTransfer.getData('text/plain');

      if (!nodeType) {
        return;
      }

      const canvasBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - canvasBounds.left,
        y: event.clientY - canvasBounds.top,
      };

      const workflowNode = nodeFactory.createNode(nodeType as NodeType, {
        position,
      });

      const newNode: Node = {
        id: workflowNode.id,
        type: workflowNode.data.type,
        position: workflowNode.position,
        data: workflowNode.data,
      };

      setNodes((nds) => nds.concat(newNode));

      if (onWorkflowChange) {
        onWorkflowChange({
          ...workflow,
          nodes: [...workflow.nodes, workflowNode],
        });
      }
    },
    [nodeFactory, onWorkflowChange, setNodes, workflow]
  );

  const createNodeAtPosition = useCallback(
    (nodeType: NodeType, position?: { x: number; y: number }) => {
      const workflowNode = nodeFactory.createNode(nodeType, {
        position: position ?? {
          x: 280 + workflow.nodes.length * 24,
          y: 180 + workflow.nodes.length * 18,
        },
      });

      const newNode: Node = {
        id: workflowNode.id,
        type: workflowNode.data.type,
        position: workflowNode.position,
        data: workflowNode.data,
      };

      setNodes((nds) => nds.concat(newNode));

      onWorkflowChange?.({
        ...workflow,
        nodes: [...workflow.nodes, workflowNode],
      });
    },
    [nodeFactory, onWorkflowChange, setNodes, workflow]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div
      ref={canvasRef}
      className={`workflow-canvas ${className}`}
      style={{ height: '100%', width: '100%' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={canvasNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={handleSelectionChange}
        onPaneClick={() => {
          onNodeSelect?.(null);
          setIsPickerOpen(false);
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.22,
          minZoom: 0.2,
        }}
        proOptions={{ hideAttribution: true }}
        className={isExecuting ? 'executing' : ''}
        selectionOnDrag
        selectionMode={selectionMode}
        panOnDrag={[2]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#64748b',
          },
          style: animatedEdgeStyle,
        }}
      >
        <Panel position="top-left">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
              padding: '6px',
              border: '1px solid rgba(203, 213, 225, 0.9)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.1)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                margin: '0 6px',
              }}
            >
              Selection
            </div>
            <button
              type="button"
              onClick={() => setSelectionMode(SelectionMode.Partial)}
              style={{
                border: '1px solid transparent',
                borderRadius: '10px',
                background: selectionMode === SelectionMode.Partial ? '#7c3aed' : 'transparent',
                color: selectionMode === SelectionMode.Partial ? '#fff' : '#475569',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Partial select
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode(SelectionMode.Full)}
              style={{
                border: '1px solid transparent',
                borderRadius: '10px',
                background: selectionMode === SelectionMode.Full ? '#7c3aed' : 'transparent',
                color: selectionMode === SelectionMode.Full ? '#fff' : '#475569',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Whole select
            </button>
          </div>
        </Panel>
        <Panel position="bottom-left" className="workflow-canvas-picker-panel">
          <div className="workflow-canvas-picker-anchor">
            <button
              type="button"
              className="workflow-canvas-plus"
              onClick={() => setIsPickerOpen((current) => !current)}
            >
              <FiPlus aria-hidden="true" />
            </button>
            {isPickerOpen ? (
              <div className="workflow-canvas-picker">
                <div className="workflow-canvas-picker-header">
                  <div>
                    <div className="workflow-canvas-picker-eyebrow">Block picker</div>
                    <div className="workflow-canvas-picker-title">Drag or click</div>
                  </div>
                  <button
                    type="button"
                    className="workflow-canvas-picker-close"
                    onClick={() => setIsPickerOpen(false)}
                  >
                    x
                  </button>
                </div>
                <div className="workflow-canvas-picker-grid">
                  {nodePaletteItems.map((item) => (
                    <div
                      key={item.type}
                      className="workflow-canvas-picker-item"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('application/reactflow', item.type);
                        event.dataTransfer.setData('text/plain', item.type);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => {
                        createNodeAtPosition(item.type);
                        setIsPickerOpen(false);
                      }}
                    >
                      <div
                        className="workflow-canvas-picker-badge"
                        style={{ color: item.color }}
                      >
                         <item.icon aria-hidden="true" />
                      </div>
                      <div className="workflow-canvas-picker-copy">
                        <div className="workflow-canvas-picker-label">{item.label}</div>
                        <div className="workflow-canvas-picker-description">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="rgba(100, 116, 139, 0.18)" />
      </ReactFlow>
    </div>
  );
};
