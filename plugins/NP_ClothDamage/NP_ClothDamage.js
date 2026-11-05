var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_ClothDamage.js  (RU-mod)
//=============================================================================
/*:
 * @plugindesc [RU] Рваная одежда: облачение жрицы (僧衣, cloth82) рвётся в бою по мере ударов; чинится на отдыхе.
 * @author RU-mod
 *
 * @param Enabled
 * @text Включено по умолчанию
 * @type boolean
 * @default true
 *
 * @param OptionLabel
 * @text Название в настройках
 * @default Рваная одежда
 *
 * @param Thresholds
 * @text Пороги очков урона (ур.1,ур.2,ур.3)
 * @default 4,10,18
 *
 * @param HitPoints
 * @text Очки за обычный удар по HP
 * @type number
 * @default 1
 *
 * @param CritPoints
 * @text Доп. очки за крит
 * @type number
 * @default 2
 *
 * @param SexPoints
 * @text Очки за «постельный» навык врага (тип 性)
 * @type number
 * @default 3
 *
 * @param BigHitPoints
 * @text Доп. очко, если удар снял ≥25% макс. HP
 * @type number
 * @default 1
 *
 * @param LevelFiles
 * @text Суффиксы файлов для ур.1,2,3
 * @desc Файл: stand-heroine-basic-cloth82-<N>-<суффикс>.png. Запасные наборы: ta, tb.
 * @default t1,t2,t3
 *
 * @param BattleLog
 * @text Строка в журнале боя
 * @type boolean
 * @default true
 *
 * @help
 * Работает только пока на жрице (актёр 2) надето базовое облачение 僧衣
 * (броня №82, слот «衣装», в CE60 рисуется как stand-heroine-basic-cloth82-<V29>).
 *
 * Очки урона копятся в бою, когда враг попадает по жрице: удар по HP +1,
 * крит +2, удар на ≥25% макс. HP +1, навык типа «性» (или с <NP_ClothTear>
 * в заметке) +3, даже без урона. Пороги 4 / 10 / 18 дают уровни 1 / 2 / 3.
 *
 * Картинка: при показе stand-heroine-basic-cloth82-N (N=0..3) подменяется
 * на stand-heroine-basic-cloth82-N-tL. Если файла нет — остаётся целая.
 * CommonEvents.json не меняется. Уже показанная картинка меняется сразу.
 *
 * Сброс на 0: отдых (CE474 «キャンプ-寝る», CE325 «睡眠処理» — гостиница/кровать),
 * повторное надевание облачения (снять и надеть вне боя).
 * Галерея (S5): не копится и не показывается.
 * Состояние: $gameSystem._npClothDmg (старые сейвы — уровень 0).
 *
 * Консоль: NP_ClothDamage.set(2) / NP_ClothDamage.reset() / NP_ClothDamage.state()
 */
var NP_ClothDamage = NP_ClothDamage || {};
(function($) {
    'use strict';
    var params = (typeof PluginManager !== 'undefined') ? PluginManager.parameters('NP_ClothDamage') : {};
    function num(v, d) { return (v === undefined || v === '' || isNaN(Number(v))) ? d : Number(v); }
    var P = {
        enabled: String(params['Enabled'] || 'true') === 'true',
        optionLabel: String(params['OptionLabel'] || NP_L('Рваная одежда', "Torn clothing")),
        thr: String(params['Thresholds'] || '4,10,18').split(',').map(function(s) { return Number(s) || 0; }),
        hit: num(params['HitPoints'], 1),
        crit: num(params['CritPoints'], 2),
        sex: num(params['SexPoints'], 3),
        big: num(params['BigHitPoints'], 1),
        files: String(params['LevelFiles'] || 't1,t2,t3').split(',').map(function(s) { return s.trim(); }),
        log: String(params['BattleLog'] || 'true') === 'true'
    };
    $.P = P;
    var ACTOR = 2, ARMOR = 82, SLOT = 1, GALLERY = 5, STYPE_SEX = 6;
    var CE_REST = [474, 325];
    var RE = /^stand-heroine-basic-cloth82-([0-3])(?:-t[0-9a-z]+)?$/;
    var MAXLV = 3;

    function st() {
        if (!$gameSystem) return { pts: 0, lv: 0, off: false };
        var s = $gameSystem._npClothDmg;
        if (!s || typeof s !== 'object') s = $gameSystem._npClothDmg = { pts: 0, lv: 0, off: false };
        return s;
    }
    $.state = st;
    function gallery() { return !!($gameSwitches && $gameSwitches.value(GALLERY)); }
    $.isEnabled = function() { return !!ConfigManager.npClothDamage; };
    $.heroine = function() { return $gameActors ? $gameActors.actor(ACTOR) : null; };
    $.wearing = function() {
        var a = $.heroine(); if (!a) return false;
        var e = a.equips()[SLOT];
        return !!(e && e.id === ARMOR && DataManager.isArmor(e));
    };
    $.active = function() { return $.isEnabled() && !gallery() && $.wearing(); };
    $.level = function() { return $.active() ? Math.max(0, Math.min(MAXLV, st().lv | 0)) : 0; };

    // ---- file existence ---------------------------------------------------
    var _exists = {};
    $.fileExists = function(name) {
        if (_exists[name] !== undefined) return _exists[name];
        var r = true;
        try {
            if (Utils.isNwjs()) {
                var fs = require('fs'), path = require('path');
                var base = path.dirname(process.mainModule.filename);
                r = fs.existsSync(path.join(base, 'img/pictures/' + name + '.png')) ||
                    fs.existsSync(path.join(base, 'img/pictures/' + name + '.rpgmvp'));
            } else if (typeof XMLHttpRequest !== 'undefined') {
                var x = new XMLHttpRequest();
                x.open('HEAD', 'img/pictures/' + encodeURIComponent(name) + '.png', false);
                x.send(); r = x.status >= 200 && x.status < 400;
            }
        } catch (e) { r = false; }
        return (_exists[name] = r);
    };
    // имя картинки для показа (base → torn), иначе — как есть
    $.mapName = function(name) {
        if (typeof name !== 'string') return name;
        var m = RE.exec(name); if (!m) return name;
        var base = 'stand-heroine-basic-cloth82-' + m[1];
        var lv = $.level();
        if (lv <= 0) return base;
        var suf = P.files[lv - 1];
        if (!suf) return base;
        var torn = base + '-' + suf;
        return $.fileExists(torn) ? torn : base;
    };
    $.refreshPictures = function() {
        if (!$gameScreen || !$gameScreen._pictures) return;
        $gameScreen._pictures.forEach(function(p) {
            if (p && p._name && RE.test(p._name)) {
                var n = $.mapName(p._name);
                if (n !== p._name) p._name = n;
            }
        });
    };

    // ---- level changes ------------------------------------------------------
    function levelFor(pts) {
        var lv = 0;
        for (var i = 0; i < P.thr.length && i < MAXLV; i++) if (P.thr[i] > 0 && pts >= P.thr[i]) lv = i + 1;
        return lv;
    }
    $.addPoints = function(n) {
        if (!(n > 0) || !$.active()) return 0;
        var s = st(), old = s.lv | 0;
        s.pts = (s.pts | 0) + n;
        s.lv = Math.max(old, levelFor(s.pts));
        if (s.lv !== old) {
            $.refreshPictures();
            if (P.log && $gameParty && $gameParty.inBattle() && BattleManager._logWindow) {
                var a = $.heroine();
                var txt = s.lv >= 3 ? NP_L('Облачение %1 превратилось в лохмотья!', "%1's vestments have been reduced to rags!") :
                          s.lv === 2 ? NP_L('Облачение %1 рвётся ещё сильнее!', "%1's vestments tear even further!") : NP_L('Облачение %1 надорвано!', "%1's vestments have been torn!");
                try { BattleManager._logWindow.push('addText', txt.replace('%1', a ? a.name() : '')); } catch (e) {}
            }
        }
        return s.lv;
    };
    $.set = function(lv) {
        var s = st(); s.lv = Math.max(0, Math.min(MAXLV, lv | 0));
        s.pts = s.lv > 0 ? (P.thr[s.lv - 1] || 0) : 0;
        $.refreshPictures(); return s.lv;
    };
    $.reset = function() { var s = st(); s.pts = 0; s.lv = 0; $.refreshPictures(); };

    // ---- picture hook --------------------------------------------------------
    var _GP_show = Game_Picture.prototype.show;
    Game_Picture.prototype.show = function(name) {
        if (typeof name === 'string' && RE.test(name)) {
            var args = Array.prototype.slice.call(arguments);
            try { args[0] = $.mapName(name); } catch (e) { args[0] = name; }
            return _GP_show.apply(this, args);
        }
        return _GP_show.apply(this, arguments);
    };

    // ---- battle hooks ----------------------------------------------------------
    function isSexSkill(item) {
        if (!item || !DataManager.isSkill(item)) return false;
        return item.stypeId === STYPE_SEX || /<NP_ClothTear>/i.test(item.note || '');
    }
    var _GA_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        _GA_apply.apply(this, arguments);
        try {
            if (!$gameParty.inBattle() || !target || !target.isActor() || target.actorId() !== ACTOR) return;
            var subj = this.subject();
            if (!subj || !subj.isEnemy()) return;
            if (!$.active()) return;
            var r = target.result(), pts = 0;
            if (r && r.isHit()) {
                if (r.hpDamage > 0) {
                    pts += P.hit;
                    if (r.critical) pts += P.crit;
                    if (target.mhp > 0 && r.hpDamage >= target.mhp * 0.25) pts += P.big;
                }
                if (isSexSkill(this.item())) pts += P.sex;
            }
            if (pts > 0) $.addPoints(pts);
        } catch (e) { if (typeof console !== 'undefined') console.warn('NP_ClothDamage', e); }
    };

    // ---- rest (CE474 camp / CE325 sleep) ----------------------------------------
    function isRestList(list) {
        if (!list || typeof $dataCommonEvents === 'undefined' || !$dataCommonEvents) return false;
        for (var i = 0; i < CE_REST.length; i++) {
            var ce = $dataCommonEvents[CE_REST[i]];
            if (ce && ce.list === list) return true;
        }
        return false;
    }
    function onRest() { try { if (!gallery() && (st().lv || st().pts)) $.reset(); } catch (e) {} }
    var _GI_setup = Game_Interpreter.prototype.setup;
    Game_Interpreter.prototype.setup = function(list) {
        if (isRestList(list)) onRest();
        return _GI_setup.apply(this, arguments);
    };
    var _GI_setupChild = Game_Interpreter.prototype.setupChild;
    Game_Interpreter.prototype.setupChild = function(list) {
        if (isRestList(list)) onRest();
        return _GI_setupChild.apply(this, arguments);
    };

    // ---- re-equip ----------------------------------------------------------------
    var _GAct_refresh = Game_Actor.prototype.refresh;
    Game_Actor.prototype.refresh = function() {
        _GAct_refresh.apply(this, arguments);
        try {
            if (this.actorId() !== ACTOR || !$gameSystem || !$gameParty || $gameParty.inBattle()) return;
            var s = $gameSystem._npClothDmg; if (!s) return;
            var e = this.equips()[SLOT], on = !!(e && e.id === ARMOR && DataManager.isArmor(e));
            if (!on) { if (s.lv || s.pts) s.off = true; }
            else if (s.off) { s.off = false; s.pts = 0; s.lv = 0; $.refreshPictures(); }
        } catch (e2) {}
    };

    // ---- Config / Options ----------------------------------------------------------
    ConfigManager.npClothDamage = P.enabled;
    var _Config_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _Config_makeData.apply(this, arguments);
        config.npClothDamage = this.npClothDamage;
        return config;
    };
    var _Config_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _Config_applyData.apply(this, arguments);
        this.npClothDamage = (config && config.npClothDamage !== undefined) ? !!config.npClothDamage : P.enabled;
    };
    if (P.optionLabel && typeof Window_Options !== 'undefined') {
        var _Opt_addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Opt_addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npClothDamage');
        };
        var _Opt_setValue = Window_Options.prototype.setConfigValue;
        Window_Options.prototype.setConfigValue = function(symbol, volume) {
            _Opt_setValue.apply(this, arguments);
            if (symbol === 'npClothDamage') { try { $.refreshPictures(); } catch (e) {} }
        };
    }
    // после загрузки сейва — привести показанную картинку к текущему уровню
    var _GS_onAfterLoad = Game_System.prototype.onAfterLoad;
    Game_System.prototype.onAfterLoad = function() {
        _GS_onAfterLoad.apply(this, arguments);
        try { $.refreshPictures(); } catch (e) {}
    };
})(NP_ClothDamage);
