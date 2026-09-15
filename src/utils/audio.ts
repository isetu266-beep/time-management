// Web Audio API Synthesizer - Self-contained zero external assets

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  } catch (e) {
    return null;
  }
}

export function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal: number = 0.15
): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silent fail for non-interactive environments
  }
}

// Success chime on completing a task or habit
export function playSuccessChime(): void {
  playTone(523.25, 0.12, 'triangle', 0.15); // C5
  setTimeout(() => playTone(659.25, 0.12, 'triangle', 0.15), 90); // E5
  setTimeout(() => playTone(783.99, 0.25, 'sine', 0.2), 180); // G5
}

// Alarm Chime for Reminders
export function playAlertChime(): void {
  playTone(880, 0.2, 'square', 0.2); // A5
  setTimeout(() => playTone(880, 0.2, 'square', 0.2), 220);
  setTimeout(() => playTone(1046.5, 0.45, 'sine', 0.25), 450); // C6
}

// Metronome / Stopwatch tick
export function playTick(): void {
  playTone(1200, 0.04, 'triangle', 0.05);
}

// ==========================================
// Ambient Focus Sounds (Rain, Ocean, Forest, White Noise)
// Uses Web Audio API - Zero External Dependencies
// ==========================================

let ambientContext: AudioContext | null = null;
let ambientSource: AudioBufferSourceNode | null = null;
let ambientGain: GainNode | null = null;
let ambientFilter: BiquadFilterNode | null = null;
let ambientLFO: OscillatorNode | null = null;

export function stopAmbient(): void {
  try {
    if (ambientSource) {
      ambientSource.stop();
      ambientSource.disconnect();
      ambientSource = null;
    }
    if (ambientLFO) {
      ambientLFO.stop();
      ambientLFO.disconnect();
      ambientLFO = null;
    }
  } catch (e) {
    // Ignore errors on stopping
  }
}

export function playAmbient(
  type: 'rain' | 'ocean' | 'forest' | 'white',
  volume: number = 0.35
): void {
  stopAmbient();
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!ambientContext) {
      ambientContext = new AudioCtx();
    }
    if (ambientContext.state === 'suspended') {
      ambientContext.resume().catch(() => {});
    }

    const bufferSize = ambientContext.sampleRate * 2;
    const buffer = ambientContext.createBuffer(1, bufferSize, ambientContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate continuous pink/brown noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    ambientSource = ambientContext.createBufferSource();
    ambientSource.buffer = buffer;
    ambientSource.loop = true;

    ambientFilter = ambientContext.createBiquadFilter();
    ambientGain = ambientContext.createGain();
    ambientGain.gain.setValueAtTime(volume, ambientContext.currentTime);

    if (type === 'rain') {
      ambientFilter.type = 'lowpass';
      ambientFilter.frequency.setValueAtTime(1100, ambientContext.currentTime);
      ambientFilter.Q.setValueAtTime(0.7, ambientContext.currentTime);
    } else if (type === 'ocean') {
      ambientFilter.type = 'bandpass';
      ambientFilter.frequency.setValueAtTime(450, ambientContext.currentTime);
      ambientFilter.Q.setValueAtTime(1.8, ambientContext.currentTime);

      // Low Frequency Oscillator for rolling waves
      const lfo = ambientContext.createOscillator();
      const lfoGain = ambientContext.createGain();
      lfo.frequency.setValueAtTime(0.12, ambientContext.currentTime);
      lfoGain.gain.setValueAtTime(320, ambientContext.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(ambientFilter.frequency);
      lfo.start();
      ambientLFO = lfo;
    } else if (type === 'forest') {
      ambientFilter.type = 'bandpass';
      ambientFilter.frequency.setValueAtTime(750, ambientContext.currentTime);
      ambientFilter.Q.setValueAtTime(2.5, ambientContext.currentTime);

      const lfo = ambientContext.createOscillator();
      const lfoGain = ambientContext.createGain();
      lfo.frequency.setValueAtTime(0.22, ambientContext.currentTime);
      lfoGain.gain.setValueAtTime(380, ambientContext.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(ambientFilter.frequency);
      lfo.start();
      ambientLFO = lfo;
    } else {
      // White / Focus noise
      ambientFilter.type = 'lowpass';
      ambientFilter.frequency.setValueAtTime(3200, ambientContext.currentTime);
      ambientFilter.Q.setValueAtTime(0.5, ambientContext.currentTime);
    }

    ambientSource.connect(ambientFilter);
    ambientFilter.connect(ambientGain);
    ambientGain.connect(ambientContext.destination);
    ambientSource.start();
  } catch (e) {
    // Audio context error handling
  }
}

export function setAmbientVolume(volume: number): void {
  try {
    if (ambientGain && ambientContext) {
      ambientGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ambientContext.currentTime);
    }
  } catch (e) {}
}
