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
 * ветке берётся из параметра (по умолчанию 60, не 150). Значок 888 плагин
 * сам не выдаёт и переменные 8 и 9 не пишет: это делает ветка игры.
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
    $.THIEF_ID = 304;
    var RANK_LABEL = /昇級申請|select_rank_up|Запрос на повышение|Promotion Request/;

    function compact(text) {
        return String(text || '').toLowerCase().replace(/\s+/g, '').replace(/===/g, '==').replace(/!==/g, '!=');
    }
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
    $.log = function(id) {
        try { console.log('[NP_Progression] ' + id); } catch (e) {}
    };

    $.isDeadPlayerGate = function(script) {
        var body = compact(script);
        return body === 'v[1]>9999' || body === '$gamevariables.value(1)>9999';
    };
    $.isRank3Script = function(script) {
        var body = compact(script);
        return body === 'v[9]>=3' || body === '$gamevariables.value(9)>=3' ||
            body === 'v[9]>2' || body === '$gamevariables.value(9)>2';
    };
    $.openRankChoice = function(text) {
        var raw = String(text || '');
        if (!RANK_LABEL.test(raw)) return raw;
        var next = raw.replace(/v\[\s*1\s*\]\s*>\s*9999\s*&&\s*/gi, '');
        next = next.replace(/\s*&&\s*v\[\s*1\s*\]\s*>\s*9999/gi, '');
        next = next.replace(/\s*if\s*\(\s*v\[\s*1\s*\]\s*>\s*9999\s*\)/gi, '');
        next = next.replace(/i\[\s*888\s*\]\s*&&\s*/gi, '');
        next = next.replace(/\s*&&\s*i\[\s*888\s*\]/gi, '');
        next = next.replace(/\s*if\s*\(\s*i\[\s*888\s*\]\s*\)/gi, '');
        next = next.replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+$/, '');
        if (!/v\[\s*9\s*\]\s*>=\s*2/.test(next)) {
            if (/if\s*\(/i.test(next)) next = next.replace(/if\s*\(/i, 'if(v[9] >= 2 && ');
            else next += ' if(v[9] >= 2)';
        }
        return next;
    };
    $.retargetFame150 = function(text, threshold) {
        var raw = String(text || '');
        if (/setValue\s*\(\s*[89]\b/.test(raw)) return raw;
        return raw.replace(/(\$gameVariables\.value\(\s*322\s*\)|v\[\s*322\s*\])\s*(>=|===|==|>)\s*150\b/g,
            function(all, expr, op) {
                var use = (op === '==' || op === '===') ? '>=' : op;
                return expr + ' ' + use + ' ' + threshold;
            });
    };
    $.neutralize888 = function(text) {
        var raw = String(text || '');
        if (/setValue\s*\(\s*[89]\b/.test(raw)) return raw;
        if (/gainItem\(\s*\$dataItems\[\s*888\s*\]/.test(raw)) return raw;
        if (!/hasItem\(\s*\$dataItems\[\s*888\s*\]/.test(raw)) return raw;
        return raw.replace(/\$gameParty\.hasItem\(\s*\$dataItems\[\s*888\s*\]\s*(?:,\s*true\s*)?\)/g, 'true');
    };
    $.widenFameText = function(text) {
        return String(text || '').replace(
            /(\$gameVariables\.value\(\s*322\s*\)|v\[\s*322\s*\])\s*===?\s*(10|30)\b/g,
            function(all, expr, n) { return expr + ' >= ' + n; });
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
    $.retargetSpawnText = function(text) {
        return String(text || '').replace(/add_event(\s*\(\s*|\s+)29(\s*,\s*|\s+)(101|102)\b/g,
            function(all, open, sep) { return 'add_event' + open + '29' + sep + $.THIEF_ID; });
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
    $.patchFameCommand = function(cmd) {
        if (!cmd || cmd.code !== 111 || !cmd.parameters) return false;
        var p = cmd.parameters;
        if (p[0] !== 1 || p[1] !== 322 || p[2] !== 0 || p[4] !== 0) return false;
        if (p[3] !== 10 && p[3] !== 30) return false;
        p[4] = 1;
        return true;
    };
    $.patchFame150Command = function(cmd, threshold) {
        if (!cmd || cmd.code !== 111 || !cmd.parameters) return false;
        var p = cmd.parameters;
        if (p[0] !== 1 || p[1] !== 322 || p[2] !== 0 || p[3] !== 150) return false;
        if (p[4] !== 0 && p[4] !== 1 && p[4] !== 3) return false;
        p[3] = threshold;
        if (p[4] === 0) p[4] = 1;
        return true;
    };
    $.patchBadgeCommand = function(cmd) {
        if (!cmd || cmd.code !== 111 || !cmd.parameters) return false;
        var p = cmd.parameters;
        if (p[0] === 8 && p[1] === 888) {
            cmd.parameters = [12, 'true'];
            return true;
        }
        return false;
    };
    $.patchShopCommand = function(cmd) {
        if (!cmd || cmd.code !== 111 || !cmd.parameters) return false;
        var p = cmd.parameters;
        if (p[0] !== 1 || p[1] !== 12 || p[2] !== 0 || p[4] !== 1) return false;
        if (p[3] !== 2 && p[3] !== 3) return false;
        p[1] = 9;
        return true;
    };

    $.patchRankList = function(list, threshold) {
        var result = { choice: 0, gate: 0, fame: 0, badge: 0 };
        if (!list) return result;
        result.gate = $.patchDeadGates(list);
        list.forEach(function(cmd) {
            if (!cmd || cmd.code === 101 || cmd.code === 401) return;
            if (cmd.code === 102 && cmd.parameters && Array.isArray(cmd.parameters[0])) {
                cmd.parameters[0] = cmd.parameters[0].map(function(choice) {
                    var next = $.openRankChoice(choice);
                    if (next !== choice) result.choice++;
                    return next;
                });
            }
            if ($.patchFame150Command(cmd, threshold)) result.fame++;
            if ($.patchBadgeCommand(cmd)) result.badge++;
        });
        return result;
    };
    $.patchDeadGates = function(list) {
        var n = 0;
        for (var i = 0; i < list.length; i++) {
            var cmd = list[i];
            if (!cmd || cmd.code !== 111 || !cmd.parameters || cmd.parameters[0] !== 12) continue;
            if (!$.isDeadPlayerGate(cmd.parameters[1])) continue;
            var indent = cmd.indent || 0;
            var body = '';
            var choices = 0;
            for (var j = i + 1; j < list.length; j++) {
                var next = list[j];
                if (!next) continue;
                if ((next.indent || 0) === indent && (next.code === 412 || next.code === 411)) break;
                if (next.code === 102) choices++;
                body += JSON.stringify(next.parameters || []);
            }
            if (choices > 1 || !RANK_LABEL.test(body)) continue;
            cmd.parameters[1] = '$gameVariables.value(9) >= 2';
            n++;
        }
        return n;
    };

    // Script edits need a visible count. Do them in a second pass that reports changes.
    $.patchRankScripts = function(list, threshold) {
        var fame = 0;
        var badge = 0;
        if (!list) return { fame: fame, badge: badge };
        list.forEach(function(cmd) {
            if (!cmd || cmd.code === 101 || cmd.code === 401 || !cmd.parameters) return;
            var before = JSON.stringify(cmd.parameters);
            cmd.parameters = patchStrings(cmd.parameters, function(text) {
                return $.neutralize888($.retargetFame150(text, threshold));
            });
            var after = JSON.stringify(cmd.parameters);
            if (before === after) return;
            if (/150/.test(before)) fame++;
            if (/888/.test(before)) badge++;
        });
        return { fame: fame, badge: badge };
    };

    $.patchRankEvent = function(event, threshold) {
        var result = { choice: 0, gate: 0, fame: 0, badge: 0 };
        if (!event || !event.pages) return result;
        var limit = threshold || $.DEFAULT_FAME;
        event.pages.forEach(function(page) {
            if (!page || !page.list) return;
            var part = $.patchRankList(page.list, limit);
            var scripts = $.patchRankScripts(page.list, limit);
            result.choice += part.choice;
            result.gate += part.gate;
            result.fame += part.fame + scripts.fame;
            result.badge += part.badge + scripts.badge;
        });
        return result;
    };

    $.patchFameList = function(list) {
        var n = 0;
        if (!list) return n;
        list.forEach(function(cmd) {
            if ($.patchFameCommand(cmd)) n++;
            if (eachRuntimeString(cmd, $.widenFameText)) n++;
        });
        return n;
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
    $.patchSpawnList = function(list) {
        var n = 0;
        if (!list) return n;
        list.forEach(function(cmd) {
            if (!cmd || (cmd.code !== 355 && cmd.code !== 655 && cmd.code !== 356 && !(cmd.code === 111 && cmd.parameters && cmd.parameters[0] === 12))) return;
            if (eachRuntimeString(cmd, $.retargetSpawnText)) n++;
        });
        return n;
    };

    function questMode(text, current) {
        if (/900201|900202/.test(text)) return 'exam';
        if (/900301/.test(text)) return 'titan';
        if (/900\d{3}/.test(text)) return null;
        return current;
    }
    $.retargetBonusLine = function(text, mode) {
        var raw = String(text || '');
        if (!mode) return raw;
        if (/setValue\s*\(\s*[89]\b/.test(raw)) return raw;
        if (/setValue\s*\(\s*922\b/.test(raw) || /setValue\s*\(\s*912\b/.test(raw)) return raw;
        if (mode === 'exam') {
            return raw.replace(/\$gameVariables\.value\(\s*922\s*\)/g, '$gameVariables.value(912)')
                .replace(/v\[\s*922\s*\]/g, 'v[912]');
        }
        if (mode === 'titan') {
            return raw.replace(/\$gameVariables\.value\(\s*912\s*\)/g, '$gameVariables.value(922)')
                .replace(/v\[\s*912\s*\]/g, 'v[922]');
        }
        return raw;
    };
    $.patchCe46List = function(list) {
        var mode = null;
        var n = 0;
        if (!list) return n;
        list.forEach(function(cmd) {
            if (!cmd || !cmd.parameters || cmd.code === 101 || cmd.code === 401) return;
            var editable = cmd.code !== 108 && cmd.code !== 408;
            var before = JSON.stringify(cmd.parameters);
            cmd.parameters = patchStrings(cmd.parameters, function(text) {
                return String(text).split('\n').map(function(line) {
                    mode = questMode(line, mode);
                    return editable ? $.retargetBonusLine(line, mode) : line;
                }).join('\n');
            });
            if (editable && JSON.stringify(cmd.parameters) !== before) n++;
        });
        return n;
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
            if (!page) return;
            var conditions = page.conditions;
            if (conditions && conditions.variableValid && Number(conditions.variableId) === 9 &&
                Number(conditions.variableValue) === 3) {
                conditions.variableValue = 99;
                n++;
            }
            if (!page.list) return;
            page.list.forEach(function(cmd) {
                if (!cmd || cmd.code !== 111 || !cmd.parameters || cmd.parameters[0] !== 12) return;
                if (!$.isRank3Script(cmd.parameters[1])) return;
                cmd.parameters[1] = '$gameVariables.value(9) >= 99';
                n++;
            });
        });
        return n;
    };

    $.patchMap = function(map, mapId) {
        var result = { rank: null, shop: 0, spawns: 0, fame: 0, camp: 0, note: false };
        if (!$.isEnabled() || !map) return result;
        var id = Number(mapId);
        if (id === 13 && map.events && map.events[12]) {
            result.rank = $.patchRankEvent(map.events[12], $.fameThreshold());
        }
        if (id === 18 && map.events) {
            map.events.forEach(function(ev) {
                if (!ev || !ev.pages) return;
                ev.pages.forEach(function(page) { result.shop += $.patchShopList(page && page.list); });
            });
        }
        if ($.EXAM_MAPS[id]) {
            var nextNote = $.ensureDungeonNote(map.note, $.EXAM_DLV);
            if (nextNote !== map.note) { map.note = nextNote; result.note = true; }
            if (map.events) {
                map.events.forEach(function(ev) {
                    if (!ev || !ev.pages) return;
                    ev.pages.forEach(function(page) { result.spawns += $.patchSpawnList(page && page.list); });
                });
            }
        }
        if (id === $.RUINS_MAP) {
            var ruins = $.ensureDungeonNote(map.note, $.RUINS_DLV);
            if (ruins !== map.note) { map.note = ruins; result.note = true; }
        }
        if (id === 288 && map.events && map.events[16]) result.camp = $.lockCampEvent(map.events[16]);
        if (map.events) {
            map.events.forEach(function(ev) {
                if (!ev || !ev.pages) return;
                ev.pages.forEach(function(page) { result.fame += $.patchFameList(page && page.list); });
            });
        }
        return result;
    };
    $.patchCommonEvents = function(data) {
        var result = { fame: 0, bonus: 0 };
        if (!$.isEnabled() || !data) return result;
        [46, 926].forEach(function(id) {
            if (data[id] && data[id].list) result.bonus += $.patchCe46List(data[id].list);
        });
        data.forEach(function(entry) {
            if (entry && entry.list) result.fame += $.patchFameList(entry.list);
        });
        return result;
    };
    $.patchQuests = function(table) {
        if (!$.isEnabled()) return 'off';
        return $.lockImmortal(table);
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
