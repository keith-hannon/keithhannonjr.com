// The things you can actually use: the mini fridge (and its consequences), the
// outdoor shower, the driveway hoop, the kite on the beach — plus the personal
// touches (Boston, Harvard, New England sports, basketball).
import * as THREE from "three";
import { H, SUITE, terrainHeight as TH, addCollider } from "./world/layout.js";
import { box, mat, setRound, PALETTE as C } from "./world/house.js";
import * as T from "./world/textures.js";
import { games } from "./games/registry.js";
import { sfx } from "./sfx.js";

export function addFun(world, ix, onUpdate) {
  const { scene, player, camera } = world;
  const g = new THREE.Group();
  g.name = "fun";
  scene.add(g);
  setRound(true);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const cyl = (parent, rt, rb, h, m, x, y, z, seg = 14) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const sph = (parent, rad, m, x, y, z, seg = 16) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(rad, seg, seg), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const brass = std(0xd4a94a, { metalness: 0.8, roughness: 0.3 }), chrome = std(0xdfe3e6, { metalness: 0.9, roughness: 0.2 });

  // ---------- toast ----------
  const toastEl = document.getElementById("toast");
  let toastT = 0;
  function toast(text, seconds = 3.2) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastT = seconds;
  }
  world.toast = toast;

  // =====================================================================
  //  Mini fridge → beers → haze → lights out
  // =====================================================================
  const canvas = world.renderer.domElement;
  const fade = document.createElement("div");
  fade.id = "blackout";
  document.body.appendChild(fade);
  const D = { beers: 0, soberT: 0, out: false };
  const beerLines = [
    "", "Crack. First one of the day.", "Two. Still sharp.", "Three. The room has a nice glow to it.",
    "Four. Somebody turn the music up.", "Five. The floor is doing something.", "Six. Is there two of everything?",
    "Seven. Bold. Maybe sit down.",
  ];
  function applyHaze() {
    const n = D.beers;
    const level = n < 3 ? 0 : n < 5 ? 0.35 : n < 7 ? 0.7 : 1;
    player.haze = level;
    canvas.style.filter = level ? `blur(${(level * 2.2).toFixed(1)}px) saturate(${1 + level * 0.5}) brightness(${1 + level * 0.06})` : "";
    document.body.classList.toggle("hazy", level > 0);
  }
  function passOut() {
    if (D.out) return;
    D.out = true;
    player.enabled = false;
    if (document.pointerLockElement) document.exitPointerLock?.();
    sfx.thud();
    fade.classList.add("on");
    const onBeach = Math.random() < 0.5;
    setTimeout(() => {
      D.beers = 0;
      applyHaze();
      if (onBeach) player.teleport(-3, -27, 0, TH(-3, -27));
      else player.teleport(world.bed.x, world.bed.z, Math.PI, 0);
      player.pitch = onBeach ? 0.5 : -0.1;
      player.updateCamera(1);
    }, 1500);
    setTimeout(() => {
      fade.classList.remove("on");
      player.enabled = true;
      D.out = false;
      toast(onBeach ? "You wake up on the beach. Sand everywhere. No memory of the walk down." : "You wake up in the big bed. Somebody put you there. Somebody is a good friend.", 6);
    }, 3600);
  }
  function drink() {
    if (D.out) return;
    D.beers++;
    D.soberT = 0;
    sfx.can();
    if (D.beers >= 8) {
      toast("Eight. That's the one.", 2);
      setTimeout(passOut, 900);
    } else toast(beerLines[D.beers], 3.4);
    applyHaze();
  }
  world.sober = (n = 1) => {
    if (D.beers > 0) {
      D.beers = Math.max(0, D.beers - n);
      applyHaze();
    }
  };
  if (world.miniFridge) {
    const { group, door } = world.miniFridge;
    ix.add(group, {
      label: "Mini fridge",
      hint: "grab a beer",
      labelY: H.baseFloorY + 1.35,
      sound: () => sfx.creak(),
      animate: (o) => (door.rotation.y = o * o * (3 - 2 * o) * 1.9),
      action: drink,
      instant: true,
    });
  }

  // =====================================================================
  //  Outdoor shower (cedar stall on the left side of the house)
  // =====================================================================
  {
    const sx = H.minX - 0.36, sz = -2.25, headY = 2.12;
    const sh = new THREE.Group();
    sh.position.set(sx, 0, sz);
    g.add(sh);
    cyl(sh, 0.018, 0.018, 2.15, chrome, 0.08, 1.08, -0.35, 8);
    const arm = cyl(sh, 0.018, 0.018, 0.45, chrome, -0.14, headY + 0.04, -0.35, 8);
    arm.rotation.z = Math.PI / 2;
    cyl(sh, 0.12, 0.05, 0.07, chrome, -0.36, headY, -0.35, 16);
    const valve = new THREE.Group();
    valve.position.set(0.05, 1.15, -0.35);
    box(valve, 0.03, 0.2, 0.04, brass, -0.03, 0, 0, { collide: false });
    box(valve, 0.03, 0.04, 0.2, brass, -0.03, 0, 0, { collide: false });
    sh.add(valve);
    // soap + a shampoo bottle on a little shelf
    box(sh, 0.12, 0.02, 0.34, std(0xa98a62), 0.04, 0.95, 0.1, { collide: false });
    box(sh, 0.07, 0.035, 0.1, std(0xf7f1dc), 0.03, 0.98, 0.02, { collide: false });
    cyl(sh, 0.03, 0.03, 0.16, std(C.seafoam), 0.03, 1.04, 0.18, 10);

    const N = 90;
    const drops = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.11, 0.012), new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.75 }), N);
    drops.visible = false;
    drops.frustumCulled = false;
    g.add(drops);
    const seeds = Array.from({ length: N }, (_, i) => ({ a: Math.random() * 6.28, r: Math.random(), ph: Math.random() }));
    const mist = sph(g, 0.45, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), sx - 0.36, 0.25, sz - 0.35, 10);
    mist.castShadow = false;
    const m4 = new THREE.Matrix4();
    let on = false, rinseT = 0, told = false;
    ix.add(sh, {
      label: "Outdoor shower",
      labelY: 2.45,
      instant: true,
      animate: (o, t) => (valve.rotation.x = on ? 1.3 : 0),
      action: () => {
        on = !on;
        drops.visible = on;
        sfx.shower(on);
        sfx.tick();
        if (on && !told) {
          toast("Outdoor shower: on. Best shower in the house.", 3);
          told = true;
        }
      },
    });
    onUpdate((dt) => {
      if (!on) {
        mist.material.opacity = Math.max(0, mist.material.opacity - dt);
        return;
      }
      const t = performance.now() / 1000;
      for (let i = 0; i < N; i++) {
        const s = seeds[i], u = (t * 1.9 + s.ph) % 1, spread = 0.06 + u * 0.3;
        m4.makeTranslation(sx - 0.36 + Math.cos(s.a) * s.r * spread, headY - 0.05 - u * (headY - 0.05), sz - 0.35 + Math.sin(s.a) * s.r * spread);
        drops.setMatrixAt(i, m4);
      }
      drops.instanceMatrix.needsUpdate = true;
      mist.material.opacity = Math.min(0.28, mist.material.opacity + dt * 0.3);
      // stand under it and it rinses you off (and clears your head)
      if (Math.hypot(player.pos.x - (sx - 0.36), player.pos.z - (sz - 0.35)) < 0.75 && player.pos.y > -1) {
        rinseT += dt;
        if (rinseT > 2.5) {
          rinseT = 0;
          if (D.beers > 0) {
            world.sober(2);
            toast("Cold water. Head's a little clearer.", 2.6);
          } else toast("Sand: gone.", 2);
        }
      } else rinseT = 0;
    });
  }

  // =====================================================================
  //  Driveway hoop
  // =====================================================================
  {
    const hx = -12, hz = 4.7, gy = TH(hx, hz);
    const hoop = new THREE.Group();
    hoop.position.set(hx, gy, hz);
    g.add(hoop);
    box(hoop, 0.9, 0.3, 0.7, std(0x2a2c2e), 0, 0.15, -0.35, { collide: false });
    const pole = cyl(hoop, 0.06, 0.06, 3.3, std(0x2a2c2e, { metalness: 0.5, roughness: 0.5 }), 0, 1.65, -0.3, 10);
    box(hoop, 0.08, 0.08, 0.5, std(0x2a2c2e), 0, 3.15, -0.08, { collide: false });
    const board = T.artTexture("backboard", 128, 96, (ctx, w, h) => {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#a51c30"; ctx.lineWidth = 5; ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.strokeRect(w / 2 - 22, h - 46, 44, 34);
    });
    box(hoop, 1.3, 0.95, 0.05, new THREE.MeshStandardMaterial({ map: board, roughness: 0.5 }), 0, 3.4, 0.18, { collide: false });
    const rimY = 3.05, rimZ = 0.45;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.014, 8, 24), std(0xe07a3a, { metalness: 0.4 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, rimY, rimZ);
    hoop.add(rim);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.14, 0.42, 12, 3, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.8 }));
    net.position.set(0, rimY - 0.21, rimZ);
    hoop.add(net);
    addCollider(hx - 0.45, hx + 0.45, hz - 0.75, hz - 0.05, "up");
    // painted free-throw line on the shells
    box(g, 2.6, 0.01, 0.06, std(0xffffff), hx, gy + 0.02, hz + 4.6, { collide: false, castShadow: false });

    const ballTex = T.artTexture("bball", 128, 64, (ctx, w, h) => {
      ctx.fillStyle = "#d9792b"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#3b2416"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      for (const x of [w * 0.25, w * 0.75]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (const x of [0, w / 2, w]) { ctx.beginPath(); ctx.ellipse(x, h / 2, w * 0.1, h * 0.5, 0, 0, 7); ctx.stroke(); }
    });
    const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.8 });
    const rest = new THREE.Vector3(hx + 1.1, gy + 0.125, hz + 1.6);
    const ball = sph(g, 0.12, ballMat, rest.x, rest.y, rest.z, 20);
    world.ballMat = ballMat;
    const rimW = new THREE.Vector3(hx, gy + rimY, hz + rimZ);
    const shot = { on: false, u: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), make: false, after: 0, v: new THREE.Vector3() };
    let streak = 0, made = 0, taken = 0;
    const shoot = () => {
      if (shot.on) return;
      const dist = Math.hypot(player.pos.x - rimW.x, player.pos.z - rimW.z);
      const p = THREE.MathUtils.clamp(0.95 - dist * 0.075 - (player.haze || 0) * 0.35, 0.12, 0.88);
      shot.make = Math.random() < p;
      shot.on = true;
      shot.u = 0;
      shot.after = 0;
      shot.from.copy(camera.position).add(new THREE.Vector3(0, -0.25, 0));
      shot.to.copy(rimW);
      if (!shot.make) shot.to.add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.02, 0.24 * (Math.random() < 0.6 ? 1 : -0.6)));
      shot.dist = dist;
      taken++;
      sfx.toss();
    };
    for (const target of [hoop]) ix.add(target, { label: "Shoot hoops", labelY: gy + 4.2, action: shoot, instant: true, reach: 14 });
    onUpdate((dt) => {
      if (!shot.on) {
        ball.rotation.y += dt * 0.2;
        return;
      }
      if (shot.u < 1) {
        shot.u = Math.min(1, shot.u + dt / (0.75 + shot.dist * 0.05));
        ball.position.lerpVectors(shot.from, shot.to, shot.u);
        ball.position.y += Math.sin(shot.u * Math.PI) * (1.3 + shot.dist * 0.16);
        ball.rotation.x -= dt * 9;
        if (shot.u >= 1) {
          if (shot.make) {
            made++;
            streak++;
            sfx.swish();
            shot.v.set(0, -3, 0);
            toast(streak >= 3 ? `Swish. ${streak} straight. (${made}/${taken})` : `Swish. (${made}/${taken})`, 2.2);
          } else {
            streak = 0;
            sfx.clank();
            shot.v.set((Math.random() - 0.5) * 3, 2.2, 1.5 + Math.random() * 2);
            toast(`Off the iron. (${made}/${taken})`, 1.8);
          }
        }
        return;
      }
      shot.after += dt;
      shot.v.y -= 9.8 * dt;
      ball.position.addScaledVector(shot.v, dt);
      const floor = TH(ball.position.x, ball.position.z) + 0.12;
      if (ball.position.y < floor) {
        ball.position.y = floor;
        if (Math.abs(shot.v.y) > 1) sfx.bounce(Math.min(1, Math.abs(shot.v.y) / 6));
        shot.v.y = -shot.v.y * 0.55;
        shot.v.x *= 0.7;
        shot.v.z *= 0.7;
      }
      net.scale.y = shot.make && shot.after < 0.25 ? 1.25 : 1;
      if (shot.after > 2.2) {
        shot.on = false;
        ball.position.copy(rest);
      }
    });
  }

  // =====================================================================
  //  Kite on the beach
  // =====================================================================
  {
    const kx = 12.5, kz = -29.6, gy = TH(kx, kz);
    world.kiteSpot = { x: kx, z: kz };
    const k = new THREE.Group();
    k.position.set(kx, gy, kz);
    g.add(k);
    cyl(k, 0.03, 0.03, 0.9, std(0xc9a56b), 0, 0.4, 0, 8);
    const reel = cyl(k, 0.13, 0.13, 0.12, std(C.nantucketRed), 0, 0.88, 0, 16);
    reel.rotation.z = Math.PI / 2;
    const s = new THREE.Shape();
    s.moveTo(0, 0.7); s.lineTo(0.45, 0.12); s.lineTo(0, -0.7); s.lineTo(-0.45, 0.12); s.closePath();
    const kite = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: C.navy, side: THREE.DoubleSide, roughness: 0.8 }));
    kite.position.set(0.5, 0.75, 0.1);
    kite.rotation.set(-0.5, 0.4, 0.3);
    k.add(kite);
    for (let i = 0; i < 4; i++) box(k, 0.16, 0.01, 0.1, std(i % 2 ? 0xffffff : C.navy), 0.55 + i * 0.16, 0.05, 0.5 + i * 0.1, { collide: false, castShadow: false });
    ix.add(k, {
      label: "Fly a kite",
      labelY: gy + 1.9,
      animate: (o, t) => {
        kite.position.y = 0.75 + o * 0.5 + Math.sin(t * 3) * 0.06 * o;
        kite.rotation.z = 0.3 + Math.sin(t * 2.3) * 0.25 * o;
        reel.rotation.x = t * 3 * o;
      },
      sound: () => sfx.flutter(),
      action: () => games.start("kite", world),
    });
  }

  // =====================================================================
  //  Pong table: your rack of cups at the near end
  // =====================================================================
  if (world.pongDecor) {
    const cupGeo = new THREE.CylinderGeometry(0.047, 0.035, 0.12, 14);
    const m = std(C.navy, { roughness: 0.5 });
    [[0], [-0.5, 0.5], [-1, 0, 1], [-1.5, -0.5, 0.5, 1.5]].forEach((row, ri) => row.forEach((c) => {
      const cup = new THREE.Mesh(cupGeo, m);
      cup.position.set(c * 0.098, 0.83, 1.22 - 0.17 - ri * 0.085 + 0.06);
      cup.castShadow = true;
      world.pongDecor.add(cup);
    }));
  }

  // =====================================================================
  //  Personal touches
  // =====================================================================
  const frame = (w, h, x, y, z, rotY, key, draw, frameMat = std(0x5c3d26)) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    p.rotation.y = rotY;
    box(p, w + 0.08, h + 0.08, 0.04, frameMat, 0, 0, 0, { collide: false, castShadow: false });
    const tx = T.artTexture(key, 512, Math.round((512 * h) / w), draw);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 }));
    pl.position.z = 0.025;
    p.add(pl);
    g.add(p);
    return p;
  };
  // Den: a Boston skyline print over the desk, and a crimson Harvard banner
  frame(1.3, 0.62, H.maxX - 0.03, 1.85, -1.5, -Math.PI / 2, "bostonPrint", (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#f7e3c4"); gr.addColorStop(0.6, "#f3c7a0"); gr.addColorStop(1, "#e9a98a");
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2f4a6b";
    const b = [[20, 70], [48, 96], [80, 60], [104, 150], [140, 84], [170, 120], [204, 178], [236, 96], [262, 132], [296, 76], [330, 110], [362, 64], [396, 92], [430, 58], [462, 74]];
    b.forEach(([x, bh], i) => ctx.fillRect(x, h * 0.72 - bh, 24 + (i % 3) * 6, bh));
    ctx.fillRect(214, h * 0.72 - 200, 4, 30); // spire
    ctx.fillStyle = "#5f93a8"; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.strokeStyle = "#f7e3c4"; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(30 + i * 90, h * 0.8 + (i % 2) * 14); ctx.lineTo(80 + i * 90, h * 0.8 + (i % 2) * 14); ctx.stroke(); }
    // a couple of sculls on the river
    ctx.fillStyle = "#fff"; ctx.fillRect(110, h * 0.86, 70, 3); ctx.fillRect(330, h * 0.9, 70, 3);
    ctx.fillStyle = "#2f4a6b"; ctx.font = "700 26px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("B O S T O N", w / 2, h - 10);
  });
  frame(1.0, 0.42, H.maxX - 0.03, 1.7, 0.75, -Math.PI / 2, "harvardBanner", (ctx, w, h) => {
    ctx.fillStyle = "#a51c30"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 6; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 96px Georgia, serif"; ctx.fillText("HARVARD", w / 2, h * 0.46);
    ctx.font = "italic 34px Georgia, serif"; ctx.fillText("Class of 2027", w / 2, h * 0.8);
  }, std(0x3b2a20));
  // Basement: a row of Boston banners above the TV wall, in the colors of the four teams
  const banners = [["BASKETBALL", "#0b7a43", "#ffffff"], ["FOOTBALL", "#0d254c", "#c8102e"], ["HOCKEY", "#111111", "#fcb514"], ["BASEBALL", "#bd3039", "#0c2340"]];
  banners.forEach(([sport, bg, accent], i) => {
    const tx = T.artTexture("banner" + i, 192, 288, (ctx, w, h) => {
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h * 0.82); ctx.lineTo(w / 2, h); ctx.lineTo(0, h * 0.82); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(0, 22, w, 10); ctx.fillRect(0, h * 0.7, w, 6);
      ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
      ctx.font = "700 40px Georgia, serif"; ctx.fillText("BOSTON", w / 2, 100);
      ctx.font = "700 20px Arial"; ctx.fillText(sport, w / 2, 136);
      ctx.font = "italic 16px Georgia, serif"; ctx.fillText("New England", w / 2, 176);
    });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.93), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 1 }));
    b.position.set(0.4 + i * 0.95, H.baseFloorY + 1.85, H.maxZ - 0.12);
    b.rotation.y = Math.PI;
    g.add(b);
  });
  // crossed hockey sticks on the left basement wall, a puck shelf, a football on the couch
  for (const s of [-1, 1]) {
    const st = new THREE.Group();
    st.position.set(H.minX + 0.14, H.baseFloorY + 1.7, 2.4);
    st.rotation.x = s * 0.6;
    box(st, 0.03, 1.5, 0.05, std(0xd9c9a8), 0, 0, 0, { collide: false, castShadow: false });
    box(st, 0.03, 0.08, 0.32, std(0x111111), 0, -0.75, 0.14 * s, { collide: false, castShadow: false });
    g.add(st);
  }
  const fb = sph(g, 0.11, std(0x6b3a1f), 3.9, H.baseFloorY + 0.6, H.minZ + 0.75, 14);
  fb.scale.set(1.7, 1, 1);
  box(g, 0.14, 0.012, 0.03, std(0xffffff), 3.9, H.baseFloorY + 0.71, H.minZ + 0.75, { collide: false, castShadow: false });
  // basketballs: one in the basement corner, one in the bunk room
  sph(g, 0.12, world.ballMat, -6.3, H.baseFloorY + 0.12, 3.2, 18);
  sph(g, 0.12, world.ballMat, 9.3, 0.12, 3.05, 18);
  // a baseball glove + ball on the den bookshelf top, and a cap on the hooks by the door
  const glove = sph(g, 0.12, std(0x8a5a3a), 4.1, 2.0, H.minZ + 0.2, 12);
  glove.scale.set(1, 0.5, 1.1);
  sph(g, 0.037, std(0xffffff), 4.12, 2.07, H.minZ + 0.22, 10);
  const cap = sph(g, 0.1, std(0x0d254c), -1.15, 1.72, H.maxZ - 0.17, 14);
  cap.scale.set(1, 0.7, 1);
  box(g, 0.14, 0.012, 0.1, std(0x0d254c), -1.15, 1.67, H.maxZ - 0.26, { collide: false, castShadow: false });
  // kitchen: a Massachusetts license-plate-style sign over the stairs
  frame(0.6, 0.3, H.minX + 0.03, 1.9, -2.2, Math.PI / 2, "maSign", (ctx, w, h) => {
    ctx.fillStyle = "#fbfaf4"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#a51c30"; ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = "#0d254c"; ctx.textAlign = "center"; ctx.font = "700 110px Georgia, serif"; ctx.fillText("617", w / 2, h * 0.62);
    ctx.fillStyle = "#a51c30"; ctx.font = "700 32px Arial"; ctx.fillText("MASSACHUSETTS", w / 2, h * 0.86);
  }, std(0xf7f7f2));
  // basement TV: the game is on
  const court = T.artTexture("court", 256, 192, (ctx, w, h) => {
    ctx.fillStyle = "#d9a55a"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.beginPath(); ctx.moveTo(w / 2, 10); ctx.lineTo(w / 2, h - 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 26, 0, 7); ctx.stroke();
    ctx.fillStyle = "#0b7a43"; ctx.fillRect(10, h / 2 - 34, 44, 68); ctx.fillRect(w - 54, h / 2 - 34, 44, 68);
    ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(0, h - 34, w, 34);
    ctx.fillStyle = "#fff"; ctx.font = "700 16px Arial"; ctx.fillText("BOS 104   ·   NY 97   ·   4TH 2:41", 12, h - 12);
  });
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), new THREE.MeshBasicMaterial({ map: court }));
  tv.position.set(-3.5, H.baseFloorY + 0.8, H.maxZ - 0.5 - 0.305);
  tv.rotation.y = Math.PI;
  g.add(tv);

  onUpdate((dt) => {
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) toastEl.hidden = true;
    }
    // you sober up slowly on your own
    if (D.beers > 0 && !D.out) {
      D.soberT += dt;
      if (D.soberT > 40) {
        D.soberT = 0;
        world.sober(1);
      }
    }
  });
  setRound(false);
  window.__fun = { D, drink, passOut };
}
