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

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

Included CC0 sounds: `audio/bgs/NP_Campfire_Crackle.ogg` (also NP_CampSkills) and `audio/se/NP_ClothRip.ogg`. `audio/bgs/Rain.ogg` is included too, for an original event name; this script does not load Rain itself. Other cue names are files that already belong to the game. Fifty historical aliases of those files are optional (`python install.py "www" --repair-audio`). They are not CC0 and are not in the ZIP. ffmpeg is only for that optional loudness step. Nine same-name remasters from an older build, including explicit sound effects, are not included.

## Install

Copy `NP_AudioBalance.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_AudioBalance.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_AudioBalance/` folder.

## Screenshots

Raises or lowers the loudness of music and effects, and adds cues on some silent maps. A still picture would not show the difference.
