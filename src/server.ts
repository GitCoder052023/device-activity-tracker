/**
 * Device Activity Tracker - Web Server
 *
 * HTTP server with Socket.IO for real-time tracking visualization.
 * Provides REST API and WebSocket interface for the React frontend.
 *
 * For educational and research purposes only.
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { pino } from 'pino';
import { Boom } from '@hapi/boom';
import { WhatsAppTracker } from './tracker';
import { getDatabase } from './database/database';
import { AnalyticsEngine } from './analytics/analytics';
import { NetworkIntelligence } from './analytics/networkIntelligence';

const app = express();
app.use(cors());
app.use(express.json());

const db = getDatabase();

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for dev
        methods: ["GET", "POST"]
    }
});

let sock: any;
let isWhatsAppConnected = false;
const trackers: Map<string, WhatsAppTracker> = new Map(); // JID -> Tracker instance

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'debug' }),
        markOnlineOnConnect: true,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('QR Code generated');
            io.emit('qr', qr);
        }

        if (connection === 'close') {
            isWhatsAppConnected = false;
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed, reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            isWhatsAppConnected = true;
            console.log('opened connection');
            io.emit('connection-open');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }: any) => {
        console.log(`[SESSION] History sync - Chats: ${chats.length}, Contacts: ${contacts.length}, Messages: ${messages.length}, Latest: ${isLatest}`);
    });

    sock.ev.on('messages.update', (updates: any) => {
        for (const update of updates) {
            console.log(`[MSG UPDATE] JID: ${update.key.remoteJid}, ID: ${update.key.id}, Status: ${update.update.status}, FromMe: ${update.key.fromMe}`);
        }
    });
}

connectToWhatsApp();

io.on('connection', (socket) => {
    console.log('Client connected');

    if (isWhatsAppConnected) {
        socket.emit('connection-open');
    }

    socket.emit('tracked-contacts', Array.from(trackers.keys()));

    socket.on('add-contact', async (number: string) => {
        console.log(`Request to track: ${number}`);
        const cleanNumber = number.replace(/\D/g, '');
        const targetJid = cleanNumber + '@s.whatsapp.net';

        if (trackers.has(targetJid)) {
            socket.emit('error', { jid: targetJid, message: 'Already tracking this contact' });
            return;
        }

        try {
            const results = await sock.onWhatsApp(targetJid);
            const result = results?.[0];

            if (result?.exists) {
                const tracker = new WhatsAppTracker(sock, result.jid);
                trackers.set(result.jid, tracker);

                tracker.onUpdate = (data) => {
                    io.emit('tracker-update', {
                        jid: result.jid,
                        ...data
                    });
                };

                tracker.startTracking();

                const ppUrl = await tracker.getProfilePicture();

                let contactName = cleanNumber;
                try {
                    const contactInfo = await sock.onWhatsApp(result.jid);
                    if (contactInfo && contactInfo[0]?.notify) {
                        contactName = contactInfo[0].notify;
                    }
                } catch (err) {
                    console.log('[NAME] Could not fetch contact name, using number');
                }

                socket.emit('contact-added', { jid: result.jid, number: cleanNumber });

                io.emit('profile-pic', { jid: result.jid, url: ppUrl });
                io.emit('contact-name', { jid: result.jid, name: contactName });
            } else {
                socket.emit('error', { jid: targetJid, message: 'Number not on WhatsApp' });
            }
        } catch (err) {
            console.error(err);
            socket.emit('error', { jid: targetJid, message: 'Verification failed' });
        }
    });

    socket.on('remove-contact', (jid: string) => {
        console.log(`Request to stop tracking: ${jid}`);
        const tracker = trackers.get(jid);
        if (tracker) {
            tracker.stopTracking();
            trackers.delete(jid);
            socket.emit('contact-removed', jid);
        }
    });
});

// Analytics API Endpoints
app.get('/api/analytics/activity-patterns/:jid', (req, res) => {
    try {
        const { jid } = req.params;
        const { startTime, endTime } = req.query;
        
        const start = startTime ? parseInt(startTime as string) : undefined;
        const end = endTime ? parseInt(endTime as string) : undefined;
        
        const measurements = db.getMeasurementsByJid(jid, start, end);
        const patterns = AnalyticsEngine.analyzeActivityPatterns(measurements);
        
        res.json(patterns);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/statistics/:jid', (req, res) => {
    try {
        const { jid } = req.params;
        const { startTime, endTime } = req.query;
        
        const start = startTime ? parseInt(startTime as string) : undefined;
        const end = endTime ? parseInt(endTime as string) : undefined;
        
        const measurements = db.getMeasurementsByJid(jid, start, end);
        const sessions = db.getSessions(jid);
        
        // Get transitions for all sessions
        const allTransitions = sessions.flatMap(session => db.getTransitions(session.id));
        
        const statistics = AnalyticsEngine.performStatisticalAnalysis(measurements, allTransitions);
        
        res.json(statistics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/behavioral-insights/:jid', (req, res) => {
    try {
        const { jid } = req.params;
        const sessions = db.getSessions(jid, 1);
        
        if (sessions.length === 0) {
            return res.json({
                averageSessionLength: 0,
                peakActivityTimes: [],
                sleepWakeDetection: { sleepPatternDetected: false },
                deviceUsagePatterns: [],
                multiDeviceCoordination: { simultaneousDevices: 0, avgSimultaneousDevices: 0, coordinationScore: 0 },
                responseTimePatterns: { avgResponseTime: 0, fastestResponseTime: 0, slowestResponseTime: 0, responseTimeConsistency: 0 }
            });
        }
        
        const session = sessions[0];
        const measurements = db.getMeasurements(session.id);
        const transitions = db.getTransitions(session.id);
        
        const insights = AnalyticsEngine.generateBehavioralInsights(
            measurements,
            transitions,
            session.startTime,
            session.endTime
        );
        
        res.json(insights);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/network-analysis/:jid', (req, res) => {
    try {
        const { jid } = req.params;
        const { startTime, endTime } = req.query;
        
        const start = startTime ? parseInt(startTime as string) : undefined;
        const end = endTime ? parseInt(endTime as string) : undefined;
        
        const measurements = db.getMeasurementsByJid(jid, start, end);
        const rttHistory = measurements.map(m => m.rtt);
        
        const analysis = NetworkIntelligence.analyzeNetwork(rttHistory, measurements.length);
        
        res.json(analysis);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sessions/:jid', (req, res) => {
    try {
        const { jid } = req.params;
        const { limit } = req.query;
        const sessions = db.getSessions(jid, limit ? parseInt(limit as string) : 100);
        res.json(sessions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/measurements/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const { startTime, endTime } = req.query;
        
        const start = startTime ? parseInt(startTime as string) : undefined;
        const end = endTime ? parseInt(endTime as string) : undefined;
        
        const measurements = db.getMeasurements(sessionId, start, end);
        res.json(measurements);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/transitions/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const transitions = db.getTransitions(sessionId);
        res.json(transitions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/devices/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const devices = db.getDevices(sessionId);
        res.json(devices);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
