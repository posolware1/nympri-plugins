# NP_YarizoQuest

## Title

Journal quest for meeting and hiring Yarizo.

## Version

1.1 (`@plugindesc`).

## Purpose

The quest does not start if the contract is already signed, if Yarizo is dead, or in the gallery. It starts from an NPC line when the player enters the capital or the port.

Stages in variable 3570, and where the marker points:

- 1, a rumor: go to Port Town (rank 2). Marker on the road to map 171.
- 2, rescued: hire him at the adventurers' guild. Marker on map 13, event 45.
- 3, the guild refused: he is still waiting there. Same marker.
- 4, sailors took him: a 200 silver ransom, tomorrow. Marker on map 171, event 67.
- 5, the ransom was postponed: still on the pier. Same marker.
- 99, hired (switch 643): completed.
- 100, hiring is impossible (died or vanished before the contract): closed.

Place, description, and details in the journal change with the stage, so later steps are not spelled out in advance. Russian and English strings live in `NP_YarizoQuest.TEXT`.

## Load order

After `NP_CampSkills`, before `NP_ShopCompare`. Uses quest id 201090 and variable 3570. Load before `NP_QuestTabs`. It watches Yarizo's switches; it does not rewrite his events.

## Parameters

No Plugin Manager parameters.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

Journal id 201090. An existing row in `csv/QuestList.csv` is kept. If the row is absent, the plugin adds only that row in memory, in Russian and English. The CSV file is not replaced.

## Install

Copy `NP_YarizoQuest.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_YarizoQuest.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_YarizoQuest/` folder.

## Screenshots

The journal tracks where Yarizo is, and the quest marker follows. A screenshot of that journal entry is not yet available.
