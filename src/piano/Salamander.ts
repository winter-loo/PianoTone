import { midiToNote } from "./Util";

export const githubURL = "https://tambien.github.io/Piano/Salamander/";
const AUDIO_EXTENSION = ".mp3";

export function getReleasesUrl(midi: number): string {
  return `rel${midi - 20}${AUDIO_EXTENSION}`;
}

export function getHarmonicsUrl(midi: number): string {
  return `harmS${midiToNote(midi).replace("#", "s")}${AUDIO_EXTENSION}`;
}

export function getNotesUrl(midi: number, vel: any): string {
  return `${midiToNote(midi).replace("#", "s")}v${vel}${AUDIO_EXTENSION}`;
}

/**
 * Maps velocity depths to Salamander velocities
 */
export const velocitiesMap: { [s: number]: number[] } = {
  1: [8],
  2: [6, 12],
  3: [1, 7, 15],
  4: [1, 5, 10, 15],
  5: [1, 4, 8, 12, 16],
  6: [1, 3, 7, 10, 13, 16],
  7: [1, 3, 6, 9, 11, 13, 16],
  8: [1, 3, 5, 7, 9, 11, 13, 16],
  9: [1, 3, 5, 7, 9, 11, 13, 15, 16],
  10: [1, 2, 3, 5, 7, 9, 11, 13, 15, 16],
  11: [1, 2, 3, 5, 7, 9, 11, 13, 14, 15, 16],
  12: [1, 2, 3, 4, 5, 7, 9, 11, 13, 14, 15, 16],
  13: [1, 2, 3, 4, 5, 7, 9, 11, 12, 13, 14, 15, 16],
  14: [1, 2, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16],
  15: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16],
  16: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
};

/**
 * All the notes of audio samples
 *   21: A0     22: A#0     23: B0
 *   24: C1     27: D#1     30: F#1      33: A1
 *   36: C2     39: D#2     42: F#2      45: A2
 *   48: C3     51: D#3     54: F#3      57: A3
 *   60: C4     63: D#4     66: F#4      69: A4
 *   72: C5     75: D#5     78: F#5      81: A5
 *   84: C6     87: D#6     90: F#6      93: A6
 *   96: C7     99: D#7     102: F#7     105: A7
 *   108: C8
 */
export const allNotes: number[] = [
  21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75,
  78, 81, 84, 87, 90, 93, 96, 99, 102, 105, 108,
];

export function getNotesInRange(min: number, max: number): number[] {
  return allNotes.filter((note) => min <= note && note <= max);
}

/**
 * Return min and max note number between octaves from 0 to 8
 *
 * @param min - The minimum octave (0-7)
 * @param max - The maximum octave (1-8)
 * @returns An object containing the minimum and maximum notes
 */
export function getMinmaxNotes(
  from: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  to: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
): { minNote: number; maxNote: number } {
  let minNote = 21;
  if (from >= 1) minNote = (from + 1) * 12;
  let maxNote = (to + 1) * 12;
  return { minNote, maxNote };
}

/**
 * All the notes of audio samples
 */
const harmonics: number[] = [
  21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75,
  78, 81, 84, 87,
];

export function getHarmonicsInRange(min: number, max: number): number[] {
  return harmonics.filter((note) => min <= note && note <= max);
}

export function inHarmonicsRange(note: number): boolean {
  return harmonics[0] <= note && note <= harmonics[harmonics.length - 1];
}
