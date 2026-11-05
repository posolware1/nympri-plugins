//=============================================================================
// NP_PictureAnim.js  (RU-mod)
//=============================================================================
/*:
 * @plugindesc v1.0 Живая анимация картинок: деформация сеткой (PIXI.mesh.Plane) — покачивание бёдер, дыхание, смех.
 * @author RU-mod
 *
 * @help
 * Картинка (Show Picture) рисуется через сетку PIXI.mesh.Plane, вершины
 * которой каждый кадр сдвигаются плавными функциями. Лицо/голова двигаются
 * жёстко (без искажения). Время идёт от кадров Game_Picture (60 fps), анимация
 * зациклена и сохраняется в сейве вместе с картинкой.
 *
 * Команда плагина (после Show Picture):
 *   NP_PicAnim <id> <пресет> [ключ=значение ...]
 *   NP_PicAnim <id> off
 *   NP_PicAnim wait <кадры>      — ждать N кадров или до клика / OK / Отмена
 *
 * Пресеты: tease (бёдра/попа + дыхание + голова), laugh (смех сидя),
 *          breathe (только дыхание).
 * Ключи:
 *   amp=1        общий множитель амплитуды
 *   speed=1      множитель скорости
 *   period=1.1   длина базового цикла, сек
 *   rect=x,y,w,h главная область (норм. 0..1) для бёдер (tease)/туловища (laugh)
 *   head=x,y,w,h жёсткая область головы (не деформируется)
 *   chest=x,y,w,h область дыхания
 *   seg=24x32    число сегментов сетки
 * Скрипт: NP_PicAnim.set(id, 'tease', {amp:1.2}); NP_PicAnim.clear(id);
 * Erase Picture / новый Show Picture на том же номере снимают анимацию.
 */
(function(root){
'use strict';
var NP = root.NP_PicAnim = root.NP_PicAnim || {};
var TAU = Math.PI * 2;

function smooth(e0, e1, x){ var t = (x - e0) / (e1 - e0); t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }
function clamp1(x){ return x < -1 ? -1 : (x > 1 ? 1 : x); }
// Сглаженная синусоида с «задержкой» в крайних точках (покачивание с акцентом)
var TK = 1.4, TN = Math.tanh(1.4);
function ease(x){ return Math.tanh(TK * Math.sin(x)) / TN; }
function ell(r, u, v, soft){ // эллипс, вписанный в r=[x,y,w,h]; 1 в центре, 0 на краю
    var nx = (u - (r[0] + r[2] / 2)) / (r[2] / 2), ny = (v - (r[1] + r[3] / 2)) / (r[3] / 2);
    var d = Math.sqrt(nx * nx + ny * ny);
    return { w: 1 - smooth(1 - soft, 1, d), nx: clamp1(nx), ny: clamp1(ny) };
}
function box(r, m, u, v){ // 1 внутри прямоугольника, плавный спад на ширине m снаружи
    var ex = Math.max(0, Math.abs(u - (r[0] + r[2] / 2)) - r[2] / 2) / m;
    var ey = Math.max(0, Math.abs(v - (r[1] + r[3] / 2)) - r[3] / 2) / m;
    return 1 - smooth(0, 1, Math.sqrt(ex * ex + ey * ey));
}

// ---------------- пресеты ----------------
NP.PRESETS = {
    // Координаты для np_beachanim_pri (жрица со спины, смотрит через левое плечо)
    tease: { period: 1.1, seg: [24, 32],
        rect: [0.12, 0.50, 0.82, 0.56], butt: [0.20, 0.56, 0.65, 0.40],
        chest: [0.15, 0.30, 0.65, 0.22], head: [0.36, 0.0, 0.36, 0.30], upper: [0.25, 0.0, 0.55, 0.33],
        pin: [0.90, 1.0] },
    laugh: { period: 1.1, seg: [20, 28],
        rect: [0.0, 0.0, 1.0, 0.45], head: [0.18, 0.0, 0.44, 0.32], belly: [0.10, 0.38, 0.60, 0.25],
        hand: [0.66, 0.17, 0.32, 0.24], chest: [0.15, 0.30, 0.60, 0.25] },
    breathe: { period: 1.1, seg: [16, 20], chest: [0.15, 0.30, 0.65, 0.25], head: [0.3, 0.0, 0.4, 0.3] }
};

// Смещение (dx в долях ширины, dy в долях высоты) точки (u,v) в момент t (сек)
NP.offset = function(cfg, t, u, v){
    var A = cfg.amp, th = TAU * t * cfg.speed / cfg.period, dx = 0, dy = 0, e, s, w;
    if (cfg.preset === 'tease') {
        var env = 0.88 + 0.12 * Math.sin(th / 2);           // лёгкая «волна» силы движения
        var S = ease(th), pin = 1 - smooth(cfg.pin[0], cfg.pin[1], v);
        e = ell(cfg.rect, u, v, 0.75); w = e.w * A * env;
        dx += 0.030 * S * w;                                  // покачивание бёдрами
        dy += (-0.008 * S * S - 0.010 * S * e.nx) * w * pin;  // подскок + наклон таза
        e = ell(cfg.butt, u, v, 0.8); w = e.w * A * env;
        s = Math.sin(2 * th - 1.3);                           // упругая отдача (запаздывает)
        dy += 0.010 * s * e.ny * w * pin;
        dx += -0.005 * s * e.nx * w;
        e = ell(cfg.chest, u, v, 0.8); s = Math.sin(th / 2); // дыхание
        dy += 0.005 * s * e.ny * e.w * A; dx += 0.003 * s * e.nx * e.w * A;
        w = box(cfg.upper, 0.22, u, v) * A;                   // плечи/голова чуть против бёдер
        dx += -0.008 * ease(th - 0.35) * w; dy += 0.002 * Math.sin(th / 2 + 1) * w;
        w = box(cfg.head, 0.07, u, v) * A;                    // голова: жёстко, кивок
        dx += 0.006 * Math.sin(th - 0.7) * w; dy += 0.004 * Math.sin(2 * th - 0.4) * w;
    } else if (cfg.preset === 'laugh') {
        var en = 0.55 + 0.45 * Math.sin(th);                  // приступы смеха
        var ch = (1 - Math.cos(4 * th)) / 2;                  // «гы-гы-гы»
        w = box(cfg.rect, 0.30, u, v) * A;
        dy += -0.010 * en * ch * w; dx += 0.002 * Math.sin(4 * th) * en * w;
        w = box(cfg.head, 0.12, u, v) * A;
        dx += 0.006 * Math.sin(4 * th + 0.5) * en * w; dy += -0.004 * ch * en * w;
        e = ell(cfg.belly, u, v, 0.8); s = Math.sin(4 * th - 1.0);
        dy += 0.006 * s * e.ny * e.w * A * en; dx += -0.004 * s * e.nx * e.w * A * en;
        e = ell(cfg.hand, u, v, 0.85);                        // машет/хлопает рукой
        dx += 0.020 * Math.sin(2 * th) * e.w * A; dy += 0.010 * Math.sin(2 * th + 1.2) * e.w * A;
        e = ell(cfg.chest, u, v, 0.8); s = Math.sin(th / 2);
        dy += 0.004 * s * e.ny * e.w * A; dx += 0.003 * s * e.nx * e.w * A;
    } else { // breathe
        e = ell(cfg.chest, u, v, 0.8); s = Math.sin(TAU * t * cfg.speed / (cfg.period * 3));
        dy += 0.006 * s * e.ny * e.w * A; dx += 0.004 * s * e.nx * e.w * A;
        w = box(cfg.head, 0.1, u, v) * A; dy += 0.004 * s * w;
    }
    return [dx, dy];
};

function parseRect(s){ var a = String(s).split(',').map(Number); return a.length === 4 && a.every(isFinite) ? a : null; }
// Полная конфигурация из {preset, opts}
NP.compile = function(st){
    var P = NP.PRESETS[st.preset] || NP.PRESETS.breathe, o = st.opts || {}, cfg = {}, k;
    for (k in P) cfg[k] = Array.isArray(P[k]) ? P[k].slice() : P[k];
    cfg.preset = NP.PRESETS[st.preset] ? st.preset : 'breathe';
    cfg.amp = isFinite(+o.amp) ? +o.amp : 1; cfg.speed = isFinite(+o.speed) && +o.speed > 0 ? +o.speed : 1;
    if (isFinite(+o.period) && +o.period > 0.1) cfg.period = +o.period;
    ['rect', 'head', 'chest', 'butt', 'upper', 'belly', 'hand'].forEach(function(n){ if (o[n]) { var r = parseRect(o[n]); if (r) cfg[n] = r; } });
    if (o.seg) { var m = String(o.seg).split('x').map(Number); if (m[0] >= 2 && m[1] >= 2) cfg.seg = [Math.min(64, m[0] | 0), Math.min(64, m[1] | 0)]; }
    return cfg;
};
// Вершины сетки (в пикселях, без учёта якоря) для размеров w×h
NP.vertices = function(cfg, t, w, h, out){
    var nx = cfg.seg[0] + 1, ny = cfg.seg[1] + 1, i = 0;
    out = out || new Float32Array(nx * ny * 2);
    for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) {
        var u = x / (nx - 1), v = y / (ny - 1), d = NP.offset(cfg, t, u, v);
        out[i++] = (u + d[0]) * w; out[i++] = (v + d[1]) * h;
    }
    return out;
};

if (typeof module !== 'undefined' && module.exports) module.exports = NP;
if (typeof Game_Picture === 'undefined') return; // вне игры (превью) — только ядро

// ---------------- Game_Picture: состояние ----------------
NP.set = function(id, preset, opts){
    var p = $gameScreen.picture(id); if (!p) return;
    p._npAnim = { preset: String(preset), opts: opts || {}, t: 0 };
};
NP.clear = function(id){ var p = $gameScreen.picture(id); if (p) p._npAnim = null; };

var _GP_show = Game_Picture.prototype.show;
Game_Picture.prototype.show = function(){ this._npAnim = null; _GP_show.apply(this, arguments); };
var _GP_erase = Game_Picture.prototype.erase;
Game_Picture.prototype.erase = function(){ this._npAnim = null; _GP_erase.apply(this, arguments); };
var _GP_update = Game_Picture.prototype.update;
Game_Picture.prototype.update = function(){ _GP_update.apply(this, arguments); if (this._npAnim) this._npAnim.t = (this._npAnim.t || 0) + 1; };

// ---------------- Sprite_Picture: сетка ----------------
var _SP_update = Sprite_Picture.prototype.update;
Sprite_Picture.prototype.update = function(){
    _SP_update.apply(this, arguments);
    try { this.npUpdateMesh(); } catch (e) { console.error('NP_PictureAnim', e); this.npRemoveMesh(); }
};
Sprite_Picture.prototype.npRemoveMesh = function(){
    if (this._npMesh) { this.removeChild(this._npMesh); this._npMesh.destroy({ children: true }); }
    this._npMesh = null; this._npMeshBmp = null; this._npMeshKey = null;
};
Sprite_Picture.prototype.npUpdateMesh = function(){
    var pic = this.picture(), st = pic && pic._npAnim;
    if (!st || !pic.name() || !this.bitmap || !this.bitmap.isReady() || !this.bitmap.baseTexture || !PIXI.mesh) {
        if (this._npMesh) this.npRemoveMesh(); return;
    }
    var key = st.preset + '|' + JSON.stringify(st.opts || {});
    if (!this._npMesh || this._npMeshBmp !== this.bitmap || this._npMeshKey !== key) {
        this.npRemoveMesh();
        this._npCfg = NP.compile(st);
        var tex = new PIXI.Texture(this.bitmap.baseTexture);
        var m = new PIXI.mesh.Plane(tex, this._npCfg.seg[0] + 1, this._npCfg.seg[1] + 1);
        m.canvasPadding = 1;
        this._npMesh = m; this._npMeshBmp = this.bitmap; this._npMeshKey = key;
        this.addChild(m);
    }
    var m2 = this._npMesh, w = this.bitmap.width, h = this.bitmap.height;
    if (m2.vertices.length !== (this._npCfg.seg[0] + 1) * (this._npCfg.seg[1] + 1) * 2) return;
    NP.vertices(this._npCfg, (st.t || 0) / 60, w, h, m2.vertices);
    m2.x = -this.anchor.x * w; m2.y = -this.anchor.y * h;
    m2.blendMode = this.blendMode;
};
// пока работает сетка, сам спрайт не рисуется (рисуется только сетка-потомок)
var _SP_rw = Sprite_Picture.prototype._renderWebGL, _SP_rc = Sprite_Picture.prototype._renderCanvas;
Sprite_Picture.prototype._renderWebGL = function(r){ if (this._npMesh) return; _SP_rw.call(this, r); };
Sprite_Picture.prototype._renderCanvas = function(r){ if (this._npMesh) return; _SP_rc.call(this, r); };

// ---------------- ожидание (кадры или клик) ----------------
var _GI_uwm = Game_Interpreter.prototype.updateWaitMode;
Game_Interpreter.prototype.updateWaitMode = function(){
    if (this._waitMode === 'npPicAnim') {
        this._npWait = (this._npWait || 0) - 1; this._npWaitT = (this._npWaitT || 0) + 1;
        var skip = this._npWaitT > 20 && (Input.isTriggered('ok') || Input.isTriggered('cancel') || TouchInput.isTriggered() || TouchInput.isCancelled());
        if (this._npWait > 0 && !skip) return true;
        this._waitMode = ''; this._npWait = 0; this._npWaitT = 0; return false;
    }
    return _GI_uwm.apply(this, arguments);
};

var _GI_pc = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args){
    _GI_pc.apply(this, arguments);
    if (command !== 'NP_PicAnim' && command !== 'NPPicAnim') return;
    if (args[0] === 'wait') { this._npWait = Math.max(1, Number(args[1]) || 360); this._npWaitT = 0; this.setWaitMode('npPicAnim'); return; }
    var id = Number(args[0]); if (!(id > 0)) return;
    if (!args[1] || args[1] === 'off') { NP.clear(id); return; }
    var opts = {};
    args.slice(2).forEach(function(a){ var i = a.indexOf('='); if (i > 0) opts[a.slice(0, i)] = a.slice(i + 1); });
    NP.set(id, args[1], opts);
};
})(typeof window !== 'undefined' ? window : this);
