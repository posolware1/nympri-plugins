var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_CampSkills.js — «Умения на привале» (Darkest Dungeon-style camping).
// Nymphomania Priestess RU mod. Требует NP_Stress (ставится после него и после NP_Campfire).
//=============================================================================
/*:
 * @plugindesc v1.1 [NP RU] Умения на привале: очки отдыха, баффы на 3 боя; восстановление меню после просмотра патчей.
 * @author NP RU mod
 *
 * @param CampBgm
 * @desc BGM меню привала в лагере (пусто — не менять музыку)
 * @default Theme_-_Wayfarers_Path
 *
 * @param CampBgs
 * @desc BGS меню привала в лагере (пусто — без звука)
 * @default NP_Campfire_Crackle
 *
 * @param InnBgm
 * @desc BGM меню отдыха в гостинице (пусто — не менять музыку)
 * @default PerituneMaterial_Taverne_loop
 *
 * @help
 * Меню открывается перед разговором у костра (NP_Campfire): в лагере (CE474) 2 очка,
 * в гостинице (CE325) 4 очка, только «мирные» умения. Каждый — не больше 2 умений,
 * каждое умение — один раз за отдых. Баффы действуют 3 боя.
 * Не открывается: опция выключена, галерея, бой, сюжетный отдых, соло, плен, карта мира.
 * При загрузке обычного сохранения вне события снимает зависший служебный
 * флаг просмотра патчей (S192), который мог навсегда блокировать меню отдыха.
 */
var NP_Camp = (function() {
    'use strict';
    var $ = {};
    var HERO = 1, PRI = 2, PM = 10, VP = 19, YAR = 21;
    var POINTS = { camp: 2, inn: 4 }, PER_MEMBER = 2;
    $.POINTS = POINTS; $.PER_MEMBER = PER_MEMBER;
    function gs(i) { return !!($gameSwitches && $gameSwitches.value(i)); }
    function gv(i) { return Number(($gameVariables && $gameVariables.value(i)) || 0); }
    function sv(i, v) { $gameVariables.setValue(i, v); }
    function actor(id) { return $gameActors.actor(id); }
    function rnd() { return NP_Stress.rng ? NP_Stress.rng() : Math.random(); }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function inParty(id) { return $gameParty.members().some(function(m) { return m && m.actorId() === id; }); }
    function here(id) {
        var a = actor(id); if (!a || a.isDead() || !inParty(id)) return false;
        if (id === YAR) return gs(643) && !gs(503) && !gs(2040);
        if (id === PM) return gs(650) && !gs(510);
        if (id === VP) return gs(659) && !gs(519);
        return true;
    }
    $.here = here;
    function S() { return NP_Stress; }
    function stage() { return S().stage(); }
    function heal(id, pct) { var a = actor(id); if (a && a.isAlive()) a.gainHp(Math.round(a.mhp * pct)); }
    function fp(id, pct) { var a = actor(id); if (!a || !a.isAlive()) return; var n = Math.round(a.maxTp() * pct); if (typeof tp_heal === 'function') tp_heal(id, n); else a.gainTp(n); }
    function members() { return $gameParty.members().map(function(m) { return m.actorId(); }).filter(here); }
    function lust(n) { sv(82, Math.max(0, gv(82) + n)); }
    function addAll(n, tag, why) { members().forEach(function(id) { S().add(id, n, tag, why); }); }
    function mute(fn) { var m = S()._mute; S()._mute = true; try { fn(); } finally { S()._mute = m; } }

    $.enabled = function() { return ConfigManager.npCampSkills !== false; };

    // msg: [кто ('p','h','y','m','v','n'), текст ('|' — перенос)]
    var ABIL = [
        // ---- Жрица
        { id: 'pray', who: PRI, n: NP_L('Молитва', "Prayer"), cost: 1, inn: true,
          d: NP_L('Отряд: +30% HP, снимает Отравление, Истощение и Похмелье. Напряжение всем −10 (жрице −15). 25%: отмаливает одну дурную черту.', "Party: +30% HP, cures Poison, Exhaustion and Hangover. Stress −10 for all (−15 for the priestess). 25%: prays away one bad trait."),
          run: function(r) {
              members().forEach(function(id) { heal(id, 0.3); [2, 16, 45].forEach(function(s) { actor(id).removeState(s); }); S().add(id, id === PRI ? -15 : -10, 'prayer', NP_L('молитва', "prayer")); });
              var msg = [['p', NP_L('Свет, укрепи нас и укрой этой ночью…', "O Light, give us strength and shelter us this night…")]];
              if (S().active() && rnd() < 0.25) {
                  var c = members().filter(function(id) { return S().traits(id).some(function(e) { return S().trait(e.id).s < 0 && !e.lock; }); });
                  if (c.length) {
                      var who = pick(c), tid = S().removeRandomNegative(who);
                      if (tid) { msg.push(['n', NP_L('Молитва сняла черту «', "The prayer lifted the trait «") + S().traitName(tid, who) + NP_L('» у \\c[6]', "» from \\c[6]") + S().aname(who) + '\\c[0].']); r.log.push(NP_L('Снята черта: ', "Trait removed: ") + S().traitName(tid, who)); }
                  }
              }
              return msg;
          } },
        { id: 'bless', who: PRI, n: NP_L('Благословение', "Blessing"), cost: 2, inn: true,
          d: NP_L('«Благословение привала»: Выносливость +15%, Вера +10% всему отряду на 3 боя. Напряжение всем −5.', "«Camp Blessing»: Endurance +15%, Faith +10% for the whole party for 3 battles. Stress −5 for all."),
          run: function() { S().addBuff(0, { 3: 1.15, 7: 1.10 }, 3, NP_L('Благословение', "Blessing")); addAll(-5, 'prayer', NP_L('благословение', "blessing"));
              return [['p', NP_L('Да не коснётся вас тьма. Ни завтра, ни послезавтра.', "May the darkness not touch you. Not tomorrow, nor the day after.")]]; } },
        { id: 'comfortH', who: PRI, n: NP_L('Утешение (\\n[1])', "Comfort (\\n[1])"), cost: 2, inn: true, adult: true,
          d: NP_L('Ночь вдвоём с героем. Похоть −30, Любовь +1. Напряжение: жрице −25, герою −30. (Стадия ≥ 2)', "A night alone with the hero. Lust −30, Love +1. Stress: priestess −25, hero −30. (Stage ≥ 2)"),
          ok: function() { return stage() >= 2 && here(HERO); }, why: NP_L('нужна стадия ≥ 2 и герой рядом', "requires stage ≥ 2 and the hero nearby"),
          run: function() {
              lust(-30); mute(function() { sv(83, gv(83) + 1); });
              S().add(PRI, -25, 'love', NP_L('утешение', "comfort")); S().add(HERO, -30, 'love', NP_L('утешение', "comfort"));
              return [['n', NP_L('Когда костёр догорает, \\n[2] тихо забирается к \\n[1] под одеяло.|Без слов. Только тёплое дыхание и руки, которые знают дорогу.', "As the campfire dies down, \\n[2] quietly slips under \\n[1]'s blanket.|No words. Just warm breath and hands that know the way.")],
                      ['p', NP_L('Не спишь?.. Вот и хорошо. Я тоже не хочу спать.', "You're awake?.. Good. I don't want to sleep either.")]];
          } },
        { id: 'comfortY', who: PRI, n: NP_L('Утешение (\\n[21])', "Comfort (\\n[21])"), cost: 2, inn: true, adult: true,
          d: NP_L('Ночь у Яризо (только с NTR-веткой). Похоть −30, Развращённость +3, близость с Яризо +1, считается ночной отлучкой. Яризо −30, жрице — по стадии.', "A night with Yarizo (NTR route only). Lust −30, Depravity +3, intimacy with Yarizo +1, counts as a nightly absence. Yarizo −30, priestess depends on stage."),
          ok: function() { return stage() >= 2 && gs(32) && here(YAR); }, why: NP_L('нужна стадия ≥ 2, NTR-ветка и Яризо рядом', "requires stage ≥ 2, the NTR route and Yarizo nearby"),
          run: function() {
              lust(-30);
              mute(function() { sv(214, gv(214) + 3); sv(544, gv(544) + 1); });
              sv(4292, gv(4292) + 1);   // ночная отлучка — герой это заметит
              S().add(YAR, -30, 'love', NP_L('хозяюшка пришла', "the Missus came")); S().add(PRI, [0, -10, -25, -35][stage()], 'love', NP_L('ночь у Яризо', "night with Yarizo"));
              return [['n', NP_L('Дождавшись, пока все уснут, \\n[2] на цыпочках уходит к Яризо.', "Waiting until everyone is asleep, \\n[2] tiptoes off to Yarizo.")],
                      ['y', NP_L('Ох, хозяюшка… сама пришла? Ну иди, иди сюда, я ж тебя всю ночь согревать буду.', "Oh, Missus… came all on your own, huh? C'mere, c'mere, I'll keep ya warm all night long.")],
                      ['n', NP_L('Грубые лапищи, запах пота и костра. Она сама стягивает с себя рясу.|До рассвета из его палатки доносятся приглушённые стоны.', "Rough, meaty paws, the smell of sweat and smoke. She pulls off her own robe.|Until dawn, muffled moans drift from his tent.")]];
          } },
        // ---- Герой
        { id: 'watch', who: HERO, n: NP_L('Караул', "Night Watch"), cost: 1, inn: false,
          d: NP_L('Герой всю ночь на страже: засады не будет. Утром у героя −30 усталости. Остальным напряжение −5.', "The hero keeps watch all night: no ambush. In the morning the hero has −30 Fatigue. Stress −5 for everyone else."),
          run: function(r) { $.session.noAmbush = true; $.session.watch = true; members().forEach(function(id) { if (id !== HERO) S().add(id, -5, 'camp', NP_L('спокойная ночь', "quiet night")); });
              return [['h', NP_L('Спите. Я посторожу.', "Get some sleep. I'll keep watch.")]]; } },
        { id: 'sharpen', who: HERO, n: NP_L('Точить оружие', "Sharpen Weapon"), cost: 1, inn: true,
          d: NP_L('«Наточенный клинок»: Сила героя +15% на 3 боя.', "«Sharpened Blade»: hero's Strength +15% for 3 battles."),
          run: function() { S().addBuff(HERO, { 2: 1.15 }, 3, NP_L('Наточенный клинок', "Sharpened Blade")); return [['n', NP_L('Скрежет точильного камня до поздней ночи. Лезвие блестит, как новое.', "The scrape of a whetstone late into the night. The blade gleams like new.")]]; } },
        { id: 'encourage', who: HERO, n: NP_L('Ободрить', "Encourage"), cost: 1, inn: true,
          d: NP_L('Тёплые слова жрице. При высокой Любви (≥ 30): Похоть −15, «Воодушевление» (Вера +10%, 3 боя), её напряжение −15. Иначе Похоть −5, напряжение −5.', "Kind words for the priestess. With high Love (≥ 30): Lust −15, «Inspired» (Faith +10%, 3 battles), her stress −15. Otherwise Lust −5, stress −5."),
          ok: function() { return here(PRI); }, why: NP_L('жрицы нет рядом', "the priestess isn't here"),
          run: function() {
              if (gv(83) >= 30) { lust(-15); S().addBuff(PRI, { 7: 1.10 }, 3, NP_L('Воодушевление', "Inspired")); S().add(PRI, -15, 'talk', NP_L('ободрение', "encouragement"));
                  return [['h', NP_L('Ты сегодня была великолепна. Правда.', "You were amazing today. Really.")], ['p', NP_L('Ты… умеешь подобрать слова.', "You… always know what to say.")]]; }
              lust(-5); S().add(PRI, -5, 'talk', NP_L('ободрение', "encouragement"));
              return [['h', NP_L('Неплохо держалась сегодня.', "You held up pretty well today.")], ['p', NP_L('Спасибо… наверное.', "Thanks… I guess.")]];
          } },
        // ---- Яризо
        { id: 'tales', who: YAR, n: NP_L('Байки у костра', "Campfire Tales"), cost: 1, inn: true,
          d: NP_L('«Боевой задор»: Ловкость +10% всем на 3 боя. При братане — военные байки (всем −10 напряжения), без него — сальные (Похоть +5).', "«Fighting Spirit»: Dexterity +10% for all for 3 battles. With Buddy around: war stories (−10 stress for all); without him: dirty ones (Lust +5)."),
          run: function() {
              S().addBuff(0, { 6: 1.10 }, 3, NP_L('Боевой задор', "Fighting Spirit"));
              if (here(HERO) || !gs(32)) { addAll(-10, 'talk', NP_L('байки', "tales"));
                  return [['y', NP_L('А вот был у нас в отряде один, братан, — так он орка голыми руками… Да-да, хозяюшка, клянусь бородой!', "So there was this one guy in our squad, Buddy, who took on an orc with his bare hands… Yep, yep, Missus, I swear on my beard!")]]; }
              lust(5); S().add(YAR, -10, 'talk', NP_L('байки', "tales")); S().add(PRI, stage() ? -8 : 3, stage() ? 'talk' : 'lewd', NP_L('сальные байки', "dirty tales"));
              return [['y', NP_L('А была у меня, хозяюшка, одна вдовушка в Портовом… Ох, и выделывала она… Да ты не красней, слушай!', "So there was this widow I knew back in Port Town, Missus… Oh, the things she'd do… Now don't you blush, just listen!")]];
          } },
        { id: 'booze', who: YAR, n: NP_L('Достать выпивку', "Break Out the Booze"), cost: 1, inn: true,
          d: NP_L('Всем +50% усталости и +15% HP, Похоть +5, напряжение −12 (выпивка). 25% — кто-то проснётся с Похмельем.', "All: +50% Fatigue recovery and +15% HP, Lust +5, stress −12 (booze). 25%: someone wakes up with a Hangover."),
          run: function(r) {
              var ids = members();
              ids.forEach(function(id) { fp(id, 0.5); heal(id, 0.15); S().add(id, -12, 'drink', NP_L('выпивка', "booze")); });
              lust(5);
              var msg = [['y', NP_L('Братан, хозяюшка — по маленькой! Для сугреву!', "Buddy, Missus — just a little nip! To warm us up!")]];
              var drinkers = ids.filter(function(id) { return S().hasTrait(id, 'drinker'); });
              var p = drinkers.length ? 0.5 : 0.25;
              if (rnd() < p) { var w = drinkers.length ? pick(drinkers) : pick(ids); $.session.hangover = w; msg.push(['n', NP_L('Похоже, \\c[6]', "Looks like \\c[6]") + S().aname(w) + NP_L('\\c[0] утром будет мучиться похмельем.', "\\c[0] is gonna wake up with a nasty hangover.")]); r.log.push(NP_L('Похмелье утром: ', "Hangover in the morning: ") + S().aname(w)); }
              if (rnd() < 0.08) { var x = pick(ids); S().addTrait(x, 'drinker', NP_L('выпивка', "booze")); }
              return msg;
          } },
        { id: 'massage', who: YAR, n: NP_L('Помассировать хозяюшке плечи', "Rub the Missus's Shoulders"), cost: 1, inn: true,
          d: NP_L('Жрице +20% HP и полная усталость. При братане — невинно (Развращённость +1, напряжение −10). Без него — смелее (Развращённость +3, Похоть +10).', "Priestess: +20% HP and full Fatigue recovery. With Buddy around it stays innocent (Depravity +1, stress −10). Without him, it gets bolder (Depravity +3, Lust +10)."),
          ok: function() { return here(PRI); }, why: NP_L('хозяюшки нет рядом', "the Missus isn't here"),
          run: function() {
              heal(PRI, 0.2); fp(PRI, 1);
              if (here(HERO) || !gs(32)) { mute(function() { sv(214, gv(214) + 1); }); S().add(PRI, -10, 'camp', NP_L('массаж', "massage")); S().add(YAR, -5, 'camp', NP_L('массаж', "massage"));
                  return [['y', NP_L('Плечики-то каменные, хозяюшка! Посох — штука тяжёлая. Вот так… вот так…', "Your shoulders are hard as rocks, Missus! That staff's a heavy thing. There we go… there we go…")], ['p', NP_L('М-м… спасибо, Яризо.', "Mmm… thank you, Mr. Yarizo.")]]; }
              mute(function() { sv(214, gv(214) + 3); }); lust(10);
              S().add(PRI, [-5, -12, -18, -18][stage()], 'love', NP_L('массаж', "massage")); S().add(YAR, -10, 'love', NP_L('массаж', "massage"));
              return [['y', NP_L('Плечики размяли, а тут, пониже, тоже напряглось, а, хозяюшка?', "Shoulders are all loosened up, but somethin' lower down's tensed up too, eh, Missus?")], ['p', NP_L('Яризо!.. …Ну… только немножко.', "Mr. Yarizo!.. …W-well… just a little.")]];
          } },
        // ---- Зельеварка (взрослая алхимичка, владелица лавки)
        { id: 'brew', who: PM, n: NP_L('Сварить зелье', "Brew a Potion"), cost: 2, inn: true,
          d: NP_L('2 × «Зелье лечения S». При связи ≥ 3 одно из них — «Зелье энергии S».', "2 × «Healing Potion S». With bond ≥ 3, one of them is an «Energy Potion S»."),
          run: function(r) { var a = 10, b = gv(225) >= 3 ? 18 : 10; $gameParty.gainItem($dataItems[a], 1); $gameParty.gainItem($dataItems[b], 1);
              r.log.push(NP_L('Получено: ', "Obtained: ") + $dataItems[a].name + ', ' + $dataItems[b].name); S().add(PM, -5, 'camp', NP_L('любимое дело', "favorite pastime"));
              return [['m', NP_L('…Готово. Не пей залпом.', "…Done. Don't chug it.")], ['n', NP_L('Получено: ', "Obtained: ") + $dataItems[a].name + ', ' + $dataItems[b].name + '.']]; } },
        { id: 'herbs', who: PM, n: NP_L('Сбор трав', "Gather Herbs"), cost: 1, inn: false,
          d: NP_L('2–3 случайных находки: Лечебная трава, Противоядие, изредка Эликсир тела или Духи воздержания.', "2–3 random finds: Healing Herb, Antidote Herb, occasionally a Physical Cure Elixir or Perfume of Temperance."),
          run: function(r) {
              var n = 2 + (rnd() < 0.5 ? 1 : 0), got = [];
              for (var i = 0; i < n; i++) { var x = rnd(), id = x < 0.1 ? 45 : x < 0.25 ? 22 : x < 0.6 ? 4 : 2; $gameParty.gainItem($dataItems[id], 1); got.push($dataItems[id].name); }
              r.log.push(NP_L('Найдено: ', "Found: ") + got.join(', '));
              return [['m', NP_L('…Грибы. И слизь. Хорошая ночь.', "…Mushrooms. And slime. A good night.")], ['n', NP_L('Найдено: ', "Found: ") + got.join(', ') + '.']];
          } },
        { id: 'tonic', who: PM, n: NP_L('Бодрящий отвар', "Invigorating Brew"), cost: 1, inn: true,
          d: NP_L('Всем +40% усталости, снимает Истощение и Похмелье. Напряжение всем −8.', "All: +40% Fatigue recovery, cures Exhaustion and Hangover. Stress −8 for all."),
          run: function() { members().forEach(function(id) { fp(id, 0.4); actor(id).removeState(16); actor(id).removeState(45); S().add(id, -8, 'camp', NP_L('отвар', "brew")); });
              $.session.hangover = 0; return [['m', NP_L('…Пей. Не нюхай.', "…Drink. Don't sniff it.")]]; } },
        { id: 'special', who: PM, n: NP_L('Особый отвар', "Special Brew"), cost: 2, inn: true, adult: true,
          d: NP_L('Связь ≥ 3: Зельеварка уводит героя «попробовать новый рецепт». Герою и ей напряжение −40.', "Bond ≥ 3: the Potion Maker drags the hero off to «try a new recipe». Stress −40 for both."),
          ok: function() { return gv(225) >= 3 && here(HERO); }, why: NP_L('нужна связь ≥ 3 и герой рядом', "requires bond ≥ 3 and the hero nearby"),
          run: function() { S().add(HERO, -40, 'love', NP_L('особый отвар', "special brew")); S().add(PM, -40, 'love', NP_L('особый отвар', "special brew"));
              return [['m', NP_L('…Новый рецепт. Нужен подопытный. …Ты.', "…New recipe. I need a test subject. …You.")],
                      ['n', NP_L('Отвар пахнет мёдом и чем-то пряным. Через минуту у \\n[1] горят уши,|а Зельеварка, впервые за вечер улыбнувшись, тянет его за пояс к своей палатке.', "The brew smells of honey and something spicy. A minute later \\n[1]'s ears are burning,|and the Potion Maker, smiling for the first time all evening, tugs him by the belt toward her tent.")],
                      ['m', NP_L('…Записываю: действует. Очень действует.', "…Noting it down: effective. Very effective.")]]; } },
        // ---- Принцесса-вампир (только невинное)
        { id: 'vigil', who: VP, n: NP_L('Ночное бдение', "Night Vigil"), cost: 1, inn: false,
          d: NP_L('Принцесса всё равно не спит ночью: засады не будет. Напряжение всем −5.', "The Princess doesn't sleep at night anyway: no ambush. Stress −5 for all."),
          run: function() { $.session.noAmbush = true; addAll(-5, 'camp', NP_L('спокойная ночь', "quiet night")); return [['v', NP_L('Спите, людишки. Ночь — моё время.', "Sleep, little humans. The night is my time.")]]; } },
        { id: 'bats', who: VP, n: NP_L('Стая летучих мышей', "Bat Swarm"), cost: 1, inn: false,
          d: NP_L('Разведка: «Разведано» (Ловкость +10% всем, 1 бой), 30% — мыши притащат 50–150 G.', "Scouting: «Scouted» (Dexterity +10% for all, 1 battle); 30%: the bats bring back 50–150 G."),
          run: function(r) { S().addBuff(0, { 6: 1.10 }, 1, NP_L('Разведано', "Scouted"));
              var msg = [['v', NP_L('Летите, мои крошки. Всё разузнайте.', "Fly, my little ones. Find out everything.")]];
              if (rnd() < 0.3) { var g = 50 + Math.floor(rnd() * 101); $gameParty.gainGold(g); r.log.push(NP_L('Найдено ', "Found ") + g + ' G'); msg.push(['n', NP_L('Мыши притащили кошелёк: +', "The bats brought back a purse: +") + g + ' G.']); }
              return msg; } },
        { id: 'blood', who: VP, n: NP_L('Капля благородной крови', "A Drop of Noble Blood"), cost: 2, inn: true,
          d: NP_L('«Кровь Короля Ночи» из флакона: Макс. HP +10% и Выносливость +10% всем на 2 боя.', "«Blood of the King of the Night» from a vial: Max HP +10% and Endurance +10% for all for 2 battles."),
          run: function() { S().addBuff(0, { 0: 1.10, 3: 1.10 }, 2, NP_L('Кровь Короля Ночи', "Blood of the King of the Night")); return [['v', NP_L('Одна капля. Не больше! Это, между прочим, папина.', "One drop. No more! That's Daddy's, you know.")]]; } }
    ];
    $.ABIL = ABIL;
    var HEAD = { p: '\\c[6][\\n[2]]\\c[0]', h: '\\c[6][\\n[1]]\\c[0]', y: '\\c[6][\\n[21]]\\c[0]', m: '\\c[6][\\n[10]]\\c[0]', v: '\\c[6][\\n[19]]\\c[0]' };

    // ---- допуск ---------------------------------------------------------------
    $.reason = function(where) {
        if (!$.enabled()) return 'off';
        if (gs(5)) return 'gallery';
        if (gs(56) || gs(192) || gs(14) || ($gameParty.inBattle && $gameParty.inBattle())) return 'locked';
        if (!gs(222)) return 'story';
        if (where === 'inn' && typeof $inn_event !== 'undefined' && $inn_event == 1) return 'inn_event';
        if ($gameParty.size() < 2 || members().length < 2) return 'solo';
        if (gv(264) > 0) return 'confined';
        if ($gameMap && $gameMap.mapId() === 3) return 'worldmap';
        return '';
    };
    $.repairPatchViewMode = function() {
        if (!gs(192) || !gs(222) || gs(5) || gs(56) || gs(14)) return false;
        if (!$gameMap || $gameMap.mapId() <= 0 || $gameMap.isEventRunning()) return false;
        if ($gameParty.inBattle && $gameParty.inBattle()) return false;
        // The real patch viewer stays inside an event chain until it exits.
        // An idle main-game save with S192 still set has already left that mode.
        $gameSwitches.setValue(192, false);
        return true;
    };
    var _loadGame = DataManager.loadGame;
    DataManager.loadGame = function() {
        var ok = _loadGame.apply(this, arguments);
        if (ok) $.repairPatchViewMode();
        return ok;
    };
    $.session = {};
    $.available = function(ab) {
        var s = $.session;
        if (!here(ab.who)) return null;                                   // отсутствующих не показываем
        if (!ab.inn && s.where === 'inn') return null;
        if (ab.adult && ab.ok && !ab.ok()) return null;                    // взрослые — только когда доступны
        var why = '';
        if (s.used[ab.id]) why = NP_L('уже было этой ночью', "already done tonight");
        else if ((s.per[ab.who] || 0) >= PER_MEMBER) why = NP_L('не больше ', "no more than ") + PER_MEMBER + NP_L(' умений за привал', " skills per camp");
        else if (ab.cost > s.points) why = NP_L('не хватает очков', "not enough points");
        else if (ab.ok && !ab.ok()) why = ab.why || NP_L('недоступно', "unavailable");
        return { ab: ab, enabled: !why, why: why };
    };
    $.list = function() { return ABIL.map($.available).filter(function(x) { return x; }); };
    $.use = function(id) {
        var ab = ABIL.filter(function(a) { return a.id === id; })[0]; if (!ab) return null;
        var av = $.available(ab); if (!av || !av.enabled) return null;
        var s = $.session, r = { log: [] };
        s.points -= ab.cost; s.used[ab.id] = true; s.per[ab.who] = (s.per[ab.who] || 0) + 1;
        var msg = ab.run(r) || [];
        S().add(ab.who, S().hasTrait(ab.who, 'soul') ? -6 : -5, 'camp', NP_L('своё умение', "own skill"));
        s.msgs.push(msg); s.last = { ab: ab, log: r.log };
        S().hist(NP_L('Привал: ', "Camp: ") + S().aname(ab.who) + ' — ' + ab.n.replace(/\\n\[(\d+)\]/g, function(m, k) { return S().aname(Number(k)); }));
        return r;
    };
    $.open = function(interp, where) {
        var why = $.reason(where); $.lastReason = why;
        if (why) return false;
        var pts = POINTS[where] + (here(YAR) && gv(204) >= 4 ? 1 : 0) + (here(PM) && gv(225) >= 4 ? 1 : 0);
        $.session = { where: where, points: pts, max: pts, used: {}, per: {}, msgs: [], noAmbush: false, active: true };
        if (!$.list().some(function(x) { return x.enabled; })) { $.lastReason = 'nothing'; return false; }
        SceneManager.push(Scene_NpCamp);
        return true;
    };
    $.after = function(interp) {
        var s = $.session; if (!s || !s.msgs || !s.msgs.length) return;
        var list = [];
        s.msgs.forEach(function(m) { m.forEach(function(ln) {
            list.push({ code: 101, indent: 0, parameters: ['', 0, 0, 2] });
            if (HEAD[ln[0]]) list.push({ code: 401, indent: 0, parameters: [HEAD[ln[0]]] });
            ln[1].split('|').forEach(function(t) { list.push({ code: 401, indent: 0, parameters: [t] }); });
        }); });
        list.push({ code: 0, indent: 0, parameters: [] });
        s.msgs = [];
        if (interp && interp.setupChild) interp.setupChild(list, interp._eventId || 0);
        $.lastAfter = list;
    };
    $.morning = function() {
        var s = $.session; if (!s || !s.active) return;
        if (s.watch) { if (typeof tp_heal === 'function') tp_heal(HERO, -30); else actor(HERO).gainTp(-30); }
        if (s.hangover && actor(s.hangover)) actor(s.hangover).addState(45);
        s.active = false; s.noAmbush = false;
    };
    // засада (V284) — 0 при «Карауле» / «Ночном бдении»
    var _set = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(id, v) {
        if (id === 284 && $.session && $.session.active && $.session.noAmbush) v = 0;
        _set.call(this, id, v);
    };

    // ---- встраивание: перед разговором у костра ---------------------------------
    function mk(code, ind, p) { return { code: code, indent: ind, parameters: p, npCamp: true }; }
    $.inject = function(ces) {
        var r = {};
        [[474, 'camp'], [325, 'inn']].forEach(function(pair) {
            var l = ces[pair[0]] && ces[pair[0]].list, key = 'ce' + pair[0];
            if (!l) { r[key] = 'none'; return; }
            if (l.some(function(x) { return x.npCamp; })) { r[key] = 'already'; return; }
            var k = -1;
            for (var i = 0; i < l.length; i++) if (l[i].npCampfire) { k = i; break; }
            if (k < 0) {
                for (var j = 0; j < l.length; j++) {
                    var x = l[j];
                    if (pair[0] === 474 && (x.code === 108 || x.code === 408) && String(x.parameters[0]).indexOf('見張りの選択') >= 0) { k = j; while (k > 0 && l[k].code === 408) k--; break; }
                    if (pair[0] === 325 && x.code === 355 && /睡眠本処理開始/.test(String(x.parameters[0]))) { k = j; break; }
                }
            }
            if (k < 0) { r[key] = 'no anchor'; return; }
            var ind = l[k].indent;
            l.splice(k, 0, mk(355, ind, ["NP_Camp.open(this, '" + pair[1] + "')"]), mk(355, ind, ['NP_Camp.after(this)']));
            r[key] = 'ok@' + k;
        });
        $.injectResult = r;
        console.log('[NP_Camp] inject ' + JSON.stringify(r));
        return r;
    };
    var _isDb = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        var ok = _isDb.apply(this, arguments);
        if (ok && !$._injected && window.$dataCommonEvents) { $._injected = true; try { $.inject($dataCommonEvents); } catch (e) { console.error('[NP_Camp] inject', e); } }
        return ok;
    };

    // ---- сцена ----------------------------------------------------------------
    function wrap(bmp, text, w) {
        var out = [];
        String(text).split('\n').forEach(function(par) {
            var line = '';
            par.split(' ').forEach(function(wd) { var t = line ? line + ' ' + wd : wd; if (line && bmp.measureTextWidth(t) > w) { out.push(line); line = wd; } else line = t; });
            out.push(line);
        });
        return out;
    }
    function nm(s) { return String(s).replace(/\\n\[(\d+)\]/g, function(m, k) { return S().aname(Number(k)); }); }
    function circle(bmp, x, y, r, fill, stroke) {
        var c = bmp._context; c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
        if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
        c.restore(); if (bmp._setDirty) bmp._setDirty(); else bmp._baseTexture.update();
    }

    function Window_NpCampHead() { this.initialize.apply(this, arguments); }
    Window_NpCampHead.prototype = Object.create(Window_Base.prototype);
    Window_NpCampHead.prototype.constructor = Window_NpCampHead;
    Window_NpCampHead.prototype.refresh = function() {
        var c = this.contents, s = $.session; c.clear();
        c.fontSize = 34; this.changeTextColor('#ffcf7a');
        this.drawText(s.where === 'inn' ? NP_L('Отдых в таверне', "Rest at the Inn") : NP_L('Привал у костра', "Campfire Rest"), 0, 4, 600);
        c.fontSize = 20; this.changeTextColor('#b8a890');
        this.drawText(NP_L('Не больше ', "No more than ") + PER_MEMBER + NP_L(' умений на каждого · баффы держатся 3 боя', " skills each · buffs last 3 battles"), 0, 44, 700);
        c.fontSize = 26; this.resetTextColor();
        var max = s.max || POINTS[s.where], cw = this.contentsWidth();
        this.drawText(NP_L('Очки отдыха: ', "Rest points: ") + s.points + ' / ' + max, cw - 274 - max * 34, 14, 260 + 0, 'right');
        for (var i = 0; i < max; i++) circle(c, cw - max * 34 + i * 34 + 14, 32, 12, i < s.points ? '#ffb040' : 'rgba(255,255,255,0.08)', '#ffcf7a');
    };

    function Window_NpCampParty() { this.initialize.apply(this, arguments); }
    Window_NpCampParty.prototype = Object.create(Window_Base.prototype);
    Window_NpCampParty.prototype.constructor = Window_NpCampParty;
    Window_NpCampParty.prototype.refresh = function() {
        var c = this.contents, ids = members(), n = Math.max(ids.length, 1), cw = Math.floor(this.contentsWidth() / n), self = this;
        c.clear();
        ids.forEach(function(id, i) {
            var x = i * cw + 8, w = cw - 24;
            if (i > 0) c.fillRect(i * cw - 6, 0, 2, self.contentsHeight(), 'rgba(255,200,120,0.18)');
            c.fillRect(x, 0, 60, 60, 'rgba(255,255,255,0.06)');
            S().faceFrom(id, function(src, sx, sy, pw, ph) { c.blt(src, sx, sy, pw, ph, x, 0, 60, Math.round(60 * ph / pw)); });
            c.fontSize = 26; self.changeTextColor('#ffe0b0'); self.drawText(S().aname(id), x + 70, 0, w - 70);
            c.fontSize = 18; self.changeTextColor('#b8a890');
            self.drawText(NP_L('Умений: ', "Skills: ") + ($.session.per[id] || 0) + ' / ' + PER_MEMBER, x + 70, 30, w - 70);
            S().drawBlock(self, x, 68, w, id, { rowH: 28, titleSize: 20, noDesc: false, traitRow: 22, traitSize: 18, cols: n > 2 ? 1 : 2 });
        });
        this.resetTextColor();
    };

    function Window_NpCampList() { this.initialize.apply(this, arguments); }
    Window_NpCampList.prototype = Object.create(Window_Selectable.prototype);
    Window_NpCampList.prototype.constructor = Window_NpCampList;
    Window_NpCampList.prototype.initialize = function(x, y, w, h) { this._rows = []; Window_Selectable.prototype.initialize.call(this, x, y, w, h); this.refresh(); };
    Window_NpCampList.prototype.itemHeight = function() { return 40; };
    Window_NpCampList.prototype.maxItems = function() { return this._rows.length; };
    Window_NpCampList.prototype.row = function() { return this._rows[this.index()]; };
    Window_NpCampList.prototype.refresh = function() {
        this._rows = $.list(); this._rows.push({ done: true, enabled: true });
        this.createContents(); this.drawAllItems();
    };
    Window_NpCampList.prototype.isCurrentItemEnabled = function() { var r = this.row(); return !!r && r.enabled; };
    Window_NpCampList.prototype.drawItem = function(i) {
        var r = this._rows[i], rc = this.itemRectForText(i), c = this.contents;
        c.fontSize = 22;
        if (r.done) { this.changeTextColor('#ffcf7a'); this.drawText(NP_L('Закончить привал', "End Camp"), rc.x, rc.y + 2, rc.width, 'center'); this.resetTextColor(); return; }
        this.changePaintOpacity(r.enabled);
        this.changeTextColor('#c8b090'); this.drawText(S().aname(r.ab.who), rc.x, rc.y + 2, 150);
        this.changeTextColor(r.ab.adult ? '#ff9ac0' : this.normalColor()); this.drawText(nm(r.ab.n), rc.x + 156, rc.y + 2, rc.width - 156 - 90);
        for (var k = 0; k < r.ab.cost; k++) circle(c, rc.x + rc.width - 14 - k * 24, rc.y + 20, 8, '#ffb040', '#ffcf7a');
        this.changePaintOpacity(true); this.resetTextColor();
    };
    Window_NpCampList.prototype.updateHelp = function() { if (this._helpWindow) this._helpWindow.setRow(this.row()); };

    function Window_NpCampHelp() { this.initialize.apply(this, arguments); }
    Window_NpCampHelp.prototype = Object.create(Window_Base.prototype);
    Window_NpCampHelp.prototype.constructor = Window_NpCampHelp;
    Window_NpCampHelp.prototype.setRow = function(r) { this._row = r; this.refresh(); };
    Window_NpCampHelp.prototype.refresh = function() {
        var c = this.contents, r = this._row, w = this.contentsWidth(), y = 0, self = this; c.clear();
        if (r && r.done) {
            c.fontSize = 26; this.changeTextColor('#ffcf7a'); this.drawText(NP_L('Закончить привал', "End Camp"), 0, 0, w); y = 40;
            c.fontSize = 20; this.resetTextColor();
            wrap(c, NP_L('Неистраченные очки сгорят. Отряд ложится спать; утром срывы и подъёмы проходят.', "Unspent points will be lost. The party goes to sleep; breaks and rallies wear off by morning."), w).forEach(function(l) { self.drawText(l, 0, y, w); y += 26; });
        } else if (r) {
            c.fontSize = 26; this.changeTextColor('#ffcf7a'); this.drawText(nm(r.ab.n), 0, 0, w); y = 36;
            c.fontSize = 20; this.changeTextColor('#c8b090'); this.drawText(S().aname(r.ab.who) + NP_L(' · стоимость: ', " · cost: ") + r.ab.cost + (r.ab.inn ? '' : NP_L(' · только в лагере', " · camp only")), 0, y, w); y += 32;
            this.resetTextColor();
            wrap(c, nm(r.ab.d), w).forEach(function(l) { self.drawText(l, 0, y, w); y += 26; });
            if (!r.enabled) { y += 6; this.changeTextColor('#ff8a7a'); this.drawText(NP_L('Недоступно: ', "Unavailable: ") + r.why, 0, y, w); y += 28; }
        }
        var last = $.session.last;
        if (last) {
            y = Math.max(y + 12, this.contentsHeight() - 120);
            c.fillRect(0, y - 6, w, 1, 'rgba(255,200,120,0.3)');
            c.fontSize = 20; this.changeTextColor('#8fe08a'); this.drawText(NP_L('Сделано: ', "Done: ") + nm(last.ab.n), 0, y, w); y += 26;
            this.changeTextColor('#d0d0d0');
            last.log.slice(0, 3).forEach(function(l) { self.drawText(l, 0, y, w); y += 24; });
        }
        this.resetTextColor();
    };

    function Scene_NpCamp() { this.initialize.apply(this, arguments); }
    Scene_NpCamp.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_NpCamp.prototype.constructor = Scene_NpCamp;
    Scene_NpCamp.prototype.createBackground = function() {
        var W = Graphics.width, H = Graphics.height, b = new Bitmap(W, H), ctx = b._context;
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d0907'); g.addColorStop(1, '#22120a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        var r = ctx.createRadialGradient(W / 2, H + 40, 20, W / 2, H + 40, H * 0.75);
        r.addColorStop(0, 'rgba(255,140,40,0.45)'); r.addColorStop(0.5, 'rgba(200,70,20,0.15)'); r.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
        if (b._setDirty) b._setDirty(); else b._baseTexture.update();
        this._backgroundSprite = new Sprite(b); this.addChild(this._backgroundSprite);
    };
    Scene_NpCamp.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        var W = Graphics.boxWidth, H = Graphics.boxHeight;
        this._head = new Window_NpCampHead(0, 0, W, 104); this.addWindow(this._head);
        this._party = new Window_NpCampParty(0, 104, W, 400); this.addWindow(this._party);
        this._help = new Window_NpCampHelp(760, 504, W - 760, H - 504); this.addWindow(this._help);
        this._list = new Window_NpCampList(0, 504, 760, H - 504);
        this._list._helpWindow = this._help;
        this._list.setHandler('ok', this.onOk.bind(this));
        this._list.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._list);
        [this._head, this._party, this._help, this._list].forEach(function(w) { w.opacity = 200; });
        this._list.select(0); this._list.activate();
        this.refreshAll();
    };
    Scene_NpCamp.prototype.refreshAll = function() { this._head.refresh(); this._party.refresh(); this._list.refresh(); this._list.callUpdateHelp(); };
    Scene_NpCamp.prototype.onOk = function() {
        var r = this._list.row();
        if (!r || r.done) { this.popScene(); return; }
        $.use(r.ab.id);
        AudioManager.playSe((window.NP_AudioBalance && NP_AudioBalance.campSe(r.ab.id)) || { name: 'Heal3', volume: 70, pitch: 100, pan: 0 });
        this.refreshAll();
        if ($.session.points <= 0) { this._list.select(this._list.maxItems() - 1); this._list.callUpdateHelp(); }
        this._list.activate();
    };
    window.Scene_NpCamp = Scene_NpCamp;
    $.Scene_NpCamp = Scene_NpCamp;

    // ---- музыка привала ----------------------------------------------------------
    var PRM = (window.PluginManager && PluginManager.parameters('NP_CampSkills')) || {};
    function prm(k, d) { return PRM[k] !== undefined ? String(PRM[k]) : d; }
    // громкость выровнена по EBU R128: карта ≈ -17.5 LUFS (vol 100); Wayfarers -12.7, Taverne -7.3, Night -24.0 LUFS
    $.MUSIC = { camp: { bgm: prm('CampBgm', 'Theme_-_Wayfarers_Path'), bv: 58, bgs: prm('CampBgs', 'NP_Campfire_Crackle'), sv: 100 },
                inn: { bgm: prm('InnBgm', 'PerituneMaterial_Taverne_loop'), bv: 31, bgs: '', sv: 0 } };
    $.musicStart = function(where) {
        $.musicSaved = null;
        if (ConfigManager.npCampMusic === false) return;
        var m = $.MUSIC[where]; if (!m || (!m.bgm && !m.bgs)) return;
        $.musicSaved = { bgm: AudioManager.saveBgm(), bgs: AudioManager.saveBgs() };
        if (m.bgm) AudioManager.playBgm({ name: m.bgm, volume: m.bv, pitch: 100, pan: 0 });
        if (m.bgs) AudioManager.playBgs({ name: m.bgs, volume: m.sv, pitch: 100, pan: 0 });
        else if (m.bgm) AudioManager.stopBgs();
    };
    $.musicStop = function() {
        var sv = $.musicSaved; $.musicSaved = null; if (!sv) return;
        AudioManager.replayBgm(sv.bgm); AudioManager.replayBgs(sv.bgs);
    };
    Scene_NpCamp.prototype.start = function() { Scene_MenuBase.prototype.start.call(this); $.musicStart($.session && $.session.where); };
    Scene_NpCamp.prototype.terminate = function() { Scene_MenuBase.prototype.terminate.call(this); $.musicStop(); };

    // ---- разговор у костра тоже успокаивает --------------------------------------
    if (window.NP_Campfire && NP_Campfire.maybe) {
        var _maybe = NP_Campfire.maybe;
        NP_Campfire.maybe = function() {
            var r = _maybe.apply(this, arguments);
            try { if (r) $gameParty.members().forEach(function(m) { S().add(m.actorId(), -10, 'talk', NP_L('разговор у костра', "campfire talk")); }); } catch (e) {}
            return r;
        };
    }

    // ---- настройки -------------------------------------------------------------
    ConfigManager.npCampSkills = true;
    ConfigManager.npCampMusic = true;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _make.apply(this, arguments); c.npCampSkills = this.npCampSkills; c.npCampMusic = this.npCampMusic; return c; };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) { _apply.apply(this, arguments); this.npCampSkills = (c && c.npCampSkills !== undefined) ? !!c.npCampSkills : true; this.npCampMusic = (c && c.npCampMusic !== undefined) ? !!c.npCampMusic : true; };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() { _addGen.apply(this, arguments); this.addCommand(NP_L('Умения на привале', "Camp Skills"), 'npCampSkills'); this.addCommand((window.NP_Language && NP_Language.isEn && NP_Language.isEn()) ? 'Camp music' : 'Музыка привала', 'npCampMusic'); };

    return $;
})();
