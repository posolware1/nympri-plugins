/*:
 * @plugindesc [RU mod] Six additional rare encounters, daily shuffled priority, 25% species rolls. After NP_Items and NP_RareMobs.
 * @author RU mod
 * @help
 * Additive expansion. Does not edit normal enemy data, original rare mechanics,
 * quests, save IDs, or original graphics. Uses existing character sheets with
 * the original rare recolour/glow renderer. Draft artwork is NOT installed.
 * All 19 species roll at 25%; existing cached daily rolls remain unchanged.
 * One rare per entry, selected after the map's spawn batch from successful
 * species by a stable shuffled map/day priority. Existing active rares remain.
 * Drop rates/gates/one trophy per save use NP_RareMobs without replacement.
 */
(function() {
    'use strict';
    var R = window.NP_RareMobs;
    if (!R) throw new Error('NP_EliteMobs requires NP_RareMobs');
    var E = window.NP_EliteMobs = { VERSION: '1.0.1' };
    function v(id) { return Number($gameVariables.value(id)) || 0; }
    function set(id, n) { $gameVariables.setValue(id, n); }
    function sw(id) { return !!$gameSwitches.value(id); }
    function L(ru, en) { return typeof NP_L === 'function' ? NP_L(ru, en) : ru; }
    function log(ru, en) { if (typeof set_mlog === 'function') set_mlog('\\c[17]' + L(ru, en)); }
    function party() { return $gameParty.members(); }
    function living() { return party().filter(function(a) { return a.hp > 0; }); }
    function actor(id) { return $gameActors.actor(id); }
    function name(id) { var a = actor(id); return a ? a.name() : '?'; }
    function level() { return Math.max(1, v(169)); }
    function alive(id) { return living().some(function(a) { return a.actorId() === id; }); }
    function guarded(id) {
        var a = actor(id), b = window.NP_BossBalance;
        return !!(a && a.isStateAffected(14)) || !!(b && b.guarded && b.guarded(id));
    }
    function target(id) {
        var ms = living(), a = alive(id) ? actor(id) : ms[0];
        if (!a) return 0;
        id = a.actorId(); set(271, id); set(274, party().indexOf(a));
        $gameVariables.setValue(154, a.name()); return id;
    }
    function wounded() {
        var ms = living().slice().sort(function(a, b) { return a.hp / Math.max(1, a.mhp) - b.hp / Math.max(1, b.mhp); });
        return ms.length ? ms[0].actorId() : 0;
    }
    function spec(key, kind, id, icon, ru, en) { return {key:key, kind:kind, id:id, icon:icon, names:[ru,en]}; }
    var defs = {
        bloodwolf: {base:111, ru:'Кровавый следопыт', en:'Bloodtrail Wolf', time:'any', gold:120, pct:25, gate:0,
            look:{h:0,s:0.6,v:0.85,tint:[190,45,45,0.35],aura:[235,80,70]},
            rare:spec('huntcompass','a',1000,657,'Компас следопыта','Tracker Compass'),
            mech:['Помечает самого раненого. Следующий укус получает +2 урона, если у цели не больше половины HP. Лечение выше половины HP, «Щит» или ожидание снимают бонус. Цель видна заранее.',
                'Marks the most wounded ally. Its next bite gains +2 damage if that ally has at most half HP. Heal above half HP, Guard or wait to remove the bonus. The target is announced ahead.'],
            lore:['Он слышит неровное дыхание раненых. Красный отблеск глаз выдаёт, за кем он идёт.','It hears the uneven breathing of the wounded. Its red gaze reveals whom it follows.'],
            hint:['Верните раненому силы или приготовьтесь принять укус.','Restore the wounded ally or brace for the bite.'], sprite:['Animal',6]},
        threadspider: {base:102, ru:'Паук нити возмездия', en:'Retribution Spider', time:'any', gold:100, pct:25, gate:0,
            look:{h:45,s:0.8,v:1.05,tint:[170,120,240,0.3],aura:[185,130,255]},
            rare:spec('misslens','a',1001,653,'Линза ответного удара','Second-Chance Lens'),
            mech:['Следит за последним нанёсшим прямой урон и кусает его с бонусом +1. Другой союзник может перехватить внимание своим попаданием. «Щит» или ожидание снимают бонус.',
                'Tracks the last ally to deal direct damage and bites them with +1 damage. Another ally can draw its attention with a hit. Guard or wait removes the bonus.'],
            lore:['Каждый удар оставляет дрожь на невидимой нити. Паук поворачивается туда, где она звенела последней.','Each blow trembles along an unseen thread. The spider turns toward its latest vibration.'],
            hint:['Последний удар выбирает, кто встретит ответный.','The last blow chooses who faces the reply.'], sprite:['Monster3',7]},
        oathscorpion: {base:105, ru:'Скорпион чёрной клятвы', en:'Black Oath Scorpion', time:'any', gold:160, pct:20, gate:0,
            look:{h:15,s:0.55,v:0.65,tint:[120,65,180,0.25],aura:[185,95,235]},
            rare:spec('twinneedle','w',701,147,'Двойное жало','Twin Needle'),
            mech:['Запоминает первого ударившего, тратит ход на прицеливание, затем бьёт его с +2 урона. «Щит» или ожидание снимают бонус. После выпада броня ниже на 1 до следующего хода.',
                'Marks the first attacker, spends an action aiming, then strikes them with +2 damage. Guard or wait removes the bonus. After the thrust its armour drops by 1 until its next turn.'],
            lore:['На чёрном панцире остаётся след первого удара. Поднятое жало замирает, прежде чем исполнить обещание.','Its black shell remembers the first blow. The raised sting pauses before keeping its promise.'],
            hint:['Переждите прицеливание и бейте в открывшийся панцирь.','Brace for the aimed sting, then strike the exposed shell.'], sprite:['Monster3',6]},
        sporecap: {base:641, ru:'Гриб тихого созревания', en:'Stillgrowth Mushroom', time:'any', gold:150, pct:25, gate:0,
            look:{h:100,s:0.8,v:1.1,tint:[95,220,155,0.25],aura:[120,240,165]},
            rare:spec('sporecase','a',1002,648,'Споровый футляр','Spore Case'),
            mech:['За ход без прямого урона созревает на 1 ступень, до 2. Обычные атаки получают +1 за ступень. На 2-й предупреждает о спорах: следующим ходом 2–3 урона всем, не ниже 1 HP. Попадание снимает ступень, огонь сбрасывает созревание; защита уменьшает выброс.',
                'Gains one maturity after a round without direct damage, up to 2. Normal attacks gain +1 per stage. At 2 it warns of spores: next action deals 2–3 to all, never below 1 HP. A hit removes one stage; fire clears maturity. Guard or wait reduces the burst.'],
            lore:['Пока никто не тревожит грибницу, под шляпкой сгущается зелёный туман.','While the mycelium rests undisturbed, green mist gathers beneath the cap.'],
            hint:['Не давайте ему спокойно расти. Пламя сушит споры.','Do not let it grow undisturbed. Flame dries its spores.'], sprite:['walkingmushroom',4]},
        echobat: {base:104, ru:'Мышь переменчивого эха', en:'Shifting Echo Bat', time:'any', gold:130, pct:20, gate:3,
            look:{h:160,s:0.7,v:1.1,tint:[90,135,235,0.3],aura:[120,175,255]},
            rare:spec('duskfork','a',1003,649,'Камертон сумерек','Dusk Tuning Fork'),
            mech:['Запоминает физический или магический урон. Следующее попадание того же типа слабее на 1, минимум 1; чередуйте типы. Раз в три действия готовит звуковой выпад с +2 уроном. «Щит» или ожидание снимают бонус.',
                'Remembers physical or magical damage. The next hit of the same type loses 1 damage, minimum 1; alternate types. Every three actions it prepares a sonic lunge with +2 damage. Guard or wait removes the bonus.'],
            lore:['Её крылья повторяют ритм последних ударов. Высокая нота предупреждает о новом броске.','Its wings echo the rhythm of recent blows. A rising note warns of another dive.'],
            hint:['Меняйте ритм атаки; услышав высокую ноту, приготовьтесь.','Change the rhythm of your attacks; brace when the note rises.'], sprite:['Monster3',0]},
        greedsludge: {base:602, ru:'Ил жадного поглощения', en:'Gorging Sludge', time:'any', gold:140, pct:15, gate:3,
            look:{h:35,s:0.9,v:0.85,tint:[100,170,100,0.3],aura:[130,220,120]},
            rare:spec('reservebead','a',1004,651,'Капля резерва','Reserve Droplet'),
            mech:['После применения предмета готовится поглотить остатки: следующий ход тратит на лечение 2–3 HP, всего не более 35% максимума за бой. Молния срывает поглощение. Обычный иммунитет ила и слабость к молнии сохранены.',
                'An item use makes it prepare to absorb the remains: it spends its next action healing 2–3 HP, up to 35% max HP per battle. Lightning interrupts absorption. Its normal immunity and lightning weakness remain.'],
            lore:['Капли со вскрытой склянки тянутся к нему против уклона камня. Лишь электрическая искра разрывает эту тягу.','Drops from an opened vial crawl toward it against the slope. Only an electric spark breaks the pull.'],
            hint:['Склянки кормят его, молния обрывает трапезу.','Vials feed it; lightning cuts the meal short.'], sprite:['slime_v1',5]}
    };
    E.KEYS = Object.keys(defs);
    E.KEYS.forEach(function(k) {
        if (R.MOBS[k] || R.BASE2KEY[defs[k].base]) throw new Error('Elite key/base collision: ' + k);
        var d = defs[k]; d.key = k; d.chance = 25; d.bonus = [];
        R.MOBS[k] = d; R.KEYS.push(k); R.BASE2KEY[d.base] = k;
        R.LORE[k] = {lore:d.lore,hint:d.hint}; R.SPRITES[d.base] = d.sprite;
        R.ENCOUNTER_HINT[k] = true; R.SHOW_TRAIT[k] = true;
    });
    R.KEYS.forEach(function(k) { R.MOBS[k].chance = 25; });
    E.ctx = function() { var c = R.ctx(); return c && defs[c.key] ? c : null; };
    var oldHint = R.shortHint;
    R.shortHint = function(k) { return defs[k] ? L(defs[k].hint[0],defs[k].hint[1]) : oldHint.apply(this,arguments); };

    // Queue a whole spawn batch; changing a visible or already-fought rare is forbidden.
    E.priority = function(mapId, day, key) { return R.hash01(R.state().salt + '|elite-order|' + mapId + ':' + day + ':' + key); };
    var oldSpawn = R.onSpawn;
    R.onSpawn = function(ev, original) {
        if (!ev || !R.on() || sw(5)) return;
        var key = R.BASE2KEY[R.templateBase(original)]; if (!key) return;
        if (R.forceNext && (R.forceNext === true || R.forceNext === key)) return oldSpawn.apply(this,arguments);
        if ($gameMap._npRareEntry || !R.eligible(key) || !R.rollFor($gameMap.mapId(),key)) return;
        var queue = $gameMap._npEliteSpawnCandidates || ($gameMap._npEliteSpawnCandidates=[]);
        if (!queue.some(function(p) { return p.id===ev.eventId(); })) queue.push({id:ev.eventId(),key:key,day:v(4)});
    };
    function pending(interp) {
        return !!(interp && ((interp._knsOnEventCallSucceeds && interp._knsOnEventCallSucceeds.length) || pending(interp._childInterpreter)));
    }
    E.flushSpawns = function(map) {
        map = map || $gameMap;
        if (!map || !R.on() || sw(5) || sw(14)) return null;
        if (map._npRareEntry) { map._npEliteSpawnCandidates=[]; return null; }
        var eventPending = map.events && map.events().some(function(ev) { return pending(ev._interpreter); });
        if ((map.isEventRunning && map.isEventRunning()) || pending(map._interpreter) || eventPending ||
            (DataManager.knsIsLoadingEventCallSubMap && DataManager.knsIsLoadingEventCallSubMap())) return null;
        var choices = (map._npEliteSpawnCandidates || []).filter(function(p) {
            var ev=map.event(p.id); return ev && !ev._erased && p.day===v(4) && R.eligible(p.key);
        });
        choices.sort(function(a,b) { return E.priority(map.mapId(),v(4),a.key)-E.priority(map.mapId(),v(4),b.key) || a.id-b.id; });
        map._npEliteSpawnCandidates=[];
        if (!choices.length) return null;
        var win=choices[0], ev=map.event(win.id); ev._npRare=win.key; map._npRareEntry=win.id;
        R.lastSpawn={key:win.key,eventId:win.id,mapId:map.mapId(),forced:false,priority:E.priority(map.mapId(),v(4),win.key)};
        return win;
    };
    if (typeof Game_Map !== 'undefined') {
        var oldSetup=Game_Map.prototype.setup, oldUpdate=Game_Map.prototype.update;
        Game_Map.prototype.setup=function() { this._npEliteSpawnCandidates=[]; return oldSetup.apply(this,arguments); };
        Game_Map.prototype.update=function() { var out=oldUpdate.apply(this,arguments); E.flushSpawns(this); return out; };
    }

    function finish(c, interrupted) {
        var intent=c._eliteExecuting || c._eliteIntent;
        if (intent && window.NP_EliteRewards && NP_EliteRewards.finishIntent) NP_EliteRewards.finishIntent(intent.id,!!interrupted);
        c._eliteExecuting=null; c._eliteIntent=null;
    }
    function announce(c,key,id,ru,en) {
        finish(c,true); c._eliteSerial=(c._eliteSerial||0)+1;
        c._eliteIntent={id:c.key+':'+c._eliteSerial,key:key,target:id,status:'telegraph',damage:true};
        log(ru,en); return c._eliteIntent;
    }
    E.pendingDamageIntent=function() { var c=E.ctx(); return c && c._eliteIntent && c._eliteIntent.status==='telegraph' ? c._eliteIntent : null; };
    E.intent=E.pendingDamageIntent;
    E.executingDamageIntent=function() { var c=E.ctx(); return c && c._eliteExecuting || null; };
    function execute(c) {
        var t=c._eliteIntent; if (!t) return null;
        if (t.target && !alive(t.target)) { finish(c,true); return null; }
        t.status='executing'; c._eliteExecuting=t; c._eliteIntent=null; return t;
    }
    function wolfMark(c) {
        var t=wounded(); if (!t) return;
        announce(c,'bloodbite',t,'Кровавый следопыт помечает '+name(t)+': следующий укус опасен при HP ≤ 50%. Лечите или защищайтесь!',
            'Bloodtrail Wolf marks '+name(t)+': the next bite is dangerous at HP ≤ 50%. Heal or brace!');
    }
    var oldLoad=R._afterLoad;
    R._afterLoad=function() {
        var out=oldLoad.apply(this,arguments), c=E.ctx();
        if (!c) return out;
        c._eliteSerial=0; c._eliteMaturity=0; c._eliteDigest=0; c._eliteRegen=0; c._eliteHit=false;
        if (c.key==='bloodwolf') wolfMark(c);
        return out;
    };
    var oldBegin=R.enemyTurnBegin;
    R.enemyTurnBegin=function() {
        oldBegin.apply(this,arguments); var c=E.ctx(), a=actor(100); if (!c || !a) return;
        if (a.isStateAffected(6) || a.isStateAffected(8)) {
            if (c._eliteIntent || c._eliteDigest) log('Подготовка редкого врага сорвана!','The rare enemy\'s preparation is interrupted!');
            finish(c,true); c._eliteDigest=0; c._eliteMaturity=0;
        }
    };
    var oldTurn=R.turnStart;
    R.turnStart=function() {
        oldTurn.apply(this,arguments); var c=E.ctx(); if (!c) return;
        if (Number(window.$enemy_turn_skip)===1) { finish(c,true); c._eliteDigest=0; }
    };
    var oldAct=R._enemyAct;
    R._enemyAct=function(c) {
        if (!defs[c.key]) return oldAct.apply(this,arguments);
        var hit=c._eliteHit; c._eliteHit=false;
        var out=oldAct.apply(this,arguments), t, a, intent;
        // Native charged skills must not replace our announced attacks.
        window.$enemy_skill_charge=0; set(140,1);
        switch(c.key) {
            case 'bloodwolf':
                if (!c._eliteIntent) wolfMark(c);
                intent=execute(c); if (!intent) break;
                t=target(intent.target); a=actor(t);
                if (a && a.hp*2<=a.mhp && !guarded(t)) set(138,v(138)+2);
                break;
            case 'threadspider':
                intent=execute(c);
                if (intent) { t=target(intent.target); if (!guarded(t)) set(138,v(138)+1); }
                break;
            case 'oathscorpion':
                if (c._eliteRecovery) { set(136,c.armBase); c._eliteRecovery=false; }
                if (c._eliteIntent) {
                    intent=execute(c); if (!intent) return false; t=target(intent.target);
                    if (!guarded(t)) set(138,v(138)+2);
                    set(136,Math.max(0,c.armBase-1)); c._eliteRecovery=true; c._eliteMark=0;
                } else {
                    t=alive(c._eliteMark)?c._eliteMark:v(271);
                    announce(c,'oathsting',t,'Чёрное жало нацелено на '+name(t)+'. Следующим ходом выпад: «Щит» или ожидание!',
                        'The black sting aims at '+name(t)+'. A thrust is coming next action: Guard or wait!');
                    return true;
                }
                break;
            case 'sporecap':
                if (c._eliteIntent) {
                    execute(c);
                    living().forEach(function(m) { var n=Math.min(3,1+level()); if(guarded(m.actorId())) n=Math.max(1,n-2); R._hurt(m,n); });
                    log('Созревшие споры накрывают отряд!','Ripe spores engulf the party!');
                    c._eliteMaturity=0; finish(c,false); return true;
                }
                if (!hit) c._eliteMaturity=Math.min(2,(c._eliteMaturity||0)+1);
                if (c._eliteMaturity>=2) {
                    announce(c,'sporeburst',0,'Шляпка раскрывается: следующим ходом выброс спор! Попадания или огонь собьют созревание.',
                        'The cap opens: a spore burst is coming next action! Hits or fire will spoil its growth.');
                    return true;
                }
                if (c._eliteMaturity) { set(138,v(138)+c._eliteMaturity); log('Гриб созревает: 1/2, урон +1.','The mushroom matures: 1/2, damage +1.'); }
                break;
            case 'echobat':
                if (c._eliteIntent) { intent=execute(c); if (!intent) return false; t=target(intent.target); if(!guarded(t)) set(138,v(138)+2); }
                else if (c.acts%3===2) {
                    t=v(271); announce(c,'soniclunge',t,'Эхо сжимается вокруг '+name(t)+': следующий ход — звуковой выпад. «Щит» или ожидание!',
                        'The echo tightens around '+name(t)+': a sonic lunge comes next action. Guard or wait!'); return true;
                }
                break;
            case 'greedsludge':
                if (c._eliteDigest) {
                    c._eliteDigest=0;
                    var budget=Math.max(0,Math.floor(v(122)*0.35)-(c._eliteRegen||0));
                    var heal=Math.max(0,Math.min(v(122)-v(123),Math.min(3,1+level()),budget));
                    c._eliteRegen=(c._eliteRegen||0)+heal;
                    R._self=true; try { set(123,v(123)+heal); } finally { R._self=false; }
                    log('Ил поглощает остатки: +'+heal+' HP вместо атаки.','The sludge absorbs the remains: +'+heal+' HP instead of attacking.'); return true;
                }
                break;
        }
        return out;
    };
    var oldEnd=R.enemyEnd;
    R.enemyEnd=function() {
        var c=E.ctx(); if (c && c._eliteExecuting) finish(c,false);
        oldEnd.apply(this,arguments);
        if (c && c.key==='bloodwolf' && v(123)>0) wolfMark(c);
    };
    var oldHp=R.onEnemyHp;
    R.onEnemyHp=function(oldV,newV) {
        var c=E.ctx(), isHit=c && typeof newV==='number' && newV<oldV && R.isPlayerHit(c);
        var superApi=window.NP_SuperAttack, sup=!!(superApi && superApi.running);
        var aid=sup && superApi.curActor ? superApi.curActor() : v(270);
        var attr=window.$atk_attribute || '', damageType=sw(17)?'magic':'physical';
        if(isHit && c.key==='echobat' && !sup && c._eliteAdapt===damageType) {
            newV=Math.min(oldV-1,newV+1); log('Эхо смягчает повторный тип удара: −1 урона.','The echo softens a repeated damage type: −1 damage.');
        }
        var value=oldHp.call(this,oldV,newV);
        if(!isHit || !(value<oldV)) return value;
        c._eliteHit=true;
        if (c.key==='threadspider' && alive(aid)) {
            var ru='Нить паука тянется к '+name(aid)+': следующий укус по последнему ударившему.';
            var en='The spider\'s thread points at '+name(aid)+': its next bite targets the last attacker.';
            // Retargeting changes the recipient, not the identity of this next bite.
            // Keep bindings attached to that exact upcoming action until it resolves.
            if(c._eliteIntent && c._eliteIntent.key==='threadbite') {
                if(c._eliteIntent.target!==aid) log(ru,en);
                c._eliteIntent.target=aid;
            } else announce(c,'threadbite',aid,ru,en);
        }
        if(c.key==='oathscorpion' && !c._eliteMark && !c._eliteIntent && !c._eliteExecuting) {
            c._eliteMark=aid; log('Чёрная клятва запоминает '+name(aid)+'.','The black oath remembers '+name(aid)+'.');
        }
        if(c.key==='sporecap') {
            c._eliteMaturity=attr==='fire'?0:Math.max(0,(c._eliteMaturity||0)-1);
            if(c._eliteIntent && !c._eliteMaturity) { finish(c,true); log('Созревание сорвано, выброса спор не будет!','Maturation is broken; the spore burst is cancelled!'); }
        }
        if(c.key==='echobat' && !sup) {
            if(c._eliteAdapt!==damageType) log(damageType==='magic'?'Эхо запоминает магию.':'Эхо запоминает физические удары.',damageType==='magic'?'The echo remembers magic.':'The echo remembers physical attacks.');
            c._eliteAdapt=damageType;
        }
        if(c.key==='greedsludge' && attr==='thunder') {
            c._eliteDigestBlocked=v(157);
            if(c._eliteDigest) { c._eliteDigest=0; log('Молния срывает поглощение!','Lightning interrupts absorption!'); }
        }
        if(value<=0) finish(c,true);
        return value;
    };
    E.onItemUsed=function(aid,itemId) {
        var c=E.ctx();
        if(!c || c.key!=='greedsludge' || v(123)<=0 || v(123)>=v(122) || c._eliteDigest || c._eliteDigestBlocked===v(157)) return;
        if((c._eliteRegen||0)>=Math.floor(v(122)*0.35)) return;
        c._eliteDigest=1;
        log('Ил тянется к остаткам предмета: следующим ходом лечится. Ударьте молнией!',
            'The sludge reaches for the item\'s remains: it will heal next action. Strike with lightning!');
    };
    var oldBattleEnd=R.battleEnd;
    R.battleEnd=function() { var c=E.ctx(); if(c) finish(c,true); return oldBattleEnd.apply(this,arguments); };
    // A generic elite guard must not silently consume a newly telegraphed move.
    // Existing 13 rares and bosses keep their complete guard behaviour.
    if(window.NP_BossBalance && NP_BossBalance.guardDecide) {
        var oldGuard=NP_BossBalance.guardDecide;
        NP_BossBalance.guardDecide=function() { return E.ctx() ? false : oldGuard.apply(this,arguments); };
    }

    // Compact detail cards only for the six additions. The original 200px portrait
    // leaves too little room for explicit mechanics at the shipped 816x624 size.
    // Legacy cards retain their original renderer byte-for-byte.
    E.fitDetail = function(win, parts, width, available) {
        var previous=win.contents.fontSize, size, need=0;
        for(size=22;size>=14;size--) {
            win.contents.fontSize=size; need=0;
            parts.forEach(function(p) { need+=(p.label?24:0)+win.lines(p.text,width).length*(size+4)+6; });
            if(need<=available) break;
        }
        win.contents.fontSize=previous;
        return {fs:Math.max(14,size),need:need};
    };
    if (typeof Window_NpRareDetail !== 'undefined') {
        var oldDetail=Window_NpRareDetail.prototype.refresh;
        Window_NpRareDetail.prototype.refresh=function() {
            var k=this._key;
            if(!defs[k]) return oldDetail.apply(this,arguments);
            this.contents.clear(); this._pending=false;
            var cfg=R.MOBS[k], b=R.best(k), w=this.contentsWidth(), ch=this.contentsHeight();
            this.contents.fontSize=26; this.changeTextColor(this.textColor(b.met?17:8));
            this.drawText(b.met?'★ '+L(cfg.ru,cfg.en):'???',0,0,w); this.resetFontSettings();
            var box=96, top=38, x=box+14, fw=w-x;
            this.contents.fillRect(0,top,box,box,'rgba(0,0,0,0.35)');
            var spr=R.templateSprite(k);
            if(spr) {
                var tint=R.tinted(spr.name,k);
                if(!tint.ready) this._pending=true;
                else {
                    var src=b.met?tint.main:tint.silhouette, big=ImageManager.isBigCharacter(spr.name);
                    var pw=src.width/(big?3:12), ph=src.height/(big?4:8), index=big?0:spr.index;
                    var sx=((index%4)*3+1)*pw, sy=Math.floor(index/4)*4*ph;
                    var sc=Math.min(3,(box-8)/Math.max(pw,ph)), dw=Math.round(pw*sc), dh=Math.round(ph*sc);
                    var dx=Math.round((box-dw)/2), dy=top+Math.round((box-dh)/2);
                    if(b.met) this.contents.blt(tint.aura,sx,sy,pw,ph,dx,dy,dw,dh);
                    this.contents.blt(src,sx,sy,pw,ph,dx,dy,dw,dh);
                }
            }
            this.contents.fontSize=18; this.resetTextColor();
            var places=Object.keys(b.seen||{}).map(function(id) { return b.seen[id]||R.mapName(+id); });
            var place=b.met?(places[0]||L('Подземелье','Dungeon')):'???';
            if(places.length>1) place+=' (+'+(places.length-1)+')';
            this.contents.drawText(L('Встречен: ','Seen: ')+place,x,top,fw,24);
            this.contents.drawText({any:L('Днём и ночью','Day and night'),day:L('Только днём','Day only'),night:L('Только ночью','Night only')}[cfg.time],x,top+24,fw,24);
            this.contents.drawText(L('Побеждено: ','Defeated: ')+(b.kills||0),x,top+48,fw,24);
            this.contents.drawText(L('Трофей: ','Trophy: ')+cfg.pct+'%'+(cfg.gate?L(', ур. ≥ ',', lv. ≥ ')+cfg.gate:''),x,top+72,fw,24);
            var y=top+box+8, lootH=110, avail=ch-lootH-8-y;
            var parts=[{text:R.lore(k)}, {label:L('Примета:','Omen:'),text:R.hint(k)},
                {label:L('Особенность:','Trait:'),text:b.met?L(cfg.mech[0],cfg.mech[1]):L('Ещё не встречен.','Not met yet.')}];
            var fit=E.fitDetail(this,parts,w,avail), self=this, bodyTop=y;
            parts.forEach(function(p) {
                if(p.label) { self.contents.fontSize=18; self.changeTextColor(self.systemColor()); self.contents.drawText(p.label,0,y,w,24); y+=24; }
                self.contents.fontSize=fit.fs; self.resetTextColor();
                self.lines(p.text,w).forEach(function(line) { self.contents.drawText(line,0,y,w,fit.fs+4); y+=fit.fs+4; }); y+=6;
            });
            var ly=Math.max(y+8,ch-lootH), item=R.resolveItem(k), icon=item?item.iconIndex:cfg.rare.icon;
            this.contents.fontSize=20; this.changeTextColor(this.systemColor());
            this.contents.drawText(L('Редкая добыча:','Rare loot:'),0,ly,w,26); this.resetTextColor();
            this.loot.setup(icon,!!b.dropped,1.4); this.loot.x=this.padding+40; this.loot.y=this.padding+ly+66;
            if(b.dropped) {
                this.changeTextColor(this.textColor(24)); this.contents.drawText(L('Добыча получена','Loot obtained'),88,ly+38,w-88,24);
                this.resetTextColor(); this.contents.drawText(item?item.name:'',88,ly+64,w-88,26);
            }
            this._npLayout={fs:fit.fs,bodyTop:bodyTop,bodyEnd:y,lootTop:ly,lootEnd:ly+lootH,ch:ch,need:fit.need,avail:avail,
                overflow:ly+lootH>ch+1,lore:parts[0].text,hint:parts[1].text,met:!!b.met,trait:parts[2].text};
            this.resetFontSettings();
        };
    }
})();
