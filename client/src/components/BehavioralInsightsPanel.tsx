import React, { useEffect, useState } from 'react';

interface BehavioralInsightsPanelProps {
    jid: string;
}

interface BehavioralInsights {
    averageSessionLength: number;
    peakActivityTimes: { hour: number; activity: number }[];
    sleepWakeDetection: {
        typicalWakeTime?: number;
        typicalSleepTime?: number;
        sleepPatternDetected: boolean;
    };
    deviceUsagePatterns: {
        deviceJid: string;
        usagePercentage: number;
        avgRTT: number;
    }[];
    multiDeviceCoordination: {
        simultaneousDevices: number;
        avgSimultaneousDevices: number;
        coordinationScore: number;
    };
    responseTimePatterns: {
        avgResponseTime: number;
        fastestResponseTime: number;
        slowestResponseTime: number;
        responseTimeConsistency: number;
    };
}

export function BehavioralInsightsPanel({ jid }: BehavioralInsightsPanelProps) {
    const [insights, setInsights] = useState<BehavioralInsights | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`http://localhost:3001/api/analytics/behavioral-insights/${encodeURIComponent(jid)}`)
            .then(res => res.json())
            .then(data => {
                setInsights(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching behavioral insights:', err);
                setLoading(false);
            });
    }, [jid]);

    if (loading) {
        return <div className="text-center text-gray-500 py-8">Loading behavioral insights...</div>;
    }

    if (!insights) {
        return <div className="text-center text-gray-500 py-8">No insights available</div>;
    }

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Behavioral Insights</h4>

            {/* Session Info */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Average Session Length</div>
                <div className="text-lg font-semibold text-gray-900">
                    {insights.averageSessionLength.toFixed(1)} minutes
                </div>
            </div>

            {/* Peak Activity Times */}
            {insights.peakActivityTimes.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h5 className="text-xs font-medium text-gray-600 mb-3">Peak Activity Times</h5>
                    <div className="space-y-2">
                        {insights.peakActivityTimes.map((peak, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                    {peak.hour}:00 - {peak.hour + 1}:00
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${(peak.activity / insights.peakActivityTimes[0].activity) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 w-12 text-right">
                                        {peak.activity.toFixed(0)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sleep/Wake Detection */}
            {insights.sleepWakeDetection.sleepPatternDetected && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h5 className="text-xs font-medium text-gray-600 mb-3">Sleep/Wake Patterns</h5>
                    <div className="grid grid-cols-2 gap-4">
                        {insights.sleepWakeDetection.typicalWakeTime !== undefined && (
                            <div>
                                <div className="text-xs text-gray-500">Typical Wake Time</div>
                                <div className="text-lg font-semibold text-gray-900">
                                    {insights.sleepWakeDetection.typicalWakeTime}:00
                                </div>
                            </div>
                        )}
                        {insights.sleepWakeDetection.typicalSleepTime !== undefined && (
                            <div>
                                <div className="text-xs text-gray-500">Typical Sleep Time</div>
                                <div className="text-lg font-semibold text-gray-900">
                                    {insights.sleepWakeDetection.typicalSleepTime}:00
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Device Usage Patterns */}
            {insights.deviceUsagePatterns.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h5 className="text-xs font-medium text-gray-600 mb-3">Device Usage</h5>
                    <div className="space-y-2">
                        {insights.deviceUsagePatterns.map((device, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                    Device {idx + 1}
                                </span>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500">
                                        {device.usagePercentage.toFixed(1)}% usage
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Avg RTT: {device.avgRTT.toFixed(0)}ms
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Multi-Device Coordination */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">Multi-Device Coordination</h5>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div className="text-xs text-gray-500">Simultaneous Devices</div>
                        <div className="text-lg font-semibold">{insights.multiDeviceCoordination.simultaneousDevices}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Avg Simultaneous</div>
                        <div className="text-lg font-semibold">
                            {insights.multiDeviceCoordination.avgSimultaneousDevices.toFixed(1)}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Coordination Score</div>
                        <div className="text-lg font-semibold">
                            {insights.multiDeviceCoordination.coordinationScore.toFixed(0)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Response Time Patterns */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="text-xs font-medium text-gray-600 mb-3">Response Time Patterns</h5>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-gray-500">Average</div>
                        <div className="text-lg font-semibold">
                            {insights.responseTimePatterns.avgResponseTime.toFixed(0)}ms
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Fastest</div>
                        <div className="text-lg font-semibold text-green-600">
                            {insights.responseTimePatterns.fastestResponseTime.toFixed(0)}ms
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Slowest</div>
                        <div className="text-lg font-semibold text-red-600">
                            {insights.responseTimePatterns.slowestResponseTime.toFixed(0)}ms
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Consistency</div>
                        <div className="text-lg font-semibold">
                            {insights.responseTimePatterns.responseTimeConsistency.toFixed(0)}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

