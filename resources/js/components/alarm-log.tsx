import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, Search, X, Database } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
    PRIORITY: number;
    STATIONPID: number;
    station_name?: string;
}

interface UserKeypoints {
    success: boolean;
    data: number[];
    is_admin: boolean;
}

export default function AlarmLog() {
    const [alarms, setAlarms] = useState<AlarmEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [realtimeError, setRealtimeError] = useState(false);

    // Search functionality states
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<AlarmEntry[]>([]);
    const [searchMode, setSearchMode] = useState(false);

    // User permissions
    const [userKeypoints, setUserKeypoints] = useState<number[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [keypointsLoading, setKeypointsLoading] = useState(true);

    // Fetch user keypoints and permissions
    const fetchUserKeypoints = async () => {
        try {
            const response = await axios.get('/api/filtered-keypoints');
            const data: UserKeypoints = response.data;

            if (data.success) {
                setUserKeypoints(data.data);
                setIsAdmin(data.is_admin);
            }
        } catch (err) {
            console.error('Error fetching user keypoints:', err);
        } finally {
            setKeypointsLoading(false);
        }
    };

    // Filter alarms based on user permissions
    const filterAlarmsByPermissions = useCallback((alarmList: AlarmEntry[]) => {
        if (isAdmin || userKeypoints.length === 0) {
            return alarmList;
        }

        return alarmList.filter(alarm =>
            userKeypoints.includes(alarm.STATIONPID)
        );
    }, [isAdmin, userKeypoints]);

    const fetchAlarms = async () => {
        try {
            const { data, error } = await supabase
                .from('alarms')
                .select('id, TEXT, TIME, PRIORITY, STATIONPID')
                .order('id', { ascending: false })
                .limit(30);

            if (error) {
                throw error;
            }

            const filteredData = filterAlarmsByPermissions(data || []);
            setAlarms(filteredData);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching alarms:', err);
            setError('Failed to load alarms');
            setLoading(false);
        }
    };

    // Search alarms from database
    const searchAlarms = async (query: string) => {
        if (!query.trim()) {
            setSearchMode(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await axios.get('/api/search-alarms', {
                params: {
                    search: query,
                    limit: 50
                }
            });

            if (response.data.success) {
                setSearchResults(response.data.data);
                setSearchMode(true);
            } else {
                setError('Failed to search alarms');
            }
        } catch (err) {
            console.error('Error searching alarms:', err);
            setError('Failed to search alarms');
        } finally {
            setIsSearching(false);
        }
    };

    // Handle search input
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        searchAlarms(searchQuery);
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setSearchMode(false);
        setSearchResults([]);
    };

    // Initialize component
    useEffect(() => {
        fetchUserKeypoints();
    }, []);

    useEffect(() => {
        if (keypointsLoading) return;

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
        let channel: any;
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

                                const filteredNew = filterAlarmsByPermissions([newAlarm]);
                                if (filteredNew.length === 0) return prev;

                                const updated = [...filteredNew, ...prev];
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
    }, [keypointsLoading, isAdmin, userKeypoints, filterAlarmsByPermissions]);

    // PERBAIKAN 6: Fallback polling jika realtime gagal
    useEffect(() => {
        if (!realtimeError || keypointsLoading) return;

        const intervalId = setInterval(() => {
            fetchAlarms();
        }, 10000);

        return () => clearInterval(intervalId);
    }, [realtimeError, keypointsLoading]);

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

    const getAlarmColorClass = () => {
        // 0 = hitam, 1 = cyan, 2 = ungu, 3 = kuning dan 4 = merah
        const colors = [
            'text-black',
            'text-blue-400',
            'text-purple-400',
            'text-yellow-400',
            'text-red-400',
        ];
        const randomIndex = Math.floor(Math.random() * colors.length);
        return colors[randomIndex];
    };

    if (loading || keypointsLoading) {
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

    const currentAlarms = searchMode ? searchResults : alarms;
    const dataSource = searchMode ? 'Database' : 'Live';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Alarm Log
                    {!isAdmin && (
                        <Badge variant="secondary" className="text-xs">
                            Unit Filtered
                        </Badge>
                    )}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {searchMode && (
                        <Badge variant="outline" className="font-normal flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            Database
                        </Badge>
                    )}
                    <Badge variant="outline" className="font-normal">
                        {dataSource} ({currentAlarms.length})
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Search Form */}
                <form onSubmit={handleSearchSubmit} className="mb-4">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by Station ID, Station Name, or Alarm Text..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" disabled={isSearching}>
                            {isSearching ? 'Searching...' : 'Search'}
                        </Button>
                        {searchMode && (
                            <Button variant="outline" onClick={clearSearch}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </form>

                {/* Search Mode Indicator */}
                {searchMode && (
                    <div className="mb-2 p-2 bg-blue-50 text-blue-800 text-xs rounded flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Showing search results from database. Real-time updates are disabled in search mode.
                    </div>
                )}

                <ScrollArea className="h-[65vh] pr-4">
                    {currentAlarms.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-muted-foreground">
                                {searchMode ? 'No search results found' : 'No alarms found'}
                            </div>
                        </div>
                    ) : (
                        currentAlarms.map((alarm) => {
                            const colorClass = getAlarmColorClass();

                            return (
                                <div key={alarm.id} className="border-b py-2 last:border-0">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                            <div className={`text-xs text-muted-foreground`}>
                                                {formatTimestamp(alarm.TIME)}
                                            </div>
                                            <div className={`mt-1 text-sm ${colorClass}`}>
                                                {alarm.TEXT || 'No message'}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-4">
                                                <span>ID: {alarm.id}</span>
                                                <span>Station ID: {alarm.STATIONPID}</span>
                                                {alarm.station_name && (
                                                    <span>Station: {alarm.station_name}</span>
                                                )}
                                                <span>Priority: {alarm.PRIORITY}</span>
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