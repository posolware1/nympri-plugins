var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_SaveThumb.js
//=============================================================================
/*:
 * @plugindesc v1.0 Сохранение везде + слоты сохранений со снимком карты, главой, заданием и стадией жрицы.
 * @author NP RU
 *
 * @param Save Anywhere
 * @desc «Сохранение везде» по умолчанию (игрок может выключить в Опциях).
 * @type boolean
 * @default true
 *
 * @param Option Label
 * @desc Название пункта в Опциях. Пусто = пункт не добавляется.
 * @default Сохранение везде
 *
 * @param Thumb Width
 * @type number
 * @default 160
 *
 * @param Thumb Height
 * @type number
 * @default 120
 *
 * @param Jpeg Quality
 * @desc Качество JPEG снимка (0.1–1).
 * @default 0.6
 *
 * @param Stage Labels
 * @desc Подписи стадий 0..3 через запятую (если есть NP_PriestessDiary — берутся его STAGE_NAMES).
 * @default Верная жрица,Смятение,Двойная жизнь,Падение
 *
 * @help
 * ── Сохранение везде ──
 * Игра сама разрешает сохранение через меню почти везде: после каждого
 * перехода общее событие 27 включает его, а выключает только на картах
 * с пометкой «セーブ禁止» в заметке (руины, Map255). Ещё несколько сцен
 * выключают его командой «Доступ к сохранению» до выхода с карты.
 * При включённой опции:
 *  - снимается запрет «セーブ禁止» на картах (запрет из событий/сцен остаётся);
 *  - запрет карты снимается только когда событие/сообщение не идёт;
 *  - сохранение в меню запрещено во время боя (S14 / inBattle)
 *    и в режиме галереи (S5).
 * При выключенной опции поведение полностью оригинальное.
 * Автосохранение (NP_AutoSave) не меняется.
 *
 * ── Слоты ──
 * В info сохранения (global.rpgsave) пишутся:
 *  npThumb  — JPEG dataURL снимка карты (по умолчанию 160x120, ~4–6 КБ);
 *  npChapter — номер главы (по главным заданиям 900Cxx);
 *  npQuest  — название текущего главного задания (или задания из навигатора);
 *  npStage  — стадия жрицы 0..3: NP_PriestessDiary.stage() (встреча с Яризо,
 *             S643 / V204, S32), без него — как NP_TitleProgress.
 * Старые сохранения без этих полей показываются как раньше, без ошибок.
 *
 * Общий помощник для других плагинов:
 *   NP_Stage.compute()   — стадия 0..3 текущей игры
 *   NP_Stage.label(st)   — подпись стадии
 *   NP_Stage.color(st)   — цвет стадии
 *   NP_Stage.drawHeart(bitmap, x, y, size, st)
 */
var Imported = Imported || {};
Imported.NP_SaveThumb = true;
var NP_SaveThumb = NP_SaveThumb || {};
var NP_Stage = NP_Stage || {};

(function() {
    'use strict';
    var params = PluginManager.parameters('NP_SaveThumb');
    var P = {
        anywhere: String(params['Save Anywhere'] || 'true') !== 'false',
        optionLabel: params['Option Label'] !== undefined ? String(params['Option Label']) : NP_L('Сохранение везде', "Save anywhere"),
        tw: Number(params['Thumb Width'] || 160),
        th: Number(params['Thumb Height'] || 120),
        q: Math.max(0.1, Math.min(1, Number(params['Jpeg Quality'] || 0.6))),
        labels: String(params['Stage Labels'] || NP_L('Верная жрица,Смятение,Двойная жизнь,Падение', "Faithful Priestess,Turmoil,Double Life,Fall")).split(',')
            .map(function(s) { return s.trim(); })
    };
    NP_SaveThumb.params = P;
    var S_BATTLE = 14, S_GALLERY = 5, V_BOND = 204, S_CONTRACT = 643;
    var MAP_LOCK_NOTE = 'セーブ禁止';

    // =====================================================================
    // Stage helper (shared)
    // =====================================================================
    var STAGE_COLORS = ['#f4f4f4', '#ff8fc0', '#e8304a', '#8a3cc8'];
    if (!NP_Stage.compute) {
        NP_Stage.compute = function() {
            if (typeof NP_PriestessDiary !== 'undefined' && NP_PriestessDiary.stage) {
                try { return NP_PriestessDiary.stage(); } catch (e) {}
            }
            if (typeof $gameVariables === 'undefined' || !$gameVariables ||
                typeof $gameSwitches === 'undefined' || !$gameSwitches) return 0;
            var lvl = Number($gameVariables.value(V_BOND)) || 0;
            var contract = !!$gameSwitches.value(S_CONTRACT);
            if (typeof NP_TitleProgress !== 'undefined' && NP_TitleProgress.computeStage) {
                return NP_TitleProgress.computeStage(lvl, contract);
            }
            if (lvl >= 4) return 3;
            if (lvl >= 3) return 2;
            if (lvl >= 2 || contract) return 1;
            return 0;
        };
    }
    function clampStage(st) {
        st = Math.floor(Number(st));
        return isFinite(st) ? Math.max(0, Math.min(3, st)) : 0;
    }
    if (!NP_Stage.labels) NP_Stage.labels = P.labels;
    if (!NP_Stage.colors) NP_Stage.colors = STAGE_COLORS;
    if (!NP_Stage.label) NP_Stage.label = function(st) {
        var names = (typeof NP_PriestessDiary !== 'undefined' && NP_PriestessDiary.STAGE_NAMES) || NP_Stage.labels;
        return names[clampStage(st)] || NP_Stage.labels[clampStage(st)] || '';
    };
    if (!NP_Stage.color) NP_Stage.color = function(st) { return NP_Stage.colors[clampStage(st)] || '#ffffff'; };
    if (!NP_Stage.drawHeart) {
        // heart-seal: 0 white + cross, 1 pink + crack, 2 red + half cross, 3 purple + mark
        NP_Stage.drawHeart = function(bitmap, x, y, size, st) {
            st = clampStage(st);
            var ctx = bitmap._context || bitmap.context;
            if (!ctx) return;
            var s = size, cx = x + s / 2;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, y + s * 0.92);
            ctx.bezierCurveTo(x - s * 0.05, y + s * 0.55, x + s * 0.02, y + s * 0.08, cx - s * 0.24, y + s * 0.1);
            ctx.bezierCurveTo(cx - s * 0.1, y + s * 0.1, cx, y + s * 0.2, cx, y + s * 0.3);
            ctx.bezierCurveTo(cx, y + s * 0.2, cx + s * 0.1, y + s * 0.1, cx + s * 0.24, y + s * 0.1);
            ctx.bezierCurveTo(x + s * 0.98, y + s * 0.08, x + s * 1.05, y + s * 0.55, cx, y + s * 0.92);
            ctx.closePath();
            ctx.fillStyle = NP_Stage.color(st);
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.lineWidth = Math.max(1.5, s / 14);
            ctx.fill();
            ctx.stroke();
            ctx.lineWidth = Math.max(1.5, s / 12);
            ctx.lineCap = 'round';
            var m = s * 0.34, my = y + s * 0.5;
            if (st === 0 || st === 2) {           // cross (st2: half erased)
                ctx.strokeStyle = st === 0 ? '#c9a227' : 'rgba(255,230,160,0.9)';
                ctx.beginPath();
                ctx.moveTo(cx, my - m * 0.75); ctx.lineTo(cx, my + m * (st === 0 ? 0.75 : 0.1));
                ctx.moveTo(cx - m * 0.5, my - m * 0.25); ctx.lineTo(cx + m * (st === 0 ? 0.5 : 0.05), my - m * 0.25);
                ctx.stroke();
            } else if (st === 1) {                // crack
                ctx.strokeStyle = 'rgba(90,20,50,0.9)';
                ctx.beginPath();
                ctx.moveTo(cx, y + s * 0.3); ctx.lineTo(cx - s * 0.08, y + s * 0.48);
                ctx.lineTo(cx + s * 0.06, y + s * 0.6); ctx.lineTo(cx - s * 0.03, y + s * 0.78);
                ctx.stroke();
            } else {                              // his mark
                ctx.strokeStyle = '#ff5fae';
                ctx.beginPath();
                ctx.arc(cx, my, m * 0.45, 0, Math.PI * 2);
                ctx.moveTo(cx, my + m * 0.45); ctx.lineTo(cx, my + m * 0.95);
                ctx.moveTo(cx - m * 0.3, my + m * 0.72); ctx.lineTo(cx + m * 0.3, my + m * 0.72);
                ctx.stroke();
            }
            ctx.restore();
            if (bitmap._setDirty) bitmap._setDirty();
        };
    }
    NP_SaveThumb.stageLabel = NP_Stage.label;

    // =====================================================================
    // Config / Options
    // =====================================================================
    ConfigManager.npSaveAnywhere = P.anywhere;
    var _Config_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _Config_makeData.apply(this, arguments);
        config.npSaveAnywhere = this.npSaveAnywhere;
        return config;
    };
    var _Config_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _Config_applyData.apply(this, arguments);
        this.npSaveAnywhere = (config && config.npSaveAnywhere !== undefined) ? !!config.npSaveAnywhere : P.anywhere;
    };
    if (P.optionLabel && typeof Window_Options !== 'undefined') {
        var _Opt_addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Opt_addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npSaveAnywhere');
        };
    }

    // =====================================================================
    // Save anywhere
    // =====================================================================
    // Remember WHY saving was disabled: 'map' = CE27 map-note lock, 'other' = events/scripts.
    var _GS_disableSave = Game_System.prototype.disableSave;
    Game_System.prototype.disableSave = function() {
        _GS_disableSave.apply(this, arguments);
        this._npSaveLock = 'other';
    };
    var _GS_enableSave = Game_System.prototype.enableSave;
    Game_System.prototype.enableSave = function() {
        _GS_enableSave.apply(this, arguments);
        this._npSaveLock = null;
    };
    function isMapNoteLockList(list) {
        if (!list) return false;
        if (list._npMapLock !== undefined) return list._npMapLock;
        var r = false;
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c && c.code === 111 && c.parameters && c.parameters[0] === 12 &&
                String(c.parameters[1]).indexOf(MAP_LOCK_NOTE) >= 0) { r = true; break; }
        }
        try { Object.defineProperty(list, '_npMapLock', { value: r, enumerable: false }); } catch (e) {}
        return r;
    }
    var _GI_command134 = Game_Interpreter.prototype.command134;
    Game_Interpreter.prototype.command134 = function() {
        var result = _GI_command134.apply(this, arguments);
        if (this._params[0] === 0 && $gameSystem && isMapNoteLockList(this._list)) {
            $gameSystem._npSaveLock = 'map';
        }
        return result;
    };
    function mapHasLockNote() {
        return !!(typeof $dataMap !== 'undefined' && $dataMap && $dataMap.note &&
            String($dataMap.note).indexOf(MAP_LOCK_NOTE) >= 0);
    }
    NP_SaveThumb.isAnywhere = function() { return !!ConfigManager.npSaveAnywhere; };
    NP_SaveThumb.isBlockedNow = function() {
        if ($gameSwitches.value(S_BATTLE) || $gameSwitches.value(S_GALLERY)) return true;
        return !!$gameParty.inBattle();
    };
    function isEventBusy() {
        if ($gameMap && $gameMap.isEventRunning && $gameMap.isEventRunning()) return true;
        if ($gameMessage && $gameMessage.isBusy && $gameMessage.isBusy()) return true;
        return false;
    }
    NP_SaveThumb.menuSaveEnabled = function(original) {
        if (!NP_SaveThumb.isAnywhere()) return original;
        if (DataManager.isEventTest()) return false;
        if (NP_SaveThumb.isBlockedNow()) return false;
        if (original) return true;
        if (isEventBusy()) return false;      // lifting a lock only on a free map
        var lock = $gameSystem._npSaveLock;
        // old saves (no lock info) on a map-locked map count as map lock
        return lock === 'map' || (lock === undefined && mapHasLockNote());
    };
    var _WMC_isSaveEnabled = Window_MenuCommand.prototype.isSaveEnabled;
    Window_MenuCommand.prototype.isSaveEnabled = function() {
        return NP_SaveThumb.menuSaveEnabled(_WMC_isSaveEnabled.apply(this, arguments));
    };

    // =====================================================================
    // Snapshot
    // =====================================================================
    var _snap = null;   // dataURL
    NP_SaveThumb.makeThumb = function(bitmap) {
        try {
            if (!bitmap || !bitmap.width || !bitmap.height) return null;
            var src = bitmap._canvas || bitmap.canvas;
            if (!src) return null;
            var canvas = document.createElement('canvas');
            canvas.width = P.tw; canvas.height = P.th;
            var ctx = canvas.getContext('2d');
            // cover-fit
            var sr = bitmap.width / bitmap.height, dr = P.tw / P.th;
            var sw = bitmap.width, sh = bitmap.height, sx = 0, sy = 0;
            if (sr > dr) { sw = sh * dr; sx = (bitmap.width - sw) / 2; }
            else if (sr < dr) { sh = sw / dr; sy = (bitmap.height - sh) / 2; }
            ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(src, sx, sy, sw, sh, 0, 0, P.tw, P.th);
            var url = canvas.toDataURL('image/jpeg', P.q);
            return (typeof url === 'string' && url.indexOf('data:image/') === 0) ? url : null;
        } catch (e) {
            console.warn('[NP_SaveThumb] thumb failed', e);
            return null;
        }
    };
    NP_SaveThumb.captureMap = function() {
        try {
            if (!(SceneManager._scene instanceof Scene_Map)) return null;
            if ($gameScreen && $gameScreen.brightness() <= 0) return null;
            return NP_SaveThumb.makeThumb(SceneManager.snap());
        } catch (e) {
            console.warn('[NP_SaveThumb] capture failed', e);
            return null;
        }
    };
    NP_SaveThumb.lastSnap = function() { return _snap; };

    var _Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        var next = SceneManager._nextScene;
        var toOther = next && !(next instanceof Scene_Map) && !(next instanceof Scene_Battle) &&
            !(typeof Scene_Gameover !== 'undefined' && next instanceof Scene_Gameover) &&
            !(next instanceof Scene_Title);
        if (toOther) {
            var t = NP_SaveThumb.captureMap();
            if (t) _snap = t;
        }
        _Map_terminate.apply(this, arguments);
    };
    var _Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Map_start.apply(this, arguments);
        _snap = null; // back on the map: next save takes a fresh snapshot
    };

    // =====================================================================
    // Chapter / quest
    // =====================================================================
    function plain(s) {
        s = String(s || '');
        if (typeof KNS_QuestBase !== 'undefined' && KNS_QuestBase.parseAsPlaneText) s = KNS_QuestBase.parseAsPlaneText(s);
        else s = s.replace(/(\\\w{1,3}(?:\[\d+\])?)/g, '');
        return s.replace(/\s+/g, ' ').trim();
    }
    function questValue(q) {
        return q && q.var_id ? (Number($gameVariables.value(q.var_id)) || 0) : 0;
    }
    NP_SaveThumb.questInfo = function() {
        var res = { chapter: 0, quest: '' };
        try {
            if (typeof $csvQuestList === 'undefined' || !$csvQuestList) return res;
            var bestId = 0;
            Object.keys($csvQuestList).forEach(function(k) {
                var id = Number(k);
                if (!(id >= 900100 && id < 901000)) return;      // main story 900Cxx
                var v = questValue($csvQuestList[id]);
                if (v <= 0) return;
                var ch = Math.floor((id - 900000) / 100);
                if (ch > res.chapter) res.chapter = ch;
                if (v < 99 && id > bestId) bestId = id;
            });
            var qid = bestId;
            if (!qid && $gameSystem && $gameSystem.knsGetQuestNaviList) {
                var navi = $gameSystem.knsGetQuestNaviList() || [];
                for (var i = 0; i < navi.length; i++) if (navi[i]) { qid = navi[i]; break; }
            }
            if (qid && $csvQuestList[qid]) res.quest = plain($csvQuestList[qid].title);
        } catch (e) {
            console.warn('[NP_SaveThumb] quest info failed', e);
        }
        return res;
    };

    // =====================================================================
    // Save info
    // =====================================================================
    var _DM_makeSavefileInfo = DataManager.makeSavefileInfo;
    DataManager.makeSavefileInfo = function() {
        var info = _DM_makeSavefileInfo.apply(this, arguments);
        try {
            var thumb = null;
            var sc = SceneManager._scene;
            if (sc instanceof Scene_Map) thumb = NP_SaveThumb.captureMap();   // autosave / direct
            if (!thumb) thumb = _snap;
            if (thumb) info.npThumb = thumb;
            var q = NP_SaveThumb.questInfo();
            if (q.chapter) info.npChapter = q.chapter;
            if (q.quest) info.npQuest = q.quest;
            info.npStage = clampStage(NP_Stage.compute());
        } catch (e) {
            console.warn('[NP_SaveThumb] info failed', e);
        }
        return info;
    };

    // =====================================================================
    // Save list window
    // =====================================================================
    var CUSTOM_SAVE_PLUGINS = ['AltSaveScreen', 'BB_CustomSaveWindow', 'TB_SaveSystem'];
    var hasCustom = (PluginManager._scripts || []).some(function(n) { return CUSTOM_SAVE_PLUGINS.indexOf(n) >= 0; });
    NP_SaveThumb.layoutActive = !hasCustom;
    if (hasCustom) return;

    var _thumbCache = {};   // key -> Bitmap
    // own loader: Bitmap.load() may route through Decrypter for encrypted games
    function thumbBitmap(id, info, win, index) {
        var key = id + ':' + (info.timestamp || 0);
        var ent = _thumbCache[key];
        if (!ent) {
            Object.keys(_thumbCache).forEach(function(k) { if (k.split(':')[0] === String(id)) delete _thumbCache[k]; });
            ent = _thumbCache[key] = { bitmap: null, failed: false, wins: [] };
            var img = new Image();
            img.onload = function() {
                try {
                    var b = new Bitmap(img.width, img.height);
                    b.context.drawImage(img, 0, 0);
                    b._setDirty();
                    ent.bitmap = b;
                } catch (e) { ent.failed = true; }
                ent.wins.forEach(function(w) {
                    if (w.win && w.win.contents && !w.win._npDisposed) w.win.redrawItem(w.index);
                });
                ent.wins = [];
            };
            img.onerror = function() { ent.failed = true; ent.wins = []; };
            img.src = info.npThumb;
        }
        if (!ent.bitmap && !ent.failed) ent.wins.push({ win: win, index: index });
        return ent.bitmap;
    }
    NP_SaveThumb._thumbCache = _thumbCache;

    function fileIdFor(win, index) {
        return win.savefileIdForIndex ? win.savefileIdForIndex(index) : index + 1;
    }
    function isAutoId(id) {
        return typeof NP_AutoSave !== 'undefined' && NP_AutoSave.isAutoId && NP_AutoSave.isAutoId(id);
    }
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function fmtDate(ts) {
        if (!ts) return '';
        var d = new Date(ts);
        if (isNaN(d.getTime())) return '';
        return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear() + '  ' +
            pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    // cache global info while the whole list is redrawn (avoids N decompressions)
    var _globalCache = null;
    var _DM_loadSavefileInfo = DataManager.loadSavefileInfo;
    DataManager.loadSavefileInfo = function(savefileId) {
        if (_globalCache) return _globalCache[savefileId] || null;
        return _DM_loadSavefileInfo.apply(this, arguments);
    };
    var _WSL_refresh = Window_SavefileList.prototype.refresh;
    Window_SavefileList.prototype.refresh = function() {
        try { _globalCache = DataManager.loadGlobalInfo() || []; } catch (e) { _globalCache = null; }
        try { _WSL_refresh.apply(this, arguments); }
        finally { _globalCache = null; }
    };

    Window_SavefileList.prototype.npThumbRect = function(rect) {
        var th = Math.min(P.th, rect.height - 8);
        var tw = Math.round(th * P.tw / P.th);
        return { x: rect.x, y: rect.y + Math.floor((rect.height - th) / 2), width: tw, height: th };
    };

    Window_SavefileList.prototype.drawItem = function(index) {
        var id = fileIdFor(this, index);
        var isAuto = isAutoId(id);
        var valid = DataManager.isThisGameFile(id);
        var info = DataManager.loadSavefileInfo(id);
        var rect = this.itemRectForText(index);
        var tr = this.npThumbRect(rect);
        this.resetTextColor();
        this.resetFontSettings();
        var dim = (this._mode === 'load' && !valid) || (isAuto && this._mode === 'save');
        this.changePaintOpacity(!dim);
        // thumbnail frame
        this.contents.fillRect(tr.x, tr.y, tr.width, tr.height, 'rgba(0,0,0,0.55)');
        if (info && info.npThumb && valid) {
            var bmp = thumbBitmap(id, info, this, index);
            if (bmp && bmp.width > 0) {
                this.contents.blt(bmp, 0, 0, bmp.width, bmp.height, tr.x, tr.y, tr.width, tr.height);
            }
        } else if (info && valid && info.characters && info.characters.length) {
            // old save: party sprites inside the frame
            var n = Math.min(4, info.characters.length), step = Math.floor(tr.width / (n + 1));
            for (var i = 0; i < n; i++) {
                var c = info.characters[i];
                this.drawCharacter(c[0], c[1], tr.x + step * (i + 1), tr.y + tr.height - 10);
            }
        }
        this.npDrawFrame(tr);
        var tx = tr.x + tr.width + 14, tw = rect.x + rect.width - tx;
        var lh = Math.min(this.lineHeight(), Math.floor(rect.height / 3));
        var y0 = rect.y + Math.floor((rect.height - lh * 3) / 2);
        // line 1: file id + chapter | date
        this.drawFileId(id, tx, y0);
        this.changePaintOpacity(!dim);
        if (info) {
            this.npDrawLine1(info, tx + 230, y0, tw - 230);
            this.npDrawLine2(info, tx, y0 + lh, tw);
            this.npDrawLine3(info, tx, y0 + lh * 2, tw, valid);
        } else {
            this.changePaintOpacity(false);
            this.drawText(NP_L('— пусто —', "— empty —"), tx, y0 + lh, tw);
        }
        this.resetFontSettings();
        this.resetTextColor();
        this.changePaintOpacity(true);
    };

    Window_SavefileList.prototype.npDrawFrame = function(r) {
        var c = 'rgba(255,255,255,0.35)';
        this.contents.fillRect(r.x, r.y, r.width, 1, c);
        this.contents.fillRect(r.x, r.y + r.height - 1, r.width, 1, c);
        this.contents.fillRect(r.x, r.y, 1, r.height, c);
        this.contents.fillRect(r.x + r.width - 1, r.y, 1, r.height, c);
    };
    Window_SavefileList.prototype.npDrawLine1 = function(info, x, y, w) {
        var date = fmtDate(info.timestamp);
        this.contents.fontSize = this.standardFontSize() - 4;
        var dw = date ? Math.min(w, this.textWidth(date) + 8) : 0;
        var ch = Math.floor(Number(info.npChapter));
        if (ch > 0 && ch < 100) {
            this.changeTextColor(this.textColor(6));
            this.drawText(NP_L('Глава ', "Chapter ") + ch, x, y, w - dw - 8);
        }
        if (date) {
            this.changeTextColor(this.textColor(8));
            this.drawText(date, x + w - dw, y, dw, 'right');
        }
        this.resetTextColor();
        this.contents.fontSize = this.standardFontSize();
    };
    Window_SavefileList.prototype.npDrawLine2 = function(info, x, y, w) {
        this.resetTextColor();
        var t = (typeof info.npQuest === 'string' && info.npQuest) || (Number(info.npChapter) > 0 ? '' : (info.title || ''));
        if (t) this.drawText(t, x, y, w);
    };
    Window_SavefileList.prototype.npDrawLine3 = function(info, x, y, w, valid) {
        var pt = info.playtime ? String(info.playtime) : '';
        var ptw = pt ? this.textWidth(pt) + 8 : 0;
        var cx = x;
        if (info.npStage !== undefined && info.npStage !== null) {
            var size = Math.min(26, this.lineHeight() - 8);
            NP_Stage.drawHeart(this.contents, cx, y + Math.floor((this.lineHeight() - size) / 2), size, info.npStage);
            cx += size + 8;
            this.contents.textColor = NP_Stage.color(info.npStage);
            var lab = NP_Stage.label(info.npStage);
            var lw = this.textWidth(lab) + 12;
            this.drawText(lab, cx, y, Math.min(lw, w - ptw - (cx - x)));
            cx += lw + 12;
        }
        if (info.saveString !== undefined && info.saveString !== null && info.saveString !== '') {
            this.contents.fontSize = this.standardFontSize() - 6;
            this.changeTextColor(this.textColor(8));
            var mode = NP_L('Режим: ', "Mode: ") + info.saveString;
            var mw = Math.max(0, x + w - ptw - cx - 8);
            if (mw > 40) this.drawText(mode, cx, y, mw);
            this.contents.fontSize = this.standardFontSize();
        }
        this.resetTextColor();
        if (pt) this.drawText(pt, x + w - ptw, y, ptw, 'right');
    };

    var _WSL_destroy = Window_SavefileList.prototype.destroy;
    if (_WSL_destroy) {
        Window_SavefileList.prototype.destroy = function() {
            this._npDisposed = true;
            return _WSL_destroy.apply(this, arguments);
        };
    }
    var _File_terminate = Scene_File.prototype.terminate;
    Scene_File.prototype.terminate = function() {
        if (this._listWindow) this._listWindow._npDisposed = true;
        if (_File_terminate) _File_terminate.apply(this, arguments);
    };
})();
