import { CircleIcon } from "lucide-react"

export default function StatusIndicator() {
    return (
        <div className="flex items-center gap-4 bg-card p-3 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
                <CircleIcon className="h-4 w-4 fill-green-500 text-green-500" />
                <span className="text-sm font-medium">Active</span>
            </div>
            <div className="flex items-center gap-2">
                <CircleIcon className="h-4 w-4 fill-destructive text-destructive" />
                <span className="text-sm font-medium">Inactive</span>
            </div>
        </div>
    )
}


