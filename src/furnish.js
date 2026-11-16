// Stage b: furniture, decor, and the interactive link objects.
import * as THREE from "three";
import { H, addCollider } from "./world/layout.js";
import { box, mat, setRound, PALETTE } from "./world/house.js";
import * as T from "./world/textures.js";
import { Interactions, linkCard } from "./interact.js";
import { SITE, LABELS } from "../site.config.js";
import { games } from "./games/registry.js";
import { addFun } from "./fun.js";
import { sfx } from "./sfx.js";

const C = PALETTE;

export function furnish(world, onUpdate) {
  const { scene, player, isMobile } = world;
  setRound(true);
  const g = new THREE.Group();
  g.name = "furniture";
  scene.add(g);
  const ix = new Interactions(world);
  world.interactions = ix;

  // ---------- Shared materials ----------
  const white = mat("white", { color: 0xffffff, roughness: 0.6 });
  const navy = mat("navyFab", { color: C.navy, roughness: 1 });
  const red = mat("redFab", { color: C.nantucketRed, roughness: 0.9 });
  const butter = mat("butterFab", { color: C.butter, roughness: 0.9 });
  const seafoam = mat("seafoamPaint", { color: C.seafoam, roughness: 0.7 });
  const oak = mat("oak", { color: 0xa9774a, roughness: 0.7 });
  const walnut = mat("walnut", { color: 0x5c3d26, roughness: 0.7 });
  const brass = mat("brass", { color: 0xd4a94a, roughness: 0.3, metalness: 0.8 });
  const black = mat("blackMatte", { color: 0x222426, roughness: 0.8 });
  const paper = mat("paper", { color: 0xfffdf5, roughness: 1 });
  const lampShade = mat("shade", { color: 0xfff2d6, roughness: 1, emissive: 0xffd9a0, emissiveIntensity: 0.6, side: THREE.DoubleSide });

  // ---------- Prop helpers ----------
  function group(x, y, z, rotY = 0) {
    const gg = new THREE.Group();
    gg.position.set(x, y, z);
    gg.rotation.y = rotY;
    g.add(gg);
    return gg;
  }
  function cyl(parent, rTop, rBot, h, material, x, y, z, seg = 12) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function sphere(parent, r, material, x, y, z, seg = 10) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function plane(parent, w, h, material, x, y, z, rotY = 0, rotX = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    m.position.set(x, y, z);
    m.rotation.set(rotX, rotY, 0);
    parent.add(m);
    return m;
  }
  function collideBox(x, z, w, d, level) {
    addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, level);
  }

  function couch(x, y, z, rotY, fabric, w = 2.0, level = "up") {
    const c = group(x, y, z, rotY);
    box(c, w, 0.42, 0.9, fabric, 0, 0.21, 0, { collide: false });          // base
    box(c, w, 0.5, 0.25, fabric, 0, 0.6, -0.33, { collide: false });        // back
    box(c, 0.22, 0.3, 0.9, fabric, -w / 2 + 0.11, 0.55, 0, { collide: false });
    box(c, 0.22, 0.3, 0.9, fabric, w / 2 - 0.11, 0.55, 0, { collide: false });
    const n = Math.round(w / 0.7);
    for (let i = 0; i < n; i++) box(c, w / n - 0.06, 0.14, 0.6, fabric, -w / 2 + (i + 0.5) * (w / n), 0.49, 0.1, { collide: false });
    for (const lx of [-w / 2 + 0.1, w / 2 - 0.1]) for (const lz of [-0.35, 0.35]) cyl(c, 0.03, 0.03, 0.1, walnut, lx, 0.0, lz, 6);
    // rotation-aware collider (only axis-aligned rotations used)
    const along = Math.abs(Math.sin(rotY)) > 0.5;
    collideBox(x, z, along ? 0.9 : w, along ? w : 0.9, level);
    return c;
  }
  function armchair(x, y, z, rotY, fabric, level = "up") {
    const c = group(x, y, z, rotY);
    box(c, 0.9, 0.4, 0.85, fabric, 0, 0.2, 0, { collide: false });
    box(c, 0.9, 0.55, 0.22, fabric, 0, 0.6, -0.31, { collide: false });
    box(c, 0.2, 0.3, 0.85, fabric, -0.35, 0.55, 0, { collide: false });
    box(c, 0.2, 0.3, 0.85, fabric, 0.35, 0.55, 0, { collide: false });
    box(c, 0.48, 0.12, 0.55, fabric, 0, 0.46, 0.1, { collide: false });
    collideBox(x, z, 0.9, 0.9, level);
    return c;
  }
  function table(x, y, z, w, d, h, topMat, legMat, legR = 0.035) {
    const t = group(x, y, z);
    box(t, w, 0.05, d, topMat, 0, h - 0.025, 0, { collide: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(t, legR, legR, h - 0.05, legMat, sx * (w / 2 - 0.08), (h - 0.05) / 2, sz * (d / 2 - 0.08), 8);
    return t;
  }
  function lamp(x, y, z, { tall = false, light = true, intensity = 2.5 } = {}) {
    const l = group(x, y, z);
    const h = tall ? 1.45 : 0.45;
    cyl(l, 0.14, 0.16, 0.03, brass, 0, 0.015, 0);
    cyl(l, 0.02, 0.02, h, brass, 0, h / 2, 0, 8);
    cyl(l, 0.16, 0.22, 0.28, lampShade, 0, h + 0.12, 0, 16);
    if (light) {
      const p = new THREE.PointLight(0xffd9a0, intensity, 5, 1.8);
      p.position.set(0, h + 0.05, 0);
      l.add(p);
    }
    return l;
  }
  function picture(parent, w, h, x, y, z, rotY, draw, frameMat = white) {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    p.rotation.y = rotY;
    box(p, w + 0.08, h + 0.08, 0.04, frameMat, 0, 0, 0, { collide: false, castShadow: false });
    const art = T.artTexture("pic" + x + y + z, 256, Math.round((256 * h) / w), draw);
    plane(p, w, h, new THREE.MeshStandardMaterial({ map: art, roughness: 0.9 }), 0, 0, 0.025);
    parent.add(p);
    return p;
  }
  function book(parent, x, y, z, color, h = 0.24, w = 0.035, d = 0.16) {
    box(parent, w, h, d, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), x, y + h / 2, z, { collide: false, castShadow: false });
  }
  const bookCols = [C.navy, C.nantucketRed, C.seafoam, 0xe3c15a, 0x6b8e6b, 0xd9d2c0, 0x8a5a44, 0x3e6b8a];
  function bookshelf(x, y, z, rotY, w = 1.2, shelves = 4, level = "up") {
    const s = group(x, y, z, rotY);
    const hgt = 0.36 * shelves + 0.1;
    // an open case: two sides, a top and a kick board (it used to be a solid block hiding the books)
    for (const sx of [-w / 2 + 0.02, w / 2 - 0.02]) box(s, 0.04, hgt, 0.3, white, sx, hgt / 2, 0, { collide: false });
    box(s, w, 0.05, 0.32, white, 0, hgt, 0, { collide: false });
    box(s, w, 0.05, 0.3, white, 0, 0.025, 0, { collide: false });
    box(s, w - 0.06, hgt - 0.06, 0.02, new THREE.MeshStandardMaterial({ color: C.navy, roughness: 1 }), 0, hgt / 2, -0.13, { collide: false, castShadow: false });
    for (let i = 0; i < shelves; i++) {
      const sy = 0.05 + i * 0.36;
      box(s, w - 0.06, 0.03, 0.28, white, 0, sy, 0, { collide: false, castShadow: false });
      let bx = -w / 2 + 0.08;
      let k = 0;
      while (bx < w / 2 - 0.12) {
        const bw = 0.03 + ((k * 7 + i * 3) % 4) * 0.012;
        if ((k + i) % 5 === 4) { bx += 0.09; k++; continue; }
        book(s, bx + bw / 2, sy + 0.015, 0.0, bookCols[(k + i * 3) % bookCols.length], 0.2 + ((k * 5 + i) % 3) * 0.035, bw);
        bx += bw + 0.006;
        k++;
      }
    }
    const along = Math.abs(Math.sin(rotY)) > 0.5;
    collideBox(x, z, along ? 0.3 : w, along ? w : 0.3, level);
    return s;
  }

  // ======================================================================
  //  EXTERIOR
  // ======================================================================
  // Mailbox at the end of the walk → Email
  {
    const mb = group(1.35, 0, 9.3, 0);
    cyl(mb, 0.05, 0.05, 1.05, white, 0, 0.52, 0, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: C.navy, roughness: 0.5, metalness: 0.2 });
    box(mb, 0.26, 0.22, 0.5, bodyMat, 0, 1.17, 0, { collide: false });
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 14, 1, false, 0, Math.PI), bodyMat);
    dome.rotation.z = Math.PI / 2;
    dome.rotation.y = Math.PI / 2;
    dome.position.set(0, 1.28, 0);
    mb.add(dome);
    // flag on a pivot (lies flat, swings up when you come near)
    const flagP = new THREE.Group();
    flagP.position.set(0.15, 1.2, -0.12);
    box(flagP, 0.03, 0.26, 0.05, red, 0, 0.13, 0, { collide: false });
    box(flagP, 0.03, 0.1, 0.12, red, 0, 0.22, 0.06, { collide: false });
    mb.add(flagP);
    // door hinged at the bottom of the end facing the walk
    const doorP = new THREE.Group();
    doorP.position.set(0, 1.07, 0.255);
    box(doorP, 0.25, 0.21, 0.02, bodyMat, 0, 0.105, 0, { collide: false });
    const dcap = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.02, 14, 1, false, -Math.PI / 2, Math.PI), bodyMat);
    dcap.rotation.x = Math.PI / 2;
    dcap.position.set(0, 0.21, 0);
    doorP.add(dcap);
    box(doorP, 0.05, 0.03, 0.03, brass, 0, 0.26, 0.02, { collide: false });
    mb.add(doorP);
    box(mb, 0.24, 0.3, 0.01, new THREE.MeshBasicMaterial({ color: 0x0b1420 }), 0, 1.2, 0.24, { collide: false, castShadow: false });
    const letter = box(mb, 0.16, 0.012, 0.24, paper, 0, 1.085, 0.05, { collide: false, castShadow: false });
    box(letter, 0.03, 0.002, 0.04, red, 0.05, 0.008, 0.08, { collide: false, castShadow: false });
    const mailAnim = (o, t, kick = 0) => {
      const e = o * o * (3 - 2 * o);
      doorP.rotation.x = e * 1.5;
      flagP.rotation.x = -1.5 + e * 1.5;
      letter.position.z = 0.05 + e * 0.3 + kick * 0.35;
      letter.position.y = 1.085 + Math.sin(t * 3) * 0.006 * e + kick * 0.12;
      letter.rotation.x = -kick * 0.6;
    };
    // "HANNON" on the side
    const nameTex = T.artTexture("mailname", 256, 96, (ctx, w, h) => {
      ctx.fillStyle = "#fff";
      ctx.font = "700 40px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(SITE.name.split(" ").pop().toUpperCase(), w / 2, h / 2);
    });
    plane(mb, 0.4, 0.15, new THREE.MeshStandardMaterial({ map: nameTex, transparent: true, roughness: 0.6 }), 0.135, 1.2, 0.0, Math.PI / 2);
    collideBox(1.35, 9.3, 0.4, 0.6, "up");
    ix.add(mb, { label: LABELS.email, action: () => ix.showCard(linkCard("email")), animate: mailAnim, sound: () => sfx.creak() });
  }
  // Adirondack chairs on the lawn
  function adirondack(x, z, rotY, m) {
    const a = group(x, 0, z, rotY);
    box(a, 0.7, 0.05, 0.7, m, 0, 0.35, 0, { collide: false });
    const back = box(a, 0.7, 0.9, 0.05, m, 0, 0.75, -0.35, { collide: false });
    back.rotation.x = -0.3;
    box(a, 0.12, 0.05, 0.8, m, -0.4, 0.55, 0.05, { collide: false });
    box(a, 0.12, 0.05, 0.8, m, 0.4, 0.55, 0.05, { collide: false });
    for (const lx of [-0.33, 0.33]) box(a, 0.05, 0.35, 0.05, m, lx, 0.17, 0.3, { collide: false });
    collideBox(x, z, 0.8, 0.8, "up");
  }
  adirondack(5.5, 8.5, -2.6, seafoam);
  adirondack(6.8, 7.8, -2.2, white);
  // small table + lantern between them
  cyl(g, 0.3, 0.3, 0.04, white, 6.2, 0.42, 8.9, 14);
  cyl(g, 0.03, 0.03, 0.4, white, 6.2, 0.2, 8.9, 8);
  // boat shoes on the front step, lax stick leaning by the door
  for (const sx of [-0.1, 0.1]) box(g, 0.1, 0.07, 0.28, new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 }), 1.25 + sx, 0.2, H.maxZ + 0.55, { collide: false });

  // ======================================================================
  //  LIVING ROOM  (x -2.5..3, z -4.5..4.5)
  // ======================================================================
  {
    const cx = 0.25;
    // Fireplace on the back wall
    const fp = group(cx, 0, H.minZ + 0.35);
    const brick = mat("fpBrick", { map: T.brickTexture([2, 2], "#e9e2d6"), roughness: 0.95 });
    // surround: two piers + lintel, leaving a 1.0 x 0.85 opening
    box(fp, 0.5, 1.35, 0.7, brick, -0.75, 0.675, 0, { collide: false });
    box(fp, 0.5, 1.35, 0.7, brick, 0.75, 0.675, 0, { collide: false });
    box(fp, 1.0, 0.5, 0.7, brick, 0, 1.1, 0, { collide: false });
    box(fp, 1.3, 0.04, 0.9, mat("hearth", { color: 0x8c8880, roughness: 1 }), 0, 0.02, 0.45, { collide: false, castShadow: false });
    box(fp, 2.3, 0.1, 0.85, mat("mantel", { color: 0xf8f6f0, roughness: 0.5 }), 0, 1.4, 0.05, { collide: false });
    box(fp, 1.2, 0.5, 0.36, brick, 0, 1.6, -0.15, { collide: false });
    // firebox: dark back + sides + floor, open at the front so the fire shows
    const soot = new THREE.MeshBasicMaterial({ color: 0x0b0908 });
    box(fp, 1.0, 0.8, 0.04, soot, 0, 0.45, -0.1, { collide: false, castShadow: false });
    box(fp, 0.04, 0.8, 0.5, soot, -0.48, 0.45, 0.12, { collide: false, castShadow: false });
    box(fp, 0.04, 0.8, 0.5, soot, 0.48, 0.45, 0.12, { collide: false, castShadow: false });
    box(fp, 1.0, 0.04, 0.5, soot, 0, 0.07, 0.12, { collide: false, castShadow: false });
    box(fp, 1.0, 0.04, 0.5, soot, 0, 0.845, 0.12, { collide: false, castShadow: false });
    // glowing embers under the logs
    plane(fp, 0.7, 0.3, new THREE.MeshBasicMaterial({ color: 0xff5a1a }), 0, 0.095, 0.2, 0, -Math.PI / 2);
    const logMat = mat("log", { color: 0x4a2c16, roughness: 1 });
    cyl(fp, 0.06, 0.06, 0.6, logMat, -0.1, 0.12, 0.2, 7).rotation.z = Math.PI / 2;
    cyl(fp, 0.06, 0.06, 0.6, logMat, 0.1, 0.22, 0.24, 7).rotation.z = Math.PI / 2;
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6a12, transparent: true, opacity: 0.92 });
    const flames = [];
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.08 + (i % 2) * 0.04, 0.28 + (i % 3) * 0.08, 6), flameMat);
      f.position.set(-0.25 + i * 0.12, 0.3, 0.22);
      fp.add(f);
      flames.push(f);
    }
    const fire = new THREE.PointLight(0xff8c3a, 3.0, 7, 1.6);
    fire.position.set(0, 0.5, 0.6);
    fp.add(fire);
    // things on the mantel: candles, a framed sailboat photo, a small anchor
    for (const mx of [-0.8, -0.65, 0.8]) {
      cyl(fp, 0.03, 0.03, 0.18 + Math.abs(mx) * 0.1, paper, mx, 1.55, 0.1, 8);
      sphere(fp, 0.02, new THREE.MeshBasicMaterial({ color: 0xffb347 }), mx, 1.66 + Math.abs(mx) * 0.1, 0.1, 6);
    }
    picture(fp, 0.5, 0.36, 0.2, 1.66, 0.06, 0, (ctx, w, h) => {
      ctx.fillStyle = "#bfe0f2"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#2f4a6b"; ctx.fillRect(0, h * 0.7, w, h * 0.3);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.15); ctx.lineTo(w * 0.5, h * 0.7); ctx.lineTo(w * 0.22, h * 0.7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w * 0.53, h * 0.25); ctx.lineTo(w * 0.53, h * 0.7); ctx.lineTo(w * 0.75, h * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#b5534a"; ctx.fillRect(w * 0.18, h * 0.7, w * 0.62, h * 0.06);
    }, walnut);
    collideBox(cx, H.minZ + 0.35, 2.1, 0.8, "up");
    onUpdate((dt) => {
      const t = performance.now() / 1000;
      fire.intensity = 2.6 + Math.sin(t * 11) * 0.5 + Math.sin(t * 23.7) * 0.35;
      flames.forEach((f, i) => {
        f.scale.y = 0.85 + 0.3 * Math.sin(t * 9 + i * 1.7);
        f.scale.x = f.scale.z = 0.9 + 0.2 * Math.sin(t * 13 + i);
      });
    });

    // Rug, couch, coffee table, armchair
    const rug = plane(g, 3.4, 2.4, mat("rugLiving", { map: T.rugTexture(), roughness: 1 }), cx, 0.012, -1.6, 0, -Math.PI / 2);
    rug.receiveShadow = true;
    couch(cx, 0, -0.35, Math.PI, navy, 2.1);
    // throw pillows
    for (const [px, pm] of [[-0.7, butter], [0.7, mat("stripePillow", { color: 0xffffff, roughness: 1 })]])
      box(g, 0.4, 0.4, 0.14, pm, cx + px, 0.62, -0.35 + 0.22, { collide: false }).rotation.x = 0.15;
    table(cx, 0, -1.8, 1.1, 0.55, 0.42, walnut, walnut, 0.03);
    // coffee table things: a stack of books and a candle
    book(g, cx - 0.25, 0.42, -1.8, C.navy, 0.03, 0.22, 0.3);
    book(g, cx - 0.25, 0.45, -1.8, C.nantucketRed, 0.03, 0.2, 0.28);
    cyl(g, 0.06, 0.06, 0.08, paper, cx + 0.3, 0.46, -1.8, 10);
    armchair(cx + 1.95, 0, -0.6, -2.63, red);
    // side table + lamp in the back-left corner, floor lamp front-right
    table(cx - 1.75, 0, -3.3, 0.5, 0.5, 0.6, oak, oak, 0.03);
    lamp(cx - 1.75, 0.6, -3.3, { intensity: 2.0 });
    lamp(cx + 2.3, 0, 3.4, { tall: true, intensity: 2.0 });

    // Ceiling fixture (a simple drum shade) under the room light
    cyl(g, 0.25, 0.25, 0.2, lampShade, cx, H.wallH - 0.25, 0.0, 20);
    cyl(g, 0.01, 0.01, 0.3, brass, cx, H.wallH - 0.1, 0.0, 6);

    // Coat hooks with quarter-zips, boat shoes under them (left of the door)
    const hookX = -1.3;
    box(g, 1.2, 0.08, 0.04, oak, hookX, 1.75, H.maxZ - 0.06, { collide: false, castShadow: false });
    const qzCols = [C.navy, C.seafoam, 0xf0e6d6, C.nantucketRed];
    for (let i = 0; i < 4; i++) {
      const hx = hookX - 0.45 + i * 0.3;
      cyl(g, 0.015, 0.015, 0.08, brass, hx, 1.71, H.maxZ - 0.1, 6).rotation.x = Math.PI / 2;
      if (i === 2) continue; // one empty hook
      const qz = new THREE.MeshStandardMaterial({ color: qzCols[i], roughness: 1 });
      box(g, 0.26, 0.55, 0.06, qz, hx, 1.4, H.maxZ - 0.14, { collide: false, castShadow: false });
      box(g, 0.14, 0.1, 0.07, qz, hx, 1.7, H.maxZ - 0.14, { collide: false, castShadow: false }); // collar
      box(g, 0.02, 0.22, 0.02, mat("zip", { color: 0xdddddd, metalness: 0.6 }), hx, 1.56, H.maxZ - 0.175, { collide: false, castShadow: false });
    }
    for (const sx of [-0.12, 0.12]) box(g, 0.1, 0.07, 0.28, new THREE.MeshStandardMaterial({ color: 0x9a6b45, roughness: 0.9 }), hookX + sx, 0.17, H.maxZ - 0.3, { collide: false });
    for (const sx of [-0.12, 0.12]) box(g, 0.1, 0.07, 0.28, new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 }), hookX + 0.4 + sx, 0.17, H.maxZ - 0.32, { collide: false });
    // Lacrosse stick in the front-right corner
    {
      const lx = group(2.75, 0, H.maxZ - 0.3, 0);
      const shaft = cyl(lx, 0.016, 0.016, 1.1, mat("laxShaft", { color: 0xdedede, metalness: 0.5, roughness: 0.4 }), 0, 0.55, 0, 8);
      shaft.rotation.z = 0.12;
      const head = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16), white);
      head.position.set(-0.13, 1.18, 0);
      head.scale.set(0.8, 1.3, 1);
      lx.add(head);
      const pocket = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.26), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      pocket.position.set(-0.13, 1.17, 0);
      lx.add(pocket);
    }
    // A basket of blankets and a plant by the den doorway
    cyl(g, 0.22, 0.18, 0.35, mat("wicker", { color: 0xc9a56b, roughness: 1 }), 2.6, 0.175, 2.2, 12);
    box(g, 0.34, 0.08, 0.34, navy, 2.6, 0.38, 2.2, { collide: false });
    cyl(g, 0.16, 0.12, 0.3, mat("terracotta", { color: 0xc67a52, roughness: 1 }), -2.1, 0.15, 3.6, 12);
    sphere(g, 0.28, mat("plant", { color: 0x4f8a4e, roughness: 1 }), -2.1, 0.5, 3.6, 8);

    // Corkboard of polaroids on the den-side wall → Instagram
    const cb = group(H.denWallX - 0.09, 1.55, -2.3, -Math.PI / 2);
    box(cb, 1.1, 0.8, 0.03, mat("cork", { color: 0xc8a06a, roughness: 1 }), 0, 0, 0, { collide: false, castShadow: false });
    box(cb, 1.16, 0.86, 0.02, walnut, 0, 0, -0.01, { collide: false, castShadow: false });
    const pols = [];
    const polCols = ["#9fd3c7", "#f4d98b", "#b5534a", "#2f4a6b", "#e9dcc3", "#8fb6e8", "#c9b7ea", "#6f9a5a"];
    for (let i = 0; i < 8; i++) {
      const px = -0.4 + (i % 4) * 0.27 + (i > 3 ? 0.05 : 0);
      const py = i > 3 ? -0.2 : 0.18;
      const pol = T.artTexture("pol" + i, 64, 76, (ctx, w, h) => {
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = polCols[i]; ctx.fillRect(5, 5, w - 10, h - 22);
        ctx.fillStyle = polCols[(i + 3) % 8]; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.4, 12, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(5, h * 0.52, w - 10, 8);
      });
      // each polaroid hangs from its pin so it can swing
      const pin = new THREE.Group();
      pin.position.set(px, py + 0.11, 0.02);
      const pm = plane(pin, 0.2, 0.24, new THREE.MeshStandardMaterial({ map: pol, roughness: 0.8, side: THREE.DoubleSide }), 0, -0.11, 0);
      pin.userData.base = ((i * 37) % 11 - 5) * 0.03;
      pin.rotation.z = pin.userData.base;
      cb.add(pin);
      pols.push(pin);
      sphere(cb, 0.012, new THREE.MeshStandardMaterial({ color: [0xb5534a, 0x2f4a6b, 0xf4d98b][i % 3] }), px, py + 0.11, 0.03, 6);
    }
    ix.add(cb, {
      label: LABELS.instagram,
      action: () => ix.showCard(linkCard("instagram")),
      sound: () => sfx.flutter(),
      animate: (o, t) => pols.forEach((pn, i) => {
        pn.rotation.z = pn.userData.base + Math.sin(t * 2.6 + i * 1.3) * 0.16 * o;
        pn.rotation.x = -Math.abs(Math.sin(t * 1.9 + i)) * 0.35 * o;
      }),
    });

  }

  // ======================================================================
  //  KITCHEN  (x -7..-2.5)
  // ======================================================================
  {
    // Lower cabinets along the left wall (x = minX), from z = -0.2 to 4.3
    const cabY = mat("cabYellow", { color: C.butter, roughness: 0.6 });
    const counter = mat("counter", { color: 0xf3f1ea, roughness: 0.35 });
    const runZ1 = -0.1, runZ2 = H.maxZ - 0.15;
    const runLen = runZ2 - runZ1;
    const runMid = (runZ1 + runZ2) / 2;
    box(g, 0.6, 0.86, runLen, cabY, H.minX + 0.3, 0.43, runMid, { collide: true, level: "up" });
    box(g, 0.66, 0.05, runLen + 0.04, counter, H.minX + 0.33, 0.885, runMid, { collide: false });
    // cabinet doors + knobs
    for (let z = runZ1 + 0.3; z < runZ2 - 0.2; z += 0.6) {
      box(g, 0.02, 0.7, 0.52, mat("cabDoor", { color: 0xf7dd94, roughness: 0.6 }), H.minX + 0.61, 0.45, z, { collide: false, castShadow: false });
      sphere(g, 0.02, brass, H.minX + 0.63, 0.45, z + 0.2, 6);
    }
    // upper cabinets (white) with a gap for the window at z=2.0
    const upperY = 2.0;
    box(g, 0.35, 0.8, 1.4, white, H.minX + 0.175, upperY, 0.6, { collide: false });
    box(g, 0.35, 0.8, 1.2, white, H.minX + 0.175, upperY, 3.6, { collide: false });
    for (const z of [0.25, 0.95, 3.3, 3.9]) sphere(g, 0.018, brass, H.minX + 0.36, upperY - 0.25, z, 6);
    // sink under the window
    box(g, 0.5, 0.02, 0.7, mat("steel", { color: 0xc9ccd0, metalness: 0.7, roughness: 0.3 }), H.minX + 0.33, 0.9, 2.0, { collide: false });
    box(g, 0.4, 0.15, 0.6, mat("sinkIn", { color: 0x9da3a8, metalness: 0.6, roughness: 0.4 }), H.minX + 0.33, 0.83, 2.0, { collide: false });
    const faucet = cyl(g, 0.015, 0.015, 0.35, brass, H.minX + 0.1, 1.05, 2.0, 8);
    cyl(g, 0.012, 0.012, 0.25, brass, H.minX + 0.22, 1.22, 2.0, 8).rotation.z = Math.PI / 2;
    // stove + hood on the back wall
    const stove = group(-4.6, 0, H.minZ + 0.35);
    box(stove, 0.76, 0.9, 0.65, white, 0, 0.45, 0, { collide: false });
    box(stove, 0.76, 0.02, 0.65, black, 0, 0.91, 0, { collide: false });
    for (const [bx, bz] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]]) cyl(stove, 0.1, 0.1, 0.02, mat("burner", { color: 0x333 }), bx, 0.93, bz, 14);
    box(stove, 0.6, 0.25, 0.02, mat("ovenGlass", { color: 0x222, roughness: 0.2 }), 0, 0.45, 0.33, { collide: false });
    cyl(stove, 0.012, 0.012, 0.5, brass, 0, 0.62, 0.34, 6).rotation.z = Math.PI / 2;
    box(stove, 0.8, 0.3, 0.5, mat("hood", { color: 0xdfe3e6, metalness: 0.5, roughness: 0.4 }), 0, 2.15, -0.05, { collide: false });
    collideBox(-4.6, H.minZ + 0.35, 0.8, 0.7, "up");
    // a tea kettle on the stove
    sphere(stove, 0.12, mat("kettle", { color: C.nantucketRed, roughness: 0.4 }), 0.2, 1.03, 0.15, 10);
    // retro seafoam fridge in the back-right corner of the kitchen
    const fr = group(H.kitchenWallX - 0.5, 0, H.minZ + 0.45);
    const frMat = mat("fridge", { color: C.seafoam, roughness: 0.35, metalness: 0.1 });
    box(fr, 0.8, 1.75, 0.75, frMat, 0, 0.875, 0, { collide: false });
    box(fr, 0.82, 0.02, 0.77, mat("chrome", { color: 0xdddddd, metalness: 0.9, roughness: 0.2 }), 0, 1.2, 0, { collide: false, castShadow: false });
    cyl(fr, 0.02, 0.02, 0.5, mat("chrome"), -0.3, 1.45, 0.39, 8);
    cyl(fr, 0.02, 0.02, 0.6, mat("chrome"), -0.3, 0.6, 0.39, 8);
    collideBox(H.kitchenWallX - 0.5, H.minZ + 0.45, 0.85, 0.8, "up");
    // magnets on the fridge
    for (let i = 0; i < 5; i++) box(fr, 0.06, 0.06, 0.01, new THREE.MeshStandardMaterial({ color: [0xb5534a, 0xf4d98b, 0x2f4a6b, 0xffffff, 0x9fd3c7][i] }), -0.2 + (i % 3) * 0.2, 1.35 + Math.floor(i / 3) * -0.25, 0.38, { collide: false, castShadow: false });

    // Island with stools where the wall used to be: kitchen, dining and living are one room now
    {
      const ixc = H.kitchenWallX + 0.05, iz1 = -2.3, iz2 = 0.1;
      box(g, 0.85, 0.88, iz2 - iz1, mat("islandNavy", { color: C.navy, roughness: 0.6 }), ixc, 0.44, (iz1 + iz2) / 2, { collide: true, level: "up" });
      box(g, 1.1, 0.06, iz2 - iz1 + 0.2, mat("butcher", { color: 0xc9a06a, roughness: 0.5 }), ixc + 0.08, 0.91, (iz1 + iz2) / 2, { collide: false });
      for (const sz of [-1.8, -1.1, -0.4]) {
        cyl(g, 0.17, 0.17, 0.05, oak, ixc + 0.8, 0.66, sz, 12);
        for (let k = 0; k < 4; k++) cyl(g, 0.015, 0.02, 0.64, white, ixc + 0.8 + Math.cos(k * 1.57 + 0.78) * 0.13, 0.32, sz + Math.sin(k * 1.57 + 0.78) * 0.13, 5);
      }
      // on the island: cutting board, a bowl of clementines, a vase of hydrangeas
      box(g, 0.3, 0.02, 0.42, walnut, ixc - 0.1, 0.95, -1.7, { collide: false, castShadow: false });
      cyl(g, 0.15, 0.09, 0.08, white, ixc + 0.1, 0.98, -0.9, 14);
      for (let k = 0; k < 5; k++) sphere(g, 0.045, mat("clem", { color: 0xf08a24, roughness: 0.7 }), ixc + 0.1 + Math.cos(k * 1.3) * 0.07, 1.03 + (k === 4 ? 0.05 : 0), -0.9 + Math.sin(k * 1.3) * 0.07, 8);
      cyl(g, 0.06, 0.05, 0.2, mat("vase", { color: 0xcfe6f5, roughness: 0.2, transparent: true, opacity: 0.8 }), ixc, 1.04, -0.2, 10);
      for (let k = 0; k < 4; k++) sphere(g, 0.085, mat("bloomV" + (k % 2), { color: k % 2 ? 0x8fb6e8 : 0xc9b7ea, roughness: 1 }), ixc + Math.cos(k * 1.6) * 0.07, 1.25 + (k % 2) * 0.05, -0.2 + Math.sin(k * 1.6) * 0.07, 7);
      // two pendants over the island
      for (const pz of [-1.6, -0.5]) {
        cyl(g, 0.005, 0.005, 0.8, black, ixc + 0.1, H.wallH - 0.4, pz, 4);
        cyl(g, 0.07, 0.18, 0.2, mat("pendantBrass", { color: 0xd4a94a, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide }), ixc + 0.1, H.wallH - 0.9, pz, 16);
        sphere(g, 0.05, new THREE.MeshBasicMaterial({ color: 0xffe7c0 }), ixc + 0.1, H.wallH - 0.95, pz, 8);
      }
    }

    // Round kitchen table with chairs; The Cape Daily on top → Daily Games
    const tx = -4.6, tz = 1.9;
    const kt = group(tx, 0, tz);
    cyl(kt, 0.65, 0.65, 0.05, white, 0, 0.74, 0, 28);
    cyl(kt, 0.07, 0.12, 0.72, white, 0, 0.36, 0, 12);
    cyl(kt, 0.35, 0.35, 0.03, white, 0, 0.015, 0, 20);
    collideBox(tx, tz, 0.9, 0.9, "up");
    function chair(x, z, rotY, m = white) {
      const ch = group(x, 0, z, rotY);
      box(ch, 0.42, 0.04, 0.42, m, 0, 0.45, 0, { collide: false });
      box(ch, 0.42, 0.45, 0.04, m, 0, 0.7, -0.19, { collide: false });
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) cyl(ch, 0.015, 0.015, 0.45, m, lx, 0.22, lz, 6);
      // cushion
      box(ch, 0.36, 0.04, 0.36, navy, 0, 0.49, 0, { collide: false, castShadow: false });
    }
    chair(tx, tz + 0.95, Math.PI);
    chair(tx + 0.95, tz, -Math.PI / 2);
    chair(tx - 0.95, tz, Math.PI / 2);
    chair(tx, tz - 0.95, 0);
    // bowl of lemons
    cyl(kt, 0.16, 0.1, 0.07, seafoam, 0.25, 0.8, -0.15, 16);
    for (let i = 0; i < 5; i++) sphere(kt, 0.045, mat("lemon", { color: 0xf5d34a, roughness: 0.7 }), 0.25 + Math.cos(i * 1.3) * 0.07, 0.86 + (i === 4 ? 0.05 : 0), -0.15 + Math.sin(i * 1.3) * 0.07, 8);
    // coffee mug
    cyl(kt, 0.045, 0.04, 0.1, white, -0.3, 0.815, 0.25, 12);
    // The newspaper
    const np = group(tx + 0.12, 0.765, tz + 0.12, 0.35);
    const npTex = T.artTexture("capeDaily", 256, 180, (ctx, w, h) => {
      ctx.fillStyle = "#f6f0e2"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#1f2a3a"; ctx.textAlign = "center";
      ctx.font = "700 30px Georgia, serif"; ctx.fillText("The Cape Daily", w / 2, 34);
      ctx.fillRect(12, 44, w - 24, 2);
      ctx.font = "italic 11px Georgia, serif"; ctx.fillText("DAILY GAMES · COMING SOON", w / 2, 58);
      ctx.font = "700 16px Georgia, serif"; ctx.textAlign = "left"; ctx.fillText("Local man clears rack", 14, 86);
      ctx.fillStyle = "#9aa3ad";
      for (let y = 96; y < h - 10; y += 8) { ctx.fillRect(14, y, w * 0.45 - (y % 3) * 10, 3); ctx.fillRect(w * 0.55, y, w * 0.4 - (y % 5) * 6, 3); }
      ctx.fillStyle = "#9fd3c7"; ctx.fillRect(w * 0.55, 70, w * 0.4, 20);
    });
    const insideTex = T.artTexture("capeDailyInside", 256, 180, (ctx, w, h) => {
      ctx.fillStyle = "#f6f0e2"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#b5534a"; ctx.textAlign = "center"; ctx.font = "700 13px Arial"; ctx.fillText("DAILY GAMES", w / 2, 24);
      ctx.strokeStyle = "#1f2a3a"; ctx.lineWidth = 2;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        ctx.fillStyle = ["#9fd3c7", "#f4d98b", "#f6f0e2"][(r * 3 + c * 2) % 3];
        ctx.fillRect(34 + c * 22, 38 + r * 22, 22, 22); ctx.strokeRect(34 + c * 22, 38 + r * 22, 22, 22);
      }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = ["#2f4a6b", "#9fd3c7", "#f4d98b", "#b5534a"][r]; ctx.fillRect(160 + c * 20, 44 + r * 20, 17, 17); }
      ctx.fillStyle = "#1f2a3a"; ctx.font = "italic 12px Georgia"; ctx.fillText("coming soon", w / 2, h - 12);
    });
    box(np, 0.42, 0.008, 0.3, new THREE.MeshStandardMaterial({ map: insideTex, roughness: 1 }), 0, -0.004, 0, { collide: false, castShadow: false });
    // the front page is hinged along its left edge
    const cover = new THREE.Group();
    cover.position.set(-0.21, 0.004, 0);
    box(cover, 0.42, 0.006, 0.3, new THREE.MeshStandardMaterial({ map: npTex, roughness: 1 }), 0.21, 0, 0, { collide: false, castShadow: false });
    np.add(cover);
    const paperAnim = (o, t, kick = 0) => {
      const e = o * o * (3 - 2 * o);
      cover.rotation.z = e * 2.2 + Math.sin(t * 2.2) * 0.04 * e;
      np.position.y = 0.765 + kick * 0.18;
      np.rotation.x = -kick * 0.5;
    };
    ix.add(np, {
      label: LABELS.daily,
      labelY: 1.3,
      animate: paperAnim,
      sound: () => sfx.rustle(),
      action: () =>
        ix.showCard({
          title: "The Cape Daily",
          body: "Today's paper. The Daily Games section is still being typeset — have a look at what's coming.",
          href: "./daily.html",
          cta: "Read the paper →",
          external: false,
        }),
    });
    // pendant light over the table
    cyl(g, 0.005, 0.005, 0.9, black, tx, H.wallH - 0.45, tz, 4);
    const pend = cyl(g, 0.08, 0.22, 0.22, mat("pendant", { color: C.navy, roughness: 0.5, side: THREE.DoubleSide }), tx, H.wallH - 0.95, tz, 18);
    const pendL = new THREE.PointLight(0xffe7c0, 2.2, 5, 1.8);
    pendL.position.set(tx, H.wallH - 1.1, tz);
    g.add(pendL);
    // open shelf with jars + a framed "Cape" map
    box(g, 1.2, 0.03, 0.25, oak, -3.3, 1.9, H.minZ + 0.14, { collide: false, castShadow: false });
    for (let i = 0; i < 4; i++) cyl(g, 0.07, 0.07, 0.16 + (i % 2) * 0.06, mat("jar" + i, { color: [0xf4d98b, 0xe9dcc3, 0xd9b26a, 0xf0e6d6][i], roughness: 0.4, transparent: true, opacity: 0.9 }), -3.75 + i * 0.3, 2.0 + (i % 2) * 0.03, H.minZ + 0.14, 12);
    picture(g, 0.6, 0.45, -3.3, 1.3, H.minZ + 0.03, 0, (ctx, w, h) => {
      ctx.fillStyle = "#dfeef5"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#e9dcc3"; ctx.beginPath();
      ctx.moveTo(10, h * 0.8); ctx.quadraticCurveTo(w * 0.3, h * 0.55, w * 0.55, h * 0.65); ctx.quadraticCurveTo(w * 0.85, h * 0.75, w * 0.8, h * 0.4);
      ctx.quadraticCurveTo(w * 0.7, h * 0.2, w * 0.9, h * 0.25); ctx.lineTo(w * 0.92, h * 0.3); ctx.quadraticCurveTo(w * 0.75, h * 0.35, w * 0.86, h * 0.55);
      ctx.quadraticCurveTo(w * 0.7, h * 0.95, 10, h * 0.95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2f4a6b"; ctx.font = "italic 14px Georgia"; ctx.fillText("the Cape", w * 0.35, h * 0.9);
    }, walnut);
    // dish towel on the oven handle + rug by the sink
    plane(g, 1.0, 0.6, mat("rugKitchen", { map: T.rugTexture(["#2f4a6b", "#f3ead6"]), roughness: 1 }), H.minX + 1.0, 0.012, 2.0, Math.PI / 2, -Math.PI / 2).receiveShadow = true;
  }

  // ======================================================================
  //  DEN / STUDY  (x 3..7)
  // ======================================================================
  {
    const deskX = H.maxX - 0.55, deskZ = -1.5;
    // Desk against the right wall under the window
    const desk = table(deskX, 0, deskZ, 0.8, 1.7, 0.75, walnut, walnut, 0.03);
    box(desk, 0.78, 0.12, 1.66, walnut, 0, 0.66, 0, { collide: false });
    // drawers
    for (const dz of [-0.55, 0.55]) {
      box(desk, 0.7, 0.45, 0.5, walnut, 0, 0.3, dz, { collide: false });
      cyl(desk, 0.012, 0.012, 0.12, brass, -0.36, 0.3, dz, 6).rotation.z = Math.PI / 2;
    }
    collideBox(deskX, deskZ, 0.9, 1.8, "up");
    // desk chair
    const dc = group(deskX - 0.75, 0, deskZ, Math.PI / 2);
    box(dc, 0.5, 0.06, 0.5, navy, 0, 0.47, 0, { collide: false });
    box(dc, 0.5, 0.5, 0.06, navy, 0, 0.75, -0.24, { collide: false });
    cyl(dc, 0.03, 0.03, 0.44, black, 0, 0.22, 0, 8);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; box(dc, 0.04, 0.03, 0.3, black, Math.cos(a) * 0.15, 0.03, Math.sin(a) * 0.15, { collide: false }).rotation.y = -a + Math.PI / 2; }
    collideBox(deskX - 0.75, deskZ, 0.55, 0.55, "up");
    // desk lamp (banker's style, green shade) + a mug of pens
    const dl = group(deskX + 0.1, 0.75, deskZ - 0.7);
    cyl(dl, 0.07, 0.09, 0.02, brass, 0, 0.01, 0);
    cyl(dl, 0.012, 0.012, 0.3, brass, 0, 0.16, 0, 6);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12, 1, true, 0, Math.PI), mat("greenShade", { color: 0x2e6b4f, roughness: 0.4, side: THREE.DoubleSide, emissive: 0x1f4a36, emissiveIntensity: 0.4 }));
    shade.rotation.z = Math.PI / 2; shade.rotation.y = Math.PI / 2;
    shade.position.set(-0.05, 0.33, 0);
    dl.add(shade);
    const dlLight = new THREE.PointLight(0xffe4b0, 1.6, 3.5, 2);
    dlLight.position.set(-0.08, 0.28, 0);
    dl.add(dlLight);
    cyl(g, 0.04, 0.035, 0.1, mat("penMug", { color: C.nantucketRed, roughness: 0.6 }), deskX + 0.25, 0.8, deskZ + 0.6, 12);
    for (let i = 0; i < 3; i++) cyl(g, 0.005, 0.005, 0.16, [navy, black, butter][i], deskX + 0.25 + (i - 1) * 0.015, 0.9, deskZ + 0.6 + (i % 2) * 0.012, 5);

    // Laptop → LinkedIn
    const lp = group(deskX - 0.05, 0.75, deskZ + 0.05, -Math.PI / 2 + 0.15);
    const alu = mat("alu", { color: 0xd8d9dc, metalness: 0.6, roughness: 0.35 });
    box(lp, 0.34, 0.015, 0.24, alu, 0, 0.0075, 0, { collide: false });
    box(lp, 0.26, 0.002, 0.1, mat("keys", { color: 0x3a3d42 }), 0, 0.016, -0.02, { collide: false, castShadow: false });
    const lidP = new THREE.Group();
    lidP.position.set(0, 0.016, -0.12);
    lp.add(lidP);
    box(lidP, 0.34, 0.22, 0.012, alu, 0, 0.11, -0.006, { collide: false });
    const scrTex = T.artTexture("laptopScreen", 256, 160, (ctx, w, h) => {
      ctx.fillStyle = "#f3f2ef"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#2f4a6b"; ctx.fillRect(0, 0, w, 26);
      ctx.fillStyle = "#fff"; ctx.font = "700 13px Arial"; ctx.fillText("in", 10, 18);
      ctx.fillStyle = "#fff"; ctx.fillRect(16, 40, w - 32, h - 56);
      ctx.fillStyle = "#9fd3c7"; ctx.fillRect(16, 40, w - 32, 36);
      ctx.fillStyle = "#e9dcc3"; ctx.beginPath(); ctx.arc(46, 78, 20, 0, 7); ctx.fill();
      ctx.fillStyle = "#1f2a3a"; ctx.font = "700 12px Arial"; ctx.fillText(SITE.name, 28, 114);
      ctx.fillStyle = "#8a9aaa"; ctx.font = "9px Arial"; ctx.fillText("Harvard · Applied Math & Economics", 28, 128);
      for (let i = 0; i < 2; i++) ctx.fillRect(28, 140 + i * 7, w - 80 - i * 30, 3);
    });
    const scrMat = new THREE.MeshBasicMaterial({ map: scrTex });
    plane(lidP, 0.31, 0.19, scrMat, 0, 0.115, 0.002);
    lidP.rotation.x = 1.5;
    const lapAnim = (o, t, kick = 0) => {
      const e = o * o * (3 - 2 * o);
      lidP.rotation.x = 1.5 - e * 1.75;
      scrMat.color.setScalar(0.08 + 0.92 * Math.max(0, (e - 0.5) * 2) + kick * 0.8);
    };
    ix.add(lp, { label: LABELS.linkedin, labelY: 1.15, action: () => ix.showCard(linkCard("linkedin")), animate: lapAnim, sound: () => sfx.chime() });

    // Printed resume on the desk → Resume
    const rs = group(deskX - 0.05, 0.76, deskZ - 0.62, -0.18);
    const resumeTex = T.artTexture("resumePaper", 192, 248, (ctx, w, h) => {
      ctx.fillStyle = "#fffdf7"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#1f2a3a"; ctx.textAlign = "center"; ctx.font = "700 16px Georgia, serif"; ctx.fillText(SITE.name, w / 2, 26);
      ctx.font = "8px Arial"; ctx.fillStyle = "#6a7a8a"; ctx.fillText("Harvard University · Applied Math & Economics", w / 2, 40);
      ctx.fillStyle = "#1f2a3a"; ctx.fillRect(16, 48, w - 32, 1);
      ctx.textAlign = "left"; ctx.font = "700 9px Arial";
      const secs = ["EDUCATION", "EXPERIENCE", "SKILLS"];
      let y = 64;
      secs.forEach((s, si) => {
        ctx.fillStyle = "#2f4a6b"; ctx.fillText(s, 16, y); y += 8;
        ctx.fillStyle = "#b9c2cb";
        for (let i = 0; i < (si === 1 ? 10 : 4); i++) { ctx.fillRect(16, y, w - 32 - ((i * 13) % 40), 3); y += 7; }
        y += 8;
      });
    });
    const sheet = box(rs, 0.215, 0.004, 0.28, new THREE.MeshStandardMaterial({ map: resumeTex, roughness: 1 }), 0, 0, 0, { collide: false, castShadow: false });
    const resumeAnim = (o, t, kick = 0) => {
      const e = o * o * (3 - 2 * o);
      sheet.position.y = e * 0.16 + Math.sin(t * 2.4) * 0.008 * e + kick * 0.22;
      sheet.rotation.z = e * 0.55;
      sheet.rotation.y = Math.sin(t * 1.3) * 0.08 * e;
    };
    box(rs, 0.215, 0.004, 0.28, paper, 0.012, -0.004, 0.01, { collide: false, castShadow: false });
    // paperclip-ish brass clip
    box(rs, 0.03, 0.006, 0.04, brass, -0.08, 0.006, -0.11, { collide: false, castShadow: false });
    ix.add(rs, { label: LABELS.resume, labelY: 1.45, action: () => ix.showCard(linkCard("resume")), animate: resumeAnim, sound: () => sfx.rustle() });

    // Bookshelf on the back wall, reading chair + lamp, rug, wall art
    bookshelf(4.6, 0, H.minZ + 0.17, 0, 1.6, 5);
    armchair(5.9, 0, H.minZ + 0.9, -0.6, butter);
    lamp(6.5, 0, H.minZ + 0.45, { tall: true, intensity: 2.2 });
    plane(g, 2.6, 1.8, mat("rugDen", { map: T.rugTexture(["#b5534a", "#f3ead6", "#2f4a6b", "#f3ead6"]), roughness: 1 }), 5.0, 0.012, 0.0, 0, -Math.PI / 2).receiveShadow = true;
    // framed pennant + nautical chart on the living-room-side wall
    picture(g, 0.9, 0.6, H.denWallX + 0.09, 1.7, 2.6, Math.PI / 2, (ctx, w, h) => {
      ctx.fillStyle = "#f6f0e2"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#9fb6c7"; ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(w * 0.3, h * 0.6, 20 + i * 14, 0, 7); ctx.stroke(); }
      ctx.fillStyle = "#e9dcc3"; ctx.beginPath(); ctx.moveTo(0, h); ctx.quadraticCurveTo(w * 0.4, h * 0.3, w, h * 0.5); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2f4a6b"; ctx.font = "italic 12px Georgia"; ctx.fillText("Nantucket Sound", w * 0.1, h * 0.2);
    }, walnut);
    // crimson pennant
    const pen = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0.12); s.lineTo(0.7, 0); s.lineTo(0, -0.12); s.closePath(); return s; })()), mat("pennant", { color: 0xa51c30, roughness: 1, side: THREE.DoubleSide }));
    pen.position.set(H.denWallX + 0.09, 2.35, 3.3);
    pen.rotation.y = Math.PI / 2;
    g.add(pen);
    // ceiling fixture
    cyl(g, 0.22, 0.22, 0.16, lampShade, 5.0, H.wallH - 0.2, -0.5, 18);
    // a globe and a small plant on the shelf top
    sphere(g, 0.13, mat("globe", { color: 0x6aa0c8, roughness: 0.5 }), 5.1, 2.0, H.minZ + 0.2, 12);
    cyl(g, 0.02, 0.02, 0.1, brass, 5.1, 1.9, H.minZ + 0.2, 6);
  }

  // ======================================================================
  //  BASEMENT  (y = -3)
  // ======================================================================
  {
    const bY = H.baseFloorY;
    // Pong table — the centerpiece. 8ft x 2.5ft, player throws from the +z end.
    const px = 0.25, pz = 0.0;
    const pt = group(px, bY, pz);
    const topMat = mat("pongTop", { color: C.navy, roughness: 0.6 });
    box(pt, 0.76, 0.05, 2.44, topMat, 0, 0.74, 0, { collide: false });
    box(pt, 0.8, 0.06, 2.48, white, 0, 0.73, 0, { collide: false }); // white lip
    // center stripe + end lines (white) and a seafoam anchor logo
    box(pt, 0.76, 0.004, 0.03, white, 0, 0.768, 0, { collide: false, castShadow: false });
    const logoTex = T.artTexture("pongLogo", 128, 128, (ctx, w, h) => {
      ctx.strokeStyle = "#9fd3c7"; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(w / 2, 30, 10, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 40); ctx.lineTo(w / 2, 100); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2 - 28, 56); ctx.lineTo(w / 2 + 28, 56); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, 70, 36, 0.3, Math.PI - 0.3); ctx.stroke();
    });
    plane(pt, 0.4, 0.4, new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.6 }), 0, 0.769, 0, 0, -Math.PI / 2);
    // folding legs
    for (const sz of [-0.95, 0.95]) {
      for (const sx of [-0.3, 0.3]) cyl(pt, 0.02, 0.02, 0.72, mat("legGray", { color: 0x7a7d80, metalness: 0.5, roughness: 0.5 }), sx, 0.36, sz, 8);
      box(pt, 0.62, 0.03, 0.03, mat("legGray"), 0, 0.1, sz, { collide: false });
    }
    collideBox(px, pz, 0.95, 2.6, "down");
    world.pongTable = { x: px, z: pz, y: bY + 0.77 };
    // decorative rack of cups at the far end (replaced by the live game when playing)
    world.pongDecor = new THREE.Group();
    pt.add(world.pongDecor);
    const cupMat = mat("cupRed", { color: 0xd4432f, roughness: 0.5 });
    const cupGeo = new THREE.CylinderGeometry(0.047, 0.035, 0.12, 14);
    const rackRows = [[0], [-0.5, 0.5], [-1, 0, 1], [-1.5, -0.5, 0.5, 1.5]];
    rackRows.forEach((row, ri) => row.forEach((c) => {
      const m = new THREE.Mesh(cupGeo, cupMat);
      m.position.set(c * 0.098, 0.77 + 0.06, -1.22 + 0.17 + ri * 0.085);
      m.castShadow = true;
      world.pongDecor.add(m);
    }));
    // ping pong balls on the near end
    const idleBalls = [-0.2, -0.12].map((bx) => sphere(world.pongDecor, 0.02, mat("ppBall", { color: 0xfff6e0, roughness: 0.4 }), bx, 0.79, 1.05, 8));
    const pongAnim = (o, t) => {
      const b = idleBalls[0];
      const u = (t * 0.55) % 1;
      b.position.set(-0.2 + 0.2 * u * o, 0.79 + Math.abs(Math.sin(u * Math.PI * 3)) * 0.32 * (1 - u * 0.6) * o, 1.05 - 1.9 * u * o);
      idleBalls[1].position.y = 0.79 + Math.abs(Math.sin(t * 5)) * 0.06 * o;
    };
    ix.add(pt, {
      label: LABELS.pong,
      labelY: bY + 1.5,
      animate: pongAnim,
      action: () => games.start("pong", world),
    });

    // Beat-up brown couch along the back wall, facing the table; old TV opposite? No — TV on the front wall.
    couch(3.4, bY, H.minZ + 0.6, 0, mat("oldCouch", { color: 0x6e4b35, roughness: 1 }), 2.2, "down");
    box(g, 0.4, 0.4, 0.14, mat("plaidPillow", { color: 0x8c2f2f, roughness: 1 }), 2.7, bY + 0.62, H.minZ + 0.82, { collide: false }).rotation.x = 0.15;
    box(g, 1.2, 0.08, 0.5, mat("blanket", { color: C.seafoam, roughness: 1 }), 4.0, bY + 0.47, H.minZ + 0.6, { collide: false, castShadow: false });
    // coffee table made from a lobster crate
    box(g, 0.9, 0.4, 0.5, mat("crate", { color: 0x8a6a48, roughness: 1 }), 3.4, bY + 0.2, H.minZ + 1.6, { collide: true, level: "down" });
    for (const sx of [-0.3, 0, 0.3]) box(g, 0.02, 0.4, 0.52, mat("crateDark", { color: 0x5a4030 }), 3.4 + sx, bY + 0.2, H.minZ + 1.6, { collide: false, castShadow: false });

    // Mini fridge in the corner with a glowing panel
    const mf = group(H.maxX - 0.45, bY, H.minZ + 0.45);
    box(mf, 0.55, 0.85, 0.55, black, 0, 0.425, 0, { collide: false });
    // door on a hinge, with a lit shelf of cans behind it
    const mfDoor = new THREE.Group();
    mfDoor.position.set(0.25, 0, 0.28);
    box(mfDoor, 0.5, 0.78, 0.03, mat("mfDoor", { color: 0x2f4a6b, roughness: 0.4 }), -0.25, 0.43, 0, { collide: false, castShadow: false });
    cyl(mfDoor, 0.012, 0.012, 0.3, mat("chrome"), -0.43, 0.5, 0.025, 6);
    mf.add(mfDoor);
    box(mf, 0.46, 0.72, 0.01, new THREE.MeshBasicMaterial({ color: 0xeaf6ff }), 0, 0.43, -0.2, { collide: false, castShadow: false });
    box(mf, 0.46, 0.02, 0.4, white, 0, 0.42, 0.03, { collide: false, castShadow: false });
    const canM = [mat("canA", { color: 0xd9dde0, metalness: 0.7, roughness: 0.3 }), mat("canB", { color: 0x2e6b4f, metalness: 0.5, roughness: 0.4 }), mat("canC", { color: 0xb5534a, metalness: 0.5, roughness: 0.4 })];
    for (let r2 = 0; r2 < 2; r2++) for (let k = 0; k < 5; k++) cyl(mf, 0.033, 0.033, 0.12, canM[(k + r2) % 3], -0.18 + k * 0.09, 0.14 + r2 * 0.35, 0.08, 10);
    world.miniFridge = { group: mf, door: mfDoor };
    const mfGlow = new THREE.PointLight(0x9fd3c7, 1.2, 2.5, 2);
    mfGlow.position.set(0, 0.95, 0.2);
    mf.add(mfGlow);
    // a stack of red cups and a sleeve of balls on top of it
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(cupGeo, cupMat); m.position.set(-0.12, 0.91 + i * 0.03, 0); mf.add(m); }
    collideBox(H.maxX - 0.45, H.minZ + 0.45, 0.6, 0.6, "down");

    // Shelf of board games (room for more later) on the right wall
    const sh = group(H.maxX - 0.2, bY, 1.4, 0);
    box(sh, 0.35, 1.4, 1.4, oak, 0, 0.7, 0, { collide: false });
    for (let i = 0; i < 3; i++) box(sh, 0.33, 0.03, 1.36, oak, 0, 0.35 + i * 0.4, 0, { collide: false, castShadow: false });
    const gameCols = [0xb5534a, 0x2f4a6b, 0xf4d98b, 0x9fd3c7, 0x6b8e6b, 0xe3c15a];
    for (let i = 0; i < 6; i++) box(sh, 0.28, 0.06, 0.4, new THREE.MeshStandardMaterial({ color: gameCols[i], roughness: 0.8 }), 0, 0.4 + Math.floor(i / 3) * 0.4 + (i % 3) * 0.065, -0.4 + (Math.floor(i / 3)) * 0.5, { collide: false, castShadow: false });
    box(sh, 0.3, 0.3, 0.3, mat("boxOrange", { color: 0xe07a3a, roughness: 0.9 }), 0, 1.3, 0.45, { collide: false, castShadow: false });
    collideBox(H.maxX - 0.2, 1.4, 0.4, 1.45, "down");
    // Dartboard on the right wall (ready for a future game)
    const db = group(H.maxX - 0.13, bY + 1.73, -1.6, -Math.PI / 2);
    cyl(db, 0.25, 0.25, 0.04, black, 0, 0, 0, 24).rotation.x = Math.PI / 2;
    const dartTex = T.artTexture("dart", 128, 128, (ctx, w, h) => {
      const cx = w / 2, cy = h / 2;
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = i % 2 ? "#e9dcc3" : "#1f2a3a";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 60, (i / 20) * Math.PI * 2, ((i + 1) / 20) * Math.PI * 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = i % 2 ? "#b5534a" : "#2e6b4f";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 38, (i / 20) * Math.PI * 2, ((i + 1) / 20) * Math.PI * 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = i % 2 ? "#e9dcc3" : "#1f2a3a";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 32, (i / 20) * Math.PI * 2, ((i + 1) / 20) * Math.PI * 2); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#2e6b4f"; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill();
      ctx.fillStyle = "#b5534a"; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
    });
    plane(db, 0.46, 0.46, new THREE.MeshStandardMaterial({ map: dartTex, roughness: 0.9 }), 0, 0, 0.025);

    // Old TV on a stand on the front wall, with a console and a lava lamp
    const tv = group(-3.5, bY, H.maxZ - 0.5, Math.PI);
    box(tv, 1.2, 0.5, 0.45, oak, 0, 0.25, 0, { collide: false });
    box(tv, 0.8, 0.6, 0.6, mat("tvShell", { color: 0x3b3b3b, roughness: 0.8 }), 0, 0.8, 0, { collide: false });
    plane(tv, 0.62, 0.46, new THREE.MeshStandardMaterial({ color: 0x9fd3c7, emissive: 0x6fb3a7, emissiveIntensity: 0.6 }), 0, 0.8, 0.301);
    box(tv, 0.3, 0.08, 0.25, black, 0.35, 0.54, 0.05, { collide: false, castShadow: false });
    collideBox(-3.5, H.maxZ - 0.5, 1.3, 0.6, "down");
    // Bean bag chairs facing the TV
    sphere(g, 0.45, mat("beanNavy", { color: C.navy, roughness: 1 }), -4.3, bY + 0.3, H.maxZ - 2.2, 10).scale.y = 0.65;
    sphere(g, 0.45, mat("beanRed", { color: C.nantucketRed, roughness: 1 }), -2.8, bY + 0.3, H.maxZ - 2.2, 10).scale.y = 0.65;
    // Rug under the pong table
    plane(g, 2.0, 4.0, mat("rugBasement", { map: T.rugTexture(["#5a3d2b", "#8a6a48", "#5a3d2b", "#c9a56b"]), roughness: 1 }), px, bY + 0.012, pz, 0, -Math.PI / 2).receiveShadow = true;

    // String lights: strands along the ceiling, little warm bulbs
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    const wireMat = mat("wire", { color: 0x222222 });
    const bulbGeo = new THREE.SphereGeometry(0.03, 8, 8);
    function strand(x1, z1, x2, z2, n = 14) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const sag = Math.sin(t * Math.PI) * 0.25;
        pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, -H.slabT - 0.22 - sag, z1 + (z2 - z1) * t));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.006, 4), wireMat);
      g.add(tube);
      for (let i = 1; i < n; i++) {
        const b = new THREE.Mesh(bulbGeo, bulbMat);
        b.position.copy(pts[i]).add(new THREE.Vector3(0, -0.05, 0));
        g.add(b);
      }
    }
    strand(-6.5, -4.0, -2.5, -0.5);
    strand(-2.5, -0.5, 2.0, -3.9);
    strand(2.0, -3.9, 6.5, -0.5);
    strand(-6.5, 3.8, -1.5, 1.5);
    strand(-1.5, 1.5, 3.5, 3.9);
    strand(3.5, 3.9, 6.5, 1.5);

    // Glowing "CAPE HOUSE" sign on the back wall over the couch
    const signTex = T.artTexture("sign", 512, 128, (ctx, w, h) => {
      ctx.font = "700 72px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "#9fd3c7"; ctx.shadowBlur = 24; ctx.fillStyle = "#c8f5ea";
      ctx.fillText("CAPE HOUSE", w / 2, h / 2);
      ctx.shadowBlur = 0; ctx.fillStyle = "#fff"; ctx.fillText("CAPE HOUSE", w / 2, h / 2);
    });
    plane(g, 2.4, 0.6, new THREE.MeshBasicMaterial({ map: signTex, transparent: true }), 3.4, bY + 1.9, H.minZ + 0.12, 0);
    const signL = new THREE.PointLight(0x9fd3c7, 2.5, 4, 2);
    signL.position.set(3.4, bY + 1.9, H.minZ + 0.5);
    g.add(signL);
    // a few posters / a surfboard leaning in the corner
    const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.6, 4, 10), mat("surf", { color: C.butter, roughness: 0.4 }));
    sb.scale.set(1, 1, 0.25);
    sb.position.set(H.minX + 0.5, bY + 1.05, H.maxZ - 0.5);
    sb.rotation.z = 0.12;
    g.add(sb);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), navy);
    stripe.position.copy(sb.position); stripe.position.z -= 0.04; stripe.rotation.z = 0.12;
    g.add(stripe);
    collideBox(H.minX + 0.5, H.maxZ - 0.5, 0.6, 0.4, "down");
  }

  setRound(false);
  addFun(world, ix, onUpdate);
  onUpdate((dt) => ix.update(dt));
  window.__games = games; // used by tests
}
