// Single source of truth for where everything in the house sits (meters).
// +Z is toward the front yard; the visitor spawns on the front walk.

export const H = {
  // Footprint
  minX: -7, maxX: 7, minZ: -4.5, maxZ: 4.5,
  wallH: 2.9,          // upstairs ceiling height
  wallT: 0.22,         // exterior wall thickness
  roofRidgeY: 6.4,

  // Room dividers (x positions of the two interior walls)
  kitchenWallX: -2.5,
  denWallX: 3.0,
  doorwayZ: 1.0,       // interior doorways centered here
  doorwayW: 1.3,

  // Front door
  doorX: 0.25,
  doorW: 1.1,
  doorH: 2.2,

  // Basement
  baseFloorY: -3.0,
  slabT: 0.25,         // thickness of the upstairs floor / basement ceiling

  // Stairs (in back-left of kitchen), descend from stairTopZ toward stairBotZ
  stair: { minX: -6.5, maxX: -5.3, topZ: -0.6, botZ: -3.6 },
};

export const SPAWN = { x: 0.25, y: 0, z: 11.5, yaw: 0 }; // yaw 0 faces -Z, toward the house

// Colliders: axis-aligned boxes in XZ. level: "up" | "down" | "both"
export const colliders = [];
export function addCollider(minX, maxX, minZ, maxZ, level = "both") {
  colliders.push({ minX, maxX, minZ, maxZ, level });
}

// The wing (bunk room + sunroom) on the right side of the house, and the back deck.
export const WING = { minX: 7, maxX: 13, minZ: -4.5, maxZ: 3.5, splitZ: -0.5, doorZ1: 2.0, doorZ2: 3.2 };
export const DECK = { minX: -4, maxX: 13, minZ: -8.5, maxZ: -4.5, stairX: 1.0 };
export const BACKDOOR = { x1: 1.55, x2: 2.65 };
export const WATER_Y = -5.5;

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const sm = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Outdoor ground height: flat around the house and street, rolling side yards,
// a bluff dropping ~5m behind the deck, then a beach sloping into the water.
export function terrainHeight(x, z) {
  const dx = Math.max(-9 - x, 0, x - 15);
  const dz = Math.max(-9 - z, 0, z - 6.5);
  const d = Math.hypot(dx, dz);
  const roll = Math.sin(x * 0.19 + 0.7) * Math.cos(z * 0.16 + 0.3) * 0.7 + Math.sin(x * 0.07 + 2) * 0.5 + 0.35;
  const walk = z > 6 ? sm(1.5, 5, Math.abs(x - 0.25)) : 1;
  let h = roll * sm(2, 14, d) * (1 - sm(9, 13, z)) * walk * (1 - sm(17, 23, -z));
  h += -5 * sm(9.5, 19, -z);
  if (z < -19) {
    h += (z + 19) * 0.04;
    h += 0.22 * Math.sin(x * 0.45 + 1.3) * Math.sin(z * 0.6) * (1 - sm(20, 27, -z));
  }
  return h;
}

function inMain(x, z) {
  return x > H.minX && x < H.maxX && z > H.minZ && z < H.maxZ;
}
function onPlatform(x, z) {
  return (
    (x >= WING.minX - 0.3 && x < WING.maxX && z > WING.minZ && z < WING.maxZ) ||
    (x > DECK.minX && x < DECK.maxX && z > DECK.minZ - 0.1 && z <= DECK.maxZ + 0.3)
  );
}

// Height of the floor under a point. feetY lets us know which level we're on.
export function groundHeight(x, z, feetY) {
  if (!inMain(x, z)) return onPlatform(x, z) ? 0 : terrainHeight(x, z);
  const s = H.stair;
  if (x > s.minX && x < s.maxX && z < s.topZ && z > s.botZ) {
    const t = (s.topZ - z) / (s.topZ - s.botZ);
    return H.baseFloorY * Math.min(1, Math.max(0, t));
  }
  if (feetY < H.baseFloorY / 2) return H.baseFloorY;
  return 0;
}

// "down" only means the basement; the beach is lower but is still outdoors ("up").
export function levelOf(feetY, x = 0, z = 0) {
  return feetY < H.baseFloorY / 2 && x > H.minX - 0.6 && x < H.maxX + 0.6 && z > H.minZ - 0.6 && z < H.maxZ + 0.6 ? "down" : "up";
}
