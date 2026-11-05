var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_FastBattle.js
//=============================================================================
/*:
 * @plugindesc v1.0 Быстрый бой (опция): короче паузы, без кубиков, лог боя листается сам.
 * @author NP RU
 *
 * @param Enabled
 * @desc Быстрый бой включён по умолчанию? (игрок переключает в Опциях)
 * @type boolean
 * @default false
 *
 * @param Option Label
 * @desc Название пункта в меню Опции. Пусто = пункт не добавляется.
 * @default Быстрый бой
 *
 * @param Battle Switch
 * @desc Переключатель «идёт бой» (S14 戦闘中: ON в CE31, OFF в CE32).
 * @type switch
 * @default 14
 *
 * @param Wait Rate
 * @desc Множитель для «Ожидания» в боевых событиях (0.25 = в 4 раза короче). Минимум 1 кадр.
 * @default 0.25
 *
 * @param Auto Advance Frames
 * @desc Сколько кадров длится пауза вместо пустого «нажмите, чтобы продолжить».
 * @type number
 * @default 14
 *
 * @param Hide Dice
 * @desc Не показывать картинки кубиков dice1..6 / diceN_red (результат остаётся в логе).
 * @type boolean
 * @default true
 *
 * @param Battle Common Events
 * @desc ID общих событий с чистой боевой механикой (ускоряются только они).
 * @default 13,14,20,31,32,33,34,35,36,37,38,335,343,345,346,349,350,351,364,365,366,367,368,380,389,392
 *
 * @param Battle Map Event Pages
 * @desc Страницы событий-«складов» (карта:событие:страница), которые тоже чистая механика.
 * @default 53:9:2,53:9:4
 *
 * @help
 * Пока идёт бой (Battle Switch ON) и опция «Быстрый бой» включена:
 *  1) «Ожидание» (и this.wait из скриптов) в боевых общих событиях
 *     умножается на Wait Rate (не меньше 1 кадра);
 *  2) «Показать анимацию» с ожиданием в них не ждёт конца анимации;
 *  3) пустые «Показать текст» (без лица и строк — это паузы лога боя)
 *     в них не ждут нажатия, вместо этого короткая пауза Auto Advance Frames;
 *  4) картинки кубиков dice* не выводятся (цифры бросков есть в логе).
 *
 * Не трогается: всё, что не входит в списки выше. Эро-действия и секс в бою
 * (CE371–379, CE42, CE375/376), харассмент Яризо/жрицы и NTR-строки
 * (Map053 ev9 p3/p5, ev13, ev16–37), обучение (CE337), нокдаун союзника
 * (CE384), поражение/пост-бой (Map053 ev3/ev4), любые сообщения с текстом,
 * лицом или выбором — всё идёт как обычно, с нажатием.
 *
 * Команда плагина:  NP_FastBattle on | off
 */

var NP_FastBattle = NP_FastBattle || {};

(function() {
    'use strict';

    var params = PluginManager.parameters('NP_FastBattle');
    function numList(s) {
        return String(s || '').split(',').map(function(x) { return Number(x.trim()); })
            .filter(function(n) { return n > 0; });
    }
    var P = {
        enabled: String(params['Enabled'] || 'false') === 'true',
        optionLabel: params['Option Label'] !== undefined ? String(params['Option Label']) : NP_L('Быстрый бой', "Fast battle"),
        sw: Number(params['Battle Switch'] || 14),
        rate: Number(params['Wait Rate'] || 0.25),
        advance: Number(params['Auto Advance Frames'] !== undefined ? params['Auto Advance Frames'] : 14),
        hideDice: String(params['Hide Dice'] || 'true') === 'true',
        ces: {},
        mapPages: {}
    };
    numList(params['Battle Common Events'] ||
        '13,14,20,31,32,33,34,35,36,37,38,335,343,345,346,349,350,351,364,365,366,367,368,380,389,392')
        .forEach(function(id) { P.ces[id] = true; });
    String(params['Battle Map Event Pages'] !== undefined ? params['Battle Map Event Pages'] : '53:9:2,53:9:4')
        .split(',').forEach(function(s) {
            s = s.trim(); if (s) P.mapPages[s] = true;
        });
    if (!(P.rate > 0)) P.rate = 0.25;
    NP_FastBattle.params = P;

    // ---------------------------------------------------------------------
    // State helpers
    // ---------------------------------------------------------------------
    NP_FastBattle.isEnabled = function() { return !!ConfigManager.npFastBattle; };
    NP_FastBattle.inBattle = function() {
        return !!($gameSwitches && $gameSwitches.value(P.sw));
    };
    NP_FastBattle.isActive = function() {
        return NP_FastBattle.isEnabled() && NP_FastBattle.inBattle();
    };
    // Is this interpreter running pure battle mechanics?
    // _knsCommonEventId / _knsMessageMapId / _knsPageIndex come from KNS_CsvReader.
    NP_FastBattle.isMechanical = function(interp) {
        if (!interp) return false;
        var ceId = interp._knsCommonEventId;
        if (ceId !== undefined && ceId > 0) return !!P.ces[ceId];
        var key = interp._knsMessageMapId + ':' + interp._eventId + ':' + interp._knsPageIndex;
        return !!P.mapPages[key];
    };
    NP_FastBattle.applies = function(interp) {
        return NP_FastBattle.isActive() && NP_FastBattle.isMechanical(interp);
    };

    // ---------------------------------------------------------------------
    // Config / Options (same pattern as NP_AutoSave / NP_QuestMarker)
    // ---------------------------------------------------------------------
    ConfigManager.npFastBattle = P.enabled;
    var _Config_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _Config_makeData.apply(this, arguments);
        config.npFastBattle = this.npFastBattle;
        return config;
    };
    var _Config_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _Config_applyData.apply(this, arguments);
        this.npFastBattle = (config && config.npFastBattle !== undefined) ? !!config.npFastBattle : P.enabled;
    };
    if (P.optionLabel) {
        var _Opt_addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Opt_addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npFastBattle');
        };
    }

    // ---------------------------------------------------------------------
    // 1) Shorter waits
    // ---------------------------------------------------------------------
    var _GI_wait = Game_Interpreter.prototype.wait;
    Game_Interpreter.prototype.wait = function(duration) {
        if (duration > 1 && NP_FastBattle.applies(this)) {
            duration = Math.max(1, Math.round(duration * P.rate));
        }
        _GI_wait.call(this, duration);
    };

    // ---------------------------------------------------------------------
    // 2) Show Animation: don't block on it
    // ---------------------------------------------------------------------
    var _GI_command212 = Game_Interpreter.prototype.command212;
    Game_Interpreter.prototype.command212 = function() {
        if (this._params && this._params[2] && NP_FastBattle.applies(this)) {
            var saved = this._params;
            this._params = [saved[0], saved[1], false];
            try { return _GI_command212.apply(this, arguments); }
            finally { this._params = saved; }
        }
        return _GI_command212.apply(this, arguments);
    };

    // ---------------------------------------------------------------------
    // 3) Empty "Show Text" = log pause -> short auto pause
    // ---------------------------------------------------------------------
    NP_FastBattle.isEmptyPause = function(interp) {
        var list = interp._list;
        var i = interp._index;
        var cmd = list && list[i];
        if (!cmd || cmd.code !== 101) return false;
        var p = cmd.parameters || [];
        if (p[0]) return false;                 // has a face
        if (p.length > 4 && p[4]) return false; // speaker name (MZ-style), just in case
        var j = i + 1;
        while (list[j] && list[j].code === 401) {
            if (String(list[j].parameters[0] || '').trim() !== '') return false;
            j++;
        }
        var next = list[j] ? list[j].code : 0;
        if (next === 102 || next === 103 || next === 104) return false; // choice / input
        return true;
    };
    var _GI_command101 = Game_Interpreter.prototype.command101;
    Game_Interpreter.prototype.command101 = function() {
        if (!$gameMessage.isBusy() && NP_FastBattle.applies(this) && NP_FastBattle.isEmptyPause(this)) {
            while (this.nextEventCode() === 401) this._index++;
            if (P.advance > 0) _GI_wait.call(this, P.advance);
            NP_FastBattle._skipped = (NP_FastBattle._skipped || 0) + 1;
            return true;
        }
        return _GI_command101.apply(this, arguments);
    };

    // ---------------------------------------------------------------------
    // 4) Dice pictures
    // ---------------------------------------------------------------------
    var DICE_RE = /^dice\d+(_red)?$/i;
    var _GP_show = Game_Picture.prototype.show;
    Game_Picture.prototype.show = function(name) {
        if (P.hideDice && DICE_RE.test(String(name || '')) && NP_FastBattle.isActive()) {
            this.erase();
            return;
        }
        _GP_show.apply(this, arguments);
    };

    // ---------------------------------------------------------------------
    // Plugin command
    // ---------------------------------------------------------------------
    var _GI_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _GI_pluginCommand.apply(this, arguments);
        if (command === 'NP_FastBattle') {
            var a = String(args[0] || '').toLowerCase();
            if (a === 'on' || a === 'off') {
                ConfigManager.npFastBattle = (a === 'on');
                ConfigManager.save();
            }
        }
    };
})();
