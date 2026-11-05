# NP_EnemyHUD

## Title

Enemy card with HP, effects, and a detail page.

## Version

1.0 (`@plugindesc`).

## Purpose

The card shows the current enemy name (variable 139), health as current / max, and a boss tag with the phase when `NP_BossBalance` says this is a boss. Effect chips cover states, with a short description (cannot act, blind, silenced, confused, asleep, paralyzed, stunned, skips a turn, trance) and the remaining enemy turns. A control-immunity chip appears while the boss balance script is counting immunity actions.

**Подробнее / Details**, or F6, opens a modal page. Page Up/Down or the ‹ › buttons change pages. Escape or the × closes it. While the page is open, clicks are not passed to the battle commands. The pages include armor, magic armor, and one block per effect: what it changes and how long it lasts. An empty list says there are no temporary effects.

## Load order

After `NP_BattleHUD` and `NP_BossBalance`, before `NP_BondHints` and `NP_OptionsCategories`. It keeps the enemy portrait, the party cards, and the command menu. It does not change battle numbers.

## Parameters

No Plugin Manager parameters. Options row **Карточка врага / Enemy card**, category Interface.

## Install

Copy `NP_EnemyHUD.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_EnemyHUD.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_EnemyHUD/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
