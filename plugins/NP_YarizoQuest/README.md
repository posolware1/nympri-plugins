# NP_YarizoQuest

## Title

Journal quest for meeting and hiring Yarizo.

## Version

1.2 (`@plugindesc`).

## Purpose

The quest does not start if the contract is already signed, if Yarizo is dead, or in the gallery. It starts from an NPC line when the player enters the capital or the port.

Stages in variable 3570, and where the marker points:

- 1, a rumor: Port Town. The scene starts automatically on entering. He is at the west edge by the water (map 171, tile 2,17). Rank 2 or higher.
- 2, rescued: hire him at the adventurers' guild. Marker on map 13, event 45.
- 3, the guild refused: he is still waiting there. Same marker.
- 4 and 5 are used only when switch 2040 is already on. The original 0.80j map has no buyout event 67, and this plugin does not add it. A failed rescue in the original scene sets switch 503.
- 99, hired (switch 643): completed.
- 100, hiring is impossible (died or vanished before the contract): closed.

On map 171 the plugin does not replace the map file. While switch 290 is off and rank is at least 2, event 1's empty page (variable 911 at least 4) does not cover the meeting. Switch 301 leaves that page as in the original. After switch 290, that page is unchanged. Events 29–31 stay visible from rank 2 upward until the meeting, not only at exactly rank 2.

If actor 21 is already in the party, or switch 643 is already on, and the meeting flags do not match a finished hire, the plugin sets switches 290, 291, and 643 on, switch 503 off, and variable 3570 to 99. It does not change variables 8 or 911. It does nothing when switch 2040 is on, and nothing when he is dead, not hired, and not in the party.

Place, description, and details in the journal change with the stage. Russian and English strings live in `NP_YarizoQuest.TEXT`.

## Changes

- 1.2 — Port meeting is no longer covered by the chapter-1 page once variable 911 is at least 4. Journal step 1 names the port, the automatic start, and the west edge by the water. A party or contract that was forced into place is lined up with the hired flags when that is unambiguous.
- 1.1 — Place, description, and details follow the current stage.

## Load order

After `NP_CampSkills`, before `NP_ShopCompare`. Uses quest id 201090 and variable 3570. Load before `NP_QuestTabs`. It does not replace `Map171.json`.

## Parameters

No Plugin Manager parameters.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

Journal id 201090. An existing row in `csv/QuestList.csv` is kept. If the row is absent, the plugin adds only that row in memory, in Russian and English. The CSV file is not replaced.

## Install

Copy `NP_YarizoQuest.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_YarizoQuest.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_YarizoQuest/` folder.

## Screenshots

The journal tracks where Yarizo is, and the quest marker follows. A screenshot of that journal entry is not yet available.
