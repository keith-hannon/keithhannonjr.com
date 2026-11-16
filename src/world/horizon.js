// Things that fill the distance: a headland with a lighthouse, an island, boats
// at their moorings, a ferry, far-off trees and rooftops, a church steeple —
// plus the cupola on the roof and the pergola on the deck.
import * as THREE from "three";
import { H, DECK, WATER_Y, terrainHeight as TH } from "./layout.js";
import { mat, PALETTE as C } from "./house.js";

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function buildHorizon(scene, { isMobile }, onUpdate) {
  const g = new THREE.Group();
  g.name = "horizon";
  scene.add(g);
  const r = rng(404);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const white = std(0xfafafa), anim = [];
  onUpdate((dt) => {
    const t = performance.now() / 1000;
    for (const f of anim) f(t, dt);
  });
  const add = (geo, m, x, y, z, parent = g) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), cc = new THREE.Color();

  // ---------- Far trees and rooftops on the land side ----------
  {
    const N = isMobile ? 260 : 520;
    const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.2, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: false }), N);
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.5, 5, 6), std(0x5b4330), N);
    let k = 0, guard = 0;
    while (k < N && guard++ < 9000) {
      const x = -400 + r() * 800, z = -6 + r() * 330;
      if (Math.abs(x) < 52 && z < 42) continue;      // keep the neighborhood itself clear
      if (z > 13 && z < 25) continue;                 // the street
      const sc = 0.8 + r() * 1.1, y = TH(x, z);
      m4.compose(v3.set(x, y + 2.5 * sc, z), q4, s3.set(sc, sc, sc));
      trunks.setMatrixAt(k, m4);
      m4.compose(v3.set(x, y + 6.2 * sc, z), q4, s3.set(sc, sc * (0.9 + r() * 0.5), sc));
      canopy.setMatrixAt(k, m4);
      canopy.setColorAt(k++, cc.setHSL(0.3 + r() * 0.06, 0.38, 0.3 + r() * 0.12));
    }
    canopy.count = trunks.count = k;
    g.add(canopy, trunks);

    // cottages along the bluff and on the streets behind
    const spots = [];
    for (let x = -390; x <= 390; x += 26) {
      if (Math.abs(x) > 58) spots.push([x + r() * 8, 3 + r() * 3, 0]);
      spots.push([x + r() * 10, 33 + r() * 4, Math.PI]);
      spots.push([x + r() * 10, 64 + r() * 8, 0]);
      if (r() > 0.3) spots.push([x + r() * 10, 100 + r() * 20, Math.PI]);
    }
    const far = spots.filter(([x, z]) => Math.abs(x) > 52 || z > 45);
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(11, 3.6, 8), new THREE.MeshStandardMaterial({ roughness: 1 }), far.length);
    const roofGeo = new THREE.CylinderGeometry(0, 1, 1, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    const roofs = new THREE.InstancedMesh(roofGeo, mat("roof"), far.length);
    const tones = [0xb9bdb9, 0xd9d4c6, 0xc9c2b4, 0xe6e0d0, 0xa9aeab, 0xdcd8cc];
    far.forEach(([x, z, ry], i) => {
      const y = TH(x, z);
      q4.setFromEuler(new THREE.Euler(0, ry, 0));
      m4.compose(v3.set(x, y + 1.6, z), q4, s3.set(1, 1, 1));
      body.setMatrixAt(i, m4);
      body.setColorAt(i, cc.setHex(tones[i % tones.length]));
      m4.compose(v3.set(x, y + 4.8, z), q4, s3.set(8.4, 3.0, 6.4));
      roofs.setMatrixAt(i, m4);
    });
    q4.identity();
    g.add(body, roofs);

    // white church steeple poking above the trees
    const sx = 86, sz = 128, sy = TH(sx, sz);
    add(new THREE.BoxGeometry(12, 9, 20), white, sx, sy + 4.5, sz);
    add(new THREE.BoxGeometry(5, 16, 5), white, sx, sy + 8, sz - 10);
    add(new THREE.ConeGeometry(3.4, 13, 4), std(0x55606a), sx, sy + 22.5, sz - 10).rotation.y = Math.PI / 4;
    // water tower far to the left
    const wx = -150, wz = 150, wy = TH(wx, wz);
    add(new THREE.SphereGeometry(8, 16, 12), std(0xcfe6f5), wx, wy + 30, wz).scale.y = 0.75;
    for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.5, 0.5, 26, 6), std(0xb9c6cc), wx + Math.cos(i * 1.57 + 0.78) * 5, wy + 13, wz + Math.sin(i * 1.57 + 0.78) * 5);
  }

  // ---------- Out on the water ----------
  {
    // headland with a lighthouse, off to the left
    const hx = -230, hz = -210;
    const land = add(new THREE.SphereGeometry(1, 20, 12), std(0x7fa266), hx, WATER_Y - 3, hz);
    land.scale.set(120, 16, 50);
    const sandbar = add(new THREE.SphereGeometry(1, 20, 10), std(0xefdfb6), hx + 40, WATER_Y - 2.2, hz + 14);
    sandbar.scale.set(120, 3.2, 44);
    const lh = new THREE.Group();
    lh.position.set(hx + 70, WATER_Y + 8.5, hz + 6);
    g.add(lh);
    add(new THREE.CylinderGeometry(2.4, 3.6, 22, 16), white, 0, 11, 0, lh);
    add(new THREE.CylinderGeometry(3.05, 3.3, 5, 16), std(C.nantucketRed), 0, 11, 0, lh);
    add(new THREE.CylinderGeometry(3.2, 3.2, 0.6, 16), std(0x2a2c2e), 0, 22.3, 0, lh);
    const lamp = add(new THREE.CylinderGeometry(1.7, 1.7, 3, 12), new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }), 0, 24, 0, lh);
    add(new THREE.ConeGeometry(2.4, 2.6, 12), std(0x2a2c2e), 0, 26.8, 0, lh);
    add(new THREE.BoxGeometry(9, 5, 7), white, -8, 2.5, 2, lh);
    add(new THREE.ConeGeometry(7, 3.5, 4), std(C.nantucketRed), -8, 6.7, 2, lh).rotation.y = Math.PI / 4;
    anim.push((t) => lamp.material.color.setScalar(0.75 + 0.25 * Math.max(0, Math.sin(t * 1.6))));

    // long low island on the right, with a few wind-bent trees
    const ix = 260, iz = -330;
    const isl = add(new THREE.SphereGeometry(1, 20, 10), std(0x86a56c), ix, WATER_Y - 2.5, iz);
    isl.scale.set(170, 9, 36);
    const beach = add(new THREE.SphereGeometry(1, 20, 10), std(0xefdfb6), ix, WATER_Y - 2.4, iz + 6);
    beach.scale.set(185, 4, 44);
    for (let i = 0; i < 14; i++) add(new THREE.IcosahedronGeometry(5 + r() * 4, 1), std(0x4d7a4f), ix - 120 + i * 18 + r() * 8, WATER_Y + 7, iz - 4 + r() * 6);

    // moored sailboats (sails down), bobbing
    const boats = [];
    const hullCols = [0xffffff, C.navy, 0x2e6b4f, 0xffffff, C.nantucketRed, 0xffffff, C.navy];
    hullCols.forEach((col, i) => {
      const b = new THREE.Group();
      const hull = add(new THREE.CapsuleGeometry(0.75, 4.6, 4, 12), std(col, { roughness: 0.4 }), 0, 0.15, 0, b);
      hull.rotation.z = Math.PI / 2;
      hull.scale.set(1, 1, 0.85);
      add(new THREE.BoxGeometry(2.2, 0.5, 1.1), white, -0.3, 0.9, 0, b);
      add(new THREE.CylinderGeometry(0.05, 0.06, 7.5, 6), std(0xd9c9a8), 0.6, 4.2, 0, b);
      const boom = add(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), white, -0.9, 1.5, 0, b);
      boom.rotation.z = Math.PI / 2;
      b.position.set(-64 + i * 21 + r() * 8, WATER_Y, -58 - r() * 28);
      b.rotation.y = 0.5 + r() * 0.4;
      g.add(b);
      boats.push(b);
      // mooring ball
      add(new THREE.SphereGeometry(0.3, 10, 8), white, b.position.x + 4.2, WATER_Y, b.position.z + 2.2);
    });
    // a center-console skiff and a rowboat near shore
    const skiff = new THREE.Group();
    const sh = add(new THREE.CapsuleGeometry(0.55, 3.2, 4, 12), white, 0, 0.1, 0, skiff);
    sh.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.6, 0.9, 0.6), std(C.navy), 0, 0.8, 0, skiff);
    skiff.position.set(30, WATER_Y, -44);
    g.add(skiff);
    boats.push(skiff);

    // channel markers: red nuns and green cans
    const buoys = [];
    [[-40, -95, 0xb5534a], [-8, -110, 0x2e6b4f], [34, -100, 0xb5534a], [72, -120, 0x2e6b4f], [-90, -130, 0x2e6b4f]].forEach(([x, z, col]) => {
      const b = add(new THREE.CylinderGeometry(col === 0xb5534a ? 0.15 : 0.5, 0.6, 2.2, 10), std(col), x, WATER_Y + 0.8, z);
      buoys.push(b);
    });

    // swim raft with a ladder
    const raft = new THREE.Group();
    add(new THREE.BoxGeometry(4, 0.4, 4), std(0xb9b2a4), 0, 0.1, 0, raft);
    for (const [bx, bz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) add(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 10), std(0x6aa0c8), bx, -0.15, bz, raft);
    add(new THREE.BoxGeometry(0.6, 1.0, 0.06), std(0xdfe3e6, { metalness: 0.6 }), 0, 0.5, 2.05, raft);
    raft.position.set(-10, WATER_Y, -47);
    g.add(raft);

    // island ferry crossing the horizon, and a fishing boat working closer in
    const ferry = new THREE.Group();
    add(new THREE.BoxGeometry(34, 4, 9), white, 0, 2, 0, ferry);
    add(new THREE.BoxGeometry(24, 3, 8), white, -1, 5.5, 0, ferry);
    add(new THREE.BoxGeometry(12, 2.6, 6), white, 2, 8.3, 0, ferry);
    add(new THREE.BoxGeometry(34.2, 0.9, 9.1), std(C.navy), 0, 0.6, 0, ferry);
    add(new THREE.BoxGeometry(22, 0.9, 8.05), new THREE.MeshBasicMaterial({ color: 0x2a3a4a }), -1, 5.8, 0, ferry);
    add(new THREE.CylinderGeometry(1.1, 1.3, 3.4, 10), std(C.nantucketRed), -4, 10.6, 0, ferry);
    ferry.position.set(-300, WATER_Y, -420);
    g.add(ferry);
    const trawler = new THREE.Group();
    const th = add(new THREE.CapsuleGeometry(1.5, 8, 4, 12), std(0x2e6b4f, { roughness: 0.5 }), 0, 0.4, 0, trawler);
    th.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(3, 2.4, 2.4), white, 2.4, 2.4, 0, trawler);
    add(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), std(0x3b2a20), -1.5, 4, 0, trawler);
    trawler.position.set(150, WATER_Y, -170);
    g.add(trawler);

    anim.push((t, dt) => {
      boats.forEach((b, i) => {
        b.position.y = WATER_Y + Math.sin(t * 0.9 + i * 1.3) * 0.1;
        b.rotation.z = Math.sin(t * 0.8 + i) * 0.06;
      });
      buoys.forEach((b, i) => {
        b.position.y = WATER_Y + 0.8 + Math.sin(t * 1.1 + i * 2) * 0.12;
        b.rotation.z = Math.sin(t * 0.9 + i) * 0.12;
      });
      raft.position.y = WATER_Y + Math.sin(t * 0.8) * 0.05;
      ferry.position.x += dt * 3.2;
      if (ferry.position.x > 460) ferry.position.x = -460;
      trawler.position.x -= dt * 1.4;
      if (trawler.position.x < -420) trawler.position.x = 420;
      trawler.position.y = WATER_Y + Math.sin(t * 0.7) * 0.15;
    });

    // tall summer clouds stacked along the horizon
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.95 });
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Group();
      const n = 4 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const puff = add(new THREE.IcosahedronGeometry(16 + r() * 16, 2), cloudMat, k * 20 - n * 10, r() * 14, r() * 10, c);
        puff.scale.y = 0.6;
      }
      c.position.set(-620 + i * 115 + r() * 40, 40 + r() * 30, -700 - r() * 80);
      g.add(c);
    }
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) add(new THREE.IcosahedronGeometry(14 + r() * 10, 2), cloudMat, k * 18 - 30, r() * 10, r() * 8, c).scale.y = 0.6;
      c.position.set(-500 + i * 200, 60 + r() * 30, 620 + r() * 60);
      g.add(c);
    }
  }

  // ---------- Cupola + weathervane on the main roof ----------
  {
    const cx = -2.6, base = H.roofRidgeY - 0.25;
    const trim = mat("trim");
    add(new THREE.BoxGeometry(1.5, 0.5, 1.5), mat("shingle"), cx, base + 0.25, 0);
    add(new THREE.BoxGeometry(1.25, 1.0, 1.25), trim, cx, base + 1.0, 0);
    for (const [dx, dz, ry] of [[0, 0.635, 0], [0, -0.635, Math.PI], [0.635, 0, Math.PI / 2], [-0.635, 0, -Math.PI / 2]]) {
      const w = add(new THREE.PlaneGeometry(0.8, 0.62), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }), cx + dx, base + 1.0, dz);
      w.rotation.y = ry;
    }
    const cap = add(new THREE.ConeGeometry(1.15, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0x4f8f86, roughness: 0.5, metalness: 0.4 }), cx, base + 1.95, 0);
    cap.rotation.y = Math.PI / 4;
    add(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), std(0x2a2c2e), cx, base + 2.9, 0);
    const vane = new THREE.Group();
    vane.position.set(cx, base + 3.25, 0);
    const brass = std(0xd4a94a, { metalness: 0.8, roughness: 0.3 });
    add(new THREE.BoxGeometry(1.0, 0.03, 0.03), brass, 0, 0, 0, vane);
    const head = add(new THREE.ConeGeometry(0.09, 0.22, 4), brass, 0.55, 0, 0, vane);
    head.rotation.z = -Math.PI / 2;
    // a little whale for the tail
    const whale = add(new THREE.SphereGeometry(0.16, 10, 8), brass, -0.35, 0.02, 0, vane);
    whale.scale.set(1.6, 0.8, 0.3);
    add(new THREE.ConeGeometry(0.1, 0.16, 4), brass, -0.62, 0.06, 0, vane).rotation.z = Math.PI / 2;
    g.add(vane);
    anim.push((t) => (vane.rotation.y = 0.6 + Math.sin(t * 0.4) * 0.5 + Math.sin(t * 1.7) * 0.08));
  }

  // ---------- Pergola over the loungers ----------
  {
    const trim = mat("trim");
    const x1 = DECK.minX + 0.25, x2 = -0.2, z1 = DECK.minZ + 0.2, z2 = DECK.maxZ - 0.35;
    for (const px of [x1, x2]) for (const pz of [z1, z2]) add(new THREE.BoxGeometry(0.16, 2.7, 0.16), trim, px, 1.38, pz).castShadow = true;
    for (const pz of [z1, z2]) add(new THREE.BoxGeometry(x2 - x1 + 0.8, 0.18, 0.08), trim, (x1 + x2) / 2, 2.72, pz).castShadow = true;
    for (let x = x1 - 0.2; x <= x2 + 0.25; x += 0.42) add(new THREE.BoxGeometry(0.06, 0.14, z2 - z1 + 0.8), trim, x, 2.86, (z1 + z2) / 2).castShadow = true;
  }
  return g;
}
