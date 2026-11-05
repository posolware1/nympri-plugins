# Developer notes

Player install is `install.bat` / `install.py`. Do not tell players to `git clone` or use submodules.

## Layout

```
plugins/NP_<Name>/
  NP_<Name>.js
  README.md
  README.ru.md
  assets/          # optional; mirrored into game www/
install/
  plugins_order.txt   # load order for plugins.js
  plugins_order.json  # same + descriptions/parameters for the installer
```

## Load order rules

1. `NP_Language` immediately after `MEO_Util_Node` (before CSV readers).
2. All other `NP_*` from this pack append as one block at the end of `plugins.js`.
3. `NP_OptionsCategories` is last.
4. `NP_PartyMenu` and `NP_Tips` are **not** in this repository.

README categories (Language / UI / Battle / Quests / Content / Misc) are navigation only — never reshuffle `plugins_order.*` to match them.

## Assets

Nine plugins ship pictures/movies under `plugins/<Name>/assets/`. `install.py` copies them into `www/` keeping relative paths. Index: [INVENTORY.md](../INVENTORY.md).

UTF-8 without BOM. Do not reformat the `.js` files.
