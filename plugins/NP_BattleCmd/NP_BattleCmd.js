//=============================================================================
// NP_BattleCmd.js  —  новое меню команд в бою (Nymphomania Priestess RU)
//=============================================================================
/*:
 * @plugindesc v0.1 (прототип) Меню команд боя: 2 колонки «иконка + подпись»,
 * золотое выделение в стиле NP_BattleHUD, строка-подсказка, серые недоступные,
 * золотой «Супер-удар» когда готов. Опция «Новое меню команд» (Интерфейс).
 * @author NP RU mod
 *
 * @help
 * Работает только с выбором команд боя (общие события 365/366: в списке есть
 * \i[147], включён S14). Остальные выборы не трогаются. Список команд,
 * условия en()/if() и ветки событий не меняются — только вид окна.
 * Ставить ПОСЛЕ MPP_ChoiceEX, MNKR_ChoiceCols, NP_PowerStrike, NP_BattleQoL,
 * NP_SuperAttack, NP_BattleHUD; ПЕРЕД NP_OptionsCategories.
 */
var NP_BattleCmd = (function() {
    'use strict';
    var $ = {}; $.version = '0.1';
    var L = function(ru, en) { return (typeof window.NP_L === 'function') ? window.NP_L(ru, en) : ru; };
    var P = { text: '#ffffff', label: '#dcbc7c', highlight: '#ffe08a', muted: '#bdb3a5', ash: '#7d756b', gold: '#ffd25a' };
    $.ICON_SUPER = (typeof NP_SuperAttack !== 'undefined' && NP_SuperAttack.ICON) || 143;
    $.ICON_POWER = 131; $.ICON_AUTO = 38;
    try { if (typeof NP_PowerStrike !== 'undefined' && NP_PowerStrike.P && NP_PowerStrike.P.icon) $.ICON_POWER = NP_PowerStrike.P.icon; } catch (e) {}
    $.COLS = 2; $.ITEM_H = 44; $.W = 430; $.HINT_H = 46; $.PAD = 12; $.FONT = 21;
    // ------------------------------------------------------------- команды
    function sa() { return (typeof NP_SuperAttack !== 'undefined') ? NP_SuperAttack : null; }
    function curA() { try { return sa() ? sa().curActor() : $gameVariables.value(270); } catch (e) { return 0; } }
    $.DEF = {
        147: { n: function() { return L('Атака', 'Attack'); }, h: function() { return L('Обычный удар оружием по врагу.', 'A normal weapon strike.'); } },
        131: { n: function() { return L('Усиленный удар', 'Power Strike'); }, h: function() { return L('Удар с QTE: успей нажать на круги — урон выше.', 'QTE strike: hit the circles for more damage.'); } },
        143: { n: function() {
                try { var s = sa(), k = s && s.KIND && s.KIND[curA()]; if (k && s.NAMES && s.NAMES[k]) return s.NAMES[k](); } catch (e) {}
                return L('Супер-удар', 'Super'); }, h: function(en) {
                var s = sa(), a = curA();
                if (en) return L('Супер-удар: заряд полон! Мощный приём с QTE.', 'Super: fully charged! A powerful QTE move.');
                var r = s && s.reason ? s.reason(a) : null;
                return L('Супер-удар пока недоступен', 'Super not available yet') + (r && r !== 'none' ? ': ' + r : '') + '.';
            } },
        8:   { n: function() { return L('Навыки', 'Skills'); }, h: function() { return L('Активные навыки и магия за ману.', 'Active skills and magic (costs MP).'); } },
        260: { n: function() { return L('Предметы', 'Items'); }, h: function() { return L('Зелья и вещи, доступные в бою.', 'Potions and battle items.'); } },
        506: { n: function() { return L('Защита', 'Guard'); }, h: function(en) { return en ? L('Закрыться щитом: меньше урона до своего хода.', 'Raise the shield: less damage until next turn.') : L('Нужен щит во второй руке.', 'Needs a shield in the off hand.'); } },
        4:   { n: function() { return L('Пропуск хода', 'Wait'); }, h: function() { return L('Ничего не делать и перевести дух.', 'Do nothing and catch a breath.'); } },
        38:  { n: function() { return L('Автобой', 'Auto battle'); }, h: function() { return L('Атаковать автоматически каждый ход. Esc — отмена.', 'Attack automatically every turn. Esc cancels.'); } },
        121: { n: function() { return L('Бегство', 'Escape'); }, h: function(en) { return en ? L('Попытаться сбежать из боя.', 'Try to flee the battle.') : L('Из этого боя не сбежать.', 'You cannot flee this battle.'); } },
        11:  { n: function() { return L('Вырваться', 'Struggle'); }, h: function() { return L('Попытаться вырваться из захвата.', 'Try to break free.'); } }
    };
    $.TEXT = { 'カットイン切り替え': [function() { return L('Сменить кат-ин', 'Switch cut-in'); }, function() { return L('Переключить картинку кат-ина.', 'Switch the cut-in picture.'); }] };
    $.parse = function(raw) {
        var s = String(raw || ''), m = /\\i\[(\d+)\]/i.exec(s), icon = m ? Number(m[1]) : 0;
        var rest = s.replace(/\\i\[\d+\]/ig, '').replace(/\\[a-z]+\[[^\]]*\]/ig, '').trim();
        return { icon: icon, rest: rest };
    };
    $.info = function(raw, enabled) {
        var p = $.parse(raw), d = $.DEF[p.icon], t = $.TEXT[p.rest];
        var name = d ? d.n() : t ? t[0]() : (p.rest || '');
        if (!name && p.icon && typeof NP_PowerStrike !== 'undefined' && NP_PowerStrike.labelFor) { try { name = NP_PowerStrike.labelFor('\\i[' + p.icon + ']') || ''; } catch (e) {} }
        var hint = d ? d.h(enabled) : t ? t[1]() : '';
        if (!enabled && !hint) hint = L('Сейчас недоступно.', 'Unavailable right now.');
        else if (!enabled && d && (p.icon === 147 || p.icon === 131 || p.icon === 8 || p.icon === 260)) hint = L('Сейчас недоступно: ', 'Unavailable now: ') + hint.charAt(0).toLowerCase() + hint.slice(1);
        return { icon: p.icon, name: name || '?', hint: hint, sup: p.icon === $.ICON_SUPER };
    };
    // ------------------------------------------------------------- опция
    ConfigManager.npBattleCmd = true;
    var _mk = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _mk.apply(this, arguments); c.npBattleCmd = this.npBattleCmd; return c; };
    var _ap = ConfigManager.applyData;
    ConfigManager.applyData = function(c) { _ap.apply(this, arguments); this.npBattleCmd = (c && c.npBattleCmd !== undefined) ? !!c.npBattleCmd : true; };
    if (typeof Window_Options !== 'undefined') {
        var _addGen = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addGen.apply(this, arguments);
            this.addCommand(L('Новое меню команд', 'New command menu'), 'npBattleCmd');
            try { if (window.NP_OptionsCategories && NP_OptionsCategories.register) NP_OptionsCategories.register('npBattleCmd', 'ui'); } catch (e) {}
        };
    }
    $.enabled = function() { return ConfigManager.npBattleCmd !== false; };
    $.isCmdList = function() {
        if (!$.enabled() || !$gameSwitches || !$gameSwitches.value(14) || !$gameMessage) return false;
        var ch = $gameMessage.choices() || [];
        return ch.length >= 2 && ch.some(function(c) { return /^\s*\\i\[147\]/i.test(String(c)); });
    };
    // нижняя граница окна: над карточками NP_BattleHUD (или над старыми окнами)
    $.bottom = function() {
        var H = Graphics.height;
        try {
            if (typeof NP_BattleHUD !== 'undefined' && NP_BattleHUD.enabled && NP_BattleHUD.enabled()) return H - NP_BattleHUD.MARGIN - NP_BattleHUD.H - 4 - 4;
        } catch (e) {}
        return H - 222;   // оригинальные окна MEO (~ y 742)
    };
    // ------------------------------------------------------------- окно
    function rr(ctx, x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    function dirty(b) { if (b._setDirty) b._setDirty(); else if (b._baseTexture) b._baseTexture.update(); }
    var W = Window_ChoiceList.prototype;
    var _start = W.start;
    W.start = function() { this._npCmd = $.isCmdList(); this._npIdx = -2; this.npApplySkin(); _start.apply(this, arguments); };
    W.npApplySkin = function() {
        if (this._npCmd) { this._npSaveOp = this._npSaveOp !== undefined ? this._npSaveOp : this.opacity; this.opacity = 0; this.backOpacity = 0; }
        else if (this._npSaveOp !== undefined) { this.opacity = this._npSaveOp; this._npSaveOp = undefined; }
        if (this._npBg) this._npBg.visible = !!this._npCmd;
    };
    var _updBg = W.updateBackground;
    W.updateBackground = function() { _updBg.apply(this, arguments); if (this._npCmd) { this.opacity = 0; this.backOpacity = 0; } };
    var _maxCols = W.maxCols; W.maxCols = function() { return this._npCmd ? $.COLS : _maxCols.apply(this, arguments); };
    var _itemH = W.itemHeight; W.itemHeight = function() { return this._npCmd ? $.ITEM_H : _itemH.apply(this, arguments); };
    var _spacing = W.spacing; W.spacing = function() { return this._npCmd ? 8 : _spacing.apply(this, arguments); };
    var _pad = W.standardPadding; W.standardPadding = function() { return this._npCmd ? $.PAD : _pad.apply(this, arguments); };
    W.npRows = function() { return Math.ceil(($gameMessage.choices() || []).length / $.COLS); };
    var _ww = W.windowWidth; W.windowWidth = function() { return this._npCmd ? $.W : _ww.apply(this, arguments); };
    var _wh = W.windowHeight; W.windowHeight = function() { return this._npCmd ? this.npRows() * $.ITEM_H + $.HINT_H + $.PAD * 2 : _wh.apply(this, arguments); };
    var _maxPage = W.maxPageRows; W.maxPageRows = function() { return this._npCmd ? Math.max(1, this.npRows()) : _maxPage.apply(this, arguments); };
    var _cH = W.contentsHeight; W.contentsHeight = function() { return this._npCmd ? this.height - $.PAD * 2 : _cH.apply(this, arguments); };
    var _place = W.updatePlacement;
    W.updatePlacement = function() {
        this.padding = this.standardPadding();
        _place.apply(this, arguments);
        if (!this._npCmd) return;
        this.width = this.windowWidth(); this.height = this.windowHeight();
        this.x = Graphics.width - this.width - 6;
        this.y = Math.max(160, $.bottom() - this.height);
        this.npDrawBg();
    };
    W.npDrawBg = function() {
        if (!this._npBg) { this._npBg = new Sprite(); this.addChildAt(this._npBg, 0); }
        var w = this.width, h = this.height;
        if (!this._npBg.bitmap || this._npBg.bitmap.width !== w || this._npBg.bitmap.height !== h) this._npBg.bitmap = new Bitmap(w, h);
        var b = this._npBg.bitmap, ctx = b._context; b.clear();
        ctx.save(); rr(ctx, 1, 1, w - 2, h - 2, 10);
        var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(42,30,26,0.94)'); g.addColorStop(1, 'rgba(16,11,10,0.94)');
        ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(220,188,124,0.55)'; ctx.stroke();
        // разделитель над подсказкой
        var hy = h - $.PAD - $.HINT_H + 4;
        ctx.beginPath(); ctx.moveTo(14, hy); ctx.lineTo(w - 14, hy); ctx.strokeStyle = 'rgba(220,188,124,0.30)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore(); dirty(b); this._npBg.visible = true;
    };
    var _updCursor = W.updateCursor;
    W.updateCursor = function() { if (this._npCmd) { this.setCursorRect(0, 0, 0, 0); return; } _updCursor.apply(this, arguments); };
    var _update = W.update;
    W.update = function() {
        _update.apply(this, arguments);
        if (this._npCmd) {
            if (this._npIdx !== this.index()) { this._npIdx = this.index(); this.npRedraw(); }
            if (this._npLabel) this._npLabel.visible = false;   // подпись NP_PowerStrike слева не нужна
            this._npTick = (this._npTick || 0) + 1;
            if (this._npSupRect && this._npGlow) this._npGlow.opacity = 120 + Math.round(100 * Math.sin(this._npTick / 12));
        }
        if (this._npBg) this._npBg.visible = !!this._npCmd && this.isOpen();
    };
    W.npRedraw = function() { if (this.contents) { this.contents.clear(); this.drawAllItems(); } };
    var _drawAll = W.drawAllItems;
    W.drawAllItems = function() {
        this._npSupRect = null;
        _drawAll.apply(this, arguments);
        if (!this._npCmd) return;
        // подсказка
        var i = this.index(), b = this.contents;
        if (i >= 0 && i < this.maxItems()) {
            var inf = $.info(this.commandName(i), this.isCommandEnabled(i));
            var y = b.height - $.HINT_H + 6;
            b.fontSize = 17; b.fontItalic = false; b.outlineWidth = 3; b.outlineColor = 'rgba(0,0,0,0.9)';
            b.textColor = this.isCommandEnabled(i) ? P.muted : P.ash;
            this.npWrap(b, inf.hint, 6, y, b.width - 12, 22, 2);
        }
        this.npGlow();
    };
    W.npWrap = function(b, s, x, y, w, lh, maxL) {
        var words = String(s).split(' '), line = '', n = 0;
        for (var k = 0; k < words.length; k++) {
            var t = line ? line + ' ' + words[k] : words[k];
            if (line && b.measureTextWidth(t) > w) { b.drawText(line, x, y + n * lh, w, lh); n++; line = words[k]; if (n >= maxL) return; }
            else line = t;
        }
        if (line && n < maxL) b.drawText(line, x, y + n * lh, w, lh);
    };
    // пульсирующая золотая рамка у готового супер-удара
    W.npGlow = function() {
        if (!this._npGlow) { this._npGlow = new Sprite(); this._npGlow.blendMode = Graphics.BLEND_ADD; this.addChild(this._npGlow); }
        var r = this._npSupRect; this._npGlow.visible = !!r && this._npCmd;
        if (!r) return;
        var w = r.width + 8, h = r.height + 8;
        if (!this._npGlow.bitmap || this._npGlow.bitmap.width !== w) {
            this._npGlow.bitmap = new Bitmap(w, h); var c = this._npGlow.bitmap._context;
            c.save(); rr(c, 3, 3, w - 6, h - 6, 8); c.lineWidth = 3; c.strokeStyle = P.gold; c.shadowColor = P.gold; c.shadowBlur = 8; c.stroke(); c.restore(); dirty(this._npGlow.bitmap);
        }
        this._npGlow.x = this.padding + r.x - 4; this._npGlow.y = this.padding + r.y - 4 - this._scrollY;
    };
    var _drawItem = W.drawItem;
    W.drawItem = function(index) {
        if (!this._npCmd) return _drawItem.apply(this, arguments);
        var r = this.itemRect(index), b = this.contents, ctx = b._context;
        var en = this.isCommandEnabled(index), sel = index === this.index() && this.active, inf = $.info(this.commandName(index), en);
        var supReady = inf.sup && en;
        this.changePaintOpacity(true);
        ctx.save(); rr(ctx, r.x + 1, r.y + 2, r.width - 2, r.height - 4, 7);
        if (sel) {
            var g = ctx.createLinearGradient(0, r.y, 0, r.y + r.height);
            g.addColorStop(0, en ? 'rgba(120,88,40,0.85)' : 'rgba(70,64,58,0.8)'); g.addColorStop(1, en ? 'rgba(60,40,18,0.85)' : 'rgba(40,36,32,0.8)');
            ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = en ? P.highlight : P.muted; ctx.stroke();
        } else {
            ctx.fillStyle = supReady ? 'rgba(90,66,20,0.55)' : 'rgba(0,0,0,0.30)'; ctx.fill();
            ctx.lineWidth = 1; ctx.strokeStyle = supReady ? 'rgba(255,210,90,0.8)' : 'rgba(220,188,124,0.18)'; ctx.stroke();
        }
        ctx.restore(); dirty(b);
        if (sel) { ctx.save(); ctx.fillStyle = en ? P.highlight : P.muted; ctx.fillRect(r.x + 4, r.y + 9, 3, r.height - 18); ctx.restore(); dirty(b); }
        var iy = r.y + Math.floor((r.height - Window_Base._iconHeight) / 2);
        if (inf.icon) { this.changePaintOpacity(en); this.drawIcon(inf.icon, r.x + 11, iy); this.changePaintOpacity(true); }
        b.fontSize = $.FONT; b.fontItalic = false; b.outlineWidth = 3; b.outlineColor = 'rgba(0,0,0,0.9)';
        b.textColor = !en ? P.ash : supReady ? P.gold : sel ? P.highlight : P.text;
        b.fontBold = sel || supReady;
        var tx = r.x + 11 + (inf.icon ? Window_Base._iconWidth + 8 : 0);
        b.drawText(inf.name, tx, r.y, r.x + r.width - tx - 6, r.height, 'left');
        b.fontBold = false;
        if (supReady) this._npSupRect = r;
    };
    // перестроить открытое окно (смена опции на лету / тест)
    $.restyle = function(win) {
        win = win || (SceneManager._scene && SceneManager._scene._messageWindow && SceneManager._scene._messageWindow._choiceWindow);
        if (!win || !win.isOpen() || !$gameMessage.isChoice()) return false;
        var i = win.index(); win._npCmd = $.isCmdList(); win._npIdx = -2; win.npApplySkin(); win.updatePlacement(); win.refresh(); win.select(i);
        if (!win._npCmd && win._npLabel) win._npLabel.visible = true;
        if (!win._npCmd && win._npGlow) win._npGlow.visible = false;
        return win._npCmd;
    };
    var _close = W.close;
    W.close = function() { _close.apply(this, arguments); if (this._npGlow) this._npGlow.visible = false; };
    return $;
})();
