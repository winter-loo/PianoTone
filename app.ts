import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import { Piano, getMinmaxNotes } from "./src/index";

const KEYBOARD_NOTES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
const VOLUME_COMPONENTS = ["strings", "harmonics", "pedal", "keybed"] as const;
type VolumeComponent = (typeof VOLUME_COMPONENTS)[number];

const MIDI_FILE = "./clair_de_lune.mid";
const KEY_PREVIEW_DURATION = 0.6;

declare global {
  interface Window {
    __tonePiano?: {
      piano: Piano;
      ready: Promise<[void, void]>;
    };
  }
}

// https://tambien.github.io/Piano/audio/A4v10.mp3
// for local development, you can download the audio files from the above repository
const piano = new Piano({
  url: "https://tambien.github.io/Piano/audio/",
  velocities: 3,
  pedal: false,
  ...getMinmaxNotes(4, 5),
}).toDestination();

const volumeParams: Record<VolumeComponent, Tone.Param<"decibels">> = {
  strings: piano.strings,
  harmonics: piano.harmonics,
  pedal: piano.pedal,
  keybed: piano.keybed,
};

const pianoLoadPromise = piano.load();
const midiReadyPromise = prepareMidiTimeline();
const bootstrapPromise = Promise.all([pianoLoadPromise, midiReadyPromise]);

if (typeof window !== "undefined") {
  window.__tonePiano = {
    piano,
    ready: bootstrapPromise,
  };
}

const midiParts: Tone.Part[] = [];
let autoStopEventId: number | null = null;
let playButtonRef: HTMLButtonElement | null = null;
let loadingBannerRef: HTMLElement | null = null;

Tone.getTransport().on("stop", () => {
  Tone.getTransport().seconds = 0;
  piano.stopAll();
  updatePlayButtonState();
});
Tone.getTransport().on("start", updatePlayButtonState);
Tone.getTransport().on("pause", updatePlayButtonState);

async function prepareMidiTimeline(): Promise<void> {
  try {
    const midi = await Midi.fromUrl(MIDI_FILE);
    const track = midi.tracks.find((t) => t.notes.length);

    if (!track) {
      throw new Error("No playable tracks found in the provided MIDI file.");
    }

    disposeMidiParts();
    cancelAutoStop();
    Tone.getTransport().cancel();
    Tone.getTransport().loop = false;
    Tone.getTransport().loopEnd = midi.duration;

    const tempoEvent = midi.header.tempos[0];
    if (tempoEvent) {
      Tone.getTransport().bpm.value = tempoEvent.bpm;
    }

    const sustainEvents = (track.controlChanges[64] ?? []).map((cc) => ({
      time: cc.time,
      value: cc.value,
    }));

    if (sustainEvents.length) {
      const sustainPart = new Tone.Part((time, event) => {
        const normalized = event.value > 1 ? event.value / 127 : event.value;
        if (normalized >= 0.5) {
          piano.pedalDown({ time });
        } else {
          piano.pedalUp({ time });
        }
      }, sustainEvents).start(0);
      midiParts.push(sustainPart);
    }

    const noteOnPart = new Tone.Part(
      (time, { note, velocity }) => {
        piano.keyDown({ note, time, velocity });
      },
      track.notes.map(({ name, velocity, time }) => ({
        note: name,
        velocity,
        time,
      })),
    ).start(0);
    midiParts.push(noteOnPart);

    const noteOffPart = new Tone.Part(
      (time, { note }) => {
        piano.keyUp({ note, time });
      },
      track.notes.map((note) => ({
        note: note.name,
        time: note.time + note.duration,
      })),
    ).start(0);
    midiParts.push(noteOffPart);

    scheduleAutoStop(midi.duration);
  } catch (error) {
    console.error("Unable to load MIDI file.", error);
    throw error;
  }
}

function scheduleAutoStop(duration: number) {
  autoStopEventId = Tone.getTransport().scheduleOnce(() => {
    Tone.getTransport().stop();
  }, duration + 0.1);
}

function cancelAutoStop() {
  if (autoStopEventId !== null) {
    Tone.getTransport().clear(autoStopEventId);
    autoStopEventId = null;
  }
}

function disposeMidiParts() {
  while (midiParts.length) {
    const part = midiParts.pop();
    part?.dispose();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  playButtonRef = document.querySelector(".play-btn");
  loadingBannerRef = document.getElementById("loading");

  setLoadingState("loading", "Loading piano samples…");
  setupAutoplayUnlock();
  attachPlayButton();
  setupVolumeControls();
  buildKeyboard();

  bootstrapPromise
    .then(() => {
      if (playButtonRef) {
        playButtonRef.disabled = false;
      }
      setLoadingState("ready", "Ready to play — press the button to listen.");
      updatePlayButtonState();
    })
    .catch((e) => {
      if (playButtonRef) {
        playButtonRef.disabled = true;
      }
      setLoadingState(
        "error",
        "Unable to load piano. Check the console for details.",
      );
      console.trace(e);
    });
});

function attachPlayButton() {
  if (!playButtonRef) {
    return;
  }

  playButtonRef.addEventListener("click", async () => {
    if (playButtonRef?.disabled) {
      return;
    }

    await Tone.start();

    if (Tone.getTransport().state === "started") {
      Tone.getTransport().stop();
      return;
    }

    Tone.getTransport().seconds = 0;
    Tone.getTransport().start("+0.05");
  });
}

function setupVolumeControls() {
  const sliders = document.querySelectorAll<HTMLInputElement>(
    '#volumes input[type="range"]',
  );

  sliders.forEach((slider) => {
    if (!isVolumeComponent(slider.name)) {
      return;
    }
    updateVolumeDisplay(slider.name, Number(slider.value));
    slider.addEventListener("input", () => handleVolumeInput(slider));
  });
}

function handleVolumeInput(slider: HTMLInputElement) {
  if (!isVolumeComponent(slider.name)) {
    return;
  }

  const value = Number(slider.value);
  if (Number.isNaN(value)) {
    return;
  }

  volumeParams[slider.name].value = value;
  updateVolumeDisplay(slider.name, value);
}

function updateVolumeDisplay(component: VolumeComponent, value: number) {
  const output = document.querySelector<HTMLOutputElement>(
    `[data-volume-display="${component}"]`,
  );
  if (output) {
    output.textContent = `${value} dB`;
  }
}

function isVolumeComponent(value: string): value is VolumeComponent {
  return (VOLUME_COMPONENTS as ReadonlyArray<string>).includes(value);
}

function buildKeyboard() {
  const container = document.getElementById("piano-keyboard");
  const template = document.getElementById(
    "piano-key-template",
  ) as HTMLTemplateElement | null;
  if (!container || !template) {
    return;
  }

  KEYBOARD_NOTES.forEach((note) => {
    const keyClone = template.content.cloneNode(true) as DocumentFragment;
    const keyElement = keyClone.querySelector<HTMLElement>(".piano-key");
    const keyLabel = keyClone.querySelector<HTMLElement>(".piano-key-label");

    if (keyElement) {
      keyElement.setAttribute("data-note", note);
      keyElement.setAttribute("aria-label", `Play ${note}`);
      keyElement.dataset.note = note;
    }

    if (keyLabel) {
      keyLabel.textContent = note;
    }

    container.appendChild(keyClone);
  });

  container.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const key = target.closest<HTMLElement>("[data-note]");
    const note = key?.dataset.note;

    if (!note || !piano.loaded) {
      return;
    }

    void previewNote(note);
  });
}

async function previewNote(note: string) {
  await Tone.start();
  if (!piano.loaded) {
    return;
  }

  const now = Tone.now();
  piano.keyDown({ note, time: now, velocity: 0.85 });
  piano.keyUp({ note, time: now + KEY_PREVIEW_DURATION, velocity: 0.6 });
}

function updatePlayButtonState() {
  if (!playButtonRef) {
    return;
  }

  const label = Tone.getTransport().state === "started" ? "Stop" : "Play";
  playButtonRef.textContent = label;
}

function setLoadingState(
  state: "loading" | "ready" | "error",
  message: string,
) {
  if (!loadingBannerRef) {
    return;
  }

  const indicator =
    loadingBannerRef.querySelector<HTMLElement>(".loading-indicator");
  const text = loadingBannerRef.querySelector<HTMLElement>(".loading-text");

  if (text) {
    text.textContent = message;
  }

  if (indicator) {
    indicator.classList.toggle("hidden", state !== "loading");
  }

  loadingBannerRef.dataset.state = state;
}

function setupAutoplayUnlock() {
  const resume = () => {
    Tone.start().catch(() => undefined);
  };

  document.addEventListener("pointerdown", resume, { once: true });
  document.addEventListener("keydown", resume, { once: true });
}
