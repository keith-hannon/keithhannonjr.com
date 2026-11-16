// The primary suite: a bedroom with a wall of glass facing the water (and a
// door to the deck), a primary bath, and a second bathroom off the bunk room.
// Bedrooms face the ocean, bathrooms face the street.
import * as THREE from "three";
import { H, SUITE as S, addCollider } from "./layout.js";
import { box, mat, setRound, PALETTE as C } from "./house.js";
import * as T from "./textures.js";

export function buildSuite(scene, house) {
  const g = new THREE.Group();
  g.name = "suite";
  scene.add(g);
  const wallH = H.wallH, t = H.wallT;
  const shingle = mat("shingleSide"), trim = mat("trim"), roof = mat("roof"), glass = mat("glassClear"), glassDark = mat("glassDark");
  const bedWall = mat("bedWall", { color: 0xdfe9ec, roughness: 0.95 });
  const bathWall = mat("bathWall", { color: 0xf7f5ef, roughness: 0.8 });
  const white = mat("white", { color: 0xffffff, roughness: 0.6 });
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const x0 = S.minX, x1 = S.minX + t, x2 = S.maxX, z1 = S.minZ, z2 = S.maxZ, zs = S.splitZ, bx = S.bathX;
  const cx = (x1 + x2) / 2, wd = x2 - x1;

  // ---------- floors + ceiling ----------
  const plane = (w, d, m, x, y, z, up = true) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    p.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
    p.position.set(x, y, z);
    p.receiveShadow = up;
    g.add(p);
    return p;
  };
  plane(x2 - x0, zs - z1, mat("suiteFloor", { map: T.plankTexture([4, 3], "#c7ab84"), roughness: 0.7 }), (x0 + x2) / 2, 0.002, (z1 + zs) / 2);
  const tile = T.artTexture("tile", 128, 128, (ctx, w) => {
    ctx.fillStyle = "#f4f6f5"; ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = "#c9d6d3"; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, w); ctx.moveTo(0, i * 32); ctx.lineTo(w, i * 32); ctx.stroke(); }
    ctx.fillStyle = "#9fd3c7";
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) ctx.fillRect(i * 32 + 12, j * 32 + 12, 8, 8);
  });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.repeat.set(5, 3);
  plane(x2 - x0, z2 - zs, new THREE.MeshStandardMaterial({ map: tile, roughness: 0.35 }), (x0 + x2) / 2, 0.002, (zs + z2) / 2);
  plane(wd + t, z2 - z1, mat("ceiling"), cx, wallH - 0.01, (z1 + z2) / 2, false);
  for (let z = z1 + 0.7; z < zs; z += 1.1) box(g, wd, 0.16, 0.12, trim, cx, wallH - 0.09, z, { collide: false, castShadow: false });

  // ---------- walls ----------
  // interior wall segments along X or Z with optional doorway gaps
  function wallZ(x, za, zb, m1, m2, doors = []) { // wall running along Z at given x
    let cur = za;
    const spans = [];
    for (const [d1, d2] of doors) { spans.push([cur, d1]); cur = d2; }
    spans.push([cur, zb]);
    for (const [a, b] of spans) {
      if (b - a < 0.02) continue;
      box(g, 0.07, wallH, b - a, m1, x - 0.035, wallH / 2, (a + b) / 2, { collide: false, castShadow: false });
      box(g, 0.07, wallH, b - a, m2, x + 0.035, wallH / 2, (a + b) / 2, { collide: false, castShadow: false });
      addCollider(x - 0.08, x + 0.08, a, b, "up");
    }
    for (const [d1, d2] of doors) {
      box(g, 0.14, wallH - 2.15, d2 - d1, m2, x, 2.15 + (wallH - 2.15) / 2, (d1 + d2) / 2, { collide: false, castShadow: false });
      box(g, 0.2, 0.1, d2 - d1 + 0.16, trim, x, 2.17, (d1 + d2) / 2, { collide: false, castShadow: false });
      for (const dz of [d1, d2]) box(g, 0.2, 2.15, 0.08, trim, x, 1.075, dz, { collide: false, castShadow: false });
    }
  }
  function wallX(z, xa, xb, m1, m2, doors = []) { // wall running along X at given z
    let cur = xa;
    const spans = [];
    for (const [d1, d2] of doors) { spans.push([cur, d1]); cur = d2; }
    spans.push([cur, xb]);
    for (const [a, b] of spans) {
      if (b - a < 0.02) continue;
      box(g, b - a, wallH, 0.07, m1, (a + b) / 2, wallH / 2, z - 0.035, { collide: false, castShadow: false });
      box(g, b - a, wallH, 0.07, m2, (a + b) / 2, wallH / 2, z + 0.035, { collide: false, castShadow: false });
      addCollider(a, b, z - 0.08, z + 0.08, "up");
    }
    for (const [d1, d2] of doors) {
      box(g, d2 - d1, wallH - 2.15, 0.14, m2, (d1 + d2) / 2, 2.15 + (wallH - 2.15) / 2, z, { collide: false, castShadow: false });
      box(g, d2 - d1 + 0.16, 0.1, 0.2, trim, (d1 + d2) / 2, 2.17, z, { collide: false, castShadow: false });
      for (const dx of [d1, d2]) box(g, 0.08, 2.15, 0.2, trim, dx, 1.075, z, { collide: false, castShadow: false });
    }
  }
  // shared wall with the bunk room / sunroom: one door from the sunroom into the bedroom,
  // one from the bunk room into the hall bath
  const sunDoor = [-2.35, -1.25], bathDoor = [2.2, 3.2];
  wallZ(x0 + t / 2, z1, z2, mat("sunWall"), bedWall, [sunDoor, bathDoor]);
  // bedroom / bathrooms partition, with the door to the primary bath
  const pBathDoor = [17.75, 18.75];
  wallX(zs, x1, x2, bedWall, bathWall, [pBathDoor]);
  // wall between the two bathrooms
  wallZ(bx, zs, z2, bathWall, bathWall);

  // exterior: front wall (street side), right wall, with small windows
  function win(x, z, rotY, w = 1.0, h = 1.2, y = 1.6) {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
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
    for (const sx of [-1, 1]) box(wg, 0.4, h + 0.18, 0.06, mat("shutter"), sx * (w / 2 + 0.32), 0, t / 2 + 0.05, { collide: false });
    g.add(wg);
  }
  box(g, x2 - x0 + t, wallH, t, shingle, (x0 + x2 + t) / 2, wallH / 2, z2 + t / 2, { collide: true });
  box(g, wd, wallH, 0.02, bathWall, cx, wallH / 2, z2 - 0.01, { collide: false, castShadow: false });
  box(g, t, wallH, z2 - z1 + t, shingle, x2 + t / 2, wallH / 2, (z1 + z2) / 2, { collide: true });
  box(g, 0.02, wallH, zs - z1, bedWall, x2 - 0.01, wallH / 2, (z1 + zs) / 2, { collide: false, castShadow: false });
  box(g, 0.02, wallH, z2 - zs, bathWall, x2 - 0.01, wallH / 2, (zs + z2) / 2, { collide: false, castShadow: false });
  win(14.9, z2 + t / 2, 0, 0.8, 0.9, 1.75);
  win(18.3, z2 + t / 2, 0, 0.8, 0.9, 1.75);
  win(x2 + t / 2, -2.1, Math.PI / 2, 1.3, 1.4);
  win(x2 + t / 2, 2.0, Math.PI / 2, 0.9, 0.9, 1.75);
  for (const [px, pz] of [[x2 + t, z2 + t], [x2 + t, z1 - t]]) box(g, 0.14, wallH, 0.14, trim, px, wallH / 2, pz, { collide: false });

  // back wall: glass facing the water, with a door to the deck
  const knee = 0.5, head = 2.5, bz = z1 - t / 2, dx1 = 15.9, dx2 = 17.1;
  function glassRun(ax, bxx) {
    const len = bxx - ax, mx = (ax + bxx) / 2;
    box(g, len, knee, t, shingle, mx, knee / 2, bz, { collide: false });
    box(g, len, wallH - head, t, shingle, mx, head + (wallH - head) / 2, bz, { collide: false });
    box(g, len, knee, 0.03, bedWall, mx, knee / 2, bz + t / 2 + 0.015, { collide: false, castShadow: false });
    box(g, len, wallH - head, 0.03, bedWall, mx, head + (wallH - head) / 2, bz + t / 2 + 0.015, { collide: false, castShadow: false });
    box(g, len, 0.06, t + 0.08, trim, mx, knee + 0.03, bz, { collide: false, castShadow: false });
    const n = Math.max(1, Math.round(len / 1.15));
    for (let i = 0; i <= n; i++) box(g, 0.09, head - knee, 0.09, trim, ax + (len * i) / n, (knee + head) / 2, bz, { collide: false, castShadow: false });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, head - knee), glass);
    pane.position.set(mx, (knee + head) / 2, bz);
    g.add(pane);
    addCollider(ax - 0.05, bxx + 0.05, bz - t / 2, bz + t / 2, "up");
  }
  glassRun(x0 + t, dx1);
  glassRun(dx2, x2 + t);
  box(g, dx2 - dx1, wallH - H.doorH, t, trim, (dx1 + dx2) / 2, H.doorH + (wallH - H.doorH) / 2, bz, { collide: false });
  const door = new THREE.Group();
  door.position.set(dx1, 0, bz);
  const dw = dx2 - dx1 - 0.04;
  for (const y of [0.07, H.doorH - 0.1]) box(door, dw, 0.14, 0.05, trim, dw / 2, y, 0, { collide: false });
  box(door, dw, 0.04, 0.05, trim, dw / 2, 1.1, 0, { collide: false });
  for (const sx of [0.05, dw - 0.05]) box(door, 0.1, H.doorH - 0.04, 0.05, trim, sx, (H.doorH - 0.04) / 2, 0, { collide: false });
  const dg = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.2, H.doorH - 0.26), glass);
  dg.position.set(dw / 2, H.doorH / 2, 0);
  door.add(dg);
  g.add(door);
  house.userData.doors.push({ group: door, x: (dx1 + dx2) / 2, z: z1, sign: 1 });

  // ---------- roof (gable, ridge front-to-back) ----------
  {
    const eave = wallH, ridge = 5.35, half = wd / 2 + t + 0.45, mx = cx + t / 2, mz = (z1 + z2) / 2;
    const len = Math.hypot(half, ridge - eave), pitch = Math.atan2(ridge - eave, half), depth = z2 - z1 + t * 2 + 0.9;
    for (const s of [1, -1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, depth), roof);
      r.position.set(mx + (s * half) / 2, (eave + ridge) / 2 + 0.05, mz);
      r.rotation.z = -s * pitch;
      r.castShadow = r.receiveShadow = true;
      g.add(r);
    }
    box(g, 0.28, 0.1, depth + 0.05, mat("ridge"), mx, ridge + 0.1, mz, { collide: false });
    const tri = new THREE.Shape();
    tri.moveTo(-wd / 2 - t, 0); tri.lineTo(wd / 2 + t, 0); tri.lineTo(0, ridge - eave); tri.closePath();
    const tg = new THREE.ExtrudeGeometry(tri, { depth: t, bevelEnabled: false });
    for (const z of [z2, z1 - t]) {
      const gm = new THREE.Mesh(tg, shingle);
      gm.position.set(mx, eave, z);
      gm.castShadow = true;
      g.add(gm);
    }
    // round attic window in the street-facing gable
    const ow = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), trim);
    ow.rotation.x = Math.PI / 2;
    ow.position.set(mx, eave + 1.0, z2 + t + 0.02);
    g.add(ow);
    const og = new THREE.Mesh(new THREE.CircleGeometry(0.33, 20), glassDark);
    og.position.set(mx, eave + 1.0, z2 + t + 0.07);
    g.add(og);
  }

  // ---------- lights ----------
  const l1 = new THREE.PointLight(0xffe2b8, 7, 8, 1.7);
  l1.position.set(cx, 2.4, (z1 + zs) / 2);
  const l2 = new THREE.PointLight(0xfff6e6, 6, 7, 1.7);
  l2.position.set(bx, 2.5, (zs + z2) / 2);
  scene.add(l1, l2);

  // ================= Furniture =================
  setRound(true);
  const cyl = (rt, rb, h, m, x, y, z, seg = 16) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    g.add(o);
    return o;
  };
  const oak = mat("oak", { color: 0xa9774a, roughness: 0.7 }), brass = std(0xd4a94a, { metalness: 0.8, roughness: 0.3 });
  const shade = mat("shade", { color: 0xfff2d6, roughness: 1, emissive: 0xffd9a0, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const chrome = std(0xdfe3e6, { metalness: 0.9, roughness: 0.2 });

  // --- Primary bedroom: king bed on the partition wall, looking straight out at the water ---
  const bxC = 15.9, hz = zs - 0.12; // headboard against the partition
  box(g, 2.1, 1.25, 0.14, std(C.navy), bxC, 0.7, hz, { collide: false });                 // upholstered headboard
  box(g, 2.0, 0.32, 2.1, white, bxC, 0.2, hz - 1.1, { collide: false });                  // base
  box(g, 1.94, 0.24, 2.04, std(0xffffff), bxC, 0.48, hz - 1.1, { collide: false });       // mattress
  const duvet = T.artTexture("duvet", 64, 64, (ctx, w) => {
    ctx.fillStyle = "#fbfaf6"; ctx.fillRect(0, 0, w, w);
    ctx.fillStyle = "#9fd3c7"; for (let i = 0; i < 8; i++) ctx.fillRect(i * 8 + 3, 0, 1.5, w);
  });
  box(g, 2.0, 0.1, 1.4, new THREE.MeshStandardMaterial({ map: duvet, roughness: 1 }), bxC, 0.62, hz - 1.45, { collide: false, castShadow: false });
  box(g, 2.0, 0.07, 0.5, std(C.navy), bxC, 0.66, hz - 1.95, { collide: false, castShadow: false }); // folded throw
  for (const px of [-0.5, 0.5]) {
    box(g, 0.75, 0.16, 0.42, std(0xffffff), bxC + px, 0.68, hz - 0.36, { collide: false, castShadow: false });
    box(g, 0.5, 0.32, 0.12, std(px < 0 ? C.seafoam : C.butter), bxC + px * 0.9, 0.78, hz - 0.62, { collide: false, castShadow: false }).rotation.x = -0.25;
  }
  addCollider(bxC - 1.05, bxC + 1.05, hz - 2.2, hz + 0.1, "up");
  for (const sx of [-1, 1]) {
    const nx = bxC + sx * 1.38;
    box(g, 0.5, 0.55, 0.42, white, nx, 0.275, hz - 0.2, { collide: false });
    cyl(0.012, 0.012, 0.06, brass, nx, 0.36, hz - 0.42, 6).rotation.x = Math.PI / 2;
    cyl(0.08, 0.1, 0.03, brass, nx, 0.57, hz - 0.2);
    cyl(0.015, 0.015, 0.3, brass, nx, 0.72, hz - 0.2, 8);
    cyl(0.1, 0.15, 0.22, shade, nx, 0.95, hz - 0.2);
  }
  box(g, 0.2, 0.03, 0.14, std(C.nantucketRed), bxC - 1.38, 0.57, hz - 0.05, { collide: false, castShadow: false }); // paperback
  // bench at the foot of the bed
  box(g, 1.5, 0.12, 0.42, std(0xe9dcc3), bxC, 0.44, hz - 2.5, { collide: false });
  for (const [lx, lz] of [[-0.68, -0.16], [0.68, -0.16], [-0.68, 0.16], [0.68, 0.16]]) box(g, 0.05, 0.38, 0.05, oak, bxC + lx, 0.19, hz - 2.5 + lz, { collide: false, castShadow: false });
  addCollider(bxC - 0.75, bxC + 0.75, hz - 2.7, hz - 2.3, "up");
  // rug
  const rug = plane(3.6, 2.6, mat("rugSuite", { map: T.rugTexture(["#e9dcc3", "#ffffff", "#9fd3c7", "#ffffff"]), roughness: 1 }), bxC + 0.3, 0.012, hz - 2.0);
  // dresser + round mirror on the right wall
  box(g, 0.5, 0.9, 1.5, white, x2 - 0.3, 0.45, -0.8, { collide: true, level: "up" });
  for (let i = 0; i < 3; i++) for (const dz of [-0.36, 0.36]) cyl(0.015, 0.015, 0.04, brass, x2 - 0.56, 0.2 + i * 0.27, -0.8 + dz, 8).rotation.z = Math.PI / 2;
  const mir = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 28), brass);
  mir.rotation.z = Math.PI / 2;
  mir.position.set(x2 - 0.04, 1.65, -0.8);
  g.add(mir);
  const mg = new THREE.Mesh(new THREE.CircleGeometry(0.37, 28), std(0xdff1f7, { metalness: 0.9, roughness: 0.05 }));
  mg.rotation.y = -Math.PI / 2;
  mg.position.set(x2 - 0.06, 1.65, -0.8);
  g.add(mg);
  // reading chair + floor lamp in the glass corner, facing the water
  {
    const s = new THREE.Group();
    s.position.set(x2 - 0.9, 0, -3.2);
    s.rotation.y = Math.PI - 0.5;
    g.add(s);
    const fab = std(0xf3ead6);
    box(s, 0.85, 0.38, 0.8, fab, 0, 0.19, 0, { collide: false });
    box(s, 0.85, 0.55, 0.2, fab, 0, 0.6, -0.3, { collide: false });
    for (const ax of [-0.34, 0.34]) box(s, 0.18, 0.28, 0.8, fab, ax, 0.5, 0, { collide: false });
    box(s, 0.36, 0.3, 0.12, std(C.navy), 0, 0.58, -0.14, { collide: false, castShadow: false });
    addCollider(x2 - 1.3, x2 - 0.5, -3.6, -2.8, "up");
  }
  cyl(0.14, 0.16, 0.03, brass, x2 - 0.4, 0.015, -4.0);
  cyl(0.018, 0.018, 1.45, brass, x2 - 0.4, 0.74, -4.0, 8);
  cyl(0.16, 0.22, 0.28, shade, x2 - 0.4, 1.56, -4.0);
  // art over the bed: a long horizon print
  const art = T.artTexture("suiteArt", 256, 96, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#f6e6cf"); gr.addColorStop(0.55, "#f4c9a8"); gr.addColorStop(0.56, "#5f93a8"); gr.addColorStop(1, "#2f4a6b");
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(170, 52); ctx.lineTo(170, 28); ctx.lineTo(156, 52); ctx.closePath(); ctx.fill();
  });
  box(g, 1.7, 0.66, 0.04, oak, bxC, 1.95, zs - 0.09, { collide: false, castShadow: false });
  const ap = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.56), new THREE.MeshStandardMaterial({ map: art, roughness: 0.9 }));
  ap.rotation.y = Math.PI;
  ap.position.set(bxC, 1.95, zs - 0.115);
  g.add(ap);
  // luggage rack + weekender bag by the door from the sunroom
  box(g, 0.6, 0.3, 0.36, std(0x8a5a3a), x1 + 0.45, 0.6, -3.6, { collide: false });
  for (const lz of [-0.14, 0.14]) box(g, 0.6, 0.04, 0.04, oak, x1 + 0.45, 0.42, -3.6 + lz, { collide: false, castShadow: false });
  for (const [lx, lz] of [[-0.26, -0.14], [0.26, -0.14], [-0.26, 0.14], [0.26, 0.14]]) box(g, 0.03, 0.42, 0.03, oak, x1 + 0.45 + lx, 0.21, -3.6 + lz, { collide: false, castShadow: false });
  addCollider(x1 + 0.1, x1 + 0.8, -3.85, -3.35, "up");

  // --- Bathrooms ---
  const porcelain = std(0xffffff, { roughness: 0.25 });
  function toilet(x, z, rotY) {
    const o = new THREE.Group();
    o.position.set(x, 0, z);
    o.rotation.y = rotY;
    g.add(o);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 18), porcelain);
    bowl.position.set(0, 0.2, 0.1);
    bowl.scale.z = 1.25;
    o.add(bowl);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 18), porcelain);
    lid.position.set(0, 0.42, 0.1);
    lid.scale.z = 1.25;
    o.add(lid);
    box(o, 0.42, 0.38, 0.18, porcelain, 0, 0.6, -0.2, { collide: false });
    box(o, 0.06, 0.02, 0.03, chrome, -0.16, 0.74, -0.1, { collide: false, castShadow: false });
    const s = Math.sin(rotY), c = Math.cos(rotY);
    addCollider(x - 0.3, x + 0.3, z - 0.35, z + 0.35, "up");
  }
  function vanity(x, z, w, rotY, sinks) {
    const o = new THREE.Group();
    o.position.set(x, 0, z);
    o.rotation.y = rotY;
    g.add(o);
    box(o, w, 0.8, 0.52, std(C.navy, { roughness: 0.6 }), 0, 0.4, 0, { collide: false });
    box(o, w + 0.06, 0.05, 0.58, std(0xf7f5f0, { roughness: 0.25 }), 0, 0.83, 0, { collide: false });
    for (let i = 0; i < sinks; i++) {
      const sx = (i - (sinks - 1) / 2) * (w / sinks);
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.05, 20), porcelain);
      basin.position.set(sx, 0.87, 0.02);
      o.add(basin);
      const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), brass);
      tap.position.set(sx, 0.94, -0.2);
      o.add(tap);
      box(o, 0.02, 0.02, 0.12, brass, sx, 1.02, -0.15, { collide: false, castShadow: false });
      // mirror above each sink
      box(o, 0.56, 0.8, 0.03, brass, sx, 1.6, -0.25, { collide: false, castShadow: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.74), std(0xdff1f7, { metalness: 0.9, roughness: 0.05 }));
      m.position.set(sx, 1.6, -0.232);
      o.add(m);
      for (const kx of [-0.12, 0.12]) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), brass);
        knob.position.set(sx + kx, 0.45, 0.27);
        o.add(knob);
      }
    }
    const along = Math.abs(Math.sin(rotY)) > 0.5;
    addCollider(x - (along ? 0.3 : w / 2), x + (along ? 0.3 : w / 2), z - (along ? w / 2 : 0.3), z + (along ? w / 2 : 0.3), "up");
  }
  function towelBar(x, z, rotY, cols) {
    const o = new THREE.Group();
    o.position.set(x, 1.25, z);
    o.rotation.y = rotY;
    g.add(o);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), chrome);
    bar.rotation.z = Math.PI / 2;
    bar.position.z = 0.06;
    o.add(bar);
    cols.forEach((col, i) => box(o, 0.36, 0.55, 0.04, std(col), -0.22 + i * 0.44, -0.24, 0.07, { collide: false, castShadow: false }));
  }
  // Primary bath (right): double vanity on the dividing wall, soaking tub under the window, glass shower
  vanity(bx + 0.36, 2.05, 1.9, Math.PI / 2, 2);
  {
    const tub = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.0, 6, 18), porcelain);
    tub.rotation.x = Math.PI / 2;
    tub.scale.set(1, 1, 0.78);
    tub.position.set(x2 - 0.55, 0.36, 1.9);
    tub.castShadow = true;
    g.add(tub);
    const water = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 4, 14), std(0xbfe6f2, { roughness: 0.1, transparent: true, opacity: 0.85 }));
    water.rotation.x = Math.PI / 2;
    water.scale.set(1, 1, 0.1);
    water.position.set(x2 - 0.55, 0.6, 1.9);
    g.add(water);
    cyl(0.015, 0.015, 0.9, brass, x2 - 0.2, 0.45, 2.75, 8);
    box(g, 0.2, 0.02, 0.03, brass, x2 - 0.3, 0.9, 2.75, { collide: false, castShadow: false });
    addCollider(x2 - 0.95, x2, 1.05, 2.75, "up");
  }
  // glass shower in the front-left corner of the primary bath
  {
    const sx1 = bx + 0.07, sx2 = bx + 1.2, sz1 = 3.25 - 1.0, sz2 = z2;
    box(g, 0.03, 2.1, sz2 - 3.0, glass, sx2, 1.05, (3.0 + sz2) / 2 + 0.0, { collide: false, castShadow: false });
  }
  toilet(19.0, z2 - 0.4, Math.PI);
  towelBar(19.35, zs + 0.08, 0, [0xffffff, C.seafoam]);
  plane(1.1, 0.7, std(C.navy), 18.3, 0.012, 1.3);
  // Hall bath (left): vanity, toilet, tub/shower with a striped curtain
  vanity(14.5, zs + 0.34, 1.1, 0, 1);
  toilet(15.9, zs + 0.5, 0);
  box(g, 0.8, 0.55, 1.7, porcelain, bx - 0.48, 0.275, z2 - 0.95, { collide: true, level: "up" });
  box(g, 0.66, 0.06, 1.56, std(0xbfe6f2, { roughness: 0.1 }), bx - 0.48, 0.5, z2 - 0.95, { collide: false, castShadow: false });
  const curtain = T.artTexture("curtain", 64, 64, (ctx, w) => {
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : "#2f4a6b"; ctx.fillRect(i * 8, 0, 8, w); }
  });
  box(g, 0.03, 1.5, 0.9, new THREE.MeshStandardMaterial({ map: curtain, roughness: 1, side: THREE.DoubleSide }), bx - 0.9, 1.3, z2 - 1.3, { collide: false, castShadow: false });
  const rod = cyl(0.012, 0.012, 1.7, chrome, bx - 0.9, 2.08, z2 - 0.95, 8);
  rod.rotation.x = Math.PI / 2;
  towelBar(x1 + 0.08, 1.2, Math.PI / 2, [C.butter, 0xffffff]);
  plane(0.9, 0.6, std(C.seafoam), 14.6, 0.012, 1.35);

  setRound(false);
  return { bed: { x: bxC, z: hz - 2.9 } };
}
