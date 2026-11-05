//=============================================================================
// NP_EliteRewards.js - six elite trophies; add after NP_Items and NP_EliteMobs.
//=============================================================================
/*:
 * @plugindesc v1.0 Six elite trophies; append-only data and map-battle hooks.
 * @author NymPri RU mod
 * @help
 * Load after NP_Items and NP_EliteMobs. Do not edit the original databases.
 * Base IDs: W701 twinneedle; A1000 huntcompass; A1001 misslens;
 * A1002 sporecase; A1003 duskfork; A1004 reservebead.
 *
 * Database records are appended BEFORE YEP_ItemCore records base lengths and
 * parses notes. Existing IDs are never shifted or overwritten. Dynamic weapon
 * IDs still begin at 3001. An occupied reserved ID or changed CE anchor is an
 * explicit boot error rather than a partly working reward.
 *
 * Hunt compass reads existing NP_RareMobs.rareOf map events, without RNG.
 * Miss lens: one +1 HIT after a missed ordinary attack; next attempt consumes it.
 * Twin needle: every second successful ordinary hit +1 before armor, not
 * multiplied by critical/weakness. Misses do not advance; unequip resets it.
 * Spore case: completed healing items that actually heal grant the recipient a
 * non-stacking 2 HP barrier for one direct enemy hit. Two activations per wearer
 * per battle, expiring at the end of the next enemy turn. Refunds do not refill.
 * Dusk fork: a damaging normal/magic hit binds the current dangerous telegraph
 * of the SIX NEW elites. Its exact execution deals -2 to each target (min 1).
 * One execution per wearer per battle; an interrupted telegraph spends nothing.
 * Reserve bead: paid healing skills with actual HP restored accumulate actual
 * MP spent and overheal on non-full targets. At 2 MP and 3 overheal refund 1 MP,
 * once per battle. Party healing pays once. Items/regen/lifesteal/free casts and
 * full-HP targets do not qualify.
 *
 * NP_EliteMobs integration:
 * pendingDamageIntent() -> {id,key,target,status:'telegraph',damage:true}|null
 * executingDamageIntent() -> the same object, status:'executing', or null
 * onItemUsed(actorId,itemId) <- completed, actually consumed item, once
 * NP_EliteRewards.finishIntent(id, interrupted) <- execution/cancellation
 * No quests, original sprites or unrelated event content are modified.
 */
var NP_EliteRewards = (function() {
    'use strict';
    var R = { VERSION: '1.0.1', IDS: { twinneedle: 701, huntcompass: 1000, misslens: 1001, sporecase: 1002, duskfork: 1003, reservebead: 1004 } };
    function L(ru, en) { return typeof NP_L === 'function' ? NP_L(ru, en) : ru; }
    function gv(id) { return window.$gameVariables ? Number($gameVariables.value(id)) || 0 : 0; }
    function gs(id) { return !!(window.$gameSwitches && $gameSwitches.value(id)); }
    function active() { return gs(14) && !gs(5); }
    function actor(id) { return window.$gameActors ? $gameActors.actor(Number(id)) : null; }
    function party() { return window.$gameParty ? $gameParty.members() : []; }
    function isParty(id) { return party().some(function(a) { return a.actorId() === Number(id); }); }
    function wears(id, key, weaponOnly) { return !!(window.NP_Items && NP_Items.wears(id, key, weaponOnly)); }
    function log(ru, en) { if (typeof set_mlog === 'function') set_mlog(L(ru, en)); }
    function excluded() { var s = window.NP_SuperAttack || window.NP_Super; return !!(s && (s.running || s._dotTick)); }
    function isPowerStrike(id) { return !!(id > 0 && window.NP_PowerStrike && Number(NP_PowerStrike._tpActor) === id); }
    function mob() { return window.NP_EliteMobs || null; }
    function pending() { var m = mob(); return m && m.pendingDamageIntent ? m.pendingDamageIntent() : null; }
    function executing() { var m = mob(); return m && m.executingDamageIntent ? m.executingDamageIntent() : null; }
    function fail(message) { throw new Error('[NP_EliteRewards] ' + message); }

    // Append before all existing notetag readers; no JSON or CSV replacements.
    R.records = function() {
        function armor(id, key, atype, icon, ru, en, dr, de, price) {
            return { id: id, atypeId: atype, etypeId: 10, iconIndex: icon,
                name: L(ru, en), description: L(dr, de), note: '<NP_ITEM:' + key + '>\n<NP_ELITE_REWARD:1>',
                params: [0,0,0,0,0,0,0,0], traits: [], price: price };
        }
        return {
            weapons: [{ id: 701, animationId: 0, etypeId: 1, wtypeId: 4, iconIndex: 147,
                name: L('Двойное жало', 'Twin Needle'), price: 2800,
                description: L('[Меч][HIT:4][DMG:2][FAT:3][REQ:3]\nКаждое 2-е обычное попадание: +1 до брони. Снятие сбрасывает счёт.',
                    '[Sword][HIT:4][DMG:2][FAT:3][REQ:3]\nEvery 2nd ordinary hit: +1 before armor. Unequipping resets the count.'),
                note: '<HIT:4>\n<DMG:2>\n<FAT:3>\n<REQ:3>\n<ANM:7>\n<NP_ITEM:twinneedle>\n<NP_ELITE_REWARD:1>',
                params: [0,0,0,0,0,0,0,0], traits: [{code:31,dataId:1,value:0},{code:22,dataId:0,value:0}] }],
            armors: [
                armor(1000,'huntcompass',1,657,'Компас следопыта','Tracker Compass',
                    'Пока надет: направление к уже появившемуся редкому врагу\nна текущей карте. Не вызывает врагов и не меняет шанс появления.',
                    'While worn: points to an already spawned rare on this map.\nDoes not summon enemies or change spawn chances.',2500),
                armor(1001,'misslens',1,653,'Линза ответного удара','Second-Chance Lens',
                    'После промаха обычной атакой: +1 HIT к следующей попытке.\nНе складывается; навык или супер-удар не тратит бонус.',
                    'After an ordinary miss: +1 HIT for the next ordinary attempt.\nDoes not stack. Skills and supers do not consume the bonus.',2500),
                armor(1002,'sporecase',10,648,'Споровый футляр','Spore Case',
                    '[Зельеварка] Лечащий предмет, вернувший HP: цели щит 2 HP.\nНа 1 прямой удар, до конца следующего хода врага; 2 раза/бой.',
                    '[Potion Maker] An item restoring HP gives its target a 2 HP shield.\nOne direct hit, until next enemy turn ends; twice per battle.',3000),
                armor(1003,'duskfork',13,649,'Камертон сумерек','Dusk Tuning Fork',
                    '[Вампир] Попадание при замахе нового элитника: его атака −2\nкаждой цели (мин. 1). Раз/бой. Прерванный замах не тратит заряд.',
                    '[Vampire] Hit a new elite during a telegraph: that attack deals −2\nto each target (min 1), once/battle. Interrupts spend no charge.',3000),
                armor(1004,'reservebead',8,651,'Капля резерва','Reserve Droplet',
                    '[Жрица] Оплаченное MP лечение раненых копит MP и перелечение.\nПотрачено 2 MP и лишних 3 HP: вернуть 1 MP, раз за бой.',
                    '[Priestess] Paid healing of injured allies counts MP and overheal.\nAt 2 MP spent and 3 excess HP, refund 1 MP once per battle.',3000)
            ]
        };
    };
    R.appendRecords = function(group, kind) {
        var recs = R.records()[kind]; if (!group || !recs) return;
        var expected = kind === 'weapons' ? 701 : 1000;
        if (group.length < expected) fail(kind + ' base database is shorter than the verified version.');
        recs.forEach(function(record) {
            var old = group[record.id];
            if (old) {
                if (old.id === record.id && old.note === record.note && old._npEliteReward === R.VERSION) return;
                fail(kind + ' reserved ID ' + record.id + ' is occupied; no data was overwritten.');
            }
            record._npEliteReward = R.VERSION;
            group[record.id] = record;
            if (DataManager.extractMetadata) DataManager.extractMetadata(record);
        });
    };
    var _onLoad = DataManager.onLoad;
    DataManager.onLoad = function(object) {
        if (object === window.$dataWeapons) R.appendRecords(object, 'weapons');
        if (object === window.$dataArmors) R.appendRecords(object, 'armors');
        return _onLoad.apply(this, arguments);
    };

    // Plain, save-safe state; short-lived action contexts remain in Game_Temp.
    R.state = function() {
        if (!window.$gameSystem) return null;
        var s = $gameSystem._npEliteRewardsB;
        if (!s || s.version !== 1) s = $gameSystem._npEliteRewardsB = {version:1, actors:{}, barriers:{}, enemyEnds:0, bindings:{}};
        return s;
    };
    function temp() {
        if (!window.$gameTemp) return {attacks:[],actions:[]};
        return $gameTemp._npEliteRewardsRuntime || ($gameTemp._npEliteRewardsRuntime = {attacks:[],actions:[]});
    }
    function actorState(id) {
        var s = R.state(); if (!s) return {};
        return s.actors[id] || (s.actors[id] = {lens:false,twinHits:0,twinWeapon:'',spores:0,duskUsed:false,paidMp:0,overheal:0,beadUsed:false});
    }
    function weaponSignature(id) {
        var a = actor(id); if (!a || !a.weapons) return '';
        return a.weapons().filter(function(w) { return w && NP_Items.tagsOf(w).twinneedle; }).map(function(w) {
            return String(w.id) + ':' + String(w.baseItemId || w.id);
        }).join('|');
    }
    R.checkEquipment = function(id) {
        if (!active()) return;
        var a = actorState(id), sig = weaponSignature(id);
        if (a.twinWeapon !== sig) { a.twinHits = 0; a.twinWeapon = sig; }
        if (!wears(id, 'misslens')) a.lens = false;
        if (!wears(id, 'duskfork')) {
            var bindings = R.state().bindings;
            Object.keys(bindings).forEach(function(k) { if (bindings[k].owner === id && !bindings[k].spent) delete bindings[k]; });
        }
    };
    R.resetBattle = function() {
        if (window.$gameSystem) $gameSystem._npEliteRewardsB = null;
        if (window.$gameTemp) $gameTemp._npEliteRewardsRuntime = null;
    };
    var _switch = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(id, value) {
        var old = this.value(id), out = _switch.apply(this, arguments);
        if (id === 14 && old !== this.value(id)) R.resetBattle();
        return out;
    };
    if (Game_Actor.prototype.refresh) {
        var _refresh = Game_Actor.prototype.refresh;
        Game_Actor.prototype.refresh = function() {
            var out = _refresh.apply(this, arguments);
            // A refresh can occur inside Game_Actor.setup before equips exist.
            if (this._equips && window.NP_Items && window.$gameActors && $gameActors._data && $gameActors._data[this.actorId()] === this) R.checkEquipment(this.actorId());
            return out;
        };
    }
    function attackFor(interp) { return interp && interp._npEliteAttack; }
    function currentAction() { var a = temp().actions; return a.length ? a[a.length - 1] : null; }
    function currentAttack() { var a = temp().attacks; return a.length ? a[a.length - 1] : null; }
    function removeContext(list, value) { var at = list.indexOf(value); if (at >= 0) list.splice(at, 1); }

    // CE36 outcome hooks, independent of its misleading attacking_hit cleanup.
    R.beginAttack = function(interp) {
        var aid = gv(270), a = currentAction(), ordinary = active() && aid > 0 && aid < 100 && !excluded() && !isPowerStrike(aid) && !gs(17) &&
            window.$using_item != 1 && window.$using_skill != 1 && window.$item_attack != 1 && !(a && a.kind);
        var magical = active() && aid > 0 && aid < 100 && !excluded() && !isPowerStrike(aid) && gs(17) && window.$using_item != 1 && !(a && a.kind === 'item');
        if (attackFor(interp)) R.endAttack(interp);
        var ctx = {owner:aid,ordinary:ordinary,magical:magical,hit:false,lens:0,damageApplied:false,pendingId:null,enemyBefore:0};
        if (ordinary) {
            R.checkEquipment(aid);
            var st = actorState(aid);
            if (wears(aid, 'misslens') && st.lens) ctx.lens = 1;
            st.lens = false; // even a blind miss consumes this next attempt.
        }
        var p = pending(); if (p && p.damage && p.status === 'telegraph') ctx.pendingId = p.id;
        interp._npEliteAttack = ctx; temp().attacks.push(ctx);
    };
    R.addHitBonus = function(interp) {
        var c = attackFor(interp);
        if (c && c.ordinary && c.lens) $gameVariables.setValue(117, gv(117) + c.lens);
    };
    R.markHit = function(interp) { var c = attackFor(interp); if (c) c.hit = true; };
    R.beforeArmor = function(interp, damage) {
        var c = attackFor(interp);
        if (!c || !c.ordinary || !c.hit || c.damageApplied) return damage;
        c.damageApplied = true;
        R.checkEquipment(c.owner);
        if (!wears(c.owner, 'twinneedle', true)) return damage;
        var st = actorState(c.owner); st.twinHits++;
        var bonus = st.twinHits % 2 === 0 ? 1 : 0;
        if (bonus) $gameVariables.setValue(144, gv(144) + bonus);
        return Number(damage) + bonus;
    };
    R.beforeEnemyDamage = function(interp) { var c = attackFor(interp); if (c) c.enemyBefore = gv(123); };
    R.afterEnemyDamage = function(interp) {
        var c = attackFor(interp);
        if (!c || !c.hit || !(c.ordinary || c.magical) || !(c.enemyBefore > gv(123)) || !wears(c.owner,'duskfork')) return;
        var p = pending(); if (!p || !p.damage || p.status !== 'telegraph' || p.id !== c.pendingId) return;
        var st = actorState(c.owner), s = R.state();
        if (st.duskUsed || s.bindings[p.id]) return;
        s.bindings[p.id] = {owner:c.owner,spent:false,targets:{}};
        log('Камертон сумерек приглушает готовящуюся атаку.', 'The dusk tuning fork dampens the pending attack.');
    };
    R.endAttack = function(interp) {
        var c = attackFor(interp); if (!c) return;
        if (active() && c.ordinary && !c.hit && wears(c.owner, 'misslens')) actorState(c.owner).lens = true;
        removeContext(temp().attacks,c); delete interp._npEliteAttack;
    };

    R.cancelContexts = function(interp) {
        if (!interp) return;
        if (interp._childInterpreter) R.cancelContexts(interp._childInterpreter);
        var c = interp._npEliteAttack;
        if (c) { removeContext(temp().attacks,c); delete interp._npEliteAttack; }
        R.endAction(interp,false);
    };
    ['clear','terminate'].forEach(function(method) {
        var original = Game_Interpreter.prototype[method];
        if (!original) return;
        Game_Interpreter.prototype[method] = function() { R.cancelContexts(this); return original.apply(this,arguments); };
    });

    // Binding is not a charge. The first actual damage execution spends it.
    R.reduceIntentDamage = function(intentId, targetId, damage) {
        damage = Number(damage) || 0;
        if (!active() || damage <= 0 || excluded()) return damage;
        var s = R.state(), b = s.bindings[intentId];
        if (!b || b.targets[targetId]) return damage;
        if (!b.spent) {
            var a = actorState(b.owner);
            if (a.duskUsed || !wears(b.owner,'duskfork') || !isParty(b.owner)) { delete s.bindings[intentId]; return damage; }
            a.duskUsed = true; b.spent = true;
        }
        b.targets[targetId] = true;
        return Math.max(1, damage - 2);
    };
    R.finishIntent = function(intentId, interrupted) {
        var s = R.state(); if (s) delete s.bindings[intentId];
        // Interrupted before any damage never set duskUsed; no refund is needed.
    };
    R.enemyTurnEnd = function() {
        if (!active()) return;
        var s = R.state(); s.enemyEnds++;
        Object.keys(s.barriers).forEach(function(k) { if (s.barriers[k].until <= s.enemyEnds) delete s.barriers[k]; });
    };
    R.mitigateDirectDamage = function(targetId, damage) {
        var result = {targetId:Number(targetId), damage:Number(damage), dusk:0, spores:0, applied:false};
        var target = actor(targetId), intent = executing();
        if (!active() || excluded() || !isParty(targetId) || !target || target.hp <= 0 || !(damage > 0)) return result;
        if (intent && intent.damage && intent.status === 'executing') {
            result.damage = R.reduceIntentDamage(intent.id,targetId,result.damage);
            result.dusk = Number(damage)-result.damage;
        }
        var beforeBarrier = result.damage;
        result.damage = R.absorbBarrier(targetId,result.damage);
        result.spores = beforeBarrier-result.damage;
        return result;
    };
    R.prepareDirectDamage = function(interp, damage) {
        var c = attackFor(interp);
        if (!c || c.owner < 100 || !c.hit) return damage;
        // CE36 has finished armor and target redirection here, but has not yet
        // assigned V54 or printed either damage line. Preserve true V145 armor.
        if (!c.preparedDamage) c.preparedDamage = R.mitigateDirectDamage(gv(271),damage);
        return c.preparedDamage.damage;
    };
    R.logDamageDetails = function(interp) {
        var c = attackFor(interp), p = c && c.preparedDamage;
        if (!p || !(p.dusk || p.spores)) {
            if (typeof set_mlog === 'function') set_mlog('_log_database_text_battle_damage_details');
            return;
        }
        // The legacy detail line knows only damage and armor. Name each new
        // reduction instead of presenting a false damage-minus-armor equation.
        var ru = '(Урон: ' + gv(144) + '; броня: ' + gv(145);
        var en = '(Damage: ' + gv(144) + '; armor: ' + gv(145);
        if (p.dusk) { ru += '; камертон: −' + p.dusk; en += '; tuning fork: −' + p.dusk; }
        if (p.spores) { ru += '; споровый щит: −' + p.spores; en += '; spore shield: −' + p.spores; }
        log(ru + ')',en + ')');
    };
    R.directEnemyDamage = function(interp, targetId, damage) {
        var t = temp(), prev = t.directScope, prevPrepared = t.preparedDirect, c = attackFor(interp);
        t.directScope = c && c.owner >= 100 && c.hit ? c : null;
        var p = c && c.preparedDamage;
        t.preparedDirect = p && !p.applied && p.targetId === Number(targetId) && p.damage === Number(damage) ? p : null;
        try { var target = actor(targetId); if (target) target.gainHp(-damage); }
        finally { t.directScope = prev; t.preparedDirect = prevPrepared; }
    };
    R.absorbBarrier = function(targetId, damage) {
        var s = R.state(), b = s && s.barriers[targetId];
        if (!active() || !b || !(damage > 0) || excluded()) return damage;
        delete s.barriers[targetId]; // one successful direct hit, no residual shield.
        return Math.max(0, damage - 2);
    };

    // Explicit CE37 source + command311 healing scope excludes ambient healing.
    R.beginAction = function(interp) {
        if (interp._npEliteAction) R.endAction(interp, false);
        if (!active() || gv(270) <= 0 || gv(270) >= 100 || excluded()) return;
        var raw = $gameVariables.value(155), id = Number(raw && raw.id || raw) || 0;
        var kind = window.$using_item == 1 ? 'item' : 'skill';
        var a = {owner:gv(270),id:id,kind:kind,heals:{},paidMp:0,consumed:false,notified:false};
        interp._npEliteAction = a; temp().actions.push(a);
    };
    R.endAction = function(interp, completed) {
        var a = interp && interp._npEliteAction; if (!a) return;
        removeContext(temp().actions,a); delete interp._npEliteAction;
        if (!completed || !active() || excluded()) return;
        var st = actorState(a.owner), s = R.state(), keys = Object.keys(a.heals);
        if (a.kind === 'item') {
            if (a.consumed && !a.notified) {
                a.notified = true;
                var m = mob(); if (m && m.onItemUsed) m.onItemUsed(a.owner,a.id);
            }
            if (!a.consumed || !wears(a.owner,'sporecase')) return;
            keys.some(function(k) {
                if (st.spores >= 2) return true;
                if (a.heals[k].actual < 1 || s.barriers[k] || !isParty(k)) return false;
                var target = actor(k); if (!target || target.hp <= 0) return false;
                s.barriers[k] = {owner:a.owner,until:s.enemyEnds+1}; st.spores++;
                log('Споровый футляр: ' + target.name() + ' получает щит 2 HP.', 'Spore case: ' + target.name() + ' gains a 2 HP shield.');
                return false;
            });
        } else if (a.kind === 'skill' && !st.beadUsed && wears(a.owner,'reservebead') && a.paidMp > 0) {
            var actual = 0, over = 0;
            keys.forEach(function(k) { actual += a.heals[k].actual; over += a.heals[k].over; });
            if (!(actual > 0)) return;
            st.paidMp += a.paidMp; st.overheal += over;
            if (st.paidMp >= 2 && st.overheal >= 3) {
                st.beadUsed = true;
                var caster = actor(a.owner); if (caster) caster.gainMp(1);
                log('Капля резерва возвращает 1 MP.', 'The reserve droplet restores 1 MP.');
            }
        }
    };
    function isSourceList(interp, id) { return !!(window.$dataCommonEvents && $dataCommonEvents[id] && interp._list === $dataCommonEvents[id].list); }
    var _hpCommand = Game_Interpreter.prototype.command311;
    Game_Interpreter.prototype.command311 = function() {
        var a = currentAction(), t = temp(), prev = t.healScope;
        if (a && this._params[2] === 0 && ((a.kind === 'item' && isSourceList(this,350)) || (a.kind === 'skill' && isSourceList(this,351)))) t.healScope = a;
        else t.healScope = null;
        try { return _hpCommand.apply(this, arguments); } finally { t.healScope = prev; }
    };
    var _mpCommand = Game_Interpreter.prototype.command312;
    Game_Interpreter.prototype.command312 = function() {
        var a = currentAction(), caster = a && actor(a.owner), before = caster ? caster.mp : 0;
        var ok = !!(a && a.kind === 'skill' && this._params[2] === 1 && isSourceList(this,351));
        var out = _mpCommand.apply(this, arguments);
        if (ok && caster) a.paidMp += Math.max(0,before-caster.mp);
        return out;
    };
    var _lose = Game_Party.prototype.loseItem;
    Game_Party.prototype.loseItem = function(item, amount, includeEquip) {
        var a = currentAction(), before = item ? this.numItems(item) : 0, out = _lose.apply(this, arguments);
        if (a && a.kind === 'item' && item && Number(item.id) === a.id && item.consumable && amount > 0 && this.numItems(item) < before) a.consumed = true;
        return out;
    };
    // Legacy rare custom attacks (goblin flask / raiju AoE) are direct hits
    // too. Scope their enemyAct call only: fire recoil, death explosions and
    // turn-start DOTs remain outside this scope and cannot consume the shield.
    R.hookRareDamage = function() {
        var rare = window.NP_RareMobs;
        if (!rare || !rare.enemyAct || rare._npEliteRewardDirectHook) return;
        var original = rare.enemyAct; rare._npEliteRewardDirectHook = true;
        rare.enemyAct = function() {
            var t = temp(), prev = t.rareDirect; t.rareDirect = true;
            try { return original.apply(this,arguments); } finally { t.rareDirect = prev; }
        };
    };
    R.hookRareDamage();
    var _setHp = Game_BattlerBase.prototype.setHp;
    Game_BattlerBase.prototype.setHp = function(hp) {
        var old = this._hp, request = Number(hp), id = this.isActor && this.isActor() ? this.actorId() : 0;
        var t = temp(), scope = t.healScope, c = currentAttack(), intent = executing();
        var direct = active() && !excluded() && isParty(id) && old > 0 && request < old &&
            (t.rareDirect || (intent && intent.damage && intent.status === 'executing') || (t.directScope && t.directScope.owner >= 100 && t.directScope.hit));
        var prepared = t.preparedDirect, alreadyPrepared = prepared && !prepared.applied && prepared.targetId === id && prepared.damage === old-request;
        if (alreadyPrepared) prepared.applied = true;
        else if (direct) hp = old-R.mitigateDirectDamage(id,old-request).damage;
        var out = _setHp.call(this,hp);
        if (scope && active() && !excluded() && isParty(id) && old > 0 && old < this.mhp && request > old && this._hp > old) {
            var record = scope.heals[id] || (scope.heals[id] = {actual:0,over:0});
            record.actual += this._hp-old;
            record.over += Math.max(0,request-this.mhp);
        }
        return out;
    };

    // Compass: read-only observation of the current map, including looped maps.
    R.compassTarget = function() {
        if (!window.$gameMap || !window.$gamePlayer || gs(14) || gs(5) || !party().some(function(a) { return wears(a,'huntcompass'); })) return null;
        var rare = window.NP_RareMobs;
        if (!rare || !rare.rareOf) return null;
        var best = null;
        $gameMap.events().forEach(function(ev) {
            if (!ev || ev._erased || (ev._mapId != null && ev._mapId !== $gameMap.mapId()) || (ev.page && !ev.page()) || !rare.rareOf(ev)) return;
            var dx = $gameMap.deltaX ? $gameMap.deltaX(ev.x,$gamePlayer.x) : ev.x-$gamePlayer.x;
            var dy = $gameMap.deltaY ? $gameMap.deltaY(ev.y,$gamePlayer.y) : ev.y-$gamePlayer.y;
            var d = Math.abs(dx)+Math.abs(dy);
            if (!best || d < best.distance) best = {eventId:ev.eventId(),dx:dx,dy:dy,distance:d};
        });
        return best;
    };
    R.compassText = function() {
        if (gs(14) || gs(5) || !party().some(function(a) { return wears(a,'huntcompass'); })) return '';
        var p = R.compassTarget();
        if (!p) return L('Компас: следа нет', 'Compass: no trail');
        if (!p.distance) return L('Компас: редкий враг здесь', 'Compass: rare enemy here');
        var ru = ['восток','юго-восток','юг','юго-запад','запад','северо-запад','север','северо-восток'];
        var en = ['east','south-east','south','south-west','west','north-west','north','north-east'];
        var n = (Math.round(Math.atan2(p.dy,p.dx)/(Math.PI/4))+8)%8;
        return L('Компас: '+ru[n], 'Compass: '+en[n]);
    };
    if (typeof Scene_Map !== 'undefined' && typeof Sprite !== 'undefined' && typeof Bitmap !== 'undefined') {
        var _mapUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            var out = _mapUpdate.apply(this,arguments), text = R.compassText();
            if (!this._npEliteCompass && text) {
                this._npEliteCompass = new Sprite(new Bitmap(300,34));
                this._npEliteCompass.x = Math.max(0,Graphics.boxWidth-312); this._npEliteCompass.y = 10;
                this.addChild(this._npEliteCompass);
            }
            var sp = this._npEliteCompass;
            if (sp) {
                sp.visible = !!text && !(window.$gameMessage && $gameMessage.isBusy());
                if (sp._npText !== text) {
                    sp._npText = text; sp.bitmap.clear();
                    sp.bitmap.fillRect(0,0,300,34,'rgba(20,25,30,0.78)');
                    sp.bitmap.fontSize = 18; sp.bitmap.textColor = '#ffe8aa';
                    sp.bitmap.drawText(text,8,0,284,34,'center');
                }
            }
            return out;
        };
    }

    // Transactional, exact unique anchors; never splice into a 355/655 script.
    function unique(list, test, name) {
        var found = [];
        list.forEach(function(c,i) { if (test(c,i,list)) found.push(i); });
        if (found.length !== 1) fail(name + ': expected one anchor, found ' + found.length + '.');
        return found[0];
    }
    function script(text, indent) { return {code:355,indent:indent || 0,parameters:[text],npEliteRewards:true}; }
    R.injectCommonEvents = function() {
        var changes = [];
        function patch(id, fn) {
            var ce = window.$dataCommonEvents && $dataCommonEvents[id]; if (!ce || !ce.list) fail('Missing CE' + id);
            if (ce.list.some(function(c) { return c.npEliteRewards; })) return;
            var list = ce.list.slice(); fn(list); changes.push({ce:ce,list:list});
        }
        function label(list,name) { return unique(list,function(c) { return c.code===118 && c.parameters[0]===name; },'label '+name); }
        patch(36,function(list) {
            var ops=[];
            function before(test,code,name) { var at=unique(list,test,'CE36 '+name); ops.push({at:at,c:script(code,list[at].indent)}); }
            function after(at,code) { ops.push({at:at+1,c:script(code,list[at].indent)}); }
            before(function(c) {return c.code===355 && c.parameters[0]==='$counter_phys = !$gameSwitches.value(17);';}, 'NP_EliteRewards.beginAttack(this);','attack start');
            before(function(c,i) {return c.code===355 && c.parameters[0]==='var n = $gameVariables.value(270);' && list[i+1] && list[i+1].parameters[0]==='var str = $gameActors.actor(n).param(2);';},'NP_EliteRewards.addHitBonus(this);','HIT calculation');
            after(label(list,'攻撃ヒット'),'NP_EliteRewards.markHit(this);');
            after(label(list,'終了'),'NP_EliteRewards.endAttack(this);');
            before(function(c) {return c.code===355 && c.parameters[0]==='$dmg = parseInt($dmg)' && c.indent===1;},'$dmg = NP_EliteRewards.beforeArmor(this, $dmg);','armor subtraction');
            before(function(c) {var p=c.parameters;return c.code===122&&p[0]===54&&p[1]===54&&p[2]===0&&p[3]===4&&p[4]==='$dmg';},'$dmg = NP_EliteRewards.prepareDirectDamage(this, $dmg);','final damage before log');
            var detailLine=unique(list,function(c) {return c.code===355 && c.parameters[0]==='set_mlog("_log_database_text_battle_damage_details")';},'CE36 damage detail log');
            list[detailLine] = script('NP_EliteRewards.logDamageDetails(this);',list[detailLine].indent);
            var damage=unique(list,function(c) {var p=c.parameters;return c.code===122&&p[0]===123&&p[1]===123&&p[2]===2&&p[3]===4&&p[4]==='$dmg';},'CE36 direct enemy HP');
            ops.push({at:damage,c:script('NP_EliteRewards.beforeEnemyDamage(this);',list[damage].indent)});
            after(damage,'NP_EliteRewards.afterEnemyDamage(this);');
            before(function(c) {return c.code===111 && String(c.parameters[1]).indexOf('$counter_phys')>=0;},'NP_EliteRewards.endAttack(this);','attack completion');
            var hpLine=unique(list,function(c) { return c.code===655 && c.parameters[0]==='$gameActors.actor(num).gainHp(-$dmg);'; },'CE36 direct player HP');
            list[hpLine] = {code:655,indent:list[hpLine].indent,parameters:['NP_EliteRewards.directEnemyDamage(this, num, $dmg);'],npEliteRewards:true};
            ops.sort(function(a,b) {return b.at-a.at;}).forEach(function(op) {list.splice(op.at,0,op.c);});
        });
        patch(37,function(list) {
            var end=label(list,'終了'); list.splice(end+1,0,script('NP_EliteRewards.endAction(this, $gameVariables.value(155) !== 0);',list[end].indent));
            list.unshift(script('NP_EliteRewards.beginAction(this);'));
        });
        patch(367,function(list) {
            var end=label(list,'敵ターン終了');
            // At the label all ordinary/custom actions and skipped turns converge.
            list.splice(end+1,0,script('NP_EliteRewards.enemyTurnEnd();',list[end].indent));
        });
        // Commit only after every CE passed validation.
        changes.forEach(function(c) { c.ce.list=c.list; });
        return changes.length;
    };
    var _db = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        // onLoad is the normal route; this also supports tests / synchronous DBs.
        if (window.$dataWeapons) R.appendRecords($dataWeapons,'weapons');
        if (window.$dataArmors) R.appendRecords($dataArmors,'armors');
        var ready = _db.apply(this,arguments);
        if (ready && !R._injected) { R.injectCommonEvents(); R._injected=true; }
        return ready;
    };
    return R;
})();
window.NP_EliteRewards = NP_EliteRewards;
