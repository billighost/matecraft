// Pure Web Audio API tactile chess sound synthesizer — zero external assets required.

type SoundCue =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'checkmate'
  | 'blunder'
  | 'pickup'
  | 'click'
  | 'theme';

class ChessSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private playNoiseBurst(duration: number, filterFreq: number, volume: number, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public play(cue: SoundCue) {
    if (!this.enabled) return;
    try {
      switch (cue) {
        case 'move':
          // Crisp wooden tap
          this.playNoiseBurst(0.055, 820, 0.14);
          this.playTone(230, 120, 0.065, 'triangle', 0.12);
          break;
        case 'capture':
          // Heavier percussive crunch + snap
          this.playNoiseBurst(0.09, 1300, 0.22);
          this.playTone(170, 65, 0.11, 'sine', 0.18);
          this.playTone(390, 190, 0.05, 'square', 0.05);
          break;
        case 'check':
          // Sharp metallic ping + tap
          this.playNoiseBurst(0.05, 900, 0.12);
          this.playTone(740, 740, 0.18, 'sine', 0.12);
          this.playTone(1110, 1110, 0.14, 'triangle', 0.07, 0.03);
          break;
        case 'castle':
          // Double wooden slide-click
          this.playNoiseBurst(0.05, 760, 0.13, 0);
          this.playTone(220, 130, 0.055, 'triangle', 0.1, 0);
          this.playNoiseBurst(0.055, 940, 0.15, 0.085);
          this.playTone(270, 160, 0.06, 'triangle', 0.11, 0.085);
          break;
        case 'promote':
          // Sparkling ascending harmonic arpeggio
          this.playTone(523.25, 523.25, 0.12, 'triangle', 0.1, 0);
          this.playTone(659.25, 659.25, 0.12, 'triangle', 0.1, 0.07);
          this.playTone(783.99, 783.99, 0.14, 'triangle', 0.11, 0.14);
          this.playTone(1046.5, 1046.5, 0.26, 'sine', 0.12, 0.21);
          break;
        case 'checkmate':
          // Dramatic crisp chord fanfare
          this.playNoiseBurst(0.08, 1200, 0.18, 0);
          this.playTone(261.63, 261.63, 0.42, 'triangle', 0.13, 0.02);
          this.playTone(329.63, 329.63, 0.42, 'triangle', 0.11, 0.08);
          this.playTone(392.0, 392.0, 0.45, 'triangle', 0.12, 0.14);
          this.playTone(523.25, 523.25, 0.55, 'sine', 0.14, 0.2);
          break;
        case 'blunder':
          // Playful short descending "uh-oh" two-note sting
          this.playTone(280, 250, 0.16, 'sawtooth', 0.05, 0);
          this.playTone(210, 175, 0.24, 'sawtooth', 0.055, 0.15);
          break;
        case 'pickup':
          this.playTone(340, 440, 0.035, 'sine', 0.06);
          break;
        case 'click':
          this.playTone(520, 360, 0.03, 'triangle', 0.05);
          break;
        case 'theme':
          this.playTone(420, 620, 0.08, 'sine', 0.07, 0);
          this.playTone(620, 520, 0.09, 'triangle', 0.05, 0.05);
          break;
      }
    } catch {
      // Ignore Web Audio autoplay restrictions gracefully
    }
  }
}

export const soundEngine = new ChessSoundEngine();
