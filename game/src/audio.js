// audio.js — all sound is synthesized WebAudio: soft blips, footsteps and
// alarms. No audio files, no network. Footsteps tell the player where
// guards are: a near guard makes the patrol blip faster and louder.

export function createAudio() {
  return {
    ctx: null,
    muted: false,
    stepCount: 0,
    guardBlipTimer: 0,

    ensure() {
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AC();
        } catch (e) { this.ctx = null; }
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },

    // A short oscillator tone: freq in Hz, seconds long, waveform, gain.
    blip(freq, dur, type, vol) {
      if (this.muted || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol || 0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + dur + 0.02);
      } catch (e) { /* audio is garnish; never break the game */ }
    },

    footstep(sprinting) {
      if (this.muted || !this.ctx) return;
      this.stepCount++;
      // Soft filtered thump, alternating pitch so steps read as steps.
      const freq = sprinting ? 150 : 120;
      this.blip(this.stepCount % 2 ? freq : freq * 0.85, 0.06, "triangle", 0.05);
    },

    alarmBlip() {
      this.blip(880, 0.09, "square", 0.07);
      setTimeout(() => this.blip(660, 0.09, "square", 0.07), 110);
    },

    alarm() {
      this.blip(740, 0.16, "sawtooth", 0.09);
      setTimeout(() => this.blip(740, 0.16, "sawtooth", 0.09), 180);
      setTimeout(() => this.blip(980, 0.22, "sawtooth", 0.09), 360);
    },

    collect() {
      this.blip(660, 0.08, "sine", 0.12);
      setTimeout(() => this.blip(990, 0.12, "sine", 0.12), 80);
    },

    levelClear() {
      [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, "sine", 0.12), i * 120));
    },

    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, "sine", 0.13), i * 140));
    },

    lose() {
      [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, "sawtooth", 0.07), i * 160));
    },

    // Patrol proximity cue: call every frame with the nearest guard distance.
    // Closer guards blip faster and louder, so sound tells you where they are.
    guardProximity(dist, dt) {
      if (this.muted || !this.ctx || dist > 320) return;
      this.guardBlipTimer -= dt;
      if (this.guardBlipTimer <= 0) {
        const closeness = 1 - dist / 320;
        this.guardBlipTimer = 1.1 - closeness * 0.8;
        this.blip(440 + closeness * 220, 0.05, "sine", 0.03 + closeness * 0.05);
      }
    },

    // Soft chime when a bindable organelle drifts into reach, so the player
    // learns the camouflage prompt by ear as well as by sight.
    bindReady() {
      this.blip(1180, 0.07, "sine", 0.05);
    },
  };
}
