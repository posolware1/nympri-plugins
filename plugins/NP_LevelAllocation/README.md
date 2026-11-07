# NP_LevelAllocation

## Title

One screen to spend level-up points.

## Version

1.0 (`@plugindesc`).

## Purpose

The screen is **Распределение характеристик / Attribute allocation**. It shows points remaining and points the draft will spend. Six rows: Strength, Endurance, Intellect, Charm, Dexterity, Faith. Each row has the current value, the drafted change, the cost of the next point, and a short explanation of what that stat is used for (attack and strength checks, HP and defence, MP and magic, negotiations, locks and precision, miracles and resistance).

Controls: Up/Down to pick a stat, Left/Right to subtract or add, OK to add, Page Up/Down to switch between the hero and Kohaku, Escape to focus the buttons. Touch uses the + and − marks.

Bottom commands: **Apply** (writes the draft with the native parameter add and clears the spent points), **Reset** (puts the draft back), **Later** (closes without spending; the points stay in variables 172 and 173). Apply and Reset are disabled until the draft differs from the actor.

## Load order

After `NP_EliteSprites`, before `NP_MenuLayout`. Replaces common event 860 once database patches have run, and opens after common event 28 grants points. `NP_MenuLayout` can push this scene when points are waiting.

## Parameters

No Plugin Manager parameters. Point variables 172 (hero) and 173 (Kohaku) and the native `addParam` call are kept.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_LevelAllocation.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_LevelAllocation.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_LevelAllocation/` folder.

## Screenshots

After a level-up the hero and Kohaku spend the new points on one screen. A screenshot of that screen is not yet available.
