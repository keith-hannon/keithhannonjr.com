// Beer pong vs. the house. Cups on both sides; you and the house trade shots.
//
// Throwing is a two-tap timing meter (no dragging):
//   1) a ring sweeps left-right across their rack  → tap to lock the aim
//   2) the ring sweeps near-far along the table    → tap to throw
// The ball lands where the ring was, so if the ring is over a cup, it's in.
import * as THREE from "three";
import { H } from "../../world/layout.js";
import { sfx } from "../../sfx.js";

const G = 9.81;
const BALL_R = 0.02;
const CUP_R = 0.047;
const CUP_H = 0.12;
const CUP_PITCH = 0.098;
const ROW_STEP = 0.085;
const BEST_KEY = "capehouse.pong.best";

// ---- Difficulty knobs (bigger numbers = easier) ----
const SWEEP_X_SECONDS = 2.1;   // time for the ring to cross the rack side-to-side
const SWEEP_Z_SECONDS = 1.9;   // time for the ring to travel near-to-far
const FORGIVENESS = 0.012;     // extra catch radius (meters) around each cup
const HOUSE_HIT_CHANCE = 0.26; // how often the house sinks its shot

function loadBest() {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY));
    if (v && typeof v.shots === "number") return v;
  } catch (e) {}
  return null;
}
function saveBest(b) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(b));
  } catch (e) {}
}

function triangle(n) {
  const rows = { 10: [4, 3, 2, 1], 6: [3, 2, 1], 3: [2, 1], 1: [1] }[n];
  const out = [];
  rows.forEach((count, r) => {
    for (let i = 0; i < count; i++) out.push([i - (count - 1) / 2, r]);
  });
  return out;
}
const FORMATIONS = { 10: triangle(10), 6: triangle(6), 4: [[0, 0], [-0.5, 1], [0.5, 1], [0, 2]], 3: triangle(3), 2: [[0, 0], [0, 1]], 1: [[0, 0]] };
const RERACK_LABEL = { 6: "Re-rack: triangle", 4: "Re-rack: diamond", 3: "Re-rack: triangle", 2: "Re-rack: line", 1: "Center the cup" };

export function start(world, done) {
  const { scene, camera, player, isMobile, pongTable: T, pongDecor } = world;
  const root = new THREE.Group();
  scene.add(root);
  pongDecor.visible = false;
  player.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock?.();
  document.body.classList.add("in-game");
  sfx.unlock();

  // ---------- Camera ----------
  const camStart = camera.position.clone(), camStartQ = camera.quaternion.clone(), fovStart = camera.fov;
  const camPos = new THREE.Vector3(T.x, T.y + (isMobile ? 1.1 : 0.95), T.z + (isMobile ? 2.3 : 1.95));
  const camQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camPos, new THREE.Vector3(T.x, T.y, T.z - 0.6), new THREE.Vector3(0, 1, 0)));
  const fovGame = isMobile ? 64 : 50;
  let camT = 0;

  // ---------- Cups ----------
  const cupGeo = new THREE.CylinderGeometry(CUP_R, CUP_R * 0.75, CUP_H, 20, 1, true);
  const liquidGeo = new THREE.CircleGeometry(CUP_R * 0.92, 20);
  const baseGeo = new THREE.CircleGeometry(CUP_R * 0.75, 20);
  const liquidMat = new THREE.MeshStandardMaterial({ color: 0xe6b31e, roughness: 0.2 });
  function makeRack(color, innerColor) {
    return { cups: [], mat: new THREE.MeshStandardMaterial({ color, roughness: 0.45 }), inner: new THREE.MeshStandardMaterial({ color: innerColor, roughness: 0.6, side: THREE.BackSide }) };
  }
  const theirs = makeRack(0xd4432f, 0xb3321f); // far end — the cups you shoot at
  const mine = makeRack(0x2f4a6b, 0x223a56);   // near end — the cups the house shoots at
  const farBackZ = T.z - 1.22 + 0.11, nearBackZ = T.z + 1.22 - 0.11;
  function place(rack, layout, backZ, dir) {
    for (const c of rack.cups) root.remove(c.group);
    rack.cups.length = 0;
    for (const [col, row] of layout) {
      const group = new THREE.Group();
      const x = T.x + col * CUP_PITCH, z = backZ + dir * row * ROW_STEP;
      group.position.set(x, T.y + CUP_H / 2, z);
      const shell = new THREE.Mesh(cupGeo, rack.mat);
      shell.castShadow = true;
      group.add(shell, new THREE.Mesh(cupGeo, rack.inner));
      const liq = new THREE.Mesh(liquidGeo, liquidMat);
      liq.rotation.x = -Math.PI / 2;
      liq.position.y = CUP_H * 0.3;
      const base = new THREE.Mesh(baseGeo, rack.mat);
      base.rotation.x = -Math.PI / 2;
      base.position.y = -CUP_H / 2 + 0.001;
      group.add(liq, base);
      root.add(group);
      rack.cups.push({ group, x, z, alive: true });
    }
  }
  const alive = (rack) => rack.cups.filter((c) => c.alive);

  // ---------- Balls, aiming ring ----------
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, roughness: 0.35 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 18, 18), ballMat);
  ball.castShadow = true;
  const houseBall = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 18, 18), new THREE.MeshStandardMaterial({ color: 0xffb37a, roughness: 0.35 }));
  houseBall.visible = false;
  root.add(ball, houseBall);
  const ring = new THREE.Mesh(new THREE.RingGeometry(CUP_R * 0.78, CUP_R * 1.02, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 50;
  const laneX = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.012), new THREE.MeshBasicMaterial({ color: 0x9fd3c7, transparent: true, opacity: 0.8, depthTest: false }));
  const laneZ = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.75), laneX.material);
  for (const l of [laneX, laneZ]) {
    l.rotation.x = -Math.PI / 2;
    l.renderOrder = 49;
  }
  root.add(ring, laneX, laneZ);
  const ringY = T.y + CUP_H + 0.004;
  const handPos = () => new THREE.Vector3(T.x, T.y + (isMobile ? 0.6 : 0.46), T.z + (isMobile ? 1.75 : 1.5));

  // ---------- State ----------
  const S = {
    phase: "aimX", // aimX | aimZ | flying | sinking | house | done
    shots: 0, makes: 0, bounceMakes: 0, streak: 0, bestStreak: 0,
    rerackUsed: new Set(), best: loadBest(),
    t: 0, aimX: T.x, aimZ: T.z - 0.9,
    P: handPos(), V: new THREE.Vector3(), bounces: 0, air: 0, rim: 0,
    house: null, sink: null, wait: 0,
  };
  const zNear = () => Math.max(...alive(theirs).map((c) => c.z)) + 0.2;
  const zFar = () => Math.min(...alive(theirs).map((c) => c.z)) - 0.14;
  const xSpan = () => Math.max(0.12, Math.max(...alive(theirs).map((c) => Math.abs(c.x - T.x))) + 0.1);
  const tri = (u) => 1 - Math.abs(((u % 2) + 2) % 2 - 1); // 0→1→0 at constant speed

  // ---------- UI ----------
  const overlay = document.getElementById("overlay");
  overlay.hidden = false;
  const ui = document.createElement("div");
  ui.className = "pong-ui";
  ui.innerHTML = `
    <div class="pong-top">
      <div class="pong-stats">
        <div><span id="pg-shots">0</span><label>shots</label></div>
        <div><span id="pg-acc">–</span><label>accuracy</label></div>
        <div><span id="pg-cups">10</span><label>their cups</label></div>
        <div><span id="pg-mine">10</span><label>your cups</label></div>
      </div>
      <div class="pong-right">
        <div class="pong-best" id="pg-best"></div>
        <button class="pbtn ghost" id="pg-leave">Leave table</button>
      </div>
    </div>
    <div class="pong-bottom">
      <div class="pong-steps"><span id="pg-s1" class="on">1 · Aim</span><span id="pg-s2">2 · Distance</span></div>
      <div class="pong-hint" id="pg-hint"></div>
      <div class="pong-reracks" id="pg-reracks"></div>
    </div>
    <div class="pong-flash" id="pg-flash"></div>`;
  overlay.appendChild(ui);
  const $ = (id) => ui.querySelector("#" + id);
  const tapWord = isMobile ? "Tap" : "Click or press Space";

  function render() {
    $("pg-shots").textContent = S.shots;
    $("pg-acc").textContent = S.shots ? Math.round((S.makes / S.shots) * 100) + "%" : "–";
    $("pg-cups").textContent = alive(theirs).length;
    $("pg-mine").textContent = alive(mine).length;
    $("pg-best").textContent = S.best ? `Best win: ${S.best.shots} shots · ${S.best.acc}%` : "No win yet";
    $("pg-s1").classList.toggle("on", S.phase === "aimX");
    $("pg-s2").classList.toggle("on", S.phase === "aimZ");
    $("pg-hint").textContent =
      S.phase === "aimX" ? `${tapWord} when the ring lines up left-to-right` :
      S.phase === "aimZ" ? `${tapWord} again when the ring is over a cup` :
      S.phase === "house" ? "House shoots…" : "";
    const n = alive(theirs).length, el = $("pg-reracks");
    el.innerHTML = "";
    if (S.phase === "aimX" && n < 10 && n > 0 && FORMATIONS[n] && !S.rerackUsed.has(n)) {
      const b = document.createElement("button");
      b.className = "pbtn";
      b.textContent = RERACK_LABEL[n];
      b.addEventListener("click", () => rerack(n));
      el.appendChild(b);
    }
  }
  function flash(text, cls = "") {
    const f = $("pg-flash");
    f.textContent = text;
    f.className = "pong-flash show " + cls;
    clearTimeout(flash._t);
    flash._t = setTimeout(() => (f.className = "pong-flash"), 1100);
  }
  function rerack(n) {
    if (S.phase !== "aimX") return;
    S.rerackUsed.add(n);
    place(theirs, FORMATIONS[n], farBackZ, 1);
    sfx.rack();
    render();
  }
  $("pg-leave").addEventListener("click", leave);

  // ---------- Input: one button ----------
  function press() {
    sfx.unlock();
    if (S.phase === "aimX") {
      S.phase = "aimZ";
      S.t = 0;
      sfx.tick();
      render();
    } else if (S.phase === "aimZ") {
      throwAt(S.aimX, S.aimZ);
    }
  }
  function onDown(e) {
    if (e.target.closest && e.target.closest("button, a, .pong-top, .pong-done")) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    press();
  }
  function onKey(e) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (S.phase === "done") playAgain();
      else press();
    }
    if (e.code === "Escape") leave();
  }
  window.addEventListener("pointerdown", onDown, { passive: false });
  window.addEventListener("keydown", onKey);

  // ---------- Your throw ----------
  // Launch so the ball arrives at (x, z) at rim height after a fixed flight time.
  function throwAt(x, z) {
    const h = handPos(), Tf = 0.78, ty = T.y + CUP_H + BALL_R * 0.5;
    S.P.copy(h);
    S.V.set((x - h.x) / Tf, (ty - h.y + 0.5 * G * Tf * Tf) / Tf, (z - h.z) / Tf);
    S.phase = "flying";
    S.shots++;
    S.bounces = 0;
    S.air = 0;
    S.rim = 0;
    sfx.toss();
    render();
  }

  const tMinX = T.x - 0.38, tMaxX = T.x + 0.38, tMinZ = T.z - 1.22, tMaxZ = T.z + 1.22, floorY = H.baseFloorY;
  function stepBall(dt) {
    const P = S.P, V = S.V, n = 4, h = dt / n, rimY = T.y + CUP_H;
    for (let i = 0; i < n; i++) {
      P.x += V.x * h;
      P.z += V.z * h;
      P.y += V.y * h - 0.5 * G * h * h;
      V.y -= G * h;
      S.air += h;
      const cupsAll = theirs.cups.concat(mine.cups);
      if (P.y - BALL_R < T.y && P.x > tMinX && P.x < tMaxX && P.z > tMinZ && P.z < tMaxZ && V.y < 0) {
        if (!cupsAll.some((c) => c.alive && Math.hypot(P.x - c.x, P.z - c.z) < CUP_R)) {
          P.y = T.y + BALL_R;
          V.y = -V.y * 0.7;
          V.x *= 0.9;
          V.z *= 0.9;
          if (Math.abs(V.y) > 0.4) {
            S.bounces++;
            sfx.table(Math.min(1, Math.abs(V.y) / 3));
          }
        }
      }
      if (P.y - BALL_R < floorY && V.y < 0) {
        P.y = floorY + BALL_R;
        V.y = -V.y * 0.5;
        V.x *= 0.8;
        V.z *= 0.8;
      }
      if (P.z - BALL_R < H.minZ + 0.1 && V.z < 0) {
        P.z = H.minZ + 0.1 + BALL_R;
        V.z = -V.z * 0.5;
      }
      for (const c of theirs.cups) {
        if (!c.alive) continue;
        const dx = P.x - c.x, dz = P.z - c.z, dh = Math.hypot(dx, dz);
        if (dh < CUP_R - BALL_R * 0.3 + FORGIVENESS && P.y < rimY - BALL_R * 0.4 && P.y > T.y && V.y < 0) return made(c);
        if (Math.abs(dh - CUP_R) < BALL_R * 1.05 && Math.abs(P.y - rimY) < BALL_R * 1.05 && dh > 1e-4 && dh > CUP_R + FORGIVENESS - BALL_R) {
          const rx = (dx / dh) * CUP_R, rz = (dz / dh) * CUP_R;
          const nv = new THREE.Vector3(P.x - (c.x + rx), P.y - rimY, P.z - (c.z + rz));
          const nl = nv.length() || 1;
          nv.multiplyScalar(1 / nl);
          const vn = V.dot(nv);
          if (vn < 0) {
            V.addScaledVector(nv, -vn * 1.5);
            V.x += (Math.random() - 0.5) * 0.12;
            V.z += (Math.random() - 0.5) * 0.12;
            P.addScaledVector(nv, BALL_R * 1.06 - nl);
            S.rim++;
            sfx.rim(Math.min(1, -vn / 3));
          }
        } else if (P.y < rimY && P.y > T.y && dh > CUP_R && dh < CUP_R + BALL_R) {
          const nx = dx / dh, nz = dz / dh, vn = V.x * nx + V.z * nz;
          if (vn < 0) {
            V.x -= nx * vn * 1.5;
            V.z -= nz * vn * 1.5;
            sfx.rim(0.25);
          }
          P.x = c.x + nx * (CUP_R + BALL_R);
          P.z = c.z + nz * (CUP_R + BALL_R);
        }
      }
    }
    ball.position.copy(P);
    const off = P.y < T.y - 0.3;
    if ((off && (S.air > 1.6 || P.y < floorY + 0.1)) || (S.air > 1.2 && V.lengthSq() < 0.05) || S.air > 4) missed();
  }
  function made(cup) {
    cup.alive = false;
    S.makes++;
    S.streak++;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
    sfx.plunk();
    let bonus = null;
    if (S.bounces === 1) {
      bonus = alive(theirs).sort((a, b) => b.z - a.z)[0] || null;
      if (bonus) {
        bonus.alive = false;
        S.bounceMakes++;
      }
    }
    flash(bonus ? "BOUNCE SHOT — 2 cups!" : S.rim ? "Rattled in!" : S.streak >= 3 ? `${S.streak} in a row!` : "Plunk!", bonus ? "big" : "");
    S.phase = "sinking";
    S.sink = { cup, bonus, t: 0 };
    render();
  }
  function missed() {
    S.streak = 0;
    if (S.rim >= 1) flash("Off the rim.");
    beginHouse();
  }

  // ---------- The house's turn ----------
  function beginHouse() {
    if (!alive(theirs).length) return finish(true);
    S.phase = "house";
    S.wait = 0.45;
    const targets = alive(mine);
    const hit = Math.random() < HOUSE_HIT_CHANCE;
    const cup = targets[Math.floor(Math.random() * targets.length)];
    const from = new THREE.Vector3(T.x + (Math.random() - 0.5) * 0.2, T.y + 0.5, T.z - 1.75);
    const to = hit ? new THREE.Vector3(cup.x, T.y + CUP_H * 0.5, cup.z) : new THREE.Vector3(T.x + (Math.random() < 0.5 ? -1 : 1) * (0.26 + Math.random() * 0.1), T.y + BALL_R, T.z + 0.2 + Math.random() * 0.7);
    S.house = { hit, cup, from, to, u: 0, done: false, after: 0 };
    ball.visible = false;
    render();
  }
  function stepHouse(dt) {
    const hs = S.house;
    if (S.wait > 0) {
      S.wait -= dt;
      if (S.wait <= 0) {
        houseBall.visible = true;
        sfx.toss();
      }
      return;
    }
    if (!hs.done) {
      hs.u = Math.min(1, hs.u + dt / 0.8);
      houseBall.position.lerpVectors(hs.from, hs.to, hs.u);
      houseBall.position.y += Math.sin(hs.u * Math.PI) * 0.75;
      if (hs.u >= 1) {
        hs.done = true;
        if (hs.hit) {
          hs.cup.alive = false;
          sfx.plunk();
          flash("House hits — drink up.");
        } else sfx.table(0.7);
        render();
      }
      return;
    }
    hs.after += dt;
    if (hs.hit) hs.cup.group.scale.setScalar(Math.max(0, 1 - hs.after * 3));
    else {
      // the miss skips off the table toward you
      houseBall.position.z += dt * 1.6;
      houseBall.position.y = T.y + BALL_R + Math.abs(Math.sin(hs.after * 9)) * 0.12 * Math.max(0, 1 - hs.after);
    }
    if (hs.after > 0.7) {
      houseBall.visible = false;
      if (hs.hit) hs.cup.group.visible = false;
      if (!alive(mine).length) return finish(false);
      S.phase = "aimX";
      S.t = 0;
      ball.visible = true;
      render();
    }
  }

  function finish(won) {
    S.phase = "done";
    ball.visible = false;
    const acc = S.shots ? Math.round((S.makes / S.shots) * 100) : 0;
    let isBest = false;
    if (won) {
      isBest = !S.best || S.shots < S.best.shots || (S.shots === S.best.shots && acc > S.best.acc);
      if (isBest) {
        S.best = { shots: S.shots, acc };
        saveBest(S.best);
      }
      sfx.cheer();
    }
    render();
    const card = document.createElement("div");
    card.className = "pong-done";
    card.innerHTML = `
      <div class="card">
        <div class="pong-done-kicker">${won ? (isBest ? "New personal best!" : "You win") : "House wins"}</div>
        <h2>${won ? `${S.shots} shots · ${acc}% accuracy` : `${alive(theirs).length} cup${alive(theirs).length === 1 ? "" : "s"} short`}</h2>
        <p>${S.makes} makes${S.bounceMakes ? ` · ${S.bounceMakes} bounce shot${S.bounceMakes > 1 ? "s" : ""}` : ""} · best streak ${S.bestStreak} · you had ${alive(mine).length} cup${alive(mine).length === 1 ? "" : "s"} left${S.best && !isBest ? `<br><span class="muted">Best win: ${S.best.shots} shots · ${S.best.acc}%</span>` : ""}</p>
        <div class="card-actions">
          <button class="btn primary" id="pg-again">Play again</button>
          <button class="btn secondary" id="pg-leave2">Back to the basement</button>
        </div>
      </div>`;
    ui.appendChild(card);
    card.querySelector("#pg-again").addEventListener("click", playAgain);
    card.querySelector("#pg-leave2").addEventListener("click", leave);
  }
  function playAgain() {
    ui.querySelector(".pong-done")?.remove();
    S.shots = S.makes = S.bounceMakes = S.streak = S.bestStreak = 0;
    S.rerackUsed.clear();
    place(theirs, FORMATIONS[10], farBackZ, 1);
    place(mine, FORMATIONS[10], nearBackZ, -1);
    S.phase = "aimX";
    S.t = 0;
    ball.visible = true;
    houseBall.visible = false;
    sfx.rack();
    render();
  }

  // ---------- Per-frame ----------
  function update(dt) {
    if (camT < 1) {
      camT = Math.min(1, camT + dt * 1.6);
      const e = 1 - Math.pow(1 - camT, 3);
      camera.position.lerpVectors(camStart, camPos, e);
      camera.quaternion.slerpQuaternions(camStartQ, camQ, e);
      camera.fov = fovStart + (fovGame - fovStart) * e;
      camera.updateProjectionMatrix();
    }
    const aiming = S.phase === "aimX" || S.phase === "aimZ";
    ring.visible = aiming;
    laneX.visible = S.phase === "aimX";
    laneZ.visible = S.phase === "aimZ";
    if (aiming) {
      S.t += dt;
      const zc = (zNear() + zFar()) / 2;
      if (S.phase === "aimX") {
        const span = xSpan();
        S.aimX = T.x - span + tri(S.t / SWEEP_X_SECONDS + 0.5) * span * 2;
        S.aimZ = zc;
        laneX.position.set(T.x, ringY, zc);
        laneX.scale.x = (span * 2) / 0.62;
      } else {
        S.aimZ = zNear() + tri(S.t / SWEEP_Z_SECONDS) * (zFar() - zNear());
        laneZ.position.set(S.aimX, ringY, zc);
        laneZ.scale.y = Math.abs(zFar() - zNear()) / 0.75;
      }
      ring.position.set(S.aimX, ringY, S.aimZ);
      const over = alive(theirs).some((c) => Math.hypot(c.x - S.aimX, c.z - S.aimZ) < CUP_R * 0.75);
      ring.material.color.set(S.phase === "aimZ" && over ? 0x7dffb0 : 0xffffff);
      const hp = handPos();
      ball.position.set(hp.x, hp.y + Math.sin(performance.now() / 400) * 0.004, hp.z);
    } else if (S.phase === "flying") stepBall(dt);
    else if (S.phase === "sinking") {
      const s = S.sink;
      s.t += dt;
      ball.position.set(s.cup.x, Math.max(T.y + CUP_H * 0.35, ball.position.y - dt * 0.8), s.cup.z);
      s.cup.group.scale.setScalar(Math.max(0, 1 - Math.max(0, s.t - 0.3) * 3));
      if (s.bonus) s.bonus.group.scale.setScalar(Math.max(0, 1 - Math.max(0, s.t - 0.45) * 3));
      if (s.t > 0.7) {
        s.cup.group.visible = false;
        if (s.bonus) s.bonus.group.visible = false;
        beginHouse();
      }
    } else if (S.phase === "house") stepHouse(dt);
  }

  // ---------- Leave ----------
  let left = false;
  function leave() {
    if (left) return;
    left = true;
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("keydown", onKey);
    ui.remove();
    if (!overlay.children.length) overlay.hidden = true;
    scene.remove(root);
    pongDecor.visible = true;
    document.body.classList.remove("in-game");
    camera.fov = fovStart;
    camera.updateProjectionMatrix();
    player.teleport(T.x, T.z + 2.3, 0, H.baseFloorY);
    player.enabled = true;
    world.removeUpdate(update);
    done();
  }

  place(theirs, FORMATIONS[10], farBackZ, 1);
  place(mine, FORMATIONS[10], nearBackZ, -1);
  render();
  world.addUpdate(update);
  sfx.rack();
  // test hook: lets automated tests step the game without waiting on frames
  window.__pong = { S, theirs, mine, update, throwAt, press, rerack, leave, alive };
}
