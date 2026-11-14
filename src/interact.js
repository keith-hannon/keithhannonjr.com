// Interactive objects: glow + floating label when near, click/tap to use.
import * as THREE from "three";
import { textTexture } from "./world/textures.js";
import { SITE, LABELS } from "../site.config.js";

const NEAR = 4.2;     // start showing label / glow
const USE = 3.2;      // close enough to click
const GLOW = new THREE.Color(0x9fd3c7);

export class Interactions {
  constructor(world) {
    this.world = world;
    this.items = [];
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = USE + 0.5;
    this.focused = null;
    this.prompt = document.getElementById("prompt");
    this.time = 0;
    this._card = null;

    const { player, isMobile, camera } = world;
    if (!isMobile) {
      player.onClick = () => this.focused && this.focused.use();
    } else {
      player.onTap = (cx, cy) => {
        const ndc = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
        this.raycaster.setFromCamera(ndc, camera);
        const hit = this._hit();
        if (hit) hit.use();
      };
    }
  }

  // Register a group as interactive. action() is called on use.
  add(group, { label, hint = "", action, radius = 1.2, labelY = null }) {
    const meshes = [];
    group.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.userData.baseEmissive = o.material.emissive ? o.material.emissive.clone() : new THREE.Color(0);
        o.userData.baseEmissiveI = o.material.emissiveIntensity ?? 1;
        meshes.push(o);
      }
    });
    // floating label sprite
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(label), transparent: true, depthTest: true, depthWrite: false, opacity: 0 }));
    sprite.scale.set(1.0, 0.25, 1);
    sprite.renderOrder = 999;
    const bbox = new THREE.Box3().setFromObject(group);
    const center = bbox.getCenter(new THREE.Vector3());
    sprite.position.set(center.x, labelY ?? bbox.max.y + 0.28, center.z);
    this.world.scene.add(sprite);

    const item = {
      group, meshes, sprite, label, hint, center, radius,
      glow: 0,
      use: () => {
        if (this._card) return;
        action(item);
      },
    };
    for (const m of meshes) m.userData.interactable = item;
    this.items.push(item);
    return item;
  }

  _hit() {
    const meshes = [];
    for (const it of this.items) for (const m of it.meshes) meshes.push(m);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length) {
      const it = hits[0].object.userData.interactable;
      if (hits[0].distance <= USE) return it;
    }
    return null;
  }

  update(dt) {
    this.time += dt;
    const { camera, player, isMobile } = this.world;
    const camPos = camera.position;

    // Desktop: what is under the crosshair?
    let focus = null;
    if (!isMobile && player.enabled && !this._card) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      focus = this._hit();
    }
    this.focused = focus;

    for (const it of this.items) {
      const d = it.center.distanceTo(camPos);
      const sameLevel = (it.center.y < -1) === (player.pos.y < -1);
      const near = d < NEAR && sameLevel && !this._card && player.enabled;
      const target = focus === it ? 1 : near ? 0.55 : 0;
      it.glow += (target - it.glow) * Math.min(1, dt * 8);
      const pulse = 0.75 + 0.25 * Math.sin(this.time * 3.2 + it.center.x);
      const g = it.glow * pulse;
      for (const m of it.meshes) {
        if (!m.material.emissive) continue;
        m.material.emissive.copy(m.userData.baseEmissive).lerp(GLOW, g * 0.9);
        m.material.emissiveIntensity = THREE.MathUtils.lerp(m.userData.baseEmissiveI, 0.9, g);
      }
      // label fades in when near; on mobile labels are the main cue
      const labelTarget = near ? (isMobile ? 1 : focus === it ? 1 : 0.85) : 0;
      it.sprite.material.opacity += (labelTarget - it.sprite.material.opacity) * Math.min(1, dt * 6);
      const s = THREE.MathUtils.clamp(d / 3, 0.7, 1.6);
      it.sprite.scale.set(1.0 * s, 0.25 * s, 1);
    }

    // Prompt text
    if (focus) {
      this.prompt.innerHTML = `${focus.label}<small>click</small>`;
      this.prompt.hidden = false;
    } else {
      this.prompt.hidden = true;
    }
  }

  // ---------- Link card (a small in-style modal) ----------
  showCard({ title, body, href, cta, external = true, onClose }) {
    this.closeCard();
    const { player } = this.world;
    player.enabled = false;
    if (document.pointerLockElement) document.exitPointerLock?.();
    const overlay = document.getElementById("overlay");
    const el = document.createElement("div");
    el.className = "card-modal";
    el.innerHTML = `
      <div class="card">
        <h2>${title}</h2>
        <p>${body}</p>
        <div class="card-actions">
          <a class="btn primary" href="${href}" ${external ? 'target="_blank" rel="noopener"' : ""}>${cta}</a>
          <button class="btn secondary" data-close>Back to the house</button>
        </div>
      </div>`;
    overlay.appendChild(el);
    overlay.hidden = false;
    this._card = el;
    const close = () => {
      this.closeCard();
      onClose?.();
    };
    el.querySelector("[data-close]").addEventListener("click", close);
    el.addEventListener("click", (e) => {
      if (e.target === el) close();
    });
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        window.removeEventListener("keydown", onKey);
      }
    };
    window.addEventListener("keydown", onKey);
  }

  closeCard() {
    if (!this._card) return;
    this._card.remove();
    this._card = null;
    const overlay = document.getElementById("overlay");
    if (!overlay.children.length) overlay.hidden = true;
    this.world.player.enabled = true;
  }
}

// Convenience: the four professional links as card configs.
export function linkCard(key) {
  const L = SITE.links;
  const name = SITE.name.split(" ")[0];
  switch (key) {
    case "resume":
      return { title: LABELS.resume, body: `${name}'s resume, as a PDF.`, href: L.resume, cta: "Open resume ↗" };
    case "linkedin":
      return { title: LABELS.linkedin, body: `${name}'s professional profile.`, href: L.linkedin, cta: "Open LinkedIn ↗" };
    case "email":
      return { title: LABELS.email, body: `Drop a note in the mailbox: <strong>${L.email}</strong>`, href: "mailto:" + L.email, cta: "Write an email ↗", external: false };
    case "instagram":
      return { title: LABELS.instagram, body: `Polaroids from the wall, and the rest of them.`, href: L.instagram, cta: "Open Instagram ↗" };
  }
}
