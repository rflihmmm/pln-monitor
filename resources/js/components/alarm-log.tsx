
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Bell, AlertTriangle } from "lucide-react"

interface AlarmEntry {
    timestamp: string
    message: string
    isError: boolean
}

// Sample data generator for demonstration
const generateRandomAlarms = (): AlarmEntry[] => {
    const messages = [
        "Voltage fluctuation detected",
        "Power outage reported",
        "System maintenance required",
        "Connection restored",
        "Transformer temperature high",
        "Load balancing in progress",
        "Circuit breaker tripped",
        "Backup generator activated",
    ]

    const now = new Date()

    return Array.from({ length: 8 }, (_, i) => {
        const date = new Date(now)
        date.setMinutes(now.getMinutes() - i * 5)

        return {
            timestamp: date.toISOString().replace("T", " ").substring(0, 19),
            message: messages[Math.floor(Math.random() * messages.length)],
            isError: Math.random() > 0.7,
        }
    })
}

export default function AlarmLog() {
    const [alarms, setAlarms] = useState<AlarmEntry[]>([])

    // Simulate real-time updates
    useEffect(() => {
        setAlarms(generateRandomAlarms())

        const interval = setInterval(() => {
            setAlarms((prev) => {
                const newAlarms = [...prev]
                // Add a new alarm at the beginning
                const now = new Date()
                const messages = [
                    "Voltage fluctuation detected",
                    "Power outage reported",
                    "System maintenance required",
                    "Connection restored",
                    "Transformer temperature high",
                ]

                newAlarms.unshift({
                    timestamp: now.toISOString().replace("T", " ").substring(0, 19),
                    message: messages[Math.floor(Math.random() * messages.length)],
                    isError: Math.random() > 0.7,
                })

                // Keep only the latest 8 alarms
                return newAlarms.slice(0, 8)
            })
        }, 10000) // Update every 10 seconds

        return () => clearInterval(interval)
    }, [])

    return (
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-md flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Alarm Log
                </CardTitle>
                <Badge variant="outline" className="font-normal">
                    Live
                </Badge>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                    {alarms.map((alarm, index) => (
                        <div key={index} className="py-2 border-b last:border-0">
                            <div className="flex items-start gap-2">
                                {alarm.isError && <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                                <div className="flex-1">
                                    <div className={`text-xs ${alarm.isError ? "text-destructive" : "text-muted-foreground"}`}>
                                        {alarm.timestamp}
                                    </div>
                                    <div className="text-sm mt-1">{alarm.message}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}


