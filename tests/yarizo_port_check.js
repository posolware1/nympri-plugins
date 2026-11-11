'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const pluginPath = path.join(root, 'plugins', 'NP_YarizoQuest', 'NP_YarizoQuest.js');
const src = fs.readFileSync(pluginPath, 'utf8');

const context = {
    console,
    Game_Map: function() {},
    Game_Interpreter: function() {},
    Scene_Base: function() {},
    Game_Event: function() {}
};
context.window = context;
context.Game_Map.prototype.setup = function() {};
context.Game_Map.prototype.setupStartingEvent = function() { return false; };
context.Game_Interpreter.prototype.terminate = function() {};
context.Scene_Base.prototype.create = function() {};
context.Game_Event.prototype.meetsConditions = function(page) { return !!page.vanilla; };
vm.createContext(context);
vm.runInContext(src, context);

const Q = context.NP_YarizoQuest;
const vars = { 8: 21, 9: 2, 911: 99, 3570: 0 };
const switches = {};
const varWrites = [];
const swWrites = [];

function reset(extraVars, extraSw, actors) {
    Object.keys(vars).forEach(function(k) { delete vars[k]; });
    Object.keys(switches).forEach(function(k) { delete switches[k]; });
    varWrites.length = 0;
    swWrites.length = 0;
    vars[8] = 7;
    vars[9] = 2;
    vars[911] = 99;
    vars[3570] = 0;
    Object.assign(vars, extraVars || {});
    Object.assign(switches, extraSw || {});
    context.$gameVariables = {
        value: function(id) { return vars[id] || 0; },
        setValue: function(id, v) { varWrites.push(id); vars[id] = v; }
    };
    context.$gameSwitches = {
        value: function(id) { return !!switches[id]; },
        setValue: function(id, v) { swWrites.push(id); switches[id] = !!v; }
    };
    context.$gameSystem = {};
    context.$gameParty = { _actors: actors || [] };
    context.$gameMap = { mapId: function() { return 171; } };
    context.NP_Language = { isEn: function() { return false; } };
}

const idle = {
    trigger: 0,
    vanilla: true,
    conditions: { variableValid: true, variableId: 911, variableValue: 4 },
    list: []
};
const meet = { trigger: 3, vanilla: true, conditions: {}, list: [] };
const rankComment = [
    { code: 108, parameters: ['<KNS_Trigger>'] },
    { code: 408, parameters: ['return $gameVariables.value(9) == 2;'] },
    { code: 408, parameters: ['</KNS_Trigger>'] }
];

function selected(eventId, pages) {
    const ev = Object.create(context.Game_Event.prototype);
    ev._eventId = eventId;
    ev._mapId = 171;
    for (let i = pages.length - 1; i >= 0; i--) {
        if (ev.meetsConditions(pages[i])) return i;
    }
    return -1;
}

reset();
assert.strictEqual(Q.portIdlePageActive(true, true, false), false, 'waiting meeting uncovers page 3');
assert.strictEqual(Q.portIdlePageActive(true, true, true), true, 'switch 301 keeps the story page');
assert.strictEqual(Q.portIdlePageActive(true, false, false), true, 'after the meeting the story page stays');
assert.strictEqual(Q.portIdlePageActive(false, true, false), false, 'variable 911 below 4 does not turn the page on');

assert.strictEqual(selected(1, [meet, idle]), 0, 'rank 2, not met, V911 high: meeting page wins');
switches[301] = true;
assert.strictEqual(selected(1, [meet, idle]), 1, 'switch 301 keeps page 5 over the meeting');
switches[301] = false;
switches[290] = true;
assert.strictEqual(selected(1, [meet, idle]), 1, 'after meeting page 5 stays');
switches[290] = false;
vars[9] = 1;
assert.strictEqual(selected(1, [meet, idle]), 1, 'rank 1 does not uncover the meeting');
vars[9] = 3;
assert.strictEqual(selected(1, [meet, idle]), 0, 'rank 3 still uncovers the meeting');
vars[9] = 2;
idle.vanilla = false;
assert.strictEqual(selected(1, [meet, idle]), 0, 'story page that does not match stays off');
idle.vanilla = true;

const autorunStory = {
    trigger: 3, vanilla: true,
    conditions: { variableValid: true, variableId: 911, variableValue: 4 },
    list: []
};
assert.strictEqual(Q.applyPortPage(1, autorunStory, true), true, 'only the action-button page is the idle page');
context.$gameMap = { mapId: function() { return 13; } };
const evOther = Object.create(context.Game_Event.prototype);
evOther._eventId = 1;
evOther._mapId = 13;
assert.strictEqual(evOther.meetsConditions(idle), true, 'other maps are left alone');
context.$gameMap = { mapId: function() { return 171; } };

const rankPage = { trigger: 0, vanilla: false, conditions: {}, list: rankComment };
const hidePage = { trigger: 0, vanilla: false, conditions: {}, list: [] };
vars[9] = 3;
switches[290] = false;
assert.strictEqual(selected(29, [rankPage, hidePage]), 0, 'sailors visible at rank 3 before the meeting');
assert.strictEqual(selected(30, [rankPage, hidePage]), 0);
assert.strictEqual(selected(31, [rankPage, hidePage]), 0);
switches[290] = true;
hidePage.vanilla = true;
assert.strictEqual(selected(29, [rankPage, hidePage]), 1, 'after the meeting the hide page wins');
hidePage.vanilla = false;
switches[290] = false;
rankPage.vanilla = true;
vars[9] = 2;
assert.strictEqual(selected(29, [rankPage, hidePage]), 0, 'exact rank 2 still uses the original page');

const compound = {
    trigger: 0, vanilla: false, conditions: {},
    list: [{ code: 408, parameters: ['return $gameVariables.value(9) == 2 && $gameSwitches.value(290) == false;'] }]
};
vars[9] = 3;
assert.strictEqual(Q.applyPortPage(29, compound, false), false, 'a compound trigger is not widened');
const otherVar = {
    trigger: 0, vanilla: false, conditions: {},
    list: [{ code: 355, parameters: ['return $gameVariables.value(9) == 2 && $gameVariables.value(5) == 0;'] }]
};
assert.strictEqual(Q.applyPortPage(29, otherVar, false), false, 'a second variable is not widened');

switches[5] = true;
assert.strictEqual(Q.applyPortPage(1, idle, true), true, 'gallery does not change pages');
switches[5] = false;

reset({ 3570: 1, 8: 4, 911: 99, 9: 3 }, {}, [21]);
assert.strictEqual(Q.repairRecruit(), true);
assert.deepStrictEqual(swWrites, [290, 291, 643, 503]);
assert.deepStrictEqual(varWrites, [3570]);
assert.strictEqual(vars[3570], 99);
assert.strictEqual(vars[8], 4);
assert.strictEqual(vars[911], 99);
assert.strictEqual(switches[301], undefined);

reset({ 3570: 2, 8: 4, 911: 8 }, { 643: true }, []);
assert.strictEqual(Q.repairRecruit(), true, 'contract without the meeting flags is repaired');
assert.strictEqual(switches[290], true);
assert.strictEqual(switches[503], false);
assert.strictEqual(vars[8], 4);
assert.strictEqual(vars[911], 8);
assert.ok(swWrites.indexOf(301) < 0);

reset({ 3570: 0 }, { 503: true }, []);
assert.strictEqual(Q.repairRecruit(), false, 'a dead Yarizo who was not hired stays dead');
assert.strictEqual(swWrites.length, 0);

reset({ 3570: 1 }, { 2040: true }, [21]);
assert.strictEqual(Q.repairRecruit(), false, 'switch 2040 is not a safe hire');
assert.strictEqual(vars[3570], 1);
assert.strictEqual(swWrites.length, 0);

reset({ 3570: 99, 8: 21, 911: 99 }, { 290: true, 291: true, 643: true }, [21]);
assert.strictEqual(Q.repairRecruit(), false, 'a coherent hire is left alone');
assert.strictEqual(swWrites.length, 0);
assert.strictEqual(varWrites.length, 0);

reset({ 3570: 1 }, { 503: true }, [21]);
assert.strictEqual(Q.repairRecruit(), true, 'in the party, death is cleared');
assert.strictEqual(switches[503], false);
assert.strictEqual(switches[643], true);

reset({}, {}, []);
assert.strictEqual(Q.repairRecruit(), false, 'an untouched save is not hired');

reset({ 3570: 1 });
const shown = Q.buildProgress([[1, 'old step'], [2, 'guild']]);
assert.ok(shown[0][1].indexOf('западн') >= 0, shown[0][1]);
assert.ok(shown[0][1].indexOf('сама') >= 0, shown[0][1]);
assert.ok(shown[0][1].indexOf('Портов') >= 0, shown[0][1]);
assert.strictEqual(shown[0][1].indexOf('old step'), -1);
context.NP_Language = { isEn: function() { return true; } };
const shownEn = Q.buildProgress([[1, 'old step']]);
assert.ok(shownEn[0][1].indexOf('Port Town') >= 0, shownEn[0][1]);
assert.ok(shownEn[0][1].indexOf('automatically') >= 0, shownEn[0][1]);
assert.ok(shownEn[0][1].indexOf('west edge') >= 0, shownEn[0][1]);
assert.ok(shownEn[0][1].indexOf('water') >= 0, shownEn[0][1]);

['README.md', 'README.ru.md'].forEach(function(name) {
    const text = fs.readFileSync(path.join(root, 'plugins', 'NP_YarizoQuest', name), 'utf8');
    assert.ok(text.indexOf('1.2') >= 0, name);
    assert.ok(/2040/.test(text), name);
    assert.ok(/does not add|не добавляет/.test(text), name);
    assert.ok(/Map171\.json/.test(text), name);
});

assert.ok(src.indexOf('v1.2') >= 0);
assert.ok(!/Map171\.json"/.test(src), 'the plugin does not ship a map file name as data');
console.log('yarizo port checks ok');
