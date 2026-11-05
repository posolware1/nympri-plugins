var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_TitleVolume.js
//=============================================================================
/*:
 * @plugindesc v1.0 Кнопка звука и ползунок громкости музыки на титульном экране.
 * @author NP RU patch
 *
 * @param Corner
 * @desc Угол: topright / bottomright
 * @default topright
 *
 * @param Hotkey
 * @desc Код клавиши для вкл/выкл музыки на титуле (77 = M, 0 = нет)
 * @default 77
 *
 * @help
 * В правом верхнем углу титульного экрана — значок динамика и ползунок.
 *  - Клик/тап по динамику: выключить музыку (громкость BGM запоминается)
 *    или вернуть прежнюю громкость.
 *  - Клик или перетаскивание по ползунку: 0..100 с шагом 10.
 *  - Колесо мыши над виджетом: ±10.
 *  - Клавиша M: то же, что клик по динамику (только на титуле).
 * Меняет ConfigManager.bgmVolume (та же настройка, что «Громкость BGM» в
 * Настройках), применяется сразу и сохраняется через ConfigManager.save().
 * Не зависит от NP_TitleProgress и пункта «Заставка по прогрессу».
 */
var Imported = Imported || {};
Imported.NP_TitleVolume = true;
var NP_TitleVolume = NP_TitleVolume || {};

(function() {
    'use strict';
    var params = PluginManager.parameters('NP_TitleVolume');
    var CORNER = String(params['Corner'] || 'topright').toLowerCase();
    var HOTKEY = Number(params['Hotkey'] !== undefined ? params['Hotkey'] : 77);

    var W = 300, H = 52, PAD = 16;
    var ICON = {x: 8, y: 6, w: 40, h: 40};
    var BAR = {x: 62, y: 18, w: 170, h: 16};
    var STEP = 10;

    // ------------------------------------------------------------------ config
    ConfigManager.npTitlePrevBgm = 100;
    var _makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var c = _makeData.apply(this, arguments);
        c.npTitlePrevBgm = this.npTitlePrevBgm;
        return c;
    };
    var _applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _applyData.apply(this, arguments);
        var v = c && c.npTitlePrevBgm !== undefined ? Number(c.npTitlePrevBgm) : 100;
        this.npTitlePrevBgm = (isFinite(v) && v > 0) ? Math.min(100, v) : 100;
    };

    NP_TitleVolume.clamp = function(v) {
        v = Math.round((Number(v) || 0) / STEP) * STEP;
        return Math.max(0, Math.min(100, v));
    };
    NP_TitleVolume.setVolume = function(v, noSave) {
        v = NP_TitleVolume.clamp(v);
        if (ConfigManager.bgmVolume === v) return false;
        ConfigManager.bgmVolume = v;            // сеттер -> AudioManager.bgmVolume -> живой BGM
        if (v > 0) ConfigManager.npTitlePrevBgm = v;
        if (!noSave) ConfigManager.save();
        return true;
    };
    NP_TitleVolume.isMuted = function() { return ConfigManager.bgmVolume <= 0; };
    NP_TitleVolume.toggleMute = function() {
        if (NP_TitleVolume.isMuted()) {
            NP_TitleVolume.setVolume(ConfigManager.npTitlePrevBgm || 100);
        } else {
            ConfigManager.npTitlePrevBgm = ConfigManager.bgmVolume;
            NP_TitleVolume.setVolume(0);
        }
    };

    // ------------------------------------------------------------------ sprite
    function Sprite_NpTitleVolume() { this.initialize.apply(this, arguments); }
    Sprite_NpTitleVolume.prototype = Object.create(Sprite.prototype);
    Sprite_NpTitleVolume.prototype.constructor = Sprite_NpTitleVolume;
    NP_TitleVolume.Sprite = Sprite_NpTitleVolume;

    Sprite_NpTitleVolume.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this, new Bitmap(W, H));
        this.x = Graphics.width - W - PAD;
        this.y = CORNER === 'bottomright' ? Graphics.height - H - PAD : PAD;
        this._drag = false;
        this._hover = false;
        this._last = null;
        this.redraw();
    };
    Sprite_NpTitleVolume.prototype.localPoint = function() {
        return {x: TouchInput.x - this.x, y: TouchInput.y - this.y};
    };
    function inRect(p, r, m) { m = m || 0; return p.x >= r.x - m && p.x < r.x + r.w + m && p.y >= r.y - m && p.y < r.y + r.h + m; }
    Sprite_NpTitleVolume.prototype.isInside = function(p) { return p.x >= 0 && p.y >= 0 && p.x < W && p.y < H; };
    Sprite_NpTitleVolume.prototype.valueAt = function(px) {
        return NP_TitleVolume.clamp((px - BAR.x) / BAR.w * 100);
    };
    Sprite_NpTitleVolume.prototype.update = function() {
        Sprite.prototype.update.call(this);
        var p = this.localPoint();
        if (TouchInput.isTriggered()) {
            if (inRect(p, ICON, 2)) { NP_TitleVolume.toggleMute(); SoundManager.playCursor(); }
            else if (inRect(p, BAR, 10)) { this._drag = true; NP_TitleVolume.setVolume(this.valueAt(p.x), true); }
        }
        if (this._drag) {
            if (TouchInput.isPressed()) NP_TitleVolume.setVolume(this.valueAt(p.x), true);
            else { this._drag = false; ConfigManager.save(); SoundManager.playCursor(); }
        }
        if (TouchInput.wheelY && this.isInside(p)) {
            NP_TitleVolume.setVolume(ConfigManager.bgmVolume + (TouchInput.wheelY < 0 ? STEP : -STEP));
        }
        this._hover = this.isInside(p) || this._drag;
        var key = ConfigManager.bgmVolume + '|' + this._hover;
        if (key !== this._last) this.redraw();
    };
    Sprite_NpTitleVolume.prototype.redraw = function() {
        var b = this.bitmap, v = ConfigManager.bgmVolume, muted = v <= 0;
        this._last = v + '|' + this._hover;
        b.clear();
        var ctx = b._context;
        ctx.save();
        // фон-плашка
        ctx.globalAlpha = this._hover ? 0.75 : 0.5;
        ctx.fillStyle = '#000000';
        roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 12); ctx.fill();
        ctx.globalAlpha = this._hover ? 0.9 : 0.6;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;
        // динамик
        var cx = ICON.x, cy = ICON.y;
        ctx.fillStyle = muted ? '#bbbbbb' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy + 15); ctx.lineTo(cx + 13, cy + 15); ctx.lineTo(cx + 22, cy + 7);
        ctx.lineTo(cx + 22, cy + 33); ctx.lineTo(cx + 13, cy + 25); ctx.lineTo(cx + 6, cy + 25);
        ctx.closePath(); ctx.fill();
        ctx.lineCap = 'round';
        if (muted) {
            ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx + 26, cy + 14); ctx.lineTo(cx + 36, cy + 26);
            ctx.moveTo(cx + 36, cy + 14); ctx.lineTo(cx + 26, cy + 26); ctx.stroke();
        } else {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
            var waves = v >= 70 ? 3 : v >= 40 ? 2 : 1;
            for (var i = 0; i < waves; i++) {
                ctx.beginPath(); ctx.arc(cx + 22, cy + 20, 6 + i * 5, -Math.PI / 3.2, Math.PI / 3.2); ctx.stroke();
            }
        }
        // ползунок
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        roundRect(ctx, BAR.x, BAR.y + 4, BAR.w, BAR.h - 8, 4); ctx.fill();
        var fw = BAR.w * v / 100;
        if (fw > 0) {
            ctx.fillStyle = muted ? '#888888' : '#ffe08a';
            roundRect(ctx, BAR.x, BAR.y + 4, fw, BAR.h - 8, 4); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (var t = 1; t < 10; t++) ctx.fillRect(BAR.x + BAR.w * t / 10 - 0.5, BAR.y + 2, 1, 2);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(BAR.x + fw, BAR.y + BAR.h / 2, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
        // процент
        b.fontSize = 20;
        b.textColor = muted ? '#bbbbbb' : '#ffffff';
        b.outlineColor = 'rgba(0,0,0,0.8)'; b.outlineWidth = 3;
        b.drawText(muted ? NP_L('выкл', "off") : v + '%', BAR.x + BAR.w + 6, 0, W - BAR.x - BAR.w - 12, H, 'center');
        b._setDirty && b._setDirty();
    };
    function roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, h / 2, w / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }

    // ------------------------------------------------------------------ scene
    var _create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function() {
        _create.apply(this, arguments);
        this._npVolumeSprite = new Sprite_NpTitleVolume();
        this.addChild(this._npVolumeSprite);   // поверх окон; окно команд не трогаем
    };

    // клавиша M только на титуле, ввод окна команд не перехватывается
    if (HOTKEY > 0 && typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('keydown', function(e) {
            if (e.keyCode !== HOTKEY || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
            var sc = SceneManager._scene;
            if (sc && sc.constructor === Scene_Title && sc._npVolumeSprite) {
                NP_TitleVolume.toggleMute();
                SoundManager.playCursor();
            }
        });
    }
})();
