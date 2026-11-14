// ============================================================
//  GAME REGISTRY
//  To add a new game later:
//    1. Make a folder in src/games/<name>/ with an index.js that exports
//       `start(world, done)` — build your UI/scene, and call done() when
//       the player leaves.
//    2. Add one line to the `catalog` below.
//  Daily games (daily.html) read the same catalog, so they show up there too.
// ============================================================

export const catalog = {
  pong: {
    title: "Beer Pong",
    blurb: "Sink the rack. Real arcs, real rims.",
    location: "Basement",
    daily: false,
    load: () => import("./pong/index.js"),
  },
  // Example for later:
  // wordle: { title: "Cape Wordle", blurb: "One word a day.", location: "Kitchen", daily: true, load: () => import("./wordle/index.js") },
};

let active = null;

export const games = {
  async start(key, world) {
    if (active) return;
    const entry = catalog[key];
    if (!entry) return console.warn("No game named", key);
    active = key;
    const mod = await entry.load();
    mod.start(world, () => {
      active = null;
    });
  },
  get active() {
    return active;
  },
};
