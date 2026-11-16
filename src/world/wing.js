// The side wing: a bunk room at the front and a glassed-in sunroom at the back
// that opens onto the deck.
import * as THREE from "three";
import { H, WING as W, addCollider } from "./layout.js";
import { box, mat, setRound, PALETTE as C } from "./house.js";
import * as T from "./textures.js";

export function buildWing(scene, house) {
  setRound(true);
  const g = new THREE.Group();
  g.name = "wing";
  scene.add(g);
  const wallH = H.wallH, t = H.wallT;
  const shingle = mat("shingleSide"), trim = mat("trim"), roof = mat("roof"), glassDark = mat("glassDark");
  const glass = mat("glassClear");
  const bunkWall = mat("bunkWall", { color: 0xf3ead6, roughness: 0.95 });
  const sunWall = mat("sunWall", { color: 0xfbf9f3, roughness: 0.9 });
  const x1 = H.maxX + t, x2 = W.maxX, z1 = W.minZ, z2 = W.maxZ, zs = W.splitZ;
  const cx = (x1 + x2) / 2, wd = x2 - x1;

  // ---- floor + ceiling ----
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(x2 - H.maxX, z2 - z1), mat("wingFloor", { map: T.plankTexture([3, 4], "#c2a27a"), roughness: 0.7 }));
  fl.rotation.x = -Math.PI / 2;
  fl.position.set((H.maxX + x2) / 2, 0.002, (z1 + z2) / 2);
  fl.receiveShadow = true;
  g.add(fl);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(wd, z2 - z1), mat("ceiling"));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, wallH - 0.01, (z1 + z2) / 2);
  g.add(ceil);
  // exposed white beams in the sunroom
  for (let z = z1 + 0.6; z < zs; z += 1.0) box(g, wd, 0.16, 0.12, trim, cx, wallH - 0.09, z, { collide: false, castShadow: false });

  // ---- bunk room walls (front part): solid shingled walls with windows ----
  // front wall
  box(g, wd + t, wallH, t, shingle, cx + t / 2, wallH / 2, z2 + t / 2, { collide: true });
  box(g, wd, wallH, 0.02, bunkWall, cx, wallH / 2, z2 - 0.01, { collide: false, castShadow: false });
  // right wall, bunk-room part
  // main-house side (inside face only; the doorway is cut in house.js)
  box(g, 0.02, wallH, W.doorZ1 - z1, sunWall, x1 + 0.01, wallH / 2, (z1 + W.doorZ1) / 2, { collide: false, castShadow: false });
  box(g, 0.02, wallH, z2 - W.doorZ2, bunkWall, x1 + 0.01, wallH / 2, (W.doorZ2 + z2) / 2, { collide: false, castShadow: false });
  box(g, 0.02, wallH - 2.15, W.doorZ2 - W.doorZ1, bunkWall, x1 + 0.01, 2.15 + (wallH - 2.15) / 2, (W.doorZ1 + W.doorZ2) / 2, { collide: false, castShadow: false });

  function win(x, z, rotY, w = 1.1, h = 1.3) {
    const wg = new THREE.Group();
    wg.position.set(x, 1.55, z);
    wg.rotation.y = rotY;
    box(wg, w + 0.18, h + 0.18, t + 0.12, trim, 0, 0, 0, { collide: false, castShadow: false });
    for (const s of [1, -1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), s > 0 ? glassDark : mat("innerGlass"));
      p.position.z = s * (t / 2 + 0.065);
      if (s < 0) p.rotation.y = Math.PI;
      wg.add(p);
      box(wg, 0.03, h, 0.02, trim, 0, 0, s * (t / 2 + 0.07), { collide: false, castShadow: false });
      box(wg, w, 0.03, 0.02, trim, 0, 0, s * (t / 2 + 0.07), { collide: false, castShadow: false });
    }
    const sh = mat("shutter");
    box(wg, 0.42, h + 0.18, 0.06, sh, -(w / 2 + 0.33), 0, t / 2 + 0.05, { collide: false });
    box(wg, 0.42, h + 0.18, 0.06, sh, w / 2 + 0.33, 0, t / 2 + 0.05, { collide: false });
    g.add(wg);
  }
  win(cx, z2 + t / 2, 0);

  // ---- partition between bunk room and sunroom, with a wide cased opening ----
  const o1 = cx - 1.1, o2 = cx + 1.1;
  for (const [a, b] of [[x1, o1], [o2, x2]]) {
    box(g, b - a, wallH, 0.07, bunkWall, (a + b) / 2, wallH / 2, zs + 0.035, { collide: false, castShadow: false });
    box(g, b - a, wallH, 0.07, sunWall, (a + b) / 2, wallH / 2, zs - 0.035, { collide: false, castShadow: false });
    addCollider(a, b, zs - 0.07, zs + 0.07, "up");
  }
  box(g, o2 - o1, wallH - 2.2, 0.14, sunWall, cx, 2.2 + (wallH - 2.2) / 2, zs, { collide: false, castShadow: false });
  box(g, o2 - o1 + 0.2, 0.1, 0.2, trim, cx, 2.2, zs, { collide: false, castShadow: false });
  for (const ox of [o1, o2]) box(g, 0.1, 2.2, 0.2, trim, ox, 1.1, zs, { collide: false, castShadow: false });

  // ---- sunroom: knee wall + glass on the back and right sides, glass door to the deck ----
  const knee = 0.7, head = 2.45;
  const dx1 = 9.3, dx2 = 10.5; // door opening on the back wall
  function glassWall(ax, az, bx, bz, collide = true) {
    const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
    const len = alongX ? bx - ax : bz - az;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    box(g, alongX ? len : t, knee, alongX ? t : len, shingle, mx, knee / 2, mz, { collide: false });
    box(g, alongX ? len : t, wallH - head, alongX ? t : len, shingle, mx, head + (wallH - head) / 2, mz, { collide: false });
    box(g, alongX ? len : t + 0.06, 0.06, alongX ? t + 0.06 : len, trim, mx, knee + 0.03, mz, { collide: false, castShadow: false });
    const n = Math.max(1, Math.round(len / 1.1));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      box(g, 0.09, head - knee, 0.09, trim, alongX ? ax + len * u : mx, (knee + head) / 2, alongX ? mz : az + len * u, { collide: false, castShadow: false });
    }
    box(g, alongX ? len : 0.05, 0.05, alongX ? 0.05 : len, trim, mx, (knee + head) / 2 + 0.3, mz, { collide: false, castShadow: false });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, head - knee), glass);
    pane.position.set(mx, (knee + head) / 2, mz);
    if (!alongX) pane.rotation.y = Math.PI / 2;
    g.add(pane);
    if (collide) addCollider(Math.min(ax, bx) - t / 2, Math.max(ax, bx) + t / 2, Math.min(az, bz) - t / 2, Math.max(az, bz) + t / 2, "both");
  }
  const bz = z1 - t / 2;
  glassWall(x1, bz, dx1, bz);
  glassWall(dx2, bz, x2 + t, bz);
  box(g, dx2 - dx1, wallH - H.doorH, t, trim, (dx1 + dx2) / 2, H.doorH + (wallH - H.doorH) / 2, bz, { collide: false });
  for (const sx of [x1 - 0.02, x2 + t]) box(g, 0.14, wallH, 0.14, trim, sx, wallH / 2, bz, { collide: false });
  box(g, 0.14, wallH, 0.14, trim, x2 + t, wallH / 2, z2 + t, { collide: false });
  // the door itself
  const door = new THREE.Group();
  door.position.set(dx1, 0, bz);
  const dw = dx2 - dx1 - 0.04;
  for (const y of [0.07, H.doorH - 0.1, 1.1]) box(door, dw, y === 1.1 ? 0.04 : 0.14, 0.05, trim, dw / 2, y, 0, { collide: false });
  for (const sx of [0.05, dw - 0.05]) box(door, 0.1, H.doorH - 0.04, 0.05, trim, sx, (H.doorH - 0.04) / 2, 0, { collide: false });
  const dg = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.2, H.doorH - 0.26), glass);
  dg.position.set(dw / 2, H.doorH / 2, 0);
  door.add(dg);
  g.add(door);
  house.userData.doors.push({ group: door, x: (dx1 + dx2) / 2, z: z1, sign: 1 });

  // ---- roof: a lower gable with its ridge running front-to-back ----
  {
    const eave = wallH, ridge = 5.1, half = wd / 2 + t + 0.45;
    const len = Math.hypot(half, ridge - eave), pitch = Math.atan2(ridge - eave, half);
    const depth = z2 - z1 + t * 2 + 0.9, mz = (z1 + z2) / 2;
    for (const s of [1, -1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, depth), roof);
      r.position.set(cx + t / 2 + (s * half) / 2, (eave + ridge) / 2 + 0.05, mz);
      r.rotation.z = -s * pitch;
      r.castShadow = true;
      r.receiveShadow = true;
      g.add(r);
    }
    box(g, 0.28, 0.1, depth + 0.05, mat("ridge"), cx + t / 2, ridge + 0.1, mz, { collide: false });
    const tri = new THREE.Shape();
    tri.moveTo(-wd / 2 - t, 0); tri.lineTo(wd / 2 + t, 0); tri.lineTo(0, ridge - eave); tri.closePath();
    const tg = new THREE.ExtrudeGeometry(tri, { depth: t, bevelEnabled: false });
    for (const z of [z2, z1 - t]) {
      const gm = new THREE.Mesh(tg, shingle);
      gm.position.set(cx + t / 2, eave, z);
      gm.castShadow = true;
      g.add(gm);
    }
    box(g, wd + t * 2 + 0.9, 0.2, 0.26, trim, cx + t / 2, eave + 0.04, z2 + t + 0.3, { collide: false });
  }

  // ---- lights ----
  const l1 = new THREE.PointLight(0xffe2b8, 6, 7, 1.7);
  l1.position.set(cx, 2.4, (zs + z2) / 2);
  const l2 = new THREE.PointLight(0xfff3dc, 5, 7, 1.7);
  l2.position.set(cx, 2.3, (z1 + zs) / 2);
  scene.add(l1, l2);

  // ================= Furniture =================
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const white = mat("white", { color: 0xffffff, roughness: 0.6 }), oak = mat("oak", { color: 0xa9774a, roughness: 0.7 });
  const shade = mat("shade", { color: 0xfff2d6, roughness: 1, emissive: 0xffd9a0, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const cyl = (rt, rb, h, m, x, y, z, seg = 10) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    g.add(o);
    return o;
  };

  // --- Bunk room: two built-in bunks, striped bedding, duffels ---
  function bunk(bx, bzc, quiltA, quiltB) {
    const L = 2.0, Wd = 1.0;
    for (const px of [bx - Wd / 2, bx + Wd / 2]) for (const pz of [bzc - L / 2, bzc + L / 2]) box(g, 0.09, 1.9, 0.09, white, px, 0.95, pz, { collide: false });
    [[0.45, quiltA], [1.4, quiltB]].forEach(([y, q]) => {
      box(g, Wd, 0.1, L, white, bx, y - 0.1, bzc, { collide: false });
      box(g, Wd - 0.08, 0.16, L - 0.08, std(0xffffff), bx, y + 0.03, bzc, { collide: false });
      box(g, Wd - 0.06, 0.06, L * 0.62, q, bx, y + 0.13, bzc - L * 0.17, { collide: false, castShadow: false });
      box(g, 0.6, 0.1, 0.34, std(0xffffff), bx, y + 0.16, bzc + L / 2 - 0.26, { collide: false, castShadow: false });
      box(g, Wd, 0.22, 0.05, white, bx, y + 0.2, bzc - L / 2, { collide: false, castShadow: false });
      box(g, Wd, 0.3, 0.05, white, bx, y + 0.24, bzc + L / 2, { collide: false, castShadow: false });
    });
    box(g, 0.05, 0.2, L, white, bx + (bx > cx ? -Wd / 2 : Wd / 2), 1.6, bzc, { collide: false, castShadow: false });
    // ladder
    const lx = bx + (bx > cx ? -Wd / 2 - 0.04 : Wd / 2 + 0.04);
    for (const lz of [bzc - 0.75, bzc - 0.4]) box(g, 0.04, 1.5, 0.04, oak, lx, 0.75, lz, { collide: false, castShadow: false });
    for (let i = 0; i < 4; i++) box(g, 0.04, 0.03, 0.35, oak, lx, 0.3 + i * 0.33, bzc - 0.575, { collide: false, castShadow: false });
    addCollider(bx - Wd / 2 - 0.05, bx + Wd / 2 + 0.05, bzc - L / 2, bzc + L / 2, "up");
  }
  const quilt = (key, a, b) => {
    const tx = T.artTexture("quilt" + key, 64, 64, (ctx, S) => {
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? a : b; ctx.fillRect(0, i * 8, S, 8); }
    });
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 1 });
  };
  bunk(x2 - 0.6, 0.62, quilt("a", "#2f4a6b", "#ffffff"), quilt("b", "#b5534a", "#ffffff"));
  bunk(x1 + 0.6, 0.62, quilt("c", "#9fd3c7", "#ffffff"), quilt("d", "#f4d98b", "#ffffff"));
  // rug, duffel bags, flip-flops, a dresser with a lamp, pennants
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), mat("rugBunk", { map: T.rugTexture(["#9fd3c7", "#f3ead6", "#2f4a6b", "#f3ead6"]), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(cx, 0.012, 1.6);
  g.add(rug);
  for (const [dx, dz, col, ry] of [[cx - 0.4, 2.9, C.navy, 0.3], [cx + 0.5, 3.0, 0x6b8e6b, -0.4], [cx + 1.0, 0.1, C.nantucketRed, 1.2]]) {
    const d = cyl(0.2, 0.2, 0.6, std(col), dx, 0.2, dz, 10);
    d.rotation.z = Math.PI / 2;
    d.rotation.y = ry;
  }
  box(g, 0.9, 0.8, 0.42, white, cx - 0.2, 0.4, z2 - 0.26, { collide: true, level: "up" });
  for (let i = 0; i < 3; i++) box(g, 0.8, 0.02, 0.02, std(0xd4a94a, { metalness: 0.7 }), cx - 0.2, 0.2 + i * 0.25, z2 - 0.48, { collide: false, castShadow: false });
  cyl(0.02, 0.02, 0.3, std(0xd4a94a, { metalness: 0.7 }), cx - 0.45, 0.95, z2 - 0.26, 6);
  cyl(0.1, 0.15, 0.2, shade, cx - 0.45, 1.15, z2 - 0.26, 12);
  const pen = (px, col) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.1); s.lineTo(0.55, 0); s.lineTo(0, -0.1); s.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), std(col, { side: THREE.DoubleSide }));
    m.position.set(px, 2.25, z2 - 0.03);
    m.rotation.y = Math.PI;
    g.add(m);
  };
  pen(cx + 1.6, 0xa51c30);
  pen(cx + 0.7, C.navy);
  // beach towels on wall hooks beside the door from the den

  // --- Sunroom: wicker sofa + chairs facing the water, card table, plants, a telescope ---
  const wicker = std(0xd8c3a0), cushion = std(0xffffff), cush2 = std(C.seafoam);
  function wickerSeat(sx, sz, w, rotY) {
    const s = new THREE.Group();
    s.position.set(sx, 0, sz);
    s.rotation.y = rotY;
    g.add(s);
    box(s, w, 0.34, 0.8, wicker, 0, 0.17, 0, { collide: false });
    box(s, w, 0.5, 0.14, wicker, 0, 0.55, -0.33, { collide: false });
    for (const ax of [-w / 2 + 0.07, w / 2 - 0.07]) box(s, 0.14, 0.26, 0.8, wicker, ax, 0.46, 0, { collide: false });
    box(s, w - 0.3, 0.12, 0.6, cushion, 0, 0.4, 0.05, { collide: false, castShadow: false });
    box(s, 0.36, 0.36, 0.12, cush2, -w / 2 + 0.38, 0.62, -0.2, { collide: false, castShadow: false }).rotation.x = -0.2;
    const along = Math.abs(Math.sin(rotY)) > 0.5;
    addCollider(sx - (along ? 0.4 : w / 2), sx + (along ? 0.4 : w / 2), sz - (along ? w / 2 : 0.4), sz + (along ? w / 2 : 0.4), "up");
  }
  wickerSeat(x1 + 0.6, -2.6, 1.9, Math.PI / 2);
  wickerSeat(x2 - 0.6, -3.2, 0.9, -Math.PI / 2);
  // low table with a half-finished puzzle and playing cards
  box(g, 1.0, 0.05, 0.6, oak, x1 + 1.75, 0.4, -2.6, { collide: true, level: "up" });
  for (const [lx, lz] of [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]]) box(g, 0.05, 0.4, 0.05, oak, x1 + 1.75 + lx, 0.2, -2.6 + lz, { collide: false, castShadow: false });
  box(g, 0.5, 0.01, 0.36, std(0x6aa0c8), x1 + 1.65, 0.43, -2.6, { collide: false, castShadow: false });
  for (let i = 0; i < 5; i++) box(g, 0.06, 0.004, 0.09, std(0xffffff), x1 + 2.05 + (i % 2) * 0.04, 0.43 + i * 0.004, -2.75 + i * 0.07, { collide: false, castShadow: false }).rotation.y = i * 0.4;
  // potted palms / ferns
  for (const [px, pz] of [[x1 + 0.45, -4.05], [x2 - 0.45, -0.85]]) {
    cyl(0.2, 0.15, 0.36, std(0xfafafa), px, 0.18, pz, 12);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 4), std(0x4f8a4e));
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(px + Math.cos(a) * 0.18, 0.75, pz + Math.sin(a) * 0.18);
      leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      g.add(leaf);
    }
    addCollider(px - 0.25, px + 0.25, pz - 0.25, pz + 0.25, "up");
  }
  // brass telescope pointed at the water
  const tel = new THREE.Group();
  tel.position.set(cx + 0.9, 0, -3.8);
  g.add(tel);
  const brass = std(0xd4a94a, { metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 5), std(0x5c3d26));
    const a = (i / 3) * Math.PI * 2;
    leg.position.set(Math.cos(a) * 0.18, 0.62, Math.sin(a) * 0.18);
    leg.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
    tel.add(leg);
  }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.8, 10), brass);
  tube.rotation.x = Math.PI / 2 - 0.12;
  tube.position.y = 1.3;
  tel.add(tube);
  addCollider(cx + 0.65, cx + 1.15, -4.05, -3.55, "up");
  // striped rug + ceiling fan
  const srug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), mat("rugSun", { map: T.rugTexture(["#f4d98b", "#ffffff", "#9fd3c7", "#ffffff"]), roughness: 1 }));
  srug.rotation.x = -Math.PI / 2;
  srug.position.set(cx, 0.012, -2.5);
  g.add(srug);
  const fan = new THREE.Group();
  fan.position.set(cx, wallH - 0.4, -2.5);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.16), oak);
    blade.position.set(Math.cos((i * Math.PI) / 2) * 0.5, 0, Math.sin((i * Math.PI) / 2) * 0.5);
    blade.rotation.y = -(i * Math.PI) / 2;
    fan.add(blade);
  }
  g.add(fan);
  cyl(0.02, 0.02, 0.4, white, cx, wallH - 0.2, -2.5, 6);
  cyl(0.1, 0.1, 0.1, white, cx, wallH - 0.4, -2.5, 10);

  setRound(false);
  return { fan };
}
