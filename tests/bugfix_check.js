'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'plugins', 'NP_OriginalBugFix', 'NP_OriginalBugFix.js'), 'utf8');
assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(src));
assert.ok(!/CommonEventPatchList\s*=/.test(src));
['README.md', 'README.ru.md'].forEach(function(name) {
    const text = fs.readFileSync(path.join(root, 'plugins', 'NP_OriginalBugFix', name), 'utf8');
    assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(text), name);
});
const options = fs.readFileSync(path.join(root, 'plugins', 'NP_OptionsCategories', 'NP_OptionsCategories.js'), 'utf8');
assert.ok(/npOriginalBugFix:\s*'misc'/.test(options));

function boot() {
    const context = { console: console };
    context.window = context;
    function ConfigManager() {}
    ConfigManager.makeData = function() { return {}; };
    ConfigManager.applyData = function() {};
    context.ConfigManager = ConfigManager;
    function Window_Options() {}
    Window_Options.prototype.addGeneralOptions = function() {};
    Window_Options.prototype.addCommand = function() {};
    context.Window_Options = Window_Options;
    vm.createContext(context);
    vm.runInContext(src, context);
    return context.NP_OriginalBugFix;
}

const F = boot();
F.log = [];
assert.strictEqual(F.SCRIPTS.length, 148);
assert.strictEqual(F.refusesWholesale(), true);
const hashes = {};
F.SCRIPTS.forEach(function(entry) {
    assert.ok(!entry.original, entry.id);
    assert.strictEqual(entry.h.length, 16, entry.id);
    assert.ok(!hashes[entry.h] || hashes[entry.h] === entry.r);
    hashes[entry.h] = entry.r;
    try { new Function(entry.r); }
    catch (e) { assert.fail(entry.id + ' ' + e.message); }
});

const block = F.SCRIPTS.find(function(e) { return e.c && !e.mv; });
const original = 'if (broken)\nend';
const fake = { id: 't_script', c: 1, i: 0, h: F.hash(F.norm(original)), r: 'if (broken) {\n}' };
const list = [
    { code: 355, parameters: ['if (broken)'] },
    { code: 655, parameters: ['end'] }
];
F.applyOne(list, fake);
assert.strictEqual(list[0].parameters[0], 'if (broken) {');
assert.strictEqual(list[1].parameters[0], '}');
assert.ok(F.log.indexOf('patched t_script') >= 0);
const again = F.log.length;
F.applyOne(list, fake);
assert.strictEqual(F.log.length, again, 'second apply is quiet');

const mismatch = [
    { code: 355, parameters: ['something else'] }
];
F.applyOne(mismatch, fake);
assert.strictEqual(mismatch[0].parameters[0], 'something else');
assert.ok(F.log.indexOf('skip t_script') >= 0);

const shown = [{ code: 401, parameters: [original] }];
F.applyOne(shown, { id: 't_text', i: 0, h: fake.h, r: 'nope' });
assert.strictEqual(shown[0].parameters[0], original);
assert.strictEqual(shown[0].code, 401);

const cond = [{ code: 111, parameters: [12, 'a or b'] }];
F.applyOne(cond, { id: 't_111', i: 0, h: F.hash(F.norm('a or b')), r: 'a || b' });
assert.strictEqual(cond[0].parameters[1], 'a || b');

const script001 = F.SCRIPTS.find(function(e) { return e.id === 'script_001'; });
assert.strictEqual(script001.i, 41, 'cmd 42 is the 1-based label of the 655 line; the 355 block is index 41');
const shaped = [];
shaped[41] = { code: 355, parameters: ['if (broken)'] };
shaped[42] = { code: 655, parameters: ['end'] };
F.applyOne(shaped, { id: 'shape_script', i: 41, h: F.hash(F.norm('if (broken)\nend')), r: 'if (broken) {\n}' });
assert.strictEqual(shaped[41].parameters[0], 'if (broken) {');
assert.strictEqual(shaped[42].parameters[0], '}');
assert.strictEqual(shaped[42].code, 655);
const offByOne = [];
offByOne[41] = { code: 355, parameters: ['if (broken)'] };
offByOne[42] = { code: 655, parameters: ['end'] };
F.applyOne(offByOne, { id: 'shape_off', i: 42, h: F.hash(F.norm('if (broken)\nend')), r: 'if (broken) {\n}' });
assert.strictEqual(offByOne[41].parameters[0], 'if (broken)', 'the 1-based index must not be used as the list index');
assert.strictEqual(offByOne[42].parameters[0], 'end');

const condList = [];
condList[4] = { code: 111, parameters: [0, 1, 0] };
condList[5] = { code: 111, parameters: [12, 'a or b'] };
F.applyOne(condList, { id: 'shape_111', i: 5, h: F.hash(F.norm('a or b')), r: 'a || b' });
assert.strictEqual(condList[5].parameters[1], 'a || b');
assert.deepStrictEqual(condList[4].parameters, [0, 1, 0]);

const moveEntry = F.SCRIPTS.find(function(e) { return e.mv; });
assert.ok(moveEntry);
const move = [];
move[moveEntry.i] = {
    code: 205,
    parameters: [-1, { list: [{ code: 45, parameters: ['@opacity = 120'] }, { code: 0 }], repeat: false, skippable: true, wait: true }]
};
assert.strictEqual(F.hash(F.norm('@opacity = 120')), moveEntry.h);
F.applyOne(move, moveEntry);
assert.strictEqual(move[moveEntry.i].parameters[0], -1, 'character id stays in parameters[0]');
assert.strictEqual(move[moveEntry.i].parameters[1].list[0].parameters[0], 'this.opacity = 120;');
const moveWrong = [];
moveWrong[moveEntry.i] = {
    code: 205,
    parameters: [{ list: [{ code: 45, parameters: ['@opacity = 120'] }] }, { list: [] }]
};
F.applyOne(moveWrong, { id: 'shape_move_old', i: moveEntry.i, mv: 1, h: moveEntry.h, r: 'this.opacity = 120;' });
assert.strictEqual(moveWrong[moveEntry.i].parameters[0].list[0].parameters[0], '@opacity = 120');

assert.strictEqual(JSON.stringify(F.CHOICE.indexes), JSON.stringify([237, 243]));
const choice = [];
choice[237] = { code: 102, parameters: [['\\n[2] en(v[133])', 'stay']] };
choice[238] = { code: 102, parameters: [['\\n[2] en(v[133])']] };
choice[243] = { code: 102, parameters: [['\\n[2] en(s[133])']] };
choice[244] = { code: 102, parameters: [['\\n[2] en(v[133])']] };
const data = [];
data[314] = { list: choice };
F.patchSurgical(data);
assert.strictEqual(choice[237].parameters[0][0], '\\n[2] en(s[133])');
assert.strictEqual(choice[237].parameters[0][1], 'stay');
assert.strictEqual(choice[238].parameters[0][0], '\\n[2] en(v[133])', 'the old 1-based slot is not the choice');
assert.strictEqual(choice[244].parameters[0][0], '\\n[2] en(v[133])');
assert.ok(F.log.indexOf('patched ce_patch_314_s133_surgical') >= 0);

const infos = [];
infos[3] = { id: 3 };
infos[96] = { id: 96 };
infos[157] = { id: 157 };
infos[251] = { id: 251 };
const ctx = { mapInfos: infos, wmts: { X: 4, Y: 8 }, readVar: function() { return 0; } };
assert.strictEqual(F.transferPlan([0, 385, 1, 1, 0, 0], ctx).type, 'block');
assert.strictEqual(F.transferPlan([0, 385, 1, 1, 0, 0], ctx).dest.map, 3);
assert.strictEqual(F.transferPlan([0, 385, 1, 1, 0, 0], ctx).dest.x, 4);
assert.strictEqual(F.transferPlan([0, 157, 21, 85, 8, 0], ctx).type, 'block');
infos[217] = { id: 217 };
infos[155] = { id: 155 };
const hits = F.sampleHits(infos);
F.PATCH_NAMES.forEach(function(name) {
    assert.ok(hits[name] > 0, name + ' applied 0 times');
});
const gorgoda = F.transferPlan([0, 385, 23, 18, 6, 0], {
    mapInfos: infos, wmts: ctx.wmts, readVar: function(id) { return id === 334 ? 3 : 0; }
});
assert.strictEqual(gorgoda.type, 'redirect');
assert.strictEqual(gorgoda.map, 217);
assert.strictEqual(gorgoda.x, 5);
assert.strictEqual(gorgoda.y, 37);
assert.strictEqual(gorgoda.d, 6, 'original facing is kept');
assert.strictEqual(gorgoda.fade, 0);
const hut = F.transferPlan([0, 157, 21, 85, 8, 1], {
    mapInfos: infos, wmts: ctx.wmts, readVar: function(id) { return id === 334 ? 37 : 0; }
});
assert.strictEqual(hut.type, 'redirect');
assert.strictEqual(hut.map, 155);
assert.strictEqual(hut.x, 16);
assert.strictEqual(hut.y, 21);
assert.strictEqual(hut.d, 8);
assert.strictEqual(hut.fade, 1);
assert.strictEqual(F.transferPlan([0, 385, 23, 18, 2, 0], ctx).type, 'block');
assert.strictEqual(F.transferPlan([0, 398, 1, 1, 0, 0], ctx).type, 'block');
assert.strictEqual(F.transferPlan([0, 157, 1, 1, 0, 0], ctx), null);
const clamp = F.transferPlan([0, 251, 29, 40, 8, 0], ctx);
assert.strictEqual(clamp.type, 'clamp');
assert.strictEqual(clamp.y, 39);
assert.strictEqual(F.transferPlan([0, 251, 29, 39, 8, 0], ctx), null);
const noWmts = F.transferPlan([0, 364, 1, 1, 0, 0], { mapInfos: infos, wmts: null });
assert.strictEqual(noWmts.dest.map, 96);
assert.strictEqual(noWmts.dest.x, 7);
assert.strictEqual(noWmts.dest.y, 18);

F.isEnabled = function() { return false; };
const off = [{ code: 355, parameters: ['if (broken)'] }, { code: 655, parameters: ['end'] }];
const before = off[0].parameters[0];
F.patchCommonEvents([{ list: off }]);
assert.strictEqual(off[0].parameters[0], before);

console.log('bugfix checks ok');
