/**
 * Advanced Analytics Module
 * Provides activity patterns, statistical analysis, and behavioral insights
 */

import { RTTMeasurement, StateTransition } from '../database/models';
import * as stats from 'simple-statistics';
import { format, getHours, getDay, startOfDay, differenceInMinutes, differenceInHours } from 'date-fns';

export interface ActivityPattern {
    hour: number;
    day: number; // 0 = Sunday, 6 = Saturday
    activityLevel: number; // 0-100
    avgRTT: number;
    measurementCount: number;
}

export interface DailyPattern {
    hour: number;
    avgActivity: number;
    avgRTT: number;
    onlinePercentage: number;
}

export interface WeeklyPattern {
    day: number;
    avgActivity: number;
    avgRTT: number;
    onlinePercentage: number;
}

export interface StatisticalAnalysis {
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
        online: number; // Total minutes
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

export interface BehavioralInsights {
    averageSessionLength: number; // minutes
    peakActivityTimes: { hour: number; activity: number }[];
    sleepWakeDetection: {
        typicalWakeTime?: number; // hour of day
        typicalSleepTime?: number; // hour of day
        sleepPatternDetected: boolean;
    };
    timezoneInference?: string;
    deviceUsagePatterns: {
        deviceJid: string;
        usagePercentage: number;
        avgRTT: number;
    }[];
    multiDeviceCoordination: {
        simultaneousDevices: number;
        avgSimultaneousDevices: number;
        coordinationScore: number; // 0-100
    };
    responseTimePatterns: {
        avgResponseTime: number;
        fastestResponseTime: number;
        slowestResponseTime: number;
        responseTimeConsistency: number; // 0-100
    };
}

export class AnalyticsEngine {
    /**
     * Analyze activity patterns (hourly and daily)
     */
    static analyzeActivityPatterns(measurements: RTTMeasurement[]): {
        daily: DailyPattern[];
        weekly: WeeklyPattern[];
        heatmap: ActivityPattern[];
    } {
        if (measurements.length === 0) {
            return { daily: [], weekly: [], heatmap: [] };
        }

        // Group by hour and day
        const hourMap = new Map<number, RTTMeasurement[]>();
        const dayMap = new Map<number, RTTMeasurement[]>();
        const heatmapData = new Map<string, RTTMeasurement[]>();

        measurements.forEach(m => {
            const date = new Date(m.timestamp);
            const hour = getHours(date);
            const day = getDay(date);
            const key = `${day}-${hour}`;

            // Hourly
            if (!hourMap.has(hour)) hourMap.set(hour, []);
            hourMap.get(hour)!.push(m);

            // Daily
            if (!dayMap.has(day)) dayMap.set(day, []);
            dayMap.get(day)!.push(m);

            // Heatmap
            if (!heatmapData.has(key)) heatmapData.set(key, []);
            heatmapData.get(key)!.push(m);
        });

        // Daily patterns (24 hours)
        const daily: DailyPattern[] = Array.from({ length: 24 }, (_, hour) => {
            const hourData = hourMap.get(hour) || [];
            const onlineCount = hourData.filter(m => m.state === 'Online').length;
            const avgRTT = hourData.length > 0
                ? hourData.reduce((sum, m) => sum + m.rtt, 0) / hourData.length
                : 0;

            return {
                hour,
                avgActivity: hourData.length,
                avgRTT,
                onlinePercentage: hourData.length > 0 ? (onlineCount / hourData.length) * 100 : 0
            };
        });

        // Weekly patterns (7 days)
        const weekly: WeeklyPattern[] = Array.from({ length: 7 }, (_, day) => {
            const dayData = dayMap.get(day) || [];
            const onlineCount = dayData.filter(m => m.state === 'Online').length;
            const avgRTT = dayData.length > 0
                ? dayData.reduce((sum, m) => sum + m.rtt, 0) / dayData.length
                : 0;

            return {
                day,
                avgActivity: dayData.length,
                avgRTT,
                onlinePercentage: dayData.length > 0 ? (onlineCount / dayData.length) * 100 : 0
            };
        });

        // Heatmap data
        const heatmap: ActivityPattern[] = Array.from(heatmapData.entries()).map(([key, data]) => {
            const [day, hour] = key.split('-').map(Number);
            const onlineCount = data.filter(m => m.state === 'Online').length;
            const activityLevel = (onlineCount / data.length) * 100;
            const avgRTT = data.reduce((sum, m) => sum + m.rtt, 0) / data.length;

            return {
                hour,
                day,
                activityLevel,
                avgRTT,
                measurementCount: data.length
            };
        });

        return { daily, weekly, heatmap };
    }

    /**
     * Statistical analysis of RTT and states
     */
    static performStatisticalAnalysis(
        measurements: RTTMeasurement[],
        transitions: StateTransition[]
    ): StatisticalAnalysis {
        if (measurements.length === 0) {
            return {
                rttDistribution: {
                    min: 0, max: 0, mean: 0, median: 0, stdDev: 0, q1: 0, q3: 0, iqr: 0
                },
                stateDurations: { online: 0, standby: 0, offline: 0 },
                transitionFrequency: { total: 0, onlineToStandby: 0, standbyToOnline: 0, toOffline: 0, fromOffline: 0 },
                networkQuality: { avgQuality: 0, avgStability: 0, avgReliability: 0 }
            };
        }

        const rtts = measurements.map(m => m.rtt);
        const sortedRtts = [...rtts].sort((a, b) => a - b);

        // RTT Distribution
        const rttDistribution = {
            min: stats.min(rtts),
            max: stats.max(rtts),
            mean: stats.mean(rtts),
            median: stats.median(rtts),
            stdDev: stats.standardDeviation(rtts),
            q1: stats.quantile(sortedRtts, 0.25),
            q3: stats.quantile(sortedRtts, 0.75),
            iqr: stats.quantile(sortedRtts, 0.75) - stats.quantile(sortedRtts, 0.25)
        };

        // State durations (calculate from transitions)
        const stateDurations = this.calculateStateDurations(measurements, transitions);

        // Transition frequency
        const transitionFrequency = {
            total: transitions.length,
            onlineToStandby: transitions.filter(t => t.fromState === 'Online' && t.toState === 'Standby').length,
            standbyToOnline: transitions.filter(t => t.fromState === 'Standby' && t.toState === 'Online').length,
            toOffline: transitions.filter(t => t.toState === 'OFFLINE').length,
            fromOffline: transitions.filter(t => t.fromState === 'OFFLINE').length
        };

        // Network quality metrics
        const networkQualities = measurements.filter(m => m.networkQuality !== null && m.networkQuality !== undefined)
            .map(m => m.networkQuality!);
        const networkQuality = {
            avgQuality: networkQualities.length > 0 ? stats.mean(networkQualities) : 0,
            avgStability: 0, // Would need to calculate from RTT variance
            avgReliability: 0 // Would need connection reliability data
        };

        return {
            rttDistribution,
            stateDurations,
            transitionFrequency,
            networkQuality
        };
    }

    /**
     * Calculate state durations from measurements and transitions
     */
    private static calculateStateDurations(
        measurements: RTTMeasurement[],
        transitions: StateTransition[]
    ): { online: number; standby: number; offline: number } {
        const durations = { online: 0, standby: 0, offline: 0 };

        // Group transitions by device
        const deviceTransitions = new Map<string, StateTransition[]>();
        transitions.forEach(t => {
            if (!deviceTransitions.has(t.deviceJid)) {
                deviceTransitions.set(t.deviceJid, []);
            }
            deviceTransitions.get(t.deviceJid)!.push(t);
        });

        // Calculate durations from transitions
        deviceTransitions.forEach(transitions => {
            const sorted = transitions.sort((a, b) => a.timestamp - b.timestamp);
            sorted.forEach(t => {
                if (t.duration) {
                    const minutes = t.duration / (60 * 1000);
                    if (t.fromState === 'Online') durations.online += minutes;
                    else if (t.fromState === 'Standby') durations.standby += minutes;
                    else if (t.fromState === 'OFFLINE') durations.offline += minutes;
                }
            });
        });

        return durations;
    }

    /**
     * Generate behavioral insights
     */
    static generateBehavioralInsights(
        measurements: RTTMeasurement[],
        transitions: StateTransition[],
        sessionStartTime: number,
        sessionEndTime?: number
    ): BehavioralInsights {
        if (measurements.length === 0) {
            return {
                averageSessionLength: 0,
                peakActivityTimes: [],
                sleepWakeDetection: { sleepPatternDetected: false },
                deviceUsagePatterns: [],
                multiDeviceCoordination: { simultaneousDevices: 0, avgSimultaneousDevices: 0, coordinationScore: 0 },
                responseTimePatterns: { avgResponseTime: 0, fastestResponseTime: 0, slowestResponseTime: 0, responseTimeConsistency: 0 }
            };
        }

        // Average session length
        const sessionDuration = sessionEndTime 
            ? differenceInMinutes(new Date(sessionEndTime), new Date(sessionStartTime))
            : differenceInMinutes(new Date(), new Date(sessionStartTime));

        // Peak activity times
        const { daily } = this.analyzeActivityPatterns(measurements);
        const peakActivityTimes = daily
            .map((d, hour) => ({ hour, activity: d.avgActivity }))
            .sort((a, b) => b.activity - a.activity)
            .slice(0, 5);

        // Sleep/wake detection
        const sleepWake = this.detectSleepWakePatterns(measurements);

        // Device usage patterns
        const deviceMap = new Map<string, RTTMeasurement[]>();
        measurements.forEach(m => {
            if (!deviceMap.has(m.deviceJid)) deviceMap.set(m.deviceJid, []);
            deviceMap.get(m.deviceJid)!.push(m);
        });

        const totalMeasurements = measurements.length;
        const deviceUsagePatterns = Array.from(deviceMap.entries()).map(([deviceJid, deviceMeasurements]) => {
            const avgRTT = deviceMeasurements.reduce((sum, m) => sum + m.rtt, 0) / deviceMeasurements.length;
            return {
                deviceJid,
                usagePercentage: (deviceMeasurements.length / totalMeasurements) * 100,
                avgRTT
            };
        });

        // Multi-device coordination
        const deviceTimestamps = new Map<string, Set<number>>();
        measurements.forEach(m => {
            if (!deviceTimestamps.has(m.deviceJid)) {
                deviceTimestamps.set(m.deviceJid, new Set());
            }
            // Round to nearest minute for coordination analysis
            const minute = Math.floor(m.timestamp / 60000) * 60000;
            deviceTimestamps.get(m.deviceJid)!.add(minute);
        });

        const allMinutes = new Set<number>();
        deviceTimestamps.forEach(timestamps => {
            timestamps.forEach(minute => allMinutes.add(minute));
        });

        let simultaneousCount = 0;
        allMinutes.forEach(minute => {
            let activeDevices = 0;
            deviceTimestamps.forEach(timestamps => {
                if (timestamps.has(minute)) activeDevices++;
            });
            if (activeDevices > 1) simultaneousCount++;
        });

        const avgSimultaneousDevices = allMinutes.size > 0
            ? Array.from(allMinutes).reduce((sum, minute) => {
                let activeDevices = 0;
                deviceTimestamps.forEach(timestamps => {
                    if (timestamps.has(minute)) activeDevices++;
                });
                return sum + activeDevices;
            }, 0) / allMinutes.size
            : 1;

        const coordinationScore = allMinutes.size > 0
            ? (simultaneousCount / allMinutes.size) * 100
            : 0;

        // Response time patterns
        const onlineMeasurements = measurements.filter(m => m.state === 'Online');
        const responseTimes = onlineMeasurements.map(m => m.rtt);
        const avgResponseTime = responseTimes.length > 0 ? stats.mean(responseTimes) : 0;
        const fastestResponseTime = responseTimes.length > 0 ? stats.min(responseTimes) : 0;
        const slowestResponseTime = responseTimes.length > 0 ? stats.max(responseTimes) : 0;
        const responseTimeStdDev = responseTimes.length > 0 ? stats.standardDeviation(responseTimes) : 0;
        const responseTimeConsistency = avgResponseTime > 0
            ? Math.max(0, Math.min(100, 100 - ((responseTimeStdDev / avgResponseTime) * 100)))
            : 0;

        return {
            averageSessionLength: sessionDuration,
            peakActivityTimes,
            sleepWakeDetection: sleepWake,
            deviceUsagePatterns,
            multiDeviceCoordination: {
                simultaneousDevices: deviceMap.size,
                avgSimultaneousDevices,
                coordinationScore
            },
            responseTimePatterns: {
                avgResponseTime,
                fastestResponseTime,
                slowestResponseTime,
                responseTimeConsistency
            }
        };
    }

    /**
     * Detect sleep/wake patterns
     */
    private static detectSleepWakePatterns(measurements: RTTMeasurement[]): {
        typicalWakeTime?: number;
        typicalSleepTime?: number;
        sleepPatternDetected: boolean;
    } {
        if (measurements.length < 100) {
            return { sleepPatternDetected: false };
        }

        // Group by hour and calculate activity
        const hourActivity = new Map<number, number>();
        measurements.forEach(m => {
            const hour = getHours(new Date(m.timestamp));
            hourActivity.set(hour, (hourActivity.get(hour) || 0) + 1);
        });

        // Find hours with lowest activity (likely sleep)
        const sortedHours = Array.from(hourActivity.entries())
            .sort((a, b) => a[1] - b[1]);

        const lowActivityHours = sortedHours.slice(0, 6).map(([hour]) => hour);
        
        // Find typical wake time (first hour with significant activity after low activity period)
        const wakeTime = this.findWakeTime(hourActivity, lowActivityHours);
        const sleepTime = this.findSleepTime(hourActivity, lowActivityHours);

        return {
            typicalWakeTime: wakeTime,
            typicalSleepTime: sleepTime,
            sleepPatternDetected: wakeTime !== undefined || sleepTime !== undefined
        };
    }

    private static findWakeTime(hourActivity: Map<number, number>, lowActivityHours: number[]): number | undefined {
        const avgActivity = Array.from(hourActivity.values()).reduce((a, b) => a + b, 0) / hourActivity.size;
        
        // Look for first hour after low activity period with activity > 1.5x average
        for (let hour = 0; hour < 24; hour++) {
            if (lowActivityHours.includes(hour)) continue;
            const activity = hourActivity.get(hour) || 0;
            if (activity > avgActivity * 1.5) {
                return hour;
            }
        }
        return undefined;
    }

    private static findSleepTime(hourActivity: Map<number, number>, lowActivityHours: number[]): number | undefined {
        const avgActivity = Array.from(hourActivity.values()).reduce((a, b) => a + b, 0) / hourActivity.size;
        
        // Look for first hour with activity < 0.5x average after high activity period
        for (let hour = 0; hour < 24; hour++) {
            if (lowActivityHours.includes(hour)) {
                const activity = hourActivity.get(hour) || 0;
                if (activity < avgActivity * 0.5) {
                    return hour;
                }
            }
        }
        return undefined;
    }
}

