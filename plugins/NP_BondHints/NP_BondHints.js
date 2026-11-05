/*:
 * @plugindesc [RU mod] Once-per-stage bond guidance in the map log, deferred until it is safe to read.
 * @author NP RU mod
 * @help
 * Does not change bond points, levels, events, recruitment or options.
 * Known Yarizo gates only: 50 / 120 / 280 / 500; level 5 is the maximum.
 * Replaces the four legacy yarizo_info instructions, not generic level-up logs.
 * Marks are stored in $gameSystem._npBondHints and survive normal saves.
 * Load after NP_LogToggle, KNS_LogListScene and NP_Language.
 */
var NP_BondHints = (function() {
    'use strict';
    var $ = {}, limits = [0, 50, 120, 280, 500];
    var legacy = /^_log_database_text_yarizo_info_(?:1to2|2to3|3to4|4to5)$/;
    function v(id) { return Number($gameVariables.value(id)) || 0; }
    function flag(id) { return !!$gameSwitches.value(id); }
    function has(id) { return $gameParty.members().some(function(a) { return a.actorId() === id; }); }
    function name(id, ru, en) { var a = $gameActors.actor(id); return a && a.name() || L(ru, en); }
    function L(ru, en) { return typeof window.NP_L === 'function' ? window.NP_L(ru, en) : ru; }
    $.candidate = function() {
        if (!flag(643) || !flag(32)) return null; // Actual recruitment, not just a mention or a debug level.
        var rank = Math.floor(v(204));
        if (rank < 1 || rank > 5 || rank < 5 && v(214) < limits[rank]) return null;
        var y = name(21, 'Яризо', 'Yarizo'), p = name(2, 'Кохаку', 'Kohaku');
        var text;
        if (rank === 5) text = L('Связь с ' + y + ': достигнут максимальный уровень (5/5).', 'Bond with ' + y + ': maximum level reached (5/5).');
        else {
            var missing = [];
            if (!has(2)) missing.push(p);
            if (rank > 1 && !has(21)) missing.push(y);
            var step = missing.length ? L('Возьмите в отряд: ', 'Add to your party: ') + missing.join(', ') + '. ' : '';
            if (rank > 1 && !has(21) && (flag(503) || flag(2040))) return { key: 'yarizo:' + rank, text: L('Для следующего этапа связи Яризо должен быть в отряде. Сейчас он недоступен; одна ночёвка не продвинет связь.', 'The next bond stage requires Yarizo in the party. He is currently unavailable; sleeping alone will not advance the bond.') };
            var instruction = rank === 1
                ? L('Для следующего этапа переночуйте с ' + p + ' в гостинице столицы, в комнате на втором этаже.', 'To progress, stay overnight with ' + p + ' in the capital inn, in the upstairs room.')
                : L('Для следующего этапа переночуйте с ' + p + ' и ' + y + ' в гостинице деревни на Торговом тракте.', 'To progress, stay overnight with ' + p + ' and ' + y + ' at the inn in the village on the Trade Route.');
            text = L('Связь с ' + y + ': достигнут порог ', 'Bond with ' + y + ': threshold reached — ') + limits[rank] + '. ' + step + instruction;
        }
        return { key: 'yarizo:' + rank, text: text };
    };
    $.safe = function(scene) {
        if (!scene || !($gameSystem && $gameMap && $gameMessage) || SceneManager.isSceneChanging()) return false;
        if (!flag(222) || [1, 5, 14, 56, 192].some(flag)) return false;
        if ($gameMap.isEventRunning() || $gameMessage.isBusy() || $gamePlayer.isTransferring()) return false;
        if (window.NP_LogToggle && NP_LogToggle.qteOpen && NP_LogToggle.qteOpen()) return false;
        var w = scene._npLogWin;
        return !!(w && w.visible && w.renderable && w.alpha >= 0.98 && typeof $LogWindow !== 'undefined' && $LogWindow && typeof $LogWindow.Add === 'function');
    };
    $.update = function(scene) {
        if (!$.safe(scene)) return;
        var data = $gameSystem._npBondHints;
        if (data && data.shown && data.shown['yarizo:' + Math.floor(v(204))]) return;
        var hint = $.candidate();
        if (!hint) return;
        $LogWindow.Add('\\c[24]' + hint.text + '\\c[0]');
        if (!data) data = $gameSystem._npBondHints = { shown: {} };
        if (!data.shown) data.shown = {};
        data.shown[hint.key] = true; // Mark only after the log accepted the line.
    };
    var log = window.set_mlog;
    if (typeof log === 'function') window.set_mlog = function(text) {
        if (legacy.test(String(text))) return;
        return log.apply(this, arguments);
    };
    var update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() { update.apply(this, arguments); $.update(this); };
    return $;
})();
