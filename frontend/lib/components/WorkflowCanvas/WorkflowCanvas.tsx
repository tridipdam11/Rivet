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

import { Workflow, WorkflowNode, WorkflowEdge, NodeType, NodeConfig } from '../../types/workflow';
import { NodeFactory } from '../../services/NodeFactory';
import { CustomNode } from './CustomNode';
import { nodePaletteItems } from '../NodePalette/nodePaletteData';
import './WorkflowCanvas.css';

type CanvasNodeData = WorkflowNode['data'] & {
  nodeType?: NodeType;
  onUpdate?: (nodeId: string, updates: Partial<WorkflowNode['data']>) => void;
  isEditing?: boolean;
  onToggleEdit?: (nodeId: string) => void;
};

const nodeTypes: NodeTypes = {
  [NodeType.TRIGGER]: CustomNode,
  [NodeType.START]: CustomNode,
  [NodeType.IF]: CustomNode,
  [NodeType.SWITCH]: CustomNode,
  [NodeType.MERGE]: CustomNode,
  [NodeType.WAIT]: CustomNode,
  [NodeType.NOOP]: CustomNode,
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
  stroke: '#233548',
  strokeWidth: 3,
  strokeDasharray: '12 8',
  strokeLinecap: 'round' as const,
};

interface WorkflowCanvasProps {
  workflow: Workflow;
  onWorkflowChange?: (workflow: Workflow) => void;
  onNodeSelect?: (node: WorkflowNode | null) => void;
  isExecuting?: boolean;
  className?: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  onWorkflowChange,
  onNodeSelect,
  isExecuting = false,
  className = '',
}) => {
  const nodeFactory = NodeFactory.getInstance();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(SelectionMode.Partial);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const applyNodeDataUpdates = useCallback(
    (node: WorkflowNode, updates: Partial<WorkflowNode['data']>): WorkflowNode =>
      ({
        ...node,
        data: {
          ...node.data,
          ...updates,
        } as WorkflowNode['data'],
      }) as WorkflowNode,
    []
  );

  const mapWorkflowNodeToCanvasNode = useCallback((node: WorkflowNode): Node => {
    return {
      id: node.id,
      type: node.data.type,
      position: node.position,
      data: {
        ...node.data,
        nodeType: node.data.type,
        config: node.data.config,
      } as CanvasNodeData,
    };
  }, []);

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
        color: '#355248',
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
    setNodes(workflow.nodes.map(mapWorkflowNodeToCanvasNode));
  }, [mapWorkflowNodeToCanvasNode, setNodes, workflow.nodes]);

  useEffect(() => {
    setEdges(workflow.edges.map(mapWorkflowEdgeToCanvasEdge));
  }, [mapWorkflowEdgeToCanvasEdge, setEdges, workflow.edges]);

  useEffect(() => {
    if (editingNodeId && !workflow.nodes.some((node) => node.id === editingNodeId)) {
      setEditingNodeId(null);
    }
  }, [editingNodeId, workflow.nodes]);

  const handleNodeDataUpdate = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode['data']>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...updates,
                },
              }
            : node
        )
      );

      if (!onWorkflowChange) {
        return;
      }

      onWorkflowChange({
        ...workflow,
        nodes: workflow.nodes.map((node) =>
          node.id === nodeId ? applyNodeDataUpdates(node, updates) : node
        ),
        metadata: {
          ...workflow.metadata,
          updatedAt: new Date(),
        },
      });
    },
    [applyNodeDataUpdates, onWorkflowChange, setNodes, workflow]
  );

  const canvasNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...(node.data as CanvasNodeData),
          isEditing: editingNodeId === node.id,
          onUpdate: handleNodeDataUpdate,
          onToggleEdit: (nodeId: string) => {
            setEditingNodeId((current) => (current === nodeId ? null : nodeId));
          },
        },
      })),
    [editingNodeId, handleNodeDataUpdate, nodes]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeSelect?.(toWorkflowNode(node));

      setEditingNodeId((current) => (current === node.id ? current : null));
    },
    [onNodeSelect, toWorkflowNode]
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        setEditingNodeId((current) =>
          current === selectedNodes[0].id ? current : null
        );
        onNodeSelect?.(toWorkflowNode(selectedNodes[0]));
        return;
      }

      if (selectedNodes.length === 0 && editingNodeId) {
        return;
      }

      setEditingNodeId(null);
      onNodeSelect?.(null);
    },
    [editingNodeId, onNodeSelect, toWorkflowNode]
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
              color: '#355248',
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
      setEditingNodeId(null);

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
          setEditingNodeId(null);
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
            color: '#355248',
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
              padding: '10px',
              border: '3px solid #24211a',
              borderRadius: '18px',
              background: 'linear-gradient(180deg, #fff8ea 0%, #ffe08c 100%)',
              boxShadow: 'inset 1px 1px 0 #f6f1de, inset -1px -1px 0 #7d7666, 4px 4px 0 rgba(23,23,22,0.12)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#4b3d0d',
                marginRight: '6px',
              }}
            >
              Selection
            </div>
            <button
              type="button"
              onClick={() => setSelectionMode(SelectionMode.Partial)}
              style={{
                border: '3px solid #24211a',
                borderRadius: '12px',
                background:
                  selectionMode === SelectionMode.Partial
                    ? 'linear-gradient(180deg, #65c8ef 0%, #4c8df6 100%)'
                    : 'linear-gradient(180deg, #fff8e8 0%, #f0dfc0 100%)',
                color: selectionMode === SelectionMode.Partial ? '#fff8e8' : '#171716',
                padding: '8px 10px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Partial select
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode(SelectionMode.Full)}
              style={{
                border: '3px solid #24211a',
                borderRadius: '12px',
                background:
                  selectionMode === SelectionMode.Full
                    ? 'linear-gradient(180deg, #ff8a7a 0%, #ff5a49 100%)'
                    : 'linear-gradient(180deg, #fff8e8 0%, #f0dfc0 100%)',
                color: selectionMode === SelectionMode.Full ? '#fff8e8' : '#171716',
                padding: '8px 10px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
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
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="rgba(35, 53, 72, 0.14)" />
      </ReactFlow>
    </div>
  );
};
