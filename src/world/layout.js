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

// Height of the floor under a point. feetY lets us know which level we're on.
export function groundHeight(x, z, feetY) {
  const s = H.stair;
  if (x > s.minX && x < s.maxX && z < s.topZ && z > s.botZ) {
    const t = (s.topZ - z) / (s.topZ - s.botZ);
    return H.baseFloorY * Math.min(1, Math.max(0, t));
  }
  if (feetY < H.baseFloorY / 2) return H.baseFloorY;
  return 0;
}

export function levelOf(feetY) {
  return feetY < H.baseFloorY / 2 ? "down" : "up";
}
