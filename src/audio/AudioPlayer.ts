import type { Game } from "../game/engine";
import type { DiceRoll } from "../scene/Dice";
import type { Transition } from "../scene/motion";
import type { AudioPreferences } from "./preferences";
import { SoundTimeline, soundNames } from "./timeline";
import type { SoundCue, SoundName } from "./timeline";
import { diceCues } from "./dice";

const base = `${import.meta.env.BASE_URL}assets/audio/`;

export class AudioPlayer {
  private context: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private timeline = new SoundTimeline();
  private atTable = false;
  private hidden = false;
  private unlocked = false;
  private generation = 0;
  private cueEpoch = 0;
  private musicFailed = false;
  private preferences: AudioPreferences;

  constructor(
    preferences: AudioPreferences,
    private report: (message: string) => void,
  ) {
    this.preferences = preferences;
  }

  /** Called directly from a pointer/key gesture, as required by mobile browsers. */
  unlock() {
    this.unlocked = true;
    if (this.hidden) return;
    try {
      if (!this.context) this.initialize();
      void this.context!.resume().catch(() => {});
      this.startMusic();
      void this.loadEffects();
    } catch {
      this.report(
        "Audio is unavailable in this browser. The game can still be played silently.",
      );
    }
  }

  private initialize() {
    const Audio =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = (this.context = new Audio());
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.preferences.music / 100;
    this.musicGain.connect(ctx.destination);
    this.effectsGain = ctx.createGain();
    this.effectsGain.gain.value = this.preferences.effects / 100;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -15;
    limiter.knee.value = 18;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    this.effectsGain.connect(limiter);
    limiter.connect(ctx.destination);

    const music = (this.music = document.createElement("audio"));
    music.preload = "none";
    music.loop = true;
    music.src = `${base}music/tavern-dance.mp3`;
    music.addEventListener("error", () => {
      this.musicFailed = true;
      this.report(
        "The music could not load. Sound effects and gameplay are still available.",
      );
    });
    ctx.createMediaElementSource(music).connect(this.musicGain);
  }

  private startMusic() {
    if (!this.music || !this.unlocked || this.hidden || this.musicFailed)
      return;
    if (!this.preferences.music) {
      this.music.pause();
      return;
    }
    if (this.music.paused) {
      // A denied autoplay attempt is harmless; the next user gesture retries it.
      void this.music.play().catch(() => {});
    }
  }

  private loadEffects() {
    if (!this.context || !this.preferences.effects) return Promise.resolve();
    if (!this.loading) {
      const ctx = this.context;
      const generation = this.generation;
      this.loading = Promise.all(
        soundNames.map(async (name) => {
          const response = await fetch(`${base}sfx/${name}.wav`);
          if (!response.ok) throw new Error(`Missing effect: ${name}`);
          const buffer = await ctx.decodeAudioData(
            await response.arrayBuffer(),
          );
          if (generation === this.generation) this.buffers.set(name, buffer);
        }),
      ).then(
        () => {},
        () => {
          this.report(
            "Some sound effects could not load. You can continue playing.",
          );
        },
      );
    }
    return this.loading;
  }

  setPreferences(preferences: AudioPreferences) {
    this.preferences = preferences;
    const ctx = this.context;
    if (ctx) {
      for (const [node, level] of [
        [this.musicGain, preferences.music],
        [this.effectsGain, preferences.effects],
      ] as const) {
        node!.gain.cancelScheduledValues(ctx.currentTime);
        node!.gain.setTargetAtTime(level / 100, ctx.currentTime, 0.025);
      }
      if (!preferences.effects) this.cancelEffects();
      else void this.loadEffects();
      this.startMusic();
    }
  }

  setGame(game: Game | null, atTable: boolean) {
    this.atTable = atTable;
    this.reset(game);
  }

  reset(game: Game | null = null) {
    this.cancelEffects();
    this.timeline.reset(game);
  }

  transition(t: Transition, reduced: boolean) {
    if (!this.atTable || this.hidden) return;
    const cues = this.timeline.advance(t, reduced);
    for (const cue of cues) this.play(cue);
  }

  roll(roll: DiceRoll) {
    if (!this.atTable || this.hidden) return;
    for (const cue of diceCues(roll)) this.play(cue);
  }

  async preview() {
    // A new slider release replaces the previous preview, even while loading.
    this.cancelEffects();
    if (!this.preferences.effects || this.hidden) return;
    this.unlock();
    const epoch = this.cueEpoch;
    await this.loadEffects();
    if (this.hidden || epoch !== this.cueEpoch) return;
    const at = performance.now();
    this.play({ sound: "wall-place", at, pan: 0 });
    this.play({ sound: "score", at: at + 320, pan: 0 });
  }

  private play(cue: SoundCue) {
    const ctx = this.context;
    const buffer = this.buffers.get(cue.sound);
    if (
      !ctx ||
      ctx.state !== "running" ||
      !buffer ||
      !this.preferences.effects ||
      this.hidden
    )
      return;
    // Never replay a backlog when downloads finish or a tab becomes visible again.
    const delay = (cue.at - performance.now()) / 1000;
    if (delay < -0.18) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = cue.rate ?? 1;
    const pan = ctx.createStereoPanner();
    pan.pan.value = cue.pan;
    source.connect(pan).connect(this.effectsGain!);
    this.sources.add(source);
    source.onended = () => {
      source.disconnect();
      pan.disconnect();
      this.sources.delete(source);
    };
    source.start(ctx.currentTime + Math.max(0, delay), cue.offset ?? 0);
  }

  private cancelEffects() {
    this.cueEpoch++;
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* Already finished. */
      }
      source.disconnect();
    }
    this.sources.clear();
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.reset();
    if (hidden) {
      this.music?.pause();
      void this.context?.suspend().catch(() => {});
    } else if (this.unlocked) {
      void this.context?.resume().catch(() => {});
      this.startMusic();
    }
  }

  dispose() {
    this.generation++;
    this.cancelEffects();
    if (this.music) {
      this.music.pause();
      this.music.removeAttribute("src");
      this.music.load();
    }
    void this.context?.close().catch(() => {});
    this.context = null;
    this.music = null;
    this.loading = null;
    this.buffers.clear();
  }
}
