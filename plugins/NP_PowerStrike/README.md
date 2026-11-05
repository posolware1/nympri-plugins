# NP_PowerStrike

## Title

Power Strike command with three QTEs.

## Version

1.1 (`@plugindesc`). The older plugins.js line said 1.0; the script header is 1.1.

## Purpose

Hero and ally battle menus gain **Усиленный удар / Power Strike** immediately after Attack. Choosing it plays one of three drawn QTEs. Timers scale with the game's difficulty (variable 3: Fap, Normal, Hard, hidden Easy). Prompts on screen:

- Stop a moving marker inside the gold zone (OK or tap).
- Hold OK or the mouse button and release inside the gold zone.
- Press OK or click circles before they fade.

The grade is written to the result variable. The following normal attack (common event 36) is then multiplied once, after armor, and the multiplier is cleared. A Perfect grade also plays animation 12. The swing adds fatigue. `CommonEvents.json` is not edited. Commands: `NP_PowerStrike run`, `NP_PowerStrike clear`.

## Load order

After `NP_TitleProgress`, before `NP_TitleVolume`. The command is injected into common events 365 (hero) and 366 (allies) in memory, after `TB_CommonEventPatchLoader`. `NP_BattleCmd` should be loaded after this script so it can label the icon. `NP_SuperAttack` comes later and sits next to this command.

## Parameters

- **Result Variable** `3530` — QTE grade: −1 skipped, 0 weak, 1 normal, 2 good, 3 perfect.
- **Multiplier Variable** `3531` — damage multiplier ×100 (170 means ×1.7). 0 means no power strike.
- Multipliers: perfect **1.7**, good **1.25**, normal **1.0**, weak **0.6**.
- **Fatigue Rate** `0.5` — extra fatigue, so the swing costs ×1.5 of a normal attack.
- **Command Icon** `131`, **Perfect Animation** `12`.
- **Fap Auto Success** `false` — when on, Fap difficulty skips the QTE and scores Perfect.
- **Command Labels** `true` — draws the command name beside the icon cursor.

## Install

Copy `NP_PowerStrike.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_PowerStrike.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_PowerStrike/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
