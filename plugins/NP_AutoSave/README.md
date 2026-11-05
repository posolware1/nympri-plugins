# NP_AutoSave

## Title

Two rotating autosave slots.

## Version

1.1 (`@plugindesc`).

## Purpose

The save and load lists gain two rows at the top, files 21 and 22, written in turn. The player can load them. Manual overwrite of those rows is refused. Slots 1–20 are unchanged, and an old file 21 is kept.

A write happens only when the map is free: no running event, message, transfer, or fade, the player is standing, and saving is allowed.

- After a map transfer, at most once per throttle window.
- After a sleep common event, with no throttle.
- Before a boss (switch 15, or a unique known to `NP_BossBalance`), before common event 31 starts. Loading that file resumes the start of the fight and does not immediately write another autosave.

Nothing is written in the gallery or during battle. A short toast says the save happened. Plugin commands: `NP_AutoSave now`, `NP_AutoSave on`, `NP_AutoSave off`.

## Load order

After `NP_VideoPortrait`, before `NP_QuestMarker`. Independent of `NP_SaveThumb` (that plugin does not change these slots).

## Parameters

- **Enabled** `true` — Options toggle, default on.
- **Slot Id** `21` — first of two files. If it is not above the manual slot count (20), the script uses `maxSavefiles()+1`.
- **Throttle Seconds** `60` — minimum play time between transfer autosaves.
- **Sleep Common Events** `325` — sleep events that save immediately, ignoring the throttle.
- **Idle Frames** `20` — the map must be idle this long before the write.
- **Slot Label** `Автосохранение`, **Toast Text** `Автосохранение…`, **Option Label** `Автосохранение`. Empty toast hides the popup. Empty option label hides the Options row.

## Install

Copy `NP_AutoSave.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_AutoSave.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_AutoSave/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
