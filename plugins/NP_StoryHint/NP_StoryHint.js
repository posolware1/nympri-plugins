var NP_L = window.NP_L || function(r) { return r; };
//=============================================================================
// NP_StoryHint.js
//=============================================================================
/*:
 * @plugindesc v1.0 Подсказка «Что дальше»: следующий шаг основной истории и конец контента 0.80j.
 * @author RU mod
 *
 * @help
 * На вкладке «Сюжет» журнала (NP_QuestTabs) сверху закреплена строка
 * «Что дальше» / "What's next". Текст берётся из встроенной таблицы шагов
 * Alpha 0.80j: первый подходящий шаг сверху вниз. Если вкладки журнала нет,
 * та же строка появляется в главном меню и открывает простое окно.
 * Окно подсказок, всплывающие советы и отдельные меню спутников не добавляются.
 * Выключается в настройках, раздел «Интерфейс», пункт «Что дальше». По умолчанию включено.
 * Таблица не читает сейв как код: в условиях только переменные и переключатели.
 * Файл карты не меняется. Встреча с Леоном у корабля и квест после экзамена,
 * который сам не стартует, здесь не чинятся — подсказка говорит об этом прямо.
 */
var Imported = Imported || {};
Imported.NP_StoryHint = true;
var NP_StoryHint = NP_StoryHint || {};

(function($) {
    'use strict';
    $.ROUTE = [
  {
    "id": "end_080j_poison",
    "condition": "$gameVariables.value(923) >= 28",
    "hint_ru": "Основная история версии 0.80j здесь заканчивается. Следующая сцена в этой версии не сделана. Побочные задания и свободная игра продолжаются.",
    "hint_en": "The main story of version 0.80j ends here. The next scene is not in this version. Side quests and free play continue.",
    "map_id": 264,
    "x": 41,
    "y": 19
  },
  {
    "id": "end_080j_iris",
    "condition": "$gameVariables.value(932) >= 4",
    "hint_ru": "Сюжетная линия Ирис в версии 0.80j здесь обрывается. Продолжение обещано в будущих версиях.",
    "hint_en": "Iris's story line stops here in version 0.80j. The rest is planned for a future version.",
    "map_id": 231,
    "x": 8,
    "y": 10
  },
  {
    "id": "end_080j_daddy",
    "condition": "$gameVariables.value(915) >= 14",
    "hint_ru": "Этот сюжетный эпизод в версии 0.80j обрывается в таверне города в пустоши. Продолжение ещё не сделано.",
    "hint_en": "This story episode stops here in version 0.80j, at the tavern in the wasteland town. The rest is not in this version.",
    "map_id": 86,
    "x": 19,
    "y": 9
  },
  {
    "id": "pp_slum_attack",
    "condition": "$gameVariables.value(923) >= 20 && $gameVariables.value(923) < 28",
    "hint_ru": "В трущобах столицы Либра началась стычка. Разберитесь с ней, затем снова идите в королевский замок.",
    "hint_en": "A fight has started in the slums of the royal capital of Libra. Deal with it, then return to the royal castle.",
    "map_id": 20,
    "x": 23,
    "y": 6
  },
  {
    "id": "pp_seer",
    "condition": "$gameVariables.value(923) >= 18 && $gameVariables.value(923) < 20",
    "hint_ru": "Найдите ясновидящую «Тысячеглазую» в трущобах столицы (хижина в трущобах).",
    "hint_en": "Find the seer called Thousand-Eyes in the slums of the royal capital (the hut in the slums).",
    "map_id": 265,
    "x": 7,
    "y": 5
  },
  {
    "id": "pp_castle",
    "condition": "$gameVariables.value(923) >= 16 && $gameVariables.value(923) < 18",
    "hint_ru": "Идите в королевский замок в столице Либра и поговорите там с людьми у трона.",
    "hint_en": "Go to the royal castle in the capital of Libra and talk to the people there.",
    "map_id": 264,
    "x": 41,
    "y": 19
  },
  {
    "id": "pp_report_capital",
    "condition": "$gameVariables.value(923) >= 15 && $gameVariables.value(923) < 16",
    "hint_ru": "Вернитесь в гильдию авантюристов в столице Либра (центральный район) и доложите о случившемся.",
    "hint_en": "Return to the Adventurer's Guild in the royal capital of Libra (central district) and make your report.",
    "map_id": 13,
    "x": 11,
    "y": 10
  },
  {
    "id": "pp_ruins",
    "condition": "$gameVariables.value(923) >= 5 && $gameVariables.value(923) < 15",
    "hint_ru": "Пройдите дальше по Кровавым руинам к югу от города в пустоши.",
    "hint_en": "Keep going through the Bloody Ruins, south of the wasteland town.",
    "map_id": 263,
    "x": 8,
    "y": 11
  },
  {
    "id": "pp_go_ruins",
    "condition": "$gameVariables.value(923) >= 3 && $gameVariables.value(923) < 5",
    "hint_ru": "Отправляйтесь в Кровавые руины к югу от города в пустоши.",
    "hint_en": "Head to the Bloody Ruins, south of the wasteland town.",
    "map_id": 263,
    "x": 8,
    "y": 11
  },
  {
    "id": "pp_slums_info",
    "condition": "$gameVariables.value(923) >= 1 && $gameVariables.value(923) < 3",
    "hint_ru": "Соберите сведения в трущобах города в пустоши.",
    "hint_en": "Gather information in the slums of the wasteland town.",
    "map_id": 85,
    "x": 67,
    "y": 19
  },
  {
    "id": "ts_report",
    "condition": "$gameVariables.value(922) >= 5 && $gameVariables.value(922) < 99",
    "hint_ru": "Вернитесь в отделение гильдии в городе в пустоши и доложите о разговоре с госпитальером.",
    "hint_en": "Return to the guild branch in the wasteland town and report what the Hospitaller told you.",
    "map_id": 246,
    "x": 9,
    "y": 13
  },
  {
    "id": "ts_hospitaller",
    "condition": "$gameVariables.value(922) >= 4 && $gameVariables.value(922) < 5",
    "hint_ru": "Идите в лагерь рыцарей-госпитальеров и поговорите с госпитальером.",
    "hint_en": "Go to the Hospital Knights' camp and talk to the Hospitaller.",
    "map_id": 249,
    "x": 16,
    "y": 8
  },
  {
    "id": "ts_guild",
    "condition": "$gameVariables.value(922) >= 3 && $gameVariables.value(922) < 4",
    "hint_ru": "В отделении гильдии в городе в пустоши спросите про недавние беды.",
    "hint_en": "At the guild branch in the wasteland town, ask about the recent trouble.",
    "map_id": 246,
    "x": 9,
    "y": 13
  },
  {
    "id": "ts_town",
    "condition": "$gameVariables.value(922) >= 2 && $gameVariables.value(922) < 3",
    "hint_ru": "Идите в город в пустоши (через Ступени Титана).",
    "hint_en": "Head to the wasteland town (through Titan's Step).",
    "map_id": 85,
    "x": 1,
    "y": 1
  },
  {
    "id": "ts_forest",
    "condition": "$gameVariables.value(922) >= 1 && $gameVariables.value(922) < 2",
    "hint_ru": "Пройдите через Южный лес (лес, ведущий на юг) к городу в пустоши.",
    "hint_en": "Travel through the Forest of the South toward the wasteland town.",
    "map_id": 241,
    "x": 28,
    "y": 67
  },
  {
    "id": "after_exam_south",
    "condition": "$gameSwitches.value(300) == true && $gameVariables.value(922) == 0 && $gameVariables.value(923) == 0 && $gameVariables.value(913) == 0",
    "hint_ru": "Разговор с мудрецом уже был. Следующий сюжетный квест в этой версии сам не начинается. Можно идти на юг: через Южный лес к городу в пустоши. Позже и эта линия оборвётся.",
    "hint_en": "You already spoke with the sage. The next official story quest does not start in this version. You can head south: through the Forest of the South to the wasteland town. That line also stops later.",
    "map_id": 241,
    "x": 28,
    "y": 67
  },
  {
    "id": "exam_quiet",
    "condition": "$gameSwitches.value(300) == true && $gameSwitches.value(301) == false",
    "hint_ru": "Зайдите вглубь Кладбища мечей.",
    "hint_en": "Go into the deep part of the Sword Graveyard.",
    "map_id": 189,
    "x": 16,
    "y": 6
  },
  {
    "id": "exam_sage",
    "condition": "$gameSwitches.value(299) == true && $gameSwitches.value(300) == false",
    "hint_ru": "Поговорите с мудрецом в его комнате наверху Башни Мудрости и Глупости.",
    "hint_en": "Talk to the sage in the room at the top of the Tower of Wisdom and Stupidity.",
    "map_id": 183,
    "x": 8,
    "y": 11
  },
  {
    "id": "exam_voice",
    "condition": "$gameSwitches.value(298) == true && $gameSwitches.value(299) == false",
    "hint_ru": "Внутри Башни Мудрости и Глупости найдите «Голос мудреца» и покажите свой значок авантюриста.",
    "hint_en": "Inside the Tower of Wisdom and Stupidity, find the Voice of the Sage and show your adventurer badge.",
    "map_id": 180,
    "x": 9,
    "y": 15
  },
  {
    "id": "exam_forest",
    "condition": "$gameSwitches.value(295) == true && $gameSwitches.value(298) == false",
    "hint_ru": "От пристани идите через лес и дойдите до входа в Башню Мудрости и Глупости.",
    "hint_en": "From the dock, go through the forest and reach the entrance of the Tower of Wisdom and Stupidity.",
    "map_id": 177,
    "x": 9,
    "y": 16
  },
  {
    "id": "exam_depart",
    "condition": "$gameSwitches.value(292) == true && $gameSwitches.value(295) == false",
    "hint_ru": "В портовом городе Шелл снова поговорите с Леоном у корабля, когда будете готовы плыть к башне.",
    "hint_en": "In Port Town Shell, talk to Leon by the ship again when you are ready to sail to the tower.",
    "map_id": 171,
    "x": 49,
    "y": 31
  },
  {
    "id": "ch2_after_ch1",
    "condition": "$gameVariables.value(911) >= 99 && $gameSwitches.value(292) == false && $gameSwitches.value(299) == false",
    "hint_ru": "Глава 1 закончилась. Дальше задумана поездка в портовый город Шелл: найти Леона у корабля и сдать экзамен на 2 звезды в Башне Мудрости и Глупости. В версии 0.80j Леон у корабля появляется только на первом шаге сюжета церкви, поэтому встреча может не начаться. Если его там нет, идите на юг через Южный лес к городу в пустоши.",
    "hint_en": "Chapter 1 is over. Next you are meant to go to Port Town Shell, find Leon by the ship, and take the 2-star exam at the Tower of Wisdom and Stupidity. In version 0.80j Leon by the ship only appears while the church quest is on its first step, so that meeting may never start. If he is not there, go south through the Forest of the South to the wasteland town.",
    "map_id": 171,
    "x": 49,
    "y": 31
  },
  {
    "id": "church_guild_finale",
    "condition": "$gameVariables.value(911) >= 6 && $gameVariables.value(911) < 99",
    "hint_ru": "Вернитесь в гильдию авантюристов в столице Либра (центральный район). Там будет разговор о случившемся.",
    "hint_en": "Return to the Adventurer's Guild in the royal capital of Libra (central district). A talk about what happened is waiting there.",
    "map_id": 13,
    "x": 11,
    "y": 10
  },
  {
    "id": "church_boss",
    "condition": "$gameVariables.value(911) >= 5 && $gameVariables.value(911) < 6",
    "hint_ru": "В заброшенной церкви разберитесь с таинственной женщиной.",
    "hint_en": "In the abandoned church, deal with the mysterious woman.",
    "map_id": 161,
    "x": 12,
    "y": 16
  },
  {
    "id": "church_inside",
    "condition": "$gameVariables.value(911) >= 4 && $gameVariables.value(911) < 5",
    "hint_ru": "Осмотритесь в заброшенной церкви и поищите Салли.",
    "hint_en": "Look around the abandoned church and search for Sally.",
    "map_id": 161,
    "x": 12,
    "y": 16
  },
  {
    "id": "church_entry",
    "condition": "$gameVariables.value(911) >= 2 && $gameVariables.value(911) < 4",
    "hint_ru": "В лесу с заброшенной церковью найдите путь внутрь. Проверьте старый колодец у церкви.",
    "hint_en": "In the forest with the abandoned church, find a way inside. Check the old well by the church.",
    "map_id": 197,
    "x": 62,
    "y": 5
  },
  {
    "id": "church_michael",
    "condition": "$gameVariables.value(911) >= 1 && $gameVariables.value(911) < 2",
    "hint_ru": "В лесу с заброшенной церковью найдите Михаэля.",
    "hint_en": "In the forest with the abandoned church, look for Michael.",
    "map_id": 197,
    "x": 57,
    "y": 8
  },
  {
    "id": "supply_escort",
    "condition": "$gameVariables.value(910) >= 6 && $gameVariables.value(910) < 99",
    "hint_ru": "Отведите девочку обратно в деревню у торгового пути.",
    "hint_en": "Escort the girl back to the village on the trade route.",
    "map_id": 65,
    "x": 12,
    "y": 9
  },
  {
    "id": "supply_cave",
    "condition": "$gameVariables.value(910) >= 5 && $gameVariables.value(910) < 6",
    "hint_ru": "Зайдите в пещеру-убежище в лесу с заброшенной церковью и продолжите поиски.",
    "hint_en": "Enter the cave hideout in the forest with the abandoned church and keep searching.",
    "map_id": 200,
    "x": 11,
    "y": 3
  },
  {
    "id": "supply_girl",
    "condition": "$gameVariables.value(910) >= 4 && $gameVariables.value(910) < 5",
    "hint_ru": "В лесу с заброшенной церковью найдите потерявшуюся девочку.",
    "hint_en": "In the forest with the abandoned church, search for the lost girl.",
    "map_id": 197,
    "x": 37,
    "y": 59
  },
  {
    "id": "supply_deliver",
    "condition": "$gameVariables.value(910) >= 3 && $gameVariables.value(910) < 4",
    "hint_ru": "Отнесите припасы указанному жителю в деревне у торгового пути.",
    "hint_en": "Deliver the supplies to the named villager in the village on the trade route.",
    "map_id": 65,
    "x": 12,
    "y": 9
  },
  {
    "id": "supply_pickup",
    "condition": "$gameVariables.value(910) >= 1 && $gameVariables.value(910) < 3",
    "hint_ru": "На торговой улице столицы Либра заберите посылку у солдата.",
    "hint_en": "On the market street of the royal capital of Libra, pick up the package from the soldier.",
    "map_id": 10,
    "x": 3,
    "y": 16
  },
  {
    "id": "cult_inn",
    "condition": "$gameVariables.value(908) >= 21 && $gameVariables.value(908) < 99",
    "hint_ru": "Разберитесь с тем, что происходит на постоялом дворе культа, и выведите людей.",
    "hint_en": "Deal with what is happening at the cult's inn and get the people out.",
    "map_id": 343,
    "x": 1,
    "y": 1
  },
  {
    "id": "cult_under",
    "condition": "$gameVariables.value(908) >= 13 && $gameVariables.value(908) < 21",
    "hint_ru": "Обыщите скрытое подземелье под заброшенным храмом.",
    "hint_en": "Search the hidden area under the abandoned temple.",
    "map_id": 341,
    "x": 25,
    "y": 21
  },
  {
    "id": "cult_rooms",
    "condition": "$gameVariables.value(908) >= 11 && $gameVariables.value(908) < 13",
    "hint_ru": "Обыщите комнаты заброшенного храма.",
    "hint_en": "Search the rooms of the abandoned temple.",
    "map_id": 341,
    "x": 25,
    "y": 21
  },
  {
    "id": "cult_temple",
    "condition": "$gameVariables.value(908) >= 3 && $gameVariables.value(908) < 11",
    "hint_ru": "Идите через заброшенный храм культа нимф.",
    "hint_en": "Go through the abandoned temple of the Nymph Cult.",
    "map_id": 341,
    "x": 1,
    "y": 1
  },
  {
    "id": "cult_meet",
    "condition": "$gameVariables.value(908) >= 1 && $gameVariables.value(908) < 3",
    "hint_ru": "В деревне у торгового пути встретьтесь с Леоном и остальными.",
    "hint_en": "In the village on the trade route, meet up with Leon and the others.",
    "map_id": 65,
    "x": 12,
    "y": 30
  },
  {
    "id": "goblin_village",
    "condition": "$gameVariables.value(906) >= 27 && $gameVariables.value(906) < 99",
    "hint_ru": "Защитите деревню: отбейте нападение и разберитесь с огромным врагом.",
    "hint_en": "Protect the village: drive off the attack and deal with the big enemy.",
    "map_id": 340,
    "x": 1,
    "y": 1
  },
  {
    "id": "goblin_nest",
    "condition": "$gameVariables.value(906) >= 2 && $gameVariables.value(906) < 27",
    "hint_ru": "Пройдите через логово гоблинов и двигайтесь вглубь.",
    "hint_en": "Go through the goblin nest and keep advancing.",
    "map_id": 339,
    "x": 17,
    "y": 18
  },
  {
    "id": "goblin_start",
    "condition": "$gameVariables.value(906) >= 1 && $gameVariables.value(906) < 2",
    "hint_ru": "Сначала загляните в лазарет церкви в центральном районе столицы и поговорите с Михаэлем. Потом, когда слава дойдёт до 30, в гильдии вступите в операцию. В отряде должны быть и вы, и Кохаку.",
    "hint_en": "First visit the church infirmary in the central district of the capital and talk to Michael. Then, when your fame reaches 30, join the operation at the guild. Both you and Kohaku need to be in the party.",
    "map_id": 156,
    "x": 3,
    "y": 8
  },
  {
    "id": "prayer_report",
    "condition": "$gameVariables.value(905) >= 7 && $gameVariables.value(905) < 99",
    "hint_ru": "Доложите о поисках в гильдии авантюристов в столице Либра.",
    "hint_en": "Report the search to the Adventurer's Guild in the royal capital of Libra.",
    "map_id": 13,
    "x": 11,
    "y": 10
  },
  {
    "id": "prayer_room",
    "condition": "$gameVariables.value(905) >= 3 && $gameVariables.value(905) < 7",
    "hint_ru": "Обыщите комнату Таку-тяна в глубине 1-го яруса канализации столицы.",
    "hint_en": "Search Taku-chan's room, deep on the first level of the capital sewers.",
    "map_id": 152,
    "x": 33,
    "y": 48
  },
  {
    "id": "prayer_deeper",
    "condition": "$gameVariables.value(905) >= 2 && $gameVariables.value(905) < 3",
    "hint_ru": "В 1-м ярусе канализации столицы идите дальше из комнаты с железной решёткой.",
    "hint_en": "On the first level of the capital sewers, go deeper from the room with the iron grate.",
    "map_id": 152,
    "x": 33,
    "y": 48
  },
  {
    "id": "prayer_client",
    "condition": "$gameVariables.value(905) >= 1 && $gameVariables.value(905) < 2",
    "hint_ru": "У входа в столицу Либра выслушайте заказчика (бездомного).",
    "hint_en": "At the entrance of the royal capital of Libra, listen to the client (the homeless man).",
    "map_id": 96,
    "x": 10,
    "y": 2
  },
  {
    "id": "train_do",
    "condition": "$gameVariables.value(904) >= 3 && $gameVariables.value(904) < 99",
    "hint_ru": "Закончите тренировку новичков при гильдии авантюристов в столице.",
    "hint_en": "Finish the newbie training at the Adventurer's Guild in the capital.",
    "map_id": 336,
    "x": 1,
    "y": 1
  },
  {
    "id": "train_ready",
    "condition": "$gameVariables.value(904) == 2 && $gameVariables.value(322) >= 10",
    "hint_ru": "Поговорите с администратором гильдии в столице Либра и начните тренировку новичков.",
    "hint_en": "Talk to the guild receptionist in the royal capital of Libra and start the newbie training.",
    "map_id": 13,
    "x": 11,
    "y": 10
  },
  {
    "id": "train_fame",
    "condition": "$gameVariables.value(904) >= 1 && $gameVariables.value(904) <= 2 && $gameVariables.value(322) < 10",
    "hint_ru": "Поднимите славу до 10 и поговорите с администратором гильдии в столице, чтобы начать тренировку.",
    "hint_en": "Raise your fame to 10, then talk to the guild receptionist in the capital to start the training.",
    "map_id": 13,
    "x": 11,
    "y": 10
  },
  {
    "id": "sewer_report",
    "condition": "$gameVariables.value(903) >= 5 && $gameVariables.value(903) < 99",
    "hint_ru": "Доложите о канализации в гильдии авантюристов в столице Либра.",
    "hint_en": "Report the sewer job to the Adventurer's Guild in the royal capital of Libra.",
    "map_id": 13,
    "x": 11,
    "y": 10
  },
  {
    "id": "sewer_drain",
    "condition": "$gameVariables.value(903) >= 2 && $gameVariables.value(903) < 5",
    "hint_ru": "Спуститесь в канализацию у входа в столицу и дойдите до стока в глубине 1-го яруса (перекрёсток).",
    "hint_en": "Go down into the sewers near the capital entrance and reach the drain deep on the first level (the crossroads).",
    "map_id": 117,
    "x": 15,
    "y": 15
  },
  {
    "id": "sewer_accept",
    "condition": "$gameVariables.value(903) >= 1 && $gameVariables.value(903) < 2",
    "hint_ru": "Поговорите с администратором гильдии авантюристов в столице Либра (центральный район).",
    "hint_en": "Talk to the Adventurer's Guild receptionist in the royal capital of Libra (central district).",
    "map_id": 13,
    "x": 11,
    "y": 10
  },
  {
    "id": "arrive_guild",
    "condition": "$gameVariables.value(902) >= 99 && $gameVariables.value(903) == 0",
    "hint_ru": "Идите в гильдию авантюристов в центральном районе столицы Либра и зарегистрируйтесь как отряд.",
    "hint_en": "Go to the Adventurer's Guild in the central district of the royal capital of Libra and register your party.",
    "map_id": 13,
    "x": 11,
    "y": 10
  },
  {
    "id": "ruins_out",
    "condition": "$gameVariables.value(902) >= 4 && $gameVariables.value(902) < 99",
    "hint_ru": "Выберитесь из руин наружу.",
    "hint_en": "Escape from the ruins to the outside.",
    "map_id": 333,
    "x": 61,
    "y": 11
  },
  {
    "id": "ruins_room",
    "condition": "$gameVariables.value(902) >= 1 && $gameVariables.value(902) < 4",
    "hint_ru": "Найдите способ выбраться из комнаты в руинах.",
    "hint_en": "Find a way out of the room in the ruins.",
    "map_id": 333,
    "x": 1,
    "y": 1
  }
];

    $.START = {
        id: 'start',
        hint_ru: 'Найдите способ выбраться из комнаты в руинах.',
        hint_en: 'Find a way out of the room in the ruins.',
        map_id: 333,
        x: 1,
        y: 1
    };

    function skip(s, i) {
        while (s.charAt(i) === ' ' || s.charAt(i) === '\t') i++;
        return i;
    }
    function parseIntToken(s, i) {
        i = skip(s, i);
        var start = i;
        if (s.charAt(i) === '-') i++;
        if (s.charAt(i) < '0' || s.charAt(i) > '9') throw new Error('number');
        while (s.charAt(i) >= '0' && s.charAt(i) <= '9') i++;
        return { v: Number(s.slice(start, i)), i: i };
    }
    function identEnd(s, i) {
        var c = s.charAt(i);
        return !c || !(/[A-Za-z0-9_]/.test(c));
    }
    // Only the embedded table is parsed. Player saves are not executed.
    function parseAtom(s, i, readVar, readSw) {
        i = skip(s, i);
        var vkey = '$gameVariables.value(';
        var skey = '$gameSwitches.value(';
        if (s.slice(i, i + vkey.length) === vkey) {
            i += vkey.length;
            var num = parseIntToken(s, i);
            i = skip(s, num.i);
            if (s.charAt(i) !== ')') throw new Error('paren');
            var value = Number(readVar(num.v));
            if (!isFinite(value)) throw new Error('variable');
            return { v: value, i: i + 1 };
        }
        if (s.slice(i, i + skey.length) === skey) {
            i += skey.length;
            var sw = parseIntToken(s, i);
            i = skip(s, sw.i);
            if (s.charAt(i) !== ')') throw new Error('paren');
            return { v: !!readSw(sw.v), i: i + 1 };
        }
        if (s.slice(i, i + 4) === 'true' && identEnd(s, i + 4)) return { v: true, i: i + 4 };
        if (s.slice(i, i + 5) === 'false' && identEnd(s, i + 5)) return { v: false, i: i + 5 };
        var n = parseIntToken(s, i);
        return n;
    }
    function parseCmp(s, i, readVar, readSw) {
        var left = parseAtom(s, i, readVar, readSw);
        i = skip(s, left.i);
        var ops = ['>=', '<=', '==', '!=', '>', '<'];
        var op = '';
        for (var k = 0; k < ops.length; k++) {
            if (s.slice(i, i + ops[k].length) === ops[k]) { op = ops[k]; i += op.length; break; }
        }
        if (!op) return { v: left.v, i: i };
        var right = parseAtom(s, i, readVar, readSw);
        var a = left.v, b = right.v, out;
        if (op === '>=') out = a >= b;
        else if (op === '<=') out = a <= b;
        else if (op === '>') out = a > b;
        else if (op === '<') out = a < b;
        else if (op === '==') out = a === b;
        else if (op === '!=') out = a !== b;
        else throw new Error('op');
        return { v: out, i: right.i };
    }
    function parseAnd(s, i, readVar, readSw) {
        var cur = parseCmp(s, i, readVar, readSw);
        i = skip(s, cur.i);
        var value = !!cur.v;
        while (s.slice(i, i + 2) === '&&') {
            i += 2;
            cur = parseCmp(s, i, readVar, readSw);
            value = value && !!cur.v;
            i = skip(s, cur.i);
        }
        return { v: value, i: i };
    }
    $.evalCondition = function(source, readVar, readSw) {
        var s = String(source || '');
        var parsed = parseAnd(s, 0, readVar, readSw);
        var end = skip(s, parsed.i);
        if (end !== s.length) throw new Error('tail');
        return !!parsed.v;
    };
    $.firstMatch = function(steps, readVar, readSw) {
        var list = steps || [];
        for (var i = 0; i < list.length; i++) {
            try {
                if ($.evalCondition(list[i].condition, readVar, readSw)) return list[i];
            } catch (e) { /* a broken row is skipped; the next one is tried */ }
        }
        return null;
    };
    $.readVar = function(id) {
        try { return $gameVariables ? $gameVariables.value(id) : 0; } catch (e) { return 0; }
    };
    $.readSw = function(id) {
        try { return $gameSwitches ? !!$gameSwitches.value(id) : false; } catch (e) { return false; }
    };
    $.isEn = function() {
        var L = window.NP_Language;
        return !!(L && typeof L.isEn === 'function' && L.isEn());
    };
    $.textOf = function(step) {
        if (!step) return '';
        return $.isEn() ? step.hint_en : step.hint_ru;
    };
    $.title = function() { return $.isEn() ? "What's next" : 'Что дальше'; };
    $.optionLabel = function() { return $.isEn() ? "What's next" : 'Что дальше'; };
    $.isEnabled = function() {
        if (typeof ConfigManager === 'undefined' || ConfigManager.npStoryHint === undefined) return true;
        return ConfigManager.npStoryHint !== false;
    };
    $.currentStep = function(readVar, readSw) {
        var hit = $.firstMatch($.ROUTE, readVar || $.readVar, readSw || $.readSw);
        return hit || $.START;
    };
    // category 0 is the Story tab. Omit the category to ask for the menu text.
    $.hintBlock = function(categoryId) {
        if (!$.isEnabled()) return null;
        if (categoryId !== undefined && categoryId !== null && Number(categoryId) !== 0) return null;
        var step = $.currentStep();
        if (!step) return null;
        return { id: step.id, title: $.title(), text: $.textOf(step), map_id: step.map_id, x: step.x, y: step.y };
    };
    $.wrap = function(text, width, measure) {
        measure = measure || function(s) { return String(s).length; };
        var words = String(text || '').split(/\s+/), lines = [], cur = '';
        words.forEach(function(word) {
            if (!word) return;
            var next = cur ? cur + ' ' + word : word;
            if (cur && measure(next) > width) { lines.push(cur); cur = word; } else cur = next;
        });
        if (cur) lines.push(cur);
        return lines;
    };
    $.placement = function() {
        return (typeof Window_NpQuestTabList === 'function') ? 'journal' : 'menu';
    };

    if (typeof ConfigManager !== 'undefined') {
        ConfigManager.npStoryHint = true;
        var _make = ConfigManager.makeData;
        ConfigManager.makeData = function() {
            var c = _make.apply(this, arguments);
            c.npStoryHint = this.npStoryHint;
            return c;
        };
        var _apply = ConfigManager.applyData;
        ConfigManager.applyData = function(c) {
            _apply.apply(this, arguments);
            this.npStoryHint = !(c && c.npStoryHint === false);
        };
    }
    if (typeof Window_Options !== 'undefined' && Window_Options.prototype.addGeneralOptions) {
        var _addOpt = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addOpt.apply(this, arguments);
            this.addCommand($.optionLabel(), 'npStoryHint');
        };
    }

    function hintPixels(win) {
        if (!win || Number(win._categoryId) !== 0 || !$.isEnabled()) return 0;
        var block = $.hintBlock(0);
        if (!block || !block.text) return 0;
        var width = 240;
        try { width = Math.max(40, win.contentsWidth() - 12); } catch (e) { width = 240; }
        var measure = function(s) {
            try { return win.textWidth(s); } catch (e2) { return String(s).length * 8; }
        };
        win._npStoryTitle = block.title;
        win._npStoryLines = $.wrap(block.text, width, measure);
        var lh = 36;
        try { lh = win.lineHeight(); } catch (e3) { lh = 36; }
        return (win._npStoryLines.length + 1) * lh + 8;
    }
    $.drawHint = function(win) {
        var px = win._npStoryPx || 0;
        if (!px || !win.contents) return;
        var w = 200;
        try { w = win.contentsWidth(); } catch (e) { w = win.contents.width || 200; }
        if (win.contents.clearRect) win.contents.clearRect(0, 0, w, px);
        try { win.changeTextColor(win.systemColor()); } catch (e2) {}
        win.drawText(win._npStoryTitle || $.title(), 4, 0, Math.max(20, w - 8));
        try { win.resetTextColor(); } catch (e3) {}
        var y = 36;
        try { y = win.lineHeight(); } catch (e4) { y = 36; }
        var step = y;
        (win._npStoryLines || []).forEach(function(line) {
            win.drawText(line, 4, y, Math.max(20, w - 8));
            y += step;
        });
    };

    if (typeof Window_NpQuestTabList === 'function') {
        var _refresh = Window_NpQuestTabList.prototype.refresh;
        Window_NpQuestTabList.prototype.refresh = function() {
            this._npStoryPx = hintPixels(this);
            if (typeof _refresh === 'function') _refresh.call(this);
            try { $.drawHint(this); } catch (e) { console.error(e); }
        };
        var _itemRect = Window_NpQuestTabList.prototype.itemRect;
        if (typeof _itemRect === 'function') {
            Window_NpQuestTabList.prototype.itemRect = function(index) {
                var rect = _itemRect.call(this, index);
                if (this._npStoryPx) rect.y += this._npStoryPx;
                return rect;
            };
        }
        var _contentsHeight = Window_NpQuestTabList.prototype.contentsHeight;
        if (typeof _contentsHeight === 'function') {
            Window_NpQuestTabList.prototype.contentsHeight = function() {
                return _contentsHeight.call(this) + (this._npStoryPx || 0);
            };
        }
        $.installed = 'journal';
    } else if (typeof Window_MenuCommand !== 'undefined' && Window_MenuCommand.prototype.addOriginalCommands) {
        var _addMenu = Window_MenuCommand.prototype.addOriginalCommands;
        Window_MenuCommand.prototype.addOriginalCommands = function() {
            _addMenu.apply(this, arguments);
            if ($.isEnabled()) this.addCommand($.title(), 'npStoryHint', true);
        };
        if (typeof Scene_Menu !== 'undefined' && Scene_Menu.prototype.createCommandWindow) {
            var _createCmd = Scene_Menu.prototype.createCommandWindow;
            Scene_Menu.prototype.createCommandWindow = function() {
                _createCmd.apply(this, arguments);
                if (this._commandWindow) this._commandWindow.setHandler('npStoryHint', this.commandNpStoryHint.bind(this));
            };
            Scene_Menu.prototype.commandNpStoryHint = function() {
                SceneManager.push(Scene_NpStoryHint);
            };
        }
        $.installed = 'menu';
    } else {
        $.installed = 'logic';
    }

    function Window_NpStoryHintPage() { this.initialize.apply(this, arguments); }
    if (typeof Window_Base !== 'undefined') {
        Window_NpStoryHintPage.prototype = Object.create(Window_Base.prototype);
        Window_NpStoryHintPage.prototype.constructor = Window_NpStoryHintPage;
        Window_NpStoryHintPage.prototype.initialize = function(x, y, w, h) {
            Window_Base.prototype.initialize.call(this, x, y, w, h);
            this.refresh();
        };
        Window_NpStoryHintPage.prototype.refresh = function() {
            if (this.contents && this.contents.clear) this.contents.clear();
            var block = $.hintBlock(undefined);
            if (!block) return;
            try { this.changeTextColor(this.systemColor()); } catch (e) {}
            this.drawText(block.title, 0, 0, this.contentsWidth(), 'center');
            try { this.resetTextColor(); } catch (e2) {}
            var width = Math.max(40, this.contentsWidth() - 8);
            var lines = $.wrap(block.text, width, this.textWidth ? this.textWidth.bind(this) : null);
            var y = this.lineHeight() + 8;
            for (var i = 0; i < lines.length; i++) {
                this.drawText(lines[i], 0, y, width);
                y += this.lineHeight();
            }
        };
        window.Window_NpStoryHintPage = Window_NpStoryHintPage;
    }
    function Scene_NpStoryHint() { this.initialize.apply(this, arguments); }
    if (typeof Scene_MenuBase !== 'undefined') {
        Scene_NpStoryHint.prototype = Object.create(Scene_MenuBase.prototype);
        Scene_NpStoryHint.prototype.constructor = Scene_NpStoryHint;
        Scene_NpStoryHint.prototype.create = function() {
            Scene_MenuBase.prototype.create.call(this);
            var w = Graphics.boxWidth - 80;
            var h = Graphics.boxHeight - 120;
            this._npHint = new Window_NpStoryHintPage(40, 60, w, h);
            this.addWindow(this._npHint);
        };
        Scene_NpStoryHint.prototype.update = function() {
            Scene_MenuBase.prototype.update.call(this);
            var cancel = false;
            try { cancel = Input.isTriggered('cancel') || (TouchInput.isCancelled && TouchInput.isCancelled()); } catch (e) { cancel = false; }
            if (cancel) {
                try { SoundManager.playCancel(); } catch (e2) {}
                SceneManager.pop();
            }
        };
        window.Scene_NpStoryHint = Scene_NpStoryHint;
    }
})(NP_StoryHint);
