# NP_Campfire

## Title

Short talks at camp and at the inn.

## Version

Not numbered in `@plugindesc`. The header marks it as the RU camp-talk script.

## Purpose

Before the watch choice at camp, and before sleep processing at an inn or a bed, the party may get a short scripted exchange. Camp calls the sleep event again later; the camp insertion is skipped the second time, so the player hears one talk.

The same talk does not play twice in a row, and the last four talks are avoided. Yarizo lines play only when he is really in the party: contract on, not dead, not taken at the port, alive, and the third member slot is actor 21. Otherwise the talk is the hero and the priestess, and the tone follows the diary stage. With Yarizo, the tone follows bond level and switch 32.

No talk in the gallery, in battle, during a story lock, a special inn event, when the party is solo, when the priestess is confined, or when switch 222 is off.

## Load order

After `NP_PictureAnim`, before `NP_Titles`. It injects into common events 474 (camp) and 325 (sleep) in memory. `NP_CampSkills` opens its menu before this talk.

## Parameters

- **Enabled** `true` — Options label **Разговоры на привале**.
- **Chance** `40` percent per night. A bond increase since the last night raises the chance to 85%.
- **Cooldown** `2` nights that must pass after a talk.

## Install

Copy `NP_Campfire.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_Campfire.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_Campfire/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

This plugin does not add its own screen.
