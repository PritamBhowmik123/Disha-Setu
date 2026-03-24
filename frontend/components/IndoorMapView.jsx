/**
 * components/IndoorMapView.jsx
 * 2D Top-Down Indoor Floor Map — Vertical Alignment System
 * Elevator & stairs are always at a fixed, guaranteed pixel position on every floor.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView,
  Animated, Easing,
} from 'react-native';
import Svg, {
  Rect, Line, Path, Circle, G, Text as SvgText, Defs,
  LinearGradient, Stop, Polygon,
} from 'react-native-svg';
import {
  computeLayout2D, buildPath2D,
  MAP_W, MAP_H, MAIN_X, CORRIDOR_W, H_CORRIDOR_Y, ENTRANCE_Y,
  ZONE_STYLES, shortLabel,
  FIXED_ANCHORS, SHAFT_X, SHAFT_W,
} from './indoorLayoutEngine';

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  floor:      '#F1F5F9',
  wall:       '#334155',
  wallThin:   '#94A3B8',
  corridor:   '#E2E8F0',
  shaft:      '#E2E8F0',
  shaftBorder:'#94A3B8',
  start:      '#F59E0B',
  end:        '#7C3AED',
  route:      '#7C3AED',
  user:       '#22C55E',
  label:      '#1E293B',
  labelMuted: '#64748B',
  elevator:   '#0EA5E9',
  elevatorDk: '#0369A1',
  stairs:     '#F97316',
  stairsDk:   '#C2410C',
  entrance:   '#92400E',
};

// ── Floor background + corridors ───────────────────────────────────────────
function FloorBackground() {
  return (
    <>
      {/* Base slab */}
      <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={C.floor} />

      {/* Special zone top strip */}
      <Rect x={0} y={0} width={SHAFT_X} height={66} fill="#FDF4FF" />
      <Line x1={0} y1={66} x2={SHAFT_X} y2={66}
        stroke="#E9D5FF" strokeWidth={1} strokeDasharray="5,4" />

      {/* Entrance bottom strip */}
      <Rect x={0} y={ENTRANCE_Y - 28} width={SHAFT_X} height={MAP_H - (ENTRANCE_Y - 28)}
        fill="#FEF9C3" />
      <Line x1={0} y1={ENTRANCE_Y - 28} x2={SHAFT_X} y2={ENTRANCE_Y - 28}
        stroke="#FDE68A" strokeWidth={1.5} strokeDasharray="5,4" />

      {/* Vertical corridor spine */}
      <Rect
        x={MAIN_X - CORRIDOR_W / 2} y={66}
        width={CORRIDOR_W} height={ENTRANCE_Y - 94}
        fill={C.corridor} stroke={C.wallThin} strokeWidth={0.8}
      />

      {/* Horizontal cross-corridor */}
      <Rect
        x={0} y={H_CORRIDOR_Y - CORRIDOR_W / 2}
        width={SHAFT_X} height={CORRIDOR_W}
        fill={C.corridor} stroke={C.wallThin} strokeWidth={0.8}
      />

      {/* Outer walls */}
      <Rect x={0} y={0} width={MAP_W} height={MAP_H}
        fill="none" stroke={C.wall} strokeWidth={5} />

      {/* Wall dividing shaft from main floor */}
      <Line x1={SHAFT_X} y1={0} x2={SHAFT_X} y2={MAP_H}
        stroke={C.wall} strokeWidth={3} />
    </>
  );
}

// ── Right-side shaft column (elevator + stairs always here) ────────────────
function ShaftColumn({ highlightElevator = false, highlightStairs = false }) {
  const elev = FIXED_ANCHORS.elevator;
  const stair = FIXED_ANCHORS.stairs;

  return (
    <G>
      {/* Shaft background */}
      <Rect x={SHAFT_X} y={0} width={SHAFT_W} height={MAP_H}
        fill={C.shaft} />

      {/* Shaft label */}
      <SvgText
        x={SHAFT_X + SHAFT_W / 2} y={14}
        textAnchor="middle" fontSize={8} fontWeight="700"
        fill={C.wallThin} letterSpacing={1}>
        SHAFT
      </SvgText>

      {/* ── Elevator ── */}
      <Rect
        x={elev.x} y={elev.y} width={elev.w} height={elev.h}
        fill={highlightElevator ? '#BAE6FD' : '#E0F2FE'}
        stroke={highlightElevator ? C.elevator : '#7DD3FC'}
        strokeWidth={highlightElevator ? 3 : 1.5}
        rx={6}
      />
      {/* Elevator icon: door split */}
      <Line x1={elev.x + elev.w / 2} y1={elev.y + 14}
        x2={elev.x + elev.w / 2} y2={elev.y + elev.h - 8}
        stroke={C.elevator} strokeWidth={1.5} />
      {/* Up/down arrows */}
      <SvgText x={elev.x + elev.w / 2} y={elev.y + 11}
        textAnchor="middle" fontSize={9} fill={C.elevatorDk}>⬆⬇</SvgText>
      <SvgText x={elev.x + elev.w / 2} y={elev.y + elev.h - 8}
        textAnchor="middle" fontSize={8} fontWeight="800" fill={C.elevatorDk}>
        LIFT
      </SvgText>

      {/* ── Stairs ── */}
      <Rect
        x={stair.x} y={stair.y} width={stair.w} height={stair.h}
        fill={highlightStairs ? '#FFEDD5' : '#FEF3C7'}
        stroke={highlightStairs ? C.stairs : '#FCD34D'}
        strokeWidth={highlightStairs ? 3 : 1.5}
        rx={6}
      />
      {/* Stair step lines */}
      {[0, 1, 2, 3].map(s => (
        <Line key={s}
          x1={stair.x + 8}              y1={stair.y + 14 + s * 8}
          x2={stair.x + stair.w - 8}    y2={stair.y + 14 + s * 8}
          stroke={C.stairsDk} strokeWidth={1.2} opacity={0.7}
        />
      ))}
      <SvgText x={stair.x + stair.w / 2} y={stair.y + stair.h - 8}
        textAnchor="middle" fontSize={8} fontWeight="800" fill={C.stairsDk}>
        STAIRS
      </SvgText>

      {/* Consistency pin — small dot showing "always here" */}
      <Circle cx={SHAFT_X + SHAFT_W / 2} cy={elev.y - 8} r={3}
        fill="#94A3B8" opacity={0.5} />
      <Circle cx={SHAFT_X + SHAFT_W / 2} cy={stair.y - 8} r={3}
        fill="#94A3B8" opacity={0.5} />
    </G>
  );
}

// ── Entrance gate ──────────────────────────────────────────────────────────
function EntranceGate() {
  const midX = MAIN_X * 0.6;   // shift left since shaft takes right side
  const y = MAP_H - 8;
  return (
    <G>
      <Rect x={midX - 22} y={y - 14} width={5} height={14}
        fill={C.entrance} rx={2} />
      <Rect x={midX + 17} y={y - 14} width={5} height={14}
        fill={C.entrance} rx={2} />
      <Rect x={midX - 24} y={y - 16} width={46} height={4}
        fill={C.entrance} rx={2} />
      <SvgText x={midX} y={y - 8} textAnchor="middle"
        fontSize={7} fontWeight="800" fill="#FEF3C7" letterSpacing={1}>
        IN
      </SvgText>
    </G>
  );
}

// ── Zone strip labels ──────────────────────────────────────────────────────
function ZoneLabels() {
  return (
    <G opacity={0.5}>
      <SvgText x={6} y={13} fontSize={8} fontWeight="700"
        fill="#A855F7" letterSpacing={1}>SPECIAL</SvgText>
      <SvgText x={6} y={MAP_H - 4} fontSize={8} fontWeight="700"
        fill="#B45309" letterSpacing={1}>ENTRANCE</SvgText>
      <SvgText x={MAIN_X + 4} y={H_CORRIDOR_Y + 4} fontSize={7}
        fontWeight="600" fill={C.wallThin} letterSpacing={1}>CORRIDOR</SvgText>
    </G>
  );
}

// ── Faint connector lines (room → nearest corridor) ────────────────────────
function CorridorConnectors({ layoutMap }) {
  const lines = [];
  layoutMap.forEach((item, id) => {
    if (item.zone === 'CORRIDOR' || item.zone === 'ENTRANCE' || item.fixed) return;
    const { cx, cy, zone } = item;
    if (zone === 'LEFT') {
      // Horizontal dash to spine
      lines.push(
        <Line key={id}
          x1={cx} y1={cy} x2={MAIN_X - CORRIDOR_W / 2} y2={cy}
          stroke={C.wallThin} strokeWidth={0.8}
          strokeDasharray="3,3" opacity={0.4}
        />
      );
    }
  });
  return <G>{lines}</G>;
}

// ── Room block ─────────────────────────────────────────────────────────────
function RoomBlock({ item, isStart, isEnd, isOnRoute, isFloorTransit }) {
  const { x, y, w, h, zone, label } = item;
  const style = ZONE_STYLES[zone] ?? ZONE_STYLES.LEFT;

  let fill   = style.fill;
  let stroke = style.stroke;
  let sw     = 1.5;

  if (isEnd)          { fill = '#EDE9FE'; stroke = C.end;   sw = 3; }
  else if (isStart)   { fill = '#FEF3C7'; stroke = C.start; sw = 3; }
  else if (isOnRoute) { fill = '#E0E7FF'; stroke = '#818CF8'; sw = 2; }
  else if (isFloorTransit) { fill = '#DBEAFE'; stroke = C.elevator; sw = 2.5; }

  const words  = (label || '').split(' ');
  const line1  = words[0] ?? '';
  const line2  = words.slice(1).join(' ');

  return (
    <G>
      <Rect x={x} y={y} width={w} height={h}
        fill={fill} stroke={stroke} strokeWidth={sw} rx={7} />

      {/* Accent bar */}
      <Rect x={x + sw} y={y + sw} width={w - sw * 2} height={5}
        fill={stroke} rx={5} opacity={0.5} />

      {/* Start / end badge */}
      {(isStart || isEnd) && (
        <>
          <Circle cx={x + w - 11} cy={y + 11} r={9}
            fill={isEnd ? C.end : C.start} />
          <SvgText x={x + w - 11} y={y + 15}
            textAnchor="middle" fontSize={9} fontWeight="800" fill="#FFF">
            {isEnd ? '★' : '⊙'}
          </SvgText>
        </>
      )}

      {/* Transit indicator */}
      {isFloorTransit && (
        <SvgText x={x + 10} y={y + 13} fontSize={10}>🔄</SvgText>
      )}

      {/* Label */}
      <SvgText x={x + w / 2} y={y + h / 2 + (line2 ? -4 : 3)}
        textAnchor="middle" fontSize={10} fontWeight="700" fill={C.label}>
        {line1}
      </SvgText>
      {line2 ? (
        <SvgText x={x + w / 2} y={y + h / 2 + 10}
          textAnchor="middle" fontSize={9} fontWeight="500" fill={C.labelMuted}>
          {line2}
        </SvgText>
      ) : null}
    </G>
  );
}

// ── Route polyline — completed (grey) + remaining (purple dashed) ──────────
function RoutePolyline({ routePts, currentIndex }) {
  if (!routePts || routePts.length < 2) return null;

  // Index of the user's current position in routePts
  const safeIdx = Math.min(Math.max(currentIndex, 0), routePts.length - 1);

  // Completed segment: start → current position
  const donePts  = routePts.slice(0, safeIdx + 1);
  // Remaining segment: current → end
  const aheadPts = routePts.slice(safeIdx);

  const toD = (pts) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  return (
    <G>
      {/* Completed path — desaturated grey */}
      {donePts.length >= 2 && (
        <Path d={toD(donePts)} fill="none" stroke="#9CA3AF" strokeWidth={3}
          strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
      )}

      {/* Remaining path — purple dashed with glow */}
      {aheadPts.length >= 2 && (
        <>
          <Path d={toD(aheadPts)} fill="none" stroke={C.route} strokeWidth={8}
            strokeLinecap="round" strokeLinejoin="round" opacity={0.10} />
          <Path d={toD(aheadPts)} fill="none" stroke={C.route} strokeWidth={3.5}
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="11,7" />
        </>
      )}

      {/* Waypoint dots on remaining path only */}
      {aheadPts.slice(1).map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3} fill={C.route} opacity={0.55} />
      ))}
    </G>
  );
}

// ── Blue directional navigation arrow ─────────────────────────────────────
// Rotates to face the direction of travel toward the next waypoint.
function NavArrow({ routePts, currentIndex }) {
  if (!routePts || routePts.length === 0) return null;
  const safeIdx  = Math.min(Math.max(currentIndex, 0), routePts.length - 1);
  const [cx, cy] = routePts[safeIdx];

  // Calculate bearing to next point
  let rotateDeg = -90; // default: point right
  if (safeIdx < routePts.length - 1) {
    const [nx, ny] = routePts[safeIdx + 1];
    const dx = nx - cx;
    const dy = ny - cy;
    rotateDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  // Arrow polygon (equilateral triangle pointing right at 0°)
  // We apply rotation via transform around its own centre
  const R  = 13;  // half-size
  const tip = `${cx + R},${cy}`;
  const bl  = `${cx - R * 0.6},${cy - R * 0.7}`;
  const br  = `${cx - R * 0.6},${cy + R * 0.7}`;
  const pts = `${tip} ${bl} ${br}`;

  return (
    <G>
      {/* Pulse ring */}
      <Circle cx={cx} cy={cy} r={20} fill="#3B82F6" opacity={0.10} />
      <Circle cx={cx} cy={cy} r={14} fill="#3B82F6" opacity={0.18} />

      {/* Rotated arrow */}
      <Polygon
        points={pts}
        fill="#3B82F6"
        stroke="#FFF"
        strokeWidth={2.5}
        strokeLinejoin="round"
        transform={`rotate(${rotateDeg}, ${cx}, ${cy})`}
      />

      {/* Centre dot */}
      <Circle cx={cx} cy={cy} r={4} fill="#FFF" opacity={0.9} />
    </G>
  );
}

// ── Floor selector ─────────────────────────────────────────────────────────
function FloorSelector({ floorList, active, onChange }) {
  if (floorList.length <= 1) return null;
  return (
    <View style={styles.floorBar}>
      <Text style={styles.floorBarTitle}>Floor</Text>
      {floorList.map(f => (
        <TouchableOpacity
          key={f}
          style={[styles.floorBtn, f === active && styles.floorBtnActive]}
          onPress={() => onChange(f)}
          accessibilityRole="button">
          <Text style={[styles.floorBtnText, f === active && styles.floorBtnTextActive]}>
            {f === 0 ? 'G' : `${f}`}
          </Text>
        </TouchableOpacity>
      ))}
      <View style={styles.shaftHint}>
        <View style={[styles.shaftHintDot, { backgroundColor: C.elevator }]} />
        <Text style={styles.shaftHintText}>Lift</Text>
        <View style={[styles.shaftHintDot, { backgroundColor: C.stairs }]} />
        <Text style={styles.shaftHintText}>Stairs</Text>
      </View>
    </View>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────
function MapLegend() {
  const items = [
    { color: '#3B82F6', label: '▲ You' },
    { color: C.start,   label: 'Start' },
    { color: C.end,     label: 'End' },
    { color: '#818CF8', label: 'On Route' },
    { color: '#9CA3AF', label: 'Done' },
    { color: C.elevator,label: 'Lift' },
    { color: C.stairs,  label: 'Stairs' },
    { color: '#C084FC', label: 'Special' },
  ];
  return (
    <View style={styles.legend}>
      {items.map(({ color, label }) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: color }]} />
          <Text style={styles.legendLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function IndoorMapView({
  rooms = [],
  connections = [],
  routeRoomIds = [],
  startRoomId,
  endRoomId,
  userRoomId,
  floors = [],
  currentFloor,
  onFloorChange,
}) {
  // Build floor list
  const floorList = useMemo(() => {
    if (floors && floors.length > 0) return floors;
    const s = [...new Set(rooms.map(r => r.floor ?? r.floor_number ?? 1))].sort((a, b) => a - b);
    return s.length > 0 ? s : [1];
  }, [rooms, floors]);

  const [activeFloor, setActiveFloor] = useState(currentFloor ?? floorList[0]);

  // Floor-switch animation
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const [transitioning, setTransitioning] = useState(false);

  const floorRooms = useMemo(
    () => rooms.filter(r => (r.floor ?? r.floor_number ?? 1) === activeFloor),
    [rooms, activeFloor],
  );

  const layoutMap = useMemo(() => computeLayout2D(floorRooms), [floorRooms]);
  const routePts  = useMemo(() => buildPath2D(layoutMap, routeRoomIds), [layoutMap, routeRoomIds]);
  const routeSet  = useMemo(() => new Set(routeRoomIds), [routeRoomIds]);

  const currentIndex = useMemo(() => {
    if (!userRoomId) return 0;
    const idx = routeRoomIds.indexOf(userRoomId);
    return idx !== -1 ? idx : 0;
  }, [userRoomId, routeRoomIds]);

  // Detect which rooms are floor-transit rooms (elevator/stairs on route)
  const transitRoomIds = useMemo(() => {
    const set = new Set();
    floorRooms.forEach(r => {
      const t = (r.type || '').toLowerCase();
      const n = (r.name || '').toLowerCase();
      if (/elevator|lift|stairs|staircase/i.test(t + n) && routeSet.has(r.id)) {
        set.add(r.id);
      }
    });
    return set;
  }, [floorRooms, routeSet]);

  // Highlight shaft when a floor-transit room is on the route
  const highlightShaft = transitRoomIds.size > 0;

  const handleFloor = (f) => {
    if (f === activeFloor) return;
    setTransitioning(true);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.2, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(fadeAnim, { toValue: 1,   duration: 300, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
    ]).start(() => setTransitioning(false));
    setActiveFloor(f);
    onFloorChange?.(f);
  };

  return (
    <View style={styles.container}>
      <FloorSelector floorList={floorList} active={activeFloor} onChange={handleFloor} />
      <MapLegend />

      <View style={styles.mapCard}>
        {/* Floor badge */}
        <View style={styles.floorBadge}>
          <Text style={styles.floorBadgeText}>
            FLOOR {activeFloor === 0 ? 'G' : activeFloor}
          </Text>
        </View>

        {/* Shaft always-same callout */}
        <View style={styles.shaftCallout}>
          <Text style={styles.shaftCalloutText}>⇕ Fixed</Text>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={3}
            minimumZoomScale={0.5}
            bouncesZoom
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}>
            <View style={styles.svgWrapper}>
              <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>

                {/* Floor structure */}
                <FloorBackground />
                <ZoneLabels />

                {/* Shaft — always rendered; fixed position every floor */}
                <ShaftColumn
                  highlightElevator={highlightShaft}
                  highlightStairs={highlightShaft}
                />

                {/* Faint connector dashes */}
                <CorridorConnectors layoutMap={layoutMap} />

                {/* Route — grey completed, purple remaining */}
                <RoutePolyline routePts={routePts} currentIndex={currentIndex} />

                {/* Rooms */}
                {[...layoutMap.entries()].map(([id, item]) => (
                  <RoomBlock
                    key={id}
                    item={item}
                    isStart={id === startRoomId}
                    isEnd={id === endRoomId}
                    isOnRoute={routeSet.has(id)}
                    isFloorTransit={transitRoomIds.has(id)}
                  />
                ))}

                {/* Entrance gate */}
                <EntranceGate />

                {/* Blue directional arrow at user's current position */}
                {userRoomId && <NavArrow routePts={routePts} currentIndex={currentIndex} />}

              </Svg>
            </View>
          </ScrollView>
        </Animated.View>

        <View style={styles.tipsBar}>
          <Text style={styles.tipsText}>
            {highlightShaft
              ? '🔄  Route uses elevator or stairs — shaft is highlighted'
              : routeRoomIds.length > 0
                ? '🗺️  Follow the purple dashed path'
                : '📍  Pinch to zoom · Elevator & stairs always on right'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  floorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  floorBarTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginRight: 2, letterSpacing: 0.5 },
  floorBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, minWidth: 38, alignItems: 'center' },
  floorBtnActive: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 5, elevation: 5,
  },
  floorBtnText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  floorBtnTextActive: { color: '#FFF' },
  shaftHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 6, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  shaftHintDot: { width: 8, height: 8, borderRadius: 2 },
  shaftHintText: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 8, marginBottom: 10, paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  legendLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  mapCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 12,
    position: 'relative',
  },
  floorBadge: {
    position: 'absolute', top: 10, left: 12, zIndex: 10,
    backgroundColor: 'rgba(124,58,237,0.9)',
    borderRadius: 9, paddingHorizontal: 11, paddingVertical: 5,
  },
  floorBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  shaftCallout: {
    position: 'absolute', top: 10, right: 14, zIndex: 10,
    backgroundColor: 'rgba(14,165,233,0.85)',
    borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5,
  },
  shaftCalloutText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scroll: { maxHeight: 480 },
  scrollContent: { alignItems: 'center' },
  svgWrapper: { width: MAP_W, height: MAP_H, alignSelf: 'center' },
  tipsBar: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 9, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  tipsText: { fontSize: 11, color: '#64748B', fontWeight: '600', textAlign: 'center' },
});
