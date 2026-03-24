/**
 * src/services/document-analysis.service.js
 * Document-Aware Flow Navigation — AI-assisted intent extraction
 * EXTENSION ONLY: Does NOT modify any existing service or routing logic.
 */
const { query } = require('../config/db');
const { findRoute, getRoomDetails } = require('./indoor-navigation.service');

// ── Intent → Room Type Mapping ──────────────────────────────────
const INTENT_TO_ROOM_TYPE = {
    // Blood / Lab
    'blood test': 'lab',
    'lab test': 'lab',
    'laboratory': 'lab',
    'sample collection': 'lab',
    'pathology': 'lab',
    'haemogram': 'lab',
    'cbc': 'lab',
    'radiology': 'department',
    'x-ray': 'department',
    'xray': 'department',
    'mri': 'department',
    'ct scan': 'department',
    'ultrasound': 'department',
    'ecg': 'department',
    'echo': 'department',

    // Consultation / OPD
    'consultation': 'reception',
    'opd': 'reception',
    'outpatient': 'reception',
    'doctor': 'reception',
    'appointment': 'reception',
    'specialist': 'reception',

    // Medicine / Pharmacy
    'medicine': 'shop',
    'pharmacy': 'shop',
    'prescription': 'shop',
    'tablet': 'shop',
    'capsule': 'shop',
    'syrup': 'shop',
    'drug': 'shop',
    'medication': 'shop',

    // Emergency
    'emergency': 'emergency',
    'accident': 'emergency',
    'critical': 'emergency',
    // 'urgent': 'emergency', (Removed: often used as an adjective for labs/radiology)

    // Admission / Registration
    'admission': 'reception',
    'registration': 'reception',
    'token': 'reception',
    'reception': 'reception',
    'counter': 'reception',
    'billing': 'reception',
    'payment': 'reception',
    'discharge': 'reception',

    // Wards / Inpatient
    'ward': 'department',
    'icu': 'medical',
    'surgery': 'medical',
    'operation': 'medical',
    'bed': 'department',
    'inpatient': 'department',

    // Facilities
    'cafeteria': 'cafeteria',
    'canteen': 'cafeteria',
    'food': 'cafeteria',
    'restroom': 'restroom',
    'washroom': 'restroom',
    'toilet': 'restroom',
    'atm': 'atm',
    'cash': 'atm',
};

// Standard navigation flow — always start from entrance and end when steps done
const FLOW_PREFIX = ['entrance'];

/**
 * Extract text from uploaded file buffer
 * @param {Buffer} buffer 
 * @param {string} mimetype
 */
async function extractTextFromBuffer(buffer, mimetype) {
    if (mimetype === 'application/pdf') {
        try {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(buffer);
            return data.text;
        } catch (err) {
            console.warn('[DocAnalysis] PDF parse failed:', err.message);
            return '';
        }
    }

    // For images or plain text — convert buffer to string directly
    // (OCR is skipped for now; if a Gemini key is present, it will handle images)
    try {
        return buffer.toString('utf-8');
    } catch {
        return '';
    }
}

/**
 * Keyword-based intent extraction (primary, no external API needed)
 * @param {string} text
 * @returns {string[]} list of matched intents
 */
function extractIntentsFromText(text) {
    if (!text) return [];

    const lower = text.toLowerCase();
    const result = [];

    // Match intents and keep track of their first appearance index
    for (const keyword of Object.keys(INTENT_TO_ROOM_TYPE)) {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const match = regex.exec(lower);
        if (match) {
            result.push({
                intent: keyword,
                roomType: INTENT_TO_ROOM_TYPE[keyword],
                index: match.index
            });
        }
    }

    // Sort by appearance in text to follow the doctor's flow
    return result.sort((a, b) => a.index - b.index);
}

function mapIntentsToRoomTypes(intentsWithIndex) {
    const seenRoomTypes = new Set();
    const result = [];

    for (const item of intentsWithIndex) {
        if (!seenRoomTypes.has(item.roomType)) {
            seenRoomTypes.add(item.roomType);
            result.push(item);
        }
    }
    return result;
}

/**
 * Optional: If GEMINI_API_KEY is in env, use it for richer intent extraction
 * Falls back gracefully if not configured.
 */
async function extractIntentsWithAI(text) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are a hospital navigation assistant. Analyze the following medical document text and extract the list of services the patient needs.

Document text:
"""${text.slice(0, 2000)}"""

Return a JSON array of intent strings only, nothing else. Example: ["blood test", "consultation", "pharmacy"]
Only include intents from this list: blood test, lab test, consultation, opd, medicine, pharmacy, prescription, emergency, registration, admission, radiology, x-ray, ecg, ultrasound, mri, ward, cafeteria, restroom
`;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();
        const match = raw.match(/\[.*?\]/s);
        if (match) return JSON.parse(match[0]);
        return null;
    } catch (err) {
        console.warn('[DocAnalysis] Gemini AI extraction failed, using keyword fallback:', err.message);
        return null;
    }
}

/**
 * Map intents to room types with deduplication and ordering.
 * Accepts either:
 *  - Array of {intent, roomType, index} objects (from extractIntentsFromText)
 *  - Array of strings (from Gemini AI extraction)
 */
function mapIntentsToRoomTypes(intents) {
    const seen = new Set();
    const result = [];

    for (const item of intents) {
        // Support both object form {intent, roomType} and plain string form
        let keyword, roomType;
        if (typeof item === 'object' && item !== null) {
            keyword = item.intent;
            roomType = item.roomType || INTENT_TO_ROOM_TYPE[keyword];
        } else {
            keyword = item;
            roomType = INTENT_TO_ROOM_TYPE[keyword];
        }

        if (roomType && !seen.has(roomType)) {
            seen.add(roomType);
            result.push({ intent: keyword, roomType });
        }
    }
    return result;
}


/**
 * Find best matching room for a given type or intent in a building
 * PRIORITY: 1. Exact keyword match (e.g. "x-ray" in room keywords)
 *           2. Generic room type match (fallback)
 */
async function findRoomForType(buildingId, roomType, intent = null) {
    // Stage 1: Try keyword match if intent is provided
    if (intent) {
        const keywordMatch = await query(
            `SELECT r.id, r.name, r.type, f.floor_number
             FROM rooms r
             JOIN floors f ON r.floor_id = f.id
             JOIN buildings b ON f.building_id = b.id
             WHERE b.id = $1 AND $2 = ANY(r.keywords)
             ORDER BY r.is_landmark DESC, r.name
             LIMIT 1`,
            [buildingId, intent.toLowerCase()]
        );
        if (keywordMatch.rows.length > 0) return keywordMatch.rows[0];
    }

    // Stage 2: Fallback to generic room type
    const result = await query(
        `SELECT r.id, r.name, r.type, f.floor_number
         FROM rooms r
         JOIN floors f ON r.floor_id = f.id
         JOIN buildings b ON f.building_id = b.id
         WHERE b.id = $1 AND r.type = $2
         ORDER BY r.is_landmark DESC, r.name
         LIMIT 1`,
        [buildingId, roomType]
    );
    return result.rows[0] || null;
}

/**
 * Build a multi-step route through an ordered list of rooms
 */
async function buildMultiStepRoute(orderedRooms, accessibleOnly = false) {
    if (orderedRooms.length < 2) {
        return { found: false, message: 'Not enough rooms to build a route.' };
    }

    let combinedPath = [];
    let combinedDirections = [];
    let totalDistance = 0;
    const legs = [];

    for (let i = 0; i < orderedRooms.length - 1; i++) {
        const fromRoom = orderedRooms[i];
        const toRoom = orderedRooms[i + 1];

        try {
            // FIX: Pass boolean directly, not as an object
            const route = await findRoute(fromRoom.id, toRoom.id, accessibleOnly);
            if (route.found) {
                if (combinedPath.length > 0) {
                    combinedPath.push(...route.path.slice(1));
                } else {
                    combinedPath.push(...route.path);
                }
                totalDistance += route.distance;
                const offset = combinedDirections.length;
                combinedDirections.push(...route.directions.map(d => ({ ...d, step: d.step + offset })));
                legs.push({ from: fromRoom.name, to: toRoom.name, distance: route.distance, found: true });
            } else {
                legs.push({ from: fromRoom.name, to: toRoom.name, found: false, message: route.message });
            }
        } catch (err) {
            console.warn(`[DocAnalysis] Route leg failed ${fromRoom.name} → ${toRoom.name}:`, err.message);
            legs.push({ from: fromRoom.name, to: toRoom.name, found: false, message: err.message });
        }
    }

    if (combinedPath.length === 0) {
        return { found: false, message: 'Could not build any route from the detected intents.' };
    }

    return {
        found: true,
        totalDistance,
        path: combinedPath,
        directions: combinedDirections,
        legs,
        from: { name: orderedRooms[0].name, floor: orderedRooms[0].floor_number },
        to: { name: orderedRooms[orderedRooms.length - 1].name, floor: orderedRooms[orderedRooms.length - 1].floor_number },
    };
}

async function extractDynamicIntentsWithAI(text, category, rooms) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const roomNames = rooms.map(r => r.name).join(', ');

        const prompt = `
You are a smart navigation assistant for a ${category || 'building'}. Analyze the following document text and extract the list of exact destinations the user needs to visit.

Document text:
"""${text.slice(0, 2000)}"""

Available destinations in this building:
${roomNames}

Return a JSON array of the exact destination names from the available list that match the document. Do not include locations not in the list. Example: ["Hall 1", "Registration"]
`;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();
        const match = raw.match(/\[.*?\]/s);
        if (match) return JSON.parse(match[0]);
        return null;
    } catch (err) {
        console.warn('[DocAnalysis] Dynamic Gemini extraction failed:', err.message);
        return null;
    }
}

/**
 * Main entry point: analyze document buffer and return navigation plan
 */
async function analyzeDocumentAndRoute(fileBuffer, mimetype, buildingId, options = {}) {
    const { accessibleOnly = false } = options;

    // Step 1: Extract text
    const rawText = await extractTextFromBuffer(fileBuffer, mimetype);

    // Get building context to determine if it's hospital or generic
    const projectRes = await query(`
        SELECT p.category 
        FROM buildings b 
        JOIN projects p ON b.project_id = p.id 
        WHERE b.id = $1
    `, [buildingId]);
    const isHospital = !projectRes.rows[0] || projectRes.rows[0].category === 'hospital';

    let intents = null;
    let mappedRooms = [];
    const roomsToVisit = [];

    // Step 4: Find entrance first
    const entranceRoom = await findRoomForType(buildingId, 'entrance');
    if (entranceRoom) roomsToVisit.push(entranceRoom);

    if (isHospital) {
        // --- EXISTING HOSPITAL LOGIC ---
        if (rawText.length > 10) {
            intents = await extractIntentsWithAI(rawText);
        }
        if (!intents || intents.length === 0) {
            intents = extractIntentsFromText(rawText || '');
        }

        mappedRooms = mapIntentsToRoomTypes(intents);

        if (mappedRooms.length === 0) {
            return {
                found: false,
                message: 'No recognizable medical intents found in the document.',
                rawText: rawText.slice(0, 300),
                intents: [],
                mappedRooms: [],
                steps: [],
                route: null,
            };
        }

        for (const { intent, roomType } of mappedRooms) {
            const room = await findRoomForType(buildingId, roomType, intent);
            if (room && !roomsToVisit.find(r => r.id === room.id)) {
                roomsToVisit.push(room);
            }
        }
    } else {
        // --- NEW GENERIC BUILDING LOGIC (e.g., Bharat Mandapam) ---
        const roomsRes = await query(`
            SELECT r.id, r.name, r.type, r.keywords, f.floor_number
            FROM rooms r 
            JOIN floors f ON r.floor_id = f.id 
            WHERE f.building_id = $1
        `, [buildingId]);
        const allRooms = roomsRes.rows;

        if (rawText.length > 10) {
            intents = await extractDynamicIntentsWithAI(rawText, projectRes.rows[0]?.category, allRooms);
        }
        
        // Dynamic Keyword Fallback if AI fails or isn't configured
        if (!intents || intents.length === 0) {
            intents = [];
            const lowerText = rawText.toLowerCase();
            for (const r of allRooms) {
                if (lowerText.includes(r.name.toLowerCase())) {
                    if (!intents.includes(r.name)) intents.push(r.name);
                } else if (r.keywords) {
                    for (const kw of r.keywords) {
                        if (lowerText.includes(kw.toLowerCase())) {
                            if (!intents.includes(r.name)) intents.push(r.name); 
                            break;
                        }
                    }
                }
            }
        }

        if (!intents || intents.length === 0) {
            return {
                found: false, 
                message: 'No recognizable destinations found in the document for this location.',
                rawText: rawText.slice(0, 300), 
                intents: [], 
                mappedRooms: [], 
                steps: [], 
                route: null,
            };
        }

        for (const intentName of intents) {
            const room = allRooms.find(r => r.name === intentName);
            if (room && !roomsToVisit.find(r => r.id === room.id)) {
                mappedRooms.push({ intent: intentName, roomType: room.type });
                roomsToVisit.push(room);
            }
        }
    }

    // Step 5: Build the route
    const route = roomsToVisit.length >= 2
        ? await buildMultiStepRoute(roomsToVisit, accessibleOnly)
        : { found: false, message: 'Could not find enough rooms in this building for the detected intents.' };

    return {
        found: route.found,
        intents: intents || [],
        mappedRooms,
        steps: roomsToVisit.map(r => ({ id: r.id, name: r.name, type: r.type, floor: r.floor_number })),
        route: route.found ? route : null,
        message: route.found ? null : route.message,
    };
}

module.exports = { analyzeDocumentAndRoute };
