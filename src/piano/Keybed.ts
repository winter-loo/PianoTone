import { Gain, ToneAudioBuffers, ToneBufferSource } from "tone";
import { PianoComponent, PianoComponentOptions, UrlsMap } from "./Component";
import { getReleasesUrl } from "./Salamander";
import { randomBetween } from "./Util";

interface KeybedOptions extends PianoComponentOptions {
  minNote: number;
  maxNote: number;
}

export class Keybed extends PianoComponent {
  /**
   * All of the buffers of keybed clicks
   */
  private _buffers?: ToneAudioBuffers;

  /**
   * The urls to load
   */
  private _urls: UrlsMap = {};

  constructor(options: KeybedOptions) {
    super(options);

    for (let i = options.minNote; i <= options.maxNote; i++) {
      this._urls[i] = getReleasesUrl(i);
    }
  }

  protected _internalLoad(): Promise<void> {
    return new Promise((success, reject) => {
      this._buffers = new ToneAudioBuffers({
        urls: this._urls,
        onload: success,
        onerror: reject,
        baseUrl: this.samples,
      });
    });
  }

  start(note: number, time: number, velocity: number): void {
    if (!this._enabled) return;
    let buffer = this._buffers?.get(note);
    if (!buffer) return;
    const source = new ToneBufferSource({
      url: buffer,
      context: this.context,
    }).connect(this.output);
    // randomize the velocity slightly
    source.start(time, 0, undefined, 0.015 * velocity * randomBetween(0.5, 1));
  }
}
