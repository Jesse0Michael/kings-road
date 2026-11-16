import { useEffect, useRef, useState } from "react";
import type { Role } from "../game/engine";

export function GameplayClip({ role }: { role: Role }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [inView, setInView] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [blocked, setBlocked] = useState(false);
  const base = `${import.meta.env.BASE_URL}assets/examples/${role.toLowerCase()}`;
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    const visibility = () => setHidden(document.hidden);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setPaused(media.matches);
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", motion);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", motion);
    };
  }, []);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let current = true;
    if (!paused && inView && !hidden) {
      video
        .play()
        .then(() => {
          if (current) setBlocked(false);
        })
        .catch(() => {
          if (current) setBlocked(true);
        });
    } else video.pause();
    return () => {
      current = false;
      video.pause();
    };
  }, [paused, inView, hidden, role]);
  const stopped = paused || blocked;
  return (
    <div className="gameplay-clip">
      <video
        key={role}
        ref={ref}
        src={`${base}.mp4`}
        poster={`${base}.jpg`}
        muted
        loop
        playsInline
        preload="none"
        aria-label={`${role} gameplay example`}
      />
      <button
        className="clip-toggle"
        aria-label={`${stopped ? "Play" : "Pause"} ${role} example`}
        onClick={() => {
          if (stopped) {
            setPaused(false);
            ref.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setBlocked(true));
          } else setPaused(true);
        }}
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            d={stopped ? "M4 2 14 8 4 14Z" : "M3 2h4v12H3zM10 2h4v12h-4z"}
          />
        </svg>
        {stopped ? "Play example" : "Pause"}
      </button>
    </div>
  );
}
