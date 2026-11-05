# NP_SouthGateQuest

## Title

Optional delivery of guild papers to the southern checkpoint.

## Version

Not numbered in `@plugindesc`.

## Purpose

An extra guild service on map 13, event 12, page 2, offers the delivery once the player is rank 2 or higher. Map 241 is the closed checkpoint (events 8 and 9) and, after it opens, the guards (events 3 and 10). The original gate, rank, and story behaviour of those maps stays.

Handing the papers in pays exactly 200 G. Common events 46 and 47, the usual reward events, are not called, so there is no experience and no fame. The quest is optional.

## Load order

After `NP_BondHints`, before `NP_RemovedQuestCompat`. Added after the CSV translation pass. It does not replace original CSV rows or map files.

## Parameters

No Plugin Manager parameters. Quest id 201091, stage variable 3571 (0, 1, or 99), key item 2950.

## Install

Copy `NP_SouthGateQuest.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_SouthGateQuest.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_SouthGateQuest/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

This plugin does not add its own screen.
