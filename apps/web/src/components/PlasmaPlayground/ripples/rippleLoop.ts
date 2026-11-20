export const TIME_SIGNATURES = ["3/4", "4/4", "5/4", "7/8"] as const;
export type TimeSignature = (typeof TIME_SIGNATURES)[number];

const STEPS_PER_QUARTER = 4;

/** Sixteenth-note steps per bar for the signature. */
const getStepCount = (signature: TimeSignature) => {
  const [beats, unit] = signature.split("/").map(Number);
  return (beats * STEPS_PER_QUARTER * 4) / unit;
};

export type LoopNote = {
  id: number;
  sourceId: number;
  /** First step of the note within the bar. */
  start: number;
  /** Length in steps. */
  length: number;
  /** MIDI note. */
  pitch: number;
};

export type NoteInput = Omit<LoopNote, "id">;

export type RecordedNote = {
  note: LoopNote;
  /** The note starts later in this bar, so the loop will fire it shortly. */
  isAhead: boolean;
};

export type RippleLoopOptions = {
  bpm: number;
  signature: TimeSignature;
};

export type RippleLoop = {
  readonly bpm: number;
  readonly stepSeconds: number;
  readonly stepCount: number;
  /** Playhead within the bar, in steps. */
  readonly position: number;
  readonly notes: ReadonlyArray<LoopNote>;
  /** Moves the playhead and returns the notes whose start it passed. */
  advance: (dtSeconds: number) => LoopNote[];
  addNote: (input: NoteInput) => LoopNote;
  /** Replaces all notes, e.g. with a saved setup, keeping their ids. */
  loadNotes: (saved: ReadonlyArray<LoopNote>) => void;
  /** Adds a note for the source on the step nearest to the playhead. */
  recordNote: (
    sourceId: number,
    options: Pick<LoopNote, "length" | "pitch">,
  ) => RecordedNote;
  moveNote: (id: number, start: number) => void;
  resizeNote: (id: number, length: number) => void;
  /** Sets start and length together, e.g. when dragging a note's start. */
  setNoteSpan: (id: number, start: number, length: number) => void;
  setNotePitch: (id: number, pitch: number) => void;
  removeNote: (id: number) => void;
  removeSource: (sourceId: number) => void;
  clear: () => void;
  setBpm: (bpm: number) => void;
  setSignature: (signature: TimeSignature) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createRippleLoop = ({
  bpm: initialBpm,
  signature: initialSignature,
}: RippleLoopOptions): RippleLoop => {
  let bpm = initialBpm;
  let stepCount = getStepCount(initialSignature);
  let notes: LoopNote[] = [];
  let position = 0;
  let nextId = 1;

  const stepSeconds = () => 60 / bpm / STEPS_PER_QUARTER;

  /** Keeps a note inside the bar: at least one step long, never past the end. */
  const fit = (note: LoopNote): LoopNote => {
    const start = clamp(Math.round(note.start), 0, stepCount - 1);
    const length = clamp(Math.round(note.length), 1, stepCount - start);
    return { ...note, start, length };
  };

  const update = (id: number, change: (note: LoopNote) => LoopNote) => {
    notes = notes.map((note) => (note.id === id ? change(note) : note));
  };

  const addNote = (input: NoteInput) => {
    const note = fit({ ...input, id: nextId++ });
    notes = [...notes, note];
    return note;
  };

  return {
    get bpm() {
      return bpm;
    },
    get stepSeconds() {
      return stepSeconds();
    },
    get stepCount() {
      return stepCount;
    },
    get position() {
      return position;
    },
    get notes() {
      return notes;
    },
    advance: (dtSeconds) => {
      const next = position + dtSeconds / stepSeconds();
      const fired: LoopNote[] = [];
      for (let k = Math.floor(position) + 1; k <= next; k++) {
        const step = k % stepCount;
        fired.push(...notes.filter((note) => note.start === step));
      }
      position = next % stepCount;
      return fired;
    },
    addNote,
    loadNotes: (saved) => {
      // A saved note keeps its length and shifts back into the bar if needed.
      notes = saved.map((note) => {
        const length = clamp(Math.round(note.length), 1, stepCount);
        const start = Math.min(note.start % stepCount, stepCount - length);
        return fit({ ...note, start, length });
      });
      nextId = Math.max(0, ...notes.map(({ id }) => id)) + 1;
    },
    recordNote: (sourceId, { length, pitch }) => {
      const nearest = Math.round(position);
      const note = addNote({
        sourceId,
        start: nearest % stepCount,
        length,
        pitch,
      });
      return { note, isAhead: nearest > position };
    },
    moveNote: (id, start) => {
      update(id, (note) => {
        const latest = stepCount - note.length;
        return { ...note, start: clamp(Math.round(start), 0, latest) };
      });
    },
    resizeNote: (id, length) => {
      update(id, (note) => fit({ ...note, length }));
    },
    setNoteSpan: (id, start, length) => {
      update(id, (note) => {
        const fitted = clamp(Math.round(length), 1, stepCount);
        return fit({
          ...note,
          start: Math.min(Math.round(start), stepCount - fitted),
          length: fitted,
        });
      });
    },
    setNotePitch: (id, pitch) => {
      update(id, (note) => ({ ...note, pitch }));
    },
    removeNote: (id) => {
      notes = notes.filter((note) => note.id !== id);
    },
    removeSource: (sourceId) => {
      notes = notes.filter((note) => note.sourceId !== sourceId);
    },
    clear: () => {
      notes = [];
    },
    setBpm: (value) => {
      bpm = value;
    },
    setSignature: (signature) => {
      stepCount = getStepCount(signature);
      notes = notes.map((note) =>
        fit({ ...note, start: note.start % stepCount }),
      );
      position %= stepCount;
    },
  };
};
