//=============================================================================
// NP_VideoPortrait.js
//=============================================================================
/*:
 * @plugindesc v1.0.0 Looping video in place of a standing portrait (above pictures, below message window).
 * @author NP-RU translation team
 *
 * @param Default X
 * @desc Screen X of the video's bottom-center point (default 960).
 * @default 960
 *
 * @param Default Y
 * @desc Screen Y of the video's bottom-center point (default 960 = bottom edge).
 * @default 960
 *
 * @param Default Scale
 * @desc Scale in percent. 143 = 448x672 video becomes ~640x960 (full height).
 * @default 143
 *
 * @param Feather
 * @desc Soft edge width in percent of the video size (0 = hard edges). WebGL only.
 * @default 14
 *
 * @param Fade Frames
 * @desc Fade-in / fade-out duration in frames.
 * @default 20
 *
 * @param Volume Source
 * @desc Which game volume option scales the video sound: bgm / bgs / se / me / none
 * @default bgm
 *
 * @help
 * ============================================================================
 * NP_VideoPortrait  — «живой» портрет из видео
 * ============================================================================
 * [RU]
 * Показывает зацикленное видео на месте стоячей картинки (stand-heroine-...).
 * Видео рисуется над картинками (Show Picture) и под окном сообщений, так что
 * диалоги идут поверх. Видео берётся из папки movies/ (имя без расширения;
 * .webm выбирается автоматически, .mp4 — запасной вариант, как у стандартной
 * команды «Воспроизвести видео»).
 *
 * Команды плагина (Plugin Command):
 *   VideoPortrait show <имя> [x] [y] [масштаб%] [loop|once] [громкость%] [blend]
 *       x, y      — нижняя середина видео в пикселях экрана (1280x960).
 *       масштаб%  — 100 = исходный размер, 143 = во весь рост экрана.
 *       loop|once — крутить по кругу (по умолчанию) или один раз.
 *       громкость — 0..100 (умножается на громкость BGM из настроек).
 *       blend     — normal (по умолч., мягкие края), screen, add.
 *       Любой параметр можно пропустить знаком «-» (= значение по умолчанию).
 *   VideoPortrait hide [кадры]     — плавно убрать (по умолчанию Fade Frames).
 *   VideoPortrait wait             — ждать конца видео (только для once).
 *   VideoPortrait volume <0..100>  — сменить громкость.
 *   VideoPortrait pause / resume   — пауза / продолжить.
 *   VideoPortrait move <x> <y> [масштаб%] — переставить.
 *
 * Примеры:
 *   VideoPortrait show dance1
 *   VideoPortrait show dance2 640 960 120 loop 80
 *   VideoPortrait show dance3 - - - once 100 screen
 *   VideoPortrait wait
 *   VideoPortrait hide 30
 *
 * Поведение:
 *   - При открытии меню/битвы видео ставится на паузу и после возврата
 *     продолжается с того же места. Состояние сохраняется в сейве.
 *   - При переходе на другую карту видео убирается автоматически.
 *   - Работает только на сцене карты (Scene_Map).
 *
 * [EN]
 * Shows a looping video where a standing portrait would be. Rendered above
 * pictures and below the message window. Files: movies/<name>.webm (.mp4 as
 * fallback, same rule as the built-in Play Movie command).
 *
 * Plugin commands:
 *   VideoPortrait show <name> [x] [y] [scale%] [loop|once] [volume%] [blend]
 *   VideoPortrait hide [frames]
 *   VideoPortrait wait          (waits until a "once" video ends)
 *   VideoPortrait volume <0..100>
 *   VideoPortrait pause | resume
 *   VideoPortrait move <x> <y> [scale%]
 * Use "-" to keep a parameter's default. x/y = bottom-center on screen.
 * blend: normal (soft feathered edges, default) | screen | add.
 * Pauses while the menu/battle is open and resumes afterwards; state is saved
 * with the game; auto-hidden on map transfer. Map scene only.
 * Requires RPG Maker MV 1.6.x (PIXI v4).
 */

var NP = NP || {};
NP.VideoPortrait = {};

(function($) {
    'use strict';

    var P = PluginManager.parameters('NP_VideoPortrait');
    $.defX      = Number(P['Default X'] || 960);
    $.defY      = Number(P['Default Y'] || 960);
    $.defScale  = Number(P['Default Scale'] || 143);
    $.feather   = Number(P['Feather'] !== undefined ? P['Feather'] : 14);
    $.fade      = Math.max(1, Number(P['Fade Frames'] || 20));
    $.volSource = String(P['Volume Source'] || 'bgm').toLowerCase();

    //-------------------------------------------------------------------------
    // State (lives in $gameScreen so it is saved with the game)
    //-------------------------------------------------------------------------
    Game_Screen.prototype.npVideoPortrait = function() {
        return this._npVideoPortrait || null;
    };
    Game_Screen.prototype.npSetVideoPortrait = function(state) {
        this._npVideoPortrait = state;
    };

    $.state = function() {
        return $gameScreen ? $gameScreen.npVideoPortrait() : null;
    };

    $.fileExt = function() {
        if (Graphics.canPlayVideoType('video/webm') && !Utils.isMobileDevice()) {
            return '.webm';
        }
        return '.mp4';
    };

    $.volumeFactor = function() {
        switch ($.volSource) {
        case 'bgm': return ConfigManager.bgmVolume / 100;
        case 'bgs': return ConfigManager.bgsVolume / 100;
        case 'se':  return ConfigManager.seVolume / 100;
        case 'me':  return ConfigManager.meVolume / 100;
        default:    return 1;
        }
    };

    function arg(a, i, def) {
        var v = a[i];
        return (v === undefined || v === '-' || v === '') ? def : v;
    }

    $.show = function(args) {
        var name = args[0];
        if (!name) { return; }
        $gameScreen.npSetVideoPortrait({
            name:   name,
            x:      Number(arg(args, 1, $.defX)),
            y:      Number(arg(args, 2, $.defY)),
            scale:  Number(arg(args, 3, $.defScale)) / 100,
            loop:   String(arg(args, 4, 'loop')).toLowerCase() !== 'once',
            volume: Number(arg(args, 5, 100)),
            blend:  String(arg(args, 6, 'normal')).toLowerCase(),
            time:   0,
            paused: false,
            ended:  false,
            hiding: 0,
            serial: ($.serial = ($.serial || 0) + 1)
        });
    };

    $.hide = function(frames) {
        var s = $.state();
        if (!s) { return; }
        frames = Number(frames);
        if (!(frames > 0)) { frames = $.fade; }
        s.hiding = frames;
        s.ended = true;
    };

    $.clear = function() {
        if ($gameScreen) { $gameScreen.npSetVideoPortrait(null); }
    };

    //-------------------------------------------------------------------------
    // Plugin commands
    //-------------------------------------------------------------------------
    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.call(this, command, args);
        if (command !== 'VideoPortrait' && command !== 'NP_VideoPortrait') { return; }
        var sub = String(args[0] || '').toLowerCase();
        var rest = args.slice(1);
        var s = $.state();
        switch (sub) {
        case 'show':   $.show(rest); break;
        case 'hide':   $.hide(rest[0]); break;
        case 'wait':   this.setWaitMode('npVideoPortrait'); break;
        case 'volume': if (s) { s.volume = Number(rest[0] || 0); } break;
        case 'pause':  if (s) { s.paused = true; } break;
        case 'resume': if (s) { s.paused = false; } break;
        case 'move':
            if (s) {
                s.x = Number(arg(rest, 0, s.x));
                s.y = Number(arg(rest, 1, s.y));
                if (rest[2] !== undefined && rest[2] !== '-') { s.scale = Number(rest[2]) / 100; }
            }
            break;
        default:
            console.warn('NP_VideoPortrait: unknown command ' + sub);
        }
    };

    var _updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === 'npVideoPortrait') {
            var s = $.state();
            var waiting = !!(s && !s.loop && !s.ended);
            if (!waiting) { this._waitMode = ''; }
            return waiting;
        }
        return _updateWaitMode.call(this);
    };

    // Auto-hide when moving to another map.
    var _mapSetup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        if (this._mapId !== mapId) { $.clear(); }
        _mapSetup.call(this, mapId);
    };

    //-------------------------------------------------------------------------
    // Sprite_NpVideoPortrait
    //-------------------------------------------------------------------------
    function Sprite_NpVideoPortrait() {
        this.initialize.apply(this, arguments);
    }
    $.Sprite = Sprite_NpVideoPortrait;

    Sprite_NpVideoPortrait.prototype = Object.create(PIXI.Container.prototype);
    Sprite_NpVideoPortrait.prototype.constructor = Sprite_NpVideoPortrait;

    Sprite_NpVideoPortrait.prototype.initialize = function() {
        PIXI.Container.call(this);
        this._serial = -1;
        this._video = null;
        this._baseTexture = null;
        this._videoSprite = null;
        this._maskSprite = null;
        this._fadeAlpha = 0;
        this.alpha = 0;
    };

    Sprite_NpVideoPortrait.prototype.update = function() {
        var s = $.state();
        if (!s) {
            if (this._video) { this.disposeVideo(false); }
            return;
        }
        if (s.serial !== this._serial || !this._video) {
            this.createVideo(s);
        }
        this.updateVideo(s);
        this.updateTransform2(s);
        this.updateFade(s);
    };

    Sprite_NpVideoPortrait.prototype.createVideo = function(s) {
        this.disposeVideo(false);
        this._serial = s.serial;
        var video = document.createElement('video');
        video.setAttribute('preload', 'auto');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.loop = !!s.loop;
        video.src = 'movies/' + s.name + $.fileExt();
        var self = this;
        // Until the saved position is restored, do not overwrite s.time with 0.
        this._seekPending = s.time > 0;
        video.addEventListener('seeked', function() { self._seekPending = false; });
        video.addEventListener('loadedmetadata', function() {
            if (s.time > 0 && s.time < video.duration) {
                try { video.currentTime = s.time; } catch (e) { self._seekPending = false; }
            } else {
                self._seekPending = false;
            }
            self.layout(s);
        });
        video.addEventListener('ended', function() {
            if (!video.loop) {
                var cur = $.state();
                if (cur && cur.serial === self._serial) { cur.ended = true; cur.time = 0; }
            }
        });
        video.addEventListener('error', function() {
            console.error('NP_VideoPortrait: cannot load ' + video.src);
            var cur = $.state();
            if (cur && cur.serial === self._serial) { cur.ended = true; cur.hiding = 1; }
        });
        this._video = video;

        var bt = new PIXI.VideoBaseTexture(video, PIXI.SCALE_MODES.LINEAR);
        bt.autoUpdate = false;   // we upload frames from our own update()
        bt.autoPlay = false;
        this._baseTexture = bt;
        // The real texture is attached once the first frame exists (see
        // updateVideo); a Texture made from a not-yet-loaded VideoBaseTexture
        // can stay invalid on PIXI 4.5.
        this._videoSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        this._videoTexture = null;
        this._videoSprite.anchor.set(0.5, 1);
        this.addChild(this._videoSprite);
        this.applyBlend(s);
        if (!s.ended) { this.play(); }
    };

    Sprite_NpVideoPortrait.prototype.play = function() {
        var video = this._video, self = this;
        if (!video) { return; }
        var p = video.play();
        if (p && p.catch) {
            p.catch(function(err) {
                if (self._video !== video || (err && err.name === 'AbortError')) { return; }
                // Autoplay with sound refused (plain browsers): retry muted.
                video.muted = true;
                var p2 = video.play();
                if (p2 && p2.catch) {
                    p2.catch(function() { self._playFailed = true; });
                }
            });
        }
    };

    Sprite_NpVideoPortrait.prototype.applyBlend = function(s) {
        var spr = this._videoSprite;
        if (!spr) { return; }
        if (this._maskSprite) {
            this.removeChild(this._maskSprite);
            spr.mask = null;
            this._maskSprite.destroy(); // feather canvas texture is shared/cached
            this._maskSprite = null;
        }
        if (s.blend === 'screen') {
            spr.blendMode = PIXI.BLEND_MODES.SCREEN;
        } else if (s.blend === 'add') {
            spr.blendMode = PIXI.BLEND_MODES.ADD;
        } else {
            spr.blendMode = PIXI.BLEND_MODES.NORMAL;
            if ($.feather > 0 && Graphics.isWebGL()) {
                this._maskSprite = new PIXI.Sprite(PIXI.Texture.fromCanvas($.featherCanvas()));
                this._maskSprite.anchor.set(0.5, 1);
                this.addChild(this._maskSprite);
                spr.mask = this._maskSprite;
            }
        }
        this._blend = s.blend;
    };

    // White rectangle whose alpha fades to 0 at the edges.
    $.featherCanvas = function() {
        if ($._featherCanvas) { return $._featherCanvas; }
        var w = 256, h = 256, f = Math.min(0.49, $.feather / 100);
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        var gx = ctx.createLinearGradient(0, 0, w, 0);
        gx.addColorStop(0, 'rgba(255,255,255,0)');
        gx.addColorStop(f, 'rgba(255,255,255,1)');
        gx.addColorStop(1 - f, 'rgba(255,255,255,1)');
        gx.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gx;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-in';
        var gy = ctx.createLinearGradient(0, 0, 0, h);
        gy.addColorStop(0, 'rgba(255,255,255,0)');
        gy.addColorStop(f * 0.6, 'rgba(255,255,255,1)');
        gy.addColorStop(1 - f * 0.4, 'rgba(255,255,255,1)');
        gy.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gy;
        ctx.fillRect(0, 0, w, h);
        $._featherCanvas = c;
        return c;
    };

    Sprite_NpVideoPortrait.prototype.layout = function(s) {
        var v = this._video;
        if (!v || !v.videoWidth) { return; }
        var w = v.videoWidth * s.scale, h = v.videoHeight * s.scale;
        // Set scale directly: the texture may not be valid yet, so width/height
        // setters (which divide by the texture size) are not safe here.
        this._videoSprite.scale.set(s.scale, s.scale);
        if (this._maskSprite) {
            this._maskSprite.scale.set(w / 256, h / 256);
        }
        this._layoutKey = [s.scale, v.videoWidth, v.videoHeight].join();
    };

    Sprite_NpVideoPortrait.prototype.updateTransform2 = function(s) {
        this.x = s.x;
        this.y = s.y;
        var v = this._video;
        if (v && v.videoWidth && this._layoutKey !== [s.scale, v.videoWidth, v.videoHeight].join()) {
            this.layout(s);
        }
        if (this._blend !== s.blend) { this.applyBlend(s); }
    };

    Sprite_NpVideoPortrait.prototype.updateVideo = function(s) {
        var v = this._video;
        if (!v) { return; }
        v.volume = Math.max(0, Math.min(1, (s.volume / 100) * $.volumeFactor()));
        if (v.loop !== !!s.loop) { v.loop = !!s.loop; }
        if (s.paused && !v.paused) { v.pause(); }
        if (!s.paused && v.paused && !s.ended && !this._playFailed) { this.play(); }
        if (!v.paused && !this._seekPending && v.readyState >= 2) { s.time = v.currentTime; }
        if (v.readyState >= 2 && this._baseTexture) {
            var bt = this._baseTexture;
            if (!bt.hasLoaded || bt.width !== v.videoWidth) {
                bt.hasLoaded = true;
                bt.width = v.videoWidth;
                bt.height = v.videoHeight;
            }
            if (!this._videoTexture && v.videoWidth && this._videoSprite) {
                this._videoTexture = new PIXI.Texture(bt);
                this._videoSprite.texture = this._videoTexture;
            }
            bt.update();
        }
    };

    Sprite_NpVideoPortrait.prototype.updateFade = function(s) {
        if (s.hiding > 0) {
            this.alpha = Math.max(0, this.alpha - 1 / s.hiding);
            if (this.alpha <= 0) {
                $.clear();
                this.disposeVideo(false);
            }
            return;
        }
        var ready = this._video && this._video.readyState >= 2;
        if (ready && this.alpha < 1) {
            this.alpha = Math.min(1, this.alpha + 1 / $.fade);
        }
    };

    // keepState=true: remember position for resuming after menu/battle.
    Sprite_NpVideoPortrait.prototype.disposeVideo = function(keepState) {
        var v = this._video;
        if (v) {
            var s = $.state();
            if (keepState && s && s.serial === this._serial && !v.paused) {
                s.time = v.currentTime;
            }
            try { v.pause(); } catch (e) {}
            v.removeAttribute('src');
            try { v.load(); } catch (e) {}
        }
        if (this._videoSprite) {
            this._videoSprite.mask = null;
            this.removeChild(this._videoSprite);
            this._videoSprite.destroy({ children: true });
        }
        if (this._videoTexture) {
            this._videoTexture.destroy(false);
        }
        if (this._baseTexture) {
            this._baseTexture.destroy();
        }
        if (this._maskSprite) {
            this.removeChild(this._maskSprite);
            this._maskSprite.destroy(); // feather canvas texture is shared/cached
        }
        this._video = null;
        this._baseTexture = null;
        this._videoSprite = null;
        this._maskSprite = null;
        this._serial = -1;
        this._layoutKey = null;
        this._videoTexture = null;
        this._playFailed = false;
        this.alpha = 0;
    };

    //-------------------------------------------------------------------------
    // Spriteset_Map: above pictures, below timer/flash and the window layer
    //-------------------------------------------------------------------------
    var _createUpperLayer = Spriteset_Map.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function() {
        _createUpperLayer.call(this);
        this._npVideoPortrait = new Sprite_NpVideoPortrait();
        var pc = this._pictureContainer;
        var idx = pc ? this.children.indexOf(pc) : -1;
        if (pc && idx >= 0) {
            this.addChildAt(this._npVideoPortrait, idx + 1);
        } else {
            this.addChild(this._npVideoPortrait);
        }
    };

    // Leaving the map scene (menu, battle, save, title...): stop the video
    // element so its sound does not keep playing; state stays for resume.
    var _mapTerminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        if (this._spriteset && this._spriteset._npVideoPortrait) {
            this._spriteset._npVideoPortrait.disposeVideo(true);
        }
        _mapTerminate.call(this);
    };

    // Returning to title / new game: drop the state.
    var _setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        _setupNewGame.call(this);
        $.clear();
    };

})(NP.VideoPortrait);
