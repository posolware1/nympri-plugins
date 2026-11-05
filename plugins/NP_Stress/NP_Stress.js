var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_Stress.js — «Напряжение» (стресс в духе Darkest Dungeon), срывы и подъёмы,
// постоянные черты, храмовая служба. Nymphomania Priestess RU mod.
//=============================================================================
/*:
 * @plugindesc v1.1 [NP RU] Напряжение 0–100 у всех членов отряда, срывы/подъёмы, постоянные черты, храм.
 * @author NP RU mod
 *
 * @help
 * Ставится ПОСЛЕ NP_Titles и NP_ClothDamage (и перед NP_CampSkills).
 * Данные сохраняются в $gameSystem._npStress (старые сейвы инициализируются лениво).
 * Срывы/подъёмы и черты — «виртуальные» состояния: подмешиваются через
 * Game_Actor.traitObjects, ID в States.json не занимаются и в сейв не пишутся.
 * В галерее (S5) ничего не копится и не действует. Опция «Напряжение» в Настройках
 * выключает и напряжение, и черты (данные сохраняются).
 *
 * Скрипт-вызовы: NP_Stress.add(actorId, n, tag) / NP_Stress.get(id) /
 * NP_Stress.addTrait(id, traitId) / NP_Stress.temple()
 */
var NP_Stress = (function() {
    'use strict';
    var $ = {};
    $.VERSION = '1.1';
    var HERO = 1, PRI = 2, PM = 10, VP = 19, YAR = 21;
    var MALE = { 1: true, 21: true };
    var S = { GALLERY: 5, BATTLE: 14, BOSS: 15, ESCAPE: 16, NTR: 32 };
    var V = { LUST: 82, LOVE: 83, BOND: 204, EROSION: 214, PMBOND: 225, NIGHT: 4292, ACT: 270,
              EHP: 123, SEXH: 542, YSEX: 544, ITYA: 426, ACME_L: 417, ACME_R: 419, PMH: 3902, YPM: 3922, CHEAT: 428 };

    function gs(i) { return !!($gameSwitches && $gameSwitches.value(i)); }
    function gv(i) { return Number(($gameVariables && $gameVariables.value(i)) || 0); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function rnd() { return $.rng ? $.rng() : Math.random(); }
    function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
    function actor(id) { return $gameActors ? $gameActors.actor(id) : null; }
    function aname(id) { var a = actor(id); return a ? a.name() : '?'; }
    $.gallery = function() { return gs(S.GALLERY); };
    $.enabled = function() { return ConfigManager.npStress !== false; };
    $.active = function() { return $.enabled() && !$.gallery() && !!$gameSystem; };
    function inBattle() { return gs(S.BATTLE) || !!($gameParty && $gameParty.inBattle && $gameParty.inBattle()); }
    $.inBattle = inBattle;
    function party() { return $gameParty ? $gameParty.members().filter(function(m) { return m && m.isActor && m.isActor(); }) : []; }
    function partyIds() { return party().map(function(m) { return m.actorId(); }); }
    function inParty(id) { return partyIds().indexOf(id) >= 0; }
    function alive(id) { var a = actor(id); return !!a && inParty(id) && a.hp > 0 && !a.isStateAffected(1); }
    $.heroHere = function() { return inParty(HERO) && !actor(HERO).isDead(); };
    $.partyIds = partyIds;
    function stage() {
        try { if (typeof NP_PriestessDiary !== 'undefined' && NP_PriestessDiary.stage) return clamp(Number(NP_PriestessDiary.stage()) || 0, 0, 3); } catch (e) {}
        return 0;
    }
    $.stage = stage;
    function mlog(t) { try { if (typeof set_mlog === 'function') set_mlog(t); } catch (e) {} }
    $.aname = aname;

    // ---------------------------------------------------------------- данные
    $.data = function() {
        if (!$gameSystem) return null;
        var d = $gameSystem._npStress;
        if (!d) {
            d = $gameSystem._npStress = { v: 1, s: {}, aff: {}, traits: {}, buffs: [], streak: 0, best: 0,
                firstBreak: false, breaks: 0, virtues: 0, battles: 0, lastStage: -1, hist: [] };
        }
        if (!d._init) {
            d._init = true;
            if (!d.traits[PRI] || !d.traits[PRI].length) d.traits[PRI] = [{ id: 'devout', lock: false }];   // стартовая черта
        }
        return d;
    };
    function hist(t) { var d = $.data(); if (!d) return; d.hist.push(t); while (d.hist.length > 30) d.hist.shift(); }
    $.hist = hist;
    $.ver = 1;
    function bump() { $.ver++; }
    $.bump = bump;

    // ---------------------------------------------------------------- срывы / подъёмы
    var AFF = {
        distracted:  { n: NP_L('Рассеянность', "Distraction"), p: { 6: 0.8 }, skip: 0.2, d: NP_L('Ловкость −20%, 20% пропустить ход', "Dexterity −20%, 20% chance to skip a turn") },
        longing:     { n: NP_L('Томление', "Yearning"), lust: 2, skip: 0.1, d: NP_L('Похоть растёт вдвое, 10% пропустить ход', "Lust rises twice as fast, 10% chance to skip a turn") },
        defenseless: { n: NP_L('Беззащитность', "Vulnerable"), p: { 3: 0.8 }, taunt: true, d: NP_L('Выносливость −20%, враги чаще бьют её', "Endurance −20%, enemies target her more often") },
        jealousy:    { n: NP_L('Ревность', "Jealousy"), p: { 2: 1.25 }, skip: 0.2, d: NP_L('Сила +25%, но 20% пропустить ход', "Strength +25%, but 20% chance to skip a turn") },
        paranoia:    { n: NP_L('Паранойя', "Paranoia"), p: { 3: 0.75 }, talk: 0.5, d: NP_L('Выносливость −25%, разговоры успокаивают вдвое хуже', "Endurance −25%, talks are half as calming") },
        handsy:      { n: NP_L('Распустил руки', "Wandering Hands"), handsy: true, d: NP_L('Вместо атаки лезет к хозяюшке (при братане — отвлекается)', "Gropes the Missus instead of attacking (gets distracted with Buddy around)") },
        panic:       { n: NP_L('Паника', "Panic"), p: { 6: 0.75 }, skip: 0.3, d: NP_L('Ловкость −25%, 30% пропустить ход', "Dexterity −25%, 30% chance to skip a turn") },
        anger:       { n: NP_L('Злость', "Rage"), p: { 2: 1.2, 3: 0.8 }, d: NP_L('Сила +20%, Выносливость −20%', "Strength +20%, Endurance −20%") },
        apathy:      { n: NP_L('Апатия', "Apathy"), p: { 2: 0.85 }, skip: 0.3, d: NP_L('Сила −15%, 30% пропустить ход', "Strength −15%, 30% chance to skip a turn") }
    };
    var VIRT = {
        resolve:  { n: NP_L('Решимость', "Resolve"), p: { 3: 1.2 }, half: true, d: NP_L('Выносливость +20%, напряжение растёт вдвое медленнее', "Endurance +20%, stress rises half as fast") },
        holyfire: { n: NP_L('Святой огонь', "Holy Fire"), p: { 7: 1.3, 2: 1.1 }, d: NP_L('Вера +30%, Сила +10%', "Faith +30%, Strength +10%") },
        courage:  { n: NP_L('Кураж', "Swagger"), p: { 2: 1.2, 6: 1.1 }, d: NP_L('Сила +20%, Ловкость +10%', "Strength +20%, Dexterity +10%") }
    };
    $.AFF = AFF; $.VIRT = VIRT;
    var AFF_POOL = { 2: ['distracted', 'longing', 'defenseless'], 1: ['jealousy', 'paranoia'], 21: ['handsy', 'handsy', 'anger'] };
    var AFF_OTHER = ['panic', 'anger', 'apathy'];
    var AFF_TRAIT = { distracted: 'clumsy', longing: 'wanton', defenseless: 'skittish', jealousy: 'jealous', paranoia: 'suspicious',
                      handsy: 'drinker', panic: 'coward', anger: 'weakheart', apathy: 'insomnia' };
    var VIRT_TRAIT = { resolve: 'stalwart', holyfire: 'devout', courage: 'braveheart' };
    $.affDef = function(a) { return a ? (a.kind === 'v' ? VIRT[a.id] : AFF[a.id]) : null; };

    // ---------------------------------------------------------------- черты
    var TR = [
        // положительные
        { id: 'devout', s: 1, t: 2, n: NP_L('Набожная', "Devout"), nm: NP_L('Набожный', "Devout"), p: { 7: 1.1 }, x: 'brokenfaith', d: NP_L('Вера +10%; молитва снимает в 1,5 раза больше напряжения', "Faith +10%; prayer relieves 1.5× more stress") },
        { id: 'stalwart', s: 1, t: 2, n: NP_L('Стойкость', "Steadfast"), x: 'weakheart', d: NP_L('Напряжение от тяжёлых ударов и критов −25%', "Stress from heavy blows and crits −25%") },
        { id: 'tireless', s: 1, t: 1, n: NP_L('Неутомимость', "Tireless"), p: { 3: 1.05 }, d: NP_L('Выносливость +5%; нет +5 напряжения за каждый бой', "Endurance +5%; no +5 stress per battle") },
        { id: 'keeneye', s: 1, t: 1, n: NP_L('Меткий глаз', "Keen Eye"), p: { 6: 1.1 }, x: 'clumsy', d: NP_L('Ловкость +10%', "Dexterity +10%") },
        { id: 'battlelust', s: 1, t: 2, n: NP_L('Боевой азарт', "Battle Thrill"), p: { 2: 1.1 }, d: NP_L('Сила +10%; свой крит снимает ещё −3', "Strength +10%; own crits relieve another −3") },
        { id: 'coldblood', s: 1, t: 3, n: NP_L('Хладнокровие', "Cool-Headed"), x: 'fragile', d: NP_L('Любой рост напряжения −15%; шанс подъёма +10%', "All stress gain −15%; rally chance +10%") },
        { id: 'resilient', s: 1, t: 1, n: NP_L('Отходчивость', "Quick to Forgive"), d: NP_L('Любое снятие напряжения +25%', "All stress relief +25%") },
        { id: 'willtolive', s: 1, t: 2, n: NP_L('Воля к жизни', "Will to Live"), p: { 0: 1.05 }, d: NP_L('Макс. HP +5%; падения (своё и союзников) напрягают вдвое меньше', "Max HP +5%; falling (own or allies') causes half the stress") },
        { id: 'braveheart', s: 1, t: 3, n: NP_L('Храброе сердце', "Brave Heart"), x: 'coward', d: NP_L('Шанс подъёма вместо срыва +15%', "Chance to rally instead of breaking +15%") },
        { id: 'lucky', s: 1, t: 2, n: NP_L('Любимица удачи', "Fortune's Favorite"), nm: NP_L('Любимчик удачи', "Fortune's Favorite"), d: NP_L('10%: напряжение не растёт вовсе', "10%: stress doesn't rise at all") },
        { id: 'soul', s: 1, t: 2, n: NP_L('Душа компании', "Life of the Party"), d: NP_L('Реплики в бою и умения на привале успокаивают сильнее', "Battle quips and camp skills are more calming") },
        { id: 'hardened', s: 1, t: 1, n: NP_L('Закалённость', "Thick-Skinned"), d: NP_L('Приставания и похабщина напрягают вдвое меньше', "Groping and lewd talk cause half the stress") },
        { id: 'liberated', s: 1, t: 1, n: NP_L('Раскрепощённая', "Uninhibited"), nm: NP_L('Раскрепощённый', "Uninhibited"), d: NP_L('Приставания не напрягают; страстные сцены снимают +50%', "Groping causes no stress; passionate scenes relieve +50%") },
        // отрицательные
        { id: 'skittish', s: -1, t: 1, n: NP_L('Пугливость', "Skittish"), d: NP_L('Напряжение в бою +20%', "Stress in battle +20%") },
        { id: 'wanton', s: -1, t: 2, n: NP_L('Распутная', "Wanton"), only: [2], d: NP_L('Похоть растёт на 25% быстрее', "Lust rises 25% faster") },
        { id: 'jealous', s: -1, t: 2, n: NP_L('Ревнивец', "Jealous Type"), only: [1], d: NP_L('+5 к напряжению за ночные отлучки жрицы и когда к ней пристают', "+5 stress when the priestess slips away at night or gets groped") },
        { id: 'suspicious', s: -1, t: 1, n: NP_L('Мнительность', "Suspicious"), d: NP_L('Разговоры и реплики снимают вдвое меньше', "Talks and quips relieve half as much") },
        { id: 'clumsy', s: -1, t: 1, n: NP_L('Неуклюжесть', "Clumsy"), p: { 6: 0.9 }, x: 'keeneye', d: NP_L('Ловкость −10%', "Dexterity −10%") },
        { id: 'fragile', s: -1, t: 3, n: NP_L('Хрупкие нервы', "Fragile Nerves"), x: 'coldblood', d: NP_L('Любой рост напряжения +25%', "All stress gain +25%") },
        { id: 'insomnia', s: -1, t: 2, n: NP_L('Бессонница', "Insomnia"), d: NP_L('Сон не снимает напряжение; умения на привале −25%', "Sleep doesn't relieve stress; camp skills −25%") },
        { id: 'nightmares', s: -1, t: 2, n: NP_L('Кошмары', "Nightmares"), d: NP_L('+10 напряжения каждое утро', "+10 stress every morning") },
        { id: 'weakheart', s: -1, t: 2, n: NP_L('Слабое сердце', "Weak Heart"), p: { 3: 0.95 }, x: 'stalwart', d: NP_L('Выносливость −5%; тяжёлые удары и криты напрягают +50%', "Endurance −5%; heavy blows and crits cause +50% stress") },
        { id: 'coward', s: -1, t: 3, n: NP_L('Трусость', "Cowardice"), x: 'braveheart', d: NP_L('Шанс подъёма −15%; падение союзника напрягает +50%', "Rally chance −15%; an ally falling causes +50% stress") },
        { id: 'drinker', s: -1, t: 1, n: NP_L('Пристрастие к выпивке', "Fond of the Bottle"), p: { 3: 0.95 }, d: NP_L('Выносливость −5%; выпивка снимает ×1,5, но похмелье вдвое чаще', "Endurance −5%; drinking relieves ×1.5, but hangovers are twice as likely") },
        { id: 'brokenfaith', s: -1, t: 3, n: NP_L('Сломленная вера', "Broken Faith"), only: [2], p: { 7: 0.85 }, x: 'devout', d: NP_L('Вера −15%; молитва снимает вдвое меньше', "Faith −15%; prayer relieves half as much") }
    ];
    $.TRAITS = TR;
    var TRB = {}; TR.forEach(function(t) { TRB[t.id] = t; });
    $.trait = function(id) { return TRB[id] || null; };
    $.traitName = function(t, aid) { if (typeof t === 'string') t = TRB[t]; return t ? ((MALE[aid] && t.nm) ? t.nm : t.n) : '?'; };
    $.PRICE = { lock: [0, 150, 300, 500], remove: [0, 200, 400, 700] };
    $.MAXT = 4;

    $.traits = function(aid) { var d = $.data(); if (!d) return []; return (d.traits[aid] || []).filter(function(e) { return TRB[e.id]; }); };
    $.hasTrait = function(aid, id) { if (!$.active()) return false; return $.traits(aid).some(function(e) { return e.id === id; }); };
    var has = $.hasTrait;
    function canHave(aid, t) { return !t.only || t.only.indexOf(aid) >= 0; }

    // добавление: занятые слоты → замена случайной незакреплённой того же знака
    $.addTrait = function(aid, id, src, silent) {
        if (!$.active()) return null;
        var t = TRB[id], d = $.data(); if (!t || !d || !actor(aid) || !canHave(aid, t)) return null;
        var list = d.traits[aid] = d.traits[aid] || [];
        if (list.some(function(e) { return e.id === id; })) return null;
        if (t.x) {
            var opp = list.filter(function(e) { return e.id === t.x; })[0];
            if (opp) { if (opp.lock) return null; list.splice(list.indexOf(opp), 1); }
        }
        var same = list.filter(function(e) { return TRB[e.id] && TRB[e.id].s === t.s; });
        var replaced = null;
        if (same.length >= $.MAXT) {
            var free = same.filter(function(e) { return !e.lock; });
            if (!free.length) return null;
            replaced = pick(free);
            list.splice(list.indexOf(replaced), 1);
        }
        list.push({ id: id, lock: false });
        bump();
        var msg = aname(aid) + NP_L(': новая черта «', ": new trait «") + $.traitName(t, aid) + '»' + (replaced ? NP_L(' (вместо «', " (replaces «") + $.traitName(replaced.id, aid) + '»)' : '');
        hist(msg + (src ? ' [' + src + ']' : ''));
        if (!silent) $.toast(msg, t.s > 0 ? 'good' : 'bad');
        return { id: id, replaced: replaced ? replaced.id : null };
    };
    $.removeTrait = function(aid, id) {
        var d = $.data(); if (!d || !d.traits[aid]) return false;
        var l = d.traits[aid], i = -1;
        for (var k = 0; k < l.length; k++) if (l[k].id === id) i = k;
        if (i < 0) return false; l.splice(i, 1); bump(); return true;
    };
    $.lockTrait = function(aid, id, v) {
        var e = $.traits(aid).filter(function(x) { return x.id === id; })[0];
        if (!e) return false; e.lock = v !== false; return true;
    };
    $.randomTrait = function(aid, sign, src, pool) {
        var c = (pool || TR.map(function(t) { return t.id; })).filter(function(id) {
            var t = TRB[id]; return t && t.s === sign && canHave(aid, t) && !has(aid, id);
        });
        if (!c.length) return null;
        return $.addTrait(aid, pick(c), src);
    };
    $.removeRandomNegative = function(aid) {
        var c = $.traits(aid).filter(function(e) { return TRB[e.id].s < 0 && !e.lock; });
        if (!c.length) return null;
        var e = pick(c); $.removeTrait(aid, e.id); hist(aname(aid) + NP_L(': снята черта «', ": trait removed «") + $.traitName(e.id, aid) + '»');
        return e.id;
    };

    // ---------------------------------------------------------------- баффы привала
    $.buffs = function() { var d = $.data(); return d ? d.buffs : []; };
    $.addBuff = function(aid, p, n, src) {   // aid 0 = весь отряд
        var d = $.data(); if (!d || !$.active()) return;
        d.buffs = d.buffs.filter(function(b) { return !(b.src === src && b.a === aid); });
        d.buffs.push({ a: aid, p: p, n: n || 3, src: src }); bump();
    };
    function tickBuffs() {
        var d = $.data(); if (!d) return;
        d.buffs.forEach(function(b) { b.n--; });
        d.buffs = d.buffs.filter(function(b) { return b.n > 0; }); bump();
    }
    $.buffsOf = function(aid) { return $.buffs().filter(function(b) { return b.a === 0 || b.a === aid; }); };

    // ---------------------------------------------------------------- виртуальные состояния
    function mkObj(name, p) {
        var tr = [];
        Object.keys(p || {}).forEach(function(k) { tr.push({ code: 21, dataId: Number(k), value: p[k] }); });
        return { id: 0, name: name, iconIndex: 0, traits: tr, meta: {}, note: '', npStress: true };
    }
    var cache = {};
    $.extraObjects = function(aid) {
        if (!$.active() || !$gameSystem || !$gameSystem._npStress) return [];
        var c = cache[aid];
        if (c && c.v === $.ver) return c.o;
        var d = $.data(), o = [];
        var a = d.aff[aid], ad = $.affDef(a);
        if (ad && ad.p) o.push(mkObj(ad.n, ad.p));
        $.traits(aid).forEach(function(e) { var t = TRB[e.id]; if (t.p) o.push(mkObj(t.n, t.p)); });
        $.buffsOf(aid).forEach(function(b) { o.push(mkObj(b.src, b.p)); });
        cache[aid] = { v: $.ver, o: o };
        return o;
    };
    var _traitObjects = Game_Actor.prototype.traitObjects;
    Game_Actor.prototype.traitObjects = function() {
        var r = _traitObjects.apply(this, arguments);
        try { var x = $.extraObjects(this.actorId()); if (x.length) r = r.concat(x); } catch (e) {}
        return r;
    };
    var _onAfterLoad = Game_System.prototype.onAfterLoad;
    Game_System.prototype.onAfterLoad = function() { _onAfterLoad.apply(this, arguments); bump(); cache = {}; };

    // ---------------------------------------------------------------- напряжение
    $.get = function(aid) { var d = $.data(); return d ? clamp(Number(d.s[aid]) || 0, 0, 100) : 0; };
    $.set = function(aid, v) { var d = $.data(); if (!d) return; d.s[aid] = clamp(Math.round(v), 0, 100); };
    $.aff = function(aid) { var d = $.data(); return d ? d.aff[aid] || null : null; };
    function gainMult(aid, tag) {
        var m = 1, a = $.aff(aid);
        if (a && a.kind === 'v' && VIRT[a.id] && VIRT[a.id].half) m *= 0.5;
        if (has(aid, 'coldblood')) m *= 0.85;
        if (has(aid, 'fragile')) m *= 1.25;
        var battleTag = { hit: 1, crit: 1, fall: 1, battle: 1, defeat: 1, lewd: 1 };
        if (battleTag[tag] && inBattle() && has(aid, 'skittish')) m *= 1.2;
        if (tag === 'hit' || tag === 'crit') { if (has(aid, 'stalwart')) m *= 0.75; if (has(aid, 'weakheart')) m *= 1.5; }
        if (tag === 'lewd') { if (has(aid, 'liberated')) m *= 0; else if (has(aid, 'hardened')) m *= 0.5; }
        if (tag === 'fall') { if (has(aid, 'willtolive')) m *= 0.5; if (has(aid, 'coward')) m *= 1.5; }
        return m;
    }
    function reliefMult(aid, tag) {
        var m = 1, a = $.aff(aid);
        if (has(aid, 'resilient')) m *= 1.25;
        if ((tag === 'talk' || tag === 'banter') && has(aid, 'suspicious')) m *= 0.5;
        if ((tag === 'talk' || tag === 'banter') && a && a.id === 'paranoia') m *= 0.5;
        if (tag === 'camp' && has(aid, 'insomnia')) m *= 0.75;
        if (tag === 'prayer') { if (has(aid, 'devout')) m *= 1.5; if (has(aid, 'brokenfaith')) m *= 0.5; }
        if (tag === 'drink' && has(aid, 'drinker')) m *= 1.5;
        if (tag === 'love' && has(aid, 'liberated')) m *= 1.5;
        return m;
    }
    // n>0 — рост, n<0 — снятие. Возвращает фактическое изменение.
    $.add = function(aid, n, tag, why) {
        if (!$.active() || !n || !actor(aid)) return 0;
        var d = $.data(), before = $.get(aid), delta;
        if (n > 0) {
            if (has(aid, 'lucky') && rnd() < 0.1) return 0;
            delta = Math.round(n * gainMult(aid, tag));
        } else delta = Math.round(n * reliefMult(aid, tag));
        if (!delta) return 0;
        var after = clamp(before + delta, 0, 100);
        d.s[aid] = after;
        $.lastChange = { aid: aid, d: after - before, tag: tag, why: why };
        if (after >= 100 && !d.aff[aid]) $.doBreak(aid, why);
        return after - before;
    };
    $.addAll = function(n, tag, why, except) {
        var r = {}; partyIds().forEach(function(id) { if (id !== except) r[id] = $.add(id, n, tag, why); }); return r;
    };

    $.doBreak = function(aid, why, forceKind, forceId) {
        var d = $.data(); if (!d || !$.active()) return null;
        var chance = 0.25;
        if (has(aid, 'braveheart')) chance += 0.15;
        if (has(aid, 'coldblood')) chance += 0.10;
        if (has(aid, 'coward')) chance -= 0.15;
        if (has(aid, 'brokenfaith')) chance -= 0.10;
        var virt = forceKind ? forceKind === 'v' : rnd() < clamp(chance, 0.05, 0.6);
        var id;
        if (virt) {
            var vp = aid === PRI ? (has(aid, 'brokenfaith') ? ['resolve'] : ['resolve', 'holyfire']) : ['resolve', 'courage'];
            id = forceId || pick(vp);
            d.aff[aid] = { id: id, kind: 'v' }; d.s[aid] = 30; d.virtues++;
        } else {
            id = forceId || pick(AFF_POOL[aid] || AFF_OTHER);
            if (id === 'longing' && aid !== PRI) id = 'panic';
            d.aff[aid] = { id: id, kind: 'a' }; d.s[aid] = 50; d.breaks++;
            d.firstBreak = true;
            var b = cur(); if (b) b.broke = true;
            d.streak = 0;
        }
        bump();
        var def = virt ? VIRT[id] : AFF[id];
        hist(aname(aid) + (virt ? NP_L(' — ПОДЪЁМ: ', " — RALLY: ") : NP_L(' — СРЫВ: ', " — BREAK: ")) + def.n);
        mlog((virt ? NP_L('【Подъём】 ', "【Rally】 ") : NP_L('【Срыв】 ', "【Break】 ")) + aname(aid) + ': ' + def.n + ' — ' + def.d);
        if (rnd() < 0.5) {
            var tid = virt ? VIRT_TRAIT[id] : AFF_TRAIT[id];
            if (tid && canHave(aid, TRB[tid])) $.addTrait(aid, tid, virt ? NP_L('подъём', "rally") : NP_L('срыв', "break"));
        }
        $.fx.push({ aid: aid, kind: virt ? 'v' : 'a', id: id, name: def.n, t: 0 });
        return d.aff[aid];
    };
    $.clearAfflictions = function() { var d = $.data(); if (!d) return; d.aff = {}; bump(); };
    $.affLabel = function(aid) {
        var a = $.aff(aid), def = $.affDef(a);
        return def ? ((a.kind === 'v' ? NP_L('Подъём: ', "Rally: ") : NP_L('Срыв: ', "Break: ")) + def.n) : '';
    };

    // ---------------------------------------------------------------- отдых (утро)
    $.morning = function(where) {
        var d = $.data(); if (!d) return;
        if ($.gallery()) return;
        var had = Object.keys(d.aff).length;
        d.aff = {}; bump();
        if (!$.enabled()) return;
        var base = where === 'camp' ? -5 : -15;
        partyIds().forEach(function(id) {
            if (!has(id, 'insomnia')) $.add(id, base, 'rest', NP_L('сон', "sleep"));
            if (has(id, 'nightmares')) $.add(id, 10, 'misc', NP_L('кошмары', "nightmares"));
        });
        $.lastMorning = { where: where, cleared: had };
    };

    // ---------------------------------------------------------------- бой
    function tmp() { return (typeof $gameTemp !== 'undefined' && $gameTemp) ? $gameTemp : null; }
    function cur() { var t = tmp(); return t ? t._npStressB || null : null; }
    $.battle = cur;
    function beginBattle() {
        var t = tmp(); if (!t) return;
        var main = t._npStressNext === 'main';
        t._npStressNext = null;
        if (!main || !$.active()) { t._npStressB = null; return; }
        t._npStressB = { main: true, broke: false, won: false, lost: false, fallen: {}, banter: 0, lastBanter: -999 };
        partyIds().forEach(function(id) {
            if (!has(id, 'tireless')) $.add(id, 5, 'battle', NP_L('ещё один бой', "another battle"));
            if (has(id, 'skittish')) $.add(id, 1, 'battle', NP_L('пугливость', "skittishness"));
        });
    }
    function endBattle() {
        var t = tmp(), b = cur(); if (!t || !b) return;
        t._npStressB = null;
        var d = $.data(); if (!d) return;
        d.battles++;
        tickBuffs();
        if (!b.broke) { d.streak++; if (d.streak > d.best) d.best = d.streak; } else d.streak = 0;
        t._npTitlesPending = true;
    }
    function victory() {
        var b = cur(); if (!b || b.won) return; b.won = true;
        var ids = partyIds().filter(function(id) { return actor(id).hp > 0; });
        if (gs(S.BOSS)) {
            $.addAll(-15, 'boss', NP_L('победа над боссом', "boss defeated"));
            if (ids.length && rnd() < 0.25) $.randomTrait(pick(ids), 1, NP_L('босс', "boss"));
        } else if (ids.length && rnd() < 0.04) {
            $.randomTrait(pick(ids), 1, NP_L('победа', "victory"), ['keeneye', 'battlelust', 'stalwart', 'tireless', 'hardened', 'willtolive']);
        }
    }
    function defeat() {
        var b = cur(); if (!b || b.lost) return; b.lost = true;
        $.addAll(20, 'defeat', NP_L('поражение', "defeat"));
        partyIds().forEach(function(id) { if (rnd() < (id === PRI ? 0.4 : 0.2)) $.randomTrait(id, -1, NP_L('поражение', "defeat")); });
    }

    var _swSet = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(id, value) {
        var before = (id === S.BATTLE || (id >= 1102 && id <= 1147)) ? !!this.value(id) : null;
        _swSet.apply(this, arguments);
        if (before === null) return;
        try {
            var now = !!this.value(id);
            if (id === S.BATTLE) { if (!before && now) beginBattle(); else if (before && !now) endBattle(); }
            else if (!before && now && $.active()) {
                // события Зельеварки (взрослая алхимичка) с героем: 1131+ — близость, ниже — тёплые встречи
                var strong = id >= 1131;
                $.add(HERO, strong ? -30 : -10, 'love', NP_L('Зельеварка', "Potion Maker"));
                $.add(PM, strong ? -30 : -10, 'love', NP_L('с героем', "with the hero"));
            }
        } catch (e) { console.warn('NP_Stress switch', e); }
    };

    // какие сцены снимают / добавляют напряжение (прирост переменной 1..10, не в галерее)
    var WATCH = {};
    WATCH[V.SEXH] = function() { $.add(PRI, -30, 'love', NP_L('близость с героем', "intimacy with the hero")); $.add(HERO, -30, 'love', NP_L('близость со жрицей', "intimacy with the priestess")); };
    WATCH[V.ITYA] = function() { $.add(PRI, -15, 'love', NP_L('нежность', "tenderness")); $.add(HERO, -15, 'love', NP_L('нежность', "tenderness")); };
    WATCH[V.ACME_L] = function() { $.add(PRI, -10, 'love', NP_L('любовь', "love")); };
    WATCH[V.ACME_R] = function() { $.add(PRI, -10, 'love', NP_L('любовь', "love")); };
    WATCH[V.LOVE] = function(dv) { $.add(PRI, -Math.min(10, 3 * dv), 'love', NP_L('любовь растёт', "love grows")); $.add(HERO, -Math.min(6, 2 * dv), 'love', NP_L('любовь', "love")); };
    WATCH[V.YSEX] = function() {
        $.add(YAR, -30, 'love', NP_L('с хозяюшкой', "with the Missus"));
        var st = stage();
        if (st === 0) { $.add(PRI, 10, 'guilt', NP_L('стыд', "shame")); if (rnd() < 0.15) $.addTrait(PRI, 'nightmares', NP_L('стыд', "shame")); }
        else $.add(PRI, [0, -10, -25, -35][st], 'love', NP_L('с Яризо', "with Yarizo"));
    };
    WATCH[V.PMH] = function() { $.add(HERO, -30, 'love', NP_L('Зельеварка', "Potion Maker")); $.add(PM, -30, 'love', NP_L('герой', "hero")); };
    WATCH[V.YPM] = function() { $.add(YAR, -30, 'love', NP_L('Зельеварка', "Potion Maker")); $.add(PM, -30, 'love', NP_L('Яризо', "Yarizo")); };
    WATCH[V.CHEAT] = function() { if (stage() >= 2) $.add(PRI, -15, 'love', NP_L('измена', "infidelity")); else $.add(PRI, 10, 'guilt', NP_L('измена', "infidelity")); };
    WATCH[V.NIGHT] = function() {
        $.add(HERO, 10 + (has(HERO, 'jealous') ? 5 : 0), 'night', NP_L('жрицы нет ночью', "priestess gone at night"));
        if (gv(V.NIGHT) >= 3 && rnd() < 0.3) $.addTrait(HERO, 'jealous', NP_L('ночные отлучки', "nightly absences"));
    };
    $.WATCH = WATCH;
    $._mute = false;
    var _varSet = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(id, value) {
        var watch = WATCH[id], track = watch || id === V.EHP;
        var before = track || id === V.LUST ? Number(this.value(id)) || 0 : 0;
        try {
            if (id === 290 && $._forceHandsy) { $._forceHandsy = false; value = -99; }
            if (id === V.LUST && $.active() && typeof value === 'number') {
                var inc = value - before;
                if (inc > 0) {
                    var m = 1, a = $.aff(PRI);
                    if (a && AFF[a.id] && AFF[a.id].lust) m *= AFF[a.id].lust;
                    if (has(PRI, 'wanton')) m *= 1.25;
                    if (m !== 1) value = before + Math.round(inc * m);
                }
            }
        } catch (e) {}
        _varSet.call(this, id, value);
        if (!track) return;
        try {
            var now = Number(this.value(id)) || 0, dv = now - before;
            if (id === V.EHP) {   // крит по врагу: снимает атакующему
                if (cur() && window.$roll_critical === 1 && dv < 0) {
                    var aid = gv(V.ACT);
                    if (inParty(aid)) $.add(aid, -3 - (has(aid, 'battlelust') ? 3 : 0), 'crit', NP_L('крит', "crit"));
                }
                return;
            }
            if (dv > 0 && dv <= 10 && $.active() && !$._mute) watch(dv);
        } catch (e2) { console.warn('NP_Stress var', e2); }
    };

    // урон по своим
    var _gainHp = Game_Battler.prototype.gainHp;
    Game_Battler.prototype.gainHp = function(value) {
        var isA = this.isActor && this.isActor(), hp0 = this.hp;
        _gainHp.apply(this, arguments);
        if (!isA || !(value < 0)) return;
        try {
            if (!$.active() || !inBattle()) return;
            var aid = this.actorId(); if (!inParty(aid)) return;
            var b = cur(); if (!b && !$gameParty.inBattle()) return;
            var dmg = -value;
            if (window.$roll_critical === 1) $.add(aid, 6, 'crit', NP_L('крит по ней', "crit on her"));
            if (dmg >= this.mhp * 0.25) $.add(aid, 8, 'hit', NP_L('тяжёлый удар', "heavy blow"));
            else $.add(aid, clamp(Math.ceil(dmg / this.mhp * 16), 1, 4), 'hit', NP_L('удар', "hit"));
            if (hp0 > 0 && this.hp <= 0 && b && !b.fallen[aid]) {
                b.fallen[aid] = true;
                $.add(aid, 10, 'fall', NP_L('упал(а)', "fell"));
                $.addAll(15, 'fall', aname(aid) + NP_L(' пал(а)', " fell"), aid);
            }
        } catch (e) { console.warn('NP_Stress gainHp', e); }
    };

    // CE-хуки
    var LEWD_CE = { 362: 6, 371: 8, 372: 8, 375: 10 };
    var _cmd117 = Game_Interpreter.prototype.command117;
    Game_Interpreter.prototype.command117 = function() {
        try {
            var id = this._params[0], t = tmp();
            if (id === 31 && t) t._npStressNext = 'main';
            var b = cur();
            if (b && $.active()) {
                if (id === 33) victory();
                else if (LEWD_CE[id]) {
                    $.add(PRI, LEWD_CE[id], 'lewd', NP_L('приставания врага', "enemy groping"));
                    if (has(HERO, 'jealous') && $.heroHere()) $.add(HERO, 5, 'misc', NP_L('ревность', "jealousy"));
                }
                else if (id === 367) taunt();
                else if (id === 365 || id === 366) $.maybeBanter();
            }
        } catch (e) { console.warn('NP_Stress 117', e); }
        return _cmd117.apply(this, arguments);
    };
    function taunt() {
        var a = $.aff(PRI); if (!a || a.id !== 'defenseless' || !Array.isArray(window.$hate)) return;
        var idx = $gameParty._actors.indexOf(PRI); if (idx < 0 || idx >= $hate.length) return;
        var mx = window.$hate_max || 3; if ($hate[idx] >= mx) return;
        var o = -1;
        for (var i = 0; i < $hate.length; i++) if (i !== idx && $hate[i] > 0 && (o < 0 || $hate[i] > $hate[o])) o = i;
        if (o >= 0) { $hate[o] -= 1; $hate[idx] += 1; }
    }
    $.taunt = taunt;
    if (Game_Interpreter.prototype.knsCallMapEvent) {
        var _kcme = Game_Interpreter.prototype.knsCallMapEvent;
        Game_Interpreter.prototype.knsCallMapEvent = function(mapId, eventId) {
            try {
                if (Number(mapId) === 53 && cur() && $.active()) {
                    var e = Number(eventId);
                    if (e === 3) defeat();
                    else if ((e >= 16 && e <= 30) || e === 37) flirt(e);
                }
            } catch (err) {}
            return _kcme.apply(this, arguments);
        };
    }
    // флирт и лапанье между своими в бою (Яризо ↔ жрица): снимает обоим, жрице — по стадии
    function flirt(e) {
        var st = stage();
        var pr = [0, -3, -6, -8][st];
        if (e === 37) pr = [-2, -4, -6, -8][st];             // жрица сама дразнит Яризо (RU ev37)
        if (pr) $.add(PRI, pr, 'love', NP_L('заигрывания', "flirting")); else if (!has(PRI, 'liberated')) $.add(PRI, 2, 'lewd', NP_L('смущение', "embarrassment"));
        $.add(YAR, -6, 'love', NP_L('заигрывания', "flirting"));
        if ($.heroHere() && has(HERO, 'jealous')) $.add(HERO, 5, 'misc', NP_L('ревность', "jealousy"));
    }
    $.flirt = flirt;

    // проверка хода (вставляется в конец CE364)
    $.turnCheck = function() {
        $._forceHandsy = false;
        if (!$.active() || !cur()) return;
        if (window.$skip_turn === 1) return;
        var aid = gv(V.ACT), a = $.aff(aid); if (!a || a.kind !== 'a') return;
        var def = AFF[a.id]; if (!def) return;
        if (def.handsy) {
            if (gs(S.NTR) && !$.heroHere() && gv(V.BOND) >= 1 && rnd() < 0.5) {
                $._forceHandsy = true;
                mlog(NP_L('【Срыв】 ', "【Break】 ") + aname(aid) + NP_L(': «Хозяюшка, иди-ка сюда…» — руки сами тянутся.', ": “C'mere, Missus…” — his hands just wander on their own."));
            } else if (rnd() < 0.25) {
                window.$skip_turn = 1;
                mlog(NP_L('【Срыв】 ', "【Break】 ") + aname(aid) + NP_L(' засмотрелся и пропускает ход.', " got distracted staring and skips a turn."));
            }
            return;
        }
        if (def.skip && rnd() < def.skip) {
            window.$skip_turn = 1;
            var why = { jealousy: $.heroHere() && inParty(YAR) ? NP_L('сверлит взглядом Яризо', "glares daggers at Yarizo") : NP_L('кипит от ревности', "seethes with jealousy"),
                        panic: NP_L('мечется в панике', "flails in a panic"), apathy: NP_L('безучастно опускает оружие', "listlessly lowers his weapon"), distracted: NP_L('теряет нить молитвы', "loses the thread of her prayer"),
                        longing: NP_L('сбивается — тело горит', "falters — her body is burning") }[a.id] || def.n;
            mlog(NP_L('【Срыв】 ', "【Break】 ") + aname(aid) + ' ' + why + NP_L(' и пропускает ход.', " and skips a turn."));
        }
    };

    // ---------------------------------------------------------------- реплики в бою
    var BANTER = {
        2: [NP_L('Да хранит нас Свет!', "May the Light protect us!"), NP_L('Держитесь, я подлечу!', "Hold on, I'll heal you!"), NP_L('Ещё немного… мы справимся.', "Just a little more… we can do this."), NP_L('Не сдаёмся!', "Don't give up!")],
        1: [NP_L('Держись за мной!', "Stay behind me!"), NP_L('Хорошо идём!', "We're doing great!"), NP_L('Ну давай, попробуй ещё!', "Come on, try that again!"), NP_L('Прикрываю!', "I've got you covered!")],
        21: [NP_L('Не отставай, хозяюшка!', "Keep up, Missus!"), NP_L('Братан, оставь и мне кусочек!', "Buddy, save a piece for me!"), NP_L('Эх, разомнёмся!', "Heh, time to stretch my legs!"), NP_L('Братан, спину прикрою!', "I got your back, Buddy!")],
        '21x': [NP_L('Хозяюшка, после боя — ко мне под бочок!', "Missus, after this fight, come snuggle up with me!"), NP_L('Ух, как ты наклоняешься, хозяюшка… бей их, бей!', "Ooh, the way ya bend over, Missus… hit 'em, hit 'em!"), NP_L('Хозяюшка, ты сегодня горячая!', "Missus, you're on fire today!")],
        10: [NP_L('Только не забрызгайте мои склянки!', "Just don't splatter my vials!"), NP_L('Есть у меня зелье на такой случай…', "I've got a potion for just this occasion…"), NP_L('Ха, и это всё?', "Ha, is that all?")],
        19: [NP_L('Ночь на нашей стороне.', "The night is on our side."), NP_L('Смертные такие шумные…', "Mortals are so noisy…"), NP_L('Не смей ранить моих слуг!', "Don't you dare hurt my servants!")],
        x: [NP_L('Вперёд!', "Forward!"), NP_L('Держимся!', "Hold the line!")]
    };
    var BANTER_AFF = { panic: NP_L('Мы все здесь умрём!', "We're all going to die here!"), anger: NP_L('Да чтоб вас всех!', "Damn you all!"), apathy: NP_L('Какая разница…', "What does it even matter…"),
        jealousy: NP_L('Не смей на неё так смотреть!', "Don't you dare look at her like that!"), paranoia: NP_L('Кто-то из вас меня подставит…', "One of you is gonna sell me out…"), distracted: NP_L('А?.. Что?.. Я задумалась…', "Huh?.. What?.. I was lost in thought…"),
        longing: NP_L('Жарко… так жарко…', "So hot… it's so hot…"), defenseless: NP_L('Я… не могу собраться…', "I… can't focus…"), handsy: NP_L('Хозяюшка, ну иди сюда…', "Come on, Missus, c'mere…"), handsyH: NP_L('Эх, засмотрелся…', "Whoops, got distracted lookin'…"),
        resolve: NP_L('Я не отступлю!', "I will not retreat!"), holyfire: NP_L('Свет со мной!', "The Light is with me!"), courage: NP_L('А ну, кто следующий?!', "Alright, who's next?!") };
    $.BANTER = BANTER; $.BANTER_AFF = BANTER_AFF;
    $.banterChance = 0.15;
    $.maybeBanter = function(force, who) {
        var b = cur(); if (!b || !$.active()) return null;
        var f = Graphics.frameCount;
        if (!force && (f - b.lastBanter < 240 || rnd() >= $.banterChance)) return null;
        var ids = partyIds().filter(function(id) { return alive(id); });
        if (!ids.length) return null;
        var aid = who && ids.indexOf(who) >= 0 ? who : pick(ids), a = $.aff(aid), line, bad = false;
        var lewdOk = gs(S.NTR) && !$.heroHere();
        if (a) { line = (a.id === 'handsy' && !lewdOk) ? BANTER_AFF.handsyH : BANTER_AFF[a.id]; bad = a.kind === 'a'; }
        else if (aid === YAR) line = pick(lewdOk ? BANTER['21x'].concat(BANTER[21]) : BANTER[21]);
        else line = pick(BANTER[aid] || BANTER.x);
        b.lastBanter = f; b.banter++;
        var k = has(aid, 'soul') ? 2 : 1;
        ids.forEach(function(id) { if (bad) { if (id !== aid) $.add(id, 2, 'misc', NP_L('реплика', "quip")); } else $.add(id, -1 * k, 'banter', NP_L('реплика', "quip")); });
        $.bubbles.push({ aid: aid, text: line, bad: bad, t: 0 });
        return { aid: aid, text: line, bad: bad };
    };

    // ---------------------------------------------------------------- инъекции в CE
    function mark(code, indent, params) { return { code: code, indent: indent, parameters: params, npStress: true }; }
    $.inject = function(ces) {
        var r = {};
        var l = ces[364] && ces[364].list;
        if (!l) r.ce364 = 'none';
        else if (l.some(function(x) { return x.npStress; })) r.ce364 = 'already';
        else { l.splice(l.length - 1, 0, mark(355, 0, ['NP_Stress.turnCheck()'])); r.ce364 = 'ok'; }
        var l2 = ces[325] && ces[325].list;
        if (!l2) r.ce325 = 'none';
        else if (l2.some(function(x) { return x.npStress; })) r.ce325 = 'already';
        else {
            var k = -1;
            // основной сон: 118 «睡眠処理» → 117 [323] на верхнем уровне (первый 117[323] — ветка «ночного отсутствия»)
            for (var i = 0; i < l2.length; i++) if (l2[i].code === 117 && l2[i].parameters[0] === 323 && i > 0 && l2[i - 1].code === 118) { k = i; break; }
            if (k < 0) for (var i2 = 0; i2 < l2.length; i2++) if (l2[i2].code === 117 && l2[i2].parameters[0] === 323 && l2[i2].indent === 0) { k = i2; break; }
            if (k < 0) r.ce325 = 'no anchor';
            else {
                l2.splice(k + 1, 0, mark(355, l2[k].indent, ["NP_Stress.morning($dataMap && $dataMap.note && $dataMap.note.indexOf('キャンプ') >= 0 ? 'camp' : 'inn');"]),
                                    mark(655, l2[k].indent, ["if (window.NP_Camp) NP_Camp.morning();"]));
                r.ce325 = 'ok@' + (k + 1);
            }
        }
        $.injectResult = r;
        console.log('[NP_Stress] inject ' + JSON.stringify(r));
        return r;
    };
    var _isDbLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        var ok = _isDbLoaded.apply(this, arguments);
        if (ok && !$._injected && window.$dataCommonEvents) {
            $._injected = true;
            try { $.inject($dataCommonEvents); } catch (e) { console.error('[NP_Stress] inject failed', e); }
        }
        return ok;
    };

    // ---------------------------------------------------------------- храм (Map015, ev11 «神父»)
    $.TEMPLE_CHOICE = NP_L('Храмовая служба (черты)', "Temple Service (traits)");
    $.patchChurch = function(map) {
        try {
            var e = map && map.events && map.events[11]; if (!e || !e.pages || !e.pages[0]) return 'no event';
            var l = e.pages[0].list;
            if (l.some(function(c) { return c.npStress; })) return 'already';
            var ci = -1;
            for (var i = 0; i < l.length; i++) if (l[i].code === 102 && l[i].parameters[0].length === 2 && l[i].parameters[0][0] === '\\v[61]') { ci = i; break; }
            if (ci < 0) return 'no choice';
            var ind = l[ci].indent, c = l[ci];
            var cancelAt = -1;
            for (var j = ci + 1; j < l.length; j++) {
                if (l[j].indent === ind && l[j].code === 402 && l[j].parameters[0] === 1) { cancelAt = j; break; }
                if (l[j].indent === ind && l[j].code === 404) break;
            }
            if (cancelAt < 0) return 'no branch';
            // [молитва/обучение, ХРАМ, отмена]; отмена смещается на индекс 2
            c.parameters = [[c.parameters[0][0], $.TEMPLE_CHOICE, c.parameters[0][1]], 2, c.parameters[2], c.parameters[3], c.parameters[4]];
            c.npStress = true;
            l[cancelAt].parameters = [2, l[cancelAt].parameters[1]];
            l.splice(cancelAt, 0, mark(402, ind, [1, $.TEMPLE_CHOICE]), mark(355, ind + 1, ['NP_Stress.temple()']), mark(0, ind + 1, []));
            return 'ok';
        } catch (err) { return 'error ' + err; }
    };
    var _loadMap = DataManager.loadMapData;
    DataManager.loadMapData = function(mapId) { $._loadingMap = mapId; return _loadMap.apply(this, arguments); };
    var _onLoad = DataManager.onLoad;
    DataManager.onLoad = function(object) {
        _onLoad.apply(this, arguments);
        if (object === window.$dataMap && $._loadingMap === 15 && $.enabled()) $.churchPatch = $.patchChurch(object);
    };
    $.temple = function() {
        if (!$.enabled() || $.gallery()) return;
        SceneManager.push(Scene_NpTemple);
    };

    // ---------------------------------------------------------------- рисование
    $.COL = { good: '#8fe08a', bad: '#ff7a7a', gold: '#ffd25a', dim: '#a8a0a0', aff: '#ff5050' };
    function segColor(i) { return i < 3 ? '#e8d9a0' : i < 6 ? '#f0a030' : i < 8 ? '#e86020' : '#e02a2a'; }
    $.drawSegBar = function(bmp, x, y, w, h, val, a) {
        var n = 10, gap = 3, sw = (w - gap * (n - 1)) / n, full = Math.round(clamp(val, 0, 100) / 10);
        bmp.fillRect(x - 2, y - 2, w + 4, h + 4, 'rgba(0,0,0,0.75)');
        for (var i = 0; i < n; i++) {
            var sx = Math.round(x + i * (sw + gap));
            var c = i < full ? (a && a.kind === 'v' ? '#ffd040' : a ? '#c0103a' : segColor(i)) : 'rgba(255,255,255,0.12)';
            bmp.fillRect(sx, y, Math.round(sw), h, c);
            if (i < full) bmp.fillRect(sx, y, Math.round(sw), Math.max(1, Math.floor(h / 3)), 'rgba(255,255,255,0.28)');
        }
    };
    $.drawLock = function(bmp, x, y, color) {
        var ctx = bmp._context; if (!ctx) return;
        ctx.save(); ctx.strokeStyle = color || '#ffd25a'; ctx.fillStyle = color || '#ffd25a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x + 6, y + 6, 4, Math.PI, 0); ctx.stroke();
        ctx.fillRect(x + 1, y + 6, 10, 8); ctx.restore();
        if (bmp._setDirty) bmp._setDirty(); else if (bmp._baseTexture) bmp._baseTexture.update();
    };
    var PN = ['HP', 'SP', NP_L('Сила', "Strength"), NP_L('Вын.', "End."), NP_L('Инт.', "Int."), NP_L('Обаян.', "Cha."), NP_L('Ловк.', "Dex."), NP_L('Вера', "Faith")];
    $.buffText = function(aid) {
        return $.buffsOf(aid).map(function(b) {
            return b.src + ' (' + Object.keys(b.p).map(function(k) { var v = Math.round((b.p[k] - 1) * 100); return PN[k] + (v >= 0 ? '+' : '') + v + '%'; }).join(', ') + NP_L('; боёв: ', "; battles: ") + b.n + ')';
        }).join(' · ');
    };
    // блок «Напряжение + черты» (окно статуса, меню привала, KNS-страница)
    $.drawBlock = function(win, x, y, w, aid, opts) {
        opts = opts || {};
        var b = win.contents, fs = b.fontSize, y0 = y, rh = opts.rowH || 28;
        var v = $.get(aid), a = $.aff(aid);
        b.fontSize = opts.titleSize || 24;
        win.changeTextColor(win.systemColor());
        win.drawText(opts.title || NP_L('Напряжение', "Stress"), x, y, w - 90);
        win.changeTextColor(v >= 70 ? $.COL.aff : win.normalColor());
        win.drawText(v + ' / 100', x, y, w, 'right');
        y += rh + 2;
        $.drawSegBar(b, x + 2, y, w - 4, 14, v, a);
        y += 22;
        b.fontSize = 20;
        if (a) {
            var def = $.affDef(a);
            win.changeTextColor(a.kind === 'v' ? $.COL.gold : $.COL.aff);
            win.drawText((a.kind === 'v' ? NP_L('ПОДЪЁМ: ', "RALLY: ") : NP_L('СРЫВ: ', "BREAK: ")) + def.n, x, y, w);
            y += rh - 4;
            if (!opts.noDesc) { win.changeTextColor($.COL.dim); win.drawText(def.d, x, y, w); y += rh - 4; }
        } else if (!opts.compact) {
            win.changeTextColor($.COL.dim);
            win.drawText(v >= 70 ? NP_L('На грани срыва', "On the verge of breaking") : v >= 40 ? NP_L('Нервы натянуты', "Nerves on edge") : NP_L('Держится', "Holding up"), x, y, w); y += rh - 4;
        }
        var bt = $.buffText(aid);
        if (bt && !opts.noBuffs) { win.changeTextColor('#8fd0ff'); win.drawText(bt, x, y, w); y += rh - 4; }
        if (opts.noTraits) { b.fontSize = fs; win.resetTextColor(); return y - y0; }
        b.fontSize = 22;
        win.changeTextColor(win.systemColor());
        win.drawText(NP_L('Черты', "Traits"), x, y, w); y += rh - 4;
        b.fontSize = opts.traitSize || 20;
        var tl = $.traits(aid);
        if (!tl.length) { win.changeTextColor($.COL.dim); win.drawText(NP_L('нет', "none"), x + 8, y, w); y += rh - 6; }
        var pos = tl.filter(function(e) { return TRB[e.id].s > 0; }), neg = tl.filter(function(e) { return TRB[e.id].s < 0; });
        var cols = opts.cols || 1, cw = Math.floor(w / cols), rows = pos.concat(neg), th = opts.traitRow || (rh - 6);
        rows.forEach(function(e, i) {
            var t = TRB[e.id], cx = x + 8 + (i % cols) * cw, cy = y + Math.floor(i / cols) * th;
            win.changeTextColor(t.s > 0 ? $.COL.good : $.COL.bad);
            win.drawText((t.s > 0 ? '+ ' : '− ') + $.traitName(t, aid), cx, cy, cw - 30);
            if (e.lock) $.drawLock(b, cx + cw - 26, cy + Math.floor(th / 2) - 7);
        });
        y += Math.ceil(rows.length / cols) * th;
        b.fontSize = fs; win.resetTextColor();
        return y - y0;
    };

    // окно «Статус»: блок справа (для всех персонажей)
    var _Status_refresh = Window_Status.prototype.refresh;
    Window_Status.prototype.refresh = function() {
        _Status_refresh.apply(this, arguments);
        try {
            if (!this._actor || !$.enabled() || !$gameSystem) return;
            var w = 420, x = this.contentsWidth() - w - 8, y = this.lineHeight() * 2 + 6;
            this.contents.fillRect(x - 14, y, 2, this.lineHeight() * 11, 'rgba(255,255,255,0.18)');
            $.drawBlock(this, x, y, w, this._actor.actorId(), { rowH: 30 });
        } catch (e) { console.warn('NP_Stress status', e); }
    };
    // KNS-страница жрицы: строка напряжения после панели дневника
    try {
        var Dg = window.NP_PriestessDiary;
        if (Dg && typeof Dg.drawStatusPanel === 'function') {
            var _dsp = Dg.drawStatusPanel;
            Dg.drawStatusPanel = function(win, x, y, w, opts) {
                var h = _dsp.apply(this, arguments);
                try {
                    if (opts && opts.rowH === 46 && $.enabled() && $gameSystem) {
                        h += 6 + $.drawBlock(win, x, y + h + 6, Math.min(w, 520), PRI, { rowH: 30, noTraits: true, compact: true, noBuffs: true, noDesc: true, title: NP_L('Напряжение', "Stress") });
                    }
                } catch (e) {}
                return h;
            };
        }
    } catch (e) {}

    // ---------------------------------------------------------------- титулы
    try {
        if (window.NP_Titles && NP_Titles.TITLES && !NP_Titles.byId('steelnerves')) {
            NP_Titles.TITLES.push(
                { id: 'steelnerves', cat: NP_L('Бой', "Battle"), n: NP_L('Стальные нервы', "Nerves of Steel"), b: { 3: 1 },
                  d: NP_L('Десять боёв подряд — и ни одного срыва. Руки не дрожат.', "Ten battles in a row without a single break. Steady hands."),
                  cond: NP_L('10 боёв подряд без срыва у кого-либо в отряде (опция «Напряжение»).', "10 battles in a row without anyone in the party breaking («Stress» option)."),
                  p: function() { var d = $gameSystem && $gameSystem._npStress; return [Math.min(d ? Math.max(d.best, d.streak) : 0, 10), 10]; },
                  c: function() { var d = $gameSystem && $gameSystem._npStress; return !!d && d.best >= 10; } },
                { id: 'snapped', cat: NP_L('Разное', "Misc"), n: NP_L('Сорвалась', "Snapped"), h: true, b: { 5: 1 },
                  hint: NP_L('У любого терпения есть предел.', "Everyone's patience has a limit."),
                  d: NP_L('Нервы лопнули, как перетянутая струна. Теперь она знает, где её предел.', "Her nerves snapped like an overtightened string. Now she knows where her limit is."),
                  cond: NP_L('Впервые сорваться (напряжение 100).', "Break for the first time (stress 100)."),
                  c: function() { var d = $gameSystem && $gameSystem._npStress; return !!d && !!d.firstBreak; } }
            );
        }
    } catch (e) { console.warn('NP_Stress titles', e); }

    // ---------------------------------------------------------------- стадии жрицы
    $.mapTick = function() {
        if (!$.active() || inBattle()) return;
        var d = $.data(); if (!d) return;
        var st = stage();
        if (d.lastStage < 0) { d.lastStage = st; return; }
        if (st > d.lastStage) {
            if (st === 1 && rnd() < 0.5) $.addTrait(PRI, 'liberated', NP_L('стадия', "stage"));
            if (st === 2 && rnd() < 0.6) $.addTrait(PRI, 'wanton', NP_L('стадия', "stage"));
            if (st === 3 && rnd() < 0.6) $.addTrait(PRI, 'brokenfaith', NP_L('стадия', "stage"));
        }
        d.lastStage = st;
    };

    // ---------------------------------------------------------------- спрайты: полоски, реплики, срывы
    $.fx = []; $.bubbles = []; $.toasts = [];
    $.toast = function(text, kind) { $.toasts.push({ text: text, kind: kind, t: 0 }); if (inBattle()) mlog(NP_L('【Черта】 ', "【Trait】 ") + text); };
    $.fxBusy = function() { return !!($.curFx && SceneManager._scene instanceof Scene_Map); };
    $.freeze = 0;

    function csdm() { return (typeof $CSDM !== 'undefined' && $CSDM) ? $CSDM : null; }
    function csdmWins() { var c = csdm(); return c ? [c.WindowMC, c.WindowFeMC, c.WindowFollower].filter(function(w) { return w; }) : []; }
    $.winFor = function(aid) {
        var ws = csdmWins();
        for (var i = 0; i < ws.length; i++) if (ws[i].Actor && ws[i].Actor.actorId && ws[i].Actor.actorId() === aid) return ws[i];
        return null;
    };
    function winRect(w) {
        var c = csdm(), sx = c.ScaleX || 1, sy = c.ScaleY || 1;
        return { x: (c.X || 0) + w.X * sx, y: (c.Y || 0) + w.Y * sy, w: (w.Width || 200) * sx, h: (w.Height || 220) * sy };
    }
    $.winRect = winRect;
    function winShown(w) { var c = csdm(); return !!(c && w && c.Visible && w.Visible && w.Actor); }

    function makeGlow() {
        var b = new Bitmap(220, 240), ctx = b._context;
        var g = ctx.createRadialGradient(110, 120, 10, 110, 120, 125);
        g.addColorStop(0, 'rgba(255,230,140,0.75)'); g.addColorStop(0.6, 'rgba(255,190,60,0.35)'); g.addColorStop(1, 'rgba(255,170,40,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 220, 240);
        if (b._setDirty) b._setDirty(); else b._baseTexture.update();
        return b;
    }
    function Sprite_NpStressLayer() { this.initialize.apply(this, arguments); }
    Sprite_NpStressLayer.prototype = Object.create(Sprite.prototype);
    Sprite_NpStressLayer.prototype.constructor = Sprite_NpStressLayer;
    Sprite_NpStressLayer.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this);
        this._bars = {}; this._cracks = {};
        this._crackBmp = ImageManager.loadPicture('np_stress_crack');
        this._afflBmp = ImageManager.loadPicture('np_stress_afflict');
        this._virtBmp = ImageManager.loadPicture('np_stress_virtue');
        this._glowBmp = makeGlow();
        this._barLayer = new Sprite(); this.addChild(this._barLayer);
        this._bubbleLayer = new Sprite(); this.addChild(this._bubbleLayer);
        this._toastLayer = new Sprite(); this.addChild(this._toastLayer);
        this._fxLayer = new Sprite(); this.addChild(this._fxLayer);
        this._tick = 0;
    };
    Sprite_NpStressLayer.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this._tick++;
        try {
            this.updateBars();
            this.updateBubbles();
            this.updateToasts();
            this.updateFx();
            if (this._tick % 60 === 0) $.mapTick();
        } catch (e) { console.warn('NP_Stress layer', e); }
    };
    Sprite_NpStressLayer.prototype.updateBars = function() {
        var on = $.active() && inBattle() && csdm() && !($gameMessage && $gameMessage.isBusy());
        var seen = {}, self = this;
        csdmWins().forEach(function(w) {
            if (!on || !winShown(w)) return;
            var aid = w.Actor.actorId(), r = winRect(w); seen[aid] = true;
            var s = self._bars[aid];
            if (!s) { s = self._bars[aid] = new Sprite(new Bitmap(204, 26)); s._key = ''; self._barLayer.addChild(s); }
            var a = $.aff(aid), v = $.get(aid), key = v + '|' + (a ? a.kind + a.id : '');
            if (s._key !== key) { s._key = key; drawBar(s.bitmap, v, a, self); }
            s.x = Math.round(r.x + (r.w - 204) / 2); s.y = Math.round(r.y - 26); s.visible = true;
            s.opacity = (a && a.kind === 'a') ? 200 + Math.round(55 * Math.sin(self._tick / 8)) : 255;
            var c = self._cracks[aid];
            if (a) {
                if (!c || c._kind !== a.kind) {
                    if (c) self._barLayer.removeChild(c);
                    c = self._cracks[aid] = new Sprite(a.kind === 'v' ? self._glowBmp : self._crackBmp);
                    c._kind = a.kind;
                    if (a.kind === 'v') c.blendMode = Graphics.BLEND_ADD;
                    self._barLayer.addChildAt(c, 0);
                }
                var bw = c.bitmap.width || 512, bh = c.bitmap.height || 512;
                c.scale.x = r.w / bw; c.scale.y = r.h / bh; c.x = r.x; c.y = r.y;
                c.opacity = a.kind === 'v' ? 120 + Math.round(70 * Math.sin(self._tick / 12)) : 170;
                c.visible = true;
            } else if (c) c.visible = false;
        });
        Object.keys(this._bars).forEach(function(k) { if (!seen[k]) self._bars[k].visible = false; });
        Object.keys(this._cracks).forEach(function(k) { if (!seen[k]) self._cracks[k].visible = false; });
    };
    function drawBar(bmp, v, a, layer) {
        bmp.clear();
        bmp.fillRect(0, 0, 204, 26, 'rgba(10,6,8,0.8)');
        bmp.fillRect(0, 0, 204, 1, 'rgba(255,255,255,0.35)'); bmp.fillRect(0, 25, 204, 1, 'rgba(0,0,0,0.9)');
        var ex = 6;
        if (a) {
            var em = a.kind === 'v' ? layer._virtBmp : layer._afflBmp;
            if (em.isReady()) bmp.blt(em, 0, 0, em.width, em.height, 2, 1, 24, 24);
            else em.addLoadListener(function() { drawBar(bmp, v, a, layer); });
            ex = 30;
        }
        $.drawSegBar(bmp, ex, 7, 204 - ex - 40, 12, v, a);
        bmp.fontSize = 16; bmp.outlineWidth = 3;
        bmp.textColor = a ? (a.kind === 'v' ? '#ffd25a' : '#ff6060') : (v >= 70 ? '#ff8060' : '#f0e8d0');
        bmp.drawText(String(v), 204 - 36, 1, 32, 24, 'right');
    }

    // лицо из спрайта персонажа (передний кадр, верхняя часть)
    function faceFrom(aid, cb) {
        var a = actor(aid); if (!a || !a.characterName()) return null;
        var name = a.characterName(), idx = a.characterIndex(), bmp = ImageManager.loadCharacter(name);
        var draw = function() {
            var big = ImageManager.isBigCharacter(name);
            var pw = bmp.width / (big ? 3 : 12), ph = bmp.height / (big ? 4 : 8);
            var sx = ((big ? 0 : (idx % 4) * 3) + 1) * pw, sy = (big ? 0 : Math.floor(idx / 4) * 4) * ph;
            cb(bmp, sx, sy, pw, Math.min(ph, pw));
        };
        if (bmp.isReady()) draw(); else bmp.addLoadListener(draw);
        return bmp;
    }
    $.faceFrom = faceFrom;
    Sprite_NpStressLayer.prototype.updateBubbles = function() {
        var self = this;
        while ($.bubbles.length) {
            var q = $.bubbles.shift();
            var s = new Sprite(new Bitmap(380, 86)); s._t = 0;
            var bm = s.bitmap, edge = q.bad ? '#ff5050' : '#d8c08a';
            bm.fillRect(0, 0, 380, 86, q.bad ? 'rgba(60,8,16,0.9)' : 'rgba(14,12,24,0.9)');
            bm.fillRect(0, 0, 380, 2, edge); bm.fillRect(0, 84, 380, 2, edge);
            bm.fillRect(6, 7, 72, 72, 'rgba(255,255,255,0.08)');
            faceFrom(q.aid, function(src, sx, sy, pw, ph) { bm.blt(src, sx, sy, pw, ph, 6, 7, 72, Math.round(72 * ph / pw)); });
            bm.fontSize = 20; bm.textColor = q.bad ? '#ff8080' : '#ffd890'; bm.outlineWidth = 4;
            bm.drawText(aname(q.aid) + ':', 88, 6, 286, 26);
            bm.fontSize = 22; bm.textColor = '#ffffff';
            var words = String(q.text).split(' '), lines = [''];
            words.forEach(function(wd) { var l = lines[lines.length - 1], t = l ? l + ' ' + wd : wd; if (l && bm.measureTextWidth(t) > 282) lines.push(wd); else lines[lines.length - 1] = t; });
            lines.slice(0, 2).forEach(function(l, i) { bm.drawText(l, 88, 32 + i * 25, 286, 26); });
            var w = $.winFor(q.aid);
            if (w && winShown(w)) { var r = winRect(w); s.x = clamp(Math.round(r.x + r.w / 2 - 190), 4, Graphics.width - 384); s.y = Math.round(r.y - 124); }
            else { s.x = Graphics.width / 2 - 190; s.y = Graphics.height - 380; }
            s.opacity = 0;
            this._bubbleLayer.children.forEach(function(o) { o.y -= 92; });
            this._bubbleLayer.addChild(s);
        }
        var busy = $gameMessage && $gameMessage.isBusy();
        this._bubbleLayer.children.slice().forEach(function(s) {
            s._t++;
            s.opacity = s._t < 10 ? s._t * 25 : s._t > 160 ? Math.max(0, 255 - (s._t - 160) * 16) : 255;
            s.visible = !busy;
            if (s._t > 176) self._bubbleLayer.removeChild(s);
        });
    };
    Sprite_NpStressLayer.prototype.updateToasts = function() {
        var self = this;
        while ($.toasts.length) {
            var q = $.toasts.shift();
            var s = new Sprite(new Bitmap(760, 44)); s._t = 0;
            s.bitmap.fillRect(0, 0, 760, 44, 'rgba(10,10,16,0.85)');
            s.bitmap.fillRect(0, 42, 760, 2, q.kind === 'good' ? '#8fe08a' : '#ff7a7a');
            s.bitmap.fontSize = 22; s.bitmap.textColor = q.kind === 'good' ? '#bff7b8' : '#ffb0b0';
            s.bitmap.drawText(q.text, 12, 4, 736, 36, 'center');
            s.x = (Graphics.width - 760) / 2; s.y = 70 + this._toastLayer.children.length * 50;
            this._toastLayer.addChild(s);
        }
        this._toastLayer.children.slice().forEach(function(s) {
            s._t++; s.opacity = s._t > 200 ? Math.max(0, 255 - (s._t - 200) * 10) : Math.min(255, s._t * 20);
            if (s._t > 226) self._toastLayer.removeChild(s);
        });
    };

    // эффект срыва / подъёма: стоп-кадр → вспышка, тряска, трещины, крупный текст
    $.FX_FREEZE = 36; $.FX_LEN = 160;
    Sprite_NpStressLayer.prototype.updateFx = function() {
        if (!$.curFx) {
            if (!$.fx.length) return;
            $.curFx = $.fx.shift(); this.buildFx($.curFx);
        }
        var f = $.curFx, t = ++f.t, L = this._fx, v = f.kind === 'v';
        if (t === 1) {
            $.freeze = $.FX_FREEZE;
            AudioManager.playSe({ name: v ? 'Bell3' : 'Crash', volume: 80, pitch: v ? 120 : 60, pan: 0 });
        }
        L.dim.opacity = Math.min(160, t * 8);
        if (t < $.FX_FREEZE) {
            L.crack.opacity = Math.min(255, t * 12);
            L.crack.x = L.cx + (v ? 0 : (t % 4 < 2 ? 3 : -3));
        }
        if (t === $.FX_FREEZE) {
            if (v) {
                AudioManager.playSe({ name: 'Saint3', volume: 55, pitch: 100, pan: 0 });
                AudioManager.playSe({ name: 'Powerup', volume: 70, pitch: 110, pan: 0 });
                $gameScreen.startFlash([255, 220, 120, 170], 24);
            } else {
                AudioManager.playSe({ name: 'Break', volume: 95, pitch: 80, pan: 0 });
                $gameScreen.startFlash([255, 30, 30, 190], 24);
                $gameScreen.startShake(8, 9, 30);
            }
        }
        if (t >= $.FX_FREEZE) {
            var k = Math.min(1, (t - $.FX_FREEZE) / 10), sc = 1.8 - 0.8 * k;
            L.text.scale.x = L.text.scale.y = sc; L.text.opacity = 255 * k;
            L.emb.opacity = 255 * k; L.emb.rotation = v ? t / 40 : 0;
            L.emb.scale.x = L.emb.scale.y = 0.85 + 0.05 * Math.sin(t / 5);
            L.name.opacity = 255 * k;
        }
        if (t > $.FX_LEN - 24) {
            var o = Math.max(0, ($.FX_LEN - t) / 24);
            L.text.opacity = 255 * o; L.emb.opacity = 255 * o; L.dim.opacity = 160 * o; L.crack.opacity = 255 * o; L.name.opacity = 255 * o;
        }
        if (t >= $.FX_LEN) { this._fxLayer.removeChildren(); this._fx = null; $.curFx = null; $.freeze = 0; }
    };
    Sprite_NpStressLayer.prototype.buildFx = function(f) {
        var L = this._fx = {}, v = f.kind === 'v', W = Graphics.width, H = Graphics.height;
        this._fxLayer.removeChildren();
        L.dim = new Sprite(new Bitmap(W, H));
        L.dim.bitmap.fillRect(0, 0, W, H, v ? 'rgba(40,24,0,0.6)' : 'rgba(30,0,0,0.75)');
        L.dim.opacity = 0; this._fxLayer.addChild(L.dim);
        var w = $.winFor(f.aid), r = (w && winShown(w)) ? winRect(w) : { x: W / 2 - 150, y: H / 2 - 160, w: 300, h: 330 };
        L.crack = new Sprite(v ? this._glowBmp : this._crackBmp);
        if (v) L.crack.blendMode = Graphics.BLEND_ADD;
        var cs = Math.max(r.w, r.h) * 1.6, bw = L.crack.bitmap.width || 512, bh = L.crack.bitmap.height || 512;
        L.crack.scale.x = cs / bw; L.crack.scale.y = cs / bh;
        L.cx = r.x + r.w / 2 - cs / 2; L.crack.x = L.cx; L.crack.y = r.y + r.h / 2 - cs / 2;
        L.crack.opacity = 0; this._fxLayer.addChild(L.crack);
        L.emb = new Sprite(v ? this._virtBmp : this._afflBmp);
        L.emb.anchor.x = L.emb.anchor.y = 0.5; L.emb.x = W / 2; L.emb.y = H * 0.3; L.emb.opacity = 0;
        this._fxLayer.addChild(L.emb);
        var tb = new Bitmap(1240, 120);
        tb.fontSize = 72; tb.outlineWidth = 8; tb.outlineColor = v ? 'rgba(80,50,0,0.95)' : 'rgba(40,0,0,0.95)';
        tb.textColor = v ? '#ffe070' : '#ff3a3a';
        tb.drawText((v ? NP_L('ПОДЪЁМ: ', "RALLY: ") : NP_L('СРЫВ: ', "BREAK: ")) + String(f.name).toUpperCase(), 0, 10, 1240, 100, 'center');
        L.text = new Sprite(tb); L.text.anchor.x = L.text.anchor.y = 0.5; L.text.x = W / 2; L.text.y = H * 0.3 + 170; L.text.opacity = 0;
        this._fxLayer.addChild(L.text);
        var nb = new Bitmap(1000, 44); nb.fontSize = 28; nb.outlineWidth = 5; nb.textColor = '#ffffff';
        var def = v ? VIRT[f.id] : AFF[f.id];
        nb.drawText(aname(f.aid) + ' — ' + (def ? def.d : ''), 0, 0, 1000, 44, 'center');
        L.name = new Sprite(nb); L.name.x = W / 2 - 500; L.name.y = H * 0.3 + 225; L.name.opacity = 0;
        this._fxLayer.addChild(L.name);
    };
    $.Sprite_NpStressLayer = Sprite_NpStressLayer;

    var _smCreate = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _smCreate.apply(this, arguments);
        this._npStressLayer = new Sprite_NpStressLayer();
        this.addChild(this._npStressLayer);
    };
    var _updWait = Game_Interpreter.prototype.updateWait;
    Game_Interpreter.prototype.updateWait = function() {
        if ($.fxBusy()) return true;
        return _updWait.apply(this, arguments);
    };
    var _gsUpdate = Game_Screen.prototype.update;
    Game_Screen.prototype.update = function() {
        if ($.freeze > 0 && SceneManager._scene instanceof Scene_Map) { $.freeze--; return; }
        _gsUpdate.apply(this, arguments);
    };
    var _smTerm = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() { _smTerm.apply(this, arguments); $.curFx = null; $.freeze = 0; $.fx.length = 0; };

    // ---------------------------------------------------------------- храм: сцена
    function Window_NpTempleList() { this.initialize.apply(this, arguments); }
    Window_NpTempleList.prototype = Object.create(Window_Selectable.prototype);
    Window_NpTempleList.prototype.constructor = Window_NpTempleList;
    Window_NpTempleList.prototype.initialize = function(x, y, w, h) { this._items = []; Window_Selectable.prototype.initialize.call(this, x, y, w, h); this.refresh(); this.select(0); this.activate(); };
    Window_NpTempleList.prototype.makeItems = function() {
        var it = [];
        partyIds().forEach(function(aid) { $.traits(aid).forEach(function(e) { it.push({ aid: aid, e: e, t: TRB[e.id] }); }); });
        this._items = it;
    };
    Window_NpTempleList.prototype.maxItems = function() { return this._items ? this._items.length : 0; };
    Window_NpTempleList.prototype.item = function() { return this._items ? this._items[this.index()] : null; };
    Window_NpTempleList.prototype.refresh = function() { this.makeItems(); this.createContents(); this.drawAllItems(); };
    Window_NpTempleList.prototype.drawItem = function(i) {
        var o = this._items[i], r = this.itemRectForText(i);
        this.changeTextColor(this.systemColor()); this.drawText(aname(o.aid), r.x, r.y, 200);
        this.changeTextColor(o.t.s > 0 ? $.COL.good : $.COL.bad);
        this.drawText((o.t.s > 0 ? '+ ' : '− ') + $.traitName(o.t, o.aid), r.x + 210, r.y, 360);
        this.changeTextColor($.COL.dim); this.drawText(NP_L('ур. ', "lv. ") + o.t.t, r.x + 580, r.y, 80);
        if (o.e.lock) { $.drawLock(this.contents, r.x + 670, r.y + 10); this.changeTextColor($.COL.gold); this.drawText(NP_L('закреплена', "locked in"), r.x + 690, r.y, 180); }
        this.resetTextColor();
    };
    Window_NpTempleList.prototype.updateHelp = function() {
        var o = this.item();
        this._helpWindow.setText(o ? o.t.d + NP_L('\nЗакрепить: ', "\nLock in: ") + $.PRICE.lock[o.t.t] + NP_L(' G   ·   Удалить: ', " G   ·   Remove: ") + $.PRICE.remove[o.t.t] + ' G' : NP_L('У отряда нет черт.', "The party has no traits."));
    };
    function Window_NpTempleCmd() { this.initialize.apply(this, arguments); }
    Window_NpTempleCmd.prototype = Object.create(Window_Command.prototype);
    Window_NpTempleCmd.prototype.constructor = Window_NpTempleCmd;
    Window_NpTempleCmd.prototype.windowWidth = function() { return 460; };
    Window_NpTempleCmd.prototype.setItem = function(o) { this._o = o; this.refresh(); };
    Window_NpTempleCmd.prototype.makeCommandList = function() {
        var o = this._o; if (!o) return;
        var g = $gameParty.gold(), pl = $.PRICE.lock[o.t.t], pr = $.PRICE.remove[o.t.t];
        if (o.e.lock) this.addCommand(NP_L('Снять закрепление (бесплатно)', "Unlock (free)"), 'unlock', true);
        else this.addCommand(NP_L('Закрепить — ', "Lock in — ") + pl + ' G', 'lock', g >= pl);
        this.addCommand(NP_L('Удалить черту — ', "Remove trait — ") + pr + ' G', 'remove', g >= pr);
        this.addCommand(NP_L('Отмена', "Cancel"), 'cancel', true);
    };
    function Scene_NpTemple() { this.initialize.apply(this, arguments); }
    Scene_NpTemple.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_NpTemple.prototype.constructor = Scene_NpTemple;
    Scene_NpTemple.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this._helpWindow.y = Graphics.boxHeight - this._helpWindow.height;
        this._head = new Window_Base(0, 0, Graphics.boxWidth, 108);
        this.addWindow(this._head);
        this._list = new Window_NpTempleList(0, 108, Graphics.boxWidth, Graphics.boxHeight - 108 - this._helpWindow.height);
        this._list.setHelpWindow(this._helpWindow);
        this._list.setHandler('ok', this.onPick.bind(this));
        this._list.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._list);
        this._cmd = new Window_NpTempleCmd(0, 0);
        this._cmd.x = (Graphics.boxWidth - this._cmd.width) / 2; this._cmd.y = 300;
        ['lock', 'unlock', 'remove', 'cancel'].forEach(function(k) { this._cmd.setHandler(k, this.onCmd.bind(this, k)); }, this);
        this._cmd.hide(); this._cmd.deactivate();
        this.addWindow(this._cmd);
        this.refreshHead();
    };
    Scene_NpTemple.prototype.refreshHead = function() {
        var h = this._head; h.contents.clear();
        h.contents.fontSize = 28; h.changeTextColor(h.systemColor());
        h.drawText(NP_L('Храмовая служба', "Temple Service"), 0, 0, 600);
        h.resetTextColor(); h.contents.fontSize = 20;
        h.drawText(NP_L('Святой отец освятит добрую черту или отмолит дурную. Закреплённую черту не вытеснит новая.', "The holy father will consecrate a good trait or pray away a bad one. A locked-in trait can't be replaced by a new one."), 0, 38, h.contentsWidth());
        h.contents.fontSize = 26; h.drawText(NP_L('Золото: ', "Gold: ") + $gameParty.gold() + ' G', 0, 0, h.contentsWidth(), 'right');
    };
    Scene_NpTemple.prototype.onPick = function() {
        var o = this._list.item(); if (!o) { this._list.activate(); return; }
        this._cmd.setItem(o); this._cmd.select(0); this._cmd.show(); this._cmd.activate();
    };
    Scene_NpTemple.prototype.onCmd = function(k) {
        var o = this._list.item();
        if (o && k === 'lock') { $gameParty.loseGold($.PRICE.lock[o.t.t]); $.lockTrait(o.aid, o.e.id, true); AudioManager.playSe({ name: 'Saint1', volume: 50, pitch: 100, pan: 0 }); }
        else if (o && k === 'unlock') $.lockTrait(o.aid, o.e.id, false);
        else if (o && k === 'remove') { $gameParty.loseGold($.PRICE.remove[o.t.t]); $.removeTrait(o.aid, o.e.id); hist(aname(o.aid) + NP_L(': черта «', ": trait «") + $.traitName(o.t, o.aid) + NP_L('» снята в храме', "» removed at the temple")); AudioManager.playSe({ name: 'Heal3', volume: 80, pitch: 100, pan: 0 }); }
        this._cmd.hide(); this._cmd.deactivate();
        this._list.refresh(); this._list.select(Math.min(this._list.index(), Math.max(0, this._list.maxItems() - 1)));
        this._list.activate(); this.refreshHead(); this._list.callUpdateHelp();
    };
    window.Scene_NpTemple = Scene_NpTemple;
    $.Scene_NpTemple = Scene_NpTemple;

    // ---------------------------------------------------------------- настройки
    ConfigManager.npStress = true;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _make.apply(this, arguments); c.npStress = this.npStress; return c; };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) { _apply.apply(this, arguments); this.npStress = (c && c.npStress !== undefined) ? !!c.npStress : true; };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() { _addGen.apply(this, arguments); this.addCommand(NP_L('Напряжение', "Stress"), 'npStress'); };
    var _setCfg = Window_Options.prototype.setConfigValue;
    Window_Options.prototype.setConfigValue = function(symbol, volume) { _setCfg.apply(this, arguments); if (symbol === 'npStress') bump(); };

    return $;
})();
