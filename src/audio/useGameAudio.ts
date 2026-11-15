import { useEffect, useState } from "react";
import { AudioPlayer } from "./AudioPlayer";
import { AUDIO_KEY, DEFAULT_AUDIO, parseAudioPreferences } from "./preferences";
import type { AudioPreferences } from "./preferences";

export function useGameAudio() {
  const [preferences, setPreferences] = useState(() => {
    try {
      return parseAudioPreferences(localStorage.getItem(AUDIO_KEY));
    } catch {
      return { ...DEFAULT_AUDIO };
    }
  });
  const [audioError, setAudioError] = useState("");
  const [player] = useState(() => new AudioPlayer(preferences, setAudioError));
  useEffect(() => {
    const unlock = () => player.unlock();
    const key = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) unlock();
    };
    const visibility = () => player.setHidden(document.hidden);
    player.setHidden(document.hidden);
    document.addEventListener("pointerdown", unlock, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", key, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("visibilitychange", visibility);
      player.dispose();
    };
  }, [player]);
  useEffect(() => {
    player.setPreferences(preferences);
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify(preferences));
    } catch {
      /* Audio preferences are optional when storage is unavailable. */
    }
  }, [preferences, player]);
  function setLevel(key: keyof AudioPreferences, level: number) {
    setPreferences((p) => ({ ...p, [key]: Math.max(0, Math.min(100, level)) }));
  }
  return { player, preferences, setLevel, audioError };
}
