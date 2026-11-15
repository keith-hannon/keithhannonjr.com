// First-person controls: WASD/arrows + mouse look on desktop (pointer lock),
// virtual joystick + drag-to-look on touch. Handles collision and floor height.
import * as THREE from "three";
import { colliders, groundHeight, levelOf, SPAWN } from "../world/layout.js";

const EYE = 1.6;
const RADIUS = 0.32;
const SPEED = 3.6;
const LOOK_SENS = 0.0022;
const TOUCH_LOOK_SENS = 0.0045;

export class Player {
  constructor(camera, domElement, { isMobile }) {
    this.camera = camera;
    this.dom = domElement;
    this.isMobile = isMobile;
    this.pos = new THREE.Vector3(SPAWN.x, SPAWN.y, SPAWN.z); // feet position
    this.yaw = SPAWN.yaw;
    this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.enabled = true;       // false while a game or overlay owns input
    this.joy = { active: false, dx: 0, dy: 0 };
    this.lookTouch = null;
    this.onTap = null;         // callback(clientX, clientY) for touch interaction taps
    this.onClick = null;       // callback() for desktop click while locked
    this.smoothY = SPAWN.y;
    this.bob = 0;
    this._bind();
    this.updateCamera();
  }

  _bind() {
    const dom = this.dom;
    // ---- keyboard ----
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());

    if (!this.isMobile) {
      // ---- pointer lock + mouse look ----
      dom.addEventListener("click", () => {
        if (!this.enabled) return;
        if (!this.locked) {
          dom.requestPointerLock?.();
        } else {
          this.onClick?.();
        }
      });
      document.addEventListener("pointerlockchange", () => {
        this.locked = document.pointerLockElement === dom;
        document.body.classList.toggle("locked", this.locked);
      });
      document.addEventListener("mousemove", (e) => {
        if (!this.locked || !this.enabled) return;
        this.yaw -= e.movementX * LOOK_SENS;
        this.pitch -= e.movementY * LOOK_SENS;
        this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
      });
    } else {
      this._bindTouch();
    }
  }

  _bindTouch() {
    const dom = this.dom;
    const joyEl = document.getElementById("joystick");
    const knob = document.getElementById("joystick-knob");
    const R = 48; // joystick travel radius in px
    let joyId = null;
    let joyCenter = { x: 0, y: 0 };
    let tapStart = null;

    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    dom.addEventListener(
      "touchstart",
      (e) => {
        if (!this.enabled) return;
        for (const t of e.changedTouches) {
          const leftHalf = t.clientX < window.innerWidth * 0.45;
          if (leftHalf && joyId === null) {
            joyId = t.identifier;
            const rect = joyEl.getBoundingClientRect();
            joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            // If the touch is far from the joystick, move the joystick under the finger
            if (Math.hypot(t.clientX - joyCenter.x, t.clientY - joyCenter.y) > 90) {
              joyEl.style.left = t.clientX - rect.width / 2 + "px";
              joyEl.style.bottom = window.innerHeight - t.clientY - rect.height / 2 + "px";
              joyCenter = { x: t.clientX, y: t.clientY };
            }
            this.joy.active = true;
            joyEl.classList.add("active");
          } else if (this.lookTouch === null) {
            this.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
            tapStart = { x: t.clientX, y: t.clientY, time: performance.now(), moved: 0 };
          }
        }
        e.preventDefault();
      },
      { passive: false }
    );
    dom.addEventListener(
      "touchmove",
      (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === joyId) {
            let dx = t.clientX - joyCenter.x;
            let dy = t.clientY - joyCenter.y;
            const len = Math.hypot(dx, dy);
            if (len > R) {
              dx = (dx / len) * R;
              dy = (dy / len) * R;
            }
            this.joy.dx = dx / R;
            this.joy.dy = dy / R;
            setKnob(dx, dy);
          } else if (this.lookTouch && t.identifier === this.lookTouch.id) {
            const mx = t.clientX - this.lookTouch.x;
            const my = t.clientY - this.lookTouch.y;
            if (this.enabled) {
              this.yaw -= mx * TOUCH_LOOK_SENS;
              this.pitch -= my * TOUCH_LOOK_SENS;
              this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
            }
            if (tapStart) tapStart.moved += Math.hypot(mx, my);
            this.lookTouch.x = t.clientX;
            this.lookTouch.y = t.clientY;
          }
        }
        e.preventDefault();
      },
      { passive: false }
    );
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          joyId = null;
          this.joy.active = false;
          this.joy.dx = this.joy.dy = 0;
          setKnob(0, 0);
          joyEl.classList.remove("active");
          joyEl.style.left = "";
          joyEl.style.bottom = "";
        } else if (this.lookTouch && t.identifier === this.lookTouch.id) {
          if (tapStart && tapStart.moved < 12 && performance.now() - tapStart.time < 350) {
            this.onTap?.(t.clientX, t.clientY);
          }
          this.lookTouch = null;
          tapStart = null;
        }
      }
    };
    dom.addEventListener("touchend", end);
    dom.addEventListener("touchcancel", end);
  }

  get level() {
    return levelOf(this.pos.y, this.pos.x, this.pos.z);
  }

  teleport(x, z, yaw = this.yaw, y = 0) {
    this.pos.set(x, y, z);
    this.smoothY = y;
    this.yaw = yaw;
    this.pitch = 0;
    this.updateCamera();
  }

  update(dt) {
    if (!this.enabled) return; // a game or card owns the camera right now
    // Movement input
    let fwd = 0, strafe = 0;
    const k = this.keys;
    if (k.has("KeyW") || k.has("ArrowUp")) fwd += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) fwd -= 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) strafe -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) strafe += 1;
    if (this.joy.active) {
      fwd += -this.joy.dy;
      strafe += this.joy.dx;
    }
    const len = Math.hypot(fwd, strafe);
    if (len > 1) {
      fwd /= len;
      strafe /= len;
    }
    const sprint = k.has("ShiftLeft") || k.has("ShiftRight") ? 1.6 : 1;
    const speed = SPEED * sprint * dt;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward vector for yaw (camera looks down -Z when yaw = 0)
    const dx = (-sin * fwd + cos * strafe) * speed;
    const dz = (-cos * fwd - sin * strafe) * speed;

    const level = this.level;
    this._moveAxis(dx, 0, level);
    this._moveAxis(0, dz, level);

    // floor height
    const gy = groundHeight(this.pos.x, this.pos.z, this.pos.y);
    this.pos.y = gy;
    const moving = len > 0.05;
    this.bob = moving ? this.bob + dt * 9 : 0;
    this.updateCamera(dt, moving);
  }

  _moveAxis(dx, dz, level) {
    const nx = this.pos.x + dx;
    const nz = this.pos.z + dz;
    for (const c of colliders) {
      if (c.level !== "both" && c.level !== level) continue;
      if (nx + RADIUS > c.minX && nx - RADIUS < c.maxX && nz + RADIUS > c.minZ && nz - RADIUS < c.maxZ) {
        return; // blocked; just don't move on this axis
      }
    }
    this.pos.x = nx;
    this.pos.z = nz;
  }

  updateCamera(dt = 0.016, moving = false) {
    // smooth vertical (stairs feel like steps rather than a ramp)
    this.smoothY += (this.pos.y - this.smoothY) * Math.min(1, dt * 14);
    const bobY = moving ? Math.sin(this.bob) * 0.035 : 0;
    this.camera.position.set(this.pos.x, this.smoothY + EYE + bobY, this.pos.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(this.pitch);
  }
}
