//=============================================================================
// NP_YarizoQuest.js  (RU mod)
//=============================================================================
/*:
 * @plugindesc v1.2 Задание «Наёмник из таверны»: где встретить и нанять Яризо (журнал + метки).
 * @author RU mod
 *
 * @help
 * Задание в журнале (QuestList.csv, $quest_id=201090, переменная 3570).
 * Если строки 201090 ещё нет (чистый 0.80j), плагин добавляет только её в памяти
 * из своего RU/EN текста. Уже существующую строку не перезаписывает.
 * Файл карты не подменяет. На карте 171 в рантайме поправляет две проверки:
 * страница 5 события 1 не перекрывает встречу, пока ранг ≥2 и S290 выключен
 * (кроме S301 — тогда страница 5 остаётся как в оригинале); спрайты
 * событий 29–31 видны при ранге ≥2, а не только при ранге ровно 2.
 * После встречи (S290) страница 5 снова обычная.
 * Следит за переключателями (S290 встреча, S291 спасён, S2040 уведён
 * матросами, S643 контракт, S503 погиб) и концом разговоров M13 ev45 (наём)
 * / M171 ev67 (выкуп). События 67 в чистой карте 0.80j нет, плагин его не
 * добавляет: этапы 4–5 только если S2040 уже включён. Провал сцены в
 * оригинале ставит S503.
 *
 * Этапы (V3570):
 *   1 слух: Портовый город, сцена сама при входе, западный край у воды
 *   2 спасён: нанять в Гильдии авантюристов       метка: M13 ev45
 *   3 отказали в гильдии: он всё ещё ждёт там     метка: M13 ev45
 *   4 уведён матросами (только если S2040 уже ON) метка: M171 ev67
 *   5 выкуп отложен (только если S2040 уже ON)    метка: M171 ev67
 *  99 нанят (S643) — выполнено
 * 100 наём невозможен (погиб/пропал до найма) — закрыто
 * Задание не стартует: при S643, S503, в режиме галереи (S5).
 * Старт — реплика NPC при входе в столицу (M96/M8/M13/M14) или в порту.
 * Если актор 21 уже в отряде или S643 уже ON, а флаги встречи не сходятся,
 * и S2040 выключен: S290 ON, S291 ON, S643 ON, S503 OFF, V3570 = 99.
 * V8 и V911 не меняются.
 * Строки RU/EN: NP_YarizoQuest.TEXT (EN, если NP_Language.isEn()).
 * v1.1: «Место», «Описание» и «Подробности» зависят от этапа.
 * v1.2: встреча в порту не глушится сюжетом V911; журнал этапа 1 говорит, где он.
 */
var Imported = Imported || {};
Imported.NP_YarizoQuest = true;
var NP_YarizoQuest = NP_YarizoQuest || {};

(function($) {
    'use strict';
    var VAR = 3570, QID = 201090;
    var S_GALLERY = 5, S_MET = 290, S_SAVED = 291, S_TAKEN = 2040, S_HIRED = 643, S_DEAD = 503;
    var S_QUIET = 301;
    var V_RANK = 9, V_COMPANION = 8, V_STORY = 911;
    var ACTOR = 21;
    var PORT = 171, GUILD = 13, GUILD_EV = 45, RANSOM_EV = 67;
    var MEET_EV = 1, SPRITE_EVS = [29, 30, 31], SPRITE_X = 2, SPRITE_Y = 17;
    var HUBS = [96, 8, 13, 14];
    $.VAR = VAR; $.QID = QID;

    // ------------------------------------------------------------------ text
    $.TEXT = {
        ru: {
            title: 'Наёмник из таверны',
            logNew: '\\c[6]Новое задание: Наёмник из таверны',
            logUpd: '\\c[6]Задание обновлено: Наёмник из таверны',
            logDone: '\\c[6]Задание выполнено: Наёмник из таверны',
            logClosed: '\\c[6]Задание закрыто: Наёмник из таверны',
            spk96: 'Стражник', spk8: 'Стражник', spk13: 'Авантюрист', spk14: 'Посетитель', spk171: 'Портовый грузчик',
            rumor: ['Слыхали? В Портовом городе с корабля сняли бродягу-безбилетника.',
                    'Здоровенный такой, с копьём — всё твердит, что хочет в авантюристы.',
                    'Будете в порту — гляньте. Может, и вам в отряд сгодится.'],
            cityGuild: ['Видали того бродягу с копьём в Гильдии авантюристов?',
                        'Сидит там целыми днями — всё ищет, кто бы взял его в отряд.'],
            cityTaken: ['Говорят, матросы в Портовом городе держат у себя какого-то бродягу —',
                        'заставляют ящики таскать за долги.',
                        'За 200 серебра его, мол, можно выкупить на причале.'],
            portSaved: ['Ловко вы того бродягу у матросов отбили!',
                        'Он всё про столицу расспрашивал — пойдёт, мол, в Гильдию авантюристов,',
                        'в отряд проситься. Будете там — загляните к нему.'],
            portTaken: ['Не повезло старику... Морячки заставят его ящики таскать, пока долг не отработает.',
                        'Хотите его вызволить — приходите на причал со следующего дня.',
                        'За 200 серебра, думаю, отдадут.'],
            // journal fields per stage (only what the player already knows)
            place: {1: 'Портовый город, западный край у воды', 2: 'Гильдия авантюристов', 3: 'Гильдия авантюристов',
                    4: 'Портовый город, причал', 5: 'Портовый город, причал',
                    99: 'Таверна столицы', 100: '—'},
            short: {1: 'Найти бродягу с копьём в порту.', 2: 'Взять бродягу в отряд.', 3: 'Взять бродягу в отряд.',
                    4: 'Вызволить бродягу у матросов.', 5: 'Вызволить бродягу у матросов.',
                    99: 'Бродяга с копьём принят в отряд.', 100: 'Бродягу с копьём уже не нанять.'},
            step1: 'Бродяга с копьём — в Портовом городе, у воды на западном краю. Сцена начинается сама, как только вы входите в порт. \\c[6][Портовый город]\\c[0]',
            detail: {1: 'Он в Портовом городе, у воды на западном краю. Сцена начинается сама, как только вы входите в порт.',
                     2: 'В порту вы выручили бродягу с копьём. Теперь он ищет отряд в Гильдии авантюристов.\nВ одиночку (без напарницы) его там не застать.',
                     3: 'Вы отказали бродяге, но он не теряет надежды и ждёт в Гильдии авантюристов.\nВ одиночку (без напарницы) его там не застать.',
                     4: 'Матросы увели бродягу с копьём отрабатывать долг. Говорят, за выкуп его отпустят.',
                     5: 'Матросы всё ещё держат бродягу на причале и ждут выкупа.',
                     99: 'Бродяга с копьём — Яризо — теперь ходит с вашим отрядом.',
                     100: 'Бродягу с копьём больше не нанять.'}
        },
        en: {
            title: 'The Tavern Mercenary',
            logNew: '\\c[6]New quest: The Tavern Mercenary',
            logUpd: '\\c[6]Quest updated: The Tavern Mercenary',
            logDone: '\\c[6]Quest complete: The Tavern Mercenary',
            logClosed: '\\c[6]Quest closed: The Tavern Mercenary',
            spk96: 'Guard', spk8: 'Guard', spk13: 'Adventurer', spk14: 'Patron', spk171: 'Dockworker',
            rumor: ['Heard the news? Sailors at the Port Town dragged a stowaway off a ship.',
                    'Big fella with a spear — keeps saying he wants to be an adventurer.',
                    'If you\'re at the port, have a look. He might suit your party.'],
            cityGuild: ['Seen that tramp with the spear at the Adventurers\' Guild?',
                        'He sits there all day hoping someone will take him into a party.'],
            cityTaken: ['They say the sailors at the Port Town are holding some tramp —',
                        'making him haul crates to pay off his debts.',
                        'Supposedly you can buy him out at the pier for 200 silver.'],
            portSaved: ['Nice job getting that tramp away from the sailors!',
                        'He kept asking about the capital — says he\'ll go to the Adventurers\' Guild',
                        'and ask to join a party. Look him up if you\'re there.'],
            portTaken: ['Tough luck for the old man... The sailors will make him haul crates until he pays his debt.',
                        'If you want him out, come to the pier from tomorrow on.',
                        'They\'ll probably let him go for 200 silver.'],
            place: {1: 'Port Town, west edge by the water', 2: 'Adventurers\' Guild', 3: 'Adventurers\' Guild',
                    4: 'Port Town, pier', 5: 'Port Town, pier',
                    99: 'Capital tavern', 100: '—'},
            short: {1: 'Find the tramp with the spear in the port.', 2: 'Take the tramp into your party.', 3: 'Take the tramp into your party.',
                    4: 'Get the tramp away from the sailors.', 5: 'Get the tramp away from the sailors.',
                    99: 'The tramp with the spear joined your party.', 100: 'The tramp with the spear can no longer be hired.'},
            step1: 'The tramp with the spear is in Port Town, at the west edge by the water. The scene starts automatically when you enter the port. \\c[6][Port Town]\\c[0]',
            detail: {1: 'He is in Port Town, at the west edge by the water. The scene starts automatically when you enter the port.',
                     2: 'You got the tramp with the spear out of trouble at the port. Now he is looking for a party at the Adventurers\' Guild.\nWhile you travel solo (without your partner) he will not be there.',
                     3: 'You turned the tramp down, but he has not given up and keeps waiting at the Adventurers\' Guild.\nWhile you travel solo (without your partner) he will not be there.',
                     4: 'The sailors took the tramp with the spear away to work off his debt. Word is they will let him go for a ransom.',
                     5: 'The sailors are still holding the tramp at the pier, waiting for the ransom.',
                     99: 'The tramp with the spear — Yarizo — now travels with your party.',
                     100: 'The tramp with the spear can no longer be hired.'}
        }
    };
    $.isEn = function() {
        var L = window.NP_Language;
        return !!(L && typeof L.isEn === 'function' && L.isEn());
    };
    $.t = function(key) {
        var tb = $.isEn() ? $.TEXT.en : $.TEXT.ru;
        return tb[key] !== undefined ? tb[key] : $.TEXT.ru[key];
    };

    // ------------------------------------------------------------------ state
    function sw(id) { return !!($gameSwitches && $gameSwitches.value(id)); }
    function gallery() { return sw(S_GALLERY); }
    $.stage = function() { return $gameVariables ? $gameVariables.value(VAR) : 0; };
    $.history = function() {
        if (!$gameSystem) return [];
        if (!Array.isArray($gameSystem._npYarizoQuest)) $gameSystem._npYarizoQuest = [];
        return $gameSystem._npYarizoQuest;
    };
    function log(text) {
        try { if (typeof set_mlog === 'function') set_mlog(text); } catch (e) { console.error(e); }
    }
    $.setStage = function(st, kind) {
        if (st === $.stage()) return;
        $gameVariables.setValue(VAR, st);
        var h = $.history();
        if (h[h.length - 1] !== st) h.push(st);
        if (kind) log($.t(kind));
    };
    // Silent state sync (after events / on map entry).
    $.sync = function() {
        if (!$gameVariables || !$gameSwitches || gallery()) return;
        if ($.repairRecruit()) return;
        var st = $.stage();
        if (st <= 0 || st >= 99) return;
        if (sw(S_HIRED)) { $.setStage(99, 'logDone'); return; }
        if (sw(S_DEAD)) { $.setStage(100, 'logClosed'); return; }
        if (sw(S_SAVED)) {
            if (st === 1 || st === 4 || st === 5) $.setStage(2, 'logUpd');
        } else if (sw(S_TAKEN)) {
            if (st === 1) $.setStage(4, 'logUpd');
        }
    };
    function blocked() { return gallery() || sw(S_HIRED) || sw(S_DEAD); }

    // after talking to him in the guild without hiring -> refused (stage 3)
    $.onGuildTalkEnd = function() {
        if (blocked() || !sw(S_SAVED)) return $.sync();
        var st = $.stage();
        if (st === 0) $.setStage(3, 'logNew');
        else if (st < 99 && st !== 3) $.setStage(3, 'logUpd');
    };
    // after the ransom talk at the pier without paying -> stage 5
    $.onRansomEnd = function() {
        if (!blocked() && !sw(S_SAVED) && sw(S_TAKEN)) {
            var st = $.stage();
            if (st === 0) $.setStage(5, 'logNew');
            else if (st === 1 || st === 4) $.setStage(5, 'logUpd');
        }
        $.sync();
    };

    // which NPC mention (if any) should play now on this map
    $.pendingMention = function(mapId) {
        if (!$gameVariables || blocked()) return null;
        var st = $.stage();
        if (mapId === PORT && (st === 0 || st === 1) && sw(S_MET)) {
            if (sw(S_SAVED)) return {key: 'portSaved', stage: 2};
            if (sw(S_TAKEN)) return {key: 'portTaken', stage: 4};
            return null;
        }
        if (st !== 0 || HUBS.indexOf(mapId) < 0) return null;
        if (sw(S_SAVED)) return {key: 'cityGuild', stage: 2};
        if (sw(S_TAKEN)) return {key: 'cityTaken', stage: 4};
        if (!sw(S_MET) && $gameVariables.value(V_RANK) >= 2) return {key: 'rumor', stage: 1};
        return null;
    };

    // ------------------------------------------------------------------ port meeting (runtime, map file stays vanilla)
    // Event 1 page 5 is the empty "story idle" page: action button, variable 911 >= 4.
    // RPG Maker uses the last matching page, so that page covers the meeting (page 3)
    // once chapter 1 has reached V911 >= 4. While he has not been met and rank is
    // at least 2, keep page 5 inactive so page 3 (or the first-visit page that sets
    // the visit switch) can run. Switch 301 is Quiet's arrival: leave page 5 as it
    // is so that scene is not replaced by the meeting. After S290, page 5 is vanilla.
    $.isStoryIdlePage = function(page) {
        if (!page || page.trigger !== 0 || !page.conditions) return false;
        var c = page.conditions;
        return !!(c.variableValid && Number(c.variableId) === V_STORY && Number(c.variableValue) === 4);
    };
    $.portIdlePageActive = function(vanillaOk, waiting, quietArrived) {
        if (!vanillaOk) return false;
        if (waiting && !quietArrived) return false;
        return true;
    };
    $.pageComment = function(page) {
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
    // Sprite pages on events 29–31 are a KNS check for rank exactly 2.
    $.isRankTwoSpritePage = function(page) {
        var text = $.pageComment(page);
        if (!/\$gameVariables\.value\(\s*9\s*\)\s*===?\s*2\b/.test(text)) return false;
        if (/\$gameSwitches/.test(text)) return false;
        if (/\$gameVariables\.value\(\s*(?!9\b)\d+/.test(text)) return false;
        return true;
    };
    $.spritePageActive = function(vanillaOk, met, rank) {
        if (vanillaOk) return true;
        if (met) return false;
        return rank >= 2;
    };
    $.meetingWaiting = function() {
        return !sw(S_MET) && $gameVariables.value(V_RANK) >= 2;
    };
    $.applyPortPage = function(eventId, page, vanillaOk) {
        if (gallery() || !$gameVariables || !$gameSwitches) return vanillaOk;
        if (Number(eventId) === MEET_EV && $.isStoryIdlePage(page)) {
            return $.portIdlePageActive(!!vanillaOk, $.meetingWaiting(), sw(S_QUIET));
        }
        if (SPRITE_EVS.indexOf(Number(eventId)) >= 0 && $.isRankTwoSpritePage(page)) {
            return $.spritePageActive(!!vanillaOk, sw(S_MET), $gameVariables.value(V_RANK));
        }
        return vanillaOk;
    };

    function actorWithPlayer() {
        var party = $gameParty;
        if (!party || !Array.isArray(party._actors)) return false;
        return party._actors.indexOf(ACTOR) >= 0;
    }
    // MTool (or any add) put him in the party, or the contract is on, but the
    // meeting flags do not match a finished hire. Only the clear case: not the
    // sailor-taken switch, and not a death with no contract and no party slot.
    $.recruitNeedsRepair = function() {
        if (!$gameSwitches || !$gameVariables || gallery()) return false;
        var inParty = actorWithPlayer();
        var hired = sw(S_HIRED);
        if (!inParty && !hired) return false;
        if (sw(S_TAKEN)) return false;
        if (sw(S_DEAD) && !inParty && !hired) return false;
        return !(sw(S_MET) && sw(S_SAVED) && hired && !sw(S_DEAD) && $.stage() === 99);
    };
    $.repairRecruit = function() {
        if (!$.recruitNeedsRepair()) return false;
        var keepCompanion = $gameVariables.value(V_COMPANION);
        var keepStory = $gameVariables.value(V_STORY);
        $gameSwitches.setValue(S_MET, true);
        $gameSwitches.setValue(S_SAVED, true);
        $gameSwitches.setValue(S_HIRED, true);
        $gameSwitches.setValue(S_DEAD, false);
        if ($.stage() !== 99) $.setStage(99, $.stage() > 0 ? 'logDone' : null);
        if ($gameVariables.value(V_COMPANION) !== keepCompanion) $gameVariables.setValue(V_COMPANION, keepCompanion);
        if ($gameVariables.value(V_STORY) !== keepStory) $gameVariables.setValue(V_STORY, keepStory);
        return true;
    };
    $.mentionList = function(mapId, m) {
        var list = [{code: 101, indent: 0, parameters: ['', 0, 0, 2]},
                    {code: 401, indent: 0, parameters: ['\\c[6][' + $.t('spk' + mapId) + ']\\c[0]']}];
        $.t(m.key).forEach(function(line) { list.push({code: 401, indent: 0, parameters: [line]}); });
        list.push({code: 0, indent: 0, parameters: []});
        return list;
    };

    // ------------------------------------------------------------------ hooks
    var _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _setup.apply(this, arguments);
        this._npYqArmed = true;
        try { $.sync(); } catch (e) { console.error(e); }
    };

    var _setupStarting = Game_Map.prototype.setupStartingEvent;
    Game_Map.prototype.setupStartingEvent = function() {
        if (_setupStarting.apply(this, arguments)) return true;
        if (!this._npYqArmed) return false;
        this._npYqArmed = false;
        try {
            if ($gamePlayer.isTransferring()) return false;
            var mapId = this.mapId();
            var m = $.pendingMention(mapId);
            if (!m) return false;
            var was = $.stage();
            $.setStage(m.stage, was === 0 ? 'logNew' : 'logUpd');
            this._interpreter.setup($.mentionList(mapId, m), 0);
            return true;
        } catch (e) { console.error(e); }
        return false;
    };

    var _terminate = Game_Interpreter.prototype.terminate;
    Game_Interpreter.prototype.terminate = function() {
        var main = $gameMap && this === $gameMap._interpreter && this._depth === 0 && this._list;
        var mapId = this._mapId, evId = this._eventId;
        _terminate.apply(this, arguments);
        if (!main) return;
        try {
            if (evId > 0) $gameMap._npYqArmed = true;
            if (gallery() || mapId !== $gameMap.mapId()) return;
            if (mapId === GUILD && evId === GUILD_EV) $.onGuildTalkEnd();
            else if (mapId === PORT && evId === RANSOM_EV) $.onRansomEnd();
            else if (evId > 0 && !$.pendingMention(mapId)) $.sync();
        } catch (e) { console.error(e); }
    };

    if (typeof Game_Event !== 'undefined') {
        var _meets = Game_Event.prototype.meetsConditions;
        Game_Event.prototype.meetsConditions = function(page) {
            var ok = _meets.apply(this, arguments);
            try {
                var mapId = this._mapId || ($gameMap && $gameMap.mapId());
                if (Number(mapId) !== PORT) return ok;
                return $.applyPortPage(this._eventId, page, ok);
            } catch (e) { console.error(e); }
            return ok;
        };
    }

    var ROW = {
  "ru": {
    "title": "Наёмник из таверны",
    "map_name": "Портовый город, западный край у воды",
    "client": "Слухи",
    "progress": "$progress1=Бродяга с копьём — в Портовом городе, у воды на западном краю. Сцена начинается сама, как только вы входите в порт. \\c[6][Портовый город]\\c[0]\n$progress2=Бродягу выручили. Он ищет отряд в Гильдии авантюристов — поговорите с ним и возьмите в спутники. \\c[6][Гильдия авантюристов, столица]\\c[0]\n$progress3=Вы ему отказали, но он всё ещё ждёт в Гильдии авантюристов. Передумаете — подойдите к нему снова. \\c[6][Гильдия авантюристов, столица]\\c[0]\n$progress4=Матросы увели бродягу отрабатывать долг. Его можно выкупить на причале за 200 серебра (со следующего дня). \\c[6][Портовый город, причал]\\c[0]\n$progress5=Выкуп не состоялся — бродяга всё ещё на причале. Принесите 200 серебра. \\c[6][Портовый город, причал]\\c[0]\n$progress99=Выполнено! \\c[2]Яризо\\c[0] — ваш спутник. Теперь он ждёт в таверне столицы.\n$progress100=Задание закрыто: бродяга погиб или пропал — нанять его больше нельзя.",
    "short_desc": "Найти бродягу с копьём в порту.",
    "long_desc": "Он в Портовом городе, у воды на западном краю. Сцена начинается сама, как только вы входите в порт."
  },
  "en": {
    "title": "The Tavern Mercenary",
    "map_name": "Port Town, west edge by the water",
    "client": "Rumors",
    "progress": "$progress1=The tramp with the spear is in Port Town, at the west edge by the water. The scene starts automatically when you enter the port. \\c[6][Port Town]\\c[0]\n$progress2=You got the tramp out of trouble. He is looking for a party at the Adventurers' Guild — talk to him and take him on as a companion. \\c[6][Adventurers' Guild, capital]\\c[0]\n$progress3=You turned him down, but he is still waiting at the Adventurers' Guild. If you change your mind, talk to him again. \\c[6][Adventurers' Guild, capital]\\c[0]\n$progress4=The sailors took the tramp away to work off his debt. You can buy him out at the pier for 200 silver (from the next day). \\c[6][Port Town, pier]\\c[0]\n$progress5=The ransom has not been paid — the tramp is still at the pier. Bring 200 silver. \\c[6][Port Town, pier]\\c[0]\n$progress99=Complete! \\c[2]Yarizo\\c[0] is your companion. He now waits at the capital's tavern.\n$progress100=Quest closed: the tramp is dead or gone — he can no longer be hired.",
    "short_desc": "Find the tramp with the spear in the port.",
    "long_desc": "He is in Port Town, at the west edge by the water. The scene starts automatically when you enter the port."
  }
};


    function parseProgressCell(cell) {
        var out = [];
        String(cell || '').split('\n').forEach(function(line) {
            var m = /^\$progress(\d+)=(.*)$/.exec(line);
            if (m) out.push([Number(m[1]), m[2]]);
        });
        return out;
    }
    function rowText(key) {
        var pack = $.isEn() && ROW.en ? ROW.en : ROW.ru;
        return pack[key] || (ROW.ru && ROW.ru[key]) || '';
    }
    // Vanilla 0.80j has no quest 201090. Add only this row in memory.
    // If nympri-ru (or anything else) already defined it, keep that row.
    function ensureQuest() {
        if (typeof $csvQuestList === 'undefined' || !$csvQuestList) return;
        if ($csvQuestList[QID]) return;
        var quest = {
            id: QID,
            var_id: VAR,
            difficulty: 2,
            map_id: 171,
            no_retire: true,
            release_conds: '$v[1] == 9999',
            rewards: [],
            _npYarizoBuiltin: true
        };
        ['title', 'map_name', 'client', 'short_desc', 'long_desc'].forEach(function(key) {
            Object.defineProperty(quest, key, {
                get: function() { return rowText(key); },
                enumerable: true
            });
        });
        Object.defineProperty(quest, 'progress', {
            get: function() { return parseProgressCell(rowText('progress')); },
            enumerable: true
        });
        $csvQuestList[QID] = quest;
    }
    $.ensureQuest = ensureQuest;

    // ------------------------------------------------------------------ journal: branch-aware progress
    // Progress lines come from QuestList.csv ($progressN = text of stage N);
    // shown in the order the stages actually happened.
    function wrapQuest() {
        if (typeof $csvQuestList === 'undefined' || !$csvQuestList) return;
        ensureQuest();
        var o = $csvQuestList[QID];
        if (!o || o._npYq) return;
        var w = Object.create(o);
        Object.defineProperty(w, '_npYq', {value: true});
        Object.defineProperty(w, 'progress', {get: function() { return $.buildProgress(o.progress); }});
        [['map_name', 'place'], ['short_desc', 'short'], ['long_desc', 'detail']].forEach(function(f) {
            Object.defineProperty(w, f[0], {get: function() { return $.stageText(f[1], o[f[0]]); }});
        });
        $csvQuestList[QID] = w;
    }
    $.wrapQuest = wrapQuest;
    // per-stage journal field; falls back to the CSV cell
    $.stageText = function(key, fallback) {
        var st = $.stage(), tb = $.t(key);
        if (!tb) return fallback;
        var v = tb[st];
        if (v === undefined && st > 0 && st < 99) v = tb[1];
        return v !== undefined ? v : fallback;
    };
    $.buildProgress = function(items) {
        var text = {};
        (items || []).forEach(function(it) { text[Number(it[0])] = it[1]; });
        var st = $.stage();
        var h = $.history().slice();
        if (!h.length || h[h.length - 1] !== st) h.push(st);
        var out = [];
        h.forEach(function(s) {
            if (s > 0 && s < 99 && (text[s] !== undefined || s === 1)) {
                var line = s === 1 && $.t('step1') ? $.t('step1') : text[s];
                if (line) out.push([1, line]);
            }
        });
        if (st >= 99) out.push([st, text[st] !== undefined ? text[st] : (text[99] || '')]);
        if (!out.length) out.push([1, text[1] || '']);
        return out;
    };
    if (typeof KNS_QuestBase !== 'undefined' && KNS_QuestBase.questProgressValue) {
        var _qpv = KNS_QuestBase.questProgressValue;
        KNS_QuestBase.questProgressValue = function(id) {
            if (Number(id) === QID) wrapQuest();
            return _qpv.apply(this, arguments);
        };
    }
    var _sceneCreate = Scene_Base.prototype.create;
    Scene_Base.prototype.create = function() {
        try { wrapQuest(); } catch (e) { console.error(e); }
        _sceneCreate.apply(this, arguments);
    };

    // ------------------------------------------------------------------ quest markers
    var QM = window.NP_QuestMarker;
    if (QM && Array.isArray(QM.TARGETS)) {
        QM.TARGETS.push(
            [VAR, 1, 1, {m: PORT, x: SPRITE_X, y: SPRITE_Y}],
            [VAR, 2, 3, {m: GUILD, e: GUILD_EV}],
            [VAR, 4, 5, {m: PORT, e: RANSOM_EV}]
        );
        if (typeof QM.collect === 'function') {
            var _collect = QM.collect;
            QM.collect = function(mapId) {
                if (gallery()) return [];
                var out = _collect.apply(this, arguments);
                // he is not in the guild while the party is solo (M13 ev45 page 4)
                if (mapId === GUILD && $gameParty.size() === 1) {
                    var st = $.stage();
                    if (st === 2 || st === 3) out = out.filter(function(p) { return p.ev !== GUILD_EV; });
                }
                return out;
            };
        }
    }

    if (typeof KNS_CsvReader !== 'undefined' && KNS_CsvReader.loadDatabase) {
        var _npYqLoad = KNS_CsvReader.loadDatabase;
        KNS_CsvReader.loadDatabase = function() {
            var result = _npYqLoad.apply(this, arguments);
            try { ensureQuest(); } catch (e) { console.error(e); }
            return result;
        };
    }
})(NP_YarizoQuest);
