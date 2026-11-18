#!/usr/bin/env bash
# Regenerates PWA icons and the Web Audio loop library with ffmpeg.
# Usage: bash scripts/make-assets.sh   (requires ffmpeg with libmp3lame)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/audio public/icons

FF="ffmpeg -y -loglevel error"
FONT="'C\\:/Windows/Fonts/segoeuib.ttf'"

echo "→ icons"
$FF -f lavfi -i "color=c=0x0b1220:s=512x512:d=1" \
  -vf "drawtext=fontfile=${FONT}:text='S':fontcolor=0x7dd3c0:fontsize=300:x=(w-text_w)/2:y=(h-text_h)/2-18" \
  -frames:v 1 public/icons/icon-512.png
$FF -f lavfi -i "color=c=0x0b1220:s=512x512:d=1" \
  -vf "drawtext=fontfile=${FONT}:text='S':fontcolor=0x7dd3c0:fontsize=230:x=(w-text_w)/2:y=(h-text_h)/2-14" \
  -frames:v 1 public/icons/icon-maskable-512.png
$FF -i public/icons/icon-512.png -vf "scale=192:192:flags=lanczos" -frames:v 1 public/icons/icon-192.png
$FF -i public/icons/icon-512.png -vf "scale=180:180:flags=lanczos" -frames:v 1 public/icons/apple-touch-icon.png

echo "→ audio loops"
$FF -f lavfi -i "anoisesrc=color=white:amplitude=0.7:d=30:seed=42" \
  -af "highpass=f=600,lowpass=f=7000,tremolo=f=0.18:d=0.12,volume=0.55" \
  -ac 1 -ar 44100 -b:a 48k public/audio/rain.mp3

$FF -f lavfi -i "anoisesrc=color=pink:amplitude=0.7:d=30:seed=7" \
  -af "lowpass=f=1100,tremolo=f=0.1:d=0.9,volume=0.95" \
  -ac 1 -ar 44100 -b:a 48k public/audio/wind.mp3

$FF -f lavfi -i "anoisesrc=color=brown:amplitude=0.8:d=30:seed=13" \
  -af "highpass=f=70,lowpass=f=2400,tremolo=f=6.5:d=0.55,volume=0.8" \
  -ac 1 -ar 44100 -b:a 48k public/audio/fire.mp3

$FF -f lavfi -i "anoisesrc=color=pink:amplitude=0.8:d=30:seed=99" \
  -af "lowpass=f=950,tremolo=f=0.11:d=0.95,volume=0.95" \
  -ac 1 -ar 44100 -b:a 48k public/audio/waves.mp3

$FF -f lavfi -i "sine=frequency=110:duration=30" -f lavfi -i "sine=frequency=164.81:duration=30" -f lavfi -i "sine=frequency=220:duration=30" \
  -filter_complex "[0:a]volume=0.28[a0];[1:a]volume=0.18[a1];[2:a]volume=0.08[a2];[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0,lowpass=f=650,volume=0.85" \
  -ac 1 -ar 44100 -b:a 48k public/audio/drone.mp3

echo "done:"
ls -lh public/audio public/icons