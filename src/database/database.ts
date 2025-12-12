/**
 * SQLite Database Service
 * Handles all database operations for tracking data persistence
 */

import Database from 'better-sqlite3';
import path from 'path';
import { TrackingSession, RTTMeasurement, StateTransition, DeviceInfo } from './models';

export class TrackingDatabase {
    private db: Database.Database;
    private dbPath: string;

    constructor(dbPath?: string) {
        this.dbPath = dbPath || path.join(process.cwd(), 'tracking_data.db');
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL'); // Better concurrency
        this.initializeSchema();
    }

    private initializeSchema() {
        // Tracking Sessions
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tracking_sessions (
                id TEXT PRIMARY KEY,
                jid TEXT NOT NULL,
                contact_name TEXT,
                start_time INTEGER NOT NULL,
                end_time INTEGER,
                is_active INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_jid ON tracking_sessions(jid);
            CREATE INDEX IF NOT EXISTS idx_sessions_active ON tracking_sessions(is_active);
        `);

        // RTT Measurements
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS rtt_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                jid TEXT NOT NULL,
                device_jid TEXT NOT NULL,
                rtt REAL NOT NULL,
                timestamp INTEGER NOT NULL,
                state TEXT NOT NULL,
                network_type TEXT,
                network_quality INTEGER,
                avg_rtt REAL,
                median_rtt REAL,
                threshold REAL,
                FOREIGN KEY (session_id) REFERENCES tracking_sessions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_measurements_session ON rtt_measurements(session_id);
            CREATE INDEX IF NOT EXISTS idx_measurements_jid ON rtt_measurements(jid);
            CREATE INDEX IF NOT EXISTS idx_measurements_device ON rtt_measurements(device_jid);
            CREATE INDEX IF NOT EXISTS idx_measurements_timestamp ON rtt_measurements(timestamp);
            CREATE INDEX IF NOT EXISTS idx_measurements_state ON rtt_measurements(state);
        `);

        // State Transitions
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS state_transitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                jid TEXT NOT NULL,
                device_jid TEXT NOT NULL,
                from_state TEXT NOT NULL,
                to_state TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                duration INTEGER,
                FOREIGN KEY (session_id) REFERENCES tracking_sessions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_transitions_session ON state_transitions(session_id);
            CREATE INDEX IF NOT EXISTS idx_transitions_jid ON state_transitions(jid);
            CREATE INDEX IF NOT EXISTS idx_transitions_timestamp ON state_transitions(timestamp);
        `);

        // Device Info
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS device_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                jid TEXT NOT NULL,
                device_jid TEXT NOT NULL,
                device_type TEXT,
                first_seen INTEGER NOT NULL,
                last_seen INTEGER NOT NULL,
                total_measurements INTEGER DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES tracking_sessions(id),
                UNIQUE(session_id, device_jid)
            );

            CREATE INDEX IF NOT EXISTS idx_devices_session ON device_info(session_id);
            CREATE INDEX IF NOT EXISTS idx_devices_jid ON device_info(jid);
        `);
    }

    // Session Management
    createSession(session: TrackingSession): void {
        const stmt = this.db.prepare(`
            INSERT INTO tracking_sessions (id, jid, contact_name, start_time, end_time, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            session.id,
            session.jid,
            session.contactName || null,
            session.startTime,
            session.endTime || null,
            session.isActive ? 1 : 0,
            session.createdAt
        );
    }

    updateSession(sessionId: string, updates: Partial<TrackingSession>): void {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.endTime !== undefined) {
            fields.push('end_time = ?');
            values.push(updates.endTime);
        }
        if (updates.isActive !== undefined) {
            fields.push('is_active = ?');
            values.push(updates.isActive ? 1 : 0);
        }
        if (updates.contactName !== undefined) {
            fields.push('contact_name = ?');
            values.push(updates.contactName);
        }

        if (fields.length === 0) return;

        values.push(sessionId);
        const stmt = this.db.prepare(`
            UPDATE tracking_sessions 
            SET ${fields.join(', ')}
            WHERE id = ?
        `);
        stmt.run(...values);
    }

    getActiveSession(jid: string): TrackingSession | null {
        const stmt = this.db.prepare(`
            SELECT * FROM tracking_sessions 
            WHERE jid = ? AND is_active = 1 
            ORDER BY start_time DESC 
            LIMIT 1
        `);
        const row = stmt.get(jid) as any;
        if (!row) return null;

        return {
            id: row.id,
            jid: row.jid,
            contactName: row.contact_name,
            startTime: row.start_time,
            endTime: row.end_time,
            isActive: row.is_active === 1,
            createdAt: row.created_at
        };
    }

    getSessions(jid?: string, limit: number = 100): TrackingSession[] {
        let query = 'SELECT * FROM tracking_sessions';
        const params: any[] = [];

        if (jid) {
            query += ' WHERE jid = ?';
            params.push(jid);
        }

        query += ' ORDER BY start_time DESC LIMIT ?';
        params.push(limit);

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];

        return rows.map(row => ({
            id: row.id,
            jid: row.jid,
            contactName: row.contact_name,
            startTime: row.start_time,
            endTime: row.end_time,
            isActive: row.is_active === 1,
            createdAt: row.created_at
        }));
    }

    // RTT Measurements
    insertMeasurement(measurement: RTTMeasurement): void {
        const stmt = this.db.prepare(`
            INSERT INTO rtt_measurements 
            (session_id, jid, device_jid, rtt, timestamp, state, network_type, network_quality, avg_rtt, median_rtt, threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            measurement.sessionId,
            measurement.jid,
            measurement.deviceJid,
            measurement.rtt,
            measurement.timestamp,
            measurement.state,
            measurement.networkType || null,
            measurement.networkQuality || null,
            measurement.avgRtt || null,
            measurement.medianRtt || null,
            measurement.threshold || null
        );
    }

    getMeasurements(sessionId: string, startTime?: number, endTime?: number): RTTMeasurement[] {
        let query = 'SELECT * FROM rtt_measurements WHERE session_id = ?';
        const params: any[] = [sessionId];

        if (startTime) {
            query += ' AND timestamp >= ?';
            params.push(startTime);
        }
        if (endTime) {
            query += ' AND timestamp <= ?';
            params.push(endTime);
        }

        query += ' ORDER BY timestamp ASC';

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];

        return rows.map(row => ({
            id: row.id,
            sessionId: row.session_id,
            jid: row.jid,
            deviceJid: row.device_jid,
            rtt: row.rtt,
            timestamp: row.timestamp,
            state: row.state as any,
            networkType: row.network_type as any,
            networkQuality: row.network_quality,
            avgRtt: row.avg_rtt,
            medianRtt: row.median_rtt,
            threshold: row.threshold
        }));
    }

    getMeasurementsByJid(jid: string, startTime?: number, endTime?: number, limit: number = 10000): RTTMeasurement[] {
        let query = 'SELECT * FROM rtt_measurements WHERE jid = ?';
        const params: any[] = [jid];

        if (startTime) {
            query += ' AND timestamp >= ?';
            params.push(startTime);
        }
        if (endTime) {
            query += ' AND timestamp <= ?';
            params.push(endTime);
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params) as any[];

        return rows.map(row => ({
            id: row.id,
            sessionId: row.session_id,
            jid: row.jid,
            deviceJid: row.device_jid,
            rtt: row.rtt,
            timestamp: row.timestamp,
            state: row.state as any,
            networkType: row.network_type as any,
            networkQuality: row.network_quality,
            avgRtt: row.avg_rtt,
            medianRtt: row.median_rtt,
            threshold: row.threshold
        }));
    }

    // State Transitions
    insertTransition(transition: StateTransition): void {
        const stmt = this.db.prepare(`
            INSERT INTO state_transitions 
            (session_id, jid, device_jid, from_state, to_state, timestamp, duration)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            transition.sessionId,
            transition.jid,
            transition.deviceJid,
            transition.fromState,
            transition.toState,
            transition.timestamp,
            transition.duration || null
        );
    }

    getTransitions(sessionId: string): StateTransition[] {
        const stmt = this.db.prepare(`
            SELECT * FROM state_transitions 
            WHERE session_id = ? 
            ORDER BY timestamp ASC
        `);
        const rows = stmt.all(sessionId) as any[];

        return rows.map(row => ({
            id: row.id,
            sessionId: row.session_id,
            jid: row.jid,
            deviceJid: row.device_jid,
            fromState: row.from_state,
            toState: row.to_state,
            timestamp: row.timestamp,
            duration: row.duration
        }));
    }

    // Device Info
    upsertDevice(device: DeviceInfo): void {
        const stmt = this.db.prepare(`
            INSERT INTO device_info 
            (session_id, jid, device_jid, device_type, first_seen, last_seen, total_measurements)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id, device_jid) DO UPDATE SET
                last_seen = excluded.last_seen,
                total_measurements = excluded.total_measurements
        `);
        stmt.run(
            device.sessionId,
            device.jid,
            device.deviceJid,
            device.deviceType || null,
            device.firstSeen,
            device.lastSeen,
            device.totalMeasurements
        );
    }

    getDevices(sessionId: string): DeviceInfo[] {
        const stmt = this.db.prepare(`
            SELECT * FROM device_info 
            WHERE session_id = ? 
            ORDER BY first_seen ASC
        `);
        const rows = stmt.all(sessionId) as any[];

        return rows.map(row => ({
            id: row.id,
            sessionId: row.session_id,
            jid: row.jid,
            deviceJid: row.device_jid,
            deviceType: row.device_type,
            firstSeen: row.first_seen,
            lastSeen: row.last_seen,
            totalMeasurements: row.total_measurements
        }));
    }

    // Cleanup old data (optional retention policy)
    cleanupOldData(retentionDays: number = 30): number {
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        
        const deleteSessions = this.db.prepare(`
            DELETE FROM tracking_sessions 
            WHERE end_time IS NOT NULL AND end_time < ?
        `);
        const deletedSessions = deleteSessions.run(cutoffTime).changes;

        // Cascade deletes will handle related data if foreign keys are enabled
        return deletedSessions;
    }

    close(): void {
        this.db.close();
    }
}

// Singleton instance
let dbInstance: TrackingDatabase | null = null;

export function getDatabase(): TrackingDatabase {
    if (!dbInstance) {
        dbInstance = new TrackingDatabase();
    }
    return dbInstance;
}

