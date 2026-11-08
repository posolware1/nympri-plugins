# NP_QuestMarker

## Title

Blinking quest exclamation mark.

## Version

1.1 (`@plugindesc`).

## Purpose

While a quest variable sits in the range stored in `NP_QuestMarker.TARGETS`, a blinking «!» is drawn on the current map:

- On the NPC or tile of the current step, when that step is on this map.
- Otherwise on the door, exit, or world-map node (Map003) that the built-in transfer table says is the way there.

The mark hides with the NPC. A blank page, transparency, or an erase removes it at once, and it returns when the character comes back. Invisible transfer events and coordinate exits still count as destinations. The marker does not change quest progress. It only points.

## Load order

After `NP_AutoSave`, before `NP_FastBattle`. `NP_QuestTabs` and `NP_YarizoQuest` expect the marker table to already exist.

## Parameters

- **Enabled** `true`.
- **Option Label** `Метки заданий` — empty hides the Options row.
- **Color** `#ffe040`.
- **Font Size** `34`.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_QuestMarker.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_QuestMarker.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_QuestMarker/` folder.

## Screenshots

A blinking «!» stands on the current quest target, or on the exit that leads there. A screenshot of the marker is not yet available.
