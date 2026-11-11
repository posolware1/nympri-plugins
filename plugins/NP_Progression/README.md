# NP_Progression

## Title

Open guild rank 3, and fix the midgame walls that were stuck.

## Version

1.1 (`@plugindesc`).

## Purpose

Alpha 0.80j already contains the guild promotion from rank 2 to rank 3. The menu line is stored as `\v[64]` with a check that never happens (`if(v[1]>9999)`). This plugin shows that line once your rank is at least 2. Inside the rank-2 branch the game stores 150 in variable 54, then asks whether fame (variable 322) is at least variable 54. The plugin changes that 150 to the parameter. The game's own commands still take the two-star tag, give the three-star tag, and set the rank. There is no separate “you must already hold tag 888” check. This plugin never writes variable 8, variable 9, variable 912, or variable 922.

The old price was 150 fame. A normal play of the route that exists in 0.80j does not reach 150 without repeating hunts. The plugin uses **60** fame instead. You can change that number in the Plugin Manager (`Rank3Fame`).

Doing the repair twice changes nothing. Turning the option off stops new repairs; a map you already entered stays as it was until you leave it or reload. Saves are not rewritten. No file that shipped with the game is edited on disk.

### Why 60 fame

Fame from a turned-in quest is its star rating. One star pays 1. Common events 46 and 926 were checked on the real commands: the exam block uses ordinary variable commands on 922, and the Titan reward block uses 942. There is no script read of 922 that should have been 912, so those events are not rewritten, and their extra lines are not added on top of this count.

- The chapter 1 story pays about **27** fame. That number already includes **+11** from God's Mercy.
- The goblin raid asks for 30 fame *before* that mercy bonus. The story alone is not enough, so you finish one-star jobs. Seventeen distinct jobs are open in chapter 1, counted once: 101002, 101003, 101004, 101005, 101008, 101009, 101010, 106002, 106003 (no extra gate), 101001, 106001, 106006 (the repeatable hunts, once), 101006, 101011, 101012, 101007 (potion-maker bond 1 or 2), and 102001 (beach shells). About **20** turn-ins — those seventeen once, plus a few single extra clears of a repeatable hunt — is what it takes to reach 30. That is the route, not an endless farm.
- **27 + 20 = 47** at the end of chapter 1, which is also when you take the tower exam. Rank 3 should not be waiting at the door.
- After the exam the capital offers three rank-2 jobs (201003, 201005, 201006): **+6**.
- On Titan Step the wasteland board has four hunts whose targets are on the road you are already walking (307001–307004): **+12**.
- **47 + 6 + 12 = 65.** Sixty sits in that gap. You are past the exam, and you reach it while finishing Titan and a few of its hunts, before Blood Ruins.

A careful player can also clear the rest of that board (307005–307008, +12), the pirate jobs (+4), four ungated two-star jobs in the capital (+8), the bond-3 alchemy and iron jobs (+6), and the milk route after meeting Yarizo (+1). That thorough one-time total is **96**, still under 150. These are not required for 60.

Not counted, on purpose: repeatable hunts past those few extra clears; quest 301010 (it needs rank 3); the camp jobs 309xxx (the world-map road to camp 288 is not confirmed); the stolen-stocking job (it needs 480 friendship, which is a grind); story quests whose journal never opens because of `v[1] == 9999`; the orc-pig chain, which does not start. The “about 50–80 after chapter 1” figure includes extra repeats. This plugin does not ask you to do those.

### What else changes

- **Capital weapon shop** (map 18). The +1 gear used to need chapter variable 12 at 2 or more. Plate and the falchion needed it at 3 or more. That variable is almost never set, so both layers stayed hidden. +1 gear now opens at rank 2 or more. Plate and the falchion open at rank 3 or more. Both of those ranks can actually happen.
- **Exam forest** (maps 176–179). The maps had no dungeon level, so they stayed at 1. The note becomes dungeon level **2** when it had no level tag. Rats and spiders are not enemy numbers inside `add_event`. The script sets `id = 1` (map 29 event 1, the rat) or `id = 8` (event 8, the spider), then calls `add_event(x, y, id, 29, 6)`. Those two slots become **37**, the thief template (enemy 304), which the south forest already uses. Other slots, including bees and wolves, stay. A level tag that is already there is not replaced. Map 177 alone has six rats and five spiders.
- **Blood Ruins** (map 263). No level tag, so the last fight of this stretch stayed at dungeon level 1 even though Titan Step is already 3. The note becomes dungeon level **3** when it had no tag. Level 3 is the first level that lets the rare enemies with a gate of 3 appear. It is not 4, because the later slum interior (map 265) is already 4.
- **Fame “equals 10” and “equals 30”.** On this version those checks are already “at least”. Nothing is rewritten there.
- **Common events 46 and 926.** No 922-versus-912 script swap exists in the loaded commands, so they are left alone.
- **Rank 1.** The promotion line requires rank 2 or more, so fame cannot skip the tower exam.

### Quest 301010 and the camp agent

Quest **301010 “The Immortal”** is open again at rank 3 or more. Its chain already runs on registered maps, from the sister in the crossroad village through the vampire castle and the doctor’s lab back to the guild. The journal reward was empty. Other rank-3 jobs pay 150 to 500 silver: the four Titan hunts pay 200, the kidnapped villagers pay 150, the orc general and the dryad honey pay 300, and the smith pays 500. 301010 is a long chain, so it receives **300** silver, the same amount as those longer jobs, not the short 200 hunts and not the 500 smith.

Quest **301011** stays locked. Its scenes sit on maps 406, 407, 432, and 433, which are not in the map list. Its release check becomes a condition that never happens.

The guild agent on camp map 288 (event 16) is back to the original check, variable 9 at least 3. The plugin does not change that branch.

### Shop and drop prices

Prices are changed in the loaded item database, and in a shop line only when that line names its own price. Hard leather stays 2800 and moves from the rank-3 shelf to the rank-2 shelf. Brigandine stays 26800.

| What | Was | Now |
|---|---:|---:|
| Chainmail (armor 11) | 4500 | 3000 |
| Hard leather (armor 4) | rank 3, 2800 | rank 2, 2800 |
| Falchion (weapon 42) | 5200 | 3600 |
| Plate (armor 12) | 9800 | 6000 |
| Iron round shield (armor 48) | 6200 | 4000 |
| Dock potion and scroll (map 176, named prices 200 and 2000) | 200 / 2000 | 120 / 1000 |
| Camp gambeson (armor 5) | 9800 | 4500 |
| Camp brigandine (armor 14) | 26800 | 26800 |
| Dire wolf drop (enemy 112) | hides only | G:30:60 |
| Cerberus and Yatagarasu (enemies 905 and 906) | no gold | G:80:100 |

If a patch looks at the map it is meant for and matches nothing, it writes a warning. Doing the same patch again matches nothing and does not warn, because the commands are already in the new shape.

Rank 4 and rank 5 stay on the original “not ready” line.

### Experience

The level curve is not changed. The class uses `expParams` 20, 0, 30, 30. Total experience is 20 at level 2, 410 at level 5, 720 at level 6, and 5906 at the cap of 12. A honest clear of 0.80j ends around level 5 or 6. The exam forest pays about 22 experience before this plugin, Titan Step about 138, Blood Ruins about 130. The next level after 5 costs 206. The wall is enemy damage and gear prices, not the curve, so there is no extra experience bump. Dungeon level 2 on the exam forest doubles battle experience there. It still does not buy a level by itself.

## Load order

After `NP_SoftlockFix`, before `NP_ShopCompare`. The options row is grouped by `NP_OptionsCategories`, which stays last.

## Parameters

Plugin Manager: **Rank3Fame**, default **60**. Options row **Прогрессия середины игры / Midgame progression**, in Mechanics, default on.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_Progression.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_Progression.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_Progression/` folder.

## Screenshots

This plugin does not add its own screen.
