# Developer notes

Player install is `install.bat` / `install.py` on Windows. Players do not need git.

## Layout

```
plugins/NP_<Name>/
  NP_<Name>.js
  README.md
  README.ru.md
  assets/          # optional; mirrored into game www/
install/
  plugins_order.txt    # load order for plugins.js
  plugins_order.json   # same order plus descriptions and parameters
  cc0_audio.json       # three shipped CC0 ogg files
  audio_aliases.json   # 50 optional names built from the player's own files
docs/screenshots/historical/   # 16 older in-game frames
```

## Load order

1. `NP_Language` immediately after `MEO_Util_Node` (before CSV readers).
2. All other `NP_*` from this pack are one block at the end of `plugins.js`.
3. `NP_OptionsCategories` is last.
4. `NP_PartyMenu` and `NP_Tips` are not in this repository.

README categories are navigation only. Do not reshuffle `plugins_order.*` to match them.

The installer rewrites `plugins.js` when that order is wrong or a managed name is duplicated. It keeps the first copy's parameters and on/off state. The first change saves `plugins.js.bak` and does not replace that backup later.

## What is required

| Need | Where it comes from | If it is missing |
|---|---|---|
| 44 `NP_*.js` and packaged `assets/` | this pack, copied by `install.py` | installer error |
| `audio/bgs/NP_Campfire_Crackle.ogg`, `audio/se/NP_ClothRip.ogg` | CC0 files in `NP_AudioBalance/assets/audio/` | installer error after a normal asset copy |
| `audio/bgs/Rain.ogg` | same CC0 folder; an original event name, not a script call | installer error only because the file is part of the shipped asset set |
| `www/lang/en/build_info.json` and `data_overlay.json` | [nympri-ru](https://github.com/posolware1/nympri-ru) | warning; `NP_Language` refuses English and stays on Russian |
| Quest row 201090 | kept if already in `csv/QuestList.csv`; otherwise `NP_YarizoQuest` inserts only that row in memory | no CSV is shipped or replaced |
| 50 historical audio names | optional `install.py --repair-audio` from the player's own files | normal install still succeeds |

`NP_Voice` reads `audio/bgs/!voice_moan1.ogg` and `audio/se/!voice_cumming1.ogg` from the game. They are not in this pack.

Eight alias rows are byte copies. Forty-two need ffmpeg (`libvorbis`, quality 5, the filter in the mapping). Output bytes are not promised to match any older encode. `--degraded-copy` is an explicit plain copy and must not be described as loudness-matched. The repair never overwrites a file that is already there, never follows `..` or a symlink, and checks the source SHA-256 before writing.

These 50 names are missing filenames used by original events. They are not 50 direct dependencies of `NP_AudioBalance.js`.

Not shipped, on purpose: nine same-name remasters of files the game already had (`harmonic-cute`, `harmonic-pondering`, `harmonic-peaceful`, and six explicit SE). Copying those would replace the player's files and would publish explicit audio. Historical loudness parity is incomplete without that separate work.

`NP_VideoPortrait` and `NP_PictureAnim` do not install the event commands that display their media. There is no mp4 or m4a set in this pack. Do not claim phone or browser playback.

## Checks

```bash
python3 -m unittest tests.test_install -v
```

Those tests use temporary folders. They do not launch the game.

A separate file-install check of commit `40a1351` on an isolated copy of original 0.80j is recorded in [install-test.md](install-test.md). It covers the installer only. It does not include a Windows launch, play, the language switch, sound playback, or the in-memory Yarizo row.

A later Linux shot copy, with case aliases for the original game’s own files, did start and load save file 15. Four frames from that session are in the plugin folders. See [screenshots/2026-11-08.md](screenshots/2026-11-08.md). That session is not official Linux support, not a Windows check, and not a full playtest.

Screenshots under `docs/screenshots/historical/` and the older shots already next to some plugins are previous captures. Captions must say what is actually visible. Do not add mockups.

## Platform

Target is the Windows ZIP. On a case-sensitive disk the original game can fail before any NP plugin runs, because it mixes `TB_NPCstate` with `TB_NPCState.js` and `img/pictures/ui` with `UI`. The installer prints that when it is not running on Windows. It does not create those aliases and does not bundle original UI assets.

UTF-8 without BOM. Do not reformat the plugin `.js` files except for a reviewed behavior change.
