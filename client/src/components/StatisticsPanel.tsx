import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface StatisticsPanelProps {
    jid: string;
}

interface StatisticalAnalysis {
    rttDistribution: {
        min: number;
        max: number;
        mean: number;
        median: number;
        stdDev: number;
        q1: number;
        q3: number;
        iqr: number;
    };
    stateDurations: {
        online: number;
        standby: number;
        offline: number;
    };
    transitionFrequency: {
        total: number;
        onlineToStandby: number;
        standbyToOnline: number;
        toOffline: number;
        fromOffline: number;
    };
    networkQuality: {
        avgQuality: number;
        avgStability: number;
        avgReliability: number;
    };
}

export function StatisticsPanel({ jid }: StatisticsPanelProps) {
    const [stats, setStats] = useState<StatisticalAnalysis | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`http://localhost:3001/api/analytics/statistics/${encodeURIComponent(jid)}`)
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching statistics:', err);
                setLoading(false);
            });
    }, [jid]);

    if (loading) {
        return <div className="text-center text-gray-500 py-8">Loading statistics...</div>;
    }

    if (!stats) {
        return <div className="text-center text-gray-500 py-8">No statistics available</div>;
    }

    const rttStats = [
        { name: 'Min', value: stats.rttDistribution.min },
        { name: 'Q1', value: stats.rttDistribution.q1 },
        { name: 'Median', value: stats.rttDistribution.median },
        { name: 'Mean', value: stats.rttDistribution.mean },
        { name: 'Q3', value: stats.rttDistribution.q3 },
        { name: 'Max', value: stats.rttDistribution.max }
    ];

    const stateDurationData = [
        { name: 'Online', value: stats.stateDurations.online, color: '#10b981' },
        { name: 'Standby', value: stats.stateDurations.standby, color: '#f59e0b' },
        { name: 'Offline', value: stats.stateDurations.offline, color: '#ef4444' }
    ].filter(item => item.value > 0);

    const transitionData = [
        { name: 'Online → Standby', value: stats.transitionFrequency.onlineToStandby },
        { name: 'Standby → Online', value: stats.transitionFrequency.standbyToOnline },
        { name: 'To Offline', value: stats.transitionFrequency.toOffline },
        { name: 'From Offline', value: stats.transitionFrequency.fromOffline }
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Statistical Analysis</h4>

            {/* RTT Distribution */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">RTT Distribution (ms)</h5>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                        <div className="text-xs text-gray-500">Min</div>
                        <div className="text-lg font-semibold">{stats.rttDistribution.min.toFixed(0)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Mean</div>
                        <div className="text-lg font-semibold">{stats.rttDistribution.mean.toFixed(0)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Max</div>
                        <div className="text-lg font-semibold">{stats.rttDistribution.max.toFixed(0)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Median</div>
                        <div className="text-lg font-semibold">{stats.rttDistribution.median.toFixed(0)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Std Dev</div>
                        <div className="text-lg font-semibold">{stats.rttDistribution.stdDev.toFixed(0)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">IQR</div>
                        <div className="text-lg font-semibold">{stats.rttDistribution.iqr.toFixed(0)}</div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={rttStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* State Durations */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">State Durations (minutes)</h5>
                <div className="grid grid-cols-3 gap-4 mb-3">
                    {stateDurationData.map(state => (
                        <div key={state.name}>
                            <div className="text-xs text-gray-500">{state.name}</div>
                            <div className="text-lg font-semibold" style={{ color: state.color }}>
                                {state.value.toFixed(1)}
                            </div>
                        </div>
                    ))}
                </div>
                {stateDurationData.length > 0 && (
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                            <Pie
                                data={stateDurationData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={50}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {stateDurationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Transition Frequency */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">State Transitions</h5>
                <div className="text-sm text-gray-600 mb-3">
                    Total: {stats.transitionFrequency.total}
                </div>
                {transitionData.length > 0 && (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={transitionData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

