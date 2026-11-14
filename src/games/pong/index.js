// Beer pong: a single-player skill game at the basement table.
// Controls: press and drag UP (flick) to throw. Drag length = power,
// left/right = aim. Arc height is chosen with the Low/Med/High toggle
// (or Q/E / arrow up-down). Only the first part of the arc is shown.
import * as THREE from "three";
import { H } from "../../world/layout.js";
import { Sounds } from "./sounds.js";

const G = 9.81;
const BALL_R = 0.02;
const CUP_R = 0.047;      // rim radius
const CUP_H = 0.12;
const CUP_PITCH = 0.098;  // center-to-center in a row
const ROW_STEP = 0.085;   // row-to-row (triangular packing)
const ARCS = [
  { name: "Low", deg: 34 },
  { name: "Med", deg: 47 },
  { name: "High", deg: 60 },
];
const V_MIN = 3.2, V_MAX = 6.9;
const BEST_KEY = "capehouse.pong.best";

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

export function start(world, done) {
  const { scene, camera, player, isMobile, pongTable, pongDecor, interactions } = world;
  const T = pongTable; // {x, z, y: table surface height}
  const sounds = new Sounds();
  const root = new THREE.Group();
  scene.add(root);
  pongDecor.visible = false;
  player.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock?.();
  document.body.classList.add("in-game");

  // ---------- Camera: slide to the throwing end ----------
  const camStart = camera.position.clone();
  const camStartQ = camera.quaternion.clone();
  const camPos = new THREE.Vector3(T.x, T.y + (isMobile ? 0.95 : 0.78), T.z + (isMobile ? 2.25 : 1.95));
  const lookAt = new THREE.Vector3(T.x, T.y + 0.02, T.z - 0.95);
  const camQ = new THREE.Quaternion();
  {
    const m = new THREE.Matrix4().lookAt(camPos, lookAt, new THREE.Vector3(0, 1, 0));
    camQ.setFromRotationMatrix(m);
  }
  let camT = 0;
  const fovStart = camera.fov;
  const fovGame = isMobile ? 62 : 46; // zoom in a little so the rack reads clearly

  // ---------- Cups ----------
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xd4432f, roughness: 0.45 });
  const cupGeo = new THREE.CylinderGeometry(CUP_R, CUP_R * 0.75, CUP_H, 18, 1, true);
  const cupInnerMat = new THREE.MeshStandardMaterial({ color: 0xb3321f, roughness: 0.6, side: THREE.BackSide });
  const liquidMat = new THREE.MeshStandardMaterial({ color: 0xe6b31e, roughness: 0.2, metalness: 0.1 });
  const liquidGeo = new THREE.CircleGeometry(CUP_R * 0.92, 18);
  const cups = []; // {mesh, x, z, alive}
  const rackBackZ = T.z - 1.22 + 0.11; // back row sits just inside the far edge

  // Formations are lists of [col, row] with col in cup units (can be .5), row 0 = back row
  function triangle(n) {
    const rows = { 10: [4, 3, 2, 1], 6: [3, 2, 1], 3: [2, 1], 1: [1] }[n];
    const out = [];
    rows.forEach((count, r) => {
      for (let i = 0; i < count; i++) out.push([i - (count - 1) / 2, r]);
    });
    return out;
  }
  const formations = {
    10: triangle(10),
    6: triangle(6),
    4: [[0, 0], [-0.5, 1], [0.5, 1], [0, 2]], // diamond
    3: triangle(3),
    2: [[0, 0], [0, 1]],
    1: [[0, 0]],
  };

  function placeCups(layout, keepAlive = null) {
    // remove old meshes
    for (const c of cups) root.remove(c.group);
    cups.length = 0;
    layout.forEach(([col, row]) => {
      const group = new THREE.Group();
      const x = T.x + col * CUP_PITCH;
      const z = rackBackZ + row * ROW_STEP;
      group.position.set(x, T.y + CUP_H / 2, z);
      const m = new THREE.Mesh(cupGeo, cupMat);
      m.castShadow = true;
      group.add(m);
      group.add(new THREE.Mesh(cupGeo, cupInnerMat));
      const liq = new THREE.Mesh(liquidGeo, liquidMat);
      liq.rotation.x = -Math.PI / 2;
      liq.position.y = CUP_H * 0.3;
      group.add(liq);
      const base = new THREE.Mesh(new THREE.CircleGeometry(CUP_R * 0.75, 18), cupMat);
      base.rotation.x = -Math.PI / 2;
      base.position.y = -CUP_H / 2 + 0.001;
      group.add(base);
      root.add(group);
      cups.push({ group, x, z, alive: true, scale: 1 });
    });
  }

  // ---------- Ball + guide ----------
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, roughness: 0.35 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 16, 16), ballMat);
  ball.castShadow = true;
  root.add(ball);
  const guideMat = new THREE.MeshBasicMaterial({ color: 0x9fd3c7, transparent: true, opacity: 0.85 });
  const guide = [];
  for (let i = 0; i < 14; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), guideMat);
    d.visible = false;
    root.add(d);
    guide.push(d);
  }
  const handPos = () => new THREE.Vector3(T.x, T.y + (isMobile ? 0.55 : 0.42), T.z + (isMobile ? 1.65 : 1.45));

  // ---------- State ----------
  const S = {
    shots: 0, makes: 0, bounceMakes: 0,
    arc: 1,
    rerackUsed: new Set(),
    phase: "aim", // aim | flying | done
    best: loadBest(),
    ballV: new THREE.Vector3(),
    ballP: handPos(),
    bounced: false,
    airTime: 0,
    rimHits: 0,
    streak: 0,
    bestStreak: 0,
  };
  ball.position.copy(S.ballP);

  // ---------- UI ----------
  const overlay = document.getElementById("overlay");
  overlay.hidden = false;
  const ui = document.createElement("div");
  ui.className = "pong-ui";
  ui.innerHTML = `
    <div class="pong-top">
      <div class="pong-stats">
        <div><span id="pg-shots">0</span><label>shots</label></div>
        <div><span id="pg-makes">0</span><label>makes</label></div>
        <div><span id="pg-cups">10</span><label>cups left</label></div>
        <div><span id="pg-acc">–</span><label>accuracy</label></div>
      </div>
      <div class="pong-right">
        <div class="pong-best" id="pg-best"></div>
        <button class="pbtn ghost" id="pg-leave">Leave table</button>
      </div>
    </div>
    <div class="pong-bottom">
      <div class="pong-arc" id="pg-arc" title="Arc height (Q/E or ↑/↓)">
        ${ARCS.map((a, i) => `<button data-arc="${i}" class="${i === 1 ? "on" : ""}">${a.name}</button>`).join("")}
      </div>
      <div class="pong-hint" id="pg-hint">${isMobile ? "Press and flick up to throw" : "Press, drag up, release to throw"}</div>
      <div class="pong-reracks" id="pg-reracks"></div>
    </div>
    <div class="pong-flash" id="pg-flash"></div>
    <div class="pong-power"><div id="pg-power"></div></div>
  `;
  overlay.appendChild(ui);
  const $ = (id) => ui.querySelector("#" + id);

  function renderStats() {
    $("pg-shots").textContent = S.shots;
    $("pg-makes").textContent = S.makes;
    $("pg-cups").textContent = cups.filter((c) => c.alive).length;
    $("pg-acc").textContent = S.shots ? Math.round((S.makes / S.shots) * 100) + "%" : "–";
    $("pg-best").textContent = S.best ? `Best: ${S.best.shots} shots · ${S.best.acc}%` : "No best yet — clear the rack";
    renderReracks();
  }
  function renderReracks() {
    const alive = cups.filter((c) => c.alive).length;
    const el = $("pg-reracks");
    el.innerHTML = "";
    if (S.phase === "done" || alive === 10 || alive === 0) return;
    if (formations[alive] && !S.rerackUsed.has(alive)) {
      const b = document.createElement("button");
      b.className = "pbtn";
      b.textContent = { 6: "Re-rack: triangle", 4: "Re-rack: diamond", 3: "Re-rack: triangle", 2: "Re-rack: line", 1: "Center the cup" }[alive];
      b.addEventListener("click", () => rerack(alive));
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
  function setArc(i) {
    S.arc = (i + ARCS.length) % ARCS.length;
    ui.querySelectorAll("#pg-arc button").forEach((b, k) => b.classList.toggle("on", k === S.arc));
  }
  ui.querySelectorAll("#pg-arc button").forEach((b) => b.addEventListener("click", () => setArc(+b.dataset.arc)));
  $("pg-leave").addEventListener("click", leave);

  function rerack(n) {
    if (S.phase !== "aim") return;
    S.rerackUsed.add(n);
    placeCups(formations[n]);
    sounds.rack();
    renderStats();
  }

  // ---------- Input: press, drag, release ----------
  let drag = null;
  const canvas = world.renderer.domElement;
  function onDown(e) {
    if (S.phase !== "aim") return;
    if (e.target.closest && e.target.closest("button, a, .pong-top, .pong-done, .card-modal")) return;
    if (e.button !== undefined && e.button !== 0) return;
    sounds.unlock();
    drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
    e.preventDefault();
  }
  function onMove(e) {
    if (!drag) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    updateGuide();
  }
  function onUp(e) {
    if (!drag) return;
    const v = dragToVelocity();
    drag = null;
    hideGuide();
    if (v) throwBall(v);
  }
  function dragToVelocity() {
    if (!drag) return null;
    const dy = drag.y0 - drag.y; // up is positive
    const dx = drag.x - drag.x0;
    const power = THREE.MathUtils.clamp(dy / (window.innerHeight * 0.5), 0, 1);
    $("pg-power").style.height = Math.round(power * 100) + "%";
    if (power < 0.06) return null;
    const speed = V_MIN + (V_MAX - V_MIN) * power;
    const yaw = THREE.MathUtils.clamp(dx / (window.innerWidth * 0.28), -1, 1) * 0.3; // radians
    const el = THREE.MathUtils.degToRad(ARCS[S.arc].deg);
    // forward is -Z
    const v = new THREE.Vector3(Math.sin(yaw) * Math.cos(el), Math.sin(el), -Math.cos(yaw) * Math.cos(el)).multiplyScalar(speed);
    return v;
  }
  function updateGuide() {
    const v = dragToVelocity();
    if (!v) return hideGuide();
    // show only the first ~38% of the way to the rack
    const p = handPos();
    const vel = v.clone();
    const dt = 1 / 60;
    let t = 0, k = 0;
    const totalZ = p.z - (rackBackZ + ROW_STEP * 1.5);
    while (k < guide.length && t < 2) {
      vel.y -= G * dt;
      vel.multiplyScalar(1 - 0.08 * dt);
      p.addScaledVector(vel, dt);
      t += dt;
      if (Math.round(t / dt) % 3 === 0) {
        const frac = (handPos().z - p.z) / totalZ;
        if (frac > 0.38) break;
        guide[k].position.copy(p);
        guide[k].visible = true;
        guide[k].material.opacity = 0.9 - k * 0.05;
        k++;
      }
    }
    for (; k < guide.length; k++) guide[k].visible = false;
  }
  function hideGuide() {
    for (const d of guide) d.visible = false;
    $("pg-power").style.height = "0%";
  }
  function onKey(e) {
    if (e.code === "KeyQ" || e.code === "ArrowDown") setArc(S.arc - 1);
    if (e.code === "KeyE" || e.code === "ArrowUp") setArc(S.arc + 1);
    if (e.code === "Escape") leave();
    if (e.code === "KeyR" && S.phase === "done") playAgain();
  }
  window.addEventListener("pointerdown", onDown, { passive: false });
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKey);

  // ---------- Throw + physics ----------
  function throwBall(v) {
    S.phase = "flying";
    S.shots++;
    S.ballP.copy(handPos());
    S.ballV.copy(v);
    S.bounced = false;
    S.bounces = 0;
    S.airTime = 0;
    S.rimHits = 0;
    sounds.toss();
    renderStats();
  }

  const tableMinX = T.x - 0.38, tableMaxX = T.x + 0.38, tableMinZ = T.z - 1.22, tableMaxZ = T.z + 1.22;
  const floorY = H.baseFloorY;

  function stepPhysics(dt) {
    const P = S.ballP, V = S.ballV;
    // integrate with substeps for stable rim contacts
    const n = 4;
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      V.y -= G * h;
      V.multiplyScalar(1 - 0.08 * h); // air drag (ping pong balls are light)
      P.addScaledVector(V, h);
      S.airTime += h;

      // table top
      if (P.y - BALL_R < T.y && P.x > tableMinX && P.x < tableMaxX && P.z > tableMinZ && P.z < tableMaxZ && V.y < 0) {
        // but not if we're inside a cup footprint (handled below)
        const inCup = cups.some((c) => c.alive && Math.hypot(P.x - c.x, P.z - c.z) < CUP_R);
        if (!inCup) {
          P.y = T.y + BALL_R;
          V.y = -V.y * 0.72;
          V.x *= 0.92;
          V.z *= 0.92;
          if (Math.abs(V.y) > 0.4) {
            S.bounces = (S.bounces || 0) + 1;
            S.bounced = S.bounces === 1; // only a clean single bounce counts as a bounce shot
            sounds.table(Math.min(1, Math.abs(V.y) / 3));
          }
        }
      }
      // basement floor
      if (P.y - BALL_R < floorY && V.y < 0) {
        P.y = floorY + BALL_R;
        V.y = -V.y * 0.5;
        V.x *= 0.8;
        V.z *= 0.8;
        if (Math.abs(V.y) > 0.3) sounds.table(0.3);
      }
      // back wall and side walls
      if (P.z - BALL_R < H.minZ + 0.1 && V.z < 0) { P.z = H.minZ + 0.1 + BALL_R; V.z = -V.z * 0.55; sounds.table(0.4); }
      if (P.x - BALL_R < H.minX + 0.1 && V.x < 0) { P.x = H.minX + 0.1 + BALL_R; V.x = -V.x * 0.55; }
      if (P.x + BALL_R > H.maxX - 0.1 && V.x > 0) { P.x = H.maxX - 0.1 - BALL_R; V.x = -V.x * 0.55; }

      // cups
      const rimY = T.y + CUP_H;
      for (const c of cups) {
        if (!c.alive) continue;
        const dx = P.x - c.x, dz = P.z - c.z;
        const dh = Math.hypot(dx, dz);
        // made: center below rim and inside radius
        if (dh < CUP_R - BALL_R * 0.3 && P.y < rimY - BALL_R * 0.6 && P.y > T.y) {
          made(c);
          return;
        }
        // rim contact: ball near the rim circle
        const nearRimRadially = Math.abs(dh - CUP_R) < BALL_R * 1.05;
        const nearRimY = Math.abs(P.y - rimY) < BALL_R * 1.05;
        if (nearRimRadially && nearRimY && dh > 1e-4) {
          // normal from closest rim point to ball center
          const rx = (dx / dh) * CUP_R, rz = (dz / dh) * CUP_R;
          const nx = P.x - (c.x + rx), ny = P.y - rimY, nz = P.z - (c.z + rz);
          const nl = Math.hypot(nx, ny, nz) || 1;
          const n_ = new THREE.Vector3(nx / nl, ny / nl, nz / nl);
          const vn = V.dot(n_);
          if (vn < 0) {
            V.addScaledVector(n_, -vn * (1 + 0.55));
            // tiny random spin so rim rattles don't look mechanical
            V.x += (Math.random() - 0.5) * 0.15;
            V.z += (Math.random() - 0.5) * 0.15;
            P.addScaledVector(n_, BALL_R * 1.06 - nl);
            S.rimHits++;
            sounds.rim(Math.min(1, -vn / 3));
          }
          continue;
        }
        // outside wall of the cup
        if (P.y < rimY && P.y > T.y && dh > CUP_R && dh < CUP_R + BALL_R && dh > 1e-4) {
          const nx = dx / dh, nz = dz / dh;
          const vn = V.x * nx + V.z * nz;
          if (vn < 0) {
            V.x -= nx * vn * 1.5;
            V.z -= nz * vn * 1.5;
            sounds.rim(0.25);
          }
          P.x = c.x + nx * (CUP_R + BALL_R);
          P.z = c.z + nz * (CUP_R + BALL_R);
        }
      }
    }
    ball.position.copy(P);
    // miss conditions: fell off the table and settled, or went too far / too long
    const offTable = P.y < T.y - 0.3;
    const settled = S.airTime > 1.2 && V.lengthSq() < 0.05;
    if ((offTable && (S.airTime > 2.2 || P.y < floorY + 0.1)) || settled || S.airTime > 6) miss();
  }

  function made(cup) {
    cup.alive = false;
    S.makes++;
    S.streak++;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
    sounds.plunk();
    let bonus = null;
    if (S.bounced) {
      // bounce shot: take one extra cup (the one closest to the thrower)
      const alive = cups.filter((c) => c.alive).sort((a, b) => b.z - a.z);
      if (alive.length) {
        bonus = alive[0];
        bonus.alive = false;
        S.bounceMakes++;
      }
    }
    flash(S.bounced ? "BOUNCE SHOT — 2 cups!" : S.rimHits ? "Rattled in!" : "Plunk!", S.bounced ? "big" : "");
    // ball drops into the cup
    S.phase = "sinking";
    S.sink = { cup, bonus, t: 0 };
  }
  function miss() {
    S.streak = 0;
    S.phase = "reset";
    S.resetT = 0;
    if (S.rimHits >= 2) flash("So close.");
  }

  function finishRack() {
    S.phase = "done";
    const acc = Math.round((S.makes / S.shots) * 100);
    const isBest = !S.best || S.shots < S.best.shots || (S.shots === S.best.shots && acc > S.best.acc);
    if (isBest) {
      S.best = { shots: S.shots, acc };
      saveBest(S.best);
    }
    sounds.cheer();
    renderStats();
    const card = document.createElement("div");
    card.className = "pong-done";
    card.innerHTML = `
      <div class="card">
        <div class="pong-done-kicker">${isBest ? "New personal best!" : "Rack cleared"}</div>
        <h2>${S.shots} shots · ${acc}% accuracy</h2>
        <p>${S.makes} makes${S.bounceMakes ? ` · ${S.bounceMakes} bounce shot${S.bounceMakes > 1 ? "s" : ""}` : ""} · best streak ${S.bestStreak}${S.best && !isBest ? `<br><span class="muted">Personal best: ${S.best.shots} shots · ${S.best.acc}%</span>` : ""}</p>
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
    placeCups(formations[10]);
    S.phase = "aim";
    S.ballP.copy(handPos());
    ball.position.copy(S.ballP);
    ball.visible = true;
    sounds.rack();
    renderStats();
  }

  // ---------- Per-frame ----------
  function update(dt) {
    // camera glide in
    if (camT < 1) {
      camT = Math.min(1, camT + dt * 1.6);
      const e = 1 - Math.pow(1 - camT, 3);
      camera.position.lerpVectors(camStart, camPos, e);
      camera.quaternion.slerpQuaternions(camStartQ, camQ, e);
      camera.fov = fovStart + (fovGame - fovStart) * e;
      camera.updateProjectionMatrix();
    }
    if (S.phase === "aim") {
      // gentle idle bob of the ball in hand
      const hp = handPos();
      ball.position.set(hp.x, hp.y + Math.sin(performance.now() / 400) * 0.004, hp.z);
    } else if (S.phase === "flying") {
      stepPhysics(dt);
    } else if (S.phase === "sinking") {
      const s = S.sink;
      s.t += dt;
      // ball drops to the liquid, cup shrinks away
      ball.position.set(s.cup.x, Math.max(T.y + CUP_H * 0.35, ball.position.y - dt * 0.8), s.cup.z);
      const k = Math.max(0, 1 - Math.max(0, s.t - 0.35) * 3);
      s.cup.group.scale.setScalar(k);
      if (s.bonus) s.bonus.group.scale.setScalar(Math.max(0, 1 - Math.max(0, s.t - 0.55) * 3));
      if (s.t > 0.75) {
        ball.visible = false;
        s.cup.group.visible = false;
        if (s.bonus) s.bonus.group.visible = false;
        if (cups.every((c) => !c.alive)) finishRack();
        else {
          S.phase = "aim";
          ball.visible = true;
        }
        renderStats();
      }
    } else if (S.phase === "reset") {
      S.resetT += dt;
      if (S.resetT > 0.35) {
        S.phase = "aim";
        ball.position.copy(handPos());
      }
    }
    // cups bob slightly when the ball rattles? no — keep it calm.
  }

  // ---------- Leave ----------
  let left = false;
  function leave() {
    if (left) return;
    left = true;
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKey);
    ui.remove();
    if (!overlay.children.length) overlay.hidden = true;
    scene.remove(root);
    pongDecor.visible = true;
    document.body.classList.remove("in-game");
    camera.fov = fovStart;
    camera.updateProjectionMatrix();
    // put the player back on their feet behind the table, facing it
    player.teleport(T.x, T.z + 2.3, 0, H.baseFloorY);
    player.enabled = true;
    world.removeUpdate(update);
    done();
  }

  placeCups(formations[10]);
  renderStats();
  world.addUpdate(update);
  // test hook: lets automated tests step the simulation without waiting on frames
  window.__pong = { S, cups, update, throwBall, handPos, rerack, leave, setArc, ARCS, V_MIN, V_MAX };
  sounds.rack();
}
