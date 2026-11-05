# NP_TitleVolume

## Title

Title-screen speaker and volume slider.

## Version

1.0 (`@plugindesc`).

## Purpose

The title screen gets a 300×52 widget: a speaker and a slider.

- Click or tap the speaker to mute BGM. The previous volume is remembered and restored on the next click.
- Click or drag the bar to set 0–100 in steps of 10.
- Mouse wheel over the widget changes volume by 10.
- M does the same as the speaker, and only on the title.

The value is `ConfigManager.bgmVolume`, the same Options row as BGM volume. It applies at once and is saved with `ConfigManager.save()`.

## Load order

After `NP_PowerStrike`, before `NP_PriestessDiary`. Independent of `NP_TitleProgress`. `NP_Language` draws its RU|EN button to the left of this widget.

## Parameters

- **Corner** `topright` (`topright` or `bottomright`).
- **Hotkey** `77` — key code M. `0` disables the key.

## Install

Copy `NP_TitleVolume.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_TitleVolume.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_TitleVolume/` folder. The folder exists so the script and its notes can be browsed, and later split out as a git submodule.

## Screenshots

screenshots TBD

No image files are shipped here. The panels described above are drawn by the plugin at runtime inside the game.
