# NymPri RU-mod plugins

![RPG Maker MV](https://img.shields.io/badge/RPG_Maker-MV-blue)

Personal plugin collection for the Russian mod of an adult RPG Maker MV game (Nymphomania Priestess). These notes are technical: what each script shows the player, which options it adds, and where it sits in Plugin Manager.

**Personal NymPri RU-mod plugins; not affiliated with the original game publisher.**

The same collection is also kept as a private Origin mirror, `kosta-gorunov/nympri-plugins`. This GitHub repository is the public copy.

## Layout

Each plugin is one folder:

```
plugins/NP_<Name>/
  NP_<Name>.js
  README.md
  README.ru.md
```

Folders are ordinary directories in this repository. `.gitmodules.example` lists 44 commented submodule stubs for a later split. Nothing in that file is active: it is not named `.gitmodules`, and every entry is commented out, so Git will not clone extra repositories.

`_plugins_order.js` from the mod project is the generated `plugins.js` list. It is not packaged here. The table below follows that list. `NP_PartyMenu` and `NP_Tips` are not part of this collection.

## Install

1. Copy every `plugins/NP_<Name>/NP_<Name>.js` into the game's `www/js/plugins/` directory. Keep the file name. The engine does not load scripts from these subfolders.
2. Enable the plugins in Plugin Manager in the order below. `NP_Language` is early: immediately after `MEO_Util_Node`, before plugins that read CSV at startup. The other 43 scripts are one block at the end of the list. `NP_OptionsCategories` is last.
3. Leave the rest of the mod in place (MEO, KNS, YEP Item Core, DreamX, and the game data). These scripts hook those systems. They are not a standalone project.
4. Nine plugins ship pictures and movies under `plugins/<Name>/assets/`. Copy the contents of each `assets/` folder into the game `www/` directory and keep the relative paths (`assets/img/...` becomes `www/img/...`, `assets/movies/...` becomes `www/movies/...`). The index is [INVENTORY.md](INVENTORY.md). English text, stock BGM, and camp audio still come from the full mod (`www/lang/en/` and the game's `audio/` folder).

Language files are UTF-8 without a BOM. Do not reformat the `.js` files: they are a byte copy of the mod sources.

## Plugins

| # | Plugin | What the player gets |
|---:|---|---|
| 1 | [NP_Language](plugins/NP_Language/README.md) | Title button and Options switch the whole game between Russian and English, then reload. |
| 2 | [NP_VideoPortrait](plugins/NP_VideoPortrait/README.md) | A looping movie plays where a standing portrait would, above pictures and under the message window. |
| 3 | [NP_AutoSave](plugins/NP_AutoSave/README.md) | Autosave on map transfers, after sleep, and before bosses, shown as the first two save rows. |
| 4 | [NP_QuestMarker](plugins/NP_QuestMarker/README.md) | A blinking «!» stands on the current quest target, or on the exit that leads there. |
| 5 | [NP_FastBattle](plugins/NP_FastBattle/README.md) | Option «Быстрый бой»: shorter battle waits, no dice pictures, battle log pages itself. |
| 6 | [NP_TitleProgress](plugins/NP_TitleProgress/README.md) | The title background, slow pan, and music advance with the furthest Yarizo bond the install has reached. |
| 7 | [NP_PowerStrike](plugins/NP_PowerStrike/README.md) | A battle command after Attack: three timed minigames, then a damage multiplier. |
| 8 | [NP_TitleVolume](plugins/NP_TitleVolume/README.md) | Speaker icon and a 0–100 music slider on the title screen, same setting as BGM volume. |
| 9 | [NP_PriestessDiary](plugins/NP_PriestessDiary/README.md) | A heart page of meters on the priestess, plus a key item that opens as a book of unlocked entries. |
| 10 | [NP_Voice](plugins/NP_Voice/README.md) | Option plays a short sigh, gasp, or moan sliced from audio the game already ships. |
| 11 | [NP_SaveThumb](plugins/NP_SaveThumb/README.md) | Save slots show a map thumbnail, chapter, quest, and priestess stage. An option allows saving on maps that normally forbid it. |
| 12 | [NP_OutfitReact](plugins/NP_OutfitReact/README.md) | On a swimsuit or revealing outfit, Yarizo sometimes speaks and the priestess answers in a slide. |
| 13 | [NP_PictureAnim](plugins/NP_PictureAnim/README.md) | A shown picture can sway, breathe, or laugh on a PIXI mesh. The face region stays rigid. |
| 14 | [NP_Campfire](plugins/NP_Campfire/README.md) | Some nights, a short talk plays between the hero, the priestess, and Yarizo before sleep. |
| 15 | [NP_Titles](plugins/NP_Titles/README.md) | Menu command «Титулы»: unlock titles from play, equip one, and the priestess gains a small stat bonus. |
| 16 | [NP_ClothDamage](plugins/NP_ClothDamage/README.md) | Hits on the priestess in her basic vestments swap the standing picture through three tear levels. Rest or re-equip mends it. |
| 17 | [NP_Stress](plugins/NP_Stress/README.md) | Each party member has stress 0–100, battle breaks or rallies, lasting traits, and a temple service that locks or removes traits. |
| 18 | [NP_CampSkills](plugins/NP_CampSkills/README.md) | Before the nightly talk, a menu spends 2 camp points or 4 inn points on rest skills and three-battle buffs. |
| 19 | [NP_YarizoQuest](plugins/NP_YarizoQuest/README.md) | Quest «Наёмник из таверны» tracks where Yarizo is and places the quest marker. The journal only shows what the player already knows. |
| 20 | [NP_ShopCompare](plugins/NP_ShopCompare/README.md) | On the buy screen, each party member who can equip the item sees current → new, in green or red. |
| 21 | [NP_BattleQoL](plugins/NP_BattleQoL/README.md) | Shift toggles ×2 battle speed. «Автобой» makes everyone take the plain Attack. A corner label shows ×2 and AUTO. |
| 22 | [NP_SuperAttack](plugins/NP_SuperAttack/README.md) | Priestess, Yarizo, the Potion Maker, and the vampire princess each get a super once a charge bar is full. |
| 23 | [NP_BossBalance](plugins/NP_BossBalance/README.md) | Boss fights gain phase warnings, stun limits, and difficulty scaling. Two Options rows can turn the scaling and the super-guard off. |
| 24 | [NP_RareMobs](plugins/NP_RareMobs/README.md) | Dungeon spawns can become a starred rare with its own mechanic. The menu opens a bestiary of silhouettes, omens, and loot. |
| 25 | [NP_MorningHints](plugins/NP_MorningHints/README.md) | After the priestess was away at night, the hero notices something small on the next map. She deflects. He accepts it. |
| 26 | [NP_QuestHints](plugins/NP_QuestHints/README.md) | The quest detail window gains one line, «Where to go: …», for steps the script actually knows. Tab titles gain counts. |
| 27 | [NP_QuestTabs](plugins/NP_QuestTabs/README.md) | The journal's two tabs become Story, Side, and Completed, with counts and a line when a tab is empty. |
| 28 | [NP_AudioBalance](plugins/NP_AudioBalance/README.md) | One option caps how loud BGM, BGS, SE, and ME are. Silent maps and several mod events gain cues even if that option is off. |
| 29 | [NP_UIColors](plugins/NP_UIColors/README.md) | Option «Цветное оформление» recolours quests, item names, the shop, and logs. Dialogue keeps the author's colours. |
| 30 | [NP_LogToggle](plugins/NP_LogToggle/README.md) | The bottom-left map log fades out during messages. A corner tab, L, or D collapses it to a counter. |
| 31 | [NP_ItemNameFix](plugins/NP_ItemNameFix/README.md) | On load, independent weapon copies such as «Short Sword» are renamed from the current database, including prefix and suffix. |
| 32 | [NP_BattleHUD](plugins/NP_BattleHUD/README.md) | Up to four party cards with a face, HP, MP, fatigue, super charge, stress, and effect icons. One option restores the original windows. |
| 33 | [NP_BattleCmd](plugins/NP_BattleCmd/README.md) | Battle command choices become two columns of icon plus label, with a hint under the cursor. A gold style marks a ready super. |
| 34 | [NP_Items](plugins/NP_Items/README.md) | Companion weapons, accessories, tools, cursed gear, DreamX affixes, and Holy Water, wired into battle and the shops. |
| 35 | [NP_EliteMobs](plugins/NP_EliteMobs/README.md) | Six extra starred encounters join the rare bestiary. Every rare species, old and new, rolls at 25%, one rare per map entry. |
| 36 | [NP_EliteRewards](plugins/NP_EliteRewards/README.md) | Each of the six new rares can drop one permanent trophy: compass, lens, twin needle, spore case, tuning fork, or reserve bead. |
| 37 | [NP_EliteSprites](plugins/NP_EliteSprites/README.md) | The six newer rares use their own character sheets, with the same aura and star as the older rares. |
| 38 | [NP_LevelAllocation](plugins/NP_LevelAllocation/README.md) | After a level-up, the hero and Kohaku spend every new point on one screen, with a draft and a sentence about each stat. |
| 39 | [NP_MenuLayout](plugins/NP_MenuLayout/README.md) | The pause screen becomes party cards, a quest panel, and the original commands, with extras under More. |
| 40 | [NP_EnemyHUD](plugins/NP_EnemyHUD/README.md) | The enemy side of battle becomes a card: name, HP, effect chips, and a paged detail view on F6. |
| 41 | [NP_BondHints](plugins/NP_BondHints/README.md) | The map log says which bond gate was reached and where to sleep next. Each gate is mentioned once. |
| 42 | [NP_SouthGateQuest](plugins/NP_SouthGateQuest/README.md) | From guild rank 2, a delivery quest pays 200 G at the southern checkpoint. No experience and no fame. |
| 43 | [NP_RemovedQuestCompat](plugins/NP_RemovedQuestCompat/README.md) | Old saves lose the leftover events and items of three quests the mod removed. Nothing new is added for the player. |
| 44 | [NP_OptionsCategories](plugins/NP_OptionsCategories/README.md) | The options list becomes Sound, Battle, Mechanics, Interface, Language & Text, and Other. Empty categories are hidden. |

## Load-order notes from the mod list

`NP_Language` is plugin 8 in the full `plugins.js` (right after `MEO_Util_Node`). The block from `NP_VideoPortrait` through `NP_OptionsCategories` is the tail of that file, in the order of the table. Individual READMEs repeat the neighbour that matters when two scripts draw the same screen.

Russian notes: [README.ru.md](README.ru.md).
