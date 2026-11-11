# NP_StoryHint

## Title

«What's next» for the main story, and where version 0.80j stops.

## Version

1.0 (`@plugindesc`).

## Purpose

A short hint for the next step of the main story. The table has 53 steps, checked from the end of the story back toward the start. The first step whose condition matches is the one shown. Each condition is read on its own; a broken row is skipped.

On the **Сюжет / Story** tab the hint is pinned at the top, titled **Что дальше / What's next**. Russian or English follows `NP_Language`. If that tab is not available, the main menu gets the same command and opens a plain window. There is no popup and no extra tip window.

The last step of version 0.80j says the main story ends here, and that side quests and free play continue. Two earlier stops (Iris, and the wasteland tavern) use the same kind of sentence if those variables are already that high.

After chapter 1, the hint says the meeting with Leon by the ship may never start in this version, because that page only appears while the church quest is still on its first step. After the talk with the sage, the hint says the next official quest does not start by itself. Those two stops are not repaired here.

Before any story variable is set, the hint is to find a way out of the room in the ruins.

## Load order

After `NP_QuestTabs`, before `NP_AudioBalance`. The options row is grouped by `NP_OptionsCategories`, which stays last.

## Parameters

No Plugin Manager parameters. Options row **Что дальше / What's next**, in the Interface category, default on. Off hides the pinned hint and the menu command.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_StoryHint.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_StoryHint.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_StoryHint/` folder.

## Screenshots

A screenshot of the Story tab with this hint is not yet available.
