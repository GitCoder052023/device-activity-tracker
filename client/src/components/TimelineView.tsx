import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface TimelineViewProps {
    sessionId: string;
}

interface StateTransition {
    id: number;
    timestamp: number;
    fromState: string;
    toState: string;
    deviceJid: string;
    duration?: number;
}

interface TimelineData {
    timestamp: number;
    online: number;
    standby: number;
    offline: number;
}

export function TimelineView({ sessionId }: TimelineViewProps) {
    const [transitions, setTransitions] = useState<StateTransition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionId) return;

        fetch(`http://localhost:3001/api/transitions/${sessionId}`)
            .then(res => res.json())
            .then(data => {
                setTransitions(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching transitions:', err);
                setLoading(false);
            });
    }, [sessionId]);

    if (loading) {
        return <div className="text-center text-gray-500 py-8">Loading timeline...</div>;
    }

    if (transitions.length === 0) {
        return <div className="text-center text-gray-500 py-8">No state transitions available</div>;
    }

    // Group transitions by device and create timeline
    const deviceMap = new Map<string, StateTransition[]>();
    transitions.forEach(t => {
        if (!deviceMap.has(t.deviceJid)) {
            deviceMap.set(t.deviceJid, []);
        }
        deviceMap.get(t.deviceJid)!.push(t);
    });

    // Create timeline data points
    const timelineData: TimelineData[] = [];
    const sortedTransitions = transitions.sort((a, b) => a.timestamp - b.timestamp);

    // Group by time windows (every 5 minutes)
    const timeWindows = new Map<number, { online: number; standby: number; offline: number }>();

    sortedTransitions.forEach((transition, index) => {
        const windowTime = Math.floor(transition.timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000);

        if (!timeWindows.has(windowTime)) {
            timeWindows.set(windowTime, { online: 0, standby: 0, offline: 0 });
        }

        const window = timeWindows.get(windowTime)!;
        if (transition.toState === 'Online') window.online++;
        else if (transition.toState === 'Standby') window.standby++;
        else if (transition.toState === 'OFFLINE') window.offline++;
    });

    Array.from(timeWindows.entries())
        .sort(([a], [b]) => a - b)
        .forEach(([timestamp, counts]) => {
            timelineData.push({
                timestamp,
                ...counts
            });
        });

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">State Transition Timeline</h4>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                        />
                        <YAxis />
                        <Tooltip
                            labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="online"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Online"
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="standby"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            name="Standby"
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="offline"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="Offline"
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Transition List */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">Recent Transitions</h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sortedTransitions.slice(-10).reverse().map(transition => (
                        <div key={transition.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${transition.toState === 'Online' ? 'bg-green-500' :
                                        transition.toState === 'Standby' ? 'bg-yellow-500' :
                                            'bg-red-500'
                                    }`} />
                                <span className="text-gray-600">{transition.fromState} → {transition.toState}</span>
                            </div>
                            <div className="text-gray-500 text-xs">
                                {format(new Date(transition.timestamp), 'HH:mm:ss')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

