var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_AudioBalance.js
//=============================================================================
/*:
 * @plugindesc v1.0 Выравнивание громкости (EBU R128) + звук для тихих карт, сцен и механик мода.
 * @author NP RU patch
 *
 * @help
 * 1) Выравнивание громкости (опция «Выравнивание громкости», по умолчанию ВКЛ).
 *    Громкость считается по замерам ffmpeg ebur128 (LUFS) каждого файла:
 *      BGM  -> не громче ~-16 LUFS  (BGM_CAP: потолок громкости вызова, %)
 *      BGS  -> эмбиент ~-25 LUFS    (BGS_CAP: потолок, %)
 *      SE   -> ~-17..-19 LUFS       (SE_MUL: множитель громкости вызова)
 *      ME   -> ~-14 LUFS            (ME_MUL: множитель)
 *    Правка делается в AudioManager.updateBufferParameters, т.е. на любом пути
 *    (события, плагины, системные звуки, TB_night_BGM, ParallelBgs, повтор BGM
 *    после боя). Сохранённые в сейве громкости не меняются, поэтому выключение
 *    опции сразу возвращает оригинальные значения.
 *
 * 2) Контент (работает всегда, от опции не зависит):
 *    MAP_AUDIO   — фон для карт без своей музыки/эмбиента (уважает переключатель 8
 *                  «BGM固定» и ночной режим TB_night_BGM);
 *    CE_CUES     — звуки в общих событиях (ночёвка, конец «凄惨な結末», время суток…);
 *    EVENT_CUES  — звуки в отдельных событиях карт;
 *    хуки механик мода: рваная одежда, починка, утренние подсказки, квест Яризо,
 *    автосейв, скорость боя ×2, разговоры у костра, умения на привале (campSe).
 *
 * API: NP_AudioBalance.enabled(), .adjust(kind, audio), .cue(name), .campSe(id),
 *      .play(kind, audio)  — проиграть без выравнивания (уже выверенная громкость).
 */
var Imported = Imported || {};
Imported.NP_AudioBalance = true;

var NP_AudioBalance = (function() {
    'use strict';
    var $ = {};

    // ---------------------------------------------------------------------
    // Таблицы громкости (комментарий: замер файла, LUFS)
    // ---------------------------------------------------------------------
    // BGM: потолок громкости вызова, чтобы музыка была не громче ~-16 LUFS
    $.BGM_CAP = {
        'Storm1': 35,                        // -6.5
        'PerituneMaterial_Desert3_loop': 35, // -6.6
        'DLC_FMP1_Battle4': 35,              // -7.0
        'PerituneMaterial_Taverne_loop': 35, // -7.3 (таверна Map086/014)
        'Battle3': 40,                       // -7.5
        'PerituneMaterial_Conjurer_loop': 40,        // -7.6
        'PerituneMaterial_Pastorale3_loop': 40,      // -7.9
        'PerituneMaterial_Dungeon_Tower_loop': 40,   // -8.3
        'PerituneMaterial_J_Choir_Chant2': 40,       // -8.4
        'PerituneMaterial_J_Choir_Chant1': 45,       // -8.7
        'Battle2': 45,                               // -8.8
        'PerituneMaterial_Midnight_Masquerade_loop': 45, // -8.9
        'PerituneMaterial_Enchanter_loop': 45,       // -9.3
        'PerituneMaterial_Glimmering_Woods_loop': 45, // -9.4
        'PerituneMaterial_Exotic2_loop': 45,         // -9.4
        'PerituneMaterial_J_Choir_Chant3': 45,       // -9.5
        'PerituneMaterial_Flow': 45,                 // -9.5
        'DLC_FMP1_Scene1': 50,                       // -9.6
        'PerituneMaterial_Pray_Organ4_loop': 50,     // -9.6
        'harmonic-dungeon2': 50,                     // -9.7
        'PerituneMaterial_Lost_place5_loop': 50,     // -9.7
        'PerituneMaterial_Lets_Party2_loop': 50,     // -9.8
        'Theme_-_Cursed_Kingdoms': 50,               // -9.8
        'Ship3': 50,                                 // -9.9
        'Battle1': 50,                               // -10.2
        'Field1': 55, 'Ship2': 55,                   // -10.7
        'harmonic-battle4': 55,                      // -10.8
        'PerituneMaterial_Dungeon_Tower_Retro_loop': 55, // -10.9
        'tanoshiibouken': 55, 'harmonic-battle3': 55, // -10.9
        'funenotabi': 55,                            // -11.0 (центр столицы)
        'Field2': 60, 'Theme1': 60,                  // -11.3 / -11.4
        'gozennijinofunsui': 60,                     // -11.5 (ночная тема TB_night_BGM, вызывается на 100)
        'Town2': 60,                                 // -11.8
        'Theme6': 65, 'harmonic-steampunk': 65, 'Dungeon2': 65,
        'PerituneMaterial_Limpid_Water_melodyoff_loop': 65, // -12.4
        'harmonic-battle1': 70, 'harmonic-lava': 70, 'harmonic-danger': 70,
        'Theme_-_Wayfarers_Path': 70, 'Theme_-_Opening_The_Portal': 70, 'harmonic-highspeed': 70,
        'harmonic-finalboss1': 70, 'DLC_FMP1_Scene2': 70, 'harmonic-finaldungeon': 70,
        'harmonic-theme3': 70, 'seishishitauchu': 70, // -12.6 .. -13.0
        'Ship1': 75, 'Dungeon3': 75, 'harmonic-battle5': 75, // -13.6 .. -13.7
        'harmonic-worldmap': 80, 'harmonic-celebrate1': 80, 'Theme2': 80,
        'harmonic-theme1': 80, 'harmonic-evil2': 80, 'harmonic-exoticland': 80 // -13.9 .. -14.3
    };
    // BGS (эмбиент): ~10 дБ под музыкой, ~-25 LUFS. Звуковые петли H-сцен не трогаем.
    $.BGS_CAP = {
        'se_maoudamashii_noise': 20, // -10.7
        'Quake': 25,                 // -12.6
        'Darkness': 25,              // -13.2
        'Wind': 25,                  // -13.0
        'Sea': 30,                   // -14.7
        'heart': 40,                 // -15.4
        'small-bell02': 55,          // -19.4
        'City_Ambi-Festival01-1': 55, // -20.9
        'Sparrow-Real_Ambi01-1': 60  // -21.4
    };
    // SE: множитель громкости вызова (результат ограничен 100)
    $.SE_MUL = {
        'touch_wet_pussy1': 0.4,  // -8.7 при типичном вызове -> ~-16.7
        'vibe_long': 0.35,        // -6.9
        'cum_extreme': 0.4,       // -8.1
        'cum_short_strong': 0.5,  // -7.7
        'Crash': 0.4,             // -7.7 (в т.ч. срыв стресса NP_Stress)
        'Wind5': 0.4,             // -7.8
        'Monster3': 0.5, 'Monster4': 0.55, 'Monster1': 0.55,
        'Slash1': 0.5, 'Slash3': 0.5,
        'Earth4': 0.55,           // -9.2
        'Scream': 0.5,            // -6.6
        'Collapse1': 0.6, 'Collapse2': 0.4,
        'Attack3': 0.45, 'Evasion2': 0.6,
        'Decision3': 0.7,         // системное «ОК», -13.5
        'Cursor2': 1.25,          // системный курсор, -23.0 (тише остального UI)
        'Knock': 1.3              // -25.3: стук в дверь почти не слышен
    };
    // ME: множитель
    $.ME_MUL = {
        'harmonic-victory2': 0.65, // -10.5 (выполнение квеста CE47)
        'harmonic-victory3': 0.45, // -6.9
        'Victory1': 0.5,           // -8.4
        'Defeat1': 0.8             // -11.5
    };

    // ---------------------------------------------------------------------
    // Контент: карты без звука, сцены, механики
    // ---------------------------------------------------------------------
    function A(name, volume, pitch) { return { name: name, volume: volume, pitch: pitch || 100, pan: 0 }; }
    // карта -> { bgm, bgs }: играет, только если у карты нет своей BGM/BGS (пусто или «наследовать»)
    $.MAP_AUDIO = {
        18:  { bgs: A('small-bell01', 65) },               // оружейная лавка
        128: { bgs: A('NP_Campfire_Crackle', 100) },       // привал у дороги — костёр (-26 LUFS)
        146: { bgm: A('PerituneMaterial_Pray_Organ4_loop', 35) }, // тюремная часовня
        155: { bgs: A('Wind', 20) },                       // заброшенная хижина
        168: { bgs: A('Night', 80) },                      // горная хижина
        174: { bgs: A('Sea', 25) },                        // лодка
        190: { bgm: A('harmonic-cute', 100) },             // коровник (и дом фермера 191 по наследству)
        199: { bgs: A('City_Ambi-Festival01-1', 35) },     // комната в таверне
        220: { bgm: A('PerituneMaterial_Limpid_Water_melodyoff_loop', 65) }, // отель
        222: { bgm: A('PerituneMaterial_Pray_Organ4_loop', 40) },            // церковь Мары
        235: { bgm: A('Ship1', 75), bgs: A('Sea', 30) },   // в море
        236: { bgm: A('harmonic-dungeon3', 90) },          // пираты
        281: { bgm: A('harmonic-dungeon3', 90) },          // дом торговца / логово
        299: { bgm: A('DBM_Mausoleum', 100) },             // заброшенная деревня
        303: { bgm: A('DBM_Mausoleum', 100) },             // старый замок
        304: { bgs: A('Night', 80) },                      // хижина на болоте
        333: { bgs: A('Drips', 90) },                      // OP1 разрушенный храм
        343: { bgs: A('Night', 80) }                       // трактир культа Нимф
    };
    // общее событие -> подсказки: at:'start' | after:<код команды> | at:'end'
    $.CE_CUES = {
        286: [{ after: 221, me: A('harmonic-defeat2', 100) }],              // «凄惨な結末» — финал
        474: [{ after: 242, bgs: A('NP_Campfire_Crackle', 100) }],          // ночёвка в лагере, после затухания
        323: [{ at: 'end', birds: true }],                                   // утро после сна
        946: [{ at: 'start', se: A('Bell2', 60, 70) }],                     // день -> ночь
        947: [{ at: 'start', birds: true }],                                 // ночь -> день
        498: [{ at: 'start', se: A('Down1', 85) }],                          // спутник ушёл
        304: [{ at: 'start', se: A('Move1', 90) }],                          // отряд снова вместе
        934: [{ at: 'start', se: A('Cancel2', 80) }]                         // квест отменён
    };
    // 'карта:событие:страница' (страница с 1, '*' — любая)
    $.EVENT_CUES = {
        '148:1:2': { start: { saveBgm: true, bgm: A('harmonic-pondering', 100) }, end: { replayBgm: true } }, // флешбэк Айрис
        '339:13:*': { start: { bgm: A('harmonic-danger', 70) } },                 // гоблины — кульминация
        '333:1:1': { start: { line: A('Darkness', 20) }, end: { lineStop: true } }, // пролог, монолог
        '242:107:*': { start: { se: A('Coin', 55, 60) } },                        // украли деньги
        '8:1:4': { start: { se: A('Saint5', 75) } }                               // центральный район, сцена
    };
    // умения на привале (NP_CampSkills): звук на умение, громкость по замеру (~-17 LUFS)
    $.CAMP_SE = {
        pray: A('Saint5', 60), bless: A('Saint3', 45), watch: A('Sword1', 100), sharpen: A('Sword2', 60, 120),
        encourage: A('Up1', 80), tales: A('Book2', 65), booze: A('Water2', 60), brew: A('Water3', 60, 80),
        herbs: A('Pollen', 100), tonic: A('Heal2', 55), vigil: A('Darkness3', 65), bats: A('Wind1', 65, 150),
        blood: A('Absorb1', 80)
    };
    // заготовки для QTE / других плагинов
    $.CUES = {
        qtePrompt: { se: A('Skill1', 70, 120) }, qteHit: { se: A('Sword2', 60, 110) },
        qtePerfect: { se: A('Saint3', 45, 120) }, qteMiss: { se: A('Buzzer1', 60) },
        clothRip: { se: A('NP_ClothRip', 100) }, clothRepair: { se: A('Equip1', 90) },
        hint: { se: A('Book1', 100) }, questStep: { se: A('Book2', 75) }, questDone: { me: A('harmonic-victory2', 65) },
        autosave: { se: A('Save', 50) }, toggle: { se: A('Switch2', 80) }
    };

    // ---------------------------------------------------------------------
    // Опция
    // ---------------------------------------------------------------------
    ConfigManager.npAudioBalance = true;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _make.apply(this, arguments); c.npAudioBalance = this.npAudioBalance; return c; };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) { _apply.apply(this, arguments); this.npAudioBalance = (c && c.npAudioBalance !== undefined) ? !!c.npAudioBalance : true; };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() {
        _addGen.apply(this, arguments);
        try { if (window.NP_OptionsCategories && NP_OptionsCategories.register) NP_OptionsCategories.register('npAudioBalance', 'sound'); } catch (e) {}
        this.addCommand(NP_L('Выравнивание громкости', 'Loudness balance'), 'npAudioBalance');
    };
    var _setCfg = Window_Options.prototype.setConfigValue;
    Window_Options.prototype.setConfigValue = function(symbol, value) {
        _setCfg.apply(this, arguments);
        if (symbol === 'npAudioBalance') $.reapply();
    };
    $.enabled = function() { return ConfigManager.npAudioBalance !== false; };

    // ---------------------------------------------------------------------
    // Ядро: правка громкости буфера
    // ---------------------------------------------------------------------
    function kindOf(buffer) {
        if (window.Html5Audio && buffer === Html5Audio) return 'bgm';
        var u = '';
        try { u = String(buffer.url || buffer._url || ''); } catch (e) {}
        var m = /audio\/(bgm|bgs|me|se)\//.exec(u);
        return m ? m[1] : null;
    }
    $.adjust = function(kind, audio) {
        var v = Number(audio && audio.volume) || 0;
        if (!audio || audio._npab || !$.enabled()) return v;
        var n = audio.name, t;
        if (kind === 'bgm') { t = $.BGM_CAP[n]; return t != null ? Math.min(v, t) : v; }
        if (kind === 'bgs') { t = $.BGS_CAP[n]; return t != null ? Math.min(v, t) : v; }
        if (kind === 'se')  { t = $.SE_MUL[n];  return t != null ? Math.min(100, Math.round(v * t)) : v; }
        if (kind === 'me')  { t = $.ME_MUL[n];  return t != null ? Math.min(100, Math.round(v * t)) : v; }
        return v;
    };
    var _ubp = AudioManager.updateBufferParameters;
    AudioManager.updateBufferParameters = function(buffer, configVolume, audio) {
        if (buffer && audio && audio.name) {
            var k = kindOf(buffer);
            if (k) {
                var nv = $.adjust(k, audio);
                if (nv !== audio.volume) audio = { name: audio.name, volume: nv, pitch: audio.pitch, pan: audio.pan };
            }
        }
        return _ubp.call(this, buffer, configVolume, audio);
    };
    var _playMe = AudioManager.playMe;
    AudioManager.playMe = function(me) { var r = _playMe.apply(this, arguments); $._me = me && me.name ? me : null; return r; };
    var _stopMe = AudioManager.stopMe;
    AudioManager.stopMe = function() { $._me = null; return _stopMe.apply(this, arguments); };
    $.reapply = function() {
        try {
            if (AudioManager._currentBgm && AudioManager._bgmBuffer) AudioManager.updateBgmParameters(AudioManager._currentBgm);
            if (AudioManager.iterateAllBgs) {
                AudioManager.iterateAllBgs(function() { if (AudioManager._currentBgs && AudioManager._bgsBuffer) AudioManager.updateBgsParameters(AudioManager._currentBgs); });
            } else if (AudioManager._currentBgs && AudioManager._bgsBuffer) AudioManager.updateBgsParameters(AudioManager._currentBgs);
            if ($._me && AudioManager._meBuffer) AudioManager.updateMeParameters($._me);
        } catch (e) { console.error('[NP_AudioBalance] reapply', e); }
    };

    // ---------------------------------------------------------------------
    // Проигрывание подсказок
    // ---------------------------------------------------------------------
    function raw(a) { var o = { name: a.name, volume: a.volume, pitch: a.pitch || 100, pan: a.pan || 0 }; o._npab = true; return o; }
    $.play = function(kind, a) {
        if (!a || !a.name) return;
        try {
            if (kind === 'se') AudioManager.playSe(raw(a));
            else if (kind === 'me') AudioManager.playMe(raw(a));
            else if (kind === 'bgm') AudioManager.playBgm(raw(a));
            else if (kind === 'bgs') AudioManager.playBgs(raw(a));
        } catch (e) { console.error('[NP_AudioBalance] play', e); }
    };
    // дополнительная линия BGS (ParallelBgs): эмбиент поверх основного, гаснет вместе с событием
    var LINE = 2, _lineAuto = false, _lineTimer = 0;
    $.line = function(a, frames) {
        if (!AudioManager.setBgsLineIndex) return;
        var old = AudioManager._bgsLineIndex;
        AudioManager._bgsLineIndex = LINE;
        try {
            if (a) AudioManager.playBgs(raw(a));
            else { AudioManager._bgsFadeOutByLine = true; if (AudioManager._bgsBuffer) AudioManager.fadeOutBgs(2); }
        } catch (e) { console.error('[NP_AudioBalance] line', e); }
        AudioManager._bgsFadeOutByLine = false;
        AudioManager._bgsLineIndex = old;
        _lineAuto = !!a && !frames; _lineTimer = a && frames ? frames : 0;
    };
    $.birds = function() { $.line(A('Sparrow-Real_Ambi01-1', 55), 300); };
    $.doCue = function(c) {
        if (!c) return;
        if (c.saveBgm) $._savedBgm = AudioManager.saveBgm();
        if (c.replayBgm && $._savedBgm) { AudioManager.replayBgm($._savedBgm); $._savedBgm = null; }
        if (c.se) $.play('se', c.se);
        if (c.me) $.play('me', c.me);
        if (c.bgm) $.play('bgm', c.bgm);
        if (c.bgs) $.play('bgs', c.bgs);
        if (c.line) $.line(c.line);
        if (c.lineStop) $.line(null);
        if (c.birds) $.birds();
    };
    $.crackleOn = function() {
        var all = AudioManager._currentAllBgs, c = all ? all[1] : AudioManager._currentBgs;
        return !!(c && c.name === 'NP_Campfire_Crackle');
    };
    $.cue = function(name) { $.doCue($.CUES[name]); };
    $.campSe = function(id) { var a = $.CAMP_SE[id]; return a ? raw(a) : null; };

    var _smUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _smUpdate.apply(this, arguments);
        if (_lineTimer > 0 && --_lineTimer === 0) $.line(null);
        if (_lineAuto && !$gameMap.isEventRunning()) $.line(null);
    };

    // ---------------------------------------------------------------------
    // Карты без своей музыки / эмбиента
    // ---------------------------------------------------------------------
    var _autoplay = Game_Map.prototype.autoplay;
    Game_Map.prototype.autoplay = function() {
        _autoplay.apply(this, arguments);
        try { $.mapExtra(this.mapId()); } catch (e) { console.error('[NP_AudioBalance] map', e); }
    };
    $.mapExtra = function(id) {
        var e = $.MAP_AUDIO[id];
        if (!e || !window.$dataMap || $gameSwitches.value(8)) return;   // 8: музыкой управляет событие (BGM固定)
        var note = $dataMap.note || '';
        var night = note.indexOf('夜固定BGM') >= 0 && $gameVariables.value(5) == 1; // TB_night_BGM: ночная тема
        if (e.bgm && !night && !($dataMap.autoplayBgm && $dataMap.bgm && $dataMap.bgm.name)) AudioManager.playBgm(e.bgm);
        if (e.bgs && (night || !($dataMap.autoplayBgs && $dataMap.bgs && $dataMap.bgs.name))) {
            var md = AudioManager.multiLineDisable; AudioManager.multiLineDisable = true;   // основная линия, как у автозвука карты
            try { AudioManager.playBgs(e.bgs); } finally { AudioManager.multiLineDisable = md; }
        }
    };

    // ---------------------------------------------------------------------
    // Подсказки в событиях
    // ---------------------------------------------------------------------
    function ceIdOf(list) {
        if (!window.$dataCommonEvents) return 0;
        for (var k in $.CE_CUES) { var ce = $dataCommonEvents[k]; if (ce && ce.list === list) return Number(k); }
        return 0;
    }
    function eventCueOf(list, eventId) {
        if (!eventId || !window.$gameMap) return null;
        var ev = $gameMap.event(eventId); if (!ev || !ev.page()) return null;
        var mid = $gameMap.mapId(), pg = ev.event().pages.indexOf(ev.page()) + 1;
        if (ev.page().list !== list) return null;
        return $.EVENT_CUES[mid + ':' + eventId + ':' + pg] || $.EVENT_CUES[mid + ':' + eventId + ':*'] || null;
    }
    var _setup = Game_Interpreter.prototype.setup;
    Game_Interpreter.prototype.setup = function(list, eventId) {
        _setup.apply(this, arguments);
        this._npabCe = null; this._npabEv = null;
        try {
            var id = ceIdOf(list);
            if (id) {
                this._npabCe = $.CE_CUES[id].map(function(c) { return { c: c, done: false }; });
                this._npabCe.forEach(function(x) { if (x.c.at === 'start') { x.done = true; $.doCue(x.c); } });
            }
            var ec = eventCueOf(list, eventId);
            if (ec) { this._npabEv = ec; $.doCue(ec.start); }
        } catch (e) { console.error('[NP_AudioBalance] cue', e); }
    };
    var _exec = Game_Interpreter.prototype.executeCommand;
    Game_Interpreter.prototype.executeCommand = function() {
        var cmd = this._npabCe && this.currentCommand();
        var r = _exec.apply(this, arguments);
        if (cmd) this._npabCe.forEach(function(x) { if (!x.done && x.c.after === cmd.code) { x.done = true; $.doCue(x.c); } });
        return r;
    };
    var _term = Game_Interpreter.prototype.terminate;
    Game_Interpreter.prototype.terminate = function() {
        var ce = this._npabCe, ev = this._npabEv;
        this._npabCe = null; this._npabEv = null;
        _term.apply(this, arguments);
        try {
            if (ce) ce.forEach(function(x) { if (!x.done && x.c.at === 'end') { x.done = true; $.doCue(x.c); } });
            if (ev && ev.end) $.doCue(ev.end);
        } catch (e) { console.error('[NP_AudioBalance] cue', e); }
    };

    // ---------------------------------------------------------------------
    // Механики мода (обёртки ставятся после загрузки всех плагинов)
    // ---------------------------------------------------------------------
    function wrap(obj, fn, after) {
        if (!obj || typeof obj[fn] !== 'function' || obj[fn]._npab) return;
        var orig = obj[fn];
        var w = function() {
            var pre = after.pre ? after.pre.apply(this, arguments) : undefined;
            var r = orig.apply(this, arguments);
            try { after.post.call(this, r, pre, arguments); } catch (e) { console.error('[NP_AudioBalance] ' + fn, e); }
            return r;
        };
        w._npab = true; obj[fn] = w;
    }
    $.installHooks = function() {
        var CD = window.NP_ClothDamage;
        if (CD) {
            wrap(CD, 'addPoints', { pre: function() { return CD.level ? CD.level() : 0; },
                post: function(lv, old) { if (lv > old) $.play('se', A('NP_ClothRip', 100, 90 + Math.floor(Math.random() * 21))); } });
            wrap(CD, 'reset', { pre: function() { return CD.level ? CD.level() : 0; },
                post: function(r, old) { if (old > 0 && !($gameParty && $gameParty.inBattle())) $.cue('clothRepair'); } });
        }
        if (window.NP_MorningHints) wrap(NP_MorningHints, 'tryFire', { post: function(r) { if (typeof r === 'string') { $.birds(); $.cue('hint'); } } });
        if (window.NP_YarizoQuest) wrap(NP_YarizoQuest, 'setStage', { pre: function() { return NP_YarizoQuest.stage(); },
            post: function(r, old, args) {
                if (args[0] === old || !args[1]) return;
                if (args[1] === 'logDone') $.cue('questDone'); else if (args[1] === 'logNew' || args[1] === 'logUpd') $.cue('questStep');
            } });
        if (window.NP_AutoSave) wrap(NP_AutoSave, 'save', { post: function(ok) { if (ok) $.cue('autosave'); } });
        if (window.NP_BattleQoL) wrap(NP_BattleQoL, 'toggleSpeed', { post: function() { $.cue('toggle'); } });
        if (window.NP_Campfire) wrap(NP_Campfire, 'maybe', { post: function(r, pre, args) {
            if (r && args[1] !== 'inn' && !$.crackleOn()) $.line(A('NP_Campfire_Crackle', 90)); } });
    };
    var _boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { $.installHooks(); _boot.apply(this, arguments); };

    return $;
})();
