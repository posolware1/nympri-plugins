'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'plugins', 'NP_Progression', 'NP_Progression.js'), 'utf8');
assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(src), 'plugin text');
assert.ok(!/\$gameVariables\.setValue\s*\(/.test(src), 'plugin must not write variables');
assert.ok(!/setValue\(\s*[89]\s*,/.test(src), 'plugin must not write V8 or V9');
['README.md', 'README.ru.md'].forEach(function(name) {
    const text = fs.readFileSync(path.join(root, 'plugins', 'NP_Progression', name), 'utf8');
    assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(text), name);
    assert.ok(text.indexOf('60') >= 0, name + ' names the fame threshold');
    assert.ok(text.indexOf('301010') >= 0, name + ' explains the locked quest');
});
const options = fs.readFileSync(path.join(root, 'plugins', 'NP_OptionsCategories', 'NP_OptionsCategories.js'), 'utf8');
assert.ok(/npProgression:\s*'mech'/.test(options));

function boot() {
    const context = { console: console };
    context.window = context;
    function ConfigManager() {}
    ConfigManager.makeData = function() { return {}; };
    ConfigManager.applyData = function() {};
    context.ConfigManager = ConfigManager;
    function Window_Options() {}
    Window_Options.prototype.addGeneralOptions = function() {};
    Window_Options.prototype.addCommand = function(name, symbol) { this._last = [name, symbol]; };
    context.Window_Options = Window_Options;
    context.PluginManager = { parameters: function() { return { Rank3Fame: '60' }; } };
    vm.createContext(context);
    vm.runInContext(src, context);
    return context;
}

const ctx = boot();
const P = ctx.NP_Progression;
const C = P.COUNT;
assert.strictEqual(P.DEFAULT_FAME, 60);
assert.strictEqual(P.fameThreshold(), 60);
assert.strictEqual(C.afterChapter1, C.storyChapter1 + C.earlySideTurnins);
assert.strictEqual(C.lateMid, C.afterChapter1 + C.rank2Jobs + C.titanHunts);
assert.strictEqual(C.thorough, C.lateMid + C.wastelandRest + C.pirates + C.capitalTwos + C.bond3Jobs + C.yarizoMilk);
assert.ok(P.DEFAULT_FAME > C.afterChapter1 && P.DEFAULT_FAME <= C.lateMid);
assert.ok(P.DEFAULT_FAME < 150);
assert.ok(C.thorough < 150);

assert.strictEqual(P.openRankChoice('クエスト if(v[1]>9999)'), 'クエスト if(v[1]>9999)');
assert.strictEqual(P.openRankChoice('昇級申請 if(v[1]>9999)'), '昇級申請 if(v[9] >= 2)');
assert.strictEqual(P.openRankChoice('select_rank_up if(v[1] > 9999 && !s[5])'), 'select_rank_up if(v[9] >= 2 && !s[5])');
const opened = P.openRankChoice('昇級申請 if(v[1]>9999)');
assert.strictEqual(P.openRankChoice(opened), opened);

const rank = {
    pages: [{
        list: [
            { code: 102, indent: 0, parameters: [['話しかける', '昇級申請 if(v[1]>9999)'], 0, 0, 2, 0] },
            { code: 402, indent: 0, parameters: [1, 'rank'] },
            { code: 111, indent: 1, parameters: [1, 322, 0, 150, 1] },
            { code: 111, indent: 2, parameters: [8, 888] },
            { code: 111, indent: 2, parameters: [12, 'if ($gameParty.hasItem($dataItems[888]))'] },
            { code: 126, indent: 2, parameters: [888, 0, 0, 1] },
            { code: 126, indent: 2, parameters: [887, 1, 0, 1] },
            { code: 122, indent: 2, parameters: [9, 9, 0, 0, 3] },
            { code: 122, indent: 2, parameters: [8, 8, 0, 0, 1] },
            { code: 355, indent: 2, parameters: ['$gameVariables.setValue(9, 3);'] },
            { code: 401, indent: 2, parameters: ['名声150とタグ888の話'] },
            { code: 0, indent: 2, parameters: [] }
        ]
    }]
};
let result = P.patchRankEvent(rank, 60);
assert.strictEqual(rank.pages[0].list[0].parameters[0][0], '話しかける');
assert.strictEqual(rank.pages[0].list[0].parameters[0][1], '昇級申請 if(v[9] >= 2)');
assert.deepStrictEqual(rank.pages[0].list[2].parameters, [1, 322, 0, 60, 1]);
assert.strictEqual(rank.pages[0].list[3].parameters[0], 12);
assert.strictEqual(rank.pages[0].list[3].parameters[1], 'true');
assert.strictEqual(rank.pages[0].list[3].parameters.length, 2);
assert.strictEqual(rank.pages[0].list[4].parameters[1], 'if (true)');
assert.deepStrictEqual(rank.pages[0].list[5].parameters, [888, 0, 0, 1], 'the branch still gives tag 888');
assert.deepStrictEqual(rank.pages[0].list[6].parameters, [887, 1, 0, 1], 'the branch still takes tag 887');
assert.deepStrictEqual(rank.pages[0].list[7].parameters, [9, 9, 0, 0, 3], 'the branch still sets V9');
assert.deepStrictEqual(rank.pages[0].list[8].parameters, [8, 8, 0, 0, 1], 'the branch still sets V8');
assert.strictEqual(rank.pages[0].list[9].parameters[0], '$gameVariables.setValue(9, 3);');
assert.strictEqual(rank.pages[0].list[10].parameters[0], '名声150とタグ888の話');
assert.ok(result.choice >= 1 && result.fame >= 1 && result.badge >= 1);
const again = P.patchRankEvent(rank, 60);
assert.strictEqual(again.choice, 0);
assert.strictEqual(again.fame, 0);
assert.strictEqual(again.badge, 0);

const gate = { pages: [{ list: [
    { code: 111, indent: 0, parameters: [12, 'v[1] > 9999'] },
    { code: 102, indent: 1, parameters: [['昇級申請'], 0] },
    { code: 412, indent: 0, parameters: [] }
] }] };
assert.strictEqual(P.patchRankEvent(gate, 60).gate, 1);
assert.strictEqual(gate.pages[0].list[0].parameters[1], '$gameVariables.value(9) >= 2');
assert.strictEqual(P.patchRankEvent(gate, 60).gate, 0);

const shop = [
    { code: 111, parameters: [1, 12, 0, 2, 1] },
    { code: 111, parameters: [1, 12, 0, 3, 1] },
    { code: 111, parameters: [1, 12, 0, 1, 1] },
    { code: 102, parameters: [['+1 if(v[12] >= 2)', 'plate if(v[12]>=3)'], 0] },
    { code: 401, parameters: ['v[12] >= 2'] }
];
assert.ok(P.patchShopList(shop) >= 3);
assert.deepStrictEqual(shop[0].parameters, [1, 9, 0, 2, 1]);
assert.deepStrictEqual(shop[1].parameters, [1, 9, 0, 3, 1]);
assert.deepStrictEqual(shop[2].parameters, [1, 12, 0, 1, 1]);
assert.strictEqual(shop[3].parameters[0][0], '+1 if(v[9] >= 2)');
assert.strictEqual(shop[3].parameters[0][1], 'plate if(v[9] >= 3)');
assert.strictEqual(shop[4].parameters[0], 'v[12] >= 2');
assert.strictEqual(P.patchShopList(shop), 0);

const forest = {
    note: 'exam',
    events: [null, { pages: [{ list: [
        { code: 355, parameters: ['add_event(29, 101)'] },
        { code: 355, parameters: ['add_event(29, 102); add_event(29, 103);'] },
        { code: 355, parameters: ['add_event(29, 111)'] },
        { code: 355, parameters: ['add_event(29, 1010)'] },
        { code: 401, parameters: ['add_event(29, 101)'] }
    ] }] }]
};
let mapped = P.patchMap(forest, 176);
assert.ok(mapped.note);
assert.ok(forest.note.indexOf('<ダンジョンレベル:2>') >= 0);
assert.strictEqual(forest.events[1].pages[0].list[0].parameters[0], 'add_event(29, 304)');
assert.strictEqual(forest.events[1].pages[0].list[1].parameters[0], 'add_event(29, 304); add_event(29, 103);');
assert.strictEqual(forest.events[1].pages[0].list[2].parameters[0], 'add_event(29, 111)');
assert.strictEqual(forest.events[1].pages[0].list[3].parameters[0], 'add_event(29, 1010)');
assert.strictEqual(forest.events[1].pages[0].list[4].parameters[0], 'add_event(29, 101)');
mapped = P.patchMap(forest, 176);
assert.strictEqual(mapped.note, false);
assert.strictEqual(mapped.spawns, 0);
assert.strictEqual((forest.note.match(/ダンジョンレベル/g) || []).length, 1);

const tagged = { note: '<ダンジョンレベル:1>', events: [] };
P.patchMap(tagged, 177);
assert.strictEqual(tagged.note, '<ダンジョンレベル:1>');

const ruins = { note: '', events: [] };
P.patchMap(ruins, 263);
assert.ok(ruins.note.indexOf('<ダンジョンレベル:3>') >= 0);
P.patchMap(ruins, 263);
assert.strictEqual((ruins.note.match(/ダンジョンレベル/g) || []).length, 1);

const fame = [
    { code: 111, parameters: [1, 322, 0, 10, 0] },
    { code: 111, parameters: [1, 322, 0, 30, 0] },
    { code: 111, parameters: [1, 322, 0, 0, 0] },
    { code: 111, parameters: [1, 322, 0, 5, 0] },
    { code: 111, parameters: [1, 9, 0, 2, 0] },
    { code: 355, parameters: ['if ($gameVariables.value(322) == 10) open();'] },
    { code: 355, parameters: ['if (v[322] === 30) open();'] },
    { code: 401, parameters: ['v[322] == 10'] }
];
assert.ok(P.patchFameList(fame) >= 4);
assert.strictEqual(fame[0].parameters[4], 1);
assert.strictEqual(fame[1].parameters[4], 1);
assert.strictEqual(fame[2].parameters[4], 0);
assert.strictEqual(fame[3].parameters[4], 0);
assert.strictEqual(fame[4].parameters[4], 0);
assert.strictEqual(fame[5].parameters[0], 'if ($gameVariables.value(322) >= 10) open();');
assert.strictEqual(fame[6].parameters[0], 'if (v[322] >= 30) open();');
assert.strictEqual(fame[7].parameters[0], 'v[322] == 10');
assert.strictEqual(P.patchFameList(fame), 0);

const ce = [
    { code: 108, parameters: ['900202 exam bonus'] },
    { code: 111, parameters: [12, 'if ($gameVariables.value(922) >= 3) $gameVariables.setValue(329, 5);'] },
    { code: 108, parameters: ['900301 titan'] },
    { code: 355, parameters: ['var n = $gameVariables.value(912);'] },
    { code: 355, parameters: ['$gameVariables.setValue(9, 3);'] },
    { code: 355, parameters: ['$gameVariables.setValue(922, 1);'] },
    { code: 401, parameters: ['$gameVariables.value(922)'] }
];
assert.ok(P.patchCe46List(ce) >= 2);
assert.ok(ce[1].parameters[1].indexOf('value(912)') >= 0);
assert.ok(ce[1].parameters[1].indexOf('value(922)') < 0);
assert.ok(ce[3].parameters[0].indexOf('value(922)') >= 0);
assert.strictEqual(ce[4].parameters[0], '$gameVariables.setValue(9, 3);');
assert.strictEqual(ce[5].parameters[0], '$gameVariables.setValue(922, 1);');
assert.strictEqual(ce[6].parameters[0], '$gameVariables.value(922)');
assert.strictEqual(P.patchCe46List(ce), 0);
const later = [
    { code: 108, parameters: ['900202'] },
    { code: 108, parameters: ['900302 poison'] },
    { code: 355, parameters: ['$gameVariables.value(922)'] }
];
P.patchCe46List(later);
assert.strictEqual(later[2].parameters[0], '$gameVariables.value(922)');

const quests = { 301010: { release_conds: '$v[9] >= 3' }, 201003: { release_conds: '$v[9] >= 2' } };
assert.strictEqual(P.lockImmortal(quests), 'locked');
assert.strictEqual(quests[301010].release_conds, '$v[9] >= 99');
assert.strictEqual(quests[201003].release_conds, '$v[9] >= 2');
assert.strictEqual(P.lockImmortal(quests), 'already');
assert.strictEqual(P.lockImmortal({}), 'missing');

const camp = { pages: [{ conditions: { variableValid: true, variableId: 9, variableValue: 3 }, list: [
    { code: 111, parameters: [12, '$gameVariables.value(9) >= 3'] }
] }] };
const other = { pages: [{ conditions: { variableValid: true, variableId: 9, variableValue: 3 }, list: [] }] };
assert.strictEqual(P.lockCampEvent(camp), 2);
assert.strictEqual(camp.pages[0].conditions.variableValue, 99);
assert.strictEqual(camp.pages[0].list[0].parameters[1], '$gameVariables.value(9) >= 99');
assert.strictEqual(P.lockCampEvent(camp), 0);
const map288 = { events: [] };
map288.events[16] = camp;
map288.events[32] = other;
P.patchMap(map288, 288);
assert.strictEqual(other.pages[0].conditions.variableValue, 3);

ctx.ConfigManager.npProgression = false;
const untouched = { note: '', events: [null, null, null, null, null, null, null, null, null, null, null, null,
    { pages: [{ list: [{ code: 102, parameters: [['昇級申請 if(v[1]>9999)'], 0] }] }] }] };
const off = P.patchMap(untouched, 13);
assert.strictEqual(off.rank, null);
assert.strictEqual(untouched.events[12].pages[0].list[0].parameters[0][0], '昇級申請 if(v[1]>9999)');
assert.strictEqual(P.patchQuests(quests), 'off');

console.log('progression checks ok');
