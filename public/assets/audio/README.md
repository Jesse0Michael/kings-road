# Audio assets

All playback is local to the static app. No audio service, external sample host, or runtime synthesis dependency is used.

## Music

**Tavern Dance** was supplied by the project owner, who created it with Suno. The original upload is retained byte-for-byte at `assets/audio-source/tavern-dance.m4a` in the repository, outside the public build. Despite its `.m4a` extension, that source contains Opus audio. The browser copy is `music/tavern-dance.mp3`: 44.1 kHz stereo, 128 kbps, about 3 minutes 8 seconds and 3 MB. It is normalized toward −18 LUFS, with tiny boundary fades to avoid clicks, and repeats using the media element's loop playback.

The music remains the owner's supplied work; the sound-effect provenance below does not grant additional rights to it.

Run `npm run music:prepare` to reproduce the browser copy. This optional development command needs Python 3, FFmpeg, and ffprobe. Normal development/builds use the committed MP3 and require none of those tools.

## Effects

The ten effects in `sfx/` are original procedural audio created for King’s Road. They use filtered noise, damped resonances, and short plucked tones. No third-party recordings, sampled instruments, or paid sound library were used. There are no third-party SFX attribution requirements or service fees.

Files are short 24 kHz, 16-bit mono WAVs, about 270 KB combined. PCM avoids codec delays on the tiny placement/capture sounds. The game mixes them through Web Audio, with subtle stereo positioning and a compressor to soften overlaps.

| File              | Cue                                                |
| ----------------- | -------------------------------------------------- |
| `wall-place.wav`  | Stone and wood contact when a wall lands.          |
| `wall-break.wav`  | Short crack and falling stone chips.               |
| `army-place.wav`  | Wooden pawn contact with a small armor tick.       |
| `army-move.wav`   | Lift/slide rustle and a landing tap.               |
| `runner-move.wav` | Softer cloth movement and a light landing tap.     |
| `army-fall.wav`   | A pawn tipping over, with a quiet metallic rattle. |
| `castle.wav`      | A low wooden knock on arrival at the castle.       |
| `score.wav`       | A brief plucked chime for a scoring action.        |
| `victory.wav`     | A restrained three-note finish.                    |
| `dice.wav`        | Small resin/wood clacks that slow as dice settle.  |

Run `npm run sfx:generate` with Python 3 to reproduce the WAV files; no Python packages are needed. Pass an output filename to `python3 scripts/generate-sfx.py /tmp/effects.wav` for an audition reel. The preview at `docs/mockups/sound-effects.mp3` follows the table order above.
