import * as THREE from "three";
import { SITE, LABELS } from "../site.config.js";
import { buildHouse } from "./world/house.js";
import { H } from "./world/layout.js";
import { Player } from "./player/controls.js";
import { applyMeta } from "./meta.js";

applyMeta();

const isMobile =
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);
document.body.classList.toggle("is-mobile", isMobile);

// ---------- Renderer / scene ----------
const canvas = document.getElementById("scene");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: "high-performance" });
} catch (e) {
  // No WebGL on this device: send people to the simple page instead of a blank screen.
  window.location.replace("./simple.html");
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 2 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe0f2);
scene.fog = new THREE.Fog(0xcfe6f5, 28, 70);

const camera = new THREE.PerspectiveCamera(isMobile ? 78 : 72, window.innerWidth / window.innerHeight, 0.05, 120);

// ---------- Build world ----------
const loadingBar = document.getElementById("loading-bar");
const setProgress = (p) => (loadingBar.style.width = Math.round(p * 100) + "%");
setProgress(0.15);

const house = buildHouse(scene, { isMobile });
setProgress(0.55);

const player = new Player(camera, canvas, { isMobile });

// Stage b will add furnishings + interactables here.
const hooks = []; // other modules push update(dt) functions here
export function onUpdate(fn) {
  hooks.push(fn);
}
export const world = {
  scene, camera, renderer, player, house, isMobile,
  addUpdate: onUpdate,
  removeUpdate: (fn) => {
    const i = hooks.indexOf(fn);
    if (i >= 0) hooks.splice(i, 1);
  },
};
window.__player = player; // used by tests
window.__world = world;

// Warm up shaders by rendering one frame before revealing
renderer.compile(scene, camera);
renderer.render(scene, camera);
setProgress(1);

// ---------- Loading screen → enter ----------
const loading = document.getElementById("loading");
const enterBtn = document.getElementById("enter-btn");
document.querySelector(".loading-sub").textContent = isMobile ? "Use the left joystick to walk, drag right to look." : "Click to look around · WASD to walk";
enterBtn.hidden = false;
enterBtn.addEventListener("click", () => {
  loading.classList.add("hide");
  if (!isMobile) canvas.requestPointerLock?.();
});

// ---------- Controls panel ----------
const controls = document.getElementById("controls");
document.getElementById("controls-toggle").addEventListener("click", () => {
  controls.classList.toggle("collapsed");
  document.getElementById("controls-toggle").setAttribute("aria-expanded", String(!controls.classList.contains("collapsed")));
});

// ---------- Front door swings open when you approach ----------
const door = house.userData.door;
let doorOpen = 0;
function updateDoor(dt) {
  const d = Math.hypot(player.pos.x - H.doorX, player.pos.z - H.maxZ);
  const target = d < 2.6 && player.level === "up" ? 1 : 0;
  doorOpen += (target - doorOpen) * Math.min(1, dt * 4);
  door.rotation.y = -doorOpen * 1.9; // swings inward
}

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  player.update(dt);
  updateDoor(dt);
  for (const h of [...hooks]) h(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Stage b/c/d modules attach themselves:
import("./furnish.js").then((m) => m.furnish(world, onUpdate)).catch((e) => console.warn("furnish not ready", e));
