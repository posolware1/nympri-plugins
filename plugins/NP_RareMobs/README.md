# NP_RareMobs

## Title

Thirteen rare elites, a bestiary, and one-time loot.

## Version

1.0 (script constant). `@plugindesc` does not repeat it. `NP_EliteMobs` later raises every species roll, including these, to 25%.

## Purpose

When a dungeon copies one of 13 base monsters from the template map, the first eligible symbol after entering the map can be rare. The original roll is 4–6% by species, at most one rare per entry. The roll is stored once per map and day. After a kill (or the thief rat escaping) that species does not appear again that day.

A rare shows a star on the name, recolours the existing sprite, and adds a glow. HP is ×1.5 / 2 / 2.25 / 2.5 by Fap / Easy / Normal / Hard, experience is doubled, erotic grabs are turned off, stun and sleep are resisted, and one super hit deals at most half of max HP.

The thirteen, with the short version of the fight:

- Thief Rat — steals gold and flees; sleep or stun holds her.
- Bee Queen — a swarm that eats damage until fire or a super; day only.
- Grey Packleader — a warned howl that stacks damage; night only.
- Rogue Bear — below half HP it warns, then strikes twice; night only. The claw drop becomes 600 G without Yarizo's contract.
- Plague Herbalist — a called flask; Guard breaks it, the Potion Maker can catch it.
- Gnoll Bannerman — armor stacks until a heavy hit or a super breaks the banner.
- Amber Golem — a crust that magic, fire, or a super cracks.
- Royal Jelly — regenerates until water or magic; acid hurts the priestess's vestments. Its trait is shown in the bestiary once met.
- Storm Raiju — a three-turn discharge; a super steals the charge.
- Heart of Flame — melee attackers lose HP, water hurts it, it can explode.
- Renegade Blade — drains super charge and counterattacks if ignored.
- Night Plate — high armor, weak to holy, each hit relieves 1 stress; night only.
- Bog Drowned — a grab that an ally can break, plus stress each turn; night only.

Every kill pays gold and triple base materials, plus a species bonus. The rare item (12–30%) drops once per species; the strongest require dungeon level 3 or higher. Later kills of that species pay gold, experience, and materials only. Items are found by `<NP_ITEM:key>` from `NP_Items`.

Menu **Бестиарий редких / Rare bestiary**: unmet kinds are `???` silhouettes that still show lore and an indirect omen. Met kinds show the recoloured sprite, where they were met, kills, and (for the jelly) the mechanic. Loot is a pulsing silhouette until it drops, then the real icon and the name.

## Load order

After `NP_BossBalance`, before `NP_MorningHints`. `NP_EliteMobs`, `NP_EliteRewards`, and `NP_EliteSprites` must stay after this script and after `NP_Items`. Options row **Редкие враги / Rare enemies**, default on.

## Parameters

No Plugin Manager parameters. The Options toggle is the on/off switch. Off means no rare spawns, no rare mechanics, and no extra rewards. The bestiary stays readable.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_RareMobs.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_RareMobs.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_RareMobs/` folder.

## Screenshots

No screenshot is included. This plugin has no separate screen, or no selected frame shows it clearly. A later picture has to be a real game frame, not a mockup.
