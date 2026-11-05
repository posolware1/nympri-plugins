//=============================================================================
// NP_Items.js  —  [RU mod] new items, affixes, quest rewards, shop stock
//=============================================================================
/*:
 * @plugindesc [RU mod] New items: companion weapons, accessories, tools, curses, affixes 401-405/501-503, Holy Water (load after NP_SuperAttack/NP_Stress/NP_ClothDamage/NP_CampSkills, before NP_OptionsCategories)
 * @author RU mod
 *
 * @help
 * Effects are keyed by note tags written by the items build:
 *   <NP_ITEM:key>   unique item behaviour (weapons / armors / items)
 *   <NP_AFFIX:key>  DreamX prefix/suffix behaviour (merged into the note)
 *   <NP_CURSED>     the item can't be unequipped (Scroll of Cleansing)
 * Battle items: injected at the top of CE350 (NP_Items.battleItem).
 * No boss / enemy data is changed. Everything degrades gracefully when an
 * actor (e.g. Yarizo, 21) is absent.
 */
var NP_Items = (function() {
    'use strict';
    var $ = {};
    $.VERSION = '1.0';
    var HERO = 1, PRI = 2, PM = 10, VP = 19, YAR = 21;
    var S_BATTLE = 14, S_BOSS = 15, S_GALLERY = 5, S_MAGIC = 17;
    var V_EID = 121, V_EMHP = 122, V_EHP = 123, V_ENAME = 139, V_ITEM = 155, V_USER = 270,
        V_CH = 12, V_RANK = 9, V_LUST = 82, V_LOVE = 83;

    function gv(i) { return ($gameVariables && Number($gameVariables.value(i))) || 0; }
    function gs(i) { return !!($gameSwitches && $gameSwitches.value(i)); }
    function L(ru, en) { return typeof NP_L === 'function' ? NP_L(ru, en) : ru; }
    function rnd() { return Math.random(); }
    function dice(n, s) { var t = 0; for (var i = 0; i < n; i++) t += Math.floor(Math.random() * s) + 1; return t; }
    function mlog(t) {
        try { if (typeof show_map_log_window === 'function') show_map_log_window(); } catch (e) {}
        try { if (typeof set_mlog === 'function') set_mlog(t); } catch (e) {}
    }
    function actor(id) { return $gameActors ? $gameActors.actor(id) : null; }
    function partyIds() { try { return $gameParty.members().map(function(m) { return m.actorId(); }); } catch (e) { return []; } }
    function inParty(id) { return partyIds().indexOf(id) >= 0; }
    function baseId(item) { return item ? (item.baseItemId || item.id) : 0; }

    // ------------------------------------------------------------------ state
    $.data = function() {
        if (!$gameSystem) return null;
        var d = $gameSystem._npItems;
        if (!d) d = $gameSystem._npItems = {};
        d.dropped = d.dropped || {}; d.quests = d.quests || {};
        if (d.sleep == null) d.sleep = 0;
        return d;
    };
    $.B = function() {      // battle-scoped flags
        if (!$gameTemp) return {};
        return $gameTemp._npItB || ($gameTemp._npItB = { focus: false, sling: {}, medal: {}, conf: {} });
    };

    // ------------------------------------------------------------------ tags
    var reItem = /<NP_ITEM:\s*(\w+)\s*>/g, reAffix = /<NP_AFFIX:\s*(\w+)\s*>/g;
    $.tagsOf = function(item) {
        if (!item) return {};
        if (item._npTags && item._npTagsNote === item.note + "\u0001" + item.name) return item._npTags;
        var t = {}, m, note = String(item.note || '');
        reItem.lastIndex = 0; while ((m = reItem.exec(note))) t[m[1]] = true;
        reAffix.lastIndex = 0; while ((m = reAffix.exec(note))) t['a_' + m[1]] = true;
        if (/<NP_CURSED>/.test(note)) t.cursed = true;
        // affix by name (DreamX items made before this mod have no merged note)
        if (item.baseItemId && item.name && $.affixNames()) {
            var af = $.affixOfName(item.name);
            (af.pre || []).concat(af.suf || []).forEach(function(k) { t['a_' + k] = true; });
        }
        try { Object.defineProperty(item, '_npTags', { value: t, writable: true, configurable: true, enumerable: false });
              Object.defineProperty(item, '_npTagsNote', { value: item.note + "\u0001" + item.name, writable: true, configurable: true, enumerable: false }); } catch (e) {}
        return t;
    };
    $.AFFIX_NAMES = null;
    // {pre:[keys]|null, suf:[keys]|null} from a generated name "Prefix Base Suffix" (multi-word affix names ok)
    $.affixOfName = function(name) {
        var A = $.affixNames(), r = { pre: null, suf: null };
        name = String(name || '').trim().replace(/\s*[\[［][^\]］]+[\]］]\s*$/, '');   // drop gem suffix
        if (!A) return r;
        for (var p in A.pre) if (name.length > p.length && name.indexOf(p + ' ') === 0) { r.pre = A.pre[p]; break; }
        for (var q in A.suf) if (name.length > q.length && name.slice(-(q.length + 1)) === ' ' + q) { r.suf = A.suf[q]; break; }
        return r;
    };
    function buildAffixNames() {
        if (!window.$dataWeapons) return;
        var pre = ($.AFFIX_NAMES && $.AFFIX_NAMES.pre) || {}, suf = ($.AFFIX_NAMES && $.AFFIX_NAMES.suf) || {};
        function add(map, id) {
            var w = $dataWeapons[id]; if (!w) return;
            var keys = [], m; reAffix.lastIndex = 0;
            while ((m = reAffix.exec(String(w.note || '')))) keys.push(m[1]);
            if (!keys.length) return;
            [w.name, w.meta && w.meta.E_name].forEach(function(n) { if (n) map[String(n).trim()] = keys; });
        }
        [401, 402, 403, 404, 405].forEach(function(i) { add(pre, i); });
        [501, 502, 503].forEach(function(i) { add(suf, i); });
        $.AFFIX_NAMES = { pre: pre, suf: suf };
        $._affixSeen = $dataWeapons[401] && $dataWeapons[401].name;
    }
    // names are translated by KNS_CsvReader/NP_L after DB load: merge every language seen this session
    $.affixNames = function() {
        var w = window.$dataWeapons && $dataWeapons[401];
        if (!$.AFFIX_NAMES || (w && w.name !== $._affixSeen)) { try { buildAffixNames(); } catch (e) {} }
        return $.AFFIX_NAMES;
    };
    // does the actor wear an item with tag?  (slotFilter: 'w' weapons only)
    $.wears = function(aid, tag, weaponsOnly) {
        var a = typeof aid === 'object' ? aid : actor(aid);
        if (!a || !a.equips) return false;
        var eq = weaponsOnly ? a.weapons() : a.equips();
        for (var i = 0; i < eq.length; i++) if (eq[i] && $.tagsOf(eq[i])[tag]) return true;
        return false;
    };
    $.partyWears = function(tag) {
        return partyIds().some(function(id) { return $.wears(id, tag); });
    };
    $.isCursed = function(item) { return !!(item && $.tagsOf(item).cursed); };
    $.keyOf = function(item) {
        var t = $.tagsOf(item);
        for (var k in t) if (k !== 'cursed' && k.indexOf('a_') !== 0) return k;
        return null;
    };

    function holyTarget() {
        if (typeof $weak_holy !== 'undefined' && $weak_holy == 1) return true;
        var g = Math.floor(gv(V_EID) / 100);
        return g === 5 || g === 7 || g === 9;
    }
    function eTag() { return '\\c[2]([' + String($gameVariables.value(V_ENAME) || '') + ']HP:' + gv(V_EHP) + '/' + gv(V_EMHP) + ')'; }
    function stName(id) { var s = window.$dataStates && $dataStates[id]; return s ? '\\I[' + s.iconIndex + ']' + s.name : ''; }
    function iName(item) { return item ? '\\I[' + item.iconIndex + ']' + item.name : ''; }
    function stressOn() { return !!(window.NP_Stress && NP_Stress.active && NP_Stress.active()); }
    function stressAdd(aid, n, tag, why) { try { if (stressOn() && actor(aid)) return NP_Stress.add(aid, n, tag || 'misc', why); } catch (e) {} return 0; }
    function sup() { return window.NP_Super || null; }
    function supKind(aid) { var S = sup(); return !!(S && S.KIND && S.KIND[aid]); }
    function addCharge(aid, v) {
        var S = sup(); if (!S || !supKind(aid) || !inParty(aid)) return 0;
        var b = S.charge(aid); S.setCharge(aid, b + v); return S.charge(aid) - b;
    }
    function anim(interp, n) {
        try {
            if (!interp || !interp.character || gs(S_GALLERY)) return;
            var ch = interp.character(0);
            if (ch && ch.requestAnimation && window.$dataAnimations && $dataAnimations[n]) {
                ch.requestAnimation(n); interp._character = ch; interp.setWaitMode('animation');
            }
        } catch (e) {}
    }

    // ================================================================== battle items (CE350)
    $.REFUNDABLE = [10, 11, 12, 13, 14, 35, 36, 40];
    $._inItem = false;
    $.battleItem = function(interp) {
        var id = gv(V_ITEM), uid = gv(V_USER), item = window.$dataItems && $dataItems[id];
        if (!item) return false;
        var key = $.keyOf(item), handled = false, refunded = false;
        var enemy = actor(100), boss = gs(S_BOSS), belt = uid === PM && $.wears(PM, 'flaskbelt');
        $._inItem = true;
        try {
            if (key === 'pepper') {
                handled = true;
                anim(interp, 51);
                if (boss && rnd() >= 0.5) {
                    mlog(L('[' + $gameVariables.value(V_ENAME) + '] отмахивается от перца.', '[' + $gameVariables.value(V_ENAME) + '] shrugs off the pepper.'));
                } else if (enemy) {
                    var t = (boss ? 2 : 3) + (belt ? 1 : 0);
                    enemy.addState(3);
                    window.$enemy_state_blind = Math.max(Number(window.$enemy_state_blind) || 0, t);
                    mlog('\\c[17][' + $gameVariables.value(V_ENAME) + '] + ' + stName(3) + ' (' + (t - 1) + L(' ход.', ' turn(s)') + ')');
                }
            } else if (key === 'focus') {
                handled = true;
                var B = $.B(), S = sup(), who = 0;
                if (!B.focus && S) {
                    if (supKind(uid) && inParty(uid) && S.charge(uid) < 100) who = uid;
                    else {
                        var best = -1;
                        partyIds().forEach(function(pid) {
                            var a = actor(pid);
                            if (supKind(pid) && a && a.hp > 0 && S.charge(pid) < 100 && S.charge(pid) > best) { best = S.charge(pid); who = pid; }
                        });
                    }
                }
                if (who) {
                    B.focus = true;
                    var got = addCharge(who, 35);
                    anim(interp, 40);
                    mlog('\\c[17]' + L('【Сосредоточение】 ', '【Focus】 ') + actor(who).name() + L(': заряд супер-удара +', ': super charge +') + Math.round(got) + '%');
                } else {
                    $gameParty.gainItem(item, 1); refunded = true;
                    mlog(L(B.focus ? 'Эликсир уже выпит в этом бою — склянка возвращена.' : 'Некому сосредоточиться — склянка возвращена.',
                           B.focus ? 'An elixir was already used this battle — flask returned.' : 'Nobody can focus — flask returned.'));
                }
            } else if (key === 'holy' || id === 40) {
                handled = true;
                var holy = holyTarget();
                var dmg = holy ? dice(2, 6) + (belt ? 2 : 0) : 1;
                $gameVariables.setValue(V_EHP, Math.max(0, gv(V_EHP) - dmg));
                anim(interp, 75);
                mlog(holy ? L('\\c[24]Святая вода жжёт нечисть! \\c[2]' + dmg + '\\c[0] урона', '\\c[24]Holy water sears the unholy! \\c[2]' + dmg + '\\c[0] damage')
                          : L('Святая вода лишь брызгает: \\c[2]1\\c[0] урона', 'Holy water just splashes: \\c[2]1\\c[0] damage'));
                mlog(eTag());
            }
            if (!refunded && belt && $.REFUNDABLE.indexOf(id) >= 0 && rnd() < 0.25) {
                $gameParty.gainItem(item, 1);
                mlog('\\c[24]' + L('【Пояс склянок】 ', '【Flask Belt】 ') + L('склянка цела: ', 'flask saved: ') + iName(item));
            }
        } catch (e) { console.error('[NP_Items] battleItem', e); }
        $._inItem = false;
        return handled;
    };
    $.injectCE350 = function() {
        var ce = window.$dataCommonEvents && $dataCommonEvents[350];
        if (!ce || !ce.list) return;
        if (ce.list.some(function(c) { return c && c.npItems; })) return;
        var inj = [
            { code: 111, indent: 0, parameters: [12, 'NP_Items.battleItem(this)'] },
            { code: 119, indent: 1, parameters: ['終了'] },
            { code: 0, indent: 1, parameters: [] },
            { code: 412, indent: 0, parameters: [] }
        ];
        inj.forEach(function(c) { c.npItems = true; });
        var at = (ce.list[0] && ce.list[0].code === 355) ? 1 : 0;      // after console.log
        Array.prototype.splice.apply(ce.list, [at, 0].concat(inj));
    };
    var _dbLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        var ok = _dbLoaded.apply(this, arguments);
        if (ok && !$._injected) {
            $._injected = true;
            try { $.injectCE350(); } catch (e) { console.error('[NP_Items] inject', e); }
            try { buildAffixNames(); } catch (e) {}
        }
        return ok;
    };

    // ================================================================== on-hit (normal attacks)
    var _gvSet = Game_Variables.prototype.setValue;
    $._hitGuard = false;
    Game_Variables.prototype.setValue = function(id, value) {
        if (id === V_LUST) {
            try {
                var oldL = Number(this._data[V_LUST] || 0), nvL = Number(value);
                if (nvL > oldL && inParty(PRI) && $.wears(PRI, 'ring')) {
                    var d = (nvL - oldL) * 0.8, base = Math.floor(d);
                    value = oldL + base + (rnd() < d - base ? 1 : 0);
                }
            } catch (e) {}
            return _gvSet.call(this, id, value);
        }
        if (id !== V_EHP) return _gvSet.apply(this, arguments);
        var old = Number(this._data[V_EHP] || 0);
        _gvSet.apply(this, arguments);
        if ($._hitGuard || $._inItem) return;
        try {
            var nv = Number(this._data[V_EHP] || 0), mhp = Number(this._data[V_EMHP] || 0), delta = old - nv;
            if (!(delta > 0) || !(mhp > 0) || old > mhp) return;
            if (!gs(S_BATTLE) || gs(S_GALLERY) || gs(S_MAGIC)) return;
            if (window.$using_item == 1 || window.$using_skill == 1 || window.$item_attack == 1) return;
            var S = sup(); if (S && (S.running || S._dotTick)) return;
            var who = Number(this._data[V_USER] || 0);
            if (!(who > 0 && who < 100)) return;
            $._hitGuard = true;
            try { $.onHit(who, nv); } finally { $._hitGuard = false; }
        } catch (e) { console.warn('[NP_Items] onHit', e); $._hitGuard = false; }
    };
    $.onHit = function(who, hpAfter) {
        var a = actor(who); if (!a) return;
        var w = a.weapons(), t = {};
        w.forEach(function(x) { var tt = $.tagsOf(x); for (var k in tt) t[k] = true; });
        var enemy = actor(100), boss = gs(S_BOSS), alive = hpAfter > 0, extra = 0, parts = [];
        if (alive && holyTarget()) {
            if (t.censer) { var c = dice(1, 6); extra += c; parts.push(L('дым кадила +', 'censer smoke +') + c); }
            if (t.a_holy) { var h = dice(1, 3); extra += h; parts.push(L('освящение +', 'sanctified +') + h); }
        }
        if (extra > 0) {
            $gameVariables.setValue(V_EHP, Math.max(0, gv(V_EHP) - extra));
            mlog('\\c[24]' + parts.join(', ')); mlog(eTag());
            alive = gv(V_EHP) > 0;
        }
        if (alive && enemy && t.sling && rnd() < 0.2) {
            enemy.addState(2);
            window.$enemy_state_poison = Math.max(Number(window.$enemy_state_poison) || 0, 3);
            mlog('\\c[17][' + $gameVariables.value(V_ENAME) + '] + ' + stName(2));
        }
        if (alive && enemy && t.a_stun && !boss && rnd() < 0.08) {
            enemy.addState(8);
            window.$enemy_state_stun = Math.max(Number(window.$enemy_state_stun) || 0, 1);
            mlog('\\c[17][' + $gameVariables.value(V_ENAME) + '] + ' + stName(8));
        }
        var heal = (t.moonbook ? 1 : 0) + (t.a_vamp ? 1 : 0);
        if (heal && a.hp > 0 && a.hp < a.mhp) { heal = Math.min(heal, a.mhp - a.hp); a.gainHp(heal); mlog('\\c[18]' + a.name() + ' +' + heal + ' HP'); }
        if (t.hunger) {
            if (stressOn()) stressAdd(who, 3, 'misc', L('клинок голода', 'hunger blade'));
            else if (a.hp > 1) { a.gainHp(-1); mlog('\\c[2]' + L('【Клинок голода】 пьёт кровь владельца: −1 HP', '【Hunger Blade】 drinks its wielder\'s blood: −1 HP')); }   // stress option off: the curse still bites
        }
        if (!alive && t.a_calm) stressAdd(who, -2, 'misc', L('покой', 'calm'));
    };

    // ================================================================== switches: battle start/end
    var _gsSet = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(id, value) {
        var old = id === S_BATTLE ? !!this._data[id] : null;
        _gsSet.apply(this, arguments);
        if (id !== S_BATTLE) return;
        try {
            var now = !!this._data[id];
            if (now && !old) { if ($gameTemp) $gameTemp._npItB = null; }
            if (!now && old) {
                var d = $.data(); if (d && d.sleep > 0 && !gs(S_GALLERY)) d.sleep--;
                if ($gameTemp) $gameTemp._npItB = null;
            }
        } catch (e) {}
    };

    // ================================================================== NP_Super hooks
    $.hookSuper = function() {
        var S = sup(); if (!S || S._npItemsHooked) return;
        S._npItemsHooked = true;
        var _gain = S.gain;
        S.gain = function(aid, v) {
            try {
                if (v > 0) {
                    var m = 1;
                    if ($.wears(aid, 'rage')) m *= 1.2;
                    if ($.wears(aid, 'a_fury', true)) m *= 1.15;
                    if ($._hurtAid === aid && $.wears(aid, 'bearclaw', true)) m *= 1.25;
                    v *= m;
                }
            } catch (e) {}
            return _gain.call(this, aid, v);
        };
        var _cost = S.cost;
        S.cost = function(aid) {
            var c = _cost.apply(this, arguments);
            try {
                var who = aid || $._costAid || (S.curActor ? S.curActor() : 0);
                if (who && $.wears(who, 'rage')) c += 10;
            } catch (e) {}
            return c;
        };
        var _reason = S.reason;
        S.reason = function(aid) {
            var prev = $._costAid; $._costAid = aid;
            try { return _reason.apply(this, arguments); } finally { $._costAid = prev; }
        };
        var _cd = S.computeDamage;
        S.computeDamage = function(aid, res) {
            var c = _cd.apply(this, arguments);
            try {
                if (c && $.wears(aid, 'gamble')) {
                    if ((res && res.extra && res.extra.miss) || (res && res.q < 0.25)) { c.dmg = 1; c.gambleLost = true; }
                    else { c.dmg = Math.ceil(c.dmg * 1.3); c.mult *= 1.3; }
                }
            } catch (e) {}
            return c;
        };
        var _res = S.resolve;
        S.resolve = function(interp) {
            var aid = 0, B = $.B();
            try {
                aid = S.curActor ? S.curActor() : gv(V_USER);
                var r = S.result;
                if (r && r.kind === 'pm' && r.extra && r.extra.miss && !B.sling[aid] && $.wears(aid, 'sling', true)) {
                    B.sling[aid] = true; r.extra.miss = false; r.q = Math.max(r.q || 0, 0.3);
                    mlog('\\c[24]' + L('【Праща алхимика】 Промах прощён — склянка всё же долетела!', "【Alchemist's Sling】 Miss forgiven — the flask still lands!"));
                }
            } catch (e) {}
            var out = _res.apply(this, arguments);
            try {
                aid = (out && out.aid) || aid;
                if (out && out.stun && !gs(S_BOSS) && $.wears(aid, 'bearclaw', true) && gv(V_EHP) > 0) {
                    out.stun += 1;
                    window.$enemy_state_stun = Math.max(Number(window.$enemy_state_stun) || 0, out.stun);
                    mlog('\\c[17]' + L('【Медвежий коготь】 оглушение +1 ход', '【Bear Claw】 stun +1 turn'));
                }
                if (out && out.steal && $.wears(aid, 'moonbook', true)) {
                    var d = S.data();
                    if (d && out.steal !== B.moon) {
                        d.steal = Math.min(0.5, out.steal * 1.2); B.moon = d.steal; out.steal = d.steal;
                        mlog('\\c[18]' + L('【Колыбельная луны】 вытягивание: ', '【Moon Lullaby】 drain: ') + Math.round(d.steal * 100) + '%');
                    }
                }
                if (out && $.wears(aid, 'gamble') && (out.miss || out.q < 0.25 || out.dmg === 1)) {
                    stressAdd(aid, 10, 'misc', L('кольцо азарта', "gambler's ring"));
                    mlog('\\c[2]' + L('【Кольцо азарта】 удача отвернулась (+10 напряжения)', "【Gambler's Ring】 luck turned away (+10 stress)"));
                }
            } catch (e) { console.warn('[NP_Items] resolve', e); }
            return out;
        };
    };

    // ================================================================== setHp (bear claw flag, plush bat, confession staff)
    if (typeof Game_BattlerBase !== 'undefined') {
        var _setHp = Game_BattlerBase.prototype.setHp;
        Game_BattlerBase.prototype.setHp = function(hp) {
            var isA = this.isActor && this.isActor(), old = this._hp;
            var prevHurt = $._hurtAid;
            if (isA) $._hurtAid = this.actorId();
            try { _setHp.apply(this, arguments); } finally { $._hurtAid = prevHurt; }
            if (!isA || !gs(S_BATTLE) || gs(S_GALLERY)) return;
            try {
                var id = this.actorId(), nv = this._hp;
                if (!inParty(id)) return;
                if (old > 0 && nv <= 0 && id !== VP) {
                    var vp = actor(VP);
                    if (vp && vp.hp > 0 && inParty(VP) && $.wears(VP, 'plush')) {
                        var g = addCharge(VP, 15); stressAdd(VP, -5, 'misc', L('плюшевая мышь', 'plush bat'));
                        mlog('\\c[18]' + L('【Плюшевая летучая мышь】 ', '【Plush Bat】 ') + vp.name() + L(' собирается с духом', ' gathers her courage') + (g ? ' (+' + Math.round(g) + '%)' : ''));
                    }
                }
                if (nv > old && old > 0 && gv(V_USER) === PRI && $.wears(PRI, 'confession', true) && stressOn()) {
                    var B = $.B(), used = B.conf[id] || 0;
                    if (used < 15 && NP_Stress.get(id) > 0) {
                        var r = stressAdd(id, -Math.min(5, 15 - used), 'misc', L('исповедь', 'confession'));
                        if (r) { B.conf[id] = used - r; }
                    }
                }
            } catch (e) {}
        };
    }

    // ================================================================== NP_Stress hooks
    $.hookStress = function() {
        var St = window.NP_Stress; if (!St || St._npItemsHooked) return;
        St._npItemsHooked = true;
        var _add = St.add;
        St.add = function(aid, n, tag, why) {
            try { if (n > 0 && $.wears(aid, 'rosary')) n = n * 0.75; } catch (e) {}
            return _add.call(this, aid, n, tag, why);
        };
        var _br = St.doBreak;
        St.doBreak = function(aid, why, forceKind, forceId) {
            try {
                if (!forceKind && gs(S_BATTLE) && $.wears(aid, 'medallion')) {
                    var B = $.B();
                    if (!B.medal[aid]) {
                        B.medal[aid] = true;
                        if (rnd() < 0.3) { forceKind = 'v'; mlog('\\c[24]' + L('【Медальон стойкости】', '【Medallion of Fortitude】')); }
                    }
                }
            } catch (e) {}
            return _br.call(this, aid, why, forceKind, forceId);
        };
        var _mo = St.morning;
        St.morning = function(where) {
            var r = _mo.apply(this, arguments);
            try { $.onRest(where); } catch (e) { console.warn('[NP_Items] rest', e); }
            return r;
        };
    };
    $.onRest = function(where) {
        var d = $.data(); if (!d || gs(S_GALLERY)) return;
        d.tea = false; d.wood = false;
        // Oath: a gift from the Priestess, once, at an inn, when the bond is strong
        if (!d.oath && where === 'inn' && gv(V_LOVE) >= 60 && gv(V_CH) >= 2 && inParty(HERO) && inParty(PRI) && window.$dataWeapons && $dataWeapons[26]) {
            d.oath = true;
            $gameParty.gainItem($dataWeapons[26], 1);
            var txt = L('Утром жрица протягивает вам меч «Обет»: «Возьми. Я хочу, чтобы он берёг тебя».',
                        'In the morning the Priestess hands you the sword "Oath": "Take it. I want it to keep you safe."');
            try { if (window.NP_Stress && NP_Stress.toast) NP_Stress.toast(txt, 'v'); } catch (e) {}
            try { if (window.$LogWindow && $LogWindow.Add) $LogWindow.Add(iName($dataWeapons[26]) + ' ×1'); } catch (e) {}
        }
    };

    // ================================================================== equipment params (Oath, Sound Sleep)
    if (Game_Actor.prototype.knsGetSpecialParameterData) {
        var _ksp = Game_Actor.prototype.knsGetSpecialParameterData;
        Game_Actor.prototype.knsGetSpecialParameterData = function(key, types) {
            var arr = _ksp.apply(this, arguments);
            try {
                var tps = types || (window.KNS_EquipParameter && KNS_EquipParameter.getAllEquipTypes ? KNS_EquipParameter.getAllEquipTypes() : [1, 2]);
                var has = function(t) { return tps.indexOf ? tps.indexOf(t) >= 0 : false; };
                if (key === 'DMG' && has(1) && this.actorId() === HERO && inParty(PRI) && $.wears(this, 'oath', true)) {
                    var b = Math.min(3, Math.floor(gv(V_LOVE) / 30));
                    if (b > 0) { arr = arr.slice(); arr.push(String(b)); }
                }
                if (key === 'Armor' && has(2) && $gameSystem && $gameSystem._npItems && $gameSystem._npItems.sleep > 0 && inParty(this.actorId())) {
                    arr = arr.slice(); arr.push('1');
                }
            } catch (e) {}
            return arr;
        };
    }

    // ================================================================== Safety Pin (cloth thresholds)
    $.hookCloth = function() {
        var C = window.NP_ClothDamage; if (!C || !C.P || C._npItemsHooked) return;
        C._npItemsHooked = true;
        var base = C.P.thr;
        try {
            Object.defineProperty(C.P, 'thr', {
                configurable: true, enumerable: true,
                get: function() {
                    try {
                        if ($gameActors && $.wears(PRI, 'pin')) {
                            if (base.join(',') === '4,10,18') return [6, 13, 22];
                            return base.map(function(x) { return Math.round(x * 1.3); });
                        }
                    } catch (e) {}
                    return base;
                },
                set: function(v) { base = v; }
            });
        } catch (e) {}
    };

    // ================================================================== Campfire Amulet
    $.hookCamp = function() {
        var C = window.NP_Camp; if (!C || !C.open || C._npItemsHooked) return;
        C._npItemsHooked = true;
        var _open = C.open;
        C.open = function(interp, where) {
            var ok = _open.apply(this, arguments);
            try { if (ok && C.session && $.partyWears('campamulet')) { C.session.points++; C.session.max++; C.session.npAmulet = true; } } catch (e) {}
            return ok;
        };
    };

    // ================================================================== curses
    var _ecOk = Game_Actor.prototype.isEquipChangeOk;
    Game_Actor.prototype.isEquipChangeOk = function(slotId) {
        if (!_ecOk.apply(this, arguments)) return false;
        var it = this.equips()[slotId];
        return !$.isCursed(it);
    };
    // a cursed item already worn can't be replaced by picking a new one either
    var _wesEnabled = Window_EquipItem.prototype.isEnabled;
    Window_EquipItem.prototype.isEnabled = function(item) {
        try { if (this._actor && this._slotId >= 0 && $.isCursed(this._actor.equips()[this._slotId])) return false; } catch (e) {}
        return _wesEnabled.apply(this, arguments);
    };
    $.cursedSlots = function() {
        var r = [];
        $gameParty.members().forEach(function(a) {
            a.equips().forEach(function(it, i) { if ($.isCursed(it)) r.push({ a: a, slot: i, item: it }); });
        });
        return r;
    };

    // ================================================================== menu items
    $.MAP_KEYS = { tea: 1, firewood: 1, patches: 1, rod: 1, lure: 1, cleanse: 1 };
    function nearestEvent(test) {
        if (!$gameMap || !$gamePlayer) return null;
        var px = $gamePlayer.x, py = $gamePlayer.y, best = null, bd = 1e9;
        $gameMap.events().forEach(function(ev) {
            if (!ev || ev._erased || !test(ev)) return;
            var d = Math.abs(ev.x - px) + Math.abs(ev.y - py);
            if (d < bd) { bd = d; best = ev; }
        });
        return best ? { ev: best, d: bd } : null;
    }
    function evName(ev) { var e = ev && ev.event && ev.event(); return e ? String(e.name || '') : ''; }
    function isChest(ev) {
        if (evName(ev).indexOf('宝箱') < 0) return false;
        return !$gameSelfSwitches.value([$gameMap.mapId(), ev.eventId(), 'A']);
    }
    function isEnemyEv(ev) { return /^enemyID\s*[:：]/.test(evName(ev)) && ev.page && ev.page() && !ev._npLured; }
    function dirText(dx, dy) {
        var ru = ['восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад', 'север', 'северо-восток'];
        var en = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
        var a = Math.atan2(dy, dx), k = (Math.round(a / (Math.PI / 4)) + 8) % 8;
        return L(ru[k], en[k]);
    }
    $.canUseMap = function(key) {
        var d = $.data(); if (!d) return false;
        if (gs(S_BATTLE)) return false;
        switch (key) {
            case 'tea': return !d.tea && stressOn();
            case 'firewood': return !d.wood;
            case 'patches': return !!(window.NP_ClothDamage && NP_ClothDamage.level && NP_ClothDamage.level() > 0);
            case 'rod': return !!$gameMap && d.rodMap !== $gameMap.mapId() + ':' + ($gameMap._npVisit || 0);
            case 'lure': return !!nearestEvent(isEnemyEv);
            case 'cleanse': return $.cursedSlots().length > 0;
        }
        return true;
    };
    var _muc = Game_BattlerBase.prototype.meetsUsableItemConditions;
    Game_BattlerBase.prototype.meetsUsableItemConditions = function(item) {
        if (!_muc.apply(this, arguments)) return false;
        try {
            if (DataManager.isItem(item)) {
                var k = $.keyOf(item);
                if (k && $.MAP_KEYS[k]) return $.canUseMap(k);
            }
        } catch (e) {}
        return true;
    };
    $.say = function(text) {
        try { var s = SceneManager._scene; if (s && s._helpWindow) s._helpWindow.setText(text); } catch (e) {}
        try { if (window.NP_Stress && NP_Stress.toast) NP_Stress.toast(text.replace(/\n/g, ' '), 'v'); } catch (e) {}
        $.lastSay = text;
    };
    $.useMap = function(key) {
        var d = $.data(); if (!d) return;
        if (key === 'tea') {
            d.tea = true; NP_Stress.addAll(-15, 'rest', L('чай', 'tea'));
            $.say(L('Отряд пьёт тёплый чай. Напряжение −15.', 'The party sips warm tea. Stress −15.'));
        } else if (key === 'firewood') {
            d.wood = true; d.sleep = 3;
            if (stressOn()) NP_Stress.addAll(-10, 'rest', L('дрова', 'firewood'));
            $.say(L('Дрова пахнут смолой. Напряжение −10, «Крепкий сон»: броня +1 на 3 боя.', 'The wood smells of resin. Stress −10, Sound Sleep: Armor +1 for 3 battles.'));
        } else if (key === 'patches') {
            var lv = NP_ClothDamage.level();
            NP_ClothDamage.set(lv - 1);
            $.say(L('Наряд аккуратно заштопан (ступень порчи ' + lv + ' → ' + (lv - 1) + ').', 'The outfit is neatly mended (damage stage ' + lv + ' → ' + (lv - 1) + ').'));
        } else if (key === 'rod') {
            d.rodMap = $gameMap.mapId() + ':' + ($gameMap._npVisit || 0);
            var n = nearestEvent(isChest);
            if (!n) $.say(L('Лоза не дрогнула: здесь нет неоткрытых сундуков.', 'The rod stays still: no unopened chests here.'));
            else $.say(L('Лоза тянет на ' + dirText(n.ev.x - $gamePlayer.x, n.ev.y - $gamePlayer.y) + ', шагов ~' + n.d + '.',
                         'The rod pulls ' + dirText(n.ev.x - $gamePlayer.x, n.ev.y - $gamePlayer.y) + ', ~' + n.d + ' steps.'));
        } else if (key === 'lure') {
            var e = nearestEvent(isEnemyEv);
            if (e) { e.ev._npLure = 600; e.ev._npLured = true; }
            $.say(L('Запах манка расползается по округе… Кто-то идёт.', 'The lure scent spreads… something is coming.'));
        } else if (key === 'cleanse') {
            var list = $.cursedSlots(), names = [];
            list.forEach(function(c) { c.a.changeEquip(c.slot, null); names.push(c.item.name); });
            $.say(L('Проклятие снято: ', 'Curse lifted: ') + names.join(', '));
        }
    };
    var _useItem = Scene_ItemBase.prototype.useItem;
    Scene_ItemBase.prototype.useItem = function() {
        var item = this.item(), k = null;
        try { if (DataManager.isItem(item)) { k = $.keyOf(item); if (!$.MAP_KEYS[k]) k = null; } } catch (e) {}
        _useItem.apply(this, arguments);
        if (k) { try { $.useMap(k); } catch (e) { console.error('[NP_Items] use', e); } }
    };
    // map visit counter (rod: once per map visit)
    var _setupMap = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _setupMap.apply(this, arguments);
        this._npVisit = (this._npVisit || 0) + 1;
    };
    // lure: the event walks to the player
    var _evUpd = Game_Event.prototype.update;
    Game_Event.prototype.update = function() {
        _evUpd.apply(this, arguments);
        if (this._npLure > 0) {
            this._npLure--;
            if (this._erased) { this._npLure = 0; return; }
            if (!this.isMoving() && !$gameMap.isEventRunning() && !this._locked) this.moveTowardPlayer();
        }
    };

    // ================================================================== victory: drops + miser's gold
    $.DROPS = function() {
        var eid = gv(V_EID), boss = gs(S_BOSS), holy = holyTarget(), r = [];
        if (holy) r.push(['w', 125, boss ? 0.5 : (gv(V_CH) >= 2 ? 0.03 : 0)]);   // ordinary undead: only from chapter 2
        if (eid === 539) r.push(['w', 273, 1]);
        if (boss) r.push(['a', 167, 0.2]);
        if (eid === 662) r.push(['a', 173, 0.25]);
        return r;
    };
    $.giveOnce = function(kind, id, why) {
        var d = $.data(), key = kind + id;
        if (!d || d.dropped[key]) return false;
        var item = kind === 'w' ? $dataWeapons[id] : kind === 'a' ? $dataArmors[id] : $dataItems[id];
        if (!item) return false;
        d.dropped[key] = why || true;
        $gameParty.gainItem(item, 1);
        var txt = L('Найдено: ', 'Found: ') + iName(item);
        try { if (window.$LogWindow && $LogWindow.Add) $LogWindow.Add(txt); else mlog(txt); } catch (e) { mlog(txt); }
        try { if (window.NP_Stress && NP_Stress.toast) NP_Stress.toast(txt, 'v'); } catch (e) {}
        return true;
    };
    $.rollDrops = function() {
        if (gs(S_GALLERY)) return;
        $.DROPS().forEach(function(x) { if (rnd() < x[2]) $.giveOnce(x[0], x[1], 'drop'); });
    };
    $._victory = false;
    var _pc = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        var vic = command === 'KNS_EnemyData' && args && args[0] === 'dropItem' && /121/.test(String(args[1] || '')) && args[2] === 'AA';
        if (!vic) return _pc.apply(this, arguments);
        var prev = $._victory; $._victory = true;
        try { _pc.apply(this, arguments); } finally { $._victory = prev; }
        try { $.rollDrops(); } catch (e) { console.warn('[NP_Items] drops', e); }
    };
    var _gold = Game_Party.prototype.gainGold;
    Game_Party.prototype.gainGold = function(amount) {
        if ($._victory && amount > 0) {
            try { if ($.partyWears('miser')) { var extra = Math.ceil(amount * 0.5); amount += extra;
                mlog('\\c[14]' + L('【Кольцо скупца】 +', "【Miser's Ring】 +") + extra + (TextManager.currencyUnit || 'G')); } } catch (e) {}
        }
        return _gold.call(this, amount);
    };
    // chests: Hunger Blade, rarely (chapter 3+, 4% per chest, once)
    var _ssSet = Game_SelfSwitches.prototype.setValue;
    Game_SelfSwitches.prototype.setValue = function(key, value) {
        var was = this.value(key);
        _ssSet.apply(this, arguments);
        try {
            if (value && !was && key && key[2] === 'A' && $gameMap && key[0] === $gameMap.mapId() && !gs(S_BATTLE) && !gs(S_GALLERY) && gv(V_CH) >= 3) {
                var ev = $gameMap.event(key[1]);
                if (ev && evName(ev).indexOf('宝箱') >= 0 && rnd() < 0.04) $.giveOnce('w', 27, 'chest');
            }
        } catch (e) {}
    };

    // ================================================================== quest rewards
    $.QUEST_REWARDS = {
        307008: [['W', 283, 1]], 301010: [['A', 166, 1]], 307005: [['A', 168, 1]], 201007: [['A', 169, 1]],
        309001: [['A', 170, 1]], 201013: [['A', 164, 1]], 309007: [['I', 14, 2]], 106004: [['I', 15, 3]],
        201010: [['I', 26, 2]], 206001: [['I', 25, 3]]
    };
    function listOf(t) { return t === 'W' ? $dataWeapons : t === 'A' ? $dataArmors : $dataItems; }
    $.wrapQuests = function() {
        if (typeof $csvQuestList === 'undefined' || !$csvQuestList) return;
        Object.keys($.QUEST_REWARDS).forEach(function(k) {
            var id = Number(k), q = $csvQuestList[id];
            if (!q || q._npItems) return;
            var w = Object.create(q, {
                _npItems: { value: true },
                rewards: { get: function() {
                    var base = q.rewards.slice(), d = $gameSystem && $gameSystem._npItems;
                    if (!(d && d.quests && d.quests[id])) {
                        $.QUEST_REWARDS[id].forEach(function(r) { var it = listOf(r[0]) && listOf(r[0])[r[1]]; if (it) base.push([it, r[2]]); });
                    }
                    return base;
                } }
            });
            $csvQuestList[id] = w;
        });
    };
    $.hookQuests = function() {
        var Q = window.KNS_QuestReceive || (typeof KNS_QuestReceive !== 'undefined' ? KNS_QuestReceive : null);
        if (!Q || Q._npItemsHooked) return;
        Q._npItemsHooked = true;
        var _gr = Q.get_reward;
        Q.get_reward = function(id) {
            $.wrapQuests();
            var r = _gr.apply(this, arguments);
            try { if ($.QUEST_REWARDS[id]) { var d = $.data(); if (d) d.quests[id] = true; } } catch (e) {}
            return r;
        };
    };
    var _sbStart = Scene_Base.prototype.start;
    Scene_Base.prototype.start = function() {
        try { $.wrapQuests(); } catch (e) {}
        return _sbStart.apply(this, arguments);
    };

    // ================================================================== shops
    function chap() { return gv(V_CH); }
    function goodsHas(goods, t, id) { return goods.some(function(g) { return g[0] === t && g[1] === id; }); }
    // [map, (event id|0), signature [type,id] list that must be present, items to add [type,id,cond]]
    $.SHOPS = [
        { map: 18, sig: [[1, 101], [2, 152]], add: [[1, 282], [1, 105]] },
        { map: 18, sig: [[1, 121], [2, 158]], add: [[2, 171, function() { return chap() >= 2; }], [2, 166, function() { return chap() >= 3; }]] },
        { map: 19, sig: [[0, 2]], add: [[0, 15], [0, 17], [0, 26, function() { return chap() >= 2; }], [0, 21, function() { return gv(V_RANK) >= 2; }],
                                        [2, 165, function() { return chap() >= 2; }]] },
        { map: 184, sig: [[0, 40]], add: [[0, 17], [0, 26]] },
        { map: 247, sig: [[0, 2]], add: [[0, 13], [0, 14, function() { return chap() >= 2; }], [1, 215, function() { return chap() >= 2; }]] },
        { map: 288, ev: 32, sig: [[0, 2]], add: [[0, 16], [0, 25], [0, 15]] },
        { map: 288, ev: 33, sig: [], add: [[2, 170], [1, 282]] },
        { map: 147, sig: [], add: [[2, 172]] },
        { map: 14, sig: [], add: [[0, 15]] },
        { map: 86, sig: [], add: [[0, 15], [0, 16]] }
    ];
    $.extendGoods = function(goods, mapId, evId) {
        if (!Array.isArray(goods)) return goods;
        var out = goods.slice();
        $.SHOPS.forEach(function(s) {
            if (s.map !== mapId || (s.ev && s.ev !== evId)) return;
            if (!s.sig.every(function(g) { return goodsHas(goods, g[0], g[1]); })) return;
            s.add.forEach(function(a) {
                if (a[2] && !a[2]()) return;
                var list = a[0] === 0 ? $dataItems : a[0] === 1 ? $dataWeapons : $dataArmors;
                if (!list || !list[a[1]] || goodsHas(out, a[0], a[1])) return;
                out.push([a[0], a[1], 0, 0]);
            });
        });
        return out;
    };
    var _c302 = Game_Interpreter.prototype.command302;
    Game_Interpreter.prototype.command302 = function() {
        var prev = $._shopCtx;
        $._shopCtx = { map: $gameMap ? $gameMap.mapId() : 0, ev: this._eventId || 0 };
        try { return _c302.apply(this, arguments); } finally { $._shopCtx = prev; }
    };
    var _pns = SceneManager.prepareNextScene;
    SceneManager.prepareNextScene = function() {
        if ($._shopCtx && Array.isArray(arguments[0])) {
            try { arguments[0] = $.extendGoods(arguments[0], $._shopCtx.map, $._shopCtx.ev); } catch (e) {}
        }
        return _pns.apply(this, arguments);
    };

    // ================================================================== NP_UIColors
    $.priceTier = function(p) { var b = [1000, 3500, 6000, 15000], t = 1; for (var i = 0; i < b.length; i++) if (p >= b[i]) t = i + 2; return t; };
    $.hookColors = function() {
        var U = window.NP_UIColors; if (!U || U._npItemsHooked || !U.classify) return;
        U._npItemsHooked = true;
        var _ac = U.affixCount;
        U.affixCount = function(item) {
            var n = _ac.apply(this, arguments);
            try {
                if (item && item.baseItemId && item.name && $.affixNames() && DataManager.isWeapon(item)) {
                    var af = $.affixOfName(item.name);
                    var gem = /[\]］]\s*$/.test(String(item.name).trim()) ? 1 : 0;
                    if (af.pre && n - gem <= 0) n++;      // vanilla counter didn't see our prefix
                    if (af.suf) n++;
                }
            } catch (e) {}
            return n;
        };
        var _cl = U.classify;
        U.classify = function(item) {
            try {
                if (item && (DataManager.isWeapon(item) || DataManager.isArmor(item))) {
                    var src = (DataManager.isWeapon(item) ? $dataWeapons : $dataArmors)[baseId(item)];
                    if (src && $.keyOf(src)) {
                        if ($.isCursed(src)) return 'r' + Math.min(5, $.priceTier(src.price));
                        return 'r' + Math.max(1, Math.min(5, $.priceTier(src.price) + U.affixCount(item)));
                    }
                }
            } catch (e) {}
            return _cl.apply(this, arguments);
        };
    };

    // ================================================================== install hooks after all plugins loaded
    $.installAll = function() {
        $.hookSuper(); $.hookStress(); $.hookCloth(); $.hookCamp(); $.hookQuests(); $.hookColors();
    };
    var _sbootStart = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        try { $.installAll(); } catch (e) { console.error('[NP_Items] install', e); }
        return _sbootStart.apply(this, arguments);
    };
    try { $.installAll(); } catch (e) {}
    return $;
})();
window.NP_Items = NP_Items;
