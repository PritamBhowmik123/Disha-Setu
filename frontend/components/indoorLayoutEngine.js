/**
 * indoorLayoutEngine.js
 * 2D Smart Indoor Layout Engine — with Vertical Alignment System.
 *
 * KEY GUARANTEE: Elevator and Stairs are ALWAYS at the same pixel position
 * across every floor so users can orient themselves instantly.
 *
 * MAP COORDINATE SYSTEM (SVG pixels, W=380, H=520):
 *   TOP    → Special zone  (ICU/OT/Lab)
 *   RIGHT  → Fixed shaft   (Elevator + Stairs, always same position)
 *   CENTER → Corridor spine
 *   LEFT   → General rooms / wings
 *   BOTTOM → Entrance zone
 */

// ── Canvas constants ────────────────────────────────────────────────────────
export const MAP_W  = 380;
export const MAP_H  = 520;

// Corridor geometry
export const MAIN_X       = 190;   // vertical spine centre-x
export const CORRIDOR_W   = 28;
export const H_CORRIDOR_Y = 370;   // horizontal cross-corridor
export const ENTRANCE_Y   = 458;   // bottom row

// ── FIXED ANCHOR POSITIONS (elevator & stairs — identical on every floor) ──
export const FIXED_ANCHORS = {
  // Elevator: right side, upper-mid section
  elevator: { x: 312, y: 100, w: 56, h: 54, zone: 'SHAFT', fixed: true },
  // Stairs  : right side, below elevator
  stairs:   { x: 312, y: 172, w: 56, h: 54, zone: 'SHAFT', fixed: true },
};

// Right-side shaft column (grey reserved area)
export const SHAFT_X     = 302;   // left edge of shaft column
export const SHAFT_W     = 70;    // width
export const SHAFT_PAD   = 8;     // internal padding
// Left-side usable width (between left wall and corridor)
export const LEFT_ZONE_X = 8;
export const LEFT_ZONE_W = MAIN_X - CORRIDOR_W / 2 - LEFT_ZONE_X - 10;

// Room sizes (standard)
const ROOM_W = 82;
const ROOM_H = 48;
const GAP    = 12;

// ── Zone style tokens ────────────────────────────────────────────────────────
export const ZONE_STYLES = {
  ENTRANCE: { fill: '#FEF3C7', stroke: '#F59E0B' },
  CORRIDOR: { fill: '#E0F2FE', stroke: '#38BDF8' },
  LEFT:     { fill: '#EFF6FF', stroke: '#93C5FD' },
  RIGHT:    { fill: '#F0FDF4', stroke: '#86EFAC' },
  SPECIAL:  { fill: '#FDF4FF', stroke: '#C084FC' },
  SHAFT:    { fill: '#F1F5F9', stroke: '#94A3B8' },
};

// ── Zone assignment ──────────────────────────────────────────────────────────
const IS_ELEVATOR = /elevator|lift/i;
const IS_STAIRS   = /stairs|staircase|stairway/i;
const IS_ESCALATOR= /escalator/i;

const TYPE_ZONE = {
  entrance:'ENTRANCE', exit:'ENTRANCE', reception:'ENTRANCE', lobby:'ENTRANCE',
  corridor:'CORRIDOR', hallway:'CORRIDOR',
  icu:'SPECIAL', ot:'SPECIAL', surgery:'SPECIAL', operation:'SPECIAL',
  emergency:'SPECIAL', pharmacy:'SPECIAL', lab:'SPECIAL', xray:'SPECIAL',
  radiology:'SPECIAL', nicu:'SPECIAL',
};

function getType(room) {
  return (room.type || '').toLowerCase();
}

function isVertical(room) {
  const t = getType(room);
  const n = (room.name || '').toLowerCase();
  if (t === 'elevator' || IS_ELEVATOR.test(n)) return 'elevator';
  if (t === 'stairs'   || IS_STAIRS.test(n))   return 'stairs';
  if (t === 'escalator'|| IS_ESCALATOR.test(n)) return 'stairs'; // treat as stairs
  return null;
}

function getZone(room) {
  const t = getType(room);
  if (TYPE_ZONE[t]) return TYPE_ZONE[t];
  const n = (room.name || '').toLowerCase();
  if (/entrance|lobby|reception|exit/i.test(n))           return 'ENTRANCE';
  if (/corridor|hallway/i.test(n))                        return 'CORRIDOR';
  if (/icu|ot|surgery|emergency|nicu|radiol|pharma|lab/i.test(n)) return 'SPECIAL';
  return null;
}

// ── Main layout function ─────────────────────────────────────────────────────
/**
 * computeLayout2D(rooms)
 * Returns Map<id, { x, y, w, h, zone, label, cx, cy, fixed? }>
 */
export function computeLayout2D(rooms) {
  if (!rooms || rooms.length === 0) return new Map();

  const layout = new Map();

  // 1. Separate fixed vertical elements (elevator/stairs) from others
  const fixedRooms   = [];
  const regularRooms = [];

  rooms.forEach(r => {
    const anchor = verticalAnchor(r);
    if (anchor) fixedRooms.push({ room: r, anchor });
    else        regularRooms.push(r);
  });

  // 2. Place fixed elements at their guaranteed anchor positions
  fixedRooms.forEach(({ room, anchor }) => {
    const { x, y, w, h, zone } = anchor;
    const cx = x + w / 2;
    const cy = y + h / 2;
    layout.set(room.id, { x, y, w, h, zone, label: shortLabel(room.name), cx, cy, fixed: true, room });
  });

  // 3. Bucket remaining rooms
  const buckets = { ENTRANCE: [], CORRIDOR: [], LEFT: [], RIGHT: [], SPECIAL: [] };
  const unassigned = [];

  regularRooms.forEach(r => {
    const z = getZone(r);
    if (z) buckets[z].push(r);
    else   unassigned.push(r);
  });

  // Balance unassigned into LEFT/RIGHT  (prefer LEFT since RIGHT shaft is reserved)
  unassigned.forEach((r, i) => {
    buckets.LEFT.push(r);   // all overflow goes LEFT to avoid shaft collision
  });

  // 4. Scale sizes for small datasets
  const total = regularRooms.length;
  const scale = total <= 3 ? 1.35 : total <= 5 ? 1.15 : total <= 8 ? 1.0 : 0.95;
  const rW = Math.min(ROOM_W * scale, 95);
  const rH = Math.min(ROOM_H * scale, 58);
  const rGap = GAP * scale;

  // 5. Place zones
  placeEntrance(buckets.ENTRANCE, layout, rW, rH, rGap);
  placeSpecial(buckets.SPECIAL, layout, rW, rH, rGap);
  placeCorridor(buckets.CORRIDOR, layout, rW, rH, rGap);
  placeLeftWing(buckets.LEFT, layout, rW, rH, rGap);
  placeRightWing(buckets.RIGHT, layout, rW, rH, rGap);

  return layout;
}

// ── Anchor resolver ──────────────────────────────────────────────────────────
function verticalAnchor(room) {
  const v = isVertical(room);
  if (v === 'elevator') return FIXED_ANCHORS.elevator;
  if (v === 'stairs')   return FIXED_ANCHORS.stairs;
  return null;
}

// ── Zone placers ──────────────────────────────────────────────────────────────
function placeEntrance(rooms, layout, rW, rH, gap) {
  if (!rooms.length) return;
  // Centre along full usable width (left of shaft)
  const usableW = SHAFT_X - LEFT_ZONE_X - 8;
  const n = rooms.length;
  const totalW = n * rW + (n - 1) * gap;
  const startX = LEFT_ZONE_X + Math.max(0, (usableW - totalW) / 2);
  const y = ENTRANCE_Y - rH / 2;
  rooms.forEach((r, i) => {
    setItem(layout, r, startX + i * (rW + gap), y, rW, rH, 'ENTRANCE');
  });
}

function placeSpecial(rooms, layout, rW, rH, gap) {
  if (!rooms.length) return;
  // Top strip — left of shaft
  const usableW = SHAFT_X - LEFT_ZONE_X - 8;
  const n = rooms.length;
  const totalW = n * rW + (n - 1) * gap;
  const startX = LEFT_ZONE_X + Math.max(0, (usableW - totalW) / 2);
  rooms.forEach((r, i) => {
    setItem(layout, r, startX + i * (rW + gap), 10, rW, rH, 'SPECIAL');
  });
}

function placeCorridor(rooms, layout, rW, rH, gap) {
  if (!rooms.length) return;
  // Along vertical spine, staggered between top and cross-corridor
  const startY = H_CORRIDOR_Y - 40;
  const stepY  = rH + gap + 8;
  rooms.forEach((r, i) => {
    const x = MAIN_X - rW / 2;
    const y = startY - i * stepY;
    setItem(layout, r, x, y, rW, rH, 'CORRIDOR');
  });
}

function placeLeftWing(rooms, layout, rW, rH, gap) {
  if (!rooms.length) return;
  // Left side: two columns
  const colW   = Math.min(rW, (LEFT_ZONE_W - gap) / 2);
  const col0X  = LEFT_ZONE_X;
  const col1X  = LEFT_ZONE_X + colW + gap;
  const startY = 72;
  const stepY  = rH + gap + 8;
  const perCol = Math.ceil(rooms.length / 2);

  rooms.forEach((r, i) => {
    const col = i < perCol ? 0 : 1;
    const row = i < perCol ? i : i - perCol;
    const x   = col === 0 ? col0X : col1X;
    const y   = startY + row * stepY;
    setItem(layout, r, x, y, colW, rH, 'LEFT');
  });
}

function placeRightWing(rooms, layout, rW, rH, gap) {
  // Right wing rooms slot BELOW the fixed shaft (y > 240), single column
  if (!rooms.length) return;
  const x      = SHAFT_X + SHAFT_PAD;
  const startY = 244;
  const stepY  = rH + gap + 6;
  const wRoom  = SHAFT_W - SHAFT_PAD * 2;

  rooms.forEach((r, i) => {
    setItem(layout, r, x, startY + i * stepY, wRoom, rH, 'RIGHT');
  });
}

// ── Item setter ───────────────────────────────────────────────────────────────
function setItem(layout, room, x, y, w, h, zone) {
  const M  = 6;
  const cx = clamp(x, M, MAP_W - w - M) + w / 2;
  const cy = clamp(y, M, MAP_H - h - M) + h / 2;
  layout.set(room.id, {
    x: clamp(x, M, MAP_W - w - M),
    y: clamp(y, M, MAP_H - h - M),
    w, h, zone,
    label: shortLabel(room.name),
    cx, cy,
    fixed: false,
    room,
  });
}

// ── Manhattan path builder ────────────────────────────────────────────────────
/**
 * buildPath2D(layoutMap, routeRoomIds)
 * Route: room → horizontal to spine (MAIN_X) → walk spine → horizontal to target.
 * If consecutive rooms are in same zone, use direct L-turn.
 */
export function buildPath2D(layoutMap, routeRoomIds) {
  if (!routeRoomIds || routeRoomIds.length < 2) return [];
  const pts = [];

  for (let i = 0; i < routeRoomIds.length; i++) {
    const cur = layoutMap.get(routeRoomIds[i]);
    if (!cur) continue;

    if (i === 0) { pts.push([cur.cx, cur.cy]); continue; }

    const prev = layoutMap.get(routeRoomIds[i - 1]);
    if (!prev) { pts.push([cur.cx, cur.cy]); continue; }

    const px = prev.cx, py = prev.cy;
    const cx = cur.cx,  cy = cur.cy;

    // Same-zone direct L-turn
    if (prev.zone === cur.zone && cur.zone !== 'SHAFT') {
      pts.push([px, cy]);
    } else if (cur.zone === 'SHAFT' || prev.zone === 'SHAFT') {
      // Route through the shaft x
      const sx = FIXED_ANCHORS.elevator.x + FIXED_ANCHORS.elevator.w / 2;
      pts.push([sx, py]);
      pts.push([sx, cy]);
    } else {
      // Route via main corridor spine
      pts.push([MAIN_X, py]);
      pts.push([MAIN_X, cy]);
    }
    pts.push([cx, cy]);
  }

  return pts;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function shortLabel(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.length > 11 ? name.slice(0, 10) + '…' : name;
  if (words.length === 2) return words.map(w => w.slice(0, 6)).join(' ');
  return words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
}
