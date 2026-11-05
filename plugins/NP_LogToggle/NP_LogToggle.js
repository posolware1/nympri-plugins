var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_LogToggle.js  (RU mod QoL)
//=============================================================================
/*:
 * @plugindesc [RU mod] Map log (MEO_Logwindow): auto-hide during dialogue + collapse tab / hotkey (L, D).
 * @author RU mod
 *
 * @param Hotkey
 * @type number
 * @desc keyCode of the collapse/expand key on the map (76 = L). 0 = none.
 * @default 76
 *
 * @param Take Over D
 * @type boolean
 * @desc The original D key (CE18) also collapses/expands the log, persistently.
 * @default true
 *
 * @param Restore Delay
 * @type number
 * @desc Frames without any message before the log comes back (bridges pauses between lines).
 * @default 24
 *
 * @help
 * The map log (bottom-left) is fully hidden while a message, choice, number
 * input or scrolling text is open (incl. H-scenes / cutscenes that show the
 * message box) and fades back in after it closes.
 * A small tab at the log corner collapses / expands it (click / touch),
 * same for the L key and the original D key. Collapsed: only the tab
 * «▲ Лог» with the number of new entries.
 * The state is saved in config. Options (category «Интерфейс»):
 *   «Свернуть лог»            npLogCollapsed (default OFF)
 *   «Прятать лог в диалогах»  npLogAutoHide  (default ON)
 * The game's own show_map_log_window / hide_map_log_window still work:
 * this plugin never changes window.visible (only alpha/renderable; visible is
 * flipped off just for the duration of WindowLayer rendering while hidden).
 * Custom battles run on Scene_Map: command-only choices keep the log visible.
 * Hover the log: wheel/trackpad or [ / ] scroll, Home/End jump to edges.
 * New lines keep the viewed history anchored; the bottom follows new entries.
 */
var NP_LogToggle = NP_LogToggle || {};
(function($) {
    'use strict';
    var P = PluginManager.parameters('NP_LogToggle');
    var HOTKEY = Number(P['Hotkey'] !== undefined ? P['Hotkey'] : 76);
    var TAKE_D = String(P['Take Over D'] || 'true') !== 'false';
    var DELAY = Number(P['Restore Delay'] || 24);
    var TAB_W = 118, TAB_H = 28;

    // ---------------- config ----------------
    ConfigManager.npLogCollapsed = false;
    ConfigManager.npLogAutoHide = true;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var c = _make.apply(this, arguments);
        c.npLogCollapsed = this.npLogCollapsed;
        c.npLogAutoHide = this.npLogAutoHide;
        return c;
    };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _apply.apply(this, arguments);
        this.npLogCollapsed = !!(c && c.npLogCollapsed === true);
        this.npLogAutoHide = !(c && c.npLogAutoHide === false);
    };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() {
        _addGen.apply(this, arguments);
        this.addCommand(NP_L('Свернуть лог', 'Collapse map log'), 'npLogCollapsed');
        this.addCommand(NP_L('Прятать лог в диалогах', 'Hide log in dialogue'), 'npLogAutoHide');
    };
    function registerCats() {
        if (window.NP_OptionsCategories && NP_OptionsCategories.register) {
            NP_OptionsCategories.register('npLogCollapsed', 'ui');
            NP_OptionsCategories.register('npLogAutoHide', 'ui');
        }
    }
    var _bootStart = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { registerCats(); _bootStart.apply(this, arguments); };

    // ---------------- unread counter ----------------
    $.unread = 0;
    $.addedLines = 0;
    $.clearVersion = 0;
    function hookAdd() {
        if (typeof $LogWindow === 'undefined' || !$LogWindow || $LogWindow._npLtHooked) return;
        var orig = $LogWindow.Add;
        $LogWindow.Add = function() {
            var before = this.History, count = before.length;
            var r = orig.apply(this, arguments);
            $.addedLines += Math.max(0, this.History.length - count +
                (this.History !== before ? Number(this.Sliced) || 0 : 0));
            if (ConfigManager.npLogCollapsed) $.unread++;
            return r;
        };
        var clear = $LogWindow.Clear;
        $LogWindow.Clear = function() {
            var r = clear.apply(this, arguments);
            $.clearVersion++; $.unread = 0;
            return r;
        };
        $LogWindow._npLtHooked = true;
    }

    $.collapsed = function() { return !!ConfigManager.npLogCollapsed; };
    $.setCollapsed = function(v) {
        v = !!v;
        if (ConfigManager.npLogCollapsed === v) return;
        ConfigManager.npLogCollapsed = v;
        if (!v) $.unread = 0;
        try { ConfigManager.save(); } catch (e) {}
    };
    $.toggle = function() {
        $.setCollapsed(!$.collapsed());
        try { SoundManager.playCursor(); } catch (e) {}
    };

    // message / choice / number / scroll text currently on screen?
    $.messageOpen = function() {
        // Combat commands and blank confirmation messages display their text in the log.
        var battle = typeof $gameSwitches !== 'undefined' && $gameSwitches && $gameSwitches.value(14);
        var s = SceneManager._scene;
        if (battle && $gameMessage &&
            (!$gameMessage.hasText() || !$gameMessage.allText().trim()) &&
            !$gameMessage.isNumberInput() && !$gameMessage.isItemChoice() &&
            !(s && s._scrollTextWindow && s._scrollTextWindow.visible)) return false;
        if ($gameMessage && ($gameMessage.isBusy() || $gameMessage.isChoice() || $gameMessage.isNumberInput() || $gameMessage.isItemChoice())) return true;
        if (s && s._messageWindow && s._messageWindow.openness > 0) return true;
        if (s && s._scrollTextWindow && s._scrollTextWindow.visible) return true;
        return false;
    };

    // ---------------- tab sprite ----------------
    function Sprite_NpLogTab() { this.initialize.apply(this, arguments); }
    Sprite_NpLogTab.prototype = Object.create(Sprite.prototype);
    Sprite_NpLogTab.prototype.constructor = Sprite_NpLogTab;
    Sprite_NpLogTab.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this, new Bitmap(TAB_W, TAB_H));
        this._key = '';
        this.alpha = 0;
    };
    Sprite_NpLogTab.prototype.redraw = function(collapsed, unread) {
        var label = (collapsed ? '▲ ' : '▼ ') + NP_L('Лог', 'Log');
        var key = label + '|' + unread + '|' + collapsed;
        if (key === this._key) return;
        this._key = key;
        var b = this.bitmap; b.clear();
        var ctx = b._context;
        ctx.save();
        var r = 6, w = TAB_W, h = TAB_H;
        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(12,10,20,0.78)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(214,186,120,0.85)'; ctx.stroke();
        ctx.restore();
        b._setDirty && b._setDirty();
        b.fontSize = 18; b.textColor = '#f3e6c4'; b.outlineWidth = 3; b.outlineColor = 'rgba(0,0,0,0.6)';
        b.drawText(label, 8, 0, 60, h, 'left');
        if (collapsed && unread > 0) {
            var t = unread > 99 ? '99+' : String(unread);
            var bw = 12 + t.length * 9, bx = w - bw - 22;
            ctx = b._context; ctx.save();
            ctx.beginPath(); ctx.arc(bx + 9, h / 2, 9, Math.PI / 2, Math.PI * 1.5);
            ctx.arc(bx + bw - 9, h / 2, 9, Math.PI * 1.5, Math.PI / 2); ctx.closePath();
            ctx.fillStyle = '#c0392b'; ctx.fill(); ctx.restore(); b._setDirty && b._setDirty();
            b.fontSize = 15; b.textColor = '#ffffff'; b.outlineWidth = 0;
            b.drawText(t, bx, 0, bw, h, 'center');
        }
        b.fontSize = 13; b.textColor = 'rgba(243,230,196,0.6)'; b.outlineWidth = 0;
        b.drawText('L', w - 16, 0, 12, h, 'center');
    };

    // ---------------- Scene_Map ----------------
    function logWin() { return (typeof $LogWindow_CurrentWindow !== 'undefined') ? $LogWindow_CurrentWindow : null; }

    // MV updates TouchInput.x/y on mouse movement only with a button held.
    var pointer = null;
    ['_onMouseMove', '_onWheel'].forEach(function(name) {
        var original = TouchInput[name];
        TouchInput[name] = function(event) {
            pointer = { x: Graphics.pageToCanvasX(event.pageX), y: Graphics.pageToCanvasY(event.pageY) };
            return original.apply(this, arguments);
        };
    });

    $.qteOpen = function() {
        return !!((window.NP_PowerStrike && NP_PowerStrike._qte) ||
            (window.NP_SuperAttack && NP_SuperAttack._qte));
    };
    $.scrollLimit = function(w) {
        return Math.max(0, $LogWindow.History.length - Math.max(1, Math.floor(w.ContentsHeight / w._npLogLineHeight)));
    };
    $.scroll = function(w, delta) {
        w._npLogOffset = Math.max(0, Math.min($.scrollLimit(w), (w._npLogOffset || 0) + delta));
        w._npLogDirty = true;
    };
    $.installScroll = function(w) {
        if (w._npLogScroll) return;
        w._npLogScroll = true; w._npLogOffset = 0;
        w._npLogAdded = $.addedLines; w._npLogClear = $.clearVersion;
        var params = PluginManager.parameters('MEO_Logwindow');
        w._npLogLineHeight = w.standardFontSize() + Number(params.Margin || 0);
        w._npLogDirty = true;
        // The original update always animates to the bottom, including while reading history.
        w.update = function() {
            var lines = $.addedLines - this._npLogAdded;
            if (this._npLogClear !== $.clearVersion) this._npLogOffset = 0;
            else if (this._npLogOffset > 0 && lines > 0) this._npLogOffset += lines;
            this._npLogOffset = Math.min(this._npLogOffset, $.scrollLimit(this));
            if (lines || this._npLogDirty || this._npLogClear !== $.clearVersion) {
                this.drawHistory(0, this._npLogOffset * this._npLogLineHeight, this._npLogLineHeight);
            }
            this._npLogAdded = $.addedLines; this._npLogClear = $.clearVersion;
            this._npLogDirty = false; this.Animate = false;
        };
    };

    var _cdo = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _cdo.apply(this, arguments);
        hookAdd();
        var w = logWin();
        if (!w) return;
        $.installScroll(w);
        this._npLogWin = w;
        this._npLogTab = new Sprite_NpLogTab();
        // on top of the log, under the message window
        var idx = this._windowLayer ? this.children.indexOf(this._windowLayer) : -1;
        if (idx >= 0) this.addChildAt(this._npLogTab, idx + 1); else this.addChild(this._npLogTab);
        this._npLogQuiet = DELAY; // start as if no message
        var hide = this.npLogTargetHidden();
        w.alpha = hide ? 0 : 1; w.renderable = !hide;
        this.npLogPlaceTab(true);
    };

    Scene_Map.prototype.npLogTargetHidden = function() {
        return $.collapsed() || $.qteOpen() || (ConfigManager.npLogAutoHide && (this._npLogQuiet || 0) < DELAY);
    };
    Scene_Map.prototype.npLogTabRect = function() {
        var w = this._npLogWin;
        if (!w) return null;
        if ($.collapsed()) return { x: w.x, y: w.y + w.height - TAB_H, w: TAB_W, h: TAB_H };
        return { x: w.x + w.width - TAB_W, y: w.y - TAB_H, w: TAB_W, h: TAB_H };
    };
    Scene_Map.prototype.npLogPlaceTab = function(instant) {
        var t = this._npLogTab, r = this.npLogTabRect();
        if (!t || !r) return;
        t.x = r.x; t.y = r.y;
        t.redraw($.collapsed(), $.unread);
        var w = this._npLogWin;
        var msg = ConfigManager.npLogAutoHide && (this._npLogQuiet || 0) < DELAY;
        // tab shows unless a dialogue is open, or the game itself hid an expanded log
        var show = !msg && !$.qteOpen() && (w.visible || ($.collapsed() && !$gameMap.isEventRunning()));
        var target = show ? 1 : 0;
        t.alpha = instant ? target : t.alpha + (target - t.alpha) * 0.25;
        if (Math.abs(t.alpha - target) < 0.02) t.alpha = target;
        t.visible = t.alpha > 0;
    };
    Scene_Map.prototype.npLogTabHit = function() {
        var t = this._npLogTab, r = this.npLogTabRect();
        if (!t || !r || !t.visible || t.alpha < 0.5) return false;
        var x = TouchInput.x, y = TouchInput.y;
        return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    };

    var _upd = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        this.npLogUpdateInput();
        _upd.apply(this, arguments);
        this.npLogUpdate();
    };
    Scene_Map.prototype.npLogUpdateInput = function() {
        if (!this._npLogWin) return;
        var w = this._npLogWin, p = !TouchInput.isPressed() && pointer ? pointer : TouchInput;
        var x = p.x, y = p.y;
        var hover = x >= w.x && x < w.x + w.width && y >= w.y && y < w.y + w.height;
        var other = this._windowLayer && this._windowLayer.children.some(function(a) {
            return a !== w && a.active && a.visible && a.openness > 0 &&
                x >= a.x && x < a.x + a.width && y >= a.y && y < a.y + a.height;
        });
        var modal = this._npEnemyHud && this._npEnemyHud._expanded;
        if (hover && w.visible && w.renderable && !$.collapsed() && !$.messageOpen() &&
            !$.qteOpen() && !other && !modal && !SceneManager.isSceneChanging()) {
            this._npLogWheel = (this._npLogWheel || 0) + TouchInput.wheelY;
            var steps = this._npLogWheel < 0 ? Math.ceil(this._npLogWheel / 30) : Math.floor(this._npLogWheel / 30);
            if (steps) { $.scroll(w, -steps); this._npLogWheel -= steps * 30; }
            if (Input.isRepeated('npLogOlder')) $.scroll(w, 1);
            if (Input.isRepeated('npLogNewer')) $.scroll(w, -1);
            if (Input.isTriggered('npLogFirst')) $.scroll(w, $.scrollLimit(w));
            if (Input.isTriggered('npLogLast')) $.scroll(w, -$.scrollLimit(w));
        } else this._npLogWheel = 0;
        if (TouchInput.isTriggered() && this.npLogTabHit()) {
            this._npLogTouchGuard = true;
            $.toggle();
        }
        if (this._npLogTouchGuard && !TouchInput.isPressed()) this._npLogTouchGuard = false;
        if (HOTKEY && Input.isTriggered('npLogToggle') && !SceneManager.isSceneChanging()) $.toggle();
    };
    Scene_Map.prototype.npLogUpdate = function() {
        var w = this._npLogWin;
        if (!w) return;
        if ($.messageOpen()) this._npLogQuiet = 0;
        else if (this._npLogQuiet < DELAY) this._npLogQuiet++;
        var target = this.npLogTargetHidden() ? 0 : 1;
        if (target === 0 && this._npLogQuiet === 0) w.alpha = 0; // dialogue: hide at once
        else w.alpha += (target - w.alpha) * 0.2;
        if (Math.abs(w.alpha - target) < 0.02) w.alpha = target;
        w.renderable = w.alpha > 0;
        this.npLogPlaceTab(false);
    };

    // no walking when the tab is clicked
    var _pmt = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function() {
        if (this._npLogTouchGuard) return;
        _pmt.apply(this, arguments);
    };

    // leaving the map: the window object is shared, make sure it is not left invisible elsewhere
    // WindowLayer clears (canvas) / masks (WebGL) the rect of every window that is
    // visible with openness > 0, even when it is not renderable. A hidden log would
    // therefore punch a black hole into the message window. While the log is hidden
    // by us, make it invisible to the WindowLayer for the duration of its render only.
    function wrapLayerRender(name) {
        var orig = WindowLayer.prototype[name];
        if (!orig) return;
        WindowLayer.prototype[name] = function(renderer) {
            var w = logWin();
            var off = w && w.parent === this && w.visible && !w.renderable;
            if (off) w.visible = false;
            try { orig.call(this, renderer); }
            finally { if (off) w.visible = true; }
        };
    }
    wrapLayerRender('renderCanvas');
    wrapLayerRender('renderWebGL');

    var _term = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        _term.apply(this, arguments);
        this._npLogTouchGuard = false;
    };

    // hotkey
    if (HOTKEY && !Input.keyMapper[HOTKEY]) Input.keyMapper[HOTKEY] = 'npLogToggle';
    else if (HOTKEY) console.warn('[NP_LogToggle] key ' + HOTKEY + ' already mapped to ' + Input.keyMapper[HOTKEY] + ' — hotkey off');
    [[219, 'npLogOlder'], [221, 'npLogNewer'], [36, 'npLogFirst'], [35, 'npLogLast']].forEach(function(pair) {
        if (!Input.keyMapper[pair[0]]) Input.keyMapper[pair[0]] = pair[1];
    });

    // original D key → CE18 (toggles window.visible, undone by the next event): route to the persistent toggle
    if (TAKE_D) {
        var _rce = Game_Temp.prototype.reserveCommonEvent;
        Game_Temp.prototype.reserveCommonEvent = function(id) {
            if (id === 18 && SceneManager._scene instanceof Scene_Map && Input.isTriggered('commonKeyD')) {
                var w = logWin();
                if (w && !w.visible) { w.show(); $.setCollapsed(false); try { SoundManager.playCursor(); } catch (e) {} }
                else $.toggle();
                return;
            }
            return _rce.apply(this, arguments);
        };
    }
    $.TAB_W = TAB_W; $.TAB_H = TAB_H; $.DELAY = DELAY;
})(NP_LogToggle);
