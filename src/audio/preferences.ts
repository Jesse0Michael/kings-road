export type AudioPreferences = { music: number; effects: number };
export const AUDIO_KEY = "kings-road.audio.v1";
export const DEFAULT_AUDIO: AudioPreferences = { music: 20, effects: 40 };
export function parseAudioPreferences(raw: string | null): AudioPreferences {
  try {
    const value = JSON.parse(raw || "null");
    const level = (key: keyof AudioPreferences) =>
      typeof value?.[key] === "number" && Number.isFinite(value[key])
        ? Math.round(Math.max(0, Math.min(100, value[key])))
        : DEFAULT_AUDIO[key];
    return { music: level("music"), effects: level("effects") };
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}
