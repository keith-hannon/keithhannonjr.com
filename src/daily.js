// The Cape Daily page. Reads the same game registry as the house, so any game
// added to src/games/registry.js with `daily: true` shows up here automatically.
import { catalog } from "./games/registry.js";

document.getElementById("date").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

const grid = document.getElementById("grid");
const slot = (cls, title, body, tag) => {
  const d = document.createElement("div");
  d.className = "slot " + cls;
  d.innerHTML = `<h3>${title}</h3><p>${body}</p><span class="tagline">${tag}</span>`;
  grid.appendChild(d);
};

const daily = Object.values(catalog).filter((g) => g.daily);
for (const g of daily) slot("live", g.title, g.blurb, "Playable");
for (const g of Object.values(catalog).filter((g) => !g.daily))
  slot("live", g.title, `${g.blurb} <a href="./index.html">Find it in the ${g.location.toLowerCase()} →</a>`, "Now playing");

// Empty slots waiting for future daily games
const placeholders = [
  ["The Daily Word", "Five letters, six guesses, one word a day."],
  ["The Small Crossword", "Small enough to finish before the coffee's done."],
];
placeholders.slice(0, Math.max(0, 2 - daily.length)).forEach(([t, b]) => slot("soon", t, b, "Coming soon"));
