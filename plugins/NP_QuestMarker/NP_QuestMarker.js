var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_QuestMarker.js
//=============================================================================
/*:
 * @plugindesc v1.1 Мигающий «!» над доступной целью задания; скрывается вместе с NPC.
 * @author NP RU patch
 *
 * @param Enabled
 * @desc Включено по умолчанию (true/false)
 * @default true
 *
 * @param Option Label
 * @desc Название пункта в Настройках (пусто = не добавлять пункт)
 * @default Метки заданий
 *
 * @param Color
 * @desc Цвет значка (CSS)
 * @default #ffe040
 *
 * @param Font Size
 * @default 34
 *
 * @help
 * Показывает мигающий «!» над целью текущего этапа задания на текущей карте.
 * Если цель на другой карте, «!» ставится над выходом/дверью/узлом карты
 * мира (Map003), ведущим к ней (по встроенной таблице переходов).
 * Значок показывается только пока переменная задания в нужном диапазоне.
 * У скрытых NPC (пустая страница, прозрачность, исчезновение) значок скрывается
 * сразу и возвращается при появлении персонажа. Невидимые события переходов
 * и координатные метки выходов продолжают работать.
 *
 * Таблица целей: NP_QuestMarker.TARGETS
 *   [переменная, мин, макс, цель, цель, ...]
 *   цель: {m:карта, e:событие} | {m:карта, x:.., y:..} | {m:карта} (только маршрут)
 *         необязательно w: id узла на Map003, если маршрут неизвестен.
 */
var Imported = Imported || {};
Imported.NP_QuestMarker = true;
var NP_QuestMarker = NP_QuestMarker || {};

(function() {
    'use strict';
    var params = PluginManager.parameters('NP_QuestMarker');
    var P = {
        enabled: String(params['Enabled'] || 'true') !== 'false',
        optionLabel: params['Option Label'] !== undefined ? String(params['Option Label']) : NP_L('Метки заданий', "Quest markers"),
        color: String(params['Color'] || '#ffe040'),
        fontSize: Number(params['Font Size'] || 34)
    };
    NP_QuestMarker.params = P;
    var WORLD = 3;

    // ---------------------------------------------------------------------
    // Переходы: [откуда, куда, x, y] или [откуда, куда, 'e', eventId]
    // ---------------------------------------------------------------------
    var EDGES = [
        // карта мира (узлы-события Map003)
        [3, 96, 'e', 45], [3, 171, 'e', 4], [3, 65, 'e', 5], [3, 30, 'e', 8], [3, 103, 'e', 9],
        [3, 280, 'e', 10], [3, 239, 'e', 13], [3, 197, 'e', 16], [3, 100, 'e', 17], [3, 157, 'e', 19],
        [3, 241, 'e', 22], [3, 77, 'e', 24], [3, 87, 'e', 27], [3, 249, 'e', 28], [3, 85, 'e', 29],
        [3, 272, 'e', 42], [3, 263, 'e', 46], [3, 288, 'e', 56], [3, 294, 'e', 58], [3, 298, 'e', 62],
        [3, 303, 'e', 69], [3, 297, 'e', 80], [3, 296, 'e', 82],
        // столица: вход
        [96, 3, 7, 19], [96, 8, 7, 0], [96, 98, 16, 2],
        // центральный район
        [8, 96, 13, 28], [8, 13, 3, 10], [8, 14, 22, 9], [8, 15, 24, 25], [8, 10, 0, 11],
        [8, 16, 3, 23], [8, 264, 13, 2],
        [13, 8, 16, 19], [14, 8, 9, 17], [15, 8, 8, 26], [15, 156, 1, 6], [156, 15, 2, 21], [16, 8, 8, 25],
        // торговая улица / квартал утех / трущобы
        [10, 8, 19, 17], [10, 19, 10, 16], [10, 11, 0, 17], [19, 10, 10, 9],
        [11, 10, 19, 7], [11, 20, 0, 7], [11, 242, 3, 5], [20, 11, 49, 4], [242, 11, 15, 31],
        // канализация
        [98, 96, 16, 25], [98, 37, 7, 1], [37, 98, 4, 42], [37, 117, 5, 0], [37, 38, 18, 25], [38, 37, 15, 15],
        [117, 37, 11, 50], [117, 118, 2, 23], [117, 119, 22, 24], [117, 164, 4, 3],
        [118, 117, 17, 15], [119, 117, 0, 19], [119, 151, 13, 11], [151, 119, 3, 4], [151, 152, 37, 0],
        [152, 151, 8, 37], [164, 165, 6, 36], [165, 164, 40, 37],
        // Портовый город (лодочник: столица / пиратский корабль / комната архимага)
        [171, 176, 49, 33], [171, 237, 'e', 52], [171, 183, 'e', 52], [176, 171, 4, 22],
        // Голубая пещера
        [103, 125, 0, 4], [103, 136, 3, 19], [103, 121, 18, 4], [125, 103, 18, 7], [136, 103, 42, 34], [136, 198, 6, 0],
        // деревня, лес, приют, пустоши, орки, прочее
        [65, 232, 2, 24],
        [197, 200, 36, 49], [197, 161, 56, 5], [197, 163, 62, 5],
        [77, 79, 7, 10], [77, 80, 16, 5], [79, 77, 10, 23],
        [85, 246, 15, 8], [85, 247, 3, 31], [246, 85, 14, 17],
        [87, 250, 10, 60], [272, 273, 67, 27], [273, 272, 20, 18], [241, 282, 57, 23],
        [303, 305, 25, 15], [280, 281, 19, 20], [281, 280, 11, 14]
    ];

    // ---------------------------------------------------------------------
    // Цели заданий: [переменная, мин, макс, цель...]
    // ---------------------------------------------------------------------
    var GUILD = {m: 13, e: 12};
    var SHOP = {m: 19, e: 3};
    var T = [
        // --- сюжет ---
        [903, 1, 1, GUILD], [903, 2, 4, {m: 117, e: 25}], [903, 5, 7, GUILD], [903, 98, 98, GUILD],
        [904, 1, 2, GUILD],
        [905, 1, 1, {m: 96, e: 43}], [905, 2, 2, {m: 152, e: 25}], [905, 3, 6, {m: 152, e: 37}], [905, 7, 8, GUILD],
        [906, 1, 1, GUILD],
        [908, 1, 2, {m: 65, e: 27}],
        [910, 1, 2, {m: 10, e: 24}], [910, 3, 3, {m: 65, e: 33}], [910, 4, 4, {m: 197, e: 22}],
        [910, 5, 5, {m: 200, e: 9}], [910, 6, 6, {m: 65, e: 33}],
        [911, 1, 1, {m: 197, e: 9}], [911, 2, 2, {m: 197, e: 23}],
        [913, 1, 1, {m: 197, e: 10}], [913, 2, 2, {m: 200, e: 3}], [913, 3, 3, {m: 200, e: 7}],
        [914, 1, 1, GUILD], [914, 2, 2, {m: 79}, {m: 79, e: 6}], [914, 3, 4, {m: 80, e: 7}], [914, 5, 6, {m: 79, e: 6}],
        [914, 8, 9, {m: 77, e: 17}],
        [915, 1, 1, {m: 77}],
        [916, 1, 1, {m: 117, e: 8}], [916, 2, 2, {m: 164, e: 5}],
        [922, 1, 1, {m: 241, e: 6}], [922, 2, 2, {m: 85}], [922, 3, 3, {m: 246, e: 16}],
        [922, 4, 4, {m: 249, e: 4}], [922, 5, 5, {m: 246, e: 16}],
        [923, 1, 2, {m: 85, e: 72}, {m: 85, e: 73}, {m: 85, e: 74}], [923, 3, 14, {m: 263}],
        [923, 15, 15, GUILD], [923, 16, 16, {m: 264}], [923, 18, 18, {m: 20, e: 4}],
        // --- столица ---
        [1003, 1, 10, {m: 37}], [1013, 1, 5, {m: 37}],
        [1004, 1, 1, {m: 37}],
        [1005, 1, 1, {m: 8, e: 62}], [1005, 2, 9, SHOP],
        [1006, 1, 1, {m: 96, e: 35}], [1006, 2, 3, {m: 118}], [1006, 4, 97, {m: 96, e: 35}],
        [1007, 1, 1, {m: 156, e: 20}],
        [1008, 2, 2, SHOP], [1009, 2, 2, SHOP], [1114, 2, 2, SHOP], [1115, 2, 2, SHOP],
        [1010, 1, 1, {m: 96, e: 31}], [1010, 2, 2, {m: 65, e: 17}],
        [1011, 1, 1, {m: 96, e: 21}], [1011, 2, 2, {m: 125, e: 6}],
        [1012, 1, 1, {m: 8, e: 100}],
        [1012, 2, 9, {m: 11, e: 42}, {m: 14, e: 67}, {m: 244, e: 23}, {m: 8, e: 35}, {m: 96, e: 42}],
        [1012, 10, 10, {m: 137, e: 34}],
        [1014, 1, 1, SHOP], [1014, 2, 2, {m: 171, e: 66}],
        [1105, 1, 1, {m: 14, e: 4}], [1105, 3, 3, {m: 197, e: 12}],
        [1107, 1, 1, {m: 16, e: 11}], [1107, 2, 2, {m: 197}, {m: 241}], [1107, 3, 3, {m: 16, e: 11}],
        [1108, 1, 1, {m: 137, e: 32}],
        [1109, 1, 1, SHOP], [1109, 2, 3, {m: 10, e: 23}],
        [1110, 1, 1, {m: 20, e: 18}],
        [1111, 1, 4, {m: 151}], [1111, 10, 14, {m: 282}],
        [1112, 1, 1, {m: 20, e: 47}],
        [1113, 1, 1, {m: 20, e: 50}],
        // --- окрестности ---
        [1042, 1, 5, {m: 136}, {m: 239}],
        [1043, 1, 1, {m: 65, e: 3}], [1044, 1, 1, {m: 65, e: 3}], [1044, 3, 3, {m: 65, e: 3}],
        [1045, 1, 1, {m: 65, e: 3}],
        [1047, 1, 10, {m: 197}, {m: 241}],
        [1052, 1, 1, {m: 122, e: 3, w: 9}], [1052, 2, 3, {m: 30, e: 34}],
        [1122, 1, 5, {m: 237}], [1123, 1, 1, {m: 237, e: 3}, {m: 237, e: 4}],
        [1142, 1, 1, {m: 197}], [1142, 2, 2, {m: 232, e: 16}],
        [1212, 1, 1, {m: 65, e: 21}], [1212, 2, 2, {m: 197}], [1212, 3, 3, {m: 197, e: 18}],
        [1212, 4, 4, {m: 183, e: 17}], [1212, 5, 5, {m: 303}], [1212, 12, 14, {m: 197, e: 16}],
        // --- Ступени Титана и дальше ---
        [1175, 1, 1, {m: 87}], [1175, 2, 2, {m: 329, e: 3, w: 29}],
        [1262, 1, 5, {m: 87}], [1263, 1, 5, {m: 87}],
        [1264, 1, 1, {m: 250}], [1264, 2, 2, {m: 247, e: 4}],
        [1265, 1, 1, {m: 250}], [1265, 2, 2, {m: 247, e: 4}],
        [1266, 1, 1, {m: 250, e: 3}], [1266, 2, 2, {m: 250, e: 4}], [1266, 3, 3, {m: 85, e: 77}],
        [1267, 1, 5, {m: 272}],
        [1268, 1, 1, {m: 85, e: 13}], [1268, 2, 9, {m: 273, e: 17}], [1268, 10, 10, {m: 85, e: 13}],
        [1269, 1, 1, {m: 272, e: 28}],
        [1282, 1, 2, {m: 296}], [1282, 3, 3, {m: 288, e: 18}],
        [1286, 1, 5, {m: 297}], [1287, 1, 5, {m: 294}],
        [1288, 1, 1, {m: 298}], [1288, 2, 2, {m: 288, e: 31}]
    ];
    NP_QuestMarker.EDGES = EDGES;
    NP_QuestMarker.TARGETS = T;

    // ---------------------------------------------------------------------
    // Маршруты (BFS): firstHop[from][to] = индекс перехода
    // ---------------------------------------------------------------------
    var adj = {};
    EDGES.forEach(function(ed, i) { (adj[ed[0]] = adj[ed[0]] || []).push(i); });
    var hopCache = {};
    NP_QuestMarker.firstHops = function(from, to) {
        var key = from + '>' + to;
        if (hopCache[key] !== undefined) return hopCache[key];
        var res = [];
        if (from !== to) {
            var dist = {}; dist[from] = 0;
            var first = {}; var queue = [from]; var found = -1;
            while (queue.length) {
                var cur = queue.shift();
                if (found >= 0 && dist[cur] >= found) break;
                (adj[cur] || []).forEach(function(i) {
                    var nx = EDGES[i][1];
                    var f = cur === from ? [i] : first[cur];
                    if (dist[nx] === undefined) {
                        dist[nx] = dist[cur] + 1; first[nx] = f.slice(); queue.push(nx);
                    } else if (dist[nx] === dist[cur] + 1) {
                        f.forEach(function(k) { if (first[nx].indexOf(k) < 0) first[nx].push(k); });
                    }
                    if (nx === to && found < 0) found = dist[nx];
                });
            }
            if (first[to]) res = first[to];
        }
        hopCache[key] = res;
        return res;
    };

    NP_QuestMarker.isEnabled = function() { return !!ConfigManager.npQuestMarkers; };

    // список точек {x,y} или {ev} для текущей карты
    NP_QuestMarker.collect = function(mapId) {
        var out = [];
        var seen = {};
        function push(p) {
            var k = p.ev ? 'e' + p.ev : p.x + ',' + p.y;
            if (!seen[k]) { seen[k] = true; out.push(p); }
        }
        for (var i = 0; i < T.length; i++) {
            var row = T[i];
            var v = $gameVariables.value(row[0]);
            if (!(v >= row[1] && v <= row[2]) || v <= 0 || v >= 99) continue;
            for (var j = 3; j < row.length; j++) {
                var t = row[j];
                if (t.m === mapId) {
                    if (t.e) push({ev: t.e});
                    else if (t.x !== undefined) push({x: t.x, y: t.y});
                    continue;
                }
                var hops = NP_QuestMarker.firstHops(mapId, t.m);
                if (hops.length) {
                    hops.forEach(function(h) {
                        var ed = EDGES[h];
                        if (ed[2] === 'e') push({ev: ed[3]});
                        else if (ed[2] >= 0) push({x: ed[2], y: ed[3]});
                    });
                } else if (mapId === WORLD && t.w) {
                    push({ev: t.w});
                }
            }
        }
        return out;
    };

    // ---------------------------------------------------------------------
    // Config / Options
    // ---------------------------------------------------------------------
    ConfigManager.npQuestMarkers = P.enabled;
    var _Config_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _Config_makeData.apply(this, arguments);
        config.npQuestMarkers = this.npQuestMarkers;
        return config;
    };
    var _Config_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _Config_applyData.apply(this, arguments);
        this.npQuestMarkers = (config && config.npQuestMarkers !== undefined) ? !!config.npQuestMarkers : P.enabled;
    };
    if (P.optionLabel) {
        var _Opt_addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Opt_addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npQuestMarkers');
        };
    }

    // ---------------------------------------------------------------------
    // Sprite
    // ---------------------------------------------------------------------
    function eventPointVisible(ev) {
        if (!ev || ev._erased) return false;
        var page = ev.page();
        if (!page || ev.isTransparent() || ev.opacity() <= 0) return false;
        if (ev.characterName() || ev.tileId() > 0) return true;

        // A blank page is how NPCs leave after a conversation or at night.
        // Events that never had an image can still be invisible doors/transfers.
        var hasGraphicPage = ev.event().pages.some(function(p) {
            return p.image && (p.image.characterName || p.image.tileId > 0);
        });
        if (hasGraphicPage) return false;
        return page.list.some(function(command) {
            return command.code !== 0 && command.code !== 108 && command.code !== 408;
        });
    }

    function Sprite_NpQuestMarker() { this.initialize.apply(this, arguments); }
    Sprite_NpQuestMarker.prototype = Object.create(Sprite.prototype);
    Sprite_NpQuestMarker.prototype.constructor = Sprite_NpQuestMarker;
    Sprite_NpQuestMarker._bitmap = null;
    Sprite_NpQuestMarker.bitmap = function() {
        if (!this._bitmap) {
            var s = P.fontSize;
            var b = new Bitmap(Math.round(s * 0.9), Math.round(s * 1.3));
            b.fontSize = s;
            b.fontBold = true;
            b.textColor = P.color;
            b.outlineColor = 'rgba(0,0,0,0.85)';
            b.outlineWidth = 5;
            b.drawText('!', 0, 0, b.width, b.height, 'center');
            this._bitmap = b;
        }
        return this._bitmap;
    };
    Sprite_NpQuestMarker.prototype.initialize = function(point) {
        Sprite.prototype.initialize.call(this, Sprite_NpQuestMarker.bitmap());
        this.anchor.x = 0.5;
        this.anchor.y = 1;
        this.z = 9;
        this._point = point;
        this._phase = Math.random() * 60;
        this.update();
    };
    Sprite_NpQuestMarker.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this._phase++;
        var p = this._point;
        var tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
        var sx, sy, ok = true;
        if (p.ev) {
            var ev = $gameMap.event(p.ev);
            if (!eventPointVisible(ev)) ok = false;
            else { sx = ev.screenX(); sy = ev.screenY() - th; }
        } else {
            sx = Math.round($gameMap.adjustX(p.x) * tw + tw / 2);
            sy = Math.round($gameMap.adjustY(p.y) * th);
        }
        this.visible = ok && NP_QuestMarker.isEnabled() && !$gameMessage.isBusy();
        if (!ok) return;
        this.x = sx;
        this.y = sy - 4 + Math.round(Math.sin(this._phase / 8) * 4);
        this.opacity = 150 + Math.round(105 * Math.abs(Math.cos(this._phase / 18)));
    };
    NP_QuestMarker.Sprite = Sprite_NpQuestMarker;

    var _SM_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _SM_createLowerLayer.apply(this, arguments);
        this._npQuestMarkers = [];
        this._npQuestMarkerKey = null;
        this._npQuestMarkerTick = 0;
    };
    var _SM_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _SM_update.apply(this, arguments);
        this.updateNpQuestMarkers();
    };
    Spriteset_Map.prototype.updateNpQuestMarkers = function() {
        if (!this._npQuestMarkers || !this._tilemap) return;
        if (this._npQuestMarkerTick-- > 0) return;
        this._npQuestMarkerTick = 20;
        var pts = NP_QuestMarker.isEnabled() ? NP_QuestMarker.collect($gameMap.mapId()) : [];
        var key = JSON.stringify(pts);
        if (key === this._npQuestMarkerKey) return;
        this._npQuestMarkerKey = key;
        var tm = this._tilemap;
        this._npQuestMarkers.forEach(function(s) { tm.removeChild(s); });
        this._npQuestMarkers = pts.map(function(p) {
            var s = new Sprite_NpQuestMarker(p);
            tm.addChild(s);
            return s;
        });
    };
})();
