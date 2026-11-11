var NP_L = window.NP_L || function(r) { return r; };
//=============================================================================
// NP_SoftlockFix.js
//=============================================================================
/*:
 * @plugindesc v1.0 Открывает шаги сюжета 0.80j, чьи условия в оригинале не срабатывают.
 * @author RU mod
 *
 * @help
 * Одиннадцать точечных ремонтов. Новый сюжет, карты и награды не добавляются.
 * Всплывающих окон нет. V8, V9 и V911 не записываются. V913 не записывается.
 * Каждая правка сверяет карту, событие, страницу и команду. Если данные
 * не похожи на 0.80j, ремонт не применяется.
 * Срабатывает при входе на карту и при загрузке сейва. Повтор ничего не меняет.
 * Если загружен NP_YarizoQuest 1.2 или новее, три ремонта Яризо пропускаются.
 * Настройка «Исправление застреваний» / "Fix story softlocks", по умолчанию включена.
 */
var Imported = Imported || {};
Imported.NP_SoftlockFix = true;
var NP_SoftlockFix = NP_SoftlockFix || {};

(function($) {
    'use strict';
    var FORBIDDEN_VARS = { 8: true, 9: true, 911: true, 913: true };
    var seenLog = {};

    function compact(text) {
        return String(text || '').toLowerCase().replace(/\s+/g, '').replace(/===/g, '==').replace(/!==/g, '!=');
    }
    $.pageScript = function(page) {
        if (!page || !page.list) return '';
        var parts = [];
        page.list.forEach(function(cmd) {
            if (!cmd) return;
            if (cmd.code === 108 || cmd.code === 408 || cmd.code === 355 || cmd.code === 655) {
                parts.push(String((cmd.parameters && cmd.parameters[0]) || ''));
            }
        });
        return parts.join('\n');
    };
    $.isEnabled = function(env) {
        if (env && typeof env.enabled === 'boolean') return env.enabled;
        if (typeof ConfigManager === 'undefined' || ConfigManager.npSoftlockFix === undefined) return true;
        return ConfigManager.npSoftlockFix !== false;
    };
    $.log = function(id, env) {
        var line = '[NP_SoftlockFix] ' + id;
        if (env && Array.isArray(env.log)) env.log.push(line);
        try { console.log(line); } catch (e) {}
    };
    $.logOnce = function(id, env) {
        if (seenLog[id]) return;
        seenLog[id] = true;
        $.log(id, env);
    };

    function readSw(env, id) {
        if (!env) return false;
        if (typeof env.readSw === 'function') return !!env.readSw(id);
        return !!(env.switches && env.switches[id]);
    }
    function writeSw(env, id, value) {
        if (env && typeof env.setSwitch === 'function') env.setSwitch(id, !!value);
        else if (env && env.switches) env.switches[id] = !!value;
    }
    function readVar(env, id) {
        if (!env) return 0;
        if (typeof env.readVar === 'function') return Number(env.readVar(id) || 0);
        return Number((env.variables && env.variables[id]) || 0);
    }
    function writeVar(env, id, value) {
        if (FORBIDDEN_VARS[id]) return;
        if (env && typeof env.writeVar === 'function') env.writeVar(id, value);
        else if (env && env.variables) env.variables[id] = value;
    }
    function hasItem(env, id) {
        if (!env || !env.dataItems || !env.dataItems[id]) return false;
        if (typeof env.hasItem === 'function') return !!env.hasItem(id);
        return ((env.items && env.items[id]) || 0) > 0;
    }
    function dataOk(env, id) {
        return !!(env && env.dataItems && env.dataItems[id]);
    }

    $.yarizoCovers = function(env) {
        var y = env && env.yarizo;
        if (!y || !y.loaded) return false;
        if (y.hasPortFix) return true;
        var m = /v(\d+)\.(\d+)/i.exec(y.description || '');
        if (!m) return false;
        return Number(m[1]) > 1 || (Number(m[1]) === 1 && Number(m[2]) >= 2);
    };
    $.detectYarizo = function() {
        var obj = window.NP_YarizoQuest;
        var loaded = !!(window.Imported && Imported.NP_YarizoQuest && obj);
        var desc = '';
        if (typeof $plugins !== 'undefined' && $plugins) {
            for (var i = 0; i < $plugins.length; i++) {
                if ($plugins[i] && $plugins[i].name === 'NP_YarizoQuest') desc = String($plugins[i].description || '');
            }
        }
        var hasPortFix = !!(loaded && typeof obj.portIdlePageActive === 'function' &&
            typeof obj.repairRecruit === 'function' && typeof obj.isRankTwoSpritePage === 'function');
        return { loaded: loaded, description: desc, hasPortFix: hasPortFix };
    };

    // ---------------------------------------------------------------- Leon
    $.leonCommentKind = function(text) {
        var body = compact(text);
        var tag = body.match(/<kns_trigger>([\s\S]*?)<\/kns_trigger>/);
        if (tag) body = tag[1];
        body = body.replace(/^return/, '').replace(/;+$/, '');
        if (body === '$gamevariables.value(911)==1') return 0;
        if (body === '$gamevariables.value(911)==1&&$gameswitches.value(292)==true') return 1;
        return -1;
    };
    $.leonResult = function(env, pageIndex) {
        var v = readVar(env, 911);
        if (pageIndex === 0) {
            return v === 1 || (v >= 99 && !readSw(env, 292) && !readSw(env, 299) && !readSw(env, 295));
        }
        if (pageIndex === 1) {
            return (v === 1 || v >= 99) && readSw(env, 292) && !readSw(env, 295);
        }
        return null;
    };

    // ---------------------------------------------------------------- guild fame / south gate IF
    function isEqualVar(cmd, varId) {
        if (!cmd || cmd.code !== 111) return false;
        var p = cmd.parameters || [];
        return p[0] === 1 && p[1] === varId && p[2] === 0 && p[4] === 0 && typeof p[3] === 'number';
    }
    $.goblinFameBranch = function(list, index) {
        var cmd = list && list[index];
        if (!isEqualVar(cmd, 322)) return false;
        var indent = cmd.indent || 0;
        var set1 = false, set0 = false, inElse = false;
        for (var i = index + 1; i < list.length; i++) {
            var c = list[i];
            if (!c) continue;
            var ind = c.indent || 0;
            if (c.code === 412 && ind === indent) break;
            if (c.code === 411 && ind === indent) { inElse = true; continue; }
            if (c.code === 122 && ind === indent + 1) {
                var q = c.parameters || [];
                if (q[0] === 72 && q[1] === 72 && q[2] === 0 && q[3] === 0) {
                    if (!inElse && q[4] === 1) set1 = true;
                    if (inElse && q[4] === 0) set0 = true;
                }
            }
        }
        return set1 && set0;
    };
    $.shouldWidenWhere = function(where) {
        if (!where || !$.isEnabled(where.env)) return false;
        var cmd = where.list && where.list[where.index];
        if (where.mapId === 13 && where.eventId === 12 && where.pageIndex === 3) {
            return isEqualVar(cmd, 322) && cmd.parameters[3] === 10;
        }
        if (where.mapId === 13 && where.eventId === 12 && where.pageIndex === 5) {
            return $.goblinFameBranch(where.list, where.index);
        }
        if (where.mapId === 241 && where.eventId === 8 && where.pageIndex === 0) {
            return isEqualVar(cmd, 9) && cmd.parameters[3] === 2;
        }
        return false;
    };

    // ---------------------------------------------------------------- infirmary / guild page
    $.goblinCommentOk = function(page) {
        var body = compact($.pageScript(page));
        if (!body) return false;
        if (body.indexOf('value(906)==2') >= 0 || body.indexOf('value(906)>=') >= 0) return false;
        if (body.indexOf('value(906)==1') < 0) return false;
        var has1 = body.indexOf('actor(1)') >= 0 || body.indexOf('actorid()==1') >= 0;
        var has2 = body.indexOf('actor(2)') >= 0 || body.indexOf('actorid()==2') >= 0;
        return has1 && has2;
    };

    // ---------------------------------------------------------------- Yarizo fallback (only when 1.2 is absent)
    $.isIdlePage = function(page) {
        if (!page || page.trigger !== 0 || !page.conditions) return false;
        var c = page.conditions;
        return !!(c.variableValid && Number(c.variableId) === 911 && Number(c.variableValue) === 4);
    };
    $.isRankTwoSprite = function(page) {
        var text = $.pageScript(page);
        if (!/\$gameVariables\.value\(\s*9\s*\)\s*===?\s*2\b/.test(text)) return false;
        if (/\$gameSwitches/.test(text)) return false;
        if (/\$gameVariables\.value\(\s*(?!9\b)\d+/.test(text)) return false;
        return true;
    };
    function inParty(env, id) {
        var actors = env && env.actors;
        return !!(actors && actors.indexOf(id) >= 0);
    }
    $.yarizoNeedsRepair = function(env) {
        if ($.yarizoCovers(env)) return false;
        var inP = inParty(env, 21);
        var hired = readSw(env, 643);
        if (!inP && !hired) return false;
        if (readSw(env, 2040)) return false;
        if (readSw(env, 503) && !inP && !hired) return false;
        var coherent = readSw(env, 290) && readSw(env, 291) && hired && !readSw(env, 503) && readVar(env, 3570) === 99;
        return !coherent;
    };

    $.decidePage = function(ctx) {
        if (!ctx || !$.isEnabled(ctx.env)) return null;
        var env = ctx.env;
        var mapId = Number(ctx.mapId), eventId = Number(ctx.eventId), pageIndex = Number(ctx.pageIndex);
        if (mapId === 171 && eventId === 27) {
            var kind = $.leonCommentKind($.pageScript(ctx.page));
            if (kind < 0 || kind !== pageIndex) return null;
            return { id: 'leon_exam_after_ch1', ok: $.leonResult(env, kind) };
        }
        if (!$.yarizoCovers(env) && mapId === 171 && eventId === 1 && $.isIdlePage(ctx.page)) {
            var vanilla = !!ctx.vanillaOk;
            var waiting = readSw(env, 703) && !readSw(env, 290) && readVar(env, 9) >= 2;
            var ok = vanilla && !(waiting && !readSw(env, 301));
            return { id: 'yarizo_port_idle_page', ok: ok };
        }
        if (!$.yarizoCovers(env) && mapId === 171 && (eventId === 29 || eventId === 30 || eventId === 31)) {
            if (!$.isRankTwoSprite(ctx.page)) return null;
            if (ctx.vanillaOk) return { id: 'yarizo_sprites_rank', ok: true };
            if (readSw(env, 290) || readVar(env, 9) < 2) return { id: 'yarizo_sprites_rank', ok: false };
            return { id: 'yarizo_sprites_rank', ok: true };
        }
        if (mapId === 13 && eventId === 12 && pageIndex === 5) {
            if (!$.goblinCommentOk(ctx.page)) return null;
            if (readVar(env, 906) !== 2) return null;
            if (typeof ctx.rerun !== 'function') return null;
            return { id: 'goblin_guild_after_infirmary', ok: !!ctx.rerun(906, 1) };
        }
        return null;
    };

    $.applyState = function(env) {
        var applied = [];
        if (!env || !$.isEnabled(env)) return applied;
        function note(id) { if (applied.indexOf(id) < 0) applied.push(id); }
        if (readSw(env, 300) && !readSw(env, 302)) {
            writeSw(env, 302, true);
            note('s302_unlock_orc_pig');
        }
        if (!readSw(env, 310) && (readVar(env, 922) >= 2 || readVar(env, 923) >= 1 || readVar(env, 915) >= 12)) {
            writeSw(env, 310, true);
            note('south_gate_already_south');
        }
        var passed = readSw(env, 299) || readVar(env, 912) >= 99;
        if (passed && dataOk(env, 887) && !hasItem(env, 887)) {
            if (typeof env.gainItem === 'function') env.gainItem(887);
            else env.items[887] = (env.items[887] || 0) + 1;
            if (typeof env.loseAll === 'function') env.loseAll(886);
            else if (env.items) env.items[886] = 0;
            if (!readSw(env, 299)) writeSw(env, 299, true);
            note('exam_rank_tag_if_passed');
        }
        if ($.yarizoNeedsRepair(env)) {
            writeSw(env, 290, true);
            writeSw(env, 291, true);
            writeSw(env, 643, true);
            writeSw(env, 503, false);
            if (readVar(env, 3570) !== 99) writeVar(env, 3570, 99);
            note('yarizo_mtool_recruit');
        }
        applied.forEach(function(id) { $.log(id, env); });
        return applied;
    };

    // ---------------------------------------------------------------- engine hooks
    function gameEnv() {
        var env = $.detectYarizo();
        return {
            enabled: $.isEnabled(),
            yarizo: env,
            actors: ($gameParty && $gameParty._actors) ? $gameParty._actors : [],
            dataItems: (typeof $dataItems !== 'undefined') ? $dataItems : null,
            readSw: function(id) { return $gameSwitches && $gameSwitches.value(id); },
            setSwitch: function(id, v) { if ($gameSwitches) $gameSwitches.setValue(id, !!v); },
            readVar: function(id) { return $gameVariables ? $gameVariables.value(id) : 0; },
            writeVar: function(id, v) { if (!FORBIDDEN_VARS[id] && $gameVariables) $gameVariables.setValue(id, v); },
            hasItem: function(id) {
                var item = $dataItems && $dataItems[id];
                return !!(item && $gameParty && $gameParty.hasItem(item, true));
            },
            gainItem: function(id) {
                var item = $dataItems && $dataItems[id];
                if (item && $gameParty) $gameParty.gainItem(item, 1);
            },
            loseAll: function(id) {
                var item = $dataItems && $dataItems[id];
                if (!item || !$gameParty || !$gameParty.numItems) return;
                var n = $gameParty.numItems(item);
                if (n > 0) $gameParty.gainItem(item, -n);
            }
        };
    }
    $.runStateRepairs = function() {
        try { $.applyState(gameEnv()); } catch (e) { try { console.error(e); } catch (e2) {} }
    };
    $.withVar = function(id, fake, fn) {
        if (!$gameVariables || typeof $gameVariables.value !== 'function') return fn();
        var orig = $gameVariables.value;
        $gameVariables.value = function(n) {
            if (Number(n) === Number(id)) return fake;
            return orig.apply(this, arguments);
        };
        try { return fn(); }
        finally { $gameVariables.value = orig; }
    };

    if (typeof ConfigManager !== 'undefined') {
        ConfigManager.npSoftlockFix = true;
        var _make = ConfigManager.makeData;
        ConfigManager.makeData = function() {
            var c = _make.apply(this, arguments);
            c.npSoftlockFix = this.npSoftlockFix;
            return c;
        };
        var _apply = ConfigManager.applyData;
        ConfigManager.applyData = function(c) {
            _apply.apply(this, arguments);
            this.npSoftlockFix = !(c && c.npSoftlockFix === false);
        };
    }
    if (typeof Window_Options !== 'undefined' && Window_Options.prototype.addGeneralOptions) {
        var _addOpt = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addOpt.apply(this, arguments);
            var en = false;
            try { en = !!(window.NP_Language && NP_Language.isEn && NP_Language.isEn()); } catch (e) { en = false; }
            this.addCommand(en ? 'Fix story softlocks' : 'Исправление застреваний', 'npSoftlockFix');
        };
    }
    if (typeof Game_Map !== 'undefined' && Game_Map.prototype.setup) {
        var _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() {
            _setup.apply(this, arguments);
            $.runStateRepairs();
        };
    }
    if (typeof DataManager !== 'undefined' && DataManager.extractSaveContents) {
        var _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() {
            _extract.apply(this, arguments);
            $.runStateRepairs();
        };
    }
    if (typeof Game_Event !== 'undefined' && Game_Event.prototype.meetsConditions) {
        var _meets = Game_Event.prototype.meetsConditions;
        Game_Event.prototype.meetsConditions = function(page) {
            var vanilla = _meets.apply(this, arguments);
            try {
                if (!$.isEnabled()) return vanilla;
                var pages = this.event ? (this.event() || {}).pages : null;
                var pageIndex = pages && pages.indexOf ? pages.indexOf(page) : -1;
                var self = this;
                var decision = $.decidePage({
                    mapId: this._mapId || ($gameMap && $gameMap.mapId && $gameMap.mapId()),
                    eventId: this._eventId,
                    pageIndex: pageIndex,
                    page: page,
                    vanillaOk: vanilla,
                    env: gameEnv(),
                    rerun: function(varId, fake) {
                        return $.withVar(varId, fake, function() { return _meets.call(self, page); });
                    }
                });
                if (!decision) return vanilla;
                if (!!decision.ok !== !!vanilla) $.logOnce(decision.id, null);
                return !!decision.ok;
            } catch (e) { try { console.error(e); } catch (e2) {} }
            return vanilla;
        };
    }
    if (typeof Game_Interpreter !== 'undefined' && Game_Interpreter.prototype.command111) {
        var _111 = Game_Interpreter.prototype.command111;
        Game_Interpreter.prototype.command111 = function() {
            var widen = false;
            try {
                var ev = ($gameMap && this._eventId > 0 && $gameMap.event) ? $gameMap.event(this._eventId) : null;
                widen = $.shouldWidenWhere({
                    mapId: this._mapId,
                    eventId: this._eventId,
                    pageIndex: ev ? ev._pageIndex : -1,
                    list: this._list,
                    index: this._index,
                    env: { enabled: $.isEnabled() }
                });
            } catch (e) { widen = false; }
            if (!widen) return _111.apply(this, arguments);
            var params = this._params;
            var old = params[4];
            params[4] = 1;
            try { return _111.apply(this, arguments); }
            finally { params[4] = old; }
        };
    }
})(NP_SoftlockFix);
