//=============================================================================
// NP_SuperAttack.js  (RU mod for Nymphomania Priestess v080j)
//=============================================================================
/*:
 * @plugindesc [RU mod] Super attacks for the Priestess and companions: charge bar + FP cost + unique QTE. Place after NP_PowerStrike / NP_Stress / NP_FastBattle.
 * @author RU mod
 *
 * @param Icon
 * @type number
 * @default 143
 *
 * @param ChargeRate
 * @text Charge fill rate
 * @desc Multiplier for every charge gain. 0.44 ≈ full bar after 6–7 typical rounds. 1 = old fast rate (~3 rounds).
 * @type number
 * @decimals 2
 * @default 0.44
 *
 * @param FloorBase
 * @text Min damage: base
 * @desc Minimum "normal hit" the super is computed from (before the QTE multiplier and armor).
 * @type number
 * @decimals 2
 * @default 5
 *
 * @param FloorPerLevel
 * @text Min damage: per level
 * @desc Added to the minimum per actor level.
 * @type number
 * @decimals 2
 * @default 0.25
 *
 * @param FloorStatDiv
 * @text Min damage: stat divisor
 * @desc + floor(stat / this). Stat = ATK for Yarizo, max(ATK, MAT) for the others. 0 = off.
 * @type number
 * @decimals 2
 * @default 4
 *
 * @help
 * Adds a 6th command to the companion battle menu (CE366) right after
 * «Усиленный удар». It is greyed out until the actor's super charge is full
 * (100%) and fatigue (FP) leaves room for the cost (+50, Fap/Easy +40).
 *
 *  Priestess (2)  «Святая печать» / Holy Seal   – arrow sequence; holy damage + party heal
 *  Yarizo   (21)  «Медвежья хватка» / Bear Grip – mash into the sweet zone; stun (overfill: he skips his next turn)
 *  PM       (10)  «Бросок склянки» / Flask Throw – sweeping reticle; fire / poison / sleep, miss shatters the flask
 *  VP       (19)  «Кровавая луна» / Blood Moon   – rotating needle, 3 stops; party lifesteal for the battle
 *
 * Charge fills from damage dealt / taken, an ally falling and each own turn
 * (all × ChargeRate, default 0.44 ≈ 6–7 rounds). It is kept in full after battle.
 * Option «Автовыполнение QTE» / "Auto QTE" = always an average result.
 * Never offered in the gallery (S5), during auto battle or while Ctrl-skipping.
 * Hero (actor 1) has no super attack. Old saves: data is created lazily.
 */
var NP_L = window.NP_L || function(r) { return r; };
var Imported = Imported || {};
Imported.NP_SuperAttack = true;
var NP_SuperAttack = window.NP_SuperAttack = window.NP_Super = {};

(function() {
    'use strict';
    var $ = NP_SuperAttack;
    var PRM = (typeof PluginManager !== 'undefined') ? PluginManager.parameters('NP_SuperAttack') : {};
    $.ICON = Number(PRM.Icon || 143);
    function numPrm(k, d) { var v = PRM[k]; return (v === undefined || v === '' || isNaN(Number(v))) ? d : Number(v); }
    $.CHARGE_RATE = Math.max(0, numPrm('ChargeRate', 0.44));
    $.FLOOR_BASE = numPrm('FloorBase', 5);
    $.FLOOR_LVL = numPrm('FloorPerLevel', 0.25);
    $.FLOOR_DIV = numPrm('FloorStatDiv', 4);
    $.VERSION = '1.2';
    var PRI = 2, PM = 10, VP = 19, YAR = 21;
    $.IDS = [PRI, YAR, PM, VP];
    var S_GALLERY = 5, S_BATTLE = 14, S_BOSS = 15;
    var KIND = {}; KIND[PRI] = 'pri'; KIND[YAR] = 'yar'; KIND[PM] = 'pm'; KIND[VP] = 'vp';
    $.KIND = KIND;
    var COLORS = { pri: ['#fff3b0', '#e0b030'], yar: ['#ffcf9a', '#c8641e'], pm: ['#b8ffb0', '#3aa04a'], vp: ['#ffb0c0', '#c0203c'] };
    $.NAMES = {
        pri: function() { return NP_L('Святая печать', 'Holy Seal'); },
        yar: function() { return NP_L('Медвежья хватка', 'Bear Grip'); },
        pm:  function() { return NP_L('Бросок склянки', 'Flask Throw'); },
        vp:  function() { return NP_L('Кровавая луна', 'Blood Moon'); }
    };
    $.TIERS = function(t) {
        return [NP_L('СЛАБО', 'WEAK'), NP_L('ХОРОШО', 'GOOD'), NP_L('ОТЛИЧНО', 'GREAT'), NP_L('ИДЕАЛЬНО', 'PERFECT')][t];
    };

    // ------------------------------------------------------------------ utils
    function gs(i) { return !!(window.$gameSwitches && $gameSwitches.value(i)); }
    function gv(i) { return Number((window.$gameVariables && $gameVariables.value(i)) || 0); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function rnd() { return $.rng ? $.rng() : Math.random(); }
    function actor(id) { return window.$gameActors ? $gameActors.actor(id) : null; }
    function mlog(t) { try { if (typeof set_mlog === 'function') set_mlog(t); } catch (e) {} }
    function partyIds() { return window.$gameParty ? $gameParty.members().map(function(m) { return m.actorId(); }) : []; }
    $.diff = function() { return gv(3); };                // 0 Fap, 3 Easy, 1 Normal, 2 Hard
    $.cost = function() { var d = $.diff(); return (d === 0 || d === 3) ? 40 : 50; };
    $.tier = function(q) { return q < 0.25 ? 0 : q < 0.6 ? 1 : q < 0.9 ? 2 : 3; };
    $.multFor = function(q) { return 1.8 + 3.7 * clamp(q, 0, 1); };   // avg q .45 → 3.47×, perfect 5.5×
    $.AUTO_Q = 0.45;

    // ------------------------------------------------------------------ data (lazy → old saves)
    $.data = function() {
        if (!window.$gameSystem) return null;
        var d = $gameSystem._npSuper;
        if (!d) d = $gameSystem._npSuper = { v: 1, charge: {}, dot: [], steal: 0, skip: {}, uses: 0, inBattle: false };
        if (!d.charge) d.charge = {};
        if (!d.dot) d.dot = [];
        if (!d.skip) d.skip = {};
        return d;
    };
    $.charge = function(aid) { var d = $.data(); return d ? clamp(Number(d.charge[aid]) || 0, 0, 100) : 0; };
    $.setCharge = function(aid, v) { var d = $.data(); if (d && KIND[aid]) d.charge[aid] = clamp(v, 0, 100); };
    $.canGain = function() { return gs(S_BATTLE) && !gs(S_GALLERY) && !$.running; };
    $.gain = function(aid, v) {
        if (!KIND[aid] || !(v > 0) || !$.canGain()) return;
        if (partyIds().indexOf(aid) < 0) return;
        var before = $.charge(aid);
        $.setCharge(aid, before + v * $.CHARGE_RATE);
        if (before < 100 && $.charge(aid) >= 100) {
            $._readyFx = $._readyFx || {}; $._readyFx[aid] = 1;
            var a = actor(aid);
            mlog('\\c[17]' + NP_L('【Супер-удар готов】 ', '【Super ready】 ') + (a ? a.name() : '') + ' — ' + $.NAMES[KIND[aid]]());
        }
    };
    function curActor() {
        var id = gv(270);
        if (!(id > 0 && id < 100)) {
            try { var m = $gameParty.members()[gv(274)]; if (m) id = m.actorId(); } catch (e) {}
        }
        return id;
    }
    $.curActor = curActor;
    $.isAuto = function() {
        return !!((window.$gameTemp && $gameTemp._npAutoBattle) ||
            (typeof NP_BattleQoL !== 'undefined' && NP_BattleQoL.auto));
    };
    $.skipVisual = function() {
        if (gs(S_GALLERY)) return true;
        if (typeof Input !== 'undefined' && Input.isPressed && Input.isPressed('control')) return true;
        return $.isAuto();
    };
    $.hasFor = function(aid) { return !!KIND[aid] && !!actor(aid) && partyIds().indexOf(aid) >= 0; };
    $.reason = function(aid) {      // null = ok, else short text
        var a = actor(aid);
        if (!a || !KIND[aid]) return 'none';
        if (gs(S_GALLERY)) return NP_L('недоступно', 'unavailable');
        if ($.isAuto()) return NP_L('автобой', 'auto battle');
        if ($.charge(aid) < 100) return NP_L('заряд ', 'charge ') + Math.floor($.charge(aid)) + '%';
        if (a.tp + $.cost() > 99) return NP_L('мало сил (FP)', 'too tired (FP)');
        return null;
    };
    $.okFor = function(aid) { return $.hasFor(aid) && gv(72) === 1 && !$.running && $.reason(aid) === null; };
    Object.defineProperty($, 'has', { get: function() { try { return $.hasFor(curActor()); } catch (e) { return false; } } });
    Object.defineProperty($, 'ok', { get: function() { try { return $.okFor(curActor()); } catch (e) { return false; } } });

    // stress link
    $.stressKind = function(aid) {
        try {
            if (typeof NP_Stress === 'undefined' || !NP_Stress.active || !NP_Stress.active()) return null;
            var a = NP_Stress.aff(aid); return a ? a.kind : null;
        } catch (e) { return null; }
    };

    // ------------------------------------------------------------------ options
    ConfigManager.npSuperAuto = false;
    var _mk = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _mk.apply(this, arguments); c.npSuperAuto = this.npSuperAuto; return c; };
    var _ap = ConfigManager.applyData;
    ConfigManager.applyData = function(c) { _ap.apply(this, arguments); this.npSuperAuto = !!(c && c.npSuperAuto); };
    if (typeof Window_Options !== 'undefined') {
        var _addGen = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addGen.apply(this, arguments);
            this.addCommand(NP_L('Автовыполнение QTE', 'Auto QTE'), 'npSuperAuto');
            try { if (window.NP_OptionsCategories && NP_OptionsCategories.register) NP_OptionsCategories.register('npSuperAuto', 'battle'); } catch (e) {}
        };
    }

    // ------------------------------------------------------------------ charge sources
    if (typeof Game_Variables !== 'undefined') {
        var _gvSet = Game_Variables.prototype.setValue;
        Game_Variables.prototype.setValue = function(id, value) {
            var old = (id === 123) ? Number(this._data[123] || 0) : 0;
            _gvSet.apply(this, arguments);
            if (id !== 123) return;
            try {
                var nv = Number(this._data[123] || 0), mhp = Number(this._data[122] || 0), delta = old - nv;
                if (!(delta > 0) || !(mhp > 0) || old > mhp || delta >= mhp || $.running || $._dotTick) return;
                if (!gs(S_BATTLE) || gs(S_GALLERY)) return;
                var who = Number(this._data[270] || 0);
                if (!(who > 0 && who < 100)) return;
                var base = delta / mhp * 150;
                partyIds().forEach(function(id) { if (KIND[id]) $.gain(id, id === who ? base : base * 0.35); });
                // Blood Moon lifesteal for the rest of the battle
                var d = $.data();
                if (d && d.steal > 0) {
                    var a = actor(who);
                    if (a && a.hp > 0) {
                        var h = Math.max(1, Math.ceil(delta * d.steal));
                        h = Math.min(h, a.mhp - a.hp);
                        if (h > 0) { a.gainHp(h); mlog('\\c[18]' + NP_L('【Кровавая луна】 ', '【Blood Moon】 ') + a.name() + ' +' + h + ' HP'); }
                    }
                }
            } catch (e) { console.warn('[NP_SuperAttack] charge', e); }
        };
    }
    if (typeof Game_Battler !== 'undefined') {
        var _setHp = Game_BattlerBase.prototype.setHp;
        Game_BattlerBase.prototype.setHp = function(hp) {
            var isA = this.isActor && this.isActor(), old = this._hp;
            _setHp.apply(this, arguments);
            if (!isA || $.running) return;
            try {
                var id = this.actorId(), lost = old - this._hp;
                if (!(lost > 0) || !$.canGain() || partyIds().indexOf(id) < 0) return;
                if (KIND[id]) $.gain(id, lost / Math.max(1, this.mhp) * 80);
                if (old > 0 && this._hp <= 0) {
                    partyIds().forEach(function(o) { if (o !== id && KIND[o]) { var oa = actor(o); if (oa && oa.hp > 0) $.gain(o, 40); } });
                }
            } catch (e) {}
        };
    }

    // ------------------------------------------------------------------ battle end: clear battle-scoped
    $.mapTick = function() {
        var d = $.data(); if (!d) return;
        var b = gs(S_BATTLE);
        if (b && !d.inBattle) { d.inBattle = true; d.dot = []; d.steal = 0; d.skip = {}; }
        else if (!b && d.inBattle) {
            d.inBattle = false; d.dot = []; d.steal = 0; d.skip = {};
            // charge carries over to the next battle in full (saved in $gameSystem._npSuper)
        }
    };

    // ------------------------------------------------------------------ injection
    function cmd(code, indent, p) { return { code: code, indent: indent, parameters: p, npSuper: true }; }
    function findChoice(list, needle) {
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c.code === 102 && c.parameters[0].some(function(t) { return String(t).indexOf(needle) === 0; })) return i;
        }
        return -1;
    }
    function findEnd(list, start) {
        var ind = list[start].indent;
        for (var i = start + 1; i < list.length; i++) if (list[i].indent === ind && list[i].code === 404) return i;
        return -1;
    }
    $.LABEL = function() { return '\\i[' + $.ICON + '] if(NP_Super.has) en(NP_Super.ok)'; };
    $.injectMenu = function(list) {
        if (list.some(function(c) { return c.npSuper; })) return 'already';
        var ci = findChoice(list, '\\i[147]');
        if (ci < 0) return 'no choice';
        var end = findEnd(list, ci);
        if (end < 0) return 'no end';
        var ind = list[ci].indent, choices = list[ci].parameters[0];
        if (choices.length >= 6) return 'full';
        var at = choices.some(function(t) { return /^\\i\[131\]/.test(t); }) ? 2 : 1;
        var label = $.LABEL();
        var cancel = list[ci].parameters[1];
        if (cancel >= at) list[ci].parameters[1] = cancel + 1;
        choices.splice(at, 0, label);
        var insertAt = -1, nothingIdx = -1;
        for (var i = ci + 1; i < end; i++) {
            var c = list[i];
            if (c.indent === ind && c.code === 402 && c.parameters[0] >= at) {
                if (insertAt < 0) insertAt = i;
                c.parameters[0] += 1;
                if (/^\\i\[4\]/.test(c.parameters[1])) nothingIdx = c.parameters[0];
            }
        }
        if (insertAt < 0) insertAt = end;
        // «Ничего не делать» remembers its cursor position in V382: shift it
        for (var k = ci; k < end; k++) {
            var e = list[k];
            if (nothingIdx > 0 && e.code === 122 && e.parameters[0] === 382 && e.parameters[1] === 382 &&
                e.parameters[3] === 0 && e.parameters[4] === nothingIdx - 1) e.parameters[4] = nothingIdx;
        }
        var b = ind + 1;
        var branch = [
            cmd(402, ind, [at, label]),
            cmd(108, b, ['NP_SuperAttack: супер-удар (QTE)']),
            cmd(122, b, [271, 271, 0, 1, 121]),
            cmd(356, b, ['KNS_EquipParameter set \\v[270] DMG 144']),
            cmd(356, b, ['KNS_EquipParameter set \\v[270] REQ 54']),
            cmd(356, b, ['NP_SuperAttack run']),
            cmd(355, b, ['NP_SuperAttack.resolve(this)']),
            cmd(111, b, [12, 'NP_SuperAttack.bindRelease()']),
            cmd(117, b + 1, [387]),
            cmd(355, b + 1, ['$chinira = 0']),
            cmd(117, b + 1, [389]),
            cmd(0, b + 1, []),
            cmd(412, b, []),
            cmd(355, b, ['NP_SuperAttack.finish()']),
            cmd(117, b, [335]),
            cmd(117, b, [384]),
            cmd(0, b, [])
        ];
        Array.prototype.splice.apply(list, [insertAt, 0].concat(branch));
        return 'ok@' + at;
    };
    $.injectTurnCheck = function(list) {      // CE364
        if (list.some(function(c) { return c.npSuper; })) return 'already';
        var at = list.length - 1;
        while (at > 0 && list[at].code === 0 && list[at].indent === 0) at--;
        list.splice(at + 1, 0, cmd(355, 0, ['NP_SuperAttack.turnCheck()']));
        return 'ok';
    };
    $.injectEnemyTurn = function(list) {      // CE368
        if (list.some(function(c) { return c.npSuper; })) return 'already';
        for (var i = 0; i < list.length - 1; i++) {
            if (list[i].code === 355 && /^set_mlog/.test(list[i].parameters[0]) && list[i + 1].code === 655 &&
                /battle_turn_start_enemy/.test(list[i + 1].parameters[0])) {
                var j = i + 2, ind = list[i].indent;
                list.splice(j, 0,
                    cmd(111, ind, [12, 'NP_SuperAttack.enemyTurn()']),
                    cmd(117, ind + 1, [335]),
                    cmd(0, ind + 1, []),
                    cmd(412, ind, []));
                return 'ok';
            }
        }
        return 'no anchor';
    };
    $.inject = function(ces) {
        var r = {};
        r.ce366 = ces[366] ? $.injectMenu(ces[366].list) : 'no CE366';
        r.ce364 = ces[364] ? $.injectTurnCheck(ces[364].list) : 'no CE364';
        r.ce368 = ces[368] ? $.injectEnemyTurn(ces[368].list) : 'no CE368';
        $.injectResult = r;
        console.log('[NP_SuperAttack] inject ' + JSON.stringify(r));
        return r;
    };
    if (typeof DataManager !== 'undefined') {
        var _isDb = DataManager.isDatabaseLoaded;
        DataManager.isDatabaseLoaded = function() {
            var ok = _isDb.apply(this, arguments);
            if (ok && !$._injected && window.$dataCommonEvents) {
                $._injected = true;
                try { $.inject($dataCommonEvents); } catch (e) { console.error('[NP_SuperAttack] inject failed', e); }
            }
            return ok;
        };
    }

    // ------------------------------------------------------------------ QTE result → damage
    $.result = null;       // {kind, q, miss, extra}
    $.qteSettings = function(kind, aid) {
        var d = $.diff(), sk = $.stressKind(aid), aff = sk === 'a';
        var s = { kind: kind, diff: d, aff: aff, virtue: sk === 'v' };
        if (kind === 'pri') {
            var t = { 0: [4, 4.0], 3: [4, 3.6], 1: [5, 3.4], 2: [6, 3.0] }[d] || [5, 3.4];
            s.n = t[0]; s.time = Math.round(t[1] * 60 * (aff ? 0.7 : 1));
        } else if (kind === 'yar') {
            s.press = d === 0 ? 11 : 9; s.decay = 0.3; s.frames = 240;
            s.zone = aff ? [72, 84] : (d === 2 ? [71, 86] : [70, 88]);
        } else if (kind === 'pm') {
            s.speed = (2 / 60) * (d === 2 ? 1.2 : d === 0 ? 0.8 : 1) * (aff ? 1.35 : 1);
            s.potion = (typeof $weak_fire !== 'undefined' && $weak_fire == 1) ? 'fire' : ['fire', 'poison', 'sleep'][Math.floor(rnd() * 3)];
        } else if (kind === 'vp') {
            s.arc = ({ 0: 50, 2: 30 }[d] || 40) * (aff ? 0.7 : 1);
            s.rev = 72;
        }
        return s;
    };
    function makeResult(kind, set, q, extra) {
        return { kind: kind, q: clamp(q, 0, 1), set: set, extra: extra || {} };
    }
    $.autoResult = function(kind, set) {
        var ex = {};
        if (kind === 'pm') { ex.potion = set.potion; ex.d = 0.3; }
        if (kind === 'vp') ex.hits = 2;
        return makeResult(kind, set, $.AUTO_Q, ex);
    };
    // pure scoring helpers (shared by sprites and tests)
    $.scorePri = function(done, n, framesLeft, mistakes) {
        var q = done / n * 0.6 + (done >= n ? 0.4 * Math.min(1, framesLeft / 30) : 0) - 0.08 * mistakes;
        return clamp(q, 0, 1);
    };
    $.scoreYar = function(zoneFrames, total, overfill) { return overfill ? $.AUTO_Q : clamp(zoneFrames / (0.5 * total), 0, 1); };
    $.scorePm = function(d) { if (d > 0.85) return 0; if (d <= 0.12) return 1; return clamp(1 - d / 0.8, 0, 1); };
    $.scoreVp = function(hits, precSum) { return clamp(hits / 3 * 0.8 + (hits ? 0.2 * precSum / hits : 0), 0, 1); };

    function weaponAnim(aid, fb) {
        try {
            var w = actor(aid).weapons()[0];
            var m = w && w.note && w.note.match(/<ANM:(\d+)>/);
            if (m) return Number(m[1]);
        } catch (e) {}
        return fb;
    }
    // minimum "normal hit" for a super: companions are weak without a (good) weapon
    $.floorFor = function(aid) {
        var a = actor(aid); if (!a) return 0;
        var lvl = Number(a.level) || 1, atk = a.param(2), mat = a.param(4);
        var stat = KIND[aid] === 'yar' ? atk : Math.max(atk, mat);
        var add = $.FLOOR_DIV > 0 ? Math.floor(stat / $.FLOOR_DIV) : 0;
        return Math.max(0, Math.floor($.FLOOR_BASE + $.FLOOR_LVL * lvl + add));
    };
    $.baseDamage = function(aid) {
        var a = actor(aid); if (!a) return { raw: 1, normal: 1 };
        var str = a.param(2), raw = gv(144) + Math.floor(str / 5);
        var unarmed = !a.equips || a.equips()[0] === null || a.equips()[0] === undefined;
        if (gv(54) > str || unarmed) raw = 1;
        var floor = $.floorFor(aid), weapon = raw;
        raw = Math.max(raw, floor);
        var bonus = (typeof $dmg_bonus !== 'undefined' && Number($dmg_bonus) > 0) ? Number($dmg_bonus) : 1;
        raw = Math.ceil(raw * bonus);
        return { raw: raw, str: str, weapon: weapon, floor: floor, floored: floor > weapon };
    };
    $.computeDamage = function(aid, res) {
        var kind = res.kind, b = $.baseDamage(aid), raw = b.raw, weak = false;
        if (kind === 'pri' && typeof $weak_holy !== 'undefined' && $weak_holy == 1) weak = true;
        if (kind === 'pm' && res.extra.potion === 'fire' && !res.extra.miss && typeof $weak_fire !== 'undefined' && $weak_fire == 1) weak = true;
        if (weak) raw = Math.ceil(raw * 1.5);
        var armor = gv(136);
        if (kind === 'pri') armor = Math.min(gv(136), gv(134));      // holy light ignores heavy plate
        var normal = Math.max(1, raw - armor);
        var mult = res.extra.miss ? 0.8 : $.multFor(res.q);
        if (res.set && res.set.virtue) mult *= 1.15;
        var dmg = Math.ceil(Math.max(normal, 3) * mult);
        return { dmg: Math.max(1, dmg), mult: mult, normal: normal, weak: weak, raw: raw, armor: armor, floor: b.floor, floored: b.floored };
    };

    $.addDot = function(kind, per, turns) {
        var d = $.data(); if (!d) return;
        d.dot = d.dot.filter(function(x) { return x.kind !== kind; });
        d.dot.push({ kind: kind, per: Math.max(1, per), turns: turns });
    };
    function stateName(id) { var s = window.$dataStates && $dataStates[id]; return s ? '\\I[' + s.iconIndex + ']' + s.name : ''; }

    $.resolve = function(interp) {
        var aid = curActor(), a = actor(aid), res = $.result || $.autoResult(KIND[aid] || 'pri', $.qteSettings(KIND[aid] || 'pri', aid));
        $.result = null;
        $.running = true;
        var out = { aid: aid };
        try {
            var c = $.computeDamage(aid, res), dmg = c.dmg, kind = res.kind;
            out.dmg = dmg; out.mult = c.mult; out.q = res.q; out.normal = c.normal;
            var name = $.NAMES[kind](), tier = res.extra.miss ? NP_L('ПРОМАХ', 'MISS') : $.TIERS($.tier(res.q));
            window.$dmg = dmg;
            $gameVariables.setValue(54, dmg);
            if (kind === 'pm') window.$atk_attribute = res.extra.potion === 'fire' && !res.extra.miss ? 'fire' : 0;
            if (kind === 'pri') window.$atk_attribute = 'saint';
            mlog('\\c[17]【' + name + '】 ' + tier + ' ×' + c.mult.toFixed(1) + (c.weak ? NP_L(' (слабость!)', ' (weakness!)') : ''));
            mlog(NP_L((a ? a.name() : '') + ' наносит \\c[2]' + dmg + '\\c[0] урона', (a ? a.name() : '') + ' deals \\c[2]' + dmg + '\\c[0] damage'));
            $gameVariables.setValue(123, gv(123) - dmg);
            var ename = String($gameVariables.value(139) || '');
            mlog('\\c[2]([' + ename + ']HP:' + gv(123) + '/' + gv(122) + ')');
            var boss = gs(S_BOSS), enemy = actor(100), alive = gv(123) > 0, slept = false;
            var party = $gameParty.members().filter(function(m) { return m.hp > 0; });
            if (kind === 'pri') {
                var rate = 0.10 + 0.25 * res.q;
                party.forEach(function(m) {
                    var h = Math.min(m.mhp - m.hp, Math.max(1, Math.ceil(m.mhp * rate)));
                    if (h > 0) { m.gainHp(h); mlog('\\c[24]' + NP_L('【Святой свет】 ', '【Holy light】 ') + m.name() + ' +' + h + ' HP'); }
                });
                out.heal = rate;
            } else if (kind === 'yar') {
                if (res.extra.overfill) {
                    var dd = $.data(); dd.skip[aid] = 1; out.overfill = true;
                    mlog('\\c[2]' + NP_L('Яризо перенапрягся — пропустит следующий ход.', 'Yarizo overstrained himself — he will skip his next turn.'));
                } else if (res.q >= 0.3 && enemy && alive) {
                    var turns = res.q >= 0.9 ? 2 : 1; if (boss) turns = 1;
                    enemy.addState(8);
                    window.$enemy_state_stun = Math.max(Number(window.$enemy_state_stun) || 0, turns);
                    out.stun = turns;
                    mlog('\\c[17][' + ename + '] + ' + stateName(8) + ' (' + turns + NP_L(' ход.', ' turn(s)') + ')');
                }
            } else if (kind === 'pm') {
                var crit = !res.extra.miss && res.q >= 1, pot = res.extra.potion;
                if (res.extra.miss) {
                    mlog('\\c[2]' + NP_L('Склянка разбилась о землю — зелье пропало.', 'The flask shattered on the ground — the potion is wasted.'));
                } else if (alive && pot === 'fire') {
                    $.addDot('burn', Math.ceil(dmg * 0.12), 3); out.burn = Math.ceil(dmg * 0.12);
                    mlog('\\c[2][' + ename + '] ' + NP_L('горит', 'is burning') + ' (' + out.burn + ' × 3)');
                } else if (alive && pot === 'poison' && enemy) {
                    enemy.addState(2);
                    window.$enemy_state_poison = Math.max(Number(window.$enemy_state_poison) || 0, crit ? 5 : 3);
                    $.addDot('toxin', Math.ceil(dmg * 0.10), crit ? 5 : 3); out.toxin = Math.ceil(dmg * 0.10);
                    mlog('\\c[17][' + ename + '] + ' + stateName(2));
                } else if (alive && pot === 'sleep' && enemy) {
                    var st = crit ? 3 : 2; if (boss) st = 1;
                    enemy.addState(6); window.$enemy_state_sleep = st; slept = true; out.sleep = st;
                    mlog('\\c[17][' + ename + '] + ' + stateName(6));
                }
                out.potion = pot; out.miss = !!res.extra.miss;
            } else if (kind === 'vp') {
                var h3 = res.extra.hits || 0;
                if (h3 > 0) {
                    party.forEach(function(m) {
                        var hh = Math.min(m.mhp - m.hp, Math.ceil(dmg * 0.1 * h3));
                        if (hh > 0) { m.gainHp(hh); mlog('\\c[18]' + NP_L('【Кровавая луна】 ', '【Blood Moon】 ') + m.name() + ' +' + hh + ' HP'); }
                    });
                    var d2 = $.data(); d2.steal = Math.max(d2.steal || 0, 0.08 * h3); out.steal = d2.steal;
                    mlog('\\c[18]' + NP_L('Отряд пьёт силу врага до конца боя: ', 'The party drains the foe for the rest of the battle: ') + Math.round(d2.steal * 100) + '%');
                }
            }
            // any hit wakes a sleeping enemy (unless the hit itself put it to sleep)
            if (!slept && enemy && enemy.isStateAffected(6)) {
                mlog('_log_database_text_cure_sleep');
                enemy.removeState(6); window.$enemy_state_sleep = 0;
            }
            // hate
            try {
                if (window.$hate && Array.isArray($hate)) {
                    var num = gv(274);
                    $hate[num] += 1;
                    var vic = $hate.map(function(n, index) { return { n: n, index: index }; }).filter(function(o) { return o.index !== num; });
                    if (vic[0] && $hate[vic[0].index] > 0) $hate[vic[0].index] -= 1;
                    else if (vic[1] && $hate[vic[1].index] > 0) $hate[vic[1].index] -= 1;
                    if (typeof $hate_max !== 'undefined' && $hate[num] >= $hate_max) $hate[num] = $hate_max;
                }
            } catch (e) {}
            // cost + charge reset
            var cost = $.cost();
            if (a) {
                if (typeof tp_heal === 'function') tp_heal(aid, -cost);
                else a.setTp(Math.min(a.maxTp(), a.tp + cost));
            }
            out.cost = cost;
            $.setCharge(aid, 0);
            var dd2 = $.data(); dd2.uses = (dd2.uses || 0) + 1;
            // animation on the enemy event
            var anim = { pri: 75, yar: weaponAnim(aid, 17), pm: res.extra.miss ? 19 : ({ fire: 57, poison: 50, sleep: 54 }[res.extra.potion] || 19), vp: 49 }[kind] || 19;
            if (!window.$dataAnimations || !$dataAnimations[anim]) anim = 19;
            out.anim = anim;
            if (interp && interp.character) {
                var ch = interp.character(0);
                if (ch && ch.requestAnimation && !gs(S_GALLERY)) { ch.requestAnimation(anim); interp._character = ch; interp.setWaitMode('animation'); }
            }
        } catch (e) {
            console.error('[NP_SuperAttack] resolve', e);
        }
        $.running = false;
        $.last = out;
        return out;
    };
    $.bindRelease = function() {
        if (!(Number(window.$dmg) >= 1)) return false;
        var any = false;
        $gameParty.members().forEach(function(m) {
            if (!m.isStateAffected(10)) return;
            any = true;
            var id = m.actorId();
            if (id === 1) $gameSwitches.setValue(62, false);
            else if (id === 2) { $gameSwitches.setValue(63, false); $gameSwitches.setValue(65, false); }
            else { $gameSwitches.setValue(67, false); $gameSwitches.setValue(69, false); }
            m.removeState(10);
        });
        return any;
    };
    $.finish = function() {     // same init as the end of CE36
        $gameVariables.setValue(149, 0);
        $gameSwitches.setValue(17, false);
        $gameVariables.setValue(168, 0);
        window.$dmg = 0; window.$dmg_bonus = 1; window.$roll_critical = 0; window.$roll_fumble = 0; window.$atk_attribute = 0;
        [96, 97, 98, 99].forEach(function(p) { $gameScreen.erasePicture(p); });
    };
    $.turnCheck = function() {      // CE364 (turn start of V270)
        var aid = gv(270), d = $.data();
        if (!d || !KIND[aid] || !gs(S_BATTLE)) return;
        if (d.skip[aid]) {
            delete d.skip[aid];
            window.$skip_turn = 1;
            var a = actor(aid);
            mlog('\\c[2]' + NP_L((a ? a.name() : '') + ' переводит дух после хватки и пропускает ход.', (a ? a.name() : '') + ' catches his breath after the grip and skips the turn.'));
            return;
        }
        $.gain(aid, 6);
    };
    $.enemyTurn = function() {      // CE368, returns true when HP changed (→ CE335)
        var d = $.data(); if (!d || !d.dot.length || !gs(S_BATTLE)) return false;
        var ename = String($gameVariables.value(139) || ''), changed = false;
        $._dotTick = true;
        try {
            d.dot.forEach(function(x) {
                var hp = gv(123); if (hp <= 1) { x.turns--; return; }
                var v = Math.min(x.per, hp - 1);
                if (v > 0) {
                    $gameVariables.setValue(123, hp - v); changed = true;
                    mlog((x.kind === 'burn' ? '\\c[2]' + NP_L('Огонь склянки жжёт ', 'Flask fire burns ') : '\\c[3]' + NP_L('Яд склянки разъедает ', 'Flask toxin eats at ')) +
                        '[' + ename + '] -' + v + ' (HP:' + gv(123) + '/' + gv(122) + ')');
                }
                x.turns--;
            });
            d.dot = d.dot.filter(function(x) { return x.turns > 0; });
        } finally { $._dotTick = false; }
        return changed;
    };

    // ------------------------------------------------------------------ plugin command + wait
    if (typeof Game_Interpreter === 'undefined') return;
    var _pc = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pc.apply(this, arguments);
        if (command !== 'NP_SuperAttack') return;
        var sub = String(args[0] || '').toLowerCase();
        if (sub === 'run') this.npStartSuper();
    };
    Game_Interpreter.prototype.npStartSuper = function() {
        var aid = curActor(), kind = KIND[aid] || 'pri', set = $.qteSettings(kind, aid);
        $.result = null;
        var scene = SceneManager._scene;
        if ($.skipVisual() || !scene || typeof Sprite_NpSuper === 'undefined') { $.result = $.autoResult(kind, set); return; }
        set.auto = !!ConfigManager.npSuperAuto;
        set.aid = aid;
        var sp = new Sprite_NpSuper(set);
        scene.addChild(sp);
        $._qte = sp;
        this.setWaitMode('npSuper');
    };
    var _uwm = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === 'npSuper') {
            var q = $._qte;
            if (q && !q.isFinished()) return true;
            if (q) { $.result = q.result(); if (q.parent) q.parent.removeChild(q); $._qte = null; }
            this._waitMode = '';
            return false;
        }
        return _uwm.apply(this, arguments);
    };

    // ------------------------------------------------------------------ input (keyboard, gamepad, mouse/touch; tests: $.sim)
    $.sim = [];      // queue of per-frame inputs {ok:true} / {dir:'up'} / {tap:[x,y]}
    function frameInput(spr) {
        var s = typeof $.sim === 'function' ? $.sim(spr) : ($.sim && $.sim.length ? $.sim.shift() : null);
        var r = { ok: false, dir: null, tap: null };
        if (s) { r.ok = !!s.ok; r.dir = s.dir || null; r.tap = s.tap || null; return r; }
        r.ok = Input.isTriggered('ok');
        ['up', 'down', 'left', 'right'].forEach(function(d) { if (!r.dir && Input.isTriggered(d)) r.dir = d; });
        if (TouchInput.isTriggered()) r.tap = [TouchInput.x, TouchInput.y];
        return r;
    }
    $.frameInput = frameInput;

    // ------------------------------------------------------------------ sprites
    function se(name, vol, pitch) { try { AudioManager.playSe({ name: name, volume: vol || 90, pitch: pitch || 100, pan: 0 }); } catch (e) {} }
    function dirty(b) { if (b._setDirty) b._setDirty(); else if (b._baseTexture) b._baseTexture.update(); }
    function txt(w, h, text, size, color, align) {
        var b = new Bitmap(w, h); b.fontSize = size; b.textColor = color || '#ffffff';
        b.outlineColor = 'rgba(0,0,0,0.9)'; b.outlineWidth = Math.max(4, Math.round(size / 5));
        b.drawText(text, 0, 0, w, h, align || 'center'); return b;
    }
    var ease = function(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); };
    var DIRS = { up: [0, -1, '▲'], down: [0, 1, '▼'], left: [-1, 0, '◀'], right: [1, 0, '▶'] };
    var INTRO = 52, OUTRO = 50;
    var CUT = { pri: 'np_super_cutin_pri', yar: 'np_super_cutin_yar', pm: 'np_super_cutin_pm', vp: 'np_super_cutin_vp' };
    $.preload = function() {
        try { ['np_super_cutin_pri', 'np_super_cutin_yar', 'np_super_cutin_pm', 'np_super_cutin_vp', 'np_super_sign', 'np_super_flask', 'np_super_reticle', 'np_super_moon']
            .forEach(function(n) { ImageManager.loadPicture(n); }); } catch (e) {}
    };

    function Sprite_NpSuper() { this.initialize.apply(this, arguments); }
    Sprite_NpSuper.prototype = Object.create(Sprite.prototype);
    Sprite_NpSuper.prototype.constructor = Sprite_NpSuper;
    window.Sprite_NpSuper = Sprite_NpSuper;
    Sprite_NpSuper.prototype.initialize = function(set) {
        Sprite.prototype.initialize.call(this);
        this._set = set; this._kind = set.kind; this._t = 0; this._phase = 'intro'; this._done = false;
        this._res = null;
        var W = Graphics.width, H = Graphics.height;
        this._W = W; this._H = H;
        var dim = new Bitmap(W, H); dim.fillRect(0, 0, W, H, 'rgba(0,0,0,0.62)');
        this._dim = new Sprite(dim); this._dim.opacity = 0; this.addChild(this._dim);
        this._cut = new Sprite(ImageManager.loadPicture(CUT[this._kind]));
        this._cut.anchor.y = 0.5; this._cut.y = Math.round(H * 0.42); this.addChild(this._cut);
        var col = COLORS[this._kind];
        this._title = new Sprite(txt(900, 80, $.NAMES[this._kind](), 54, col[0], 'right'));
        this._title.anchor.x = 1; this._title.anchor.y = 0.5; this._title.x = W - 40; this._title.y = this._cut.y + 110; this.addChild(this._title);
        this._ui = new Sprite(); this._ui.opacity = 0; this.addChild(this._ui);
        this._hint = new Sprite(txt(W, 40, '', 24)); this._hint.y = H - 120; this._ui.addChild(this._hint);
        var info = [];
        if (set.virtue) info.push(NP_L('Добродетель: удар сильнее', 'Virtue: stronger strike'));
        if (set.aff) info.push(NP_L('Срыв: окно уже', 'Affliction: narrower window'));
        if (set.auto) info.push(NP_L('Авто-QTE', 'Auto QTE'));
        if (info.length) { var inf = new Sprite(txt(W, 36, info.join('  •  '), 22, set.aff ? '#ff8080' : '#ffe9a0')); inf.y = 60; this._ui.addChild(inf); }
        this._banner = new Sprite(txt(900, 110, '', 72)); this._banner.anchor.x = 0.5; this._banner.anchor.y = 0.5;
        this._banner.x = W / 2; this._banner.y = H / 2; this._banner.visible = false; this.addChild(this._banner);
        this['init_' + this._kind]();
        se('Skill2', 90, 110);
    };
    Sprite_NpSuper.prototype.setHint = function(t) {
        if (this._hintText === t) return; this._hintText = t;
        var b = this._hint.bitmap; b.clear(); b.fontSize = 24; b.outlineColor = 'rgba(0,0,0,0.9)'; b.outlineWidth = 5; b.textColor = '#ffffff';
        b.drawText(t, 0, 0, this._W, 40, 'center');
    };
    Sprite_NpSuper.prototype.isFinished = function() { return this._done; };
    Sprite_NpSuper.prototype.result = function() { return this._res || $.autoResult(this._kind, this._set); };
    Sprite_NpSuper.prototype.finishQte = function(q, extra) {
        if (this._res) return;
        this._res = makeResult(this._kind, this._set, q, extra);
        this._phase = 'outro'; this._t = 0;
        var miss = extra && extra.miss, t = $.tier(this._res.q);
        var text = miss ? NP_L('СКЛЯНКА РАЗБИЛАСЬ', 'FLASK SHATTERED') : $.TIERS(t) + '  ×' + ($.multFor(this._res.q) * (this._set.virtue ? 1.15 : 1)).toFixed(1);
        var col = miss ? '#ff6060' : ['#d0d0d0', '#ffffff', '#ffe070', '#ffd040'][t];
        this._banner.bitmap = txt(900, 110, text, 72, col); this._banner.visible = true;
        se(miss ? 'Crash' : t >= 3 ? 'Skill3' : t >= 2 ? 'Skill1' : 'Attack3', 90, t >= 3 ? 120 : 100);
    };
    Sprite_NpSuper.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this._t++;
        var W = this._W;
        if (this._phase === 'intro') {
            var k = this._t / INTRO;
            this._dim.opacity = 255 * ease(k * 2);
            var bw = this._cut.bitmap && this._cut.bitmap.width || 1280;
            this._cut.x = k < 0.25 ? -bw + (bw) * ease(k / 0.25) : k < 0.8 ? -(k - 0.25) * 30 : -(0.55 * 30) - (k - 0.8) / 0.2 * W;
            this._cut.opacity = k < 0.8 ? 255 : 255 * (1 - (k - 0.8) / 0.2);
            this._title.opacity = this._cut.opacity; this._title.x = W - 40 + (k < 0.25 ? 300 * (1 - ease(k / 0.25)) : 0);
            if (this._t >= INTRO) {
                this._cut.visible = false; this._title.visible = false; this._phase = 'qte'; this._t = 0;
                if (this._set.auto) this.autoPlay();
            }
            return;
        }
        if (this._phase === 'qte') {
            this._ui.opacity = Math.min(255, this._ui.opacity + 40);
            if (this._autoT !== undefined) { if (--this._autoT <= 0) this.finishQte($.AUTO_Q, $.autoResult(this._kind, this._set).extra); this['draw_' + this._kind](); return; }
            this['update_' + this._kind](frameInput(this));
            return;
        }
        // outro
        var o = this._t / OUTRO;
        this._banner.scale.x = this._banner.scale.y = 0.7 + 0.3 * ease(o * 3);
        this._banner.opacity = o < 0.7 ? 255 : 255 * (1 - (o - 0.7) / 0.3);
        this._ui.opacity = 255 * (1 - o);
        this._dim.opacity = 255 * (1 - ease(o));
        if (this['outro_' + this._kind]) this['outro_' + this._kind](o);
        if (this._t >= OUTRO) this._done = true;
    };
    Sprite_NpSuper.prototype.autoPlay = function() { this._autoT = 40; this.setHint(NP_L('Авто-QTE: средний результат', 'Auto QTE: average result')); };
    Sprite_NpSuper.prototype.makeBar = function(w, h, y) {
        var s = new Sprite(new Bitmap(w, h)); s.x = Math.round((this._W - w) / 2); s.y = y; this._ui.addChild(s); return s;
    };
    function drawTimeBar(s, k, col) {
        var b = s.bitmap, w = b.width, h = b.height; b.clear();
        b.fillRect(0, 0, w, h, 'rgba(0,0,0,0.7)');
        b.fillRect(2, 2, Math.max(0, (w - 4) * clamp(k, 0, 1)), h - 4, k < 0.3 ? '#ff5050' : col);
    }

    // ---------------- Priestess: arrows
    Sprite_NpSuper.prototype.init_pri = function() {
        var s = this._set, W = this._W, H = this._H;
        this._seq = []; for (var i = 0; i < s.n; i++) this._seq.push(['up', 'down', 'left', 'right'][Math.floor(rnd() * 4)]);
        this._pos = 0; this._mis = 0; this._left = s.time;
        this._sign = new Sprite(ImageManager.loadPicture('np_super_sign')); this._sign.anchor.x = this._sign.anchor.y = 0.5;
        this._sign.x = W / 2; this._sign.y = H * 0.38; this._sign.blendMode = Graphics.BLEND_ADD; this._ui.addChild(this._sign);
        this._cx = W / 2; this._cy = H * 0.38;
        this._arrows = [];
        var gap = 110, x0 = W / 2 - gap * (s.n - 1) / 2;
        for (var j = 0; j < s.n; j++) {
            var a = new Sprite(txt(100, 100, DIRS[this._seq[j]][2], 72, '#ffffff'));
            a.anchor.x = a.anchor.y = 0.5; a.x = x0 + gap * j; a.y = H * 0.68; this._ui.addChild(a); this._arrows.push(a);
        }
        this._tbar = this.makeBar(640, 16, Math.round(H * 0.76));
        this.setHint(NP_L('Нажимайте стрелки по порядку (или касайтесь в сторону от печати)', 'Press the arrows in order (or tap toward them around the seal)'));
        this.draw_pri();
    };
    Sprite_NpSuper.prototype.draw_pri = function() {
        for (var j = 0; j < this._arrows.length; j++) {
            var a = this._arrows[j];
            a.opacity = j < this._pos ? 110 : 255;
            a.setColorTone(j < this._pos ? [0, 0, 0, 255] : [0, 0, 0, 0]);
            var cur = j === this._pos;
            a.scale.x = a.scale.y = cur ? 1.15 + 0.08 * Math.sin(this._t / 4) : 0.85;
            if (j < this._pos) a.setBlendColor([255, 220, 90, 160]); else a.setBlendColor(cur && this._shake > 0 ? [255, 40, 40, 180] : [0, 0, 0, 0]);
        }
        if (this._shake > 0) this._shake--;
        this._sign.rotation += 0.01; var k = this._pos / this._seq.length;
        this._sign.scale.x = this._sign.scale.y = 0.75 + 0.35 * k; this._sign.opacity = 120 + 135 * k;
        drawTimeBar(this._tbar, this._left / this._set.time, '#ffe070');
    };
    Sprite_NpSuper.prototype.update_pri = function(inp) {
        var dir = inp.dir;
        if (!dir && inp.tap) {
            var dx = inp.tap[0] - this._cx, dy = inp.tap[1] - this._cy;
            if (Math.abs(dx) > 30 || Math.abs(dy) > 30) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        }
        if (dir) {
            if (dir === this._seq[this._pos]) { this._pos++; se('Decision2', 80, 100 + this._pos * 8); }
            else { this._mis++; this._shake = 10; se('Buzzer1', 70, 100); }
        }
        this._left--;
        this.draw_pri();
        var n = this._seq.length;
        if (this._pos >= n || this._left <= 0) this.finishQte($.scorePri(this._pos, n, Math.max(0, this._left), this._mis), { done: this._pos, n: n, mistakes: this._mis });
    };

    // ---------------- Yarizo: mash
    Sprite_NpSuper.prototype.init_yar = function() {
        var W = this._W, H = this._H;
        this._g = 0; this._zf = 0; this._f = 0;
        this._gauge = new Sprite(new Bitmap(120, 460)); this._gauge.x = W / 2 - 60; this._gauge.y = H * 0.18; this._ui.addChild(this._gauge);
        this._fist = new Sprite(txt(420, 60, NP_L('ЖМИ!', 'MASH!'), 46, '#ffcf9a')); this._fist.anchor.x = this._fist.anchor.y = 0.5;
        this._fist.x = W / 2; this._fist.y = H * 0.18 - 40; this._ui.addChild(this._fist);
        this._tbar = this.makeBar(640, 16, Math.round(H * 0.76));
        this.setHint(NP_L('Жмите OK / кнопку / касайтесь, держите шкалу в золотой зоне. Перебор — Яризо сорвётся!', 'Mash OK / button / tap; keep the gauge in the gold zone. Overfill and Yarizo strains himself!'));
        this.draw_yar();
    };
    Sprite_NpSuper.prototype.draw_yar = function() {
        var b = this._gauge.bitmap, s = this._set, h = 460, w = 120; b.clear();
        b.fillRect(0, 0, w, h, 'rgba(0,0,0,0.75)');
        var zy0 = h - h * s.zone[1] / 100, zy1 = h - h * s.zone[0] / 100;
        b.fillRect(4, zy0, w - 8, zy1 - zy0, 'rgba(255,200,60,0.45)');
        b.fillRect(4, 0, w - 8, h * 0.06, 'rgba(255,40,40,0.5)');
        var gh = h * this._g / 100, inZ = this._g >= s.zone[0] && this._g <= s.zone[1];
        b.gradientFillRect(14, h - gh, w - 28, gh, inZ ? '#fff0a0' : '#c8641e', inZ ? '#ffb020' : '#7a3410', true);
        dirty(b);
        this._fist.scale.x = this._fist.scale.y = 1 + (this._bump || 0) * 0.04; if (this._bump) this._bump--;
        drawTimeBar(this._tbar, 1 - this._f / s.frames, '#ffcf9a');
    };
    Sprite_NpSuper.prototype.update_yar = function(inp) {
        var s = this._set;
        if (inp.ok || inp.tap) { this._g += s.press; this._bump = 5; se('Cursor1', 60, 90 + Math.round(this._g / 2)); }
        this._g = Math.max(0, this._g - s.decay);
        this._f++;
        if (this._g >= s.zone[0] && this._g <= s.zone[1]) this._zf++;
        this.draw_yar();
        if (this._g >= 100) { this.finishQte($.scoreYar(0, 1, true), { overfill: true }); return; }
        if (this._f >= s.frames) this.finishQte($.scoreYar(this._zf, s.frames, false), { zoneFrames: this._zf });
    };

    // ---------------- Potion Maker: reticle
    Sprite_NpSuper.prototype.init_pm = function() {
        var W = this._W, H = this._H, s = this._set;
        this._p = -1; this._vel = s.speed; this._sweeps = 0;
        this._track = new Sprite(new Bitmap(840, 60)); this._track.x = W / 2 - 420; this._track.y = H * 0.48; this._ui.addChild(this._track);
        var b = this._track.bitmap;
        b.fillRect(0, 18, 840, 24, 'rgba(0,0,0,0.75)');
        b.fillRect(420 - 420 * 0.85, 22, 840 * 0.85, 16, 'rgba(255,255,255,0.12)');
        b.fillRect(420 - 420 * 0.4, 22, 840 * 0.4, 16, 'rgba(120,255,120,0.30)');
        b.fillRect(420 - 420 * 0.12, 14, 840 * 0.12, 32, 'rgba(255,230,80,0.85)');
        dirty(b);
        this._ret = new Sprite(ImageManager.loadPicture('np_super_reticle')); this._ret.anchor.x = this._ret.anchor.y = 0.5;
        this._ret.scale.x = this._ret.scale.y = 0.6; this._ret.y = H * 0.48 + 30; this._ui.addChild(this._ret);
        this._flask = new Sprite(ImageManager.loadPicture('np_super_flask')); this._flask.anchor.x = this._flask.anchor.y = 0.5;
        this._flask.x = W / 2; this._flask.y = H * 0.75; this._ui.addChild(this._flask);
        var pc = { fire: [255, 80, 0, 120], poison: [60, 220, 60, 120], sleep: [120, 120, 255, 120] }[s.potion];
        this._flask.setBlendColor(pc);
        var pn = { fire: NP_L('Огненное зелье', 'Fire potion'), poison: NP_L('Яд', 'Poison'), sleep: NP_L('Сонное зелье', 'Sleep potion') }[s.potion];
        var lab = new Sprite(txt(600, 40, pn, 28, '#b8ffb0')); lab.anchor.x = 0.5; lab.x = W / 2; lab.y = H * 0.75 + 70; this._ui.addChild(lab);
        this.setHint(NP_L('OK / касание — бросить, когда прицел в центре', 'OK / tap to throw when the reticle is in the centre'));
        this.draw_pm();
    };
    Sprite_NpSuper.prototype.draw_pm = function() {
        this._ret.x = this._W / 2 + this._p * 420; this._ret.rotation += 0.05;
        if (!this._thrown) this._flask.rotation = 0.15 * Math.sin(this._t / 8);
    };
    Sprite_NpSuper.prototype.update_pm = function(inp) {
        if (inp.ok || inp.tap || this._sweeps >= 3) {
            var d = Math.abs(this._p);
            this._thrown = { x0: this._flask.x, y0: this._flask.y, x1: this._ret.x, y1: this._ret.y };
            this.finishQte($.scorePm(d), { potion: this._set.potion, d: d, miss: d > 0.85, crit: d <= 0.12 });
            return;
        }
        this._p += this._vel;
        if (this._p >= 1) { this._p = 1; this._vel = -this._vel; this._sweeps++; }
        if (this._p <= -1) { this._p = -1; this._vel = -this._vel; this._sweeps++; }
        this.draw_pm();
    };
    Sprite_NpSuper.prototype.outro_pm = function(o) {
        var t = this._thrown; if (!t) return;
        var k = clamp(o * 2.5, 0, 1);
        this._flask.x = t.x0 + (t.x1 - t.x0) * k; this._flask.y = t.y0 + (t.y1 - t.y0) * k - 160 * Math.sin(Math.PI * k);
        this._flask.rotation += 0.3;
        if (k >= 1) this._flask.visible = false;
    };

    // ---------------- Vampire Princess: needle
    Sprite_NpSuper.prototype.init_vp = function() {
        var W = this._W, H = this._H;
        this._ang = 0; this._stop = 0; this._hits = 0; this._prec = 0; this._idle = 0; this._marks = [];
        this._cx = W / 2; this._cy = H * 0.42;
        this._moon = new Sprite(ImageManager.loadPicture('np_super_moon')); this._moon.anchor.x = this._moon.anchor.y = 0.5;
        this._moon.x = this._cx; this._moon.y = this._cy; this._moon.scale.x = this._moon.scale.y = 1.1; this._ui.addChild(this._moon);
        this._dial = new Sprite(new Bitmap(440, 440)); this._dial.anchor.x = this._dial.anchor.y = 0.5; this._dial.x = this._cx; this._dial.y = this._cy; this._ui.addChild(this._dial);
        this._pips = new Sprite(new Bitmap(300, 50)); this._pips.anchor.x = 0.5; this._pips.x = W / 2; this._pips.y = this._cy + 240; this._ui.addChild(this._pips);
        this.newZone();
        this.setHint(NP_L('OK / касание — остановить стрелку в красной зоне (3 раза)', 'OK / tap to stop the needle in the red zone (3 times)'));
        this.draw_vp();
    };
    Sprite_NpSuper.prototype.newZone = function() {
        var prev = this._zc === undefined ? this._ang + 180 : this._zc, c;
        for (var i = 0; i < 10; i++) { c = Math.floor(rnd() * 360); var df = Math.abs(((c - this._ang + 540) % 360) - 180); if (df >= 90) break; }
        this._zc = c; this._idle = 0; void prev;
    };
    Sprite_NpSuper.prototype.draw_vp = function() {
        var b = this._dial.bitmap, ctx = b._context, R = 200, cx = 220, cy = 220; b.clear();
        ctx.save();
        ctx.lineWidth = 26; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        var a0 = (this._zc - this._set.arc / 2 - 90) * Math.PI / 180, a1 = (this._zc + this._set.arc / 2 - 90) * Math.PI / 180;
        ctx.strokeStyle = 'rgba(230,20,50,0.95)'; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
        var na = (this._ang - 90) * Math.PI / 180;
        ctx.lineWidth = 7; ctx.strokeStyle = '#fff4e0'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * (R + 14), cy + Math.sin(na) * (R + 14)); ctx.stroke();
        ctx.fillStyle = '#fff4e0'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); dirty(b);
        var p = this._pips.bitmap, pc = p._context; p.clear();
        for (var i = 0; i < 3; i++) {
            pc.fillStyle = i < this._marks.length ? (this._marks[i] ? '#e01838' : '#555555') : 'rgba(255,255,255,0.25)';
            pc.beginPath(); pc.arc(60 + i * 90, 25, 18, 0, Math.PI * 2); pc.fill();
        }
        dirty(p);
    };
    Sprite_NpSuper.prototype.update_vp = function(inp) {
        var s = this._set;
        if (inp.ok || inp.tap) {
            var off = Math.abs(((this._ang - this._zc + 540) % 360) - 180);
            var hit = off <= s.arc / 2;
            if (hit) { this._hits++; this._prec += 1 - off / (s.arc / 2); se('Absorb1', 80, 110 + this._hits * 10); } else se('Buzzer1', 70, 100);
            this._marks.push(hit); this._stop++;
            if (this._stop >= 3) { this.draw_vp(); this.finishQte($.scoreVp(this._hits, this._prec), { hits: this._hits }); return; }
            this.newZone();
        }
        var step = 360 / s.rev;
        this._ang = (this._ang + step) % 360; this._idle += step;
        if (this._idle >= 720) { this._marks.push(false); this._stop++; se('Buzzer1', 60, 80);
            if (this._stop >= 3) { this.draw_vp(); this.finishQte($.scoreVp(this._hits, this._prec), { hits: this._hits }); return; }
            this.newZone(); }
        this.draw_vp();
    };

    // ------------------------------------------------------------------ charge bar layer
    function csdm() { return (typeof $CSDM !== 'undefined' && $CSDM) ? $CSDM : null; }
    function winRect(w) {
        var c = csdm(), sx = c.ScaleX || 1, sy = c.ScaleY || 1;
        return { x: (c.X || 0) + w.X * sx, y: (c.Y || 0) + w.Y * sy, w: (w.Width || 200) * sx, h: (w.Height || 220) * sy };
    }
    function Sprite_NpSuperBars() { this.initialize.apply(this, arguments); }
    Sprite_NpSuperBars.prototype = Object.create(Sprite.prototype);
    Sprite_NpSuperBars.prototype.constructor = Sprite_NpSuperBars;
    window.Sprite_NpSuperBars = Sprite_NpSuperBars;
    Sprite_NpSuperBars.prototype.initialize = function() { Sprite.prototype.initialize.call(this); this._bars = {}; this._tick = 0; };
    Sprite_NpSuperBars.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this._tick++;
        try { $.mapTick(); this.updateBars(); } catch (e) { console.warn('[NP_SuperAttack] bars', e); }
    };
    $.BAR_W = 204; $.BAR_H = 14;
    Sprite_NpSuperBars.prototype.updateBars = function() {
        var c = csdm(), on = !!c && c.Visible && gs(S_BATTLE) && !gs(S_GALLERY) && !$._qte;
        var seen = {}, self = this;
        var wins = c ? [c.WindowMC, c.WindowFeMC, c.WindowFollower].filter(function(w) { return w; }) : [];
        wins.forEach(function(w) {
            if (!on || !w.Visible || !w.Actor || !w.Actor.actorId) return;
            var aid = w.Actor.actorId(); if (!KIND[aid]) return;
            var r = winRect(w); seen[aid] = true;
            var s = self._bars[aid];
            if (!s) { s = self._bars[aid] = new Sprite(new Bitmap($.BAR_W, $.BAR_H)); s._key = ''; self.addChild(s); }
            var v = Math.floor($.charge(aid)), full = v >= 100, ok = full && $.reason(aid) === null;
            var key = v + '|' + ok + '|' + (typeof NP_Language !== 'undefined' && NP_Language.isEn && NP_Language.isEn() ? 'en' : 'ru');
            if (s._key !== key) { s._key = key; drawCharge(s.bitmap, v, ok, KIND[aid]); }
            s.x = Math.round(r.x + (r.w - $.BAR_W) / 2); s.y = Math.round(r.y - 26 - $.BAR_H - 2);
            s.visible = true;
            s.opacity = full ? 190 + Math.round(65 * Math.sin(self._tick / 7)) : 235;
        });
        Object.keys(this._bars).forEach(function(k) { if (!seen[k]) self._bars[k].visible = false; });
    };
    function drawCharge(b, v, ok, kind) {
        var w = b.width, h = b.height, col = COLORS[kind]; b.clear();
        b.fillRect(0, 0, w, h, 'rgba(0,0,0,0.75)');
        var fw = Math.round((w - 4) * v / 100);
        if (v >= 100) b.gradientFillRect(2, 2, fw, h - 4, ok ? '#fff6b0' : '#a0a0a0', ok ? '#ffb000' : '#606060');
        else b.gradientFillRect(2, 2, fw, h - 4, col[1], col[0]);
        b.fontSize = 11; b.outlineWidth = 3; b.outlineColor = 'rgba(0,0,0,1)'; b.textColor = '#ffffff';
        var t = v >= 100 ? (ok ? NP_L('СУПЕР ГОТОВ', 'SUPER READY') : NP_L('СУПЕР: мало сил', 'SUPER: tired')) : NP_L('Супер ', 'Super ') + v + '%';
        b.drawText(t, 0, 0, w, h, 'center');
    }
    if (typeof Scene_Map !== 'undefined') {
        var _caw = Scene_Map.prototype.createAllWindows;
        Scene_Map.prototype.createAllWindows = function() {
            _caw.apply(this, arguments);
            this._npSuperBars = new Sprite_NpSuperBars();
            this.addChild(this._npSuperBars);
            $.preload();
        };
    }

    // ------------------------------------------------------------------ command label (NP_PowerStrike label sprite)
    if (typeof NP_PowerStrike !== 'undefined' && NP_PowerStrike.labelFor) {
        var _lf = NP_PowerStrike.labelFor;
        NP_PowerStrike.labelFor = function(text) {
            var m = /^\\i\[(\d+)\]\s*$/i.exec(String(text || '').trim());
            if (m && Number(m[1]) === $.ICON) {
                var aid = curActor(), k = KIND[aid];
                if (!k) return null;
                var r = $.reason(aid);
                return $.NAMES[k]() + (r && r !== 'none' ? ' (' + r + ')' : ' ★');
            }
            return _lf.apply(this, arguments);
        };
    }
})();
