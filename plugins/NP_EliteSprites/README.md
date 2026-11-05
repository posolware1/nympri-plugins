# NP_EliteSprites

## Title

Custom sprites for the six new rares.

## Version

0.1.0 (`@plugindesc`). Graphics only.

## Purpose

Each of the six species from `NP_EliteMobs` is drawn from a single-character sheet with eight extra transparent pixels on every edge. The body is drawn clean, above the additive aura. The character origin and the star are shifted so the padding does not move the sprite at the elite scale of 1.15.

The event remembers the original image in its saved state. Turning rare enemies off, or removing the rare mark, puts that image back.

## Load order

After `NP_EliteRewards`. The help text requires the elite expansion. It does not change spawn rolls, combat, loot, the thirteen older rares, or the normal enemy sheets.

## Parameters

No Plugin Manager parameters.

## Install

Copy `NP_EliteSprites.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_EliteSprites.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_EliteSprites/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
