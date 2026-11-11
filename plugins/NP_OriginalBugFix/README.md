# NP_OriginalBugFix

## Title

Patches for original script crashes and missing-map transfers.

## Version

1.0 (`@plugindesc`).

## Purpose

When a map or the common-event list loads, each known command is checked against a hash of its original text. A match is replaced with fixed JavaScript. A mismatch is skipped, and one console line is written. The same command is not changed twice.

Show Text commands are never edited, so a language pack can still replace dialogue.

A transfer to a map that is not in the map list is blocked. The player sees a short line and returns to the world map (map 3 at `$WMTS`, or map 96 at 7,18 if that point is missing). Map 251’s one-cell-too-far transfer is clamped to 29,39. Map 157’s transfer to 21,85 is blocked the same way. No new maps are added.

The inn choice `en(v[133])` becomes `en(s[133])` when that exact text is still there. The full common-event patch files from 202609 and 202610 are not applied, and `CommonEventPatchList` is left empty.

Nothing is written into the save.

## Load order

Immediately after `NP_Language`, before `NP_VideoPortrait` and the other gameplay plugins. The options row is grouped by `NP_OptionsCategories`, which stays last.

## Parameters

No Plugin Manager parameters. Options row **Исправления оригинала / Original bug fixes**, in Other, default on. Off skips the next data load and the transfer guard.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_OriginalBugFix.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_OriginalBugFix.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_OriginalBugFix/` folder.

## Screenshots

This plugin does not add its own screen.
