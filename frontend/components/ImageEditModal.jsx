/**
 * components/ImageEditModal.jsx
 *
 * Crop & Adjust modal for the feedback photo attachment.
 * Only used by app/feedback.jsx — no other feature is affected.
 *
 * Controls available:
 *  • Aspect-ratio crop presets  — Free | 1:1 | 4:3 | 16:9
 *  • Rotate                     — CCW 90° / CW 90°
 *  • Flip                       — Horizontal / Vertical
 *
 * On confirm the transforms are applied via expo-image-manipulator
 * and the processed URI is handed back to the parent via onConfirm(uri).
 */

import { useState, useCallback } from 'react';
import {
    Modal, View, Text, Image, TouchableOpacity,
    ActivityIndicator, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: SCREEN_W } = Dimensions.get('window');
const PREVIEW_SIZE = SCREEN_W - 48; // 24px padding each side

// ── Aspect ratio helpers ──────────────────────────────────────────────────────

const ASPECT_RATIOS = [
    { id: 'free',  label: 'Free' },
    { id: '1:1',   label: '1 : 1' },
    { id: '4:3',   label: '4 : 3' },
    { id: '16:9',  label: '16 : 9' },
];

/** Return { width, height } of the preview box for a given aspect ratio id */
function previewDims(ratioId) {
    switch (ratioId) {
        case '1:1':  return { width: PREVIEW_SIZE, height: PREVIEW_SIZE };
        case '4:3':  return { width: PREVIEW_SIZE, height: Math.round(PREVIEW_SIZE * 3 / 4) };
        case '16:9': return { width: PREVIEW_SIZE, height: Math.round(PREVIEW_SIZE * 9 / 16) };
        default:     return { width: PREVIEW_SIZE, height: Math.round(PREVIEW_SIZE * 3 / 4) };
    }
}

/**
 * Given original image dimensions and a chosen aspect ratio,
 * return the expo-image-manipulator crop action (centred).
 * Returns null for 'free' (no crop).
 */
function buildCropAction(origW, origH, ratioId) {
    if (ratioId === 'free') return null;

    let targetW, targetH;
    switch (ratioId) {
        case '1:1':
            targetW = targetH = Math.min(origW, origH);
            break;
        case '4:3':
            if (origW / origH > 4 / 3) {
                targetH = origH; targetW = Math.round(origH * 4 / 3);
            } else {
                targetW = origW; targetH = Math.round(origW * 3 / 4);
            }
            break;
        case '16:9':
            if (origW / origH > 16 / 9) {
                targetH = origH; targetW = Math.round(origH * 16 / 9);
            } else {
                targetW = origW; targetH = Math.round(origW * 9 / 16);
            }
            break;
        default:
            return null;
    }
    const originX = Math.round((origW - targetW) / 2);
    const originY = Math.round((origH - targetH) / 2);
    return { crop: { originX, originY, width: targetW, height: targetH } };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {boolean}  props.visible
 * @param {string}   props.uri          Original image URI from the picker
 * @param {number}   props.origWidth    Original image width in pixels
 * @param {number}   props.origHeight   Original image height in pixels
 * @param {function} props.onConfirm    Called with processed URI string
 * @param {function} props.onCancel
 */
export default function ImageEditModal({ visible, uri, origWidth, origHeight, onConfirm, onCancel }) {
    const [ratio, setRatio]         = useState('free');
    const [rotation, setRotation]   = useState(0);   // 0 | 90 | 180 | 270
    const [flipH, setFlipH]         = useState(false);
    const [flipV, setFlipV]         = useState(false);
    const [applying, setApplying]   = useState(false);

    // Reset state when modal opens fresh
    const handleOpen = useCallback(() => {
        setRatio('free');
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setApplying(false);
    }, []);

    const rotateCW  = () => setRotation(r => (r + 90)  % 360);
    const rotateCCW = () => setRotation(r => (r + 270) % 360);

    const handleConfirm = async () => {
        setApplying(true);
        try {
            const actions = [];

            // 1. Crop (before rotate so we work on original orientation)
            const cropAction = buildCropAction(origWidth || 1000, origHeight || 1000, ratio);
            if (cropAction) actions.push(cropAction);

            // 2. Rotate
            if (rotation !== 0) actions.push({ rotate: rotation });

            // 3. Flip
            if (flipH) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
            if (flipV) actions.push({ flip: ImageManipulator.FlipType.Vertical });

            const result = await ImageManipulator.manipulateAsync(
                uri,
                actions,
                { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
            );
            onConfirm(result.uri);
        } catch (e) {
            // Fallback: pass original URI unchanged
            onConfirm(uri);
        } finally {
            setApplying(false);
        }
    };

    const { width: pvW, height: pvH } = previewDims(ratio);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onShow={handleOpen}
        >
            <View style={styles.container}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
                        <Text style={styles.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Crop & Adjust</Text>
                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={applying}
                        style={[styles.headerBtn, styles.confirmBtn, applying && { opacity: 0.5 }]}
                    >
                        {applying
                            ? <ActivityIndicator size="small" color="#000" />
                            : <Text style={styles.confirmTxt}>Done</Text>
                        }
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                    {/* ── Image preview with crop overlay ── */}
                    <View style={[styles.previewWrap, { width: pvW, height: pvH }]}>
                        <Image
                            source={{ uri }}
                            style={[
                                styles.preview,
                                {
                                    transform: [
                                        { rotate: `${rotation}deg` },
                                        { scaleX: flipH ? -1 : 1 },
                                        { scaleY: flipV ? -1 : 1 },
                                    ],
                                },
                            ]}
                            resizeMode="cover"
                        />
                        {/* Corner indicators */}
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                    </View>

                    {/* ── Aspect Ratio ── */}
                    <Text style={styles.sectionLabel}>Aspect Ratio</Text>
                    <View style={styles.chipRow}>
                        {ASPECT_RATIOS.map(ar => (
                            <TouchableOpacity
                                key={ar.id}
                                style={[styles.chip, ratio === ar.id && styles.chipActive]}
                                onPress={() => setRatio(ar.id)}
                            >
                                <Text style={[styles.chipTxt, ratio === ar.id && styles.chipTxtActive]}>
                                    {ar.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Rotate ── */}
                    <Text style={styles.sectionLabel}>Rotate</Text>
                    <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.iconBtn} onPress={rotateCCW}>
                            <Ionicons name="refresh-outline" size={22} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
                            <Text style={styles.iconBtnTxt}>CCW</Text>
                        </TouchableOpacity>
                        <View style={styles.rotationBadge}>
                            <Text style={styles.rotationTxt}>{rotation}°</Text>
                        </View>
                        <TouchableOpacity style={styles.iconBtn} onPress={rotateCW}>
                            <Ionicons name="refresh-outline" size={22} color="#fff" />
                            <Text style={styles.iconBtnTxt}>CW</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── Flip ── */}
                    <Text style={styles.sectionLabel}>Flip</Text>
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.flipBtn, flipH && styles.flipBtnActive]}
                            onPress={() => setFlipH(v => !v)}
                        >
                            <Ionicons name="swap-horizontal-outline" size={20} color={flipH ? '#000' : '#fff'} />
                            <Text style={[styles.iconBtnTxt, flipH && { color: '#000' }]}>Horizontal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.flipBtn, flipV && styles.flipBtnActive]}
                            onPress={() => setFlipV(v => !v)}
                        >
                            <Ionicons name="swap-vertical-outline" size={20} color={flipV ? '#000' : '#fff'} />
                            <Text style={[styles.iconBtnTxt, flipV && { color: '#000' }]}>Vertical</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Reset */}
                    <TouchableOpacity
                        style={styles.resetBtn}
                        onPress={() => { setRatio('free'); setRotation(0); setFlipH(false); setFlipV(false); }}
                    >
                        <Ionicons name="reload-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.resetTxt}>Reset all</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#00D4AA';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D1117',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
    },
    headerBtn: { minWidth: 60 },
    title: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
    cancelTxt: { color: '#9CA3AF', fontSize: 15 },
    confirmBtn: {
        backgroundColor: ACCENT,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 6,
        alignItems: 'center',
    },
    confirmTxt: { color: '#000', fontWeight: '700', fontSize: 14 },

    // Body
    body: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 48, paddingTop: 24 },
    sectionLabel: {
        color: '#9CA3AF', fontSize: 11, fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: 1,
        alignSelf: 'flex-start', marginTop: 24, marginBottom: 12,
    },

    // Preview
    previewWrap: {
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: '#1F2937',
        position: 'relative',
    },
    preview: { width: '100%', height: '100%' },

    // Crop corner indicators
    corner: {
        position: 'absolute', width: 20, height: 20,
        borderColor: ACCENT, borderWidth: 3,
    },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

    // Aspect ratio chips
    chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    chip: {
        borderWidth: 1, borderColor: '#374151',
        borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
        backgroundColor: '#1F2937',
    },
    chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
    chipTxt: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
    chipTxtActive: { color: '#000' },

    // Rotate row
    btnRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#1F2937', borderRadius: 10,
        paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: '#374151',
    },
    iconBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
    rotationBadge: {
        backgroundColor: '#111827', borderRadius: 8,
        paddingHorizontal: 14, paddingVertical: 6,
        borderWidth: 1, borderColor: '#374151',
    },
    rotationTxt: { color: ACCENT, fontSize: 15, fontWeight: '700', minWidth: 40, textAlign: 'center' },

    // Flip row
    flipBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, backgroundColor: '#1F2937', borderRadius: 10,
        paddingVertical: 10, borderWidth: 1, borderColor: '#374151',
    },
    flipBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },

    // Reset
    resetBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 28, paddingVertical: 8, paddingHorizontal: 16,
    },
    resetTxt: { color: '#9CA3AF', fontSize: 13 },
});
