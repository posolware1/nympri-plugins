# NP_Voice

## Title

Short voice clips cut from the game's own tracks.

## Version

1.1 (`@plugindesc`).

## Purpose

There are no new voice files. The plugin slices the existing tracks `audio/bgs/!voice_moan1.ogg` and `audio/se/!voice_cumming1.ogg`, picks a random clip from a pool, shifts pitch slightly, and fades the edges. Only one clip plays at a time; a new one cuts the old one.

Pools: `sigh`, `gasp`, `moan`, and `light` (beach, no moans). Pools can be mixed (`moan|sigh`). Loudness is matched to the original scenes and then multiplied by the SE volume option. `muffle` dulls the clip, as if behind a door, and `at=X,Y` pans and quiets it by distance from the player.

Events and other plugins call `NPVoice <pool>` or `NPVoice.play(...)`. `NPVoice stop` cuts the current clip. With the option off, those calls do nothing.

## Load order

After `NP_PriestessDiary`, before `NP_SaveThumb`. Other scripts call it (`NP_OutfitReact` uses the gasp pool). No new audio files.

## Parameters

- **Enabled** `true` — Options label **Озвучка добавок**.
- **Fast Battle Max** `0.7` — maximum clip length in seconds while a battle is running and Fast Battle is on.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

Uses two sounds already in the game, `audio/bgs/!voice_moan1.ogg` and `audio/se/!voice_cumming1.ogg`. This pack does not redistribute them.

## Install

Copy `NP_Voice.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_Voice.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_Voice/` folder.

## Screenshots

Plays a short sigh, gasp, or moan cut from audio the game already has. A still picture would not show the sound. The switch is an ordinary options row.
