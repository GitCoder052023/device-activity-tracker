/**
 * Network Intelligence Module
 * Detects network type, quality, and performance metrics from RTT patterns
 */

export interface NetworkAnalysis {
    networkType: 'WiFi' | 'Mobile' | 'Unknown';
    networkQuality: number; // 0-100 score
    connectionStability: number; // 0-100 score
    latencyTrend: 'improving' | 'stable' | 'degrading';
    packetLossIndicator: number; // 0-100 (higher = more loss)
    connectionReliability: number; // 0-100
}

export class NetworkIntelligence {
    /**
     * Analyze RTT patterns to detect network type
     * WiFi typically has lower, more stable RTT
     * Mobile data has higher variance and occasional spikes
     */
    static detectNetworkType(rttHistory: number[]): 'WiFi' | 'Mobile' | 'Unknown' {
        if (rttHistory.length < 10) return 'Unknown';

        const sorted = [...rttHistory].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const variance = this.calculateVariance(rttHistory);

        // WiFi characteristics: lower median, lower variance, tighter IQR
        // Mobile characteristics: higher median, higher variance, wider IQR
        const isLikelyWiFi = median < 500 && variance < 50000 && iqr < 200;
        const isLikelyMobile = median > 800 || variance > 100000 || iqr > 400;

        if (isLikelyWiFi) return 'WiFi';
        if (isLikelyMobile) return 'Mobile';
        return 'Unknown';
    }

    /**
     * Calculate network quality score (0-100)
     * Based on RTT stability, latency, and consistency
     */
    static calculateNetworkQuality(rttHistory: number[]): number {
        if (rttHistory.length < 5) return 50; // Default if insufficient data

        const mean = rttHistory.reduce((a, b) => a + b, 0) / rttHistory.length;
        const variance = this.calculateVariance(rttHistory);
        const stdDev = Math.sqrt(variance);

        // Lower RTT = better (max score at 100ms, min at 2000ms)
        const latencyScore = Math.max(0, Math.min(100, 100 - ((mean - 100) / 19)));
        
        // Lower variance = better (max score at stdDev < 50, min at stdDev > 500)
        const stabilityScore = Math.max(0, Math.min(100, 100 - ((stdDev - 50) / 4.5)));

        // Combine scores (60% latency, 40% stability)
        return Math.round((latencyScore * 0.6) + (stabilityScore * 0.4));
    }

    /**
     * Calculate connection stability score (0-100)
     * Measures how consistent the connection is over time
     */
    static calculateConnectionStability(rttHistory: number[]): number {
        if (rttHistory.length < 10) return 50;

        // Calculate coefficient of variation (CV) - lower is more stable
        const mean = rttHistory.reduce((a, b) => a + b, 0) / rttHistory.length;
        const stdDev = Math.sqrt(this.calculateVariance(rttHistory));
        const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

        // Convert CV to stability score (CV < 10% = 100, CV > 50% = 0)
        return Math.max(0, Math.min(100, 100 - ((cv - 10) * 2.5)));
    }

    /**
     * Detect latency trend
     */
    static detectLatencyTrend(rttHistory: number[]): 'improving' | 'stable' | 'degrading' {
        if (rttHistory.length < 20) return 'stable';

        // Compare first half vs second half
        const mid = Math.floor(rttHistory.length / 2);
        const firstHalf = rttHistory.slice(0, mid);
        const secondHalf = rttHistory.slice(mid);

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        const change = ((secondAvg - firstAvg) / firstAvg) * 100;

        if (change < -10) return 'improving';
        if (change > 10) return 'degrading';
        return 'stable';
    }

    /**
     * Estimate packet loss indicator (0-100)
     * Higher values suggest more packet loss (timeouts, spikes)
     */
    static calculatePacketLossIndicator(rttHistory: number[], timeoutThreshold: number = 10000): number {
        if (rttHistory.length < 5) return 0;

        // Count extreme outliers (likely packet loss or retransmissions)
        const sorted = [...rttHistory].sort((a, b) => a - b);
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - sorted[Math.floor(sorted.length * 0.25)];
        const upperBound = q3 + (1.5 * iqr);

        const outliers = rttHistory.filter(rtt => rtt > upperBound || rtt > timeoutThreshold * 0.8);
        const outlierRate = (outliers.length / rttHistory.length) * 100;

        return Math.min(100, Math.round(outlierRate * 10)); // Scale to 0-100
    }

    /**
     * Calculate connection reliability (0-100)
     * Based on success rate and consistency
     */
    static calculateConnectionReliability(
        rttHistory: number[],
        totalProbes: number,
        timeoutThreshold: number = 10000
    ): number {
        if (totalProbes === 0) return 0;

        const successfulProbes = rttHistory.filter(rtt => rtt < timeoutThreshold).length;
        const successRate = (successfulProbes / totalProbes) * 100;

        // Also factor in consistency
        const stability = this.calculateConnectionStability(rttHistory);
        
        // Combine success rate (70%) and stability (30%)
        return Math.round((successRate * 0.7) + (stability * 0.3));
    }

    /**
     * Comprehensive network analysis
     */
    static analyzeNetwork(rttHistory: number[], totalProbes: number = 0): NetworkAnalysis {
        const networkType = this.detectNetworkType(rttHistory);
        const networkQuality = this.calculateNetworkQuality(rttHistory);
        const connectionStability = this.calculateConnectionStability(rttHistory);
        const latencyTrend = this.detectLatencyTrend(rttHistory);
        const packetLossIndicator = this.calculatePacketLossIndicator(rttHistory);
        const connectionReliability = this.calculateConnectionReliability(rttHistory, totalProbes);

        return {
            networkType,
            networkQuality,
            connectionStability,
            latencyTrend,
            packetLossIndicator,
            connectionReliability
        };
    }

    /**
     * Calculate variance
     */
    private static calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }
}

