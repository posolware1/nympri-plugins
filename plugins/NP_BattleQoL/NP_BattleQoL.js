var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_BattleQoL.js  (RU mod QoL)
//=============================================================================
/*:
 * @plugindesc [RU mod] Battle speed x2 (Shift / option) and «Автобой» (auto battle) for the on-map battle system.
 * @author RU mod
 *
 * @param Speed Key
 * @desc keyCode of the speed toggle in battle (16 = Shift).
 * @default 16
 *
 * @param Auto Icon
 * @desc Icon of the «Автобой» command in the hero's command list.
 * @default 38
 *
 * @param Battle Switch
 * @default 14
 *
 * @help
 * Speed x2 (option «Скорость боя ×2» / "Battle speed ×2", toggled in battle
 * with Shift): while S14 is ON the map logic (event waits, pictures, screen
 * effects), battle animations and message text run twice per frame.
 * Independent from NP_FastBattle («Быстрый бой») — both can be on.
 *
 * Auto battle: the hero's command list (CE365) gets «Автобой» next to
 * «Ничего не делать». Hidden in boss (S15) and no-escape/story (S85) battles.
 * While active, every party member's command menu (CE365/CE366) picks the
 * plain Attack (first command) — never skills, items or lewd actions; empty
 * log pauses of battle mechanics advance by themselves. All other events
 * (groping, grapples, dialogue) run as usual and wait for the player.
 * Cancel: Esc / X / right click (or Shift+Esc). Turns itself off when the
 * battle ends, a boss/no-escape switch turns on, or Attack is unavailable.
 */
var NP_BattleQoL = NP_BattleQoL || {};
(function() {
    'use strict';
    var params = PluginManager.parameters('NP_BattleQoL');
    var P = {
        key: Number(params['Speed Key'] || 16),
        icon: Number(params['Auto Icon'] || 38),
        sw: Number(params['Battle Switch'] || 14),
        boss: 15, noEscape: 85, gallery: 5,
        mech: {}
    };
    '13,14,20,31,32,33,34,35,36,37,38,335,343,345,346,349,350,351,364,365,366,367,368,371,380,389,392'
        .split(',').forEach(function(id) { P.mech[Number(id)] = true; });
    NP_BattleQoL.params = P;

    function gs(id) { return !!($gameSwitches && $gameSwitches.value(id)); }
    NP_BattleQoL.inBattle = function() { return gs(P.sw); };
    NP_BattleQoL.speedOn = function() { return !!ConfigManager.npBattleSpeed2 && NP_BattleQoL.inBattle(); };
    NP_BattleQoL.autoAllowed = function() {
        return NP_BattleQoL.inBattle() && !gs(P.boss) && !gs(P.noEscape) && !gs(P.gallery);
    };

    // ---- option ------------------------------------------------------------
    ConfigManager.npBattleSpeed2 = false;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var c = _make.apply(this, arguments);
        c.npBattleSpeed2 = this.npBattleSpeed2;
        return c;
    };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _apply.apply(this, arguments);
        this.npBattleSpeed2 = !!(c && c.npBattleSpeed2);
    };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() {
        _addGen.apply(this, arguments);
        this.addCommand(NP_L('Скорость боя ×2', 'Battle speed ×2'), 'npBattleSpeed2');
    };

    // ---- toast / indicator -------------------------------------------------
    NP_BattleQoL.toast = function(text) {
        NP_BattleQoL._toast = { text: text, t: 120 };
    };
    function ensureHud(scene) {
        if (scene._npQolHud) return scene._npQolHud;
        var s = new Sprite(new Bitmap(420, 72));
        s.x = Graphics.width - 430; s.y = 8; s.z = 9;
        scene.addChild(s);
        scene._npQolHud = s;
        return s;
    }
    function drawHud(scene) {
        var hud = ensureHud(scene);
        if (hud.parent !== scene) scene.addChild(hud);
        var a = [];
        if (NP_BattleQoL.speedOn()) a.push('×2');
        if (NP_BattleQoL.auto) a.push(NP_L('АВТО', 'AUTO'));
        var t = NP_BattleQoL._toast;
        var key = a.join('  ') + '|' + (t ? t.text : '');
        if (t && --t.t <= 0) NP_BattleQoL._toast = null;
        if (hud._key === key) return;
        hud._key = key;
        var b = hud.bitmap; b.clear();
        b.outlineColor = 'rgba(0,0,0,0.9)'; b.outlineWidth = 5;
        if (a.length) {
            b.fontSize = 26; b.textColor = NP_BattleQoL.auto ? '#ffd860' : '#80e0ff';
            b.drawText(a.join('  '), 0, 0, 410, 32, 'right');
        }
        if (t) {
            b.fontSize = 20; b.textColor = '#ffffff';
            b.drawText(t.text, 0, 36, 410, 30, 'right');
        }
    }

    // ---- speed x2 ----------------------------------------------------------
    var _pendingKey = 0;
    if (typeof document !== 'undefined') {
        document.addEventListener('keydown', function(e) {
            if (e.keyCode === P.key && !e.repeat) _pendingKey++;
        });
    }
    NP_BattleQoL.toggleSpeed = function() {
        ConfigManager.npBattleSpeed2 = !ConfigManager.npBattleSpeed2;
        try { ConfigManager.save(); } catch (e) {}
        NP_BattleQoL.toast(ConfigManager.npBattleSpeed2 ?
            NP_L('Скорость боя ×2: вкл', 'Battle speed ×2: on') :
            NP_L('Скорость боя ×2: выкл', 'Battle speed ×2: off'));
    };
    var _isFF = Scene_Map.prototype.isFastForward;
    Scene_Map.prototype.isFastForward = function() {
        return _isFF.apply(this, arguments) || (NP_BattleQoL.speedOn() && !SceneManager.isSceneChanging());
    };
    var _animUpdate = Sprite_Animation.prototype.update;
    Sprite_Animation.prototype.update = function() {
        _animUpdate.apply(this, arguments);
        if (NP_BattleQoL.speedOn() && this._duration > 0) _animUpdate.apply(this, arguments);
    };
    var _wmUpdateMessage = Window_Message.prototype.updateMessage;
    Window_Message.prototype.updateMessage = function() {
        var r = _wmUpdateMessage.apply(this, arguments);
        if (r && NP_BattleQoL.speedOn() && this._textState && !this._showFast && !this._lineShowFast &&
            this._waitCount === 0 && !this.pause) {
            r = _wmUpdateMessage.apply(this, arguments) || r;
        }
        return r;
    };
    var _wmUpdateWait = Window_Message.prototype.updateWait;
    Window_Message.prototype.updateWait = function() {
        if (NP_BattleQoL.speedOn() && this._waitCount > 1) this._waitCount--;
        return _wmUpdateWait.apply(this, arguments);
    };

    // ---- auto battle -------------------------------------------------------
    NP_BattleQoL.auto = false;
    NP_BattleQoL.startAuto = function() {
        if (!NP_BattleQoL.autoAllowed()) return false;
        NP_BattleQoL.auto = true;
        NP_BattleQoL.picks = 0;
        NP_BattleQoL.toast(NP_L('Автобой: Esc — отмена', 'Auto battle: Esc to cancel'));
        return true;
    };
    NP_BattleQoL.stopAuto = function(reason) {
        if (!NP_BattleQoL.auto) return;
        NP_BattleQoL.auto = false;
        if ($gameVariables) { $gameVariables.setValue(381, 0); }   // cursor back to Attack
        if (reason) NP_BattleQoL.toast(reason);
    };
    function isCommandList(win) {
        var n = win.maxItems ? win.maxItems() : 0;
        if (n < 2) return false;
        var first = String(win.commandName(0) || '');
        if (!/^\\i\[147\]/i.test(first.trim())) return false;
        for (var i = 1; i < n; i++) if (/^\\i\[260\]/i.test(String(win.commandName(i) || '').trim())) return true;
        return false;
    }
    NP_BattleQoL.isCommandList = isCommandList;
    var _wclUpdate = Window_ChoiceList.prototype.update;
    Window_ChoiceList.prototype.update = function() {
        _wclUpdate.apply(this, arguments);
        if (!NP_BattleQoL.auto || !this.active || !this.isOpen() || !NP_BattleQoL.inBattle()) {
            this._npAutoT = 0;
            return;
        }
        if (!isCommandList(this)) return;
        this._npAutoT = (this._npAutoT || 0) + 1;
        if (this._npAutoT < (NP_BattleQoL.speedOn() ? 4 : 10)) return;
        this._npAutoT = 0;
        this.select(0);
        if (!this.isCurrentItemEnabled()) {
            NP_BattleQoL.stopAuto(NP_L('Автобой: атака недоступна — ваш ход', 'Auto battle: Attack unavailable — your turn'));
            return;
        }
        NP_BattleQoL.picks = (NP_BattleQoL.picks || 0) + 1;
        this.processOk();
    };
    // Empty log pauses of battle mechanics advance by themselves in auto mode
    function isMech(interp) {
        var ce = interp._knsCommonEventId;
        if (ce !== undefined && ce > 0) return !!P.mech[ce];
        var key = interp._knsMessageMapId + ':' + interp._eventId + ':' + interp._knsPageIndex;
        return key === '53:9:2' || key === '53:9:4';
    }
    function isEmptyPause(interp) {
        if (typeof NP_FastBattle !== 'undefined' && NP_FastBattle.isEmptyPause) return NP_FastBattle.isEmptyPause(interp);
        var list = interp._list, i = interp._index, cmd = list && list[i];
        if (!cmd || cmd.code !== 101 || (cmd.parameters || [])[0]) return false;
        var j = i + 1;
        while (list[j] && list[j].code === 401) {
            if (String(list[j].parameters[0] || '').trim() !== '') return false;
            j++;
        }
        var nx = list[j] ? list[j].code : 0;
        return !(nx === 102 || nx === 103 || nx === 104);
    }
    var _cmd101 = Game_Interpreter.prototype.command101;
    Game_Interpreter.prototype.command101 = function() {
        if (NP_BattleQoL.auto && NP_BattleQoL.inBattle() && !$gameMessage.isBusy() &&
            isMech(this) && isEmptyPause(this)) {
            while (this.nextEventCode() === 401) this._index++;
            this.wait(NP_BattleQoL.speedOn() ? 6 : 12);
            return true;
        }
        return _cmd101.apply(this, arguments);
    };

    // ---- per-frame on the map ------------------------------------------------
    var _smUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _smUpdate.apply(this, arguments);
        try {
            if (_pendingKey) {
                if (NP_BattleQoL.inBattle() && !gs(P.gallery)) NP_BattleQoL.toggleSpeed();
                _pendingKey = 0;
            }
            if (NP_BattleQoL.auto) {
                if (!NP_BattleQoL.inBattle()) NP_BattleQoL.stopAuto(null);
                else if (!NP_BattleQoL.autoAllowed())
                    NP_BattleQoL.stopAuto(NP_L('Автобой выключен', 'Auto battle off'));
                else if (Input.isTriggered('cancel') || Input.isTriggered('escape') || TouchInput.isCancelled())
                    NP_BattleQoL.stopAuto(NP_L('Автобой выключен', 'Auto battle off'));
            }
            drawHud(this);
        } catch (e) { console.error('[NP_BattleQoL]', e); }
    };

    // ---- inject «Автобой» into CE365 (hero command list) --------------------
    function cmd(code, indent, p) { return { code: code, indent: indent, parameters: p, npBattleQoL: true }; }
    NP_BattleQoL.inject = function(ces) {
        var ce = ces[365];
        if (!ce) return 'no CE365';
        var list = ce.list;
        if (list.some(function(c) { return c.npBattleQoL; })) return 'already';
        var ci = -1;
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c.code === 102 && c.parameters[0].length === 1 && /^\\i\[4\]\s*$/.test(c.parameters[0][0])) { ci = i; break; }
        }
        if (ci < 0) return 'no nothing-choice';
        var ind = list[ci].indent, end = -1;
        for (var j = ci + 1; j < list.length; j++) {
            if (list[j].indent === ind && list[j].code === 404) { end = j; break; }
        }
        if (end < 0) return 'no end';
        var hasLabel = list.some(function(c) { return c.code === 118 && c.parameters[0] === 'コマンド'; });
        if (!hasLabel) return 'no label';
        var label = '\\i[' + P.icon + '] if(!s[' + P.boss + '] && !s[' + P.noEscape + '])';
        list[ci].parameters[0].push(label);
        var b = ind + 1;
        list.splice(end, 0,
            cmd(402, ind, [1, label]),
            cmd(108, b, ['NP_BattleQoL: Автобой']),
            cmd(355, b, ['NP_BattleQoL.startAuto()']),
            cmd(119, b, ['コマンド']),
            cmd(0, b, []));
        return 'ok';
    };
    var _isDbLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        var ok = _isDbLoaded.apply(this, arguments);
        if (ok && !NP_BattleQoL._injected && window.$dataCommonEvents) {
            NP_BattleQoL._injected = true;
            try { NP_BattleQoL.injectResult = NP_BattleQoL.inject($dataCommonEvents); }
            catch (e) { NP_BattleQoL.injectResult = 'error'; console.error('[NP_BattleQoL] inject failed', e); }
            console.log('[NP_BattleQoL] inject ' + NP_BattleQoL.injectResult);
        }
        return ok;
    };

    // label next to the icon (NP_PowerStrike shows labels for icon-only commands)
    if (typeof NP_PowerStrike !== 'undefined' && NP_PowerStrike.labelFor) {
        var _labelFor = NP_PowerStrike.labelFor;
        NP_PowerStrike.labelFor = function(text) {
            var m = /^\\i\[(\d+)\]\s*$/i.exec(String(text || '').trim());
            if (m && Number(m[1]) === P.icon) return NP_L('Автобой', 'Auto battle');
            return _labelFor.apply(this, arguments);
        };
    }
})();
