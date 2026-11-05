var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_RareMobs.js  (RU mod for Nymphomania Priestess v080j)
//=============================================================================
/*:
 * @plugindesc [RU mod] Rare elite monsters (13 kinds): recolour + glow, own mechanics, rare loot, rare bestiary. Place after NP_BossBalance.
 * @author RU mod
 *
 * @help
 * Option «Редкие враги» / «Rare enemies» (Options → Battle), default ON.
 * OFF = vanilla: no rare spawns, no mechanics, no extra rewards (the bestiary stays readable).
 *
 * Spawn: when a dungeon spawns one of the 13 base monsters from Map029
 * (add_event … 29), the first eligible symbol after entering the map can
 * become rare. Chance 4–6 % per kind, at most one rare per map entry. The
 * roll is made once per (map, day) and stored in the save. After a kill
 * (or the thief rat escaping) that kind does not appear again that day.
 *
 * Rare: ★ name, HP ×1.5/2/2.25/2.5 (Fap/Easy/Normal/Hard), exp ×2,
 * no ero-grab (S61 off, ero skills replaced by a normal attack), stun/sleep
 * resistance 40/45/45/50 %, a super hit deals at most 50 % max HP.
 * Each kind has its own mechanic (see the bestiary).
 *
 * Loot on every kill: gold, base materials ×3, a per-kind bonus. The rare
 * item drops with its chance (12–30 %), strongest ones only at dungeon
 * level ≥ 3, and only once per kind (afterwards: gold/exp/materials only).
 * Items are looked up at runtime by <NP_ITEM:key> (NP_Items), then by the
 * planned ID/icon, then by name. Yarizo-only reward (Bear Claw) turns into
 * 600 G when S643 (Yarizo contract) is off.
 *
 * Menu «Бестиарий редких» / «Rare bestiary»: list of the 13 kinds; met kinds
 * show the recoloured sprite, where met, mechanic, kills; unmet ones are
 * ??? silhouettes. Every kind (met or not) shows a lore text and an indirect
 * weakness hint («Примета»); only the Royal Jelly also shows «Особенность»
 * (its mechanics, once met). Loot slot: a dark pulsing silhouette of the item icon
 * until it drops, then the real icon + «Добыча получена» + name.
 *
 * API: NP_RareMobs.on(), .ctx(), .state(), .forceNext = key, .mark(eventId,key),
 *      .resolveItem(key), .MOBS, .KEYS, .open()
 */
var Imported = Imported || {};
Imported.NP_RareMobs = true;

(function() {
    'use strict';
    var $ = window.NP_RareMobs = {};
    $.VERSION = '1.0';
    var S_GALLERY = 5, S_BATTLE = 14, S_ERO = 61, S_YARIZO = 643, TEMPLATE_MAP = 29;
    var PRI = 2, PM = 10;

    function gs(i) { return !!(window.$gameSwitches && $gameSwitches.value(i)); }
    function gv(i) { return Number((window.$gameVariables && $gameVariables.value(i)) || 0); }
    function sv(i, v) { $gameVariables.setValue(i, v); }
    function L(ru, en) { return typeof NP_L === 'function' ? NP_L(ru, en) : ru; }
    function rnd() { return $.rng ? $.rng() : Math.random(); }
    function mlog(t) { try { if (typeof set_mlog === 'function') set_mlog(t); } catch (e) {} }
    function say(color, ru, en) { mlog('\\c[' + color + ']' + L(ru, en)); }
    function actor(id) { return window.$gameActors ? $gameActors.actor(id) : null; }
    function members() { return window.$gameParty ? $gameParty.members() : []; }
    function alive() { return members().filter(function(m) { return m.hp > 0; }); }
    function inParty(id) { return alive().some(function(m) { return m.actorId() === id; }); }
    function SA() { return window.NP_SuperAttack || null; }
    function day() { return gv(4); }
    function night() { return gv(5) === 1; }
    function dlvl() { return Math.max(1, gv(169)); }
    function gallery() { return gs(S_GALLERY); }
    function ename() { return String(gv(139) || '').replace(/\s*\[Lvl:\d+\]\s*$/, ''); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function err(where, e) { console.error('[NP_RareMobs] ' + where, e); }

    // ------------------------------------------------------------------ table
    // look: hue° / sat× / val× / tint [r,g,b,k] / aura colour
    // rare: {key: <NP_ITEM:key>, kind: w/a/i, id: planned id, icon: planned icon, names: [jp, ru, en]}
    var MOBS = {
        rat:    { base: 101, chance: 5, time: 'any', ru: 'Крыса-воришка', en: 'Thief Rat',
                  look: { h: 0, s: 1, v: 1.1, tint: [255, 200, 60, 0.55], aura: [255, 210, 80] },
                  gold: 80, bonus: [], rare: { key: 'miser', kind: 'a', id: 173, icon: 657, names: ['守銭奴の指輪', 'Кольцо скупца', "Miser's Ring"] }, pct: 25, gate: 0,
                  mech: ['Очень вёрткая (уклонение +3). На 2-м ходу крадёт 5% вашего золота, после 3-го своего хода сбегает. Сон и оглушение её держат. Убили — золото вернётся вдвое.',
                         'Very evasive (evasion +3). On its 2nd turn it steals 5% of your gold and flees after its 3rd turn. Sleep and stun hold it. Kill it and you get the gold back twice over.'] },
        bee:    { base: 103, chance: 4, time: 'day', ru: 'Королева пчёл', en: 'Bee Queen',
                  look: { h: 20, s: 1.3, v: 1.1, tint: [255, 170, 40, 0.35], aura: [255, 230, 90] },
                  gold: 90, bonus: [['focus', 1]], rare: { key: 'flaskbelt', kind: 'a', id: 164, icon: 648, names: ['瓶のベルト', 'Пояс склянок', 'Flask Belt'] }, pct: 20, gate: 0,
                  mech: ['Рой: первые 2 хода урон по ней −50%. Огонь, огненная склянка или супер-удар сразу разгоняют рой. Жало бьёт сильнее обычного. Встречается только днём.',
                         'Swarm: for the first 2 turns she takes −50% damage. Fire, a fire flask or a super hit disperse the swarm at once. Her sting hits harder. Day only.'] },
        wolf:   { base: 112, chance: 6, time: 'night', ru: 'Седой вожак', en: 'Grey Packleader',
                  look: { h: 0, s: 0.15, v: 1.6, aura: [170, 210, 255] },
                  gold: 140, bonus: [['lure', 1]], rare: { key: null, kind: 'w', id: 282, icon: 642, names: ['狩猟用の槍', 'Охотничья рогатина', 'Boar Spear'] }, pct: 30, gate: 0,
                  mech: ['Вой стаи: раз в 3 хода воет (предупреждает заранее) — урон +2 за каждый вой. «Щит» у любого в отряде глушит вой. Оглушение сбрасывает накопленный вой. Только ночью.',
                         'Pack howl: every 3 turns it howls (warns a turn ahead) — +2 damage per howl. A Shield on anyone in the party drowns the howl. A stun resets the stacks. Night only.'] },
        bear:   { base: 122, chance: 5, time: 'night', ru: 'Медведь-шатун', en: 'Rogue Bear',
                  look: { h: 0, s: 1, v: 0.75, tint: [200, 40, 40, 0.5], aura: [255, 60, 50] },
                  gold: 200, bonus: [], yarizo: true, rare: { key: 'bearclaw', kind: 'w', id: 283, icon: 643, names: ['熊の爪', 'Медвежий коготь', 'Bear Claw'] }, pct: 20, gate: 0,
                  mech: ['Ярость: при HP ниже 50% встаёт на дыбы (ход-предупреждение), затем бьёт дважды за ход, но броня −1. «Щит» на цели вдвое режет двойной удар. Без договора с Яризо коготь заменяется на 600 G. Только ночью.',
                         'Rage: below 50% HP it rears up (warning turn), then strikes twice per turn but loses 1 armour. A Shield on the target halves the double strike. Without Yarizo\'s contract the claw becomes 600 G. Night only.'] },
        goblin: { base: 204, chance: 6, time: 'any', ru: 'Чумной знахарь', en: 'Plague Herbalist',
                  look: { h: 0, s: 1, v: 1, tint: [90, 220, 60, 0.5], aura: [120, 255, 80] },
                  gold: 110, bonus: [['pepper', 1]], rare: { key: 'sling', kind: 'w', id: 215, icon: 644, names: ['錬金術師のパチンコ', 'Праща алхимика', "Alchemist's Sling"] }, pct: 25, gate: 0,
                  mech: ['Склянка: через ход готовит склянку (видно, в кого) и бросает её: урон и +15 усталости. «Щит» разбивает склянку. Зельеварка в отряде может поймать её себе.',
                         'Flask: every other turn it readies a flask (you see the target) and throws it: damage and +15 fatigue. A Shield shatters it. The Potion Maker in the party may catch it for herself.'] },
        gnoll:  { base: 242, chance: 5, time: 'any', ru: 'Гнолл-знаменосец', en: 'Gnoll Bannerman',
                  look: { h: 0, s: 1, v: 0.95, tint: [220, 30, 60, 0.45], aura: [255, 60, 90] },
                  gold: 160, bonus: [], rare: { key: 'medallion', kind: 'a', id: 167, icon: 651, names: ['不屈のメダリオン', 'Медальон стойкости', 'Medallion of Fortitude'] }, pct: 15, gate: 3,
                  mech: ['Знамя: раз в 2 хода поднимает знамя — броня +1 (до +3). Супер-удар или удар на 6+ урона ломает знамя: бонус пропадает, гнолл теряет следующий ход.',
                         'Banner: every 2 turns it raises the banner — armour +1 (up to +3). A super hit or a 6+ damage hit breaks it: the bonus is gone and the gnoll loses its next turn.'] },
        golem:  { base: 621, chance: 5, time: 'any', ru: 'Янтарный голем', en: 'Amber Golem',
                  look: { h: -15, s: 1.5, v: 1.15, aura: [255, 190, 60] },
                  gold: 180, bonus: [], rare: { key: 'rage', kind: 'a', id: 168, icon: 652, names: ['怒りのお守り', 'Талисман ярости', 'Talisman of Rage'] }, pct: 15, gate: 3,
                  mech: ['Янтарная корка: броня +4, пока магия, огонь или супер-удар её не расколют (потом броня ниже обычной). Победа даёт отряду +20 заряда супер-удара.',
                         'Amber crust: armour +4 until magic, fire or a super hit cracks it (then lower than normal). The kill gives the party +20 super charge.'] },
        jelly:  { base: 604, chance: 6, time: 'any', ru: 'Королевский мармелад', en: 'Royal Jelly',
                  look: { h: 0, s: 1, v: 1, tint: [190, 90, 255, 0.55], aura: [200, 120, 255] },
                  gold: 150, bonus: [['patches', 2]], rare: { key: 'pin', kind: 'a', id: 169, icon: 653, names: ['安全ピン', 'Булавка', 'Safety Pin'] }, pct: 30, gate: 0,
                  mech: ['Восстанавливает HP каждый ход, пока её не заденут водой или магией. Кислота: попадание по жрице портит облачение.',
                         'Regains HP every turn until hit by water or magic. Acid: a hit on the priestess damages her vestments.'] },
        raiju:  { base: 681, chance: 4, time: 'any', ru: 'Грозовой Райдзю', en: 'Storm Raiju',
                  look: { h: 90, s: 1.3, v: 1.05, aura: [190, 140, 255] },
                  gold: 220, bonus: [], rare: { key: 'gamble', kind: 'a', id: 172, icon: 656, names: ['博打の指輪', 'Кольцо азарта', "Gambler's Ring"] }, pct: 12, gate: 3,
                  mech: ['Каждый ход копит заряд; на 3-м — разряд по всему отряду (HP не опустится ниже 1). Супер-удар крадёт заряд: стаки сбрасываются, ударивший получает +30 заряда.',
                         'Builds charge every turn; on the 3rd it discharges on the whole party (HP never below 1). A super hit steals the charge: stacks reset, the attacker gets +30 charge.'] },
        fire:   { base: 402, chance: 5, time: 'any', ru: 'Сердце пламени', en: 'Heart of Flame',
                  look: { h: 180, s: 1.1, v: 1.1, aura: [90, 180, 255] },
                  gold: 200, bonus: [], rare: { key: 'censer', kind: 'w', id: 125, icon: 641, names: ['暁の香炉', 'Кадило зари', 'Censer of Dawn'] }, pct: 15, gate: 3,
                  mech: ['Жар: кто бьёт его вблизи, теряет 1 HP. Вода ранит вдвое. При гибели взрывается (3 урона всему отряду), если добить не водой и не склянкой Зельеварки.',
                         'Heat: melee attackers lose 1 HP. Water deals double. Explodes on death (3 damage to the party) unless finished with water or the Potion Maker\'s flask.'] },
        sword:  { base: 633, chance: 4, time: 'any', ru: 'Клинок-отступник', en: 'Renegade Blade',
                  look: { h: 140, s: 1.4, v: 0.9, aura: [220, 40, 60] },
                  gold: 240, bonus: [], rare: { key: 'hunger', kind: 'w', id: 27, icon: 647, names: ['飢えの刃', 'Клинок голода', 'Hunger Blade'] }, pct: 12, gate: 3,
                  mech: ['Жажда: попадание выпивает 15 заряда супер-удара у цели. Если с его прошлого хода никто его не ранил — контрудар +3.',
                         'Thirst: a hit drains 15 super charge from the target. If nobody wounded it since its last turn — a +3 counter-strike.'] },
        armor:  { base: 631, chance: 6, time: 'night', ru: 'Ночной латник', en: 'Night Plate',
                  look: { h: 0, s: 0.4, v: 0.8, tint: [120, 150, 200, 0.35], aura: [230, 240, 255] },
                  gold: 170, bonus: [], rare: { key: 'rosary', kind: 'a', id: 166, icon: 650, names: ['ロザリオ', 'Чётки', 'Rosary'] }, pct: 20, gate: 0,
                  mech: ['Броня +3, но святое ранит в 1,5 раза сильнее. Каждый удар по нему снимает жрице 1 стресса. Только ночью.',
                         'Armour +3, but holy damage hurts 1.5× more. Each hit on it relieves 1 stress from the priestess. Night only.'] },
        zombie: { base: 501, chance: 6, time: 'night', ru: 'Болотный утопленник', en: 'Bog Drowned',
                  look: { h: 0, s: 1, v: 0.9, tint: [80, 160, 70, 0.5], aura: [120, 220, 140] },
                  gold: 150, bonus: [['holy', 1]], rare: { key: 'campamulet', kind: 'a', id: 170, icon: 654, names: ['焚き火のお守り', 'Амулет костра', 'Campfire Amulet'] }, pct: 20, gate: 0,
                  mech: ['Болотная хватка: после попадания может схватить цель — та теряет ход, если не вырвется; удар союзника освобождает. Пока жив — +1 стресса отряду за ход. Святое ×1,5. Только ночью.',
                         'Mire grip: after a hit it may grab the target — it loses its turn unless it breaks free; an ally hitting the zombie frees it. While alive: +1 stress to the party per turn. Holy ×1.5. Night only.'] }
    };
    var KEYS = ['rat', 'bee', 'wolf', 'bear', 'goblin', 'gnoll', 'golem', 'jelly', 'raiju', 'fire', 'sword', 'armor', 'zombie'];
    var BASE2KEY = {};
    KEYS.forEach(function(k) { MOBS[k].key = k; BASE2KEY[MOBS[k].base] = k; });
    $.MOBS = MOBS; $.KEYS = KEYS; $.BASE2KEY = BASE2KEY;
    // bestiary lore + indirect weakness hint (shown even for unmet kinds; name stays «???»)
    var LORE = {
        rat: { lore: ["Говорят, в подвалах и норах она собрала целый клад: обрывки кошельков, медяки и даже чей-то фамильный перстень. Шерсть её отливает старым золотом, а глазки-бусинки не отрываются от чужих поясов. Никто не видел, чтобы она дралась всерьёз: она приходит за монетой и исчезает раньше, чем пропажу хватятся.",
                "They say she has hoarded a whole treasure in cellars and burrows: purse scraps, coppers, even someone's family signet ring. Her fur gleams like old gold, and her beady eyes never leave other people's belts. No one has seen her truly fight: she comes for the coin and is gone before anyone misses it."],
               hint: ["Она не станет ждать, пока вы соберётесь с духом: к третьему вдоху она уже у щели. Но тот, кто спит или шатается от удара, никуда не убежит — и вернёт всё с лихвой.",
                "She won't wait for you to gather your courage: by her third breath she is already at the crack. But one who sleeps or reels from a blow runs nowhere — and pays it all back with interest."] },
        bee: { lore: ["Над летними полянами порой слышен гул, низкий, как далёкий колокол: это летит королева. Её панцирь отливает мёдом и янтарём, а вокруг вьётся живое облако верной свиты. Лишь при солнце покидает она улей, и цветы на её пути склоняют головы.",
                "Above summer glades you sometimes hear a hum as deep as a distant bell: the queen is flying. Her shell gleams with honey and amber, and a living cloud of loyal retinue swirls around her. She leaves the hive only under the sun, and the flowers bow their heads as she passes."],
               hint: ["Свита принимает на себя каждый удар, но пчёлы помнят древний страх перед дымом и пламенем. Да и преданность роя не вечна: пара мгновений — и он поредеет.",
                "The retinue takes every blow for her, yet bees remember an ancient fear of smoke and flame. And a swarm's devotion does not last forever: a few moments, and it thins out."] },
        wolf: { lore: ["Старый волк с шерстью цвета инея водит стаю уже не одну зиму. Шрамы на его морде — летопись охотников, что так и не вернулись домой. Он выходит только под луной, и стоит ему завыть, как вся ночь отзывается эхом.",
                "An old wolf with frost-coloured fur has led the pack for many winters. The scars on his muzzle are a chronicle of hunters who never came home. He walks only under the moon, and when he howls the whole night echoes back."],
               hint: ["С каждым куплетом его песни клыки становятся острее, но вой, разбившийся о поднятый щит, ничего не стоит. А тот, кого оглушили, забывает и мотив.",
                "With every verse of his song his fangs grow sharper, yet a howl that breaks against a raised shield is worth nothing. And one who has been stunned forgets the tune."] },
        bear: { lore: ["Этой зимой шатун так и не уснул, и голод сделал из него нечто иное. Его шкура темна от запёкшейся крови, а в глазах тлеют угли. Он бродит ночами и крушит всё, что пахнет живым.",
                "This winter the rogue never slept, and hunger made something else of him. His hide is dark with dried blood, and embers smoulder in his eyes. He roams at night, smashing anything that smells alive."],
               hint: ["Пока рана неглубока, он лишь ворчит. Но когда половина его крови уйдёт в землю, он встанет на дыбы — встречайте его тогда не грудью, а щитом. В ярости он и сам забывает о защите.",
                "While the wound is shallow he only growls. But once half his blood has soaked into the earth he rears up — meet him then with a shield, not your chest. In his rage he forgets his own guard."] },
        goblin: { lore: ["Когда-то он лечил гоблинов своего племени, пока не начал испытывать зелья на них самих. От него пахнет серой и прелыми травами, а пояс звенит склянками с мутной жижей. Говорят, ни одно его снадобье не лечит, зато каждое что-нибудь отнимает.",
                "He once healed the goblins of his tribe, until he began testing his brews on them. He reeks of sulphur and rotting herbs, and his belt clinks with flasks of murky sludge. They say none of his remedies heal — but every one of them takes something away."],
               hint: ["Он никогда не бросает сразу: сперва долго целится, бормоча над пробкой. Стекло хрупко и разлетится о щит, а ловкие руки той, что сама варит зелья, могут поймать его на лету.",
                "He never throws at once: first he takes long aim, muttering over the cork. Glass is brittle and shatters on a shield, and the nimble hands of one who brews potions herself may catch it mid-air."] },
        gnoll: { lore: ["Над разорёнными руинами до сих пор реет рваное знамя: его несёт гнолл, переживший собственный отряд. Он верит, что смерть не найдёт его, пока полотнище развевается. И, глядя на него, в это почти веришь.",
                "A tattered banner still flies over the ravaged ruins, carried by a gnoll who outlived his own warband. He believes death cannot find him while the cloth still flutters. Watching him, you almost believe it too."],
               hint: ["С каждым взмахом знамени его шкура будто дубеет. Мелкие уколы лишь раскачивают древко, но один по-настоящему тяжёлый удар его переломит — и знаменосец замешкается, подбирая обломки.",
                "With every wave of the banner his hide seems to toughen. Small pricks only rock the pole, but one truly heavy blow will snap it — and the bannerman will falter, gathering the pieces."] },
        golem: { lore: ["Древние мастера залили глиняного стража смолой, и за века она застыла янтарной бронёй. Внутри, словно мошки в капле, темнеют давно забытые руны. Он медлителен и глух, но клинки соскальзывают с его панциря, как дождь со стекла.",
                "Ancient masters poured resin over this clay guardian, and over the centuries it hardened into amber armour. Inside, like midges in a drop, long-forgotten runes glimmer darkly. He is slow and deaf, yet blades slide off his shell like rain off glass."],
               hint: ["Янтарь не боится стали, но помнит, что родился из смолы: жар и чары заставляют его трескаться. Под расколотой коркой глина мягче, чем была прежде, а осколки, говорят, хранят в себе искру силы.",
                "Amber fears no steel, but it remembers being born of resin: heat and spells make it crack. Beneath the broken crust the clay is softer than before, and the shards, they say, hold a spark of power."] },
        jelly: { lore: ["Студенистая королева подземных пещер переливается фиалковым, словно огромный леденец. Она медленно перетекает по камням и растворяет всё, что попадётся на пути, даже ткань. Раны на ней затягиваются быстрее, чем их успеваешь заметить.",
                "The gelatinous queen of the underground caves shimmers violet like a giant boiled sweet. She slowly flows over the stones, dissolving everything in her path, even cloth. Her wounds close faster than you can notice them."],
               hint: ["Сталь вязнет в её студне без следа, но от брызг воды и шёпота чар она шипит и съёживается — и больше не срастается.",
                "Steel sinks into her jelly without a trace, but at a splash of water or a whisper of spells she hisses and shrivels — and knits no more."] },
        raiju: { lore: ["Райдзю — зверь, рождённый ударом молнии в подземное озеро. Шерсть его потрескивает искрами, и в темноте пещер его выдают сиреневые всполохи. Говорят, он питается грозой, а насытившись, щедро делится ею со всеми вокруг.",
                "The Raiju is a beast born when lightning struck an underground lake. His fur crackles with sparks, and in the dark of the caves violet flashes give him away. They say he feeds on storms, and once sated he generously shares them with everyone around."],
               hint: ["Слушайте треск: дважды он копит, на третий раз гремит. Кто ударит его во всю силу, пока гроза не сорвалась, заберёт её себе.",
                "Listen to the crackle: twice he gathers, the third time he thunders. Whoever strikes him with all their might before the storm breaks will take it for themselves."] },
        fire: { lore: ["В глубине огненного святилища горит пламя, которое давно перестало быть красным. Синий огонь обрёл волю и сердце и теперь бродит по залам, выжигая камень до стекла. Воздух вокруг него дрожит, а тени пляшут, хотя ветра нет.",
                "Deep in the fire sanctuary burns a flame that long ago stopped being red. The blue fire gained a will and a heart, and now it roams the halls, burning stone to glass. The air around it shimmers, and shadows dance though there is no wind."],
               hint: ["Кто тянется к нему голой рукой, обжигает пальцы. Пламя, умирающее в ярости, забирает с собой всех, кто рядом, но вода — или склянка той, что варит зелья, — гасит его тихо.",
                "Whoever reaches for it barehanded burns their fingers. A flame that dies in fury takes everyone nearby with it, but water — or the flask of one who brews potions — puts it out quietly."] },
        sword: { lore: ["Этот меч когда-то служил рыцарю, предавшему свой орден, и, говорят, перенял нрав хозяина. Он парит сам по себе, а по лезвию бегут багровые прожилки, похожие на вены. Каждый, кого он ранил, чувствует, как из него уходит нечто большее, чем кровь.",
                "This sword once served a knight who betrayed his order, and they say it took on its master's temper. It hovers on its own, and crimson streaks like veins run along the blade. Everyone it wounds feels something more than blood draining away."],
               hint: ["Он пьёт не кровь, а решимость: копить силу рядом с ним опасно, лучше тратить её сразу. И не давайте ему скучать — клинок, которого никто не тронул, бьёт злее.",
                "It drinks not blood but resolve: hoarding your strength near it is dangerous, better spend it at once. And don't let it get bored — a blade nobody has touched strikes all the harder."] },
        armor: { lore: ["Пустые латы павшего паладина бродят по ночным подземельям, всё ещё неся дозор. Внутри никого нет — только холодный лунный свет и эхо давней клятвы. Сталь его крепка, как в день ковки.",
                "The empty plate of a fallen paladin wanders the dungeons at night, still keeping watch. There is no one inside — only cold moonlight and the echo of an old oath. Its steel is as strong as on the day it was forged."],
               hint: ["Обычный клинок лишь звенит о его латы, но свет веры жжёт их сильнее любого металла: он помнит, кому когда-то служил. И странно — этот звон почему-то успокаивает жрицу.",
                "An ordinary blade only rings against its plate, but the light of faith burns it more than any metal: it remembers whom it once served. And strangely, that ringing somehow calms the priestess."] },
        zombie: { lore: ["Утонувшие в трясине не всегда остаются на дне. В безлунные ночи он поднимается из болота, весь в тине и водорослях, и ищет, кого утащить с собой. За ним тянется запах гнили, от которого у живых сжимается сердце.",
                "Those drowned in the mire do not always stay at the bottom. On moonless nights he rises from the bog, draped in slime and weeds, looking for someone to drag down with him. A stench of rot trails behind him that makes the hearts of the living clench."],
               hint: ["Его хватка цепка, как сама топь: одному не вырваться, но плечо товарища вытащит из любой трясины. Не тяните время — смрад давит всё сильнее. А мёртвые боятся того же, чего боялись при жизни: святого слова.",
                "His grip is as tenacious as the bog itself: alone you won't break free, but a comrade's shoulder will pull you out of any mire. Don't drag it out — the stench presses harder and harder. And the dead fear what they feared in life: the holy word."] }
    };
    KEYS.forEach(function(k) { if (LORE[k]) { MOBS[k].lore = LORE[k].lore; MOBS[k].hint = LORE[k].hint; } });
    $.LORE = LORE;
    $.lore = function(k) { var c = MOBS[k]; return c && c.lore ? L(c.lore[0], c.lore[1]) : ''; };
    $.hint = function(k) { var c = MOBS[k]; return c && c.hint ? L(c.hint[0], c.hint[1]) : ''; };
    var BONUS = {
        focus:   { key: 'focus', kind: 'i', id: 14, icon: 659, names: ['集中のエリクサー', 'Эликсир сосредоточения', 'Focus Elixir'] },
        lure:    { key: 'lure', kind: 'i', id: 25, icon: 664, names: ['狩猟用の誘引剤', 'Охотничий манок', 'Hunting Lure'] },
        pepper:  { key: 'pepper', kind: 'i', id: 13, icon: 658, names: ['胡椒の瓶', 'Перечная склянка', 'Pepper Flask'] },
        patches: { key: 'patches', kind: 'i', id: 17, icon: 662, names: ['糸とつぎあて', 'Нитки и заплатки', 'Thread and Patches'] },
        holy:    { key: null, kind: 'i', id: 40, icon: 666, names: ['聖水瓶', 'Святая вода', 'Holy Water'] }
    };
    $.BONUS = BONUS;

    $.on = function() { return ConfigManager.npRareMobs !== false; };
    $.HP_FLOOR = 12;
    $.hpMult = function() { return { 0: 2.0, 3: 2.0, 1: 2.25, 2: 2.5 }[gv(3)] || 2.25; };
    $.resist = function() { return { 0: 40, 3: 45, 1: 45, 2: 50 }[gv(3)] || 45; };
    $.CAP = 0.5;
    $.DUPE_GOLD = 400;

    // ------------------------------------------------------------------ option
    ConfigManager.npRareMobs = true;
    var _mk = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _mk.apply(this, arguments); c.npRareMobs = this.npRareMobs; return c; };
    var _ap = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _ap.apply(this, arguments);
        this.npRareMobs = (c && c.npRareMobs !== undefined) ? !!c.npRareMobs : true;
    };
    function regCat() { try { if (window.NP_OptionsCategories && NP_OptionsCategories.register) NP_OptionsCategories.register('npRareMobs', 'battle'); } catch (e) {} }
    var _bootStart = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { regCat(); _bootStart.apply(this, arguments); };
    if (typeof Window_Options !== 'undefined') {
        var _addGen = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addGen.apply(this, arguments);
            this.addCommand(L('Редкие враги', 'Rare enemies'), 'npRareMobs');
            regCat();
        };
    }

    // ------------------------------------------------------------------ save state
    // $gameSystem._npRare = { v, salt, rolls:{'map:day:key':0|1}, killed:{key:day}, best:{key:{met,seen:{map:name},kills,dropped,flees}} }
    $.state = function() {
        if (!window.$gameSystem) return null;
        var s = $gameSystem._npRare;
        if (!s) s = $gameSystem._npRare = { v: 1, salt: Math.floor(Math.random() * 1e9), rolls: {}, killed: {}, best: {} };
        if (!s.rolls) s.rolls = {};
        if (!s.killed) s.killed = {};
        if (!s.best) s.best = {};
        return s;
    };
    $.best = function(key) {
        var s = $.state(); if (!s) return { met: false, seen: {}, kills: 0, dropped: false, flees: 0 };
        var b = s.best[key];
        if (!b) b = s.best[key] = { met: false, seen: {}, kills: 0, dropped: false, flees: 0 };
        if (!b.seen) b.seen = {};
        return b;
    };
    function hash01(str) {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
        return (h >>> 0) / 4294967296;
    }
    $.hash01 = hash01;

    // ------------------------------------------------------------------ items (runtime lookup)
    function dbOf(kind) { return kind === 'w' ? window.$dataWeapons : kind === 'a' ? window.$dataArmors : window.$dataItems; }
    var _itemCache = {};
    $.resolveSpec = function(spec) {
        if (!spec) return null;
        var ck = spec.kind + ':' + (spec.key || '') + ':' + spec.id;
        if (_itemCache[ck]) return _itemCache[ck];
        var db = dbOf(spec.kind), found = null, i, it;
        if (!db) return null;
        if (spec.key) {
            var re = new RegExp('<NP_ITEM:\\s*' + spec.key + '\\s*>', 'i');
            for (i = 1; i < db.length && !found; i++) { it = db[i]; if (it && re.test(it.note || '')) found = it; }
        }
        if (!found) {
            it = db[spec.id];
            if (it && (it.iconIndex === spec.icon || spec.names.indexOf(it.name) >= 0)) found = it;
        }
        if (!found) {
            for (i = 1; i < db.length && !found; i++) { it = db[i]; if (it && it.name && spec.names.indexOf(it.name) >= 0) found = it; }
        }
        if (found) _itemCache[ck] = found;
        return found;
    };
    $.resolveItem = function(key) { var m = MOBS[key]; return m ? $.resolveSpec(m.rare) : null; };
    $.itemIds = function() {
        var r = {};
        KEYS.forEach(function(k) { var it = $.resolveItem(k); r[k] = it ? MOBS[k].rare.kind.toUpperCase() + it.id + ' ' + it.name + ' icon' + it.iconIndex : null; });
        return r;
    };

    // ------------------------------------------------------------------ spawn
    var _tplBase = {};
    function templateBase(oev) {
        if (!oev) return 0;
        if (_tplBase[oev.id] !== undefined) return _tplBase[oev.id];
        var base = 0;
        (oev.pages || []).some(function(p) {
            return (p.list || []).some(function(c) {
                if (c.code === 122 && c.parameters[0] === 121 && c.parameters[1] === 121 && c.parameters[2] === 0 && c.parameters[3] === 0 && BASE2KEY[c.parameters[4]]) {
                    base = c.parameters[4]; return true;
                }
                return false;
            });
        });
        _tplBase[oev.id] = base;
        return base;
    }
    $.templateBase = templateBase;
    $.timeOk = function(cfg) { return cfg.time === 'any' || (cfg.time === 'night' ? night() : !night()); };
    $.rollFor = function(mapId, key) {
        var s = $.state(), d = day(), rk = mapId + ':' + d + ':' + key;
        if (s.rolls[rk] === undefined) {
            s.rolls[rk] = hash01(s.salt + '|' + rk) * 100 < MOBS[key].chance ? 1 : 0;
            Object.keys(s.rolls).forEach(function(k2) { var dd = Number(k2.split(':')[1]); if (dd < d - 3) delete s.rolls[k2]; });
        }
        return s.rolls[rk] === 1;
    };
    $.eligible = function(key) {
        var cfg = MOBS[key], s = $.state();
        return !!cfg && $.timeOk(cfg) && s.killed[key] !== day();
    };
    $.onSpawn = function(ev, oev) {
        if (!ev || !$.on() || gallery()) return;
        var base = templateBase(oev), key = BASE2KEY[base];
        if (!key) return;
        var forced = $.forceNext && ($.forceNext === true || $.forceNext === key);
        if (!forced) {
            if ($gameMap._npRareEntry) return;
            if (!$.eligible(key) || !$.rollFor($gameMap.mapId(), key)) return;
        } else $.forceNext = null;
        ev._npRare = key;
        $gameMap._npRareEntry = ev.eventId();
        $.lastSpawn = { key: key, eventId: ev.eventId(), mapId: $gameMap.mapId(), forced: !!forced };
    };
    $.mark = function(eventId, key) {
        var ev = $gameMap.event(eventId); if (!ev || !MOBS[key]) return false;
        ev._npRare = key; $gameMap._npRareEntry = eventId; return true;
    };
    if (typeof Game_Map !== 'undefined') {
        var _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { this._npRareEntry = 0; return _setup.apply(this, arguments); };
        var _spawn = Game_Map.prototype.knsSpawnEventInOtherMap;
        if (_spawn) {
            Game_Map.prototype.knsSpawnEventInOtherMap = function(x, y, dir, originalMapId, originalEvent) {
                var r = _spawn.apply(this, arguments);
                if (originalMapId === TEMPLATE_MAP) {
                    try { $.onSpawn(this._events[this._lastSpawnEventId], originalEvent); } catch (e) { err('spawn', e); }
                }
                return r;
            };
        }
    }
    $.rareOf = function(ch) {
        if (!ch || !ch._npRare || !$.on() || ch._erased) return null;
        return MOBS[ch._npRare] || null;
    };

    // ------------------------------------------------------------------ recolour (cached per sprite sheet + kind)
    var _tint = {};
    function rgb2hsv(r, g, b) {
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
        if (d) {
            if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
            h *= 60; if (h < 0) h += 360;
        }
        return [h, mx ? d / mx : 0, mx / 255];
    }
    function hsv2rgb(h, s, v) {
        var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }
    function recolorData(data, look) {
        var t = look.tint;
        for (var i = 0; i < data.length; i += 4) {
            if (!data[i + 3]) continue;
            var hsv = rgb2hsv(data[i], data[i + 1], data[i + 2]);
            var h = (hsv[0] + (look.h || 0) + 720) % 360, s = clamp(hsv[1] * (look.s || 1), 0, 1), v = clamp(hsv[2] * (look.v || 1), 0, 1);
            var c = hsv2rgb(h, s, v);
            if (t) {
                var lum = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
                c[0] = c[0] * (1 - t[3]) + lum * t[0] * t[3] * 1.25;
                c[1] = c[1] * (1 - t[3]) + lum * t[1] * t[3] * 1.25;
                c[2] = c[2] * (1 - t[3]) + lum * t[2] * t[3] * 1.25;
            }
            data[i] = clamp(c[0], 0, 255); data[i + 1] = clamp(c[1], 0, 255); data[i + 2] = clamp(c[2], 0, 255);
        }
    }
    $.recolorData = recolorData;
    function ctxOf(bmp) { return bmp._context || bmp.context; }
    function canvasOf(bmp) { return bmp._canvas || bmp.canvas; }
    function dirty(bmp) { if (bmp._setDirty) bmp._setDirty(); else if (bmp._baseTexture) bmp._baseTexture.update(); }
    // {main, aura, silhouette, ready}; filled after the sheet loads
    $.tinted = function(name, key) {
        var ck = name + '|' + key, t = _tint[ck];
        if (t) return t;
        t = _tint[ck] = { main: null, aura: null, silhouette: null, ready: false };
        var cfg = MOBS[key], src = ImageManager.loadCharacter(name);
        src.addLoadListener(function() {
            try {
                var w = src.width, h = src.height;
                if (!w || !h) return;
                var main = new Bitmap(w, h); main.blt(src, 0, 0, w, h, 0, 0);
                var mc = ctxOf(main), img = mc.getImageData(0, 0, w, h);
                recolorData(img.data, cfg.look);
                mc.putImageData(img, 0, 0); dirty(main);
                var sil = new Bitmap(w, h), sc = ctxOf(sil);
                sc.drawImage(canvasOf(src), 0, 0);
                sc.globalCompositeOperation = 'source-in';
                var a = cfg.look.aura; sc.fillStyle = 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')'; sc.fillRect(0, 0, w, h);
                sc.globalCompositeOperation = 'source-over'; dirty(sil);
                var aura = new Bitmap(w, h), ac = ctxOf(aura);
                ac.filter = 'blur(3px)'; ac.drawImage(canvasOf(sil), 0, 0); ac.drawImage(canvasOf(sil), 0, 0); ac.filter = 'none'; dirty(aura);
                var dark = new Bitmap(w, h), dc = ctxOf(dark);
                dc.drawImage(canvasOf(src), 0, 0); dc.globalCompositeOperation = 'source-in';
                dc.fillStyle = 'rgb(8,6,14)'; dc.fillRect(0, 0, w, h); dc.globalCompositeOperation = 'source-over'; dirty(dark);
                t.main = main; t.aura = aura; t.silhouette = dark; t.ready = true;
            } catch (e) { err('tint ' + name, e); }
        });
        return t;
    };

    // ------------------------------------------------------------------ map sprite: recolour + glow + scale + ★
    if (typeof Sprite_Character !== 'undefined') {
        var _scUpd = Sprite_Character.prototype.update;
        Sprite_Character.prototype.update = function() {
            _scUpd.apply(this, arguments);
            try { $.updateSprite(this); } catch (e) { if (!$._sprErr) { $._sprErr = 1; err('sprite', e); } }
        };
    }
    function makeStar() {
        var b = new Bitmap(28, 28); b.fontSize = 22; b.textColor = '#ffe066'; b.outlineColor = 'rgba(60,30,0,0.9)'; b.outlineWidth = 4;
        b.drawText('★', 0, 0, 28, 28, 'center');
        var s = new Sprite(b); s.anchor.x = 0.5; s.anchor.y = 1; return s;
    }
    $.updateSprite = function(sp) {
        var ch = sp._character, cfg = $.rareOf(ch), key = cfg ? cfg.key : null;
        if (!key || sp._tileId > 0 || !sp._characterName) {
            if (sp._npRareKey) {
                sp._npRareKey = null;
                if (sp._npGlow) { sp.removeChild(sp._npGlow); sp._npGlow = null; }
                if (sp._npStar) { sp.removeChild(sp._npStar); sp._npStar = null; }
                sp.scale.x = sp.scale.y = 1;
                if (sp._characterName && sp.setCharacterBitmap) sp.setCharacterBitmap();
            }
            return;
        }
        var t = $.tinted(sp._characterName, key);
        if (!t.ready) return;
        if (sp._npRareKey !== key) {
            if (sp._npGlow) sp.removeChild(sp._npGlow);
            if (sp._npStar) sp.removeChild(sp._npStar);
            sp._npRareKey = key;
            sp._npGlow = new Sprite(t.aura); sp._npGlow.anchor.x = 0.5; sp._npGlow.anchor.y = 1; sp._npGlow.blendMode = 1;
            sp.addChild(sp._npGlow);
            sp._npStar = makeStar(); sp.addChild(sp._npStar);
        }
        if (sp.bitmap !== t.main) sp.bitmap = t.main;
        if (sp._npGlow.bitmap !== t.aura) sp._npGlow.bitmap = t.aura;
        var f = sp._frame;
        sp._npGlow.setFrame(f.x, f.y, f.width, f.height);
        var ph = Graphics.frameCount * 0.08;
        sp._npGlow.alpha = 0.45 + 0.35 * Math.sin(ph);
        sp._npGlow.scale.x = sp._npGlow.scale.y = 1.06 + 0.03 * Math.sin(ph);
        sp._npStar.y = -f.height - 2 + 2 * Math.sin(ph * 0.7);
        sp._npStar.alpha = 0.75 + 0.25 * Math.sin(ph * 1.3);
        sp.scale.x = sp.scale.y = 1.15;
    };

    // ------------------------------------------------------------------ battle context
    // $gameSystem._npRareB = { key, base, eid, acts, turn, ... } — current battle only
    $.ctx = function() {
        var c = window.$gameSystem && $gameSystem._npRareB;
        if (!c || !gs(S_BATTLE) || c.base !== gv(121) || !$.on() || gallery()) return null;
        return c;
    };
    $.beforeLoad = function() { if (window.$gameSystem) $gameSystem._npRareB = null; };
    $.afterLoad = function(interp) {
        try { return $._afterLoad(interp); } catch (e) { err('afterLoad', e); }
    };
    $._afterLoad = function(interp) {
        $gameSystem._npRareB = null;
        if (!$.on() || gallery()) return;
        var eid = interp && interp._eventId, ev = eid ? $gameMap.event(eid) : null;
        var key = ev && ev._npRare;
        if (!key && $.forceBattle) { key = $.forceBattle; $.forceBattle = null; }
        var cfg = MOBS[key];
        if (!cfg || cfg.base !== gv(121)) return;
        var c = $gameSystem._npRareB = { key: key, base: cfg.base, eid: eid || 0, acts: 0, turn: 0, dealt: 0, phase: 'start',
            arm0: gv(136), stolen: 0, swarm: 0, howl: 0, rage: false, flaskT: 0, banner: 0, stagger: false, crust: false,
            dried: false, charge: 0, acid: 0, calm: 0, rot: 0, grip: {}, resisted: 0, lastAttr: 0, lastPm: 0, fled: false,
            map: $gameMap.mapId(), log: [] };
        // ×1.5–2.5 by difficulty; tiny base enemies (rat/bee: 2 HP) get a floor so the fight still lasts ~3 rounds
        var mult = $.hpMult(), mhp = Math.max(Math.ceil(gv(122) * mult), Math.ceil($.HP_FLOOR * mult / 2.25));
        c.mhp = mhp; c.baseHp = gv(122);
        sv(122, mhp); sv(123, mhp);
        var nm = String(gv(139) || ''), m = nm.match(/\[Lvl:\d+\]\s*$/);
        sv(139, '★' + L(cfg.ru, cfg.en) + (m ? ' ' + m[0].trim() : ''));
        $gameSwitches.setValue(S_ERO, false);
        sv(156, gv(156) * 2);
        switch (key) {
            case 'rat':    sv(135, gv(135) + 3); break;
            case 'bee':    c.swarm = 2; break;
            case 'wolf': case 'bear': case 'goblin': case 'sword': sv(136, gv(136) + 1); break;
            case 'gnoll':  sv(136, gv(136) + 1); break;
            case 'golem':  sv(136, gv(136) + 4); c.crust = true; break;
            case 'fire':   window.$weak_water = 1; break;
            case 'armor':  sv(136, gv(136) + 3); window.$weak_holy = 1; break;
            case 'zombie': window.$weak_holy = 1; break;
        }
        c.armBase = gv(136);
        var b = $.best(key);
        b.met = true;
        b.seen[$gameMap.mapId()] = $.mapName($gameMap.mapId());
        say(17, '★ Редкий враг: ' + L(cfg.ru, cfg.en) + '! ' + $.shortHint(key), '★ Rare enemy: ' + L(cfg.ru, cfg.en) + '! ' + $.shortHint(key));
        if ($.ENCOUNTER_HINT[key]) { var hh = $.hint(key); if (hh) mlog('\\c[6]«' + hh + '»'); }
        return c;
    };
    $.ENCOUNTER_HINT = { jelly: true };   // the riddle is also printed in the map log on encounter
    $.SHOW_TRAIT = { jelly: true };       // bestiary «Особенность» only for these kinds
    $.shortHint = function(key) {
        var h = {
            rat: ['Сбежит с вашим золотом, если не поторопиться.', 'It will run off with your gold unless you hurry.'],
            bee: ['Рой гасит урон первые 2 хода — огонь его разгонит.', 'The swarm halves damage for 2 turns — fire disperses it.'],
            wolf: ['Вой усиливает его — «Щит» глушит вой.', 'Howls make it stronger — a Shield drowns them.'],
            bear: ['В ярости бьёт дважды — держите «Щит» наготове.', 'Enraged it strikes twice — keep a Shield ready.'],
            goblin: ['Бросает склянки — «Щит» их разбивает.', 'Throws flasks — a Shield shatters them.'],
            gnoll: ['Знамя копит броню — сильный удар его ломает.', 'The banner stacks armour — a heavy hit breaks it.'],
            golem: ['Корку колет магия, огонь или супер-удар.', 'Magic, fire or a super hit cracks the crust.'],
            jelly: ['Обычное оружие её почти не берёт — бейте магией или водой: это ранит и гасит регенерацию.', 'Ordinary weapons barely harm her — strike with magic or water: it hurts and stops the regeneration.'],
            raiju: ['Копит заряд — супер-удар его украдёт.', 'Builds charge — a super hit steals it.'],
            fire: ['Обжигает вблизи и взрывается — добивайте водой.', 'Burns in melee and explodes — finish it with water.'],
            sword: ['Пьёт заряд супер-удара.', 'Drinks super charge.'],
            armor: ['Святое ранит сильнее.', 'Holy hurts it more.'],
            zombie: ['Хватает и не отпускает.', 'Grabs and holds on.']
        }[key];
        return h ? L(h[0], h[1]) : '';
    };
    $.mapName = function(id) {
        var n = '';
        try { if (id === $gameMap.mapId()) n = $gameMap.displayName(); } catch (e) {}
        if (!n && window.$dataMapInfos && $dataMapInfos[id]) n = $dataMapInfos[id].name || '';
        if (/[\u3040-\u30ff\u3400-\u9fff]/.test(n)) n = '';   // untranslated JP editor names
        if (!n) n = gv(169) >= 1 ? L('Подземелье, ур. ', 'Dungeon, lv. ') + gv(169) : L('Окрестности', 'Outskirts');
        return n;
    };

    function snapHp() { var r = {}; members().forEach(function(m) { r[m.actorId()] = m.hp; }); return r; }
    function guarded(aid) { var a = actor(aid); return !!(a && a.isStateAffected(14)); }
    function anyShield() { return alive().some(function(m) { return m.isStateAffected(14); }); }
    function hurt(a, n) {       // party damage, never below 1 HP
        if (!a || a.hp <= 0) return 0;
        var oldHp = a.hp, v = Math.max(0, Math.min(n, oldHp - 1));
        if (v > 0) { a.setHp(a.hp - v); if (a.actorId() === 1) sv(103, a.hp); }
        // Report the actual loss after equipment mitigation, not the requested hit.
        return Math.max(0, oldHp - a.hp);
    }
    function fatigue(aid, n) {
        var a = actor(aid); if (!a) return;
        if (typeof tp_heal === 'function') { try { tp_heal(aid, -n); return; } catch (e) {} }
        a.setTp(Math.min(a.maxTp(), a.tp + n));
    }
    function nameOf(aid) { var a = actor(aid); return a ? a.name() : '?'; }
    function addCharge(aid, n) { var s = SA(); if (s && s.KIND && s.KIND[aid] && inParty(aid)) s.setCharge(aid, s.charge(aid) + n); }
    $._hurt = hurt;

    // CE35 round start → true = battle ends (rat escapes)
    $.roundStart = function() {
        var c = $.ctx(); if (!c) return false;
        try {
            if (c.key === 'rat' && c.acts >= 3 && gv(123) > 0) {
                var e = actor(100);
                if (e && (e.isStateAffected(6) || e.isStateAffected(8))) {
                    say(17, 'Крыса-воришка рвётся удрать, но не может пошевелиться!', 'The thief rat tries to bolt but cannot move!');
                    return false;
                }
                c.fled = true;
                var b = $.best(c.key); b.flees = (b.flees || 0) + 1;
                $.state().killed[c.key] = day();
                say(2, 'Крыса-воришка юркнула в щель и сбежала' + (c.stolen ? ' с ' + c.stolen + ' G!' : '!'),
                    'The thief rat slipped into a crack and escaped' + (c.stolen ? ' with ' + c.stolen + ' G!' : '!'));
                var ev = c.eid && $gameMap.event(c.eid);
                if (ev) { ev._npRare = null; ev.erase(); }
                return true;
            }
        } catch (e) { err('roundStart', e); }
        return false;
    };
    // CE364 end: a party member's turn (V270)
    $.turnCheck = function() {
        var c = $.ctx(); if (!c) return;
        c.phase = 'player';
        try {
            var aid = gv(270);
            if (c.key === 'zombie' && c.grip[aid]) {
                delete c.grip[aid];
                if (window.$skip_turn === 1) return;
                if (rnd() < 0.35) {
                    say(17, nameOf(aid) + ' вырывается из болотной хватки!', nameOf(aid) + ' breaks free of the mire grip!');
                } else {
                    window.$skip_turn = 1; c.gripSkips = (c.gripSkips || 0) + 1;
                    say(2, nameOf(aid) + ' увяз в болотной хватке и теряет ход.', nameOf(aid) + ' is stuck in the mire grip and loses the turn.');
                }
            }
        } catch (e) { err('turnCheck', e); }
    };
    // CE368 start
    $.enemyTurnBegin = function() {
        var c = $.ctx(); if (!c) return;
        c.phase = 'enemyStart';
        var e = actor(100);
        if (e && !e.isStateAffected(6)) window.$enemy_state_sleep = 0;
        if (e && !e.isStateAffected(8)) window.$enemy_state_stun = 0;
    };
    // CE368 end (every enemy turn, also skipped ones)
    $.turnStart = function() {
        var c = $.ctx(); if (!c) return;
        c.turn++;
        try {
            if (gv(123) <= 0) return;
            if (c.key === 'jelly' && !c.dried && gv(123) < gv(122) && (c.regen || 0) < Math.ceil(gv(122) * 0.5)) {
                var h = Math.min(gv(122) - gv(123), Math.max(2, 1 + dlvl()), Math.ceil(gv(122) * 0.1), Math.ceil(gv(122) * 0.5) - (c.regen || 0));
                $._self = true; sv(123, gv(123) + h); $._self = false;
                c.regen = (c.regen || 0) + h;
                say(24, ename() + ' восстанавливается: +' + h + ' HP (' + gv(123) + '/' + gv(122) + ')', ename() + ' regenerates: +' + h + ' HP (' + gv(123) + '/' + gv(122) + ')');
            }
            if (c.key === 'zombie' && c.rot < 5 && window.NP_Stress && NP_Stress.active && NP_Stress.active()) {
                c.rot++;
                NP_Stress.addAll(1, 'rare', L('болотный смрад', 'bog stench'));
                say(2, 'Болотный смрад давит на отряд: +1 стресса.', 'The bog stench weighs on the party: +1 stress.');
            }
        } catch (e) { err('turnStart', e); }
    };

    // CE367 after the action roll → true = skip the normal action (GOTO 敵ターン終了)
    $.enemyAct = function() {
        var c = $.ctx(); if (!c) return false;
        try { return $._enemyAct(c); } catch (e) { err('enemyAct', e); return false; }
    };
    $._enemyAct = function(c) {
        c.phase = 'enemy';
        c.acts++;
        var dealtSince = c.dealt; c.dealt = 0;
        c.snap = snapHp(); c.acted = true;
        // no ero / summon skills for rares: everything except the elemental spells becomes a normal attack
        if (gv(140) > gv(158) && !(c.key === 'fire' || c.key === 'jelly')) sv(140, 1);
        var t = gv(271), en = ename();
        switch (c.key) {
            case 'rat':
                if (c.acts === 1) say(17, en + ' косится на ваш кошелёк…', en + ' eyes your purse…');
                if (c.acts === 2) {
                    var g = $gameParty.gold(), n = Math.min(300, Math.max(g > 0 ? 1 : 0, Math.floor(g * 0.05)));
                    if (n > 0) { $gameParty.loseGold(n); c.stolen += n; }
                    say(2, en + ' выхватывает ' + n + ' G и готовится удрать!', en + ' snatches ' + n + ' G and gets ready to bolt!');
                    return true;
                }
                if (c.acts === 3) say(17, en + ' пятится к щели — в следующем раунде сбежит!', en + ' backs toward a crack — next round it will escape!');
                break;
            case 'bee':
                sv(138, gv(138) + 1);
                break;
            case 'wolf':
                if (c.acts % 3 === 2) say(17, en + ' набирает воздух — скоро вой! («Щит» его заглушит)', en + ' draws breath — a howl is coming! (a Shield drowns it)');
                if (c.acts % 3 === 0) {
                    if (anyShield()) { c.howlBlocked = (c.howlBlocked || 0) + 1; say(17, 'Вой разбивается о поднятый щит!', 'The howl breaks against a raised shield!'); }
                    else { c.howl = Math.min(3, c.howl + 1); say(2, en + ' воет: урон +' + (2 * c.howl) + '.', en + ' howls: damage +' + (2 * c.howl) + '.'); }
                    return true;
                }
                if (c.howl) sv(138, gv(138) + 2 * c.howl);
                break;
            case 'bear':
                if (!c.rage && gv(123) * 2 <= gv(122)) {
                    c.rage = true; sv(136, Math.max(0, gv(136) - 1));
                    say(17, en + ' встаёт на дыбы — ярость! Теперь бьёт дважды. («Щит» на цели снижает урон)',
                        en + ' rears up — rage! It now strikes twice. (a Shield on the target reduces it)');
                    return true;
                }
                if (c.rage) {
                    var gd = guarded(t);
                    sv(138, Math.max(1, Math.round(gv(138) * (gd ? 0.9 : 1.8))));
                    if (gd) say(17, 'Щит принимает двойной удар шатуна!', 'The shield takes the double strike!');
                    else say(2, en + ' бьёт дважды!', en + ' strikes twice!');
                }
                break;
            case 'goblin':
                if (c.flaskT) {
                    var ft = inParty(c.flaskT) ? c.flaskT : t; c.flaskT = 0;
                    if (inParty(PM) && rnd() < 0.5) {
                        var it = $.resolveSpec(BONUS.pepper);
                        if (it) $gameParty.gainItem(it, 1); else $gameParty.gainGold(50);
                        c.caught = (c.caught || 0) + 1;
                        say(17, nameOf(PM) + ' ловит склянку на лету! ' + (it ? '+\\i[' + it.iconIndex + ']' + it.name : '+50 G'),
                            nameOf(PM) + ' catches the flask mid-air! ' + (it ? '+\\i[' + it.iconIndex + ']' + it.name : '+50 G'));
                        return true;
                    }
                    if (guarded(ft)) { c.shattered = (c.shattered || 0) + 1; say(17, 'Склянка разбивается о щит: ' + nameOf(ft) + ' невредим(а).', 'The flask shatters on ' + nameOf(ft) + '\'s shield.'); return true; }
                    var d = hurt(actor(ft), 2 + dlvl()); fatigue(ft, 15); c.thrown = (c.thrown || 0) + 1;
                    say(2, 'Склянка разбивается о ' + nameOf(ft) + ': −' + d + ' HP, +15 усталости.', 'The flask bursts on ' + nameOf(ft) + ': −' + d + ' HP, +15 fatigue.');
                    return true;
                }
                if (c.acts % 2 === 1) {
                    c.flaskT = t;
                    say(17, en + ' достаёт склянку и целится в ' + nameOf(t) + '! («Щит» её разобьёт)', en + ' pulls out a flask and aims at ' + nameOf(t) + '! (a Shield shatters it)');
                }
                break;
            case 'gnoll':
                if (c.stagger) { c.stagger = false; say(17, en + ' поднимает сломанное знамя и теряет ход.', en + ' picks up the broken banner and loses the turn.'); return true; }
                if (c.acts % 2 === 0 && c.banner < 3) {
                    c.banner++; sv(136, gv(136) + 1);
                    say(2, en + ' вздымает знамя: броня +' + c.banner + '.', en + ' raises the banner: armour +' + c.banner + '.');
                    return true;
                }
                break;
            case 'raiju':
                c.charge++;
                if (c.charge >= 3) {
                    c.charge = 0; c.discharges = (c.discharges || 0) + 1;
                    var dmg = 3 + dlvl(), parts = [];
                    alive().forEach(function(m) { var v = hurt(m, dmg); parts.push(m.name() + ' −' + v); });
                    say(2, en + ' разряжается молнией по всему отряду! ' + parts.join(', '), en + ' discharges lightning on the whole party! ' + parts.join(', '));
                    return true;
                }
                if (c.charge === 2) say(17, en + ' искрит (2/3) — следующим ходом разряд по всему отряду!', en + ' crackles (2/3) — next turn it discharges on the whole party!');
                else say(17, en + ' копит заряд (' + c.charge + '/3).', en + ' builds charge (' + c.charge + '/3).');
                break;
            case 'sword':
                if (c.acts > 1 && dealtSince === 0) { c.counter = (c.counter || 0) + 1; sv(138, gv(138) + 3); say(2, en + ' контратакует: урон +3!', en + ' counter-strikes: damage +3!'); }
                break;
        }
        return false;
    };
    // CE367 label 敵ターン終了
    $.enemyEnd = function() {
        var c = $.ctx(); if (!c) return;
        try {
            if (c.acted) {
                c.acted = false;
                var snap = c.snap || {}, lost = {};
                members().forEach(function(m) { var o = snap[m.actorId()]; if (o !== undefined && m.hp < o) lost[m.actorId()] = o - m.hp; });
                if (c.key === 'jelly' && lost[PRI] && c.acid < 3 && window.NP_ClothDamage && NP_ClothDamage.active && NP_ClothDamage.active()) {
                    c.acid++; NP_ClothDamage.addPoints(1);
                    say(2, 'Кислота разъедает ткань облачения.', 'The acid eats into the vestment cloth.');
                }
                if (c.key === 'sword') Object.keys(lost).forEach(function(k) {
                    var aid = Number(k), s = SA();
                    if (s && s.KIND && s.KIND[aid] && s.charge(aid) > 0) {
                        var n = Math.min(15, s.charge(aid)); s.setCharge(aid, s.charge(aid) - n); c.drained = (c.drained || 0) + n;
                        say(2, ename() + ' пьёт силу: у ' + nameOf(aid) + ' −' + Math.round(n) + ' заряда.', ename() + ' drinks power: ' + nameOf(aid) + ' −' + Math.round(n) + ' charge.');
                    }
                });
                if (c.key === 'zombie') Object.keys(lost).forEach(function(k) {
                    var aid = Number(k);
                    if (!c.grip[aid] && gv(123) > 0 && rnd() < 0.4) {
                        c.grip[aid] = 1; c.grips = (c.grips || 0) + 1;
                        say(2, ename() + ' вцепляется в ' + nameOf(aid) + ' — следующий ход под угрозой.', ename() + ' grabs ' + nameOf(aid) + ' — the next turn is in danger.');
                    }
                });
            }
            if (c.key === 'bee' && c.swarm > 0) {
                c.swarm--;
                if (!c.swarm) say(17, 'Рой вокруг королевы редеет.', 'The swarm around the queen thins out.');
            }
        } catch (e) { err('enemyEnd', e); }
        c.phase = 'post';
    };

    // ------------------------------------------------------------------ V123 hook: hits on the rare
    $.isPlayerHit = function(c) {
        var s = SA();
        if (s && s.running) return true;
        if (s && s._dotTick) return false;
        if (c.phase === 'enemyStart' || c.phase === 'enemy' || c.phase === 'start') return false;
        var u = gv(270); return u > 0 && u < 100;
    };
    if (typeof Game_Variables !== 'undefined') {
        var _gvSet = Game_Variables.prototype.setValue;
        Game_Variables.prototype.setValue = function(id, value) {
            if (id === 123 && !$._self && !$._inHook && window.$gameSystem && $gameSystem._npRareB) {
                $._inHook = true;
                try { value = $.onEnemyHp(this.value(123), value); } catch (e) { err('hp', e); }
                $._inHook = false;
            }
            return _gvSet.call(this, id, value);
        };
    }
    // pacing: rare fights should last ~3-5 rounds. (1) a weak-spot boost from round 3 when the fight
    // would drag past round 5; (2) in rounds 1-2 at most ROUND_CAP of max HP lost per round. The thief rat is exempt.
    $.ROUND_CAP = 0.45; $.BOOST_MAX = 4; $.PACE_END = 5;
    $.pace = function(c, oldV, newV, d) {
        if (c.key === 'rat') return newV;
        var mhp = gv(122), r = Math.max(1, gv(157));
        if (r >= 3 && newV > 0) {
            var lost = Math.max(1, mhp - oldV + (c.regen || 0)), avg = lost / (r - 1);
            var need = oldV / Math.max(1, $.PACE_END + 1 - r), f = Math.min($.BOOST_MAX, need / avg);
            if (f > 1.05) {
                var nd = Math.min(Math.ceil(d * f), Math.ceil($.CAP * mhp));
                if (nd > d) {
                    if (!c.boostNote) { c.boostNote = true; say(17, 'Вы нащупали слабое место врага — удары бьют больнее!', 'You found the enemy\'s weak spot — your blows hit harder!'); }
                    c.boosted = (c.boosted || 0) + (nd - d); d = nd; newV = oldV - d;
                }
            }
        }
        {
            if (c.capRound !== r) { c.capRound = r; c.roundLost = 0; }
            var room = Math.max(0, Math.ceil($.ROUND_CAP * mhp) - c.roundLost);
            if (r < 3 && d > room) { c.roundCapped = (c.roundCapped || 0) + 1; d = room; newV = oldV - d; }
            c.roundLost += d;
        }
        return newV;
    };
    $.onEnemyHp = function(oldV, newV) {
        var c = $.ctx();
        if (!c || typeof newV !== 'number' || typeof oldV !== 'number' || newV >= oldV || !$.isPlayerHit(c)) return newV;
        var s = SA(), sup = !!(s && s.running), attr = window.$atk_attribute || 0, magic = gs(17);
        var aid = sup && s.curActor ? s.curActor() : gv(270);
        var d = oldV - newV, en = ename();
        switch (c.key) {
            case 'bee':
                if (c.swarm > 0) {
                    if (attr === 'fire' || sup) { c.swarm = 0; c.dispersed = true; say(17, 'Рой разогнан!', 'The swarm is dispersed!'); }
                    else if (d > 1) { var cut = Math.floor(d / 2); newV += cut; d -= cut; c.absorbed = (c.absorbed || 0) + cut; say(2, 'Рой принимает на себя ' + cut + ' урона.', 'The swarm absorbs ' + cut + ' damage.'); }
                }
                break;
            case 'gnoll':
                if (c.banner > 0 && (sup || d >= 6)) {
                    sv(136, Math.max(0, gv(136) - c.banner)); c.banner = 0; c.stagger = true; c.broken = (c.broken || 0) + 1;
                    say(17, 'Знамя сломано! ' + en + ' теряет бонус брони и следующий ход.', 'The banner is broken! ' + en + ' loses the armour bonus and its next turn.');
                }
                break;
            case 'golem':
                if (c.crust && (magic || sup || attr === 'fire')) {
                    c.crust = false; c.cracked = true; sv(136, Math.max(0, c.armBase - 5));
                    say(17, 'Янтарная корка раскалывается — броня голема падает!', 'The amber crust cracks — the golem\'s armour drops!');
                }
                break;
            case 'jelly':
                if (!c.dried && (magic || attr === 'water')) { c.dried = true; say(17, en + ' съёживается и больше не восстанавливается.', en + ' shrivels and stops regenerating.'); }
                break;
            case 'fire':
                if (attr === 'water' && newV > 0) { var ex = Math.ceil(d / 3); newV -= ex; d += ex; say(17, 'Вода шипит на пламени: ещё −' + ex + '.', 'Water hisses on the flame: another −' + ex + '.'); }
                if (!sup && !magic && attr !== 'water' && aid > 0 && aid < 100 && newV > 0) {
                    var v = hurt(actor(aid), 1);
                    if (v) { c.scorch = (c.scorch || 0) + 1; say(2, nameOf(aid) + ' обжигается о пламя: −1 HP.', nameOf(aid) + ' is scorched by the flame: −1 HP.'); }
                }
                break;
            case 'armor':
            case 'zombie':
                if (attr === 'saint') c.holyHits = (c.holyHits || 0) + 1;   // ×1.5 itself comes from $weak_holy in CE36
                if (c.key === 'armor' && c.calm < 6 && inParty(PRI) && window.NP_Stress && NP_Stress.active && NP_Stress.active()) {
                    var r = NP_Stress.add(PRI, -1, 'rare', L('звон святой стали', 'ring of steel'));
                    c.calm++; if (r !== false) say(24, 'Звон стали успокаивает ' + nameOf(PRI) + ': −1 стресса.', 'The ring of steel calms ' + nameOf(PRI) + ': −1 stress.');
                }
                if (c.key === 'zombie') Object.keys(c.grip).forEach(function(k) {
                    if (Number(k) !== aid) { delete c.grip[k]; c.freed = (c.freed || 0) + 1; say(17, nameOf(aid) + ' отбивает ' + nameOf(Number(k)) + ' из хватки!', nameOf(aid) + ' knocks ' + nameOf(Number(k)) + ' free of the grip!'); }
                });
                break;
        }
        if (d > 0) { var pv = $.pace(c, oldV, newV, d); newV = pv; d = oldV - newV; }
        if (d > 0) c.dealt += d;
        c.lastAttr = attr; c.lastPm = sup && aid === PM ? 1 : 0;
        return newV;
    };

    // ------------------------------------------------------------------ stun / sleep resistance
    if (typeof Game_Actor !== 'undefined') {
        var _addState = Game_Actor.prototype.addState;
        Game_Actor.prototype.addState = function(stateId) {
            if ((stateId === 6 || stateId === 8) && this._actorId === 100 && !this.isStateAffected(stateId)) {
                var c = $.ctx();
                if (c) {
                    var ch = $.resist();
                    if (rnd() * 100 < ch) {
                        c.resisted++;
                        var lb = stateId === 8 ? L('оглушение', 'stun') : L('сон', 'sleep');
                        say(2, ename() + ' сопротивляется: «' + lb + '» не подействовал (' + ch + '%).', ename() + ' resists ' + lb + ' (' + ch + '%).');
                        $._resistedNow = stateId;
                        // the event code sets $enemy_state_* right after; enemyTurnBegin clears it because the state is absent
                        return;
                    }
                    if (stateId === 8 && c.key === 'wolf' && c.howl) { c.howl = 0; say(17, 'Оглушение сбило вожаку весь накопленный вой!', 'The stun knocked out all of the packleader\'s howl!'); }
                }
            }
            return _addState.apply(this, arguments);
        };
    }

    // ------------------------------------------------------------------ super attack: cap + raiju steal + resist fix
    $.patchSuper = function() {
        var sp = SA();
        if (!sp || sp._npRarePatched) return !!sp;
        sp._npRarePatched = true;
        var _cd = sp.computeDamage;
        sp.computeDamage = function(aid, res) {
            var r = _cd.apply(this, arguments);
            var c = $.ctx();
            if (c && r && r.dmg > 0) {
                var cap = Math.max(1, Math.ceil($.CAP * gv(122)));
                if (r.dmg > cap) { r.uncapped = r.dmg; r.dmg = cap; r.capped = true; $._capNote = cap; }
            }
            return r;
        };
        var _res = sp.resolve;
        sp.resolve = function(interp) {
            $._resistedNow = 0; $._capNote = 0;
            var out = _res.apply(this, arguments);
            try {
                var c = $.ctx();
                if (c && out) {
                    if ($._capNote) { out.capped = true; say(2, ename() + ' выдерживает удар: супер-удар снимает не больше 50% здоровья.', ename() + ' withstands the blow: a super hit takes at most 50% health.'); }
                    if ($._resistedNow === 8 && out.stun) { out.stun = 0; out.resisted = true; window.$enemy_state_stun = 0; }
                    if ($._resistedNow === 6 && out.sleep) { out.sleep = 0; out.resisted = true; window.$enemy_state_sleep = 0; }
                    if (c.key === 'raiju' && c.charge > 0 && !out.miss && out.dmg > 0) {
                        c.charge = 0; c.stolenCharge = (c.stolenCharge || 0) + 1; addCharge(out.aid, 30);
                        say(17, nameOf(out.aid) + ' перехватывает заряд Райдзю: +30 заряда супер-удара!', nameOf(out.aid) + ' steals the Raiju\'s charge: +30 super charge!');
                    }
                }
            } catch (e) { err('afterSuper', e); }
            $._resistedNow = 0; $._capNote = 0;
            return out;
        };
        return true;
    };

    // ------------------------------------------------------------------ rewards (CE33, after the normal drop)
    function parseMats(str) {
        var r = [], re = /([IWA]):?(\d+):(\d+):(\d+)/gi, m;
        while ((m = re.exec(String(str || '')))) r.push({ kind: m[1].toUpperCase(), id: Number(m[2]), n: Number(m[3]) });
        return r;
    }
    $.parseMats = parseMats;
    function iconText(it) { return '\\i[' + it.iconIndex + ']' + it.name; }
    $.onReward = function() {
        var c = $.ctx(); if (!c || gv(123) > 0 || c.rewarded) return;
        c.rewarded = true;
        try { $._reward(c); } catch (e) { err('reward', e); }
    };
    $._reward = function(c) {
        var cfg = MOBS[c.key], b = $.best(c.key), s = $.state();
        b.kills = (b.kills || 0) + 1;
        s.killed[c.key] = day();
        var got = [];
        var gold = Math.round(cfg.gold * (1 + 0.25 * (dlvl() - 1)));
        if (c.key === 'rat' && c.stolen) { gold += c.stolen * 2; say(17, 'Украденное золото возвращается вдвойне: +' + (c.stolen * 2) + ' G', 'The stolen gold comes back twice over: +' + (c.stolen * 2) + ' G'); }
        $gameParty.gainGold(gold); got.push(gold + ' G');
        c.goldGiven = gold;
        // base materials ×3 (first entry of column AA)
        var row = window.$csv_EnemyData && $csv_EnemyData[cfg.base];
        var mats = parseMats(row ? row[26] : '').slice(0, 1);
        mats.forEach(function(m) {
            var db = m.kind === 'W' ? $dataWeapons : m.kind === 'A' ? $dataArmors : $dataItems, it = db && db[m.id];
            if (it && it.name) { var n = 3 * Math.max(1, m.n); $gameParty.gainItem(it, n); got.push(iconText(it) + ' ×' + n); }
        });
        cfg.bonus.forEach(function(bn) {
            var it = $.resolveSpec(BONUS[bn[0]]);
            if (it) { $gameParty.gainItem(it, bn[1]); got.push(iconText(it) + ' ×' + bn[1]); }
        });
        c.got = got;
        say(17, '★ Награда: ' + got.join(', '), '★ Reward: ' + got.join(', '));
        if (c.key === 'golem') {
            [2, 21, 10, 19].forEach(function(aid) { addCharge(aid, 20); });
            say(17, 'Осколки янтаря заряжают отряд: +20 заряда супер-удара.', 'Amber shards charge the party: +20 super charge.');
        }
        if (c.key === 'fire') {
            if (c.lastAttr === 'water' || c.lastPm) { c.exploded = false; say(17, 'Пламя гаснет без взрыва.', 'The flame goes out without exploding.'); }
            else {
                c.exploded = true;
                var parts = []; alive().forEach(function(m) { var v = hurt(m, 3); parts.push(m.name() + ' −' + v); });
                say(2, 'Сердце пламени взрывается! ' + parts.join(', '), 'The Heart of Flame explodes! ' + parts.join(', '));
            }
        }
        // rare item: once per kind
        c.dropRoll = null;
        if (b.dropped) return;
        if (cfg.gate && gv(169) < cfg.gate) { c.gated = true; return; }
        var roll = $.forceDrop ? -1 : rnd() * 100; c.dropRoll = roll;
        if (roll >= cfg.pct) return;
        if (cfg.yarizo && !gs(S_YARIZO)) {
            $gameParty.gainGold(600); c.dropped = 'gold';
            say(17, '★ Редкая добыча (без договора с Яризо): +600 G', '★ Rare loot (no contract with Yarizo): +600 G');
            return;
        }
        var it = $.resolveItem(c.key);
        if (!it) { c.unresolved = true; return; }
        b.dropped = true; b.dropDay = day(); c.dropped = it.id;
        if ($.DUPE_GOLD && $gameParty.hasItem(it, true)) {
            // already owned from another source: no duplicate, gold instead
            b.dupe = true; c.dupe = true; $gameParty.gainGold($.DUPE_GOLD);
            say(17, '★ Редкая добыча: ' + iconText(it) + ' — уже есть, вместо неё +' + $.DUPE_GOLD + ' G', '★ Rare loot: ' + iconText(it) + ' — already owned, +' + $.DUPE_GOLD + ' G instead');
            return;
        }
        $gameParty.gainItem(it, 1);
        say(17, '★ РЕДКАЯ ДОБЫЧА: ' + iconText(it) + '!', '★ RARE LOOT: ' + iconText(it) + '!');
        try { AudioManager.playSe({ name: 'Item3', volume: 90, pitch: 100, pan: 0 }); } catch (e) {}
    };
    // CE32 end
    $.battleEnd = function() {
        var c = window.$gameSystem && $gameSystem._npRareB;
        if (c) {
            var ev = c.eid && $gameMap.event(c.eid);
            if (ev && (c.rewarded || c.fled)) ev._npRare = null;
            $.lastBattle = c;
        }
        if (window.$gameSystem) $gameSystem._npRareB = null;
    };

    // ------------------------------------------------------------------ injection into common events
    function cmd(code, indent, p) { return { code: code, indent: indent, parameters: p, npRare: true }; }
    function has(list) { return list.some(function(c) { return c.npRare; }); }
    function endIdx(list) { var at = list.length - 1; while (at > 0 && list[at].code === 0 && list[at].indent === 0) at--; return at + 1; }
    $.injectCE34 = function(list) {
        if (has(list)) return 'already';
        list.splice(endIdx(list), 0, cmd(355, 0, ['NP_RareMobs.afterLoad(this)']));
        list.splice(0, 0, cmd(355, 0, ['NP_RareMobs.beforeLoad()']));
        return 'ok';
    };
    $.injectCE367 = function(list) {
        if (has(list)) return 'already';
        var a = -1, b = -1;
        for (var i = 0; i < list.length; i++) {
            if (a < 0 && list[i].code === 355 && /MapEvent\.call\(\s*53\s*,\s*13\s*,\s*4\s*\)/.test(list[i].parameters[0])) a = i;
            if (list[i].code === 118 && list[i].parameters[0] === '敵ターン終了') b = i;
        }
        if (a < 0 || b < 0 || b < a) return 'no anchor ' + a + '/' + b;
        var ind = list[a].indent;
        list.splice(b + 1, 0, cmd(355, list[b].indent, ['NP_RareMobs.enemyEnd()']));
        list.splice(a + 1, 0,
            cmd(111, ind, [12, 'NP_RareMobs.enemyAct()']),
            cmd(119, ind + 1, ['敵ターン終了']),
            cmd(0, ind + 1, []),
            cmd(412, ind, []));
        return 'ok';
    };
    $.injectCE368 = function(list) {
        if (has(list)) return 'already';
        list.splice(endIdx(list), 0, cmd(355, 0, ['NP_RareMobs.turnStart()']));
        list.splice(0, 0, cmd(355, 0, ['NP_RareMobs.enemyTurnBegin()']));
        return 'ok';
    };
    $.injectCE35 = function(list) {
        if (has(list)) return 'already';
        var lab = -1, i;
        for (i = 0; i < list.length; i++) if (list[i].code === 118 && list[i].parameters[0] === 'ラウンド開始') { lab = i; break; }
        if (lab < 0) return 'no label';
        var at = -1;
        for (i = lab + 1; i < list.length && i < lab + 12; i++) {
            var p = list[i].parameters;
            if (list[i].code === 122 && p[0] === 157 && p[1] === 157 && p[2] === 1) { at = i; break; }
        }
        if (at < 0) return 'no anchor';
        if (!list.some(function(c) { return c.code === 118 && c.parameters[0] === '終了'; })) return 'no end label';
        var ind = list[at].indent;
        list.splice(at + 1, 0,
            cmd(111, ind, [12, 'NP_RareMobs.roundStart()']),
            cmd(355, ind + 1, ['$battle_end_by_turn = 1']),
            cmd(119, ind + 1, ['終了']),
            cmd(0, ind + 1, []),
            cmd(412, ind, []));
        return 'ok';
    };
    $.injectCE364 = function(list) {
        if (has(list)) return 'already';
        list.splice(endIdx(list), 0, cmd(355, 0, ['NP_RareMobs.turnCheck()']));
        return 'ok';
    };
    $.injectCE33 = function(list) {
        if (has(list)) return 'already';
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c.code === 356 && /^KNS_EnemyData\s+dropItem\s+\\v\[121\]\s+AA\b/i.test(String(c.parameters[0]))) {
                list.splice(i + 1, 0, cmd(355, c.indent, ['NP_RareMobs.onReward()']));
                return 'ok';
            }
        }
        return 'no anchor';
    };
    $.injectCE32 = function(list) {
        if (has(list)) return 'already';
        list.splice(endIdx(list), 0, cmd(355, 0, ['NP_RareMobs.battleEnd()']));
        return 'ok';
    };
    $.inject = function(ces) {
        var r = {};
        [[34, 'injectCE34'], [367, 'injectCE367'], [368, 'injectCE368'], [35, 'injectCE35'], [364, 'injectCE364'], [33, 'injectCE33'], [32, 'injectCE32']].forEach(function(p) {
            r['ce' + p[0]] = ces[p[0]] && ces[p[0]].list ? $[p[1]](ces[p[0]].list) : 'missing';
        });
        r.super = $.patchSuper();
        $.injectResult = r;
        console.log('[NP_RareMobs] inject ' + JSON.stringify(r));
        return r;
    };
    if (typeof DataManager !== 'undefined') {
        var _isDb = DataManager.isDatabaseLoaded;
        DataManager.isDatabaseLoaded = function() {
            var ok = _isDb.apply(this, arguments);
            if (ok && !$._injected && window.$dataCommonEvents) {
                $._injected = true;
                try { $.inject($dataCommonEvents); } catch (e) { err('inject failed', e); }
            }
            return ok;
        };
    }

    // ------------------------------------------------------------------ menu
    if (typeof Window_MenuCommand !== 'undefined') {
        var _addOrig = Window_MenuCommand.prototype.addOriginalCommands;
        Window_MenuCommand.prototype.addOriginalCommands = function() {
            _addOrig.apply(this, arguments);
            this.addCommand(L('Бестиарий редких', 'Rare bestiary'), 'npRareBestiary', !gallery());
        };
        var _createCmd = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function() {
            _createCmd.apply(this, arguments);
            this._commandWindow.setHandler('npRareBestiary', function() { SceneManager.push(Scene_NpRareBestiary); });
        };
    }
    $.open = function() { SceneManager.push(Scene_NpRareBestiary); };

    // ------------------------------------------------------------------ bestiary: loot icon (shadow / real)
    function iconSheetCapacity(sheet) { return sheet && sheet.width ? Math.floor(sheet.width / 32) * Math.floor(sheet.height / 32) : 0; }
    // 48×48 bitmap with the icon centred. mode: 'real' | 'shadow' (black fill) | 'glow' (dark-violet blur) | 'realglow' (gold blur)
    function iconBitmap(iconIndex, mode) {
        var sheet = ImageManager.loadSystem('IconSet');
        var out = new Bitmap(48, 48);
        sheet.addLoadListener(function() {
            try {
                var oc = ctxOf(out), tmp = new Bitmap(48, 48), tc = ctxOf(tmp);
                if (iconIndex > 0 && iconIndex < iconSheetCapacity(sheet)) {
                    tmp.blt(sheet, iconIndex % 16 * 32, Math.floor(iconIndex / 16) * 32, 32, 32, 8, 8);
                } else {        // icon not in the sheet yet → a «?» outline
                    tmp.fontSize = 30; tmp.textColor = '#ffffff'; tmp.outlineWidth = 0; tmp.drawText('?', 8, 8, 32, 32, 'center');
                }
                if (mode === 'real') { oc.drawImage(canvasOf(tmp), 0, 0); dirty(out); return; }
                var col = mode === 'shadow' ? 'rgb(12,6,20)' : mode === 'glow' ? 'rgb(90,20,140)' : 'rgb(255,215,90)';
                tc.globalCompositeOperation = 'source-in'; tc.fillStyle = col; tc.fillRect(0, 0, 48, 48); tc.globalCompositeOperation = 'source-over';
                if (mode === 'shadow') oc.drawImage(canvasOf(tmp), 0, 0);
                else { oc.filter = 'blur(4px)'; for (var k = 0; k < 3; k++) oc.drawImage(canvasOf(tmp), 0, 0); oc.filter = 'none'; }
                dirty(out);
            } catch (e) { err('icon', e); }
        });
        return out;
    }
    $.iconBitmap = iconBitmap;

    function Sprite_NpRareLoot() { this.initialize.apply(this, arguments); }
    Sprite_NpRareLoot.prototype = Object.create(Sprite.prototype);
    Sprite_NpRareLoot.prototype.constructor = Sprite_NpRareLoot;
    Sprite_NpRareLoot.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this);
        this._glow = new Sprite(); this._glow.anchor.x = this._glow.anchor.y = 0.5;
        this._icon = new Sprite(); this._icon.anchor.x = this._icon.anchor.y = 0.5;
        this.addChild(this._glow); this.addChild(this._icon);
        this._spec = null; this._t = 0;
    };
    Sprite_NpRareLoot.prototype.setup = function(iconIndex, dropped, scale) {
        var spec = iconIndex + ':' + dropped;
        this.scale.x = this.scale.y = scale || 2;
        if (spec === this._spec) return;
        this._spec = spec; this._dropped = dropped;
        this._icon.bitmap = iconBitmap(iconIndex, dropped ? 'real' : 'shadow');
        this._glow.bitmap = iconBitmap(iconIndex, dropped ? 'realglow' : 'glow');
        this._glow.blendMode = dropped ? 1 : 0;
    };
    Sprite_NpRareLoot.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this._t++;
        var p = Math.sin(this._t * 0.07);
        if (this._dropped) { this._glow.alpha = 0.35 + 0.2 * p; this._glow.scale.x = this._glow.scale.y = 1.15; }
        else { this._glow.alpha = 0.6 + 0.4 * p; this._glow.scale.x = this._glow.scale.y = 1.25 + 0.15 * p; }
    };
    window.Sprite_NpRareLoot = Sprite_NpRareLoot;

    // ------------------------------------------------------------------ bestiary windows
    function Window_NpRareList() { this.initialize.apply(this, arguments); }
    Window_NpRareList.prototype = Object.create(Window_Selectable.prototype);
    Window_NpRareList.prototype.constructor = Window_NpRareList;
    Window_NpRareList.prototype.initialize = function(x, y, w, h) {
        Window_Selectable.prototype.initialize.call(this, x, y, w, h);
        this.refresh(); this.select(0); this.activate();
    };
    Window_NpRareList.prototype.maxItems = function() { return KEYS.length; };
    Window_NpRareList.prototype.key = function() { return KEYS[this.index()] || null; };
    Window_NpRareList.prototype.drawItem = function(i) {
        var r = this.itemRectForText(i), k = KEYS[i], b = $.best(k), cfg = MOBS[k];
        if (b.met) {
            this.changeTextColor(this.textColor(b.dropped ? 17 : 0));
            this.drawText('★ ' + L(cfg.ru, cfg.en), r.x, r.y, r.width - 44);
            if (b.kills) { this.changeTextColor(this.textColor(8)); this.drawText('×' + b.kills, r.x, r.y, r.width, 'right'); }
        } else {
            this.changeTextColor(this.textColor(8));
            this.drawText('???', r.x, r.y, r.width);
        }
        this.resetTextColor();
    };
    Window_NpRareList.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (this._lastIdx !== this.index()) { this._lastIdx = this.index(); if (this._detail) this._detail.setKey(this.key()); }
    };
    window.Window_NpRareList = Window_NpRareList;

    function Window_NpRareDetail() { this.initialize.apply(this, arguments); }
    Window_NpRareDetail.prototype = Object.create(Window_Base.prototype);
    Window_NpRareDetail.prototype.constructor = Window_NpRareDetail;
    Window_NpRareDetail.prototype.initialize = function(x, y, w, h) {
        Window_Base.prototype.initialize.call(this, x, y, w, h);
        this._key = null; this._pending = false;
        this.loot = new Sprite_NpRareLoot();
        this.addChild(this.loot);
    };
    Window_NpRareDetail.prototype.setKey = function(k) { this._key = k; this.refresh(); };
    Window_NpRareDetail.prototype.lines = function(text, w) {
        var words = String(text).split(' '), line = '', out = [];
        for (var i = 0; i < words.length; i++) {
            var t = line ? line + ' ' + words[i] : words[i];
            if (this.textWidth(t) > w && line) { out.push(line); line = words[i]; }
            else line = t;
        }
        if (line) out.push(line);
        return out;
    };
    Window_NpRareDetail.prototype.wrap = function(text, x, y, w, lh) {
        lh = lh || this.lineHeight();
        var ls = this.lines(text, w);
        for (var i = 0; i < ls.length; i++) { this.contents.drawText(ls[i], x, y, w, lh); y += lh; }
        return y;
    };
    // body text (lore, hint, trait) shrinks until it fits between the facts and the loot block
    Window_NpRareDetail.prototype.fitBody = function(parts, w, avail) {
        var base = this.standardFontSize(), lh = this.lineHeight(), self = this, fs, need, n = [];
        var saveFs = this.contents.fontSize, saveIt = this.contents.fontItalic;
        for (fs = Math.min(base - 2, 26); fs >= 14; fs--) {
            need = 0;
            n = parts.map(function(p) {
                self.contents.fontSize = fs; self.contents.fontItalic = !!p.italic;
                var c = p.text ? self.lines(p.text, w).length : 0;
                need += (p.label ? lh : 0) + c * (fs + 6) + (p.gap || 0);
                return c;
            });
            if (need <= avail) break;
        }
        this.contents.fontSize = saveFs; this.contents.fontItalic = saveIt;
        return { fs: Math.max(fs, 14), need: need, counts: n };
    };
    Window_NpRareDetail.prototype.label = function(t, x, y, w) { this.changeTextColor(this.systemColor()); this.drawText(t, x, y, w); this.resetTextColor(); };
    Window_NpRareDetail.prototype.refresh = function() {
        this.contents.clear();
        var k = this._key; if (!k) return;
        var cfg = MOBS[k], b = $.best(k), w = this.contentsWidth(), lh = this.lineHeight();
        this._pending = false;
        this.contents.fontSize = 30;
        this.changeTextColor(this.textColor(b.met ? 17 : 8));
        this.drawText(b.met ? '★ ' + L(cfg.ru, cfg.en) : '???', 0, 0, w);
        this.resetFontSettings();
        // sprite preview (recoloured; black silhouette until met)
        var box = 200, by = lh + 8;
        this.contents.fillRect(0, by, box, box, 'rgba(0,0,0,0.35)');
        var spr = $.templateSprite(k);
        if (spr) {
            var t = $.tinted(spr.name, k);
            if (!t.ready) this._pending = true;
            else {
                var src = b.met ? t.main : t.silhouette, big = ImageManager.isBigCharacter(spr.name);
                var pw = src.width / (big ? 3 : 12), ph = src.height / (big ? 4 : 8);
                var ci = big ? 0 : spr.index, sx = ((ci % 4) * 3 + 1) * pw, sy = Math.floor(ci / 4) * 4 * ph;
                var sc = Math.min(3, (box - 16) / Math.max(pw, ph)), dw = Math.round(pw * sc), dh = Math.round(ph * sc);
                var dx = Math.round((box - dw) / 2), dy = by + Math.round((box - dh) / 2);
                if (b.met) this.contents.blt(t.aura, sx, sy, pw, ph, dx, dy, dw, dh);
                this.contents.blt(src, sx, sy, pw, ph, dx, dy, dw, dh);
            }
        }
        // facts
        var x = box + 16, fw = w - x, y = by;
        this.label(L('Где встречен:', 'Seen at:'), x, y, fw); y += lh;
        if (b.met) {
            var seen = []; Object.keys(b.seen).forEach(function(id) { var t = /^#\d+$/.test(b.seen[id]) ? $.mapName(+id) : b.seen[id]; if (seen.indexOf(t) < 0) seen.push(t); });
            y = this.wrap(seen.join(', ') || '—', x, y, fw);
        } else { this.changeTextColor(this.textColor(8)); this.drawText('???', x, y, fw); this.resetTextColor(); y += lh; }
        this.label(L('Время:', 'Time:'), x, y, 150);
        this.drawText({ any: L('днём и ночью', 'day and night'), day: L('только днём', 'day only'), night: L('только ночью', 'night only') }[cfg.time], x + 150, y, fw - 150); y += lh;
        this.label(L('Побеждено:', 'Defeated:'), x, y, 150);
        this.drawText(String(b.kills || 0) + (b.flees ? L(' (сбегала: ', ' (escaped: ') + b.flees + ')' : ''), x + 150, y, fw - 150); y += lh;
        // lore (always), hint «Примета» (always), trait (met only); auto-shrinks to fit above the loot block
        y = Math.max(y, by + box) + 8;
        var lootH = lh + 100, avail = this.contentsHeight() - lootH - 8 - y;
        var parts = [
            { text: $.lore(k), italic: true, gap: 6 },
            { label: true, text: $.hint(k), italic: true, gap: 6 },
            { label: true, text: b.met ? L(cfg.mech[0], cfg.mech[1]) : L('Ещё не встречен.', 'Not met yet.') }
        ];
        var showTrait = !!$.SHOW_TRAIT[k];        // only the marmalade spells out its mechanics; the rest: lore + omen
        if (!showTrait) parts.pop();
        var fit = this.fitBody(parts, w, avail), fs = fit.fs, blh = fs + 6, y0 = y;
        this.contents.fontSize = fs; this.contents.fontItalic = true;
        this.changeTextColor('#e6d9b8');
        y = this.wrap(parts[0].text, 0, y, w, blh) + 6;
        this.contents.fontItalic = false; this.resetFontSettings();
        this.label(L('Примета:', 'Omen:'), 0, y, w); y += lh;
        this.contents.fontSize = fs; this.contents.fontItalic = true;
        this.changeTextColor('#c9b6ff');
        y = this.wrap(parts[1].text, 0, y, w, blh) + 6;
        this.contents.fontItalic = false; this.resetFontSettings();
        if (showTrait) {
            this.label(L('Особенность:', 'Trait:'), 0, y, w); y += lh;
            this.contents.fontSize = fs;
            if (!b.met) this.changeTextColor(this.textColor(8));
            y = this.wrap(parts[2].text, 0, y, w, blh);
            this.resetFontSettings();
        }
        // rare loot: shadow until dropped, then the real icon + name
        var ly = Math.max(y + 8, this.contentsHeight() - lootH);
        this._npLayout = { fs: fs, bodyTop: y0, bodyEnd: y, lootTop: ly, lootEnd: ly + lootH, ch: this.contentsHeight(), need: fit.need, avail: avail,
            overflow: ly + lootH > this.contentsHeight() + 1, lore: parts[0].text, hint: parts[1].text, met: !!b.met, trait: showTrait ? parts[2].text : null };
        this.label(L('Редкая добыча:', 'Rare loot:'), 0, ly, w);
        var it = $.resolveItem(k), icon = it ? it.iconIndex : cfg.rare.icon;
        var cy = ly + lh + 48;
        this.loot.setup(icon, !!b.dropped, 2);
        this.loot.x = this.padding + 52; this.loot.y = this.padding + cy;
        if (b.dropped) {
            this.changeTextColor(this.textColor(24));
            this.drawText(L('Добыча получена', 'Loot obtained'), 116, cy - lh, w - 116);
            this.resetTextColor();
            this.drawText(it ? it.name : '', 116, cy, w - 116);
        }
    };
    Window_NpRareDetail.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (this._pending && Graphics.frameCount % 10 === 0) this.refresh();
    };
    window.Window_NpRareDetail = Window_NpRareDetail;

    // template sprites (Map029)
    var SPRITES = { 101: ['Monster3', 4], 103: ['Monster3', 2], 112: ['$chcl_wolf2', 0], 621: ['gorlem', 0], 204: ['$goblin_plague', 0],
        242: ['$gnoll1_equiped', 0], 631: ['living_armor', 2], 604: ['slime_v2', 1], 681: ['Kirin', 0], 402: ['tg-cm03-chr-01', 3],
        633: ['tg-cm03-chr-02', 1], 122: ['whtdragon_rj7WRBj', 1], 501: ['Insane1x', 2] };
    $.SPRITES = SPRITES;
    $.templateSprite = function(key) { var s = SPRITES[MOBS[key].base]; return s ? { name: s[0], index: s[1] } : null; };

    function Scene_NpRareBestiary() { this.initialize.apply(this, arguments); }
    Scene_NpRareBestiary.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_NpRareBestiary.prototype.constructor = Scene_NpRareBestiary;
    Scene_NpRareBestiary.prototype.createBackground = function() {
        Scene_MenuBase.prototype.createBackground.call(this);
        var dim = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        dim.bitmap.fillAll('rgba(8,6,14,0.78)');   // hide the map log behind the panels
        this.addChild(dim);
    };
    Scene_NpRareBestiary.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        var W = Graphics.boxWidth, H = Graphics.boxHeight, lw = Math.min(330, Math.floor(W * 0.3)), hh = 72;
        var met = KEYS.filter(function(k) { return $.best(k).met; }).length;
        var got = KEYS.filter(function(k) { return $.best(k).dropped; }).length;
        this._head = new Window_Base(0, 0, W, hh);
        this._head.drawText(L('Бестиарий редких врагов', 'Rare enemy bestiary'), 0, 0, W - 40, 'left');
        this._head.drawText(L('Встречено ', 'Met ') + met + '/' + KEYS.length + '   ' + L('Добыча ', 'Loot ') + got + '/' + KEYS.length, 0, 0, W - 40, 'right');
        this.addWindow(this._head);
        this._detail = new Window_NpRareDetail(lw, hh, W - lw, H - hh);
        this._list = new Window_NpRareList(0, hh, lw, H - hh);
        this._list._detail = this._detail;
        this._list.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._list);
        this.addWindow(this._detail);
        KEYS.forEach(function(k) { var s = $.templateSprite(k); if (s) $.tinted(s.name, k); });
        this._detail.setKey(this._list.key());
    };
    window.Scene_NpRareBestiary = Scene_NpRareBestiary;
})();
