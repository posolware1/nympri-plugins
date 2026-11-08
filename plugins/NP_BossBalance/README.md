# NP_BossBalance

## Title

Boss HP, control resistance, phases, and super guards.

## Version

1.2, named in `@plugindesc` (`Boss balance v1.2`).

## Purpose

Turning **Boss balance** off restores vanilla boss behaviour. Two data fixes stay on either way: bounty uniques 1001–1004 keep their per-kill growth, and enemy rows 10012 (trance mage) and 32 (Puppet Master) keep the stats this script gives them (they were zeros).

With the option on, for a boss (switch 15 or a known unique):

- Stun from Bear Grip and sleep from Flask Throw are resisted by tier: 60 / 70 / 80 percent for tiers I / II / III, shifted by difficulty (Fap −20 then capped, Easy −10, Hard +5, max 80). A success costs the enemy exactly one turn, then two turns of immunity. Damage still lands.
- One super hit is capped at 35% of boss max HP (Fap 50, Easy 45, Hard 30).
- Base boss HP is ×1 / ×1.5 / ×2 / ×2.5 for Fap / Easy / Normal / Hard. Story-locked fights and tiny story mobs skip this.
- Fap, every chapter: after that scaling, HP and incoming damage drop further when the party started the fight with 1–2 living members, and a bit less with 3 or more. Boss guard is disabled, and a heavy attack is announced every 6 turns.
- Normal, chapter 1 only: a smaller version of that party-size relief. Chapter 1 ends at variable 911 = 99, rank 2, or the start of variable 912.
- Phase 2 starts at 50% HP. Telegraphed heavy hits can be blocked with Guard or by choosing Wait.

Named mechanics cover Medusa, Chimera, the orc general, Cerberus, the Doctor, the Mimic, the Flower witch, Dracula, Michael, the bounty uniques, and the trance adventurers. The gallery, ordinary mobs, and rare elites are outside the HP relief.

**Enemy guard vs supers** lets bosses and rare elites watch only the party's super-charge bars (not the chosen command) and sometimes enter a deep guard on their action. Chance rises with the highest charge, from 0 below 50% up to 40% at a full bar, then multiplied by difficulty. Fap bosses do not take this guard.

## Load order

Immediately after `NP_SuperAttack` and before `NP_RareMobs`. The help text says the super cap and the guard read super-charge bars, so the super plugin has to be loaded.

## Parameters

No Plugin Manager parameters. Two Options rows, category Battle: **Баланс боссов / Boss balance** (default on) and **Защита врагов от суперов / Enemy guard vs supers** (default on).

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_BossBalance.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_BossBalance.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_BossBalance/` folder.

## Screenshots

Boss fights show phase warnings and a stun limit. A screenshot of a phase warning is not yet available.
