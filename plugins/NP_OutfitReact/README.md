# NP_OutfitReact

## Title

Yarizo comments on the priestess's outfit.

## Version

1.0 (`@plugindesc`).

## Purpose

When the priestess (actor 2) wears a swimsuit or a revealing outfit, and Yarizo (actor 21) is actually in the party, a two-line slide can play: his line, then her reply. Her portrait in the slide is the blushing one.

It fires in two cases, and only on a normal map where the player can walk (not battle, not an event or message, not the gallery, not the world map):

- Right after returning to the map from equipping that outfit, on the shorter equip cooldown.
- On a map transfer, at the transfer chance, if both the time and step cooldowns have elapsed.

Yarizo must have the contract (switch 643), be alive, not removed by the port scene (switches 503 and 2040), and be in the party. If the hero is also in the party, the lines stay compliments and double meanings. If the hero is absent, the tone follows bond variable 204, and switch 32 caps how far that tone can go. The same line is not repeated back to back.

## Load order

After `NP_SaveThumb`, before `NP_PictureAnim`. Uses KNS slide windows, the same path as travel chatter (common event 451). Optional gasp via `NP_Voice`.

## Parameters

- **Enabled** `true` — Options label **Реплики про одежду**.
- **Transfer Chance** `0.3` on a map change.
- **Cooldown Seconds** `120` and **Cooldown Steps** `150` between transfer lines.
- **Equip Cooldown Seconds** `20` after changing into a swimsuit or revealing outfit.
- **Voice Volume** `60` for the gasp pool. `0` is silent.

## Requires

Windows **Alpha 0.80j**. From the downloaded ZIP, run `install.bat` and give it the game `www` folder. README categories are not the load order.

## Install

Copy `NP_OutfitReact.js` into the game's `www/js/plugins/` directory. The file name must stay `NP_OutfitReact.js`. In Plugin Manager, turn it ON in the order in [Load order](#load-order). RPG Maker MV loads plugins from `www/js/plugins/`, not from this repository's `plugins/NP_OutfitReact/` folder.

## Assets

Copy the contents of this plugin's `assets/` folder into the game's `www/` directory and keep the relative paths. A file at `assets/img/pictures/example.png` must end up at `www/img/pictures/example.png` (and `assets/movies/clip.webm` at `www/movies/clip.webm`). The folder name `assets` is not part of the game path.

Slide portraits in `img/system/`. The script asks for `np_or_yarizo` and `np_or_pri_<face>_<hat>`.

- `np_or_yarizo.png` — Yarizo's slide face
- Priestess faces `fl` (flush), `an` (angry), `sh` (shy), `pl` (pleased)
- Hat suffix `0` (no listed hat) or head-armor ids `92`, `93`, `94`, `95`, `98`, `99`

That is 28 priestess files plus Yarizo, 29 in total. Example: `img/system/np_or_pri_fl_0.png`.

Full list and checksums: [INVENTORY.md](../../INVENTORY.md).

## Screenshots

Pictures below are files shipped with the plugin, not a new gameplay capture.

![Yarizo slide face](assets/img/system/np_or_yarizo.png)
![Priestess, flush, no hat](assets/img/system/np_or_pri_fl_0.png)
![Priestess, shy](assets/img/system/np_or_pri_sh_0.png)
