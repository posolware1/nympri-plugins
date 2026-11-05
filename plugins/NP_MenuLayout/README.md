# NP_MenuLayout

## Title

Compact pause menu.

## Version

1.1 (`@plugindesc`).

## Purpose

With the option on, the pause screen is rebuilt but still calls the same commands.

The header is **ПУТЬ АВАНТЮРИСТА / THE ADVENTURER'S PATH**. It shows day number and day or night, map name (an inn floor is spelled out), silver, guild rank with stars, fame, and reputation.

A quest block shows the bookmarked or story quest, or a line that none is marked, and a **Journal** shortcut. If level-up points are waiting, a gold **Allocate points** link opens `NP_LevelAllocation`.

Party cards, scrolled with the usual menu controls, show class and level, health, magic, fatigue, stress when `NP_Stress` is active, and chips for temporary effects. The priestess card also shows love and lust. **Attributes** opens the status. An empty effect row says there are no temporary effects.

**Party effects** is its own page: Left/Right change actor, Up/Down and Page Up/Down move through the list, Escape goes back.

Commands that do not fit the main column go under **More**. When the diary and titles plugins are present they are grouped as **Diary and titles**. Companions keep their original command (the one that calls common event 5), relabelled. The footer reminds: arrows select, Enter opens, Escape goes back.

## Load order

After the original `Scene_Menu` extensions and after `NP_LevelAllocation`. Before `NP_EnemyHUD` and `NP_OptionsCategories`. Every original command, its `ext`, its enabled state, and its handler are kept.

## Parameters

No Plugin Manager parameters. Options row **Компактное меню паузы / Compact pause menu**, category Interface.

## Install

Copy `NP_MenuLayout.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_MenuLayout.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_MenuLayout/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
