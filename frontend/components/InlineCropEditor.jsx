/**
 * components/InlineCropEditor.jsx
 * Inline (same-screen) crop & adjust component for feedback photo.
 * Renders inside the ScrollView — no separate page/modal.
 *
 * onConfirm({ uri, width, height }) — called with processed image info
 * onCancel()                        — called when user cancels
 */
import { useState, useRef } from 'react';
import {
    View, Image, Text, TouchableOpacity,
    PanResponder, ActivityIndicator, StyleSheet, Dimensions,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_IMG_W = SCREEN_W - 48;   // 24px padding each side
const MAX_IMG_H = 220;              // max preview height — keeps controls visible
const MIN_BOX   = 0.1;            // minimum crop dimension (normalized)
const HANDLE    = 28;              // handle touch target size

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const ASPECT_RATIOS = [
    { id: 'free', label: 'Free' },
    { id: '1:1',  label: '1:1'  },
    { id: '4:3',  label: '4:3'  },
    { id: '16:9', label: '16:9' },
];

export default function InlineCropEditor({ uri, origWidth, origHeight, onConfirm, onCancel }) {
    const naturalH = origWidth > 0 ? Math.round(MAX_IMG_W * origHeight / origWidth) : Math.round(MAX_IMG_W * 0.75);
    // Scale down if too tall so controls stay visible without scrolling
    const scale = naturalH > MAX_IMG_H ? MAX_IMG_H / naturalH : 1;
    const IMG_W  = Math.round(MAX_IMG_W * scale);
    const imgH   = Math.round(naturalH  * scale);

    // cropBox: normalized [0,1] — {x, y, w, h}
    const boxRef   = useRef({ x: 0, y: 0, w: 1, h: 1 });
    const startRef = useRef({ x: 0, y: 0, w: 1, h: 1 });
    const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 1, h: 1 });

    const [ratio,    setRatio]    = useState('free');
    const [rotation, setRotation] = useState(0);
    const [flipH,    setFlipH]    = useState(false);
    const [flipV,    setFlipV]    = useState(false);
    const [applying, setApplying] = useState(false);

    // Sync state + ref together
    const setBox = (b) => { boxRef.current = b; setCropBox({ ...b }); };

    // Apply aspect-ratio preset (centered)
    const applyRatio = (ratioId) => {
        setRatio(ratioId);
        if (ratioId === 'free') { setBox({ x: 0, y: 0, w: 1, h: 1 }); return; }
        let tw = origWidth, th = origHeight;
        if (ratioId === '1:1') { const s = Math.min(tw, th); tw = s; th = s; }
        else if (ratioId === '4:3') {
            if (tw / th > 4 / 3) { th = origHeight; tw = Math.round(th * 4 / 3); }
            else { tw = origWidth; th = Math.round(tw * 3 / 4); }
        } else if (ratioId === '16:9') {
            if (tw / th > 16 / 9) { th = origHeight; tw = Math.round(th * 16 / 9); }
            else { tw = origWidth; th = Math.round(tw * 9 / 16); }
        }
        const nw = tw / origWidth, nh = th / origHeight;
        setBox({ x: (1 - nw) / 2, y: (1 - nh) / 2, w: nw, h: nh });
    };

    // Build a PanResponder for one corner
    const makePan = (corner) => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  () => true,
        onPanResponderGrant: () => { startRef.current = { ...boxRef.current }; },
        onPanResponderMove: (_, g) => {
            const dx = g.dx / IMG_W, dy = g.dy / imgH;
            const s  = startRef.current;
            let { x, y, w, h } = s;
            if (corner === 'TL') {
                x = clamp(s.x + dx, 0, s.x + s.w - MIN_BOX);
                y = clamp(s.y + dy, 0, s.y + s.h - MIN_BOX);
                w = s.x + s.w - x; h = s.y + s.h - y;
            } else if (corner === 'TR') {
                y = clamp(s.y + dy, 0, s.y + s.h - MIN_BOX);
                h = s.y + s.h - y;
                w = clamp(s.w + dx, MIN_BOX, 1 - s.x);
            } else if (corner === 'BL') {
                x = clamp(s.x + dx, 0, s.x + s.w - MIN_BOX);
                w = s.x + s.w - x;
                h = clamp(s.h + dy, MIN_BOX, 1 - s.y);
            } else { // BR
                w = clamp(s.w + dx, MIN_BOX, 1 - s.x);
                h = clamp(s.h + dy, MIN_BOX, 1 - s.y);
            }
            setBox({ x, y, w, h });
        },
    });

    const panTL = useRef(makePan('TL')).current;
    const panTR = useRef(makePan('TR')).current;
    const panBL = useRef(makePan('BL')).current;
    const panBR = useRef(makePan('BR')).current;

    const handleConfirm = async () => {
        setApplying(true);
        try {
            const actions = [];
            const { x, y, w, h } = boxRef.current;
            const isFullBox = x === 0 && y === 0 && w === 1 && h === 1;
            if (!isFullBox) {
                actions.push({ crop: {
                    originX: Math.round(x * origWidth),
                    originY: Math.round(y * origHeight),
                    width:   Math.max(1, Math.round(w * origWidth)),
                    height:  Math.max(1, Math.round(h * origHeight)),
                }});
            }
            if (rotation !== 0)  actions.push({ rotate: rotation });
            if (flipH) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
            if (flipV) actions.push({ flip: ImageManipulator.FlipType.Vertical });

            const result = await ImageManipulator.manipulateAsync(
                uri, actions,
                { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
            );
            onConfirm({ uri: result.uri, width: result.width, height: result.height });
        } catch (_) {
            onConfirm({ uri, width: origWidth, height: origHeight });
        } finally {
            setApplying(false);
        }
    };

    // Pixel coords for overlay
    const bx = cropBox.x * IMG_W,  by = cropBox.y * imgH;
    const bw = cropBox.w * IMG_W,  bh = cropBox.h * imgH;
    const hh = HANDLE / 2;

    return (
        <View style={s.root}>
            {/* Action row */}
            <View style={s.actions}>
                <TouchableOpacity onPress={onCancel} style={s.cancelBtn}>
                    <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <Text style={s.title}>Crop & Adjust</Text>
                <TouchableOpacity onPress={handleConfirm} disabled={applying}
                    style={[s.doneBtn, applying && { opacity: 0.5 }]}>
                    {applying
                        ? <ActivityIndicator size="small" color="#000" />
                        : <Text style={s.doneTxt}>Done</Text>}
                </TouchableOpacity>
            </View>

            {/* Image + crop overlay */}
            <View style={[s.imgWrap, { width: IMG_W, height: imgH }]}>
                <Image source={{ uri }} style={[s.img, {
                    transform: [
                        { rotate: `${rotation}deg` },
                        { scaleX: flipH ? -1 : 1 },
                        { scaleY: flipV ? -1 : 1 },
                    ]}]}
                    resizeMode="cover"
                />
                {/* Dimmed regions outside crop box */}
                <View style={[s.dim, { top: 0, left: 0, right: 0, height: by }]} />
                <View style={[s.dim, { left: 0, right: 0, top: by + bh, bottom: 0 }]} />
                <View style={[s.dim, { top: by, left: 0, width: bx, height: bh }]} />
                <View style={[s.dim, { top: by, left: bx + bw, right: 0, height: bh }]} />

                {/* Crop border + grid */}
                <View style={[s.cropBorder, { left: bx, top: by, width: bw, height: bh }]}>
                    <View style={[s.gridV, { left: bw / 3 }]} />
                    <View style={[s.gridV, { left: (bw * 2) / 3 }]} />
                    <View style={[s.gridH, { top: bh / 3 }]} />
                    <View style={[s.gridH, { top: (bh * 2) / 3 }]} />
                </View>

                {/* Corner handles */}
                {[
                    { pan: panTL, left: bx - hh, top: by - hh, br: [8,0,0,0] },
                    { pan: panTR, left: bx+bw-hh, top: by - hh, br: [0,8,0,0] },
                    { pan: panBL, left: bx - hh, top: by+bh-hh, br: [0,0,0,8] },
                    { pan: panBR, left: bx+bw-hh, top: by+bh-hh, br: [0,0,8,0] },
                ].map(({ pan, left, top, br }, i) => (
                    <View key={i} {...pan.panHandlers}
                        style={[s.handle, { left, top, borderRadius: undefined,
                            borderTopLeftRadius: br[0], borderTopRightRadius: br[1],
                            borderBottomRightRadius: br[2], borderBottomLeftRadius: br[3] }]} />
                ))}
            </View>

            {/* Controls */}
            <View style={s.controls}>
                {/* Aspect ratio */}
                <View style={s.row}>
                    {ASPECT_RATIOS.map(ar => (
                        <TouchableOpacity key={ar.id}
                            style={[s.chip, ratio === ar.id && s.chipActive]}
                            onPress={() => applyRatio(ar.id)}>
                            <Text style={[s.chipTxt, ratio === ar.id && s.chipTxtActive]}>{ar.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {/* Rotate + Flip */}
                <View style={s.row}>
                    <TouchableOpacity style={s.ctrlBtn} onPress={() => setRotation(r => (r + 270) % 360)}>
                        <Ionicons name="refresh-outline" size={16} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
                        <Text style={s.ctrlTxt}>CCW</Text>
                    </TouchableOpacity>
                    <View style={s.degBadge}><Text style={s.degTxt}>{rotation}°</Text></View>
                    <TouchableOpacity style={s.ctrlBtn} onPress={() => setRotation(r => (r + 90) % 360)}>
                        <Ionicons name="refresh-outline" size={16} color="#fff" />
                        <Text style={s.ctrlTxt}>CW</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.ctrlBtn, flipH && s.ctrlBtnOn]} onPress={() => setFlipH(v => !v)}>
                        <Ionicons name="swap-horizontal-outline" size={16} color={flipH ? '#000' : '#fff'} />
                        <Text style={[s.ctrlTxt, flipH && { color: '#000' }]}>Flip H</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.ctrlBtn, flipV && s.ctrlBtnOn]} onPress={() => setFlipV(v => !v)}>
                        <Ionicons name="swap-vertical-outline" size={16} color={flipV ? '#000' : '#fff'} />
                        <Text style={[s.ctrlTxt, flipV && { color: '#000' }]}>Flip V</Text>
                    </TouchableOpacity>
                </View>
                {/* Reset */}
                <TouchableOpacity style={s.resetBtn}
                    onPress={() => { applyRatio('free'); setRotation(0); setFlipH(false); setFlipV(false); }}>
                    <Ionicons name="reload-outline" size={14} color="#9CA3AF" />
                    <Text style={s.resetTxt}>Reset</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const ACCENT = '#00D4AA';
const s = StyleSheet.create({
    root: { marginBottom: 8 },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
    cancelTxt: { color: '#9CA3AF', fontSize: 14 },
    title: { color: '#F9FAFB', fontSize: 14, fontWeight: '700' },
    doneBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
    doneTxt: { color: '#000', fontWeight: '700', fontSize: 14 },
    imgWrap: { overflow: 'hidden', borderRadius: 12, backgroundColor: '#1F2937', position: 'relative', alignSelf: 'center' },
    img: { width: '100%', height: '100%' },
    dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
    cropBorder: { position: 'absolute', borderWidth: 1.5, borderColor: ACCENT, overflow: 'hidden' },
    gridV: { position: 'absolute', top: 0, bottom: 0, width: 0.5, backgroundColor: 'rgba(255,255,255,0.3)' },
    gridH: { position: 'absolute', left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,255,255,0.3)' },
    handle: { position: 'absolute', width: HANDLE, height: HANDLE, backgroundColor: ACCENT },
    controls: { paddingTop: 14, gap: 10 },
    row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { borderWidth: 1, borderColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1F2937' },
    chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
    chipTxt: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
    chipTxtActive: { color: '#000' },
    ctrlBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1F2937', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#374151' },
    ctrlBtnOn: { backgroundColor: ACCENT, borderColor: ACCENT },
    ctrlTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
    degBadge: { backgroundColor: '#111827', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#374151' },
    degTxt: { color: ACCENT, fontSize: 13, fontWeight: '700', minWidth: 32, textAlign: 'center' },
    resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', paddingVertical: 4 },
    resetTxt: { color: '#9CA3AF', fontSize: 12 },
});
