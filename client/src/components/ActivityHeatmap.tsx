import React, { useEffect, useState } from 'react';
import { Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ActivityHeatmapProps {
    jid: string;
}

interface HeatmapData {
    hour: number;
    day: number;
    activityLevel: number;
    avgRTT: number;
    measurementCount: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ActivityHeatmap({ jid }: ActivityHeatmapProps) {
    const [data, setData] = useState<HeatmapData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`http://localhost:3001/api/analytics/activity-patterns/${encodeURIComponent(jid)}`)
            .then(res => res.json())
            .then(result => {
                setData(result.heatmap || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching activity patterns:', err);
                setLoading(false);
            });
    }, [jid]);

    if (loading) {
        return <div className="text-center text-gray-500 py-8">Loading activity patterns...</div>;
    }

    // Create a map for quick lookup
    const dataMap = new Map<string, HeatmapData>();
    data.forEach(item => {
        dataMap.set(`${item.day}-${item.hour}`, item);
    });

    // Generate all cells
    const cells: Array<{ day: number; hour: number; value: number; data?: HeatmapData }> = [];
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            const key = `${day}-${hour}`;
            const item = dataMap.get(key);
            cells.push({
                day,
                hour,
                value: item?.activityLevel || 0,
                data: item
            });
        }
    }

    // Prepare data for bar chart (hourly average)
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourCells = cells.filter(c => c.hour === hour);
        const avgActivity = hourCells.reduce((sum, c) => sum + c.value, 0) / hourCells.length;
        return { hour, activity: avgActivity };
    });

    const getColor = (value: number) => {
        if (value === 0) return '#f3f4f6';
        if (value < 25) return '#dbeafe';
        if (value < 50) return '#93c5fd';
        if (value < 75) return '#3b82f6';
        return '#1e40af';
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Activity Heatmap (Hour/Day)</h4>

            {/* Heatmap Grid */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto">
                <div className="inline-grid grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-1 min-w-full">
                    {/* Header row */}
                    <div className="text-xs font-medium text-gray-600 text-center py-2"></div>
                    {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="text-xs text-gray-500 text-center py-1">
                            {i}
                        </div>
                    ))}

                    {/* Data rows */}
                    {Array.from({ length: 7 }, (_, day) => (
                        <React.Fragment key={day}>
                            <div className="text-xs font-medium text-gray-600 text-right pr-2 py-1">
                                {DAYS[day]}
                            </div>
                            {Array.from({ length: 24 }, (_, hour) => {
                                const cell = cells.find(c => c.day === day && c.hour === hour);
                                const value = cell?.value || 0;
                                return (
                                    <div
                                        key={`${day}-${hour}`}
                                        className="w-6 h-6 rounded border border-gray-200"
                                        style={{ backgroundColor: getColor(value) }}
                                        title={`${DAYS[day]} ${hour}:00 - Activity: ${value.toFixed(1)}%, Avg RTT: ${cell?.data?.avgRTT.toFixed(0) || 0}ms`}
                                    />
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Hourly Activity Bar Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">Average Activity by Hour</h5>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hourlyData}>
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="activity" fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

