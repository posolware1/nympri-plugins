'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'plugins', 'NP_SoftlockFix', 'NP_SoftlockFix.js'), 'utf8');
assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(src));
['README.md', 'README.ru.md'].forEach(function(name) {
    const text = fs.readFileSync(path.join(root, 'plugins', 'NP_SoftlockFix', name), 'utf8');
    assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(text), name);
});
const options = fs.readFileSync(path.join(root, 'plugins', 'NP_OptionsCategories', 'NP_OptionsCategories.js'), 'utf8');
assert.ok(/npSoftlockFix:\s*'mech'/.test(options));

function boot() {
    const context = { console: console };
    context.window = context;
    function ConfigManager() {}
    ConfigManager.makeData = function() { return {}; };
    ConfigManager.applyData = function() {};
    context.ConfigManager = ConfigManager;
    function Window_Options() {}
    Window_Options.prototype.addGeneralOptions = function() {};
    Window_Options.prototype.addCommand = function(name, symbol) { this._symbol = symbol; };
    context.Window_Options = Window_Options;
    function Game_Map() {}
    Game_Map.prototype.setup = function() { this._setups = (this._setups || 0) + 1; };
    context.Game_Map = Game_Map;
    context.DataManager = { extractSaveContents: function() {} };
    function Game_Event() {}
    Game_Event.prototype.meetsConditions = function() { return this._vanilla; };
    Game_Event.prototype.event = function() { return { pages: this._pages || [] }; };
    context.Game_Event = Game_Event;
    function Game_Interpreter() {}
    Game_Interpreter.prototype.command111 = function() {
        this._seenOp = this._params[4];
        return true;
    };
    context.Game_Interpreter = Game_Interpreter;
    vm.createContext(context);
    vm.runInContext(src, context);
    return context;
}

const ctx = boot();
const F = ctx.NP_SoftlockFix;

function env(extra) {
    const base = {
        enabled: true,
        switches: {},
        variables: {},
        items: {},
        dataItems: { 886: { id: 886 }, 887: { id: 887 } },
        actors: [],
        log: [],
        yarizo: { loaded: true, description: 'v1.2 Задание', hasPortFix: true }
    };
    Object.keys(extra || {}).forEach(function(k) { base[k] = extra[k]; });
    return base;
}
function freezeVars(e) {
    return { 8: e.variables[8], 9: e.variables[9], 911: e.variables[911], 913: e.variables[913] };
}
function same(actual, expected) {
    assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected));
}

const leon1 = '<KNS_Trigger>\nreturn $gameVariables.value(911) == 1;\n</KNS_Trigger>';
const leon2 = '<KNS_Trigger>\nreturn $gameVariables.value(911) == 1 && $gameSwitches.value(292) == true;\n</KNS_Trigger>';
const goblinScript = '<KNS_Trigger>\nreturn $gameVariables.value(906) == 1 && $gameActors.actor(1) && $gameActors.actor(2);\n</KNS_Trigger>';

// Leon: broken chapter-1 end shows him; healthy V911==1 still shows him; mid-quest and a wrong comment do not.
let e = env({ variables: { 911: 99, 8: 4, 9: 1 } });
let d = F.decidePage({ mapId: 171, eventId: 27, pageIndex: 0, page: { list: [{ code: 108, parameters: [leon1] }] }, env: e });
assert.strictEqual(d.ok, true, 'leon after chapter 1');
same(freezeVars(e), { 8: 4, 9: 1, 911: 99 });
e = env({ variables: { 911: 1 } });
d = F.decidePage({ mapId: 171, eventId: 27, pageIndex: 0, page: { list: [{ code: 108, parameters: [leon1] }] }, env: e });
assert.strictEqual(d.ok, true, 'original V911==1 still matches');
e = env({ variables: { 911: 4 } });
d = F.decidePage({ mapId: 171, eventId: 27, pageIndex: 0, page: { list: [{ code: 108, parameters: [leon1] }] }, env: e });
assert.strictEqual(d.ok, false, 'middle of the church quest stays hidden');
e = env({ variables: { 911: 99 }, switches: { 299: true } });
d = F.decidePage({ mapId: 171, eventId: 27, pageIndex: 0, page: { list: [{ code: 108, parameters: [leon1] }] }, env: e });
assert.strictEqual(d.ok, false, 'passed exam does not show the first meeting');
d = F.decidePage({ mapId: 171, eventId: 27, pageIndex: 0, page: { list: [{ code: 108, parameters: ['return $gameVariables.value(911) == 1 && $gameVariables.value(1) == 1;'] }] }, env: env({ variables: { 911: 99 } }) });
assert.strictEqual(d, null, 'a different Leon script is left alone');
e = env({ variables: { 911: 99 }, switches: { 292: true } });
d = F.decidePage({ mapId: 171, eventId: 27, pageIndex: 1, page: { list: [{ code: 408, parameters: [leon2] }] }, env: e });
assert.strictEqual(d.ok, true, 'second Leon page after the meeting');

// S302
e = env({ switches: { 300: true }, variables: { 913: 0, 8: 1, 911: 99 } });
same(F.applyState(e), ['s302_unlock_orc_pig']);
assert.strictEqual(e.switches[302], true);
assert.strictEqual(e.variables[913], 0);
same(F.applyState(e), []);
assert.strictEqual(e.log.length, 1);
e = env({ switches: {} });
assert.strictEqual(JSON.stringify(F.applyState(e)).indexOf('s302_unlock_orc_pig'), -1);

// Fame branches
function setVar(id, value, indent) {
    return { code: 122, indent: indent, parameters: [id, id, 0, 0, value] };
}
const training = [{ code: 111, indent: 0, parameters: [1, 322, 0, 10, 0] }];
assert.strictEqual(F.shouldWidenWhere({ mapId: 13, eventId: 12, pageIndex: 3, list: training, index: 0, env: { enabled: true } }), true);
assert.strictEqual(training[0].parameters[4], 0, 'the command itself stays equal-to');
assert.strictEqual(F.shouldWidenWhere({ mapId: 13, eventId: 12, pageIndex: 4, list: training, index: 0, env: { enabled: true } }), false);
const otherVar = [{ code: 111, indent: 0, parameters: [1, 322, 0, 11, 0] }];
assert.strictEqual(F.shouldWidenWhere({ mapId: 13, eventId: 12, pageIndex: 3, list: otherVar, index: 0, env: { enabled: true } }), false);
const goblin = [
    { code: 111, indent: 0, parameters: [1, 322, 0, 25, 0] },
    setVar(72, 1, 1),
    { code: 411, indent: 0 },
    setVar(72, 0, 1),
    { code: 412, indent: 0 }
];
assert.strictEqual(F.shouldWidenWhere({ mapId: 13, eventId: 12, pageIndex: 5, list: goblin, index: 0, env: { enabled: true } }), true);
assert.strictEqual(goblin[0].parameters[3], 25, 'the threshold stays the number from the command');
const bare = [{ code: 111, indent: 0, parameters: [1, 322, 0, 30, 0] }];
assert.strictEqual(F.shouldWidenWhere({ mapId: 13, eventId: 12, pageIndex: 5, list: bare, index: 0, env: { enabled: true } }), false);
const gate = [{ code: 111, indent: 0, parameters: [1, 9, 0, 2, 0] }];
assert.strictEqual(F.shouldWidenWhere({ mapId: 241, eventId: 8, pageIndex: 0, list: gate, index: 0, env: { enabled: true } }), true);
const rank3 = [{ code: 111, indent: 0, parameters: [1, 9, 0, 3, 0] }];
assert.strictEqual(F.shouldWidenWhere({ mapId: 241, eventId: 8, pageIndex: 0, list: rank3, index: 0, env: { enabled: true } }), false);

// Infirmary: V906 stays 2, and the party check is delegated.
e = env({ variables: { 906: 2, 9: 2 } });
let reran = 0;
d = F.decidePage({
    mapId: 13, eventId: 12, pageIndex: 5,
    page: { list: [{ code: 355, parameters: [goblinScript] }] },
    vanillaOk: false, env: e,
    rerun: function(id, fake) { reran++; assert.strictEqual(id, 906); assert.strictEqual(fake, 1); return true; }
});
assert.strictEqual(d.ok, true);
assert.strictEqual(e.variables[906], 2, 'variable 906 is not rolled back');
assert.strictEqual(reran, 1);
d = F.decidePage({
    mapId: 13, eventId: 12, pageIndex: 5,
    page: { list: [{ code: 355, parameters: [goblinScript] }] },
    vanillaOk: false, env: env({ variables: { 906: 2 } }),
    rerun: function() { return false; }
});
assert.strictEqual(d.ok, false, 'party requirement still fails the page');
d = F.decidePage({
    mapId: 13, eventId: 12, pageIndex: 5,
    page: { list: [{ code: 355, parameters: ['return $gameVariables.value(906) == 1;'] }] },
    vanillaOk: false, env: env({ variables: { 906: 2 } }),
    rerun: function() { throw new Error('should not rerun'); }
});
assert.strictEqual(d, null, 'a 906 check without both actors is skipped');

// Southern desync and healthy gate flag
e = env({ variables: { 922: 2, 9: 1, 8: 0, 911: 99 }, switches: {} });
same(F.applyState(e), ['south_gate_already_south']);
assert.strictEqual(e.switches[310], true);
assert.strictEqual(e.variables[9], 1);
same(F.applyState(e), []);
e = env({ variables: { 922: 1, 923: 0, 915: 0 }, switches: {} });
same(F.applyState(e), []);
assert.strictEqual(e.switches[310], undefined);

// Exam tag
e = env({ switches: { 299: true }, items: { 886: 1, 887: 0 }, variables: { 9: 1, 8: 3, 911: 99 } });
same(F.applyState(e), ['exam_rank_tag_if_passed']);
assert.strictEqual(e.items[887], 1);
assert.strictEqual(e.items[886], 0);
assert.strictEqual(e.variables[9], 1);
same(F.applyState(e), []);
e = env({ switches: { 299: true }, items: { 887: 1, 886: 1 } });
same(F.applyState(e), []);
assert.strictEqual(e.items[886], 1, 'a present 2-star tag does not remove the 1-star tag');
e = env({ switches: { 299: true }, items: { 886: 1 }, dataItems: { 886: { id: 886 } } });
same(F.applyState(e), []);

// Yarizo skip, and the fallback when 1.2 is absent
e = env({ actors: [1, 2, 21], switches: {}, variables: { 8: 21, 911: 99, 3570: 0 } });
same(F.applyState(e), []);
assert.strictEqual(e.switches[290], undefined);
assert.strictEqual(e.variables[3570], 0);
assert.strictEqual(e.variables[8], 21);
const old = { loaded: true, description: 'v1.1 Задание', hasPortFix: false };
e = env({ actors: [21], yarizo: old, switches: {}, variables: { 3570: 0, 8: 0, 911: 50 } });
assert.ok(F.applyState(e).indexOf('yarizo_mtool_recruit') >= 0);
assert.strictEqual(e.switches[290], true);
assert.strictEqual(e.switches[643], true);
assert.strictEqual(e.switches[503], false);
assert.strictEqual(e.variables[3570], 99);
assert.strictEqual(e.variables[8], 0);
assert.strictEqual(e.variables[911], 50);
same(F.applyState(e), []);
const idle = { trigger: 0, conditions: { variableValid: true, variableId: 911, variableValue: 4 }, list: [] };
d = F.decidePage({ mapId: 171, eventId: 1, pageIndex: 4, page: idle, vanillaOk: true, env: env({ switches: { 703: true }, variables: { 9: 2, 911: 99 } }) });
assert.strictEqual(d, null, 'Yarizo 1.2 owns the port page');
d = F.decidePage({ mapId: 171, eventId: 1, pageIndex: 4, page: idle, vanillaOk: true, env: env({ yarizo: old, switches: { 703: true }, variables: { 9: 3, 911: 99 } }) });
assert.strictEqual(d.ok, false);
d = F.decidePage({ mapId: 171, eventId: 1, pageIndex: 4, page: idle, vanillaOk: true, env: env({ yarizo: old, switches: { 703: true, 301: true }, variables: { 9: 3, 911: 99 } }) });
assert.strictEqual(d.ok, true, 'switch 301 keeps the story page');
const sprite = { list: [{ code: 108, parameters: ['return $gameVariables.value(9) == 2;'] }] };
d = F.decidePage({ mapId: 171, eventId: 29, page: sprite, vanillaOk: false, env: env({ yarizo: old, variables: { 9: 3 } }) });
assert.strictEqual(d.ok, true);
d = F.decidePage({ mapId: 171, eventId: 29, page: sprite, vanillaOk: false, env: env({ variables: { 9: 3 } }) });
assert.strictEqual(d, null, 'sprites stay with Yarizo 1.2');

// Option off leaves a broken S302 alone
e = env({ enabled: false, switches: { 300: true } });
same(F.applyState(e), []);
assert.strictEqual(e.switches[302], undefined);

// command111 restores the operator after using >=
const interp = new ctx.Game_Interpreter();
interp._mapId = 13;
interp._eventId = 12;
interp._index = 0;
interp._list = training;
interp._params = training[0].parameters;
ctx.$gameMap = { event: function() { return { _pageIndex: 3 }; } };
assert.strictEqual(interp.command111(), true);
assert.strictEqual(interp._seenOp, 1, 'the branch ran as >=');
assert.strictEqual(interp._params[4], 0, 'the map command is restored');

console.log('softlock checks ok');
