// Pushes the values from site.config.js into the page: title, description,
// HUD links. Nothing here needs editing.
import { SITE, LABELS } from "../site.config.js";

export function applyMeta() {
  for (const id of ["loading-name", "hud-name"]) {
    const el = document.getElementById(id);
    if (el) el.textContent = SITE.name;
  }
  const links = {
    "hud-resume": [SITE.links.resume, LABELS.resume],
    "hud-linkedin": [SITE.links.linkedin, LABELS.linkedin],
    "hud-email": ["mailto:" + SITE.links.email, LABELS.email],
    "hud-instagram": [SITE.links.instagram, LABELS.instagram],
  };
  for (const [id, [href, label]] of Object.entries(links)) {
    const el = document.getElementById(id);
    if (el) {
      el.href = href;
      el.textContent = label;
    }
  }
}

// Open one of the configured links the same way everywhere (house objects + HUD).
export function openLink(key) {
  const L = SITE.links;
  const href = key === "email" ? "mailto:" + L.email : L[key];
  if (!href) return;
  if (key === "email") window.location.href = href;
  else window.open(href, "_blank", "noopener");
}
