"""Create the browser music copy; preserve the original. Requires FFmpeg/ffprobe."""
from pathlib import Path
import json
import re
import subprocess

root = Path(__file__).resolve().parents[1]
source = root / "assets/audio-source/tavern-dance.m4a"
target = root / "public/assets/audio/music/tavern-dance.mp3"
target.parent.mkdir(parents=True, exist_ok=True)
probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(source)
], capture_output=True, text=True, check=True)
duration = float(json.loads(probe.stdout)["format"]["duration"])
analysis = subprocess.run([
    "ffmpeg", "-hide_banner", "-nostats", "-i", str(source),
    "-af", "loudnorm=I=-18:TP=-2:LRA=11:print_format=json", "-f", "null", "-"
], capture_output=True, text=True, check=True)
measured = json.loads(re.findall(r'\{\s*"input_i".*?\}', analysis.stderr, re.S)[-1])
normalization = (
    "loudnorm=I=-18:TP=-2:LRA=11:"
    f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
    f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
    f"offset={measured['target_offset']}:linear=true,"
    f"afade=t=in:d=0.02,afade=t=out:st={max(0, duration - .06):.3f}:d=0.06"
)
subprocess.run([
    "ffmpeg", "-y", "-v", "warning", "-i", str(source), "-af", normalization,
    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", "-map_metadata", "-1",
    "-id3v2_version", "3", "-metadata", "title=Tavern Dance", str(target)
], check=True)
print(f"Prepared {target.relative_to(root)} ({duration:.1f}s); original unchanged.")
