# NP_ShopCompare

## Title

Shop rows compare gear with what is worn.

## Version

Not numbered in `@plugindesc`.

## Purpose

On the equipment buy screen, every party member who can wear the highlighted item gets a comparison row: current value, arrow, new value, and the difference. Better is green, worse is red, unchanged rows are dimmed. If the column is narrow, the row shows the new value and the difference only.

Dice stats such as 1d3 are compared by their average. Fatigue and requirement rows treat a lower number as better, matching KNS. Only drawing changes. Equipment is restored after the measurement, so buying and selling are untouched.

## Load order

After `NP_YarizoQuest`, before `NP_BattleQoL`. Extends KNS `Window_ShopStatus`. Load before `NP_UIColors`, which recolors the up/down arrows, and before `NP_OptionsCategories`.

## Parameters

- **Enabled** `true` — Options label **Сравнение в лавке**. Off restores the original KNS shop status.

## Install

Copy `NP_ShopCompare.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_ShopCompare.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_ShopCompare/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
