/*:
 * @plugindesc [RU mod] Guild documents for the southern checkpoint: optional rank 2+ delivery, 200G once.
 * @author NP RU mod
 * @help
 * Quest 201091, stage V3571 (0/1/99), key item 2950.
 * Added after CSV translation; no original CSV rows or map files are replaced.
 * Map013 e12p2: additional guild service. Map241 e8/e9: closed checkpoint;
 * e3/e10: guards after opening. Original gate/rank/story behavior is retained.
 * No CE46/47 reward: this delivery awards exactly 200G, with no experience/fame.
 */
var NP_SouthGateQuest = (function() {
    'use strict';
    var $ = { QID: 201091, VAR: 3571, ITEM: 2950, GOLD: 200 };
    function L(ru, en) { return window.NP_L ? NP_L(ru, en) : ru; }
    function stage() { return Number($gameVariables.value($.VAR)) || 0; }
    function permitted() { return $gameVariables.value(9) >= 2 && ![5, 14, 192].some(function(id) { return $gameSwitches.value(id); }); }
    function doc() { return $dataItems[$.ITEM]; }
    function command(code, parameters, indent) { return { code: code, parameters: parameters || [], indent: indent || 0 }; }
    function message(text, indent) {
        return [command(101, ['', 0, 0, 2], indent)].concat(text.split('\n').map(function(line) { return command(401, [line], indent); }));
    }
    $.stage = stage;
    $.canOffer = function() { return permitted() && (stage() === 0 || stage() === 1); };
    $.pending = function() { return permitted() && stage() === 1; };
    $.hasDocument = function() { return !!doc() && $gameParty.hasItem(doc()); };
    $.accept = function() {
        if (!$.canOffer()) return false;
        if (!$.hasDocument()) $gameParty.gainItem(doc(), 1);
        if (stage() === 0) $gameVariables.setValue($.VAR, 1);
        return true;
    };
    $.deliver = function() {
        if (!$.pending() || !$.hasDocument()) return false;
        $gameVariables.setValue($.VAR, 99); // The normal save records completion before another interaction can award it.
        $gameParty.loseItem(doc(), $gameParty.numItems(doc()));
        $gameSwitches.setValue(310, true);
        $gameParty.gainGold($.GOLD);
        return true;
    };
    $.guildList = function() {
        if (!$.canOffer()) return [command(0)];
        if (stage() === 1) {
            var has = $.hasDocument();
            if (!has) $.accept(); // Replace a missing document, never another reward or another quest.
            return message(has
                ? L('Документы уже у вас. Передайте их солдату на южной заставе\nв Лесу, ведущем на юг. Возвращаться с отчётом не нужно.', 'You already have the documents. Give them to a soldier at the\nsouthern checkpoint in the Forest Leading South. No return report is needed.')
                : L('Вот дубликат документов для южной заставы.\nПередайте его солдату в Лесу, ведущем на юг.', 'Here is a replacement set of checkpoint documents.\nGive them to a soldier in the Forest Leading South.')).concat([command(0)]);
        }
        var list = message(L('Ваш ранг позволяет выйти на южный тракт.\nДоставьте документы солдату на южной заставе\nв Лесу, ведущем на юг. За передачу — 200G.\nВозвращаться в гильдию не нужно.', 'Your rank allows you to take the southern route.\nDeliver the documents to a soldier at the southern\ncheckpoint in the Forest Leading South. Payment: 200G.\nYou do not need to return to the guild.'));
        list.push(command(102, [[L('Взять документы', 'Take the documents'), L('Не сейчас', 'Not now')], 1, 0, 2, 0]));
        list.push(command(402, [0, 'accept']));
        list.push(command(355, ['NP_SouthGateQuest.accept();'], 1));
        list = list.concat(message(L('Получены документы для южной заставы.\nЗадание «За южной заставой» добавлено в журнал.', 'Received the southern checkpoint documents.\nQuest added to your journal: Beyond the Southern Checkpoint.'), 1));
        list.push(command(0, [], 1), command(402, [1, 'cancel']), command(0, [], 1), command(404), command(0));
        return list;
    };
    $.deliveryList = function() {
        if (!$.pending()) return [command(0)];
        if (!$.hasDocument()) return message(L('Документов при вас нет. Попросите дубликат\nу администратора гильдии в столице.', 'You do not have the documents. Ask the capital\nguild administrator for a replacement.')).concat([command(0)]);
        var list = [command(355, ['NP_SouthGateQuest.deliver();'])];
        return list.concat(message(L('Документы приняты. Проход открыт.\nЗадание «За южной заставой» выполнено. Получено 200G.\nЮжнее находится «Подушка великана»: там можно\nостановиться и пополнить припасы.', 'Documents received. The route is open.\nBeyond the Southern Checkpoint completed. Received 200G.\nGiant\'s Pillow lies to the south: you can rest\nand replenish your supplies there.')), [command(0)]);
    };
    $.installDatabase = function() {
        if ($dataItems[$.ITEM] && !$dataItems[$.ITEM]._npSouthGateDoc) throw new Error('NP_SouthGateQuest: item ID collision');
        if ($csvQuestList[$.QID] && !$csvQuestList[$.QID]._npSouthGateQuest) throw new Error('NP_SouthGateQuest: quest ID collision');
        var item = JSON.parse(JSON.stringify($dataItems[887])); // Existing non-usable key item, including ItemCore defaults.
        Object.assign(item, { id: $.ITEM, iconIndex: 192, note: '', meta: {}, effects: [], nonIndependent: true, _npSouthGateDoc: true });
        delete item.baseItemId;
        Object.defineProperty(item, 'name', { get: function() { return L('Документы для южной заставы', 'Southern Checkpoint Documents'); } });
        Object.defineProperty(item, 'description', { get: function() { return L('Пакет гильдии для солдата на южной заставе в Лесу, ведущем на юг.', 'Guild documents for a soldier at the southern checkpoint in the Forest Leading South.'); } });
        $dataItems[$.ITEM] = item;
        var quest = { id: $.QID, var_id: $.VAR, difficulty: 2, map_id: 241, no_retire: true, release_conds: 'false', rewards: [[200, 0]], _npSouthGateQuest: true };
        var fields = {
            title: ['За южной заставой', 'Beyond the Southern Checkpoint'],
            map_name: ['Лес, ведущий на юг — южная застава', 'Forest Leading South — southern checkpoint'],
            client: ['Администратор Гильдии авантюристов', 'Adventurers\' Guild Administrator'],
            short_desc: ['Доставить документы на южную заставу.', 'Deliver the checkpoint documents.'],
            long_desc: ['Доставьте пакет солдату на южной заставе\nв Лесу, ведущем на юг. Награда — 200G на месте.\nВозвращаться в гильдию или посещать\n«Подушку великана» для завершения не требуется.', 'Deliver the guild documents to a soldier\nat the southern checkpoint in the\nForest Leading South. Receive 200G there.\nNo return to the guild or visit to\nGiant\'s Pillow is required.']
        };
        Object.keys(fields).forEach(function(key) { Object.defineProperty(quest, key, { get: function() { return L.apply(null, fields[key]); } }); });
        Object.defineProperty(quest, 'progress', { get: function() { return [[1, L('Передать документы солдату на южной заставе.', 'Deliver the documents to a soldier at the southern checkpoint.')], [99, L('Документы переданы. Награда получена на заставе.', 'Documents delivered. Payment received at the checkpoint.')]]; } });
        $csvQuestList[$.QID] = quest;
    };
    $.patchMap = function(mapId, map) {
        if (!map || map._npSouthGatePatched || (mapId !== 13 && mapId !== 241)) return;
        if (mapId === 13) {
            var list = map.events[12].pages[1].list;
            var start = list.findIndex(function(c) { return c.code === 102 && c.indent === 0; });
            var end = list.findIndex(function(c, i) { return i > start && c.code === 404 && c.indent === 0; });
            if (start < 0 || end < 0) throw new Error('NP_SouthGateQuest: guild menu structure changed');
            var choice = L('Документы для южной заставы', 'Southern checkpoint documents') + ' if(v[9]>=2 && v[3571]<=1 && !s[5] && !s[14] && !s[192])';
            var index = list[start].parameters[0].length;
            list[start].parameters[0].push(choice);
            list.splice(end, 0, command(402, [index, choice]), command(355, ['this.setupChild(NP_SouthGateQuest.guildList(), this._eventId);'], 1), command(0, [], 1));
        } else {
            [3, 8].forEach(function(id) {
                var list = map.events[id].pages[0].list;
                var at = list.findIndex(function(c) { return c.code === 117 && c.parameters[0] === 16; });
                if (at < 0) throw new Error('NP_SouthGateQuest: checkpoint end handler changed');
                list.splice(at, 0, command(355, ['if (NP_SouthGateQuest.pending()) this.setupChild(NP_SouthGateQuest.deliveryList(), this._eventId);']));
            });
        }
        Object.defineProperty(map, '_npSouthGatePatched', { value: true });
    };
    var load = KNS_CsvReader.loadDatabase;
    KNS_CsvReader.loadDatabase = function() { load.apply(this, arguments); $.installDatabase(); };
    var onMap = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        onMap.apply(this, arguments);
        $.patchMap($gameMap.mapId(), $dataMap);
    };
    var subMap = DataManager.knsOnLoadEventCallSubMap;
    DataManager.knsOnLoadEventCallSubMap = function(id, object) { $.patchMap(id, object); return subMap.apply(this, arguments); };
    return $;
})();
