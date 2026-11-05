var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_QuestTabs.js  (RU mod)
//=============================================================================
/*:
 * @plugindesc [RU mod] Quest journal tabs: «Сюжет» / «Побочные» / «Выполненные» with counters.
 * @author RU mod
 *
 * @help
 * Replaces the two KNS journal tabs (In progress / Solved) with three:
 *   0 «Сюжет» / Story       — active main-story quests
 *   1 «Побочные» / Side     — active side quests (tutorials included)
 *   2 «Выполненные» / Completed — all finished quests: story first, then side;
 *     story quests carry a small «Сюжет» tag, tutorials an «Обучение» tag.
 * Counters in the tab names, a friendly line in an empty tab.
 * Only the journal scene (Scene_KNSQuest) uses the new windows; the quest
 * board (KNS_QuestReceive), the HUD and the quest markers are untouched.
 * KNS files and QuestList.csv are not modified.
 *
 * Classification table: NP_QuestTabs.TABLE (id ranges) + NP_QuestTabs.IDS
 * (single ids). Anything not listed is a side quest.
 * Load after KNS_Quest plugins, NP_QuestMarker, NP_YarizoQuest and NP_QuestHints, before NP_OptionsCategories.
 */
var NP_QuestTabs = NP_QuestTabs || {};
(function($) {
    'use strict';
    if (typeof Window_KNSQuestCategory === 'undefined' || typeof Window_KNSQuestList === 'undefined' ||
        typeof Scene_KNSQuest === 'undefined' || typeof KNS_QuestBase === 'undefined') {
        console.warn('[NP_QuestTabs] KNS_QuestBase not found — disabled');
        return;
    }

    //-------------------------------------------------------------------------
    // Classification table
    //   'main'     — story (titles in QuestList.csv start with \c[2])
    //   'tutorial' — the 6 \c[29] quests (client «Обучение»/チュートリアル): game
    //                hints (rank-2 goal, party menu, solo mode, companion, camp,
    //                cheat god). Not story → shown with side quests, tagged.
    //   'side'     — everything else (guild boards, NPC requests, our 201090)
    //-------------------------------------------------------------------------
    $.TABLE = [
        // [from id, to id, type]
        [900000, 999999, 'main'],     // 9001xx prologue/capital, 9002xx rank 2, 9003xx rank 3, 90035x Iris arc
        [1,      99,     'tutorial']  // 1-5, 11
    ];
    $.IDS = {
        // single-id overrides: id: type
        201090: 'side'                // «Наёмник из таверны» (NP_YarizoQuest)
    };
    $.typeOf = function(id) {
        id = Number(id) || 0;
        if ($.IDS[id]) return $.IDS[id];
        for (var i = 0; i < $.TABLE.length; i++) {
            var r = $.TABLE[i];
            if (id >= r[0] && id <= r[1]) return r[2];
        }
        return 'side';
    };
    $.isMain = function(id) { return $.typeOf(id) === 'main'; };

    $.TAB_STORY = 0; $.TAB_SIDE = 1; $.TAB_DONE = 2;
    $.tabName = function(tab) {
        return [NP_L('Сюжет', 'Story'), NP_L('Побочные', 'Side'), NP_L('Выполненные', 'Completed')][tab] || '';
    };
    $.emptyText = function(tab) {
        return [
            NP_L('Сюжетных заданий сейчас нет.', 'No story quests right now.'),
            NP_L('Побочных заданий нет. Загляните на доску в гильдии.', 'No side quests. Check the guild board.'),
            NP_L('Выполненных заданий пока нет.', 'No completed quests yet.')
        ][tab] || '';
    };
    $.tagText = function(type) {
        if (type === 'main') return NP_L('Сюжет', 'Story');
        if (type === 'tutorial') return NP_L('Обучение', 'Tutorial');
        return '';
    };
    $.tagColor = function(type) { return type === 'main' ? 2 : 29; };

    // quests of a tab, in display order
    $.list = function(tab, all) {
        all = all || Object.values($csvQuestList || {});
        var vis = all.filter(function(item) {
            return item && item.id !== 0 && !KNS_QuestBase.is_quest_unreleased(item.id);
        });
        if (tab === $.TAB_DONE) {
            var done = vis.filter(function(item) { return KNS_QuestBase.is_quest_done(item.id); });
            // story first, then side, finished tutorials last; journal order inside each group
            var rank = function(id) { var t = $.typeOf(id); return t === 'main' ? 0 : t === 'tutorial' ? 2 : 1; };
            return done.map(function(item, i) { return [item, i]; }).sort(function(a, b) {
                var ra = rank(a[0].id), rb = rank(b[0].id);
                return (ra - rb) || (a[1] - b[1]);
            }).map(function(p) { return p[0]; });
        }
        return vis.filter(function(item) {
            if (KNS_QuestBase.is_quest_done(item.id)) return false;
            return (tab === $.TAB_STORY) === $.isMain(item.id);
        });
    };
    $.counts = function() {
        var all = Object.values($csvQuestList || {});
        return [$.list(0, all).length, $.list(1, all).length, $.list(2, all).length];
    };

    //-------------------------------------------------------------------------
    // Category window (3 tabs)
    //-------------------------------------------------------------------------
    class Window_NpQuestTabs extends Window_KNSQuestCategory {
        maxItems() { return 3; }
        maxCols() { return 3; }
        refresh() {
            try { this._npCounts = $.counts(); } catch (e) { this._npCounts = null; }
            super.refresh();
        }
        drawItem(index) {
            var rect = this.itemRectForText(index);
            var name = $.tabName(index);
            if (this._npCounts) name += ' (' + this._npCounts[index] + ')';
            this.resetTextColor();
            this.drawText(name, rect.x, rect.y, rect.width, 'center');
        }
    }
    window.Window_NpQuestTabs = Window_NpQuestTabs;

    //-------------------------------------------------------------------------
    // List window
    //-------------------------------------------------------------------------
    class Window_NpQuestTabList extends Window_KNSQuestList {
        makeItemList() {
            this._data = this._categoryId >= 0 ? $.list(this._categoryId, this._allData) : [];
        }
        refresh() {
            super.refresh();
            if (this._data.length === 0 && this._categoryId >= 0) {
                this.changeTextColor(this.textColor(8));
                var w = this.contents.width - 8;
                var y = 8;
                this.knsWrap($.emptyText(this._categoryId), w).forEach(function(line) {
                    this.drawText(line, 4, y, w, 'center');
                    y += this.lineHeight();
                }, this);
                this.resetTextColor();
            }
        }
        knsWrap(text, w) {
            var words = String(text).split(' '), lines = [], cur = '';
            words.forEach(function(word) {
                var t = cur ? cur + ' ' + word : word;
                if (cur && this.textWidth(t) > w) { lines.push(cur); cur = word; } else cur = t;
            }, this);
            if (cur) lines.push(cur);
            return lines;
        }
        drawItem(index) {
            super.drawItem(index);
            var item = this._data[index];
            if (!item) return;
            var type = $.typeOf(item.id);
            var showTag = (type === 'main' && this._categoryId === $.TAB_DONE) || type === 'tutorial' && this._categoryId !== $.TAB_STORY;
            if (!showTag) return;
            var rect = this.itemRectForText(index);
            var x = rect.x;
            this.contents.fontSize = 14;
            if (this._knsBookmarkList.includes(item.id)) {
                x += this.textWidth($LogSheetCSV.Get('Quest Navi Bookmarked')) + 6;
            }
            var tag = (type === 'main' ? '★ ' : '') + $.tagText(type);
            this.changeTextColor(this.textColor($.tagColor(type)));
            this.drawText(tag, x, rect.y + 22, rect.width - (x - rect.x));
            this.contents.fontSize = this.standardFontSize();
            this.resetTextColor();
        }
    }
    window.Window_NpQuestTabList = Window_NpQuestTabList;

    //-------------------------------------------------------------------------
    // Journal scene only
    //-------------------------------------------------------------------------
    Scene_KNSQuest.prototype.knsGetCategoryWindow = function() { return new Window_NpQuestTabs(); };
    Scene_KNSQuest.prototype.knsGetListWindow = function(x, y, w, h) { return new Window_NpQuestTabList(x, y, w, h); };
    var _catOk = Scene_KNSQuest.prototype.knsOnCategoryOk;
    Scene_KNSQuest.prototype.knsOnCategoryOk = function() {
        if (this._knsListWindow.maxItems() === 0) {
            SoundManager.playBuzzer();
            this._knsCategoryWindow.activate();
            return;
        }
        return _catOk.apply(this, arguments);
    };
    // counters may change after "retire"/bookmark actions
    var _naviOk = Scene_KNSQuest.prototype.knsOnNaviListOk;
    Scene_KNSQuest.prototype.knsOnNaviListOk = function() {
        _naviOk.apply(this, arguments);
        this._knsCategoryWindow.refresh();
    };
})(NP_QuestTabs);
