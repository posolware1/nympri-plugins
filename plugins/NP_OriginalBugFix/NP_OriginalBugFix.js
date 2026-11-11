var NP_L = window.NP_L || function(r) { return r; };
//=============================================================================
// NP_OriginalBugFix.js
//=============================================================================
/*:
 * @plugindesc v1.1 Чинит краши скриптов оригинала 0.80j и переходы на отсутствующие карты.
 * @author RU mod
 *
 * @help
 * При загрузке карты и общих событий сверяет команду с хэшем исходного текста.
 * Совпало — подставляет исправленный скрипт. Не совпало — пропускает и пишет
 * одну строку в консоль. Текст реплик (команды показа текста) не меняется.
 * Переход на карту, которой нет в списке карт, не выполняется: короткое
 * сообщение и возврат на карту мира. Два перехода с булавки ведут в уже
 * существующий город: Горгода (V334 = 3) на карту 217 (5, 37), хижина
 * (V334 = 37, карта 157 клетка 21,85) на карту 155 (16, 21). Направление
 * и затухание берутся из исходной команды. Остальные пропуски остаются
 * блоком. Сжатие карты 251 не меняется. Новые карты не создаются.
 * Целиком патчи CommonEventPatch_202609 и _202610 не включаются.
 * Точечно: в выборе ночлега en(v[133]) заменяется на en(s[133]).
 * Сейв не переписывается. Настройка «Исправления оригинала» включена по умолчанию.
 * CommonEventPatchList не заполняется.
 */
var Imported = Imported || {};
Imported.NP_OriginalBugFix = true;
var NP_OriginalBugFix = NP_OriginalBugFix || {};

(function($) {
    'use strict';
    var seen = {};
    $.SCRIPTS = [];
    $.CHOICE = { id: 'ce_patch_314_s133_surgical', ce: 314, indexes: [237, 243], from: '\\n[2] en(v[133])', to: '\\n[2] en(s[133])' };

    function hex8(n) {
        var hex = (n >>> 0).toString(16);
        while (hex.length < 8) hex = '0' + hex;
        return hex;
    }
    $.hash = function(s) {
        var h = 0x811c9dc5, d = 5381;
        for (var i = 0; i < s.length; i++) {
            var code = s.charCodeAt(i);
            h ^= code;
            h = Math.imul(h, 0x01000193);
            d = Math.imul(d, 33) ^ code;
        }
        return hex8(h) + hex8(d);
    };
    $.norm = function(s) {
        return String(s == null ? '' : s).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
    };
    $.isEnabled = function() {
        if (typeof ConfigManager === 'undefined' || ConfigManager.npOriginalBugFix === undefined) return true;
        return ConfigManager.npOriginalBugFix !== false;
    };
    $.note = function(id, kind) {
        var key = kind + ':' + id;
        if (seen[key]) return;
        seen[key] = true;
        try { console.log('[NP_OriginalBugFix] ' + kind + ' ' + id); } catch (e) {}
        if (Array.isArray($.log)) $.log.push(kind + ' ' + id);
    };
    $.refusesWholesale = function() { return true; };

    $.readBlock = function(list, index) {
        var cmd = list[index];
        if (!cmd || cmd.code !== 355) return null;
        var lines = [String((cmd.parameters && cmd.parameters[0]) || '')];
        var i = index + 1;
        while (i < list.length && list[i] && list[i].code === 655) {
            lines.push(String((list[i].parameters && list[i].parameters[0]) || ''));
            i++;
        }
        return { text: lines.join('\n'), end: i };
    };
    $.writeBlock = function(list, index, end, replacement) {
        var lines = $.norm(replacement).split('\n');
        var span = end - index;
        if (lines.length <= span) {
            for (var i = 0; i < span; i++) list[index + i].parameters[0] = i < lines.length ? lines[i] : '';
        } else {
            list[index].parameters[0] = lines.join('\n');
            for (var j = index + 1; j < end; j++) list[j].parameters[0] = '';
        }
    };
    $.applyOne = function(list, entry) {
        if (!list || !entry) return;
        var cmd = list[entry.i];
        if (!cmd || cmd.code === 101 || cmd.code === 401) { $.note(entry.id, 'skip'); return; }
        if (entry.mv) {
            var routeObj = cmd.code === 205 && cmd.parameters && cmd.parameters[1];
            var route = routeObj && routeObj.list;
            if (!route) { $.note(entry.id, 'skip'); return; }
            var found = false;
            route.forEach(function(step) {
                if (!step || step.code !== 45) return;
                var text = $.norm(step.parameters && step.parameters[0]);
                if (text === $.norm(entry.r)) { found = true; return; }
                if ($.hash(text) === entry.h) {
                    step.parameters[0] = entry.r;
                    found = true;
                    $.note(entry.id, 'patched');
                }
            });
            if (!found) $.note(entry.id, 'skip');
            return;
        }
        if (cmd.code === 355) {
            var block = $.readBlock(list, entry.i);
            var text = $.norm(block.text);
            if (text === $.norm(entry.r)) return;
            if ($.hash(text) !== entry.h) { $.note(entry.id, 'skip'); return; }
            $.writeBlock(list, entry.i, block.end, entry.r);
            $.note(entry.id, 'patched');
            return;
        }
        if (cmd.code === 111 && cmd.parameters && cmd.parameters[0] === 12) {
            var cond = $.norm(cmd.parameters[1]);
            if (cond === $.norm(entry.r)) return;
            if ($.hash(cond) !== entry.h) { $.note(entry.id, 'skip'); return; }
            cmd.parameters[1] = entry.r;
            $.note(entry.id, 'patched');
            return;
        }
        $.note(entry.id, 'skip');
    };
    $.patchMap = function(map, mapId) {
        if (!$.isEnabled() || !map || !map.events) return;
        $.SCRIPTS.forEach(function(entry) {
            if (entry.c || entry.m !== mapId) return;
            var ev = map.events[entry.e];
            var page = ev && ev.pages && ev.pages[entry.p];
            if (!page || !page.list) { $.note(entry.id, 'skip'); return; }
            $.applyOne(page.list, entry);
        });
    };
    $.replaceChoice = function(value, from, to) {
        if (typeof value === 'string') {
            if (value.indexOf(from) >= 0) return { value: value.split(from).join(to), state: 'patched' };
            if (value.indexOf(to) >= 0) return { value: value, state: 'already' };
            return { value: value, state: 'miss' };
        }
        if (Array.isArray(value)) {
            var state = 'miss';
            var next = value.map(function(item) {
                var part = $.replaceChoice(item, from, to);
                if (part.state === 'patched') state = 'patched';
                else if (part.state === 'already' && state !== 'patched') state = 'already';
                return part.value;
            });
            return { value: next, state: state };
        }
        return { value: value, state: 'miss' };
    };
    $.patchSurgical = function(data) {
        if (!$.isEnabled() || !data) return;
        var spec = $.CHOICE;
        var ce = data[spec.ce];
        if (!ce || !ce.list) { $.note(spec.id, 'skip'); return; }
        var patched = false, missed = false;
        spec.indexes.forEach(function(index) {
            var cmd = ce.list[index];
            if (!cmd || cmd.code === 101 || cmd.code === 401) { missed = true; return; }
            var part = $.replaceChoice(cmd.parameters, spec.from, spec.to);
            if (part.state === 'patched') {
                cmd.parameters = part.value;
                patched = true;
            } else if (part.state === 'miss') missed = true;
        });
        if (patched) $.note(spec.id, 'patched');
        else if (missed) $.note(spec.id, 'skip');
    };
    $.patchCommonEvents = function(data) {
        if (!$.isEnabled() || !data) return;
        $.SCRIPTS.forEach(function(entry) {
            if (!entry.c) return;
            var ce = data[entry.c];
            if (!ce || !ce.list) { $.note(entry.id, 'skip'); return; }
            $.applyOne(ce.list, entry);
        });
        $.patchSurgical(data);
    };

    $.worldDest = function(mapInfos, wmts) {
        var infos = mapInfos || [];
        if (infos[3] && wmts && typeof wmts.X === 'number' && typeof wmts.Y === 'number' && wmts.X >= 0 && wmts.Y >= 0) {
            return { map: 3, x: wmts.X, y: wmts.Y, d: 2, fade: 0 };
        }
        if (infos[96]) return { map: 96, x: 7, y: 18, d: 2, fade: 0 };
        if (infos[3]) return { map: 3, x: 0, y: 0, d: 2, fade: 0 };
        return null;
    };
    $.mapExists = function(mapInfos, id) {
        return !!(mapInfos && id && mapInfos[id]);
    };
    $.PATCH_NAMES = ['gorgoda', 'hut'];
    $.redirectFor = function(params, v334, mapInfos) {
        if (!params || params[0] !== 0) return null;
        var v = Number(v334 || 0);
        if (params[1] === 385 && v === 3 && $.mapExists(mapInfos, 217)) {
            return { id: 'gorgoda', map: 217, x: 5, y: 37 };
        }
        if (params[1] === 157 && params[2] === 21 && params[3] === 85 && v === 37 && $.mapExists(mapInfos, 155)) {
            return { id: 'hut', map: 155, x: 16, y: 21 };
        }
        return null;
    };
    $.transferPlan = function(params, ctx) {
        ctx = ctx || {};
        if (!params) return null;
        if (params[0] === 0 && params[1] === 251 && params[2] === 29 && params[3] === 40) return { type: 'clamp', y: 39 };
        var v334 = ctx.readVar ? ctx.readVar(334) : 0;
        var redirect = $.redirectFor(params, v334, ctx.mapInfos);
        if (redirect) {
            return {
                type: 'redirect', id: redirect.id, map: redirect.map, x: redirect.x, y: redirect.y,
                d: params[4], fade: params[5]
            };
        }
        if (params[0] === 0 && params[1] === 157 && params[2] === 21 && params[3] === 85) {
            return { type: 'block', dest: $.worldDest(ctx.mapInfos, ctx.wmts) };
        }
        var mapId = null;
        if (params[0] === 0) mapId = params[1];
        else if (params[0] === 1 && ctx.readVar) mapId = ctx.readVar(params[1]);
        else return null;
        if (!$.mapExists(ctx.mapInfos, mapId)) return { type: 'block', dest: $.worldDest(ctx.mapInfos, ctx.wmts) };
        return null;
    };
    $.sampleHits = function(mapInfos) {
        var hits = { gorgoda: 0, hut: 0 };
        var g = $.transferPlan([0, 385, 23, 18, 2, 0], {
            mapInfos: mapInfos,
            readVar: function(id) { return id === 334 ? 3 : 0; }
        });
        var h = $.transferPlan([0, 157, 21, 85, 4, 1], {
            mapInfos: mapInfos,
            readVar: function(id) { return id === 334 ? 37 : 0; }
        });
        if (g && g.type === 'redirect' && g.map === 217 && g.x === 5 && g.y === 37 && g.d === 2 && g.fade === 0) hits.gorgoda = 1;
        if (h && h.type === 'redirect' && h.map === 155 && h.x === 16 && h.y === 21 && h.d === 4 && h.fade === 1) hits.hut = 1;
        return hits;
    };
    $.blockedText = function() {
        var en = false;
        try { en = !!(window.NP_Language && NP_Language.isEn && NP_Language.isEn()); } catch (e) { en = false; }
        return en ? 'This place is not in the current version.' : 'Эта локация не реализована в текущей версии.';
    };

    if (typeof ConfigManager !== 'undefined') {
        ConfigManager.npOriginalBugFix = true;
        var _make = ConfigManager.makeData;
        ConfigManager.makeData = function() {
            var c = _make.apply(this, arguments);
            c.npOriginalBugFix = this.npOriginalBugFix;
            return c;
        };
        var _apply = ConfigManager.applyData;
        ConfigManager.applyData = function(c) {
            _apply.apply(this, arguments);
            this.npOriginalBugFix = !(c && c.npOriginalBugFix === false);
        };
    }
    if (typeof Window_Options !== 'undefined' && Window_Options.prototype.addGeneralOptions) {
        var _addOpt = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addOpt.apply(this, arguments);
            var en = false;
            try { en = !!(window.NP_Language && NP_Language.isEn && NP_Language.isEn()); } catch (e) { en = false; }
            this.addCommand(en ? 'Original bug fixes' : 'Исправления оригинала', 'npOriginalBugFix');
        };
    }
    if (typeof DataManager !== 'undefined' && DataManager.onLoad) {
        var _onLoad = DataManager.onLoad;
        DataManager.onLoad = function(object) {
            _onLoad.apply(this, arguments);
            try {
                if (object === $dataMap) $.patchMap(object, $gameMap && $gameMap._mapId);
                if (object === $dataCommonEvents) $.patchCommonEvents(object);
            } catch (e) { try { console.error(e); } catch (e2) {} }
        };
    }
    if (typeof Game_Interpreter !== 'undefined' && Game_Interpreter.prototype.command201) {
        var _201 = Game_Interpreter.prototype.command201;
        Game_Interpreter.prototype.command201 = function() {
            if (!$.isEnabled()) return _201.apply(this, arguments);
            if (this._npBugDefer) {
                this._npBugDefer = false;
                var dest = this._npBugDest;
                if (dest && $gamePlayer && $gamePlayer.reserveTransfer) {
                    $gamePlayer.reserveTransfer(dest.map, dest.x, dest.y, dest.d, dest.fade);
                }
                return true;
            }
            var plan = null;
            try {
                plan = $.transferPlan(this._params, {
                    mapInfos: (typeof $dataMapInfos !== 'undefined') ? $dataMapInfos : [],
                    wmts: (typeof $WMTS !== 'undefined') ? $WMTS : null,
                    readVar: function(id) { return $gameVariables ? $gameVariables.value(id) : 0; }
                });
            } catch (e) { plan = null; }
            if (!plan) return _201.apply(this, arguments);
            if (plan.type === 'clamp') {
                this._params[3] = plan.y;
                return _201.apply(this, arguments);
            }
            if (plan.type === 'redirect') {
                this._params[1] = plan.map;
                this._params[2] = plan.x;
                this._params[3] = plan.y;
                return _201.apply(this, arguments);
            }
            if ($gameMessage && $gameMessage.isBusy && $gameMessage.isBusy()) return false;
            if ($gameMessage) {
                try {
                    $gameMessage.setFaceImage('', 0);
                    $gameMessage.setBackground(0);
                    $gameMessage.setPositionType(2);
                } catch (e2) {}
                $gameMessage.add($.blockedText());
            }
            this._npBugDest = plan.dest;
            this._npBugDefer = true;
            if (this.setWaitMode) this.setWaitMode('message');
            return false;
        };
    }
})(NP_OriginalBugFix);
NP_OriginalBugFix.SCRIPTS = [{"id":"script_001","c":114,"i":41,"h":"b46fadd33a43d38f","r":"if ($gameActors.actor(2).equips()[1] != null) {\nid = $gameActors.actor(2).equips()[1].id\n\n$no = ($e_name + \"-cloth\" + id)\n\n$picture = screen.pictures[$layer11]\n$picture.show($no,0,0,0,$s_w,$s_h,255,0)\n}"},{"id":"script_002","c":154,"i":15,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_003","c":154,"i":1,"h":"a78910e4dabb6f7c","r":"if (typeof $cum_amount === \"undefined\" || $cum_amount == null) $cum_amount = 0;"},{"id":"script_004","c":431,"i":23,"h":"0b6e9b82cb3e4b08","r":"if (typeof $clothes === \"undefined\" || $clothes == null) {\n  $clothes = new Array(10);\n}"},{"id":"script_005","c":431,"i":26,"h":"bd2c363dbc1e69af","r":"n = 0;\nwhile (n < 7) {\n  if ($gameActors.actor(2).equips()[n] != null) {\n    $clothes[n] = $gameActors.actor(2).equips()[n].id;\n  }\n  n += 1;\n}"},{"id":"script_006","c":431,"i":78,"h":"d8babca45882d844","r":"n = 0;\nwhile (n < 7) {\n  if ($clothes[n] != null) {\n  cloth = $clothes[n];\n  i = $clothes[n];\n  $gameActors.actor(2).changeEquip(n, i ? $dataArmors[i] : null);\n  }\n  n += 1;\n}"},{"id":"script_007","c":492,"i":141,"h":"908a41d782ddcc9f","r":"$id = \"en11\";\n$name = \"Jin\";\n$tier = \"Gold Hero\";\n$text = \"Are you truly safe from being cucked? You'll never reach the truth.\";\n$race = \"Human\";\n$pixel = \"actor3\";\n$pnum = 0;"},{"id":"script_008","c":710,"i":100,"h":"311c48b412cb020e","r":"console.log(\"アニメ３\");"},{"id":"script_009","c":710,"i":103,"h":"75bda96010aac678","r":"$sp = $gameScreen.picture(1);\ni = 145;\nx = 0; y = -125;\nwhile (i < 153) {\n  name = \"animation/ogre/event-animation-ogre_\" + i;\n  $sp.show(name, 0, x, y, 100, 100, 255, 0);\n  wait(1);\n  i = i + 1;\n}"},{"id":"script_010","c":710,"i":130,"h":"a323b7ef12cb0229","r":"console.log(\"アニメ４\");"},{"id":"script_011","c":710,"i":134,"h":"92d6ae3ca38035d2","r":"$sp = $gameScreen.picture(1);\ni = 153;\nx = 0; y = -125;\nwhile (i < 219) {\n  name = \"animation/ogre/event-animation-ogre_\" + i;\n  $sp.show(name, 0, x, y, 100, 100, 255, 0);\n  wait(1);\n  i = i + 1;\n}"},{"id":"script_012","c":710,"i":13,"h":"7fe35a894f99133f","r":"$sp = $gameScreen.picture(1);\ni = 0;\nx = 0; y = -125;\nwhile (i < 220) {\n  name = \"animation/ogre/event-animation-ogre_\" + i;\n  $sp.show(name, 0, x, y, 100, 100, 255, 0);\n  wait(1);\n  i = i + 1;\n}"},{"id":"script_013","c":710,"i":40,"h":"a916f56e12cb024c","r":"console.log(\"アニメ１\");"},{"id":"script_014","c":710,"i":43,"h":"7c45c2eeb82d7e5c","r":"$sp = $gameScreen.picture(1);\ni = 0;\nx = 0; y = -125;\nwhile (i < 120) {\n  name = \"animation/ogre/event-animation-ogre_\" + i;\n  $sp.show(name, 0, x, y, 100, 100, 255, 0);\n  wait(1);\n  i = i + 1;\n}"},{"id":"script_015","c":710,"i":70,"h":"1b1e64a912cb026f","r":"console.log(\"アニメ２\");"},{"id":"script_016","c":710,"i":73,"h":"5739a0e1e90afc3f","r":"$sp = $gameScreen.picture(1);\ni = 122;\nx = 0; y = -125;\nwhile (i < 144) {\n  name = \"animation/ogre/event-animation-ogre_\" + i;\n  $sp.show(name, 0, x, y, 100, 100, 255, 0);\n  wait(1);\n  i = i + 1;\n}"},{"id":"script_017","c":879,"i":11,"h":"7dad70f43be44310","r":"set_mlog(\"_log_database_text_iris_open_legs\");"},{"id":"script_018","m":1,"e":11,"p":1,"i":11,"h":"b4e497abc031552b","r":"i = 0;\nvar route = {repeat: false, skippable: false, wait: true, list: []};\nroute.list.push({code: 19, parameters: []});\nroute.list.push({code: 0, parameters: []});\n$add_event.forceMoveRoute(route);"},{"id":"script_019","m":1,"e":11,"p":1,"i":5,"h":"5dce1193f05404f9","r":"x = 17\ny = 15\n\n$add_event = this.knsAddEvent(x, y, 2, 26, 6)\n\n$add_event_id = $add_event.id\n"},{"id":"script_020","m":1,"e":13,"p":0,"i":4,"h":"ab5f78a4e232c820","r":"n = 1;\nif ($gameVariables.value(1) == 1) n = 11;\nif (typeof quest_board === \"function\") quest_board(n, null, false);\nelse console.warn(\"quest_board is not implemented in this build\");"},{"id":"script_021","m":1,"e":14,"p":2,"i":7,"h":"67d07b9baffc8c93","r":"KNS_QuestReceive.isQuestReceived(\"quest001jp\")"},{"id":"script_022","m":1,"e":29,"p":0,"i":12,"h":"38d1dd5d737043e9","r":"num = $gameVariables.value(20)\n$patron_cha_id = eval(\"$patron_character\" + num + \"[4]\")\n"},{"id":"script_023","m":1,"e":29,"p":0,"i":15,"h":"8445cbebfacbc1cd","r":"num = $gameVariables.value(20)\n$patron_cha_num = eval(\"$patron_character\" + num + \"[5]\")\n\n$patron_cha_num = parseInt($patron_cha_num, 10)\n"},{"id":"script_024","m":1,"e":29,"p":0,"i":20,"h":"3e5a6ad8958b1874","r":"num = $gameVariables.value(20)\n\n$gameVariables.setValue(296, eval(\"$patron_character\" + num + \"[0]\"))\n"},{"id":"script_025","m":1,"e":29,"p":0,"i":24,"h":"422df3a07d8fbc34","r":"num = $gameVariables.value(20)\n\n$gameVariables.setValue(297, eval(\"$patron_character\" + num + \"[1]\"))\n"},{"id":"script_026","m":1,"e":29,"p":0,"i":28,"h":"d89a74dc01cb6c78","r":"num = $gameVariables.value(20)\n\n$gameVariables.setValue(298, eval(\"$patron_character\" + num + \"[2]\"))\n"},{"id":"script_027","m":1,"e":29,"p":0,"i":66,"h":"f8a05a9dd6d5b27f","r":"x = $gameVariables.value(42)\ny = $gameVariables.value(43)\n\n$add_event = this.knsAddEvent(x, y, 3, 26, 2)\n\n$add_event_id = $add_event.id\n"},{"id":"script_028","m":1,"e":29,"p":0,"i":72,"h":"4e8612ec8d64c882","r":"var route = {repeat: false, skippable: false, wait: true, list: []};\nsprite = $patron_cha_id;\nnum = $patron_cha_num;\nroute.list.push({code: 41, parameters: [sprite, num]});\nroute.list.push({code: 42, parameters: [180]});\nroute.list.push({code: 0, parameters: []});\n$add_event.forceMoveRoute(route);"},{"id":"script_029","m":1,"e":33,"p":0,"i":3,"h":"cf207500f41937c8","r":"key = [17, 8, \"C\"]\n\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_030","m":1,"e":33,"p":0,"i":8,"h":"04a231e8b8a8109e","r":"key = [17, 8, \"D\"]\n\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_031","m":1,"e":8,"p":0,"i":14,"h":"8cbe71022b622a66","r":"if ($gameActors.actor(2).equips()[3] != null) {\n$no = ($e_name + \"-ossan_arms2\")\n\n$picture = screen.pictures[$layer8]\n$picture.show($no,0,$gameVariables.value(21),\n$gameVariables.value(22),$s_h,$s_w,255,0)\n}"},{"id":"script_032","m":1,"e":9,"p":0,"i":34,"h":"21e1bb6404a7b3c4","r":"if ($gameActors.actor(2).equips()[2] != null) {\nid = $gameActors.actor(2).equips()[2].id\n\n$no = String($gameVariables.value(24))\n$no = ($e_name + \"-cloth\" + id + \"-1\")\n\n$picture = screen.pictures[$layer19]\n$picture.show($no,0,$gameVariables.value(21),\n$gameVariables.value(22),$s_h,$s_w,255,0)\n}"},{"id":"script_033","m":1,"e":9,"p":0,"i":3,"h":"2911176fd1b06b1f","r":"$skin = $gameVariables.value(33)\n$no = String($gameVariables.value(24))\n$no = ($e_name + \"-head\" + $skin + \"-1\")\n\n$picture = screen.pictures[$layer15]\n$picture.show($no,0,$gameVariables.value(21),\n$gameVariables.value(22),$s_h,$s_w,255,0)\n"},{"id":"script_034","m":10,"e":5,"p":0,"i":17,"h":"6d942a24cdde844c","r":"x = 0\ny = 17\n\n$add_event = this.knsAddEvent(x, y, 3, 26, 6)\n\n$add_event_id = $add_event.id\n"},{"id":"script_035","m":10,"e":5,"p":0,"i":23,"h":"3a61f89f0b52ca37","r":"i = 0;\nvar route = {repeat: false, skippable: false, wait: true, list: []};\nwhile (i < 17) {\n  route.list.push({code: 3, parameters: []});\n  i += 1;\n}\nroute.list.push({code: 0, parameters: []});\n$add_event.forceMoveRoute(route);"},{"id":"script_036","m":10,"e":5,"p":0,"i":36,"h":"b4e497abc031552b","r":"i = 0;\nvar route = {repeat: false, skippable: false, wait: true, list: []};\nroute.list.push({code: 19, parameters: []});\nroute.list.push({code: 0, parameters: []});\n$add_event.forceMoveRoute(route);"},{"id":"script_037","m":17,"e":6,"p":1,"i":110,"h":"09ccec3b6aa8c257","r":"n = 0;\nwhile (n < 7) {\n  i = $clothes[n];\n  $gameActors.actor(2).changeEquip(n, i ? $dataArmors[i] : null);\n  n += 1;\n}"},{"id":"script_038","m":17,"e":6,"p":1,"i":151,"h":"8002aaccbc5dd18e","r":"$clothes = [];\nn = 0;\nwhile (n < 7) {\n  if ($gameActors.actor(2).equips()[n] != null) {\n    $clothes[n] = $gameActors.actor(2).equips()[n].id;\n  } else {\n    $clothes[n] = 0;\n  }\n  n += 1;\n}"},{"id":"script_039","m":17,"e":6,"p":1,"i":212,"h":"09ccec3b6aa8c257","r":"n = 0;\nwhile (n < 7) {\n  i = $clothes[n];\n  $gameActors.actor(2).changeEquip(n, i ? $dataArmors[i] : null);\n  n += 1;\n}"},{"id":"script_040","m":17,"e":6,"p":1,"i":49,"h":"92fb57ea1784d682","r":"x = 5\ny = 5\nid = 6\n$add_event = this.knsAddEvent(x, y, id, 17, 8)\n"},{"id":"script_041","m":17,"e":6,"p":1,"i":60,"h":"76daeae7d2a7df7d","r":"x = 10\ny = 4\nid = 6\n$add_event = this.knsAddEvent(x, y, id, 17, 2)\n"},{"id":"script_042","m":17,"e":6,"p":1,"i":68,"h":"d2cc7131d2a7e0b7","r":"x = 10\ny = 4\nid = 6\n$add_event = this.knsAddEvent(x, y, id, 17, 8)\n"},{"id":"script_043","m":17,"e":6,"p":1,"i":77,"h":"76daeae7d2a7df7d","r":"x = 10\ny = 4\nid = 6\n$add_event = this.knsAddEvent(x, y, id, 17, 2)\n"},{"id":"script_044","m":17,"e":6,"p":1,"i":90,"h":"8002aaccbc5dd18e","r":"$clothes = [];\nn = 0;\nwhile (n < 7) {\n  if ($gameActors.actor(2).equips()[n] != null) {\n    $clothes[n] = $gameActors.actor(2).equips()[n].id;\n  } else {\n    $clothes[n] = 0;\n  }\n  n += 1;\n}"},{"id":"script_045","m":17,"e":8,"p":0,"i":169,"h":"3f8c96b14384a1ab","r":"key = [17, 18, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_046","m":17,"e":8,"p":0,"i":62,"h":"d26071cca9c63a5e","r":"key = [17, 17, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_047","m":28,"e":1,"p":0,"i":60,"h":"4083511c8195acc8","r":"var route = {repeat: false, skippable: false, wait: true, list: []};\nroute.list.push({code: 18, parameters: []});\nroute.list.push({code: 0, parameters: []});\nn = 10;\nwhile (n < 23) {\n  cha = this.character(n);\n  if (cha) cha.forceMoveRoute(route);\n  n += 1;\n}"},{"id":"script_048","m":28,"e":1,"p":0,"i":86,"h":"7193eb110589f00b","r":"n = 10;\nwhile (n < 23) {\n  character = this.character(n);\n  if (character) character.requestBalloon(8);\n  n += 1;\n}"},{"id":"script_049","m":36,"e":1,"p":0,"i":0,"h":"bee5ab1a60251f0c","r":"console.log(\"イベント呼び出し元・MAP036 ID01\");"},{"id":"script_050","m":36,"e":2,"p":0,"i":0,"h":"f3e5407a84179a64","r":"console.log($dataSystem.variables[1003]);"},{"id":"script_051","m":36,"e":2,"p":0,"i":2,"h":"9c864f8c89c13442","r":"$qname = $qname.slice(7);"},{"id":"script_052","m":36,"e":2,"p":0,"i":4,"h":"f3e5407a84179a64","r":"console.log($dataSystem.variables[1003]);"},{"id":"script_053","m":39,"e":1,"p":0,"i":41,"h":"aaeb958d8775a2d5","r":"map_id = 39\nkey = [map_id, 6, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_054","m":39,"e":1,"p":1,"i":0,"h":"596cd3c0cea3a384","r":"map_id = 39\nkey = [map_id, 6, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_055","m":44,"e":3,"p":0,"i":149,"h":"d65f3bf7ad32af07","r":"map_id = 44\nid = 8\n\nkey = [map_id, id, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_056","m":53,"e":3,"p":2,"i":234,"h":"416ac8bb4b6eca99","r":"key = [80, 5, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_057","m":53,"e":3,"p":2,"i":261,"h":"615ea35f906d1a1b","r":"$gameVariables.value(121) == 241 || $gameVariables.value(121) == 242"},{"id":"script_058","m":53,"e":9,"p":4,"i":294,"h":"707f8927b8387edf","r":"num = $gameVariables.value(54);\nconsole.log(\"HP:\" + num);"},{"id":"script_059","m":53,"e":9,"p":4,"i":30,"h":"996c017777873e93","r":"if (typeof $help_turn === \"undefined\" || $help_turn == null) {\n  $help_turn = 0\n}"},{"id":"script_060","m":53,"e":9,"p":4,"i":33,"h":"4c24852b88193913","r":"if (typeof $ntr_in_combat === \"undefined\" || $ntr_in_combat == null) {\n  $ntr_in_combat = 0\n}"},{"id":"script_061","m":72,"e":1,"p":0,"i":7,"h":"1a6cd2cc9cdde008","r":"console.log($gameVariables.value(60));"},{"id":"script_062","m":79,"e":6,"p":1,"i":118,"h":"2aac428a8b2a0a06","r":"x = 7\n\nwhile (x < 16) {\nkey = [79, x, \"A\"]\n$gameSelfSwitches.setValue(key, false)\nx += 1\n}"},{"id":"script_063","m":79,"e":6,"p":1,"i":31,"h":"45e8920abde8e77c","r":"x = 7\n\nwhile (x < 16) {\nkey = [79, x, \"A\"]\n$gameSelfSwitches.setValue(key, true)\nx += 1\n}"},{"id":"script_064","m":91,"e":1,"p":0,"i":6,"h":"76f655f724145357","r":"$sp = $gameScreen.picture(1);\ni = 0;\nx = 0; y = -125;\nwhile (i < 220) {\n  name = \"animation/ogre/event-animation-ogre_\" + i;\n  $sp.show(name, 0, x, y, 100, 100, 0, 0);\n  wait(1);\n  i = i + 1;\n}"},{"id":"script_065","m":93,"e":1,"p":2,"i":4,"h":"e8fe7259e69c9d25","r":"key = [93, 1, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_066","m":93,"e":5,"p":0,"i":68,"h":"28022ee1e698c0f3","r":"key = [94, 1, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_067","m":94,"e":1,"p":0,"i":35,"h":"e8fe7259e69c9d25","r":"key = [93, 1, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_068","m":94,"e":1,"p":1,"i":11,"h":"3a856d44a33d2698","r":"key = [94, 1, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_069","m":107,"e":1,"p":0,"i":57,"h":"bf0c45d33b2a487b","r":"key = [107, 7, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n\nkey = [107, 8, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_070","m":107,"e":1,"p":2,"i":123,"h":"ab89879152028c0d","r":"$WMTS.X = $gameVariables.value(335);\n$WMTS.Y = $gameVariables.value(336);"},{"id":"script_071","m":108,"e":1,"p":1,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_072","m":109,"e":11,"p":0,"i":14,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_073","m":109,"e":9,"p":0,"i":17,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_074","m":116,"e":1,"p":1,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_075","m":116,"e":1,"p":21,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_076","m":116,"e":1,"p":2,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_077","m":116,"e":1,"p":3,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_078","m":116,"e":1,"p":4,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_079","m":116,"e":1,"p":6,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_080","m":116,"e":1,"p":7,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_081","m":116,"e":28,"p":0,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_082","m":116,"e":28,"p":1,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_083","m":116,"e":28,"p":2,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_084","m":116,"e":32,"p":0,"i":9,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_085","m":116,"e":33,"p":6,"i":10,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_086","m":116,"e":34,"p":1,"i":10,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_087","m":116,"e":34,"p":3,"i":10,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_088","m":116,"e":34,"p":5,"i":10,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_089","m":116,"e":34,"p":6,"i":10,"h":"ced647f98c515383","r":"n = 1;\ni = 1;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_090","m":152,"e":7,"p":0,"i":12,"h":"a56d513a248ddae0","r":"key = [152, 19, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_091","m":152,"e":7,"p":1,"i":28,"h":"2f074ea7acc59d77","r":"key = [152, 24, \"B\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_092","m":155,"e":8,"p":0,"i":66,"h":"63d0b32f8b3fee79","r":"key = [155, 5, \"B\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_093","m":155,"e":8,"p":0,"i":95,"h":"ce039d51c0cb3bcb","r":"key = [155, 5, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_094","m":164,"e":5,"p":1,"i":13,"h":"fc2c0f165f21eca0","r":"key = [164, 49, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_095","m":164,"e":5,"p":1,"i":17,"mv":1,"h":"df002122d9cf5e12","r":"this.opacity = 120;"},{"id":"script_096","m":164,"e":5,"p":2,"i":16,"mv":1,"h":"df002122d9cf5e12","r":"this.opacity = 120;"},{"id":"script_097","m":164,"e":5,"p":2,"i":49,"h":"19333ef8f240bf72","r":"key = [164, 50, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_098","m":167,"e":2,"p":0,"i":47,"h":"ec6ea0c19479dfb7","r":"key = [167, 9, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_099","m":167,"e":3,"p":0,"i":138,"h":"e6cb096ca9fd38b6","r":"key = [167, 13, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_100","m":169,"e":11,"p":0,"i":1,"h":"b5c8ccef0e8dfbb7","r":"var ev = this.event ? this.event() : $gameMap.event(this._eventId);\nvar evName = ev && ev.event ? ev.event().name : \"\";\nvar name = (evName.match(/<mob:(.*?)>/) || [])[1];\nconsole.log(name);"},{"id":"script_101","m":177,"e":32,"p":0,"i":9,"h":"a4e1e01c0f1c37e4","r":"key = [177, 33, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_102","m":177,"e":33,"p":0,"i":13,"h":"99e74c220c1d35f0","r":"key = [177, 41, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_103","m":178,"e":8,"p":0,"i":43,"h":"825ec9ad5d406c15","r":"key = [178, 5, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_104","m":178,"e":8,"p":0,"i":74,"h":"5d7122cde11d5e65","r":"key = [178, 4, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_105","m":198,"e":3,"p":0,"i":0,"h":"f028186d42f5e431","r":"// ＠灯り1"},{"id":"script_106","m":207,"e":4,"p":0,"i":18,"h":"641955e48b2a61b2","r":"tp_heal(1, 100);\ntp_heal(2, 100);\nif ($gameParty.members()[2] != null) {\n  id = $gameParty.members()[2].actorId();\n  tp_heal(id, 100);\n}"},{"id":"script_107","m":207,"e":5,"p":0,"i":0,"h":"5f2cfbf16d6b353b","r":"$door207 = 0;\nif ($gameSelfSwitches.value([207, 12, \"A\"]) == false) {\n  if ($gameSelfSwitches.value([207, 13, \"A\"]) == true) {\n    if ($gameSelfSwitches.value([207, 14, \"A\"]) == true) {\n      $door207 = 1;\n    }\n  }\n}"},{"id":"script_108","m":214,"e":4,"p":3,"i":118,"h":"a097f7d4acf54f18","r":"i = 0;\nwhile (i < 21) {\n  eval(\"$layer\" + i + \" = \" + i);\n  var layer = i;\n  $gameScreen.showPicture(layer, \"\", 0, 0, 0, 100, 100, 0, 0);\n  var pic = $gameScreen.picture(layer);\n  if (pic) pic._mirror = false;\n  i += 1;\n}"},{"id":"script_109","m":214,"e":4,"p":3,"i":128,"h":"f3f5f670699f27c6","r":"i = 21;\nwhile (i < 41) {\n  eval(\"$layer\" + i + \" = \" + i);\n  var layer = i;\n  var pic = $gameScreen.picture(layer);\n  if (pic) pic._mirror = true;\n  i += 1;\n}"},{"id":"script_110","m":220,"e":58,"p":0,"i":12,"h":"a94b2dd354514d49","r":"key = [220, 61, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_111","m":220,"e":58,"p":2,"i":12,"h":"250ea994b1deb0da","r":"key = [220, 61, \"C\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_112","m":227,"e":1,"p":0,"i":81,"h":"71e1319405aee340","r":"key = [227, 18, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_113","m":227,"e":1,"p":0,"i":85,"h":"bbb1e180f4821a5a","r":"key = [227, 20, \"A\"]\n$gameSelfSwitches.setValue(key, true)\n"},{"id":"script_114","m":238,"e":2,"p":0,"i":6,"h":"ab89879152028c0d","r":"$WMTS.X = $gameVariables.value(335);\n$WMTS.Y = $gameVariables.value(336);"},{"id":"script_115","m":265,"e":25,"p":1,"i":301,"h":"1de9cec5f6456463","r":"key = [265, 25, \"A\"]\n$gameSelfSwitches.setValue(key, false)\n"},{"id":"script_116","m":265,"e":26,"p":0,"i":118,"h":"8c9655982edf32fc","r":"$gameSelfSwitches.setValue([20, 17, 'A'], true)\n"},{"id":"script_117","c":1,"i":228,"h":"4dbc3b2150b68bd5","r":"  // Status Screen\n  ExpTotal        = \"Current Exp\"\n  ExpNext         = \"To Next %s\"\n"},{"id":"script_118","c":1,"i":231,"h":"ece297bf57fbca9b","r":"  // 戦闘終了メッセージ\n  $victory         = \"%s was victorious!\"\n  $defeat          = \"%s was defeated.\"\n  $btainExp       = \"%s EXP received!\"\n  $obtainGold      = \"%s\\\\G found!\"\n  $obtainItem      = \"%s found!\"\n  $levelUp         = \"%s is now %s %s!\"\n  $obtainSkill     = \"%s learned!\"\n"},{"id":"script_119","c":1,"i":239,"h":"7716f227f395b915","r":"  // Display when there are multiple members\n  $partyName       = \"%s's Party\"\n"},{"id":"script_120","c":1,"i":241,"h":"cec198113d33d2f1","r":"  // 戦闘基本メッセージ\n  $emerge          = \"%s emerged!\"\n  $preemptive      = \"%s got the upper hand!\"\n  $surprise        = \"%s was surprised!\"\n  $escapeStart     = \"%s has started to escape!\"\n  $escapeFailure   = \"However, it was unable to escape!\"\n"},{"id":"script_121","c":1,"i":248,"h":"02441ea0ea43d2c4","r":"  // Use Item\n  $useItem         = \"%s uses %s!\"\n"},{"id":"script_122","c":1,"i":250,"h":"8b0388fd4e55b749","r":"  // Critical Hit\n  $criticalToEnemy = \"An excellent hit!!\"\n  $criticalToActor = \"An excellent hit!!\"\n"},{"id":"script_123","c":1,"i":253,"h":"7137c6edc4f48e9d","r":"  // Results for Actions on Actors\n  $actorDamage     = \"%s took %s damage!\"\n  $actorRecovery   = \"%s recovered %s %s!\"\n  $actorGain       = \"%s gained %s %s!\"\n  $actorLoss       = \"%s lost %s %s!\"\n  $actorDrain      = \"%s was drained of %s %s!\"\n  $actorNoDamage   = \"%s took no damage!\"\n  $actorNoHit      = \"Miss! %s took no damage!\"\n"},{"id":"script_124","c":1,"i":261,"h":"70ba4735813b0db3","r":"  // Results for Actions on Enemies\n  $enemyDamage     = \"%s took %s damage!\"\n  $enemyRecovery   = \"%s recovered %s %s!\"\n  $enemyGain       = \"%s gained %s %s!\"\n  $enemyLoss       = \"%s lost %s %s!\"\n  $enemyDrain      = \"Drained %s %s from %s!\"\n  $enemyNoDamage   = \"%s took no damage!\"\n  $enemyNoHit      = \"Missed! %s took no damage!\"\n"},{"id":"script_125","c":1,"i":269,"h":"cf9555a719e8dbd7","r":"  // Evasion/Reflection\n  $evasion         = \"%s evaded the attack!\"\n  $magicEvasion    = \"%s nullified the magic!\"\n  $magicReflection = \"%s reflected the magic!\"\n  $counterAttack   = \"%s counterattacked!\"\n  $substitute      = \"%s protected %s!\"\n"},{"id":"script_126","c":1,"i":275,"h":"402989b98ce3aec5","r":"  // Buff/Debuff\n  $buffAdd         = \"%s's %s went up!\"\n  $debuffAdd       = \"%s's %s went down!\"\n  $buffRemove      = \"%s's %s returned to normal.\"\n"},{"id":"script_127","c":1,"i":279,"h":"d71ed0f02cffb6e2","r":"  // Skill or Item Had No Effect\n  $actionFailure   = \"There was no effect on %s!\"\n"},{"id":"script_128","c":1,"i":281,"h":"230d3334b0a0d4d6","r":"  // Error Message\n  PlayerPosError  = \"Player's starting position is not set.\";\n  EventOverflow   = \"Common event calls exceeded the limit.\";"},{"id":"script_129","c":262,"i":14,"h":"5642b9faf7d39d26","r":"n = $gameVariables.value(15);\nx = $gameActors.actor(n).param(6);\ntext = \"\\\\c[6]目標値:\\\\c[2]\" + $mokuhyou;\ntext2 = \"\\\\c[6]結果値:\\\\c[2]\" + $hantei + \"(ダイス：\" + x + \"d3)\";\ntext3 = \"\";\nif ($hantei >= $mokuhyou) text3 = \"成功\";\nif ($hantei <= $mokuhyou) text3 = \"失敗\";\nset_mlog(text);\nset_mlog(text2);\nset_mlog(text3);"},{"id":"script_130","c":262,"i":3,"h":"be18b25b2a0dbc95","r":"n = $gameVariables.value(15);\nx = $gameActors.actor(n).param(6);\n$hantei = 0;\ni = 0;\nwhile (i < x) {\n  pips = Math.floor(Math.random() * 3) + 1;\n  $hantei += pips;\n  console.log(pips);\n  i += 1;\n}"},{"id":"script_131","c":399,"i":12,"h":"8af6b4132a2ccf5f","r":"//ここのテキストは検索用テキストなのでデータベース化\n//不要\n\ntext = \"主人公スキル\"\n$gameMessage._itemChoiceCategory = text\n"},{"id":"script_132","c":399,"i":29,"h":"e162507998c8e73b","r":"//検索用ワードなのでデータベースに入れなくて良い。\n\ntext = \"戦闘中使用可能\"\n$gameMessage._itemChoiceCategory = text\n"},{"id":"script_133","c":399,"i":90,"h":"c6878fbde92fb007","r":"//ここのテキストは検索用テキストなのでデータベース化\n//不要\n\ntext = \"司祭スキル\"\n$gameMessage._itemChoiceCategory = text\n"},{"id":"script_134","c":400,"i":4,"h":"1d150ad7cb124c71","r":"console.log($gameVariables.value(102));\nconsole.log($gameVariables.value(103));\nconsole.log($gameVariables.value(54));\nold_mhp = $gameActors.actor(1).param(0);\nnew_mhp = $gameVariables.value(102);\n$gameVariables.setValue(54, new_mhp - old_mhp);"},{"id":"script_135","c":494,"i":23,"h":"0c6f279e072eaeae","r":"$num = \"jp\";\nif ($gameVariables.value(1) == 1) $num = \"en\";\n$num += String($gameVariables.value(20));"},{"id":"script_136","c":494,"i":27,"h":"746cb49c8a80b3aa","r":"$patron_cha_id = eval(\"$patron_character_\" + $num + \"[4]\")\n"},{"id":"script_137","c":494,"i":29,"h":"12c8d7b6d555c6ce","r":"$patron_cha_num = eval(\"$patron_character_\" + $num + \"[5]\")\n\n$patron_cha_num = parseInt($patron_cha_num, 10)\n"},{"id":"script_138","c":494,"i":33,"h":"f9f6c6794daa631d","r":"$gameVariables.setValue(296, eval(\"$patron_character_\" + $num + \"[0]\"))\n"},{"id":"script_139","c":494,"i":35,"h":"369fa7916714d15d","r":"$gameVariables.setValue(297, eval(\"$patron_character_\" + $num + \"[1]\"))\n"},{"id":"script_140","c":494,"i":37,"h":"45d9e5b19b609f11","r":"$gameVariables.setValue(298, eval(\"$patron_character_\" + $num + \"[2]\"))\n"},{"id":"script_141","c":494,"i":73,"h":"f8a05a9dd6d5b27f","r":"x = $gameVariables.value(42)\ny = $gameVariables.value(43)\n\n$add_event = this.knsAddEvent(x, y, 3, 26, 2)\n\n$add_event_id = $add_event.id\n"},{"id":"script_142","c":494,"i":79,"h":"4e8612ec8d64c882","r":"var route = {repeat: false, skippable: false, wait: true, list: []};\nsprite = $patron_cha_id;\nnum = $patron_cha_num;\nroute.list.push({code: 41, parameters: [sprite, num]});\nroute.list.push({code: 42, parameters: [180]});\nroute.list.push({code: 0, parameters: []});\n$add_event.forceMoveRoute(route);"},{"id":"script_143","c":679,"i":21,"h":"d866d9710ad64e27","r":"n = 1;\ni = $stand_layer_right;\nwhile (i < $stand_layer_left) {\n  eval(\"$layer\" + n + \" = \" + i);\n  i += 1;\n  n += 1;\n}"},{"id":"script_144","c":9,"i":21,"h":"3e915ac5e6e351e1","r":"// var_from_sheet(var, map, event, page, text, line)\n// "},{"id":"script_145","c":9,"i":25,"h":"25ad86a76ec5ef2d","r":"// var_from_common(var, common, text, line)\n// "},{"id":"script_146","c":9,"i":81,"h":"facc8e345b2a36fa","r":"// PB_BGS_ライン変更 2              # BGSの演奏ラインを[2]に変更します。\n// PB_BGS_CHANGE_LINE 2            # 同上\n// PB_BGS_全停止                   # 全ての演奏中のBGSを停止します。\n// PB_BGS_ALL_STOP                 # 同上\n// PB_BGS_SE演奏時フェードアウト 1 # SE演奏時にBGSを自動フェードアウトします\n// PB_BGS_FADEOUT_FOR_SE 1         # 同上(※1)\n// PB_BGS_フェードアウト時間 3     # 自動フェードアウトに掛かる時間を指定します。\n// PB_BGS_FADEOUT_TIME 3           # 同上\n// "},{"id":"script_147","m":61,"e":18,"p":0,"i":41,"h":"e557ace3e1ff228d","r":"x = $gameVariables.value(204)+1;\nif (x == 1) x = 2;\nthis.knsCallMapEvent(61, 18, x);"},{"id":"script_148","m":96,"e":12,"p":0,"i":8,"h":"59ee1e720c101162","r":"i = $map_list.length;\nwhile (i != 0) {\n  $map_id = $map_list[0];\n  $gameVariables.setValue(57, (typeof another_map_eid_by_name === \"function\") ? another_map_eid_by_name($map_id, \"採取\", false) : []);\n  ($gameVariables.value(57) || []).forEach(function(v) {\n    if ($gameSelfSwitches.value([$map_id, v, \"A\"]) == true) {\n      $gameSelfSwitches.setValue([$map_id, v, \"A\"], false);\n    }\n  });\n  $map_list.shift();\n  i = $map_list.length;\n}"}];
