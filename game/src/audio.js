// Solara Heat — sound made from nothing: every effect is a WebAudio oscillator or a
// filtered noise burst, so the game ships no audio files at all.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineNodes = null;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      return true;
    } catch { return false; }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = freq || 1200;
    const gain = ctx.createGain(); gain.gain.value = vol || 0.3;
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (muted) this.engine(0, false); return muted; },
    isMuted() { return muted; },
    click() { tone(660, 0.06, 'square', 0.12); },
    shot() { noise(0.12, 0.5, 2600); tone(150, 0.09, 'sawtooth', 0.25, 60); },
    hit() { noise(0.08, 0.3, 900); tone(220, 0.07, 'triangle', 0.2, 110); },
    hurt() { tone(180, 0.15, 'sawtooth', 0.25, 70); },
    reload() { tone(320, 0.05, 'square', 0.15); setTimeout(() => tone(480, 0.05, 'square', 0.15), 120); },
    pickup() { tone(880, 0.09, 'sine', 0.25); setTimeout(() => tone(1320, 0.12, 'sine', 0.25), 80); },
    cash() { tone(990, 0.07, 'triangle', 0.22); setTimeout(() => tone(1480, 0.1, 'triangle', 0.22), 60); },
    crash() { noise(0.25, 0.5, 500); tone(90, 0.2, 'sawtooth', 0.3, 40); },
    door() { tone(240, 0.08, 'square', 0.18, 180); },
    jingle() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.16, 'triangle', 0.25), i * 110));
    },
    fail() { tone(392, 0.18, 'triangle', 0.22); setTimeout(() => tone(262, 0.3, 'triangle', 0.22), 160); },
    // Police siren: two alternating blips while wanted and police are near.
    siren(dt, active) {
      if (!active || muted) return;
      sirenTimer -= dt;
      if (sirenTimer <= 0) { sirenTimer = 0.55; tone(720, 0.22, 'sine', 0.07); setTimeout(() => tone(960, 0.2, 'sine', 0.07), 240); }
    },
    // Continuous engine hum whose pitch follows speed; call with on=false to stop.
    engine(speedNorm, on) {
      if (muted || !on) {
        if (engineNodes) { try { engineNodes.osc.stop(); } catch { /* already stopped */ } engineNodes = null; }
        return;
      }
      if (!ensure()) return;
      if (!engineNodes) {
        const osc = ctx.createOscillator(); osc.type = 'sawtooth';
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 320;
        const gain = ctx.createGain(); gain.gain.value = 0.05;
        osc.connect(filter); filter.connect(gain); gain.connect(master);
        osc.start();
        engineNodes = { osc, gain };
      }
      engineNodes.osc.frequency.value = 55 + speedNorm * 130;
    },
  };
}
