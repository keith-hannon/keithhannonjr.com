// Builds the house shell: lawn, exterior, roof, rooms, stairs, basement, lights.
import * as THREE from "three";
import { H, addCollider, WING, BACKDOOR } from "./layout.js";
import * as T from "./textures.js";

export const PALETTE = {
  seafoam: 0x9fd3c7,
  navy: 0x2f4a6b,
  nantucketRed: 0xb5534a,
  butter: 0xf4d98b,
  sand: 0xe9dcc3,
  cream: 0xfaf6ec,
  white: 0xffffff,
  trim: 0xf7f7f2,
  wood: 0xb27a4b,
  darkWood: 0x6e4a2b,
};

const mats = {};
export function mat(key, opts) {
  if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial(opts);
  return mats[key];
}

export function box(group, w, h, d, material, x, y, z, { collide = false, level = "both", castShadow = true, receiveShadow = true, rotY = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  group.add(m);
  if (collide && rotY === 0) addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, level);
  return m;
}

export function buildHouse(scene, { isMobile }) {
  const g = new THREE.Group();
  g.name = "house";
  scene.add(g);

  const wallH = H.wallH;
  const t = H.wallT;

  // ---------- Materials ----------
  const shingle = mat("shingle", { map: T.shingleTexture([6, 3]), roughness: 0.95 });
  const shingleSide = mat("shingleSide", { map: T.shingleTexture([4, 3]), roughness: 0.95 });
  const trim = mat("trim", { color: PALETTE.trim, roughness: 0.6 });
  const roof = mat("roof", { map: T.roofTexture([8, 4]), roughness: 0.9 });
  const grass = mat("grass", { map: T.grassTexture([1, 1]), roughness: 1 });
  const flag = mat("flag", { map: T.flagstoneTexture([1, 5]), roughness: 0.9 });
  const floorWood = mat("floorWood", { map: T.plankTexture([5, 5]), roughness: 0.7 });
  const kitchenFloor = mat("kitchenFloor", { map: T.plankTexture([4, 4], "#c9a278"), roughness: 0.7 });
  const ceiling = mat("ceiling", { color: 0xfbf9f3, roughness: 0.95 });
  const livingWall = mat("livingWall", { color: PALETTE.sand, roughness: 0.95 });
  const kitchenWall = mat("kitchenWall", { color: PALETTE.seafoam, roughness: 0.95 });
  const denWall = mat("denWall", { color: PALETTE.navy, roughness: 0.95 });
  const paneling = mat("paneling", { map: T.panelingTexture([5, 1]), roughness: 0.85 });
  const concrete = mat("concrete", { color: 0x8c8880, roughness: 1 });
  const basementCeil = mat("basementCeil", { color: 0xe8e2d4, roughness: 1 });
  const stairWood = mat("stairWood", { color: 0x9c6b42, roughness: 0.8 });
  const door = mat("door", { color: PALETTE.nantucketRed, roughness: 0.5 });
  const glass = mat("glass", { color: 0xbfe3ef, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45 });
  const glassDark = mat("glassDark", { color: 0x3a5a7a, roughness: 0.2, metalness: 0.4 });

  // ---------- Front walk (the lawn/terrain lives in outdoors.js) ----------
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 9), flag);
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(H.doorX, 0.005, H.maxZ + 4.6);
  walk.receiveShadow = true;
  g.add(walk);

  // front step
  box(g, 1.8, 0.16, 0.9, mat("step", { color: 0xbdb5a4, roughness: 0.9 }), H.doorX, 0.08, H.maxZ + 0.5, { collide: false });

  // ---------- Exterior walls (shingled) ----------
  const W = H.maxX - H.minX;
  const D = H.maxZ - H.minZ;
  // back wall
  const bx1 = BACKDOOR.x1, bx2 = BACKDOOR.x2, backZ = H.minZ - t / 2;
  box(g, bx1 - H.minX + t / 2, wallH, t, shingle, (H.minX - t / 2 + bx1) / 2, wallH / 2, backZ, { collide: true });
  box(g, H.maxX - bx2 + t / 2, wallH, t, shingle, (bx2 + H.maxX + t / 2) / 2, wallH / 2, backZ, { collide: true });
  box(g, bx2 - bx1, wallH - H.doorH, t, trim, (bx1 + bx2) / 2, H.doorH + (wallH - H.doorH) / 2, backZ, { collide: false });
  // glass back door to the deck
  const backDoor = new THREE.Group();
  backDoor.position.set(bx1, 0, backZ);
  const bdw = bx2 - bx1 - 0.04;
  box(backDoor, bdw, 0.12, 0.05, trim, bdw / 2, 0.06, 0, { collide: false });
  box(backDoor, bdw, 0.12, 0.05, trim, bdw / 2, H.doorH - 0.1, 0, { collide: false });
  box(backDoor, 0.1, H.doorH - 0.04, 0.05, trim, 0.05, (H.doorH - 0.04) / 2, 0, { collide: false });
  box(backDoor, 0.1, H.doorH - 0.04, 0.05, trim, bdw - 0.05, (H.doorH - 0.04) / 2, 0, { collide: false });
  box(backDoor, bdw, 0.04, 0.04, trim, bdw / 2, 1.1, 0, { collide: false });
  const bdGlass = new THREE.Mesh(new THREE.PlaneGeometry(bdw - 0.2, H.doorH - 0.26), mat("glassClear", { color: 0xcfeaf5, roughness: 0.05, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  bdGlass.position.set(bdw / 2, H.doorH / 2, 0);
  backDoor.add(bdGlass);
  g.add(backDoor);
  // side walls
  box(g, t, wallH, D + t, shingleSide, H.minX - t / 2, wallH / 2, 0, { collide: true });
  {
    const z1 = WING.doorZ1, z2 = WING.doorZ2, rx = H.maxX + t / 2;
    box(g, t, wallH, z1 - H.minZ + t / 2, shingleSide, rx, wallH / 2, (H.minZ - t / 2 + z1) / 2, { collide: true });
    box(g, t, wallH, H.maxZ - z2 + t / 2, shingleSide, rx, wallH / 2, (z2 + H.maxZ + t / 2) / 2, { collide: true });
    box(g, t, wallH - 2.15, z2 - z1, trim, rx, 2.15 + (wallH - 2.15) / 2, (z1 + z2) / 2, { collide: false });
    box(g, t + 0.1, 2.2, 0.08, trim, rx, 1.1, z1 - 0.04, { collide: false, castShadow: false });
    box(g, t + 0.1, 2.2, 0.08, trim, rx, 1.1, z2 + 0.04, { collide: false, castShadow: false });
  }
  // front wall with door opening
  const frontZ = H.maxZ + t / 2;
  const doorL = H.doorX - H.doorW / 2, doorR = H.doorX + H.doorW / 2;
  box(g, doorL - H.minX, wallH, t, shingle, (H.minX + doorL) / 2, wallH / 2, frontZ, { collide: true });
  box(g, H.maxX - doorR, wallH, t, shingle, (doorR + H.maxX) / 2, wallH / 2, frontZ, { collide: true });
  box(g, H.doorW, wallH - H.doorH, t, trim, H.doorX, H.doorH + (wallH - H.doorH) / 2, frontZ, { collide: false });
  // door casing (two jambs + header + small pediment) and corner boards
  box(g, 0.15, H.doorH + 0.1, 0.08, trim, doorL - 0.075, (H.doorH + 0.1) / 2, frontZ + t / 2, { collide: false });
  box(g, 0.15, H.doorH + 0.1, 0.08, trim, doorR + 0.075, (H.doorH + 0.1) / 2, frontZ + t / 2, { collide: false });
  box(g, H.doorW + 0.3, 0.18, 0.08, trim, H.doorX, H.doorH + 0.09, frontZ + t / 2, { collide: false });
  box(g, H.doorW + 0.4, 0.08, 0.3, trim, H.doorX, H.doorH + 0.22, frontZ + t / 2 + 0.1, { collide: false });
  for (const sx of [H.minX, H.maxX]) {
    box(g, 0.14, wallH, 0.14, trim, sx + (sx < 0 ? -t / 2 : t / 2), wallH / 2, H.maxZ + t / 2, { collide: false });
    box(g, 0.14, wallH, 0.14, trim, sx + (sx < 0 ? -t / 2 : t / 2), wallH / 2, H.minZ - t / 2, { collide: false });
  }
  // fascia / soffit boards along eaves
  box(g, W + 1.2, 0.22, 0.3, trim, 0, wallH + 0.05, H.maxZ + 0.35, { collide: false });
  box(g, W + 1.2, 0.22, 0.3, trim, 0, wallH + 0.05, H.minZ - 0.35, { collide: false });

  // The front door itself — swings open when approached (animated in main)
  const doorGroup = new THREE.Group();
  doorGroup.position.set(doorL, 0, frontZ);
  const doorMesh = box(doorGroup, H.doorW - 0.04, H.doorH - 0.04, 0.06, door, (H.doorW - 0.04) / 2, (H.doorH - 0.04) / 2, 0, { collide: false });
  // door panels
  for (const py of [0.55, 1.45]) box(doorGroup, 0.7, 0.6, 0.02, mat("doorPanel", { color: 0xa44a41, roughness: 0.5 }), (H.doorW - 0.04) / 2, py, 0.04, { collide: false });
  // brass knob
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), mat("brass", { color: 0xd4a94a, roughness: 0.3, metalness: 0.8 }));
  knob.position.set(H.doorW - 0.18, 1.05, 0.08);
  doorGroup.add(knob);
  g.add(doorGroup);
  g.userData.doors = [
    { group: doorGroup, x: H.doorX, z: H.maxZ, sign: -1 },
    { group: backDoor, x: (bx1 + bx2) / 2, z: H.minZ, sign: 1 },
  ];
  doorMesh.name = "frontDoor";

  // ---------- Windows (front: kitchen + den, sides, back) ----------
  const windows = [];
  function windowAt(x, z, rotY, w = 1.1, h = 1.3, y = 1.55) {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;
    const frame = box(wg, w + 0.18, h + 0.18, 0.1, trim, 0, 0, 0, { collide: false });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassDark);
    pane.position.z = 0.06;
    wg.add(pane);
    // muntins
    box(wg, 0.03, h, 0.02, trim, 0, 0, 0.07, { collide: false });
    box(wg, w, 0.03, 0.02, trim, 0, 0, 0.07, { collide: false });
    // shutters
    const sh = mat("shutter", { color: PALETTE.navy, roughness: 0.6 });
    box(wg, 0.42, h + 0.18, 0.06, sh, -(w / 2 + 0.33), 0, 0.03, { collide: false });
    box(wg, 0.42, h + 0.18, 0.06, sh, w / 2 + 0.33, 0, 0.03, { collide: false });
    // window box with flowers
    box(wg, w + 0.1, 0.22, 0.26, trim, 0, -h / 2 - 0.2, 0.15, { collide: false });
    g.add(wg);
    windows.push(wg);
    return wg;
  }
  const fz = H.maxZ + t + 0.02;
  windowAt(-4.6, fz, 0);
  windowAt(5.0, fz, 0);
  windowAt(H.minX - t - 0.02, 2.0, -Math.PI / 2);
  windowAt(-4.6, H.minZ - t - 0.02, Math.PI);
  windowAt(5.0, H.minZ - t - 0.02, Math.PI);

  // ---------- Roof (gable, ridge along X) with two front dormers ----------
  const ridgeY = H.roofRidgeY;
  const eaveY = wallH;
  const overhang = 0.6;
  const halfD = D / 2 + overhang;
  const slopeLen = Math.hypot(halfD, ridgeY - eaveY);
  const pitch = Math.atan2(ridgeY - eaveY, halfD);
  const roofW = W + 1.2;
  for (const side of [1, -1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.18, slopeLen), roof);
    r.position.set(0, (ridgeY + eaveY) / 2 + 0.05, (side * halfD) / 2);
    r.rotation.x = side * pitch;
    r.castShadow = true;
    r.receiveShadow = true;
    g.add(r);
  }
  // gable-end triangles (shingled)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-halfD + overhang, 0);
  gableShape.lineTo(halfD - overhang, 0);
  gableShape.lineTo(0, ridgeY - eaveY);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: t, bevelEnabled: false });
  for (const sx of [H.minX - t, H.maxX]) {
    const gm = new THREE.Mesh(gableGeo, shingleSide);
    gm.rotation.y = Math.PI / 2;
    gm.position.set(sx + t, eaveY, 0);
    gm.castShadow = true;
    g.add(gm);
  }
  // ridge cap + chimney (above the living room fireplace, back wall)
  box(g, roofW + 0.1, 0.12, 0.3, mat("ridge", { color: 0x3b3f44 }), 0, ridgeY + 0.08, 0, { collide: false });
  box(g, 0.8, 2.4, 0.8, mat("chimney", { map: T.brickTexture([1, 2], "#9a6a5a"), roughness: 1 }), 0.25, ridgeY - 0.4, -2.6, { collide: false });

  // dormers
  for (const dx of [-4.2, 4.6]) {
    const dg = new THREE.Group();
    const dz = 2.1;
    const dy = eaveY + 1.0;
    dg.position.set(dx, dy, dz);
    box(dg, 1.5, 1.5, 1.5, shingle, 0, 0.75, 0, { collide: false });
    const dr = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.9, 4), roof);
    dr.rotation.y = Math.PI / 4;
    dr.position.y = 1.95;
    dr.castShadow = true;
    dg.add(dr);
    const wg = new THREE.Group();
    wg.position.set(0, 0.8, 0.76);
    box(wg, 0.9, 0.9, 0.08, trim, 0, 0, 0, { collide: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.74), glassDark);
    p.position.z = 0.05;
    wg.add(p);
    box(wg, 0.03, 0.74, 0.02, trim, 0, 0, 0.06, { collide: false });
    box(wg, 0.74, 0.03, 0.02, trim, 0, 0, 0.06, { collide: false });
    dg.add(wg);
    g.add(dg);
  }

  // ---------- Hydrangeas & shrubs ----------
  const leaf = mat("leaf", { color: 0x3f7a4a, roughness: 1 });
  const bloomCols = [0x8fb6e8, 0xc9b7ea, 0xa9d1f5, 0xe8c7dc];
  function hydrangea(x, z, scale = 1) {
    const hg = new THREE.Group();
    hg.position.set(x, 0, z);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 10, 8), leaf);
    bush.position.y = 0.45 * scale;
    bush.scale.y = 0.85;
    bush.castShadow = true;
    hg.add(bush);
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.17 * scale, 8, 6), mat("bloom" + (i % 4), { color: bloomCols[i % 4], roughness: 1 }));
      const a = (i / 9) * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.42 * scale, 0.55 * scale + Math.sin(i * 2.3) * 0.2, Math.sin(a) * 0.42 * scale);
      hg.add(b);
    }
    g.add(hg);
    addCollider(x - 0.5, x + 0.5, z - 0.5, z + 0.5, "up");
  }
  hydrangea(-1.1, H.maxZ + 1.0);
  hydrangea(1.6, H.maxZ + 1.0);
  hydrangea(-3.6, H.maxZ + 0.9, 0.9);
  hydrangea(3.3, H.maxZ + 0.9, 0.9);
  hydrangea(6.3, H.maxZ + 0.9, 0.9);
  hydrangea(-6.0, H.maxZ + 0.9, 0.9);

  // White picket fence along the front of the lot
  const picket = mat("picket", { color: 0xf5f5f0, roughness: 0.8 });
  for (let x = -14; x <= 14; x += 0.5) {
    if (Math.abs(x - H.doorX) < 1.3) continue; // gate gap
    box(g, 0.08, 1.0, 0.04, picket, x, 0.5, H.maxZ + 9.5, { collide: false, castShadow: false });
  }
  box(g, 12.2, 0.08, 0.04, picket, H.doorX - 7.4, 0.75, H.maxZ + 9.5, { collide: true, castShadow: false });
  box(g, 12.2, 0.08, 0.04, picket, H.doorX + 7.4, 0.75, H.maxZ + 9.5, { collide: true, castShadow: false });
  box(g, 12.2, 0.08, 0.04, picket, H.doorX - 7.4, 0.35, H.maxZ + 9.5, { collide: false, castShadow: false });
  box(g, 12.2, 0.08, 0.04, picket, H.doorX + 7.4, 0.35, H.maxZ + 9.5, { collide: false, castShadow: false });

  // ---------- Upstairs floor / ceiling slabs ----------
  // The floor has a hole where the stairs go.
  const s = H.stair;
  const floorGroup = new THREE.Group();
  function floorPiece(x1, x2, z1, z2, material, y = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    m.receiveShadow = true;
    floorGroup.add(m);
  }
  // kitchen floor minus stairwell
  floorPiece(H.minX, s.minX, H.minZ, H.maxZ, kitchenFloor, 0.001);
  floorPiece(s.minX, s.maxX, s.topZ, H.maxZ, kitchenFloor, 0.001);
  floorPiece(s.maxX, H.kitchenWallX, H.minZ, H.maxZ, kitchenFloor, 0.001);
  // living + den
  floorPiece(H.kitchenWallX, H.maxX, H.minZ, H.maxZ, floorWood, 0.001);
  g.add(floorGroup);

  // Slab seen from the basement (basement ceiling), with the stairwell open
  const slabY = -H.slabT / 2;
  box(g, s.minX - H.minX, H.slabT, D, basementCeil, (H.minX + s.minX) / 2, slabY, 0, { collide: false, castShadow: false });
  box(g, s.maxX - s.minX, H.slabT, H.maxZ - s.topZ, basementCeil, (s.minX + s.maxX) / 2, slabY, (s.topZ + H.maxZ) / 2, { collide: false, castShadow: false });
  box(g, H.maxX - s.maxX, H.slabT, D, basementCeil, (s.maxX + H.maxX) / 2, slabY, 0, { collide: false, castShadow: false });

  // Upstairs ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = wallH - 0.01;
  g.add(ceil);
  // crown molding / baseboards for a finished look
  const base = mat("baseboard", { color: 0xffffff, roughness: 0.7 });
  function baseboardRun(x1, x2, z, dz = 0) {
    box(g, Math.abs(x2 - x1), 0.14, 0.04, base, (x1 + x2) / 2, 0.07, z + dz, { collide: false, castShadow: false });
  }
  baseboardRun(H.minX, bx1, H.minZ, 0.03);
  baseboardRun(bx2, H.maxX, H.minZ, 0.03);
  baseboardRun(H.minX, doorL, H.maxZ, -0.03);
  baseboardRun(doorR, H.maxX, H.maxZ, -0.03);

  // ---------- Interior walls (upstairs) with doorways ----------
  const dz1 = H.doorwayZ - H.doorwayW / 2, dz2 = H.doorwayZ + H.doorwayW / 2;
  function interiorWall(x, matA, matB) {
    const it = 0.14;
    // two faces so each room gets its own color
    for (const [mm, off] of [[matA, -it / 4], [matB, it / 4]]) {
      box(g, it / 2, wallH, dz1 - H.minZ, mm, x + off, wallH / 2, (H.minZ + dz1) / 2, { collide: false, castShadow: false });
      box(g, it / 2, wallH, H.maxZ - dz2, mm, x + off, wallH / 2, (dz2 + H.maxZ) / 2, { collide: false, castShadow: false });
      box(g, it / 2, wallH - 2.15, H.doorwayW, mm, x + off, 2.15 + (wallH - 2.15) / 2, H.doorwayZ, { collide: false, castShadow: false });
    }
    addCollider(x - it / 2, x + it / 2, H.minZ, dz1, "up");
    addCollider(x - it / 2, x + it / 2, dz2, H.maxZ, "up");
    // door casing
    box(g, it + 0.08, 0.1, H.doorwayW + 0.16, trim, x, 2.2, H.doorwayZ, { collide: false, castShadow: false });
    box(g, it + 0.08, 2.2, 0.08, trim, x, 1.1, dz1 - 0.04, { collide: false, castShadow: false });
    box(g, it + 0.08, 2.2, 0.08, trim, x, 1.1, dz2 + 0.04, { collide: false, castShadow: false });
  }
  box(g, 0.22, 0.26, D, mat("openBeam", { color: 0xf7f5ee, roughness: 0.7 }), H.kitchenWallX, wallH - 0.13, 0, { collide: false, castShadow: false });
  box(g, 0.18, wallH, 0.18, mat("openBeam"), H.kitchenWallX, wallH / 2, 0.75, { collide: true, level: "up", castShadow: false });
  for (const pz of [H.minZ + 0.06, H.maxZ - 0.06]) box(g, 0.18, wallH, 0.1, mat("openBeam"), H.kitchenWallX, wallH / 2, pz, { collide: false, castShadow: false });
  interiorWall(H.denWallX, livingWall, denWall);

  // Interior faces of exterior walls (painted), slightly inset
  const inset = 0.01;
  // back wall faces
  box(g, H.kitchenWallX - H.minX, wallH, 0.02, kitchenWall, (H.minX + H.kitchenWallX) / 2, wallH / 2, H.minZ + inset, { collide: false, castShadow: false });
  box(g, bx1 - H.kitchenWallX, wallH, 0.02, livingWall, (H.kitchenWallX + bx1) / 2, wallH / 2, H.minZ + inset, { collide: false, castShadow: false });
  box(g, H.denWallX - bx2, wallH, 0.02, livingWall, (bx2 + H.denWallX) / 2, wallH / 2, H.minZ + inset, { collide: false, castShadow: false });
  box(g, bx2 - bx1, wallH - H.doorH, 0.02, livingWall, (bx1 + bx2) / 2, H.doorH + (wallH - H.doorH) / 2, H.minZ + inset, { collide: false, castShadow: false });
  box(g, H.maxX - H.denWallX, wallH, 0.02, denWall, (H.denWallX + H.maxX) / 2, wallH / 2, H.minZ + inset, { collide: false, castShadow: false });
  // front wall faces (around door)
  box(g, H.kitchenWallX - H.minX, wallH, 0.02, kitchenWall, (H.minX + H.kitchenWallX) / 2, wallH / 2, H.maxZ - inset, { collide: false, castShadow: false });
  box(g, doorL - H.kitchenWallX, wallH, 0.02, livingWall, (H.kitchenWallX + doorL) / 2, wallH / 2, H.maxZ - inset, { collide: false, castShadow: false });
  box(g, H.denWallX - doorR, wallH, 0.02, livingWall, (doorR + H.denWallX) / 2, wallH / 2, H.maxZ - inset, { collide: false, castShadow: false });
  box(g, H.doorW, wallH - H.doorH, 0.02, livingWall, H.doorX, H.doorH + (wallH - H.doorH) / 2, H.maxZ - inset, { collide: false, castShadow: false });
  box(g, H.maxX - H.denWallX, wallH, 0.02, denWall, (H.denWallX + H.maxX) / 2, wallH / 2, H.maxZ - inset, { collide: false, castShadow: false });
  // side wall faces
  box(g, 0.02, wallH, D, kitchenWall, H.minX + inset, wallH / 2, 0, { collide: false, castShadow: false });
  box(g, 0.02, wallH, WING.doorZ1 - H.minZ, denWall, H.maxX - inset, wallH / 2, (H.minZ + WING.doorZ1) / 2, { collide: false, castShadow: false });
  box(g, 0.02, wallH, H.maxZ - WING.doorZ2, denWall, H.maxX - inset, wallH / 2, (WING.doorZ2 + H.maxZ) / 2, { collide: false, castShadow: false });
  box(g, 0.02, wallH - 2.15, WING.doorZ2 - WING.doorZ1, denWall, H.maxX - inset, 2.15 + (wallH - 2.15) / 2, (WING.doorZ1 + WING.doorZ2) / 2, { collide: false, castShadow: false });
  // Interior-side windows (so you can see "out" from inside)
  function innerWindow(x, z, rotY) {
    const wg = new THREE.Group();
    wg.position.set(x, 1.55, z);
    wg.rotation.y = rotY;
    box(wg, 1.28, 1.48, 0.06, trim, 0, 0, 0, { collide: false, castShadow: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), mat("innerGlass", { color: 0xdff1f7, roughness: 0.2, emissive: 0x9fc9d8, emissiveIntensity: 0.2 }));
    p.position.z = 0.035;
    wg.add(p);
    box(wg, 0.03, 1.3, 0.02, trim, 0, 0, 0.045, { collide: false, castShadow: false });
    box(wg, 1.1, 0.03, 0.02, trim, 0, 0, 0.045, { collide: false, castShadow: false });
    g.add(wg);
  }
  innerWindow(-4.6, H.maxZ - 0.03, Math.PI);
  innerWindow(5.0, H.maxZ - 0.03, Math.PI);
  innerWindow(H.minX + 0.03, 2.0, Math.PI / 2);
  innerWindow(-4.6, H.minZ + 0.03, 0);
  innerWindow(5.0, H.minZ + 0.03, 0);

  // ---------- Stairs ----------
  const steps = 12;
  const run = s.topZ - s.botZ;
  const stepD = run / steps;
  const stepH = -H.baseFloorY / steps;
  for (let i = 0; i < steps; i++) {
    const z = s.topZ - stepD * (i + 0.5);
    const y = -stepH * (i + 1) + stepH / 2;
    box(g, s.maxX - s.minX - 0.02, stepH, stepD, stairWood, (s.minX + s.maxX) / 2, y, z, { collide: false, castShadow: false });
    // riser face a bit darker
    box(g, s.maxX - s.minX - 0.02, stepH, 0.02, mat("riser", { color: 0xf3efe6, roughness: 0.9 }), (s.minX + s.maxX) / 2, y, z + stepD / 2, { collide: false, castShadow: false });
  }
  // Stair side wall (upstairs railing + basement wall under the stairs)
  const railMat = mat("rail", { color: 0xffffff, roughness: 0.6 });
  const newel = mat("newel", { color: 0xffffff, roughness: 0.6 });
  // upstairs railing along the open side (x = s.maxX) and across the front end
  const railLen = s.topZ - s.botZ + (s.botZ - H.minZ);
  for (let z = s.topZ; z > H.minZ + 0.1; z -= 0.3) {
    box(g, 0.04, 0.9, 0.04, railMat, s.maxX, 0.45, z, { collide: false, castShadow: false });
  }
  box(g, 0.08, 0.06, railLen, railMat, s.maxX, 0.92, (s.topZ + H.minZ) / 2, { collide: false, castShadow: false });
  box(g, 0.12, 1.0, 0.12, newel, s.maxX, 0.5, s.topZ, { collide: false, castShadow: false });
  addCollider(s.maxX - 0.06, s.maxX + 0.06, H.minZ, s.topZ, "up");
  // wall under the stairs in the basement (so you can't walk under them), with exit at the bottom
  box(g, 0.12, 3.0, s.topZ - s.botZ, paneling, s.maxX, H.baseFloorY + 1.5, (s.topZ + s.botZ) / 2, { collide: false, castShadow: false });
  addCollider(s.maxX - 0.06, s.maxX + 0.06, s.botZ, s.topZ, "down");
  box(g, s.maxX - s.minX, 3.0, 0.12, paneling, (s.minX + s.maxX) / 2, H.baseFloorY + 1.5, s.topZ, { collide: false, castShadow: false });
  addCollider(s.minX, s.maxX, s.topZ - 0.06, s.topZ + 0.06, "down");

  // ---------- Basement ----------
  const bY = H.baseFloorY;
  const bH = -bY - H.slabT; // interior height
  const bfloor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat("bfloor", { map: T.plankTexture([6, 6], "#7d5a3c"), roughness: 0.85 }));
  bfloor.rotation.x = -Math.PI / 2;
  bfloor.position.set(0, bY + 0.001, 0);
  bfloor.receiveShadow = true;
  g.add(bfloor);
  // paneled walls
  box(g, W, bH, 0.1, paneling, 0, bY + bH / 2, H.minZ + 0.05, { collide: false, castShadow: false });
  box(g, W, bH, 0.1, paneling, 0, bY + bH / 2, H.maxZ - 0.05, { collide: false, castShadow: false });
  box(g, 0.1, bH, D, paneling, H.minX + 0.05, bY + bH / 2, 0, { collide: false, castShadow: false });
  box(g, 0.1, bH, D, paneling, H.maxX - 0.05, bY + bH / 2, 0, { collide: false, castShadow: false });
  addCollider(H.minX - 1, H.minX + 0.1, H.minZ - 1, H.maxZ + 1, "down");
  addCollider(H.maxX - 0.1, H.maxX + 1, H.minZ - 1, H.maxZ + 1, "down");
  addCollider(H.minX - 1, H.maxX + 1, H.minZ - 1, H.minZ + 0.1, "down");
  addCollider(H.minX - 1, H.maxX + 1, H.maxZ - 0.1, H.maxZ + 1, "down");
  // exposed concrete band at the base of the walls
  box(g, W, 0.12, 0.04, concrete, 0, bY + 0.06, H.minZ + 0.12, { collide: false, castShadow: false });
  box(g, W, 0.12, 0.04, concrete, 0, bY + 0.06, H.maxZ - 0.12, { collide: false, castShadow: false });
  // ceiling joists / beams
  const beam = mat("beam", { color: 0x6b4a2e, roughness: 0.9 });
  for (let x = -6; x <= 6; x += 1.5) box(g, 0.12, 0.2, D, beam, x, -H.slabT - 0.1, 0, { collide: false, castShadow: false });
  // support posts
  for (const [px, pz] of [[-2.5, -2.2], [-2.5, 2.2], [3, -2.2], [3, 2.2]]) {
    box(g, 0.18, bH, 0.18, mat("post", { color: 0xe9e4d8, roughness: 0.9 }), px, bY + bH / 2, pz, { collide: true, level: "down", castShadow: false });
  }

  // ---------- Lighting ----------
  const hemi = new THREE.HemisphereLight(0xdcefff, 0xc9bfa8, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(10, 26, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  g.userData.sun = sun;

  // Warm interior lights. (Lamps/fixtures themselves are added in furnish.js)
  const lights = [];
  function warm(x, y, z, intensity = 6, dist = 7, color = 0xffd9a8) {
    const p = new THREE.PointLight(color, intensity, dist, 1.6);
    p.position.set(x, y, z);
    scene.add(p);
    lights.push(p);
    return p;
  }
  warm(0.25, 2.5, 0.0, 10, 9);          // living room ceiling
  warm(-4.7, 2.5, 0.5, 9, 8, 0xfff0d0); // kitchen
  warm(5.0, 2.4, -0.5, 8, 7);           // den
  warm(-3.5, -0.7, 0.0, 9, 9, 0xffe2b8); // basement
  warm(0.25, -0.7, 0.0, 10, 9, 0xffd9a8); // basement center (over the pong table)
  warm(4.0, -0.7, 0.0, 9, 9, 0xffd0a0); // basement
  warm(-5.9, -1.2, -2.0, 4, 5, 0xffe2b8); // stairwell
  g.userData.lights = lights;

  return g;
}
