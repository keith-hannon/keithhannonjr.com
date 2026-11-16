// Everything outside the house: rolling terrain, the bluff and beach, the ocean,
// sky, the street and neighbors, the back deck, and the July beach crowd.
import * as THREE from "three";
import { H, DECK, WING, WATER_Y, terrainHeight as TH, addCollider } from "./layout.js";
import { box, mat, setRound, PALETTE as C } from "./house.js";

// Nobody is on the beach or in the yard for now. Flip this to true to bring
// the generic crowd back, or add specific people with person(x, z, {...}).
const PEOPLE = false;
import * as T from "./textures.js";

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function buildOutdoors(scene, { isMobile }, onUpdate) {
  setRound(true);
  const g = new THREE.Group();
  g.name = "outdoors";
  scene.add(g);
  const r = rng(2026);
  const anim = []; // functions (t, dt)
  onUpdate((dt) => {
    const t = performance.now() / 1000;
    for (const f of anim) f(t, dt);
  });

  const cyl = (parent, rt, rb, h, m, x, y, z, seg = 10) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const sph = (parent, rad, m, x, y, z, seg = 10) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(rad, seg, seg), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const grp = (x, z, rotY = 0, y = null) => {
    const o = new THREE.Group();
    o.position.set(x, y ?? TH(x, z), z);
    o.rotation.y = rotY;
    g.add(o);
    return o;
  };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

  // ================= Sky =================
  const skyTex = T.artTexture("sky", 8, 256, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#3f8fd6");
    gr.addColorStop(0.45, "#8cc6ee");
    gr.addColorStop(0.52, "#d9eef8");
    gr.addColorStop(1, "#d9eef8");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10;
  g.add(sky);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.92 });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(6 + r() * 5, 8, 6), cloudMat);
      puff.position.set(k * 7 - n * 3.5, r() * 2, r() * 4);
      puff.scale.y = 0.45;
      c.add(puff);
    }
    c.position.set(-180 + r() * 360, 55 + r() * 30, -170 + r() * 90 + (i % 3 === 0 ? 200 : 0));
    g.add(c);
    clouds.push(c);
  }
  anim.push((t, dt) => {
    for (const c of clouds) {
      c.position.x += dt * 0.6;
      if (c.position.x > 200) c.position.x = -200;
    }
  });

  // ================= Terrain =================
  {
    const xs = [], zs = [];
    for (let x = -424; x < -64; x += 20) xs.push(x);
    for (let x = -64; x <= 64; x++) xs.push(x);
    for (let x = 84; x <= 424; x += 20) xs.push(x);
    for (const z of [-420, -300, -200, -130, -92.5]) zs.push(z);
    for (let z = -72.5; z <= 41.5; z++) zs.push(z);
    for (let z = 61.5; z <= 361.5; z += 20) zs.push(z);
    const nx = xs.length - 1, nz = zs.length - 1;
    const pos = [], col = [], uv = [], idx = [];
    const grassA = new THREE.Color(0x6fa052), grassB = new THREE.Color(0x86b565), dune = new THREE.Color(0xb9b27a);
    const sand = new THREE.Color(0xfff0c8), wet = new THREE.Color(0xc9b68a), shell = new THREE.Color(0xe9e4d6), sea = new THREE.Color(0x9fb59a);
    const c = new THREE.Color();
    for (let iz = 0; iz <= nz; iz++) {
      for (let ix = 0; ix <= nx; ix++) {
        const x = xs[ix], z = zs[iz], h = TH(x, z);
        pos.push(x, h, z);
        uv.push(x / 5, z / 5);
        const n = Math.sin(x * 1.7 + z * 0.9) * Math.sin(z * 1.3 - x * 0.4);
        c.copy(grassA).lerp(grassB, 0.5 + 0.5 * n);
        // bluff: beach grass giving way to sand
        const bl = Math.max(0, Math.min(1, (-z - 9) / 8));
        if (bl > 0) c.lerp(dune, bl * (0.6 + 0.3 * n));
        if (z < -17.5) c.lerp(sand, Math.min(1, (-z - 17.5) / 2.5));
        if (h < WATER_Y + 0.35) c.lerp(wet, Math.min(1, (WATER_Y + 0.35 - h) / 0.3));
        if (h < WATER_Y - 0.4) c.lerp(sea, 0.6);
        // sandy path down the bluff from the deck stairs
        if (z < -8.5 && z > -19 && Math.abs(x - DECK.stairX) < 1.6) c.lerp(sand, 0.8);
        // crushed-shell driveway on the left of the house
        if (x >= -14 && x <= -10 && z >= 4 && z <= 14) c.copy(shell);
        col.push(c.r, c.g, c.b);
      }
    }
    const row = nx + 1;
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const x = (xs[ix] + xs[ix + 1]) / 2, z = (zs[iz] + zs[iz + 1]) / 2;
        if (x > H.minX && x < H.maxX && z > H.minZ && z < H.maxZ) continue; // basement lives here
        const a = iz * row + ix, b = a + 1, d = a + row, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const detail = T.artTexture("groundDetail", 256, 256, (ctx, S) => {
      const q = rng(77);
      ctx.fillStyle = "#f6f6f6";
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 5000; i++) {
        const v = 222 + Math.floor(q() * 33);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(q() * S, q() * S, 1 + q() * 2, 2 + q() * 4);
      }
    });
    detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 1 }));
    ground.position.y = -0.012;
    ground.receiveShadow = true;
    g.add(ground);
  }

  // ================= Ocean =================
  {
    const waveTex = T.artTexture("waves", 256, 256, (ctx, S) => {
      ctx.fillStyle = "#52b4d2";
      ctx.fillRect(0, 0, S, S);
      const q = rng(5);
      for (let i = 0; i < 90; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + q() * 0.16})`;
        ctx.lineWidth = 1 + q() * 2;
        const y = q() * S, x = q() * S, w = 20 + q() * 60;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + w / 2, y - 4, x + w, y);
        ctx.stroke();
      }
    });
    waveTex.wrapS = waveTex.wrapT = THREE.RepeatWrapping;
    waveTex.repeat.set(80, 36);
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 620), new THREE.MeshStandardMaterial({ map: waveTex, color: 0xffffff, roughness: 0.3, metalness: 0.05, transparent: true, opacity: 0.9 }));
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, WATER_Y, -340);
    g.add(ocean);
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(840, 1.1), foamMat);
    foam.rotation.x = -Math.PI / 2;
    g.add(foam);
    const foam2 = foam.clone();
    g.add(foam2);
    anim.push((t) => {
      waveTex.offset.y = t * 0.012;
      waveTex.offset.x = Math.sin(t * 0.1) * 0.02;
      const s1 = Math.sin(t * 0.7), s2 = Math.sin(t * 0.7 + 2.2);
      foam.position.set(0, WATER_Y + 0.03, -31.3 + s1 * 0.9);
      foam2.position.set(0, WATER_Y + 0.03, -34.5 + s2 * 0.9);
      foamMat.opacity = 0.55 + 0.25 * s1;
      ocean.position.y = WATER_Y + s1 * 0.03;
    });
  }

  // ================= Street, sidewalk, driveway =================
  {
    const asphalt = std(0x55585c, { map: T.artTexture("asphalt", 128, 128, (ctx, S) => {
      const q = rng(9);
      ctx.fillStyle = "#6a6d71"; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 1500; i++) { const v = 80 + q() * 60; ctx.fillStyle = `rgb(${v},${v},${v + 3})`; ctx.fillRect(q() * S, q() * S, 2, 2); }
    }) });
    asphalt.map.wrapS = asphalt.map.wrapT = THREE.RepeatWrapping;
    asphalt.map.repeat.set(40, 2);
    asphalt.map.repeat.set(260, 2);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(840, 6.4), asphalt);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.012, 18.8);
    road.receiveShadow = true;
    g.add(road);
    for (let x = -60; x < 62; x += 5) box(g, 2, 0.01, 0.12, std(0xf1e7b0), x, 0.02, 18.8, { collide: false, castShadow: false });
    for (const z of [14.9, 22.7]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(840, 1.3), std(0xcfc9bb));
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(0, 0.016, z);
      sw.receiveShadow = true;
      g.add(sw);
    }
    // world bounds
    addCollider(-70, 70, 23.3, 30, "up");
    addCollider(-70, 70, -45, -36.5, "up");
    addCollider(-70, -44, -50, 40, "up");
    addCollider(46, 70, -50, 40, "up");
  }

  // ================= Trees, hedges, flowers =================
  const trunkM = std(0x5b4330), canopyM = [std(0x4d8a4f), std(0x5c9a57), std(0x3f7a4a)];
  function tree(x, z, s = 1, pine = false) {
    const t = grp(x, z);
    cyl(t, 0.16 * s, 0.24 * s, 2.4 * s, trunkM, 0, 1.2 * s, 0, 7);
    if (pine) {
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry((1.5 - i * 0.35) * s, 1.8 * s, 8), canopyM[2]);
        cone.position.y = (2.2 + i * 1.1) * s;
        cone.castShadow = true;
        t.add(cone);
      }
    } else {
      sph(t, 1.6 * s, canopyM[Math.floor(r() * 2)], 0, 3.1 * s, 0, 9).scale.y = 0.85;
      sph(t, 1.1 * s, canopyM[1], 0.9 * s, 2.6 * s, 0.4 * s, 8);
    }
    addCollider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, "up");
  }
  [[-21, -9, 1.2], [24, 9, 1.1], [-17, -3, 1.3, 1], [24.5, -4, 1.0, 1], [-20, 11, 1.0], [26, 13, 1.2], [-34, -2, 1.4, 1], [43.5, -2, 1.3, 1], [-26, 12, 1.1], [28, 11.5, 1.0],
   [-10, 27, 1.3], [12, 28, 1.2], [-30, 27, 1.1, 1], [34, 28, 1.3], [-40, 8, 1.2, 1], [42, 6, 1.1]].forEach((a) => tree(...a));
  // privet hedges between lots
  const hedgeM = std(0x3f7448);
  function hedge(x, z1, z2) {
    for (let z = z1; z < z2; z += 1.4) {
      const hh = box(g, 1.0, 1.3, 1.5, hedgeM, x, TH(x, z) + 0.6, z, { collide: false });
      hh.rotation.y = (r() - 0.5) * 0.1;
    }
    addCollider(x - 0.5, x + 0.5, z1 - 0.7, z2, "up");
  }
  hedge(-16.5, 4, 13.5);
  hedge(23, 4.5, 13.5);
  // rosa rugosa + daylilies along the fence and bluff edge
  const flowerCols = [0xe86a8a, 0xf4a6c0, 0xf2c14e, 0xffffff, 0xe86a8a];
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), 260);
  const bushI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 7, 6), std(0x4a8550), 44);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), cc = new THREE.Color();
  let fi = 0, bi = 0;
  function bush(x, z, sc = 1) {
    const y = TH(x, z);
    m4.compose(v3.set(x, y + 0.3 * sc, z), q4, s3.set(sc, sc * 0.8, sc));
    bushI.setMatrixAt(bi++, m4);
    for (let k = 0; k < 5 && fi < 260; k++) {
      const a = r() * 6.28;
      m4.compose(v3.set(x + Math.cos(a) * 0.4 * sc, y + 0.45 * sc + r() * 0.2, z + Math.sin(a) * 0.4 * sc), q4, s3.set(1, 1, 1));
      fl.setMatrixAt(fi, m4);
      fl.setColorAt(fi++, cc.setHex(flowerCols[Math.floor(r() * 5)]));
    }
  }
  for (let x = -13.5; x <= 14; x += 1.25) if (Math.abs(x - 0.25) > 1.6 && bi < 44) bush(x, 13.2, 0.8 + r() * 0.3);
  for (let x = -9; x <= 16 && bi < 44; x += 1.6) if (Math.abs(x - DECK.stairX) > 1.8) bush(x + r() * 0.5, -9.6 - r() * 0.6, 0.9 + r() * 0.4);
  fl.count = fi; bushI.count = bi;
  fl.instanceMatrix.needsUpdate = bushI.instanceMatrix.needsUpdate = true;
  if (fl.instanceColor) fl.instanceColor.needsUpdate = true;
  g.add(fl, bushI);

  // beach grass tufts on the bluff and dunes
  {
    const N = isMobile ? 1200 : 2600;
    const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.7, 3), new THREE.MeshStandardMaterial({ roughness: 1 }), N);
    let k = 0, guard = 0;
    while (k < N && guard++ < 8000) {
      const x = -55 + r() * 110, z = -9.5 - r() * 13.5;
      if (Math.abs(x - DECK.stairX) < 1.5) continue;
      if (z < -19 && r() < 0.6) continue;
      // each tuft is a little clump of 4 thin blades leaning different ways
      const hue = 0.17 + r() * 0.1, lum = 0.45 + r() * 0.18;
      for (let b = 0; b < 4 && k < N; b++) {
        const sc = 0.6 + r() * 0.9;
        const bx = x + (r() - 0.5) * 0.3, bz2 = z + (r() - 0.5) * 0.3;
        q4.setFromEuler(new THREE.Euler((r() - 0.5) * 0.9, r() * 6.28, (r() - 0.5) * 0.9));
        m4.compose(v3.set(bx, TH(bx, bz2) + 0.28 * sc, bz2), q4, s3.set(sc, sc, sc));
        tuft.setMatrixAt(k, m4);
        tuft.setColorAt(k++, cc.setHSL(hue, 0.42, lum));
      }
    }
    tuft.count = k;
    g.add(tuft);
    // weathered rocks at the foot of the bluff
    const rockM = std(0x8f8a82);
    for (let i = 0; i < 16; i++) {
      const x = -50 + r() * 100, z = -19.5 - r() * 2;
      if (Math.abs(x - DECK.stairX) < 2.5) continue;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + r() * 0.5, 0), rockM);
      rock.position.set(x, TH(x, z) + 0.1, z);
      rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.scale.y = 0.6;
      rock.castShadow = true;
      g.add(rock);
    }
  }

  // ================= Neighbors =================
  const roofM = mat("roof");
  const trimM = mat("trim");
  function cottage(x, z, rotY, w, d, tone, doorCol, shutterCol) {
    const y = Math.min(TH(x - w / 2, z), TH(x + w / 2, z), TH(x, z)) ;
    const n = grp(x, z, rotY, y);
    const wallM = std(tone, { map: T.shingleTexture([6, 3]) });
    box(n, w, 3.6, d, wallM, 0, 1.6, 0, { collide: false });
    const half = d / 2 + 0.5, rise = 2.6, len = Math.hypot(half, rise), pitch = Math.atan2(rise, half);
    for (const sd of [1, -1]) {
      const rf = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.16, len), roofM);
      rf.position.set(0, 3.4 + rise / 2, (sd * half) / 2);
      rf.rotation.x = sd * pitch;
      rf.castShadow = true;
      n.add(rf);
    }
    const tri = new THREE.Shape();
    tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rise); tri.closePath();
    const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false });
    for (const sx of [-w / 2, w / 2 - 0.1]) {
      const gm = new THREE.Mesh(tg, wallM);
      gm.rotation.y = Math.PI / 2;
      gm.position.set(sx + 0.1, 3.4, 0);
      n.add(gm);
    }
    box(n, 0.7, 1.8, 0.7, std(0x9a6a5a), w * 0.25, 5.6, -0.6, { collide: false });
    // door + windows on the front (+z local)
    box(n, 1.0, 2.1, 0.08, std(doorCol), 0, 1.05, d / 2 + 0.03, { collide: false, castShadow: false });
    box(n, 1.3, 0.12, 0.12, trimM, 0, 2.18, d / 2 + 0.05, { collide: false, castShadow: false });
    for (const wx of [-w * 0.3, w * 0.3]) {
      box(n, 1.2, 1.4, 0.06, trimM, wx, 1.6, d / 2 + 0.03, { collide: false, castShadow: false });
      box(n, 1.0, 1.2, 0.07, mat("glassDark"), wx, 1.6, d / 2 + 0.04, { collide: false, castShadow: false });
      for (const sx of [-0.8, 0.8]) box(n, 0.35, 1.4, 0.05, std(shutterCol), wx + sx, 1.6, d / 2 + 0.04, { collide: false, castShadow: false });
    }
    for (const wx of [-w * 0.3, w * 0.3]) box(n, 1.0, 1.2, 0.07, mat("glassDark"), wx, 1.6, -d / 2 - 0.04, { collide: false, castShadow: false });
    // hydrangeas out front
    for (const hx of [-w * 0.35, -w * 0.12, w * 0.12, w * 0.35]) {
      sph(n, 0.5, std(0x3f7a4a), hx, 0.4, d / 2 + 0.8, 7).scale.y = 0.8;
      sph(n, 0.2, std([0x8fb6e8, 0xc9b7ea, 0xe8c7dc][Math.floor(r() * 3)]), hx + 0.15, 0.75, d / 2 + 0.95, 6);
    }
    const along = Math.abs(Math.sin(rotY)) > 0.5;
    const cw = along ? d : w, cd = along ? w : d;
    addCollider(x - cw / 2 - 0.3, x + cw / 2 + 0.3, z - cd / 2 - 0.3, z + cd / 2 + 0.3, "up");
  }
  cottage(-29, 4, 0, 11, 8, 0xd9d4c6, 0x2f4a6b, 0x2f4a6b);
  cottage(35, 3.5, 0, 12, 8, 0xbfc7c4, 0xf4d98b, 0x55606a);
  cottage(-22, 31, Math.PI, 12, 8, 0xe6e0d0, 0x9fd3c7, 0x3f6a5a);
  cottage(1, 32, Math.PI, 10, 8, 0xc9c2b4, 0xb5534a, 0x2f4a6b);
  cottage(24, 31, Math.PI, 12, 8, 0xdcd8cc, 0x2f4a6b, 0x7a4a44);

  // ================= Cars, bikes =================
  function wagon(x, z, rotY, color, boards = false) {
    const c = grp(x, z, rotY);
    const body = std(color, { roughness: 0.4, metalness: 0.2 });
    box(c, 1.8, 0.7, 4.3, body, 0, 0.75, 0, { collide: false });
    box(c, 1.6, 0.6, 2.7, body, 0, 1.4, -0.3, { collide: false });
    box(c, 1.62, 0.42, 2.5, mat("glassDark"), 0, 1.42, -0.3, { collide: false, castShadow: false });
    box(c, 1.82, 0.32, 2.6, std(0x9a6b42), 0, 0.72, -0.2, { collide: false, castShadow: false });
    for (const wx of [-0.9, 0.9]) for (const wz of [-1.35, 1.35]) {
      const w = cyl(c, 0.36, 0.36, 0.24, std(0x1c1c1e), wx, 0.36, wz, 12);
      w.rotation.z = Math.PI / 2;
    }
    if (boards) {
      for (const [bx, col] of [[-0.35, 0xf4d98b], [0.35, 0x9fd3c7]]) {
        const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.9, 3, 8), std(col, { roughness: 0.4 }));
        b.rotation.x = Math.PI / 2;
        b.scale.set(1, 1, 0.2);
        b.position.set(bx, 1.82, -0.3);
        c.add(b);
      }
    }
    const along = Math.abs(Math.sin(rotY)) > 0.5;
    addCollider(x - (along ? 2.3 : 1.0), x + (along ? 2.3 : 1.0), z - (along ? 1.0 : 2.3), z + (along ? 1.0 : 2.3), "up");
  }
  wagon(-12, 11.6, 0.05, 0x2f4a6b, true);
  wagon(9, 16.6, Math.PI / 2, 0xe9dcc3);
  wagon(-24, 21.2, Math.PI / 2, 0x6b8e7a);
  function bike(x, z, rotY, col) {
    const b = grp(x, z, rotY);
    const fm = std(col, { metalness: 0.4, roughness: 0.4 });
    for (const wx of [-0.5, 0.5]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 16), std(0x222222));
      w.position.set(wx, 0.36, 0);
      b.add(w);
    }
    for (const [x1, y1, x2, y2] of [[-0.5, 0.36, 0, 0.36], [0, 0.36, 0.3, 0.85], [0.3, 0.85, -0.25, 0.8], [-0.25, 0.8, 0, 0.36], [0.5, 0.36, 0.33, 0.95], [-0.25, 0.8, -0.5, 0.36]]) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 5), fm);
      bar.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      bar.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
      b.add(bar);
    }
    box(b, 0.22, 0.04, 0.1, std(0x3b2a20), -0.27, 0.86, 0, { collide: false });
    box(b, 0.04, 0.04, 0.45, std(0x222222), 0.33, 0.98, 0, { collide: false });
    b.rotation.x = 0.16;
  }
  bike(-4.2, 13.72, 0, 0x9fd3c7);
  bike(-6.0, 13.72, 0, 0xb5534a);
  bike(5.2, 13.72, Math.PI, 0xf4d98b);

  // ================= People =================
  const skins = [0xf1c9a5, 0xe0ac7e, 0xc68e63, 0x8d5b3e, 0xf6d7bd];
  const suits = [C.navy, C.nantucketRed, C.seafoam, C.butter, 0xffffff, 0xf4a6c0, 0x6aa0c8, 0x2e6b4f];
  const hairs = [0x3b2a20, 0x6b4a2b, 0xd9b26a, 0x1c1c1e, 0x9a5a34];
  function person(x, z, { pose = "stand", rotY = 0, scale = 1, y = null, parent = null } = {}) {
    const p = new THREE.Group();
    p.position.set(x, y ?? TH(x, z), z);
    p.rotation.y = rotY;
    p.scale.setScalar(scale);
    (parent || g).add(p);
    const skin = std(skins[Math.floor(r() * skins.length)]);
    const suit = std(suits[Math.floor(r() * suits.length)]);
    const body = new THREE.Group();
    p.add(body);
    const torso = cyl(body, 0.15, 0.13, 0.5, skin, 0, 1.1, 0, 8);
    cyl(body, 0.155, 0.16, 0.26, suit, 0, 0.84, 0, 8);
    sph(body, 0.12, skin, 0, 1.5, 0, 8);
    const hair = sph(body, 0.125, std(hairs[Math.floor(r() * hairs.length)]), 0, 1.54, -0.02, 8);
    hair.scale.set(1, 0.8, 1);
    const limbs = {};
    for (const sx of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(sx * 0.08, 0.74, 0);
      cyl(leg, 0.06, 0.05, 0.74, skin, 0, -0.37, 0, 6);
      body.add(leg);
      const arm = new THREE.Group();
      arm.position.set(sx * 0.2, 1.3, 0);
      cyl(arm, 0.045, 0.04, 0.55, skin, 0, -0.27, 0, 6);
      body.add(arm);
      limbs[sx] = { leg, arm };
    }
    p.userData = { body, limbs, torso };
    p.visible = PEOPLE;
    if (pose === "sit") {
      body.position.y = -0.42;
      body.rotation.x = -0.25;
      for (const sx of [-1, 1]) limbs[sx].leg.rotation.x = -1.25;
    } else if (pose === "lie") {
      body.rotation.x = -Math.PI / 2;
      body.position.set(0, 0.16, 0.8);
    } else if (pose === "kid") {
      p.scale.setScalar(scale * 0.62);
    }
    return p;
  }
  const walkCycle = (p, t, sp = 6) => {
    const { limbs } = p.userData;
    const a = Math.sin(t * sp) * 0.6;
    limbs[-1].leg.rotation.x = a; limbs[1].leg.rotation.x = -a;
    limbs[-1].arm.rotation.x = -a * 0.7; limbs[1].arm.rotation.x = a * 0.7;
  };

  // ================= Beach gear =================
  const stripe = (key, a, b) => {
    const tx = T.artTexture("stripe" + key, 64, 64, (ctx, S) => {
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? a : b; ctx.fillRect(i * 8, 0, 8, S); }
    });
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9, side: THREE.DoubleSide });
  };
  const stripes = [stripe("nw", "#2f4a6b", "#ffffff"), stripe("rw", "#b5534a", "#ffffff"), stripe("sw", "#9fd3c7", "#ffffff"), stripe("bw", "#f4d98b", "#ffffff")];
  const woodM = std(0xc9a56b), whiteM = std(0xfafafa), alu = std(0xcfd3d6, { metalness: 0.6, roughness: 0.4 });
  function umbrella(x, z, m, tilt = 0.15, y = null) {
    const u = grp(x, z, r() * 6, y);
    u.rotation.z = tilt;
    cyl(u, 0.025, 0.025, 2.3, whiteM, 0, 1.15, 0, 6);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.5, 10, 1, true), m);
    top.position.y = 2.25;
    top.castShadow = true;
    u.add(top);
    return u;
  }
  function beachChair(x, z, rotY, m, y = null) {
    const c = grp(x, z, rotY, y);
    const seat = box(c, 0.55, 0.03, 0.5, m, 0, 0.3, 0.05, { collide: false });
    seat.rotation.x = 0.12;
    const back = box(c, 0.55, 0.65, 0.03, m, 0, 0.6, -0.3, { collide: false });
    back.rotation.x = -0.45;
    for (const sx of [-0.28, 0.28]) {
      box(c, 0.03, 0.03, 0.75, alu, sx, 0.2, 0, { collide: false, castShadow: false }).rotation.x = 0.5;
      box(c, 0.03, 0.03, 0.75, alu, sx, 0.2, 0, { collide: false, castShadow: false }).rotation.x = -0.5;
      box(c, 0.04, 0.03, 0.5, woodM, sx, 0.47, 0, { collide: false, castShadow: false });
    }
    return c;
  }
  function towel(x, z, rotY, m) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), m);
    t.rotation.set(-Math.PI / 2, 0, rotY);
    t.position.set(x, TH(x, z) + 0.03, z);
    t.receiveShadow = true;
    g.add(t);
  }
  function cooler(x, z, col = 0xffffff, lid = C.nantucketRed) {
    const c = grp(x, z, r());
    box(c, 0.6, 0.35, 0.38, std(col), 0, 0.18, 0, { collide: false });
    box(c, 0.62, 0.06, 0.4, std(lid), 0, 0.38, 0, { collide: false });
  }

  // Family camps spread along the beach (x from -30 to 34, z from -22 to -29)
  const camps = [[-24, -24], [-13, -26.5], [-5, -23.5], [8, -25], [17, -27.5], [27, -24], [36, -26.5], [-34, -27]];
  camps.forEach(([cx, cz], i) => {
    const m = stripes[i % 4];
    umbrella(cx, cz, m);
    beachChair(cx - 0.9, cz + 0.3, Math.PI + 0.2, stripes[(i + 1) % 4]);
    beachChair(cx + 0.9, cz + 0.2, Math.PI - 0.25, stripes[(i + 2) % 4]);
    person(cx - 0.9, cz + 0.33, { pose: "sit", rotY: Math.PI + 0.2, y: TH(cx - 0.9, cz + 0.3) + 0.3 });
    if (i % 2 === 0) person(cx + 0.9, cz + 0.23, { pose: "sit", rotY: Math.PI - 0.25, y: TH(cx + 0.9, cz + 0.2) + 0.3 });
    towel(cx + 2.2, cz - 0.4, 0.3 * (i % 3), stripes[(i + 3) % 4]);
    if (i % 3 !== 1) person(cx + 2.2, cz - 0.4, { pose: "lie", rotY: Math.PI + 0.3 * (i % 3) });
    cooler(cx - 0.1, cz + 1.0, 0xffffff, [C.nantucketRed, C.navy, C.seafoam][i % 3]);
    addCollider(cx - 1.3, cx + 1.3, cz - 0.3, cz + 0.8, "up");
  });

  // Volleyball game
  {
    const vx = -15, vz = -22;
    for (const sx of [-4, 4]) cyl(g, 0.05, 0.05, 2.5, whiteM, vx, TH(vx, vz + sx) + 1.25, vz + sx, 6);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    net.rotation.y = Math.PI / 2;
    net.position.set(vx, TH(vx, vz) + 1.95, vz);
    g.add(net);
    const players = [[-3, -2], [-3.5, 2], [3, -1.5], [3.4, 2.2]].map(([dx, dz]) => person(vx + dx, vz + dz, { rotY: dx < 0 ? Math.PI / 2 : -Math.PI / 2 }));
    const ball = sph(g, 0.13, whiteM, vx, 0, vz, 10);
    ball.position.set(vx + 1.6, TH(vx + 1.6, vz + 1) + 0.13, vz + 1);
    if (PEOPLE) anim.push((t) => {
      const ph = (t * 0.5) % 2, u = ph < 1 ? ph : 2 - ph;
      ball.position.set(vx - 3 + u * 6, TH(vx, vz) + 1.6 + Math.sin(u * Math.PI) * 2.2, vz + Math.sin(t * 0.37) * 1.5);
      players.forEach((p, i) => {
        const near = (i < 2 ? 1 - u : u) > 0.75;
        p.position.y = TH(p.position.x, p.position.z) + (near ? Math.abs(Math.sin(t * 6 + i)) * 0.35 : 0);
        p.userData.limbs[1].arm.rotation.x = p.userData.limbs[-1].arm.rotation.x = near ? -2.6 : -0.3;
      });
    });
    addCollider(vx - 0.2, vx + 0.2, vz - 4, vz + 4, "up");
  }

  // Kids building a sandcastle + a bouncing beach ball
  {
    const kx = 3, kz = -29.5, ky = TH(kx, kz);
    const sandM = std(0xe2cd9a);
    cyl(g, 0.3, 0.4, 0.4, sandM, kx, ky + 0.2, kz, 8);
    for (const [dx, dz] of [[0.5, 0.2], [-0.45, 0.25], [0.1, -0.5]]) cyl(g, 0.14, 0.18, 0.3, sandM, kx + dx, ky + 0.15, kz + dz, 7);
    const flag = box(g, 0.14, 0.09, 0.01, std(C.nantucketRed), kx + 0.07, ky + 0.62, kz, { collide: false });
    cyl(g, 0.008, 0.008, 0.3, whiteM, kx, ky + 0.52, kz, 4);
    cyl(g, 0.1, 0.08, 0.16, std(C.butter), kx + 0.9, ky + 0.08, kz - 0.3, 8);
    const k1 = person(kx - 0.9, kz + 0.2, { pose: "kid", rotY: Math.PI / 2 });
    const k2 = person(kx + 0.5, kz + 0.9, { pose: "kid", rotY: Math.PI });
    const bb = sph(g, 0.22, stripes[1], kx + 4, 0, kz + 2, 10);
    const k3 = person(kx + 5.4, kz + 2, { pose: "kid", rotY: -Math.PI / 2 });
    const k4 = person(kx + 2.6, kz + 2, { pose: "kid", rotY: Math.PI / 2 });
    bb.position.set(kx + 4, TH(kx + 4, kz + 2) + 0.22, kz + 2);
    anim.push((t) => {
      flag.rotation.y = Math.sin(t * 4) * 0.4;
      if (!PEOPLE) return;
      k1.userData.limbs[1].arm.rotation.x = -1 + Math.sin(t * 5) * 0.5;
      k2.userData.body.rotation.x = 0.3 + Math.sin(t * 2) * 0.1;
      const ph = (t * 0.6) % 2, u = ph < 1 ? ph : 2 - ph;
      bb.position.set(kx + 2.9 + u * 2.2, TH(kx + 4, kz + 2) + 0.5 + Math.sin(u * Math.PI) * 1.1, kz + 2);
      bb.rotation.z = t * 3;
      k3.userData.limbs[1].arm.rotation.x = k3.userData.limbs[-1].arm.rotation.x = u > 0.7 ? -2.4 : 0;
      k4.userData.limbs[1].arm.rotation.x = k4.userData.limbs[-1].arm.rotation.x = u < 0.3 ? -2.4 : 0;
      flag.rotation.y = Math.sin(t * 4) * 0.4;
    });
  }

  // Walkers along the waterline, swimmers, a paddleboarder
  {
    const walkers = [0, 1, 2, 3].map((i) => person(-30 + i * 17, -30.2 - (i % 2) * 0.6, { rotY: i % 2 ? -Math.PI / 2 : Math.PI / 2 }));
    anim.push((t, dt) => {
      walkers.forEach((p, i) => {
        const dir = i % 2 ? -1 : 1;
        p.position.x += dir * dt * (1.0 + i * 0.12);
        if (p.position.x > 44) p.position.x = -44;
        if (p.position.x < -44) p.position.x = 44;
        p.position.y = TH(p.position.x, p.position.z);
        walkCycle(p, t + i, 6);
      });
    });
    const swimmers = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Group();
      s.position.set(-34 + i * 11 + r() * 4, WATER_Y, -37 - r() * 9);
      sph(s, 0.13, std(skins[i % 5]), 0, 0.08, 0, 8).visible = PEOPLE;
      sph(s, 0.135, std(hairs[i % 5]), 0, 0.13, -0.02, 8).visible = PEOPLE;
      if (i % 3 === 0) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 8, 16), std([0xf4a6c0, 0xf4d98b, 0x9fd3c7][i % 3], { roughness: 0.4 }));
        ring.rotation.x = Math.PI / 2;
        s.add(ring);
      }
      g.add(s);
      swimmers.push(s);
    }
    const sup = new THREE.Group();
    const board = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 2.4, 3, 8), std(0xffffff, { roughness: 0.4 }));
    board.rotation.z = Math.PI / 2;
    board.scale.set(1, 1, 0.16);
    sup.add(board);
    const rider = person(0, 0, { parent: sup, y: 0.05, rotY: Math.PI / 2 });
    const paddle = cyl(rider, 0.02, 0.02, 1.9, woodM, 0.3, 1.0, 0.25, 5);
    g.add(sup);
    sup.visible = PEOPLE;
    anim.push((t) => {
      swimmers.forEach((s, i) => {
        s.position.y = WATER_Y + Math.sin(t * 1.4 + i * 1.7) * 0.07;
        s.rotation.y = Math.sin(t * 0.3 + i) * 0.8;
      });
      const px = Math.sin(t * 0.05) * 38;
      sup.position.set(px, WATER_Y + 0.04 + Math.sin(t * 1.2) * 0.04, -50);
      sup.rotation.y = Math.cos(t * 0.05) > 0 ? 0 : Math.PI;
      paddle.rotation.x = Math.sin(t * 2) * 0.5;
    });
  }

  // Lifeguard chair, kite, sailboats, gulls
  {
    const lx = 22, lz = -29.5, ly = TH(lx, lz);
    const lg = grp(lx, lz, Math.PI);
    for (const sx of [-0.6, 0.6]) for (const sz of [-0.5, 0.5]) {
      const leg = cyl(lg, 0.05, 0.05, 2.3, whiteM, sx, 1.1, sz, 6);
      leg.rotation.z = -sx * 0.12;
    }
    box(lg, 1.2, 0.08, 1.0, whiteM, 0, 2.1, 0, { collide: false });
    box(lg, 1.2, 0.9, 0.08, whiteM, 0, 2.6, -0.45, { collide: false });
    person(0, 0, { parent: lg, pose: "sit", y: 2.1 + 0.42 });
    umbrella(lx, lz + 0.2, stripes[1], 0, ly + 2.2).scale.setScalar(0.75);
    addCollider(lx - 0.8, lx + 0.8, lz - 0.7, lz + 0.7, "up");

    const kite = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), new THREE.MeshBasicMaterial({ color: 0xb5534a, side: THREE.DoubleSide, fog: false }));
    kite.rotation.z = Math.PI / 4;
    g.add(kite);
    cyl(g, 0.03, 0.03, 0.6, woodM, -26.8, TH(-27, -29) + 0.25, -29.2, 6);
    const flyer = person(-27, -29, { rotY: Math.PI });
    flyer.userData.limbs[1].arm.rotation.x = -2.3;
    const lineG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(lineG, new THREE.LineBasicMaterial({ color: 0xffffff }));
    g.add(line);
    anim.push((t) => {
      kite.position.set(-27 + Math.sin(t * 0.6) * 3, TH(-27, -29) + 11 + Math.sin(t * 0.9) * 1.2, -40 + Math.cos(t * 0.4) * 2);
      kite.rotation.y = Math.sin(t * 1.3) * 0.3;
      const pa = lineG.attributes.position;
      pa.setXYZ(0, -26.8, TH(-27, -29) + (PEOPLE ? 1.75 : 0.5), -29.2);
      pa.setXYZ(1, kite.position.x, kite.position.y, kite.position.z);
      pa.needsUpdate = true;
    });

    const boats = [];
    const sailM = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 4.5, 3, 8), std([0xffffff, C.navy, C.nantucketRed, 0xffffff, 0x2e6b4f][i], { roughness: 0.4 }));
      hull.rotation.z = Math.PI / 2;
      hull.scale.set(1, 1, 0.9);
      b.add(hull);
      cyl(b, 0.06, 0.06, 7, whiteM, 0.3, 3.5, 0, 6);
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.lineTo(-3.4, 0); sh.lineTo(0, 6); sh.closePath();
      const sail = new THREE.Mesh(new THREE.ShapeGeometry(sh), sailM);
      sail.position.set(0.2, 0.9, 0);
      b.add(sail);
      const jb = new THREE.Shape();
      jb.moveTo(0, 0); jb.lineTo(2.2, 0); jb.lineTo(0, 5); jb.closePath();
      const jib = new THREE.Mesh(new THREE.ShapeGeometry(jb), sailM);
      jib.position.set(0.45, 0.9, 0);
      b.add(jib);
      b.userData = { x0: -120 + i * 55, z: -75 - i * 22, sp: 1.2 + i * 0.35, dir: i % 2 ? -1 : 1 };
      b.position.set(b.userData.x0, WATER_Y, b.userData.z);
      if (b.userData.dir < 0) b.rotation.y = Math.PI;
      g.add(b);
      boats.push(b);
    }
    const gulls = [];
    for (let i = 0; i < 7; i++) {
      const gl = new THREE.Group();
      const wl = box(gl, 0.5, 0.02, 0.14, whiteM, -0.25, 0, 0, { collide: false, castShadow: false });
      const wr = box(gl, 0.5, 0.02, 0.14, whiteM, 0.25, 0, 0, { collide: false, castShadow: false });
      gl.userData = { wl, wr, cx: -20 + i * 9, cz: -22 - (i % 3) * 8, rad: 6 + i * 1.5, h: 5 + (i % 4) * 2.2, sp: 0.35 + i * 0.05 };
      g.add(gl);
      gulls.push(gl);
    }
    anim.push((t, dt) => {
      for (const b of boats) {
        b.position.x += b.userData.dir * b.userData.sp * dt;
        if (b.position.x > 160) b.position.x = -160;
        if (b.position.x < -160) b.position.x = 160;
        b.position.y = WATER_Y + 0.1 + Math.sin(t * 0.9 + b.userData.z) * 0.12;
        b.rotation.z = Math.sin(t * 0.7 + b.userData.z) * 0.05;
      }
      gulls.forEach((gl, i) => {
        const u = gl.userData, a = t * u.sp + i;
        gl.position.set(u.cx + Math.cos(a) * u.rad, u.h + Math.sin(a * 1.7) * 0.8, u.cz + Math.sin(a) * u.rad);
        gl.rotation.y = -a;
        const f = Math.sin(t * 7 + i) * 0.5;
        u.wl.rotation.z = -f; u.wr.rotation.z = f;
      });
    });
  }

  // Neighbors out front: a dog walker and a jogger on the sidewalk, a kid on the far side
  {
    const walker = person(-30, 14.9, { rotY: Math.PI / 2 });
    const dog = new THREE.Group();
    const fur = std(0xd9b26a);
    box(dog, 0.2, 0.22, 0.55, fur, 0, 0.36, 0, { collide: false });
    box(dog, 0.17, 0.18, 0.2, fur, 0, 0.5, 0.33, { collide: false });
    const tail = box(dog, 0.04, 0.04, 0.22, fur, 0, 0.48, -0.36, { collide: false });
    for (const sx of [-0.07, 0.07]) for (const sz of [-0.2, 0.2]) box(dog, 0.05, 0.26, 0.05, fur, sx, 0.13, sz, { collide: false });
    dog.rotation.y = Math.PI / 2;
    g.add(dog);
    dog.visible = PEOPLE;
    const jogger = person(30, 22.7, { rotY: -Math.PI / 2 });
    anim.push((t, dt) => {
      walker.position.x += dt * 1.1;
      if (walker.position.x > 46) walker.position.x = -46;
      walkCycle(walker, t, 6);
      dog.position.set(walker.position.x + 1.0, 0.016, 14.5);
      tail.rotation.x = Math.sin(t * 12) * 0.5;
      dog.position.y = 0.016 + Math.abs(Math.sin(t * 9)) * 0.03;
      jogger.position.x -= dt * 2.6;
      if (jogger.position.x < -46) jogger.position.x = 46;
      walkCycle(jogger, t, 10);
    });
  }

  // ================= Back deck =================
  {
    const D = DECK;
    const deckM = std(0xb9b2a4, { map: T.plankTexture([10, 3], "#b8b0a2") });
    const w = D.maxX - D.minX, d = D.maxZ - D.minZ;
    box(g, w, 0.1, d, deckM, (D.minX + D.maxX) / 2, -0.02, (D.minZ + D.maxZ) / 2 - 0.11, { collide: false });
    // skirt
    box(g, w, 0.5, 0.08, std(0xa8a195), (D.minX + D.maxX) / 2, -0.3, D.minZ - 0.1, { collide: false, castShadow: false });
    // railing (gap at the beach stairs)
    const railM = whiteM;
    const sx1 = D.stairX - 0.85, sx2 = D.stairX + 0.85;
    function rail(x1, z1, x2, z2) {
      const len = Math.hypot(x2 - x1, z2 - z1), alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
      box(g, alongX ? len : 0.08, 0.07, alongX ? 0.08 : len, railM, (x1 + x2) / 2, 0.98, (z1 + z2) / 2, { collide: false });
      box(g, alongX ? len : 0.05, 0.05, alongX ? 0.05 : len, railM, (x1 + x2) / 2, 0.2, (z1 + z2) / 2, { collide: false, castShadow: false });
      const n = Math.round(len / 0.16);
      const bal = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.76, 0.035), railM, n);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        m4.makeTranslation(x1 + (x2 - x1) * u, 0.59, z1 + (z2 - z1) * u);
        bal.setMatrixAt(i, m4);
      }
      g.add(bal);
      for (const [px, pz] of [[x1, z1], [x2, z2]]) box(g, 0.12, 1.1, 0.12, railM, px, 0.55, pz, { collide: false });
      addCollider(Math.min(x1, x2) - 0.06, Math.max(x1, x2) + 0.06, Math.min(z1, z2) - 0.06, Math.max(z1, z2) + 0.06, "up");
    }
    const rz = D.minZ - 0.05;
    rail(D.minX, rz, sx1, rz);
    rail(sx2, rz, D.maxX, rz);
    rail(D.minX, rz, D.minX, D.maxZ - 0.3);
    rail(D.maxX, rz, D.maxX, WING.minZ - 0.3);
    // wooden beach stairs following the bluff
    const treadM = std(0xb0a898);
    for (let z = D.minZ - 0.35; z > -19.6; z -= 0.42) {
      const y = TH(D.stairX, z);
      box(g, 1.6, 0.06, 0.36, treadM, D.stairX, y + 0.06, z, { collide: false });
    }
    for (const sx of [sx1, sx2]) {
      for (let z = D.minZ - 0.4; z > -19.8; z -= 1.9) {
        const y = TH(D.stairX, z);
        box(g, 0.09, 1.15, 0.09, treadM, sx, y + 0.55, z, { collide: false });
        const z2 = z - 1.9, y2 = TH(D.stairX, z2);
        if (z2 > -19.9) {
          const len = Math.hypot(1.9, y2 - y);
          const hr = box(g, 0.07, 0.06, len, treadM, sx, (y + y2) / 2 + 1.08, (z + z2) / 2, { collide: false });
          hr.rotation.x = -Math.atan2(y2 - y, -1.9) + Math.PI;
        }
      }
      addCollider(sx - 0.05, sx + 0.05, -19.4, D.minZ - 0.1, "up");
    }

    // teak table + umbrella + chairs
    const tx = 6.2, tz = -6.6;
    const teak = std(0xb98a5a);
    cyl(g, 0.75, 0.75, 0.05, teak, tx, 0.74, tz, 20);
    cyl(g, 0.05, 0.08, 0.72, teak, tx, 0.38, tz, 8);
    umbrella(tx, tz, stripes[0], 0, 0.03).scale.setScalar(1.25);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.5;
      const ch = grp(tx + Math.cos(a) * 1.15, tz + Math.sin(a) * 1.15, Math.atan2(-Math.cos(a), -Math.sin(a)), 0.03);
      box(ch, 0.45, 0.04, 0.45, teak, 0, 0.44, 0, { collide: false });
      box(ch, 0.45, 0.45, 0.04, teak, 0, 0.68, -0.21, { collide: false });
      for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(ch, 0.04, 0.44, 0.04, teak, lx, 0.22, lz, { collide: false, castShadow: false });
    }
    addCollider(tx - 1.5, tx + 1.5, tz - 1.4, tz + 1.4, "up");
    // pitcher + cups on the table, friends sitting around it
    cyl(g, 0.07, 0.06, 0.2, std(0xf5d34a, { transparent: true, opacity: 0.8 }), tx + 0.1, 0.87, tz, 10);
    for (let i = 0; i < 3; i++) cyl(g, 0.04, 0.03, 0.1, std(0xd4432f), tx - 0.3 + i * 0.22, 0.82, tz + 0.35 - i * 0.2, 8);
    for (const a of [0.5, 0.5 + Math.PI, 0.5 + Math.PI / 2])
      person(tx + Math.cos(a) * 1.2, tz + Math.sin(a) * 1.2, { pose: "sit", rotY: Math.atan2(-Math.cos(a), -Math.sin(a)), y: 0.5 });
    // loungers facing the water
    for (const [lx, m] of [[-2.6, stripes[0]], [-1.2, stripes[2]]]) {
      const l = grp(lx, -7.2, Math.PI, 0.03);
      box(l, 0.65, 0.06, 1.3, m, 0, 0.32, 0.25, { collide: false });
      box(l, 0.65, 0.06, 0.8, m, 0, 0.55, -0.6, { collide: false }).rotation.x = -0.7;
      for (const [fx, fz] of [[-0.28, 0.8], [0.28, 0.8], [-0.28, -0.3], [0.28, -0.3]]) box(l, 0.05, 0.3, 0.05, teak, fx, 0.15, fz, { collide: false, castShadow: false });
      addCollider(lx - 0.4, lx + 0.4, -8.2, -6.3, "up");
    }
    person(-2.6, -7.2, { pose: "lie", rotY: 0, y: 0.26 }).userData.body.rotation.x = -1.25;
    // grill
    const gr = grp(11.6, -7.6, 0, 0.03);
    box(gr, 1.1, 0.5, 0.55, std(0x2a2c2e, { metalness: 0.5, roughness: 0.5 }), 0, 0.95, 0, { collide: false });
    const lidG = cyl(gr, 0.28, 0.28, 1.1, std(0x1c1d1f, { metalness: 0.6, roughness: 0.4 }), 0, 1.2, 0, 12);
    lidG.rotation.z = Math.PI / 2;
    for (const sx of [-0.45, 0.45]) box(gr, 0.06, 0.75, 0.5, std(0x2a2c2e), sx, 0.37, 0, { collide: false });
    box(gr, 0.45, 0.04, 0.5, teak, 0.8, 0.95, 0, { collide: false });
    addCollider(11.0, 12.5, -8.0, -7.2, "up");
    person(11.6, -6.85, { rotY: Math.PI }).userData.limbs[1].arm.rotation.x = -1.2;
    // smoke puffs
    const puffs = (PEOPLE ? [0, 1, 2] : []).map((i) => sph(g, 0.14, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }), 11.6, 1.6, -7.6, 6));
    anim.push((t) => puffs.forEach((p, i) => {
      const u = (t * 0.35 + i / 3) % 1;
      p.position.set(11.6 + u * 0.5, 1.5 + u * 1.6, -7.6);
      p.scale.setScalar(0.6 + u * 1.6);
      p.material.opacity = 0.32 * (1 - u);
    }));
    // string lights over the deck
    const bulbM = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
    for (const [x1, x2] of [[D.minX, 4.5], [4.5, D.maxX]]) {
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        sph(g, 0.045, bulbM, x1 + (x2 - x1) * u, 2.75 - Math.sin(u * Math.PI) * 0.35, D.minZ + 0.1, 6).castShadow = false;
      }
    }
    for (const px of [D.minX, 4.5, D.maxX]) box(g, 0.08, 2.8, 0.08, railM, px, 1.4, D.minZ - 0.05, { collide: false });
    // cornhole boards on the lawn beside the deck
    for (const [bx, bz, ry] of [[-7.5, -7.2, 0.2], [-13, -6.2, 0.2 + Math.PI]]) {
      const cb = grp(bx, bz, ry);
      const bd = box(cb, 0.6, 0.04, 1.2, std(C.navy), 0, 0.18, 0, { collide: false });
      bd.rotation.x = 0.16;
      cyl(cb, 0.08, 0.08, 0.05, std(0x111111), 0, 0.26, -0.33, 10).rotation.x = 0.16;
    }
    person(-8.2, -8.0, { rotY: -1.3 });
    person(-12.4, -5.4, { rotY: 1.9 });
    // outdoor shower (cedar) on the left side of the house
    const os = grp(H.minX - 0.95, -2.2, 0, 0);
    const cedar = std(0xa98a62, { map: T.panelingTexture([2, 1]) });
    box(os, 0.06, 2.0, 1.4, cedar, -0.7, 1.0, 0, { collide: false });
    box(os, 1.4, 2.0, 0.06, cedar, 0, 1.0, -0.7, { collide: false });
    box(os, 1.3, 0.04, 1.3, std(0xb0a898), 0, 0.03, 0, { collide: false, castShadow: false });
    box(os, 0.04, 0.6, 0.5, stripes[2], -0.74, 1.75, 0.3, { collide: false });
    addCollider(H.minX - 1.75, H.minX - 1.6, -3.0, -1.4, "up");
    addCollider(H.minX - 1.75, H.minX, -3.0, -2.85, "up");
  }

  // flagpole with a burgee in the front yard
  {
    const fx = 8.5, fz = 11.5;
    cyl(g, 0.04, 0.05, 6, whiteM, fx, 3, fz, 8);
    sph(g, 0.09, std(0xd4a94a, { metalness: 0.8, roughness: 0.3 }), fx, 6.05, fz, 8);
    const fgeo = new THREE.PlaneGeometry(1.6, 0.9, 8, 1);
    fgeo.translate(0.8, 0, 0);
    const flag = new THREE.Mesh(fgeo, stripes[0]);
    flag.position.set(fx, 5.4, fz);
    g.add(flag);
    const base = fgeo.attributes.position.array.slice();
    anim.push((t) => {
      const pa = fgeo.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(base[i * 3] * 3 - t * 5) * 0.12 * base[i * 3]);
      pa.needsUpdate = true;
    });
    addCollider(fx - 0.15, fx + 0.15, fz - 0.15, fz + 0.15, "up");
  }

  setRound(false);
  return g;
}
