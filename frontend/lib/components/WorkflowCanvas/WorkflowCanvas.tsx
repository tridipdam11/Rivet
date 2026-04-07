"use client";

import React, { useCallback, useEffect, useMemo } from 'react';
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
import './WorkflowCanvas.css';

type CanvasNodeData = WorkflowNode['data'] & {
  nodeType?: NodeType;
  onUpdate?: (nodeId: string, updates: Partial<WorkflowNode['data']>) => void;
  isEditing?: boolean;
  onToggleEdit?: (nodeId: string) => void;
};

const nodeTypes: NodeTypes = {
  [NodeType.TRIGGER]: CustomNode,
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
  stroke: '#355248',
  strokeWidth: 3,
  strokeDasharray: '10 8',
  strokeLinecap: 'square' as const,
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
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>(SelectionMode.Partial);

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
      setEditingNodeId(null);
    },
    [onNodeSelect, toWorkflowNode]
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      setEditingNodeId(null);

      if (selectedNodes.length === 1) {
        onNodeSelect?.(toWorkflowNode(selectedNodes[0]));
        return;
      }

      onNodeSelect?.(null);
    },
    [onNodeSelect, toWorkflowNode]
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

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div
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
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        fitView
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
              gap: '6px',
              padding: '8px',
              border: '2px solid #24211a',
              background: 'linear-gradient(180deg, #eee7d1 0%, #c9c1aa 100%)',
              boxShadow: 'inset 1px 1px 0 #f6f1de, inset -1px -1px 0 #7d7666',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectionMode(SelectionMode.Partial)}
              style={{
                border: '2px solid #24211a',
                background:
                  selectionMode === SelectionMode.Partial
                    ? 'linear-gradient(180deg, #0f5759 0%, #08373a 100%)'
                    : 'linear-gradient(180deg, #eee7d1 0%, #c9c1aa 100%)',
                color: selectionMode === SelectionMode.Partial ? '#fff8e8' : '#171716',
                padding: '6px 8px',
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
                border: '2px solid #24211a',
                background:
                  selectionMode === SelectionMode.Full
                    ? 'linear-gradient(180deg, #0f5759 0%, #08373a 100%)'
                    : 'linear-gradient(180deg, #eee7d1 0%, #c9c1aa 100%)',
                color: selectionMode === SelectionMode.Full ? '#fff8e8' : '#171716',
                padding: '6px 8px',
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
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cbd5e1" />
      </ReactFlow>
    </div>
  );
};
