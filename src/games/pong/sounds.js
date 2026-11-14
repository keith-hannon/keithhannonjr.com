// Tiny synthesized sound effects (no audio files to download).
export class Sounds {
  constructor() {
    this.ctx = null;
    this.master = null;
  }
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }
  _tone({ type = "sine", f0 = 440, f1 = f0, dur = 0.15, vol = 0.5, attack = 0.002, curve = "exp" }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (curve === "exp") o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    else o.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  _noise(dur = 0.05, vol = 0.2, hp = 2000) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }
  toss() {
    this._noise(0.04, 0.08, 3000);
  }
  // ball on table: short hollow tick
  table(v = 0.6) {
    this._tone({ type: "sine", f0: 900, f1: 400, dur: 0.06, vol: 0.25 * v });
    this._noise(0.02, 0.12 * v, 1500);
  }
  // ball on a cup rim: brighter, higher click
  rim(v = 0.6) {
    this._tone({ type: "triangle", f0: 2400, f1: 1600, dur: 0.045, vol: 0.22 * v });
    this._noise(0.015, 0.1 * v, 4000);
  }
  // the plunk: a splash + a low "bloop" into liquid
  plunk() {
    this._tone({ type: "sine", f0: 520, f1: 180, dur: 0.22, vol: 0.5 });
    this._tone({ type: "sine", f0: 260, f1: 420, dur: 0.18, vol: 0.25, attack: 0.03 });
    this._noise(0.12, 0.18, 800);
  }
  rack() {
    this._tone({ type: "triangle", f0: 700, f1: 700, dur: 0.05, vol: 0.12 });
    setTimeout(() => this._tone({ type: "triangle", f0: 840, f1: 840, dur: 0.05, vol: 0.12 }), 70);
  }
  cheer() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this._tone({ type: "triangle", f0: f, f1: f, dur: 0.35, vol: 0.25, attack: 0.01 }), i * 110));
    setTimeout(() => this._noise(0.4, 0.15, 600), 450);
  }
}
