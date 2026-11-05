# NP_VideoPortrait

## Title

Looping video standing in for a portrait.

## Version

1.0.0 (`@plugindesc`).

## Purpose

Event authors show a movie from `movies/` (name without extension; `.webm` first, `.mp4` as fallback, same rule as Play Movie) with the plugin command `VideoPortrait show`. The clip is drawn above Show Picture and below the message window, so dialogue stays on top. Default anchor is the bottom-center of the screen.

Player-visible behaviour:

- `loop` (default) or `once`. `VideoPortrait wait` holds the event until a one-shot clip ends.
- Blend `normal` (soft edges), `screen`, or `add`. Any argument can be `-` to keep the default.
- Opening the menu, battle, or save pauses the video and resumes at the same frame. The position is stored in the save.
- A map transfer removes the video. Title and New Game drop it.
- `hide`, `volume`, `pause`, `resume`, and `move` are the other commands.

It does not run outside `Scene_Map`.

## Load order

First of the NP block at the end of `plugins.js`, before `NP_AutoSave`. Map scene only.

## Parameters

- **Default X** `960`, **Default Y** `960` — bottom-center of the video on a 1280×960 screen.
- **Default Scale** `143` — a 448×672 clip fills the screen height.
- **Feather** `14` — soft edge, percent of the video size. WebGL only. `0` is a hard edge.
- **Fade Frames** `20` — fade in and out.
- **Volume Source** `bgm` — which Options volume scales the clip (`bgm`, `bgs`, `se`, `me`, or `none`).

## Install

Copy `NP_VideoPortrait.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_VideoPortrait.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_VideoPortrait/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
