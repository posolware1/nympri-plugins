//=============================================================================
// NP_BossBalance.js  (RU mod for Nymphomania Priestess v080j)
//=============================================================================
/*:
 * @plugindesc [RU mod] Boss balance v1.2: Fap relief in all chapters, Normal chapter 1, party-size support, phases and boss mechanics. Place after NP_SuperAttack.
 * @author RU mod
 *
 * @help
 * Option «Баланс боссов» / «Boss balance» (Options → Battle), default ON.
 * Turning it off restores vanilla boss behaviour; the data fixes stay on:
 *   - bounty uniques 1001–1004 keep their per-kill growth (was overwritten in CE34);
 *   - enemy rows 10012 (trance mage) and 32 (Puppet Master) get stats (were all zero).
 *
 * With the option ON, for boss fights (S15 or a known unique):
 *   - Stun (Bear Grip) / sleep (Flask) resistance by tier I/II/III = 60/70/80 %,
 *     difficulty shift Fap −20 (then capped at 20), Easy −10, Hard +5 (max 80). If it lands: exactly
 *     1 lost enemy turn, then 2 enemy turns of immunity. Damage always applies.
 *   - One super hit deals at most 35 % of boss max HP (Fap 50, Easy 45, Hard 30).
 *   - Base boss HP ×1 / ×1.5 / ×2 / ×2.5 (Fap / Easy / Normal / Hard);
 *     story-locked fights and tiny story mobs skip this base scaling.
 *   - Fap, ALL chapters: after base scaling, HP ×0.60 and final incoming damage
 *     ×0.65 with 1–2 living party members at battle start; 3+ members: ×0.75 / ×0.80.
 *     Boss guard is disabled; periodic heavy attacks are announced every 6 turns.
 *   - Normal, chapter 1 only: HP ×0.80 / damage ×0.85 with 1–2 members;
 *     3+ members: ×0.90 / ×0.90. Chapter 1 ends at V911=99, rank 2 or starting V912.
 *     Normal phases, control resistance and guard keep their original rules.
 *   - Relief excludes the gallery, ordinary/rare mobs and STORY [984,985,10002].
 *     HP is rounded, damage is floored after armor; positive results stay >=1.
 *   - Phase 2 at 50 % HP; telegraphed heavy attacks: the target can block them with
 *     the shield (Guard) or by choosing «Ничего не делать» (brace / look away).
 *   - Per-boss mechanics (Medusa, Chimera, Orc general, Cerberus, Doctor, Mimic,
 *     Flower witch, Dracula, Michael, bounty uniques, trance adventurers).
 *
 * Option «Защита врагов от суперов» / «Enemy guard vs supers» (Options → Battle), default ON:
 *   bosses and rare elites (NP_RareMobs) watch ONLY the heroes' super-charge bars (never the
 *   chosen commands) and may go into a deep guard at their action. Chance per enemy turn:
 *   boss — highest party charge: <50 % → 0, 50 % → 10 %, linear to 40 % at 100 %
 *   (difficulty ×0.5 Fap / ×0.75 Easy / ×1 Normal / ×1.1 Hard; Fap bosses never guard
 *   while Boss balance is ON); elite — half of that, from the
 *   AVERAGE charge ±20 noise. Guard lasts until the enemy's next turn: supers −50 % (after the
 *   cap), normal hits −30 %. Cost: a boss strikes at half power (plain attack), an elite loses
 *   its action. Never two guards in a row. Not in story-locked / turn-limited fights or the gallery.
 *
 * API: NP_BossBalance.on(), .ctx(), .resistFor(id), .tierOf(id), .capPct(), .hpMult(),
 *      .guardOn(), .guardChance(kind, charges, diff), .guardKind()
 */
var Imported = Imported || {};
Imported.NP_BossBalance = true;

(function() {
    'use strict';
    var $ = window.NP_BossBalance = {};
    $.VERSION = '1.2';
    var S_GALLERY = 5, S_BATTLE = 14, S_BOSS = 15;

    function gs(i) { return !!(window.$gameSwitches && $gameSwitches.value(i)); }
    function gv(i) { return Number((window.$gameVariables && $gameVariables.value(i)) || 0); }
    function sv(i, v) { $gameVariables.setValue(i, v); }
    function L(ru, en) { return typeof NP_L === 'function' ? NP_L(ru, en) : ru; }
    function rnd() { return $.rng ? $.rng() : Math.random(); }
    function mlog(t) { try { if (typeof set_mlog === 'function') set_mlog(t); } catch (e) {} }
    function actor(id) { return window.$gameActors ? $gameActors.actor(id) : null; }
    function members() { return window.$gameParty ? $gameParty.members() : []; }
    function inParty(id) { return members().some(function(m) { return m.actorId() === id && m.hp > 0; }); }
    function ename() { return String(gv(139) || '').replace(/\s*\[Lvl:\d+\]\s*$/, '') || L('Босс', 'Boss'); }
    function say(color, ru, en) { mlog('\\c[' + color + ']' + L(ru, en)); }
    function S() { return window.NP_SuperAttack || null; }

    // ------------------------------------------------------------------ tables
    // tier: 1/2/3 → resist 60/70/80 %
    var TIER = {};
    [241, 242, 243, 901, 950, 302, 301, 304, 305, 314, 204, 203, 219, 10002, 10003, 10010, 10011, 10012, 307, 221]
        .forEach(function(id) { TIER[id] = 1; });
    [906, 905, 903, 902, 621, 625, 662, 244, 214, 336, 10019, 10013, 32]
        .forEach(function(id) { TIER[id] = 2; });
    [262, 692, 391, 392, 539, 581, 1001, 1002, 1003, 1004, 984, 985]
        .forEach(function(id) { TIER[id] = 3; });
    $.TIER = TIER;
    // not HP-scaled / no phases / no telegraphs (story-locked, tutorial, tiny story mobs)
    $.NOSCALE = [984, 985, 10002, 301, 302, 304, 305, 314, 204, 203];
    $.STORY = [984, 985, 10002];
    $.UNIQUE = [262, 692, 391, 392, 539, 581, 1001, 1002, 1003, 1004];      // count as bosses even without S15
    $.BOUNTY = { 1001: 4042, 1002: 4043, 1003: 4044, 1004: 4045 };
    $.BOUNTY_CAP = 10;

    $.on = function() { return ConfigManager.npBossBalance !== false; };
    $.diff = function() { return gv(3); };                                   // 0 Fap, 3 Easy, 1 Normal, 2 Hard
    $.firstChapter = function() { return gv(911) < 99 && gv(9) < 2 && gv(912) === 0; };
    function partySize() { return members().filter(function(a) { return a.hp > 0; }).length; }
    $.reliefFor = function(c, diff) {
        if (!c || !c.boss || c.on === false || !$.on() || gs(S_GALLERY) || $.STORY.indexOf(c.eid) >= 0) return null;
        var d = diff === undefined ? $.diff() : diff;
        var small = (c.partySize === undefined ? partySize() : c.partySize) <= 2;
        if (d === 0) return { mode: 'fap', hp: small ? 0.60 : 0.75, damage: small ? 0.65 : 0.80 };
        if (d === 1 && $.firstChapter()) return { mode: 'normalIntro', hp: small ? 0.80 : 0.90, damage: small ? 0.85 : 0.90 };
        return null;
    };
    function fapRelief(c) { var r = $.reliefFor(c); return !!(r && r.mode === 'fap'); }
    $.incomingDamage = function(damage) {
        var c = $.ctx();
        if (!(damage > 0) || !$.active() || gv(270) !== c.eid || !inParty(gv(271))) return damage;
        var r = $.reliefFor(c);
        return r ? Math.max(1, Math.floor(damage * r.damage)) : damage;
    };
    $.tierOf = function(id) { return TIER[id] || 1; };
    $.isBossId = function(id) { return gs(S_BOSS) || $.UNIQUE.indexOf(id) >= 0; };
    $.resistFor = function(id, diff) {
        var base = [0, 60, 70, 80][$.tierOf(id)];
        var d = diff === undefined ? $.diff() : diff;
        var shift = { 0: -20, 3: -10, 1: 0, 2: 5 }[d] || 0;
        var r = $.reliefFor({ eid: id, boss: true }, d);
        return Math.max(0, Math.min(r && r.mode === 'fap' ? 20 : 80, base + shift));
    };
    $.capPct = function(diff) { var d = diff === undefined ? $.diff() : diff; return { 0: 0.50, 3: 0.45, 1: 0.35, 2: 0.30 }[d] || 0.35; };
    $.hpMult = function(diff) { var d = diff === undefined ? $.diff() : diff; return { 0: 1, 3: 1.5, 1: 2, 2: 2.5 }[d] || 2; };
    // per-boss weight on top of the difficulty multiplier (tuned in headless battles on Normal):
    // <1: armour/regeneration/head-skips already stretch the fight (orc, chimera, trance mage);
    // >1: base HP is tiny (Dracula 12 vs the princess' holy light, Guignol 8, unique 581 10)
    $.HPADJ = { 214: 0.65, 539: 2, 692: 0.8, 10013: 0.45, 581: 1.5, 1001: 1.5 };

    // ------------------------------------------------------------------ option
    ConfigManager.npBossBalance = true;
    var _mk = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _mk.apply(this, arguments); c.npBossBalance = this.npBossBalance; return c; };
    var _ap = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _ap.apply(this, arguments);
        this.npBossBalance = (c && c.npBossBalance !== undefined) ? !!c.npBossBalance : true;
    };
    ConfigManager.npEnemyGuard = true;
    var _mk2 = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _mk2.apply(this, arguments); c.npEnemyGuard = this.npEnemyGuard; return c; };
    var _ap2 = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _ap2.apply(this, arguments);
        this.npEnemyGuard = (c && c.npEnemyGuard !== undefined) ? !!c.npEnemyGuard : true;
    };
    function regCat() {
        try {
            if (window.NP_OptionsCategories && NP_OptionsCategories.register) {
                NP_OptionsCategories.register('npBossBalance', 'battle');
                NP_OptionsCategories.register('npEnemyGuard', 'battle');
            }
        } catch (e) {}
    }
    var _bootStart = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { regCat(); _bootStart.apply(this, arguments); };
    if (typeof Window_Options !== 'undefined') {
        var _addGen = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addGen.apply(this, arguments);
            this.addCommand(L('Баланс боссов', 'Boss balance'), 'npBossBalance');
            this.addCommand(L('Защита врагов от суперов', 'Enemy guard vs supers'), 'npEnemyGuard');
            regCat();
        };
    }

    // ------------------------------------------------------------------ battle context
    // $gameSystem._npBoss = { eid, tier, boss, on, turn, phase, ... } — only for the current battle
    $.ctx = function() {
        var c = window.$gameSystem && $gameSystem._npBoss;
        if (!c || !gs(S_BATTLE) || c.eid !== gv(121)) return null;
        return c;
    };
    $.active = function() { var c = $.ctx(); return !!(c && c.on && c.boss && !gs(S_GALLERY)); };
    $.battleEnd = function() {
        var c = window.$gameSystem && $gameSystem._npBoss;
        if (c && c.mimicSave) { sv(136, c.mimicSave[0]); sv(134, c.mimicSave[1]); }
        if (c && c.guard) $.guardIcon(false);
        if (window.$gameSystem) $gameSystem._npBoss = null;
    };

    // ------------------------------------------------------------------ missing enemy rows (in memory, CSV untouched)
    var SCRIPT = '$attack_animation_type = "%A";\n$trait_impervious = 0\n$weak_fire = 0\n$hold_limit = 0\n$trait_penis = 0';
    function row(id, key, c2h, i, j2o, p, q, r, anim) {
        var a = [String(id), key].concat(c2h.map(String), [String(i)], j2o.map(String), [String(p), String(q), String(r), '', '', '', '',
            SCRIPT.replace('%A', anim), 's[61] = false', '1:1', '', '']);
        return a;
    }
    $.ROWS = {
        //            STR CON INT CHA DEX FAI   I   chin Marm eva arm hit dmg   exp rng R
        10012: row(10012, 'enemy_name_10010', [5, 7, 9, 3, 7, 4], 0, [0, 3, 0, 0, 5, '2d3'], 5, 6, 0, 'magic'),
        32:    row(32, 'enemy_name_PuppetMaster', [6, 10, 10, 4, 8, 4], 0, [0, 3, 0, 2, 6, '2d4'], 15, 10, 0, 'blow')
    };
    $.ensureRows = function() {
        if (typeof $csv_EnemyData === 'undefined' || !$csv_EnemyData) return 0;
        var n = 0;
        Object.keys($.ROWS).forEach(function(id) {
            var r = $csv_EnemyData[id];
            var empty = !r || !r.length || !(Number(r[3]) > 0);
            if (empty) { $csv_EnemyData[id] = $.ROWS[id].slice(); n++; }
        });
        return n;
    };
    $.beforeLoad = function() { try { $.ensureRows(); } catch (e) { console.error('[NP_BossBalance]', e); } };

    // ------------------------------------------------------------------ CE34 end: stats / HP
    $.afterLoad = function() {
        try { return $._afterLoad(); } catch (e) { console.error('[NP_BossBalance] afterLoad', e); }
    };
    $._afterLoad = function() {
        var id = gv(121);
        var c = { eid: id, tier: $.tierOf(id), boss: $.isBossId(id), on: $.on(), turn: 0, phase: 1, partySize: partySize(),
            dmgAdd: 0, bounty: 0, imm: 0, tele: null, flags: {}, shield: 0, mimicSave: null, heads: 0 };
        // 1) bounty growth (CE34 re-read the CSV after adding it — re-apply)
        var bv = $.BOUNTY[id];
        if (bv) {
            var n = Math.max(0, Math.min($.BOUNTY_CAP, gv(bv)));
            if (n > 0) {
                [126, 127, 128, 129, 130, 131, 133, 134, 136, 137, 138].forEach(function(v) { sv(v, gv(v) + n); });
                sv(156, gv(156) + n);
                c.bounty = n;
                sv(122, gv(127) * 2 + (Number(window.$EnemyBonusHP) || 0));
                sv(123, gv(122));
            }
        }
        // 2) name for the trance mage (no log key in the sheet)
        if (id === 10012) {
            var nm = String(gv(139) || '');
            var lv = (nm.match(/\[Lvl:\d+\]\s*$/) || [''])[0];
            sv(139, L('Авантюрист в трансе (маг)', 'Entranced adventurer (mage)') + (lv ? ' ' + lv : ''));
        }
        // 3) HP by difficulty
        c.baseHp = gv(122);
        if (c.on && c.boss && $.NOSCALE.indexOf(id) < 0 && !gs(S_GALLERY)) {
            var m = $.hpMult();
            if (m !== 1 && c.baseHp >= 6) {
                sv(122, Math.max(c.baseHp, Math.round(c.baseHp * m * ($.HPADJ[id] || 1))));   // never below vanilla
                sv(123, gv(122));
            }
        }
        // Apply once to the fully initialized HP, including dungeon levels and
        // bounty growth. The party size is fixed before any combat knockouts.
        var relief = $.reliefFor(c);
        if (relief) {
            sv(122, Math.max(1, Math.round(gv(122) * relief.hp)));
            sv(123, gv(122));
        }
        c.mhp = gv(122);
        var prev = $gameSystem._npBoss;
        if (prev && prev.guard) $.guardIcon(false);
        $gameSystem._npBoss = c;
        if (c.on && c.boss && $.STORY.indexOf(id) < 0) $.intro(c);
        return c;
    };
    $.intro = function(c) {
        var id = c.eid;
        if (id === 10003) say(17, 'Дуэль один на один: спутники не могут использовать супер-удары.', 'One-on-one duel: companions cannot use super attacks.');
        if (id === 539 && inParty(19)) say(18, 'Принцесса-вампир сердито смотрит на графа.', 'The vampire princess glares at the Count.');
        if (id === 692) { c.heads = 3; say(17, 'У химеры три головы — каждая четверть здоровья стоит ей одной.', 'The chimera has three heads — every quarter of its health costs it one.'); }
        if (id === 905) { c.heads = 3; say(17, 'Три головы цербера — три фазы боя.', 'Three heads of Cerberus — three phases.'); }
    };

    // ------------------------------------------------------------------ super-attack hooks
    $.patchSuper = function() {
        var sp = S();
        if (!sp || sp._npBossPatched) return !!sp;
        sp._npBossPatched = true;
        var _cd = sp.computeDamage;
        sp.computeDamage = function(aid, res) {
            var c = _cd.apply(this, arguments);
            $._lastCap = 0;
            if ($.active() && c && $.ctx().eid !== 10002) {
                var cap = Math.max(1, Math.ceil($.capPct() * gv(122)));
                if (c.dmg > cap) { c.uncapped = c.dmg; c.dmg = cap; c.capped = true; $._lastCap = cap; }
            }
            $._lastGuard = 0;
            if (c && c.dmg > 0 && $.guardOn()) {
                var g = Math.max(1, Math.ceil(c.dmg * $.GUARD_SUPER));
                if (g < c.dmg) { $._lastGuard = c.dmg - g; c.guardCut = c.dmg - g; c.dmg = g; }
            }
            return c;
        };
        var _res = sp.resolve;
        sp.resolve = function(interp) {
            var e = actor(100), pre = { s8: !!(e && e.isStateAffected(8)), s6: !!(e && e.isStateAffected(6)),
                stun: Number(window.$enemy_state_stun) || 0, sleep: Number(window.$enemy_state_sleep) || 0 };
            var out = _res.apply(this, arguments);
            try { $.afterSuper(out, pre); } catch (err) { console.error('[NP_BossBalance] afterSuper', err); }
            return out;
        };
        var _reason = sp.reason;
        sp.reason = function(aid) {
            var r = _reason.apply(this, arguments);
            if (r === null && aid !== 2 && $.active() && $.ctx().eid === 10003) return L('дуэль', 'duel');
            return r;
        };
        return true;
    };
    $.afterSuper = function(out, pre) {
        var c = $.ctx();
        if (out && c && $._lastGuard) {
            out.guardCut = $._lastGuard; c.guardCut = (c.guardCut || 0) + $._lastGuard; c.guardSuperHits = (c.guardSuperHits || 0) + 1;
            say(24, ename() + ' в глухой обороне — супер-удар ослаблен вдвое (−' + $._lastGuard + ').',
                ename() + ' is in a deep guard — the super hit is halved (−' + $._lastGuard + ').');
        }
        $._lastGuard = 0;
        if (!out || !c || !$.active()) return;
        if ($._lastCap) {
            out.capped = $._lastCap;
            say(2, ename() + ' выдерживает удар: не больше ' + Math.round($.capPct() * 100) + '% здоровья за супер-удар.',
                ename() + ' withstands the blow: a super hit deals at most ' + Math.round($.capPct() * 100) + '% of its health.');
            $._lastCap = 0;
        }
        c.lastSuper = out.aid;
        if (window.$atk_attribute === 'saint') c.holyAt = c.turn;
        if (out.potion === 'fire' && !out.miss) c.fireAt = c.turn;
        if (c.eid === 1003 && gv(123) > 0 && !c.tele) {
            c.tele = { kind: 'grudge', target: $.targetFor(out.aid) };
            say(17, ename() + ' затаил обиду на удар — следующий выпад будет сильнее!',
                ename() + ' holds a grudge for that blow — its next thrust will be stronger!');
            $.teleHint(c.tele);
        }
        var kind = out.stun ? 'stun' : (out.sleep ? 'sleep' : null);
        if (!kind || gv(123) <= 0) return;
        var e = actor(100), st = kind === 'stun' ? 8 : 6;
        var revert = function() {
            if (kind === 'stun') { if (!pre.s8 && e) e.removeState(8); window.$enemy_state_stun = pre.stun; }
            else { if (!pre.s6 && e) e.removeState(6); window.$enemy_state_sleep = pre.sleep; }
            out[kind] = 0;
        };
        var label = kind === 'stun' ? L('оглушение', 'stun') : L('сон', 'sleep');
        if (c.imm > 0) {
            revert(); out.immune = true;
            say(2, ename() + ' ещё не оправился — невосприимчив к эффекту «' + label + '» (' + c.imm + ' ход.)',
                ename() + ' is still recovering — immune to ' + label + ' (' + c.imm + ' turn(s))');
            return;
        }
        var chance = $.resistFor(c.eid), roll = rnd() * 100;
        c.rolls = (c.rolls || 0) + 1;
        if (roll < chance) {
            revert(); out.resisted = true;
            say(2, ename() + ' сопротивляется: «' + label + '» не подействовал (сопротивление ' + chance + '%). Урон прошёл.',
                ename() + ' resists ' + label + ' (' + chance + '% resistance). The damage still applies.');
            return;
        }
        // landed: exactly one lost enemy turn, then 2 turns of immunity
        if (kind === 'stun') { if (e) e.addState(8); window.$enemy_state_stun = 1; out.stun = 1; }
        else { if (e) e.addState(6); window.$enemy_state_sleep = 2; out.sleep = 1; }
        c.imm = 3;   // the lost turn + 2
        out.landed = true;
        say(17, ename() + ': «' + label + '» подействовал — 1 ход, затем 2 хода невосприимчивости.',
            ename() + ': ' + label + ' landed — 1 turn, then 2 turns of immunity.');
        if (c.tele) { mlog('\\c[17]' + L('Подготовка «', 'The «') + $.teleName(c.tele) + L('» сорвана!', '» was interrupted!')); c.tele = null; }
    };

    // ------------------------------------------------------------------ V123 hook: adjutant shield / decoy / golem
    if (typeof Game_Variables !== 'undefined') {
        var _gvSet = Game_Variables.prototype.setValue;
        Game_Variables.prototype.setValue = function(id, value) {
            if (id === 123 && !$._inHook && window.$gameSystem && $gameSystem._npBoss) {
                $._inHook = true;
                try { value = $.onEnemyHp(this.value(123), value); } catch (e) { console.error('[NP_BossBalance]', e); }
                $._inHook = false;
            }
            return _gvSet.call(this, id, value);
        };
    }
    $.onEnemyHp = function(oldV, newV) {
        var c = $.ctx();
        if (!c || typeof newV !== 'number' || typeof oldV !== 'number' || !(newV < oldV)) return newV;
        var sp = S();
        if ($.guardOn() && !(sp && (sp.running || sp._dotTick)) && !$._enemyPhase) {
            var d0 = oldV - newV, d1 = Math.max(1, Math.round(d0 * $.GUARD_NORMAL));
            if (d1 < d0) {
                newV = oldV - d1; c.guardCut = (c.guardCut || 0) + (d0 - d1); c.guardNormalHits = (c.guardNormalHits || 0) + 1;
                say(24, ename() + ' в глухой обороне: урон ' + d0 + ' → ' + d1 + '.', ename() + ' is in a deep guard: damage ' + d0 + ' → ' + d1 + '.');
            }
        }
        if (!$.active()) return newV;
        var dmg = oldV - newV;
        if (c.decoy) {
            c.decoy = false;
            say(17, 'Удар приняла кукла-приманка! ' + ename() + ' не получает урона.', 'The decoy doll took the hit! ' + ename() + ' takes no damage.');
            return oldV;
        }
        if (c.shield > 0) {
            var ab = Math.min(c.shield, dmg);
            c.shield -= ab;
            say(17, 'Адъютант закрывает генерала щитом: −' + ab + ' урона' + (c.shield > 0 ? ' (щит: ' + c.shield + ')' : ' — адъютант повержен!'),
                'The adjutant shields the general: −' + ab + ' damage' + (c.shield > 0 ? ' (shield: ' + c.shield + ')' : ' — the adjutant is down!'));
            newV = oldV - (dmg - ab);
        }
        if (window.$atk_attribute === 'saint') c.holyAt = c.turn;
        return newV;
    };

    // ------------------------------------------------------------------ brace («Ничего не делать»)
    $.brace = function(aid) {
        var c = $.ctx(); if (!c) return;
        var id = aid === undefined ? 1 : Number(aid);    // CE365 passes 1; CE366 passes the acting member (party index V274)
        if (!id) return;
        c.braced = c.braced || {};
        c.braced[id] = gv(157);                           // this round; checked against c.round set at the enemy turn start
        if (c.tele && c.tele.target === id && $.active())
            mlog('\\c[24]' + (actor(id) ? actor(id).name() : '') + L(' готовится: пригнуться и отвернуться.', ' braces: ducks and looks away.'));
    };
    function guarded(id) {
        var c = $.ctx(), a = actor(id);
        if (a && a.isStateAffected(14)) return 'shield';
        if (c && c.braced && c.braced[id] !== undefined && c.braced[id] === (c.round || 0)) return 'brace';
        return null;
    }
    $.guarded = guarded;

    // ------------------------------------------------------------------ telegraphs
    $.TELE = {
        heavy:   ['Сокрушительный удар', 'Crushing blow'],
        gaze:    ['Окаменяющий взгляд', 'Petrifying gaze'],
        pollen:  ['Дурманящая пыльца', 'Drowsy pollen'],
        syringe: ['Шприц с сывороткой', 'Serum syringe'],
        breath:  ['Огненное дыхание', 'Fire breath'],
        ram:     ['Таран щитом', 'Shield ram'],
        hook:    ['Мясницкий крюк', 'Butcher hook'],
        lunge:   ['Выпад куклы', 'Doll lunge'],
        grudge:  ['Выпад обиды', 'Grudge thrust'],
        power:   ['Мощный удар', 'Power strike'],
        bite:    ['Укус трёх голов', 'Three-headed bite'],
        bat:     ['Рой летучих мышей', 'Bat swarm']
    };
    $.teleName = function(t) { var n = $.TELE[t.kind] || $.TELE.heavy; return L(n[0], n[1]); };
    $.targetFor = function(pref) {
        var ms = members().filter(function(m) { return m.hp > 0; });
        if (pref && ms.some(function(m) { return m.actorId() === pref; })) return pref;
        try {
            var h = window.$hate, i = h ? h.indexOf(Math.max.apply(null, h)) : 0;
            if (ms[i]) return ms[i].actorId();
        } catch (e) {}
        return ms[0] ? ms[0].actorId() : 1;
    };
    function hasShield(id) {
        try { var a = actor(id), e = a && a.equips()[6]; return id === 1 && !!(e && String(e.note || '').indexOf('盾') >= 0); } catch (err) { return false; }
    }
    $.hasShield = hasShield;
    $.teleHint = function(t) {
        var a = actor(t.target), nm = a ? a.name() : '';
        var shield = hasShield(t.target);
        mlog('\\c[17]' + ename() + L(' готовит «', ' prepares «') + $.teleName(t) + L('» против ', '» against ') + nm + '!');
        mlog('\\c[24]' + L('Защита: ', 'Counter: ') + (shield ? L('«Щит» или ', '«Guard» or ') : '') +
            L('«Ничего не делать» — пригнуться/отвернуться.', '«Do nothing» — brace / look away.'));
    };
    $.telegraph = function(c, kind, target) {
        if (c.tele) return;
        c.tele = { kind: kind, target: $.targetFor(target), at: c.turn };
        $.teleHint(c.tele);
    };

    // ------------------------------------------------------------------ CE368 end (every enemy turn, even skipped)
    $.enemyTurnBegin = function() {          // CE368 start: the guard ends at the enemy's next turn
        $._enemyPhase = true;
        var c = $.ctx(); if (!c) return;
        try { $.guardExpire(c); } catch (e) { console.error('[NP_BossBalance] guardExpire', e); }
    };
    $.enemyTurnStart = function() {
        $._enemyPhase = false;
        var c = $.ctx(); if (!c) return;
        try {
            if (c.guard) $.guardExpire(c);
            c.round = gv(157);
            if (c.mimicSave) {
                sv(136, c.mimicSave[0]); sv(134, c.mimicSave[1]); c.mimicSave = null;
                if ($.active()) say(17, 'Мимик снова открывает пасть — броня обычная.', 'The mimic opens its maw again — armor back to normal.');
            }
            if (c.imm > 0) c.imm--;
            if (Number(window.$enemy_turn_skip) === 1 && c.tele && $.active()) {
                mlog('\\c[17]' + L('Подготовка «', 'The «') + $.teleName(c.tele) + L('» сорвана!', '» was interrupted!'));
                c.tele = null;
            }
        } catch (e) { console.error('[NP_BossBalance] turnStart', e); }
    };

    // ------------------------------------------------------------------ CE367 after action roll. true → skip the action
    $.enemyAct = function() {
        var c = $.ctx(); if (!c) return false;
        try { return $._enemyAct(c); } catch (e) { console.error('[NP_BossBalance] enemyAct', e); return false; }
    };
    function hpPct() { return gv(122) > 0 ? gv(123) / gv(122) : 1; }
    function addDmg(c, n) { c.dmgAdd += n; }
    function heal(c, n) { n = Math.max(0, Math.min(gv(122) - gv(123), Math.round(n))); if (n > 0) { $._inHook = true; sv(123, gv(123) + n); $._inHook = false; } return n; }
    $.SKIP = 'skip';
    $._enemyAct = function(c) {
        c.acted = true;
        $._enemyPhase = false;
        c.round = gv(157);
        c.gt = (c.gt || 0) + 1;                            // enemy actions seen (guard cooldown clock)
        // bounty damage growth (CE368 re-reads V138 every turn)
        if (c.bounty) sv(138, gv(138) + c.bounty);
        var gk = $.guardKind(c);
        if (gk === 'elite') return $.guardTry(c, gk);      // an elite's guard costs its whole action
        if (gk === 'boss' && !$.active()) { $.guardBossStrike(c); return false; }
        if (!$.active() || $.STORY.indexOf(c.eid) >= 0) return false;
        c.turn++;
        c.hpSnap = members().map(function(m) { return [m.actorId(), m.hp]; });
        var id = c.eid, p = hpPct(), skip = null;
        // ---- phases
        if (id === 692) {                                   // chimera: a head per 25 %
            var lost = p <= 0.25 ? 3 : p <= 0.5 ? 2 : p <= 0.75 ? 1 : 0;
            if (lost > (c.lostHeads || 0)) {
                c.lostHeads = lost; addDmg(c, 1);
                var hn = [['', ''], ['Козья голова', 'The goat head'], ['Змеиная голова', 'The serpent head'], ['Львиная голова', 'The lion head']][lost];
                say(17, hn[0] + ' химеры поникла! Химера бьётся в агонии и теряет ход, но звереет (+1 урон).',
                    hn[1] + ' of the chimera droops! It thrashes, loses its turn, and grows fiercer (+1 damage).');
                skip = $.SKIP;
            }
        } else if (id === 905) {                            // cerberus: 3 heads = 3 phases
            var ph = p <= 0.33 ? 3 : p <= 0.66 ? 2 : 1;
            if (ph > c.phase) {
                c.phase = ph; addDmg(c, 1);
                say(17, 'Одна из голов цербера повержена! Оставшиеся рычат громче (фаза ' + ph + '/3, +1 урон).',
                    'One of Cerberus\' heads falls! The others roar louder (phase ' + ph + '/3, +1 damage).');
                c.tele = null; $.telegraph(c, ph === 3 ? 'bite' : 'breath');
                skip = $.SKIP;
            }
        } else if (c.phase === 1 && p <= 0.5 && $.NOSCALE.indexOf(id) < 0) {
            c.phase = 2;
            if (id === 214) {
                c.shield = Math.ceil(gv(122) * 0.15);
                say(17, 'Орк-генерал трубит в рог! Прибегает адъютант со щитом (поглотит ' + c.shield + ' урона).',
                    'The orc general blows his horn! A shield adjutant arrives (absorbs ' + c.shield + ' damage).');
                skip = $.SKIP;
            } else if (id === 336) {
                var h = heal(c, gv(122) * 0.15); addDmg(c, 2);
                say(17, 'Доктор вкалывает себе сыворотку: +' + h + ' HP, удары сильнее (+2)!',
                    'The Doctor injects himself with serum: +' + h + ' HP, harder hits (+2)!');
                skip = $.SKIP;
            } else if (id === 1002) {
                addDmg(c, 3);
                say(17, 'Мясник впадает в ярость! (+3 урон)', 'The Butcher flies into a rage! (+3 damage)');
            } else if (id === 1004) {
                var h2 = heal(c, gv(122) * 0.10);
                c.drunk = true; c.drunkTurn = c.turn; sv(135, gv(135) + 6);
                say(17, 'Пропойца прикладывается к бутылке: +' + h2 + ' HP, шатается — по нему трудно попасть, но он бьёт слабее.',
                    'The Drunkard takes a swig: +' + h2 + ' HP; he staggers — hard to hit, but his blows are weaker.');
                skip = $.SKIP;
            } else if (id === 1001) {
                c.decoy = true;
                say(17, 'Гиньоль выставляет куклу-приманку: следующий удар примет она.', 'Guignol sets out a decoy doll: it will take the next hit.');
            } else {
                var add = c.tier >= 2 ? 2 : 1; addDmg(c, add);
                say(17, ename() + ' в ярости! Фаза 2: урон +' + add + '.', ename() + ' is enraged! Phase 2: damage +' + add + '.');
            }
        }
        if (c.drunk && c.drunkTurn < c.turn) {          // sobering up: weaker blow this turn, evasion back to normal
            c.drunk = false; sv(135, gv(135) - 6); sv(138, Math.max(1, gv(138) - 2));
        }
        // ---- Dracula vs the vampire princess (once)
        if (!skip && id === 539 && inParty(19) && !c.flags.scold && (c.turn >= 2 || p <= 0.5)) {
            c.flags.scold = true;
            say(18, 'Принцесса-вампир отчитывает графа: «Где ваши манеры, дядюшка?!» Дракула смущённо поправляет плащ и пропускает ход.',
                'The vampire princess scolds the Count: "Where are your manners, uncle?!" Dracula sheepishly straightens his cape and skips his turn.');
            skip = $.SKIP;
        }
        // ---- trance adventurers: regenerate unless holy light hit them recently
        if (!skip && (id === 10010 || id === 10011 || id === 10012 || id === 10013) && c.turn % 2 === 0) {
            if (c.holyAt !== undefined && c.turn - c.holyAt <= 2) say(24, 'Святой свет рассеивает транс — регенерации нет.', 'Holy light breaks the trance — no regeneration.');
            else { var rh = heal(c, Math.max(1, Math.floor(gv(122) * 0.03))); if (rh > 0) say(17, ename() + ' в трансе восстанавливает ' + rh + ' HP.', ename() + ' regenerates ' + rh + ' HP in the trance.'); }
        }
        if (skip) { c.tele = c.tele && c.tele.kind === 'bite' || c.tele && c.tele.kind === 'breath' ? c.tele : null; return true; }
        // ---- flat damage bonuses
        if (c.dmgAdd) sv(138, gv(138) + c.dmgAdd);
        // ---- execute a telegraphed attack
        if (c.tele && Number(window.$enemy_skill_charge) !== 1) {
            var t = c.tele; c.tele = null;
            var tgt = actor(t.target);
            if (tgt && tgt.hp > 0 && inParty(t.target)) {
                var idx = members().indexOf(tgt);
                sv(271, t.target); sv(274, idx); sv(154, tgt.name());
            }
            var g = guarded(gv(271)), nm = $.teleName(t);
            sv(140, 1);                                     // force a normal attack: no ero/skill on a heavy turn
            if (t.kind === 'gaze') {
                if (g) {
                    say(24, (tgt ? tgt.name() : '') + ' отворачивается — «' + nm + '» не действует!', (tgt ? tgt.name() : '') + ' looks away — the ' + nm + ' has no effect!');
                    return true;
                }
                sv(138, Math.ceil(gv(138) * 1.5)); $.drainCharge(gv(271), 40, nm);
            } else if (t.kind === 'pollen') {
                if (c.fireAt !== undefined && c.turn - c.fireAt <= 1) {
                    say(24, 'Огненная склянка сожгла пыльцу — облако рассеялось!', 'The fire flask burned the pollen — the cloud is gone!');
                    return true;
                }
                if (g) {
                    say(24, (tgt ? tgt.name() : '') + ' задерживает дыхание и закрывает лицо — пыльца не действует!', (tgt ? tgt.name() : '') + ' holds breath and covers up — the pollen has no effect!');
                    return true;
                }
                sv(138, Math.ceil(gv(138) * 1.5)); $.drainCharge(gv(271), 35, nm);
            } else if (t.kind === 'syringe') {
                if (g) { sv(138, Math.max(1, Math.floor(gv(138) * 0.5))); say(24, 'Шприц ломается о защиту!', 'The syringe snaps against the guard!'); }
                else { sv(138, Math.ceil(gv(138) * 1.5)); $.drainCharge(gv(271), 25, nm); }
            } else {
                var mult = t.kind === 'grudge' ? 1.8 : (c.tier >= 2 ? 2 : 1.5);
                if (g) {
                    sv(138, Math.max(1, Math.floor(gv(138) * 0.5)));
                    say(24, (tgt ? tgt.name() : '') + (g === 'shield' ? ' принимает «' + nm + '» на щит — урон вдвое меньше!' : ' уворачивается от «' + nm + '» — урон вдвое меньше!'),
                        (tgt ? tgt.name() : '') + (g === 'shield' ? ' blocks the ' + nm + ' with the shield — half damage!' : ' braces against the ' + nm + ' — half damage!'));
                } else {
                    sv(138, Math.ceil(gv(138) * mult));
                    say(2, '«' + nm + '» обрушивается со всей силой!', 'The ' + nm + ' lands with full force!');
                }
            }
            c.lastHeavy = c.turn;
            return false;
        }
        if (gk === 'boss') $.guardBossStrike(c);
        return false;
    };

    // ------------------------------------------------------------------ enemy guard vs supers (reads only the charge bars)
    $.GUARD_SUPER = 0.5;       // super damage multiplier while guarding (after the per-hit cap)
    $.GUARD_NORMAL = 0.7;      // normal hit multiplier while guarding
    $.GUARD_STRIKE = 0.5;      // a boss strikes at half power on a guard turn
    $.GUARD_ELITE = 0.5;       // elites: half the boss chance
    $.GUARD_NOISE = 20;        // elites misread the average charge by up to ±20
    $.GUARD_DIFF = { 0: 0.5, 3: 0.75, 1: 1, 2: 1.1 };
    $.GUARD_EXCLUDE = [984, 985, 10002, 301, 302, 304, 305, 314, 204, 203];   // story-locked / tutorial / tiny story mobs
    $.guardOption = function() { return ConfigManager.npEnemyGuard !== false; };
    $.guardOn = function() { var c = $.ctx(); return !!(c && c.guard && $.guardOption() && !gs(S_GALLERY) && !fapRelief(c)); };
    function rareCtx() { try { return (window.NP_RareMobs && NP_RareMobs.ctx) ? NP_RareMobs.ctx() : null; } catch (e) { return null; } }
    $.turnLimited = function(id) {                       // fights that end by themselves after N rounds (CE35)
        return (id === 950 && gs(914)) || (id === 906 && gs(923));
    };
    $.guardKind = function(c) {
        c = c || $.ctx();
        if (!c || !$.guardOption() || gs(S_GALLERY)) return null;
        var id = c.eid;
        if ($.turnLimited(id)) return null;
        var r = rareCtx();                                 // rare elites spawn only on random map encounters, never in story fights
        if (r) return r.key === 'rat' ? null : 'elite';  // the thief rat runs, it does not guard
        if (fapRelief(c)) return null;
        if ($.GUARD_EXCLUDE.indexOf(id) >= 0) return null;
        return c.boss ? 'boss' : null;
    };
    // the ONLY input: super-charge bars of party members who have a super (visible on the HUD)
    $.guardCharges = function(c) {
        var sp = S(); if (!sp || !sp.KIND) return [];
        var duel = c && c.eid === 10003;
        return members().filter(function(m) {
            var id = m.actorId();
            return m.hp > 0 && sp.KIND[id] && !(duel && id !== 2);
        }).map(function(m) { return sp.charge(m.actorId()); });
    };
    $.guardCurve = function(m) { return m < 50 ? 0 : 0.10 + 0.30 * Math.min(1, (m - 50) / 50); };
    // pure: kind 'boss' | 'elite', charges = [0..100], noise in [-1, 1] (elites only)
    $.guardChance = function(kind, charges, diff, noise) {
        if (!charges || !charges.length) return 0;
        var dm = $.GUARD_DIFF[diff === undefined ? $.diff() : diff]; if (dm === undefined) dm = 1;
        if (kind === 'elite') {
            var avg = charges.reduce(function(a, b) { return a + b; }, 0) / charges.length;
            var m = Math.max(0, Math.min(100, avg + (noise || 0) * $.GUARD_NOISE));
            return $.guardCurve(m) * $.GUARD_ELITE * dm;
        }
        return $.guardCurve(Math.max.apply(null, charges)) * dm;
    };
    $.guardDecide = function(c, kind) {
        if (c.guard || (c.gt || 0) < (c.gNext || 0)) return false;      // cooldown: never two guards in a row
        if (Number(window.$enemy_skill_charge) === 1) return false;       // busy charging a skill
        var noise = kind === 'elite' ? rnd() * 2 - 1 : 0;
        var p = $.guardChance(kind, $.guardCharges(c), $.diff(), noise);
        c.gLastP = p;
        return p > 0 && rnd() < p;
    };
    $.GUARD_TEXT = {
        262: ['Медуза прикрывает глаза и сворачивается кольцами…', 'Medusa shields her eyes and coils up…'],
        214: ['Орк-генерал вскидывает щит и пригибается…', 'The orc general raises his shield and crouches…'],
        692: ['Химера припадает к земле, пряча все три головы…', 'The chimera presses low, hiding all three heads…'],
        905: ['Цербер пятится, прикрывая головы лапами…', 'Cerberus backs off, covering its heads…'],
        336: ['Доктор заслоняется саквояжем…', 'The Doctor hides behind his bag…'],
        539: ['Дракула заворачивается в плащ…', 'Dracula wraps himself in his cape…'],
        662: ['Мимик плотно прижимает крышку…', 'The mimic clamps its lid down…'],
        391: ['Цветочная ведьма укрывается лепестками…', 'The flower witch hides in a cocoon of petals…'],
        1001: ['Гиньоль прячется за своими куклами…', 'Guignol hides behind his dolls…'],
        1002: ['Мясник заслоняется тесаком…', 'The Butcher shields himself with his cleaver…'],
        1004: ['Пропойца икает и прикрывает голову бутылкой…', 'The Drunkard hiccups and covers his head with the bottle…'],
        10003: ['Михаэль встаёт в глухую защитную стойку…', 'Michael takes a tight defensive stance…'],
        bear: ['Медведь-шатун встаёт на дыбы и прикрывает морду лапами…', 'The rogue bear rears up and covers its muzzle…'],
        wolf: ['Седой вожак пятится, прижав уши…', 'The grey packleader backs off, ears flat…'],
        golem: ['Янтарный голем застывает, словно камень…', 'The amber golem freezes like stone…'],
        armor: ['Ночной латник смыкает пластины доспеха…', 'The night plate locks its armour plates…'],
        sword: ['Клинок-отступник встаёт в парирующую стойку…', 'The renegade blade takes a parrying stance…'],
        jelly: ['Королевский мармелад сжимается в плотный комок…', 'The royal jelly squeezes into a dense lump…']
    };
    $.guardText = function(c, kind) {
        var r = kind === 'elite' ? rareCtx() : null;
        var t = (r && $.GUARD_TEXT[r.key]) || $.GUARD_TEXT[c.eid];
        if (t) return L(t[0], t[1]);
        return L(ename() + ' уходит в глухую оборону…', ename() + ' goes into a deep guard…');
    };
    $.GUARD_STATE = 14;                                  // «盾防御» shield icon on the enemy status window (V132)
    $.guardIcon = function(on) {
        var e = actor(100); if (!e) return;
        try {
            if (on) { if (!e.isStateAffected($.GUARD_STATE)) e.addNewState($.GUARD_STATE); } else e.eraseState($.GUARD_STATE);   // no addState: it refuses a state removed earlier in the same action
            var ids = e.states().map(function(s) { return s.id; });
            sv(132, ids);
            if (window.$CSDM && $CSDM.WindowEnemy && gs(S_BATTLE)) {
                $CSDM.WindowEnemy.SetActor({ _states: ids });
                if ($CSDM.WindowEnemy.StatusIcons) { $CSDM.WindowEnemy.StatusIcons.StatesCount = -1; $CSDM.WindowEnemy.StatusIcons.draw(); }
            }
        } catch (err) { console.error('[NP_BossBalance] guardIcon', err); }
    };
    $.guardStart = function(c, kind) {
        c.guard = { at: c.gt, kind: kind, round: gv(157) };
        c.gNext = c.gt + 2;                              // not on the very next enemy action
        c.guards = (c.guards || 0) + 1;
        $.guardIcon(true);
        mlog('\\c[17]\\I[' + (($.GUARD_STATE && window.$dataStates && $dataStates[$.GUARD_STATE]) ? $dataStates[$.GUARD_STATE].iconIndex : 13) + ']' + $.guardText(c, kind));
        say(24, 'До его хода: супер-удары −50%, обычные удары −30%.', 'Until its next turn: supers −50 %, normal hits −30 %.');
    };
    $.guardExpire = function(c) {
        if (!c || !c.guard) return;
        c.guard = null;
        $.guardIcon(false);
        if (gv(123) > 0) say(24, ename() + ' раскрывается.', ename() + ' drops its guard.');
    };
    $.guardTry = function(c, kind) {                    // elite: true → skip the action
        if (!$.guardDecide(c, kind)) return false;
        $.guardStart(c, kind);
        return true;
    };
    $.guardBossStrike = function(c) {                    // boss: guards and strikes at half power
        if (!$.guardDecide(c, 'boss')) return false;
        $.guardStart(c, 'boss');
        sv(140, 1);                                      // plain attack, no skill / ero on a guard turn
        sv(138, Math.max(1, Math.floor(gv(138) * $.GUARD_STRIKE)));
        return true;
    };
    $.drainCharge = function(aid, n, nm) {
        var sp = S(); if (!sp || !sp.KIND || !sp.KIND[aid] || !inParty(aid)) return;
        var before = sp.charge(aid); sp.setCharge(aid, before - n);
        if (before > 0) say(2, (actor(aid) ? actor(aid).name() : '') + ': «' + nm + '» сбивает концентрацию (заряд супер-удара −' + Math.round(before - sp.charge(aid)) + ').',
            (actor(aid) ? actor(aid).name() : '') + ': the ' + nm + ' breaks concentration (super charge −' + Math.round(before - sp.charge(aid)) + ').');
    };

    // ------------------------------------------------------------------ CE367 end of the enemy turn
    $.enemyEnd = function() {
        var c = $.ctx(); if (!c) return;
        try { $._enemyEnd(c); } catch (e) { console.error('[NP_BossBalance] enemyEnd', e); }
        c.acted = false;
    };
    $.CADENCE = 4;                                   // a telegraph every 4th enemy turn (counter costs the target's action)
    $.heavyCadence = function(c) { return fapRelief(c) ? 6 : $.CADENCE; };
    $._enemyEnd = function(c) {
        if (!$.active() || !c.acted || $.STORY.indexOf(c.eid) >= 0 || gv(123) <= 0) return;
        var id = c.eid;
        // Dracula lifesteal: 50 % of the HP the party lost this turn (not after a holy hit)
        if (id === 539 && c.hpSnap) {
            var lost = 0;
            c.hpSnap.forEach(function(s) { var a = actor(s[0]); if (a) lost += Math.max(0, s[1] - a.hp); });
            if (lost > 0) {
                if (c.holyAt !== undefined && c.turn - c.holyAt <= 1) say(24, 'Святой свет жжёт графа — он не может пить кровь.', 'Holy light burns the Count — he cannot drink blood.');
                else { var h = heal(c, Math.ceil(lost * 0.5)); if (h > 0) say(18, 'Дракула пьёт силу жертвы: +' + h + ' HP.', 'Dracula drains his victim: +' + h + ' HP.'); }
            }
        }
        c.hpSnap = null;
        // Mimic: closes its maw every 3rd turn (armor 10 until its next turn)
        if (id === 662 && c.turn % 3 === 0 && !c.mimicSave) {
            c.mimicSave = [gv(136), gv(134)];
            sv(136, 10); sv(134, 10);
            say(17, 'Мимик захлопывает пасть: броня 10 до его следующего хода. Лучше переждать или усилить союзников.',
                'The mimic snaps its maw shut: armor 10 until its next turn. Better wait or buff allies.');
            return;
        }
        if (c.tele) return;
        // next telegraph
        var k = null;
        var cadence = $.heavyCadence(c);
        var due = c.tier >= 2 ? (c.turn % cadence === 1 && c.turn >= 1) : (c.phase >= 2 && c.turn % cadence === 1);
        if (id === 262) k = c.turn % cadence === 1 ? 'gaze' : null;                     // Medusa
        else if (id === 391) k = c.turn % cadence === 1 ? 'pollen' : null;              // Flower witch
        else if (id === 336) k = c.turn % cadence === 1 ? 'syringe' : null;             // Doctor
        else if (id === 214) k = due ? 'ram' : null;
        else if (id === 1002) k = due ? 'hook' : null;
        else if (id === 1001) k = due ? 'lunge' : null;
        else if (id === 10003) k = c.turn % cadence === 1 ? 'power' : null;
        else if (id === 539) k = due ? 'bat' : null;
        else if (id === 1004 && !c.drunk && c.turn % 4 === 0) {
            c.drunk = true; c.drunkTurn = c.turn; sv(135, gv(135) + 6);
            say(17, 'Пропойца делает глоток и шатается: по нему трудно попасть до его хода.', 'The Drunkard takes a swig and staggers: hard to hit until his turn.');
        }
        else if (due && $.NOSCALE.indexOf(id) < 0) k = id === 692 ? 'breath' : 'heavy';
        var pref = id === 1002 && inParty(2) ? 2 : null;                             // the hook goes for the priestess
        if (k) $.telegraph(c, k, pref);
    };

    // ------------------------------------------------------------------ injection
    function cmd(code, indent, p) { return { code: code, indent: indent, parameters: p, npBoss: true }; }
    function has(list) { return list.some(function(c) { return c.npBoss; }); }
    function endIdx(list) { var at = list.length - 1; while (at > 0 && list[at].code === 0 && list[at].indent === 0) at--; return at + 1; }
    $.injectCE34 = function(list) {
        if (has(list)) return 'already';
        list.splice(0, 0, cmd(355, 0, ['NP_BossBalance.beforeLoad()']));
        list.splice(endIdx(list), 0, cmd(355, 0, ['NP_BossBalance.afterLoad()']));
        return 'ok';
    };
    $.injectCE36 = function(list) {
        if (has(list)) return 'already';
        // The unique damage-to-log assignment follows armor subtraction and
        // precedes both the displayed damage and the party HP application.
        for (var i = 0; i < list.length; i++) {
            var p = list[i].parameters;
            if (list[i].code === 122 && p[0] === 54 && p[1] === 54 && p[2] === 0 && p[3] === 4 && p[4] === '$dmg') {
                list.splice(i, 0, cmd(355, list[i].indent, ['$dmg = NP_BossBalance.incomingDamage($dmg);']));
                return 'ok';
            }
        }
        return 'no anchor';
    };
    $.injectCE367 = function(list) {
        if (has(list)) return 'already';
        var a = -1, b = -1;
        for (var i = 0; i < list.length; i++) {
            if (a < 0 && list[i].code === 355 && /MapEvent\.call\(\s*53\s*,\s*13\s*,\s*4\s*\)/.test(list[i].parameters[0])) a = i;
            if (list[i].code === 118 && list[i].parameters[0] === '敵ターン終了') b = i;
        }
        if (a < 0 || b < 0) return 'no anchor';
        var ind = list[a].indent;
        // b > a: insert the later one first
        list.splice(b + 1, 0, cmd(355, list[b].indent, ['NP_BossBalance.enemyEnd()']));
        list.splice(a + 1, 0,
            cmd(111, ind, [12, 'NP_BossBalance.enemyAct()']),
            cmd(119, ind + 1, ['敵ターン終了']),
            cmd(0, ind + 1, []),
            cmd(412, ind, []));
        return 'ok';
    };
    $.injectCE368 = function(list) {
        if (has(list)) return 'already';
        list.splice(endIdx(list), 0, cmd(355, 0, ['NP_BossBalance.enemyTurnStart()']));
        list.splice(0, 0, cmd(355, 0, ['NP_BossBalance.enemyTurnBegin()']));
        return 'ok';
    };
    $.injectNothing = function(list, arg) {
        if (has(list)) return 'already';
        var n = 0;
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c.code === 402 && /^\\i\[4\]/.test(String(c.parameters[1])) && !c.npSuper) {
                list.splice(i + 1, 0, cmd(355, c.indent + 1, ['NP_BossBalance.brace(' + arg + ')']));
                n++; i++;
            }
        }
        return n ? 'ok' + n : 'no anchor';
    };
    $.injectCE32 = function(list) {
        if (has(list)) return 'already';
        list.splice(0, 0, cmd(355, 0, ['NP_BossBalance.battleEnd()']));
        return 'ok';
    };
    $.inject = function(ces) {
        var r = {};
        r.ce34 = ces[34] ? $.injectCE34(ces[34].list) : 'no CE34';
        r.ce36 = ces[36] ? $.injectCE36(ces[36].list) : 'no CE36';
        r.ce367 = ces[367] ? $.injectCE367(ces[367].list) : 'no CE367';
        r.ce368 = ces[368] ? $.injectCE368(ces[368].list) : 'no CE368';
        r.ce365 = ces[365] ? $.injectNothing(ces[365].list, '1') : 'no CE365';
        r.ce366 = ces[366] ? $.injectNothing(ces[366].list, '($gameParty.members()[$gameVariables.value(274)]||{actorId:function(){return 0;}}).actorId()') : 'no CE366';
        r.ce32 = ces[32] ? $.injectCE32(ces[32].list) : 'no CE32';
        r.super = $.patchSuper();
        $.injectResult = r;
        console.log('[NP_BossBalance] inject ' + JSON.stringify(r));
        return r;
    };
    if (typeof DataManager !== 'undefined') {
        var _isDb = DataManager.isDatabaseLoaded;
        DataManager.isDatabaseLoaded = function() {
            var ok = _isDb.apply(this, arguments);
            if (ok && !$._injected && window.$dataCommonEvents) {
                $._injected = true;
                try { $.inject($dataCommonEvents); } catch (e) { console.error('[NP_BossBalance] inject failed', e); }
            }
            return ok;
        };
    }
})();
