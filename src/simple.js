// Fills the simple page's links from site.config.js.
import { SITE } from "../site.config.js";
const L = SITE.links;
const set = (id, href) => (document.getElementById(id).href = href);
set("l-resume", L.resume);
set("l-linkedin", L.linkedin);
set("l-email", "mailto:" + L.email);
set("l-instagram", L.instagram);
document.getElementById("email-text").textContent = L.email;
