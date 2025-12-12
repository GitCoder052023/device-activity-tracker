import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface NetworkGraphProps {
    jid: string;
}

interface NetworkAnalysis {
    networkType: 'WiFi' | 'Mobile' | 'Unknown';
    networkQuality: number;
    connectionStability: number;
    latencyTrend: 'improving' | 'stable' | 'degrading';
    packetLossIndicator: number;
    connectionReliability: number;
}

interface RTTDistribution {
    range: string;
    count: number;
}

export function NetworkGraph({ jid }: NetworkGraphProps) {
    const [analysis, setAnalysis] = useState<NetworkAnalysis | null>(null);
    const [distribution, setDistribution] = useState<RTTDistribution[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch network analysis
        fetch(`http://localhost:3001/api/analytics/network-analysis/${encodeURIComponent(jid)}`)
            .then(res => res.json())
            .then(data => {
                setAnalysis(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching network analysis:', err);
                setLoading(false);
            });

        // Fetch measurements for distribution
        fetch(`http://localhost:3001/api/analytics/statistics/${encodeURIComponent(jid)}`)
            .then(res => res.json())
            .then(data => {
                // Create RTT distribution buckets
                const buckets: { [key: string]: number } = {
                    '0-200': 0,
                    '200-400': 0,
                    '400-600': 0,
                    '600-800': 0,
                    '800-1000': 0,
                    '1000-1500': 0,
                    '1500+': 0
                };

                // We'd need actual RTT values for this, but for now use statistics
                const dist: RTTDistribution[] = Object.keys(buckets).map(range => ({
                    range,
                    count: buckets[range]
                }));
                setDistribution(dist);
            })
            .catch(err => console.error('Error fetching statistics:', err));
    }, [jid]);

    if (loading) {
        return <div className="text-center text-gray-500 py-8">Loading network analysis...</div>;
    }

    if (!analysis) {
        return <div className="text-center text-gray-500 py-8">No network data available</div>;
    }

    const qualityColor = analysis.networkQuality >= 80 ? '#10b981' :
        analysis.networkQuality >= 60 ? '#3b82f6' :
            analysis.networkQuality >= 40 ? '#f59e0b' : '#ef4444';

    const stabilityColor = analysis.connectionStability >= 80 ? '#10b981' :
        analysis.connectionStability >= 60 ? '#3b82f6' :
            analysis.connectionStability >= 40 ? '#f59e0b' : '#ef4444';

    const reliabilityColor = analysis.connectionReliability >= 80 ? '#10b981' :
        analysis.connectionReliability >= 60 ? '#3b82f6' :
            analysis.connectionReliability >= 40 ? '#f59e0b' : '#ef4444';

    const metricsData = [
        { name: 'Network Quality', value: analysis.networkQuality, color: qualityColor },
        { name: 'Connection Stability', value: analysis.connectionStability, color: stabilityColor },
        { name: 'Connection Reliability', value: analysis.connectionReliability, color: reliabilityColor },
        { name: 'Packet Loss Indicator', value: 100 - analysis.packetLossIndicator, color: '#3b82f6' }
    ];

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Network Analysis</h4>

            {/* Network Type and Trend */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Network Type</div>
                    <div className="text-lg font-semibold text-gray-900">
                        {analysis.networkType === 'WiFi' ? '📶 WiFi' :
                            analysis.networkType === 'Mobile' ? '📱 Mobile Data' : '❓ Unknown'}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Latency Trend</div>
                    <div className="text-lg font-semibold text-gray-900">
                        {analysis.latencyTrend === 'improving' ? '📉 Improving' :
                            analysis.latencyTrend === 'degrading' ? '📈 Degrading' : '➡️ Stable'}
                    </div>
                </div>
            </div>

            {/* Metrics Bars */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">Network Metrics</h5>
                <div className="space-y-3">
                    {metricsData.map(metric => (
                        <div key={metric.name}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">{metric.name}</span>
                                <span className="font-medium" style={{ color: metric.color }}>
                                    {metric.value.toFixed(0)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${metric.value}%`,
                                        backgroundColor: metric.color
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Network Quality Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">Network Metrics Comparison</h5>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={metricsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="value">
                            {metricsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

