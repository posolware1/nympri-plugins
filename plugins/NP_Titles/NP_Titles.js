var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_Titles.js
//=============================================================================
/*:
 * @plugindesc v1.0 Титулы жрицы (в духе Karryn's Prison): открываются по ходу игры, один активный даёт небольшой бонус.
 * @author NP RU
 *
 * @param Popup
 * @desc Показывать всплывающее уведомление о новом титуле (значение по умолчанию для настройки).
 * @type boolean
 * @default true
 *
 * @param Option Label
 * @desc Подпись пункта в «Настройках». Пусто — пункт не добавляется.
 * @default Уведомления о титулах
 *
 * @param Menu Label
 * @desc Подпись команды главного меню. Пусто — команда не добавляется.
 * @default Титулы
 *
 * @help
 * ── Что делает ──
 *   Жрица (актёр 2) получает титулы за события сюжета, бои, похоть, пляж,
 *   дневник и привалы. Активным может быть только один титул; его бонус
 *   (небольшая прибавка к параметрам) действует только на жрицу.
 *   Меню → «Титулы»: список открытых и скрытых («???») титулов, описание,
 *   условие, прогресс, бонус; OK — надеть / снять титул.
 *   При открытии нового титула — короткое неблокирующее окно сверху
 *   (можно отключить в «Настройках»).
 *
 * ── Когда проверяется ──
 *   После боя (переход S14 ВКЛ→ВЫКЛ), после смены карты и раз в ~2 секунды
 *   на карте. Во время боя ничего не открывается (кроме проверки в конце).
 *   В режиме галереи (S5) — ничего не считается и не открывается, бонус
 *   не действует.
 *
 * ── Яризо ──
 *   Титулы про Яризо требуют реальной встречи (NP_PriestessDiary.yarizoMet()).
 *   Если Яризо нет в отряде / не нанят — ничего не ломается.
 *
 * ── Повреждение одежды ──
 *   «Рваная, но живая» доступна только при наличии плагина NP_ClothDamage.
 *   Используется (по наличию): NP_ClothDamage.isMax() либо
 *   NP_ClothDamage.level() >= NP_ClothDamage.maxLevel() (или MAX_LEVEL).
 *   Без плагина титул скрыт из списка и не открывается.
 *
 * ── Команды плагина ──
 *   NpTitles open           — открыть экран титулов
 *   NpTitles check          — проверить условия сейчас
 *   NpTitles unlock <id>    — открыть титул (для отладки)
 *
 * Состояние хранится в $gameSystem._npTitles; старые сохранения работают
 * (счётчики боёв начинаются с нуля с момента установки).
 */
var NP_Titles = NP_Titles || {};
var Imported = Imported || {};
Imported.NP_Titles = true;

(function($) {
    'use strict';
    var params = PluginManager.parameters('NP_Titles');
    var P = {
        popup: String(params['Popup'] || 'true') !== 'false',
        optionLabel: params['Option Label'] !== undefined ? String(params['Option Label']) : NP_L('Уведомления о титулах', "Title notifications"),
        menuLabel: params['Menu Label'] !== undefined ? String(params['Menu Label']) : NP_L('Титулы', "Titles")
    };
    $.P = P;

    var HEROINE = 2;
    var V = { LUST: 82, LOVE: 83, LUST_TH: 98, BOND: 204, GRIM: 280, NIGHT_CNT: 4292,
              U1: 4042, U2: 4043, U3: 4044, U4: 4045 };
    var S = { GALLERY: 5, BATTLE: 14, ESCAPE: 16, HARASS: 30, ERO_TEST: 39, RESTRAINED: 63,
              VIOLATED: 64, RAPED: 81, CREAMPIE: 82, CONTRACT: 643 };
    var GROPE_CE = { 362: 1, 372: 1, 800: 1, 801: 1 };
    var GROPE_SW = {}; GROPE_SW[S.HARASS] = 1; GROPE_SW[S.RESTRAINED] = 1; GROPE_SW[S.VIOLATED] = 1;
    GROPE_SW[S.RAPED] = 1; GROPE_SW[S.CREAMPIE] = 1;
    var PN = [NP_L('Макс. HP', "Max HP"), NP_L('Макс. SP', "Max SP"), NP_L('Сила', "Strength"), NP_L('Выносливость', "Endurance"), NP_L('Интеллект', "Intelligence"), NP_L('Обаяние', "Charisma"), NP_L('Ловкость', "Dexterity"), NP_L('Вера', "Faith")];

    function gv(id) { return (typeof $gameVariables !== 'undefined' && $gameVariables) ? (Number($gameVariables.value(id)) || 0) : 0; }
    function gs(id) { return (typeof $gameSwitches !== 'undefined' && $gameSwitches) ? !!$gameSwitches.value(id) : false; }
    function D() { return (typeof NP_PriestessDiary !== 'undefined') ? NP_PriestessDiary : null; }
    function ym() { var d = D(); try { return !!(d && d.yarizoMet && d.yarizoMet()); } catch (e) { return false; } }
    function stage() { var d = D(); try { return d && d.stage ? d.stage() : 0; } catch (e) { return 0; } }
    function lustTh() { var t = gv(V.LUST_TH); return t > 0 ? t : 100; }
    function gallery() { return gs(S.GALLERY); }
    function inBattle() { return gs(S.BATTLE); }
    $.isGallery = gallery;

    // ---- повреждение одежды (необязательный плагин) ----
    function cloth() { return (typeof window !== 'undefined' && window.NP_ClothDamage) || (typeof NP_ClothDamage !== 'undefined' ? NP_ClothDamage : null); }
    $.clothAvailable = function() { return !!cloth(); };
    $.clothMaxed = function() {
        var C = cloth(); if (!C) return false;
        try {
            if (typeof C.isMax === 'function') return !!C.isMax(HEROINE);
            var lv = typeof C.level === 'function' ? C.level(HEROINE) : C.level;
            var mx = typeof C.maxLevel === 'function' ? C.maxLevel() : (C.MAX_LEVEL !== undefined ? C.MAX_LEVEL : C.maxLevel);
            // NP_ClothDamage v1.0: уровни 0..N, N = число порогов (Thresholds), по умолчанию 3
            if (mx === undefined) mx = (C.P && C.P.thr && C.P.thr.length) ? C.P.thr.length : 3;
            lv = Number(lv); mx = Number(mx);
            return isFinite(lv) && isFinite(mx) && mx > 0 && lv >= mx;
        } catch (e) { return false; }
    };

    // ---- счётчики ----
    function campfireTalks() {
        try {
            var c = $gameSystem && $gameSystem._npCampfire, n = 0;
            if (c && c.seen) for (var k in c.seen) if (c.seen.hasOwnProperty(k)) n += Number(c.seen[k]) || 0;
            return n;
        } catch (e) { return 0; }
    }
    function diaryCount() {
        var d = D(); try { return d && d.unlocked ? d.unlocked().length : 0; } catch (e) { return 0; }
    }
    function diaryTotal() { var d = D(); return d && d.ENTRIES ? d.ENTRIES.length : 0; }
    function uniquesKilled() { var n = 0; [V.U1, V.U2, V.U3, V.U4].forEach(function(id) { if (gv(id) > 0) n++; }); return n; }

    // ---- состояние в сохранении ----
    $.data = function() {
        if (typeof $gameSystem === 'undefined' || !$gameSystem) return null;
        var d = $gameSystem._npTitles;
        if (!d || typeof d !== 'object') d = $gameSystem._npTitles = {};
        d.u = d.u || {}; d.seen = d.seen || {}; d.seq = d.seq || 0;
        if (d.active === undefined) d.active = null;
        var c = d.cnt = d.cnt || {};
        ['wins', 'battles', 'losses', 'streak', 'best', 'lustHits', 'grWins', 'beach', 'torn'].forEach(function(k) { c[k] = Number(c[k]) || 0; });
        c.lustOver = !!c.lustOver;
        return d;
    };
    function cnt(k) { var d = $.data(); return d ? (d.cnt[k] || 0) : 0; }

    // ---- титулы ----
    // cat: категория; h: скрытый (до открытия «???» + намёк); y: требует встречи с Яризо;
    // c: условие; p: прогресс [текущее, цель]; b: бонус {индекс параметра: значение}
    var T = [
        { id: 'humble', cat: NP_L('Вера', "Faith"), n: NP_L('Скромная жрица', "Humble Priestess"), b: { 7: 1 },
          d: NP_L('Служительница богини в начале пути. Чистые помыслы, тихая молитва.', "A servant of the goddess at the start of her journey. Pure thoughts, quiet prayers."),
          cond: NP_L('Начать путешествие.', "Begin the journey."), c: function() { return true; } },
        { id: 'doubt', cat: NP_L('Вера', "Faith"), n: NP_L('Сомневающаяся', "Doubting"), y: true, b: { 4: 1 },
          d: NP_L('Молитвы всё чаще прерываются мыслями, которых не должно быть.', "Her prayers are more and more often interrupted by thoughts that shouldn't be there."),
          cond: NP_L('Связь с Яризо: стадия 1.', "Relationship with Yarizo: stage 1."), c: function() { return ym() && stage() >= 1; } },
        { id: 'double', cat: NP_L('Вера', "Faith"), n: NP_L('Двойная жизнь', "Double Life"), y: true, b: { 6: 1 },
          d: NP_L('Днём — невеста героя. Ночью — тайна, которую нельзя произнести.', "By day, the hero's bride. By night, a secret that must never be spoken."),
          cond: NP_L('Связь с Яризо: стадия 2.', "Relationship with Yarizo: stage 2."), c: function() { return ym() && stage() >= 2; } },
        { id: 'fallen', cat: NP_L('Вера', "Faith"), n: NP_L('Падшая святая', "Fallen Saint"), y: true, h: true, b: { 5: 2, 7: -1 },
          hint: NP_L('Путь, с которого не возвращаются.', "A road of no return."),
          d: NP_L('Её молитвы теперь звучат иначе. Богиня молчит — а она улыбается.', "Her prayers sound different now. The goddess is silent, and she smiles."),
          cond: NP_L('Связь с Яризо: стадия 3.', "Relationship with Yarizo: stage 3."), c: function() { return ym() && stage() >= 3; } },

        { id: 'yfriend', cat: NP_L('Яризо', "Yarizo"), n: NP_L('Знакомая Яризо', "Yarizo's Acquaintance"), y: true, b: { 3: 1 },
          d: NP_L('Наёмник нанят. Держаться подальше — легче сказать, чем сделать.', "The mercenary has been hired. Keeping her distance is easier said than done."),
          cond: NP_L('Яризо нанят (договор заключён).', "Yarizo hired (contract signed)."), c: function() { return ym() && gs(S.CONTRACT); } },
        { id: 'yfav', cat: NP_L('Яризо', "Yarizo"), n: NP_L('Любимица Яризо', "Yarizo's Favorite"), y: true, h: true, b: { 6: 1 },
          hint: NP_L('Кто-то смотрит на неё иначе, чем на остальных.', "Someone looks at her differently than at everyone else."),
          d: NP_L('Он больше не прячет взгляда. И она — тоже.', "He doesn't hide his stare anymore. Neither does she."),
          cond: NP_L('Связь с Яризо: уровень 5.', "Bond with Yarizo: level 5."), p: function() { return [Math.min(gv(V.BOND), 5), 5]; },
          c: function() { return ym() && gv(V.BOND) >= 5; } },
        { id: 'nightguest', cat: NP_L('Яризо', "Yarizo"), n: NP_L('Ночная гостья', "Night Visitor"), y: true, h: true, b: { 5: 1 },
          hint: NP_L('Ночью в гостинице не все спят в своих кроватях.', "At night, not everyone at the inn sleeps in their own bed."),
          d: NP_L('«Я в часовне», — говорит она. Часовня в эту ночь снова пуста.', "“I'll be at the chapel,” she says. Tonight the chapel is empty again."),
          cond: NP_L('Ночные отлучки: 5.', "Nights away: 5."), p: function() { return [Math.min(gv(V.NIGHT_CNT), 5), 5]; },
          c: function() { return ym() && gv(V.NIGHT_CNT) >= 5; } },

        { id: 'firstwin', cat: NP_L('Бой', "Combat"), n: NP_L('Боевое крещение', "Baptism by Fire"), b: { 2: 1 },
          d: NP_L('Первая победа. Руки дрожат, но посох не выпал.', "First victory. Her hands are shaking, but she didn't drop her staff."),
          cond: NP_L('Победить в бою.', "Win a battle."), p: function() { return [Math.min(cnt('wins'), 1), 1]; },
          c: function() { return cnt('wins') >= 1; } },
        { id: 'untouch', cat: NP_L('Бой', "Combat"), n: NP_L('Неприкасаемая', "Untouchable"), b: { 6: 1 },
          d: NP_L('Ни одна грязная рука не дотянулась. Десять боёв подряд.', "Not a single filthy hand reached her. Ten battles in a row."),
          cond: NP_L('10 побед подряд, в которых жрицу не лапали (поражение или приставания сбрасывают серию).', "Win 10 battles in a row without the priestess being groped (a defeat or harassment resets the streak)."),
          p: function() { return [Math.min(Math.max(cnt('streak'), cnt('best')), 10), 10]; },
          c: function() { return cnt('best') >= 10; } },
        { id: 'steady', cat: NP_L('Бой', "Combat"), n: NP_L('Стойкая', "Steadfast"), b: { 7: 1 },
          d: NP_L('Чужие руки, сальные шутки — а она всё равно стоит и сражается.', "Groping hands, dirty jokes, and she still stands and fights."),
          cond: NP_L('Победить в 20 боях, в которых к жрице приставали.', "Win 20 battles in which the priestess was harassed."),
          p: function() { return [Math.min(cnt('grWins'), 20), 20]; },
          c: function() { return cnt('grWins') >= 20; } },
        { id: 'hardened', cat: NP_L('Бой', "Combat"), n: NP_L('Закалённая', "Battle-Hardened"), b: { 2: 1, 3: 1 },
          d: NP_L('Сотня побед. Её уже не испугать рыком из-за кустов.', "A hundred victories. A growl from the bushes won't scare her anymore."),
          cond: NP_L('100 побед в боях.', "Win 100 battles."), p: function() { return [Math.min(cnt('wins'), 100), 100]; },
          c: function() { return cnt('wins') >= 100; } },
        { id: 'slayer', cat: NP_L('Бой', "Combat"), n: NP_L('Гроза чудовищ', "Monster Slayer"), h: true, b: { 2: 1, 7: 1 },
          hint: NP_L('Говорят, по округе бродят четверо особо опасных...', "They say four especially dangerous ones roam these lands..."),
          d: NP_L('Все четыре известных чудовища пали. Барды уже сочиняют песню.', "All four known monsters have fallen. The bards are already writing a song."),
          cond: NP_L('Победить всех четырёх уникальных монстров.', "Defeat all four unique monsters."), p: function() { return [uniquesKilled(), 4]; },
          c: function() { return uniquesKilled() >= 4; } },
        { id: 'torn', cat: NP_L('Бой', "Combat"), n: NP_L('Рваная, но живая', "Torn but Alive"), h: true, b: { 3: 1, 5: 1 }, avail: function() { return $.clothAvailable(); },
          hint: NP_L('Одежда — не главное. Главное — победа.', "Clothes don't matter. Victory does."),
          d: NP_L('От облачения остались лоскуты. Зато враг лежит, а она стоит.', "Her vestments are in shreds. But the enemy is down, and she's still standing."),
          cond: NP_L('Победить, когда одежда разорвана до предела.', "Win a battle with her clothes torn to the limit."), c: function() { return cnt('torn') >= 1; } },

        { id: 'hotblood', cat: NP_L('Похоть', "Lust"), n: NP_L('Горячая кровь', "Hot-Blooded"), b: { 5: 1 },
          d: NP_L('Жар накатывает снова и снова. Молитвы уже не помогают.', "The heat comes over her again and again. Prayers don't help anymore."),
          cond: NP_L('Похоть достигает порога 10 раз.', "Lust reaches the threshold 10 times."), p: function() { return [Math.min(cnt('lustHits'), 10), 10]; },
          c: function() { return cnt('lustHits') >= 10; } },
        { id: 'insatiable', cat: NP_L('Похоть', "Lust"), n: NP_L('Неутолимая', "Insatiable"), h: true, b: { 5: 2, 4: -1 },
          hint: NP_L('Есть предел, за которым мысли тают.', "There is a limit beyond which all thoughts melt away."),
          d: NP_L('Похоть дошла до предела. В голове — только одно.', "Her lust has hit the limit. There's only one thing on her mind."),
          cond: NP_L('Похоть 200 / 200.', "Lust 200 / 200."), c: function() { return gv(V.LUST) >= 200; } },

        { id: 'bride', cat: NP_L('Разное', "Misc"), n: NP_L('Верная невеста', "Faithful Bride"), b: { 7: 1 },
          d: NP_L('Что бы ни случилось в пути, её сердце принадлежит \\N[1].', "Whatever happens on the road, her heart belongs to \\N[1]."),
          cond: NP_L('Любовь к \\N[1]: 150.', "Love for \\N[1]: 150."), p: function() { return [Math.min(gv(V.LOVE), 150), 150]; },
          c: function() { return gv(V.LOVE) >= 150; } },
        { id: 'beach', cat: NP_L('Разное', "Misc"), n: NP_L('Пляжная красотка', "Beach Beauty"), h: true, b: { 5: 1 },
          hint: NP_L('Солнце, песок и чей-то пристальный взгляд.', "Sun, sand and someone's intent stare."),
          d: NP_L('Купальник, солнце и взгляды, от которых горят щёки.', "A swimsuit, the sun, and stares that make her cheeks burn."),
          cond: NP_L('Увидеть сцену на Сияющем пляже.', "See the scene at the Shining Beach."), c: function() { return cnt('beach') >= 1; } },
        { id: 'chronicle', cat: NP_L('Разное', "Misc"), n: NP_L('Летописица', "Chronicler"), b: { 4: 1 },
          d: NP_L('Каждая страница дневника исписана. Каждая — правда.', "Every page of the diary is filled. Every one of them is true."),
          cond: NP_L('Открыть все записи «Дневника жрицы».', "Unlock every entry in the “Priestess's Diary”."), p: function() { return [diaryCount(), diaryTotal()]; },
          c: function() { var t = diaryTotal(); return t > 0 && diaryCount() >= t; } },
        { id: 'camper', cat: NP_L('Разное', "Misc"), n: NP_L('Любительница привалов', "Campfire Lover"), b: { 3: 1 },
          d: NP_L('Костёр, похлёбка и разговоры до глубокой ночи.', "A campfire, stew, and talks late into the night."),
          cond: NP_L('20 разговоров у костра.', "20 campfire talks."), p: function() { return [Math.min(campfireTalks(), 20), 20]; },
          c: function() { return campfireTalks() >= 20; } },
        { id: 'abyss', cat: NP_L('Разное', "Misc"), n: NP_L('Заглянувшая в бездну', "Gazed into the Abyss"), h: true, b: { 7: 1 },
          hint: NP_L('Не всякая дорога заканчивается хорошо.', "Not every road ends well."),
          d: NP_L('Она видела, чем всё может кончиться. И всё равно идёт дальше.', "She has seen how it all might end. And she keeps going anyway."),
          cond: NP_L('Увидеть мрачный финал.', "See a grim ending."), c: function() { return gv(V.GRIM) >= 1; } }
    ];
    $.TITLES = T;
    $.byId = function(id) { for (var i = 0; i < T.length; i++) if (T[i].id === id) return T[i]; return null; };

    function fmt(s) { var d = D(); return d && d.fmt ? d.fmt(s) : String(s || '').replace(/\\N\[\d+\]/g, ''); }
    $.fmt = fmt;
    $.bonusText = function(t) {
        if (!t || !t.b) return '—';
        var out = [];
        for (var k in t.b) if (t.b.hasOwnProperty(k)) { var v = t.b[k]; out.push(PN[k] + ' ' + (v > 0 ? '+' : '') + v); }
        return out.join(', ') || '—';
    };
    $.isAvailable = function(t) { try { return !t.avail || !!t.avail(); } catch (e) { return false; } };
    $.isUnlocked = function(id) { var d = $.data(); return !!(d && d.u[id]); };
    $.visible = function() {
        return T.filter(function(t) { return $.isUnlocked(t.id) || $.isAvailable(t); });
    };
    $.unlockedCount = function() { return T.filter(function(t) { return $.isUnlocked(t.id); }).length; };

    // ---- активный титул и бонус ----
    $.active = function() {
        var d = $.data(); if (!d || !d.active) return null;
        var t = $.byId(d.active);
        return (t && d.u[t.id]) ? t : null;
    };
    $.setActive = function(id) {
        var d = $.data(); if (!d) return false;
        if (id && !d.u[id]) return false;
        d.active = id || null;
        refreshHeroine();
        return true;
    };
    function refreshHeroine() {
        try {
            if ($gameActors && $gameActors._data && $gameActors._data[HEROINE]) {
                $gameActors._data[HEROINE].refresh();
            }
        } catch (e) {}
    }
    $.bonus = function(paramId) {
        if (gallery()) return 0;
        var t = $.active();
        return (t && t.b && t.b[paramId]) ? t.b[paramId] : 0;
    };
    var _paramPlus = Game_Actor.prototype.paramPlus;
    Game_Actor.prototype.paramPlus = function(paramId) {
        var v = _paramPlus.apply(this, arguments);
        if (this._actorId === HEROINE) { try { v += $.bonus(paramId); } catch (e) {} }
        return v;
    };

    // ---- проверка и открытие ----
    var queue = [];
    $.queue = queue;
    $.check = function(silent) {
        var d = $.data(); if (!d) return [];
        if (gallery() || inBattle()) return [];
        lustTick();
        var fresh = [];
        for (var i = 0; i < T.length; i++) {
            var t = T[i];
            if (d.u[t.id] || !$.isAvailable(t)) continue;
            var ok = false;
            try { ok = !!t.c(); } catch (e) { ok = false; }
            if (t.y && !ym()) ok = false;
            if (ok) { d.u[t.id] = ++d.seq; fresh.push(t); }
        }
        if (fresh.length) {
            if (!d.active && d.u.humble) d.active = 'humble';   // стартовый титул надевается сам
            refreshHeroine();
            if (!silent) fresh.forEach(function(t) { queue.push(t); });
        }
        return fresh;
    };
    $.unlock = function(id, silent) {
        var d = $.data(), t = $.byId(id); if (!d || !t || d.u[id]) return false;
        d.u[id] = ++d.seq; if (!silent) queue.push(t); return true;
    };

    // ---- похоть: подсчёт пересечений порога ----
    function lustTick() {
        if (gallery()) return;
        var d = $.data(); if (!d) return;
        var over = gv(V.LUST) >= lustTh();
        if (over && !d.cnt.lustOver) d.cnt.lustHits++;
        d.cnt.lustOver = over;
    }
    $.lustTick = lustTick;

    // ---- бой ----
    function tmp() { return (typeof $gameTemp !== 'undefined' && $gameTemp) ? $gameTemp : null; }
    function cur() { var t = tmp(); return t ? t._npTitlesBattle || null : null; }
    $.battle = cur;
    function beginBattle() {
        var t = tmp(); if (!t) return;
        if (gallery() || gs(S.ERO_TEST)) { t._npTitlesBattle = null; t._npTitlesNextKind = null; return; }
        t._npTitlesBattle = { kind: t._npTitlesNextKind || 'other', groped: false, won: false, lost: false, escaped: false, torn: false };
        t._npTitlesNextKind = null;
    }
    function endBattle() {
        var t = tmp(), b = cur(); if (!t || !b) return;
        t._npTitlesBattle = null;
        if (gallery() || b.kind !== 'main') return;
        var d = $.data(); if (!d) return;
        var c = d.cnt;
        if (b.won || b.lost || b.escaped) c.battles++;
        if (b.won && !b.lost) {
            c.wins++;
            if (b.groped) { c.grWins++; c.streak = 0; }
            else { c.streak++; if (c.streak > c.best) c.best = c.streak; }
            if (b.torn) c.torn++;
        } else if (b.lost) {
            c.losses++; c.streak = 0;
        } else if (b.groped) c.streak = 0;
        t._npTitlesPending = true;   // проверка — сразу после выхода из боя
    }
    $.markGroped = function() { var b = cur(); if (b) b.groped = true; };

    var _swSet = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(id, value) {
        var before = (id === S.BATTLE || GROPE_SW[id] || id === S.ESCAPE) ? !!this.value(id) : null;
        _swSet.apply(this, arguments);
        if (before === null) return;
        try {
            var now = !!this.value(id);
            if (id === S.BATTLE) {
                if (!before && now) beginBattle();
                else if (before && !now) endBattle();
            } else if (now && inBattle()) {
                var b = cur();
                if (b) { if (id === S.ESCAPE) b.escaped = true; else b.groped = true; }
            }
        } catch (e) { console.warn('NP_Titles: switch', e); }
    };

    var _varSet = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(id, value) {
        _varSet.apply(this, arguments);
        if (id === V.LUST || id === V.LUST_TH) { try { lustTick(); } catch (e) {} }
    };

    var _cmd117 = Game_Interpreter.prototype.command117;
    Game_Interpreter.prototype.command117 = function() {
        try {
            var id = this._params[0];
            var t = tmp();
            if (id === 31 && t) t._npTitlesNextKind = 'main';
            else if (id === 871 && t) t._npTitlesNextKind = 'iris';
            if (inBattle()) {
                var b = cur();
                if (b) {
                    if (id === 33) { b.won = true; b.torn = b.torn || $.clothMaxed(); }
                    else if (GROPE_CE[id]) b.groped = true;
                }
            }
        } catch (e) {}
        return _cmd117.apply(this, arguments);
    };

    // MapEvent.call(53, N, ...) → knsCallMapEvent: события-«склад» боя
    if (Game_Interpreter.prototype.knsCallMapEvent) {
        var _kcme = Game_Interpreter.prototype.knsCallMapEvent;
        Game_Interpreter.prototype.knsCallMapEvent = function(mapId, eventId, pageId) {
            try {
                if (Number(mapId) === 53 && inBattle()) {
                    var b = cur(), e = Number(eventId);
                    if (b) {
                        if (e >= 16 && e <= 29) b.groped = true;    // приставания (Яризо/враги) в бою
                        else if (e === 3) b.lost = true;            // «敗北時のイベント処理»
                    }
                }
            } catch (err) {}
            return _kcme.apply(this, arguments);
        };
    }

    // сцена на пляже (Map030, NP_PicAnim)
    var _pc = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pc.apply(this, arguments);
        var cmd = String(command);
        try {
            if (cmd === 'NP_PicAnim' && args && args[0] && String(args[0]).toLowerCase() !== 'wait' &&
                String(args[0]).toLowerCase() !== 'clear' && !gallery() && $gameMap && $gameMap.mapId() === 30) {
                var d = $.data(); if (d) d.cnt.beach++;
            }
        } catch (e) {}
        if (cmd.toLowerCase() !== 'nptitles') return;
        var sub = String(args[0] || '').toLowerCase();
        if (sub === 'open') $.open();
        else if (sub === 'check') $.check(false);
        else if (sub === 'unlock' && args[1]) $.unlock(String(args[1]), false);
    };

    // ---- когда проверять: после переноса, после боя, периодически ----
    var _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        var t = tmp(); if (t) t._npTitlesPending = true;
    };
    var _smUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _smUpdate.apply(this, arguments);
        try {
            var t = tmp();
            if (t && !gallery() && !inBattle()) {
                t._npTitlesTick = (t._npTitlesTick || 0) + 1;
                if (t._npTitlesPending || t._npTitlesTick >= 120) {
                    t._npTitlesPending = false; t._npTitlesTick = 0;
                    $.check(false);
                }
            }
            this.npUpdateTitlePopup();
        } catch (e) { console.warn('NP_Titles: update', e); }
    };

    // ---- всплывающее окно ----
    function Window_NpTitlePopup() { this.initialize.apply(this, arguments); }
    Window_NpTitlePopup.prototype = Object.create(Window_Base.prototype);
    Window_NpTitlePopup.prototype.constructor = Window_NpTitlePopup;
    Window_NpTitlePopup.prototype.initialize = function() {
        var w = 560, h = this.fittingHeight(2);
        Window_Base.prototype.initialize.call(this, Math.floor((Graphics.boxWidth - w) / 2), 64, w, h);
        this.openness = 0; this._t = null; this._life = 0;
    };
    Window_NpTitlePopup.prototype.standardFontSize = function() { return 24; };
    Window_NpTitlePopup.prototype.show_ = function(t) {
        this._t = t; this._life = 210;
        var c = this.contents; c.clear();
        this.changeTextColor(this.textColor(17));
        this.drawText(NP_L('Новый титул!', "New title!"), 0, 0, c.width, 'left');
        this.changeTextColor(this.textColor(6));
        this.drawText('«' + t.n + '»', 0, 0, c.width, 'right');
        this.changeTextColor(this.textColor(8));
        this.drawText(NP_L('Бонус: ', "Bonus: ") + $.bonusText(t) + NP_L('   (Меню → ', "   (Menu → ") + (P.menuLabel || NP_L('Титулы', "Titles")) + ')', 0, this.lineHeight(), c.width, 'left');
        this.resetTextColor();
        this.open();
    };
    Window_NpTitlePopup.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (this._t && this.isOpen()) {
            if (--this._life <= 0) { this._t = null; this.close(); }
        }
    };
    Window_NpTitlePopup.prototype.busy = function() { return !!this._t || this.isOpening() || this.isClosing(); };
    $.Window_NpTitlePopup = Window_NpTitlePopup;

    Scene_Map.prototype.npUpdateTitlePopup = function() {
        if (!queue.length && !this._npTitlePopup) return;
        if (!ConfigManager.npTitlePopup) { queue.length = 0; return; }
        if (!this._npTitlePopup) {
            if (!this._windowLayer) return;
            this._npTitlePopup = new Window_NpTitlePopup();
            this.addWindow(this._npTitlePopup);
        }
        var w = this._npTitlePopup;
        if (!w.busy() && queue.length) {
            var t = queue.shift();
            w.show_(t);
            try { SoundManager.playUseSkill(); } catch (e) {}
        }
    };

    // ---- настройки ----
    ConfigManager.npTitlePopup = P.popup;
    var _makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _makeData.apply(this, arguments);
        config.npTitlePopup = this.npTitlePopup;
        return config;
    };
    var _applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _applyData.apply(this, arguments);
        this.npTitlePopup = (config && config.npTitlePopup !== undefined) ? !!config.npTitlePopup : P.popup;
    };
    if (P.optionLabel && typeof Window_Options !== 'undefined') {
        var _addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npTitlePopup');
        };
    }

    // ---- главное меню ----
    if (P.menuLabel) {
        var _addOrig = Window_MenuCommand.prototype.addOriginalCommands;
        Window_MenuCommand.prototype.addOriginalCommands = function() {
            _addOrig.apply(this, arguments);
            this.addCommand(P.menuLabel, 'npTitles', !gallery());
        };
        var _createCmd = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function() {
            _createCmd.apply(this, arguments);
            this._commandWindow.setHandler('npTitles', function() { SceneManager.push(Scene_NpTitles); });
        };
    }
    $.open = function() { if (!gallery()) SceneManager.push(Scene_NpTitles); };

    // ---- экран «Титулы» ----
    function Window_NpTitleList() { this.initialize.apply(this, arguments); }
    Window_NpTitleList.prototype = Object.create(Window_Selectable.prototype);
    Window_NpTitleList.prototype.constructor = Window_NpTitleList;
    Window_NpTitleList.prototype.initialize = function(x, y, w, h) {
        Window_Selectable.prototype.initialize.call(this, x, y, w, h);
        this._list = $.visible();
        this.refresh();
        var a = $.active(), i = a ? this._list.indexOf(a) : 0;
        this.select(Math.max(0, i));
    };
    Window_NpTitleList.prototype.maxItems = function() { return this._list ? this._list.length : 0; };
    Window_NpTitleList.prototype.item = function() { return this._list ? this._list[this.index()] : null; };
    Window_NpTitleList.prototype.isCurrentItemEnabled = function() { var t = this.item(); return !!t && $.isUnlocked(t.id); };
    Window_NpTitleList.prototype.drawItem = function(i) {
        var t = this._list[i], r = this.itemRectForText(i), un = $.isUnlocked(t.id), act = $.active() === t;
        var name = un ? t.n : (t.h ? '???' : t.n);
        this.changeTextColor(act ? this.textColor(17) : (un ? this.normalColor() : this.textColor(8)));
        this.changePaintOpacity(un || !t.h);
        this.drawText((act ? '★ ' : (un ? '◆ ' : '◇ ')) + name, r.x, r.y, r.width - 110);
        this.changeTextColor(this.textColor(8));
        this.drawText(t.cat, r.x, r.y, r.width, 'right');
        this.changePaintOpacity(true);
        this.resetTextColor();
    };
    Window_NpTitleList.prototype.updateHelp = function() { if (this._detail) this._detail.setTitle(this.item()); };
    Window_NpTitleList.prototype.callUpdateHelp = function() { if (this.active || this._detail) this.updateHelp(); };
    Window_NpTitleList.prototype.setDetail = function(w) { this._detail = w; this.callUpdateHelp(); };

    function Window_NpTitleDetail() { this.initialize.apply(this, arguments); }
    Window_NpTitleDetail.prototype = Object.create(Window_Base.prototype);
    Window_NpTitleDetail.prototype.constructor = Window_NpTitleDetail;
    Window_NpTitleDetail.prototype.setTitle = function(t) { this._t = t; this.refresh(); };
    Window_NpTitleDetail.prototype.wrap = function(text, w) {
        var d = D();
        if (d && d.wrapLines) return d.wrapLines(this.contents, text, w);
        return [text];
    };
    Window_NpTitleDetail.prototype.refresh = function() {
        var c = this.contents; c.clear();
        var t = this._t; if (!t) return;
        var un = $.isUnlocked(t.id), act = $.active() === t, w = c.width, y = 0, lh = this.lineHeight(), self = this;
        var hidden = !un && t.h;
        c.fontSize = 30;
        this.changeTextColor(act ? this.textColor(17) : (un ? this.textColor(6) : this.textColor(8)));
        this.drawText(hidden ? '???' : t.n, 0, y, w); y += lh + 6;
        c.fontSize = 22;
        this.changeTextColor(this.textColor(8));
        this.drawText(NP_L('Категория: ', "Category: ") + t.cat, 0, y, w);
        this.changeTextColor(act ? this.textColor(17) : (un ? this.textColor(24) : this.textColor(8)));
        this.drawText(act ? NP_L('Активен', "Active") : (un ? NP_L('Открыт', "Unlocked") : NP_L('Не открыт', "Locked")), 0, y, w, 'right');
        y += lh;
        c.fillRect(0, y + 4, w, 2, 'rgba(255,255,255,0.25)'); y += 14;
        c.fontItalic = true;
        this.resetTextColor();
        this.wrap(hidden ? (NP_L('Намёк: ', "Hint: ") + (t.hint || '...')) : fmt(t.d), w).forEach(function(l) { self.drawText(l, 0, y, w); y += 32; });
        c.fontItalic = false;
        y += 14;
        this.changeTextColor(this.systemColor());
        this.drawText(NP_L('Условие', "Condition"), 0, y, w); y += lh;
        this.resetTextColor();
        this.wrap(hidden ? '???' : fmt(t.cond), w).forEach(function(l) { self.drawText(l, 0, y, w); y += 32; });
        if (!un && !hidden && t.p) {
            var p = [0, 1]; try { p = t.p(); } catch (e) {}
            var rate = p[1] > 0 ? Math.max(0, Math.min(1, p[0] / p[1])) : 0;
            c.fillRect(0, y + 10, w - 140, 14, 'rgba(0,0,0,0.5)');
            if (rate > 0) c.gradientFillRect(1, y + 11, Math.floor((w - 142) * rate), 12, '#c08030', '#ffd070');
            this.drawText(p[0] + ' / ' + p[1], w - 130, y, 130, 'right');
            y += lh;
        }
        y += 10;
        this.changeTextColor(this.systemColor());
        this.drawText(NP_L('Бонус (только жрица)', "Bonus (priestess only)"), 0, y, w); y += lh;
        this.resetTextColor();
        this.drawText(hidden ? '???' : $.bonusText(t), 0, y, w); y += lh;
        y = c.height - lh;
        this.changeTextColor(this.textColor(8));
        c.fontSize = 20;
        this.drawText(un ? (act ? NP_L('OK — снять титул', "OK — remove title") : NP_L('OK — надеть титул', "OK — equip title")) : NP_L('Титул ещё не открыт', "Title not unlocked yet"), 0, y, w, 'center');
        c.fontSize = this.standardFontSize();
        this.resetTextColor();
    };

    // плашку не «впекать» в размытый фон меню
    var _mapTerm = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        if (this._npTitlePopup) this._npTitlePopup.visible = false;
        _mapTerm.apply(this, arguments);
    };

    function Scene_NpTitles() { this.initialize.apply(this, arguments); }
    Scene_NpTitles.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_NpTitles.prototype.constructor = Scene_NpTitles;
    Scene_NpTitles.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        try { $.check(false); } catch (e) {}
        var W = Graphics.boxWidth, H = Graphics.boxHeight;
        this._head = new Window_Base(0, 0, W, this.fittingHeightFor(1));
        this.addWindow(this._head);
        var lw = Math.floor(W * 0.42);
        this._list = new Window_NpTitleList(0, this._head.height, lw, H - this._head.height);
        this._detail = new Window_NpTitleDetail(lw, this._head.height, W - lw, H - this._head.height);
        this.addWindow(this._list); this.addWindow(this._detail);
        this._list.setDetail(this._detail);
        this._list.setHandler('ok', this.onOk.bind(this));
        this._list.setHandler('cancel', this.popScene.bind(this));
        this._list.activate();
        this.refreshHead();
    };
    Scene_NpTitles.prototype.fittingHeightFor = function(n) { return Window_Base.prototype.fittingHeight.call(Window_Base.prototype, n); };
    Scene_NpTitles.prototype.refreshHead = function() {
        var w = this._head, c = w.contents; c.clear();
        var a = $.active();
        w.changeTextColor(w.systemColor());
        w.drawText(NP_L('Титулы жрицы', "Priestess's Titles"), 0, 0, 300);
        w.resetTextColor();
        w.drawText(NP_L('Открыто: ', "Unlocked: ") + $.unlockedCount() + ' / ' + $.visible().length, 300, 0, 260);
        w.changeTextColor(w.textColor(17));
        w.drawText(NP_L('Активный: ', "Active: ") + (a ? '«' + a.n + '» (' + $.bonusText(a) + ')' : NP_L('нет', "none")), 560, 0, c.width - 560, 'right');
        w.resetTextColor();
    };
    Scene_NpTitles.prototype.onOk = function() {
        var t = this._list.item();
        if (t && $.isUnlocked(t.id)) $.setActive($.active() === t ? null : t.id);
        this._list.refresh(); this._detail.refresh(); this.refreshHead();
        this._list.activate();
    };
    $.Scene_NpTitles = Scene_NpTitles;
    window.Scene_NpTitles = Scene_NpTitles;

    // ---- активный титул в блоке жрицы (NP_PriestessDiary) ----
    var Dg = D();
    if (Dg && typeof Dg.drawStatusPanel === 'function') {
        var _dsp = Dg.drawStatusPanel;
        Dg.drawStatusPanel = function(win, x, y, w, opts) {
            var h = _dsp.apply(this, arguments);
            try {
                var a = $.active();
                if (a && w >= 640) {
                    var b = win.contents, fs = b.fontSize;
                    b.fontSize = 20;
                    win.changeTextColor(win.textColor(17));
                    win.drawText(NP_L('Титул: «', "Title: «") + a.n + '»', x + Math.floor(w * 0.30), y + 2, Math.floor(w * 0.40), 'center');
                    b.fontSize = fs; win.resetTextColor();
                }
            } catch (e) {}
            return h;
        };
    }
})(NP_Titles);
