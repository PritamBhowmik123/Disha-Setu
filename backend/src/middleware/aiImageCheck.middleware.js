/**
 * src/middleware/aiImageCheck.middleware.js
 *
 * Server-side AI-generated image detection middleware.
 * Runs AFTER multer (so req.file.buffer is available) but BEFORE the controller.
 *
 * Checks performed on the raw image buffer:
 *  1. JPEG EXIF marker scan  — real camera shots have FFE1 (APP1/EXIF) marker
 *  2. Byte entropy heuristic — AI images have very uniform pixel distributions
 *  3. PNG metadata scan      — checks for camera-specific PNG tEXt chunks
 *
 * If no file is uploaded → skip check (photo is optional).
 * If check throws → fail-safe, pass through (do not block submission).
 *
 * Responses:
 *   Suspicious → 400 { error: 'AI_GENERATED_IMAGE', message: '...' }
 *   OK         → calls next()
 */

'use strict';

// ─── JPEG EXIF marker constants ──────────────────────────────────────────────
const JPEG_SOI    = [0xFF, 0xD8];      // Start of JPEG file
const JPEG_APP1   = [0xFF, 0xE1];      // APP1 segment (contains EXIF)
const EXIF_HEADER = Buffer.from('Exif\x00\x00'); // EXIF identifier within APP1

// ─── PNG signature ───────────────────────────────────────────────────────────
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// ─── Entropy threshold ───────────────────────────────────────────────────────
// Real photographs have higher byte-level entropy than flat AI renders.
// This is a rough but fast proxy. Value tuned empirically.
const MIN_ENTROPY_BITS = 6.5; // bits per byte — below this = suspiciously uniform

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if a JPEG buffer contains an APP1/EXIF segment with actual camera data.
 * Scans the first 64 KB to find the EXIF marker (FFE1) and the "Exif\0\0" header.
 *
 * @param {Buffer} buf
 * @returns {boolean}
 */
function jpegHasExif(buf) {
    if (buf.length < 4) return false;
    if (buf[0] !== JPEG_SOI[0] || buf[1] !== JPEG_SOI[1]) return false;

    // Scan marker segments
    let offset = 2;
    const scanLimit = Math.min(buf.length, 65536); // scan max 64 KB

    while (offset + 4 < scanLimit) {
        if (buf[offset] !== 0xFF) break; // lost sync

        const marker = buf[offset + 1];
        const segLen = buf.readUInt16BE(offset + 2); // segment length (includes the 2-byte length field itself)

        if (marker === 0xE1) {
            // APP1 segment — check for EXIF header
            if (offset + 10 < buf.length) {
                const exifHeader = buf.slice(offset + 4, offset + 10);
                if (exifHeader.equals(EXIF_HEADER)) {
                    return true; // found genuine EXIF
                }
            }
        }

        // Move to next segment
        offset += 2 + segLen;

        // Stop once we pass the header region (SOS marker = 0xDA = image data starts)
        if (marker === 0xDA) break;
    }

    return false;
}

/**
 * Calculate Shannon entropy of the byte distribution of a sample of the buffer.
 * Uses every 4th byte to keep it fast on large images.
 *
 * @param {Buffer} buf
 * @returns {number} entropy in bits per byte (0–8)
 */
function sampleEntropy(buf) {
    const freq = new Uint32Array(256);
    const step = 4; // sample every 4th byte
    let count = 0;

    for (let i = 0; i < buf.length; i += step) {
        freq[buf[i]]++;
        count++;
    }

    if (count === 0) return 8; // empty buffer → assume high entropy (safe)

    let entropy = 0;
    for (let b = 0; b < 256; b++) {
        if (freq[b] > 0) {
            const p = freq[b] / count;
            entropy -= p * Math.log2(p);
        }
    }

    return entropy;
}

/**
 * Check if a PNG buffer contains camera-origin metadata.
 * Real device screenshots and photos occasionally have tEXt chunks indicating origin.
 * AI images typically have no metadata at all.
 *
 * @param {Buffer} buf
 * @returns {boolean} true if looks like a real photo PNG
 */
function pngHasCameraHint(buf) {
    if (buf.length < PNG_SIG.length) return false;
    if (!buf.slice(0, 8).equals(PNG_SIG)) return false;

    // Scan for tEXt chunks; camera/device tools often write "Software", "Author", "Creation Time"
    const text = buf.toString('latin1', 8, Math.min(buf.length, 4096));
    return /Software|Author|Creation Time|Camera|Copyright|GPS/i.test(text);
}

// ─── Main middleware ──────────────────────────────────────────────────────────

/**
 * Express middleware: aiImageCheck
 *
 * Usage (in route file, after upload.single('photo')):
 *   router.post('/', optionalAuth, upload.single('photo'), aiImageCheck, submitFeedback);
 */
const aiImageCheck = (req, res, next) => {
    // No file uploaded → photo is optional, skip check
    if (!req.file || !req.file.buffer) {
        return next();
    }

    try {
        const buf = req.file.buffer;
        const mime = (req.file.mimetype || '').toLowerCase();
        let suspicionScore = 0;

        // ── Check 1: JPEG EXIF ─────────────────────────────────────────────
        if (mime === 'image/jpeg' || mime === 'image/jpg') {
            if (!jpegHasExif(buf)) {
                suspicionScore += 2; // JPEG with no EXIF is very suspicious
            }
        }

        // ── Check 2: PNG with no camera metadata ───────────────────────────
        if (mime === 'image/png') {
            if (!pngHasCameraHint(buf)) {
                suspicionScore += 1; // PNG uploads are often AI / screenshots
            }
        }

        // ── Check 3: Byte entropy ──────────────────────────────────────────
        // Only run entropy check if already suspicious (avoid unnecessary work)
        if (suspicionScore >= 1) {
            const entropy = sampleEntropy(buf);
            if (entropy < MIN_ENTROPY_BITS) {
                suspicionScore += 2; // Abnormally uniform pixel distribution
            }
        }

        // ── Decision ───────────────────────────────────────────────────────
        if (suspicionScore >= 3) {
            return res.status(400).json({
                error: 'AI_GENERATED_IMAGE',
                message: 'This image appears to be AI-generated. Please upload a real photo.',
            });
        }

        // Passes → continue to controller
        return next();
    } catch (_err) {
        // Any unexpected error → fail-safe, allow submission
        console.warn('[aiImageCheck] Detection error (fail-safe: allowing):', _err.message);
        return next();
    }
};

module.exports = aiImageCheck;
