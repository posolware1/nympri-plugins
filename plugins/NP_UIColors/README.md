# NP_UIColors

## Title

One dark-fantasy palette across windows.

## Version

Not numbered in `@plugindesc`.

## Purpose

Nothing in CSV or the database is rewritten. Colours are applied while a window draws.

- A role palette (`NP_UIColors.ROLES`) and escape codes `\c[900+n]` so other plugins can ask for `lust`, `stress`, and the rest by name.
- Ordinary `\c[n]` indexes are remapped in every window except the message window, choices, and scrolling text. Those keep the scene colours.
- Item names from YEP Item Core follow item kind and equipment quality. Armor tiers come from the base price bands. An explicit non-zero `<Text Color: x>` note still wins.
- Quest titles differ for story, side, and tutorial. Completed quests are grey. Rewards, the hint line, and stars use the palette.
- Shop up/down arrows use the power-up and power-down colours.

## Load order

After `YEP_ItemCore`, `KNS_QuestBase`, `NP_QuestHints`, `NP_QuestTabs`, and `NP_ShopCompare`. In the mod list it sits after `NP_AudioBalance` and before `NP_LogToggle`. Before `NP_OptionsCategories`. Off is the vanilla palette.

## Parameters

No Plugin Manager parameters. Options row **Цветное оформление / Coloured UI**, category Interface.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_UIColors.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_UIColors.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_UIColors/` folder.

## Screenshots

No screenshot is included. This plugin has no separate screen, or no selected frame shows it clearly. A later picture has to be a real game frame, not a mockup.
