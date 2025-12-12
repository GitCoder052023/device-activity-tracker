import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Square, Activity, Wifi, Smartphone, Monitor, BarChart3, Network, TrendingUp, Clock } from 'lucide-react';
import clsx from 'clsx';
import { ActivityHeatmap } from './ActivityHeatmap';
import { TimelineView } from './TimelineView';
import { NetworkGraph } from './NetworkGraph';
import { StatisticsPanel } from './StatisticsPanel';
import { BehavioralInsightsPanel } from './BehavioralInsightsPanel';

interface TrackerData {
    rtt: number;
    avg: number;
    median: number;
    threshold: number;
    state: string;
    timestamp: number;
}

interface DeviceInfo {
    jid: string;
    state: string;
    rtt: number;
    avg: number;
}

interface ContactCardProps {
    jid: string;
    displayNumber: string;
    data: TrackerData[];
    devices: DeviceInfo[];
    deviceCount: number;
    presence: string | null;
    profilePic: string | null;
    onRemove: () => void;
    privacyMode?: boolean;
}

type TabType = 'overview' | 'activity' | 'statistics' | 'network' | 'behavioral' | 'timeline';

export function ContactCard({
    jid,
    displayNumber,
    data,
    devices,
    deviceCount,
    presence,
    profilePic,
    onRemove,
    privacyMode = false
}: ContactCardProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch current session ID
        fetch(`http://localhost:3001/api/sessions/${encodeURIComponent(jid)}?limit=1`)
            .then(res => res.json())
            .then(sessions => {
                if (sessions.length > 0) {
                    setSessionId(sessions[0].id);
                }
            })
            .catch(err => console.error('Error fetching session:', err));
    }, [jid]);

    const lastData = data[data.length - 1];
    const currentStatus = devices.length > 0
        ? (devices.find(d => d.state === 'OFFLINE')?.state ||
            devices.find(d => d.state.includes('Online'))?.state ||
            devices[0].state)
        : 'Unknown';

    // Blur phone number in privacy mode
    const blurredNumber = privacyMode ? displayNumber.replace(/\d/g, '•') : displayNumber;

    const tabs = [
        { id: 'overview' as TabType, label: 'Overview', icon: Activity },
        { id: 'activity' as TabType, label: 'Activity', icon: BarChart3 },
        { id: 'statistics' as TabType, label: 'Statistics', icon: TrendingUp },
        { id: 'network' as TabType, label: 'Network', icon: Network },
        { id: 'behavioral' as TabType, label: 'Insights', icon: Clock },
        { id: 'timeline' as TabType, label: 'Timeline', icon: Clock }
    ];

    return (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header with Stop Button */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{blurredNumber}</h3>
                <button
                    onClick={onRemove}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium transition-colors text-sm"
                >
                    <Square size={16} /> Stop
                </button>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Status Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
                        <div className="relative mb-4">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md">
                                {profilePic ? (
                                    <img
                                        src={profilePic}
                                        alt="Profile"
                                        className={clsx(
                                            "w-full h-full object-cover transition-all duration-200",
                                            privacyMode && "blur-xl scale-110"
                                        )}
                                        style={privacyMode ? {
                                            filter: 'blur(16px) contrast(0.8)',
                                        } : {}}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className={clsx(
                                "absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-white",
                                currentStatus === 'OFFLINE' ? "bg-red-500" :
                                    currentStatus.includes('Online') ? "bg-green-500" : "bg-gray-400"
                            )} />
                        </div>

                        <h4 className="text-xl font-bold text-gray-900 mb-1">{blurredNumber}</h4>

                        <div className="flex items-center gap-2 mb-4">
                            <span className={clsx(
                                "px-3 py-1 rounded-full text-sm font-medium",
                                currentStatus === 'OFFLINE' ? "bg-red-100 text-red-700" :
                                    currentStatus.includes('Online') ? "bg-green-100 text-green-700" :
                                        currentStatus === 'Standby' ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"
                            )}>
                                {currentStatus}
                            </span>
                        </div>

                        <div className="w-full pt-4 border-t border-gray-100 space-y-2">
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Wifi size={16} /> Official Status</span>
                                <span className="font-medium">{presence || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Smartphone size={16} /> Devices</span>
                                <span className="font-medium">{deviceCount || 0}</span>
                            </div>
                        </div>

                        {/* Device List */}
                        {devices.length > 0 && (
                            <div className="w-full pt-4 border-t border-gray-100 mt-4">
                                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Device States</h5>
                                <div className="space-y-1">
                                    {devices.map((device, idx) => (
                                        <div key={device.jid} className="flex items-center justify-between text-sm py-1">
                                            <div className="flex items-center gap-2">
                                                <Monitor size={14} className="text-gray-400" />
                                                <span className="text-gray-600">Device {idx + 1}</span>
                                            </div>
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                device.state === 'OFFLINE' ? "bg-red-100 text-red-700" :
                                                    device.state.includes('Online') ? "bg-green-100 text-green-700" :
                                                        device.state === 'Standby' ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"
                                            )}>
                                                {device.state}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Analytics Tabs */}
                    <div className="md:col-span-2">
                        {/* Tab Navigation */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
                            <div className="flex overflow-x-auto scrollbar-hide">
                                {tabs.map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={clsx(
                                                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
                                                activeTab === tab.id
                                                    ? "border-blue-600 text-blue-600 bg-blue-50"
                                                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                            )}
                                        >
                                            <Icon size={16} />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><Activity size={16} /> Current Avg RTT</div>
                                            <div className="text-2xl font-bold text-gray-900">{lastData?.avg.toFixed(0) || '-'} ms</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <div className="text-sm text-gray-500 mb-1">Median (50)</div>
                                            <div className="text-2xl font-bold text-gray-900">{lastData?.median.toFixed(0) || '-'} ms</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <div className="text-sm text-gray-500 mb-1">Threshold</div>
                                            <div className="text-2xl font-bold text-blue-600">{lastData?.threshold.toFixed(0) || '-'} ms</div>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="h-[300px]">
                                        <h5 className="text-sm font-medium text-gray-500 mb-4">RTT History & Threshold</h5>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={data}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis dataKey="timestamp" hide />
                                                <YAxis domain={['auto', 'auto']} />
                                                <Tooltip
                                                    labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} dot={false} name="Avg RTT" isAnimationActive={false} />
                                                <Line type="step" dataKey="threshold" stroke="#ef4444" strokeDasharray="5 5" dot={false} name="Threshold" isAnimationActive={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && <ActivityHeatmap jid={jid} />}
                            {activeTab === 'statistics' && <StatisticsPanel jid={jid} />}
                            {activeTab === 'network' && <NetworkGraph jid={jid} />}
                            {activeTab === 'behavioral' && <BehavioralInsightsPanel jid={jid} />}
                            {activeTab === 'timeline' && sessionId && <TimelineView sessionId={sessionId} />}
                            {activeTab === 'timeline' && !sessionId && (
                                <div className="text-center text-gray-500 py-8">Loading session data...</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
