var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_QuestHints.js  (RU mod QoL)
//=============================================================================
/*:
 * @plugindesc [RU mod] Quest journal: «Куда идти: …» for the current step of known quests, quest counts on the tabs.
 * @author RU mod
 *
 * @help
 * Adds to KNS_QuestBase's quest detail window, under the progress list of an
 * active quest, one line «Куда идти: <place>» / "Where to go: <place>" — only
 * for the quests/steps listed in the table below (checked against the event
 * code; steps that are not reliably known have no hint).
 * Tabs «В процессе» / «Выполнено» (already separate in KNS) get counters.
 * Option «Подсказки в журнале» / "Journal hints".
 * Text is added at runtime; QuestList.csv progress lines carry no places, so the
 * option fully hides them.
 */
var NP_QuestHints = NP_QuestHints || {};
(function($) {
    'use strict';
    if (typeof Window_KNSQuestDetail === 'undefined' || typeof KNS_QuestBase === 'undefined') {
        console.warn('[NP_QuestHints] KNS_QuestBase not found — disabled');
        return;
    }
    // place names: [ru, en] (EN names as in the EN logsheet)
    var N = {
        G:     ['Гильдия, центр. район', "Guild, central district"],
        C:     ['центр. район', "central district"],
        SEW:   ['канализация — спуск у входа в столицу', "sewers — entrance near the capital gate"],
        VIL:   ['Карта: Деревня на перекрёстке', "Map: The Crossroad Village"],
        FOR:   ['Карта: Лес с заброшенной церковью', "Map: The Forest of the Abandoned Church"],
        HERM:  ['Убежище отшельника, Лес с заброшенной церковью', "Hermit's hideout, Forest of the Abandoned Church"],
        HERM2: ['Убежище отшельника в лесу', "Hermit's hideout in the forest"],
        CHURCH: ['окрестности заброшенной церкви', "around the abandoned church"],
        PORTV: ['через Портовый город', "via the Port Town"],
        PEACE: ['Карта: Деревня Мира', "Map: The Village of Peace"],
        CELL:  ['Подвал у приюта', "Basement by the orphanage"],
        ORPH:  ['Приют', "Orphanage"],
        SOUTH: ['Карта: Лес, ведущий на юг', "Map: The Forest Leading South"],
        WT:    ['Город в пустошах', "Wilderness Town"],
        WTE:   ['восток Города в пустошах', "east of Wilderness Town"],
        HOSP:  ['Карта: Лагерь Госпитальеров', "Map: Hospitalars' Camp"],
        BLOOD: ['Карта: Кровавые руины', "Map: Bloody Ruin"],
        NGATE: ['вход на севере центр. района', "entrance in the north of the central district"],
        SEER:  ['хижина гадалки в трущобах', "fortune teller's hut in the slums"],
        SEWC:  ['Канализация столицы', "Capital sewers"],
        SEW1:  ['Канализация, 1-й ярус', "Sewers, level 1"],
        SHOP:  ['Лавка, Торговая улица', "Shop, Merchant Street"],
        WATER: ['водоочистная, 1-й ярус канализации', "water purification, sewers level 1"],
        GATE:  ['у входа в столицу', "at the capital entrance"],
        INF:   ['лазарет церкви, центр. район', "church infirmary, central district"],
        ALLC:  ['по всей столице', "all over the capital"],
        BLUE:  ['Голубая пещера (низ), Забытое святилище', "Blue Cave (lower), The Forgotten Shrine"],
        PORT:  ['Портовый город', "The Port Town"],
        FS:    ['Лес с заброшенной церковью / Лес, ведущий на юг', "Forest of the Abandoned Church / Forest Leading South"],
        BLUES: ['Голубая пещера, у моря', "Blue Cave, by the sea"],
        BEACH: ['Сияющий пляж', "Shining Beach"],
        PIR:   ['пиратский корабль — лодочник Портового города', "pirate ship — boatman in the Port Town"],
        VHOME: ['дом в Деревне на перекрёстке', "house in the Crossroad Village"],
        BATH:  ['Баня, центр. район', "Bathhouse, central district"],
        MST:   ['Торговая улица', "Merchant Street"],
        PLEAS: ['через Квартал утех', "via the Pleasure Quarter"],
        SLUM:  ['Трущобы столицы', "Capital slums"],
        SHACK: ['Карта: Хижина в лесу', "Map: Shack in a forest"],
        MAT3:  ['цветы — Лес с заброшенной церковью; желе — 2-й ярус канализации', "flowers — Forest of the Abandoned Church; jelly — sewers level 2"],
        TS:    ['Карта: Ступени Титана', "Map: Titan Step"],
        WORK:  ['мастерская, Город в пустошах', "workshop, Wilderness Town"],
        TSC:   ['пещера Ступеней Титана', "Titan Step cave"],
        ORC:   ['Карта: Твердыня орков', "Map: Orcs' Stronghold"],
        ORCC:  ['Твердыня орков, пещера', "Orcs' Stronghold, cave"],
        CAMP:  ['Лагерь авантюристов', "Camp for Adventurers"],
        BLACK: ['Карта: Чёрная пещера', "Map: Black Cave"],
        ABYSS: ['Карта: Бездонный лес [окраина]', "Map: Abyssal Woods [Shallows]"],
        ORCH:  ['Карта: Сад смерти', "Map: Orchard of Death"],
        SNAKE: ['Карта: Храм Змея', "Map: Temple of the Serpent"]
    };
    // quest id -> { progress value of the current step : place key }
    var HINTS = {
        900102: {1: 'G', 2: 'SEW', 5: 'G'},
        900103: {1: 'C', 2: 'G'},
        900104: {7: 'G'},
        900107: {1: 'VIL'},
        900109: {3: 'VIL', 4: 'FOR', 5: 'HERM', 6: 'VIL'},
        900110: {1: 'FOR', 2: 'CHURCH'},
        900202: {2: 'PORTV'},
        900203: {1: 'FOR', 2: 'HERM2'},
        900204: {1: 'G', 2: 'PEACE', 3: 'CELL', 4: 'ORPH'},
        900205: {1: 'G', 2: 'PEACE'},
        900206: {1: 'SEW', 2: 'SEW', 17: 'SEW'},
        900301: {1: 'SOUTH', 3: 'WT', 4: 'HOSP', 5: 'WT'},
        900302: {1: 'WTE', 3: 'BLOOD', 15: 'G', 16: 'NGATE', 18: 'SEER', 20: 'SLUM'},
        101001: {1: 'SEWC'},
        101002: {1: 'SEW1', 2: 'G'},
        101004: {2: 'WATER', 4: 'GATE'},
        101005: {1: 'INF'},
        101006: {2: 'SHOP'},
        101007: {2: 'SHOP'},
        101010: {2: 'ALLC'},
        101011: {1: 'SEWC'},
        106001: {1: 'BLUE'},
        106003: {2: 'SHOP'},
        106004: {2: 'PORT'},
        106006: {1: 'FS'},
        102001: {1: 'BLUES', 2: 'BEACH'},
        202001: {1: 'PIR'},
        202002: {1: 'PIR'},
        206001: {1: 'FOR', 2: 'VHOME'},
        201005: {1: 'BATH', 2: 'FS', 3: 'C'},
        201007: {1: 'SHOP', 2: 'MST'},
        201008: {1: 'PLEAS'},
        201009: {5: 'SLUM', 6: 'SHACK', 9: 'SLUM', 15: 'SLUM', 18: 'SLUM'},
        201011: {1: 'SLUM'},
        201012: {1: 'MAT3', 2: 'SHOP'},
        201013: {1: 'BLUE', 2: 'SHOP'},
        207014: {1: 'TS', 2: 'WORK'},
        301010: {14: 'FOR'},
        307001: {1: 'TS'},
        307002: {1: 'TS'},
        307003: {1: 'TSC', 2: 'WT'},
        307004: {1: 'TSC', 2: 'WT'},
        307005: {3: 'WT'},
        307006: {1: 'ORC'},
        307007: {1: 'WT', 2: 'ORCC', 10: 'WT'},
        307008: {1: 'ORC'},
        309001: {1: 'SNAKE', 3: 'CAMP'},
        309005: {1: 'BLACK'},
        309006: {1: 'ABYSS'},
        309007: {1: 'ORCH', 2: 'CAMP'}
    };
    $.HINTS = HINTS; $.NAMES = N;

    ConfigManager.npQuestHints = true;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var c = _make.apply(this, arguments);
        c.npQuestHints = this.npQuestHints;
        return c;
    };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _apply.apply(this, arguments);
        this.npQuestHints = !(c && c.npQuestHints === false);
    };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() {
        _addGen.apply(this, arguments);
        this.addCommand(NP_L('Подсказки в журнале', 'Journal hints'), 'npQuestHints');
    };

    // hint for the current step of a quest item (or null)
    $.hintFor = function(item) {
        if (!item || !HINTS[item.id] || KNS_QuestBase.is_quest_done(item.id)) return null;
        var idx = KNS_QuestBase.getCurrentProgressIndex(item);
        if (idx < 0 || !item.progress[idx]) return null;
        // places live only here (switchable by the option); skip if a step still carries a \c[6][place]
        if (/\\c\[6\]\[/.test(String(item.progress[idx][1] || ''))) return null;
        var key = HINTS[item.id][Number(item.progress[idx][0])];
        var n = key && N[key];
        return n ? NP_L(n[0], n[1]) : null;
    };
    $.count = function() {
        var r = { active: 0, done: 0, hinted: 0 };
        Object.keys($csvQuestList || {}).forEach(function(k) {
            var item = $csvQuestList[k];
            if (!item || !item.id || KNS_QuestBase.is_quest_unreleased(item.id)) return;
            if (KNS_QuestBase.is_quest_done(item.id)) r.done++;
            else { r.active++; if ($.hintFor(item)) r.hinted++; }
        });
        return r;
    };

    var _drawProgress = Window_KNSQuestDetail.prototype.knsDrawProgress;
    Window_KNSQuestDetail.prototype.knsDrawProgress = function(y) {
        y = _drawProgress.apply(this, arguments);
        if (ConfigManager.npQuestHints === false) return y;
        var h = $.hintFor(this._data);
        if (h) {
            y = this.knsDrawTextAutoline('\\c[24]' + NP_L('Куда идти: ', 'Where to go: ') + '\\c[0]' + h, 64, y);
            this.changeTextColor(this.normalColor());
        }
        return y;
    };

    var _catDraw = Window_KNSQuestCategory.prototype.drawItem;
    Window_KNSQuestCategory.prototype.drawItem = function(index) {
        var n;
        try { var c = $.count(); n = index === 0 ? c.active : c.done; } catch (e) { n = null; }
        if (n === null || n === undefined) return _catDraw.apply(this, arguments);
        var rect = this.itemRectForText(index);
        this.drawText(KNS_QuestBase.getTerm(1 + index) + ' (' + n + ')', rect.x, rect.y, rect.width, 'center');
    };
})(NP_QuestHints);
