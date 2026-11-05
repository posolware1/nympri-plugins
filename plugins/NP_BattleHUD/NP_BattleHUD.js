//=============================================================================
// NP_BattleHUD.js  —  компактная панель отряда в бою (Nymphomania Priestess RU)
//=============================================================================
/*:
 * @plugindesc v1.2 Компактная панель отряда в бою: карточки с лицом, полосами
 * Здоровье / Магия / Усталость, зарядом супер-удара и напряжением. Опция
 * «Компактная панель боя» (раздел «Интерфейс»), ВЫКЛ = оригинальный вид.
 * @author NP RU mod
 *
 * @help
 * Заменяет окна MEO_CombatStatusDisplay (WindowMC / WindowFeMC / WindowFollower)
 * собственным слоем карточек. Окно врага не трогается.
 * Полоски NP_SuperAttack и NP_Stress над окнами скрываются и рисуются внутри
 * карточки; трещины/сияние срыва NP_Stress переносятся на карточку.
 * Ставить ПОСЛЕ NP_Stress и NP_SuperAttack, ПЕРЕД NP_OptionsCategories.
 * Карточки строятся по party._actors (до 4), видимость — по $CSDM.Visible.
 */
var NP_BattleHUD = (function() {
    'use strict';
    var $ = {};
    var L = function(ru, en) { return (typeof window.NP_L === 'function') ? window.NP_L(ru, en) : ru; };
    $.version = '1.2';
    // палитра /workspace/np/ui_colors/palette.json
    var P = {
        text: '#ffffff', label: '#dcbc7c', highlight: '#ffe08a', muted: '#bdb3a5', ash: '#948b7f',
        positive: '#8fe08a', negative: '#ff6a5a', danger: '#ff4f45', stress: '#f0a030',
        breakdown: '#ff4f45', virtue: '#ffd25a', star: '#f2c94c', mana: '#6fa8ff'
    };
    $.P = P;
    // кроп лица из img/pictures/battle/c_window_actorN.png (300x300) — только лицо
    $.FACE = { 1: [80, 45, 150], 2: [70, 50, 150], 10: [110, 45, 150], 19: [70, 60, 150], 21: [100, 35, 160] };
    $.FACE_DEF = [75, 45, 150];
    $.MAX = 4; $.AREA_W = 1268; $.CARD_W = 300; $.MARGIN = 6; $.GAP = 6; $.H = 204;

    function gs(id) { return !!($gameSwitches && $gameSwitches.value(id)); }
    function gv(id) { return $gameVariables ? Number($gameVariables.value(id)) || 0 : 0; }
    function csdm() { return (typeof $CSDM !== 'undefined' && $CSDM) ? $CSDM : null; }
    function SA() { return (typeof NP_SuperAttack !== 'undefined') ? NP_SuperAttack : null; }
    function ST() { return (typeof NP_Stress !== 'undefined') ? NP_Stress : null; }
    function isEn() { try { return !!(typeof NP_Language !== 'undefined' && NP_Language.isEn && NP_Language.isEn()); } catch (e) { return false; } }

    // ------------------------------------------------------------- опция
    ConfigManager.npBattleHud = true;
    var _mk = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = _mk.apply(this, arguments); c.npBattleHud = this.npBattleHud; return c; };
    var _ap = ConfigManager.applyData;
    ConfigManager.applyData = function(c) { _ap.apply(this, arguments); this.npBattleHud = (c && c.npBattleHud !== undefined) ? !!c.npBattleHud : true; };
    if (typeof Window_Options !== 'undefined') {
        var _addGen = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _addGen.apply(this, arguments);
            this.addCommand(L('Компактная панель боя', 'Compact battle panel'), 'npBattleHud');
            try { if (window.NP_OptionsCategories && NP_OptionsCategories.register) NP_OptionsCategories.register('npBattleHud', 'ui'); } catch (e) {}
        };
    }
    $.enabled = function() { return ConfigManager.npBattleHud !== false; };

    // ------------------------------------------------------------- данные карточек
    $.partyWins = function() {
        var c = csdm(); if (!c) return [];
        return [c.WindowMC, c.WindowFeMC, c.WindowFollower].filter(function(w) { return w; });
    };
    // кто показывается: те же, кого показывает оригинал (+4-й участник, если есть)
    $.members = function() {
        var c = csdm(); if (!c || !$gameParty) return [];
        var shown = {};
        $.partyWins().forEach(function(w) { if (w.Visible && w.Actor && w.Actor.actorId) shown[w.Actor.actorId()] = true; });
        var ids = $gameParty._actors.slice(0, $.MAX);
        return ids.filter(function(id, i) { return shown[id] || i >= 3; })
                  .map(function(id) { return $gameActors.actor(id); }).filter(function(a) { return !!a; });
    };
    $.active = function() {
        var c = csdm();
        return $.enabled() && !!c && !!c.Visible && gs(14) && !gs(5) && !(SA() && SA()._qte);
    };
    $.curActor = function() { try { return SA() && SA().curActor ? SA().curActor() : gv(270); } catch (e) { return 0; } };
    $.layout = function(n) {
        var W = Graphics.width, H = Graphics.height;
        var area = Math.min($.AREA_W, W - 2 * $.MARGIN);
        var w = Math.min($.CARD_W, Math.floor((area - $.GAP * (n - 1)) / Math.max(1, n)));
        var x0 = W - $.MARGIN - (w * n + $.GAP * (n - 1)), y = H - $.MARGIN - $.H;
        var r = []; for (var i = 0; i < n; i++) r.push({ x: x0 + i * (w + $.GAP), y: y, w: w, h: $.H });
        return r;
    };
    $.rects = {};   // aid -> rect (для NP_Stress трещин и тестов)

    // A single display model for native states, parameter buffs and camp effects.
    function plain(text) { return String(text || '').replace(/\\[A-Za-z]+\[\d+\]/g, '').trim(); }
    function paramName(id) {
        return [L('Макс. HP', 'Max HP'), L('Макс. MP', 'Max MP'), L('Сила', 'Strength'), L('Выносливость', 'Endurance'),
            L('Интеллект', 'Intellect'), L('Обаяние', 'Charm'), L('Ловкость', 'Dexterity'), L('Вера', 'Faith')][id] || '?';
    }
    function percent(n) { var v = Math.round(n * 100); return (v >= 0 ? '+' : '') + v + '%'; }
    function paramDetails(params) {
        return Object.keys(params || {}).map(function(id) { return paramName(Number(id)) + ' ' + percent(params[id] - 1); }).join(', ');
    }
    function countLabel(n, forms, english) {
        var last = n % 10, teen = n % 100 >= 11 && n % 100 <= 14;
        return n + ' ' + L(forms[teen ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2], english);
    }
    function turns(n) { return n > 0 ? countLabel(n, ['ход', 'хода', 'ходов'], 'turns') : L('До снятия', 'Until removed'); }
    $.effectsOf = function(a) {
        var out = [], nativeBattle = $gameParty && $gameParty.inBattle && $gameParty.inBattle();
        (a._states || []).forEach(function(id) {
            var s = $dataStates[id]; if (!s || !plain(s.name)) return;
            var params = {}, extra = [], bad = id >= 1 && id <= 10;
            (s.traits || []).forEach(function(t) {
                if (t.code === 21) { params[t.dataId] = t.value; if (t.value < 1) bad = true; }
                if (t.code === 22 && t.dataId === 7 && t.value) {
                    extra.push(L('Восстановление HP ', 'HP recovery ') + percent(t.value)); if (t.value < 0) bad = true;
                }
            });
            var control = { 1: L('Не может действовать.', 'Cannot act.'), 3: L('Зрение нарушено.', 'Impaired vision.'),
                4: L('Не может произносить заклинания.', 'Cannot cast spells.'), 5: L('Действия нарушены смятением.', 'Actions disrupted by confusion.'),
                6: L('Спит и пропускает действия.', 'Asleep and unable to act.'), 7: L('Паралич мешает действовать.', 'Paralysis prevents actions.'),
                8: L('Оглушение мешает действовать.', 'Stun prevents actions.'), 9: L('Пропускает действие.', 'Skips an action.') }[id];
            if (control) extra.unshift(control);
            var detail = paramDetails(params); if (detail) extra.unshift(detail);
            var n = nativeBattle && s.autoRemovalTiming > 0 ? Number((a._stateTurns || {})[id]) || 0 : 0;
            out.push({ id: 'state:' + id, name: plain(s.name), icon: s.iconIndex || 0,
                kind: bad ? 'bad' : Object.keys(params).length ? 'good' : 'neutral',
                details: extra.join(' ') || L('Особое состояние персонажа.', 'Special character condition.'),
                duration: n > 0 ? turns(n) : s.removeAtBattleEnd ? L('До конца боя', 'Until battle ends') : L('До снятия', 'Until removed'),
                badge: n > 0 ? n + L('х', 't') : '' });
        });
        (a._buffs || []).forEach(function(level, id) {
            if (!level) return;
            var n = Number((a._buffTurns || [])[id]) || 0;
            out.push({ id: 'buff:' + id, name: paramName(id), kind: level > 0 ? 'good' : 'bad',
                icon: a.buffIconIndex ? a.buffIconIndex(level, id) : 0,
                details: paramName(id) + ' ' + percent(level * 0.25), duration: turns(n), badge: n > 0 ? n + L('х', 't') : '' });
        });
        var stress = ST();
        if (stress && stress.active && stress.active()) {
            stress.buffsOf(a.actorId()).forEach(function(b, i) {
                var bad = Object.keys(b.p || {}).some(function(id) { return b.p[id] < 1; });
                out.push({ id: 'camp:' + i + ':' + b.src, name: plain(b.src), icon: 0, kind: bad ? 'bad' : 'good',
                    details: paramDetails(b.p), duration: countLabel(b.n, ['бой', 'боя', 'боёв'], 'battles'), badge: b.n + L('б', 'b') });
            });
            var aff = stress.aff(a.actorId()), def = aff && stress.affDef && stress.affDef(aff);
            if (def) out.push({ id: 'stress:' + aff.id, name: plain(def.n), icon: 0, kind: aff.kind === 'v' ? 'good' : 'bad',
                details: plain(def.d), duration: L('До отдыха', 'Until rest'), badge: '' });
        }
        return out;
    };
    $.effectsKey = function(effects) { return JSON.stringify(effects); };
    $.effectSlots = function(effects, width) {
        var x = 69, cols = Math.max(1, Math.floor((width - x - 8) / 34)), capacity = cols * 2;
        var shown = Math.min(effects.length, capacity), overflow = effects.length > capacity;
        var out = [];
        for (var i = 0; i < shown; i++) {
            var slot = { x: x + i % cols * 34, y: 34 + Math.floor(i / cols) * 30, w: 32, h: 28 };
            if (overflow && i === shown - 1) { slot.overflow = effects.length - i; slot.effects = effects; }
            else slot.effect = effects[i];
            out.push(slot);
        }
        return out;
    };
    $.hitEffect = function(slots, x, y) {
        return slots.filter(function(s) { return x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h; })[0] || null;
    };
    $.tooltipLayout = function(cardX, cardY, count) {
        var w = Math.min(400, Graphics.width - 12), available = Math.max(134, cardY - 12);
        var pageSize = Math.max(1, Math.min(4, Math.floor((available - 58) / 76)));
        var h = 58 + Math.min(Math.max(count, 1), pageSize) * 76;
        return { x: Math.max(6, Math.min(cardX, Graphics.width - w - 6)), y: Math.max(6, cardY - h - 6), w: w, h: h, pageSize: pageSize };
    };
    $.pointer = { x: -1, y: -1 };
    var _mouseMove = TouchInput._onMouseMove;
    TouchInput._onMouseMove = function(event) {
        _mouseMove.apply(this, arguments);
        $.pointer = { x: Graphics.pageToCanvasX(event.pageX), y: Graphics.pageToCanvasY(event.pageY) };
    };

    $.drawEffects = function(b, effects) {
        var slots = $.effectSlots(effects, b.width), ib = ImageManager.loadSystem('IconSet');
        slots.forEach(function(s) {
            var e = s.effect, col = !e ? P.muted : e.kind === 'good' ? P.positive : e.kind === 'bad' ? P.negative : P.muted;
            b.fillRect(s.x, s.y, s.w, s.h, col); b.fillRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2, '#201c20');
            if (s.overflow) txt(b, '+' + s.overflow, s.x, s.y, s.w, s.h, P.label, 16, 'center', true);
            else {
                if (e.icon > 0 && ib.isReady()) {
                    var pw = Window_Base._iconWidth, ph = Window_Base._iconHeight;
                    b.blt(ib, e.icon % 16 * pw, Math.floor(e.icon / 16) * ph, pw, ph, s.x + 4, s.y + 2, 24, 24);
                } else txt(b, e.name.charAt(0), s.x, s.y - 1, s.w, s.h, col, 19, 'center', true);
                if (e.badge) {
                    b.fillRect(s.x + 10, s.y + 15, 22, 13, 'rgba(0,0,0,0.9)');
                    txt(b, e.badge, s.x + 8, s.y + 13, 24, 16, '#ffffff', 12, 'right', true);
                }
            }
        });
        return slots;
    };

    // ------------------------------------------------------------- рисование
    function rr(ctx, x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    function dirty(b) { if (b._setDirty) b._setDirty(); else if (b._baseTexture) b._baseTexture.update(); }
    function txt(b, s, x, y, w, h, col, size, align, bold) {
        b.fontSize = size; b.textColor = col; b.outlineColor = 'rgba(0,0,0,0.9)'; b.outlineWidth = 3;
        b.fontItalic = false; if (bold !== undefined) b.fontBold = !!bold;
        b.drawText(s, x, y, w, h, align || 'left'); b.fontBold = false;
    }
    // полоса: подпись слева внутри, значение справа внутри
    function gauge(b, x, y, w, h, rate, c1, c2, label, value, vcol, fsz) {
        fsz = fsz || (h - 2);
        var ctx = b._context;
        ctx.save(); rr(ctx, x, y, w, h, 4); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
        var fw = Math.round((w - 2) * Math.max(0, Math.min(1, rate)));
        if (fw > 0) {
            ctx.save(); rr(ctx, x + 1, y + 1, w - 2, h - 2, 3); ctx.clip();
            var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2);
            ctx.fillStyle = g; ctx.fillRect(x + 1, y + 1, fw, h - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 1, y + 1, fw, Math.max(1, Math.floor((h - 2) / 3)));
            ctx.restore();
        }
        dirty(b);
        if (label) txt(b, label, x + 8, y - 2, w - 16, h + 4, P.label, fsz, 'left');
        if (value) txt(b, value, x + 8, y - 2, w - 16, h + 4, vcol || P.text, fsz, 'right');
    }
    function faceRect(aid) { return $.FACE[aid] || $.FACE_DEF; }
    $.faceBitmap = function(aid) { return ImageManager.loadPicture('battle/c_window_actor' + aid); };

    $.drawCard = function(b, a, st, sp) {
        var w = b.width, h = b.height, ctx = b._context, aid = a.actorId();
        b.clear();
        // фон
        ctx.save(); rr(ctx, 1, 1, w - 2, h - 2, 8);
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, st.dead ? 'rgba(40,36,36,0.92)' : 'rgba(42,30,26,0.93)');
        g.addColorStop(1, st.dead ? 'rgba(18,16,16,0.92)' : 'rgba(16,11,10,0.93)');
        ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = st.cur ? 2 : 1;
        ctx.strokeStyle = st.cur ? P.highlight : 'rgba(220,188,124,0.45)'; ctx.stroke(); ctx.restore(); dirty(b);
        // лицо
        var fx = 8, fy = 8, fs = 52, fb = sp.face;
        ctx.save(); rr(ctx, fx, fy, fs, fs, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.clip();
        if (fb && fb.isReady() && fb.width > 1) { var fr = faceRect(aid); b.blt(fb, fr[0], fr[1], fr[2], fr[2], fx, fy, fs, fs); }
        else { txt(b, (a.name() || '?').charAt(0), fx, fy, fs, fs, P.label, 28, 'center'); }
        if (st.dead) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(fx, fy, fs, fs); }
        ctx.restore();
        ctx.save(); rr(ctx, fx, fy, fs, fs, 6); ctx.lineWidth = 1; ctx.strokeStyle = st.cur ? P.highlight : 'rgba(220,188,124,0.6)'; ctx.stroke(); ctx.restore(); dirty(b);
        // имя + уровень
        var nx = fx + fs + 9, nw = w - nx - 8;
        var ncol = st.dead ? P.ash : st.aff ? (st.aff.kind === 'v' ? P.virtue : P.breakdown) : st.cur ? P.highlight : P.text;
        txt(b, (st.cur ? '▶ ' : '') + a.name(), nx, 4, nw - 58, 30, ncol, 21, 'left', true);
        txt(b, L('ур.', 'Lv') + a.level, nx, 5, nw, 28, P.muted, 18, 'right');
        // Two rows of every temporary effect; the last slot expands overflow.
        sp._effectSlots = $.drawEffects(b, st.effects || []);
        if (st.dead) txt(b, L('Без сознания', 'Knocked out'), 8, 64, 56, 26, P.danger, 12);
        // полосы
        var gx = 8, gw = w - 16, gh = 20, y = 100;
        var hr = a.mhp > 0 ? a.hp / a.mhp : 0, low = hr > 0 && hr <= 0.3;
        gauge(b, gx, y, gw, gh, hr, low ? '#ff7a6a' : '#7be08a', low ? '#b8241c' : '#2f9a45', L('Здоровье', 'Health'), a.hp + '/' + a.mhp, low ? P.negative : P.text);
        y += gh + 4;
        var mr = a.mmp > 0 ? a.mp / a.mmp : 0;
        gauge(b, gx, y, gw, gh, mr, '#9cc4ff', '#2f5fc8', L('Магия', 'Magic'), a.mp + '/' + a.mmp);
        y += gh + 4;
        var tp = Math.round(a._tp || 0), tr = tp / 100, hot = tp >= 80;
        gauge(b, gx, y, gw, gh, tr, hot ? '#ff8a6a' : '#ffd88a', hot ? '#b8301c' : '#c8841e', L('Усталость', 'Fatigue'), tp + '/100', hot ? P.negative : P.text);
        y += gh + 6;
        // нижняя строка: супер + напряжение
        var rh = 20, half = Math.floor((gw - 6) / 2), sx = gx, stx = gx, stw = gw;
        if (st.sup) {
            var v = st.sup.v, ready = v >= 100, ok = st.sup.ok, w1 = st.str ? half : gw;
            var c1 = ready ? (ok ? '#fff6b0' : '#a0a0a0') : st.sup.col[0], c2 = ready ? (ok ? '#ffb000' : '#606060') : st.sup.col[1];
            gauge(b, sx, y, w1, rh, v / 100, c1, c2, null, null);
            var t = ready ? (ok ? L('★ СУПЕР', '★ SUPER') : L('★ нет сил', '★ tired')) : '★ ' + v + '%';
            txt(b, t, sx, y - 2, w1, rh + 4, ready && !ok ? P.muted : '#ffffff', 18, 'center', ready && ok);
            stx = sx + w1 + 6; stw = gw - w1 - 6;
        }
        if (st.str) {
            var sv = st.str.v, a2 = st.str.aff, sc1, sc2;
            if (a2) { sc1 = a2.kind === 'v' ? '#fff0a0' : '#ff5a7a'; sc2 = a2.kind === 'v' ? '#d09a10' : '#8a0a28'; }
            else if (sv >= 70) { sc1 = '#ff8a6a'; sc2 = '#b8241c'; }
            else if (sv >= 40) { sc1 = '#ffb070'; sc2 = '#c8601c'; }
            else { sc1 = '#e8d9a0'; sc2 = '#9a8450'; }
            gauge(b, stx, y, stw, rh, sv / 100, sc1, sc2, null, null);
            var lab = a2 && st.affName ? st.affName : L('Напр. ', 'Stress ') + sv;
            txt(b, lab, stx, y - 2, stw, rh + 4, '#ffffff', 18, 'center');
        }
        dirty(b);
    };

    // ------------------------------------------------------------- состояние карточки
    $.stateOf = function(a) {
        var aid = a.actorId(), s = SA(), t = ST(), st = { cur: false, dead: a.hp <= 0, aff: null, affName: '', sup: null, str: null };
        st.cur = !st.dead && aid === $.curActor();
        try {
            if (s && s.KIND && s.KIND[aid]) {
                var v = Math.floor(s.charge(aid)), cols = { pri: ['#fff3b0', '#e0b030'], yar: ['#ffcf9a', '#c8641e'], pm: ['#b8ffb0', '#3aa04a'], vp: ['#ffb0c0', '#c0203c'] };
                st.sup = { v: v, ok: v >= 100 && s.reason(aid) === null, col: cols[s.KIND[aid]] || ['#ffe08a', '#c8841e'] };
            }
        } catch (e) {}
        try {
            if (t && t.active && t.active()) {
                var af = t.aff(aid); st.str = { v: t.get(aid), aff: af }; st.aff = af;
                if (af && t.affDef) { var d = t.affDef(af); st.affName = d && d.n ? String(d.n) : ''; }
            }
        } catch (e) {}
        st.effects = $.effectsOf(a);
        return st;
    };
    function keyOf(a, st, sp) {
        return [a.name(), a.level, a.hp, a.mhp, a.mp, a.mmp, Math.round(a._tp || 0), (a._states || []).join('.'), st.cur, st.dead, $.effectsKey(st.effects || []),
            st.sup ? st.sup.v + ':' + st.sup.ok : '-', st.str ? st.str.v + ':' + (st.aff ? st.aff.kind + st.aff.id : '') : '-',
            sp.face && sp.face.isReady() ? 1 : 0, ImageManager.loadSystem('IconSet').isReady() ? 1 : 0, isEn() ? 'en' : 'ru', sp.bitmap.width].join('|');
    }

    // ------------------------------------------------------------- слой
    function Sprite_NpBattleHud() { this.initialize.apply(this, arguments); }
    Sprite_NpBattleHud.prototype = Object.create(Sprite.prototype);
    Sprite_NpBattleHud.prototype.constructor = Sprite_NpBattleHud;
    Sprite_NpBattleHud.prototype.initialize = function() { Sprite.prototype.initialize.call(this); this._cards = {}; this._tick = 0; this._on = false; };
    Sprite_NpBattleHud.prototype.update = function() {
        Sprite.prototype.update.call(this); this._tick++;
        try { this.updateHud(); } catch (e) { console.warn('[NP_BattleHUD]', e); }
    };
    Sprite_NpBattleHud.prototype.card = function(aid) {
        var c = this._cards[aid];
        if (!c) {
            c = this._cards[aid] = new Sprite(new Bitmap(10, $.H)); c._key = '';
            c.face = $.faceBitmap(aid);
            c.pulse = new Sprite(new Bitmap(10, $.H)); c.pulse._w = 0; c.pulse.blendMode = Graphics.BLEND_ADD;
            c.addChild(c.pulse); this.addChild(c);
        }
        return c;
    };
    function drawPulse(b, col) {
        var ctx = b._context; b.clear(); ctx.save(); rr(ctx, 2, 2, b.width - 4, b.height - 4, 8);
        ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.stroke(); ctx.restore(); dirty(b);
    }
    Sprite_NpBattleHud.prototype.updateHud = function() {
        var on = $.active(), self = this, seen = {};
        this._on = on; $.rects = {};
        if (on) {
            var ms = $.members(), rs = $.layout(ms.length);
            ms.forEach(function(a, i) {
                var aid = a.actorId(), r = rs[i], c = self.card(aid); seen[aid] = true; $.rects[aid] = r;
                if (c.bitmap.width !== r.w) { c.bitmap = new Bitmap(r.w, $.H); c._key = ''; }
                c._actorName = a.name();
                var st = $.stateOf(a), k = keyOf(a, st, c);
                if (c._key !== k) { c._key = k; $.drawCard(c.bitmap, a, st, c); }
                var lowHp = !st.dead && a.mhp > 0 && a.hp / a.mhp <= 0.3;
                var supReady = st.sup && st.sup.ok;
                var pc = lowHp ? P.danger : (supReady ? P.highlight : null);
                if (pc) {
                    if (c.pulse._w !== r.w || c.pulse._c !== pc) { c.pulse.bitmap = new Bitmap(r.w, $.H); c.pulse._w = r.w; c.pulse._c = pc; drawPulse(c.pulse.bitmap, pc); }
                    c.pulse.visible = true;
                    c.pulse.opacity = Math.round((lowHp ? 110 : 70) + (lowHp ? 110 : 60) * Math.sin(self._tick / (lowHp ? 9 : 14)));
                } else c.pulse.visible = false;
                self.updateFx(c, st, r);
                c.x = r.x; c.y = r.y - (st.cur ? 4 : 0); c.visible = true; c.opacity = st.dead ? 190 : 255;
            });
        }
        Object.keys(this._cards).forEach(function(k) { if (!seen[k]) self._cards[k].visible = false; });
        this.hideOriginals(on);
        this.updateTooltip(on);
    };
    function targetFor(cards, key) {
        var found = null;
        Object.keys(cards).some(function(aid) {
            var c = cards[aid]; if (!c.visible) return false;
            return (c._effectSlots || []).some(function(slot) {
                var k = aid + ':' + (slot.overflow ? 'overflow' : slot.effect.id);
                if (k !== key) return false;
                found = { key: k, card: c, slot: slot, effects: slot.overflow ? slot.effects : [slot.effect] };
                return true;
            });
        });
        return found;
    }
    function targetAt(cards, x, y) {
        var found = null;
        Object.keys(cards).some(function(aid) {
            var c = cards[aid]; if (!c.visible) return false;
            var slot = $.hitEffect(c._effectSlots || [], x - c.x, y - c.y);
            if (!slot) return false;
            found = targetFor(cards, aid + ':' + (slot.overflow ? 'overflow' : slot.effect.id)); return true;
        });
        return found;
    }
    function inside(sprite, x, y) {
        return sprite && sprite.visible && x >= sprite.x && x < sprite.x + sprite.bitmap.width && y >= sprite.y && y < sprite.y + sprite.bitmap.height;
    }
    function wrapDetail(b, text, width) {
        var words = plain(text).split(/\s+/), lines = [], line = '';
        words.forEach(function(word) {
            var next = line ? line + ' ' + word : word;
            if (line && b.measureTextWidth(next) > width) { lines.push(line); line = word; }
            else line = next;
        });
        if (line) lines.push(line);
        if (lines.length > 2) { lines = lines.slice(0, 2); lines[1] += '…'; }
        return lines;
    }
    Sprite_NpBattleHud.prototype.updateTooltip = function(on) {
        if (!on) {
            if (this._tip) this._tip.visible = false;
            this._tipPinned = null; this._tipTarget = null; this._tipDismissed = null; return;
        }
        var tap = TouchInput.isTriggered(), x = tap ? TouchInput.x : $.pointer.x, y = tap ? TouchInput.y : $.pointer.y;
        var hovered = targetAt(this._cards, x, y);
        if (!hovered || hovered.key !== this._tipDismissed) this._tipDismissed = null;
        if (tap) {
            if (hovered) {
                if (this._tipPinned === hovered.key && hovered.slot.overflow) this._tipPage = (this._tipPage || 0) + 1;
                else if (this._tipPinned === hovered.key) { this._tipPinned = null; this._tipDismissed = hovered.key; }
                else { this._tipPinned = hovered.key; this._tipPage = 0; }
            } else if (!inside(this._tip, x, y)) this._tipPinned = null;
        }
        var pinned = this._tipPinned && targetFor(this._cards, this._tipPinned);
        if (this._tipPinned && !pinned) this._tipPinned = null;
        var target = pinned || hovered;
        if (!target && inside(this._tip, x, y) && this._tipTarget) target = targetFor(this._cards, this._tipTarget);
        if (target && target.key === this._tipDismissed) target = null;
        if (!target) { if (this._tip) this._tip.visible = false; this._tipTarget = null; return; }
        if (target.key !== this._tipTarget) this._tipPage = 0;
        var layout = $.tooltipLayout(target.card.x, target.card.y, target.effects.length);
        var pages = Math.max(1, Math.ceil(target.effects.length / layout.pageSize));
        if (TouchInput.wheelY && (hovered || inside(this._tip, x, y))) this._tipPage = (this._tipPage || 0) + (TouchInput.wheelY > 0 ? 1 : -1);
        this._tipPage = ((this._tipPage || 0) % pages + pages) % pages;
        this._tipTarget = target.key;
        var key = target.key + ':' + $.effectsKey(target.effects) + ':' + this._tipPage + ':' + JSON.stringify(layout);
        if (!this._tip) { this._tip = new Sprite(new Bitmap(layout.w, layout.h)); this.addChild(this._tip); }
        if (key !== this._tipKey) { this._tipKey = key; this.drawTooltip(target, layout); }
        this._tip.x = layout.x; this._tip.y = layout.y; this._tip.visible = true;
    };
    Sprite_NpBattleHud.prototype.drawTooltip = function(target, layout) {
        var b = this._tip.bitmap;
        if (b.width !== layout.w || b.height !== layout.h) b = this._tip.bitmap = new Bitmap(layout.w, layout.h);
        b.clear(); b.fillRect(0, 0, b.width, b.height, P.label); b.fillRect(1, 1, b.width - 2, b.height - 2, 'rgba(20,16,20,0.97)');
        var start = this._tipPage * layout.pageSize, list = target.effects.slice(start, start + layout.pageSize);
        txt(b, L('Эффекты: ', 'Effects: ') + (target.card._actorName || ''), 10, 6, b.width - 20, 24, P.label, 19, 'left', true);
        var help = target.effects.length > layout.pageSize ? (start + 1) + '–' + (start + list.length) + '/' + target.effects.length + L(' · колесо / нажмите +N', ' · scroll / tap +N') : L('Наведите или нажмите на значок', 'Hover or tap an icon');
        txt(b, help, 10, 30, b.width - 20, 20, P.muted, 13);
        list.forEach(function(e, i) {
            var y = 56 + i * 76, col = e.kind === 'bad' ? P.negative : e.kind === 'good' ? P.positive : P.text;
            txt(b, e.name, 10, y, b.width - 20, 22, col, 17, 'left', true);
            txt(b, e.duration, 10, y + 22, b.width - 20, 18, P.label, 13);
            b.fontSize = 14;
            wrapDetail(b, e.details, b.width - 20).forEach(function(line, row) { txt(b, line, 10, y + 40 + row * 16, b.width - 20, 16, P.text, 14); });
        });
    };

    // прячем оригинальные окна и чужие полоски, трещины переносим на карточки
    Sprite_NpBattleHud.prototype.hideOriginals = function(on) {
        var c = csdm(); if (!c) return;
        $.partyWins().forEach(function(w) { w.visible = on ? false : !!w.Visible; });
    };
    // полоски NP_SuperAttack / NP_Stress над окнами: при ВКЛ не рисуются (данные — в карточке)
    function hideAll(o) { if (o) Object.keys(o).forEach(function(k) { o[k].visible = false; }); }
    $.patchLayers = function() {
        var SB = window.Sprite_NpSuperBars;
        if (SB && !SB.prototype._npHud) {
            var _sb = SB.prototype.updateBars; SB.prototype._npHud = true;
            SB.prototype.updateBars = function() { if ($.active()) { hideAll(this._bars); return; } return _sb.apply(this, arguments); };
        }
        var SL = ST() && ST().Sprite_NpStressLayer;
        if (SL && !SL.prototype._npHud) {
            var _sl = SL.prototype.updateBars; SL.prototype._npHud = true;
            SL.prototype.updateBars = function() { if ($.active()) { hideAll(this._bars); hideAll(this._cracks); return; } return _sl.apply(this, arguments); };
        }
    };
    $.patchLayers();
    // срыв / добродетель: трещины или сияние NP_Stress внутри карточки
    Sprite_NpBattleHud.prototype.updateFx = function(c, st, r) {
        var sl = SceneManager._scene && SceneManager._scene._npStressLayer, a = st.aff;
        if (!c.fx) { c.fx = new Sprite(); c.addChildAt(c.fx, 0); c.fx2 = new Sprite(); c.addChild(c.fx2); }
        var bmp = a && sl ? (a.kind === 'v' ? sl._glowBmp : sl._crackBmp) : null;
        if (!bmp || !bmp.isReady() || bmp.width < 2) { c.fx2.visible = false; return; }
        if (c.fx2.bitmap !== bmp) { c.fx2.bitmap = bmp; c.fx2.blendMode = a.kind === 'v' ? Graphics.BLEND_ADD : Graphics.BLEND_NORMAL; }
        c.fx2.scale.x = r.w / bmp.width; c.fx2.scale.y = r.h / bmp.height; c.fx2.visible = true;
        c.fx2.opacity = a.kind === 'v' ? 90 + Math.round(50 * Math.sin(this._tick / 12)) : 80;
    };
    $.Sprite_NpBattleHud = Sprite_NpBattleHud;
    window.Sprite_NpBattleHud = Sprite_NpBattleHud;

    // оригинальное окно при ВКЛ не должно мигать при draw()
    if (typeof Window_CombatStatusDisplay !== 'undefined') {
        var _us = Window_CombatStatusDisplay.prototype.UpdateSprites;
        Window_CombatStatusDisplay.prototype.UpdateSprites = function() {
            _us.apply(this, arguments);
            try { var c = csdm(); if (c && this !== c.WindowEnemy && $.active()) this.visible = false; } catch (e) {}
        };
    }
    $.attach = function(scene) {
        if (!scene || scene._npBattleHud) return scene && scene._npBattleHud;
        var s = new Sprite_NpBattleHud(); scene._npBattleHud = s;
        // под слоем NP_Stress (реплики, срывы на весь экран остаются сверху)
        var sl = scene._npStressLayer, i = sl ? scene.children.indexOf(sl) : -1;
        if (i >= 0) scene.addChildAt(s, i); else scene.addChild(s);
        return s;
    };
    if (typeof Scene_Map !== 'undefined') {
        var _caw = Scene_Map.prototype.createAllWindows;
        Scene_Map.prototype.createAllWindows = function() {
            _caw.apply(this, arguments);
            $.attach(this);
            ImageManager.loadSystem('IconSet');
            [1, 2, 10, 19, 21].forEach(function(i) { $.faceBitmap(i); });
        };
    }
    return $;
})();
