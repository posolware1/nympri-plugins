var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_MorningHints.js  (RU mod QoL)
//=============================================================================
/*:
 * @plugindesc [RU mod] Morning after a night absence: the hero notices small things, the priestess deflects.
 * @author RU mod
 *
 * @param Chance
 * @desc % chance that a hint plays after a night absence.
 * @default 60
 *
 * @param Cooldown
 * @desc Absences to skip after a hint was shown (1 = at most every other absence).
 * @default 1
 *
 * @param Delay
 * @desc Free frames on the new map before the hint starts.
 * @default 45
 *
 * @help
 * Works with the RU night-absence events (V4291 partner: 1 stranger, 2 Yarizo;
 * V4292 absence count). When the morning excuse resets V4291 to 0, a hint is
 * queued; it plays at the first free moment on another map (the party has
 * left the room): 1–3 short lines, the hero notices, the priestess deflects,
 * the hero accepts and never figures it out. Variants depend on the partner
 * and NP_PriestessDiary.stage(). Never in the gallery (S5), battle (S14),
 * cutscenes (S222 off), S56/S192, confinement (V264), on the world map, or
 * without the hero/priestess in the party. Yarizo speaks only if he is
 * really with the party (contract, alive, not gone).
 * Option «Утренние намёки» / "Morning hints".
 * Debug: NP_MorningHints.force(id) — returns the command list; .queue(partner).
 */
var NP_MorningHints = NP_MorningHints || {};
(function($) {
    'use strict';
    var params = PluginManager.parameters('NP_MorningHints');
    function num(v, d) { return v !== undefined && v !== '' && !isNaN(Number(v)) ? Number(v) : d; }
    var P = { chance: num(params['Chance'], 60), cooldown: num(params['Cooldown'], 1), delay: num(params['Delay'], 45) };
    $.P = P;
    var S = { GALLERY: 5, BATTLE: 14, EMERG: 56, LOCK: 192, FREE: 222, CONTRACT: 643, YDEAD: 503, YGONE: 2040 };
    var V = { PART: 4291, CNT: 4292, CONFINED: 264 };
    var YARIZO = 21;
    function gs(id) { return !!($gameSwitches && $gameSwitches.value(id)); }
    function gv(id) { return Number(($gameVariables && $gameVariables.value(id)) || 0); }
    function actorOk(id) {
        if (!$gameParty || !$gameActors) return false;
        var a = $gameActors.actor(id);
        if (!a || (a.isDead && a.isDead())) return false;
        return $gameParty.members().some(function(m) { return m && m.actorId() === id; });
    }
    function st() {
        var s = $gameSystem._npMorning;
        if (!s) s = $gameSystem._npMorning = { pending: null, lastCnt: -99, recent: [], seen: {}, shown: 0 };
        return s;
    }
    $.state = st;
    $.stage = function() {
        try {
            if (typeof NP_PriestessDiary !== 'undefined' && NP_PriestessDiary.stage)
                return Math.max(0, Math.min(3, Number(NP_PriestessDiary.stage()) || 0));
        } catch (e) {}
        return 0;
    };
    $.yarizoHere = function() {
        return gs(S.CONTRACT) && !gs(S.YDEAD) && !gs(S.YGONE) && actorOk(YARIZO);
    };

    // ---- option ------------------------------------------------------------
    ConfigManager.npMorningHints = true;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var c = _make.apply(this, arguments);
        c.npMorningHints = this.npMorningHints;
        return c;
    };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _apply.apply(this, arguments);
        this.npMorningHints = !(c && c.npMorningHints === false);
    };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() {
        _addGen.apply(this, arguments);
        this.addCommand(NP_L('Утренние намёки', 'Morning hints'), 'npMorningHints');
    };

    // ---- variants ------------------------------------------------------------
    // line: [who, face, ru, en]  who: h hero, p priestess, y Yarizo
    // pt: 0 any partner, 1 stranger, 2 Yarizo;  st: min stage;  y: Yarizo speaks
    // {H} hero, {P} priestess, {Y} Yarizo, {V} how the priestess calls the hero
    var HINTS = [
        { id: 'g_sleepy', pt: 0, st: 0, l: [
            ['h', 0, '{P}, ты не выспалась? Глаза совсем сонные.', "{P}, didn't you sleep well? Your eyes look so tired."],
            ['p', 9, 'Н-немного... Долго молилась перед сном.', "A-a little... I prayed for a long time before bed."],
            ['h', 0, 'Береги себя. Сегодня пойдём не спеша.', "Take care of yourself. We'll take it slow today."]] },
        { id: 'g_wethair', pt: 0, st: 0, l: [
            ['h', 0, '(У {P} волосы ещё влажные. Когда она успела вымыться?)', "({P}'s hair is still damp. When did she have time to bathe?)"],
            ['p', 5, 'Я встала пораньше и сходила к колодцу.|Освежиться.', "I got up early and went to the well.|To freshen up."],
            ['h', 0, 'Понятно. Рано ты встаёшь.', "I see. You're an early riser."]] },
        { id: 'g_flushed', pt: 0, st: 0, l: [
            ['h', 0, 'Ты сегодня какая-то румяная. Не заболела?', "You look kind of flushed today. Are you feeling sick?"],
            ['p', 8, 'Н-нет! Просто утро свежее.', "N-no! It's just a brisk morning."],
            ['h', 0, 'Ну, если что — скажи.', "Well, tell me if anything's wrong."]] },
        { id: 'g_belt', pt: 0, st: 0, l: [
            ['h', 0, '(Пояс на её рясе завязан не так, как обычно.)', "(The belt on her habit is tied differently than usual.)"],
            ['p', 9, 'Что? А... я торопилась. Сейчас перевяжу.', "What? Oh... I was in a hurry. I'll retie it."],
            ['h', 0, '(Ну да, бывает.)', "(Yeah, happens to everyone.)"]] },
        { id: 'g_door', pt: 0, st: 0, l: [
            ['h', 0, 'Ты ночью выходила? Мне показалось, дверь скрипнула.', "Did you go out last night? I thought I heard the door creak."],
            ['p', 4, 'Это... ветер, наверное. Или кошка.', "That was... the wind, probably. Or a cat."],
            ['h', 0, 'Кошка? Ну ладно.', "A cat? Well, okay."]] },
        { id: 'g_cheer', pt: 0, st: 1, l: [
            ['p', 3, 'Доброе утро, {V}! Сегодня я полна сил!', "Good morning, {V}! I'm full of energy today!"],
            ['h', 0, '(Странно: глаза уставшие, а улыбается так довольно.)|Это хорошо.', "(Strange — her eyes look tired, but she's smiling so contentedly.)|That's good."]] },
        { id: 'g_quiet', pt: 0, st: 0, l: [
            ['h', 0, 'Ты так тихо спала — я даже не слышал, как ты ворочаешься.', "You slept so quietly — I didn't even hear you toss and turn."],
            ['p', 9, 'Я умею спать тихо. Монастырская привычка.', "I know how to sleep quietly. A convent habit."],
            ['h', 0, 'Полезная привычка.', "Useful habit."]] },
        { id: 'g_limp', pt: 0, st: 1, l: [
            ['h', 0, 'Всё в порядке? Ты идёшь как-то осторожно.', "Everything alright? You're walking kind of carefully."],
            ['p', 14, 'Н-неудачно встала с кровати. Пустяки!', "I-I got out of bed wrong. It's nothing!"],
            ['h', 0, 'Если будет болеть — скажи, сделаем привал.', "If it hurts, tell me and we'll take a break."]] },
        { id: 'g_bed', pt: 0, st: 1, l: [
            ['h', 0, '(Её постель будто и не тронута...)', "(Her bed looks like nobody slept in it...)"],
            ['p', 6, 'Я застелила постель. Нас так учили.', "I made the bed. That's how we were taught."],
            ['h', 0, 'Аккуратная ты у меня.', "You're so tidy."]] },
        { id: 'g_glow', pt: 0, st: 3, l: [
            ['p', 1, 'Не смотрите так, {V}. Я просто хорошо отдохнула.', "Don't look at me like that, {V}. I just had a good rest."],
            ['h', 0, '(И правда, она будто светится. Значит, гостиница хорошая.)', "(She really is glowing. Must be a good inn.)"]] },
        // ---- stranger ----
        { id: 's_nod', pt: 1, st: 0, l: [
            ['h', 0, 'Тот мужчина в коридоре так тебе кивнул... Вы знакомы?', "That man in the hallway nodded at you... Do you know him?"],
            ['p', 9, 'Н-нет! Наверное, принял меня за другую.', "N-no! He must have mistaken me for someone else."],
            ['h', 0, 'Странный тип.', "Weird guy."]] },
        { id: 's_smoke', pt: 1, st: 0, l: [
            ['h', 0, 'От тебя пахнет табаком. Ты же не куришь?', "You smell of tobacco. You don't smoke, do you?"],
            ['p', 5, 'Внизу кто-то курил всю ночь... Я вся пропахла.', "Someone was smoking downstairs all night... It got into everything."],
            ['h', 0, 'В следующий раз найдём гостиницу почище.', "Next time we'll find a cleaner inn."]] },
        { id: 's_keeper', pt: 1, st: 0, l: [
            ['h', 0, '(Хозяин гостиницы как-то странно на неё смотрит.)', "(The innkeeper is giving her an odd look.)"],
            ['p', 6, 'Пойдёмте скорее, {V}. Не люблю это место.', "Let's hurry, {V}. I don't like this place."],
            ['h', 0, 'Как скажешь.', "Whatever you say."]] },
        { id: 's_ribbon', pt: 1, st: 2, l: [
            ['h', 0, 'Новая лента? Не видел её раньше.', "A new ribbon? I haven't seen it before."],
            ['p', 8, 'Подарок... от одного доброго человека.|Вчера вечером.', "A gift... from a kind person.|Last night."],
            ['h', 0, 'Тебе идёт.', "It suits you."]] },
        { id: 's_collar', pt: 1, st: 0, l: [
            ['h', 0, '(Она всё время поправляет воротник.)', "(She keeps fixing her collar.)"],
            ['p', 9, 'Говорят, тут клопы... Шея чешется.', "They say there are bedbugs here... My neck itches."],
            ['h', 0, 'Надо будет сказать хозяину.', "We should tell the innkeeper."]] },
        // ---- Yarizo ----
        { id: 'y_win', pt: 2, st: 0, y: true, l: [
            ['y', 0, 'Утречко, братан! Сладко спалось?', "Mornin', Buddy! Sleep well?"],
            ['h', 0, 'Отлично. А ты чего такой довольный?', "Great. Why do you look so pleased?"],
            ['y', 0, 'Хе-хе. Ночка удачная выдалась. Сорвал куш.', "Heh heh. Had a lucky night. Hit the jackpot."],
            ['p', 17, 'Господин {Y}! ...Идёмте уже.', "Mr. {Y}! ...Let's go already."],
            ['h', 0, '(Опять в кости играл, что ли?)', "(Was he gambling again?)"]] },
        { id: 'y_whistle', pt: 2, st: 0, y: true, l: [
            ['h', 0, '({Y} насвистывает, а {P} на него даже не смотрит.)|Вы что, поссорились?', "({Y} is whistling, and {P} won't even look at him.)|Did you two have a fight?"],
            ['p', 6, 'Ничуть. Просто не выспалась.', "Not at all. I just didn't sleep well."],
            ['y', 0, 'Ага. Не выспалась. Хе-хе.', "Yup. Didn't sleep well. Heh heh."]] },
        { id: 'y_scratch', pt: 2, st: 1, y: true, l: [
            ['h', 0, '{Y}, у тебя спина в царапинах — через рубаху видно.', "{Y}, your back is all scratched up — I can see it through your shirt."],
            ['y', 0, 'А, это... по кустам вчера лазил. Колючие попались.', "Ah, that... Was crawling through bushes yesterday. Thorny ones."],
            ['p', 5, '...', '...'],
            ['h', 0, 'Осторожнее надо.', "You should be more careful."]] },
        { id: 'y_wine', pt: 2, st: 1, l: [
            ['h', 0, '(От {P} пахнет крепким вином... как от {Y}.)', "({P} smells of strong wine... just like {Y}.)"],
            ['p', 9, 'Господин {Y} вчера опрокинул на меня кружку.|Такой неуклюжий.', "Mr. {Y} spilled his mug on me last night.|He's so clumsy."],
            ['h', 0, 'Похоже на него.', "Sounds like him."]] },
        { id: 'y_ribbon', pt: 2, st: 2, y: true, l: [
            ['y', 0, 'Хозяюшка, ты у меня вчера ленточку обронила.', "Miss, you dropped your ribbon at my place last night."],
            ['p', 5, 'А! С-спасибо... Видимо, когда помогала вам с перевязкой.', "Oh! Th-thank you... I must have dropped it while I was changing your bandages."],
            ['h', 0, '(Какая она заботливая.)', "(She's so caring.)"]] },
        { id: 'y_talk', pt: 2, st: 2, l: [
            ['h', 0, 'Вчера вечером ты долго говорила с {Y}?', "Did you talk with {Y} for long last night?"],
            ['p', 4, 'Он рассказывал о своих странствиях...|Я и не заметила, как стемнело.', "He was telling me about his travels...|I didn't even notice it got dark."],
            ['h', 0, 'Да, болтать он умеет.', "Yeah, he sure can talk."]] }
    ];
    $.HINTS = HINTS;

    $.candidates = function(partner, stage) {
        var yh = $.yarizoHere();
        return HINTS.filter(function(t) {
            if (t.pt && t.pt !== partner) return false;
            if ((t.st || 0) > stage) return false;
            if (t.y && !yh) return false;
            if (t.pt === 2 && (gs(S.YDEAD) || gs(S.YGONE))) return false;
            return true;
        });
    };
    $.pick = function(partner, stage, rnd) {
        rnd = rnd || Math.random;
        var s = st();
        var list = $.candidates(partner, stage);
        var fresh = list.filter(function(t) { return s.recent.indexOf(t.id) < 0; });
        if (!fresh.length) fresh = list;
        // partner-specific variants a bit more likely
        var pool = [];
        fresh.forEach(function(t) { pool.push(t); if (t.pt) pool.push(t); });
        return pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
    };

    // ---- commands (same faces/headers as NP_Campfire) -------------------------
    var HEAD = { p: '\\c[6][\\n[2]]\\c[0]', y: '\\c[6][\\n[21]]\\c[0]', h: '\\c[6][\\n[1]]\\c[0]' };
    function fmt(text) {
        return String(text).replace(/\{H\}/g, '\\n[1]').replace(/\{P\}/g, '\\n[2]')
            .replace(/\{Y\}/g, '\\n[21]').replace(/\{V\}/g, '\\v[50]');
    }
    function c(code, p) { return { code: code, indent: 0, parameters: p }; }
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
            list.push(c(101, ['', 0, 0, 2]));
            if (HEAD[who]) list.push(c(401, [HEAD[who]]));
            fmt(NP_L(ln[2], ln[3])).split('|').forEach(function(s) { list.push(c(401, [s])); });
        });
        list.push(c(117, [57]), c(122, [23, 30, 0, 0, 0]), c(0, []));
        return list;
    };

    // ---- queue ---------------------------------------------------------------
    $.queue = function(partner) {
        var s = st();
        s.pending = { p: partner, map: $gameMap ? $gameMap.mapId() : 0, cnt: gv(V.CNT), t: 0 };
        return s.pending;
    };
    var _setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(id, value) {
        var old = (id === V.PART) ? Number(this._data[id] || 0) : 0;
        _setValue.apply(this, arguments);
        if (id === V.PART && old >= 1 && Number(this._data[id] || 0) === 0 &&
            $gameSystem && !gs(S.GALLERY)) {
            try { $.queue(old); } catch (e) {}
        }
    };

    $.blocker = function() {
        if (ConfigManager.npMorningHints === false) return 'off';
        if (gs(S.GALLERY)) return 'gallery';
        if (gs(S.BATTLE) || gs(S.EMERG) || gs(S.LOCK)) return 'locked';
        if (!gs(S.FREE)) return 'story';
        if (gv(V.CONFINED) > 0) return 'confined';
        if (gv(V.PART) >= 1) return 'absent';
        if (!actorOk(1) || !actorOk(2)) return 'party';
        if ($gameMap.mapId() === 3) return 'worldmap';
        if ($gameMap.isEventRunning() || $gameMessage.isBusy()) return 'busy';
        if ($gamePlayer.isTransferring() || $gamePlayer.isMoving()) return 'moving';
        if (SceneManager.isSceneChanging()) return 'scene';
        return '';
    };
    // returns hint id, false (rolled/blocked), or null (still waiting)
    $.tryFire = function(rnd, force) {
        var s = st(), pd = s.pending;
        if (!pd) return null;
        if (!force && $gameMap.mapId() === pd.map) return null;   // still in the room
        var why = $.blocker();
        $.lastReason = why;
        if (why) {
            if (why === 'off' || why === 'gallery') s.pending = null;
            return null;
        }
        if (!force && ++pd.t < P.delay) return null;
        s.pending = null;
        rnd = rnd || Math.random;
        if (!force) {
            if (pd.cnt - s.lastCnt <= P.cooldown) { $.lastReason = 'cooldown'; return false; }
            if (rnd() * 100 >= P.chance) { $.lastReason = 'roll'; return false; }
        }
        var t = $.pick(pd.p, $.stage(), rnd);
        if (!t) { $.lastReason = 'empty'; return false; }
        s.lastCnt = pd.cnt;
        s.shown++;
        s.seen[t.id] = (s.seen[t.id] || 0) + 1;
        s.recent.push(t.id);
        while (s.recent.length > 6) s.recent.shift();
        $.lastHint = t.id;
        $gameMap._interpreter.setup($.build(t), 0);
        return t.id;
    };
    $.force = function(id) {
        var t = HINTS.filter(function(h) { return h.id === id; })[0];
        return t ? $.build(t) : null;
    };

    var _smUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _smUpdate.apply(this, arguments);
        if ($gameSystem && $gameSystem._npMorning && $gameSystem._npMorning.pending) {
            try { $.tryFire(); } catch (e) { console.error('[NP_MorningHints]', e); $gameSystem._npMorning.pending = null; }
        }
    };
})(NP_MorningHints);
