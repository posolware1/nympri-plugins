# NP_SoftlockFix

## Title

Open story steps whose original conditions never match.

## Version

1.0 (`@plugindesc`).

## Purpose

Eleven small repairs for Alpha 0.80j. No new story, maps, or rewards, and no popups. Each repair checks the map, event, page, and command. If that data is not the 0.80j shape, the repair does nothing. Repairs run on map entry and on save load. Running them again changes nothing.

Variables 8, 9, and 911 are never written. Variable 913 is never written.

- Leon by the ship (map 171, event 27) also appears after chapter 1, when variable 911 is at least 99. The original “variable 911 equals 1” case stays. He stays hidden during the middle of the church quest, and after the exam has started or been passed.
- Switch 302 turns on after the sage talk (switch 300) if it is still off. The player still accepts the quest; variable 913 is not set.
- The guild fame checks for training (variable 322 equal to 10) and the goblin raid (the number stored on that command, 30 in 0.80j or 25 in some builds) are read as “at least”. No other conditional branch is changed.
- After the infirmary sets variable 906 to 2, the guild page that asked for exactly 1 still opens. The variable is not rolled back. Both the hero and Kohaku must still be in the party.
- The southern checkpoint treats rank equal to 2 as rank at least 2. If the southern story has already started and switch 310 is off, that switch is turned on.
- If the exam is passed and the 2-star tag (item 887) is missing, the tag is restored and the 1-star tag is removed. Rank variable 9 is left for the game to update.
- The three Yarizo repairs are skipped when `NP_YarizoQuest` 1.2 or newer is loaded.

## Load order

After `NP_YarizoQuest`, before `NP_ShopCompare`. The options row is grouped by `NP_OptionsCategories`, which stays last.

## Parameters

No Plugin Manager parameters. Options row **Исправление застреваний / Fix story softlocks**, in Mechanics, default on.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_SoftlockFix.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_SoftlockFix.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_SoftlockFix/` folder.

## Screenshots

This plugin does not add its own screen.
