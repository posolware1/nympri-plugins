'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'plugins', 'NP_Progression', 'NP_Progression.js'), 'utf8');
assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(src), 'plugin text');
assert.ok(!/\$gameVariables\.setValue\s*\(/.test(src), 'plugin must not write variables');
assert.ok(!/setValue\(\s*(8|9|912|922)\s*,/.test(src));
['README.md', 'README.ru.md'].forEach(function(name) {
    const text = fs.readFileSync(path.join(root, 'plugins', 'NP_Progression', name), 'utf8');
    assert.ok(!/\bOrigin\b|cursor\.com\/codebase/.test(text), name);
    assert.ok(text.indexOf('60') >= 0, name);
    assert.ok(text.indexOf('301010') >= 0, name);
    assert.ok(text.indexOf('\\v[64]') >= 0, name + ' names the real choice');
    assert.ok(!/pointed at 912|переносится на 912/.test(text), name + ' still documents the dropped swap');
});

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
    context.PluginManager = { parameters: function() { return { Rank3Fame: '60' }; } };
    vm.createContext(context);
    vm.runInContext(src, context);
    return context.NP_Progression;
}

const P = boot();
const C = P.COUNT;
assert.strictEqual(P.DEFAULT_FAME, 60);
assert.strictEqual(P.fameThreshold(), 60);
assert.strictEqual(C.afterChapter1, C.storyChapter1 + C.earlySideTurnins);
assert.strictEqual(C.lateMid, C.afterChapter1 + C.rank2Jobs + C.titanHunts);
assert.ok(P.DEFAULT_FAME > C.afterChapter1 && P.DEFAULT_FAME <= C.lateMid && P.DEFAULT_FAME < 150);

assert.strictEqual(P.openRankChoice('話 if(v[1]>9999)'), '話 if(v[1]>9999)');
assert.strictEqual(P.openRankChoice('\\v[64] if(v[1]>9999)'), '\\v[64] if(v[9] >= 2)');
assert.strictEqual(P.openRankChoice('\\v[64] if(v[9] >= 2)'), '\\v[64] if(v[9] >= 2)');

// Real Map013 ev12 shapes from the 0.80j validation log.
const guildList = [
    { code: 102, indent: 0, parameters: [['話', '\\v[64] if(v[1]>9999)'], 0, 0, 2, 0] },
    { code: 402, indent: 0, parameters: [1, 'rank'] },
    { code: 111, indent: 1, parameters: [1, 9, 0, 2, 0] },
    { code: 122, indent: 2, parameters: [54, 54, 0, 0, 150] },
    { code: 111, indent: 2, parameters: [1, 322, 1, 54, 1] },
    { code: 126, indent: 3, parameters: [887, 1, 0, 1] },
    { code: 126, indent: 3, parameters: [888, 0, 0, 1] },
    { code: 122, indent: 3, parameters: [58, 58, 0, 0, 9] },
    { code: 122, indent: 3, parameters: [9, 9, 0, 0, 3] },
    { code: 122, indent: 3, parameters: [8, 8, 0, 0, 1] },
    { code: 122, indent: 3, parameters: [922, 922, 0, 0, 99] },
    { code: 122, indent: 3, parameters: [912, 912, 0, 0, 99] },
    { code: 111, indent: 0, parameters: [1, 322, 0, 10, 1] },
    { code: 111, indent: 0, parameters: [1, 322, 0, 30, 1] },
    { code: 401, indent: 0, parameters: ['\\v[64] if(v[1]>9999)'] }
];
const guild = { events: [] };
guild.events[12] = { pages: [{ list: guildList }] };
const guildHits = P.patchMap(guild, 13);
assert.strictEqual(guildHits.rankChoice, 1);
assert.strictEqual(guildHits.rankFame, 1);
assert.strictEqual(guildList[0].parameters[0][0], '話');
assert.strictEqual(guildList[0].parameters[0][1], '\\v[64] if(v[9] >= 2)');
assert.deepStrictEqual(guildList[3].parameters, [54, 54, 0, 0, 60]);
assert.deepStrictEqual(guildList[4].parameters, [1, 322, 1, 54, 1]);
assert.deepStrictEqual(guildList[5].parameters, [887, 1, 0, 1]);
assert.deepStrictEqual(guildList[6].parameters, [888, 0, 0, 1]);
assert.deepStrictEqual(guildList[8].parameters, [9, 9, 0, 0, 3]);
assert.deepStrictEqual(guildList[9].parameters, [8, 8, 0, 0, 1]);
assert.deepStrictEqual(guildList[10].parameters, [922, 922, 0, 0, 99]);
assert.deepStrictEqual(guildList[11].parameters, [912, 912, 0, 0, 99]);
assert.deepStrictEqual(guildList[12].parameters, [1, 322, 0, 10, 1]);
assert.deepStrictEqual(guildList[13].parameters, [1, 322, 0, 30, 1]);
assert.strictEqual(guildList[14].parameters[0], '\\v[64] if(v[1]>9999)');

const shop = { events: [{ pages: [{ list: [
    { code: 111, parameters: [1, 12, 0, 2, 1] },
    { code: 111, parameters: [1, 12, 0, 3, 1] },
    { code: 111, parameters: [1, 12, 0, 1, 1] },
    { code: 401, parameters: ['v[12] >= 2'] }
] }] }] };
const shopHits = P.patchMap(shop, 18);
assert.strictEqual(shopHits.shop, 2);
assert.deepStrictEqual(shop.events[0].pages[0].list[0].parameters, [1, 9, 0, 2, 1]);
assert.deepStrictEqual(shop.events[0].pages[0].list[1].parameters, [1, 9, 0, 3, 1]);
assert.deepStrictEqual(shop.events[0].pages[0].list[2].parameters, [1, 12, 0, 1, 1]);
assert.strictEqual(shop.events[0].pages[0].list[3].parameters[0], 'v[12] >= 2');

function spawnPair(slot) {
    return [
        { code: 355, parameters: ['id = ' + slot] },
        { code: 655, parameters: ['add_event(x, y, id, 29, 6)'] }
    ];
}
const forestList = [];
for (var r = 0; r < 6; r++) forestList.push.apply(forestList, spawnPair(1));
for (var s = 0; s < 5; s++) forestList.push.apply(forestList, spawnPair(8));
forestList.push.apply(forestList, spawnPair(3));
forestList.push({ code: 355, parameters: ['id = 1'] });
forestList.push({ code: 401, parameters: ['id = 1'] });
const forest = { note: '', events: [{ pages: [{ list: forestList }] }] };
const forestHits = P.patchMap(forest, 177);
assert.strictEqual(forestHits.examNote, 1);
assert.strictEqual(forestHits.spawns, 11);
assert.ok(forest.note.indexOf('<ダンジョンレベル:2>') >= 0);
forestList.forEach(function(cmd, index) {
    if (cmd.code !== 355 || cmd.parameters[0].indexOf('id =') !== 0) return;
    if (index < 22) assert.strictEqual(cmd.parameters[0], 'id = 37', 'slot ' + index);
});
assert.strictEqual(forestList[22].parameters[0], 'id = 3');
assert.strictEqual(forestList[24].parameters[0], 'id = 1');
assert.strictEqual(forestList[25].parameters[0], 'id = 1');
const tagged = { note: '<ダンジョンレベル:1>', events: [] };
assert.strictEqual(P.patchMap(tagged, 176).examNote, 0);
assert.strictEqual(tagged.note, '<ダンジョンレベル:1>');

const ruins = { note: '', events: [] };
assert.strictEqual(P.patchMap(ruins, 263).ruinsNote, 1);
assert.ok(ruins.note.indexOf('<ダンジョンレベル:3>') >= 0);

const agent = { pages: [{ list: [{ code: 111, parameters: [1, 9, 0, 3, 1] }] }] };
const campShop = { pages: [{ list: [
    { code: 302, parameters: [2, 5, 1, 9800] },
    { code: 605, parameters: [2, 14, 1, 26800] }
] }] };
const campMap = { events: [] };
campMap.events[16] = agent;
campMap.events[33] = campShop;
const campHits = P.patchMap(campMap, 288);
assert.deepStrictEqual(agent.pages[0].list[0].parameters, [1, 9, 0, 3, 1]);
assert.deepStrictEqual(campShop.pages[0].list[0].parameters, [2, 5, 1, 4500]);
assert.deepStrictEqual(campShop.pages[0].list[1].parameters, [2, 14, 1, 26800]);
assert.strictEqual(campHits.shopPrices, 1);

const tierShop = { events: [{ pages: [{ list: [
    { code: 111, indent: 0, parameters: [1, 9, 0, 2, 1] },
    { code: 302, indent: 1, parameters: [1, 23, 0, 0] },
    { code: 412, indent: 0, parameters: [] },
    { code: 111, indent: 0, parameters: [1, 9, 0, 3, 1] },
    { code: 302, indent: 1, parameters: [1, 42, 1, 5200] },
    { code: 605, indent: 1, parameters: [2, 4, 0, 0] },
    { code: 605, indent: 1, parameters: [2, 12, 0, 0] },
    { code: 412, indent: 0, parameters: [] }
] }] }] };
const tierHits = P.patchMap(tierShop, 18);
assert.strictEqual(tierHits.hardLeather, 1);
assert.strictEqual(tierHits.shopPrices, 1);
const tierList = tierShop.events[0].pages[0].list;
assert.strictEqual(tierList[2].code, 605);
assert.deepStrictEqual(tierList[2].parameters, [2, 4, 0, 0]);
assert.ok(!tierList.some(function(cmd, index) {
    return index > 3 && cmd.parameters && cmd.parameters[0] === 2 && cmd.parameters[1] === 4;
}));
assert.deepStrictEqual(tierList[5].parameters, [1, 42, 1, 3600]);

const port = { events: [{ pages: [{ list: [
    { code: 302, parameters: [0, 10, 1, 200] },
    { code: 605, parameters: [0, 50, 1, 2000] },
    { code: 605, parameters: [0, 2, 0, 0] }
] }] }] };
const portHits = P.patchMap(port, 176);
assert.strictEqual(portHits.portPrices, 2);
assert.strictEqual(port.events[0].pages[0].list[0].parameters[3], 120);
assert.strictEqual(port.events[0].pages[0].list[1].parameters[3], 1000);
assert.strictEqual(port.events[0].pages[0].list[2].parameters[3], 0);

const armors = [];
const weapons = [];
armors[11] = { price: 4500 };
armors[4] = { price: 2800 };
armors[12] = { price: 9800 };
armors[48] = { price: 6200 };
armors[5] = { price: 9800 };
armors[14] = { price: 26800 };
weapons[42] = { price: 5200 };
const enemies = [];
enemies[112] = []; enemies[112][26] = 'I305:1:60,I306:1:40';
enemies[905] = []; enemies[905][26] = '';
enemies[906] = []; enemies[906][26] = '';
const dbHits = P.patchDatabases(armors, weapons, enemies);
assert.strictEqual(dbHits.prices, 5);
assert.strictEqual(armors[11].price, 3000);
assert.strictEqual(armors[4].price, 2800);
assert.strictEqual(armors[12].price, 6000);
assert.strictEqual(armors[48].price, 4000);
assert.strictEqual(armors[5].price, 4500);
assert.strictEqual(armors[14].price, 26800);
assert.strictEqual(weapons[42].price, 3600);
assert.strictEqual(dbHits.drops, 3);
assert.strictEqual(enemies[112][26], 'I305:1:60,I306:1:40,G:30:60');
assert.strictEqual(enemies[905][26], 'G:80:100');
assert.strictEqual(enemies[906][26], 'G:80:100');

const quests = {
    301010: { release_conds: '$v[9] >= 3', rewards: [] },
    301011: { release_conds: '$v[9] >= 3', rewards: [] },
    201003: { release_conds: '$v[9] >= 2', rewards: [[100, 0]] }
};
const questHits = P.patchQuests(quests);
assert.strictEqual(questHits.reward, 'granted');
assert.strictEqual(questHits.lock, 'locked');
assert.strictEqual(quests[301010].release_conds, '$v[9] >= 3');
assert.strictEqual(quests[301010].rewards.length, 1);
assert.strictEqual(quests[301010].rewards[0][0], 300);
assert.strictEqual(quests[301010].rewards[0][1], 0);
assert.strictEqual(quests[301011].release_conds, '$v[1] > 9999');
assert.deepStrictEqual(quests[201003].rewards, [[100, 0]]);

const totals = {
    rankChoice: guildHits.rankChoice,
    rankFame: guildHits.rankFame,
    shop: shopHits.shop,
    examNote: forestHits.examNote,
    spawns: forestHits.spawns,
    ruinsNote: 1,
    prices: dbHits.prices,
    hardLeather: tierHits.hardLeather,
    portPrices: portHits.portPrices,
    drops: dbHits.drops,
    quest301010Reward: 1,
    quest301011Lock: 1
};
P.PATCH_NAMES.forEach(function(name) {
    assert.ok(totals[name] > 0, name + ' applied 0 times');
});
assert.strictEqual(P.warnings.length, 0, P.warnings.join('\n'));

const again = P.patchMap(guild, 13);
assert.strictEqual(again.rankChoice, 0);
assert.strictEqual(again.rankFame, 0);
assert.strictEqual(P.patchMap(shop, 18).shop, 0);
assert.strictEqual(P.patchMap(forest, 177).spawns, 0);
assert.strictEqual(P.patchMap(forest, 177).examNote, 0);
assert.strictEqual(P.patchMap(ruins, 263).ruinsNote, 0);
assert.strictEqual(P.patchMap(campMap, 288).shopPrices, 0);
assert.strictEqual(P.patchMap(port, 176).portPrices, 0);
assert.strictEqual(P.patchMap(tierShop, 18).hardLeather, 0);
assert.strictEqual(P.patchDatabases(armors, weapons, enemies).prices, 0);
assert.strictEqual(P.patchDatabases(armors, weapons, enemies).drops, 0);
assert.strictEqual(P.patchQuests(quests).reward, 'already');
assert.strictEqual(P.patchQuests(quests).lock, 'already');
assert.strictEqual(P.warnings.length, 0, 'second pass warned: ' + P.warnings.join('\n'));

P.warned = {};
P.warnings = [];
const missing = { events: [] };
missing.events[12] = { pages: [{ list: [{ code: 0, parameters: [] }] }] };
const missed = P.patchMap(missing, 13);
assert.strictEqual(missed.rankChoice, 0);
assert.strictEqual(missed.rankFame, 0);
assert.ok(P.warnings.some(function(line) { return line.indexOf('rankChoice matched 0') >= 0; }));
assert.ok(P.warnings.some(function(line) { return line.indexOf('rankFame matched 0') >= 0; }));

P.isEnabled = function() { return false; };
const frozen = JSON.stringify(guildList[0].parameters[0]);
assert.strictEqual(P.patchMap(guild, 13).rankChoice, 0);
assert.strictEqual(JSON.stringify(guildList[0].parameters[0]), frozen);

console.log('progression checks ok');
