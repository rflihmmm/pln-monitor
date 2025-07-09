import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// PERBAIKAN 1: Gunakan URL public Supabase, bukan internal
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// PERBAIKAN 2: Tambahkan opsi realtime
const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        }
    }
});

interface AlarmEntry {
    id: number;
    TEXT: string;
    TIME: string;
}

export default function AlarmLog() {
    const [alarms, setAlarms] = useState<AlarmEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [realtimeError, setRealtimeError] = useState(false); // PERBAIKAN 3: State untuk error realtime

    const fetchAlarms = async () => {
        try {
            const { data, error } = await supabase
                .from('alarms')
                .select('id, TEXT, TIME')
                .order('id', { ascending: false })
                .limit(30);

            if (error) {
                throw error;
            }

            setAlarms(data || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching alarms:', err);
            setError('Failed to load alarms');
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        fetchAlarms();

        // PERBAIKAN 4: Tambahkan timeout untuk fallback jika realtime gagal
        const realtimeTimeout = setTimeout(() => {
            if (alarms.length === 0 && !error) {
                setError('Realtime connection failed. Please refresh the page.');
                setRealtimeError(true);
            }
        }, 5000);

        // Set up real-time subscription
        let channel;
        try {
            channel = supabase
                .channel('alarm-log-updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'alarms',
                    },
                    (payload) => {
                        if (!isMounted) return;
                        if (payload.eventType === 'INSERT') {
                            const newAlarm = payload.new as AlarmEntry;
                            setAlarms(prev => {
                                const exists = prev.some(alarm => alarm.id === newAlarm.id);
                                if (exists) return prev;

                                const updated = [newAlarm, ...prev];
                                return updated.slice(0, 30);
                            });
                        }
                        else if (payload.eventType === 'UPDATE') {
                            setAlarms(prev =>
                                prev.map(alarm =>
                                    alarm.id === payload.new.id ? { ...alarm, ...payload.new } : alarm
                                )
                            );
                        }
                        else if (payload.eventType === 'DELETE') {
                            setAlarms(prev =>
                                prev.filter(alarm => alarm.id !== payload.old.id)
                            );
                        }
                    }
                )
                .subscribe((status, err) => {
                    // PERBAIKAN 5: Tangani status subscribe
                    if (status === 'CHANNEL_ERROR') {
                        setRealtimeError(true);
                        setError('Realtime connection failed. Data may not update automatically.');
                    }
                });
        } catch (err) {
            setRealtimeError(true);
            setError('Failed to setup realtime updates');
        }

        // Cleanup
        return () => {
            isMounted = false;
            clearTimeout(realtimeTimeout);
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    // PERBAIKAN 6: Fallback polling jika realtime gagal
    useEffect(() => {
        if (!realtimeError) return;

        const intervalId = setInterval(() => {
            fetchAlarms();
        }, 10000);

        return () => clearInterval(intervalId);
    }, [realtimeError]);

    // Format timestamp for display
    const formatTimestamp = (timestamp: string) => {
        if (!timestamp) return '';

        try {
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (err) {
            return timestamp;
        }
    };

    const isErrorAlarm = (text: string) => {
        const errorKeywords = ['error', 'fault', 'fail', 'outage', 'trip', 'alarm', 'critical', 'emergency'];
        return errorKeywords.some(keyword =>
            text.toLowerCase().includes(keyword)
        );
    };

    // Tampilkan pesan error khusus jika realtime gagal
    // const renderRealtimeError = () => (
    //     <div className="mb-2 p-2 bg-yellow-100 text-yellow-800 text-xs rounded">
    //         <AlertTriangle className="inline mr-1 h-4 w-4" />
    //         Realtime updates disabled. Using fallback polling.
    //     </div>
    // );

    if (loading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-md flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Alarm Log
                    </CardTitle>
                    <Badge variant="outline" className="font-normal">
                        Loading...
                    </Badge>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[70vh]">
                        <div className="text-muted-foreground">Loading alarms...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Alarm Log
                </CardTitle>
                <Badge variant="outline" className="font-normal">
                    {"Live"} ({alarms.length})
                </Badge>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[70vh] pr-4">
                    {alarms.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-muted-foreground">No alarms found</div>
                        </div>
                    ) : (
                        alarms.map((alarm) => {
                            const isError = isErrorAlarm(alarm.TEXT || '');

                            return (
                                <div key={alarm.id} className="border-b py-2 last:border-0">
                                    <div className="flex items-start gap-2">
                                        {isError && (
                                            <AlertTriangle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <div className={`text-xs ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                {formatTimestamp(alarm.TIME)}
                                            </div>
                                            <div className="mt-1 text-sm">
                                                {alarm.TEXT || 'No message'}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                ID: {alarm.id}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}