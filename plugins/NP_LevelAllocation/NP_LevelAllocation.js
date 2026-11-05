//=============================================================================
// NP_LevelAllocation.js — draft all level-up choices, then apply once.
//=============================================================================
/*:
 * @plugindesc v1.0 Распределение очков героя и Кохаку на одном экране с пояснениями.
 * @author NP RU mod
 * @help
 * Replaces common event 860 after database patches. Opens after common event 28
 * awards points. Native point variables 172/173 and addParam are preserved.
 * Keyboard: Up/Down select, Left/Right subtract/add, OK add, PageUp/PageDown
 * switch character, Escape focuses the bottom commands. Mouse/touch: + and −.
 */
var NP_LevelAllocation = window.NP_LevelAllocation = (function() {
    'use strict';
    var $ = {}, L = function(ru, en) { return window.NP_L ? window.NP_L(ru, en) : ru; };
    $.STATS = [2, 3, 4, 5, 6, 7];
    $.name = function(id) {
        return { 2: L('Сила', 'Strength'), 3: L('Выносливость', 'Endurance'), 4: L('Интеллект', 'Intellect'),
            5: L('Обаяние', 'Charm'), 6: L('Ловкость', 'Dexterity'), 7: L('Вера', 'Faith') }[id] || '';
    };
    $.description = function(id) {
        return { 2: L('Влияет на силу атаки и силовые проверки: помогает наносить физический урон и преодолевать силовые препятствия.', 'Affects attack power and strength checks: physical damage and overcoming obstacles by force.'),
            3: L('Влияет на запас HP, защиту и физические проверки. Помогает выдерживать урон и тяжёлые нагрузки.', 'Affects maximum HP, defence and physical checks. Helps withstand damage and exertion.'),
            4: L('Влияет на запас MP, магию и интеллектуальные проверки. Полезен для заклинаний и решения задач.', 'Affects maximum MP, magic and intelligence checks. Useful for spells and solving problems.'),
            5: L('Влияет на переговоры и проверки обаяния. Помогает убеждать собеседников и добиваться нужного ответа.', 'Affects negotiations and charm checks. Helps persuade others and obtain favourable responses.'),
            6: L('Влияет на взлом замков и технические проверки. Полезна для действий, требующих точности и умения.', 'Affects lockpicking and technical checks. Useful for actions requiring precision and skill.'),
            7: L('Влияет на чудеса и сопротивление отрицательным состояниям. Полезна для священных способностей и защиты.', 'Affects miracles and resistance to harmful conditions. Useful for holy abilities and protection.') }[id] || '';
    };
    $.cost = function(value) { return value <= 4 ? 1 : value <= 9 ? 2 : value <= 14 ? 3 : value <= 19 ? 4 : 5; };
    function pointsId(aid) { return 171 + aid; }
    function Model() { this.reset(); }
    $.Model = Model;
    Model.prototype.reset = function() {
        this.ids = [1, 2].filter(function(id) { return !!$gameActors.actor(id); });
        this.draft = {}; this.initial = {};
        var self = this;
        this.ids.forEach(function(id) {
            var a = $gameActors.actor(id);
            self.draft[id] = [0, 0, 0, 0, 0, 0, 0, 0];
            self.initial[id] = { points: Number($gameVariables.value(pointsId(id))) || 0,
                plus: a._paramPlus.slice(), values: $.STATS.map(function(stat) { return a.param(stat); }) };
        });
    };
    Model.prototype.projected = function(aid, stat, steps) {
        var a = $gameActors.actor(aid), copy = Object.create(a), self = this;
        copy._paramPlus = a._paramPlus.slice();
        $.STATS.forEach(function(id) { copy._paramPlus[id] += id === stat && steps !== undefined ? steps : self.draft[aid][id]; });
        return copy.param(stat);
    };
    Model.prototype.nextCost = function(aid, stat) {
        if (!this.draft[aid] || $.STATS.indexOf(stat) < 0) return null;
        var a = $gameActors.actor(aid), value = this.projected(aid, stat);
        return value >= a.paramMax(stat) ? null : $.cost(value);
    };
    Model.prototype.spent = function(aid) {
        var total = 0, self = this;
        $.STATS.forEach(function(stat) {
            for (var i = 0; i < self.draft[aid][stat]; i++) total += $.cost(self.projected(aid, stat, i));
        });
        return total;
    };
    Model.prototype.remaining = function(aid) { return this.initial[aid].points - this.spent(aid); };
    Model.prototype.hasChanges = function() { var self = this; return this.ids.some(function(id) { return self.spent(id) > 0; }); };
    Model.prototype.change = function(aid, stat, direction) {
        if (!this.draft[aid] || $.STATS.indexOf(stat) < 0) return false;
        if (direction < 0) { if (!this.draft[aid][stat]) return false; this.draft[aid][stat]--; return true; }
        var cost = this.nextCost(aid, stat);
        if (!cost || cost > this.remaining(aid)) return false;
        this.draft[aid][stat]++; return true;
    };
    Model.prototype.apply = function() {
        var self = this;
        var valid = this.ids.every(function(id) {
            var a = $gameActors.actor(id), initial = self.initial[id];
            return a && Number($gameVariables.value(pointsId(id))) === initial.points && self.remaining(id) >= 0 &&
                a._paramPlus.every(function(n, i) { return n === initial.plus[i]; }) &&
                $.STATS.every(function(stat, i) { return a.param(stat) === initial.values[i]; });
        });
        if (!valid) return false;
        var costs = {}; this.ids.forEach(function(id) { costs[id] = self.spent(id); });
        this.ids.forEach(function(id) {
            var a = $gameActors.actor(id);
            $.STATS.forEach(function(stat) { if (self.draft[id][stat]) a.addParam(stat, self.draft[id][stat]); });
            $gameVariables.setValue(pointsId(id), self.initial[id].points - costs[id]);
        });
        this.reset(); return true;
    };

    $.open = function(aid) {
        if ($.active) return;
        $.active = true;
        SceneManager.push(Scene_NpLevelAllocation); SceneManager.prepareNextScene(aid || 1);
    };
    function command(code, parameters) { return { code: code, indent: 0, parameters: parameters, npLevelAllocation: true }; }
    $.inject = function(ce) {
        if (ce[860] && !ce[860].list.some(function(c) { return c.npLevelAllocation; })) {
            ce[860].list = [command(355, ["NP_LevelAllocation.open(1); this.setWaitMode('npLevelAllocation');"]),
                command(117, [25]), command(0, [])];
        }
        if (ce[28] && !ce[28].list.some(function(c) { return c.npLevelAllocation; })) {
            var list = ce[28].list, at = list.findIndex(function(c) { return c.code === 355 && /^\$levelup\s*=/.test(c.parameters[0]); });
            if (at < 0) throw new Error('NP_LevelAllocation: level-up reset anchor missing');
            list.splice(at, 0, command(355, ["if ($levelup_1 >= 1 || $levelup_2 >= 1) { NP_LevelAllocation.open($levelup_1 >= 1 ? 1 : 2); this.setWaitMode('npLevelAllocation'); }"]), command(117, [25]));
        }
    };
    var _databaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        var ok = _databaseLoaded.apply(this, arguments);
        if (ok && !$.injected && window.$dataCommonEvents) { $.inject($dataCommonEvents); $.injected = true; }
        return ok;
    };
    var _wait = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === 'npLevelAllocation') { if ($.active) return true; this._waitMode = ''; return false; }
        return _wait.apply(this, arguments);
    };

    function Window_NpAllocationActors() { this.initialize.apply(this, arguments); }
    Window_NpAllocationActors.prototype = Object.create(Window_HorzCommand.prototype);
    Window_NpAllocationActors.prototype.constructor = Window_NpAllocationActors;
    Window_NpAllocationActors.prototype.initialize = function(scene, y, width) { this._allocation = scene; this._width = width; Window_HorzCommand.prototype.initialize.call(this, 0, y); };
    Window_NpAllocationActors.prototype.windowWidth = function() { return this._width; };
    Window_NpAllocationActors.prototype.maxCols = function() { return this._allocation._model.ids.length; };
    Window_NpAllocationActors.prototype.makeCommandList = function() {
        var self = this;
        this._allocation._model.ids.forEach(function(id) { self.addCommand($gameActors.actor(id).name() + ' [' + self._allocation._model.remaining(id) + ']', String(id)); });
    };
    function Window_NpAllocationCommands() { this.initialize.apply(this, arguments); }
    Window_NpAllocationCommands.prototype = Object.create(Window_HorzCommand.prototype);
    Window_NpAllocationCommands.prototype.constructor = Window_NpAllocationCommands;
    Window_NpAllocationCommands.prototype.initialize = Window_NpAllocationActors.prototype.initialize;
    Window_NpAllocationCommands.prototype.windowWidth = Window_NpAllocationActors.prototype.windowWidth;
    Window_NpAllocationCommands.prototype.maxCols = function() { return 3; };
    Window_NpAllocationCommands.prototype.makeCommandList = function() {
        var changed = this._allocation._model.hasChanges();
        this.addCommand(L('Применить', 'Apply'), 'apply', changed);
        this.addCommand(L('Сброс', 'Reset'), 'reset', changed);
        this.addCommand(L('Отложить', 'Later'), 'later');
    };
    function Window_NpAllocationStats() { this.initialize.apply(this, arguments); }
    Window_NpAllocationStats.prototype = Object.create(Window_Selectable.prototype);
    Window_NpAllocationStats.prototype.constructor = Window_NpAllocationStats;
    Window_NpAllocationStats.prototype.initialize = function(scene, y, width, height) {
        this._allocation = scene; Window_Selectable.prototype.initialize.call(this, 0, y, width, height); this.refresh(); this.select(0); this.activate();
    };
    Window_NpAllocationStats.prototype.standardFontSize = function() { return 22; };
    Window_NpAllocationStats.prototype.maxItems = function() { return 6; };
    Window_NpAllocationStats.prototype.itemHeight = function() { return Math.floor(this.contentsHeight() / 6); };
    Window_NpAllocationStats.prototype.refresh = function() { this.createContents(); this.drawAllItems(); };
    Window_NpAllocationStats.prototype.drawItem = function(index) {
        var scene = this._allocation, m = scene._model, aid = scene._aid, stat = $.STATS[index];
        var r = this.itemRectForText(index), w = r.width, a = $gameActors.actor(aid), next = m.nextCost(aid, stat), count = m.draft[aid][stat];
        this.resetTextColor(); this.drawText($.name(stat), r.x, r.y, w * 0.28);
        this.changeTextColor(count ? this.powerUpColor() : this.normalColor());
        this.drawText(a.param(stat) + (count ? ' → ' + m.projected(aid, stat) + ' (+' + count + ')' : ''), r.x + w * 0.29, r.y, w * 0.21);
        this.changeTextColor(next && next <= m.remaining(aid) ? this.systemColor() : this.textColor(7));
        this.drawText(next ? L('Цена: ', 'Cost: ') + next : L('Предел', 'Maximum'), r.x + w * 0.53, r.y, Math.max(70, w * 0.25 - 24));
        this.changeTextColor(count ? this.powerDownColor() : this.textColor(7)); this.drawText('−', r.x + w - 88, r.y, 40, 'center');
        this.changeTextColor(next && next <= m.remaining(aid) ? this.powerUpColor() : this.textColor(7)); this.drawText('+', r.x + w - 44, r.y, 40, 'center');
        this.resetTextColor();
    };
    Window_NpAllocationStats.prototype.changeDraft = function(direction) {
        if (this._allocation._model.change(this._allocation._aid, $.STATS[this.index()], direction)) { SoundManager.playCursor(); this._allocation.refreshAllocation(); }
        else SoundManager.playBuzzer();
    };
    Window_NpAllocationStats.prototype.cursorRight = function() { this.changeDraft(1); };
    Window_NpAllocationStats.prototype.cursorLeft = function() { this.changeDraft(-1); };
    Window_NpAllocationStats.prototype.processOk = function() { this.changeDraft(1); };
    Window_NpAllocationStats.prototype.updateHelp = function() { if (this._allocation._detail) this._allocation.updateDetail(); };
    Window_NpAllocationStats.prototype.processTouch = function() {
        if (!this.isOpenAndActive() || !TouchInput.isTriggered() || !this.isTouchedInsideFrame()) return;
        var x = this.canvasToLocalX(TouchInput.x), y = this.canvasToLocalY(TouchInput.y), index = this.hitTest(x, y);
        if (index < 0) return;
        this.select(index); this.updateHelp();
        var r = this.itemRectForText(index), contentX = x - this.padding;
        if (contentX >= r.x + r.width - 44) this.changeDraft(1);
        else if (contentX >= r.x + r.width - 88) this.changeDraft(-1);
    };
    function Window_NpAllocationHelp() { this.initialize.apply(this, arguments); }
    Window_NpAllocationHelp.prototype = Object.create(Window_Help.prototype);
    Window_NpAllocationHelp.prototype.constructor = Window_NpAllocationHelp;
    Window_NpAllocationHelp.prototype.standardFontSize = function() { return 21; };
    Window_NpAllocationHelp.prototype.setDescription = function(text) {
        this.resetFontSettings(); var words = text.split(/\s+/), lines = [], line = '', width = this.contentsWidth();
        words.forEach(function(word) { var next = line ? line + ' ' + word : word; if (line && this.textWidth(next) > width) { lines.push(line); line = word; } else line = next; }, this);
        if (line) lines.push(line); this.setText(lines.join('\n'));
    };
    function Scene_NpLevelAllocation() { this.initialize.apply(this, arguments); }
    Scene_NpLevelAllocation.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_NpLevelAllocation.prototype.constructor = Scene_NpLevelAllocation;
    Scene_NpLevelAllocation.prototype.prepare = function(aid) { this._preferredAid = aid; };
    Scene_NpLevelAllocation.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this); this._model = new Model();
        this._aid = this._model.ids.indexOf(this._preferredAid) >= 0 ? this._preferredAid : this._model.ids[0];
        var w = Graphics.boxWidth, h = Graphics.boxHeight;
        this._head = new Window_Base(0, 0, w, 100); this.addWindow(this._head);
        this._actors = new Window_NpAllocationActors(this, 100, w); this.addWindow(this._actors); this._actors.deactivate();
        this._commands = new Window_NpAllocationCommands(this, h - 72, w); this.addWindow(this._commands); this._commands.deactivate();
        this._commands.setHandler('apply', this.onApply.bind(this)); this._commands.setHandler('reset', this.onReset.bind(this)); this._commands.setHandler('later', this.onLater.bind(this));
        this._commands.setHandler('cancel', this.onList.bind(this));
        this._detail = new Window_NpAllocationHelp(2); this._detail.y = this._commands.y - this._detail.height; this.addWindow(this._detail);
        var y = this._actors.y + this._actors.height;
        this._stats = new Window_NpAllocationStats(this, y, w, this._detail.y - y); this.addWindow(this._stats);
        this._stats.setHelpWindow(this._detail);
        this._stats.setHandler('cancel', this.onCommands.bind(this)); this._stats.setHandler('pageup', this.switchActor.bind(this, -1)); this._stats.setHandler('pagedown', this.switchActor.bind(this, 1));
        this.refreshAllocation();
    };
    Scene_NpLevelAllocation.prototype.refreshAllocation = function() {
        var b = this._head; b.contents.clear(); b.contents.fontSize = 24; b.changeTextColor(b.systemColor());
        b.drawText(L('Распределение характеристик', 'Attribute allocation'), 0, 0, b.contentsWidth());
        b.resetTextColor(); b.contents.fontSize = 18;
        b.drawText(L('Осталось: ', 'Remaining: ') + this._model.remaining(this._aid) + L('   ·   Будет потрачено: ', '   ·   To spend: ') + this._model.spent(this._aid), 0, 28, b.contentsWidth());
        this._actors.refresh(); this._actors.select(this._model.ids.indexOf(this._aid)); this._commands.refresh(); this._stats.refresh(); this.updateDetail();
    };
    Scene_NpLevelAllocation.prototype.updateDetail = function() {
        var stat = $.STATS[Math.max(0, this._stats.index())]; this._detail.setDescription($.description(stat));
    };
    Scene_NpLevelAllocation.prototype.switchActor = function(direction) {
        var ids = this._model.ids, index = ids.indexOf(this._aid); this._aid = ids[(index + direction + ids.length) % ids.length]; this.refreshAllocation(); this._stats.activate();
    };
    Scene_NpLevelAllocation.prototype.onCommands = function() { this._stats.deactivate(); this._commands.select(2); this._commands.activate(); };
    Scene_NpLevelAllocation.prototype.onList = function() { this._commands.deactivate(); this._stats.activate(); };
    Scene_NpLevelAllocation.prototype.onReset = function() { this._model.reset(); this.refreshAllocation(); this.onList(); };
    Scene_NpLevelAllocation.prototype.onApply = function() {
        if (!this._model.apply()) { SoundManager.playBuzzer(); this._model.reset(); this.refreshAllocation(); this.onList(); return; }
        this.onLater();
    };
    Scene_NpLevelAllocation.prototype.onLater = function() { this._closing = true; this.popScene(); };
    Scene_NpLevelAllocation.prototype.terminate = function() { Scene_MenuBase.prototype.terminate.call(this); $.active = false; };
    Scene_NpLevelAllocation.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._closing || !TouchInput.isTriggered()) return;
        var x = TouchInput.x, y = TouchInput.y;
        var tabX = this._actors.canvasToLocalX(x), tabY = this._actors.canvasToLocalY(y);
        var commandX = this._commands.canvasToLocalX(x), commandY = this._commands.canvasToLocalY(y);
        if (tabY >= 0 && tabY < this._actors.height) {
            var index = this._actors.hitTest(tabX, tabY);
            if (index >= 0 && this._model.ids[index] !== this._aid) { this._aid = this._model.ids[index]; this.refreshAllocation(); }
            this.onList();
        } else if (!this._commands.active && commandY >= 0 && commandY < this._commands.height) {
            var n = this._commands.hitTest(commandX, commandY);
            if (n >= 0 && this._commands.isCommandEnabled(n)) { this._commands.select(n); this._commands.callHandler(this._commands.commandSymbol(n)); }
        }
    };
    $.Scene = Scene_NpLevelAllocation; window.Scene_NpLevelAllocation = Scene_NpLevelAllocation;
    return $;
})();
