/*:
 * @plugindesc v1.0 Карточка врага: HP, состояния и подробности. Опция «Карточка врага».
 * @author NP RU mod
 * @help
 * После NP_BattleHUD/NP_BossBalance, перед NP_OptionsCategories.
 * Сохраняет портрет врага, боевые карточки и команды. Не меняет данные боя.
 * Нажмите на эффект или «Подробнее». F6 — открыть/закрыть подробности,
 * PgUp/PgDn или кнопки ‹ / › — страницы; Esc — закрыть. В модальном списке
 * нажатия не передаются боевым командам. Настройки → Интерфейс → Карточка врага.
 */
var NP_EnemyHUD = window.NP_EnemyHUD = (function() {
    'use strict';
    var $ = {}, P = { text:'#ffffff', gold:'#dcbc7c', muted:'#bdb3a5', good:'#8fe08a', bad:'#ff6a5a', line:'#786044' };
    function L(ru,en) { return typeof window.NP_L === 'function' ? NP_L(ru,en) : ru; }
    function gv(id) { return $gameVariables ? $gameVariables.value(id) : 0; }
    function gs(id) { return !!($gameSwitches && $gameSwitches.value(id)); }
    function manager() { return typeof $CSDM !== 'undefined' ? $CSDM : null; }
    function plain(t) { return String(t || '').replace(/\\[a-z]+\[[^\]]*\]/gi,'').replace(/\x1b[a-z]+\[[^\]]*\]/gi,''); }
    function bossContext() { return window.NP_BossBalance && NP_BossBalance.active() ? NP_BossBalance.ctx() : null; }
    $.enabled = function() { return ConfigManager.npEnemyHud !== false; };
    $.active = function() {
        var c=manager();
        return $.enabled() && gs(14) && !gs(5) && !!c && !!c.Visible && !!c.WindowEnemy && !!c.WindowEnemy.Visible && c.WindowEnemy.visible!==false &&
            !(window.NP_PowerStrike && NP_PowerStrike._qte) && !(window.NP_SuperAttack && NP_SuperAttack._qte);
    };
    function stateEffect(id) {
        var state=$dataStates[id]; if (!state || !plain(state.name).trim()) return null;
        var details=[], bad=id<=10 || id===12;
        var control={1:L('Не может действовать.','Cannot act.'),3:L('Зрение нарушено.','Impaired vision.'),4:L('Не может произносить заклинания.','Cannot cast spells.'),
            5:L('Действия нарушены смятением.','Actions disrupted by confusion.'),6:L('Спит и пропускает действия.','Asleep and unable to act.'),
            7:L('Паралич мешает действовать.','Paralysis prevents actions.'),8:L('Оглушение мешает действовать.','Stun prevents actions.'),9:L('Пропускает действие.','Skips an action.'),12:L('Транс мешает действовать.','Trance prevents actions.')};
        if (control[id]) details.push(control[id]);
        (state.traits || []).forEach(function(t) {
            if (t.code===21) {
                var names=[L('Макс. HP','Max HP'),L('Макс. MP','Max MP'),L('Сила','Strength'),L('Выносливость','Endurance'),L('Интеллект','Intellect'),L('Обаяние','Charm'),L('Ловкость','Dexterity'),L('Вера','Faith')];
                var percent=Math.round((t.value-1)*100); if(percent<0)bad=true;
                details.push((names[t.dataId] || '?')+' '+(percent>=0?'+':'')+percent+'%.');
            }
            if (t.code===22 && t.dataId===7 && t.value) {
                var hp=Math.round(t.value*100); if(hp<0)bad=true;
                details.push(L('Восстановление HP ','HP recovery ')+(hp>=0?'+':'')+hp+'%.');
            }
        });
        // CE367 calls CE368 at each enemy-turn start. These are the real
        // custom counters; native Game_Battler._stateTurns are not used here.
        var timers={2:'$enemy_state_poison',3:'$enemy_state_blind',8:'$enemy_state_stun',7:'$enemy_state_paralysis',
            6:'$enemy_state_sleep',12:'$enemy_state_hypnosis',4:'$enemy_state_silence',5:'$enemy_state_confuse'};
        var n=Number(timers[id] && window[timers[id]]) || 0;n=n>0 && isFinite(n)?Math.floor(n):0;
        var teen=n%100>=11 && n%100<=14, tail=n%10;
        var duration=n ? n+L(' '+(teen?'ходов':tail===1?'ход':tail>=2 && tail<=4?'хода':'ходов')+' врага',' enemy turns') : L('До снятия','Until removed');
        return {id:'state:'+id,name:plain(state.name),icon:state.iconIndex || 0,kind:bad?'bad':details.length?'good':'neutral',
            details:details.join(' ') || L('Особое состояние врага.','Special enemy condition.'),duration:duration,badge:n?n+L('х','t'):''};
    }
    $.model = function() {
        var c=manager(), enemy=c && c.WindowEnemy, a=enemy && enemy.Actor, b=bossContext(), effects=[];
        if (!a && window.$gameActors) a=$gameActors.actor(100);
        (a && a._states || []).forEach(function(id) { var e=stateEffect(id); if(e)effects.push(e); });
        if (b && b.boss && b.imm>0) effects.push({id:'boss:immunity',name:L('Иммунитет к контролю','Control immunity'),icon:82,kind:'neutral',badge:b.imm+L('д','a'),
            duration:b.imm+L(' действия врага',' enemy actions'),details:L('Временная защита от повторного оглушения и сна.','Temporary protection from repeated stun and sleep.')});
        return {name:plain(gv(139)) || L('Враг','Enemy'),hp:Math.max(0,Number(gv(123))||0),mhp:Math.max(0,Number(gv(122))||0),
            armor:Number(gv(136))||0,magicArmor:Number(gv(134))||0,boss:!!(b && b.boss),phase:b && b.boss ? b.phase || 1 : 0,effects:effects};
    };
    $.layout = function() {
        var c=manager(), enemy=c && c.WindowEnemy, root=c && c.Root, sx=root && root.scale ? root.scale.x : 1;
        var width=Math.min(360,Graphics.width-24), leftEdge=enemy ? (root && root.x || 0)+enemy.X*sx : (Graphics.width-width)/2;
        // Expand to the right of the native panel, away from its left-hand portrait.
        var card={x:Math.max(12,Math.min(Graphics.width-width-12,leftEdge)),y:24,w:width,h:208};
        var dw=Math.min(420,Graphics.width-16), dh=Math.max(160,Math.min(440,Graphics.height-242));
        var left=card.x-dw-10;
        return {card:card,details:{x:left>=8?left:8,y:16,w:dw,h:dh}};
    };
    $.slots = function(effects,width) {
        var cols=Math.max(1,Math.floor((width-28)/38)), capacity=cols*2, shown=Math.min(effects.length,capacity), out=[];
        for(var i=0;i<shown;i++) {
            var s={x:14+i%cols*38,y:100+Math.floor(i/cols)*34,w:34,h:30};
            if(effects.length>capacity && i===shown-1)s.overflow=effects.length-i;
            else s.effect=effects[i];
            out.push(s);
        }
        return out;
    };
    // Only mask rendered parts. Logical Visible flags and the portrait remain native.
    $.maskOriginal = function(w,on) {
        if(!w)return;
        if(on) {
            if(w._npEnemyOpacity===undefined)w._npEnemyOpacity=w.opacity;
            w.opacity=0;
            (w.Components || []).forEach(function(component) { if(component===w.Portrait)return;
                ['Sprite','SpriteIcon','SpriteBar','SpriteBarBackground'].forEach(function(k){if(component[k])component[k].visible=false;});
            });
        } else if(w._npEnemyOpacity!==undefined) {
            w.opacity=w._npEnemyOpacity;delete w._npEnemyOpacity;
            (w.Components || []).forEach(function(component){if(component!==w.Portrait && component.UpdateSprites)component.UpdateSprites();});
        }
    };
    ConfigManager.npEnemyHud=true;
    var makeData=ConfigManager.makeData, applyData=ConfigManager.applyData;
    ConfigManager.makeData=function(){var c=makeData.apply(this,arguments);c.npEnemyHud=this.npEnemyHud;return c;};
    ConfigManager.applyData=function(c){applyData.apply(this,arguments);this.npEnemyHud=!c || c.npEnemyHud===undefined?true:!!c.npEnemyHud;};
    if(typeof Window_Options!=='undefined') {
        var general=Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions=function(){general.apply(this,arguments);this.addCommand(L('Карточка врага','Enemy card'),'npEnemyHud');
            if(window.NP_OptionsCategories && NP_OptionsCategories.register)NP_OptionsCategories.register('npEnemyHud','ui');};
    }
    if(!Input.keyMapper[117])Input.keyMapper[117]='npEnemyDetails';
    function dirty(b){if(b._setDirty)b._setDirty();}
    function round(ctx,x,y,w,h) {
        var r=8;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
    }
    function panel(b) {
        b.clear();var ctx=b._context;ctx.save();round(ctx,1,1,b.width-2,b.height-2);
        var g=ctx.createLinearGradient(0,0,0,b.height);g.addColorStop(0,'#2a1e1a');g.addColorStop(1,'#100b0a');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=P.line;ctx.lineWidth=1;ctx.stroke();ctx.restore();dirty(b);
    }
    function text(b,t,x,y,w,h,size,col,align) {
        b.fontSize=size;b.textColor=col || P.text;b.outlineColor='#000000';b.outlineWidth=2;b.fontBold=false;b.fontItalic=false;
        b.drawText(t,x,y,Math.max(0,w),h,align || 'left');
    }
    function wrap(b,t,width,size) {
        b.fontSize=size;var out=[];
        plain(t).split('\n').forEach(function(paragraph){
            var line='';
            paragraph.trim().split(/\s+/).forEach(function(word){
                if(!word)return;
                if(line && b.measureTextWidth(line+' '+word)>width){out.push(line);line='';}
                if(b.measureTextWidth(word)<=width)line+=(line?' ':'')+word;
                else Array.from(word).forEach(function(ch){if(line && b.measureTextWidth(line+ch)>width){out.push(line);line='';}line+=ch;});
            });
            if(line)out.push(line);
        });
        return out;
    }
    function inside(r,x,y){return x>=r.x && x<r.x+r.w && y>=r.y && y<r.y+r.h;}
    function Sprite_NpEnemyHud(){this.initialize.apply(this,arguments);}
    Sprite_NpEnemyHud.prototype=Object.create(Sprite.prototype);Sprite_NpEnemyHud.prototype.constructor=Sprite_NpEnemyHud;
    Sprite_NpEnemyHud.prototype.initialize=function(){Sprite.prototype.initialize.call(this);this._card=new Sprite(new Bitmap(1,1));this.addChild(this._card);this._detail=new Sprite(new Bitmap(1,1));this.addChild(this._detail);this._expanded=false;this._page=0;this._key='';this._card.visible=false;this._detail.visible=false;};
    Sprite_NpEnemyHud.prototype.update=function(){Sprite.prototype.update.call(this);};
    Sprite_NpEnemyHud.prototype.detailsLines=function(m,b,width) {
        var out=[];
        function add(t,col,id){wrap(b,t,width,18).forEach(function(line){out.push({text:line,color:col,id:id});});}
        add(m.name,P.gold);
        add(L('Броня: ','Armor: ')+m.armor+L(' · Маг. защита: ',' · Magic armor: ')+m.magicArmor,P.text);
        if(m.boss)add(L('Босс · Фаза ','Boss · Phase ')+m.phase,P.muted);
        if(!m.effects.length)add(L('Нет временных эффектов.','No temporary effects.'),P.muted);
        m.effects.forEach(function(e){out.push({text:'',color:P.text});add(e.name+' · '+e.duration,e.kind==='bad'?P.bad:P.gold,e.id);add(e.details,P.text,e.id);});
        return out;
    };
    Sprite_NpEnemyHud.prototype.updateHud=function() {
        var c=manager(),on=$.active();$.maskOriginal(c && c.WindowEnemy,on);
        if(!on){this._card.visible=false;this._detail.visible=false;this._expanded=false;this._key='';return;}
        var m=$.model(),r=$.layout(),self=this;
        [['_card',r.card],['_detail',r.details]].forEach(function(pair){var s=self[pair[0]],box=pair[1];s.x=box.x;s.y=box.y;if(s.bitmap.width!==box.w || s.bitmap.height!==box.h)s.bitmap=new Bitmap(box.w,box.h);});
        this._slots=$.slots(m.effects,r.card.w);this._lines=this.detailsLines(m,this._detail.bitmap,r.details.w-28);
        this._pageSize=Math.max(1,Math.floor((r.details.h-80)/23));this._pages=Math.max(1,Math.ceil(this._lines.length/this._pageSize));
        if(Input.isTriggered('npEnemyDetails')){this._expanded=!this._expanded;this._page=0;}
        if(this._expanded && (Input.isTriggered('cancel') || Input.isTriggered('escape') || TouchInput.isCancelled())){this._expanded=false;$._eatCancel=true;}
        if(this._expanded && (Input.isTriggered('pageup') || Input.isTriggered('pagedown'))){this._page+=Input.isTriggered('pageup')?-1:1;$._eatPages=true;}
        var tap=TouchInput.isTriggered(),x=TouchInput.x,y=TouchInput.y;
        if(tap && inside(r.card,x,y)) {
            $._eatPointer=true;
            var slot=this._slots.filter(function(s){return inside(s,x-r.card.x,y-r.card.y);})[0];
            if(slot){this._expanded=true;var index=slot.effect ? this._lines.findIndex(function(line){return line.id===slot.effect.id;}) : 0;this._page=Math.floor(Math.max(0,index)/this._pageSize);}
            else if(y>=r.card.y+r.card.h-36){this._expanded=!this._expanded;this._page=0;}
        } else if(this._expanded && tap) {
            $._eatPointer=true;
            if(!inside(r.details,x,y))this._expanded=false;
            else if(y<r.details.y+42 && x>r.details.x+r.details.w-48)this._expanded=false;
            else if(y>r.details.y+r.details.h-44){if(x<r.details.x+70)this._page--;else if(x>r.details.x+r.details.w-70)this._page++;}
        }
        if(this._expanded && inside(r.details,x,y) && Math.abs(TouchInput.wheelY)>=20){this._page+=TouchInput.wheelY>0?1:-1;$._eatPointer=true;}
        this._page=(this._page%this._pages+this._pages)%this._pages;
        var ready=ImageManager.loadSystem('IconSet').isReady();
        var key=JSON.stringify([m,r,this._expanded,this._page,ready,L('ru','en')]);
        this._card.visible=true;this._detail.visible=this._expanded;
        if(key!==this._key){this._key=key;this.drawCard(m);if(this._expanded)this.drawDetails(m);}
    };
    Sprite_NpEnemyHud.prototype.drawCard=function(m) {
        var b=this._card.bitmap,w=b.width;panel(b);
        var lines=wrap(b,m.name,w-(m.boss?82:28),22);lines.slice(0,2).forEach(function(line,i){text(b,line+(i===1 && lines.length>2?'…':''),14,8+i*24,w-(m.boss?82:28),24,22,P.gold);});
        if(m.boss)text(b,L('БОСС','BOSS'),w-68,10,54,24,15,P.gold,'right');
        text(b,L('Здоровье','Health'),14,59,w/2,24,18);text(b,m.hp+' / '+m.mhp,14,59,w-28,24,20,P.text,'right');
        b.fillRect(14,86,w-28,8,'#100b0a');b.gradientFillRect(14,86,Math.round((w-28)*Math.min(1,m.mhp>0?m.hp/m.mhp:0)),8,'#7be08a','#2f9a45',true);
        var ib=ImageManager.loadSystem('IconSet');
        this._slots.forEach(function(s){var e=s.effect,col=e && e.kind==='bad'?P.bad:e && e.kind==='good'?P.good:P.gold;
            b.fillRect(s.x,s.y,s.w,s.h,col);b.fillRect(s.x+1,s.y+1,s.w-2,s.h-2,'#201c20');
            if(s.overflow)text(b,'+'+s.overflow,s.x,s.y,s.w,s.h,17,P.gold,'center');
            else {if(e.icon && ib.isReady())b.blt(ib,e.icon%16*32,Math.floor(e.icon/16)*32,32,32,s.x+4,s.y+2,24,24);
                else text(b,e.name.charAt(0),s.x,s.y,s.w,s.h,19,col,'center');
                if(e.badge){b.fillRect(s.x+8,s.y+17,25,12,'#080808');text(b,e.badge,s.x+5,s.y+14,27,16,12,P.text,'right');}}
        });
        if(!this._slots.length)text(b,L('Нет временных эффектов','No temporary effects'),14,108,w-28,26,16,P.muted);
        text(b,L('Подробнее','Details')+(Input.keyMapper[117]==='npEnemyDetails'?' [F6]':'')+' '+(this._expanded?'▲':'▼'),14,173,w-28,28,17,P.gold,'right');
    };
    Sprite_NpEnemyHud.prototype.drawDetails=function() {
        var b=this._detail.bitmap,w=b.width,h=b.height;panel(b);text(b,L('Подробности врага','Enemy details'),14,8,w-70,28,21,P.gold);text(b,'×',w-42,6,30,32,28,P.muted,'center');
        this._lines.slice(this._page*this._pageSize,(this._page+1)*this._pageSize).forEach(function(line,i){text(b,line.text,14,46+i*23,w-28,23,18,line.color);});
        text(b,'‹',12,h-36,48,30,26,P.gold,'center');text(b,(this._page+1)+' / '+this._pages+'  ·  '+L('Esc — закрыть','Esc — close'),60,h-34,w-120,28,15,P.muted,'center');text(b,'›',w-60,h-36,48,30,26,P.gold,'center');
    };
    $.Sprite=Sprite_NpEnemyHud;
    // Suppress only the current frame and only input owned by this UI.
    ['isTriggered','isPressed','isReleased','isCancelled'].forEach(function(name){var original=TouchInput[name];if(original)TouchInput[name]=function(){if($._duringScene && ($._eatPointer || $._modal))return false;if($._duringScene && $._eatCancel && name==='isCancelled')return false;return original.apply(this,arguments);};});
    ['isTriggered','isRepeated','isPressed'].forEach(function(name){var original=Input[name];if(original)Input[name]=function(key){if($._duringScene && ($._modal || ($._eatCancel && /^(cancel|escape)$/.test(key)) || ($._eatPages && /^(pageup|pagedown)$/.test(key))))return false;return original.apply(this,arguments);};});
    if(typeof Window_CombatStatusDisplay!=='undefined') {
        ['draw','update'].forEach(function(name){var original=Window_CombatStatusDisplay.prototype[name];Window_CombatStatusDisplay.prototype[name]=function(){original.apply(this,arguments);var c=manager();if(c && this===c.WindowEnemy)$.maskOriginal(this,$.active());};});
    }
    var create=Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows=function(){create.apply(this,arguments);this._npEnemyHud=new Sprite_NpEnemyHud();this.addChild(this._npEnemyHud);};
    var update=Scene_Map.prototype.update;
    Scene_Map.prototype.update=function(){
        $._eatPointer=false;$._eatCancel=false;$._eatPages=false;$._modal=!!(this._npEnemyHud && this._npEnemyHud._expanded);
        if(this._npEnemyHud)this._npEnemyHud.updateHud();
        $._modal=$._modal || !!(this._npEnemyHud && this._npEnemyHud._expanded);
        $._duringScene=true;try{return update.apply(this,arguments);}finally{$._duringScene=false;}
    };
    var terminate=Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate=function(){var c=manager();$.maskOriginal(c && c.WindowEnemy,false);terminate.apply(this,arguments);};
    return $;
})();
