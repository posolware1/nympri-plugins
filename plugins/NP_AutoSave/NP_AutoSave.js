var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_AutoSave.js
//=============================================================================
/*:
 * @plugindesc v1.1 Два чередующихся автосохранения: переходы, сон и перед боссами.
 * @author NP RU
 *
 * @param Enabled
 * @desc Включить автосохранение по умолчанию (игрок может выключить в Опциях).
 * @type boolean
 * @default true
 *
 * @param Slot Id
 * @desc Первый из двух последовательных файлов. Должен быть больше числа обычных слотов (20). Если меньше — берётся maxSavefiles+1.
 * @type number
 * @default 21
 *
 * @param Throttle Seconds
 * @desc Минимум секунд игрового времени между автосохранениями после переходов.
 * @type number
 * @default 60
 *
 * @param Sleep Common Events
 * @desc ID общих событий сна через запятую. После их вызова автосохранение делается без учёта паузы.
 * @default 325
 *
 * @param Idle Frames
 * @desc Сколько кадров подряд карта должна быть «свободной» (без событий/сообщений) перед сохранением.
 * @type number
 * @default 20
 *
 * @param Slot Label
 * @default Автосохранение
 *
 * @param Toast Text
 * @desc Текст всплывающей подсказки. Пусто = без подсказки.
 * @default Автосохранение…
 *
 * @param Option Label
 * @desc Название пункта в меню Опции. Пусто = пункт не добавляется.
 * @default Автосохранение
 *
 * @help
 * Два автосохранения показываются первыми строками в списке
 * сохранений/загрузок и записываются по очереди (21, 22, 21, 22).
 * Загрузить их можно, перезаписать вручную — нет. Старый файл 21 сохраняется.
 * Обычные слоты 1–20 не затрагиваются.
 *
 * Автосохранение делается, когда карта «свободна»: нет запущенных событий,
 * сообщений, перехода, затемнения, игрок стоит, сохранение разрешено.
 *  - после перехода на другую карту (не чаще раза в Throttle Seconds);
 *  - после сна (общие события из Sleep Common Events), без учёта паузы.
 * Перед боссом (S15 или уникальный босс NP_BossBalance) запись делается
 * до запуска CE31, без учёта паузы. Загрузка повторно запускает начало боя,
 * не создавая ещё одно сохранение. В галерее и во время боя записи нет.
 * Очередь восстанавливается из метаданных файлов после загрузки/перезапуска.
 *
 * Команды плагина:
 *   NP_AutoSave now    — сохранить при ближайшей возможности (без учёта паузы)
 *   NP_AutoSave on|off — включить/выключить (настройка Опций)
 */

var NP_AutoSave = NP_AutoSave || {};

(function() {
    'use strict';

    var params = PluginManager.parameters('NP_AutoSave');
    var P = {
        enabled: String(params['Enabled'] || 'true') === 'true',
        slot: Number(params['Slot Id'] || 21),
        throttle: Number(params['Throttle Seconds'] || 60),
        sleepIds: String(params['Sleep Common Events'] || '325').split(',')
            .map(function(s) { return Number(s.trim()); })
            .filter(function(n) { return n > 0; }),
        idleFrames: Number(params['Idle Frames'] || 20),
        label: String(params['Slot Label'] || NP_L('Автосохранение', "Autosave")),
        toast: params['Toast Text'] !== undefined ? String(params['Toast Text']) : NP_L('Автосохранение…', "Autosaving…"),
        optionLabel: params['Option Label'] !== undefined ? String(params['Option Label']) : NP_L('Автосохранение', "Autosave")
    };

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------
    var _pending = null;      // null | 'transfer' | 'sleep' | 'manual'
    var _idleCount = 0;
    var _lastPlaytime = -Infinity;
    var _savingMeta = null;

    NP_AutoSave.slotId = function() {
        var max = DataManager.maxSavefiles();
        return P.slot > max ? P.slot : max + 1;
    };
    NP_AutoSave.slotIds = function() {
        var first = NP_AutoSave.slotId();
        return [first, first + 1];
    };
    NP_AutoSave.isAutoId = function(id) { return NP_AutoSave.slotIds().indexOf(id) >= 0; };
    function sequence(info) { return Number(info && info.npAutoSequence) || 0; }
    NP_AutoSave.nextSlotId = function() {
        var ids = NP_AutoSave.slotIds(), info = DataManager.loadGlobalInfo() || [];
        if (!info[ids[0]]) return ids[0];
        if (!info[ids[1]]) return ids[1];
        var a = sequence(info[ids[0]]), b = sequence(info[ids[1]]);
        if (a !== b) return a < b ? ids[0] : ids[1];
        return info[ids[0]].timestamp <= info[ids[1]].timestamp ? ids[0] : ids[1];
    };
    NP_AutoSave.isEnabled = function() { return !!ConfigManager.npAutoSave; };
    NP_AutoSave.request = function(reason) {
        // sleep/manual have priority over transfer
        if (!_pending || reason !== 'transfer') _pending = reason;
        _idleCount = 0;
    };
    NP_AutoSave.clear = function() { _pending = null; _idleCount = 0; };
    NP_AutoSave.pending = function() { return _pending; };
    NP_AutoSave._params = P;

    function playtimeSec() {
        return $gameSystem ? $gameSystem.playtime() : 0;
    }

    // ---------------------------------------------------------------------
    // Config / Options
    // ---------------------------------------------------------------------
    ConfigManager.npAutoSave = P.enabled;

    var _Config_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _Config_makeData.apply(this, arguments);
        config.npAutoSave = this.npAutoSave;
        return config;
    };

    var _Config_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _Config_applyData.apply(this, arguments);
        this.npAutoSave = (config && config.npAutoSave !== undefined) ? !!config.npAutoSave : P.enabled;
    };

    if (P.optionLabel) {
        var _Opt_addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Opt_addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npAutoSave');
        };
    }

    // ---------------------------------------------------------------------
    // Core save
    // ---------------------------------------------------------------------
    NP_AutoSave.canSaveNow = function(scene) {
        if (!NP_AutoSave.isEnabled()) return false;
        if (DataManager.isBattleTest() || DataManager.isEventTest()) return false;
        if (!$gameSystem || !$gameSystem.isSaveEnabled()) return false;
        if (!$gameMap || $gameMap.mapId() <= 0) return false;
        if ($gameParty.inBattle()) return false;
        if ($gameSwitches.value(14) || $gameSwitches.value(5)) return false;
        if (SceneManager.isSceneChanging()) return false;
        if (scene && scene.isBusy && scene.isBusy()) return false;
        if (scene && scene.menuCalling) return false;
        if ($gameMap.isEventRunning()) return false;
        if ($gameMap.isAnyEventStarting && $gameMap.isAnyEventStarting()) return false;
        if ($gameTemp.isCommonEventReserved()) return false;
        if ($gameMessage.isBusy()) return false;
        if ($gamePlayer.isTransferring()) return false;
        if ($gamePlayer.isMoving()) return false;
        if ($gameScreen.brightness() < 255) return false;
        return true;
    };

    var _DM_makeSavefileInfo = DataManager.makeSavefileInfo;
    DataManager.makeSavefileInfo = function() {
        var info = _DM_makeSavefileInfo.apply(this, arguments);
        if (_savingMeta) {
            info.npAutoSequence = _savingMeta.sequence;
            info.npAutoReason = _savingMeta.reason;
        }
        return info;
    };

    NP_AutoSave.save = function(reason) {
        var id = NP_AutoSave.nextSlotId();
        var prevLastId = DataManager._lastAccessedId;
        var prevCount = $gameSystem._saveCount || 0;
        var ok = false;
        try {
            var info = DataManager.loadGlobalInfo() || [], ids = NP_AutoSave.slotIds();
            _savingMeta = { sequence: Math.max(sequence(info[ids[0]]), sequence(info[ids[1]])) + 1,
                reason: reason || 'manual' };
            $gameSystem.onBeforeSave();          // bgm, versionId, framesOnSave
            $gameSystem._saveCount = prevCount;   // autosave does not count as a save
            ok = DataManager.saveGame(id);        // all saveGame hooks run (Diary/WMTS/CommonSave/KNS…)
            if (ok && StorageManager.cleanBackup) {
                try { StorageManager.cleanBackup(id); } catch (e) {}
            }
        } catch (e) {
            console.error('[NP_AutoSave]', e);
            ok = false;
        } finally {
            _savingMeta = null;
            $gameSystem._saveCount = prevCount;
            // Keep the manual save cursor where the player left it, even on failure.
            DataManager._lastAccessedId = prevLastId;
        }
        if (ok) _lastPlaytime = playtimeSec();
        if (ok) console.log('[NP_AutoSave] saved to slot ' + id);
        return ok;
    };

    // ---------------------------------------------------------------------
    // Triggers
    // ---------------------------------------------------------------------
    var _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.apply(this, arguments);
        if (this._transfer) {
            if (playtimeSec() - _lastPlaytime >= P.throttle) {
                NP_AutoSave.request('transfer');
            }
        }
    };

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.apply(this, arguments);
        this.updateNpAutoSave();
    };

    Scene_Map.prototype.updateNpAutoSave = function() {
        if (this._npToast) this._npToast.updateNp();
        if (!_pending) return;
        if (!NP_AutoSave.isEnabled()) { NP_AutoSave.clear(); return; }
        if (!this.isActive() || !NP_AutoSave.canSaveNow(this)) { _idleCount = 0; return; }
        if (++_idleCount < P.idleFrames) return;
        if (_pending === 'transfer' && playtimeSec() - _lastPlaytime < P.throttle) {
            NP_AutoSave.clear();
            return;
        }
        var reason = _pending;
        NP_AutoSave.clear();
        if (NP_AutoSave.save(reason)) this.showNpAutoSaveToast();
    };

    // Sleep common events (called via "Common Event" command or reserved)
    function isSleepCe(id) { return P.sleepIds.indexOf(Number(id)) >= 0; }

    NP_AutoSave.canSaveBeforeBoss = function() {
        if (!NP_AutoSave.isEnabled() || DataManager.isBattleTest() || DataManager.isEventTest()) return false;
        if (!$gameSystem || !$gameSystem.isSaveEnabled() || !$gameMap || $gameMap.mapId() <= 0) return false;
        if ($gameParty.inBattle() || $gameSwitches.value(14) || $gameSwitches.value(5)) return false;
        if (!(SceneManager._scene instanceof Scene_Map) || SceneManager.isSceneChanging()) return false;
        if ($gamePlayer.isTransferring() || $gameMessage.isBusy()) return false;
        return $gameSwitches.value(15) || !!(window.NP_BossBalance &&
            NP_BossBalance.isBossId(Number($gameVariables.value(121))));
    };

    function saveBeforeBoss(interpreter) {
        // This marker exists only in the saved interpreter. Loading resumes at CE31
        // once, without immediately overwriting another checkpoint of the same fight.
        if (interpreter._npBossCheckpointIndex === interpreter._index) {
            delete interpreter._npBossCheckpointIndex;
            return;
        }
        if (!NP_AutoSave.canSaveBeforeBoss()) return;
        interpreter._npBossCheckpointIndex = interpreter._index;
        var ok = false;
        try {
            ok = NP_AutoSave.save('boss');
        } finally {
            delete interpreter._npBossCheckpointIndex;
        }
        if (ok) {
            NP_AutoSave.clear();
            SceneManager._scene.showNpAutoSaveToast();
        }
    }

    var _GI_command117 = Game_Interpreter.prototype.command117;
    Game_Interpreter.prototype.command117 = function() {
        if (Number(this._params[0]) === 31) saveBeforeBoss(this);
        if (isSleepCe(this._params[0])) NP_AutoSave.request('sleep');
        return _GI_command117.apply(this, arguments);
    };

    var _GT_reserveCommonEvent = Game_Temp.prototype.reserveCommonEvent;
    Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
        if (isSleepCe(commonEventId)) NP_AutoSave.request('sleep');
        return _GT_reserveCommonEvent.apply(this, arguments);
    };

    var _GI_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _GI_pluginCommand.apply(this, arguments);
        if (command === 'NP_AutoSave') {
            var a = String(args[0] || '').toLowerCase();
            if (a === 'now') NP_AutoSave.request('manual');
            else if (a === 'on' || a === 'off') {
                ConfigManager.npAutoSave = (a === 'on');
                ConfigManager.save();
            }
        }
    };

    // Reset on new game / load
    var _DM_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        _DM_setupNewGame.apply(this, arguments);
        NP_AutoSave.clear();
        _lastPlaytime = -Infinity;
    };

    var _DM_loadGame = DataManager.loadGame;
    DataManager.loadGame = function(savefileId) {
        var ok = _DM_loadGame.apply(this, arguments);
        if (ok) {
            NP_AutoSave.clear();
            _lastPlaytime = playtimeSec();
            if (NP_AutoSave.isAutoId(savefileId)) {
                // loading the autosave must not move the manual save cursor onto it
                DataManager._lastAccessedId = NP_AutoSave.latestManualId();
            }
        }
        return ok;
    };

    // ---------------------------------------------------------------------
    // Toast
    // ---------------------------------------------------------------------
    function Sprite_NpAutoSaveToast() { this.initialize.apply(this, arguments); }
    Sprite_NpAutoSaveToast.prototype = Object.create(Sprite.prototype);
    Sprite_NpAutoSaveToast.prototype.constructor = Sprite_NpAutoSaveToast;
    Sprite_NpAutoSaveToast.prototype.initialize = function(text) {
        Sprite.prototype.initialize.call(this);
        var w = 280, h = 36;
        this.bitmap = new Bitmap(w, h);
        this.bitmap.fontSize = 20;
        this.bitmap.paintOpacity = 160;
        this.bitmap.fillRect(0, 0, w, h, '#000000');
        this.bitmap.paintOpacity = 255;
        this.bitmap.drawText(text, 12, 0, w - 24, h, 'right');
        this.x = Graphics.boxWidth - w - 12;
        this.y = 12;
        this._npLife = 120;
        this.opacity = 0;
    };
    Sprite_NpAutoSaveToast.prototype.updateNp = function() {
        this._npLife--;
        if (this._npLife > 100) this.opacity = Math.min(255, this.opacity + 16);
        else if (this._npLife < 30) this.opacity = Math.max(0, this._npLife * 8);
        if (this._npLife <= 0 && this.parent) this.parent.removeChild(this);
    };
    NP_AutoSave.Sprite_Toast = Sprite_NpAutoSaveToast;

    Scene_Map.prototype.showNpAutoSaveToast = function() {
        if (!P.toast) return;
        if (this._npToast && this._npToast.parent) this._npToast.parent.removeChild(this._npToast);
        this._npToast = new Sprite_NpAutoSaveToast(P.toast);
        this.addChild(this._npToast);
    };

    // ---------------------------------------------------------------------
    // Save / Load list: rows 0/1 = autosaves, row N+1 = manual file N
    // ---------------------------------------------------------------------
    NP_AutoSave.idToIndex = function(id) {
        var autoIndex = NP_AutoSave.slotIds().indexOf(id);
        return autoIndex >= 0 ? autoIndex : Math.max(1, Math.min(id, DataManager.maxSavefiles())) + 1;
    };
    NP_AutoSave.indexToId = function(index) {
        return index < 2 ? NP_AutoSave.slotIds()[index] : index - 1;
    };
    NP_AutoSave.latestManualId = function() {
        var info = DataManager.loadGlobalInfo() || [];
        var best = 1, ts = 0;
        for (var i = 1; i <= DataManager.maxSavefiles(); i++) {
            if (info[i] && DataManager.isThisGameFile(i) && info[i].timestamp > ts) {
                ts = info[i].timestamp; best = i;
            }
        }
        return best;
    };

    // drop stale autosave entry if the file was deleted
    var _DM_loadGlobalInfo = DataManager.loadGlobalInfo;
    DataManager.loadGlobalInfo = function() {
        var info = _DM_loadGlobalInfo.apply(this, arguments);
        NP_AutoSave.slotIds().forEach(function(id) {
            if (info && info[id]) {
                try { if (!StorageManager.exists(id)) delete info[id]; } catch (e) {}
            }
        });
        return info;
    };

    // MV compares timestamps only; autosaves made in the same millisecond use
    // their persisted sequence to keep the latest row selected on the load screen.
    var _DM_latestSavefileId = DataManager.latestSavefileId;
    DataManager.latestSavefileId = function() {
        var id = _DM_latestSavefileId.apply(this, arguments), info = this.loadGlobalInfo() || [];
        if (NP_AutoSave.isAutoId(id)) {
            NP_AutoSave.slotIds().forEach(function(autoId) {
                if (info[autoId] && info[id] && info[autoId].timestamp === info[id].timestamp &&
                    sequence(info[autoId]) > sequence(info[id]) && DataManager.isThisGameFile(autoId)) id = autoId;
            });
        }
        return id;
    };

    // new game: pick a manual slot, never the autosave
    var _DM_selectSavefileForNewGame = DataManager.selectSavefileForNewGame;
    DataManager.selectSavefileForNewGame = function() {
        _DM_selectSavefileForNewGame.apply(this, arguments);
        var max = this.maxSavefiles();
        if (!(this._lastAccessedId >= 1 && this._lastAccessedId <= max)) {
            var info = this.loadGlobalInfo() || [];
            var pick = 0, ts = Number.MAX_VALUE;
            for (var i = 1; i <= max; i++) {
                if (!info[i]) { pick = i; break; }
                if (info[i].timestamp < ts) { ts = info[i].timestamp; pick = i; }
            }
            this._lastAccessedId = pick || 1;
        }
    };

    Window_SavefileList.prototype.maxItems = function() {
        return DataManager.maxSavefiles() + 2;
    };

    Window_SavefileList.prototype.savefileIdForIndex = function(index) {
        return NP_AutoSave.indexToId(index);
    };

    Window_SavefileList.prototype.drawItem = function(index) {
        var id = this.savefileIdForIndex(index);
        var isAuto = NP_AutoSave.isAutoId(id);
        var valid = DataManager.isThisGameFile(id);
        var info = DataManager.loadSavefileInfo(id);
        var rect = this.itemRectForText(index);
        this.resetTextColor();
        if (this._mode === 'load') {
            this.changePaintOpacity(valid);
        } else if (isAuto) {
            this.changePaintOpacity(false);
        }
        this.drawFileId(id, rect.x, rect.y);
        if (info) {
            this.changePaintOpacity(valid && !(isAuto && this._mode === 'save'));
            this.drawContents(info, rect, valid);
            this.changePaintOpacity(true);
        }
        this.changePaintOpacity(true);
    };

    var _WSL_drawFileId = Window_SavefileList.prototype.drawFileId;
    Window_SavefileList.prototype.drawFileId = function(id, x, y) {
        if (NP_AutoSave.isAutoId(id)) {
            if (this._mode !== 'load') this.changePaintOpacity(false);
            this.changeTextColor(this.systemColor());
            this.drawText(P.label + ' ' + (NP_AutoSave.slotIds().indexOf(id) + 1), x, y, 220);
            this.resetTextColor();
        } else {
            _WSL_drawFileId.apply(this, arguments);
        }
    };

    var _WSL_isCurrentItemEnabled = Window_SavefileList.prototype.isCurrentItemEnabled;
    Window_SavefileList.prototype.isCurrentItemEnabled = function() {
        if (this._mode === 'save' && NP_AutoSave.isAutoId(this.savefileIdForIndex(this.index()))) return false;
        return _WSL_isCurrentItemEnabled ? _WSL_isCurrentItemEnabled.apply(this, arguments) : true;
    };

    Scene_File.prototype.savefileId = function() {
        return NP_AutoSave.indexToId(this._listWindow.index());
    };

    Scene_Save.prototype.firstSavefileIndex = function() {
        var id = DataManager.lastAccessedSavefileId();
        if (!id || NP_AutoSave.isAutoId(id)) id = NP_AutoSave.latestManualId();
        return NP_AutoSave.idToIndex(id);
    };

    Scene_Load.prototype.firstSavefileIndex = function() {
        return NP_AutoSave.idToIndex(DataManager.latestSavefileId());
    };

    // safety: never write the autosave slot from the save screen
    var _Scene_Save_onSavefileOk = Scene_Save.prototype.onSavefileOk;
    Scene_Save.prototype.onSavefileOk = function() {
        if (NP_AutoSave.isAutoId(this.savefileId())) {
            SoundManager.playBuzzer();
            this.activateListWindow();
            return;
        }
        _Scene_Save_onSavefileOk.apply(this, arguments);
    };
})();
