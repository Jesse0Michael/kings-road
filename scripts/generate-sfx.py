"""Original, quiet tabletop foley. Python standard library; no downloaded samples."""
from pathlib import Path
import math
import random
import struct
import wave

RATE = 24000
OUT = Path(__file__).resolve().parents[1] / "public/assets/audio/sfx"
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(713)


def silence(seconds):
    return [0.0] * round(seconds * RATE)


def add(target, sound, at=0, gain=1):
    offset = round(at * RATE)
    for i, value in enumerate(sound):
        if offset + i < len(target):
            target[offset + i] += value * gain


def impact(kind="wood", pitch=1, duration=0.23):
    # Inharmonic damped modes and a filtered contact transient, rather than a beep.
    modes = {
        "wood": [(174, .040, 1), (397, .028, .46), (913, .018, .17)],
        "stone": [(236, .032, 1), (681, .038, .36), (1457, .023, .18)],
        "metal": [(713, .085, .48), (1679, .060, .25), (2663, .035, .12)],
    }[kind]
    low = 0
    result = []
    for i in range(round(duration * RATE)):
        t = i / RATE
        low += .32 * (rng.uniform(-1, 1) - low)
        body = sum(a * math.sin(2 * math.pi * f * pitch * t) * math.exp(-t / decay)
                   for f, decay, a in modes)
        contact = low * math.exp(-t * 110) * 1.1
        result.append((body + contact) * (1 - math.exp(-t * 1800)))
    return result


def rustle(duration=.3):
    result, low, slow = [], 0, 0
    for i in range(round(duration * RATE)):
        low += .19 * (rng.uniform(-1, 1) - low)
        slow += .025 * (low - slow)
        envelope = math.sin(math.pi * i / (duration * RATE)) ** 2
        result.append((low - slow) * envelope)
    return result


def pluck(frequency, duration=.45):
    result = []
    for i in range(round(duration * RATE)):
        t = i / RATE
        v = sum(math.sin(2 * math.pi * frequency * h * t) * math.exp(-t * (10 + h * 2)) / h ** 2
                for h in [1, 2, 3, 5])
        result.append(v * (1 - math.exp(-t * 1100)))
    return result


def finish(samples, peak=.42):
    # Small early reflections suggest the table surface, without a room-sized reverb.
    dry = samples[:]
    add(samples, dry, .027, .075)
    add(samples, dry, .049, .035)
    dc = sum(samples) / len(samples)
    samples = [v - dc for v in samples]
    scale = peak / max(abs(v) for v in samples)
    tail = round(.015 * RATE)
    for i in range(len(samples)):
        fade = min(1, i / 24, (len(samples) - 1 - i) / tail)
        samples[i] *= scale * fade
    return samples


def write(name, samples):
    with wave.open(str(OUT / f"{name}.wav"), "wb") as wav:
        wav.setparams((1, 2, RATE, len(samples), "NONE", "not compressed"))
        wav.writeframes(struct.pack(f"<{len(samples)}h", *(round(v * 32767) for v in samples)))


sounds = {}
s = silence(.32)
add(s, impact("stone"), 0, .8)
add(s, impact("wood", .72), .008, .3)
sounds["wall-place"] = finish(s, .43)

s = silence(.55)
add(s, rustle(.14), 0, 1.7)
for at, pitch, gain in [(0, 1.35, .7), (.052, .85, .6), (.12, 1.7, .32), (.22, 2.1, .18)]:
    add(s, impact("stone", pitch), at, gain)
sounds["wall-break"] = finish(s, .42)

s = silence(.28)
add(s, impact("wood", 1.08), 0, .8)
add(s, impact("metal", .86), .008, .16)
sounds["army-place"] = finish(s, .32)

for name, gentle in [("army-move", False), ("runner-move", True)]:
    s = silence(.88)
    add(s, rustle(.28), .02, .24 if gentle else .18)
    add(s, rustle(.22), .39, .16)
    # Movement lands at 90% of the scene's 720 ms lift/glide/set-down animation.
    add(s, impact("wood", 1.28 if gentle else .94), .648, .45 if gentle else .7)
    if not gentle:
        add(s, impact("metal", 1.04), .66, .075)
    sounds[name] = finish(s, .24 if gentle else .29)

s = silence(.42)
add(s, impact("wood", .83), .02, .7)
add(s, impact("metal", 1.24), .073, .22)
add(s, impact("wood", 1.6), .16, .15)
sounds["army-fall"] = finish(s, .31)

s = silence(.45)
add(s, impact("wood", .58), 0, .75)
add(s, impact("metal", .52), .035, .22)
sounds["castle"] = finish(s, .38)

s = silence(.5)
add(s, pluck(880), 0, .7)
add(s, pluck(1320), .055, .18)
sounds["score"] = finish(s, .23)

s = silence(.95)
for at, frequency in [(0, 440), (.13, 660), (.26, 880)]:
    add(s, pluck(frequency, .6), at, .45)
sounds["victory"] = finish(s, .25)

s = silence(.20)
add(s, impact("wood", 1.7, .18), 0, .7)
add(s, impact("stone", 2.1, .12), .002, .12)
sounds["dice"] = finish(s, .26)

for name, samples in sounds.items():
    write(name, samples)
    print(f"{name}: {len(samples) / RATE:.2f}s")

# Optional audition reel, outside the shipped assets.
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        reel = []
        for sound in sounds.values():
            reel += sound + silence(.5)
        with wave.open(sys.argv[1], "wb") as wav:
            wav.setparams((1, 2, RATE, len(reel), "NONE", "not compressed"))
            wav.writeframes(struct.pack(f"<{len(reel)}h", *(round(v * 32767) for v in reel)))
