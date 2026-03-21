// Quick verification that the new mapIntentsToRoomTypes handles both formats
const INTENT_TO_ROOM_TYPE = {
    'blood test': 'lab', 'laboratory': 'lab', 'cbc': 'lab',
    'radiology': 'department', 'x-ray': 'department', 'mri': 'department', 'ultrasound': 'department',
    'opd': 'reception', 'doctor': 'reception', 'pharmacy': 'shop', 'prescription': 'shop',
    'emergency': 'emergency', 'registration': 'reception', 'token': 'reception', 'reception': 'reception', 'counter': 'reception',
};

function mapIntentsToRoomTypes(intents) {
    const seen = new Set();
    const result = [];
    for (const item of intents) {
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

// Test 1: Object format (new extractIntentsFromText output)
const objectInput = [
    { intent: 'blood test', roomType: 'lab', index: 10 },
    { intent: 'radiology', roomType: 'department', index: 50 },
    { intent: 'pharmacy', roomType: 'shop', index: 80 },
    { intent: 'opd', roomType: 'reception', index: 120 },
    { intent: 'emergency', roomType: 'emergency', index: 5 },
];

console.log('=== Test 1: Object format ===');
const r1 = mapIntentsToRoomTypes(objectInput);
r1.forEach(r => console.log(`  ${r.intent} => ${r.roomType}`));
console.log(`  Total mapped: ${r1.length} (expected 5)`);

// Test 2: String format (Gemini AI output)
const stringInput = ['blood test', 'consultation', 'pharmacy', 'unknown-intent'];
console.log('\n=== Test 2: String format ===');
const r2 = mapIntentsToRoomTypes(stringInput);
r2.forEach(r => console.log(`  ${r.intent} => ${r.roomType}`));
console.log(`  Total mapped: ${r2.length} (expected 3, unknown-intent should be dropped)`);
