
import { useCallback, useEffect, useState } from "react"
import {
    Background,
    BackgroundVariant,
    Controls,
    type Edge,
    MarkerType,
    type Node,
    type NodeTypes,
    Panel,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { fetchTreeData } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, RefreshCw } from "lucide-react"
import CustomNode from "@/components/custom-node"

// Define node types
const nodeTypes: NodeTypes = {
    custom: CustomNode,
}

export default function TreeDiagram() {
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [loading, setLoading] = useState(true)

    // Function to fetch and process data
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchTreeData()

            // Process nodes and edges from the data
            const processedNodes = data.nodes.map((node) => ({
                id: node.id,
                type: "custom",
                position: node.position,
                data: {
                    label: node.label,
                    status: node.status, // 'active' or 'inactive'
                },
                style: {
                    width: 180,
                },
            }))

            const processedEdges = data.edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                animated: false,
                style: {
                    stroke: edge.status === "active" ? "#22c55e" : "#ef4444",
                    strokeWidth: 2,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edge.status === "active" ? "#22c55e" : "#ef4444",
                },
            }))

            setNodes(processedNodes)
            setEdges(processedEdges)
        } catch (error) {
            console.error("Error loading tree data:", error)
            // Load sample data if API fails
            loadSampleData()
        } finally {
            setLoading(false)
        }
    }, [setNodes, setEdges])

    // Load sample data for demonstration
    const loadSampleData = useCallback(() => {
        const sampleNodes: Node[] = [
            {
                id: "1",
                type: "custom",
                position: { x: 0, y: 150 },
                data: { label: "UPZ Makassar Selatan", status: "active" },
                style: { width: 180 },
            },
            {
                id: "2",
                type: "custom",
                position: { x: 250, y: 50 },
                data: { label: "ULP Takalor", status: "active" },
                style: { width: 180 },
            },
            {
                id: "3",
                type: "custom",
                position: { x: 250, y: 150 },
                data: { label: "ULP Malino", status: "inactive" },
                style: { width: 180 },
            },
            {
                id: "4",
                type: "custom",
                position: { x: 250, y: 250 },
                data: { label: "ULP Lainnya", status: "active" },
                style: { width: 180 },
            },
            {
                id: "5",
                type: "custom",
                position: { x: 500, y: 0 },
                data: { label: "GI", status: "active" },
                style: { width: 180 },
            },
            {
                id: "6",
                type: "custom",
                position: { x: 500, y: 100 },
                data: { label: "GI", status: "inactive" },
                style: { width: 180 },
            },
            {
                id: "7",
                type: "custom",
                position: { x: 500, y: 200 },
                data: { label: "GI", status: "active" },
                style: { width: 180 },
            },
            {
                id: "8",
                type: "custom",
                position: { x: 750, y: 0 },
                data: { label: "Penyulang P.", status: "active" },
                style: { width: 180 },
            },
            {
                id: "9",
                type: "custom",
                position: { x: 750, y: 100 },
                data: { label: "Penyulang P.", status: "inactive" },
                style: { width: 180 },
            },
            {
                id: "10",
                type: "custom",
                position: { x: 1000, y: 0 },
                data: { label: "Rec", status: "active" },
                style: { width: 180 },
            },
            {
                id: "11",
                type: "custom",
                position: { x: 1000, y: 100 },
                data: { label: "Rec", status: "inactive" },
                style: { width: 180 },
            },
            {
                id: "12",
                type: "custom",
                position: { x: 1250, y: 0 },
                data: { label: "LBS", status: "active" },
                style: { width: 180 },
            },
            {
                id: "13",
                type: "custom",
                position: { x: 1250, y: 100 },
                data: { label: "LBS", status: "inactive" },
                style: { width: 180 },
            },
        ]

        const sampleEdges: Edge[] = [
            {
                id: "e1-2",
                source: "1",
                target: "2",
                animated: false,
                style: { stroke: "#22c55e", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
            },
            {
                id: "e1-3",
                source: "1",
                target: "3",
                animated: false,
                style: { stroke: "#ef4444", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
            },
            {
                id: "e1-4",
                source: "1",
                target: "4",
                animated: false,
                style: { stroke: "#22c55e", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
            },
            {
                id: "e2-5",
                source: "2",
                target: "5",
                animated: false,
                style: { stroke: "#22c55e", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
            },
            {
                id: "e2-6",
                source: "2",
                target: "6",
                animated: false,
                style: { stroke: "#ef4444", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
            },
            {
                id: "e3-7",
                source: "3",
                target: "7",
                animated: false,
                style: { stroke: "#ef4444", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
            },
            {
                id: "e5-8",
                source: "5",
                target: "8",
                animated: false,
                style: { stroke: "#22c55e", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
            },
            {
                id: "e6-9",
                source: "6",
                target: "9",
                animated: false,
                style: { stroke: "#ef4444", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
            },
            {
                id: "e8-10",
                source: "8",
                target: "10",
                animated: false,
                style: { stroke: "#22c55e", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
            },
            {
                id: "e9-11",
                source: "9",
                target: "11",
                animated: false,
                style: { stroke: "#ef4444", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
            },
            {
                id: "e10-12",
                source: "10",
                target: "12",
                animated: false,
                style: { stroke: "#22c55e", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
            },
            {
                id: "e11-13",
                source: "11",
                target: "13",
                animated: false,
                style: { stroke: "#ef4444", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
            },
        ]

        setNodes(sampleNodes)
        setEdges(sampleEdges)
        setLoading(false)
    }, [setNodes, setEdges])

    // Load data on component mount
    useEffect(() => {
        loadData()
    }, [loadData])

    return (
        <div className="h-full w-full">
            {loading ? (
                <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
            ) : (
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnScroll={true}
                    zoomOnScroll={true}
                >
                    <Panel position="top-right">
                        <Card className="w-64">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm">Status Legend</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                        <span className="text-xs">Active</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                        <span className="text-xs">Inactive</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Panel>
                    <Panel position="top-left">
                        <Button variant="outline" size="sm" onClick={loadData} className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Refresh Data
                        </Button>
                    </Panel>
                    <Controls className="text-black" />
                    <Background variant={BackgroundVariant.Dots} gap={16} color="#aaa" />
                </ReactFlow>
            )}
        </div>
    )
}


