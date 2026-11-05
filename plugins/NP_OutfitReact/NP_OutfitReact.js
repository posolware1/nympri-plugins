var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_OutfitReact.js
//=============================================================================
/*:
 * @plugindesc v1.0 Яризо реагирует на купальник/откровенный наряд жрицы (слайд-реплика + её смущённый ответ).
 * @author NP RU
 *
 * @param Enabled
 * @desc Включено по умолчанию (true/false)
 * @default true
 *
 * @param Option Label
 * @desc Название пункта в Настройках (пусто = не добавлять)
 * @default Реплики про одежду
 *
 * @param Transfer Chance
 * @desc Шанс реплики при переходе на другую карту (0..1)
 * @default 0.3
 *
 * @param Cooldown Seconds
 * @desc Минимум секунд игрового времени между репликами
 * @default 120
 *
 * @param Cooldown Steps
 * @desc Минимум шагов между репликами (для переходов между картами)
 * @default 150
 *
 * @param Equip Cooldown Seconds
 * @desc Минимум секунд между репликами при переодевании
 * @default 20
 *
 * @param Voice Volume
 * @desc Громкость вздоха (NP_Voice, пул gasp). 0 = без звука
 * @default 60
 *
 * @help
 * Когда жрица (актёр 2) в купальнике или откровенном наряде, Яризо (актёр 21)
 * иногда отпускает реплику, а она отвечает; её портрет в слайде — с румянцем.
 * Показ через штатные слайды KNS_SlideShow (как «болтовня в пути» CE451).
 *
 * Когда срабатывает:
 *  - после переодевания (наряд стал купальником/откровенным) — сразу по
 *    возвращении на карту, кулдаун «Equip Cooldown Seconds»;
 *  - при переходе на другую карту — с шансом «Transfer Chance», если прошло
 *    не меньше «Cooldown Seconds» и «Cooldown Steps».
 * Только на обычной карте, когда игрок может ходить: не в бою (S14), не во
 * время событий/сообщений/сцен, не в галерее (S5/S192), не на карте мира.
 *
 * Условия Яризо: S643 (контракт) ВКЛ, S503 (мёртв) и S2040 (увели в порту)
 * ВЫКЛ, актёр 21 в отряде и жив. Иначе плагин молчит. Жрица в отряде и жива.
 * Герой (актёр 1) в отряде → только комплименты/двусмысленности.
 * Без героя → грубее, по стадии: V204 0-1 → 0 (возмущается), 2 → 1 (смущается),
 * 3 → 2 (довольна), 4-5 → 3 (сама напрашивается); без S32 стадия максимум 1.
 *
 * Скрипт: NP_OutfitReact.kind() / .canTalk() / .trigger(force)
 */
var Imported = Imported || {};
Imported.NP_OutfitReact = true;
var NP_OutfitReact = NP_OutfitReact || {};

(function($) {
    'use strict';
    var params = PluginManager.parameters('NP_OutfitReact');
    var P = {
        enabled: String(params['Enabled'] || 'true') !== 'false',
        optionLabel: params['Option Label'] !== undefined ? String(params['Option Label']) : NP_L('Реплики про одежду', "Outfit comments"),
        chance: Number(params['Transfer Chance'] !== undefined && params['Transfer Chance'] !== '' ? params['Transfer Chance'] : 0.3),
        cdSec: Number(params['Cooldown Seconds'] || 120),
        cdSteps: Number(params['Cooldown Steps'] || 150),
        eqSec: Number(params['Equip Cooldown Seconds'] || 20),
        voiceVol: Number(params['Voice Volume'] !== undefined && params['Voice Volume'] !== '' ? params['Voice Volume'] : 60)
    };
    $.params = P;

    var PRI = 2, HERO = 1, YARIZO = 21;
    var S_GALLERY = 5, S_BATTLE = 14, S_NTR = 32, S_EMERG = 56, S_PATCHVIEW = 192, S_STORY = 222,
        S_YDEAD = 503, S_CONTRACT = 643, S_YGONE = 2040, V_BOND = 204;
    var WORLD_MAP = 3;
    // Слоты экипировки жрицы: [1] наряд, [2] голова, [3] колготки, [4] бельё
    var SWIM_IDS = [120, 121, 122];                 // микробикини, обычный купальник, коровье бикини
    var REVEAL_COSTUMES = [85, 86, 88, 89];         // бани-костюм, наряд танцовщицы, платье/одежда рабыни
    var HATS = [92, 93, 94, 95, 98, 99];             // для иконки румянца
    $.SWIM_IDS = SWIM_IDS; $.REVEAL_COSTUMES = REVEAL_COSTUMES;

    function gv(id) { return (typeof $gameVariables !== 'undefined' && $gameVariables) ? (Number($gameVariables.value(id)) || 0) : 0; }
    function gs(id) { return (typeof $gameSwitches !== 'undefined' && $gameSwitches) ? !!$gameSwitches.value(id) : false; }
    function members() { try { return ($gameParty && $gameParty.members()) || []; } catch (e) { return []; } }
    function memberById(id) {
        var m = members();
        for (var i = 0; i < m.length; i++) if (m[i] && m[i].actorId() === id) return m[i];
        return null;
    }
    function alive(a) { return !!a && !(a.isDead && a.isDead()) && !(a.hp !== undefined && a.hp <= 0); }

    // ---------------------------------------------------------------------
    // Что на ней надето
    // ---------------------------------------------------------------------
    $.kind = function() {
        var pri = memberById(PRI);
        if (!pri) return null;
        var eq = pri.equips ? pri.equips() : [];
        var costume = eq[1], under = eq[4];
        if (costume) return REVEAL_COSTUMES.indexOf(costume.id) >= 0 ? 'reveal' : null;
        if (!under) return null; // голая — это обрабатывает сама игра (CE24)
        if (SWIM_IDS.indexOf(under.id) >= 0 || String(under.note || '').indexOf('水着') >= 0) return 'swim';
        return 'reveal'; // одно бельё: стринги, бельё, лаковое боди, бикини танцовщицы, пояса
    };
    $.signature = function() {
        var pri = memberById(PRI);
        if (!pri || !pri.equips) return '';
        var eq = pri.equips();
        return [1, 4].map(function(i) { return eq[i] ? eq[i].id : 0; }).join('/');
    };

    // ---------------------------------------------------------------------
    // Условия
    // ---------------------------------------------------------------------
    $.yarizoAvailable = function() {
        if (!gs(S_CONTRACT) || gs(S_YDEAD) || gs(S_YGONE)) return false;
        return alive(memberById(YARIZO));
    };
    $.heroPresent = function() { return !!memberById(HERO); };
    $.stage = function() {
        var lvl = Math.max(0, Math.min(5, Math.floor(gv(V_BOND))));
        // как в дневнике (V204), но контракт сам по себе не поднимает до 1:
        // контракт есть у любого Яризо в отряде, а стадия 0 = «возмущается»
        var st = lvl >= 4 ? 3 : lvl >= 3 ? 2 : lvl >= 2 ? 1 : 0;
        if (!gs(S_NTR)) st = Math.min(st, 1);
        return st;
    };
    $.isEnabled = function() { return !!ConfigManager.npOutfitTalk; };
    // Можно ли вообще говорить про одежду (без учёта карты/событий)
    $.canTalk = function() {
        if (!$.isEnabled()) return false;
        if (gs(S_GALLERY) || gs(S_PATCHVIEW) || gs(S_BATTLE) || gs(S_EMERG)) return false;
        if (!gs(S_STORY)) return false;
        if (typeof $gameParty !== 'undefined' && $gameParty && $gameParty.inBattle && $gameParty.inBattle()) return false;
        if (!alive(memberById(PRI))) return false;
        if (!$.yarizoAvailable()) return false;
        return !!$.kind();
    };
    // Свободна ли карта прямо сейчас
    $.mapFree = function() {
        if (typeof SceneManager === 'undefined' || !(SceneManager._scene instanceof Scene_Map)) return false;
        if (SceneManager.isSceneChanging && SceneManager.isSceneChanging()) return false;
        if (!$gameMap || $gameMap.mapId() === WORLD_MAP) return false;
        if ($gameMap.isEventRunning() || $gameMessage.isBusy()) return false;
        if ($gameTemp.isCommonEventReserved && $gameTemp.isCommonEventReserved()) return false;
        if ($gamePlayer.isTransferring() || !$gamePlayer.canMove()) return false;
        if ($gameScreen && $gameScreen.brightness && $gameScreen.brightness() < 255) return false;
        return true;
    };

    // ---------------------------------------------------------------------
    // Реплики: [Яризо, её ответ]
    // ---------------------------------------------------------------------
    var L = {
        // ===== герой рядом: только комплименты, двусмысленно =====
        swim_h0: [
            [NP_L('Ого, хозяюшка! На пляж можно больше не смотреть — всё лучшее уже тут.', "Whoa, Miss! No need to look at the beach anymore, the best view's right here."), NP_L('Ч-что?.. Спасибо... наверное.', "Wh-what...? Thank you... I think.")],
            [NP_L('Приятель, ну тебе и повезло. Такой красоте само солнце завидует.', "Buddy, you're one lucky guy. Even the sun's jealous of a beauty like that."), NP_L('Яризо! Не говори так при \\N[1]...', "Yarizo! Don't say things like that in front of \\N[1]...")],
            [NP_L('Купальничек-то прямо по фигуре. Все достоинства... подчёркивает.', "That swimsuit fits ya just right. Shows off all your... assets."), NP_L('Э-это просто купальник! Самый обычный!', "I-It's just a swimsuit! A perfectly ordinary one!")],
            [NP_L('У воды осторожнее, хозяюшка. Волной может и унести... кое-что.', "Careful by the water, Miss. A wave might carry off... a thing or two."), NP_L('Я... я буду держаться рядом с \\N[1]!', "I... I'll stay close to \\N[1]!")],
            [NP_L('Вот это я понимаю — дары богини. Щедрые такие дары.', "Now those are what I call gifts from the goddess. Real generous gifts."), NP_L('Не впутывай сюда богиню!..', "Leave the goddess out of this!")]
        ],
        swim_h1: [
            [NP_L('Хозяюшка сегодня загляденье. Приятель, береги её. Я тоже присмотрю.', "Miss is a sight for sore eyes today. Buddy, take good care of her. I'll keep an eye on her too."), NP_L('(шёпотом) Не смотри так... он же рядом.', "(whispering) Don't look at me like that... he's right here.")],
            [NP_L('Солнце печёт. Хозяюшку бы маслицем натереть — руки у меня умелые.', "Sun's scorching. Somebody oughta rub some oil on the Miss. I'm real good with my hands."), NP_L('Я с-сама справлюсь! ...Потом.', "I c-can do it myself! ...Later.")],
            [NP_L('Тесноват купальничек, а? Того и гляди по швам разойдётся.', "Swimsuit's a little tight, eh? Looks like it's about to burst at the seams."), NP_L('Яризо!.. \\N[1], не слушай его.', "Yarizo...! \\N[1], don't listen to him.")],
            [NP_L('Приятель, глянь, какая у тебя невеста. Всё на месте, всё налито.', "Buddy, take a look at your bride. Everything in the right place, nice and ripe."), NP_L('П-прекрати... я и так вся красная.', "S-stop it... I'm already red all over.")],
            [NP_L('Хорошо сидит. Знаю я, кому этот купальник понравится больше всех.', "Fits ya nice. And I know who's gonna like that swimsuit more than anyone."), NP_L('(тихо) Замолчи... пожалуйста.', "(quietly) Be quiet... please.")]
        ],
        reveal_h0: [
            [NP_L('Хозяюшка, наряд — огонь! Приятель, держи её крепче, а то уведут.', "Miss, that outfit's on fire! Buddy, hold on tight or someone'll steal her away."), NP_L('Это... для дела! Только для дела!', "It's... for work! Strictly for work!")],
            [NP_L('В таком и в бой не страшно. Враги же засмотрятся.', "Dressed like that, ya don't gotta fear any fight. The enemy'll be too busy starin'."), NP_L('Я не для того так оделась!..', "That's not why I dressed like this!")],
            [NP_L('Красиво. Только бы ветерок не подул... или пусть дует, хе-хе.', "Pretty. Just hope the wind don't pick up... or maybe I hope it does, heh heh."), NP_L('Яризо, прекрати!', "Yarizo, stop it!")],
            [NP_L('Приятель, вкус у тебя что надо. Или это она сама выбрала?', "Buddy, you got great taste. Or did she pick it out herself?"), NP_L('Н-не смотрите на меня так оба...', "D-don't both of you look at me like that...")],
            [NP_L('Вот это вырез... то есть выбор! Отличный выбор.', "What a neckline... I mean, what a choice! Great choice."), NP_L('Мне... просто нечего было надеть.', "I just... didn't have anything else to wear.")]
        ],
        reveal_h1: [
            [NP_L('Хозяюшка сегодня особенно... заметная. Глаз не отвести.', "Miss is especially... eye-catchin' today. Can't look away."), NP_L('(шёпотом) Потом насмотришься... тише.', "(whispering) You can stare later... keep it down.")],
            [NP_L('Приятель, ты счастливчик. Такое сокровище — да в такой обёртке.', "Buddy, you're a lucky man. A treasure like that, in wrappin' like that."), NP_L('\\N[1], он просто шутит! Правда, Яризо?', "\\N[1], he's just joking! Right, Yarizo?")],
            [NP_L('Ткани на этот наряд пожалели. Зато на хозяюшку не жалко ничего.', "They sure skimped on fabric for that outfit. But nothin's too good for the Miss."), NP_L('Это мода такая... наверное.', "It's just the fashion... I think.")],
            [NP_L('Тебе идёт, хозяюшка. Особенно когда наклоняешься.', "Looks good on ya, Miss. Especially when ya bend over."), NP_L('Я н-не наклоняюсь!.. Больше не буду.', "I'm n-not bending over...! I won't anymore.")],
            [NP_L('Красота. Так и хочется помолиться. На коленях.', "Gorgeous. Makes me wanna pray. On my knees."), NP_L('Яризо!.. Богохульник...', "Yarizo...! You blasphemer...")]
        ],
        // ===== наедине: грубее по стадии =====
        swim_a0: [
            [NP_L('Ох, хозяюшка, ну и дыньки! В этих тряпочках еле держатся.', "Oh Miss, what melons! Those little rags can barely hold 'em."), NP_L('Как ты смеешь! Отвернись немедленно!', "How dare you! Turn around this instant!")],
            [NP_L('Пока приятеля нет — может, повернёшься задом? Полюбуюсь.', "Since your buddy ain't around, how about turnin' around for me? Lemme admire the view."), NP_L('Мерзавец! Я всё расскажу \\N[1]!', "You scoundrel! I'm telling \\N[1] everything!")],
            [NP_L('Купальник-то врезался — всё видать. Хоть молись на это.', "That swimsuit's ridin' up, I can see everything. Worth prayin' to."), NP_L('Хватит пялиться! Богиня тебя покарает!', "Stop staring! The goddess will punish you!")],
            [NP_L('Такую задницу на пляже прятать надо. Я ж за себя не ручаюсь.', "Ya oughta hide an ass like that at the beach. I can't vouch for myself."), NP_L('Держись от меня подальше, извращенец!', "Stay away from me, you pervert!")],
            [NP_L('Эх, сползла бы эта верёвочка...', "Man, if only that little string would slip..."), NP_L('Ещё слово — и получишь посохом!', "One more word and you'll get my staff!")]
        ],
        swim_a1: [
            [NP_L('А ведь ты нарочно его надела, хозяюшка. Чтоб я слюни пускал.', "You wore that on purpose, didn't ya, Miss? To get me droolin'."), NP_L('Н-неправда! Мне просто жарко...', "Th-that's not true! I'm just hot...")],
            [NP_L('Сиськи у тебя — во! Приятель хоть знает, какое сокровище таскает?', "Your tits are amazin'! Does your buddy even know what a treasure he's luggin' around?"), NP_L('Хватит... не говори такое вслух.', "Stop... don't say that out loud.")],
            [NP_L('Покрутись-ка. Ну разок. Никто ж не видит.', "Give us a twirl. Just once. Nobody's lookin'."), NP_L('...Только разок. И не смотри так!', "...Just once. And don't look at me like that!")],
            [NP_L('Купальник мокрый — всё просвечивает. Я ж не слепой.', "Wet swimsuit, everything's showin' through. I ain't blind."), NP_L('Ай! Не смотри... Отвернись хоть!', "Ah! Don't look... At least turn away!")],
            [NP_L('Попка — как спелый персик. Так и тянет шлёпнуть.', "That butt's like a ripe peach. Just beggin' for a smack."), NP_L('Только попробуй!.. Дурак...', "Don't you dare...! Idiot...")]
        ],
        swim_a2: [
            [NP_L('Для меня нарядилась, а, хозяюшка? Признавайся.', "Dressed up for me, eh, Miss? Come on, admit it."), NP_L('...Может быть. Тебе нравится?', "...Maybe. Do you like it?")],
            [NP_L('Соски сквозь ткань торчат. Замёрзла — или меня увидела?', "Your nipples are pokin' through. Cold, or just happy to see me?"), NP_L('Замолчи... это всё ты виноват.', "Shut up... it's all your fault.")],
            [NP_L('Вот бы стянуть с тебя эти верёвочки зубами.', "I'd love to pull those strings off ya with my teeth."), NP_L('Яризо... не здесь. Вдруг кто увидит.', "Yarizo... not here. Someone might see.")],
            [NP_L('Нагнись-ка за ракушкой. Ну, для дядюшки.', "Bend over and grab that seashell. Come on, do it for your uncle."), NP_L('Вот... так? Доволен, бесстыдник?', "Like... this? Happy now, you shameless man?")],
            [NP_L('С таким телом в купальнике ходить — грех. Сладкий грех.', "Walkin' around in a swimsuit with a body like that is a sin. A sweet sin."), NP_L('Богиня простит... если ты никому не скажешь.', "The goddess will forgive me... if you don't tell anyone.")]
        ],
        swim_a3: [
            [NP_L('Ух, хозяюшка! Так и завалил бы тебя прямо на песок.', "Whew, Miss! I could pin ya down right here on the sand."), NP_L('Так чего ждёшь? \\N[1] далеко.', "Then what are you waiting for? \\N[1] is far away.")],
            [NP_L('В этой верёвочке твоя щёлка всё равно что голая.', "In that string, your little slit's as good as naked."), NP_L('Я её для тебя и надела, хозяин.', "I wore it just for you, Master.")],
            [NP_L('Сиськи так прыгают, когда ты идёшь, — у меня аж встал.', "Your tits bounce so much when ya walk, I'm rock hard."), NP_L('Знаю. Я нарочно так хожу.', "I know. I walk like this on purpose.")],
            [NP_L('Купальник тебе к лицу. А без него было бы ещё лучше.', "That swimsuit suits ya. But you'd look even better without it."), NP_L('Хочешь — сам сними. Я разрешаю.', "If you want, take it off yourself. You have my permission.")],
            [NP_L('Так задницей виляешь — сама напрашиваешься.', "Shakin' your ass like that, you're askin' for it."), NP_L('Напрашиваюсь. И что ты сделаешь?', "I am asking for it. So what are you going to do?")]
        ],
        reveal_a0: [
            [NP_L('Хозяюшка, ты в этом прям шлюха из квартала утех. Почём берёшь?', "Miss, in that getup you look just like a whore from the red-light district. What's your price?"), NP_L('Как ты смеешь?! Я жрица!', "How dare you?! I am a priestess!")],
            [NP_L('Всё наружу — титьки, ляжки... Приятель-то не ревнует?', "Everything's hangin' out, tits, thighs... Your buddy ain't jealous?"), NP_L('Не твоё дело! Не смей смотреть!', "None of your business! Don't you dare look!")],
            [NP_L('В таком только раком стоять да задом крутить.', "An outfit like that's only good for gettin' on all fours and shakin' your ass."), NP_L('Мерзость! Держи язык за зубами!', "Disgusting! Hold your tongue!")],
            [NP_L('Эх, задрать бы этот лоскуток...', "Man, if I could just lift that little scrap..."), NP_L('Только тронь — без руки останешься!', "Touch me and you'll lose that hand!")],
            [NP_L('Ну и наряд. Специально меня дразнишь, а?', "Some outfit. You're teasin' me on purpose, eh?"), NP_L('Я не для тебя оделась, свинья!', "I didn't dress up for you, you pig!")]
        ],
        reveal_a1: [
            [NP_L('Смотри-ка, вырядилась. Для приятеля или для меня?', "Look at you, all dolled up. For your buddy or for me?"), NP_L('Для... для себя! Отстань.', "For... for myself! Leave me alone.")],
            [NP_L('В таком тряпье у тебя всё колышется. Аж глаза разбегаются.', "In those rags everything jiggles. Don't know where to look first."), NP_L('Не смотри так... мне неловко.', "Don't look at me like that... it's embarrassing.")],
            [NP_L('Признайся: нравится, когда я на тебя пялюсь.', "Admit it: ya like it when I stare at you."), NP_L('Н-нет! ...Не знаю. Замолчи.', "N-no! ...I don't know. Be quiet.")],
            [NP_L('Дала бы потрогать — я ж аккуратненько.', "Lemme have a feel. I'll be real gentle."), NP_L('Нет! ...Не сейчас. То есть никогда!', "No! ...Not now. I mean, never!")],
            [NP_L('Ляжки у тебя — загляденье. Так бы и сжал.', "Your thighs are a sight. I just wanna squeeze 'em."), NP_L('Перестань... у меня уши горят.', "Stop it... my ears are burning.")]
        ],
        reveal_a2: [
            [NP_L('Под этим нарядом ты, небось, уже мокренькая.', "Bet you're already nice and wet under that outfit."), NP_L('Тише... это ты меня такой сделал.', "Quiet... you're the one who made me like this.")],
            [NP_L('Наряд хоть и блядский, а тебе идёт.', "Slutty as that outfit is, it suits ya."), NP_L('Правда? Я... рада.', "Really? I'm... glad.")],
            [NP_L('Покажи, что там под лоскутком. Одним глазком.', "Show me what's under that scrap. Just a peek."), NP_L('Одним глазком... и всё. Ну, смотри.', "Just a peek... that's all. Go on, look.")],
            [NP_L('Ох, как подпрыгивают. Я теперь весь день думать буду.', "Oh, how they bounce. Gonna be thinkin' about that all day."), NP_L('Думай. Мне... приятно.', "Go ahead. I... like that.")],
            [NP_L('Вечером снимешь мне напряжение? Прямо в этом наряде.', "Gonna help me relieve some tension tonight? In that very outfit."), NP_L('Если \\N[1] уснёт... посмотрим.', "If \\N[1] falls asleep... we'll see.")]
        ],
        reveal_a3: [
            [NP_L('Хозяюшка, в этом ты прям создана для моего члена.', "Miss, in that outfit you look like you were made for my cock."), NP_L('Я и есть твоя. Вся.', "I am yours. All of me.")],
            [NP_L('Нагнись. Хочу посмотреть, что ты там прячешь.', "Bend over. I wanna see what you're hidin'."), NP_L('Вот. Нравится, хозяин?', "There. Do you like it, Master?")],
            [NP_L('Твоему приятелю такое и не снилось.', "Your buddy could never even dream of this."), NP_L('Ему — нет. А тебе можно всё.', "Not him. But you can have anything.")],
            [NP_L('Вырядилась как течная сучка.', "Dressed up like a bitch in heat."), NP_L('Для тебя, Яризо. Только для тебя.', "For you, Yarizo. Only for you.")],
            [NP_L('Вот бы тебя прямо сейчас — у первой же стены.', "I'd take ya right now, up against the first wall I see."), NP_L('Так возьми. Я не против.', "Then take me. I don't mind.")]
        ]
    };
    $.LINES = L;
    var FACE = { h0: 'fl', h1: 'fl', a0: 'an', a1: 'fl', a2: 'sh', a3: 'pl' };

    $.category = function() {
        var k = $.kind();
        if (!k) return null;
        var st = $.stage();
        return k + '_' + ($.heroPresent() ? (st >= 2 ? 'h1' : 'h0') : 'a' + st);
    };

    // ---------------------------------------------------------------------
    // Состояние (в сохранении)
    // ---------------------------------------------------------------------
    function state() {
        if (!$gameSystem._npOutfit) $gameSystem._npOutfit = { lastSec: -99999, lastSteps: -99999, sig: null, last: {}, pending: null };
        return $gameSystem._npOutfit;
    }
    $.state = state;
    function playSec() { return $gameSystem && $gameSystem.playtime ? $gameSystem.playtime() : 0; }
    function steps() { return $gameParty && $gameParty.steps ? $gameParty.steps() : 0; }

    function pick(cat) {
        var list = L[cat], st = state();
        if (!list || !list.length) return null;
        var last = st.last[cat], i;
        do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === last);
        st.last[cat] = i;
        return list[i];
    }
    function hatId() {
        var pri = memberById(PRI), eq = pri && pri.equips ? pri.equips() : [];
        return eq[2] && HATS.indexOf(eq[2].id) >= 0 ? eq[2].id : 0;
    }
    function actorName(n) {
        try {
            if ($gameActors && $gameActors._data && $gameActors._data[n]) return $gameActors._data[n].name();
            if ($dataActors && $dataActors[n]) return $dataActors[n].name || '';
        } catch (e) {}
        return '';
    }
    // Перенос по словам (штатный перенос режет кириллицу посреди слова)
    function wrap(text, maxW) {
        var b = new Bitmap(4, 4);
        var fs = (typeof KNS_SlideShow !== 'undefined' && KNS_SlideShow.param && KNS_SlideShow.param.fontSize) || 24;
        b.fontSize = fs;
        var plain = function(s) { return s.replace(/\\N\[(\d+)\]/gi, function(m, n) { return actorName(Number(n)) || 'XXXXXX'; }); };
        var words = String(text).split(' '), lines = [], cur = '';
        words.forEach(function(w) {
            var t = cur ? cur + ' ' + w : w;
            if (cur && b.measureTextWidth(plain(t)) > maxW) { lines.push(cur); cur = w; } else cur = t;
        });
        if (cur) lines.push(cur);
        return lines.join('\n');
    }
    function textWidth() {
        var p = (typeof KNS_SlideShow !== 'undefined' && KNS_SlideShow.param) || {};
        var w = Number(p.width) || 640;
        return w - (Number(p.imageX) || 8) - 150 - (Number(p.imagePaddingX) || 12) - (Number(p.textPadX) || 8) - 56;
    }
    function slide(text, image) {
        if (typeof $gameSystem.knsReserveSlideShow !== 'function') return;
        var bmp = ImageManager.loadSystem(image);
        var go = function() { $gameSystem.knsReserveSlideShow(text, 'left', 300, 5, image); };
        if (bmp.isReady()) go(); else bmp.addLoadListener(go);
    }

    // Показать реплику (без проверок кулдауна). Возвращает категорию или null.
    $.show = function() {
        var cat = $.category();
        if (!cat) return null;
        var pair = pick(cat);
        if (!pair) return null;
        var tw = textWidth();
        var face = FACE[cat.split('_')[1]] || 'fl';
        var yName = '\\C[6]\\N[21]\\C[0]', pName = '\\C[27]\\N[2]\\C[0]';
        slide(yName + '\n' + wrap('«' + pair[0] + '»', tw), 'np_or_yarizo');
        var st = state();
        st.lastSec = playSec(); st.lastSteps = steps();
        $._replyAt = 75; // кадров до её ответа
        $._reply = { text: pName + '\n' + wrap('«' + pair[1] + '»', tw), image: 'np_or_pri_' + face + '_' + hatId() };
        return cat;
    };
    function sayReply() {
        var r = $._reply; $._reply = null;
        if (!r) return;
        slide(r.text, r.image);
        if (P.voiceVol > 0 && typeof NPVoice !== 'undefined' && NPVoice.play) {
            try { NPVoice.play('gasp', { vol: P.voiceVol }); } catch (e) {}
        }
    }

    // Принудительно/по событию: force — без кулдауна
    $.trigger = function(force) {
        if (!$.canTalk()) return false;
        var st = state();
        st.pending = { type: force ? 'force' : 'equip', at: playSec() };
        return true;
    };

    // ---------------------------------------------------------------------
    // Логика срабатывания (вызывается из Scene_Map.update)
    // ---------------------------------------------------------------------
    $._freeFrames = 0;
    $.update = function() {
        if (typeof $gameSystem === 'undefined' || !$gameSystem) return;
        if ($._reply) {
            if (--$._replyAt > 0) return;
            if ($.mapFree() && $.isEnabled()) sayReply();
            else if ($._replyAt < -180) $._reply = null; // началось событие — ответ не показываем
            return;
        }
        var st = state();
        // переодевание
        var sig = $.signature();
        if (st.sig === null || st.sig === undefined) st.sig = sig; // после загрузки — без реплики
        else if (sig !== st.sig) {
            st.sig = sig;
            // переодели сюжетным событием — молчим (это его сцена)
            var evt = typeof $gameMap !== 'undefined' && $gameMap && $gameMap.isEventRunning && $gameMap.isEventRunning();
            if (evt) st.pending = null;
            else if ($.canTalk() && playSec() - st.lastSec >= P.eqSec) st.pending = { type: 'equip', at: playSec() };
            else if (!$.kind()) st.pending = null;
        }
        if (!st.pending) { $._freeFrames = 0; return; }
        // отложенные реплики после перехода протухают через 20 с
        if (st.pending.type === 'transfer' && playSec() - st.pending.at > 20) { st.pending = null; return; }
        if (!$.canTalk()) { if (!$.kind() || !$.yarizoAvailable()) st.pending = null; $._freeFrames = 0; return; }
        if (!$.mapFree()) { $._freeFrames = 0; return; }
        if (++$._freeFrames < 40) return;
        $._freeFrames = 0;
        st.pending = null;
        $.show();
    };
    $.onTransfer = function() {
        if (typeof $gameSystem === 'undefined' || !$gameSystem) return;
        var st = state();
        if (st.pending || !$.canTalk()) return;
        if (playSec() - st.lastSec < P.cdSec || steps() - st.lastSteps < P.cdSteps) return;
        if (Math.random() >= P.chance) return;
        st.pending = { type: 'transfer', at: playSec() };
    };

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.apply(this, arguments);
        try { $.update(); } catch (e) { console.warn('NP_OutfitReact', e); }
    };
    var _performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        var t = this.isTransferring() && this._newMapId !== $gameMap.mapId();
        _performTransfer.apply(this, arguments);
        if (t) { try { $.onTransfer(); } catch (e) { console.warn('NP_OutfitReact', e); } }
    };
    // ---------------------------------------------------------------------
    // Config / Options
    // ---------------------------------------------------------------------
    ConfigManager.npOutfitTalk = P.enabled;
    var _Config_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _Config_makeData.apply(this, arguments);
        config.npOutfitTalk = this.npOutfitTalk;
        return config;
    };
    var _Config_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _Config_applyData.apply(this, arguments);
        this.npOutfitTalk = (config && config.npOutfitTalk !== undefined) ? !!config.npOutfitTalk : P.enabled;
    };
    if (P.optionLabel) {
        var _Opt_addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Opt_addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npOutfitTalk');
        };
    }
})(NP_OutfitReact);
