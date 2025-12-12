/**
 * Database Models and Types
 */

export interface TrackingSession {
    id: string;
    jid: string;
    contactName?: string;
    startTime: number;
    endTime?: number;
    isActive: boolean;
    createdAt: number;
}

export interface RTTMeasurement {
    id?: number;
    sessionId: string;
    jid: string;
    deviceJid: string;
    rtt: number;
    timestamp: number;
    state: 'Online' | 'Standby' | 'OFFLINE' | 'Calibrating';
    networkType?: 'WiFi' | 'Mobile' | 'Unknown';
    networkQuality?: number; // 0-100 score
    avgRtt?: number;
    medianRtt?: number;
    threshold?: number;
}

export interface StateTransition {
    id?: number;
    sessionId: string;
    jid: string;
    deviceJid: string;
    fromState: string;
    toState: string;
    timestamp: number;
    duration?: number; // Duration in previous state (ms)
}

export interface DeviceInfo {
    id?: number;
    sessionId: string;
    jid: string;
    deviceJid: string;
    deviceType?: string;
    firstSeen: number;
    lastSeen: number;
    totalMeasurements: number;
}

