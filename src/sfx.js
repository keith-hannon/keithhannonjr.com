// One shared set of synthesized sound effects for the whole house.
import { Sounds } from "./games/pong/sounds.js";

class Sfx extends Sounds {
  tick() {
    this._tone({ type: "triangle", f0: 1200, f1: 1200, dur: 0.04, vol: 0.12 });
  }
  creak() {
    this._tone({ type: "sawtooth", f0: 180, f1: 320, dur: 0.22, vol: 0.05, curve: "lin" });
  }
  rustle() {
    this._noise(0.18, 0.1, 2500);
    setTimeout(() => this._noise(0.12, 0.07, 3500), 90);
  }
  chime() {
    this._tone({ type: "sine", f0: 660, f1: 660, dur: 0.18, vol: 0.14, attack: 0.01 });
    setTimeout(() => this._tone({ type: "sine", f0: 990, f1: 990, dur: 0.3, vol: 0.12, attack: 0.01 }), 110);
  }
  flutter() {
    for (let i = 0; i < 3; i++) setTimeout(() => this._noise(0.05, 0.06, 3000), i * 70);
  }
  can() {
    this._noise(0.06, 0.25, 3500);
    setTimeout(() => this._noise(0.25, 0.12, 5000), 60);
    setTimeout(() => this._tone({ type: "sine", f0: 300, f1: 180, dur: 0.12, vol: 0.2 }), 420);
  }
  swish() {
    this._noise(0.28, 0.22, 2200);
  }
  clank() {
    this._tone({ type: "square", f0: 420, f1: 300, dur: 0.12, vol: 0.12 });
    this._noise(0.05, 0.15, 1500);
  }
  bounce(v = 0.6) {
    this._tone({ type: "sine", f0: 160, f1: 90, dur: 0.12, vol: 0.3 * v });
  }
  snip() {
    this._tone({ type: "triangle", f0: 1800, f1: 600, dur: 0.12, vol: 0.2 });
    this._noise(0.08, 0.15, 3000);
  }
  thud() {
    this._tone({ type: "sine", f0: 110, f1: 45, dur: 0.4, vol: 0.5 });
  }
  // looping shower hiss
  shower(on) {
    if (!this.ctx) return;
    if (on && !this._shower) {
      const ctx = this.ctx;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 3200;
      const g = ctx.createGain();
      g.gain.value = 0.07;
      src.connect(f).connect(g).connect(this.master);
      src.start();
      this._shower = src;
    } else if (!on && this._shower) {
      this._shower.stop();
      this._shower = null;
    }
  }
}

export const sfx = new Sfx();
// Browsers only allow audio after the visitor has interacted with the page.
for (const ev of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(ev, () => sfx.unlock(), { passive: true });
