var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_UIColors.js  (RU mod)
//=============================================================================
/*:
 * @plugindesc [RU mod] Unified colour scheme: quests, inventory, shop, logs. Option «Цветное оформление».
 * @author RU mod
 *
 * @help
 * One dark-fantasy palette for the whole UI. Nothing in CSV / data is
 * rewritten — every colour is applied while drawing:
 *
 *  1. Role colours. NP_UIColors.ROLES (name -> hex). Each role also has an
 *     escape code \c[900+n] (NP_UIColors.code('lust') etc.), so other plugins
 *     may write NP_UIColors.esc('stress') + 'text'.
 *  2. Palette retune. Common \c[n] indices are remapped to the palette in all
 *     windows except dialogue (Window_Message / choices / scrolling text keep
 *     the author's colours): 2 story ember, 6 highlight, 7/8 ash, 16 labels
 *     (systemColor), 17 gold, 18 blood red, 24 positive, 25 negative,
 *     27 lust pink, 29 tutorial teal.
 *  3. Item names (YEP_ItemCore setItemTextColor): item kind / equipment
 *     quality — see NP_UIColors.classify(item). Ordinary armor tier comes
 *     from the base price (ARMOR_PRICE_BANDS 1000/3500/6000/15000). An explicit non-zero
 *     <Text Color: x> notetag still wins.
 *  4. Quest journal: titles by type (story / side / tutorial), completed
 *     greyed, labels, «Выполнено!», gold rewards, hint line, stars.
 *  5. ▲▼ comparisons: powerUp / powerDown colours.
 *
 * Option «Цветное оформление» / «Coloured UI» (Interface). OFF = vanilla.
 * Load after YEP_ItemCore, KNS_QuestBase, NP_QuestHints, NP_QuestTabs,
 * NP_ShopCompare; before NP_OptionsCategories.
 */
var NP_UIColors = NP_UIColors || {};
(function($) {
    'use strict';

    //-------------------------------------------------------------------------
    // Palette
    //-------------------------------------------------------------------------
    $.ROLES = {
        // text
        text:       '#ffffff',  // значения
        label:      '#dcbc7c',  // подписи / заголовки (systemColor)
        highlight:  '#ffe08a',  // выделение (\c[6])
        muted:      '#bdb3a5',  // второстепенное (\c[8])
        ash:        '#948b7f',  // прошедшее / неактивное (\c[7])
        positive:   '#8fe08a',  // бафф / ▲ / «Выполнено!»
        negative:   '#ff6a5a',  // дебафф / ▼
        gold:       '#ffd65a',  // золото / валюта (\c[17])
        danger:     '#ff4f45',  // опасность (\c[18])
        // quests
        qStory:     '#ff9a5c',  // сюжет (\c[2])
        qSide:      '#f1e6d2',  // побочные
        qTutorial:  '#6fd6c2',  // обучение / особые (\c[29])
        qDone:      '#948b7f',  // выполненные
        qDoneStory: '#b98a6c',  // выполненные сюжетные
        qHint:      '#9fcdf0',  // подсказка «Куда идти»
        star:       '#f2c94c',  // звёзды сложности
        // items
        iConsumable:'#8fe3b8',  // расходники (зелья, травы)
        iFood:      '#e9cd95',  // еда и напитки
        iTool:      '#b9cbe0',  // снаряжение для приключений
        iBook:      '#84d4f0',  // книги (навыки, характеристики), чертежи
        iMaterial:  '#c4b8a4',  // материалы
        iJunk:      '#8a8278',  // хлам
        iUnknown:   '#b0a4d6',  // неопознанное
        iGift:      '#ffae8c',  // подарки
        iValuable:  '#ffd65a',  // ценности (билеты казино)
        iLewd:      '#ff86c8',  // взрослое (игрушки, фото, «тайные» вещи)
        iLingerie:  '#f6b3d8',  // бельё и чулки
        iQuest:     '#ffb47a',  // квестовые предметы
        iStory:     '#ff9a5c',  // сюжетные предметы
        iKey:       '#f2d27a',  // ключевые предметы
        // equipment quality (★ tier, + enchantments)
        r1:         '#ece4d4',  // обычное
        r2:         '#9fd66e',  // добротное
        r3:         '#6fa8ff',  // редкое
        r4:         '#c48cff',  // эпическое
        r5:         '#ffa94a',  // легендарное
        rUnique:    '#f2d27a',  // уникальное / именное
        // mechanics
        stress:     '#f0a030',  // напряжение
        breakdown:  '#ff4f45',  // срыв
        virtue:     '#ffd25a',  // добродетель
        lust:       '#ff86c8',  // похоть (\c[27])
        love:       '#ff5a78'   // любовь
    };
    $.NAMES_RU = {
        text: 'Значения', label: 'Подписи и заголовки', highlight: 'Выделение', muted: 'Второстепенное',
        ash: 'Неактивное / прошлое', positive: 'Бафф / ▲ / выполнено', negative: 'Дебафф / ▼', gold: 'Золото / валюта',
        danger: 'Опасность', qStory: 'Сюжетное задание', qSide: 'Побочное задание', qTutorial: 'Обучение',
        qDone: 'Выполненное', qDoneStory: 'Выполненное сюжетное', qHint: 'Подсказка «Куда идти»', star: 'Звёзды сложности',
        iConsumable: 'Расходники', iFood: 'Еда и напитки', iTool: 'Снаряжение', iBook: 'Книги и чертежи',
        iMaterial: 'Материалы', iJunk: 'Хлам', iUnknown: 'Неопознанное', iGift: 'Подарки', iValuable: 'Ценности',
        iLewd: 'Взрослое', iLingerie: 'Бельё и чулки', iQuest: 'Квестовые предметы', iStory: 'Сюжетные предметы',
        iKey: 'Ключевые предметы', r1: '★ Обычное', r2: '★★ Добротное', r3: '★★★ Редкое', r4: '★★★★ Эпическое',
        r5: '★★★★★ Легендарное', rUnique: 'Уникальное / именное', stress: 'Напряжение', breakdown: 'Срыв',
        virtue: 'Добродетель', lust: 'Похоть', love: 'Любовь'
    };
    var KEYS = Object.keys($.ROLES), CODE = {}, BY_CODE = {};
    KEYS.forEach(function(k, i) { CODE[k] = 900 + i; BY_CODE[900 + i] = k; });
    $.code = function(role) { return CODE[role] || 0; };
    $.esc = function(role) { return '\\c[' + $.code(role) + ']'; };
    $.color = function(role) { return $.ROLES[role] || '#ffffff'; };
    $.on = function() { return ConfigManager.npUIColors !== false; };

    // \c[n] retune (dialogue windows excluded)
    $.REMAP = { 2: 'qStory', 6: 'highlight', 7: 'ash', 8: 'muted', 16: 'label', 17: 'gold', 18: 'danger',
                24: 'positive', 25: 'negative', 27: 'lust', 29: 'qTutorial' };

    //-------------------------------------------------------------------------
    // Item classification (by database id; independent items use baseItemId)
    //-------------------------------------------------------------------------
    // $dataItems sections (header item ids of the database):
    $.ITEM_RANGES = [
        [1,    59,   'iConsumable'],  // ☆消耗アイテム   potions, herbs
        [60,   129,  'iTool'],        // ☆冒険アイテム   torches, ropes, tents…
        [130,  147,  'iBook'],        // ▼ステータス変動 stat books
        [148,  149,  'iJunk'],        // ▼トラッシュ
        [150,  200,  'iFood'],        // ▼食い物系
        [201,  299,  'iUnknown'],     // ☆未鑑定品      ??? items
        [300,  429,  'iMaterial'],    // ☆一般アイテム  materials, loot
        [430,  459,  'iGift'],        // 【プレゼント】
        [460,  479,  'iLewd'],        // 【おもちゃ系】
        [480,  499,  'iQuest'],       // 【謎アイテム】  (lewd ones below)
        [500,  649,  'iQuest'],       // 【クエストアイテム】
        [650,  699,  'iLewd'],        // 【思い出アイテム】 memory photos
        [700,  899,  'iKey'],         // 【キーアイテム】, 【冒険者タグ】
        [900,  997,  'iStory'],       // 【ストーリー上重要なアイテム】, 旧ストーリー
        [998,  999,  'iKey'],         // patch viewer / cheat god
        [1000, 1299, 'iBook'],        // 【スキル書】
        [1300, 1499, 'iBook']         // 【ブループリントとレシピ】
    ];
    $.ITEM_IDS = {
        30: 'iLewd', 43: 'iLewd', 46: 'iLewd', 49: 'iLewd',            // milking potion, bottle, lust perfume, poison pink
        131: 'iLewd', 134: 'iLewd',                                    // lewd books
        424: 'iJunk', 425: 'r1', 426: 'r2', 427: 'r3', 428: 'r5',      // artifacts by grade
        456: 'iValuable', 458: 'iValuable',                            // casino tickets
        481: 'iLewd', 482: 'iLewd', 489: 'iLewd', 490: 'iLewd', 493: 'iLewd', 498: 'iLewd',
        495: 'iKey', 496: 'iKey'                                       // letters
    };
    // weapons: base tier by section
    $.WEAPON_RANGES = [
        [1, 20, 1], [21, 40, 2], [41, 60, 3], [61, 80, 4], [81, 97, 5], [98, 99, 'rUnique'],
        [100, 109, 1], [110, 119, 2], [120, 129, 3], [130, 139, 4], [140, 199, 5],
        [200, 299, 'rUnique'],                              // character weapons (Leon, Iris, …)
        [300, 309, 1], [310, 319, 2], [320, 329, 3], [330, 339, 4], [340, 350, 5],
        [351, 399, 'rUnique'],                              // unique drop bases
        [400, 449, 3]                                       // crafted
    ];
    // armors
    $.ARMOR_RANGES = [
        [59, 76, 'rUnique'],      // ☆プレイヤー防具[（ユニーク）]
        [400, 549, 'rUnique'],    // [ユニーク防具]
        [101, 139, 'iLingerie']   // heroine tights / underwear
    ];
    // ordinary armors: base tier by the BASE armor's shop price (bands chosen
    // from the Armors.json price distribution, quintiles ≈ 150/1200/3600/5000):
    //  ★ < 1000  cloth, soft leather, wooden shields, companion outfits
    //  ★★ < 3500  charms, hard leather, leather round shield
    //  ★★★ < 6000  charms+1, chain mail, status pendants, leather tower shield
    //  ★★★★ < 15000 gambeson, plate, iron shields
    //  ★★★★★ ≥ 15000 dwarven armor, brigandine, protection pendants
    // price 0 or ≥ 999999 (not for sale / special) → ★
    $.ARMOR_PRICE_BANDS = [1000, 3500, 6000, 15000];
    $.armorPriceTier = function(item) {
        var id = item.baseItemId || item.id;
        var src = ($dataArmors && $dataArmors[id]) || item;
        var price = src.price || 0;
        if (price <= 0 || price >= 999999) return 1;
        var t = 1;
        for (var i = 0; i < $.ARMOR_PRICE_BANDS.length; i++) if (price >= $.ARMOR_PRICE_BANDS[i]) t = i + 2;
        return t;
    };
    $.NEGATIVE_AFFIX = /^(Слабый|Гнилой|Weak|Rotten|貧弱|腐敗)\b/;
    var inRanges = function(ranges, id) {
        for (var i = 0; i < ranges.length; i++) if (id >= ranges[i][0] && id <= ranges[i][1]) return ranges[i][2];
        return null;
    };
    var affixNames = null;
    var buildAffixNames = function() {
        affixNames = {};
        [[$dataWeapons, 451, 599], [$dataArmors, 0, -1]].forEach(function(r) {
            for (var i = r[1]; i <= r[2] && r[0] && i < r[0].length; i++) {
                var x = r[0][i]; if (x && x.name) affixNames[x.name.trim()] = true;
            }
        });
    };
    // number of positive affixes in an independent (DreamX) weapon/armor name
    $.affixCount = function(item) {
        if (!item || !item.baseItemId || !item.name) return 0;
        if (!affixNames) buildAffixNames();
        var n = 0, name = item.name.trim();
        if (/\[[^\]]+\]\s*$/.test(name) || /［[^］]+］\s*$/.test(name)) n++;            // [Синий Ур.2] gem suffix
        var first = name.split(/\s+/)[0];
        if (first && first !== name && (affixNames[first] || /\D\d$/.test(first)) && !$.NEGATIVE_AFFIX.test(name)) n++;
        return n;
    };
    $.classify = function(item) {
        if (!item) return null;
        var id = item.baseItemId || item.id;
        if (DataManager.isItem(item)) {
            return $.ITEM_IDS[id] || inRanges($.ITEM_RANGES, id) || (item.itypeId === 2 ? 'iKey' : null);
        }
        var isW = DataManager.isWeapon(item), isA = DataManager.isArmor(item);
        if (!isW && !isA) return null;
        var base = inRanges(isW ? $.WEAPON_RANGES : $.ARMOR_RANGES, id);
        if (typeof base === 'string') return base;
        if (isA && (item.etypeId === 4 || item.etypeId === 5)) return 'iLingerie';
        if (!base && isA) base = $.armorPriceTier(item);
        var tier = (base || 1) + $.affixCount(item);
        return 'r' + Math.max(1, Math.min(5, tier));
    };

    //-------------------------------------------------------------------------
    // Option
    //-------------------------------------------------------------------------
    ConfigManager.npUIColors = true;
    var _make = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var c = _make.apply(this, arguments);
        c.npUIColors = this.npUIColors;
        return c;
    };
    var _apply = ConfigManager.applyData;
    ConfigManager.applyData = function(c) {
        _apply.apply(this, arguments);
        this.npUIColors = !(c && c.npUIColors === false);
    };
    var _addGen = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() {
        _addGen.apply(this, arguments);
        this.addCommand(NP_L('Цветное оформление', 'Coloured UI'), 'npUIColors');
    };
    var _bootStart = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        if (window.NP_OptionsCategories && NP_OptionsCategories.register) NP_OptionsCategories.register('npUIColors', 'ui');
        _bootStart.apply(this, arguments);
    };

    //-------------------------------------------------------------------------
    // Core colours
    //-------------------------------------------------------------------------
    var isDialogue = function(w) {
        return w instanceof Window_Message || w instanceof Window_ChoiceList ||
               w instanceof Window_ScrollText || (typeof Window_NumberInput !== 'undefined' && w instanceof Window_NumberInput);
    };
    var _textColor = Window_Base.prototype.textColor;
    Window_Base.prototype.textColor = function(n) {
        if (BY_CODE[n]) return $.ROLES[BY_CODE[n]];
        if ($.REMAP[n] && $.on() && !isDialogue(this)) return $.ROLES[$.REMAP[n]];
        return _textColor.apply(this, arguments);
    };
    var _powerDown = Window_Base.prototype.powerDownColor;
    Window_Base.prototype.powerDownColor = function() {
        return $.on() ? $.ROLES.negative : _powerDown.apply(this, arguments);
    };
    var _powerUp = Window_Base.prototype.powerUpColor;
    Window_Base.prototype.powerUpColor = function() {
        return $.on() ? $.ROLES.positive : _powerUp.apply(this, arguments);
    };
    var _drawCurrency = Window_Base.prototype.drawCurrencyValue;
    Window_Base.prototype.drawCurrencyValue = function(value, unit, x, y, width) {
        if (!$.on()) return _drawCurrency.apply(this, arguments);
        var unitWidth = Math.min(80, this.textWidth(unit));
        this.resetTextColor();
        this.drawText(value, x, y, width - unitWidth - 6, 'right');
        this.changeTextColor($.ROLES.gold);
        this.drawText(unit, x + width - unitWidth, y, unitWidth, 'right');
        this.resetTextColor();
    };

    // item names (YEP_ItemCore hook; vanilla fallback below)
    if (Window_Base.prototype.setItemTextColor) {
        var _setItc = Window_Base.prototype.setItemTextColor;
        Window_Base.prototype.setItemTextColor = function(item) {
            _setItc.apply(this, arguments);
            if (!item || (item.textColor !== undefined && Number(item.textColor) !== 0) || !$.on() || isDialogue(this)) return;   // YEP default 0 = not set
            var role = $.classify(item);
            if (role) this._resetTextColor = CODE[role];
        };
    } else {
        var _drawItemName = Window_Base.prototype.drawItemName;
        Window_Base.prototype.drawItemName = function(item, x, y, width) {
            var role = item && $.on() ? $.classify(item) : null;
            if (!role) return _drawItemName.apply(this, arguments);
            var reset = this.resetTextColor, self = this;
            this.resetTextColor = function() { self.changeTextColor($.ROLES[role]); };
            try { _drawItemName.apply(this, arguments); } finally { this.resetTextColor = reset; this.resetTextColor(); }
        };
    }

    //-------------------------------------------------------------------------
    // Quest journal (KNS_QuestBase / NP_QuestTabs / NP_QuestHints)
    //-------------------------------------------------------------------------
    $.questType = function(item) {
        if (window.NP_QuestTabs && NP_QuestTabs.typeOf) return NP_QuestTabs.typeOf(item.id);
        var m = /^\s*\\c\[(\d+)\]/i.exec(item.title || '');
        return m ? (m[1] === '2' ? 'main' : 'tutorial') : 'side';
    };
    $.questTitle = function(item, greyDone) {
        var type = $.questType(item);
        var plain = String(item.title || '').replace(/\\c\[\d+\]/gi, '');
        var role = type === 'main' ? 'qStory' : type === 'tutorial' ? 'qTutorial' : 'qSide';
        if (greyDone && typeof KNS_QuestBase !== 'undefined' && KNS_QuestBase.is_quest_done(item.id)) {
            role = type === 'main' ? 'qDoneStory' : 'qDone';
        }
        return $.esc(role) + plain;
    };
    var withTextExFilter = function(win, fn, filter) {
        var orig = win.drawTextEx;
        win.drawTextEx = function(text) {
            var a = Array.prototype.slice.call(arguments);
            a[0] = filter(text);
            return orig.apply(this, a);
        };
        try { return fn(); } finally { win.drawTextEx = orig; }
    };

    if (typeof KNS_QuestBase !== 'undefined' && typeof Window_KNSQuestList !== 'undefined') {
        // stars
        var starOrig = KNS_QuestBase.StarQuestColor;
        Object.defineProperty(KNS_QuestBase, 'StarQuestColor', {
            configurable: true,
            get: function() { return $.on() ? [$.ROLES.star, '#3a2a08'] : starOrig; },
            set: function(v) { starOrig = v; }
        });
        // list titles
        var _listDraw = Window_KNSQuestList.prototype.drawItem;
        Window_KNSQuestList.prototype.drawItem = function(index) {
            var item = this._data[index], self = this;
            if (!item || !$.on()) return _listDraw.apply(this, arguments);
            var args = arguments;
            return withTextExFilter(this, function() { return _listDraw.apply(self, args); }, function(t) {
                return t === item.title ? $.questTitle(item, true) : t;
            });
        };
        // detail: title, labels, «done», rewards, hint
        var D = Window_KNSQuestDetail.prototype;
        var _title = D.knsDrawTitle;
        D.knsDrawTitle = function() {
            var item = this._data, self = this;
            if (!item || !$.on()) return _title.apply(this, arguments);
            return withTextExFilter(this, function() { return _title.call(self); }, function(t) {
                return t.indexOf(item.title) >= 0 ? t.replace(item.title, $.questTitle(item, false)) : t;
            });
        };
        var _header = D.knsDrawHeader;
        D.knsDrawHeader = function() {
            if (!$.on()) return _header.apply(this, arguments);
            this.changeTextColor($.ROLES.label);
            _header.apply(this, arguments);
            this.resetTextColor();
        };
        var _allProg = D.knsDrawAllProgress;
        D.knsDrawAllProgress = function() {
            if (!$.on()) return _allProg.apply(this, arguments);
            var tc = this.textColor, self = this;
            this.textColor = function(n) { return n === 2 ? $.ROLES.positive : tc.call(self, n); };   // «Выполнено!»
            try { return _allProg.apply(this, arguments); } finally { delete this.textColor; }
        };
        var _rewards = D.knsDrawRewards;
        D.knsDrawRewards = function() {
            if (!$.on()) return _rewards.apply(this, arguments);
            var self = this, args = arguments;
            return withTextExFilter(this, function() { return _rewards.apply(self, args); }, function(t) {
                return String(t).replace('\\c[16]', $.esc('gold'));
            });
        };
        var _auto = D.knsDrawTextAutoline;
        if (_auto) D.knsDrawTextAutoline = function(text) {
            if ($.on() && typeof text === 'string' && text.indexOf('\\c[24]') === 0) {        // NP_QuestHints line
                var a = Array.prototype.slice.call(arguments);
                a[0] = $.esc('qHint') + text.slice(6);
                return _auto.apply(this, a);
            }
            return _auto.apply(this, arguments);
        };
        // NP_QuestTabs tab captions
        if (typeof Window_NpQuestTabs !== 'undefined') {
            var _tabDraw = Window_NpQuestTabs.prototype.drawItem;
            Window_NpQuestTabs.prototype.drawItem = function(index) {
                if (!$.on()) return _tabDraw.apply(this, arguments);
                var role = ['qStory', 'qSide', 'muted'][index], self = this;
                this.resetTextColor = function() { self.changeTextColor($.ROLES[role]); };
                try { return _tabDraw.apply(this, arguments); } finally { delete this.resetTextColor; this.resetTextColor(); }
            };
        }
    }
})(NP_UIColors);
