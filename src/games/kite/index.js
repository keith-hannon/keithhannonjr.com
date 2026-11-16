// Kite fighting on the beach. Steer your kite with the mouse (or a finger).
// When your line crosses another kite's line, whichever kite is moving faster
// cuts the other. Sweep fast across their lines; don't sit still when one dives.
import * as THREE from "three";
import { terrainHeight as TH } from "../../world/layout.js";
import { sfx } from "../../sfx.js";

const ROUND_SECONDS = 75;
const LIVES = 3;
const BEST_KEY = "capehouse.kite.best";
const PLANE_Z = -52;          // the kites fly in a vertical plane out over the water
const COLORS = [0xb5534a, 0xf4d98b, 0x9fd3c7, 0xf4a6c0, 0x6aa0c8, 0xffffff];

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}
function saveBest(n) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch (e) {}
}
// do segments p1-p2 and p3-p4 cross? (2D, x/y)
function crosses(a, b, c, d) {
  const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

export function start(world, done) {
  const { scene, camera, player, isMobile, kiteSpot: spot } = world;
  const root = new THREE.Group();
  scene.add(root);
  player.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock?.();
  document.body.classList.add("in-game");
  sfx.unlock();

  const gy = TH(spot.x, spot.z);
  const cx = spot.x, lo = gy + 7, hi = gy + 24, halfW = 19;
  const camStart = camera.position.clone(), camStartQ = camera.quaternion.clone(), fovStart = camera.fov;
  const camPos = new THREE.Vector3(cx, gy + 1.6, spot.z + 1.5);
  const camQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camPos, new THREE.Vector3(cx, gy + 13.5, PLANE_Z), new THREE.Vector3(0, 1, 0)));
  const fovGame = isMobile ? 80 : 62;
  let camT = 0;

  function makeKite(color, size = 1) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(0, 0.9 * size); s.lineTo(0.6 * size, 0.15 * size); s.lineTo(0, -0.9 * size); s.lineTo(-0.6 * size, 0.15 * size); s.closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false }));
    g.add(sail);
    const spar = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 1.8 * size), new THREE.MeshBasicMaterial({ color: 0x3b2a20, side: THREE.DoubleSide, fog: false }));
    spar.position.z = 0.01;
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * size, 0.04), spar.material);
    cross.position.set(0, 0.15 * size, 0.01);
    g.add(spar, cross);
    // ribbon tail
    const tail = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffffff : color, side: THREE.DoubleSide, fog: false }));
      g.add(b);
      tail.push(b);
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false }));
    line.frustumCulled = false;
    root.add(g, line);
    return { g, sail, tail, line, lineGeo, size };
  }
  function drawKite(k, t) {
    k.g.position.set(k.pos.x, k.pos.y, PLANE_Z);
    k.g.rotation.z = THREE.MathUtils.clamp(-k.vel.x * 0.05, -0.8, 0.8);
    k.tail.forEach((b, i) => {
      b.position.set(Math.sin(t * 5 + i * 0.9) * 0.18 * (i + 1) * 0.35 - k.vel.x * 0.03 * i, -0.9 * k.size - 0.22 - i * 0.26, 0);
      b.rotation.z = Math.sin(t * 6 + i) * 0.5;
    });
    const pa = k.lineGeo.attributes.position;
    pa.setXYZ(0, k.anchor.x, k.anchor.y, k.anchor.z);
    pa.setXYZ(1, k.pos.x, k.pos.y - 0.2, PLANE_Z);
    pa.needsUpdate = true;
  }

  // ---------- You ----------
  const me = makeKite(0x2f4a6b, 1.25);
  me.sail.material.color.set(0x2f4a6b);
  Object.assign(me, { pos: new THREE.Vector2(cx, gy + 13), vel: new THREE.Vector2(), target: new THREE.Vector2(cx, gy + 13), anchor: new THREE.Vector3(cx + 0.25, gy + 1.25, spot.z + 0.9), safe: 3 });
  me.line.material.color.set(0xfff2a8);

  // ---------- Rivals ----------
  const rivals = [];
  function spawnRival(i) {
    const k = rivals[i] || makeKite(COLORS[i % COLORS.length]);
    const ax = cx + (i - 1.5) * 9 + (Math.random() - 0.5) * 4;
    Object.assign(k, {
      anchor: new THREE.Vector3(ax, TH(ax, spot.z - 2) + 0.4, spot.z - 2 - (i % 2) * 2),
      home: new THREE.Vector2(ax + (Math.random() - 0.5) * 6, lo + 4 + Math.random() * (hi - lo - 6)),
      pos: new THREE.Vector2(ax, lo + 2), vel: new THREE.Vector2(),
      ph: Math.random() * 10, fx: 0.35 + Math.random() * 0.3, fy: 0.5 + Math.random() * 0.35, rx: 4 + Math.random() * 4, ry: 2 + Math.random() * 2.5,
      dive: 0, nextDive: 4 + Math.random() * 7, cut: 0, was: false, alive: true,
    });
    k.sail.material.color.set(COLORS[Math.floor(Math.random() * COLORS.length)]);
    k.g.visible = k.line.visible = true;
    rivals[i] = k;
  }
  for (let i = 0; i < 4; i++) spawnRival(i);

  // ---------- State + UI ----------
  const S = { time: ROUND_SECONDS, score: 0, lives: LIVES, best: loadBest(), over: false, t: 0 };
  const overlay = document.getElementById("overlay");
  overlay.hidden = false;
  const ui = document.createElement("div");
  ui.className = "pong-ui";
  ui.innerHTML = `
    <div class="pong-top">
      <div class="pong-stats">
        <div><span id="kt-score">0</span><label>kites cut</label></div>
        <div><span id="kt-time">${ROUND_SECONDS}</span><label>seconds</label></div>
        <div><span id="kt-lives">${LIVES}</span><label>lines left</label></div>
      </div>
      <div class="pong-right">
        <div class="pong-best" id="kt-best"></div>
        <button class="pbtn ghost" id="kt-leave">Reel it in</button>
      </div>
    </div>
    <div class="pong-bottom"><div class="pong-hint" id="kt-hint">${isMobile ? "Drag to steer." : "Move the mouse to steer."} Sweep across another kite's line at speed to cut it. A kite that flashes is about to dive at you: keep moving.</div></div>
    <div class="pong-flash" id="kt-flash"></div>`;
  overlay.appendChild(ui);
  const $ = (id) => ui.querySelector("#" + id);
  function render() {
    $("kt-score").textContent = S.score;
    $("kt-time").textContent = Math.max(0, Math.ceil(S.time));
    $("kt-lives").textContent = S.lives;
    $("kt-best").textContent = S.best ? `Best: ${S.best} cut` : "No best yet";
  }
  function flash(text, cls = "") {
    const f = $("kt-flash");
    f.textContent = text;
    f.className = "pong-flash show " + cls;
    clearTimeout(flash._t);
    flash._t = setTimeout(() => (f.className = "pong-flash"), 900);
  }
  $("kt-leave").addEventListener("click", leave);

  // ---------- Input ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLANE_Z), hitP = new THREE.Vector3();
  function steer(e) {
    if (e.target.closest && e.target.closest("button, .pong-top, .pong-done")) return;
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hitP)) me.target.set(THREE.MathUtils.clamp(hitP.x, cx - halfW, cx + halfW), THREE.MathUtils.clamp(hitP.y, lo, hi));
  }
  const keys = new Set();
  const onKeyDown = (e) => {
    keys.add(e.code);
    if (e.code === "Escape") leave();
    if (S.over && (e.code === "Space" || e.code === "Enter")) again();
  };
  const onKeyUp = (e) => keys.delete(e.code);
  window.addEventListener("pointermove", steer);
  window.addEventListener("pointerdown", steer);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function endRound() {
    S.over = true;
    const isBest = S.score > S.best;
    if (isBest) {
      S.best = S.score;
      saveBest(S.best);
    }
    if (S.score) sfx.cheer();
    render();
    const card = document.createElement("div");
    card.className = "pong-done";
    card.innerHTML = `
      <div class="card">
        <div class="pong-done-kicker">${isBest && S.score ? "New personal best!" : S.lives <= 0 ? "Out of line" : "Time"}</div>
        <h2>${S.score} kite${S.score === 1 ? "" : "s"} cut</h2>
        <p>${S.lives > 0 ? `${S.lives} of your ${LIVES} lines survived.` : "They got all three of your lines."}${S.best && !isBest ? `<br><span class="muted">Best: ${S.best}</span>` : ""}</p>
        <div class="card-actions">
          <button class="btn primary" id="kt-again">Fly again</button>
          <button class="btn secondary" id="kt-leave2">Back to the beach</button>
        </div>
      </div>`;
    ui.appendChild(card);
    card.querySelector("#kt-again").addEventListener("click", again);
    card.querySelector("#kt-leave2").addEventListener("click", leave);
  }
  function again() {
    ui.querySelector(".pong-done")?.remove();
    Object.assign(S, { time: ROUND_SECONDS, score: 0, lives: LIVES, over: false });
    for (let i = 0; i < rivals.length; i++) spawnRival(i);
    me.pos.set(cx, gy + 13);
    me.safe = 3;
    me.g.visible = me.line.visible = true;
    render();
  }

  // ---------- Per-frame ----------
  const a2 = new THREE.Vector2(), b2 = new THREE.Vector2(), c2 = new THREE.Vector2(), d2 = new THREE.Vector2(), tmp = new THREE.Vector2();
  function update(dt) {
    S.t += dt;
    if (camT < 1) {
      camT = Math.min(1, camT + dt * 1.4);
      const e = 1 - Math.pow(1 - camT, 3);
      camera.position.lerpVectors(camStart, camPos, e);
      camera.quaternion.slerpQuaternions(camStartQ, camQ, e);
      camera.fov = fovStart + (fovGame - fovStart) * e;
      camera.updateProjectionMatrix();
    }
    if (!S.over) {
      S.time -= dt;
      if (S.time <= 0) endRound();
    }
    // keyboard steering nudges the target
    const kx = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
    const ky = (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) - (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0);
    if (kx || ky) me.target.set(THREE.MathUtils.clamp(me.target.x + kx * 22 * dt, cx - halfW, cx + halfW), THREE.MathUtils.clamp(me.target.y + ky * 22 * dt, lo, hi));

    // your kite chases the pointer with some lag, so speed takes commitment
    tmp.copy(me.target).sub(me.pos).multiplyScalar(3.2);
    if (tmp.length() > 15) tmp.setLength(15);
    me.vel.lerp(tmp, Math.min(1, dt * 5));
    me.pos.addScaledVector(me.vel, dt);
    me.safe = Math.max(0, me.safe - dt);
    me.g.visible = me.line.visible = !S.over && (me.safe <= 0 || Math.floor(S.t * 10) % 2 === 0);
    drawKite(me, S.t);
    a2.set(me.anchor.x, me.anchor.y);
    b2.copy(me.pos);

    for (let i = 0; i < rivals.length; i++) {
      const k = rivals[i];
      if (!k.alive) {
        // cut kite flutters down and away, then a new one launches
        k.cut += dt;
        k.pos.x += dt * (3 + i);
        k.pos.y -= dt * (2.5 + Math.sin(S.t * 7 + i) * 2);
        k.g.rotation.z += dt * 4;
        k.g.position.set(k.pos.x, k.pos.y, PLANE_Z);
        k.line.visible = false;
        if (k.cut > 3.2) spawnRival(i);
        continue;
      }
      k.ph += dt;
      k.nextDive -= dt;
      if (k.nextDive < 0 && k.dive <= 0) {
        k.dive = 2.0;
        k.nextDive = 6 + Math.random() * 8;
      }
      const diving = k.dive > 0 && k.dive < 1.3; // first 0.7s is the warning flash
      if (k.dive > 0) k.dive -= dt;
      tmp.set(k.home.x + Math.sin(k.ph * k.fx) * k.rx, k.home.y + Math.sin(k.ph * k.fy + 1) * k.ry);
      if (diving) tmp.copy(me.pos); // a dive goes straight at you
      const want = tmp.sub(k.pos).multiplyScalar(diving ? 3.5 : 1.6);
      const cap = diving ? 16 : 6.5;
      if (want.length() > cap) want.setLength(cap);
      k.vel.lerp(want, Math.min(1, dt * 4));
      k.pos.addScaledVector(k.vel, dt);
      k.pos.x = THREE.MathUtils.clamp(k.pos.x, cx - halfW - 4, cx + halfW + 4);
      k.pos.y = THREE.MathUtils.clamp(k.pos.y, lo - 1, hi + 1);
      k.sail.material.opacity = 1;
      k.g.scale.setScalar(k.dive > 1.3 ? 1 + Math.sin(S.t * 30) * 0.18 : 1);
      drawKite(k, S.t + i);

      if (S.over) continue;
      c2.set(k.anchor.x, k.anchor.y);
      d2.copy(k.pos);
      const now = crosses(a2, b2, c2, d2);
      if (now && !k.was && me.safe <= 0) {
        const mySpeed = me.vel.length();
        if (mySpeed >= k.vel.length() && mySpeed > 6) {
          k.alive = false;
          k.cut = 0;
          S.score++;
          sfx.snip();
          flash(["Snip!", "Cut it loose!", "Gone."][S.score % 3]);
        } else if (diving) {
          // only a diving kite can cut you; a slow crossing does nothing either way
          S.lives--;
          sfx.thud();
          flash("They cut your line!", "big");
          me.safe = 2.2;
          me.pos.set(cx, lo + 1);
          me.vel.set(0, 0);
          if (S.lives <= 0) endRound();
        }
        render();
      }
      k.was = now;
    }
    if (!S.over && Math.floor(S.time) !== S._shown) {
      S._shown = Math.floor(S.time);
      render();
    }
  }

  let left = false;
  function leave() {
    if (left) return;
    left = true;
    window.removeEventListener("pointermove", steer);
    window.removeEventListener("pointerdown", steer);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    ui.remove();
    if (!overlay.children.length) overlay.hidden = true;
    scene.remove(root);
    document.body.classList.remove("in-game");
    camera.fov = fovStart;
    camera.updateProjectionMatrix();
    player.teleport(spot.x, spot.z + 1.5, 0, gy);
    player.enabled = true;
    world.removeUpdate(update);
    done();
  }

  render();
  world.addUpdate(update);
  window.__kite = { S, me, rivals, update, leave };
}
