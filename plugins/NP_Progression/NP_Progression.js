var NP_L = window.NP_L || function(r) { return r; };
//=============================================================================
// NP_Progression.js
//=============================================================================
/*:
 * @plugindesc v1.0 Ранг 3 гильдии по достижимой славе и правки середины игры 0.80j.
 * @author RU mod
 *
 * @param Rank3Fame
 * @text Слава для ранга 3
 * @type number
 * @min 1
 * @default 60
 *
 * @help
 * Открывает уже написанный пункт «Запрос на повышение» у администратора
 * гильдии (карта 13, событие 12), когда ранг не ниже 2. Порог славы в этой
 * ветке берётся из параметра (по умолчанию 60, не 150). В данных 0.80j
 * строка меню — «\\v[64] if(v[1]>9999)», а порог — команда «V54 = 150»
 * при ранге 2, затем «V322 >= V54». Плагин не пишет V8, V9, V912 и V922.
 * Квест 301010 и агент лагеря 288 остаются закрытыми.
 * Правки применяются к уже загруженным данным карты и общих событий.
 * Файлы игры на диске не меняются. Повтор ничего не меняет.
 * Пункт «Прогрессия середины игры» / "Midgame progression", категория
 * «Механики», по умолчанию включён.
 */
var Imported = Imported || {};
Imported.NP_Progression = true;
var NP_Progression = NP_Progression || {};

(function($) {
    'use strict';
    // Counted in the README. 60 sits above the chapter-1 total (47) and at the
    // Titan-road total (65). It is not the fuzzy 50–80 that includes extra repeats.
    $.DEFAULT_FAME = 60;
    $.COUNT = {
        storyChapter1: 27,
        mercyInsideStory: 11,
        earlySideTurnins: 20,
        afterChapter1: 47,
        rank2Jobs: 6,
        titanHunts: 12,
        lateMid: 65,
        wastelandRest: 12,
        pirates: 4,
        capitalTwos: 8,
        bond3Jobs: 6,
        yarizoMilk: 1,
        thorough: 96
    };
    $.EXAM_MAPS = { 176: true, 177: true, 178: true, 179: true };
    $.EXAM_DLV = 2;
    $.RUINS_MAP = 263;
    $.RUINS_DLV = 3;
    // Map029 event 37 is named enemyID:304. Events 1 and 8 are the rat and the spider.
    $.THIEF_SLOT = 37;
    $.PATCH_NAMES = ['rankChoice', 'rankFame', 'shop', 'examNote', 'spawns', 'ruinsNote', 'camp', 'quest301010'];
    $.hits = {};
    $.warnings = [];
    $.warned = {};
    $.fameThreshold = function() {
        var n = $.DEFAULT_FAME;
        try {
            if (typeof PluginManager !== 'undefined') {
                var params = PluginManager.parameters('NP_Progression');
                if (params && params.Rank3Fame !== undefined && String(params.Rank3Fame) !== '') {
                    n = Number(params.Rank3Fame);
                }
            }
        } catch (e) { n = $.DEFAULT_FAME; }
        if (!isFinite(n) || n < 1) n = $.DEFAULT_FAME;
        return Math.floor(n);
    };
    $.isEnabled = function() {
        if (typeof ConfigManager === 'undefined' || ConfigManager.npProgression === undefined) return true;
        return ConfigManager.npProgression !== false;
    };
    $.record = function(name, hits, pending) {
        $.hits[name] = ($.hits[name] || 0) + hits;
        if (hits === 0 && pending && !$.warned[name]) {
            $.warned[name] = true;
            var line = '[NP_Progression] warning: ' + name + ' matched 0 times';
            $.warnings.push(line);
            try { console.warn(line); } catch (e) {}
        }
        return hits;
    };
    $.openRankChoice = function(text) {
        var raw = String(text || '');
        // 0.80j stores the promotion line as \v[64], not the visible label.
        if (!/\\v\[\s*64\s*\]/.test(raw) || !/v\[\s*1\s*\]\s*>\s*9999/.test(raw)) return raw;
        return raw.replace(/v\[\s*1\s*\]\s*>\s*9999/g, 'v[9] >= 2');
    };
    $.isRank2Check = function(cmd) {
        var p = cmd && cmd.code === 111 && cmd.parameters;
        return !!(p && p[0] === 1 && p[1] === 9 && p[2] === 0 && p[3] === 2 && p[4] === 0);
    };
    $.isFameAgainstV54 = function(cmd) {
        var p = cmd && cmd.code === 111 && cmd.parameters;
        return !!(p && p[0] === 1 && p[1] === 322 && p[2] === 1 && p[3] === 54 && p[4] === 1);
    };
    $.isV54Set150 = function(cmd) {
        var p = cmd && cmd.code === 122 && cmd.parameters;
        return !!(p && p[0] === 54 && p[1] === 54 && p[2] === 0 && p[3] === 0 && p[4] === 150);
    };
    $.retieShopText = function(text) {
        return String(text || '')
            .replace(/(\$gameVariables\.value\(\s*12\s*\)|v\[\s*12\s*\])\s*>=\s*3\b/g, function(all, expr) {
                return expr.replace(/12/, '9') + ' >= 3';
            })
            .replace(/(\$gameVariables\.value\(\s*12\s*\)|v\[\s*12\s*\])\s*>=\s*2\b/g, function(all, expr) {
                return expr.replace(/12/, '9') + ' >= 2';
            });
    };
    $.assignSpawnSlot = function(line) {
        return String(line || '').replace(/(^|[^.\w])id\s*=\s*(1|8)\b/g, function(all, pre) {
            return pre + 'id = ' + $.THIEF_SLOT;
        });
    };
    $.callsTemplateMap = function(text) {
        return /add_event\s*\(/.test(text) && /,\s*29\s*,/.test(text);
    };
    $.ensureDungeonNote = function(note, level) {
        var text = String(note || '');
        if (/ダンジョンレベル\s*[:：]\s*\d+/.test(text)) return text;
        var gap = text && !/\n$/.test(text) ? '\n' : '';
        return text + gap + '<ダンジョンレベル:' + level + '>';
    };

    function patchStrings(value, fn) {
        if (typeof value === 'string') return fn(value);
        if (Array.isArray(value)) return value.map(function(item) { return patchStrings(item, fn); });
        return value;
    }
    function eachRuntimeString(cmd, fn) {
        if (!cmd || cmd.code === 101 || cmd.code === 401 || !cmd.parameters) return false;
        var before = JSON.stringify(cmd.parameters);
        cmd.parameters = patchStrings(cmd.parameters, fn);
        return JSON.stringify(cmd.parameters) !== before;
    }
    $.patchShopCommand = function(cmd) {
        if (!cmd || cmd.code !== 111 || !cmd.parameters) return false;
        var p = cmd.parameters;
        if (p[0] !== 1 || p[1] !== 12 || p[2] !== 0 || p[4] !== 1) return false;
        if (p[3] !== 2 && p[3] !== 3) return false;
        p[1] = 9;
        return true;
    };

    function choiceText(list) {
        var out = [];
        (list || []).forEach(function(cmd) {
            if (cmd && cmd.code === 102 && cmd.parameters && Array.isArray(cmd.parameters[0])) {
                cmd.parameters[0].forEach(function(choice) { out.push(String(choice)); });
            }
        });
        return out.join('\n');
    }
    $.patchRankList = function(list, threshold) {
        var result = { choice: 0, fame: 0 };
        if (!list) return result;
        var rank2 = false;
        var compared = false;
        list.forEach(function(cmd) {
            if ($.isRank2Check(cmd)) rank2 = true;
            if ($.isFameAgainstV54(cmd)) compared = true;
        });
        list.forEach(function(cmd) {
            if (!cmd || cmd.code === 101 || cmd.code === 401) return;
            if (cmd.code === 102 && cmd.parameters && Array.isArray(cmd.parameters[0])) {
                cmd.parameters[0] = cmd.parameters[0].map(function(choice) {
                    var next = $.openRankChoice(choice);
                    if (next !== choice) result.choice++;
                    return next;
                });
            }
            if (rank2 && compared && $.isV54Set150(cmd)) {
                cmd.parameters[4] = threshold;
                result.fame++;
            }
        });
        return result;
    };
    $.rankChoicePending = function(list) {
        var text = choiceText(list);
        return /\\v\[\s*64\s*\]/.test(text) && /v\[\s*1\s*\]\s*>\s*9999/.test(text);
    };
    $.rankFamePending = function(list, threshold) {
        var rank2 = false;
        var compared = false;
        var priced = false;
        var stale = false;
        (list || []).forEach(function(cmd) {
            if ($.isRank2Check(cmd)) rank2 = true;
            if ($.isFameAgainstV54(cmd)) compared = true;
            if ($.isV54Set150(cmd)) stale = true;
            var p = cmd && cmd.code === 122 && cmd.parameters;
            if (p && p[0] === 54 && p[1] === 54 && p[2] === 0 && p[3] === 0 && p[4] === threshold) priced = true;
        });
        if (!rank2 || !compared) return false;
        return stale || !priced;
    };
    $.patchShopList = function(list) {
        var n = 0;
        if (!list) return n;
        list.forEach(function(cmd) {
            if ($.patchShopCommand(cmd)) n++;
            if (eachRuntimeString(cmd, $.retieShopText)) n++;
        });
        return n;
    };
    function scriptBlocks(list) {
        var blocks = [];
        var i = 0;
        while (i < list.length) {
            var cmd = list[i];
            if (!cmd || cmd.code !== 355) { i++; continue; }
            var end = i + 1;
            while (end < list.length && list[end] && list[end].code === 655) end++;
            blocks.push({ start: i, end: end });
            i = end;
        }
        return blocks;
    }
    function blockText(list, block) {
        var lines = [];
        for (var i = block.start; i < block.end; i++) {
            lines.push(String((list[i].parameters && list[i].parameters[0]) || ''));
        }
        return lines.join('\n');
    }
    $.patchSpawnList = function(list) {
        var n = 0;
        if (!list) return n;
        var blocks = scriptBlocks(list);
        blocks.forEach(function(block, index) {
            var own = blockText(list, block);
            var follow = '';
            for (var k = index + 1; k < blocks.length && k <= index + 2; k++) follow += '\n' + blockText(list, blocks[k]);
            var assigns = /(?:^|[^.\w])id\s*=\s*(1|8)\b/.test(own);
            var linked = $.callsTemplateMap(own) || (assigns && $.callsTemplateMap(follow));
            if (!linked) return;
            for (var i = block.start; i < block.end; i++) {
                var line = String((list[i].parameters && list[i].parameters[0]) || '');
                var next = $.assignSpawnSlot(line);
                if (next !== line) {
                    list[i].parameters[0] = next;
                    n++;
                }
            }
        });
        return n;
    };
    $.spawnPending = function(list) {
        var blocks = scriptBlocks(list || []);
        for (var index = 0; index < blocks.length; index++) {
            var own = blockText(list, blocks[index]);
            var follow = '';
            for (var k = index + 1; k < blocks.length && k <= index + 2; k++) follow += '\n' + blockText(list, blocks[k]);
            var linked = $.callsTemplateMap(own) || (/id\s*=\s*(1|8)\b/.test(own) && $.callsTemplateMap(follow));
            if (linked && /(?:^|[^.\w])id\s*=\s*(1|8)\b/.test(own)) return true;
        }
        return false;
    };

    $.patchRankEvent = function(event, threshold) {
        var result = { choice: 0, fame: 0 };
        if (!event || !event.pages) return result;
        var limit = threshold || $.fameThreshold();
        event.pages.forEach(function(page) {
            if (!page || !page.list) return;
            var part = $.patchRankList(page.list, limit);
            result.choice += part.choice;
            result.fame += part.fame;
        });
        return result;
    };

    $.lockImmortal = function(table) {
        if (!table) return 'missing';
        var quest = table[301010];
        if (!quest) return 'missing';
        var cond = String(quest.release_conds || '');
        if (!/\$v\[\s*9\s*\]/.test(cond) && !/value\(\s*9\s*\)/.test(cond)) return 'shape';
        if (/\$v\[\s*9\s*\]\s*>=\s*99/.test(cond)) return 'already';
        try {
            Object.defineProperty(quest, 'release_conds', {
                configurable: true, enumerable: true, writable: true, value: '$v[9] >= 99'
            });
        } catch (e) {
            quest.release_conds = '$v[9] >= 99';
        }
        return 'locked';
    };
    $.lockCampEvent = function(event) {
        var n = 0;
        if (!event || !event.pages) return n;
        event.pages.forEach(function(page) {
            if (!page || !page.list) return;
            page.list.forEach(function(cmd) {
                var p = cmd && cmd.code === 111 && cmd.parameters;
                // 0.80j: variable 9 >= constant 3. Not a page condition and not a script.
                if (p && p[0] === 1 && p[1] === 9 && p[2] === 0 && p[3] === 3 && p[4] === 1) {
                    p[3] = 99;
                    n++;
                }
            });
        });
        return n;
    };
    $.campPending = function(event) {
        var open = false;
        var locked = false;
        if (!event || !event.pages) return true;
        event.pages.forEach(function(page) {
            (page && page.list || []).forEach(function(cmd) {
                var p = cmd && cmd.code === 111 && cmd.parameters;
                if (!p || p[0] !== 1 || p[1] !== 9 || p[2] !== 0 || p[4] !== 1) return;
                if (p[3] === 3) open = true;
                if (p[3] === 99) locked = true;
            });
        });
        if (open) return true;
        return !locked;
    };
    function eachPage(map, fn) {
        (map && map.events || []).forEach(function(ev) {
            if (!ev || !ev.pages) return;
            ev.pages.forEach(function(page) { if (page && page.list) fn(page.list); });
        });
    }
    $.shopPending = function(map) {
        var stale = false;
        var done = false;
        eachPage(map, function(list) {
            list.forEach(function(cmd) {
                var p = cmd && cmd.code === 111 && cmd.parameters;
                if (!p || p[0] !== 1 || p[2] !== 0 || p[4] !== 1) return;
                if (p[1] === 12 && (p[3] === 2 || p[3] === 3)) stale = true;
                if (p[1] === 9 && (p[3] === 2 || p[3] === 3)) done = true;
            });
        });
        return stale || !done;
    };

    $.patchMap = function(map, mapId) {
        var result = {
            rankChoice: 0, rankFame: 0, shop: 0, examNote: 0, spawns: 0, ruinsNote: 0, camp: 0
        };
        if (!$.isEnabled() || !map) return result;
        var id = Number(mapId);
        var limit = $.fameThreshold();
        if (id === 13 && map.events && map.events[12]) {
            var rank = $.patchRankEvent(map.events[12], limit);
            result.rankChoice = rank.choice;
            result.rankFame = rank.fame;
            var lists = [];
            map.events[12].pages.forEach(function(page) { if (page && page.list) lists.push(page.list); });
            var choicePending = lists.some($.rankChoicePending);
            var famePending = lists.some(function(list) { return $.rankFamePending(list, limit); });
            var sawChoice = lists.some(function(list) { return /\\v\[\s*64\s*\]/.test(choiceText(list)); });
            var sawFame = lists.some(function(list) {
                return list.some($.isRank2Check) && list.some($.isFameAgainstV54);
            });
            $.record('rankChoice', result.rankChoice, choicePending || !sawChoice);
            $.record('rankFame', result.rankFame, famePending || !sawFame);
        }
        if (id === 18) {
            eachPage(map, function(list) { result.shop += $.patchShopList(list); });
            $.record('shop', result.shop, $.shopPending(map));
        }
        if ($.EXAM_MAPS[id]) {
            var nextNote = $.ensureDungeonNote(map.note, $.EXAM_DLV);
            if (nextNote !== map.note) { map.note = nextNote; result.examNote = 1; }
            eachPage(map, function(list) { result.spawns += $.patchSpawnList(list); });
            $.record('examNote', result.examNote, !/ダンジョンレベル\s*[:：]\s*\d+/.test(String(map.note || '')));
            var spawnLeft = false;
            eachPage(map, function(list) { if ($.spawnPending(list)) spawnLeft = true; });
            $.record('spawns', result.spawns, spawnLeft);
        }
        if (id === $.RUINS_MAP) {
            var ruins = $.ensureDungeonNote(map.note, $.RUINS_DLV);
            if (ruins !== map.note) { map.note = ruins; result.ruinsNote = 1; }
            $.record('ruinsNote', result.ruinsNote, !/ダンジョンレベル\s*[:：]\s*\d+/.test(String(map.note || '')));
        }
        if (id === 288 && map.events && map.events[16]) {
            result.camp = $.lockCampEvent(map.events[16]);
            $.record('camp', result.camp, $.campPending(map.events[16]));
        }
        return result;
    };
    $.patchCommonEvents = function() {
        return { fame: 0, bonus: 0 };
    };
    $.patchQuests = function(table) {
        if (!$.isEnabled()) return 'off';
        var state = $.lockImmortal(table);
        var hits = state === 'locked' ? 1 : 0;
        var cond = table && table[301010] ? String(table[301010].release_conds || '') : '';
        $.record('quest301010', hits, /\$v\[\s*9\s*\]\s*>=\s*3\b/.test(cond));
        return state;
    };

    if (typeof ConfigManager !== 'undefined') {
        ConfigManager.npProgression = true;
        var _make = ConfigManager.makeData;
        ConfigManager.makeData = function() {
            var config = _make.apply(this, arguments);
            config.npProgression = this.npProgression;
            return config;
        };
        var _apply = ConfigManager.applyData;
        ConfigManager.applyData = function(config) {
            _apply.apply(this, arguments);
            this.npProgression = !(config && config.npProgression === false);
        };
    }
    if (typeof Window_Options !== 'undefined' && Window_Options.prototype.addGeneralOptions) {
        var _addOpt = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addOpt.apply(this, arguments);
            var en = false;
            try { en = !!(window.NP_Language && NP_Language.isEn && NP_Language.isEn()); } catch (e) { en = false; }
            this.addCommand(en ? 'Midgame progression' : 'Прогрессия середины игры', 'npProgression');
        };
    }
    if (typeof DataManager !== 'undefined' && DataManager.onLoad) {
        var _onLoad = DataManager.onLoad;
        DataManager.onLoad = function(object) {
            _onLoad.apply(this, arguments);
            try {
                if (object === $dataMap) {
                    var mapId = ($gameMap && ($gameMap._mapId || ($gameMap.mapId && $gameMap.mapId()))) || 0;
                    $.patchMap(object, mapId);
                }
                if (object === $dataCommonEvents) $.patchCommonEvents(object);
            } catch (e) { try { console.error(e); } catch (e2) {} }
        };
    }
    if (typeof DataManager !== 'undefined' && DataManager.isDatabaseLoaded) {
        var _db = DataManager.isDatabaseLoaded;
        DataManager.isDatabaseLoaded = function() {
            var ok = _db.apply(this, arguments);
            if (ok && typeof $csvQuestList !== 'undefined') {
                try { $.patchQuests($csvQuestList); } catch (e) {}
            }
            return ok;
        };
    }
    if (typeof KNS_CsvReader !== 'undefined' && KNS_CsvReader.loadDatabase) {
        var _csvLoad = KNS_CsvReader.loadDatabase;
        KNS_CsvReader.loadDatabase = function() {
            var loaded = _csvLoad.apply(this, arguments);
            try {
                if (typeof $csvQuestList !== 'undefined') $.patchQuests($csvQuestList);
            } catch (e) {}
            return loaded;
        };
    }
    try {
        if (window.NP_OptionsCategories && NP_OptionsCategories.register) {
            NP_OptionsCategories.register('npProgression', 'mech');
        }
    } catch (e) {}
})(NP_Progression);
