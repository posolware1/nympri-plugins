# NP_TitleProgress

## Title

Title screen that follows the Yarizo route.

## Version

1.0 (`@plugindesc`).

## Purpose

The title the player sees is the furthest stage ever reached on this install, not the stage of the save they happen to highlight. Gallery mode (switch 5) is not counted. The stage only increases.

- Stage 0 — fresh install.
- Stage 1 — Yarizo contract (switch 643) or bond variable 204 at least 2.
- Stage 2 — bond at least 3.
- Stage 3 — bond at least 4.

Each stage has its own background and BGM. The picture slowly zooms and pans when Ken Burns is on. Turning the option off always shows stage 0.

## Load order

After `NP_FastBattle`, before `NP_PowerStrike`. Does not depend on `NP_TitleVolume`. The furthest stage is stored in `config.rpgsave`, so the title knows it without loading a save.

## Parameters

- **Enabled** `true` — Options label **Заставка по прогрессу**. Off forces stage 0.
- **Backgrounds** `np_title_s0,np_title_s1,np_title_s2,np_title_s3` in `img/titles1`.
- **Logo** `np_title_logo` in `img/titles2`.
- **Bgm** four tracks, volumes **90,90,90,100**. An empty name falls back to the system title BGM.
- **Ken Burns** `true` — slow zoom and pan of the background.

## Install

Copy `NP_TitleProgress.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_TitleProgress.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_TitleProgress/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
