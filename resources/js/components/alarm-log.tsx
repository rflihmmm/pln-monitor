import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Bell, Search, X, Database, Calendar, Download } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
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

interface SearchFilters {
    text: string;
    startDate: string;
    endDate: string;
}

export default function AlarmLog() {
    const [alarms, setAlarms] = useState<AlarmEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [realtimeError, setRealtimeError] = useState(false);

    // Search functionality states
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        text: '',
        startDate: '',
        endDate: ''
    });
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<AlarmEntry[]>([]);
    const [searchMode, setSearchMode] = useState(false);
    const [showDateFilter, setShowDateFilter] = useState(false);

    // Download functionality states
    const [isDownloading, setIsDownloading] = useState(false);

    // User permissions
    const [userKeypoints, setUserKeypoints] = useState<number[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [keypointsLoading, setKeypointsLoading] = useState(true);

    // State untuk menandai apakah timeout error sudah aktif
    const [timeoutTriggered, setTimeoutTriggered] = useState(false);

    // FIX: Use ref to store latest values for realtime subscription
    const userKeypointsRef = useRef<number[]>([]);
    const isAdminRef = useRef<boolean>(false);

    // Update refs whenever values change
    useEffect(() => {
        userKeypointsRef.current = userKeypoints;
    }, [userKeypoints]);

    useEffect(() => {
        isAdminRef.current = isAdmin;
    }, [isAdmin]);

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

    // FIX: Stable filter function using refs
    const filterAlarmsByPermissions = useCallback((alarmList: AlarmEntry[]) => {
        const currentIsAdmin = isAdminRef.current;
        const currentKeypoints = userKeypointsRef.current;

        if (currentIsAdmin || currentKeypoints.length === 0) {
            return alarmList;
        }

        return alarmList.filter(alarm =>
            currentKeypoints.includes(alarm.STATIONPID)
        );
    }, []); // Empty dependency array since we use refs

    const fetchAlarms = useCallback(async () => {
        try {
            let query = supabase
                .from('alarms')
                .select('id, TEXT, TIME, PRIORITY, STATIONPID')
                .order('id', { ascending: false })
                .limit(100);

            // Apply server-side filtering if not admin and userKeypoints exist
            if (!isAdminRef.current && userKeypointsRef.current.length > 0) {
                query = query.in('STATIONPID', userKeypointsRef.current);
            }

            const { data, error } = await query;

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
    }, []); // Empty dependency array since we use refs

    // Search alarms from database
    const searchAlarms = async (filters: SearchFilters) => {
        const hasTextFilter = filters.text.trim();
        const hasDateFilter = filters.startDate || filters.endDate;

        if (!hasTextFilter && !hasDateFilter) {
            setSearchMode(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setError(null); // Clear any previous errors

        try {
            const params: any = {
                limit: 1000
            };

            if (hasTextFilter) {
                params.search = filters.text.trim();
            }

            if (filters.startDate) {
                // Convert to proper format for SQL Server
                const startDate = new Date(filters.startDate);
                params.start_date = startDate.toISOString();
            }

            if (filters.endDate) {
                // Convert to proper format for SQL Server
                const endDate = new Date(filters.endDate);
                params.end_date = endDate.toISOString();
            }

            console.log('Search params:', params); // Debug log

            const response = await axios.get('/api/search-alarms', { params });

            if (response.data.success) {
                // Temporarily bypass client-side filtering for search results to debug display issue
                setSearchResults(response.data.data);
                setSearchMode(true);
                console.log('Search results (unfiltered):', response.data.data.length, 'items'); // Debug log
            } else {
                setError('Failed to search alarms: ' + response.data.message);
                console.error('Search failed:', response.data);
            }
        } catch (err: any) {
            console.error('Error searching alarms:', err);
            setError('Failed to search alarms: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSearching(false);
        }
    };

    // Download CSV function
    const downloadCSV = async () => {
        if (!searchMode || searchResults.length === 0) {
            return;
        }

        setIsDownloading(true);

        try {
            // Prepare CSV headers
            const headers = ['ID', 'Time', 'Alarm Text', 'Priority', 'Station PID', 'Station Name'];

            // Prepare CSV rows
            const csvRows = [
                headers.join(','), // Header row
                ...searchResults.map(alarm => [
                    alarm.id,
                    `"${formatTimestamp(alarm.TIME)}"`, // Wrap in quotes to handle commas
                    `"${(alarm.TEXT || '').replace(/"/g, '""')}"`, // Escape quotes and wrap in quotes
                    alarm.PRIORITY,
                    alarm.STATIONPID,
                    `"${alarm.station_name || 'N/A'}"` // Wrap in quotes
                ].join(','))
            ];

            // Create CSV content
            const csvContent = csvRows.join('\n');

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');

            if (link.download !== undefined) {
                // Generate filename with current date
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
                const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
                const filename = `alarm-log-${dateStr}_${timeStr}.csv`;

                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Error downloading CSV:', err);
            setError('Failed to download CSV file');
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle search form submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        searchAlarms(searchFilters);
    };

    // Handle date range search
    const handleDateSearch = () => {
        if (searchFilters.startDate || searchFilters.endDate) {
            searchAlarms(searchFilters);
        }
    };

    // Handle date change and auto-search if both dates are set
    const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
        const newFilters = {
            ...searchFilters,
            [field]: value
        };
        setSearchFilters(newFilters);

        // Auto-search if both dates are set or if clearing a date while the other is set
        if (newFilters.startDate && newFilters.endDate) {
            searchAlarms(newFilters);
        } else if (!value && (newFilters.startDate || newFilters.endDate)) {
            // If clearing one date but the other is still set, search with remaining date
            searchAlarms(newFilters);
        }
    };

    // Clear search
    const clearSearch = () => {
        setSearchFilters({
            text: '',
            startDate: '',
            endDate: ''
        });
        setSearchMode(false);
        setSearchResults([]);
        setShowDateFilter(false);
        // Return to live mode
        fetchAlarms();
    };

    // Helper to format date to YYYY-MM-DDTHH:MM in local time
    const formatLocalDatetime = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Set quick date filters
    const setQuickDateFilter = (hours: number) => {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));

        const newFilters = {
            ...searchFilters,
            startDate: formatLocalDatetime(startDate),
            endDate: formatLocalDatetime(endDate)
        };

        setSearchFilters(newFilters);
        // Automatically search when quick filter is applied
        searchAlarms(newFilters);
    };

    // Initialize component
    useEffect(() => {
        fetchUserKeypoints();
    }, []);

    // FIX: Simplified useEffect for realtime subscription
    useEffect(() => {
        if (keypointsLoading) return;

        let isMounted = true;

        // Initial fetch
        fetchAlarms();

        // Timeout untuk fallback jika realtime gagal
        const realtimeTimeout = setTimeout(() => {
            if (isMounted) {
                setError('Realtime connection failed. Please refresh the page.');
                setRealtimeError(true);
                setTimeoutTriggered(true);
            }
        }, 60000);

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

                                // Use current ref values for filtering
                                const currentIsAdmin = isAdminRef.current;
                                const currentKeypoints = userKeypointsRef.current;

                                // Filter new alarm based on permissions
                                if (!currentIsAdmin && currentKeypoints.length > 0) {
                                    if (!currentKeypoints.includes(newAlarm.STATIONPID)) {
                                        return prev;
                                    }
                                }

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
    }, [keypointsLoading]); // Only depend on keypointsLoading

    // Hilangkan pesan error jika data alarm berubah setelah timeout aktif
    useEffect(() => {
        if (timeoutTriggered && alarms.length > 0) {
            setError(null);
            setRealtimeError(false);
            setTimeoutTriggered(false);
        }
    }, [alarms, timeoutTriggered]);

    // PERBAIKAN 6: Fallback polling jika realtime gagal
    useEffect(() => {
        if (!realtimeError || keypointsLoading) return;

        const intervalId = setInterval(() => {
            fetchAlarms();
        }, 10000);

        return () => clearInterval(intervalId);
    }, [realtimeError, keypointsLoading, fetchAlarms]);

    // Format timestamp for display (convert GMT+0 to GMT+8)
    const formatTimestamp = (timestamp: string) => {
        if (!timestamp) return '';

        try {
            const date = new Date(timestamp);
            // Add 8 hours (8 * 60 * 60 * 1000 ms)
            const gmt8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
            return gmt8Date.toLocaleString('en-US', {
                //return date.toLocaleString('en-US', {
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

    const getAlarmColorClass = (priority: number) => {
        // 0 = hitam, 1 = cyan, 2 = ungu, 3 = kuning dan 4 = merah
        const colors = [
            'text-black',
            'text-blue-600',
            'text-[#FF00FF]',
            'text-yellow-500',
            'text-red-600',
        ];
        return colors[priority] || colors[0];
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
                            <Database className="h-4 w-4" />
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
                <form onSubmit={handleSearchSubmit} className="mb-4 space-y-3">
                    {/* Text Search */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by Station ID, Station Name, or Alarm Text..."
                                value={searchFilters.text}
                                onChange={(e) => setSearchFilters(prev => ({
                                    ...prev,
                                    text: e.target.value
                                }))}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowDateFilter(!showDateFilter)}
                        >
                            <Calendar className="h-4 w-4" />
                        </Button>
                        <Button type="submit" disabled={isSearching}>
                            {isSearching ? 'Searching...' : 'Search'}
                        </Button>
                        {/* Download Button - Only visible in search mode */}
                        {searchMode && searchResults.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={downloadCSV}
                                disabled={isDownloading}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                {isDownloading ? 'Downloading...' : 'CSV'}
                            </Button>
                        )}
                        {searchMode && (
                            <Button variant="outline" onClick={clearSearch}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Date Filter */}
                    {showDateFilter && (
                        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4" />
                                <Label className="text-sm font-medium">Filter by Date Range</Label>
                            </div>

                            {/* Quick date buttons */}
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuickDateFilter(1)}
                                >
                                    Last 1h
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuickDateFilter(6)}
                                >
                                    Last 6h
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuickDateFilter(24)}
                                >
                                    Last 24h
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuickDateFilter(168)}
                                >
                                    Last 7d
                                </Button>
                            </div>

                            {/* Date inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="start-date" className="text-xs">From</Label>
                                    <Input
                                        id="start-date"
                                        type="datetime-local"
                                        value={searchFilters.startDate}
                                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="end-date" className="text-xs">To</Label>
                                    <Input
                                        id="end-date"
                                        type="datetime-local"
                                        value={searchFilters.endDate}
                                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={handleDateSearch}
                                    disabled={!searchFilters.startDate && !searchFilters.endDate}
                                    size="sm"
                                >
                                    Apply Date Filter
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const clearedFilters = {
                                            ...searchFilters,
                                            startDate: '',
                                            endDate: ''
                                        };
                                        setSearchFilters(clearedFilters);
                                        // If in search mode, re-search with cleared dates
                                        if (searchMode) {
                                            searchAlarms(clearedFilters);
                                        }
                                    }}
                                    size="sm"
                                >
                                    Clear Dates
                                </Button>
                            </div>
                        </div>
                    )}
                </form>

                {/* Error Display */}
                {error && (
                    <div className="mb-2 p-2 bg-red-50 text-red-800 text-xs rounded flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {/* Search Mode Indicator */}
                {searchMode && (
                    <div className="mb-2 p-2 bg-blue-50 text-blue-800 text-xs rounded flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Showing search results from database. Real-time updates are disabled in search mode.
                        {(searchFilters.startDate || searchFilters.endDate) && (
                            <span className="ml-2 font-medium">
                                Date filter: {searchFilters.startDate ? formatTimestamp(searchFilters.startDate) : 'Any'} - {searchFilters.endDate ? formatTimestamp(searchFilters.endDate) : 'Any'}
                            </span>
                        )}
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
                            const colorClass = getAlarmColorClass(alarm.PRIORITY);

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