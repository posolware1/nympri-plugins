//=============================================================================
// NP_ItemNameFix.js
//=============================================================================
/*:
 * @plugindesc [RU mod] Rebuilds names/descriptions of saved weapon instances in the current language
 * @author NP RU patch
 *
 * @help
 * Independent weapon instances (YEP_ItemCore, DreamX prefixes/suffixes)
 * keep a copy of their name and description in the save, made in the
 * language that was active when the weapon was obtained. Old saves
 * therefore show "Short Sword", "Mana1 Wooden Mace [Blue Lvl1]" and so on
 * in the Russian game (and Russian names in English mode).
 *
 * On every save load (a language switch restarts the game, so this also
 * covers switching) each instance is parsed as
 *   [prefix] base [suffix] [+bonus]
 * against the JP / RU / EN names of its base weapon and of the
 * prefix/suffix weapons, then rebuilt from the current database names with
 * the same DreamX spacing rules. Unrecognised names are left untouched.
 * Only name, baseItemName and description change; stats, traits, ids,
 * price and notes are never modified.
 *
 * API: NP_ItemNameFix.run() -> {checked, renamed, desc, skipped:[...]}
 */
var Imported = Imported || {};
Imported.NP_ItemNameFix = true;
var NP_ItemNameFix = NP_ItemNameFix || {};

(function() {
    'use strict';

    var TABLES = [['DB_Weapon', function() { return window.$dataWeapons; }],
                  ['DB_Armor',  function() { return window.$dataArmors; }],
                  ['DB_Item',   function() { return window.$dataItems; }]];
    var cache = {};

    function isEn() { return !!(window.NP_Language && NP_Language.isEn && NP_Language.isEn()); }

    function readCsv(paths) {
        for (var i = 0; i < paths.length; i++) {
            try {
                var txt = LoadFileUTF8Escaped(paths[i]);
                if (txt) return new CSV(txt).Data;
            } catch (e) { /* try next */ }
        }
        return null;
    }
    // CSV of the *other* language: {id: [jpName, jpDesc, name, desc]}
    function otherLang(file) {
        if (cache[file] !== undefined) return cache[file];
        var paths;
        if (isEn()) {
            // './csv/./x' is not redirected to lang/en by NP_Language (rel = './x')
            paths = ['./csv/./' + file + '.csv', './www/csv/./' + file + '.csv'];
        } else {
            var www = null;
            try { www = require('path').dirname(process.mainModule.filename).replace(/\\/g, '/'); } catch (e) { www = null; }
            paths = (www ? [www + '/lang/en/csv/' + file + '.csv'] : []).concat(['./www/lang/en/csv/' + file + '.csv', './lang/en/csv/' + file + '.csv']);
        }
        var data = readCsv(paths), out = null;
        if (data) {
            out = {};
            data.forEach(function(r) {
                var m = /^\$id=(\d+)/.exec(r[0] || '');
                if (m) out[m[1]] = [r[2] || '', r[3] || '', r[4] || '', r[5] || ''];
            });
        }
        cache[file] = out;
        return out;
    }

    // names/descriptions of a DB entry in all languages; [0] = current
    function texts(table, file, id) {
        var o = table[id];
        if (!o) return null;
        var cur = {n: o.name || '', d: o.description || ''};
        var res = {cur: cur, names: [cur.n], descs: [cur.d]};
        try {   // JP column through the same CSV getter
            if (typeof KNS_CsvReader === 'object') {
                var g = KNS_CsvReader.getLanguageId;
                KNS_CsvReader.getLanguageId = function() { return 0; };
                try { res.names.push(o.name || ''); res.descs.push(o.description || ''); }
                finally { KNS_CsvReader.getLanguageId = g; }
            }
        } catch (e) { /* ignore */ }
        var ol = otherLang(file);
        var r = ol && ol[id];
        if (r) { res.names.push(r[0], r[2]); res.descs.push(r[1], r[3]); }
        return res;
    }

    function uniq(a) { return a.filter(function(x, i) { return x && a.indexOf(x) === i; }); }

    // ids mentioned in a base note (<Prefixes>, <Suffixes>, KNS_Craft lists)
    function noteIds(note) {
        var s = {}, re = /(\d+)\s*-\s*(\d+)|(\d+)/g, m;
        (note || '').replace(/<(Prefixes|Suffixes)>([\s\S]*?)<\/\1>|(prefix|suffix)\s*:\s*\[([\s\S]*?)\]\s*\]/g, function(all, a, body, b, body2) {
            var t = body || body2 || '';
            while ((m = re.exec(t))) {
                if (m[1]) { for (var k = +m[1]; k <= +m[2] && k - m[1] < 500; k++) s[k] = true; }
                else s[m[3]] = true;
            }
            return all;
        });
        return s;
    }

    var index = {};
    function baseLen(table) {
        if (table === window.$dataWeapons) return DataManager._baseWeaponsLength || table.length;
        if (table === window.$dataArmors) return DataManager._baseArmorsLength || table.length;
        return DataManager._baseItemsLength || table.length;
    }
    function nameIndex(table, file) {
        if (index[file]) return index[file];
        var idx = {}, n = Math.min(table.length, baseLen(table));
        for (var i = 1; i < n; i++) {
            if (!table[i] || table[i].baseItemId) continue;
            var t = texts(table, file, i);
            if (!t) continue;
            uniq(t.names).forEach(function(x) { (idx[x] = idx[x] || []).push(i); });
        }
        return (index[file] = idx);
    }

    function findAffix(table, file, text, base) {
        if (!text) return 0;
        var hits = nameIndex(table, file)[text] || [];
        if (!hits.length) return 0;
        var curNames = uniq(hits.map(function(id) { return table[id].name; }));
        if (curNames.length === 1) return hits[0];
        var ids = noteIds(base && base.note);
        var pref = hits.filter(function(id) { return ids[id]; });
        var curP = uniq(pref.map(function(id) { return table[id].name; }));
        return curP.length === 1 ? pref[0] : -1;   // -1 = ambiguous
    }

    // DreamX combineWithBaseItem name rule
    function compose(baseName, pre, suf) {
        var n = baseName;
        if (pre && !pre.meta.prefixSuffixDontAddName) {
            var pn = pre.meta.prefixSuffixName ? pre.meta.prefixSuffixName : pre.name;
            n = (pre.meta.prefixSuffixNoNameSpace ? pn : pn + ' ') + n;
        }
        n = n.trim();
        if (suf && !suf.meta.prefixSuffixDontAddName) {
            var sn = suf.meta.prefixSuffixName ? suf.meta.prefixSuffixName : suf.name;
            n += (suf.meta.prefixSuffixNoNameSpace ? sn : ' ' + sn);
        }
        return n.trim();
    }

    // parse "<pre> base <suf><extra>" -> {p, s, x} or null
    function parse(table, file, base, s) {
        var bt = texts(table, file, base.id);
        if (!bt) return null;
        var names = uniq(bt.names).sort(function(a, b) { return b.length - a.length; });
        for (var ni = 0; ni < names.length; ni++) {
            var bn = names[ni], from = 0, k;
            while ((k = s.indexOf(bn, from)) >= 0) {
                from = k + 1;
                var pre = s.slice(0, k), rest = s.slice(k + bn.length);
                var extra = '', mx = /\s[+\-]\d+$/.exec(rest);
                var variants = [[rest, '']];
                if (mx) variants.push([rest.slice(0, mx.index), mx[0]]);
                for (var vi = 0; vi < variants.length; vi++) {
                    var sufT = variants[vi][0]; extra = variants[vi][1];
                    var p = 0, q = 0;
                    if (pre) {
                        p = findAffix(table, file, pre.replace(/ $/, ''), base);
                        if (p === 0 && / $/.test(pre)) p = findAffix(table, file, pre, base);
                        if (p <= 0) continue;
                    }
                    if (sufT) {
                        q = findAffix(table, file, sufT.replace(/^ /, ''), base);
                        if (q === 0 && /^ /.test(sufT)) q = findAffix(table, file, sufT, base);
                        if (q <= 0) continue;
                    }
                    return {p: p, s: q, x: extra};
                }
            }
        }
        return null;
    }

    function fixOne(item, table, file, stat) {
        if (!item || !item.baseItemId) return;
        var base = table[item.baseItemId];
        if (!base) return;
        stat.checked++;
        var src = item.baseItemName || item.name || '';
        var r = parse(table, file, base, src);
        if (!r && item.name && item.name !== src) { r = parse(table, file, base, item.name); if (r) src = item.name; }
        if (!r) { if (stat.skipped.length < 50) stat.skipped.push(item.id + ':' + item.name); return; }
        var pre = r.p ? table[r.p] : null, suf = r.s ? table[r.s] : null;
        var nn = compose(base.name, pre, suf) + r.x;
        var oldName = item.name;
        if (item.priorityName && item.priorityName === item.name) item.priorityName = nn;
        item.baseItemName = nn;
        if (typeof ItemManager !== 'undefined' && ItemManager.updateItemName && !item.priorityName) ItemManager.updateItemName(item);
        else if (!item.priorityName) item.name = nn;
        if (item.name !== oldName) { stat.renamed++; if (stat.samples.length < 40) stat.samples.push(oldName + ' -> ' + item.name); }
        // description: base + prefix + suffix (DreamX concatenation), any language -> current
        var parts = [texts(table, file, base.id)];
        if (pre) parts.push(texts(table, file, pre.id));
        if (suf) parts.push(texts(table, file, suf.id));
        if (parts.some(function(t) { return !t; })) return;
        var curD = parts.map(function(t) { return t.cur.d; }).join('');
        if (item.description === curD) return;
        var n = parts[0].descs.length;
        for (var li = 1; li < n; li++) {
            var d = parts.map(function(t) { return t.descs[li] || ''; }).join('');
            if (d && d === item.description) { item.description = curD; stat.desc++; return; }
        }
    }

    NP_ItemNameFix.run = function() {
        var stat = {checked: 0, renamed: 0, desc: 0, skipped: [], samples: []};
        index = {};
        try {
            if (typeof DataManager._independentWeapons === 'undefined') return stat;
            [['_independentWeapons', 0], ['_independentArmors', 1], ['_independentItems', 2]].forEach(function(g) {
                var list = DataManager[g[0]] || [];
                var table = TABLES[g[1]][1](), file = TABLES[g[1]][0];
                list.forEach(function(it) {
                    try { fixOne(it, table, file, stat); } catch (e) { console.warn('NP_ItemNameFix', it && it.id, e); }
                });
            });
        } catch (e) { console.warn('NP_ItemNameFix failed', e); }
        NP_ItemNameFix.last = stat;
        return stat;
    };

    var _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _extract.apply(this, arguments);
        NP_ItemNameFix.run();
    };
})();
