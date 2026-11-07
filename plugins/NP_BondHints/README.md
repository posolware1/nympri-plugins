# NP_BondHints

## Title

One log hint each time the Yarizo bond crosses a gate.

## Version

Not numbered in `@plugindesc`.

## Purpose

This replaces four old `yarizo_info` instructions. It does not replace ordinary level-up lines.

When the bond crosses a known gate, and the log can be read safely, one line is written:

- At level 5, a line that 5/5 is the maximum.
- Otherwise the threshold number, who still needs to be in the party, and where to spend the night: the capital inn's upstairs room, or the inn in the village on the Trade Route, depending on the stage.
- If Yarizo is dead or was taken before the next stage, the line says sleeping will not advance the bond until he is back.

Each gate is stored in `$gameSystem._npBondHints` and is not repeated. The marks survive a normal save.

## Load order

After `NP_LogToggle`, the KNS log scene, and `NP_Language`. In the mod list it sits after `NP_EnemyHUD` and before `NP_SouthGateQuest`. It does not change bond points, levels, events, recruitment, or options.

## Parameters

No Plugin Manager parameters. Gates are fixed at 50, 120, 280, and 500. Level 5 is the maximum.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_BondHints.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_BondHints.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_BondHints/` folder.

## Screenshots

No screenshot is included. This plugin has no separate screen, or no selected frame shows it clearly. A later picture has to be a real game frame, not a mockup.
