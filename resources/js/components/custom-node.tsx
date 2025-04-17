import { Handle, type NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';

function CustomNode({ data }: NodeProps) {
    const statusColor = data.status === 'active' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className="rounded-md border bg-white p-3 text-black shadow-sm">
            <Handle type="target" position={Position.Left} isConnectable={false} className="!h-3 !w-3 !bg-gray-400" />
            <div className="flex flex-col items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${statusColor}`}></div>
                <div className="font-medium">{data.label}</div>
            </div>

            <div className="font-mono">
                <ul className="list-none">
                    <li>Location : {data.location}</li>
                    <li>Volt : {data.volt}</li>
                </ul>
            </div>
            <Handle type="source" position={Position.Right} isConnectable={false} className="!h-3 !w-3 !bg-gray-400" />
        </div>
    );
}

export default memo(CustomNode);
