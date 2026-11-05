var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_Voice.js
//=============================================================================
/*:
 * @plugindesc v1.1 Озвучка добавок: короткие вздохи/стоны жрицы из звуков, которые уже есть в игре.
 * @author NP RU
 *
 * @param Enabled
 * @desc Озвучка включена по умолчанию? (игрок переключает в Опциях)
 * @type boolean
 * @default true
 *
 * @param Option Label
 * @desc Название пункта в меню Опции. Пусто = пункт не добавляется.
 * @default Озвучка добавок
 *
 * @param Fast Battle Max
 * @desc Макс. длина фразы (сек), когда идёт бой и включён «Быстрый бой».
 * @default 0.7
 *
 * @help
 * Новых аудиофайлов нет. Плагин берёт короткие куски из оригинальных
 * голосовых дорожек игры:
 *   audio/bgs/!voice_moan1.ogg     (31 с, стоны; в оригинале CE512)
 *   audio/se/!voice_cumming1.ogg   (10.7 с, оргазм + дыхание после)
 * и проигрывает случайный кусок из пула с лёгким разбросом высоты,
 * мягким нарастанием/затуханием. Одновременно звучит только одна фраза
 * (новая обрывает старую), поэтому ничего не накладывается.
 * Громкость выровнена по оригиналу (EBU R128): при громкости 100 стон
 * звучит так же громко, как оригинальный стон в H-сценах (!voice_moan1,
 * BGS 90 = -15.8 LUFS), вздохи/вдохи на 3 дБ тише, muffle=1 ещё на 11 дБ
 * тише (+ спад по расстоянию). Каждый кусок имеет свою поправку, так что
 * тихие и громкие куски звучат ровно. Итог × «Громкость звуков (SE)».
 *
 * Пулы: sigh (вздохи), gasp (короткий вдох/ах), moan (стон),
 *       light (лёгкие вздохи для пляжа, без стонов).
 * Можно смешивать: moan|sigh
 *
 * Команда плагина:
 *   NPVoice <пул> [громкость=100] [pitch=100] [var=6] [pan=0] [muffle=1]
 *           [at=X,Y] [max=сек]
 *     muffle=1  — глухо, «из-за двери/стены» (фильтр низких частот)
 *     at=X,Y    — источник в клетке X,Y: панорама и громкость по
 *                 положению игрока
 *   NPVoice stop
 * Скрипт: NPVoice.play('moan|sigh', {vol:100, muffle:true, at:[11,5]});
 */

var NPVoice = NPVoice || {};

(function() {
    'use strict';

    var params = PluginManager.parameters('NP_Voice');
    var P = {
        enabled: String(params['Enabled'] || 'true') === 'true',
        optionLabel: params['Option Label'] !== undefined ? String(params['Option Label']) : NP_L('Озвучка добавок', "Mod voice effects"),
        fastMax: Number(params['Fast Battle Max'] || 0.7) || 0.7
    };

    // source files (folder, name) — all shipped with the original game
    var SOURCES = {
        m: ['bgs', '!voice_moan1'],
        c: ['se', '!voice_cumming1']
    };
    // [source, start, end, gainDb, gainDbMuffled] — start/end in seconds, cut at natural pauses.
    // gainDb: per-chunk loudness compensation (measured EBU R128, looped chunk incl. fades) so that
    // every chunk plays at the same loudness as the original scene moan (!voice_moan1 at BGS vol 90
    // = -15.8 LUFS) when vol=100 and the pool offset is 0. gainDbMuffled: the same, measured after
    // the 650 Hz lowpass (the filter itself eats 2-8 dB depending on the chunk).
    var POOLS = {
        sigh: [['m', 3.18, 3.70, 4.9, 11.3], ['m', 5.62, 5.92, 3.7, 11.9], ['m', 5.98, 6.54, 2.3, 7.7],
               ['m', 11.78, 12.46, 1.2, 8.0], ['m', 16.86, 17.54, 3.3, 7.7], ['m', 21.36, 22.12, 3.7, 7.7],
               ['m', 23.88, 24.44, 4.4, 8.8], ['m', 25.72, 26.30, 3.0, 9.8], ['m', 29.64, 30.40, 3.5, 9.3],
               ['c', 8.88, 9.70, 10.4, 18.4]],
        gasp: [['m', 3.80, 4.06, 3.9, 6.0], ['m', 4.08, 4.32, 3.4, 10.0], ['m', 4.36, 4.60, 3.8, 7.1],
               ['m', 4.62, 4.88, 1.9, 6.4], ['m', 12.08, 12.44, 0.7, 6.3], ['m', 13.00, 13.34, 1.3, 3.6],
               ['m', 14.90, 15.12, -2.6, 5.7], ['m', 25.42, 25.68, -3.5, 4.0], ['c', 3.12, 3.32, -2.0, 4.3],
               ['c', 3.60, 3.98, -0.8, 5.3]],
        moan: [['m', 0.28, 1.34, -2.5, 2.2], ['m', 1.36, 2.84, -0.8, 3.7], ['m', 4.92, 5.64, 0.1, 2.6],
               ['m', 6.56, 8.10, -1.1, 2.3], ['m', 9.66, 11.20, -3.2, 2.1], ['m', 13.62, 14.82, -3.3, 0.4],
               ['m', 15.62, 16.82, 0.6, 4.2], ['m', 17.62, 19.10, -1.7, 3.5], ['m', 22.14, 23.56, -2.3, 2.3],
               ['m', 24.46, 25.38, -2.9, 1.0], ['m', 27.00, 28.40, -4.1, -0.6]],
        light: [['m', 3.18, 3.70, 4.9, 11.3], ['m', 5.62, 5.92, 3.7, 11.9], ['m', 5.98, 6.54, 2.3, 7.7],
                ['m', 23.88, 24.44, 4.4, 8.8], ['m', 25.72, 26.30, 3.0, 9.8], ['m', 29.64, 30.40, 3.5, 9.3],
                ['c', 8.88, 9.70, 10.4, 18.4], ['m', 4.36, 4.60, 3.8, 7.1], ['m', 12.08, 12.44, 0.7, 6.3]]
    };
    // pool level relative to the original moan: sighs/gasps a bit softer
    var POOL_DB = { moan: 0, sigh: -3, gasp: -3, light: -3 };
    // «behind a door/wall»: extra attenuation on top of the distance falloff
    var MUFFLE_DB = -11;
    var MAX_BOOST_DB = 12;
    NPVoice.POOL_DB = POOL_DB;
    NPVoice.POOLS = POOLS;
    NPVoice.SOURCES = SOURCES;
    NPVoice.params = P;

    var _audio = {};      // key -> WebAudio (used only as a loader/decoder)
    var _cur = null;      // {src, gain, timer}
    var _last = {};       // pool -> last clip index

    NPVoice.isEnabled = function() { return !!ConfigManager.npVoiceExtras; };

    function ctx() { return (typeof WebAudio !== 'undefined') ? WebAudio._context : null; }

    NPVoice.preload = function() {
        if (!ctx()) return;
        Object.keys(SOURCES).forEach(function(k) {
            if (_audio[k]) return;
            var s = SOURCES[k];
            var url = AudioManager._path + s[0] + '/' + encodeURIComponent(s[1]) + AudioManager.audioFileExt();
            try { _audio[k] = new WebAudio(url); } catch (e) { _audio[k] = null; }
        });
    };

    function bufferOf(k) {
        var a = _audio[k];
        return (a && a.isReady && a.isReady()) ? a._buffer : null;
    }

    NPVoice.stop = function(fade) {
        var c = _cur; _cur = null;
        if (!c) return;
        if (c.timer) clearTimeout(c.timer);
        try {
            var t = ctx().currentTime;
            var f = fade === undefined ? 0.06 : fade;
            c.gain.gain.cancelScheduledValues(t);
            c.gain.gain.setValueAtTime(c.gain.gain.value, t);
            c.gain.gain.linearRampToValueAtTime(0, t + f);
            c.src.stop(t + f + 0.02);
        } catch (e) {}
    };

    function pickClip(poolSpec) {
        var names = String(poolSpec || 'sigh').split('|').filter(function(n) { return POOLS[n]; });
        if (!names.length) return null;
        var name = names[Math.floor(Math.random() * names.length)];
        var pool = POOLS[name];
        var i = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && i === _last[name]) i = (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
        _last[name] = i;
        return { clip: pool[i], pool: name };
    }

    function fastBattle() {
        return typeof NP_FastBattle !== 'undefined' && NP_FastBattle.isActive && NP_FastBattle.isActive();
    }

    NPVoice.play = function(poolSpec, o) {
        o = o || {};
        if (!NPVoice.isEnabled()) return false;
        var c = ctx();
        if (!c || !WebAudio._masterGainNode) return false;
        NPVoice.preload();
        var pick = pickClip(poolSpec);
        if (!pick) return false;
        var clip = pick.clip;
        var buf = bufferOf(clip[0]);
        if (!buf) return false;                       // still loading: just skip
        var seVol = (AudioManager._seVolume !== undefined ? AudioManager._seVolume : 100) / 100;
        var vol = (o.vol !== undefined ? Number(o.vol) : 100) / 100 * seVol;
        var db = (POOL_DB[pick.pool] || 0) + (o.muffle ? (clip[4] || 0) + MUFFLE_DB : (clip[3] || 0));
        vol *= Math.pow(10, Math.min(MAX_BOOST_DB, db) / 20);
        var pan = Number(o.pan || 0) / 100;
        if (o.at && typeof $gamePlayer !== 'undefined' && $gamePlayer) {
            var dx = o.at[0] - $gamePlayer.x, dy = o.at[1] - $gamePlayer.y;
            var dist = Math.abs(dx) + Math.abs(dy);
            pan = Math.max(-0.8, Math.min(0.8, dx / 6));
            vol *= Math.max(0.35, 1 - dist / 12);
        }
        if (vol <= 0.001) return false;
        var basePitch = (o.pitch !== undefined ? Number(o.pitch) : 100);
        var variance = (o['var'] !== undefined ? Number(o['var']) : 6);
        var rate = Math.max(0.5, (basePitch + (Math.random() * 2 - 1) * variance) / 100);
        var start = clip[1], dur = Math.min(clip[2], buf.duration) - clip[1];
        var maxDur = o.max !== undefined ? Number(o.max) : 0;
        if (fastBattle()) maxDur = maxDur > 0 ? Math.min(maxDur, P.fastMax) : P.fastMax;
        if (maxDur > 0) dur = Math.min(dur, maxDur * rate);
        if (!(dur > 0.05)) return false;
        var real = dur / rate;

        NPVoice.stop(0.04);
        try {
            var t = c.currentTime;
            var src = c.createBufferSource();
            src.buffer = buf;
            src.playbackRate.setValueAtTime(rate, t);
            var gain = c.createGain();
            var fi = Math.min(0.03, real / 4), fo = Math.min(0.10, real / 3);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol, t + fi);
            gain.gain.setValueAtTime(vol, t + real - fo);
            gain.gain.linearRampToValueAtTime(0, t + real);
            var node = src;
            if (o.muffle) {
                var lp = c.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(650, t);
                lp.Q.setValueAtTime(0.7, t);
                node.connect(lp); node = lp;
            }
            node.connect(gain); node = gain;
            var panner;
            if (c.createStereoPanner) {
                panner = c.createStereoPanner();
                panner.pan.setValueAtTime(pan, t);
            } else {
                panner = c.createPanner();
                panner.panningModel = 'equalpower';
                panner.setPosition(pan, 0, 1 - Math.abs(pan));
            }
            node.connect(panner);
            panner.connect(WebAudio._masterGainNode);
            src.start(t, start, dur);
            var me = { src: src, gain: gain };
            me.timer = setTimeout(function() { if (_cur === me) _cur = null; }, real * 1000 + 50);
            _cur = me;
            return true;
        } catch (e) {
            console.warn('NPVoice', e);
            return false;
        }
    };

    // ---------------------------------------------------------------------
    // Plugin command
    // ---------------------------------------------------------------------
    var _pc = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pc.apply(this, arguments);
        if (command !== 'NPVoice') return;
        args = args || [];
        if (args[0] === 'stop') { NPVoice.stop(); return; }
        var o = {};
        for (var i = 1; i < args.length; i++) {
            var a = String(args[i]);
            var eq = a.indexOf('=');
            if (eq < 0) { if (!isNaN(Number(a))) o.vol = Number(a); continue; }
            var k = a.slice(0, eq), v = a.slice(eq + 1);
            if (k === 'at') o.at = v.split(',').map(Number);
            else if (k === 'muffle') o.muffle = v === '1' || v === 'true';
            else o[k] = Number(v);
        }
        NPVoice.play(args[0], o);
    };

    // preload once audio is up
    var _boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _boot.apply(this, arguments);
        NPVoice.preload();
    };

    // ---------------------------------------------------------------------
    // Config / Options
    // ---------------------------------------------------------------------
    ConfigManager.npVoiceExtras = P.enabled;
    var _Config_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _Config_makeData.apply(this, arguments);
        config.npVoiceExtras = this.npVoiceExtras;
        return config;
    };
    var _Config_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _Config_applyData.apply(this, arguments);
        this.npVoiceExtras = (config && config.npVoiceExtras !== undefined) ? !!config.npVoiceExtras : P.enabled;
    };
    if (P.optionLabel) {
        var _Opt_addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Opt_addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npVoiceExtras');
        };
    }
})();
