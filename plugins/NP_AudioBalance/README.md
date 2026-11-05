# NP_AudioBalance

## Title

Loudness match, plus audio on silent maps and mod events.

## Version

1.0 (`@plugindesc`).

## Purpose

The option scales the buffer, not the number saved in the options menu, so the sliders still show what the player set.

Separate from that option, the script always adds audio content:

- A bed of music or ambience on maps that have none, respecting the BGM-lock switch and the night BGM plugin.
- Cues inside common events (sleep, a bad ending, time of day) and on individual map events.
- Cues for mod mechanics: torn clothing and mending, morning hints, the Yarizo quest, autosave, battle ×2, campfire talks, and camp skills.

## Load order

After `NP_QuestTabs`, before `NP_UIColors`. The loudness change is applied in `AudioManager.updateBufferParameters`, so it covers events, plugins, and the BGM that resumes after battle. Turning the option off restores the volumes stored in the save.

## Parameters

No Plugin Manager parameters. Options row **Выравнивание громкости**, default on. Targets in the help text: BGM about −16 LUFS, ambience about −25 LUFS, SE about −17 to −19, ME about −14, from ffmpeg ebur128 measurements of the files.

## Install

Copy `NP_AudioBalance.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_AudioBalance.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_AudioBalance/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

This plugin does not add its own screen.
