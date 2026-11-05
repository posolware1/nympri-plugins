var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_Campfire.js  (RU-mod)
//=============================================================================
/*:
 * @plugindesc [RU] Разговоры на привале: короткие диалоги героя, жрицы и Яризо при отдыхе (лагерь/гостиница).
 * @author RU-mod
 *
 * @param Enabled
 * @text Включено по умолчанию
 * @type boolean
 * @default true
 *
 * @param Chance
 * @text Шанс разговора (%)
 * @type number
 * @min 0
 * @max 100
 * @default 40
 *
 * @param Cooldown
 * @text Пауза (ночёвок без разговора)
 * @type number
 * @min 0
 * @default 2
 *
 * @param OptionLabel
 * @text Название в настройках
 * @default Разговоры на привале
 *
 * @help
 * Встраивается в память (CommonEvents.json не меняется):
 *   CE474 «キャンプ-寝る» — перед выбором часового (после отмены);
 *   CE325 «睡眠処理» — перед console.log("睡眠本処理開始") (гостиницы, кровати).
 * В лагере CE325 вызывается повторно, но там вставка обходится (переход
 * к «睡眠開始» по заметке карты «キャンプ»), так что разговор один.
 *
 * Шанс Chance% за ночёвку, не чаще чем через Cooldown ночёвок, один и тот
 * же разговор два раза подряд не играет (и избегаются 4 последних).
 * Рост связи с Яризо (V204) с прошлой ночёвки поднимает шанс до 85%.
 *
 * Разговоры с Яризо — только если он реально в отряде: S643, не S503/S2040,
 * третий член отряда (то, что CE474 пишет в V8) = актёр 21, жив.
 * Иначе — разговоры героя и жрицы (тон — NP_PriestessDiary.stage()).
 * Тон разговоров с Яризо: без S32 — 0; с S32 — по V204 (2→1, 3→2, 4+→3),
 * без «+1 за договор», т.к. договор S643 есть всегда, пока он в отряде.
 * Не играет: галерея (S5), бой, S56/S192, спецсобытие гостиницы
 * ($inn_event==1), соло, жрица в плену (V264>0), без S222.
 *
 * Скрипт: NP_Campfire.maybe(this, 'camp'|'inn')  (вставляется сам)
 *         NP_Campfire.force('y2_neck')            (отладка, из консоли — вернёт список команд)
 */
var NP_Campfire = NP_Campfire || {};
(function($) {
    'use strict';
    var params = (typeof PluginManager !== 'undefined') ? PluginManager.parameters('NP_Campfire') : {};
    var P = {
        enabled: String(params['Enabled'] || 'true') === 'true',
        chance: Number(params['Chance'] !== undefined && params['Chance'] !== '' ? params['Chance'] : 40),
        cooldown: Number(params['Cooldown'] !== undefined && params['Cooldown'] !== '' ? params['Cooldown'] : 2),
        optionLabel: String(params['OptionLabel'] || NP_L('Разговоры на привале', "Campfire talks"))
    };
    $.P = P;

    var S = { GALLERY: 5, EMERG: 56, LOCK: 192, BATTLE: 14, FREE: 222, CONTRACT: 643, YDEAD: 503, YGONE: 2040,
              NTR: 32, BEACH: 722 };
    var V = { BOND: 204, ABSENT: 4292, BEACHPICK: 821, CONFINED: 264, LUST: 82 };
    var YARIZO = 21;

    function gs(id) { return !!($gameSwitches && $gameSwitches.value(id)); }
    function gv(id) { return Number(($gameVariables && $gameVariables.value(id)) || 0); }
    function actorOk(id) {
        if (!$gameParty || !$gameActors) return false;
        var a = $gameActors.actor(id);
        if (!a || a.isDead && a.isDead()) return false;
        return $gameParty.members().some(function(m) { return m && m.actorId() === id; });
    }
    function thirdId() {
        var m = $gameParty.members()[2];
        return m ? m.actorId() : 0;
    }

    // ---- state -------------------------------------------------------------
    function st() {
        var s = $gameSystem._npCampfire;
        if (!s) s = $gameSystem._npCampfire = { rests: 0, lastRest: -99, last: '', recent: [], seen: {}, lastBond: -1 };
        return s;
    }
    $.state = st;

    // ---- stage / presence ------------------------------------------------------
    $.yarizoMet = function() {
        if (typeof NP_PriestessDiary !== 'undefined' && NP_PriestessDiary.yarizoMet) return !!NP_PriestessDiary.yarizoMet();
        return gs(S.CONTRACT) || gv(V.BOND) >= 1;
    };
    $.yarizoGone = function() { return gs(S.YDEAD) || gs(S.YGONE); };
    $.stage = function() {
        if (typeof NP_PriestessDiary !== 'undefined' && NP_PriestessDiary.stage) {
            var r = Number(NP_PriestessDiary.stage()) || 0;
            return Math.max(0, Math.min(3, r));
        }
        if (!$.yarizoMet()) return 0;
        var lvl = gv(V.BOND), s;
        if (typeof NP_TitleProgress !== 'undefined' && NP_TitleProgress.computeStage)
            s = NP_TitleProgress.computeStage(lvl, gs(S.CONTRACT));
        else s = lvl >= 4 ? 3 : lvl >= 3 ? 2 : (lvl >= 2 || gs(S.CONTRACT)) ? 1 : 0;
        if (!gs(S.NTR)) s = Math.min(s, 1);
        return s;
    };
    // Тон разговоров с Яризо: если он в отряде, договор (S643) есть всегда, поэтому
    // +1 за договор не считаем; без S32 (нетораре) — всегда чистый тон 0.
    $.yTone = function() {
        if (!gs(S.NTR)) return 0;
        var lvl = gv(V.BOND);
        if (typeof NP_TitleProgress !== 'undefined' && NP_TitleProgress.computeStage)
            return NP_TitleProgress.computeStage(lvl, false);
        return lvl >= 4 ? 3 : lvl >= 3 ? 2 : lvl >= 2 ? 1 : 0;
    };
    // Яризо реально рядом (как в CE474: V8 = третий член отряда)
    $.yarizoHere = function() {
        if (!gs(S.CONTRACT) || $.yarizoGone()) return false;
        if (!actorOk(YARIZO)) return false;
        return gv(8) === YARIZO || thirdId() === YARIZO;
    };
    $.isEnabled = function() { return ConfigManager.npCampTalk !== false; };

    $.canTalk = function(interp, where) {
        if (!$.isEnabled()) return 'off';
        if (gs(S.GALLERY)) return 'gallery';
        if (gs(S.EMERG) || gs(S.LOCK) || gs(S.BATTLE)) return 'locked';
        if ($gameParty.inBattle && $gameParty.inBattle()) return 'battle';
        if (!gs(S.FREE)) return 'story';
        if (where === 'inn' && typeof $inn_event !== 'undefined' && $inn_event == 1) return 'inn_event';
        if ($gameParty.size() < 2) return 'solo';
        if (!actorOk(1) || !actorOk(2)) return 'party';
        if (gv(V.CONFINED) > 0) return 'confined';
        if ($gameMap && $gameMap.mapId && $gameMap.mapId() === 3) return 'worldmap';
        return '';
    };

    // ---- talks ----------------------------------------------------------------
    // строка: [кто, лицо, текст, вздох]  кто: p-жрица, y-Яризо, h-герой, n-рассказ
    // {H} герой  {P} жрица  {Y} Яризо  {V} как жрица зовёт героя;  | = перенос строки
    // y:true — нужен Яризо рядом; st — стадии; at — 'camp'|'inn'|undefined; c — доп. условие; w — вес
    function absent() { return gv(V.ABSENT) >= 1; }
    function beach() { return gs(S.BEACH) || gv(V.BEACHPICK) > 0; }
    var TALKS = [
        // ===== Яризо, стадия 0 =====
        { id: 'y0_fire', y: true, st: [0], at: 'camp', l: [
            ['y', 0, NP_L('Хе-хе, хозяюшка, а костёр у тебя горит ровнее,|чем у иного вояки.', "Heh heh, Miss, your fire burns steadier|than most soldiers' do.")],
            ['p', 0, NP_L('Благодарю, господин {Y}.|Меня этому научил {V}.', "Thank you, Mr. {Y}.|{V} taught me how.")],
            ['y', 0, NP_L('Вот как? Повезло тебе, братан.|И готовит, и огонь держит.', "That so? You're a lucky man, Buddy.|She cooks AND keeps the fire goin'.")],
            ['h', 0, NP_L('Ага. Мне вообще повезло.', "Yeah. I'm lucky in general.")],
            ['p', 8, '{V}...!'] ] },
        { id: 'y0_pray', y: true, st: [0], l: [
            ['p', 1, NP_L('Перед сном я помолюсь Семи Столпам.|Господин {Y}, не хотите присоединиться?', "I'm going to pray to the Seven Pillars before bed.|Mr. {Y}, would you like to join me?")],
            ['y', 0, NP_L('Я? Хе... Последний раз я молился,|когда кости бросал.', "Me? Heh... Last time I prayed|was over a game of dice.")],
            ['p', 17, NP_L('Это совсем не одно и то же!', "That's not the same thing at all!")],
            ['y', 0, NP_L('Да ладно, хозяюшка. Богиня-то меня услышала.|Я ж выиграл.', "Aw, come on, Miss. The goddess heard me alright.|I won, didn't I?")],
            ['h', 0, NP_L('(Кажется, они начинают ладить.)', "(Looks like they're starting to get along.)")] ] },
        { id: 'y0_doves', y: true, st: [0], l: [
            ['y', 0, NP_L('Спите, голубки. Я покараулю.', "Get some sleep, lovebirds. I'll keep watch.")],
            ['p', 5, NP_L('Г-голубки?! Мы... мы ещё не...', "L-Lovebirds?! We... we haven't even..."), 1],
            ['y', 0, NP_L('Хе-хе, да ладно. По вам за версту видно.', "Heh heh, come on. Anyone can see it a mile away.")],
            ['p', 9, '......'],
            ['h', 0, NP_L('Спасибо, {Y}. Разбуди, если что.', "Thanks, {Y}. Wake me if anything happens.")] ] },
        { id: 'y0_scar', y: true, st: [0], l: [
            ['p', 4, NP_L('Господин {Y}, откуда у вас этот шрам на плече?', "Mr. {Y}, where did you get that scar on your shoulder?")],
            ['y', 0, NP_L('Этот? Орк. Ну, или его жена. Темно было.', "This one? An orc. Or maybe his wife. It was dark.")],
            ['p', 6, NP_L('...Пожалуй, подробности мне знать не нужно.', "...I think I'd rather not know the details.")],
            ['y', 0, NP_L('Хе-хе. Умница хозяюшка. Береги её, братан.', "Heh heh. Smart girl, Miss. Take care of her, Buddy.")],
            ['h', 0, NP_L('Берегу.', "I do.")] ] },
        { id: 'y0_boots', y: true, st: [0], at: 'camp', l: [
            ['y', 0, NP_L('Братан, твои сапоги... ну и аромат.|Барышня, как ты рядом с ним спишь?', "Buddy, your boots... what a stench.|Missus, how d'ya sleep next to him?")],
            ['p', 26, NP_L('Я привыкла~', "I'm used to it~")],
            ['h', 0, NP_L('Эй!', "Hey!")],
            ['y', 0, NP_L('Хе-хе! Вот это любовь, я понимаю.', "Heh heh! Now that's what I call love.")] ] },
        { id: 'y0_bed', y: true, st: [0], at: 'inn', l: [
            ['y', 0, NP_L('Вот это я понимаю — кровать!|А не камень под рёбрами.', "Now that's what I call a bed!|Not a rock jabbin' me in the ribs.")],
            ['p', 3, NP_L('За комнаты заплатил {V}.', "{V} paid for the rooms.")],
            ['y', 0, NP_L('Щедрый ты, братан.|Я бы на твоём месте всё спустил в таверне.', "Generous of ya, Buddy.|In your shoes I'd have blown it all at the tavern.")],
            ['p', 6, NP_L('Поэтому платит {V}, а не вы.', "That's why {V} pays, and not you.")] ] },

        // ===== Яризо, стадия 1 =====
        { id: 'y1_glow', y: true, st: [1], l: [
            ['y', 0, NP_L('Барышня, ты сегодня прямо сияешь.|Помолилась как следует, что ли?', "Missus, you're positively glowin' today.|Had yourself a good prayer, did ya?")],
            ['p', 9, NP_L('Э-это... да. Помолилась.', "Th-that's... yes. I prayed."), 1],
            ['h', 0, NP_L('(И правда, щёки румяные. Наверное, от огня.)', "(Her cheeks really are flushed. Must be the fire.)")],
            ['y', 0, NP_L('Хе-хе. Молитва — дело полезное.', "Heh heh. Prayin's good for ya.")] ] },
        { id: 'y1_shoulders', y: true, st: [1], l: [
            ['y', 0, NP_L('Плечи-то у тебя зажатые, хозяюшка.|Я такой массаж умею — сама добавки попросишь.', "Your shoulders are all tense, Miss.|I give a massage so good, you'll be beggin' for more.")],
            ['p', 17, NP_L('Благодарю, не нужно!', "Thank you, that won't be necessary!")],
            ['h', 0, NP_L('{Y}, не приставай к ней.', "{Y}, leave her alone.")],
            ['y', 0, NP_L('Понял-понял, братан. Хе-хе.|Но предложение в силе.', "Got it, got it, Buddy. Heh heh.|But the offer stands.")],
            ['p', 8, '......', 1] ] },
        { id: 'y1_herbs', y: true, st: [1], l: [
            ['h', 0, NP_L('Чем-то пахнет... терпким. Травы?', "Something smells... pungent. Herbs?")],
            ['p', 5, NP_L('А?! Д-да, травы!|Господин {Y} показал мне одну... полезную.', "Huh?! Y-yes, herbs!|Mr. {Y} showed me one that's... useful."), 1],
            ['y', 0, NP_L('Очень полезную. Для здоровья. Хе-хе.', "Very useful. Good for your health. Heh heh.")],
            ['h', 0, NP_L('Здорово. Научишь и меня как-нибудь?', "Nice. Will you teach me sometime too?")],
            ['y', 0, NP_L('Тебе, братан, рановато.', "You ain't ready for it yet, Buddy.")] ] },
        { id: 'y1_sleeptalk', y: true, st: [1], l: [
            ['y', 0, NP_L('А знаешь, братан, хозяюшка во сне разговаривает.', "Y'know, Buddy, the Miss talks in her sleep.")],
            ['p', 14, NP_L('Неправда!', "That's not true!")],
            ['y', 0, NP_L('Правда-правда. Всё «ещё... ещё...» бормочет.|Пирожков, наверное, хочет.', "Sure ya do. Keep mumblin' “more... more...”|Must be cravin' pies.")],
            ['h', 0, NP_L('Ха, похоже на неё.', "Ha, sounds like her.")],
            ['p', 9, NP_L('...Да. Пирожков.', "...Yes. Pies."), 1] ] },
        { id: 'y1_tired', y: true, st: [1], l: [
            ['h', 0, NP_L('Ты сегодня какая-то вялая. Всё хорошо?', "You seem kind of worn out today. Everything okay?")],
            ['p', 2, NP_L('Просто устала... Долгий был день.', "I'm just tired... It's been a long day.")],
            ['y', 0, NP_L('Барышне нужен крепкий сон.|И кто-нибудь крепкий рядом. Хе-хе.', "The Missus needs a good, hard sleep.|And someone good and hard beside her. Heh heh.")],
            ['h', 0, NP_L('Я рядом.', "I'm right here.")],
            ['p', 8, NP_L('Да... вы рядом, {V}.', "Yes... you're right here, {V}.")] ] },
        { id: 'y1_deal', y: true, st: [1], c: function() { return gs(S.CONTRACT); }, l: [
            ['y', 0, NP_L('Ну что, хозяюшка, уговор наш помнишь?', "So, Miss, ya remember our little deal?")],
            ['p', 5, NP_L('...! Помню.', "...! I remember."), 1],
            ['y', 0, NP_L('Вот и умница. Это я про охрану, братан.|Я её берегу, она мне — доброе слово.', "Good girl. I'm talkin' about guard duty, Buddy.|I keep her safe, she gives me a kind word.")],
            ['h', 0, NP_L('Звучит честно.', "Sounds fair.")],
            ['p', 4, NP_L('(Только бы {V} не стал расспрашивать...)', "(Please don't let {V} start asking questions...)")] ] },

        // ===== Яризо, стадия 2 =====
        { id: 'y2_neck', y: true, st: [2], l: [
            ['h', 0, NP_L('{P}, что у тебя на шее? Синяк?', "{P}, what's that on your neck? A bruise?")],
            ['p', 9, NP_L('А?! Это... комар! Тут ужасные комары!', "Huh?! It's... a mosquito! The mosquitoes here are awful!"), 1],
            ['y', 0, NP_L('Хе-хе, здоровенные. Сам одного видел.', "Heh heh, real big ones. Saw one myself.")],
            ['h', 0, NP_L('Надо купить мазь.', "We should buy some ointment.")],
            ['p', 2, NP_L('...Да. Мазь.', "...Yes. Ointment.")] ] },
        { id: 'y2_night', y: true, st: [2, 3], c: absent, w: 3, l: [
            ['h', 0, NP_L('Я как-то ночью проснулся — тебя не было.', "I woke up one night and you weren't there.")],
            ['p', 5, NP_L('Я... ходила к ручью.|Помолиться в тишине.', "I... went down to the stream.|To pray in peace and quiet."), 1],
            ['y', 0, NP_L('Ночью у ручья хорошо. Тихо...|Хотя бывает и шумновато. Хе-хе.', "Nice by the stream at night. Quiet...|Though it can get a bit noisy. Heh heh.")],
            ['h', 0, NP_L('Будь осторожнее. Одной ночью опасно.', "Be careful. It's dangerous to go out alone at night.")],
            ['p', 8, NP_L('Я была не одна... то есть!|Богиня ведь всегда со мной!', "I wasn't alone... I mean!|The goddess is always with me!")] ] },
        { id: 'y2_limp', y: true, st: [2], l: [
            ['h', 0, NP_L('Ты прихрамываешь? Ногу подвернула?', "Are you limping? Did you twist your ankle?")],
            ['p', 14, NP_L('Н-немного! Неудачно ступила.', "J-just a little! I stepped wrong."), 1],
            ['y', 0, NP_L('Это всё долгая... дорога.|С непривычки у хозяюшки ноги дрожат.', "It's all that long... ride.|Miss ain't used to it, her legs are still shakin'.")],
            ['p', 17, NP_L('Господин {Y}!', "Mr. {Y}!")],
            ['h', 0, NP_L('Он прав. Завтра поспи подольше.', "He's right. Sleep in tomorrow.")] ] },
        { id: 'y2_grin', y: true, st: [2], l: [
            ['h', 0, NP_L('{Y}, чего ты всё ухмыляешься?', "{Y}, what are you grinning about?")],
            ['y', 0, NP_L('Да так, братан. День хороший.|Удачная была... охота.', "Nothin', Buddy. Good day, is all.|Had a nice... hunt.")],
            ['p', 6, '......'],
            ['h', 0, NP_L('Охота? Ты же весь день был с нами.', "A hunt? You were with us all day.")],
            ['y', 0, NP_L('Хе-хе. Вот именно.', "Heh heh. Exactly.")] ] },
        { id: 'y2_voice', y: true, st: [2], l: [
            ['h', 0, NP_L('Ты охрипла?', "Is your voice hoarse?")],
            ['p', 9, NP_L('Простыла немного...', "I caught a little cold..."), 1],
            ['y', 0, NP_L('Барышня вчера громко пела.|Молитвы, ясное дело.', "The Missus was singin' real loud last night.|Prayers, of course.")],
            ['p', 14, '......'],
            ['h', 0, NP_L('Пой потише. Горло побереги.', "Sing a bit quieter. Take care of your throat.")] ] },
        { id: 'y2_beach', y: true, st: [2, 3], c: beach, w: 2, l: [
            ['y', 0, NP_L('Эх, а море помнишь, хозяюшка?|Загар тебе к лицу. И не только к лицу.', "Ah, remember the sea, Miss?|That tan suits ya. And not just on your face.")],
            ['p', 9, NP_L('Г-господин {Y}...', "M-Mr. {Y}..."), 1],
            ['h', 0, NP_L('Что, обгорела?', "What, did you get sunburned?")],
            ['p', 2, NP_L('Чуть-чуть. Там, где купальник... не прикрывал.', "A little. Where the swimsuit... didn't cover.")],
            ['y', 0, NP_L('Хе-хе. Там, где не прикрывал.', "Heh heh. Where it didn't cover.")] ] },

        // ===== Яризо, стадия 3 =====
        { id: 'y3_spot', y: true, st: [3], at: 'camp', l: [
            ['y', 0, NP_L('Ну, голубки, кто где ляжет?', "So, lovebirds, who's sleepin' where?")],
            ['p', 10, NP_L('Я... лягу с краю. Поближе к огню.', "I'll... sleep on the edge. Closer to the fire.")],
            ['h', 0, NP_L('Там же ближе к {Y}. Ты его раньше побаивалась.', "But that's closer to {Y}. You used to be a little scared of him.")],
            ['p', 16, NP_L('Уже нет. Господин {Y}... надёжный.', "Not anymore. Mr. {Y} is... dependable."), 1],
            ['y', 0, NP_L('Слыхал, братан? Надёжный. Хе-хе.', "Hear that, Buddy? Dependable. Heh heh.")] ] },
        { id: 'y3_smoke', y: true, st: [3], l: [
            ['h', 0, NP_L('От тебя пахнет... как от {Y}. Табаком?', "You smell... like {Y}. Tobacco?")],
            ['p', 9, NP_L('Он курил рядом, пока мы... собирали хворост.', "He was smoking next to me while we... gathered firewood."), 1],
            ['y', 0, NP_L('Табачок крепкий. Впитывается — не отмоешь.', "Strong stuff. Soaks right in, won't wash out.")],
            ['h', 0, NP_L('Фу. {Y}, кури подальше от неё.', "Ugh. {Y}, smoke somewhere away from her.")],
            ['y', 0, NP_L('Как скажешь, братан. Подальше. Хе-хе.', "Whatever ya say, Buddy. Away from her. Heh heh.")] ] },
        { id: 'y3_ribbon', y: true, st: [3], l: [
            ['h', 0, NP_L('Ты больше не носишь мою ленту?', "You don't wear my ribbon anymore?")],
            ['p', 4, NP_L('Я... берегу её.|Чтобы не испачкать в дороге.', "I'm... keeping it safe.|So it won't get dirty on the road.")],
            ['y', 0, NP_L('Правильно, хозяюшка. В дороге всякое пачкается.', "Smart, Miss. All sorts of things get dirty on the road.")],
            ['h', 0, NP_L('Ну, главное, что не потеряла.', "Well, as long as you didn't lose it.")],
            ['p', 2, NP_L('(...Простите меня, {V}.)', "(...Forgive me, {V}.)")] ] },
        { id: 'y3_wedding', y: true, st: [3], l: [
            ['h', 0, NP_L('Когда всё закончится — сыграем свадьбу.', "When this is all over, we'll have our wedding.")],
            ['p', 8, NP_L('Да... свадьбу...', "Yes... our wedding...")],
            ['y', 0, NP_L('А меня позовёте? Я речь скажу.|Про то, какая невеста... старательная.', "Will ya invite me? I'll give a speech.|About how... hardworking the bride is.")],
            ['p', 10, NP_L('Господин {Y}...', "Mr. {Y}..."), 1],
            ['h', 0, NP_L('Конечно позовём. Ты нам почти семья.', "Of course we will. You're practically family.")],
            ['y', 0, NP_L('Хе-хе. Почти семья.', "Heh heh. Practically family.")] ] },
        { id: 'y3_prayer', y: true, st: [3], l: [
            ['p', 1, NP_L('Богиня... сегодня я не могу молиться.', "Goddess... I can't pray tonight.")],
            ['y', 0, NP_L('Устала, хозяюшка? Богиня подождёт.|А ты отдохни. Как следует.', "Tired, Miss? The goddess can wait.|You get some rest. A proper one.")],
            ['h', 0, NP_L('Ты в последнее время редко молишься.', "You haven't been praying much lately.")],
            ['p', 6, NP_L('Мне кажется... она меня больше не слушает.', "I feel like... she doesn't listen to me anymore.")],
            ['h', 0, NP_L('Глупости. Ты лучшая жрица из всех, кого я знаю.', "Nonsense. You're the best priestess I know.")],
            ['p', 4, '......'] ] },
        { id: 'y3_watch', y: true, st: [3], at: 'camp', l: [
            ['y', 0, NP_L('Спи спокойно, братан. Я пригляжу за хозяюшкой.|Глаз не сомкну.', "Sleep tight, Buddy. I'll keep an eye on the Miss.|Won't sleep a wink.")],
            ['p', 10, '......', 1],
            ['h', 0, NP_L('Спасибо. С тобой мне спокойнее.', "Thanks. I feel safer with you around.")],
            ['y', 0, NP_L('Хе-хе. И ей тоже.', "Heh heh. So does she.")] ] },

        // ===== без Яризо (герой + жрица) =====
        { id: 's_stars', st: [0, 1, 2, 3], at: 'camp', l: [
            ['p', 3, NP_L('Смотрите, {V}, сколько звёзд!', "Look, {V}, so many stars!")],
            ['h', 0, NP_L('Прямо как у нас в деревне.', "Just like back in our village.")],
            ['p', 8, NP_L('Когда-нибудь мы туда вернёмся. Вместе.', "Someday we'll go back there. Together.")] ] },
        { id: 's_dress', st: [0], l: [
            ['p', 8, NP_L('{V}... а какое платье мне надеть на свадьбу?', "{V}... what dress should I wear to our wedding?")],
            ['h', 0, NP_L('Любое. Тебе всё идёт.', "Any of them. You look good in everything.")],
            ['p', 9, NP_L('В-вы... не говорите такое так внезапно!', "Y-you... don't just say things like that out of nowhere!"), 1] ] },
        { id: 's_herbs', st: [0, 1, 2, 3], at: 'camp', l: [
            ['p', 3, NP_L('Ужин удался! Я добавила трав,|которые нашла у дороги.', "Dinner turned out great! I added some herbs|I found by the road.")],
            ['h', 0, NP_L('Вкусно. Только язык немеет.', "Tasty. My tongue is going numb, though.")],
            ['p', 5, NP_L('...Кажется, это были не те травы.', "...I think those were the wrong herbs.")] ] },
        { id: 's_scratch', st: [0, 1, 2, 3], l: [
            ['p', 4, NP_L('Покажите руку. Опять поцарапались.', "Let me see your hand. You've scratched yourself again.")],
            ['h', 0, NP_L('Пустяки.', "It's nothing.")],
            ['p', 1, NP_L('Для вас пустяки, а мне потом переживать.|Сейчас помолюсь — и всё затянется.', "It's nothing to you, but I'm the one who worries.|Let me say a prayer, and it'll heal right up.")] ] },
        { id: 's_inn', st: [0, 1, 2, 3], at: 'inn', l: [
            ['p', 0, NP_L('Настоящая кровать...|Я почти забыла, какая она мягкая.', "A real bed...|I almost forgot how soft they are.")],
            ['h', 0, NP_L('Выспись как следует.', "Get a good night's sleep.")],
            ['p', 8, NP_L('Только если вы будете рядом, {V}.', "Only if you're next to me, {V}.")] ] },
        { id: 's_quiet', st: [1, 2, 3], c: function() { return $.yarizoMet() && !$.yarizoGone(); }, l: [
            ['h', 0, NP_L('Ты задумалась. О чём?', "You're lost in thought. What about?")],
            ['p', 5, NP_L('А? Ни о чём! Просто... тихо сегодня.', "Huh? Nothing! It's just... quiet tonight."), 1],
            ['h', 0, NP_L('Без {Y} и правда тише.', "It really is quieter without {Y}.")],
            ['p', 2, NP_L('Да... тише.', "Yes... quieter.")] ] },
        { id: 's_dreams', st: [2, 3], l: [
            ['h', 0, NP_L('Ты в последнее время плохо спишь. Ворочаешься.', "You haven't been sleeping well lately. You toss and turn.")],
            ['p', 9, NP_L('Сны... странные снятся.', "I've been having... strange dreams."), 1],
            ['h', 0, NP_L('Кошмары?', "Nightmares?")],
            ['p', 4, NP_L('Не совсем... Не берите в голову, {V}.', "Not exactly... Don't worry about it, {V}.")] ] },
        { id: 's_gone', st: [1, 2, 3], c: function() { return $.yarizoGone(); }, w: 2, l: [
            ['p', 2, NP_L('Знаете... мне иногда не хватает... шума.', "You know... sometimes I miss... the noise.")],
            ['h', 0, NP_L('Шума?', "The noise?")],
            ['p', 6, NP_L('Ну... раньше в отряде было людно.|Неважно. Спокойной ночи, {V}.', "Well... the party used to be more crowded.|Never mind. Good night, {V}.")] ] }
    ];
    $.TALKS = TALKS;

    // ---- выбор ---------------------------------------------------------------
    function fits(t, stage, tone, where, yHere) {
        if (t.y && !yHere) return false;
        if (t.st.indexOf(t.y ? tone : stage) < 0) return false;
        if (t.at && t.at !== where) return false;
        if (t.c && !t.c()) return false;
        return true;
    }
    function weighted(list, rnd) {
        var sum = 0, i;
        for (i = 0; i < list.length; i++) sum += (list[i].w || 1);
        var r = rnd() * sum;
        for (i = 0; i < list.length; i++) { r -= (list[i].w || 1); if (r < 0) return list[i]; }
        return list[list.length - 1];
    }
    $.pick = function(where, rnd) {
        rnd = rnd || Math.random;
        var s = st(), stage = $.stage(), tone = $.yTone(), yHere = $.yarizoHere();
        var all = TALKS.filter(function(t) { return fits(t, stage, tone, where, yHere) && t.id !== s.last; });
        if (!all.length) return null;
        var ys = all.filter(function(t) { return t.y; }), ss = all.filter(function(t) { return !t.y; });
        var pool = (ys.length && (!ss.length || rnd() < 0.75)) ? ys : ss;
        var fresh = pool.filter(function(t) { return s.recent.indexOf(t.id) < 0; });
        if (!fresh.length) fresh = pool;
        var unseen = fresh.filter(function(t) { return !s.seen[t.id]; });
        return weighted(unseen.length ? unseen : fresh, rnd);
    };

    // ---- сборка команд -------------------------------------------------------
    var HEAD = { p: '\\c[6][\\n[2]]\\c[0]', y: '\\c[6][\\n[21]]\\c[0]', h: '\\c[6][\\n[1]]\\c[0]' };
    function fmt(text) {
        return String(text).replace(/\{H\}/g, '\\n[1]').replace(/\{P\}/g, '\\n[2]')
            .replace(/\{Y\}/g, '\\n[21]').replace(/\{V\}/g, '\\v[50]');
    }
    function c(code, params) { return { code: code, indent: 0, parameters: params }; }
    $.build = function(t) {
        var list = [];
        t.l.forEach(function(ln) {
            var who = ln[0];
            if (who === 'p') {
                list.push(c(122, [23, 23, 0, 0, ln[1] || 0]), c(122, [24, 24, 0, 0, 0]),
                          c(122, [27, 27, 0, 0, 0]), c(122, [30, 30, 0, 0, 0]), c(117, [60]));
            } else if (who === 'y') {
                list.push(c(122, [23, 23, 0, 0, 0]), c(122, [30, 30, 0, 0, 1]), c(117, [690]));
            }
            if (ln[3]) list.push(c(355, ['NP_Campfire.sigh()']));
            list.push(c(101, ['', 0, 0, 2]));
            if (HEAD[who]) list.push(c(401, [HEAD[who]]));
            fmt(ln[2]).split('|').forEach(function(s) { list.push(c(401, [s])); });
        });
        list.push(c(117, [57]), c(122, [23, 30, 0, 0, 0]), c(0, []));
        return list;
    };
    $.sigh = function() {
        try {
            if (typeof NPVoice !== 'undefined' && NPVoice.play) NPVoice.play('sigh', { vol: 55 });
        } catch (e) { /* без звука */ }
    };

    // ---- точка входа ----------------------------------------------------------
    $.maybe = function(interp, where, rnd) {
        rnd = rnd || Math.random;
        var why = $.canTalk(interp, where);
        $.lastReason = why;
        if (why) return false;
        var s = st();
        s.rests += 1;
        var bond = gv(V.BOND), bondUp = s.lastBond >= 0 && bond > s.lastBond;
        s.lastBond = bond;
        if (s.rests - s.lastRest <= P.cooldown) { $.lastReason = 'cooldown'; return false; }
        var chance = bondUp && $.yarizoHere() ? Math.max(P.chance, 85) : P.chance;
        if (rnd() * 100 >= chance) { $.lastReason = 'roll'; return false; }
        var t = $.pick(where, rnd);
        if (!t) { $.lastReason = 'empty'; return false; }
        s.lastRest = s.rests;
        s.last = t.id;
        s.seen[t.id] = (s.seen[t.id] || 0) + 1;
        s.recent.push(t.id);
        while (s.recent.length > 4) s.recent.shift();
        $.lastTalk = t.id;
        var list = $.build(t);
        if (interp && interp.setupChild) interp.setupChild(list, interp._eventId || 0);
        return t.id;
    };
    $.force = function(id) {
        var t = TALKS.filter(function(x) { return x.id === id; })[0];
        return t ? $.build(t) : null;
    };

    // ---- встраивание в CE ------------------------------------------------------
    function mark(code, indent, params) { return { code: code, indent: indent, parameters: params, npCampfire: true }; }
    $.inject = function(ces) {
        var r = {};
        var l474 = ces[474] && ces[474].list;
        if (!l474) r.ce474 = 'no CE474';
        else if (l474.some(function(x) { return x.npCampfire; })) r.ce474 = 'already';
        else {
            var at = -1;
            for (var i = 0; i < l474.length; i++) {
                var x = l474[i];
                if ((x.code === 108 || x.code === 408) && String(x.parameters[0]).indexOf('見張りの選択') >= 0) {
                    at = i;
                    while (at > 0 && l474[at].code === 408) at--;
                    break;
                }
            }
            if (at < 0 || l474[at].indent !== 0) r.ce474 = 'no anchor';
            else {
                l474.splice(at, 0, mark(355, 0, ["NP_Campfire.maybe(this, 'camp')"]));
                r.ce474 = 'ok@' + at;
            }
        }
        var l325 = ces[325] && ces[325].list;
        if (!l325) r.ce325 = 'no CE325';
        else if (l325.some(function(x) { return x.npCampfire; })) r.ce325 = 'already';
        else {
            var k = -1;
            for (var j = 0; j < l325.length; j++) {
                var y = l325[j];
                if (y.code === 355 && /睡眠本処理開始/.test(String(y.parameters[0]))) { k = j; break; }
            }
            if (k < 0) r.ce325 = 'no anchor';
            else {
                l325.splice(k, 0, mark(355, l325[k].indent, ["NP_Campfire.maybe(this, 'inn')"]));
                r.ce325 = 'ok@' + k;
            }
        }
        $.injectResult = r;
        console.log('[NP_Campfire] inject ' + JSON.stringify(r));
        return r;
    };
    if (typeof DataManager !== 'undefined') {
        var _isDatabaseLoaded = DataManager.isDatabaseLoaded;
        DataManager.isDatabaseLoaded = function() {
            var ok = _isDatabaseLoaded.apply(this, arguments);
            if (ok && !$._injected && window.$dataCommonEvents) {
                $._injected = true;
                try { $.inject($dataCommonEvents); }
                catch (e) { console.error('[NP_Campfire] inject failed', e); }
            }
            return ok;
        };
    }

    // ---- настройки ---------------------------------------------------------------
    ConfigManager.npCampTalk = P.enabled;
    var _makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _makeData.apply(this, arguments);
        config.npCampTalk = this.npCampTalk;
        return config;
    };
    var _applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _applyData.apply(this, arguments);
        this.npCampTalk = (config && config.npCampTalk !== undefined) ? !!config.npCampTalk : P.enabled;
    };
    if (P.optionLabel && typeof Window_Options !== 'undefined') {
        var _addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npCampTalk');
        };
    }
})(NP_Campfire);
