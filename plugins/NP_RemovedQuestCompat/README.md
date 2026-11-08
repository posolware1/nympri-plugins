# NP_RemovedQuestCompat

## Title

Save compatibility for three cancelled quests.

## Version

Not numbered. `@plugindesc` calls it save compatibility only.

## Purpose

There is no quest text, no dialogue, no art, no reward, and no new map event. On maps that still have orphaned actors from the first version of those quests, the script removes the orphan if it matches a known role tag or a known unused slot (map, event id, position, and character image). A real prefab or a current static NPC is left in place.

Running interpreters on those removed events are stopped. Navigator entries that point at the three ids are cleared when the quest list no longer has them. The help text is explicit that this is not playable content.

## Load order

After `NP_SouthGateQuest`, before `NP_OptionsCategories`. It never writes a save.

## Parameters

No Plugin Manager parameters. Quest ids removed from the navigator when they are gone from the quest list: 201092, 201093, 201094.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_RemovedQuestCompat.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_RemovedQuestCompat.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_RemovedQuestCompat/` folder.

## Screenshots

On an old save, removes leftover events and items from three quests the mod dropped. Nothing new is drawn, so a screenshot would not show the change.
