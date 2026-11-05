# NP_ClothDamage

## Title

Priestess vestments tear in battle and mend at rest.

## Version

Not numbered in `@plugindesc`.

## Purpose

While the priestess wears the basic vestment (armor 82, the outfit slot drawn as `stand-heroine-basic-cloth82-<variant>`), battle hits accumulate tear points. Crossing 4, 10, and 18 swaps the standing picture to a torn variant of the same pose. The picture already on screen changes immediately. `CommonEvents.json` is not edited.

Points reset to 0 on camp sleep (common event 474), inn or bed sleep (common event 325), and when the vestment is taken off and put back on outside battle. The gallery neither accumulates nor shows tears. State is `$gameSystem._npClothDmg`; old saves start at 0.

## Load order

After `NP_Titles`, before `NP_Stress`. `NP_Titles` reads the level for one title. `NP_AudioBalance` plays cues on tear and mend. Only armor 82 (the basic vestment, picture `stand-heroine-basic-cloth82`).

## Parameters

- **Enabled** `true` — Options label **Рваная одежда**.
- **Thresholds** `4,10,18` damage points for levels 1, 2, and 3.
- Points: a HP hit `1`, a crit `+2`, a hit of at least 25% max HP `+1`, an enemy skill tagged sexual or `<NP_ClothTear>` `+3` even with no HP loss.
- **LevelFiles** `t1,t2,t3` — picture suffix. Spare sets `ta` and `tb` exist in the art naming. A missing file keeps the intact picture.
- **BattleLog** `true` — a line in the battle log when the level changes.

## Install

Copy `NP_ClothDamage.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_ClothDamage.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_ClothDamage/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

This plugin does not add its own screen.
