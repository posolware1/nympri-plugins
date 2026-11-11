'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const pluginPath = path.join(root, 'plugins', 'NP_StoryHint', 'NP_StoryHint.js');
const src = fs.readFileSync(pluginPath, 'utf8');
const locked = JSON.parse(fs.readFileSync(path.join(__dirname, 'story_hint_conditions.json'), 'utf8'));

assert.ok(!/\beval\s*\(/.test(src), 'conditions are not passed to eval');
assert.ok(!/new Function/.test(src));
assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(src));
['README.md', 'README.ru.md'].forEach(function(name) {
    const text = fs.readFileSync(path.join(root, 'plugins', 'NP_StoryHint', name), 'utf8');
    assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(text), name);
    assert.ok(text.indexOf('1.1') >= 0, name);
});
const options = fs.readFileSync(path.join(root, 'plugins', 'NP_OptionsCategories', 'NP_OptionsCategories.js'), 'utf8');
assert.ok(/npStoryHint:\s*'ui'/.test(options));

function boot(withJournal) {
    const context = { console: console };
    context.window = context;
    function ConfigManager() {}
    ConfigManager.makeData = function() { return {}; };
    ConfigManager.applyData = function() {};
    context.ConfigManager = ConfigManager;
    function Window_Options() {}
    Window_Options.prototype.addGeneralOptions = function() { this._added = []; };
    Window_Options.prototype.addCommand = function(name, symbol) { this._added.push(symbol); };
    context.Window_Options = Window_Options;
    if (withJournal) {
        function Window_NpQuestTabList() {}
        Window_NpQuestTabList.prototype.refresh = function() {};
        Window_NpQuestTabList.prototype.itemRect = function() {
            return { x: 0, y: 0, width: 10, height: 36 };
        };
        Window_NpQuestTabList.prototype.contentsHeight = function() { return 36; };
        context.Window_NpQuestTabList = Window_NpQuestTabList;
    } else {
        function Window_MenuCommand() {}
        Window_MenuCommand.prototype.addOriginalCommands = function() { this._added = []; };
        Window_MenuCommand.prototype.addCommand = function(name, symbol) { this._added.push({ name: name, symbol: symbol }); };
        context.Window_MenuCommand = Window_MenuCommand;
    }
    vm.createContext(context);
    vm.runInContext(src, context);
    return context;
}

function world(vars, sw) {
    return {
        readVar: function(id) { return Object.prototype.hasOwnProperty.call(vars, id) ? vars[id] : 0; },
        readSw: function(id) { return !!(sw && sw[id]); }
    };
}
function step(ctx, vars, sw) {
    const w = world(vars || {}, sw || {});
    return ctx.NP_StoryHint.currentStep(w.readVar, w.readSw);
}

const journal = boot(true);
const Q = journal.NP_StoryHint;
assert.strictEqual(Q.installed, 'journal');
assert.strictEqual(Q.placement(), 'journal');
assert.strictEqual(Q.ROUTE.length, 55);
assert.strictEqual(Q.ROUTE[0].id, 'end_080j_poison');
assert.strictEqual(Q.ROUTE[0].condition, '$gameVariables.value(923) >= 28');
assert.strictEqual(JSON.stringify(Q.ROUTE.map(function(s) { return { id: s.id, condition: s.condition }; })), JSON.stringify(locked));

Q.ROUTE.forEach(function(row) {
    assert.doesNotThrow(function() {
        Q.evalCondition(row.condition, function() { return 0; }, function() { return false; });
    }, row.id);
});
assert.strictEqual(Q.firstMatch(Q.ROUTE, function() { return 0; }, function() { return false; }), null);

assert.strictEqual(step(journal, {}, {}).id, 'start');
assert.strictEqual(step(journal, { 911: 3 }, {}).id, 'church_entry');
assert.strictEqual(step(journal, { 911: 99 }, {}).id, 'ch2_after_ch1');
assert.strictEqual(step(journal, {}, { 299: true }).id, 'exam_sage');
assert.strictEqual(step(journal, { 922: 3 }, {}).id, 'ts_guild');
assert.strictEqual(step(journal, { 9: 2, 322: 60 }, { 299: true }).id, 'rank3_apply');
assert.strictEqual(step(journal, { 9: 3 }, { 299: true }).id, 'rank3_gear');
assert.ok(Q.ROUTE.find(function(s) { return s.id === 'ts_forest'; }).hint_en.indexOf('60 fame') >= 0);
assert.ok(Q.ROUTE.find(function(s) { return s.id === 'pp_go_ruins'; }).hint_ru.indexOf('фальшион') >= 0);
assert.strictEqual(step(journal, { 923: 28, 911: 99 }, { 299: true, 300: true }).id, 'end_080j_poison');

journal.NP_Language = { isEn: function() { return false; } };
const ru = Q.textOf(Q.ROUTE[0]);
assert.ok(ru.indexOf('заканчивается') >= 0, ru);
assert.ok(ru.indexOf('свободная игра') >= 0, ru);
assert.ok(ru.indexOf('Побочные задания') >= 0, ru);
const ch2ru = Q.textOf(Q.ROUTE.find(function(s) { return s.id === 'ch2_after_ch1'; }));
assert.ok(ch2ru.indexOf('может не начаться') >= 0, ch2ru);
journal.NP_Language = { isEn: function() { return true; } };
const en = Q.textOf(Q.ROUTE[0]);
assert.ok(en.indexOf('ends here') >= 0, en);
assert.ok(en.indexOf('Side quests and free play continue') >= 0, en);
const ch2en = Q.textOf(Q.ROUTE.find(function(s) { return s.id === 'ch2_after_ch1'; }));
assert.ok(ch2en.indexOf('may never start') >= 0, ch2en);
assert.strictEqual(Q.title(), "What's next");

const broken = Q.firstMatch([
    { id: 'bad', condition: 'alert(1)', hint_ru: 'нет', hint_en: 'no' },
    { id: 'ok', condition: '$gameVariables.value(1) >= 1', hint_ru: 'да', hint_en: 'yes' }
], function() { return 5; }, function() { return false; });
assert.strictEqual(broken.id, 'ok');

journal.ConfigManager.npStoryHint = false;
assert.strictEqual(Q.isEnabled(), false);
assert.strictEqual(Q.hintBlock(0), null);
journal.ConfigManager.applyData({});
assert.strictEqual(Q.isEnabled(), true);
journal.ConfigManager.applyData({ npStoryHint: false });
assert.strictEqual(Q.isEnabled(), false);
journal.ConfigManager.npStoryHint = true;

const opt = new journal.Window_Options();
opt.addGeneralOptions();
assert.ok(opt._added.indexOf('npStoryHint') >= 0);

function FakeList(cat) {
    this._categoryId = cat;
    this.contents = { clearRect: function() {}, width: 220 };
}
FakeList.prototype = Object.create(journal.Window_NpQuestTabList.prototype);
FakeList.prototype.contentsWidth = function() { return 220; };
FakeList.prototype.textWidth = function(s) { return String(s).length * 8; };
FakeList.prototype.lineHeight = function() { return 36; };
FakeList.prototype.drawText = function() {};
FakeList.prototype.systemColor = function() { return '#fff'; };
FakeList.prototype.changeTextColor = function() {};
FakeList.prototype.resetTextColor = function() {};

journal.NP_Language = { isEn: function() { return false; } };
const story = new FakeList(0);
story.refresh();
assert.ok(story._npStoryPx > 36, 'story tab reserves a header');
const rect = story.itemRect(0);
assert.ok(rect.y >= story._npStoryPx);
const side = new FakeList(1);
side.refresh();
assert.strictEqual(side._npStoryPx, 0);
journal.ConfigManager.npStoryHint = false;
const hidden = new FakeList(0);
hidden.refresh();
assert.strictEqual(hidden._npStoryPx, 0);

const menu = boot(false);
assert.strictEqual(menu.NP_StoryHint.installed, 'menu');
assert.strictEqual(menu.NP_StoryHint.placement(), 'menu');
const cmd = new menu.Window_MenuCommand();
cmd.addOriginalCommands();
assert.ok(cmd._added.some(function(row) { return row.symbol === 'npStoryHint'; }));
menu.ConfigManager.npStoryHint = false;
const quiet = new menu.Window_MenuCommand();
quiet.addOriginalCommands();
assert.ok(!quiet._added.some(function(row) { return row.symbol === 'npStoryHint'; }));

console.log('story hint checks ok');
