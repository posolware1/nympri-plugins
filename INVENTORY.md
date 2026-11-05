# NymPri plugin assets inventory

Staged under `plugin_assets_for_repo/plugins/<Plugin>/assets/` for push into
`https://github.com/posolware1/nympri-plugins` (not pushed by this step).

## Policy
- Only files referenced by NP_* plugins or clearly NP-named (not whole `img/` / `audio/`).
- Paths mirror in-game relative paths (`img/pictures/...`, `img/characters/...`, etc.).
- Preferred source: Elites+Sprites Windows build; fallback: Alpha 080j RU build.
- Plugin `.js` files were not modified.

## Totals
- **Files staged:** 98
- **Total size:** 44.26 MB (46413309 bytes)
- **Plugins with assets:** 9

## Plugins checked with no dedicated assets
- **NP_EliteMobs** — Procedural map tint/aura/glow from base character sheets; no dedicated image files.
- **NP_EliteRewards** — Data/hooks only; trophy icons use stock IconSet indices.
- **NP_RareMobs** — Procedural HSV recolour + glow from base sprites; uses IconSet for drops.
- **NP_BattleHUD** — Uses base-game `img/pictures/battle/c_window_actorN` faces + IconSet — not plugin-owned.
- **NP_BattleCmd** — Draws glow procedurally; no image files.
- **NP_EnemyHUD** — Uses stock IconSet only.
- **NP_SaveThumb** — Captures/composites runtime bitmaps; no shipped art.
- **NP_Titles** — Achievement logic only; no dedicated images.
- **NP_PowerStrike** — Procedural QTE glow bitmaps; no shipped art.
- **NP_AudioBalance** — Volume routing only; does not ship audio files (uses existing BGM/BGS/SE).
- **NP_TitleVolume** — Config UI only; no assets.

## Per plugin

### NP_ClothDamage — 20 files, 20.45 MB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `img/pictures/stand-heroine-basic-cloth82-0-t1.png` | 573.9 KB | Elites_v1.0.2_Sprites build | `8ca30793278d462d` |
| `img/pictures/stand-heroine-basic-cloth82-0-t2.png` | 1.23 MB | Elites_v1.0.2_Sprites build | `886bc23c58495333` |
| `img/pictures/stand-heroine-basic-cloth82-0-t3.png` | 1.21 MB | Elites_v1.0.2_Sprites build | `812ae33abf523959` |
| `img/pictures/stand-heroine-basic-cloth82-0-ta.png` | 1.08 MB | Elites_v1.0.2_Sprites build | `3ae9c5f41cd73125` |
| `img/pictures/stand-heroine-basic-cloth82-0-tb.png` | 1.19 MB | Elites_v1.0.2_Sprites build | `9c676b1c71d0ff29` |
| `img/pictures/stand-heroine-basic-cloth82-1-t1.png` | 608.3 KB | Elites_v1.0.2_Sprites build | `169838c1aaa8f72b` |
| `img/pictures/stand-heroine-basic-cloth82-1-t2.png` | 1.27 MB | Elites_v1.0.2_Sprites build | `257b17350a7617e2` |
| `img/pictures/stand-heroine-basic-cloth82-1-t3.png` | 1.24 MB | Elites_v1.0.2_Sprites build | `73669bafeb57268c` |
| `img/pictures/stand-heroine-basic-cloth82-1-ta.png` | 1.13 MB | Elites_v1.0.2_Sprites build | `98a05a3785357299` |
| `img/pictures/stand-heroine-basic-cloth82-1-tb.png` | 1.24 MB | Elites_v1.0.2_Sprites build | `f77216aa6083a467` |
| `img/pictures/stand-heroine-basic-cloth82-2-t1.png` | 362.8 KB | Elites_v1.0.2_Sprites build | `f194c9f6692f5753` |
| `img/pictures/stand-heroine-basic-cloth82-2-t2.png` | 1.21 MB | Elites_v1.0.2_Sprites build | `ec11122eec5cc621` |
| `img/pictures/stand-heroine-basic-cloth82-2-t3.png` | 1.19 MB | Elites_v1.0.2_Sprites build | `0e34556ad4d196c3` |
| `img/pictures/stand-heroine-basic-cloth82-2-ta.png` | 1.05 MB | Elites_v1.0.2_Sprites build | `1ab23a39c3ff01ae` |
| `img/pictures/stand-heroine-basic-cloth82-2-tb.png` | 1.18 MB | Elites_v1.0.2_Sprites build | `271b95c695933023` |
| `img/pictures/stand-heroine-basic-cloth82-3-t1.png` | 386.2 KB | Elites_v1.0.2_Sprites build | `69c79ffcc12e4807` |
| `img/pictures/stand-heroine-basic-cloth82-3-t2.png` | 1.15 MB | Elites_v1.0.2_Sprites build | `e37badaf9765887b` |
| `img/pictures/stand-heroine-basic-cloth82-3-t3.png` | 1.12 MB | Elites_v1.0.2_Sprites build | `f3e56abfcd5c3910` |
| `img/pictures/stand-heroine-basic-cloth82-3-ta.png` | 1010.2 KB | Elites_v1.0.2_Sprites build | `3be625fcb66960b0` |
| `img/pictures/stand-heroine-basic-cloth82-3-tb.png` | 1.08 MB | Elites_v1.0.2_Sprites build | `45fa852925268963` |

<details><summary>Absolute source paths</summary>

- `img/pictures/stand-heroine-basic-cloth82-0-t1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-0-t1.png`
- `img/pictures/stand-heroine-basic-cloth82-0-t2.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-0-t2.png`
- `img/pictures/stand-heroine-basic-cloth82-0-t3.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-0-t3.png`
- `img/pictures/stand-heroine-basic-cloth82-0-ta.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-0-ta.png`
- `img/pictures/stand-heroine-basic-cloth82-0-tb.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-0-tb.png`
- `img/pictures/stand-heroine-basic-cloth82-1-t1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-1-t1.png`
- `img/pictures/stand-heroine-basic-cloth82-1-t2.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-1-t2.png`
- `img/pictures/stand-heroine-basic-cloth82-1-t3.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-1-t3.png`
- `img/pictures/stand-heroine-basic-cloth82-1-ta.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-1-ta.png`
- `img/pictures/stand-heroine-basic-cloth82-1-tb.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-1-tb.png`
- `img/pictures/stand-heroine-basic-cloth82-2-t1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-2-t1.png`
- `img/pictures/stand-heroine-basic-cloth82-2-t2.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-2-t2.png`
- `img/pictures/stand-heroine-basic-cloth82-2-t3.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-2-t3.png`
- `img/pictures/stand-heroine-basic-cloth82-2-ta.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-2-ta.png`
- `img/pictures/stand-heroine-basic-cloth82-2-tb.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-2-tb.png`
- `img/pictures/stand-heroine-basic-cloth82-3-t1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-3-t1.png`
- `img/pictures/stand-heroine-basic-cloth82-3-t2.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-3-t2.png`
- `img/pictures/stand-heroine-basic-cloth82-3-t3.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-3-t3.png`
- `img/pictures/stand-heroine-basic-cloth82-3-ta.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-3-ta.png`
- `img/pictures/stand-heroine-basic-cloth82-3-tb.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/stand-heroine-basic-cloth82-3-tb.png`

</details>

### NP_EliteSprites — 6 files, 44.2 KB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `img/characters/$NP_Elite_Wolf_v1.png` | 5.8 KB | Elites_v1.0.2_Sprites build | `3389b1d8c6cea081` |
| `img/characters/$NP_Elite_Spider_v1.png` | 7.9 KB | Elites_v1.0.2_Sprites build | `610ad2d2414c279c` |
| `img/characters/$NP_Elite_Scorpion_v1.png` | 8.3 KB | Elites_v1.0.2_Sprites build | `47e2286c10d513ba` |
| `img/characters/$NP_Elite_Mushroom_v1.png` | 11.6 KB | Elites_v1.0.2_Sprites build | `74a9612a20536662` |
| `img/characters/$NP_Elite_Bat_v1.png` | 6.2 KB | Elites_v1.0.2_Sprites build | `cec440e2a9d00836` |
| `img/characters/$NP_Elite_Sludge_v1.png` | 4.4 KB | Elites_v1.0.2_Sprites build | `8395d611362dcbd9` |

<details><summary>Absolute source paths</summary>

- `img/characters/$NP_Elite_Wolf_v1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/characters/$NP_Elite_Wolf_v1.png`
- `img/characters/$NP_Elite_Spider_v1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/characters/$NP_Elite_Spider_v1.png`
- `img/characters/$NP_Elite_Scorpion_v1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/characters/$NP_Elite_Scorpion_v1.png`
- `img/characters/$NP_Elite_Mushroom_v1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/characters/$NP_Elite_Mushroom_v1.png`
- `img/characters/$NP_Elite_Bat_v1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/characters/$NP_Elite_Bat_v1.png`
- `img/characters/$NP_Elite_Sludge_v1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/characters/$NP_Elite_Sludge_v1.png`

</details>

### NP_MenuLayout — 19 files, 8.8 KB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `img/system/np-menu/LICENSE.txt` | 880 B | Elites_v1.0.2_Sprites build | `1e7290b35280a048` |
| `img/system/np-menu/NOTICE.txt` | 205 B | Elites_v1.0.2_Sprites build | `2953d4786d61ac9f` |
| `img/system/np-menu/backpack.svg` | 524 B | Elites_v1.0.2_Sprites build | `53caf80cc1d0aa69` |
| `img/system/np-menu/book-open.svg` | 454 B | Elites_v1.0.2_Sprites build | `af73d9a232af14f1` |
| `img/system/np-menu/chevron-down.svg` | 315 B | Elites_v1.0.2_Sprites build | `092bc585e8be14d0` |
| `img/system/np-menu/chevron-left.svg` | 317 B | Elites_v1.0.2_Sprites build | `8487e8895015cfe0` |
| `img/system/np-menu/chevron-right.svg` | 317 B | Elites_v1.0.2_Sprites build | `0212027b224e2735` |
| `img/system/np-menu/coins.svg` | 427 B | Elites_v1.0.2_Sprites build | `391db07dbdf95fec` |
| `img/system/np-menu/ellipsis.svg` | 387 B | Elites_v1.0.2_Sprites build | `074e9267b0a03d1b` |
| `img/system/np-menu/heart.svg` | 432 B | Elites_v1.0.2_Sprites build | `1172005be86ff6e3` |
| `img/system/np-menu/moon.svg` | 329 B | Elites_v1.0.2_Sprites build | `fdcad9fb78b19229` |
| `img/system/np-menu/save.svg` | 488 B | Elites_v1.0.2_Sprites build | `6f3d226f8d5614cd` |
| `img/system/np-menu/scroll-text.svg` | 497 B | Elites_v1.0.2_Sprites build | `b76b2e6921c39fc4` |
| `img/system/np-menu/settings.svg` | 899 B | Elites_v1.0.2_Sprites build | `7b25dcd16799d743` |
| `img/system/np-menu/shield.svg` | 459 B | Elites_v1.0.2_Sprites build | `253b04710fb847d2` |
| `img/system/np-menu/sparkles.svg` | 643 B | Elites_v1.0.2_Sprites build | `a6581cb81b2582ca` |
| `img/system/np-menu/sun.svg` | 555 B | Elites_v1.0.2_Sprites build | `5b7ce5713292b6eb` |
| `img/system/np-menu/sword.svg` | 465 B | Elites_v1.0.2_Sprites build | `bb267a007d3e80a7` |
| `img/system/np-menu/users.svg` | 453 B | Elites_v1.0.2_Sprites build | `b0a20db7a87e0e0e` |

<details><summary>Absolute source paths</summary>

- `img/system/np-menu/LICENSE.txt` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/LICENSE.txt`
- `img/system/np-menu/NOTICE.txt` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/NOTICE.txt`
- `img/system/np-menu/backpack.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/backpack.svg`
- `img/system/np-menu/book-open.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/book-open.svg`
- `img/system/np-menu/chevron-down.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/chevron-down.svg`
- `img/system/np-menu/chevron-left.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/chevron-left.svg`
- `img/system/np-menu/chevron-right.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/chevron-right.svg`
- `img/system/np-menu/coins.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/coins.svg`
- `img/system/np-menu/ellipsis.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/ellipsis.svg`
- `img/system/np-menu/heart.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/heart.svg`
- `img/system/np-menu/moon.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/moon.svg`
- `img/system/np-menu/save.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/save.svg`
- `img/system/np-menu/scroll-text.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/scroll-text.svg`
- `img/system/np-menu/settings.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/settings.svg`
- `img/system/np-menu/shield.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/shield.svg`
- `img/system/np-menu/sparkles.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/sparkles.svg`
- `img/system/np-menu/sun.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/sun.svg`
- `img/system/np-menu/sword.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/sword.svg`
- `img/system/np-menu/users.svg` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np-menu/users.svg`

</details>

### NP_PictureAnim — 3 files, 2.20 MB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `img/pictures/np_beachanim_bg.png` | 1.50 MB | Elites_v1.0.2_Sprites build | `b3dbb96212573f8e` |
| `img/pictures/np_beachanim_pri.png` | 412.7 KB | Elites_v1.0.2_Sprites build | `fcecaaeee71c7c3b` |
| `img/pictures/np_beachanim_yar.png` | 305.1 KB | Elites_v1.0.2_Sprites build | `60bd3a7795cc9088` |

<details><summary>Absolute source paths</summary>

- `img/pictures/np_beachanim_bg.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_beachanim_bg.png`
- `img/pictures/np_beachanim_pri.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_beachanim_pri.png`
- `img/pictures/np_beachanim_yar.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_beachanim_yar.png`

</details>

### NP_SuperAttack — 8 files, 2.99 MB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `img/pictures/np_super_cutin_pri.png` | 655.5 KB | Elites_v1.0.2_Sprites build | `5df23922c84571fc` |
| `img/pictures/np_super_cutin_yar.png` | 704.2 KB | Elites_v1.0.2_Sprites build | `ff2f6925cedac382` |
| `img/pictures/np_super_cutin_pm.png` | 645.7 KB | Elites_v1.0.2_Sprites build | `2bb3aa048ad36d17` |
| `img/pictures/np_super_cutin_vp.png` | 671.2 KB | Elites_v1.0.2_Sprites build | `d5e8f4ae6bf33fd3` |
| `img/pictures/np_super_flask.png` | 18.1 KB | Elites_v1.0.2_Sprites build | `a6284a23ec4a717a` |
| `img/pictures/np_super_moon.png` | 132.0 KB | Elites_v1.0.2_Sprites build | `afd7a6fb19895820` |
| `img/pictures/np_super_reticle.png` | 40.1 KB | Elites_v1.0.2_Sprites build | `7c2c54a5192b7ac8` |
| `img/pictures/np_super_sign.png` | 191.1 KB | Elites_v1.0.2_Sprites build | `86b0c5dfdec5f453` |

<details><summary>Absolute source paths</summary>

- `img/pictures/np_super_cutin_pri.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_super_cutin_pri.png`
- `img/pictures/np_super_cutin_yar.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_super_cutin_yar.png`
- `img/pictures/np_super_cutin_pm.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_super_cutin_pm.png`
- `img/pictures/np_super_cutin_vp.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_super_cutin_vp.png`
- `img/pictures/np_super_flask.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_super_flask.png`
- `img/pictures/np_super_moon.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_super_moon.png`
- `img/pictures/np_super_reticle.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_super_reticle.png`
- `img/pictures/np_super_sign.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_super_sign.png`

</details>

### NP_TitleProgress — 6 files, 6.85 MB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `img/titles1/np_title_s0.png` | 1.78 MB | Elites_v1.0.2_Sprites build | `ae21691db6cc54fa` |
| `img/titles1/np_title_s1.png` | 1.53 MB | Elites_v1.0.2_Sprites build | `e29a5a9f9120daf8` |
| `img/titles1/np_title_s2.png` | 1.61 MB | Elites_v1.0.2_Sprites build | `fb5a0ffe6884ed17` |
| `img/titles1/np_title_s3.png` | 1.58 MB | Elites_v1.0.2_Sprites build | `8378418edd890346` |
| `img/titles2/np_title_logo.png` | 180.9 KB | Elites_v1.0.2_Sprites build | `3bded83300c70b4b` |
| `img/titles2/np_title_logo_en.png` | 165.2 KB | Elites_v1.0.2_Sprites build | `ba0fdbb6bdc7648b` |

<details><summary>Absolute source paths</summary>

- `img/titles1/np_title_s0.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/titles1/np_title_s0.png`
- `img/titles1/np_title_s1.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/titles1/np_title_s1.png`
- `img/titles1/np_title_s2.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/titles1/np_title_s2.png`
- `img/titles1/np_title_s3.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/titles1/np_title_s3.png`
- `img/titles2/np_title_logo.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/titles2/np_title_logo.png`
- `img/titles2/np_title_logo_en.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/titles2/np_title_logo_en.png`

</details>

### NP_VideoPortrait — 4 files, 10.39 MB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `movies/dance1.webm` | 2.67 MB | Elites_v1.0.2_Sprites build | `6daaba07e30de885` |
| `movies/dance2.webm` | 2.59 MB | Elites_v1.0.2_Sprites build | `c7237afd3142162b` |
| `movies/dance3.webm` | 1.40 MB | Elites_v1.0.2_Sprites build | `80ebc8156f81f0fd` |
| `movies/dance4.webm` | 3.73 MB | Elites_v1.0.2_Sprites build | `13f1165357497bbb` |

<details><summary>Absolute source paths</summary>

- `movies/dance1.webm` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/movies/dance1.webm`
- `movies/dance2.webm` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/movies/dance2.webm`
- `movies/dance3.webm` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/movies/dance3.webm`
- `movies/dance4.webm` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/movies/dance4.webm`

</details>

### NP_OutfitReact — 29 files, 1.02 MB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `img/system/np_or_pri_an_0.png` | 34.6 KB | Elites_v1.0.2_Sprites build | `064364ea259f9870` |
| `img/system/np_or_pri_an_92.png` | 39.2 KB | Elites_v1.0.2_Sprites build | `68c4c99e7a73a1e6` |
| `img/system/np_or_pri_an_93.png` | 37.6 KB | Elites_v1.0.2_Sprites build | `c33f8f713e57cf2b` |
| `img/system/np_or_pri_an_94.png` | 38.0 KB | Elites_v1.0.2_Sprites build | `3f61c1c885dcf242` |
| `img/system/np_or_pri_an_95.png` | 35.7 KB | Elites_v1.0.2_Sprites build | `95c03564c5b792f4` |
| `img/system/np_or_pri_an_98.png` | 33.5 KB | Elites_v1.0.2_Sprites build | `c77778a8f7a5a05b` |
| `img/system/np_or_pri_an_99.png` | 35.6 KB | Elites_v1.0.2_Sprites build | `caa26eb49eb0f263` |
| `img/system/np_or_pri_fl_0.png` | 34.5 KB | Elites_v1.0.2_Sprites build | `23e64649f7a96211` |
| `img/system/np_or_pri_fl_92.png` | 39.1 KB | Elites_v1.0.2_Sprites build | `aa52afa7eac08dec` |
| `img/system/np_or_pri_fl_93.png` | 37.5 KB | Elites_v1.0.2_Sprites build | `dc926ffc18d8b5fb` |
| `img/system/np_or_pri_fl_94.png` | 38.0 KB | Elites_v1.0.2_Sprites build | `d505897fd569fbef` |
| `img/system/np_or_pri_fl_95.png` | 35.6 KB | Elites_v1.0.2_Sprites build | `963ac57acd451bb0` |
| `img/system/np_or_pri_fl_98.png` | 33.4 KB | Elites_v1.0.2_Sprites build | `1fff21593242b774` |
| `img/system/np_or_pri_fl_99.png` | 35.5 KB | Elites_v1.0.2_Sprites build | `2c1f358ee20a212c` |
| `img/system/np_or_pri_pl_0.png` | 34.5 KB | Elites_v1.0.2_Sprites build | `1724eaa39d025354` |
| `img/system/np_or_pri_pl_92.png` | 39.1 KB | Elites_v1.0.2_Sprites build | `bf2bc1d3a282c787` |
| `img/system/np_or_pri_pl_93.png` | 37.4 KB | Elites_v1.0.2_Sprites build | `e62f4f91369b0cb7` |
| `img/system/np_or_pri_pl_94.png` | 37.9 KB | Elites_v1.0.2_Sprites build | `fa8e6573fa5df921` |
| `img/system/np_or_pri_pl_95.png` | 35.6 KB | Elites_v1.0.2_Sprites build | `5ec3ff29b1de04dc` |
| `img/system/np_or_pri_pl_98.png` | 33.4 KB | Elites_v1.0.2_Sprites build | `6154b5fff69c5a33` |
| `img/system/np_or_pri_pl_99.png` | 35.5 KB | Elites_v1.0.2_Sprites build | `3920e0c3e1dc89b7` |
| `img/system/np_or_pri_sh_0.png` | 34.2 KB | Elites_v1.0.2_Sprites build | `bae60cb69384758f` |
| `img/system/np_or_pri_sh_92.png` | 38.8 KB | Elites_v1.0.2_Sprites build | `cb72eedf2656f550` |
| `img/system/np_or_pri_sh_93.png` | 37.2 KB | Elites_v1.0.2_Sprites build | `b47de862f1b24f7a` |
| `img/system/np_or_pri_sh_94.png` | 37.8 KB | Elites_v1.0.2_Sprites build | `459da052fb281c85` |
| `img/system/np_or_pri_sh_95.png` | 35.3 KB | Elites_v1.0.2_Sprites build | `433a03d8c49597f2` |
| `img/system/np_or_pri_sh_98.png` | 33.3 KB | Elites_v1.0.2_Sprites build | `c1ad7f3de3cab7d8` |
| `img/system/np_or_pri_sh_99.png` | 35.3 KB | Elites_v1.0.2_Sprites build | `627695a40528fdd6` |
| `img/system/np_or_yarizo.png` | 27.2 KB | Elites_v1.0.2_Sprites build | `cb57dd6873ab19a3` |

<details><summary>Absolute source paths</summary>

- `img/system/np_or_pri_an_0.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_an_0.png`
- `img/system/np_or_pri_an_92.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_an_92.png`
- `img/system/np_or_pri_an_93.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_an_93.png`
- `img/system/np_or_pri_an_94.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_an_94.png`
- `img/system/np_or_pri_an_95.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_an_95.png`
- `img/system/np_or_pri_an_98.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_an_98.png`
- `img/system/np_or_pri_an_99.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_an_99.png`
- `img/system/np_or_pri_fl_0.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_fl_0.png`
- `img/system/np_or_pri_fl_92.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_fl_92.png`
- `img/system/np_or_pri_fl_93.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_fl_93.png`
- `img/system/np_or_pri_fl_94.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_fl_94.png`
- `img/system/np_or_pri_fl_95.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_fl_95.png`
- `img/system/np_or_pri_fl_98.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_fl_98.png`
- `img/system/np_or_pri_fl_99.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_fl_99.png`
- `img/system/np_or_pri_pl_0.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_pl_0.png`
- `img/system/np_or_pri_pl_92.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_pl_92.png`
- `img/system/np_or_pri_pl_93.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_pl_93.png`
- `img/system/np_or_pri_pl_94.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_pl_94.png`
- `img/system/np_or_pri_pl_95.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_pl_95.png`
- `img/system/np_or_pri_pl_98.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_pl_98.png`
- `img/system/np_or_pri_pl_99.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_pl_99.png`
- `img/system/np_or_pri_sh_0.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_sh_0.png`
- `img/system/np_or_pri_sh_92.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_sh_92.png`
- `img/system/np_or_pri_sh_93.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_sh_93.png`
- `img/system/np_or_pri_sh_94.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_sh_94.png`
- `img/system/np_or_pri_sh_95.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_sh_95.png`
- `img/system/np_or_pri_sh_98.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_sh_98.png`
- `img/system/np_or_pri_sh_99.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_pri_sh_99.png`
- `img/system/np_or_yarizo.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/system/np_or_yarizo.png`

</details>

### NP_Stress — 3 files, 332.0 KB

| Rel path | Size | Source | sha256-16 |
|---|---:|---|---|
| `img/pictures/np_stress_crack.png` | 161.3 KB | Elites_v1.0.2_Sprites build | `b22b7725cf329ca1` |
| `img/pictures/np_stress_afflict.png` | 104.6 KB | Elites_v1.0.2_Sprites build | `1108e67835d18b7b` |
| `img/pictures/np_stress_virtue.png` | 66.2 KB | Elites_v1.0.2_Sprites build | `420d0eb443fb38f0` |

<details><summary>Absolute source paths</summary>

- `img/pictures/np_stress_crack.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_stress_crack.png`
- `img/pictures/np_stress_afflict.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_stress_afflict.png`
- `img/pictures/np_stress_virtue.png` ← `/workspace/np/incoming/NymPri_080jPlus_new/NymPri_080jPlusMODES_Elites_v1.0.2_Sprites_v0.1.0_Windows_clean/www/img/pictures/np_stress_virtue.png`

</details>

## Notes

- **NP_ClothDamage:** 20 torn stand pictures (`t1/t2/t3` levels + `ta/tb` fallbacks) for cloth82 faces 0–3. Intact `cloth82-0..3` base art is vanilla game and was **not** staged.
- **NP_EliteSprites:** six `$NP_Elite_*_v1` character sheets. Aura/glow still drawn by Rare/Elite code.
- **NP_MenuLayout:** Lucide-style SVGs under `img/system/np-menu/` (+ LICENSE/NOTICE).
- **NP_PictureAnim:** beach mesh pictures `np_beachanim_{bg,pri,yar}`.
- **NP_VideoPortrait:** example/docs movies `dance1..4.webm` (~11 MB). Plugin can play any `movies/<name>.webm|.mp4`.
- **NP_SuperAttack:** cut-ins + QTE HUD (`flask/moon/reticle/sign`).
- **NP_TitleProgress:** stage backgrounds + RU/EN logos. BGM defaults are stock Peritune tracks already in the game — **not** copied.
- **NP_Stress / NP_OutfitReact:** extras (plugin-named) staged though outside the original focus list.
- **Orphans seen but not staged:** `np_swim_*.png`, `np_pri_harass_*.png` — NP-named in `img/pictures/` but no matching plugin string in `plugin_repo_src`.
- **Source art not staged:** `/workspace/np/art/torn/` work files, user_layers, raw QTE jpgs — only shipping runtime assets.

