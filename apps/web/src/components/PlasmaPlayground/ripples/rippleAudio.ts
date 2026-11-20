import { getLfoTargets, type LfoTarget, type Timbre } from "./timbres";

export type VoiceRequest = {
  timbre: Timbre;
  /** Note pitch in Hz. */
  frequency: number;
  /** AudioContext time at which the note starts. */
  startTime: number;
  /** Seconds the note lasts. */
  duration: number;
  lfoTarget: LfoTarget;
  /** LFO values 0..1 sampled evenly across the note's duration. */
  lfoCurve: Float32Array;
};

export type RippleAudio = {
  readonly isEnabled: boolean;
  /** Creates or resumes the AudioContext; must be called from a user gesture. */
  enable: () => Promise<void>;
  /** Silences and suspends playback. */
  disable: () => void;
  /** Current AudioContext time, or null before the first enable. */
  currentTime: () => number | null;
  /** Schedules one note; does nothing while disabled. */
  play: (voice: VoiceRequest) => void;
  dispose: () => void;
};

/** Leaves headroom so many overlapping voices reach the compressor before they clip. */
const MASTER_GAIN = 0.8;
const VOICE_PEAK = 0.25;
const ATTACK = 0.005;
const RELEASE = 0.07;
/** Fade before suspending so disabling never ends on a click. */
const DISABLE_FADE = 0.03;
const SUSPEND_MARGIN_MS = 20;
/** exponentialRamp cannot reach zero; this is inaudible. */
const SILENT = 0.001;

const NOISE_SECONDS = 2;

const FM_RATIO = 3.5;
const FM_INDEX = 2;
const FM_INDEX_END = 0.05;
const FM_DECAY = 1;

const PLUCK_MAX_SECONDS = 4;
/** Rounding rendered lengths up to steps lets notes of similar length share a buffer. */
const PLUCK_LENGTH_STEP = 0.25;
const PLUCK_DAMPING = 0.996;
/** Bounds memory when tempo or key keep changing. */
const PLUCK_CACHE_SIZE = 64;

const BASS_OCTAVES_DOWN = 2;
const BASS_CUTOFF = 600;
/** Below this a sub-octave is felt rather than heard and only eats headroom. */
const MIN_SUB_FREQUENCY = 30;

const KICK_START = 150;
const KICK_END = 45;
const KICK_SWEEP = 0.12;
const KICK_DECAY = 0.4;
/** The requested note shifts the kick by at most a quarter octave around C4. */
const KICK_REFERENCE = 261.63;
const KICK_TUNE_OCTAVES = 0.25;

const SNARE_NOISE_CUTOFF = 1500;
const SNARE_NOISE_DECAY = 0.2;
const SNARE_BODY_FREQUENCY = 180;
const SNARE_BODY_DECAY = 0.1;

const HIHAT_CUTOFF = 7000;
const HIHAT_DECAY = 0.08;

const LOWPASS_BASE = 150;
const LOWPASS_OCTAVES = 7;
const HIGHPASS_BASE = 30;
const HIGHPASS_OCTAVES = 8;
const PITCH_RANGE_CENTS = 1200;

/** LFO value that leaves a target unmodulated, used when no curve is given. */
const NEUTRAL_LFO: Record<LfoTarget, number> = {
  volume: 1,
  lowpass: 1,
  highpass: 0,
  pitch: 0,
};

type AudioGraph = {
  ctx: AudioContext;
  master: GainNode;
  compressor: DynamicsCompressorNode;
  noise: AudioBuffer | null;
  plucks: Map<string, AudioBuffer>;
};

type Note = { frequency: number; start: number; end: number };

type PitchedSource = OscillatorNode | AudioBufferSourceNode;

type VoiceSound = {
  output: AudioNode;
  sources: AudioScheduledSourceNode[];
  /** Sources the pitch LFO bends. */
  pitched: PitchedSource[];
  nodes: AudioNode[];
  /** When the sound has decayed on its own. */
  stopTime: number;
};

type SoundBuilder = (graph: AudioGraph, note: Note) => VoiceSound;

type ActiveVoice = { stop: (when: number) => void };

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createGain = (ctx: AudioContext, value: number) => {
  const gain = ctx.createGain();
  gain.gain.value = value;
  return gain;
};

const createDecay = (
  ctx: AudioContext,
  start: number,
  peak: number,
  decay: number,
) => {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(SILENT, start + decay);
  return gain;
};

const createOscillator = (
  ctx: AudioContext,
  type: OscillatorType,
  frequency: number,
) => {
  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  return oscillator;
};

const createFilter = (
  ctx: AudioContext,
  type: BiquadFilterType,
  frequency: number,
) => {
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  return filter;
};

const getNoiseBuffer = (graph: AudioGraph) => {
  if (graph.noise) return graph.noise;
  const { sampleRate } = graph.ctx;
  const buffer = graph.ctx.createBuffer(
    1,
    sampleRate * NOISE_SECONDS,
    sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  graph.noise = buffer;
  return buffer;
};

const createNoise = (graph: AudioGraph) => {
  const source = graph.ctx.createBufferSource();
  source.buffer = getNoiseBuffer(graph);
  source.loop = true;
  return source;
};

/** Karplus–Strong: a noise burst circulating through an averaging delay line. */
const renderPluck = (
  ctx: AudioContext,
  delayLength: number,
  frames: number,
) => {
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const line = new Float32Array(delayLength);
  let sum = 0;
  for (let i = 0; i < delayLength; i++) {
    line[i] = Math.random() * 2 - 1;
    sum += line[i];
  }
  // The averaging filter keeps DC forever, which would offset the whole note.
  const mean = sum / delayLength;
  for (let i = 0; i < delayLength; i++) line[i] -= mean;

  let index = 0;
  for (let n = 0; n < frames; n++) {
    const next = (index + 1) % delayLength;
    data[n] = line[index];
    line[index] = PLUCK_DAMPING * 0.5 * (line[index] + line[next]);
    index = next;
  }
  return buffer;
};

const getPluckBuffer = (
  graph: AudioGraph,
  delayLength: number,
  frames: number,
) => {
  const key = `${delayLength}:${frames}`;
  const cached = graph.plucks.get(key);
  if (cached) return cached;
  const buffer = renderPluck(graph.ctx, delayLength, frames);
  graph.plucks.set(key, buffer);
  if (graph.plucks.size > PLUCK_CACHE_SIZE) {
    const oldest = graph.plucks.keys().next().value;
    if (oldest !== undefined) graph.plucks.delete(oldest);
  }
  return buffer;
};

const oscillatorSound =
  (type: OscillatorType, level: number): SoundBuilder =>
  ({ ctx }, { frequency, end }) => {
    const oscillator = createOscillator(ctx, type, frequency);
    const trim = createGain(ctx, level);
    oscillator.connect(trim);
    return {
      output: trim,
      sources: [oscillator],
      pitched: [oscillator],
      nodes: [oscillator, trim],
      stopTime: end,
    };
  };

const noiseSound: SoundBuilder = (graph, { end }) => {
  const noise = createNoise(graph);
  const trim = createGain(graph.ctx, 0.5);
  noise.connect(trim);
  return {
    output: trim,
    sources: [noise],
    pitched: [],
    nodes: [noise, trim],
    stopTime: end,
  };
};

const fmBellSound: SoundBuilder = ({ ctx }, { frequency, start, end }) => {
  const carrier = createOscillator(ctx, "sine", frequency);
  const modulator = createOscillator(ctx, "sine", frequency * FM_RATIO);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(frequency * FM_INDEX, start);
  depth.gain.exponentialRampToValueAtTime(
    frequency * FM_INDEX_END,
    start + FM_DECAY,
  );
  modulator.connect(depth).connect(carrier.frequency);
  return {
    output: carrier,
    sources: [carrier, modulator],
    pitched: [carrier, modulator],
    nodes: [carrier, modulator, depth],
    stopTime: end,
  };
};

const pluckSound: SoundBuilder = (graph, { frequency, start, end }) => {
  const { sampleRate } = graph.ctx;
  const delayLength = Math.max(2, Math.round(sampleRate / frequency - 0.5));
  const seconds = Math.min(
    PLUCK_MAX_SECONDS,
    Math.ceil((end - start) / PLUCK_LENGTH_STEP) * PLUCK_LENGTH_STEP,
  );
  const source = graph.ctx.createBufferSource();
  source.buffer = getPluckBuffer(
    graph,
    delayLength,
    Math.round(seconds * sampleRate),
  );
  // The averaging adds half a sample of delay and the line length is whole
  // samples, so playback rate corrects the rendered pitch to the exact note.
  source.playbackRate.value = (frequency * (delayLength + 0.5)) / sampleRate;
  return {
    output: source,
    sources: [source],
    pitched: [source],
    nodes: [source],
    stopTime: end,
  };
};

const bassSound: SoundBuilder = ({ ctx }, { frequency, end }) => {
  const root = frequency / 2 ** BASS_OCTAVES_DOWN;
  const subFrequency = root / 2 >= MIN_SUB_FREQUENCY ? root / 2 : root;
  const saw = createOscillator(ctx, "sawtooth", root);
  const sub = createOscillator(ctx, "sine", subFrequency);
  const sawLevel = createGain(ctx, 0.5);
  const subLevel = createGain(ctx, 0.7);
  const lowpass = createFilter(ctx, "lowpass", BASS_CUTOFF);
  saw.connect(sawLevel).connect(lowpass);
  sub.connect(subLevel).connect(lowpass);
  return {
    output: lowpass,
    sources: [saw, sub],
    pitched: [saw, sub],
    nodes: [saw, sub, sawLevel, subLevel, lowpass],
    stopTime: end,
  };
};

const kickSound: SoundBuilder = ({ ctx }, { frequency, start, end }) => {
  const octavesFromReference = clamp(
    Math.log2(frequency / KICK_REFERENCE),
    -1,
    1,
  );
  const tune = 2 ** (octavesFromReference * KICK_TUNE_OCTAVES);
  const body = createOscillator(ctx, "sine", KICK_START * tune);
  body.frequency.setValueAtTime(KICK_START * tune, start);
  body.frequency.exponentialRampToValueAtTime(
    KICK_END * tune,
    start + KICK_SWEEP,
  );
  const amp = createDecay(ctx, start, 1, KICK_DECAY);
  body.connect(amp);
  return {
    output: amp,
    sources: [body],
    pitched: [body],
    nodes: [body, amp],
    stopTime: Math.min(end, start + KICK_DECAY),
  };
};

const snareSound: SoundBuilder = (graph, { start, end }) => {
  const { ctx } = graph;
  const noise = createNoise(graph);
  const highpass = createFilter(ctx, "highpass", SNARE_NOISE_CUTOFF);
  const noiseAmp = createDecay(ctx, start, 0.7, SNARE_NOISE_DECAY);
  const body = createOscillator(ctx, "triangle", SNARE_BODY_FREQUENCY);
  const bodyAmp = createDecay(ctx, start, 0.8, SNARE_BODY_DECAY);
  const mix = ctx.createGain();
  noise.connect(highpass).connect(noiseAmp).connect(mix);
  body.connect(bodyAmp).connect(mix);
  return {
    output: mix,
    sources: [noise, body],
    pitched: [],
    nodes: [noise, highpass, noiseAmp, body, bodyAmp, mix],
    stopTime: Math.min(end, start + SNARE_NOISE_DECAY),
  };
};

const hihatSound: SoundBuilder = (graph, { start, end }) => {
  const noise = createNoise(graph);
  const highpass = createFilter(graph.ctx, "highpass", HIHAT_CUTOFF);
  const amp = createDecay(graph.ctx, start, 0.6, HIHAT_DECAY);
  noise.connect(highpass).connect(amp);
  return {
    output: amp,
    sources: [noise],
    pitched: [],
    nodes: [noise, highpass, amp],
    stopTime: Math.min(end, start + HIHAT_DECAY),
  };
};

const SOUNDS: Record<Timbre, SoundBuilder> = {
  sine: oscillatorSound("sine", 1),
  triangle: oscillatorSound("triangle", 0.9),
  square: oscillatorSound("square", 0.45),
  saw: oscillatorSound("sawtooth", 0.55),
  noise: noiseSound,
  "fm-bell": fmBellSound,
  pluck: pluckSound,
  bass: bassSound,
  kick: kickSound,
  snare: snareSound,
  hihat: hihatSound,
};

/** setValueCurveAtTime needs at least two finite points. */
const toAutomationCurve = (
  lfoCurve: Float32Array,
  neutral: number,
  map: (lfo: number) => number,
) => {
  const samples =
    lfoCurve.length >= 2
      ? Array.from(lfoCurve)
      : [lfoCurve[0] ?? neutral, lfoCurve[0] ?? neutral];
  return Float32Array.from(samples, (lfo) =>
    map(Number.isFinite(lfo) ? clamp(lfo, 0, 1) : neutral),
  );
};

const bendPitch = (
  source: PitchedSource,
  lfoCurve: Float32Array,
  start: number,
  duration: number,
) => {
  // Older Safari lacks detune on buffer sources.
  const detune: AudioParam | undefined = source.detune;
  if (detune) {
    detune.setValueCurveAtTime(
      toAutomationCurve(
        lfoCurve,
        NEUTRAL_LFO.pitch,
        (lfo) => lfo * PITCH_RANGE_CENTS,
      ),
      start,
      duration,
    );
    return;
  }
  if (!("playbackRate" in source)) return;
  const baseRate = source.playbackRate.value;
  source.playbackRate.setValueCurveAtTime(
    toAutomationCurve(
      lfoCurve,
      NEUTRAL_LFO.pitch,
      (lfo) => baseRate * 2 ** ((lfo * PITCH_RANGE_CENTS) / 1200),
    ),
    start,
    duration,
  );
};

const createEnvelope = (ctx: AudioContext, start: number, end: number) => {
  const duration = end - start;
  const attack = Math.min(ATTACK, duration / 4);
  const release = Math.min(RELEASE, duration / 2);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(VOICE_PEAK, start + attack);
  envelope.gain.setValueAtTime(VOICE_PEAK, end - release);
  envelope.gain.linearRampToValueAtTime(0, end);
  return envelope;
};

const createGraph = (): AudioGraph | null => {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  const ctx = new AudioContextClass();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 6;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;
  const master = createGain(ctx, MASTER_GAIN);
  master.connect(compressor).connect(ctx.destination);
  return { ctx, master, compressor, noise: null, plucks: new Map() };
};

export const createRippleAudio = (): RippleAudio => {
  let graph: AudioGraph | null = null;
  let enabled = false;
  /** Bumped on every enable/disable/dispose so stale async work can bail out. */
  let toggle = 0;
  let suspendTimer: ReturnType<typeof setTimeout> | null = null;
  const activeVoices = new Set<ActiveVoice>();

  const clearSuspendTimer = () => {
    if (suspendTimer !== null) clearTimeout(suspendTimer);
    suspendTimer = null;
  };

  const enable = async () => {
    clearSuspendTimer();
    graph ??= createGraph();
    if (!graph) return;
    const audio = graph;
    const request = ++toggle;
    await audio.ctx.resume();
    if (request !== toggle) return;
    const now = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.setValueAtTime(MASTER_GAIN, now);
    enabled = true;
  };

  const disable = () => {
    toggle += 1;
    enabled = false;
    clearSuspendTimer();
    if (!graph) return;
    const { ctx, master } = graph;
    const now = ctx.currentTime;
    const silentAt = now + DISABLE_FADE;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, silentAt);
    activeVoices.forEach((voice) => voice.stop(silentAt));
    const request = toggle;
    suspendTimer = setTimeout(
      () => {
        suspendTimer = null;
        if (request === toggle) void ctx.suspend();
      },
      DISABLE_FADE * 1000 + SUSPEND_MARGIN_MS,
    );
  };

  const play = ({
    timbre,
    frequency,
    startTime,
    duration,
    lfoTarget,
    lfoCurve,
  }: VoiceRequest) => {
    if (!enabled || !graph) return;
    if (!(frequency > 0) || !(duration > 0) || !Number.isFinite(startTime))
      return;
    const { ctx, master } = graph;
    const start = Math.max(startTime, ctx.currentTime);
    const end = start + duration;
    const target = getLfoTargets(timbre).includes(lfoTarget)
      ? lfoTarget
      : "volume";

    const sound = SOUNDS[timbre](graph, { frequency, start, end });
    const nodes = [...sound.nodes];
    let output = sound.output;

    if (target === "lowpass" || target === "highpass") {
      const [base, octaves] =
        target === "lowpass"
          ? [LOWPASS_BASE, LOWPASS_OCTAVES]
          : [HIGHPASS_BASE, HIGHPASS_OCTAVES];
      const filter = createFilter(ctx, target, base);
      filter.frequency.setValueCurveAtTime(
        toAutomationCurve(
          lfoCurve,
          NEUTRAL_LFO[target],
          (lfo) => base * 2 ** (lfo * octaves),
        ),
        start,
        duration,
      );
      output.connect(filter);
      output = filter;
      nodes.push(filter);
    } else if (target === "volume") {
      // A separate gain keeps the curve from colliding with the envelope's ramps.
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueCurveAtTime(
        toAutomationCurve(lfoCurve, NEUTRAL_LFO.volume, (lfo) => lfo),
        start,
        duration,
      );
      output.connect(lfoGain);
      output = lfoGain;
      nodes.push(lfoGain);
    } else {
      sound.pitched.forEach((source) =>
        bendPitch(source, lfoCurve, start, duration),
      );
    }

    const envelope = createEnvelope(ctx, start, end);
    output.connect(envelope).connect(master);
    nodes.push(envelope);

    const stopTime = Math.min(sound.stopTime, end);
    const voice: ActiveVoice = {
      stop: (when) =>
        sound.sources.forEach((source) =>
          source.stop(Math.min(when, stopTime)),
        ),
    };
    let playing = sound.sources.length;
    sound.sources.forEach((source) => {
      source.onended = () => {
        playing -= 1;
        if (playing > 0) return;
        nodes.forEach((node) => node.disconnect());
        activeVoices.delete(voice);
      };
      source.start(start);
      source.stop(stopTime);
    });
    activeVoices.add(voice);
  };

  const dispose = () => {
    toggle += 1;
    enabled = false;
    clearSuspendTimer();
    if (!graph) return;
    const { ctx, master, compressor } = graph;
    activeVoices.forEach((voice) => voice.stop(0));
    activeVoices.clear();
    master.disconnect();
    compressor.disconnect();
    void ctx.close();
    graph = null;
  };

  return {
    get isEnabled() {
      return enabled;
    },
    enable,
    disable,
    currentTime: () => graph?.ctx.currentTime ?? null,
    play,
    dispose,
  };
};
