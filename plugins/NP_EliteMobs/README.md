# NP_EliteMobs

## Title

Six more rare species and a shared 25% roll.

## Version

1.0.1 (`NP_EliteMobs.VERSION`). `@plugindesc` has no number. `NP_EliteSprites` text asks for expansion 1.0.2; this file's constant is 1.0.1.

## Purpose

This is an add-on. Normal enemy data, the original rare mechanics, quests, save ids, and original graphics are not edited. The six use existing character sheets plus the original recolour and glow. Draft art is not installed; `NP_EliteSprites` is the optional custom look.

All 19 species then roll at 25%. A daily roll that was already stored is left as it was. At most one rare is chosen after the map's spawn batch, from the species that succeeded, using a stable shuffle of map and day. A rare that is already active stays.

The six, and what the player sees in the fight:

- Bloodtrail Wolf — marks the most wounded ally and bites harder if they are at half HP or below. Healing, Guard, or Wait clears it. The target is announced.
- Retribution Spider — remembers who landed the last direct hit and bites them harder. Another ally's hit pulls it away. Guard or Wait clears it.
- Black Oath Scorpion — marks the first attacker, spends a turn aiming, then strikes harder. Guard or Wait clears it. After the thrust its armor drops for a turn.
- Stillgrowth Mushroom — gains maturity when nobody hits it, hits harder, and at two stages warns of a spore burst. A hit removes a stage. Fire clears it.
- Shifting Echo Bat — remembers physical versus magical hits and softens the next hit of the same type. Every three actions it warns of a sonic lunge. Dungeon level 3 or higher for the rare drop.
- Gorging Sludge — using an item makes it spend the next action healing. Lightning interrupts that. Its normal immunity and lightning weakness stay. Dungeon level 3 or higher for the drop.

Loot rates, the once-per-save trophy, and the bestiary pages go through `NP_RareMobs` without replacing the older entries. Each new page has lore, an omen, and the mechanic once the species has been met.

## Load order

After `NP_Items` and `NP_RareMobs`, before `NP_EliteRewards`. It does not replace the original thirteen. It registers six more kinds on the same bestiary and renderer.

## Parameters

No Plugin Manager parameters. The existing **Редкие враги** option still gates all of them.

## Install

Copy `NP_EliteMobs.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_EliteMobs.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_EliteMobs/` folder.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
