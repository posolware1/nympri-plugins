var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_ShopCompare.js  (RU mod QoL)
//=============================================================================
/*:
 * @plugindesc [RU mod] Shop: stat deltas (▲/▼/=) vs current gear for each party member.
 * @author RU mod
 *
 * @param Enabled
 * @desc Default value of the option.
 * @default true
 *
 * @help
 * Extends KNS_EquipParameter's Window_ShopStatus (buy screen, equipment):
 * for every party member who can equip the item, each row shows the new value
 * and the change versus what the member wears now:
 *   cur → new (+diff), diff green if better, red if worse;
 *   if the column is too narrow: new (+diff); unchanged rows are dimmed.
 * Dice values (1d3 etc.) are compared by their average (NdM -> N*(M+1)/2).
 * FAT / REQ are "lower is better" (as in KNS).
 * Only drawing is changed; the equipment is restored right after measuring,
 * buying/selling logic of YEP/DreamX/FTKR/etc. is untouched.
 * Option: «Сравнение в лавке» / "Shop comparison" (off = original KNS view).
 */
var NP_ShopCompare = NP_ShopCompare || {};
(function() {
    'use strict';
    if (typeof KNS_EquipParameter === 'undefined' ||
        !Window_ShopStatus.prototype.knsDrawActorParamChanges) {
        console.warn('[NP_ShopCompare] KNS_EquipParameter not found — disabled');
        return;
    }
    var params = PluginManager.parameters('NP_ShopCompare');
    var DEF = String(params['Enabled'] || 'true') !== 'false';

    // ---- option ------------------------------------------------------------
    ConfigManager.npShopCompare = DEF;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var c = _make.apply(this, arguments);
        c.npShopCompare = this.npShopCompare;
        return c;
    };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _apply.apply(this, arguments);
        this.npShopCompare = (c && c.npShopCompare !== undefined) ? !!c.npShopCompare : DEF;
    };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() {
        _addGen.apply(this, arguments);
        this.addCommand(NP_L('Сравнение в лавке', 'Shop comparison'), 'npShopCompare');
    };

    // ---- values ------------------------------------------------------------
    var KEP = KNS_EquipParameter;
    function avgOf(arr) {
        return (arr || []).reduce(function(r, s) {
            var p = String(s).split('d');
            var n = Number(p[0]) || 0, m = Number(p[1]) || 0;
            return r + (m ? n * (m + 1) / 2 : n);
        }, 0);
    }
    // [{v: comparable number (higher = better), s: display string}]
    NP_ShopCompare.snapshot = function(actor) {
        var out = [];
        for (var i = 0; i < 6; i++) out.push({ v: actor.param(i), s: String(actor.param(i)) });
        KEP.specialParams.forEach(function(key) {
            var data = actor.knsGetSpecialParameterData(key);
            var v = avgOf(data);
            if (KEP.oppositeColorParams.contains(key)) v = -v;
            var s;
            if (!data.length) s = '0';
            else if (KEP.diceParams.contains(key)) s = data.join('+');
            else s = String(data.reduce(function(r, p) { return r + Math.floor(p); }, 0));
            out.push({ v: v, s: s });
        });
        return out;
    };
    // raw: signed change of the shown value (dice -> by average);
    // good: >0 better, <0 worse (FAT / REQ: lower is better)
    NP_ShopCompare.measure = function(actor, item) {
        var oldP = NP_ShopCompare.snapshot(actor), newP = oldP;
        if (item) {
            var index = actor.equipSlots().indexOf(item.etypeId);
            if (index !== -1 && actor._equips[index]) {
                var obj = actor._equips[index].object();
                actor._equips[index].setObject(item);
                try { newP = NP_ShopCompare.snapshot(actor); }
                finally { actor._equips[index].setObject(obj); }
            }
        }
        var nBase = 6;
        return oldP.map(function(o, i) {
            var good = Math.round((newP[i].v - o.v) * 10) / 10;
            var opp = i >= nBase && KEP.oppositeColorParams.contains(KEP.specialParams[i - nBase]);
            return { cur: o.s, s: newP[i].s, d: good, raw: opp ? -good : good };
        });
    };
    function num(a) { return a % 1 ? a.toFixed(1) : String(a); }
    NP_ShopCompare.diffText = function(raw) {
        if (!raw) return '';
        return '(' + (raw > 0 ? '+' : '\u2212') + num(Math.abs(raw)) + ')';
    };
    NP_ShopCompare.deltaText = function(d) { // kept for compatibility
        if (!d) return '=';
        return (d > 0 ? '▲' : '▼') + num(Math.abs(d));
    };

    // ---- layout ------------------------------------------------------------
    // Label column sized to the longest label; actor columns share the rest.
    var _origInfo = Window_ShopStatus.prototype.drawEquipInfo;
    Window_ShopStatus.prototype.drawEquipInfo = function(x, y) {
        if (!ConfigManager.npShopCompare) return _origInfo.apply(this, arguments);
        var labels = [];
        for (var i = 0; i < 6; i++) labels.push(TextManager.param(i));
        KEP.specialParams.forEach(function(k) { labels.push(KEP.getStatusName(k)); });
        var lw = 0;
        labels.forEach(function(t) { lw = Math.max(lw, this.textWidth(t)); }, this);
        lw = Math.min(lw + 10, Math.floor((this.contents.width - x) * 0.45));
        var lh = this.lineHeight(), y2 = y + lh * 2;
        this.changeTextColor(this.systemColor());
        labels.forEach(function(t) { this.drawText(t, x, y2, lw); y2 += lh; }, this);
        this.resetTextColor();
        var members = this.statusMembers();
        var n = Math.max(1, members.length);
        var cw = Math.floor((this.contents.width - x - lw) / n);
        for (var j = 0; j < members.length; j++) {
            this.knsDrawActorEquipInfo(members[j], x + lw + cw * j, y, cw - 6);
        }
    };

    var _origActor = Window_ShopStatus.prototype.knsDrawActorEquipInfo;
    Window_ShopStatus.prototype.knsDrawActorEquipInfo = function(actor, x, y, width) {
        _origActor.apply(this, arguments);
        if (ConfigManager.npShopCompare && this._item && !actor.canEquip(this._item)) {
            var fs = this.contents.fontSize;
            this.contents.fontSize = Math.max(16, fs - 6);
            this.changeTextColor(this.textColor(7));
            this.changePaintOpacity(false);
            this.drawText(NP_L('не может надеть', "can't equip"), x, y + this.lineHeight() * 2, width, 'right');
            this.changePaintOpacity(true);
            this.contents.fontSize = fs;
            this.resetTextColor();
        }
    };

    // ---- drawing -----------------------------------------------------------
    // Changed stat:   cur → new (±diff)   cur/arrow grey, new + diff green/red.
    // Too narrow:     new (±diff)          (current dropped), then smaller font.
    // Unchanged stat: value, dimmed, no arrow.
    var ARROW = ' \u2192 ';
    var _orig = Window_ShopStatus.prototype.knsDrawActorParamChanges;
    Window_ShopStatus.prototype.knsDrawActorParamChanges = function(actor, x, y, width) {
        if (!ConfigManager.npShopCompare) return _orig.apply(this, arguments);
        var rows = NP_ShopCompare.measure(actor, this._item);
        var fs0 = this.contents.fontSize, self = this;
        var gap = 6;
        function widths() {
            var w = { cur: 0, nw: 0, df: 0, ar: self.textWidth(ARROW), any: false };
            rows.forEach(function(r) {
                w.nw = Math.max(w.nw, self.textWidth(r.s));
                if (r.d || r.raw) {
                    w.any = true;
                    w.cur = Math.max(w.cur, self.textWidth(r.cur));
                    w.df = Math.max(w.df, self.textWidth(NP_ShopCompare.diffText(r.raw)));
                }
            });
            return w;
        }
        var mode = 'full', w;
        for (var fs = fs0; fs >= Math.max(14, fs0 - 8); fs -= 2) {
            this.contents.fontSize = fs;
            w = widths();
            if (!w.any) { mode = 'none'; break; }
            if (w.cur + w.ar + w.nw + gap + w.df <= width) { mode = 'full'; break; }
            if (w.nw + gap + w.df <= width) { mode = 'compact'; break; }
            mode = 'compact';
        }
        // right-aligned sub-columns: [cur][ → ][new] [diff]
        var right = x + width;
        var dfX = right - (w.any ? w.df : 0);
        var nwX = dfX - (w.any ? gap : 0) - w.nw;
        var arX = nwX - w.ar;
        var curX = arX - w.cur;
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i], changed = !!(r.d || r.raw);
            var col = r.d > 0 ? this.powerUpColor() : r.d < 0 ? this.powerDownColor() : this.normalColor();
            if (!changed) {
                this.changePaintOpacity(false);
                this.resetTextColor();
                this.drawText(r.s, nwX, y, w.nw, 'right');
                this.changePaintOpacity(true);
            } else {
                if (mode === 'full') {
                    this.changeTextColor(this.textColor(7));
                    this.drawText(r.cur, curX, y, w.cur, 'right');
                    this.drawText(ARROW, arX, y, w.ar, 'center');
                }
                this.changeTextColor(col);
                this.drawText(r.s, nwX, y, w.nw, 'right');
                this.drawText(NP_ShopCompare.diffText(r.raw), dfX, y, w.df, 'left');
            }
            y += this.lineHeight();
        }
        this.contents.fontSize = fs0;
        this.resetTextColor();
        NP_ShopCompare._lastMode = mode;
    };
})();
