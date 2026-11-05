# NP_MorningHints

## Title

A few lines the morning after a night away.

## Version

Not numbered in `@plugindesc`.

## Purpose

When the morning excuse resets partner variable 4291 to 0, a hint is queued. It plays at the first free moment on another map, after the party has left the room: one to three short lines. The partner in 4291 is a stranger (1) or Yarizo (2). Wording follows that and the diary stage. Yarizo speaks only if he is really with the party.

Options label **Утренние намёки / Morning hints**. Never in the gallery, battle, cutscenes, confinement, or on the world map, and not without both the hero and the priestess. The hero does not reach the right conclusion in these lines.

## Load order

After `NP_RareMobs`, before `NP_QuestHints`. It reads the mod's night-absence variables (4291 partner, 4292 count) and the diary stage. It does not change those numbers.

## Parameters

- **Chance** `60` percent after an absence.
- **Cooldown** `1` — absences skipped after a hint, so at most every other one.
- **Delay** `45` free frames on the new map before the lines start.

## Install

Copy `NP_MorningHints.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_MorningHints.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_MorningHints/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

This plugin does not add its own screen.
