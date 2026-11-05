var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_PriestessDiary.js
//=============================================================================
/*:
 * @plugindesc v1.0 Подробный блок жрицы в окне состояния + предмет «Дневник жрицы» (книга с записями).
 * @author NP RU
 *
 * @param Item Id
 * @desc ID предмета «Дневник жрицы» (пустой слот Items.json, заполняется плагином при запуске).
 * @type number
 * @default 1490
 *
 * @param Icon Index
 * @desc Иконка предмета (230 — открытая книга).
 * @type number
 * @default 230
 *
 * @param Toast
 * @desc Сообщать в логе о новой записи в дневнике.
 * @type boolean
 * @default true
 *
 * @help
 * ── Окно состояния ──
 *   • «Список персонажей» → жрица (chara2): первой добавлена страница «♥» с подробным блоком.
 *   • Стандартное окно «Статус» для жрицы (актёр 2): тот же блок внизу окна.
 *   Шкалы: Похоть (V82/200, метка — порог V98), Чистая любовь (V83/200),
 *   Связь с Яризо (уровень V204/5 + очки V214 до лимита уровня),
 *   Развращённость (V214/999), Ночные отлучки (V4292, просто счётчик).
 *   Если Яризо ещё не встречен (нет S290/S291/S643, V204=0, V544=0) —
 *   шкала связи заменяется нейтральной строкой, мысли — нейтральные.
 *
 * ── Дневник ──
 *   Ключевой предмет (по умолчанию ID 1490). Выдаётся при новой игре и
 *   добавляется в старые сохранения при загрузке/входе на карту.
 *   Открывается из инвентаря как книга: ←/→, PageUp/PageDown, колесо,
 *   клик по левой/правой странице; Esc/ПКМ — закрыть.
 *   Записи открываются по переключателям/переменным игры и запоминаются
 *   в сохранении ($gameSystem._npDiary) — новых переменных не занимает.
 *
 * Команды плагина:
 *   NpDiary open        — открыть дневник
 *   NpDiary give        — выдать предмет (если его нет)
 *   NpDiary check       — проверить новые записи
 *
 * Скрипт: NP_PriestessDiary.open(), NP_PriestessDiary.unlocked()
 */
var NP_PriestessDiary = NP_PriestessDiary || {};
var Imported = Imported || {};
Imported.NP_PriestessDiary = true;

(function($) {
    'use strict';
    var params = PluginManager.parameters('NP_PriestessDiary');
    var ITEM_ID = Number(params['Item Id'] || 1490);
    var ICON = Number(params['Icon Index'] !== undefined && params['Icon Index'] !== '' ? params['Icon Index'] : 230);
    var TOAST = String(params['Toast'] || 'true') !== 'false';
    $.ITEM_ID = ITEM_ID;

    // ---- игровые переменные/переключатели (только чтение) ----
    var V = { LUST: 82, LOVE: 83, LUST_TH: 98, BOND: 204, EROSION: 214, CHEAT: 428,
              SEX_HERO: 542, SEX_YARIZO: 544, BEACH_PICKUP: 821, NIGHT_PARTNER: 4291, NIGHT_CNT: 4292,
              DAY: 4, YNTRS: 761 };
    var S = { GALLERY: 5, NTR: 32, NTR_START: 260, MET: 290, HELPED: 291, YDEAD: 503,
              CONTRACT: 643, BEACH: 722, YGONE: 2040,
              NTRS: 31, CONFESS: 133, SECRET: 122 };
    var YARIZO = 21, HERO = 1;
    var LVL_LIMITS = [1, 50, 120, 280, 500, 999]; // как в CE2 «ステ加減キャップ処理»
    $.V = V; $.S = S;

    function gv(id) { return (typeof $gameVariables !== 'undefined' && $gameVariables) ? (Number($gameVariables.value(id)) || 0) : 0; }
    function gs(id) { return (typeof $gameSwitches !== 'undefined' && $gameSwitches) ? !!$gameSwitches.value(id) : false; }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

    // Имя актёра без создания объекта (Яризо может быть не в отряде/не создан)
    function actorName(n) {
        try {
            if (typeof $gameActors !== 'undefined' && $gameActors && $gameActors._data && $gameActors._data[n])
                return $gameActors._data[n].name();
            if (typeof $dataActors !== 'undefined' && $dataActors && $dataActors[n]) return $dataActors[n].name || '';
        } catch (e) {}
        return '';
    }
    function fmt(text) {
        return String(text || '').replace(/\\N\[(\d+)\]/gi, function(m, n) { return actorName(Number(n)); });
    }
    $.fmt = fmt;

    // ---- состояние ----
    $.yarizoMet = function() {
        return gs(S.MET) || gs(S.HELPED) || gs(S.CONTRACT) || gv(V.BOND) >= 1 || gv(V.SEX_YARIZO) > 0;
    };
    $.yarizoGone = function() { return gs(S.YDEAD) || gs(S.YGONE); };
    $.bondLevel = function() { return clamp(Math.floor(gv(V.BOND)), 0, 5); };
    // ---- стадия жрицы = стадия арки дневника ----
    // Две независимые ветки, как у записей дневника:
    //   r — нетораси (S31 + признание S133): он сам просит, она делает это ради него;
    //   s — нетораре (S32): тайные ночи и ложь.
    // Обе выключены — только верная любовь (стадия 0). Стадия ветки берётся из
    // ОТКРЫТЫХ записей дневника (а они идут цепочкой по дням) и вдобавок растёт не
    // больше чем на 1 за игровой день — без резких скачков.
    var ARC_R = { confess: 1, confess2: 1, beach2n: 1, ntr: 1, ntr2: 1,
                  test1: 2, bond2: 2, test2: 2, test3: 2, ysex: 2,
                  ysex3: 2.5, bond3: 2.5, jealous: 2.5, body: 2.5, prayer: 2.5,
                  bond4: 3, ysex10: 3, bond5: 3, pages: 3, ysex20: 3, end: 3, night5: 2.5 };
    var ARC_S = { night1: 1, cheat: 1,
                  sec1: 2, nightY: 2, night3: 2, seen: 2, night5: 2, ysex: 2,
                  bond5: 3, pages: 3, ysex20: 3, end: 3 };
    // записи «про Яризо» в NTR-ветках — после них отсутствие Яризо даёт «тоску»
    var ARC_YNTR = ['ntr', 'ntr2', 'test1', 'bond2', 'test2', 'test3', 'ysex', 'ysex3', 'bond3', 'jealous', 'body',
                    'prayer', 'bond4', 'ysex10', 'sec1', 'nightY', 'seen', 'bond5', 'ysex20', 'end', 'ygone'];
    $.ARC_R = ARC_R; $.ARC_S = ARC_S;
    $.branchOn = function(b) { return b === 'r' ? nrs() : b === 's' ? gs(S.NTR) : false; };
    function rawBranch(b) {                     // 0, 1, 2, 2.5, 3 — по открытым записям
        if (!$.branchOn(b)) return 0;
        var d = $.data(); if (!d) return 0;
        var map = b === 'r' ? ARC_R : ARC_S, best = 0;
        for (var id in map) if (d.u[id] && map[id] > best) {
            var e = $.entryById(id);
            if (e && (b === 'r' ? (!e.r && e.s) : (!e.s && e.r))) continue;  // чужая ветка (night5 — общая)
            best = map[id];
        }
        return best;
    }
    $.rawBranch = rawBranch;
    // Сглаживание: на сколько «шагов» (0,1,2,2.5,3) ветка может подняться за день — на один.
    var STEPS = [0, 1, 2, 2.5, 3];
    function smooth(b, raw) {
        var d = $.data(); if (!d || gs(S.GALLERY)) return raw;
        d.arc = d.arc || {};
        var day = gv(V.DAY), rec = d.arc[b];
        if (!rec) { d.arc[b] = { v: raw, day: day }; return raw; }          // старое сохранение / первый вызов
        if (raw <= rec.v) { rec.v = raw; return raw; }                         // откат (режим выключили) — сразу
        if (day > rec.day) {
            var i = STEPS.indexOf(rec.v); if (i < 0) i = 0;
            rec.v = Math.min(raw, STEPS[Math.min(i + 1, STEPS.length - 1)]); rec.day = day;
        }
        return rec.v;
    }
    $.arc = function() {
        var r = smooth('r', rawBranch('r')), s = smooth('s', rawBranch('s'));
        var top = Math.max(r, s);
        var branch = top === 0 ? 'f' : (r === s ? 'rs' : (r > s ? 'r' : 's'));
        return { r: r, s: s, top: top, stage: Math.floor(top), branch: branch };
    };
    $.stage = function() {                       // 0..3 — для статуса, привала, утренних намёков, стресса
        if (!$.yarizoMet() && !gs(S.NTR) && !nrs()) return 0;
        try { return $.arc().stage; } catch (e) { return 0; }
    };
    $.lustThreshold = function() { var t = gv(V.LUST_TH); return t > 0 ? t : 100; };

    var THOUGHTS = {
        // ── верная любовь (все режимы, стадия 0) ──
        s0: [NP_L('Я служу богине. Это главное.', "I serve the goddess. That is what matters."),
             NP_L('С \\N[1] мне ничего не страшно.', "With \\N[1], I'm not afraid of anything."),
             NP_L('Скорее бы закончить путь — и под венец с \\N[1].', "I can't wait for this journey to end, so I can marry \\N[1].")],
        lust0: [NP_L('Тело горит... \\N[1], ну заметь же меня.', "My body is burning... \\N[1], please, just notice me."),
                NP_L('Молитва не помогает. Мне нужен \\N[1]. Сегодня.', "Prayer isn't helping. I need \\N[1]. Tonight.")],
        f1: [NP_L('Этот наёмник... Только бы держался подальше.', "That mercenary... If only he would keep his distance."),
             NP_L('Я невеста \\N[1]. Пусть \\N[21] это запомнит.', "I am \\N[1]'s bride. \\N[21] had better remember that."),
             NP_L('Ещё раз протянет руки — благословлю булавой.', "If he reaches for me again, I'll bless him with my mace.")],
        goneF: [NP_L('\\N[21] больше нет рядом. Дышать стало легче.', "\\N[21] isn't around anymore. It's easier to breathe."),
                NP_L('Снова только мы с \\N[1]. Как раньше.', "Just \\N[1] and me again. Like before.")],
        // ── нетораси: его просьба (S31) ──
        r1: [NP_L('Неужели меня ему мало?', "Am I not enough for him?"),
             NP_L('Я согласилась только потому, что люблю \\N[1].', "I only said yes because I love \\N[1]."),
             NP_L('Как он может этого хотеть... и почему у него так сияют глаза?', "How can he want this... and why do his eyes shine like that?")],
        r2: [NP_L('Только потому, что он хочет. Только поэтому.', "Only because he wants it. Only because of that."),
             NP_L('Ночью \\N[1] снова попросит рассказать всё подробно.', "Tonight \\N[1] will ask me to tell him every detail again."),
             NP_L('Терплю ради \\N[1]... а тело не слушается.', "I endure it for \\N[1]... but my body won't listen.")],
        r2b: [NP_L('Жду, когда \\N[1] опять попросит. Богиня, что со мной?', "I'm waiting for \\N[1] to ask again. Goddess, what's wrong with me?"),
              NP_L('Хоть бы раз приревновал. Хоть бы раз сказал «хватит».', "If only he'd get jealous once. Just once say: enough."),
              NP_L('Сердце у \\N[1]. А тело ноет по \\N[21].', "My heart is \\N[1]'s. But my body aches for \\N[21].")],
        r3: [NP_L('Ты сам открыл эту дверь, \\N[1].', "You opened this door yourself, \\N[1]."),
             NP_L('Он просит «ради меня» — а я киваю слишком быстро.', "He asks me to do it for him, and I nod far too quickly."),
             NP_L('Если \\N[21] позовёт — я пойду. А \\N[1] только улыбнётся.', "If \\N[21] calls for me, I will go. And \\N[1] will just smile.")],
        // ── нетораре: тайком (S32) ──
        s1: [NP_L('Сказала, что молилась в часовне. Он поверил.', "I said I'd been praying at the chapel. He believed me."),
             NP_L('Главное, чтобы \\N[1] не узнал.', "As long as \\N[1] doesn't find out."),
             NP_L('Стыдно... и почему-то чуточку сладко.', "I'm ashamed... and somehow it's a little sweet.")],
        s2: [NP_L('Это просто тело. Сердце — у \\N[1]... правда ведь?', "It's just my body. My heart belongs to \\N[1]... doesn't it?"),
             NP_L('Колени дрожат, когда \\N[21] рядом.', "My knees shake when \\N[21] is near."),
             NP_L('Ещё одна ночь вне нашей комнаты. Только бы не узнал.', "Another night away from our room. If only he never finds out.")],
        s3: [NP_L('Я хочу его. Прости, \\N[1].', "I want him. Forgive me, \\N[1]."),
             NP_L('Богиня, не смотри на меня сейчас.', "Goddess, please don't look at me right now."),
             NP_L('Если \\N[21] позовёт — я пойду.', "If \\N[21] calls for me, I will go.")],
        gone: [NP_L('Его больше нет рядом. А мысли всё возвращаются.', "He's not around anymore. Yet my thoughts keep coming back to him."),
               NP_L('Надо забыть. Почему не получается?', "I have to forget. Why can't I?")]
    };
    $.THOUGHTS = THOUGHTS;
    function keyOf(b, v) {
        if (b === 'r') return v >= 3 ? 'r3' : v >= 2.5 ? 'r2b' : v >= 2 ? 'r2' : 'r1';
        return 's' + Math.min(3, Math.floor(v));
    }
    function yarizoInArc() { var d = $.data(); if (!d) return false; for (var i = 0; i < ARC_YNTR.length; i++) if (d.u[ARC_YNTR[i]]) return true; return false; }
    // Список ключей мыслей (при равных стадиях обеих веток — смесь обеих)
    $.thoughtKeys = function() {
        var a = $.arc();
        if (!$.yarizoMet() && !gs(S.NTR) && !nrs()) a = { top: 0, branch: 'f' };
        if (a.top === 0) {
            if (gv(V.LUST) >= $.lustThreshold()) return ['lust0'];
            if ($.yarizoMet() && $.yarizoGone()) return ['goneF'];
            if ($.yarizoMet() && !$.yarizoGone()) return ['f1'];
            return ['s0'];
        }
        if ($.yarizoGone() && yarizoInArc()) return ['gone'];
        if (a.branch === 'rs') return [keyOf('r', a.r), keyOf('s', a.s)];
        return [keyOf(a.branch, a.branch === 'r' ? a.r : a.s)];
    };
    $.thoughtKey = function() { return $.thoughtKeys()[0]; };
    $.thought = function(seed) {
        var list = [];
        $.thoughtKeys().forEach(function(k) { list = list.concat(THOUGHTS[k] || []); });
        if (!list.length) list = THOUGHTS.s0;
        var i = (seed === undefined) ? Math.floor(Math.random() * list.length) : Math.abs(seed) % list.length;
        return list[i];
    };
    $.STAGE_NAMES = [NP_L('Верная жрица', "Faithful Priestess"), NP_L('Смятение', "Turmoil"), NP_L('Двойная жизнь', "Double Life"), NP_L('Падение', "Fall")];
    $.STAGE_NAMES_R = [NP_L('Верная жрица', "Faithful Priestess"), NP_L('Его просьба', "His Request"), NP_L('Ради него', "For His Sake"), NP_L('Новая я', "The New Me")];
    $.STAGE_NAME_R2B = NP_L('Тело против сердца', "Body Against Heart");
    // Название стадии для окна статуса — по ведущей ветке
    $.stageName = function() {
        var a = $.arc(), st = $.stage();
        if (st === 0) return $.STAGE_NAMES[0];
        if (a.branch === 'r' || (a.branch === 'rs' && a.r >= a.s)) return a.r >= 2.5 && a.r < 3 ? $.STAGE_NAME_R2B : $.STAGE_NAMES_R[st];
        return $.STAGE_NAMES[st];
    };

    // ---- записи дневника ----
    // Флаги записи:
    //   y: true — про Яризо (нужна реальная встреча с ним, иначе не откроется)
    //   f: true — только верный путь (она ни с кем, кроме героя: pure())
    //   r: true — нетораси (S31 «寝取らせ» + S133 «герой признался в фетише»)
    //   s: true — нетораре/тайные измены (S32 «寝取られ»)
    //   n: true — любая NTR-запись; без S31 и без S32 не откроется никогда
    //   p: 'id' | ['id',...] — предыдущая запись цепочки: нужна открытая раньше,
    //      причём в один из ПРОШЛЫХ игровых дней (V4) — сюжет не перескакивает.
    function ym() { return $.yarizoMet(); }
    function nrs() { return gs(S.NTRS) && gs(S.CONFESS); }                 // герой признался в фетише
    function ntrY() { return ym() && nrs() && gs(S.NTR_START); }           // он попросил её «о кое-чём» с Яризо
    function pure() {                                                     // она ни с кем, кроме героя
        return gv(V.SEX_YARIZO) === 0 && gv(V.CHEAT) === 0 && gv(V.NIGHT_CNT) === 0 &&
               gv(V.YNTRS) === 0 && !gs(S.SECRET) && !gs(S.NTR_START);
    }
    function seenByHero() { try { return !!($gameSelfSwitches && $gameSelfSwitches.value([17, 23, 'B'])); } catch (e) { return false; } }
    function bl() { return $.bondLevel(); }
    $.pure = pure; $.nrs = nrs;

    var E = [
        // ═══ I. Только он ═══
        { id: 'start', t: NP_L('Новая тетрадь', "A New Notebook"), c: function() { return true; },
          b: NP_L('Сегодня мы выступили в путь. Буду записывать сюда всё, что не скажу вслух даже на исповеди. Мы с \\N[1] станем авантюристами ранга «Падающая звезда» — я в это верю. Богиня, храни нас.', "Today we set out on our journey. I'll write down everything here that I wouldn't say aloud even at confession. \\N[1] and I are going to become Falling Star adventurers. I believe it. Goddess, watch over us.") },
        { id: 'hero1', p: 'start', t: NP_L('С \\N[1]', "With \\N[1]"), c: function() { return gv(V.SEX_HERO) >= 1; },
          b: NP_L('Мы с \\N[1] наконец были вместе. Неловко, смешно и очень нежно. Он всё время спрашивал, не больно ли мне. Глупый. Я счастлива.', "\\N[1] and I were finally together. Awkward, funny and so very tender. He kept asking if it hurt. Silly man. I'm so happy.") },
        { id: 'love50', p: 'hero1', t: NP_L('Тёплые руки', "Warm Hands"), c: function() { return gv(V.LOVE) >= 50; },
          b: NP_L('Когда \\N[1] держит меня за руку, дорога кажется короче. Наверное, это и есть то, о чём поют в храмовых гимнах.', "When \\N[1] holds my hand, the road feels shorter. Maybe this is what the temple hymns sing about.") },
        { id: 'wedding', p: 'love50', t: NP_L('Свадьба', "The Wedding"), c: function() { return gv(V.LOVE) >= 80; },
          b: NP_L('Утром спросила \\N[1], где мы сыграем свадьбу. Он чуть не подавился моим завтраком. Глупый, я же не про завтра! Когда станем «Падающими звёздами», выберем самое красивое место на свете. К родителям я не вернусь — мой дом там, где он.', "This morning I asked \\N[1] where we'll have our wedding. He nearly choked on the breakfast I made. Silly, I didn't mean tomorrow! Once we're Falling Stars, we'll pick the most beautiful place in the world. I'm never going back to my parents. My home is wherever he is.") },
        { id: 'lust50', p: 'hero1', t: NP_L('Странный жар', "A Strange Heat"), c: function() { return gv(V.LUST) >= 50; },
          b: NP_L('Тело стало странно отзываться на каждое прикосновение. Даже на ветер. Читаю молитвы перед сном — не помогает. Помогает одно: уткнуться в плечо \\N[1] и не отпускать его до утра.', "My body has started reacting strangely to every touch. Even to the wind. I say my prayers before bed, and it doesn't help. Only one thing does: burying my face in \\N[1]'s shoulder and holding on until morning.") },
        { id: 'beach', t: NP_L('Сияющий пляж', "Shining Beach"), c: function() { return gs(S.BEACH); },
          b: NP_L('Море! Солнце, песок, \\N[1] краснеет, когда я в купальнике. Ради этого стоило тащиться через полконтинента.', "The sea! Sun, sand, and \\N[1] blushing when he sees me in a swimsuit. That alone was worth dragging ourselves across half the continent.") },
        { id: 'met', y: true, t: NP_L('Наёмник', "The Mercenary"), c: function() { return gs(S.MET) || gs(S.HELPED) || gs(S.CONTRACT); },
          b: NP_L('Сегодня встретили наёмника. \\N[21]. Смотрел на меня так, будто уже купил. Мерзость. Хорошо, что \\N[1] рядом.', "Today we met a mercenary. \\N[21]. He looked at me as if he'd already bought me. Disgusting. Thank goodness \\N[1] is with me.") },
        { id: 'contract', y: true, p: 'met', t: NP_L('Договор', "The Contract"), c: function() { return gs(S.CONTRACT); },
          b: NP_L('\\N[1] нанял его. Я была против — сказала прямо: я невеста \\N[1], и пусть держит руки при себе. Он только ухмыльнулся.', "\\N[1] hired him. I was against it. I told him straight: I am \\N[1]'s bride, so keep your hands to yourself. He just smirked.") },
        { id: 'bond1', y: true, p: 'met', t: NP_L('Полезен в бою', "Useful in Battle"), c: function() { return bl() >= 1; },
          b: NP_L('Признаю: в бою \\N[21] полезен. Признаю это — и только это. Всё остальное в нём по-прежнему невыносимо.', "I admit it: \\N[21] is useful in battle. I admit that, and only that. Everything else about him is as unbearable as ever.") },
        { id: 'lust100', p: 'lust50', t: NP_L('Без притворства', "No More Pretending"), c: function() { return gv(V.LUST) >= $.lustThreshold(); },
          b: NP_L('Больше не могу притворяться, что не замечаю этого жара. Он со мной с утра до ночи. Сегодня я сама пришла к \\N[1] и не дала ему сказать ни слова. Святая жрица, как же. Зато как он потом улыбался.', "I can't pretend I don't notice this heat anymore. It's with me from morning till night. Tonight I went to \\N[1] myself and didn't let him get a word in. Some holy priestess I am. But oh, how he smiled afterwards.") },

        // ═══ Верный путь ═══
        { id: 'love120', f: true, p: 'love50', t: NP_L('Его спина', "His Back"), c: function() { return gv(V.LOVE) >= 120; },
          b: NP_L('Сегодня в бою \\N[1] закрыл меня собой. Потом делал вид, что ничего особенного, а у самого дрожали руки. Я перевязывала ему плечо и думала: вот за кого я выйду замуж. Ни за кого другого.', "In battle today \\N[1] shielded me with his own body. Afterwards he acted like it was nothing, but his hands were shaking. I bandaged his shoulder and thought: this is the man I'm going to marry. No one else.") },
        { id: 'beach2', p: 'beach', t: NP_L('Взгляды на песке', "Stares on the Sand"), c: function() { return gv(V.BEACH_PICKUP) >= 1 && !nrs(); },
          b: NP_L('На пляже ко мне подходили мужчины. Я показывала на \\N[1] и говорила: «Я занята». Один не понял с первого раза — \\N[1] так на него посмотрел, что тот сразу вспомнил о срочных делах. Мой рыцарь.', "Men kept coming up to me on the beach. I'd point at \\N[1] and say I was taken. One of them didn't get it the first time, and \\N[1] gave him such a look that he suddenly remembered somewhere else to be. My knight.") },
        { id: 'yrefuse', y: true, f: true, p: 'contract', t: NP_L('Не на ту напал', "Wrong Girl"), c: function() { return gs(S.CONTRACT) && gv(V.LOVE) >= 120; },
          b: NP_L('\\N[21] опять отпускал свои шуточки и будто случайно тянул руки. Я при всех пообещала в следующий раз благословить его булавой. Он заржал, но руки убрал. Пусть знает: я принадлежу \\N[1]. И точка.', "\\N[21] was cracking his jokes again and reaching for me as if by accident. In front of everyone, I promised to bless him with my mace next time. He guffawed, but he kept his hands to himself. He should know I belong to \\N[1]. Period.") },
        { id: 'love150', f: true, p: 'love120', t: NP_L('Только он', "Only Him"), c: function() { return gv(V.LOVE) >= 150; },
          b: NP_L('Что бы ни случилось в дороге, я знаю: вернусь к \\N[1]. Он — мой дом. Пишу это, чтобы самой не забыть.', "Whatever happens on the road, I know I'll come back to \\N[1]. He is my home. I'm writing this so I won't forget.") },
        { id: 'love180', f: true, p: 'love150', t: NP_L('Обет', "The Vow"), c: function() { return gv(V.LOVE) >= 180; },
          b: NP_L('Сегодня в храме я дала обет — тихо, чтобы слышала только богиня. Что бы нас ни ждало, мои руки, губы и сердце — только для \\N[1]. Он спросил, о чём я так долго молилась. Не сказала. Узнает у алтаря.', "Today at the temple I made a vow, quietly, so only the goddess could hear. Whatever lies ahead, my hands, my lips and my heart are for \\N[1] alone. He asked what I'd been praying about for so long. I didn't tell him. He'll find out at the altar.") },
        { id: 'love200', f: true, p: 'love180', t: NP_L('Падающая звезда', "A Falling Star"), c: function() { return gv(V.LOVE) >= 200; },
          b: NP_L('Ночью мы видели падающую звезду. \\N[1] загадал желание и покраснел, а я и так знаю какое — то же, что у меня. Тетрадь почти кончилась, а писать больше нечего, кроме одного: я счастлива. Богиня, спасибо тебе за него.', "Last night we saw a falling star. \\N[1] made a wish and blushed, but I already know what it was: the same as mine. The notebook is almost full, and there's nothing left to write but this: I'm happy. Goddess, thank you for him.") },
        { id: 'ygoneF', y: true, p: 'met', t: NP_L('Тишина', "Quiet"), c: function() { return $.yarizoGone() && gv(V.SEX_YARIZO) === 0 && gv(V.YNTRS) === 0; },
          b: NP_L('\\N[21] больше нет рядом. Я помолилась за него, как положено жрице, но врать не стану: стало легче. Никто не пялится, не отпускает сальностей. Вечером мы с \\N[1] просто сидели у огня вдвоём. Как раньше.', "\\N[21] isn't around anymore. I prayed for him, as a priestess should, but I won't lie: I feel lighter. No one leering, no one making filthy jokes. Tonight \\N[1] and I just sat by the fire, the two of us. Like before.") },

        // ═══ II. Его просьба ═══
        { id: 'confess', r: true, p: 'hero1', t: NP_L('Его секрет', "His Secret"), c: function() { return true; },
          b: NP_L('\\N[1] признался мне в своём секрете. Он хочет... чтобы меня касался другой мужчина. А он чтобы знал. Смотрел. Я кричала «ни за что» так, что, наверное, слышал весь трактир. Он сказал: «Это тоже форма любви». Какая же это любовь?!', "\\N[1] told me his secret. He wants... another man to touch me. And he wants to know. To watch. I screamed never so loudly the whole inn must have heard. He said, This is a form of love too. What kind of love is that?!") },
        { id: 'confess2', r: true, p: 'confess', t: NP_L('Ради него', "For Him"), c: function() { return true; },
          b: NP_L('Не спала всю ночь. Неужели меня ему мало? Он сказал, что хочет узнать, как сильно я его люблю. И я согласилась. Меня мутит от одной мысли, но таких сияющих глаз я у него никогда не видела. Богиня, пусть он помнит: я делаю это только потому, что люблю его.', "I didn't sleep all night. Am I not enough for him? He said he wants to know how much I love him. And I said yes. The very thought makes me sick, but I've never seen his eyes shine like that. Goddess, let him remember: I'm doing this only because I love him.") },
        { id: 'beach2n', r: true, p: 'confess', t: NP_L('Его взгляд', "The Way He Looked"), c: function() { return gv(V.BEACH_PICKUP) >= 1; },
          b: NP_L('На пляже ко мне подходили мужчины. Я отшучивалась и искала глазами \\N[1]... а он не злился. Он смотрел жадно, с румянцем, будто ему дарили подарок. Мне стало стыдно. Не из-за них — из-за того, что мне понравилось, как он смотрит.', "Men kept coming up to me on the beach. I laughed them off and looked around for \\N[1]... and he wasn't angry. He was watching hungrily, flushed, as if someone were giving him a present. I felt ashamed. Not because of them, but because I liked the way he looked at me.") },
        { id: 'ntr', y: true, r: true, p: 'confess2', t: NP_L('Странная просьба', "A Strange Request"), c: function() { return ntrY(); },
          b: NP_L('\\N[1] попросил меня показаться \\N[21]. Голой. Именно ему! Меня чуть не вывернуло. Но долг жрицы — исполнять желания, и я сказала себе: это испытание богов, ради его любви. Я разделась перед этим ухмыляющимся боровом и твёрдо сказала: «Я никогда не кончу от вас».', "\\N[1] asked me to show myself to \\N[21]. Naked. To him, of all people! I almost threw up. But a priestess's duty is to grant wishes, so I told myself it was a trial from the gods, for the sake of his love. I undressed in front of that leering hog and told him firmly: I will never come for you.") },
        { id: 'ntr2', y: true, r: true, p: 'ntr', t: NP_L('Спасибо', "Thank You"), c: function() { return ntrY(); },
          b: NP_L('Ночью \\N[1] обнимал меня крепче, чем когда-либо, и шептал «спасибо». За что? За то, что на меня пялился другой? Я плакала ему в плечо, а он гладил меня по волосам — счастливый. Я рада, что он счастлив. Правда рада. Только почему так гадко?', "That night \\N[1] held me tighter than ever and whispered thank you. For what? For letting another man stare at me? I cried into his shoulder while he stroked my hair, happy. I'm glad he's happy. I truly am. So why do I feel so filthy?") },

        // ═══ III. Только потому, что он хочет ═══
        { id: 'test1', y: true, r: true, p: 'ntr2', t: NP_L('Испытание', "The Trial"), c: function() { return ntrY() && gv(V.YNTRS) >= 1; },
          b: NP_L('\\N[1] захотел посмотреть, выдержу ли я пальцы \\N[21]. Я вцепилась в простыню и твердила себе: если кончу — он во мне разочаруется. Не выдержала. А потом сказала \\N[1], что не кончила. Это моя первая ложь ему. Всё это только потому, что он хочет. Только поэтому.', "\\N[1] wanted to see whether I could withstand \\N[21]'s fingers. I clutched the sheets and told myself: if I come, he'll be disappointed in me. I couldn't hold out. Then I told \\N[1] I hadn't come. My first lie to him. I only do this because he wants it. Only because of that.") },
        { id: 'bond2', y: true, r: true, p: 'ntr', t: NP_L('Не выходит из головы', "Can't Stop Thinking"), c: function() { return ntrY() && bl() >= 2; },
          b: NP_L('Он мерзкий. Грубый, наглый, пахнет вином и железом. Но \\N[1] каждую ночь просит рассказать, что \\N[21] со мной делал и что я чувствовала. Я рассказываю — и ловлю себя на том, что вспоминаю слишком охотно.', "He's vile. Rude, brazen, smelling of wine and iron. But every night \\N[1] asks me to tell him what \\N[21] did to me and how it felt. I tell him, and I catch myself remembering a little too eagerly.") },
        { id: 'test2', y: true, r: true, p: 'test1', t: NP_L('На его глазах', "Before His Eyes"), c: function() { return ntrY() && gv(V.YNTRS) >= 2; },
          b: NP_L('Сегодня \\N[21] снова «показывал технику», а \\N[1] смотрел. Я кусала губы, терпела ради него — и всё-таки кончила у него на глазах. Умоляла не смотреть. Он смотрел. А потом целовал меня так, будто я подарила ему весь мир.', "Today \\N[21] was showing off his technique again, and \\N[1] watched. I bit my lips and held on for his sake, and I still came right in front of him. I begged him not to look. He looked. Then he kissed me as if I'd given him the whole world.") },
        { id: 'ysex', y: true, n: true, p: ['test1', 'sec1'], t: NP_L('Тело помнит', "My Body Remembers"), c: function() { return gv(V.SEX_YARIZO) >= 1 && (ntrY() || (gs(S.NTR) && bl() >= 3)); },
          b: NP_L('Днём не могу смотреть \\N[21] в глаза. А ночью, когда \\N[1] засыпает, вспоминаю его толстые грубые пальцы и сжимаю бёдра. Это не я. Это тело. Тело можно отмолить... правда ведь?', "By day I can't look \\N[21] in the eye. But at night, when \\N[1] falls asleep, I remember his thick, rough fingers and squeeze my thighs together. That isn't me. It's my body. A body can be prayed clean... can't it?") },
        { id: 'test3', y: true, r: true, p: 'test2', t: NP_L('Не для тебя', "Not for You"), c: function() { return ntrY() && gv(V.YNTRS) >= 3; },
          b: NP_L('Сегодня я взяла в рот член \\N[21]. Огромный, вонючий — и я твердила про себя: я сосу не для тебя, а для \\N[1]. Потом \\N[1] целовал меня, хотя у меня во рту ещё был вкус другого. Ему было всё равно. Нет — ему было хорошо. А мне... пока не решаюсь написать.', "Today I took \\N[21]'s cock in my mouth. Huge, rank, and I kept telling myself: I'm not sucking it for you, I'm doing it for \\N[1]. Afterwards \\N[1] kissed me, though I could still taste another man. He didn't care. No, he loved it. And me... I don't dare write it yet.") },

        // ═══ IV. Тело против сердца ═══
        { id: 'ysex3', y: true, r: true, p: ['ysex', 'test2'], t: NP_L('Ожидание', "Waiting"), c: function() { return ntrY() && gv(V.SEX_YARIZO) >= 3; },
          b: NP_L('Поймала себя на том, что жду. Жду, когда \\N[1] опять смущённо попросит «ещё разок». Раньше я молилась, чтобы он передумал. Теперь боюсь, что передумает. Богиня, что со мной?', "I caught myself waiting. Waiting for \\N[1] to shyly ask for one more time. I used to pray he'd change his mind. Now I'm afraid he will. Goddess, what is happening to me?") },
        { id: 'bond3', y: true, r: true, p: ['ysex3', 'test3'], t: NP_L('Сама', "Of My Own Will"), c: function() { return ntrY() && bl() >= 3; },
          b: NP_L('Сегодня я пошла к \\N[21], хотя \\N[1] ни о чём не просил. Вечером призналась — ждала, что он рассердится, запретит, хлопнет дверью. А он покраснел и попросил рассказать подробно. Я рассказала. Всё.', "Today I went to \\N[21] even though \\N[1] hadn't asked me to. That evening I confessed. I expected him to get angry, forbid it, slam the door. Instead he flushed and asked me to tell him every detail. So I did. Everything.") },
        { id: 'jealous', y: true, r: true, p: 'bond3', t: NP_L('Ревность', "Jealousy"), c: function() { return ntrY() && gv(V.SEX_YARIZO) >= 5; },
          b: NP_L('Я хочу, чтобы он ревновал. Чтобы хоть раз схватил меня за руку и сказал: «Хватит, ты моя». Вместо этого он спрашивает: «Тебе было хорошо?» Сегодня я ответила «да». И это была правда. Это хуже всего.', "I want him to be jealous. Just once, to grab my wrist and say: Enough, you're mine. Instead he asks: Was it good for you? Today I said yes. And it was the truth. That's the worst part.") },
        { id: 'body', y: true, r: true, p: 'jealous', t: NP_L('Тело и сердце', "Body and Heart"), c: function() { return ntrY() && bl() >= 3 && gv(V.LUST) >= $.lustThreshold(); },
          b: NP_L('Стоит \\N[21] заговорить своим хриплым голосом — и у меня мокро между ног. Я хочу его член и пишу это слово своей рукой, в святой тетради. Но засыпаю я на плече \\N[1], и сердце у меня — его. Как одно уживается с другим?', "All \\N[21] has to do is speak in that rough voice of his, and I'm wet between my legs. I want his cock, and I'm writing that word with my own hand, in a holy notebook. But I fall asleep on \\N[1]'s shoulder, and my heart is his. How can both be true?") },
        { id: 'prayer', y: true, r: true, p: 'body', t: NP_L('Две молитвы', "Two Prayers"), c: function() { return ntrY() && gv(V.EROSION) >= 120; },
          b: NP_L('Вечером молилась о силе остановиться. Долго, искренне, на коленях. А потом, ещё не поднявшись, поймала себя на второй молитве: чтобы \\N[21] позвал меня сегодня. Богиня, какую из двух ты услышишь?', "This evening I prayed for the strength to stop. For a long time, sincerely, on my knees. Then, before I'd even stood up, I caught myself saying a second prayer: that \\N[21] would call for me tonight. Goddess, which of the two will you hear?") },
        { id: 'bond4', y: true, r: true, p: ['prayer', 'jealous'], t: NP_L('Прости', "Forgive Me"), c: function() { return ntrY() && bl() >= 4; },
          b: NP_L('Ты сам открыл эту дверь, \\N[1]. Я вошла, чтобы порадовать тебя, — и не заметила, как закрыла её за собой. Теперь, когда ты просишь «ради меня», я киваю слишком быстро. И мы оба делаем вид, что не замечаем этого.', "You opened this door yourself, \\N[1]. I walked through it to make you happy, and I didn't notice when I closed it behind me. Now when you ask me to do it for you, I nod far too quickly. And we both pretend not to notice.") },
        { id: 'ysex10', y: true, r: true, p: 'bond4', t: NP_L('Счёт потерян', "Lost Count"), c: function() { return ntrY() && bl() >= 4 && gv(V.SEX_YARIZO) >= 10; },
          b: NP_L('Перестала считать. Раньше каждый раз был испытанием, теперь — наградой. Я кончаю под \\N[21] громко, не сдерживаясь, а \\N[1] слушает и дрожит от восторга. «Я никогда не кончу от вас» — мои собственные слова. Смешно.', "I've stopped counting. Each time used to be a trial; now it's a reward. I come under \\N[21] loudly, holding nothing back, while \\N[1] listens and trembles with delight. I will never come for you. My own words. How funny.") },

        // ═══ Тайком (нетораре) ═══
        { id: 'sec1', y: true, s: true, p: 'bond1', t: NP_L('Двойная жизнь', "A Double Life"), c: function() { return !nrs() && bl() >= 3; },
          b: NP_L('Сегодня я пришла к \\N[21] сама. Никто не заставлял — и это пугает больше всего. \\N[1] ничего не знает и не должен узнать. Сердце всё ещё принадлежит ему. Тело — уже не уверена.', "Today I went to \\N[21] on my own. No one made me, and that scares me most of all. \\N[1] knows nothing and must never find out. My heart still belongs to him. My body, I'm no longer sure.") },
        { id: 'night1', s: true, p: 'hero1', t: NP_L('Часовня', "The Chapel"), c: function() { return gv(V.NIGHT_CNT) >= 1; },
          b: NP_L('Сказала, что молилась в часовне. Колени и правда дрожали... но не от молитвы. \\N[1] ничего не спросил. Не знаю, что хуже: если бы спросил — или то, что не спросил.', "I said I'd been praying at the chapel. My knees really were shaking... but not from prayer. \\N[1] didn't ask a thing. I don't know which is worse: if he had asked, or that he didn't.") },
        { id: 'cheat', s: true, p: 'hero1', t: NP_L('Первая ложь', "The First Lie"), c: function() { return gv(V.CHEAT) >= 1; },
          b: NP_L('Я обманула \\N[1]. Смотрела ему в глаза и врала. Мне стыдно... и, богиня, прости — чуточку сладко.', "I deceived \\N[1]. I looked him in the eyes and lied. I'm ashamed... and, goddess forgive me, it felt a little sweet.") },
        { id: 'nightY', y: true, s: true, p: ['night1', 'cheat'], t: NP_L('Его комната', "His Room"), c: function() { return gv(V.NIGHT_CNT) >= 1 && gv(V.NIGHT_PARTNER) === 2; },
          b: NP_L('Этой ночью я сама постучала в его дверь. Никто не тащил меня за руку. Вернулась под утро и долго смотрела, как спит \\N[1].', "Tonight I knocked on his door myself. Nobody dragged me there. I came back near dawn and watched \\N[1] sleep for a long time.") },
        { id: 'night3', s: true, p: 'night1', t: NP_L('Третья ночь', "The Third Night"), c: function() { return gv(V.NIGHT_CNT) >= 3; },
          b: NP_L('Уже третья ночь вне нашей комнаты. \\N[1] спит так крепко... Главное, чтобы не узнал. Главное — чтобы не узнал.', "The third night away from our room. \\N[1] sleeps so soundly... As long as he doesn't find out. As long as he never finds out.") },
        { id: 'seen', y: true, s: true, p: 'cheat', t: NP_L('Он видел', "He Saw"), c: function() { return seenByHero(); },
          b: NP_L('\\N[1] вернулся раньше и открыл дверь. Я была под \\N[21], в нашей постели. Умоляла не смотреть — и всё равно смотрела ему в глаза, когда кончала. Потом плакала и повторяла: я люблю тебя, правда люблю. Просто моё тело... Я и сама не знаю, что «просто».', "\\N[1] came back early and pushed the door open. I was under \\N[21], in our bed. I begged him not to look, and still I looked into his eyes as I came. Afterwards I cried and kept saying: I love you, I truly do. It's just my body... I don't even know what just means anymore.") },
        { id: 'night5', r: true, s: true, p: 'night3', t: NP_L('Ненужная ложь', "A Needless Lie"), c: function() { return gv(V.NIGHT_CNT) >= 5; },
          b: NP_L('Он сам этого хотел. Позволил бы, спроси я разрешения. А я всё равно ухожу по ночам тайком и вру про часовню и больных соседей. Может, эта ложь — единственное, что принадлежит только мне. Или я просто хочу, чтобы ему наконец стало больно.', "He wanted this himself. He'd let me, if only I asked. Yet I still slip out at night and lie about the chapel and sick neighbours. Maybe this lie is the only thing that's mine alone. Or maybe I just want it to finally hurt him.") },

        // ═══ V. Новая я ═══
        { id: 'bond5', y: true, n: true, p: ['ysex10', 'night3', 'sec1'], t: NP_L('Другая молитва', "A Different Prayer"), c: function() { return bl() >= 5 && (ntrY() || gs(S.NTR)); },
          b: NP_L('Я всё ещё молюсь. Только теперь по-другому: не прошу прощения, а благодарю — за то, кем стала. Богиня, наверное, отвернулась. А я улыбаюсь, и мне не стыдно.', "I still pray. Only differently now: I don't ask for forgiveness, I give thanks for who I've become. The goddess has probably turned away from me. And I smile, and I'm not ashamed.") },
        { id: 'pages', n: true, p: ['bond4', 'night3', 'sec1'], t: NP_L('Первые страницы', "The First Pages"), c: function() { return gv(V.LOVE) < 50 && (gv(V.SEX_YARIZO) >= 10 || gv(V.NIGHT_CNT) >= 5); },
          b: NP_L('Перечитала первые страницы. Свадьба у моря, тёплые руки... Будто писала другая девушка. Я всё ещё люблю \\N[1]. Наверное. Или люблю то, как сладко возвращаться к нему от другого. Раньше я знала разницу.', "I reread the first pages. A wedding by the sea, warm hands... As if another girl wrote them. I still love \\N[1]. Probably. Or I love how sweet it is to come back to him from another man. I used to know the difference.") },
        { id: 'ysex20', y: true, n: true, p: 'bond5', t: NP_L('Новая я', "The New Me"), c: function() { return bl() >= 5 && gv(V.SEX_YARIZO) >= 20; },
          b: NP_L('Утром смотрела в зеркало: невеста \\N[1] и шлюха \\N[21] — и обе улыбались одинаково. Я больше не выбираю между ними и не ищу оправданий. Это просто я. Новая я.', "This morning I looked in the mirror: \\N[1]'s bride and \\N[21]'s whore, and both of them smiled the same smile. I don't choose between them anymore, and I don't look for excuses. This is just me. The new me.") },
        { id: 'end', y: true, n: true, p: 'ysex20', t: NP_L('Последняя страница', "The Last Page"), c: function() { return bl() >= 5 && gv(V.EROSION) >= 500; },
          b: NP_L('\\N[1] иногда спрашивает: «Ты ещё любишь меня?» Я отвечаю «да» и целую его теми же губами. Я больше не знаю, вру ли. Я не та девочка, что начинала эту тетрадь, — и мне не жаль. Если богиня захочет судить меня, пусть судит.', "Sometimes \\N[1] asks: Do you still love me? I say yes and kiss him with the same lips. I no longer know whether I'm lying. I'm not the girl who started this notebook, and I'm not sorry. If the goddess wants to judge me, let her.") },
        { id: 'ygone', y: true, n: true, p: 'met', t: NP_L('Пустота', "Emptiness"), c: function() { return $.yarizoGone() && (gv(V.SEX_YARIZO) >= 1 || gv(V.YNTRS) >= 1); },
          b: NP_L('Его больше нет рядом. Должна радоваться — и радуюсь. Тогда почему по ночам я прислушиваюсь к шагам за дверью?', "He's not around anymore. I should be glad, and I am. Then why do I listen for footsteps outside my door at night?") }
    ];
    E.forEach(function(e) { if (e.r || e.s) e.n = true; });
    $.ENTRIES = E;
    $.entryById = function(id) { for (var i = 0; i < E.length; i++) if (E[i].id === id) return E[i]; return null; };

    // ---- хранение (в сохранении) ----
    $.data = function() {
        if (typeof $gameSystem === 'undefined' || !$gameSystem) return null;
        var d = $gameSystem._npDiary;
        if (!d || typeof d !== 'object') d = $gameSystem._npDiary = { u: {}, seq: 0, seen: {} };
        d.u = d.u || {}; d.seen = d.seen || {}; d.seq = d.seq || 0; d.d = d.d || {};
        return d;
    };
    $.isUnlocked = function(id) { var d = $.data(); return !!(d && d.u[id]); };
    $.unlocked = function() {
        var d = $.data(); if (!d) return [];
        var list = E.filter(function(e) { return !!d.u[e.id]; });
        list.sort(function(a, b) { return d.u[a.id] - d.u[b.id] || E.indexOf(a) - E.indexOf(b); });
        return list;
    };
    // Общие «замки» записи (флаги y/n/r/s/f); без учёта условия c и цепочки p
    function gateOk(e) {
        if (e.y && !$.yarizoMet()) return false;               // без реальной встречи — ничего про Яризо
        if (e.n && !gs(S.NTRS) && !gs(S.NTR)) return false;    // NTR выключено целиком — никаких NTR-записей
        if (e.r && !nrs()) return false;                       // нетораси: только после его признания (S31+S133)
        if (e.s && !gs(S.NTR)) return false;                   // тайные измены: только при S32
        if (e.f && !pure()) return false;                      // верный путь: только пока она ни с кем другим
        return true;
    }
    $.gateOk = gateOk;
    $.check = function(silent) {
        var d = $.data(); if (!d) return [];
        if (gs(S.GALLERY)) return [];           // режим галереи — ничего не открываем
        var fresh = [], day = gv(V.DAY);
        for (var i = 0; i < E.length; i++) {
            var e = E[i];
            if (d.u[e.id]) continue;
            var ok = false;
            try { ok = gateOk(e) && !!e.c(); } catch (err) { ok = false; }
            if (ok && e.p) {                    // цепочка: предыдущая запись открыта в один из прошлых дней
                var ps = [].concat(e.p), pk = false;
                for (var j = 0; j < ps.length; j++) {
                    var pid = ps[j];
                    if (d.u[pid] && (d.d[pid] === undefined || day > d.d[pid])) { pk = true; break; }
                }
                ok = pk;
            }
            if (ok) { d.u[e.id] = ++d.seq; d.d[e.id] = day; fresh.push(e); }
        }
        if (fresh.length && !silent) $.toast(fresh);
        return fresh;
    };
    // Сколько записей вообще возможно в этой игре (для «X из Y»): открытые + доступные по флагам
    $.total = function() {
        var d = $.data() || { u: {} }, n = 0;
        for (var i = 0; i < E.length; i++) {
            var e = E[i];
            if (d.u[e.id]) { n++; continue; }
            var ok = false;
            try { ok = gateOk(e); } catch (err) { ok = false; }
            if (ok) n++;
        }
        return n;
    };
    $.toast = function(fresh) {
        if (!TOAST || !fresh || !fresh.length) return;
        try {
            if (typeof $LogWindow !== 'undefined' && $LogWindow && $LogWindow.Add) {
                if (fresh.length === 1) $LogWindow.Add(NP_L('\\C[27]У жрицы в дневнике новая запись:\\C[0] «', "\\C[27]The priestess wrote a new diary entry:\\C[0] «") + fmt(fresh[0].t) + '»');
                else $LogWindow.Add(NP_L('\\C[27]У жрицы появились новые записи в дневнике:\\C[0] ', "\\C[27]The priestess has new diary entries:\\C[0] ") + fresh.length);
            }
        } catch (e) {}
    };
    $.newCount = function() {
        var d = $.data(); if (!d) return 0;
        return $.unlocked().filter(function(e) { return !d.seen[e.id]; }).length;
    };

    // ---- предмет ----
    $.setupItem = function() {
        if (typeof $dataItems === 'undefined' || !$dataItems) return;
        var it = $dataItems[ITEM_ID];
        if (!it) it = $dataItems[ITEM_ID] = { id: ITEM_ID, animationId: 0, damage: { critical: false, elementId: 0, formula: '0', type: 0, variance: 20 },
            effects: [], hitType: 0, note: '', price: 0, repeats: 1, speed: 0, successRate: 100, tpGain: 0, meta: {} };
        if (it._npDiary) return;
        var desc = NP_L('Личный дневник жрицы в кожаном переплёте.\nОткрыть — прочитать записи. Чужим не показывать!', "The priestess's personal leather-bound diary.\nOpen it to read the entries. Not for anyone else's eyes!");
        try { Object.defineProperty(it, 'name', { value: NP_L('Дневник жрицы', "Priestess's Diary"), writable: true, configurable: true, enumerable: true }); } catch (e) { it.name = NP_L('Дневник жрицы', "Priestess's Diary"); }
        try { Object.defineProperty(it, 'description', { value: desc, writable: true, configurable: true, enumerable: true }); } catch (e) { it.description = desc; }
        it.iconIndex = ICON; it.itypeId = 2; it.consumable = false; it.occasion = 2; it.scope = 0; it.price = 0;
        it.meta = it.meta || {};
        it._npDiary = true;
    };
    $.item = function() { return (typeof $dataItems !== 'undefined' && $dataItems) ? $dataItems[ITEM_ID] : null; };
    $.isDiary = function(item) { return !!item && item === $.item() && DataManager.isItem(item); };
    $.give = function() {
        if (typeof $gameParty === 'undefined' || !$gameParty || gs(S.GALLERY)) return false;
        var it = $.item(); if (!it) return false;
        if ($gameParty.numItems(it) > 0) return false;
        $gameParty.gainItem(it, 1);
        return true;
    };

    var _isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        var ok = _isDatabaseLoaded.apply(this, arguments);
        if (ok) $.setupItem();
        return ok;
    };
    var _setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        _setupNewGame.apply(this, arguments);
        $.setupItem(); $.data(); $.give(); $.check(true);
    };
    var _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _extract.apply(this, arguments);
        try { $.setupItem(); $.give(); var f = $.check(true); $._pendingToast = f; } catch (e) { console.warn('NP_PriestessDiary', e); }
    };

    // проверка на карте
    var _Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Map_start.apply(this, arguments);
        try {
            $.give();
            var f = $.check(true);
            if ($._pendingToast && $._pendingToast.length) f = $._pendingToast.concat(f);
            $._pendingToast = null;
            $.toast(f);
        } catch (e) { console.warn('NP_PriestessDiary', e); }
        this._npDiaryTick = 0;
    };
    var _Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Map_update.apply(this, arguments);
        if (++this._npDiaryTick >= 60) { this._npDiaryTick = 0; try { $.check(false); } catch (e) {} }
    };

    // ---- инвентарь ----
    var _Item_isEnabled = Window_ItemList.prototype.isEnabled;
    Window_ItemList.prototype.isEnabled = function(item) {
        if ($.isDiary(item) && !(SceneManager._scene instanceof Scene_Battle) && !(SceneManager._scene instanceof Scene_Shop)) return true;
        return _Item_isEnabled.apply(this, arguments);
    };
    var _Scene_Item_onItemOk = Scene_Item.prototype.onItemOk;
    Scene_Item.prototype.onItemOk = function() {
        if ($.isDiary(this.item())) {
            $gameParty.setLastItem(this.item());
            if (!$.canRead()) { SoundManager.playBuzzer(); this._itemWindow.activate(); $.showRefusal(this); return; }
            SoundManager.playOk();
            this._itemWindow.activate();
            SceneManager.push(Scene_NpDiary);
            return;
        }
        _Scene_Item_onItemOk.apply(this, arguments);
    };
    // счётчик новых записей рядом с названием
    var _drawItemNumber = Window_ItemList.prototype.drawItemNumber;
    Window_ItemList.prototype.drawItemNumber = function(item, x, y, width) {
        if ($.isDiary(item)) {
            var n = $.newCount();
            if (n > 0) { this.changeTextColor(this.textColor(27)); this.drawText(NP_L('новое: ', "new: ") + n, x, y, width, 'right'); this.resetTextColor(); }
            return;
        }
        _drawItemNumber.apply(this, arguments);
    };

    // ---- читать может только жрица (ведущая отряда) ----
    $.canRead = function() {
        if (gs(S.GALLERY)) return true; // режим галереи — без ограничений
        var l = (typeof $gameParty !== 'undefined' && $gameParty) ? $gameParty.leader() : null;
        return !!l && l.actorId() === 2;
    };
    $.refusalText = function() {
        var ru = ['Нет… Рыться в её личных записях — подло.\nЭтот дневник может читать только сама жрица.',
                  'Чужой дневник? Ну уж нет, я не настолько низко пал.\nПусть его читает та, кто его пишет.',
                  'Это её личные мысли. Подглядывать — подлость.\nОткрыть дневник может только жрица.'];
        var en = ["No... Digging through her private notes would be low.\nOnly the priestess herself may read this diary.",
                  "Someone else's diary? No way, I haven't sunk that low.\nLet the one who writes it read it.",
                  "These are her private thoughts. Peeking would be vile.\nOnly the priestess can open this diary."];
        var i = Math.floor(Math.random() * ru.length);
        var hint = NP_L('(Дневник можно прочесть, когда жрица гуляет по городу одна)', '(The diary can be read while the priestess walks the town alone)');
        var a = (typeof $gameActors !== 'undefined' && $gameActors) ? $gameActors.actor(1) : null;
        return { name: a ? a.name() : '', text: (NP_L(ru[i], en[i])), hint: hint };
    };
    function Window_NpDiaryRefusal() { this.initialize.apply(this, arguments); }
    Window_NpDiaryRefusal.prototype = Object.create(Window_Base.prototype);
    Window_NpDiaryRefusal.prototype.constructor = Window_NpDiaryRefusal;
    Window_NpDiaryRefusal.prototype.initialize = function(info) {
        var w = Math.min(Graphics.boxWidth - 40, 760), h = this.fittingHeight(5);
        Window_Base.prototype.initialize.call(this, (Graphics.boxWidth - w) / 2, (Graphics.boxHeight - h) / 2, w, h);
        this._wait = 10;
        var y = 0;
        if (info.name) { this.changeTextColor(this.systemColor()); this.drawText(info.name, 0, y, this.contents.width); this.resetTextColor(); y += this.lineHeight(); }
        this.drawTextEx(info.text, 0, y); y += this.lineHeight() * 2.5;
        this.changeTextColor(this.textColor(8)); this.contents.fontSize = 20;
        this.drawText(info.hint, 0, y, this.contents.width); this.resetFontSettings();
    };
    Window_NpDiaryRefusal.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (this._wait > 0) { this._wait--; return; }
        if (Input.isTriggered('ok') || Input.isTriggered('cancel') || TouchInput.isTriggered() || TouchInput.isCancelled()) this._closeMe();
    };
    Window_NpDiaryRefusal.prototype._closeMe = function() {
        var sc = this._scene; if (this.parent) this.parent.removeChild(this);
        if (sc) { sc._npRefusal = null; if (sc._itemWindow) sc._itemWindow.activate(); }
    };
    $.Window_Refusal = Window_NpDiaryRefusal;
    $.showRefusal = function(scene) {
        if (!scene || scene._npRefusal) return;
        var w = new Window_NpDiaryRefusal($.refusalText()); w._scene = scene;
        scene._npRefusal = w; if (scene._itemWindow) scene._itemWindow.deactivate();
        scene.addChild(w);
    };
    $.open = function() {
        if (!$.canRead()) {
            if (SceneManager._scene instanceof Scene_Item) { $.showRefusal(SceneManager._scene); return; }
            var t = $.refusalText();
            if ($gameMessage && !$gameMessage.isBusy()) { if ($gameMessage.setSpeakerName) $gameMessage.setSpeakerName(t.name); $gameMessage.add(t.text); $gameMessage.add('\\C[8]' + t.hint); }
            return;
        }
        $.check(false); SceneManager.push(Scene_NpDiary);
    };

    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.apply(this, arguments);
        if (String(command).toLowerCase() !== 'npdiary') return;
        var sub = String(args[0] || '').toLowerCase();
        if (sub === 'open') $.open();
        else if (sub === 'give') $.give();
        else if (sub === 'check') $.check(false);
    };

    // =====================================================================
    // Блок жрицы: отрисовка в любом окне
    // =====================================================================
    function bar(win, x, y, w, h, rate, c1, c2, marker) {
        var b = win.contents;
        b.fillRect(x, y, w, h, 'rgba(0,0,0,0.55)');
        b.fillRect(x + 1, y + 1, w - 2, h - 2, 'rgba(40,20,30,0.9)');
        var fw = Math.floor((w - 2) * clamp(rate, 0, 1));
        if (fw > 0) b.gradientFillRect(x + 1, y + 1, fw, h - 2, c1, c2);
        b.fillRect(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,0.18)');
        if (marker !== undefined && marker > 0 && marker < 1) {
            var mx = x + 1 + Math.floor((w - 2) * marker);
            b.fillRect(mx - 1, y - 3, 3, h + 6, 'rgba(255,240,200,0.95)');
        }
    }
    function segBar(win, x, y, w, h, level, maxLevel, sub, c1, c2) {
        var gap = 4, sw = (w - gap * (maxLevel - 1)) / maxLevel;
        for (var i = 0; i < maxLevel; i++) {
            var r = i < level ? 1 : (i === level ? sub : 0);
            bar(win, Math.round(x + i * (sw + gap)), y, Math.round(sw), h, r, c1, c2);
        }
    }
    function wrapLines(bmp, text, width) {
        var out = [];
        String(text).split('\n').forEach(function(par) {
            var words = par.split(' '), line = '';
            words.forEach(function(wd) {
                var t = line ? line + ' ' + wd : wd;
                if (line && bmp.measureTextWidth(t) > width) { out.push(line); line = wd; }
                else line = t;
            });
            out.push(line);
        });
        return out;
    }
    $.wrapLines = wrapLines;

    // Рисует блок; возвращает высоту. opts.compact — меньше отступов.
    $.drawStatusPanel = function(win, x, y, w, opts) {
        opts = opts || {};
        var b = win.contents, lh = opts.rowH || 40, y0 = y;
        var labelW = Math.min(250, Math.floor(w * 0.32)), valW = 170;
        var bx = x + labelW, bw = w - labelW - valW - 12;
        var st = $.stage(), met = $.yarizoMet();
        var fs = b.fontSize;

        // заголовок
        b.fontSize = 26;
        win.changeTextColor(win.systemColor());
        win.drawText(NP_L('Состояние жрицы', "Priestess's Condition"), x, y, w - 200);
        win.changeTextColor(win.textColor(st >= 2 ? 27 : (st === 1 ? 6 : 24)));
        win.drawText($.stageName(), x, y, w, 'right');
        y += lh + 2;
        b.fontSize = 22;

        function row(label, rate, value, c1, c2, marker, dim) {
            win.changeTextColor(dim ? win.textColor(8) : win.normalColor());
            win.drawText(label, x, y, labelW - 8);
            if (rate !== null) bar(win, bx, y + Math.floor(lh / 2) - 8, bw, 16, rate, c1, c2, marker);
            win.changeTextColor(dim ? win.textColor(8) : win.normalColor());
            win.drawText(value, bx + bw + 12, y, valW, 'right');
            y += lh;
        }
        var lust = clamp(gv(V.LUST), 0, 200), th = $.lustThreshold();
        row(NP_L('Похоть', "Lust"), lust / 200, lust + ' / 200', '#c0306a', '#ff7fb0', th / 200);
        var love = clamp(gv(V.LOVE), 0, 200);
        row(NP_L('Любовь к ', "Love for ") + fmt('\\N[1]'), love / 200, love + ' / 200', '#2f6fc0', '#8fd0ff');

        if (met) {
            var lvl = $.bondLevel(), lim = LVL_LIMITS[lvl] || 999, ero = clamp(gv(V.EROSION), 0, 999);
            var sub = lvl >= 5 ? 1 : clamp(ero / lim, 0, 1);
            var gone = $.yarizoGone();
            win.changeTextColor(gone ? win.textColor(8) : win.normalColor());
            win.drawText(NP_L('Связь с ', "Bond with ") + (actorName(YARIZO) || NP_L('Яризо', "Yarizo")), x, y, labelW - 8);
            segBar(win, bx, y + Math.floor(lh / 2) - 8, bw, 16, lvl, 5, sub, '#7a2a8a', '#d87adf');
            win.changeTextColor(gone ? win.textColor(8) : win.normalColor());
            win.drawText(gone ? (NP_L('Ур. ', "Lv. ") + lvl + NP_L(' · нет рядом', " · not around")) : (NP_L('Ур. ', "Lv. ") + lvl + ' · ' + Math.min(ero, lim) + '/' + lim), bx + bw + 12 - 40, y, valW + 40, 'right');
            y += lh;
            row(NP_L('Развращённость', "Corruption"), ero / 999, ero + ' / 999', '#6a1a2a', '#e0405a');
        } else {
            row(NP_L('Связь', "Bond"), null, '', null, null, undefined, true);
            win.changeTextColor(win.textColor(8));
            win.drawText(NP_L('Ни с кем, кроме ', "No one but ") + fmt('\\N[1]'), bx, y - lh, bw + valW + 12);
            row(NP_L('Развращённость', "Corruption"), 0, '0 / 999', '#6a1a2a', '#e0405a', undefined, true);
        }
        var nc = Math.max(0, gv(V.NIGHT_CNT));
        win.changeTextColor(nc ? win.normalColor() : win.textColor(8));
        win.drawText(NP_L('Ночные отлучки', "Nights away"), x, y, labelW - 8);
        win.drawText(nc ? ('☾ × ' + nc) : NP_L('ни одной', "none"), bx, y, bw);
        y += lh + 4;

        // мысль
        b.fillRect(x, y, w, 2, 'rgba(255,255,255,0.25)');
        y += 8;
        var thought = opts.thought || $.thought();
        b.fontSize = 22;
        b.fontItalic = true;
        win.changeTextColor(win.textColor(st >= 2 ? 27 : 0));
        var lines = wrapLines(b, '«' + fmt(thought) + '»', w - 20);
        lines.forEach(function(l) { win.drawText(l, x + 10, y, w - 20); y += 32; });
        b.fontItalic = false;
        b.fontSize = fs;
        win.resetTextColor();
        return y - y0;
    };

    // ---- 1) «Список персонажей» (KNS_PersonalStatus): страница «♥» у жрицы ----
    var MARK = '__npPriestessStatus';
    $.injectPersonalStatus = function() {
        if (typeof KNS_PersonalStatus === 'undefined' || !KNS_PersonalStatus.param || !KNS_PersonalStatus.param.CharaList) return false;
        var list = KNS_PersonalStatus.param.CharaList, chara = null;
        for (var i = 0; i < list.length; i++) if (list[i] && list[i].CharaIconImage === 'chara2') chara = list[i];
        if (!chara && list[1]) chara = list[1];
        if (!chara || !chara.ProfileBlocks) return false;
        for (var j = 0; j < chara.ProfileBlocks.length; j++) if (chara.ProfileBlocks[j] && chara.ProfileBlocks[j][MARK]) return true;
        var page = [{ Image: { VarId: 0, Images: [] }, ProfileBlockItems: [] }];
        page[MARK] = true;
        chara.ProfileBlocks.unshift(page); // первой страницей
        return true;
    };
    var psOk = false;
    try { psOk = $.injectPersonalStatus(); } catch (e) { console.warn('NP_PriestessDiary: PersonalStatus', e); }
    if (psOk && typeof Window_KnsPersonalStatusDetail !== 'undefined') {
        var _detRefresh = Window_KnsPersonalStatusDetail.prototype.refresh;
        Window_KnsPersonalStatusDetail.prototype.refresh = function() {
            var d = this._knsData, chara = d && d[0], idx = d && d[1];
            var page = chara && idx >= 0 && chara.ProfileBlocks ? chara.ProfileBlocks[idx] : null;
            if (chara && !chara.ProfileBlocks) { this.contents.clear(); this._knsCharacterSprite.bitmap = null; return; } // защита: пустой/недоступный персонаж
            if (!page || !page[MARK]) return _detRefresh.apply(this, arguments);
            this.contents.clear();
            this.downArrowVisible = false; this.upArrowVisible = false;
            var bmp = KNS_PersonalStatus.getVariableImage(chara.CharaImage);
            this._knsCharacterSprite.bitmap = bmp || null;
            this.contents = new Bitmap(this.width - KNS_PersonalStatus.characterWidth, this.height - this.standardPadding() * 2);
            this.resetFontSettings();
            var hh = $.drawStatusPanel(this, 0, 0, this.contents.width - 8, { rowH: 46 });
            if ($gameParty && $.item() && $gameParty.numItems($.item()) > 0) {
                var n = $.unlocked().length, nn = $.newCount();
                this.contents.fontSize = 22;
                this.changeTextColor(this.textColor(8));
                this.drawText(NP_L('Дневник жрицы: записей ', "Priestess's Diary: entries ") + n + NP_L(' из ', " of ") + $.total() + (nn ? NP_L(' · новых: ', " · new: ") + nn : ''), 0, hh + 12, this.contents.width - 8);
                this.resetFontSettings();
            }
            this.origin.y = 0;
        };
        var _pageDraw = Window_KnsPersonalStatusPage.prototype.drawItem;
        Window_KnsPersonalStatusPage.prototype.drawItem = function(index) {
            var page = this._knsData && this._knsData.ProfileBlocks ? this._knsData.ProfileBlocks[index] : null;
            if (page && page[MARK]) {
                var rect = this.itemRectForText(index);
                this.changeTextColor(this.textColor(27));
                this.drawText('♥', rect.x, rect.y, rect.width, 'center');
                this.resetTextColor();
                return;
            }
            // остальные страницы сохраняют прежнюю нумерацию 1,2,…
            var shift = (this._knsData.ProfileBlocks[0] && this._knsData.ProfileBlocks[0][MARK]) ? 1 : 0;
            var rect2 = this.itemRectForText(index);
            this.drawText(index + 1 - shift, rect2.x, rect2.y, rect2.width, this.itemTextAlign());
        };
    }

    // ---- 2) стандартное окно «Статус»: блок внизу для актёра 2 ----
    var _Status_refresh = Window_Status.prototype.refresh;
    Window_Status.prototype.refresh = function() {
        _Status_refresh.apply(this, arguments);
        try {
            if (this._actor && this._actor.actorId() === 2) {
                var y = this.lineHeight() * 16;
                var avail = this.contentsHeight() - y;
                if (avail >= 280) {
                    this.contents.fillRect(0, y - 6, this.contentsWidth(), 2, 'rgba(255,255,255,0.3)');
                    $.drawStatusPanel(this, 6, y + 2, Math.min(this.contentsWidth() - 12, 900), { rowH: 36 });
                }
            }
        } catch (e) { console.warn('NP_PriestessDiary: status', e); }
    };

    // =====================================================================
    // Сцена «Дневник жрицы»
    // =====================================================================
    var BOOK = { x: 70, y: 96, w: 1140, h: 760, pageW: 540, pageH: 712, pad: 54 };

    function drawCover(bmp) {
        var ctx = bmp._context, x = BOOK.x, y = BOOK.y, w = BOOK.w, h = BOOK.h;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
        roundRect(ctx, x, y, w, h, 22); ctx.fillStyle = '#3b1f14'; ctx.fill();
        ctx.restore();
        ctx.save();
        var g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, '#5a301f'); g.addColorStop(0.5, '#47251a'); g.addColorStop(1, '#341a11');
        roundRect(ctx, x, y, w, h, 22); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#c9a25a'; ctx.lineWidth = 3;
        roundRect(ctx, x + 10, y + 10, w - 20, h - 20, 16); ctx.stroke();
        // уголки
        ctx.fillStyle = '#c9a25a';
        [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 10], [x + w - 10, y + h - 10]].forEach(function(p) {
            ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, Math.PI * 2); ctx.fill();
        });
        // стопка страниц под листами
        ctx.fillStyle = '#d9c393';
        ctx.fillRect(x + 22, y + 30, w - 44, h - 50);
        ctx.fillStyle = 'rgba(120,90,50,0.35)';
        for (var i = 0; i < 4; i++) ctx.fillRect(x + 22, y + h - 24 - i * 3, w - 44, 1);
        ctx.restore();
        bmp._setDirty();
    }
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    function drawParchment(bmp, left) {
        var ctx = bmp._context, w = bmp.width, h = bmp.height;
        ctx.save();
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#f6e8c6'); g.addColorStop(1, '#ead5a6');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // пятна
        var seed = left ? 7 : 13;
        for (var i = 0; i < 18; i++) {
            seed = (seed * 9301 + 49297) % 233280;
            var px = (seed / 233280) * w; seed = (seed * 9301 + 49297) % 233280;
            var py = (seed / 233280) * h; seed = (seed * 9301 + 49297) % 233280;
            var pr = 20 + (seed / 233280) * 70;
            var rg = ctx.createRadialGradient(px, py, 0, px, py, pr);
            rg.addColorStop(0, 'rgba(170,130,70,0.10)'); rg.addColorStop(1, 'rgba(170,130,70,0)');
            ctx.fillStyle = rg; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        }
        // тень у корешка
        var sg = left ? ctx.createLinearGradient(w, 0, w - 70, 0) : ctx.createLinearGradient(0, 0, 70, 0);
        sg.addColorStop(0, 'rgba(90,55,20,0.45)'); sg.addColorStop(1, 'rgba(90,55,20,0)');
        ctx.fillStyle = sg; left ? ctx.fillRect(w - 70, 0, 70, h) : ctx.fillRect(0, 0, 70, h);
        // край страницы
        var eg = left ? ctx.createLinearGradient(0, 0, 18, 0) : ctx.createLinearGradient(w, 0, w - 18, 0);
        eg.addColorStop(0, 'rgba(120,85,40,0.30)'); eg.addColorStop(1, 'rgba(120,85,40,0)');
        ctx.fillStyle = eg; left ? ctx.fillRect(0, 0, 18, h) : ctx.fillRect(w - 18, 0, 18, h);
        ctx.restore();
        bmp._setDirty();
    }
    function ornament(bmp, cx, y, w) {
        var ctx = bmp._context;
        ctx.save(); ctx.strokeStyle = 'rgba(110,60,30,0.7)'; ctx.fillStyle = 'rgba(110,60,30,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx - 10, y); ctx.moveTo(cx + 10, y); ctx.lineTo(cx + w / 2, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, y - 6); ctx.lineTo(cx + 6, y); ctx.lineTo(cx, y + 6); ctx.lineTo(cx - 6, y); ctx.closePath(); ctx.fill();
        ctx.restore(); bmp._setDirty();
    }
    var INK = '#3a2412', INK2 = '#7a3b2a', FONT = function() {
        try { return $gameSystem && $gameSystem.mainFontFace ? $gameSystem.mainFontFace() : 'GameFont'; } catch (e) { return 'GameFont'; }
    };
    function txt(bmp, s, x, y, w, h, align, size, color, italic) {
        bmp.fontFace = FONT(); bmp.fontSize = size; bmp.textColor = color; bmp.fontItalic = !!italic;
        bmp.outlineWidth = 0; bmp.outlineColor = 'rgba(0,0,0,0)';
        bmp.drawText(s, x, y, w, h, align);
        bmp.fontItalic = false;
    }

    $.buildPage = function(index, entries) {
        var bmp = new Bitmap(BOOK.pageW, BOOK.pageH), left = index % 2 === 0, P = BOOK.pad, W = BOOK.pageW - P * 2;
        drawParchment(bmp, left);
        var d = $.data() || { seen: {} };
        if (index === 0) {
            txt(bmp, NP_L('Дневник', "Diary"), P, 150, W, 60, 'center', 54, INK, true);
            txt(bmp, NP_L('жрицы', "of the Priestess"), P, 210, W, 50, 'center', 40, INK2, true);
            ornament(bmp, BOOK.pageW / 2, 290, 260);
            txt(bmp, NP_L('Записей: ', "Entries: ") + entries.length + NP_L(' из ', " of ") + $.total(), P, 330, W, 36, 'center', 24, INK);
            var nn = entries.filter(function(e) { return !d.seen[e.id]; }).length;
            if (nn) txt(bmp, NP_L('новых: ', "new: ") + nn, P, 366, W, 32, 'center', 22, '#a0302a', true);
            var tl = wrapLinesB(bmp, NP_L('Если ты читаешь это, а ты не я — закрой немедленно. Особенно ты, ', "If you're reading this and you're not me, close it right now. Especially you, ") + fmt('\\N[1]') + '.', W - 40, 22, true);
            var ty = 560;
            tl.forEach(function(l) { txt(bmp, l, P + 20, ty, W - 40, 30, 'center', 22, 'rgba(58,36,18,0.75)', true); ty += 30; });
            return bmp;
        }
        var e = entries[index - 1];
        if (!e) {
            ornament(bmp, BOOK.pageW / 2, BOOK.pageH / 2 - 20, 200);
            var left2 = $.total() - entries.length;
            txt(bmp, left2 > 0 ? NP_L('Дальше — пустые страницы...', "Only blank pages from here...") : NP_L('Конец тетради.', "End of the notebook."), P, BOOK.pageH / 2, W, 34, 'center', 24, 'rgba(58,36,18,0.6)', true);
            return bmp;
        }
        var y = P + 6;
        txt(bmp, NP_L('Запись ', "Entry ") + index, P, y, W, 28, 'left', 20, INK2, true);
        if (!d.seen[e.id]) txt(bmp, NP_L('✦ новое', "✦ new"), P, y, W, 28, 'right', 20, '#a0302a', true);
        y += 34;
        txt(bmp, fmt(e.t), P, y, W, 44, 'left', 34, INK);
        y += 52;
        ornament(bmp, P + W / 2, y, W);
        y += 26;
        var lines = wrapLinesB(bmp, fmt(e.b), W, 26, false);
        lines.forEach(function(l) { txt(bmp, l, P, y, W, 36, 'left', 26, INK); y += 38; });
        txt(bmp, '— ' + (index + 1), P, BOOK.pageH - P, W, 28, left ? 'left' : 'right', 20, 'rgba(58,36,18,0.6)', true);
        return bmp;
    };
    function wrapLinesB(bmp, s, w, size, italic) {
        bmp.fontFace = FONT(); bmp.fontSize = size; bmp.fontItalic = !!italic;
        var l = wrapLines(bmp, s, w); bmp.fontItalic = false; return l;
    }

    function Scene_NpDiary() { this.initialize.apply(this, arguments); }
    Scene_NpDiary.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_NpDiary.prototype.constructor = Scene_NpDiary;
    window.Scene_NpDiary = Scene_NpDiary;

    Scene_NpDiary.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        $.check(true);
        this._entries = $.unlocked();
        this._pages = 1 + this._entries.length;
        if (this._pages % 2) this._pages++;
        this._spread = 0;
        this._cache = {};
        this._anim = null;
        this._dim = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._dim.bitmap.fillAll('rgba(10,4,8,0.55)');
        this.addChild(this._dim);
        this._cover = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        drawCover(this._cover.bitmap);
        this.addChild(this._cover);
        var cx = BOOK.x + BOOK.w / 2, py = BOOK.y + (BOOK.h - BOOK.pageH) / 2;
        this._spine = cx; this._py = py;
        this._left = new Sprite(); this._left.x = cx - BOOK.pageW; this._left.y = py;
        this._right = new Sprite(); this._right.x = cx; this._right.y = py;
        this._flip = new Sprite(); this._flip.y = py; this._flip.x = cx; this._flip.visible = false;
        this.addChild(this._left); this.addChild(this._right); this.addChild(this._flip);
        this._spineSpr = new Sprite(new Bitmap(16, BOOK.pageH + 8));
        this._spineSpr.bitmap.gradientFillRect(0, 0, 8, BOOK.pageH + 8, 'rgba(60,30,10,0)', 'rgba(60,30,10,0.55)');
        this._spineSpr.bitmap.gradientFillRect(8, 0, 8, BOOK.pageH + 8, 'rgba(60,30,10,0.55)', 'rgba(60,30,10,0)');
        this._spineSpr.x = cx - 8; this._spineSpr.y = py - 4;
        this.addChild(this._spineSpr);
        this._hud = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this.addChild(this._hud);
        this.showSpread(0);
    };
    Scene_NpDiary.prototype.page = function(i) {
        if (!this._cache[i]) this._cache[i] = $.buildPage(i, this._entries);
        return this._cache[i];
    };
    Scene_NpDiary.prototype.maxSpread = function() { return Math.max(0, this._pages / 2 - 1); };
    Scene_NpDiary.prototype.markSeen = function(s) {
        var d = $.data(); if (!d) return;
        [s * 2, s * 2 + 1].forEach(function(i) { var e = this._entries[i - 1]; if (e) d.seen[e.id] = true; }, this);
    };
    Scene_NpDiary.prototype.showSpread = function(s) {
        this._spread = s;
        this._left.bitmap = this.page(s * 2);
        this._right.bitmap = this.page(s * 2 + 1);
        this._flip.visible = false;
        this.markSeen(s);
        this.drawHud();
    };
    Scene_NpDiary.prototype.drawHud = function() {
        var b = this._hud.bitmap; b.clear();
        b.fontFace = FONT(); b.fontSize = 22; b.textColor = '#ffffff'; b.outlineColor = 'rgba(0,0,0,0.8)'; b.outlineWidth = 4;
        b.drawText(NP_L('←/→ — листать   ·   клик по странице   ·   Esc — закрыть', "←/→ — turn pages   ·   click a page   ·   Esc — close"), 0, BOOK.y + BOOK.h + 24, Graphics.width, 30, 'center');
        b.fontSize = 44;
        if (this._spread > 0) b.drawText('◀', BOOK.x - 60, BOOK.y + BOOK.h / 2 - 24, 50, 48, 'center');
        if (this._spread < this.maxSpread()) b.drawText('▶', BOOK.x + BOOK.w + 10, BOOK.y + BOOK.h / 2 - 24, 50, 48, 'center');
        b.fontSize = 22;
        b.drawText((this._spread + 1) + ' / ' + (this.maxSpread() + 1), 0, BOOK.y - 44, Graphics.width, 30, 'center');
    };
    Scene_NpDiary.prototype.turn = function(dir) {
        if (this._anim) return;
        var to = this._spread + dir;
        if (to < 0 || to > this.maxSpread()) { SoundManager.playBuzzer(); return; }
        try { AudioManager.playSe({ name: 'Book1', volume: 80, pitch: 100 + Math.floor(Math.random() * 20), pan: 0 }); } catch (e) {}
        var oL = this.page(this._spread * 2), oR = this.page(this._spread * 2 + 1);
        var nL = this.page(to * 2), nR = this.page(to * 2 + 1);
        if (dir > 0) {
            this._left.bitmap = oL; this._right.bitmap = nR;
            this._anim = { t: 0, n: 9, a: oR, ax: 0, b: nL, bx: 1, to: to };
        } else {
            this._left.bitmap = nL; this._right.bitmap = oR;
            this._anim = { t: 0, n: 9, a: oL, ax: 1, b: nR, bx: 0, to: to };
        }
        this._flip.visible = true;
        this.updateAnim();
    };
    Scene_NpDiary.prototype.updateAnim = function() {
        var A = this._anim; if (!A) return;
        var f = this._flip, n = A.n;
        if (A.t < n) {
            f.bitmap = A.a; f.anchor.x = A.ax; f.scale.x = 1 - (A.t + 1) / n;
        } else if (A.t < n * 2) {
            f.bitmap = A.b; f.anchor.x = A.bx; f.scale.x = (A.t - n + 1) / n;
        }
        // лёгкое затемнение листа на сгибе
        f.setColorTone([-(1 - f.scale.x) * 60, -(1 - f.scale.x) * 60, -(1 - f.scale.x) * 60, 0]);
        A.t++;
        if (A.t > n * 2) { this._anim = null; f.scale.x = 1; this.showSpread(A.to); }
    };
    Scene_NpDiary.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._anim) { this.updateAnim(); return; }
        if (Input.isRepeated('right') || Input.isTriggered('pagedown')) this.turn(1);
        else if (Input.isRepeated('left') || Input.isTriggered('pageup')) this.turn(-1);
        else if (Input.isTriggered('cancel') || TouchInput.isCancelled()) { SoundManager.playCancel(); this.popScene(); }
        else if (TouchInput.isTriggered()) {
            var x = TouchInput.x;
            if (x < this._spine) this.turn(-1); else this.turn(1);
        } else if (TouchInput.wheelY >= 20) this.turn(1);
        else if (TouchInput.wheelY <= -20) this.turn(-1);
    };
    $.Scene = Scene_NpDiary;
})(NP_PriestessDiary);
