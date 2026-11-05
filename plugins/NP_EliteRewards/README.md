# NP_EliteRewards

## Title

Six trophies for the new rares.

## Version

1.0 (`@plugindesc`).

## Purpose

Drop rules and the one-trophy-per-save gate stay in `NP_RareMobs`. This script is what the trophy does once it is equipped:

- **Hunt compass** reads rares already marked on the map. It does not roll new ones.
- **Second-chance lens** stores +1 hit after a missed ordinary attack. The next attempt spends it.
- **Twin needle** adds +1 damage before armor on every second successful ordinary hit. It is not multiplied by a crit or a weakness. A miss does not advance the count. Unequipping resets it.
- **Spore case:** a healing item that actually heals grants the target a 2 HP barrier against one direct hit. It does not stack. Two uses per wearer per battle, and the barrier expires at the end of the next enemy turn. A refund does not refill it.
- **Dusk tuning fork** binds the current dangerous telegraph of the six new elites. When that telegraph actually lands, each target takes 2 less (minimum 1). One execution per wearer per battle. An interrupted telegraph costs nothing.
- **Reserve bead** watches paid healing skills that really restore HP, counting MP spent and overheal on targets who were not already full. At 2 MP and 3 overheal it refunds 1 MP, once per battle. Party heals pay once. Items, regeneration, lifesteal, free casts, and full-HP targets do not count.

## Load order

After `NP_Items` and `NP_EliteMobs`, before `NP_EliteSprites`. Records are appended before YEP Item Core freezes base lengths. An occupied reserved id stops at boot instead of half-installing.

## Parameters

No Plugin Manager parameters. Reserved ids: weapon 701 Twin Needle; armors 1000 Hunt Compass, 1001 Second-Chance Lens, 1002 Spore Case, 1003 Dusk Tuning Fork, 1004 Reserve Droplet.

## Install

Copy `NP_EliteRewards.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_EliteRewards.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_EliteRewards/` folder.

## Screenshots

This plugin does not add its own screen.
