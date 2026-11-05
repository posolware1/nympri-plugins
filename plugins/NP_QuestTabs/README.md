# NP_QuestTabs

## Title

Quest journal tabs: Story, Side, Completed.

## Version

Not numbered in `@plugindesc`.

## Purpose

The journal scene replaces the two KNS tabs:

- **Сюжет / Story** — active main-story quests.
- **Побочные / Side** — active side quests, tutorials included.
- **Выполненные / Completed** — everything finished, story first, then side. Story quests keep a small «Сюжет» tag, tutorials an «Обучение / Tutorial» tag.

Each tab name includes a count. An empty tab shows a short line instead of a blank list. KNS files and QuestList.csv are not modified.

## Load order

After `NP_QuestHints`, `NP_QuestMarker`, `NP_YarizoQuest`, and the KNS quest plugins. Before `NP_AudioBalance` in the mod list, and before `NP_UIColors` and `NP_OptionsCategories`. Only `Scene_KNSQuest` uses the new windows. The quest board, the HUD, and map markers are unchanged.

## Parameters

No Plugin Manager parameters. Classification is `NP_QuestTabs.TABLE` (id ranges) and `NP_QuestTabs.IDS` (single ids). Anything not listed is a side quest.

## Install

Copy `NP_QuestTabs.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_QuestTabs.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_QuestTabs/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
