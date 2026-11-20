import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const ripplesModule = (name) =>
  loadTs(
    new URL(
      `../apps/web/src/components/PlasmaPlayground/ripples/${name}.ts`,
      import.meta.url,
    ),
  );

const { createWaveFieldEngine } = ripplesModule("createWaveFieldEngine");
const { createSandLayer } = ripplesModule("sandLayer");
const { createRippleLoop } = ripplesModule("rippleLoop");
const {
  getBounceAmplitude,
  getPlateDamping,
  getLfoCurve,
  toVibration,
  NOTE_VALUES,
} = ripplesModule("sourceSound");

const WIDTH = 121;
const HEIGHT = 61;
const SPEED = 20;
const FRAME = 1 / 60;
const WATER_DAMPING = 0.6;
const SAND_DAMPING = 4;

const runFor = (engine, seconds) => {
  for (let t = 0; t < seconds - 1e-9; t += FRAME) engine.step(FRAME);
};

const sine =
  (frequency, amplitude = 1) =>
  (seconds) =>
    amplitude * Math.sin(2 * Math.PI * frequency * seconds);

const maxAbs = (values) => values.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

const wavefrontDistance = (engine) => {
  const cy = Math.floor(HEIGHT / 2);
  const cx = Math.floor(WIDTH / 2);
  let best = 0;
  let bestDistance = 0;
  for (let x = cx + 4; x < WIDTH; x++) {
    const value = Math.abs(engine.height[cy * WIDTH + x]);
    if (value > best) {
      best = value;
      bestDistance = x - cx;
    }
  }
  return bestDistance;
};

for (const [name, create] of [["wave field", createWaveFieldEngine]]) {
  test(`${name} ripples travel outward at the configured speed`, () => {
    const engine = create({
      width: WIDTH,
      height: HEIGHT,
      cellAspect: 1,
      speed: SPEED,
      damping: WATER_DAMPING,
    });
    engine.emit(Math.floor(WIDTH / 2), Math.floor(HEIGHT / 2));
    runFor(engine, 1);
    const distance = wavefrontDistance(engine);
    assert.ok(
      Math.abs(distance - SPEED) <= SPEED * 0.3,
      `wavefront at ${distance} cells, expected about ${SPEED}`,
    );
  });

  test(`${name} ripples fade out when no source fires`, () => {
    const engine = create({
      width: WIDTH,
      height: HEIGHT,
      cellAspect: 1,
      speed: SPEED,
      damping: WATER_DAMPING,
    });
    engine.emit(Math.floor(WIDTH / 2), Math.floor(HEIGHT / 2));
    runFor(engine, 0.25);
    const early = maxAbs(engine.height);
    runFor(engine, 12);
    assert.ok(early > 0.1, `ripple too weak to see: ${early}`);
    assert.ok(maxAbs(engine.height) < early * 0.05);
  });

  test(`${name} ripples die out within a second in sand`, () => {
    const engine = create({
      width: WIDTH,
      height: HEIGHT,
      cellAspect: 1,
      speed: SPEED,
      damping: WATER_DAMPING,
    });
    engine.setDamping(SAND_DAMPING);
    engine.emit(Math.floor(WIDTH / 2), Math.floor(HEIGHT / 2));
    runFor(engine, 0.25);
    const early = maxAbs(engine.height);
    runFor(engine, 0.75);
    assert.ok(maxAbs(engine.height) < early * 0.1);
  });
}

for (const [name, create] of [["wave field", createWaveFieldEngine]]) {
  test(`${name} repeated pulses do not lift the whole surface`, () => {
    const engine = create({
      width: WIDTH,
      height: HEIGHT,
      cellAspect: 7 / 12,
      speed: SPEED,
      damping: WATER_DAMPING,
    });
    for (let pulse = 0; pulse < 16; pulse++) {
      engine.emit(20 + ((pulse * 37) % 80), 10 + ((pulse * 23) % 40));
      runFor(engine, 0.25);
    }
    runFor(engine, 2);
    const mean =
      engine.height.reduce((sum, v) => sum + v, 0) / engine.height.length;
    assert.ok(Math.abs(mean) < 0.01, `surface lifted by ${mean}`);
  });
}

test("jittering frame times keep the wave field stable", () => {
  const engine = createWaveFieldEngine({
    width: 204,
    height: 65,
    cellAspect: 7 / 12,
    speed: 18,
    damping: WATER_DAMPING,
  });
  let seed = 1;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let elapsed = 0;
  let nextPulse = 0;
  while (elapsed < 10) {
    if (elapsed >= nextPulse) {
      engine.emit(
        40 + Math.floor(random() * 120),
        10 + Math.floor(random() * 45),
      );
      nextPulse += 0.3;
    }
    // Browser frames hover around 16 ms and straddle the simulation's sub-step size.
    const dt = 0.0105 + random() * 0.01;
    engine.step(dt);
    elapsed += dt;
  }
  assert.ok(
    maxAbs(engine.height) < 5,
    `field reached ${maxAbs(engine.height)}`,
  );
});

test("a humming source makes the surface oscillate at its frequency", () => {
  const engine = createWaveFieldEngine({
    width: WIDTH,
    height: HEIGHT,
    cellAspect: 1,
    speed: SPEED,
    damping: WATER_DAMPING,
  });
  const frequency = 2;
  engine.setOscillators([
    {
      x: Math.floor(WIDTH / 2),
      y: Math.floor(HEIGHT / 2),
      signal: sine(frequency),
    },
  ]);
  runFor(engine, 3);
  const probe = Math.floor(HEIGHT / 2) * WIDTH + Math.floor(WIDTH / 2) + 10;
  let crossings = 0;
  let previous = engine.height[probe];
  let peak = 0;
  for (let t = 0; t < 2; t += FRAME) {
    engine.step(FRAME);
    const value = engine.height[probe];
    if (Math.sign(value) !== Math.sign(previous) && value !== 0) crossings++;
    previous = value;
    peak = Math.max(peak, maxAbs(engine.height));
  }
  assert.ok(
    Math.abs(crossings - 2 * frequency * 2) <= 2,
    `${crossings} zero crossings`,
  );
  assert.ok(peak > 0.1 && peak < 5, `peak ${peak}`);
});

test("two sources can vibrate at their own frequencies", () => {
  const engine = createWaveFieldEngine({
    width: WIDTH,
    height: HEIGHT,
    cellAspect: 1,
    speed: SPEED,
    damping: WATER_DAMPING,
  });
  engine.setOscillators([
    { x: 20, y: 30, signal: sine(1) },
    { x: 100, y: 30, signal: sine(4) },
  ]);
  const crossingsAt = (index) => {
    let crossings = 0;
    let previous = engine.height[index];
    for (let t = 0; t < 2; t += FRAME) {
      engine.step(FRAME);
      const value = engine.height[index];
      if (Math.sign(value) !== Math.sign(previous) && value !== 0) crossings++;
      previous = value;
    }
    return crossings;
  };
  runFor(engine, 0.5);
  const slow = crossingsAt(30 * WIDTH + 20);
  const fast = crossingsAt(30 * WIDTH + 100);
  assert.ok(Math.abs(slow - 4) <= 1, `slow source crossed ${slow} times`);
  assert.ok(Math.abs(fast - 16) <= 2, `fast source crossed ${fast} times`);
});

test("removing the humming sources lets the surface settle", () => {
  const engine = createWaveFieldEngine({
    width: WIDTH,
    height: HEIGHT,
    cellAspect: 1,
    speed: SPEED,
    damping: WATER_DAMPING,
  });
  engine.setOscillators([{ x: 30, y: 30, signal: sine(2) }]);
  runFor(engine, 2);
  engine.setOscillators([]);
  runFor(engine, 12);
  assert.ok(maxAbs(engine.height) < 0.05);
});

const luminanceOf = (layer, wave, mode) => {
  const out = new Uint8Array(wave.length);
  layer.writeLuminance(wave, mode, out);
  return out;
};

const shake = (layer, wave, mode, seconds, shakenCells) => {
  for (let f = 0; f * FRAME < seconds; f++) {
    for (const i of shakenCells) wave[i] = f % 2 === 0 ? 1 : -1;
    layer.update(wave, FRAME, mode);
  }
};

const columnBrightness = (out, width, height, column) => {
  let sum = 0;
  for (let y = 0; y < height; y++) sum += out[y * width + column];
  return sum / height;
};

for (const mode of ["sand", "cymatics"]) {
  test(`${mode} grains drift out of shaking areas and gather where it is calm`, () => {
    const width = 40;
    const height = 20;
    const layer = createSandLayer(width, height, 1);
    const wave = new Float32Array(width * height);
    const leftHalf = Array.from({ length: width * height }, (_, i) => i).filter(
      (i) => i % width < width / 2,
    );
    shake(layer, wave, mode, 3, leftHalf);
    wave.fill(0);
    const out = luminanceOf(layer, wave, mode);
    let left = 0;
    let right = 0;
    for (let x = 0; x < width; x++) {
      const brightness = columnBrightness(out, width, height, x);
      if (x < width / 2) left += brightness;
      else right += brightness;
    }
    assert.ok(right > left * 2, `left ${left}, right ${right}`);
  });

  test(`${mode} sand stays where it landed while nothing shakes`, () => {
    const layer = createSandLayer(30, 15, 1);
    const wave = new Float32Array(30 * 15);
    shake(layer, wave, mode, 1, [100, 101, 130, 131]);
    wave.fill(0);
    const settled = luminanceOf(layer, wave, mode);
    shake(layer, wave, mode, 5, []);
    assert.deepEqual(luminanceOf(layer, wave, mode), settled);
  });
}

test("faint after-ripples are too weak to move the sand", () => {
  const layer = createSandLayer(30, 15, 1);
  const wave = new Float32Array(30 * 15);
  const before = luminanceOf(layer, wave, "sand");
  const everywhere = Array.from({ length: 30 * 15 }, (_, i) => i);
  for (let f = 0; f * FRAME < 2; f++) {
    for (const i of everywhere) wave[i] = f % 2 === 0 ? 0.05 : -0.05;
    layer.update(wave, FRAME, "sand");
  }
  wave.fill(0);
  assert.deepEqual(luminanceOf(layer, wave, "sand"), before);
});

test("a still line between shaking areas collects the sand", () => {
  const size = 21;
  const layer = createSandLayer(size, size, 1);
  const wave = new Float32Array(size * size);
  const shaking = Array.from({ length: size * size }, (_, i) => i).filter(
    (i) => i % size !== 10,
  );
  shake(layer, wave, "cymatics", 3, shaking);
  const out = luminanceOf(layer, wave, "cymatics");
  assert.ok(
    columnBrightness(out, size, size, 10) >
      columnBrightness(out, size, size, 5) + 50,
  );
});

test("clearing spreads the sand evenly again", () => {
  const layer = createSandLayer(30, 15, 1);
  const wave = new Float32Array(30 * 15);
  const fresh = luminanceOf(layer, wave, "sand");
  shake(layer, wave, "sand", 2, [100, 101, 130, 131]);
  layer.reset();
  wave.fill(0);
  assert.deepEqual(luminanceOf(layer, wave, "sand"), fresh);
});

for (const mode of ["waves", "jello"]) {
  test(`${mode} mode shows only the moving surface`, () => {
    const layer = createSandLayer(10, 10, 1);
    const wave = new Float32Array(100);
    shake(layer, wave, mode, 1, [55]);
    wave.fill(0);
    assert.ok(luminanceOf(layer, wave, mode).every((v) => v === 0));
    wave[55] = 0.5;
    assert.ok(luminanceOf(layer, wave, mode)[55] > 0);
  });
}

const createLoop = () => createRippleLoop({ bpm: 120, signature: "4/4" });
const startsOf = (notes) =>
  notes.map(({ sourceId, start }) => [sourceId, start]);

test("a click becomes a note on the nearest step of the bar", () => {
  const loop = createLoop();
  assert.equal(loop.stepSeconds, 0.125);
  assert.equal(loop.stepCount, 16);
  loop.advance(0.3);
  const first = loop.recordNote(7, { length: 4, pitch: 62 });
  assert.equal(first.note.start, 2);
  assert.equal(first.note.length, 4);
  assert.equal(first.note.pitch, 62);
  assert.equal(first.isAhead, false);
  loop.advance(0.03);
  assert.equal(loop.recordNote(8, { length: 1, pitch: 60 }).isAhead, true);
});

test("notes fire when the playhead reaches their start, every bar", () => {
  const loop = createLoop();
  loop.addNote({ sourceId: 1, start: 2, length: 1, pitch: 60 });
  loop.addNote({ sourceId: 2, start: 2, length: 3, pitch: 60 });
  loop.addNote({ sourceId: 3, start: 8, length: 2, pitch: 60 });
  assert.deepEqual(startsOf(loop.advance(0.25)), [
    [1, 2],
    [2, 2],
  ]);
  assert.deepEqual(startsOf(loop.advance(0.75)), [[3, 8]]);
  assert.deepEqual(startsOf(loop.advance(1.25)), [
    [1, 2],
    [2, 2],
  ]);
});

test("notes stretch and move only within the bar", () => {
  const loop = createLoop();
  const note = loop.addNote({ sourceId: 1, start: 12, length: 2, pitch: 60 });
  loop.resizeNote(note.id, 10);
  assert.equal(loop.notes[0].length, 4);
  loop.resizeNote(note.id, 0);
  assert.equal(loop.notes[0].length, 1);
  loop.resizeNote(note.id, 3);
  loop.moveNote(note.id, 15);
  assert.equal(loop.notes[0].start, 13);
  loop.moveNote(note.id, -4);
  assert.equal(loop.notes[0].start, 0);
});

test("a note's start can be dragged while its end stays put", () => {
  const loop = createLoop();
  const note = loop.addNote({ sourceId: 1, start: 4, length: 4, pitch: 60 });
  loop.setNoteSpan(note.id, 2, 6);
  assert.deepEqual([loop.notes[0].start, loop.notes[0].length], [2, 6]);
  loop.setNoteSpan(note.id, 14, 4);
  assert.deepEqual([loop.notes[0].start, loop.notes[0].length], [12, 4]);
});

test("restored notes keep their ids and new notes get fresh ones", () => {
  const loop = createLoop();
  loop.loadNotes([
    { id: 7, sourceId: 1, start: 2, length: 3, pitch: 64 },
    { id: 9, sourceId: 2, start: 30, length: 3, pitch: 60 },
  ]);
  assert.deepEqual(
    loop.notes.map(({ id, start }) => [id, start]),
    [
      [7, 2],
      [9, 13],
    ],
  );
  assert.equal(
    loop.addNote({ sourceId: 1, start: 0, length: 1, pitch: 60 }).id,
    10,
  );
});

test("a note's pitch can be changed", () => {
  const loop = createLoop();
  const note = loop.addNote({ sourceId: 1, start: 0, length: 1, pitch: 60 });
  loop.setNotePitch(note.id, 66);
  assert.equal(loop.notes[0].pitch, 66);
});

test("changing the tempo keeps the playhead in place", () => {
  const loop = createLoop();
  loop.advance(0.5);
  loop.setBpm(60);
  assert.equal(loop.position, 4);
  loop.advance(0.25);
  assert.equal(loop.position, 5);
});

test("a shorter time signature wraps notes into the new bar", () => {
  const loop = createLoop();
  loop.addNote({ sourceId: 5, start: 14, length: 2, pitch: 60 });
  loop.addNote({ sourceId: 6, start: 8, length: 8, pitch: 60 });
  loop.setSignature("3/4");
  assert.equal(loop.stepCount, 12);
  assert.equal(loop.notes[0].start, 2);
  assert.equal(loop.notes[1].start, 8);
  assert.equal(loop.notes[1].length, 4);
  loop.setSignature("7/8");
  assert.equal(loop.stepCount, 14);
});

test("removing a note or its source stops it firing", () => {
  const loop = createLoop();
  const kept = loop.addNote({ sourceId: 1, start: 4, length: 1, pitch: 60 });
  const removed = loop.addNote({ sourceId: 2, start: 4, length: 1, pitch: 60 });
  loop.addNote({ sourceId: 3, start: 6, length: 1, pitch: 60 });
  loop.removeNote(removed.id);
  loop.removeSource(3);
  assert.deepEqual(
    loop.advance(2).map(({ id }) => id),
    [kept.id],
  );
});

test("clearing the loop removes every note", () => {
  const loop = createLoop();
  loop.addNote({ sourceId: 1, start: 4, length: 1, pitch: 60 });
  loop.clear();
  assert.deepEqual(loop.advance(4), []);
});

test("a bounce lasts one note of the current tempo", () => {
  const quarter = { rate: "1/4", decay: 0, strength: 1 };
  assert.equal(toVibration(quarter, 120, 1).frequency, 2);
  assert.equal(toVibration(quarter, 60, 1).frequency, 1);
  assert.equal(toVibration({ ...quarter, rate: "1/8T" }, 120, 1).frequency, 6);
  assert.ok(
    Math.abs(
      toVibration({ ...quarter, rate: "1/4." }, 120, 1).frequency - 4 / 3,
    ) < 1e-9,
  );
  assert.equal(toVibration({ ...quarter, rate: "1/1" }, 120, 1).frequency, 0.5);
});

test("the rate slices a note into bounces", () => {
  const sound = { rate: "1/8", decay: 0, strength: 1 };
  assert.equal(toVibration(sound, 120, 1).bounces, 2);
  assert.equal(toVibration(sound, 120, 3).bounces, 6);
  assert.ok(
    Math.abs(toVibration({ ...sound, rate: "1/4." }, 120, 2).bounces - 4 / 3) <
      1e-9,
  );
  const vibration = toVibration(sound, 120, 1);
  assert.ok(getBounceAmplitude(vibration, 0.49) !== null);
  assert.equal(getBounceAmplitude(vibration, 0.5), null);
});

test("the LFO swells once per bounce and fades with decay", () => {
  const vibration = toVibration(
    { rate: "1/8", decay: 0.75, strength: 4 },
    120,
    2,
  );
  const curve = getLfoCurve(vibration, 400);
  assert.equal(curve[0], 0);
  assert.ok(curve.every((value) => value >= 0 && value <= 1));
  let swells = 0;
  for (let i = 1; i < curve.length - 1; i++) {
    if (curve[i] > curve[i - 1] && curve[i] >= curve[i + 1] && curve[i] > 0.05)
      swells++;
  }
  assert.equal(swells, 4);
  assert.ok(Math.max(...curve.slice(0, 100)) > Math.max(...curve.slice(300)));
});

test("note rates are offered from the longest to the shortest bounce", () => {
  const beats = NOTE_VALUES.map(({ beats }) => beats);
  assert.deepEqual(
    beats,
    [...beats].sort((a, b) => b - a),
  );
  assert.equal(NOTE_VALUES.length, 8);
});

const sound = { frequency: 2, bounces: 4, decay: 0.75, strength: 1 };

test("a source bounces the set number of times at its frequency", () => {
  assert.equal(getBounceAmplitude(sound, 0), 1);
  assert.ok(getBounceAmplitude(sound, 1.99) !== null);
  assert.equal(getBounceAmplitude(sound, 2), null);
  assert.equal(getBounceAmplitude({ ...sound, bounces: 1 }, 0.6), null);
});

test("decay fades the vibration smoothly, starting with the first bounce", () => {
  const single = { ...sound, bounces: 1, decay: 0.5 };
  assert.ok(Math.abs(getBounceAmplitude(single, 0.25) - Math.sqrt(0.5)) < 1e-9);
  assert.ok(getBounceAmplitude(sound, 0.2) < getBounceAmplitude(sound, 0.1));
});

test("decay ends the run of bounces at 1 - decay of the strength", () => {
  assert.ok(Math.abs(getBounceAmplitude(sound, 2 - 1e-9) - 0.25) < 1e-6);
});

test("without decay every bounce is equally strong", () => {
  const even = { ...sound, decay: 0, strength: 1.5 };
  assert.equal(getBounceAmplitude(even, 0.1), 1.5);
  assert.equal(getBounceAmplitude(even, 1.9), 1.5);
});

test("sand swallows ripples faster than water", () => {
  assert.ok(getPlateDamping("sand", sound) > getPlateDamping("waves", sound));
});

test("higher decay swallows the ripples faster", () => {
  assert.ok(
    getPlateDamping("sand", { ...sound, decay: 0.9 }) >
      getPlateDamping("sand", { ...sound, decay: 0.1 }),
  );
});

test("a longer run of bounces lets the ripples linger longer", () => {
  assert.ok(
    getPlateDamping("sand", { ...sound, bounces: 8 }) <
      getPlateDamping("sand", { ...sound, bounces: 1 }),
  );
});

const {
  getWaveformSamples,
  getWaveHandles,
  rateFromCycleEnd,
  strengthFromEnvelopeHeight,
  decayFromEnvelopeRatio,
} = ripplesModule("waveformGeometry");

test("the LFO view spans exactly one note", () => {
  const vibration = { frequency: 2, bounces: 2, decay: 0, strength: 1 };
  const samples = getWaveformSamples(vibration, 300);
  const lastTenth = samples.slice(270);
  assert.ok(Math.max(...lastTenth.map(Math.abs)) > 0.1);
  assert.ok(Math.max(...samples) > 0.95);
  assert.equal(samples.length, 300);
});

test("the envelope handles sit at the start and the end of the bounces", () => {
  const handles = getWaveHandles(sound);
  assert.deepEqual(handles.envelopeStart, { seconds: 0, amplitude: 1 });
  assert.equal(handles.envelopeEnd.seconds, 2);
  assert.ok(Math.abs(handles.envelopeEnd.amplitude - 0.25) < 1e-9);
  assert.equal(handles.cycleEnd.seconds, 0.5);
});

test("dragging the first cycle snaps the bounce to the nearest note", () => {
  assert.equal(rateFromCycleEnd(1), "1/4");
  assert.equal(rateFromCycleEnd(0.3), "1/8T");
  assert.equal(rateFromCycleEnd(1.45), "1/4.");
  assert.equal(rateFromCycleEnd(10), "1/1");
});

test("dragging the envelope sets strength and decay", () => {
  assert.equal(strengthFromEnvelopeHeight(1), 4);
  assert.equal(strengthFromEnvelopeHeight(0.5), 2);
  assert.equal(strengthFromEnvelopeHeight(0), 0.2);
  assert.equal(decayFromEnvelopeRatio(0.5), 0.5);
  assert.equal(decayFromEnvelopeRatio(1.4), 0);
  assert.equal(decayFromEnvelopeRatio(0), 0.95);
});

test("resetting the field flattens the surface but keeps it running", () => {
  const engine = createWaveFieldEngine({
    width: WIDTH,
    height: HEIGHT,
    cellAspect: 1,
    speed: SPEED,
    damping: WATER_DAMPING,
  });
  engine.emit(40, 30);
  runFor(engine, 0.5);
  engine.reset();
  assert.equal(maxAbs(engine.height), 0);
  runFor(engine, 0.5);
  assert.equal(maxAbs(engine.height), 0);
  engine.emit(40, 30);
  runFor(engine, 0.25);
  assert.ok(maxAbs(engine.height) > 0.1);
});

test("a source held at rest after its bounce stops ringing on its spot", () => {
  const engine = createWaveFieldEngine({
    width: WIDTH,
    height: HEIGHT,
    cellAspect: 1,
    speed: SPEED,
    damping: WATER_DAMPING,
  });
  const spot = { x: 60, y: 30 };
  engine.setOscillators([{ ...spot, signal: sine(2) }]);
  runFor(engine, 0.5);
  engine.setOscillators([{ ...spot, signal: () => 0 }]);
  let passingRing = 0;
  for (let t = 0; t < 1.5; t += FRAME) {
    engine.step(FRAME);
    passingRing = Math.max(
      passingRing,
      Math.abs(engine.height[30 * WIDTH + 80]),
    );
  }
  assert.ok(passingRing > 0.05, `ring never reached the probe: ${passingRing}`);
  assert.ok(Math.abs(engine.height[30 * WIDTH + 60]) < 0.01);
  let ringing = 0;
  for (let t = 0; t < 1; t += FRAME) {
    engine.step(FRAME);
    ringing = Math.max(ringing, Math.abs(engine.height[30 * WIDTH + 60]));
  }
  assert.ok(ringing < 0.01, `source spot still rings at ${ringing}`);
});

const {
  TIMBRES,
  getLfoTargets,
  getMidiFrequency,
  getNoteName,
  stepPitch,
  SCALES,
  MIN_PITCH,
  MAX_PITCH,
} = ripplesModule("timbres");

test("every timbre offers volume and only the modulations that change it", () => {
  for (const timbre of TIMBRES) {
    assert.ok(getLfoTargets(timbre).includes("volume"), timbre);
  }
  assert.deepEqual(getLfoTargets("sine"), ["volume", "pitch"]);
  assert.ok(!getLfoTargets("noise").includes("pitch"));
  assert.ok(getLfoTargets("saw").includes("lowpass"));
  assert.ok(getLfoTargets("hihat").includes("highpass"));
});

test("pitches are named and tuned like MIDI notes", () => {
  assert.equal(getMidiFrequency(69), 440);
  assert.ok(Math.abs(getMidiFrequency(60) - 261.63) < 0.01);
  assert.equal(getNoteName(60), "C4");
  assert.equal(getNoteName(70), "A#4");
});

test("stepping a pitch moves to the next tone of the scale", () => {
  const scale = { root: "C", scale: "minor-pentatonic" };
  assert.equal(stepPitch(60, 1, scale), 63);
  assert.equal(stepPitch(63, -1, scale), 60);
  assert.equal(stepPitch(60, 1, { root: "C", scale: "major" }), 62);
  assert.equal(stepPitch(60, 1, { root: "D", scale: "major" }), 61);
});

test("a pitch outside the scale snaps onto it with the next step", () => {
  const scale = { root: "C", scale: "minor-pentatonic" };
  assert.equal(stepPitch(61, 1, scale), 63);
  assert.equal(stepPitch(61, -1, scale), 60);
});

test("pitch steps stay within the playable range", () => {
  const scale = { root: "C", scale: "chromatic" };
  assert.equal(stepPitch(MAX_PITCH, 1, scale), MAX_PITCH);
  assert.equal(stepPitch(MIN_PITCH, -1, scale), MIN_PITCH);
  assert.ok(Object.keys(SCALES).includes("minor-pentatonic"));
});

const { parseRipplesSetup, serializeRipplesSetup } =
  ripplesModule("ripplesSetup");

const savedSetup = {
  mode: "sand",
  bpm: 100,
  signature: "3/4",
  root: "A",
  scale: "dorian",
  sources: [
    {
      id: 3,
      x: 0.25,
      y: 0.5,
      rate: "1/8",
      decay: 0.5,
      strength: 2,
      timbre: "bass",
      lfoTarget: "lowpass",
      muted: true,
      pitch: 64,
    },
  ],
  notes: [{ id: 7, sourceId: 3, start: 2, length: 3, pitch: 66 }],
};

test("a ripples setup survives saving and loading", () => {
  assert.deepEqual(
    parseRipplesSetup(serializeRipplesSetup(savedSetup)),
    savedSetup,
  );
});

test("unreadable saved setups are ignored", () => {
  assert.equal(parseRipplesSetup(null), null);
  assert.equal(parseRipplesSetup("not json"), null);
  assert.equal(parseRipplesSetup(JSON.stringify({ version: 99 })), null);
});

test("broken parts of a saved setup are repaired or dropped", () => {
  const raw = JSON.stringify({
    version: 2,
    ...savedSetup,
    bpm: 999,
    sources: [
      {
        ...savedSetup.sources[0],
        x: 4,
        timbre: "sine",
        lfoTarget: "lowpass",
        muted: "yes",
      },
      { id: 4, x: 0.5 },
    ],
    notes: [
      ...savedSetup.notes,
      { id: 8, sourceId: 99, start: 0, length: 1, pitch: 60 },
    ],
  });
  const setup = parseRipplesSetup(raw);
  assert.equal(setup.bpm, 180);
  assert.equal(setup.sources.length, 1);
  assert.equal(setup.sources[0].x, 1);
  assert.equal(setup.sources[0].lfoTarget, "volume");
  assert.equal(setup.sources[0].muted, false);
  assert.deepEqual(
    setup.notes.map(({ id }) => id),
    [7],
  );
});

const {
  getPlateFrequency,
  getPlatePartials,
  getPartialWeights,
  createPlateSignal,
  createHumSignal,
  MAX_PLATE_HZ,
} = ripplesModule("plateVoice");

test("a note shakes the plate at a slowed-down copy of its pitch", () => {
  assert.equal(getPlateFrequency(60), 3);
  assert.equal(getPlateFrequency(72), 6);
  assert.equal(getPlateFrequency(48), 1.5);
});

test("a sine shakes the plate with one frequency, richer timbres with more", () => {
  assert.equal(getPlatePartials("sine", 60).length, 1);
  assert.ok(getPlatePartials("saw", 60).length >= 3);
  assert.ok(getPlatePartials("square", 60).length >= 2);
  assert.equal(getPlatePartials("noise", 60).length, 0);
});

test("overtones the plate cannot show are left out", () => {
  const high = getPlatePartials("saw", 84);
  assert.ok(high.every(({ frequency }) => frequency <= MAX_PLATE_HZ));
  assert.ok(high.length >= 1);
  assert.ok(high.length < getPlatePartials("saw", 48).length);
});

test("the low-pass LFO lets overtones in as it opens, high-pass takes them out", () => {
  const partials = getPlatePartials("saw", 48);
  const closed = getPartialWeights("lowpass", 0, partials);
  const open = getPartialWeights("lowpass", 1, partials);
  assert.ok(closed[0] > 0 && closed.slice(1).every((weight) => weight === 0));
  assert.ok(open.every((weight) => weight > 0));
  const highpassed = getPartialWeights("highpass", 1, partials);
  assert.ok(highpassed[0] < highpassed.at(-1));
});

const plateNote = (timbre, lfoTarget = "volume") =>
  createPlateSignal({
    timbre,
    pitch: 60,
    lfoTarget,
    vibration: { frequency: 2, bounces: 2, decay: 0, strength: 2 },
    seed: 1,
  });

const sampleSignal = (signal, seconds, rate = 240) =>
  Array.from({ length: Math.round(seconds * rate) }, (_, i) =>
    signal(i / rate),
  );

test("a plate note stops when the note ends", () => {
  const signal = plateNote("sine");
  assert.notEqual(signal(0.5), null);
  assert.equal(signal(1.01), null);
});

test("different timbres shake the plate differently", () => {
  const sine = sampleSignal(plateNote("sine", "pitch"), 0.99);
  const square = sampleSignal(plateNote("square", "pitch"), 0.99);
  const noise = sampleSignal(plateNote("noise"), 0.99);
  const difference = (a, b) =>
    a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
  assert.ok(difference(sine, square) > 0.05);
  assert.ok(difference(sine, noise) > 0.05);
});

test("a humming source keeps shaking with its timbre", () => {
  const hum = createHumSignal({
    timbre: "sine",
    pitch: 60,
    strength: 1,
    seed: 1,
  });
  const samples = sampleSignal(hum, 2);
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if (Math.sign(samples[i]) !== Math.sign(samples[i - 1])) crossings++;
  }
  assert.ok(Math.abs(crossings - 12) <= 1, `${crossings} crossings`);
  assert.ok(Math.max(...samples) > 0.9);
});

test("while a note plays the plate rings long enough for standing waves", () => {
  const vibration = { frequency: 2, bounces: 1, decay: 0.9, strength: 1 };
  assert.ok(
    getPlateDamping("sand", vibration, { playing: true }) <
      getPlateDamping("sand", vibration, { playing: false }) / 3,
  );
});

test("overtones get a louder share on the plate so they draw their own lines", () => {
  const [fundamental, , , , fifth] = getPlatePartials("saw", 48);
  assert.equal(fundamental.gain, 1);
  assert.ok(Math.abs(fifth.gain) > 0.4);
  assert.ok(Math.abs(fifth.gain) < 1);
});
