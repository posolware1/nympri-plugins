var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_PowerStrike.js
//=============================================================================
/*:
 * @plugindesc v1.1 «Усиленный удар»: три QTE с таймерами по сложности игры и множителем урона.
 * @author NP RU
 *
 * @param Result Variable
 * @desc Переменная: итог QTE (-1 пропущено, 0 слабо, 1 обычно, 2 хорошо, 3 идеально).
 * @type variable
 * @default 3530
 *
 * @param Multiplier Variable
 * @desc Переменная: множитель урона ×100 (170 = ×1.7). 0 = нет усиленного удара.
 * @type variable
 * @default 3531
 *
 * @param Command Icon
 * @desc Иконка команды в меню боя.
 * @type number
 * @default 131
 *
 * @param Perfect Animation
 * @desc Анимация удара при «Идеально» (12 = 斬撃/必殺技2).
 * @type animation
 * @default 12
 *
 * @param Fatigue Rate
 * @desc Доп. усталость относительно обычной атаки (0.5 = итого ×1.5).
 * @default 0.5
 *
 * @param Mult Perfect
 * @default 1.7
 * @param Mult Good
 * @default 1.25
 * @param Mult Normal
 * @default 1.0
 * @param Mult Weak
 * @default 0.6
 *
 * @param Fap Auto Success
 * @desc На сложности «Фап» сразу «Идеально» без QTE.
 * @type boolean
 * @default false
 *
 * @param Command Labels
 * @desc Подписывать иконки команд в бою (название рядом с курсором).
 * @type boolean
 * @default true
 *
 * @help
 * Команда «Усиленный удар» добавляется в меню боя героя (CE365) и союзников
 * (CE366) сразу после «Атаки». Вставка делается при загрузке базы в память
 * (после TB_CommonEventPatchLoader), файл CommonEvents.json не меняется.
 *
 * Ход: QTE → обычная атака CE36 → урон после брони × множитель.
 * Множитель применяется один раз и сбрасывается после атаки.
 *
 * Команда плагина:
 *   NP_PowerStrike run      — запустить QTE, итог в переменные (см. параметры)
 *   NP_PowerStrike clear    — сбросить множитель
 * Скрипт:
 *   NP_PowerStrike.applyDamage()  — вызывается из CE36 перед записью урона
 */

var NP_PowerStrike = NP_PowerStrike || {};

(function() {
    'use strict';

    var params = PluginManager.parameters('NP_PowerStrike');
    var num = function(v, d) { var n = Number(v); return (v === undefined || v === '' || isNaN(n)) ? d : n; };
    var P = {
        resVar: num(params['Result Variable'], 3530),
        multVar: num(params['Multiplier Variable'], 3531),
        icon: num(params['Command Icon'], 131),
        perfectAnim: num(params['Perfect Animation'], 12),
        fatRate: num(params['Fatigue Rate'], 0.5),
        mult: [num(params['Mult Weak'], 0.6), num(params['Mult Normal'], 1.0),
               num(params['Mult Good'], 1.25), num(params['Mult Perfect'], 1.7)],
        fapAuto: String(params['Fap Auto Success'] || 'false') === 'true',
        labels: String(params['Command Labels'] || 'true') !== 'false',
        battleSw: 14,
        gallerySw: 5,
        diffVar: 3
    };
    NP_PowerStrike.params = P;

    // Difficulty: V3 0 Fap, 1 Normal, 2 Hard, 3 Easy (hidden)
    // frames = how long each dot lives; floor = worst possible grade
    var DIFF = {
        0: { dots: 3, frames: 66, floor: 1 },
        3: { dots: 3, frames: 60, floor: 0 },
        1: { dots: 4, frames: 48, floor: 0 },
        2: { dots: 4, frames: 38, floor: 0 }
    };
    NP_PowerStrike.DIFF = DIFF;
    NP_PowerStrike.GRADE_KEYS = ['battle_power_strike_weak', 'battle_power_strike_normal',
        'battle_power_strike_good', 'battle_power_strike_perfect'];

    // ---------------------------------------------------------------------
    // Pure logic (tested in node)
    // ---------------------------------------------------------------------
    NP_PowerStrike.settings = function(diff) {
        if (!DIFF[diff]) diff = 1;
        var base = DIFF[diff], rate = diff === 1 ? 0.8 : diff === 2 ? 0.65 : 1;
        return { dots: base.dots, frames: Math.round(base.frames * rate), floor: base.floor };
    };
    NP_PowerStrike.pickMode = function(last, rnd) {
        var modes = ['circles', 'marker', 'hold'].filter(function(mode) { return mode !== last; });
        return modes[Math.floor((rnd || Math.random)() * modes.length)];
    };
    NP_PowerStrike.timingHit = function(age, center, frames) {
        return age >= center - Math.floor(frames / 2) && age < center + Math.ceil(frames / 2);
    };
    NP_PowerStrike.gradeFor = function(hits, total, floor) {
        var g;
        if (total <= 0) g = 1;
        else if (hits >= total) g = 3;
        else if (hits / total >= 0.75) g = 2;
        else if (hits / total >= 0.5) g = 1;
        else g = 0;
        return Math.max(g, floor || 0);
    };
    NP_PowerStrike.multFor = function(grade) {
        return grade < 0 ? 1 : P.mult[Math.max(0, Math.min(3, grade))];
    };
    // damage after armor -> boosted damage (min 1)
    NP_PowerStrike.scaleDamage = function(dmg, mult) {
        dmg = Number(dmg) || 0;
        if (!(mult > 0) || mult === 1) return dmg;
        var r = mult > 1 ? Math.ceil(dmg * mult) : Math.floor(dmg * mult);
        return Math.max(1, r);
    };
    // random dot positions inside the central 50%x50% of the screen
    NP_PowerStrike.makePositions = function(n, w, h, radius, minDist, rnd) {
        rnd = rnd || Math.random;
        var x0 = w * 0.25 + radius, x1 = w * 0.75 - radius;
        var y0 = h * 0.25 + radius, y1 = h * 0.75 - radius;
        var out = [];
        for (var i = 0; i < n; i++) {
            var best = null, bestD = -1;
            for (var t = 0; t < 40; t++) {
                var p = { x: Math.round(x0 + rnd() * (x1 - x0)), y: Math.round(y0 + rnd() * (y1 - y0)) };
                if (!out.length) { best = p; break; }
                var prev = out[out.length - 1];
                var d = Math.hypot(p.x - prev.x, p.y - prev.y);
                if (d >= minDist) { best = p; break; }
                if (d > bestD) { bestD = d; best = p; }
            }
            out.push(best);
        }
        return out;
    };

    // ---------------------------------------------------------------------
    // Game state helpers
    // ---------------------------------------------------------------------
    var V = function(id) { return $gameVariables.value(id); };
    NP_PowerStrike.multiplier = function() {
        var m = V(P.multVar);
        return m > 0 ? m / 100 : 0;
    };
    NP_PowerStrike.clear = function() {
        $gameVariables.setValue(P.multVar, 0);
        NP_PowerStrike._tpActor = 0;
    };
    NP_PowerStrike.shouldSkip = function() {
        if ($gameSwitches.value(P.gallerySw)) return true;            // gallery replay
        if (typeof Input !== 'undefined' && Input.isPressed('control')) return true; // UTA_MessageSkip (Ctrl)
        if (typeof $gameTemp !== 'undefined' && $gameTemp && $gameTemp._npAutoBattle) return true;
        return false;
    };
    NP_PowerStrike.setResult = function(grade) {
        $gameVariables.setValue(P.resVar, grade);
        $gameVariables.setValue(P.multVar, Math.round(NP_PowerStrike.multFor(grade) * 100));
    };
    NP_PowerStrike.logText = function(key, fallback) {
        try {
            if (typeof KNS_CsvReader !== 'undefined') {
                var t = KNS_CsvReader.getLogText(key);
                if (t !== null && t !== undefined) return t;
            }
        } catch (e) {}
        return fallback;
    };
    NP_PowerStrike.log = function(grade) {
        if (typeof set_mlog !== 'function') return;
        if (grade < 0) return;
        set_mlog('_log_database_text_' + NP_PowerStrike.GRADE_KEYS[grade]);
    };

    // Called right before CALL CE36 (from the injected branch)
    NP_PowerStrike.beforeAttack = function(defaultAnim) {
        var actorId = V(270);
        var a = $gameActors.actor(actorId);
        NP_PowerStrike._tpActor = actorId;
        NP_PowerStrike._tpBefore = a ? a.tp : 0;
        var g = V(P.resVar);
        if (g === 3 && P.perfectAnim > 0) $gameVariables.setValue(149, P.perfectAnim);
        else if (defaultAnim > 0) $gameVariables.setValue(149, defaultAnim);
    };
    // Called right after CE36: extra fatigue (×1.5 in total) and reset
    NP_PowerStrike.afterAttack = function() {
        var id = NP_PowerStrike._tpActor;
        var a = id ? $gameActors.actor(id) : null;
        if (a && V(P.diffVar) >= 1) {
            var delta = a.tp - (NP_PowerStrike._tpBefore || 0);
            if (delta > 0) {
                var extra = Math.ceil(delta * P.fatRate);
                a.setTp(Math.min(a.maxTp(), a.tp + extra));
            }
        }
        NP_PowerStrike.clear();
    };
    // Called from CE36 right after armor, before V54/V144 show the damage
    NP_PowerStrike.applyDamage = function() {
        var m = NP_PowerStrike.multiplier();
        if (!m || m === 1) return;
        if (V(270) >= 100) return;          // enemy attacking: never
        if ($gameSwitches.value(17)) return; // magic attack: no
        var before = window.$dmg;
        window.$dmg = NP_PowerStrike.scaleDamage(window.$dmg, m);
        NP_PowerStrike._lastApplied = { before: before, after: window.$dmg, mult: m };
        $gameVariables.setValue(P.multVar, 0); // consumed
    };

    // ---------------------------------------------------------------------
    // Runtime injection into $dataCommonEvents (after patch loader)
    // ---------------------------------------------------------------------
    function cmd(code, indent, parameters) {
        return { code: code, indent: indent, parameters: parameters, npPowerStrike: true };
    }
    function findChoice(list, needle) {
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c.code === 102 && c.parameters[0].some(function(t) { return String(t).indexOf(needle) === 0; })) return i;
        }
        return -1;
    }
    function findEnd(list, start) {
        var ind = list[start].indent;
        for (var i = start + 1; i < list.length; i++) {
            if (list[i].indent === ind && list[i].code === 404) return i;
        }
        return -1;
    }
    // Insert option at position 1 of the choice block and a branch for it
    function injectChoice(list, needle, cond, defaultAnim, onBranches) {
        if (list.some(function(c) { return c.npPowerStrike; })) return 'already';
        var ci = findChoice(list, needle);
        if (ci < 0) return 'no choice';
        var end = findEnd(list, ci);
        if (end < 0) return 'no end';
        var ind = list[ci].indent;
        var choices = list[ci].parameters[0];
        if (choices.length >= 6) return 'full';
        var label = '\\i[' + P.icon + '] ' + cond;
        // shift indexes of branches 1.. (skill, item, ...)
        var cancel = list[ci].parameters[1];
        if (cancel >= 1) list[ci].parameters[1] = cancel + 1;
        choices.splice(1, 0, label);
        var insertAt = -1;
        for (var i = ci + 1; i < end; i++) {
            var c = list[i];
            if (c.indent === ind && c.code === 402) {
                if (c.parameters[0] >= 1) {
                    if (c.parameters[0] === 1 && insertAt < 0) insertAt = i;
                    c.parameters[0] += 1;
                }
            }
        }
        if (insertAt < 0) insertAt = end;
        var b = ind + 1;
        var branch = [
            cmd(402, ind, [1, label]),
            cmd(108, b, ['NP_PowerStrike: Усиленный удар (QTE)']),
            cmd(122, b, [271, 271, 0, 1, 121]),
            cmd(356, b, ['NP_PowerStrike run']),
            cmd(355, b, ['NP_PowerStrike.beforeAttack(' + defaultAnim + ')']),
            cmd(117, b, [36]),
            cmd(355, b, ['NP_PowerStrike.afterAttack()']),
            cmd(0, b, [])
        ];
        Array.prototype.splice.apply(list, [insertAt, 0].concat(branch));
        if (onBranches) onBranches(list, ci, findEnd(list, ci));
        return 'ok';
    }
    function injectDamage(list) {
        if (list.some(function(c) { return c.npPowerStrike; })) return 'already';
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if ((c.code === 355 || c.code === 655) && /\$dmg\s*-=\s*\$gameVariables\.value\(145\)/.test(c.parameters[0])) {
                for (var j = i + 1; j < Math.min(list.length, i + 12); j++) {
                    var d = list[j];
                    if (d.code === 122 && d.parameters[0] === 54 && d.parameters[3] === 4 &&
                        String(d.parameters[4]).trim() === '$dmg') {
                        list.splice(j, 0, cmd(355, d.indent, ['NP_PowerStrike.applyDamage()']));
                        return 'ok';
                    }
                }
            }
        }
        return 'no anchor';
    }
    NP_PowerStrike.inject = function(ces) {
        var r = {};
        r.ce36 = ces[36] ? injectDamage(ces[36].list) : 'no CE36';
        if (r.ce36 === 'ok' || r.ce36 === 'already') {
            if (ces[365]) r.ce365 = injectChoice(ces[365].list, '\\i[147]', 'en(!s[62])', 7);
            if (ces[366]) r.ce366 = injectChoice(ces[366].list, '\\i[147]', 'en(v[72]===1)', 0,
                function(list, ci, end) {
                    // «Ничего не делать» moved from result 3 to 4: fix its cursor memory value
                    for (var i = ci; i < end; i++) {
                        var c = list[i];
                        if (c.code === 122 && c.parameters[0] === 382 && c.parameters[1] === 382 &&
                            c.parameters[3] === 0 && c.parameters[4] === 3) c.parameters[4] = 4;
                    }
                });
        } else {
            console.warn('[NP_PowerStrike] CE36 anchor not found, command disabled');
        }
        NP_PowerStrike.injectResult = r;
        console.log('[NP_PowerStrike] inject ' + JSON.stringify(r));
        return r;
    };

    if (typeof DataManager !== 'undefined') {
        var _isDatabaseLoaded = DataManager.isDatabaseLoaded;
        DataManager.isDatabaseLoaded = function() {
            var ok = _isDatabaseLoaded.apply(this, arguments);
            if (ok && !NP_PowerStrike._injected && window.$dataCommonEvents) {
                NP_PowerStrike._injected = true;
                try { NP_PowerStrike.inject($dataCommonEvents); }
                catch (e) { console.error('[NP_PowerStrike] inject failed', e); }
            }
            return ok;
        };
    }

    // ---------------------------------------------------------------------
    // Plugin command + wait mode
    // ---------------------------------------------------------------------
    if (typeof Game_Interpreter === 'undefined') return;

    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.apply(this, arguments);
        if (command !== 'NP_PowerStrike') return;
        var sub = String(args[0] || '').toLowerCase();
        if (sub === 'run') this.npStartPowerStrike();
        else if (sub === 'clear') NP_PowerStrike.clear();
    };
    Game_Interpreter.prototype.npStartPowerStrike = function() {
        var diff = V(P.diffVar);
        var set = NP_PowerStrike.settings(diff);
        var scene = SceneManager._scene;
        if (NP_PowerStrike.shouldSkip() || !scene || typeof Sprite_NpPowerStrike === 'undefined') {
            NP_PowerStrike.setResult(-1);
            return;
        }
        if (diff === 0 && P.fapAuto) {
            NP_PowerStrike.setResult(3);
            NP_PowerStrike.log(3);
            return;
        }
        set.mode = NP_PowerStrike.pickMode(NP_PowerStrike._lastMode);
        var sprite = new Sprite_NpPowerStrike(set);
        NP_PowerStrike._lastMode = set.mode;
        scene.addChild(sprite);
        NP_PowerStrike._qte = sprite;
        this.setWaitMode('npPowerStrike');
    };
    var _updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === 'npPowerStrike') {
            var q = NP_PowerStrike._qte;
            if (q && !q.isFinished()) return true;
            if (q) {
                var g = NP_PowerStrike.gradeFor(q._hits, q._total, q._set.floor);
                NP_PowerStrike.setResult(g);
                NP_PowerStrike.log(g);
                if (q.parent) q.parent.removeChild(q);
                NP_PowerStrike._qte = null;
            }
            this._waitMode = '';
            return false;
        }
        return _updateWaitMode.apply(this, arguments);
    };

    // ---------------------------------------------------------------------
    // QTE sprite (all drawn in code)
    // ---------------------------------------------------------------------
    var R = 34;             // dot radius
    var RING0 = 2.5;        // ring starts at R*RING0, shrinks to R
    var INTRO = 18, OUTRO = 42;
    var easeOutBack = function(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    var easeOutCubic = function(t) { return 1 - Math.pow(1 - t, 3); };
    var easeInQuad = function(t) { return t * t; };
    var clamp01 = function(t) { return t < 0 ? 0 : t > 1 ? 1 : t; };

    function se(name, vol, pitch) {
        try { AudioManager.playSe({ name: name, volume: vol || 90, pitch: pitch || 100, pan: 0 }); } catch (e) {}
    }

    function makeGlowBitmap(r, inner, outer) {
        var s = Math.ceil(r * 2.2) * 2;
        var bmp = new Bitmap(s, s);
        var ctx = bmp._context, c = s / 2;
        var g = ctx.createRadialGradient(c, c, 0, c, c, s / 2);
        g.addColorStop(0, inner);
        g.addColorStop(0.42, inner);
        g.addColorStop(0.5, outer);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c, c, s / 2, 0, Math.PI * 2); ctx.fill();
        // solid core + rim
        ctx.beginPath(); ctx.arc(c, c, r * 0.92, 0, Math.PI * 2);
        var g2 = ctx.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r);
        g2.addColorStop(0, '#ffffff'); g2.addColorStop(1, inner);
        ctx.fillStyle = g2; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
        bmp._setDirty ? bmp._setDirty() : (bmp._baseTexture && bmp._baseTexture.update());
        return bmp;
    }
    function dirty(bmp) {
        if (bmp._setDirty) bmp._setDirty();
        else if (bmp._baseTexture) bmp._baseTexture.update();
    }

    function Sprite_NpPowerStrike() { this.initialize.apply(this, arguments); }
    window.Sprite_NpPowerStrike = Sprite_NpPowerStrike;
    Sprite_NpPowerStrike.prototype = Object.create(Sprite.prototype);
    Sprite_NpPowerStrike.prototype.constructor = Sprite_NpPowerStrike;

    Sprite_NpPowerStrike.prototype.initialize = function(set) {
        Sprite.prototype.initialize.call(this);
        this._set = set;
        this._total = set.dots;
        this._hits = 0;
        this._phase = 'intro';
        this._introFrames = set.mode && set.mode !== 'circles' ? 60 : INTRO;
        this._t = 0;
        this._index = -1;
        this._early = false;
        this._done = false;
        var W = Graphics.width, H = Graphics.height;
        this._W = W; this._H = H;
        this._pos = NP_PowerStrike.makePositions(set.dots, W, H, R * RING0, Math.min(W, H) * 0.28);
        this._gaps = [];
        for (var i = 0; i < set.dots; i++) this._gaps.push(5 + Math.floor(Math.random() * 6));
        this._glow = makeGlowBitmap(R, 'rgba(255,214,90,1)', 'rgba(255,170,40,0.55)');
        // dim backdrop
        this._dim = new Sprite(new Bitmap(W, H));
        this._dim.bitmap.fillAll('rgba(0,0,0,1)');
        this._dim.opacity = 0;
        this.addChild(this._dim);
        // dot layer
        this._dotLayer = new Sprite(); this.addChild(this._dotLayer);
        this._fxLayer = new Sprite(); this.addChild(this._fxLayer);
        // header text
        this._head = new Sprite(new Bitmap(W, 80));
        this._head.y = Math.round(H * 0.25) - 78;
        this._head.opacity = 0;
        this.addChild(this._head);
        var hint = set.mode === 'marker' ? NP_L('Жми OK / касание, когда маркер в золотой зоне!', 'Press OK / tap when the marker is in the golden zone!') :
            set.mode === 'hold' ? NP_L('Удерживай OK / кнопку мыши и отпусти в золотой зоне!', 'Hold OK / touch, then release in the golden zone!') :
            NP_PowerStrike.logText('battle_power_strike_hint', NP_L('Жми OK или кликай по кругам до того как они погаснут!', 'Press OK or click the circles before they fade!'));
        this.drawHeader(hint);
        // pips (progress)
        this._pips = new Sprite(new Bitmap(40 * set.dots, 24));
        this._pips.x = Math.round(W / 2 - 20 * set.dots);
        this._pips.y = Math.round(H * 0.75) + 8;
        this.addChild(this._pips);
        this._pipState = [];
        this.drawPips();
        // full-screen flash for the finale
        this._flash = new Sprite(new Bitmap(W, H));
        this._flash.opacity = 0;
        this.addChild(this._flash);
        this._banner = new Sprite(new Bitmap(W, 120));
        this._banner.anchor.x = 0.5; this._banner.anchor.y = 0.5;
        this._banner.x = W / 2; this._banner.y = H / 2;
        this._banner.opacity = 0;
        this.addChild(this._banner);
        this._particles = [];
        se('Skill1', 70, 120);
    };
    Sprite_NpPowerStrike.prototype.drawHeader = function(text) {
        var b = this._head.bitmap;
        b.clear();
        b.fontSize = 26;
        b.outlineColor = 'rgba(0,0,0,0.85)';
        b.outlineWidth = 5;
        b.textColor = '#ffe27a';
        b.drawText(NP_PowerStrike.logText('battle_command_power_strike', NP_L('Усиленный удар', "Power Strike")), 0, 4, this._W, 34, 'center');
        b.fontSize = 20;
        b.textColor = '#ffffff';
        b.drawText(text, 0, 40, this._W, 30, 'center');
    };
    Sprite_NpPowerStrike.prototype.drawPips = function() {
        var b = this._pips.bitmap, ctx = b._context;
        b.clear();
        for (var i = 0; i < this._total; i++) {
            var st = this._pipState[i];
            ctx.beginPath();
            ctx.arc(20 + i * 40, 12, 8, 0, Math.PI * 2);
            ctx.fillStyle = st === 'hit' ? '#ffd65a' : st === 'miss' ? '#c0392b' : 'rgba(255,255,255,0.25)';
            ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
        }
        dirty(b);
    };
    Sprite_NpPowerStrike.prototype.isFinished = function() { return this._done; };

    Sprite_NpPowerStrike.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this._t++;
        this.updateParticles();
        switch (this._phase) {
        case 'intro':
            var k = easeOutCubic(clamp01(this._t / this._introFrames));
            this._dim.opacity = 90 * k;
            this._head.opacity = 255 * k;
            this.swallowInput();
            if (this._t >= this._introFrames) this.nextDot();
            break;
        case 'gap':
            if (this.pressed()) {
                if (!this._early) { this._early = true; this.popText(NP_L('Рано!', "Too early!"), '#ff6a5a', this._W / 2, this._H / 2); se('Buzzer2', 55, 110); }
            }
            if (--this._gapLeft <= 0) this.showDot();
            break;
        case 'dot':
            this.updateDot();
            break;
        case 'outro':
            this.updateOutro();
            break;
        }
    };
    Sprite_NpPowerStrike.prototype.swallowInput = function() {
        // ignore the OK that confirmed the battle command
    };
    Sprite_NpPowerStrike.prototype.pressedKey = function() {
        return Input.isTriggered('ok');
    };
    Sprite_NpPowerStrike.prototype.pressedTouch = function() {
        return TouchInput.isTriggered();
    };
    Sprite_NpPowerStrike.prototype.pressed = function() {
        return this.pressedKey() || this.pressedTouch();
    };
    Sprite_NpPowerStrike.prototype.nextDot = function() {
        this._index++;
        if (this._index >= this._total) { this.startOutro(); return; }
        this._phase = 'gap';
        this._gapLeft = this._index === 0 ? 4 : this._gaps[this._index];
    };
    Sprite_NpPowerStrike.prototype.showDot = function() {
        if (this._set.mode === 'marker' || this._set.mode === 'hold') {
            this.showTimingRound();
            return;
        }
        var p = this._pos[this._index];
        var d = new Sprite();
        d.x = p.x; d.y = p.y;
        var core = new Sprite(this._glow);
        core.anchor.x = core.anchor.y = 0.5;
        d.addChild(core);
        var rs = Math.ceil(R * RING0 + 8) * 2;
        var ring = new Sprite(new Bitmap(rs, rs));
        ring.anchor.x = ring.anchor.y = 0.5;
        d.addChild(ring);
        var label = new Sprite(new Bitmap(60, 40));
        label.anchor.x = label.anchor.y = 0.5;
        label.bitmap.fontSize = 24; label.bitmap.textColor = '#5a3200';
        label.bitmap.outlineWidth = 0;
        label.bitmap.drawText(String(this._index + 1), 0, 0, 60, 40, 'center');
        d.addChild(label);
        d._core = core; d._ring = ring; d._age = 0;
        d.scale.x = d.scale.y = 0.01;
        this._dotLayer.addChild(d);
        this._dot = d;
        this._phase = 'dot';
        se('Cursor2', 70, 90 + this._index * 12);
    };
    Sprite_NpPowerStrike.prototype.drawRing = function(d, t) {
        var b = d._ring.bitmap, ctx = b._context, c = b.width / 2;
        var r = R * (RING0 - (RING0 - 1) * easeInQuad(t)) + 2;
        b.clear();
        var col = t < 0.7 ? 'rgba(255,240,180,' : 'rgba(255,120,80,';
        ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.lineWidth = 7; ctx.strokeStyle = col + '0.25)'; ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = col + '0.95)'; ctx.stroke();
        dirty(b);
    };
    Sprite_NpPowerStrike.prototype.updateDot = function() {
        if (this._set.mode === 'marker' || this._set.mode === 'hold') {
            this.updateTimingRound();
            return;
        }
        var d = this._dot, life = this._set.frames;
        d._age++;
        var t = clamp01(d._age / life);
        var s = easeOutBack(clamp01(d._age / 9));
        d.scale.x = d.scale.y = s;
        d._core.scale.x = d._core.scale.y = 1 + 0.06 * Math.sin(d._age * 0.5);
        this.drawRing(d, t);
        var key = this.pressedKey(), touch = this.pressedTouch();
        if (key || touch) {
            var ok = true;
            if (touch) {
                var dx = TouchInput.x - d.x, dy = TouchInput.y - d.y;
                ok = Math.sqrt(dx * dx + dy * dy) <= R * 1.6;
            }
            if (this._early || d._age < 5) ok = false; // mashing / pre-press
            this.resolveDot(ok);
            return;
        }
        if (d._age >= life) this.resolveDot(false);
    };
    Sprite_NpPowerStrike.prototype.showTimingRound = function() {
        var d = new Sprite();
        d.x = this._W / 2; d.y = this._H * 0.5;
        d._core = new Sprite(new Bitmap(640, 150));
        d._core.anchor.x = d._core.anchor.y = 0.5;
        d._ring = new Sprite();
        d.addChild(d._core); d.addChild(d._ring);
        this._dotLayer.addChild(d); this._dot = d;
        this._roundAge = 0; this._heldAge = 0; this._holding = false;
        this._targetFrame = 54 + Math.floor(Math.random() * 24);
        this._roundFrames = 120;
        this._phase = 'dot';
        this.drawTimingRound();
        se('Cursor2', 70, 90 + this._index * 12);
    };
    Sprite_NpPowerStrike.prototype.drawTimingRound = function() {
        var b = this._dot._core.bitmap, w = 600, x = 20, y = 54;
        var start = this._targetFrame - Math.floor(this._set.frames / 2);
        var age = this._set.mode === 'hold' ? this._heldAge : this._roundAge;
        var good = NP_PowerStrike.timingHit(age, this._targetFrame, this._set.frames);
        b.clear();
        b.fillRect(0, 0, 640, 150, 'rgba(0,0,0,0.8)');
        b.fontSize = 22; b.textColor = '#ffffff'; b.outlineWidth = 3;
        var title = this._set.mode === 'hold' ? (this._holding ? NP_L('Отпусти в золотой зоне', 'Release in the golden zone') : NP_L('Зажми OK / кнопку мыши', 'Hold OK / touch')) : NP_L('Останови маркер в золотой зоне', 'Stop the marker in the golden zone');
        b.drawText((this._index + 1) + '/' + this._total + ' — ' + title, x, 8, w, 32, 'center');
        b.fillRect(x, y, w, 32, '#32323f');
        b.fillRect(x + w * start / this._roundFrames, y - 4, w * this._set.frames / this._roundFrames, 40, '#c99b36');
        var pos = clamp01(age / this._roundFrames);
        if (this._set.mode === 'hold') b.fillRect(x, y + 6, w * pos, 20, 'rgba(255,255,255,0.35)');
        b.fillRect(x + (w - 6) * pos, y - 10, 6, 52, good ? '#ffffff' : '#ff8970');
        b.fillRect(x, 116, w, 6, '#32323f');
        b.fillRect(x, 116, w * (1 - clamp01(this._roundAge / this._roundFrames)), 6, '#e0c47a');
    };
    Sprite_NpPowerStrike.prototype.updateTimingRound = function() {
        this._roundAge++;
        var key = this.pressedKey(), touch = this.pressedTouch();
        if (this._set.mode === 'marker') {
            if (key || touch) {
                this.resolveDot(!this._early && NP_PowerStrike.timingHit(this._roundAge, this._targetFrame, this._set.frames));
                return;
            }
        } else {
            if (!this._holding && (key || touch)) {
                this._holding = true;
                this._holdInput = touch ? 'touch' : 'key';
            }
            if (this._holding) {
                var held = this._holdInput === 'touch' ? TouchInput.isPressed() : Input.isPressed('ok');
                if (!held) {
                    this.resolveDot(!this._early && NP_PowerStrike.timingHit(this._heldAge, this._targetFrame, this._set.frames));
                    return;
                }
                this._heldAge++;
            }
        }
        if (this._roundAge >= this._roundFrames) { this.resolveDot(false); return; }
        this.drawTimingRound();
    };
    Sprite_NpPowerStrike.prototype.resolveDot = function(hit) {
        var d = this._dot;
        this._dot = null;
        this._early = false;
        this._pipState[this._index] = hit ? 'hit' : 'miss';
        this.drawPips();
        if (hit) {
            this._hits++;
            se('Sword2', 85, 115 + this._index * 8);
            this.burst(d.x, d.y, 14, ['#fff6c8', '#ffd65a', '#ffae3a']);
            this.ringFlash(d.x, d.y, '#fff2b0');
        } else {
            se('Blow1', 70, 60);
            this.crack(d.x, d.y);
        }
        this._fade = d;
        d._fadeT = 0; d._hit = hit;
        this._dotLayer.removeChild(d);
        this._fxLayer.addChild(d);
        this._fading = this._fading || [];
        this._fading.push(d);
        this.nextDot();
    };
    Sprite_NpPowerStrike.prototype.ringFlash = function(x, y, color) {
        var s = R * 4;
        var b = new Bitmap(s * 2, s * 2), ctx = b._context;
        var g = ctx.createRadialGradient(s, s, 0, s, s, s);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s, s, s, 0, Math.PI * 2); ctx.fill(); dirty(b);
        var sp = new Sprite(b);
        sp.anchor.x = sp.anchor.y = 0.5; sp.x = x; sp.y = y;
        sp.blendMode = 1;
        sp._life = 16; sp._age = 0; sp._grow = true;
        this._fxLayer.addChild(sp);
        this._particles.push(sp);
    };
    Sprite_NpPowerStrike.prototype.burst = function(x, y, n, colors) {
        for (var i = 0; i < n; i++) {
            var b = new Bitmap(8, 8), ctx = b._context;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath(); ctx.arc(4, 4, 3.5, 0, Math.PI * 2); ctx.fill(); dirty(b);
            var sp = new Sprite(b);
            sp.anchor.x = sp.anchor.y = 0.5;
            sp.x = x; sp.y = y; sp.blendMode = 1;
            var a = Math.PI * 2 * i / n + Math.random() * 0.4, v = 3 + Math.random() * 4;
            sp._vx = Math.cos(a) * v; sp._vy = Math.sin(a) * v;
            sp._life = 22 + Math.floor(Math.random() * 10); sp._age = 0;
            this._fxLayer.addChild(sp);
            this._particles.push(sp);
        }
    };
    Sprite_NpPowerStrike.prototype.crack = function(x, y) {
        var s = R * 2 + 8, b = new Bitmap(s * 2, s * 2), ctx = b._context;
        ctx.strokeStyle = 'rgba(40,0,0,0.9)'; ctx.lineWidth = 3;
        for (var i = 0; i < 5; i++) {
            var a = Math.random() * Math.PI * 2, len = R * (0.6 + Math.random() * 0.5);
            ctx.beginPath(); ctx.moveTo(s, s);
            var mx = s + Math.cos(a + 0.3) * len * 0.5, my = s + Math.sin(a + 0.3) * len * 0.5;
            ctx.lineTo(mx, my); ctx.lineTo(s + Math.cos(a) * len, s + Math.sin(a) * len); ctx.stroke();
        }
        dirty(b);
        var sp = new Sprite(b);
        sp.anchor.x = sp.anchor.y = 0.5; sp.x = x; sp.y = y;
        sp._life = 24; sp._age = 0;
        this._fxLayer.addChild(sp);
        this._particles.push(sp);
        this.popText(NP_L('Мимо', "Miss"), '#ff6a5a', x, y - R - 18);
    };
    Sprite_NpPowerStrike.prototype.popText = function(text, color, x, y) {
        var b = new Bitmap(220, 40);
        b.fontSize = 22; b.textColor = color; b.outlineColor = 'rgba(0,0,0,0.9)'; b.outlineWidth = 4;
        b.drawText(text, 0, 0, 220, 40, 'center');
        var sp = new Sprite(b);
        sp.anchor.x = sp.anchor.y = 0.5; sp.x = x; sp.y = y;
        sp._vy = -0.8; sp._vx = 0; sp._life = 30; sp._age = 0; sp._text = true;
        this._fxLayer.addChild(sp);
        this._particles.push(sp);
    };
    Sprite_NpPowerStrike.prototype.updateParticles = function() {
        var list = this._particles;
        for (var i = list.length - 1; i >= 0; i--) {
            var p = list[i];
            p._age++;
            var k = p._age / p._life;
            if (p._vx !== undefined) { p.x += p._vx; p.y += p._vy; if (!p._text) { p._vx *= 0.9; p._vy = p._vy * 0.9 + 0.15; } }
            if (p._grow) { var s = 0.3 + easeOutCubic(k) * 0.9; p.scale.x = p.scale.y = s; }
            p.opacity = 255 * (1 - easeInQuad(clamp01(k)));
            if (p._age >= p._life) { if (p.parent) p.parent.removeChild(p); list.splice(i, 1); }
        }
        var f = this._fading || [];
        for (var j = f.length - 1; j >= 0; j--) {
            var d = f[j];
            d._fadeT++;
            var t = clamp01(d._fadeT / 14);
            if (d._hit) { d.scale.x = d.scale.y = 1 + 0.6 * easeOutCubic(t); }
            else { d.scale.x = d.scale.y = 1 - 0.25 * t; d._core.setColorTone([90, -60, -60, 160]); d._ring.visible = false; }
            d.opacity = 255 * (1 - t);
            if (t >= 1) { if (d.parent) d.parent.removeChild(d); f.splice(j, 1); }
        }
    };
    Sprite_NpPowerStrike.prototype.startOutro = function() {
        this._phase = 'outro';
        this._t = 0;
        var g = NP_PowerStrike.gradeFor(this._hits, this._total, this._set.floor);
        this._grade = g;
        var W = this._W, H = this._H;
        var fb = this._flash.bitmap;
        var text, color;
        if (g === 3) {
            var ctx = fb._context, gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
            gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.5, 'rgba(255,200,60,0.8)'); gr.addColorStop(1, 'rgba(255,160,0,0.25)');
            ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); dirty(fb);
            this._flash.blendMode = 1;
            text = NP_L('ИДЕАЛЬНО!', "PERFECT!"); color = '#ffd84a';
            se('Flash2', 90, 100); se('Powerup', 70, 110);
            if ($gameScreen) $gameScreen.startShake(6, 9, 20);
            for (var i = 0; i < 3; i++) this.burst(W / 2, H / 2, 16, ['#fff6c8', '#ffd65a', '#ffae3a']);
        } else if (g === 2) {
            fb.fillAll('rgba(255,230,150,0.6)'); this._flash.blendMode = 1;
            text = NP_L('Хорошо!', "Good!"); color = '#9ef07a';
            se('Saint3', 70, 120);
        } else if (g === 1) {
            fb.fillAll('rgba(255,255,255,0.25)');
            text = NP_L('Неплохо', "Not bad"); color = '#ffffff';
            se('Decision2', 60, 100);
        } else {
            fb.fillAll('rgba(70,70,80,0.75)');
            text = NP_L('Слабо...', "Weak..."); color = '#9a9aa6';
            se('Down2', 75, 75);
        }
        var bb = this._banner.bitmap;
        bb.fontSize = g === 3 ? 64 : 48; bb.textColor = color;
        bb.outlineColor = 'rgba(0,0,0,0.9)'; bb.outlineWidth = 7;
        bb.drawText(text, 0, 0, W, 120, 'center');
        this._head.opacity = 0;
    };
    Sprite_NpPowerStrike.prototype.updateOutro = function() {
        var t = clamp01(this._t / OUTRO), g = this._grade;
        var peak = g === 3 ? 230 : g === 2 ? 150 : g === 1 ? 90 : 170;
        this._flash.opacity = t < 0.15 ? peak * (t / 0.15) : peak * (1 - easeOutCubic((t - 0.15) / 0.85));
        var s = g === 3 ? 0.6 + 0.5 * easeOutBack(clamp01(t / 0.35)) : 0.8 + 0.2 * easeOutCubic(clamp01(t / 0.3));
        this._banner.scale.x = this._banner.scale.y = s;
        this._banner.opacity = t < 0.75 ? 255 : 255 * (1 - (t - 0.75) / 0.25);
        this._dim.opacity = 90 * (1 - t);
        this._pips.opacity = 255 * (1 - t);
        if (this._t >= OUTRO && this._particles.length === 0) this._done = true;
        if (this._t >= OUTRO + 30) this._done = true;
    };

    // ---------------------------------------------------------------------
    // Command labels next to the icon-only battle command list
    // ---------------------------------------------------------------------
    var ICON_KEYS = { 147: 'battle_command_attack', 8: 'battle_command_skill', 260: 'battle_command_item',
        506: 'battle_command_defend', 4: 'battle_command_nothing', 121: 'battle_command_escape',
        11: 'battle_command_struggle' };
    ICON_KEYS[P.icon] = 'battle_command_power_strike';
    NP_PowerStrike.labelFor = function(text) {
        var m = /^\\i\[(\d+)\]\s*$/i.exec(String(text || '').trim());
        if (!m) return null;
        var key = ICON_KEYS[Number(m[1])];
        if (!key) return null;
        var fb = { battle_command_power_strike: NP_L('Усиленный удар', "Power Strike") }[key] || null;
        return NP_PowerStrike.logText(key, fb);
    };
    if (P.labels && typeof Window_ChoiceList !== 'undefined') {
        var _wcl_update = Window_ChoiceList.prototype.update;
        Window_ChoiceList.prototype.update = function() {
            _wcl_update.apply(this, arguments);
            this.npUpdateLabel();
        };
        Window_ChoiceList.prototype.npUpdateLabel = function() {
            var show = false, text = null;
            if (this.isOpen() && this.active && $gameSwitches && $gameSwitches.value(P.battleSw) && this.index() >= 0) {
                text = NP_PowerStrike.labelFor(this.commandName(this.index()));
                show = !!text;
            }
            if (!this._npLabel) {
                if (!show) return;
                this._npLabel = new Sprite(new Bitmap(260, 40));
                this._npLabel.anchor.x = 1; this._npLabel.anchor.y = 0.5;
            }
            var L = this._npLabel, scene = SceneManager._scene;
            if (scene && L.parent !== scene) scene.addChild(L);
            L.visible = show;
            if (!show) return;
            if (L._text !== text) {
                L._text = text;
                var b = L.bitmap; b.clear();
                b.fontSize = 22; b.outlineColor = 'rgba(0,0,0,0.9)'; b.outlineWidth = 5; b.textColor = '#ffffff';
                b.drawText(text, 0, 0, 252, 40, 'right');
            }
            var rect = this.itemRect(this.index());
            L.x = this.x - 4;
            L.y = this.y + this.padding + rect.y - this._scrollY + rect.height / 2;
        };
        var _wcl_close = Window_ChoiceList.prototype.close;
        Window_ChoiceList.prototype.close = function() {
            _wcl_close.apply(this, arguments);
            if (this._npLabel) this._npLabel.visible = false;
        };
    }
})();
