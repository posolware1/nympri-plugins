# Clean-game install check

File installation only. The game was not started. No Windows launch, no playtest, no check that Yarizo’s journal row appears, that the new sounds play, or that the language switch changes text.

Tested installer: commit `40a1351bcd693efbf8b304719753533a3d0fb730` (PR #2). Zip `https://codeload.github.com/posolware1/nympri-plugins/zip/40a1351`, SHA-256 `69c29d02f22be8e2f9e2ce7233fc00f06bba5f772cf5022da3cc4028f0172ae5`. Later commit `8f187c9` changes plugin wording only. `install.py`, `install_audio_aliases.py`, and the plugin scripts are the same as in the tested commit.

Date: 2026-11-07, Europe/Belgrade. An untouched local copy of original 0.80j was copied into an isolated folder (copy matched the source; no shared inodes). The source tree was not modified (8764 files, inventory unchanged). ffmpeg 7.1.5 was already on that machine. All four runs exited 0.

## `install.py` twice

- 44 `NP_*.js` files and 44 plugin entries.
- `NP_Language` immediately after `MEO_Util_Node`. Order matches `install/plugins_order.json`. Last NP entry is `NP_OptionsCategories`.
- No new duplicate names. `SAN_ExtendedEventPage` was already listed twice in the untouched game. The installer did not add that.
- 102 asset files matched the zip by hash: the previous 98, three CC0 `.ogg` files, and `CREDITS_NP_CC0.txt`.
- The only existing game file changed was `www/js/plugins.js`. `www/js/plugins.js.bak` matches the file from before the install.
- `csv/` and `data/` were not changed or added.
- The second run left the file-content inventory identical. Timestamps were not compared.
- English files were absent. The installer warned and named the Russian fallback. English mode was not switched on.
- `csv/QuestList.csv` has no quest 201090. The installer said the plugin would add that row in memory. The CSV was unchanged. The row was not observed in a running game.

## `install.py --repair-audio` twice

- First repair created exactly the 50 mapped names: 8 byte-identical copies and 42 Vorbis re-encodes. No missing sources, hash mismatches, skips, or errors. Source files were unchanged. No file that already existed was modified.
- None of the 42 re-encodes matched the historical output checksums. That matches the mapping note: a later ffmpeg build is not promised to reproduce those bytes. Loudness was not measured.
- The second repair created nothing and left all 50 in place. The content inventory did not change. `plugins.js.bak` still matched the original.

The installer printed its note about mixed-case paths in the original game. The game was not started on Linux or Windows, so that note was not checked by launching.
