/*:
 * @plugindesc v1.1 Компактная пауза: отряд, эффекты и текущая цель. Опция в «Интерфейс».
 * @author NP RU mod
 * @help
 * После оригинальных расширений Scene_Menu; перед NP_OptionsCategories.
 * Исходные команды, их ext, доступность и обработчики сохраняются.
 * «Ещё» содержит дополнительные команды; карточки прокручиваются штатно.
 * «Эффекты отряда»: ↑↓/PgUp/PgDn — список, ←→ — персонаж, Esc — назад.
 */
var NP_MenuLayout = (function() {
    'use strict';
    var $ = {};
    var P = {bg:'#161714', card:'#22231e', inset:'#1c1d19', line:'#414035', gold:'#dcbc7c', text:'#f1e9dc', muted:'#b6b0a2', active:'#343327', hp:'#8cba85', mp:'#7e9fc5'};
    var CHIP = {good:{fill:'#2b2f24',line:'#4e513e',text:'#d2dec0'},bad:{fill:'#342723',line:'#705047',text:'#e1b1a2'},neutral:{fill:'#2a2a25',line:'#515046',text:'#c7c2b5'}};
    function L(ru, en) { return typeof window.NP_L === 'function' ? window.NP_L(ru, en) : ru; }
    function gv(id) { return $gameVariables.value(id); }
    function plain(value) { return String(value || '').replace(/\\[a-z]+\[[^\]]*\]/gi, '').replace(/\\[{}.!|><^]/g, '').replace(/\x1b[a-z]+\[[^\]]*\]/gi, ''); }
    function members() { return $gameParty.members(); }
    function effects(a) { return window.NP_BattleHUD && NP_BattleHUD.effectsOf ? NP_BattleHUD.effectsOf(a) : []; }
    function consume() { Input.clear(); TouchInput.clear(); }
    function mapCaption() {
        var display = $gameMap.displayName ? $gameMap.displayName() : '';
        if (display) return display;
        var info = typeof $dataMapInfos !== 'undefined' && $gameMap.mapId ? $dataMapInfos[$gameMap.mapId()] : null;
        var name = info ? info.name : '', inn = /^宿屋([0-9０-９]+)F$/.exec(name);
        if (!inn) return name;
        var floor = inn[1].replace(/[０-９]/g, function(ch) { return String.fromCharCode(ch.charCodeAt(0) - 65248); });
        return L('Гостиница · этаж ', 'Inn · floor ') + floor;
    }
    $.enabled = function() { return ConfigManager.npCompactMenu !== false; };
    $.layout = function() {
        var w = Graphics.boxWidth, h = Graphics.boxHeight, wide = w >= 1000 && h >= 760;
        var pad = wide ? 30 : 18, left = wide ? 232 : (w < 700 ? 150 : 176), gap = wide ? 24 : 14;
        var y = wide ? 156 : 92, footerH = wide ? 44 : 30, questH = wide ? 106 : 68, summaryH = wide ? 44 : 28, rhythm = wide ? 14 : 8;
        var row = Math.min(wide ? 234 : 210, Math.floor((h-y-footerH-questH-summaryH-rhythm*2)/2));
        row = Math.max(190, row);
        var cols = members().length > 2 && w >= 1200 ? 2 : 1;
        var rows = Math.min(2, Math.ceil(members().length / cols)), statusH = row * rows;
        var x = pad + left + gap, contentW = w - pad - x;
        return {wide:wide, row:row, cols:cols, header:{x:pad,y:0,w:w-pad*2,h:y-10},
            command:{x:pad,y:y,w:left,h:h-y-footerH}, status:{x:x,y:y,w:contentW,h:statusH},
            quest:{x:x,y:y+statusH+rhythm,w:contentW,h:questH},
            summary:{x:x,y:y+statusH+rhythm+questH+rhythm,w:contentW,h:summaryH},
            footer:{x:pad,y:h-footerH,w:w-pad*2,h:footerH}};
    };
    $.currentQuest = function() {
        if (typeof KNS_QuestBase === 'undefined' || typeof $csvQuestList === 'undefined' || !$csvQuestList) return null;
        var ids = $gameSystem.knsGetQuestNaviList ? $gameSystem.knsGetQuestNaviList() : [];
        for (var i=0;i<ids.length;i++) { var q=$csvQuestList[ids[i]]; if(q&&!KNS_QuestBase.is_quest_unreleased(q.id)&&!KNS_QuestBase.is_quest_done(q.id))return q; }
        if (window.NP_QuestTabs && NP_QuestTabs.list) return NP_QuestTabs.list(0)[0] || null;
        return null;
    };
    ConfigManager.npCompactMenu = true;
    var makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() { var c = makeData.apply(this, arguments); c.npCompactMenu = this.npCompactMenu; return c; };
    var applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(c) { applyData.apply(this, arguments); this.npCompactMenu = !c || c.npCompactMenu === undefined ? true : !!c.npCompactMenu; };
    if (typeof Window_Options !== 'undefined') {
        var general = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            general.apply(this, arguments); this.addCommand(L('Компактное меню паузы', 'Compact pause menu'), 'npCompactMenu');
            if (window.NP_OptionsCategories && NP_OptionsCategories.register) NP_OptionsCategories.register('npCompactMenu', 'ui');
        };
    }

    var torigoyaName=Window_MenuCommand.prototype.torigoyaCommonMenu_itemName;
    if(typeof torigoyaName==='function')Window_MenuCommand.prototype.torigoyaCommonMenu_itemName=function(item){
        if(item&&Number(item.commonEvent)===5)return L('Спутники (A)','Companions (A)');
        return torigoyaName.apply(this,arguments);
    };
    function style(w, rect, padding) {
        w.standardPadding = function() { return padding || 0; };
        w.standardFontFace = function() { return 'Arial'; };
        w.standardFontSize = function() { return 18; };
        w.normalColor = function() { return P.text; };
        w.systemColor = function() { return P.gold; };
        w.lineHeight = function() { return 26; };
        w.move(rect.x,rect.y,rect.w,rect.h); w.updatePadding(); w.createContents();
        w.contents.fontFace='Arial'; w.contents.outlineWidth=0; w.opacity=0;w.backOpacity=0;w.setTone(0,0,0);
    }
    function text(w,value,x,y,width,size,color,align,serif) {
        w.contents.fontFace=serif?'Georgia':'Arial';w.contents.fontSize=size||18;w.contents.outlineWidth=0;
        w.changeTextColor(color||P.text);w.drawText(plain(value),x,y,Math.max(0,width),align||'left');w.contents.fontFace='Arial';
    }
    function rounded(w,x,y,width,height,fill,border,radius) {
        if(width<=0||height<=0)return;
        var b=w.contents,c=b._context,r=Math.min(radius===undefined?8:radius,width/2,height/2);
        if(!c){b.fillRect(x,y,width,height,fill);return;}
        c.save();c.beginPath();c.moveTo(x+r,y);c.arcTo(x+width,y,x+width,y+height,r);c.arcTo(x+width,y+height,x,y+height,r);c.arcTo(x,y+height,x,y,r);c.arcTo(x,y,x+width,y,r);c.closePath();c.fillStyle=fill;c.fill();
        if(border){c.strokeStyle=border;c.lineWidth=1;c.stroke();}c.restore();if(b._setDirty)b._setDirty();
    }
    function background(w) { rounded(w,0,0,w.contentsWidth(),w.contentsHeight(),P.inset,P.line); }
    function panel(scene,rect) {var w=new Window_Base(rect.x,rect.y,rect.w,rect.h);style(w,rect);scene.addWindow(w);return w;}
    var icons={};
    function icon(w,name,x,y,size) {
        if(!Bitmap.load)return;
        var b=icons[name]||(icons[name]=Bitmap.load('img/system/np-menu/'+name+'.svg'));
        if(b.isReady())w.contents.blt(b,0,0,b.width,b.height,x,y,size,size);
        else {w._npIconWaiting=w._npIconWaiting||{};if(!w._npIconWaiting[name]){w._npIconWaiting[name]=true;b.addLoadListener(function(){if(w.contents&&w.refresh)w.refresh();});}}
    }
    function effectIcon(w,e,x,y,size) {
        if(Number(e.icon)>0){
            var bitmap=ImageManager.loadSystem('IconSet'),index=Number(e.icon),cell=Window_Base._iconWidth||32;
            if(bitmap.isReady())w.contents.blt(bitmap,index%16*cell,Math.floor(index/16)*cell,cell,cell,x,y,size,size);
            else if(!w._npSystemIconWaiting){w._npSystemIconWaiting=true;bitmap.addLoadListener(function(){if(w.contents)w.refresh();});}
        }else icon(w,e.kind==='bad'?'moon':e.kind==='neutral'?'sparkles':'sun',x,y,size);
    }
    function bar(w,label,value,max,x,y,width,color,size) {
        text(w,label,x,y,width*0.5,size,P.muted);text(w,value+' / '+max,x+width*0.5,y,width*0.5,size,P.text,'right');
        rounded(w,x,y+27,width,6,'#10120f',null,2);rounded(w,x,y+27,Math.floor(width*Math.max(0,Math.min(1,max>0?value/max:0))),6,color,null,2);
    }
    function portrait(w,a,x,y,width,height) {
        var aid=a.actorId(),hud=window.NP_BattleHUD;
        if(!hud||!hud.FACE||!hud.FACE[aid]){w.drawActorFace(a,x,y,Math.min(width,144),Math.min(height,144));return;}
        var image=ImageManager.loadPicture('battle/c_window_actor'+aid);
        rounded(w,x,y,width,height,'#2d2b22',null,8);
        if(image.isReady()){
            // The original 300px picture is cropped as a broad torso/face column, like the approved mockup.
            var sw=Math.min(300,width*300/height),sx=(300-sw)/2;
            var ctx=w.contents._context;if(ctx){ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();}
            w.contents.blt(image,sx,0,sw,300,x,y,width,height);if(ctx)ctx.restore();
        } else {w._npPortraitLoading=w._npPortraitLoading||{};if(!w._npPortraitLoading[aid]){w._npPortraitLoading[aid]=true;image.addLoadListener(function(){if(w.contents)w.refresh();});}}
    }
    function screenRect(w,x,y,width,height,actor) {return {x:w.x+w.padding+x,y:w.y+w.padding+y,w:width,h:height,actor:actor};}
    function installCards(w,layout) {
        w.numVisibleRows=function(){return Math.min(2,Math.ceil(members().length/layout.cols));};
        w.maxCols=function(){return layout.cols;};w.spacing=function(){return 14;};w.itemHeight=function(){return layout.row;};
        w._npEffectRects=[];w._npDetailRects=[];
        w.drawItem=function(index){
            var a=members()[index];if(!a)return;
            var r=this.itemRect(index),height=r.height-(layout.wide?14:8),wide=r.width>=700;
            var pic=wide?126:(layout.cols===2&&r.width>=420?102:r.width>=500?106:76),inset=wide?20:12,x=r.x+pic+inset,width=r.width-pic-inset*2,y=r.y+10;
            rounded(this,r.x+0.5,r.y+0.5,r.width-1,height-1,P.card,P.line);
            portrait(this,a,r.x+1,r.y+1,pic-1,height-2);
            // Keep formation's pending highlight on the native selector, without changing other actor windows.
            if(this.pendingIndex&&this.pendingIndex()===index)rounded(this,r.x+1,r.y+1,r.width-2,height-2,'rgba(220,188,124,0.12)',P.gold);
            var nameSize=wide?26:21,small=wide?16:13,detailsW=wide?166:118;
            text(this,a.name(),x,y,wide?Math.min(width,145):width,nameSize,P.text,null,true);
            var className=a.currentClass().name+' · '+L('ур. ','Lv. ')+a.level;
            if(wide)text(this,className,x+Math.min(145,this.textWidth(a.name())+16),y+2,Math.max(0,width-detailsW-150),small,P.muted);
            else text(this,className,x,y+24,Math.max(0,width-detailsW-8),small,P.muted);
            var detailsY=wide?y:y+24;
            text(this,L('Характеристики ›','Attributes ›'),x+width-detailsW,detailsY,detailsW,small,P.gold,'right');
            this._npDetailRects[index]=screenRect(this,x+width-detailsW,detailsY,detailsW,26,index);
            var barsY=y+(wide?43:51),gap=wide?22:12,hpW=Math.floor((width-gap)*0.565),mpW=width-gap-hpW;
            bar(this,L('Здоровье','Health'),a.hp,a.mhp,x,barsY,hpW,P.hp,small);bar(this,L('Магия','Magic'),a.mp,a.mmp,x+hpW+gap,barsY,mpW,P.mp,small);
            var statsY=barsY+37;
            text(this,L('Усталость ','Fatigue ')+Math.round(a._tp||0)+'%',x,statsY,width*0.5,small,P.muted);
            if(window.NP_Stress&&NP_Stress.active&&NP_Stress.active())text(this,L('Напряжение ','Stress ')+NP_Stress.get(a.actorId())+' / 100',x+width*0.45,statsY,width*0.55,small,P.muted,'right');
            var list=effects(a),chipsY=statsY+28,cx=x,max=width,chipH=wide?29:25,chipSize=wide?14:12;
            if(!list.length)text(this,L('Нет временных эффектов','No temporary effects'),x,chipsY,width,chipSize,P.muted);
            var shown=0;
            for(var i=0;i<list.length;i++){
                this.contents.fontSize=chipSize;var e=list[i],duration=e.duration||e.badge||'',ew=this.textWidth(plain(e.name))+this.textWidth(duration)+42;
                var reserve=i<list.length-1?48:0;if(cx+ew>x+max-reserve)break;
                var chip=CHIP[e.kind]||CHIP.neutral;
                rounded(this,cx,chipsY,ew,chipH,chip.fill,chip.line,5);effectIcon(this,e,cx+7,chipsY+7,13);
                text(this,e.name,cx+25,chipsY-1,ew-31-this.textWidth(duration),chipSize,chip.text);text(this,duration,cx+ew-this.textWidth(duration)-7,chipsY-1,this.textWidth(duration)+2,chipSize,P.muted);
                cx+=ew+7;shown++;
            }
            if(shown<list.length){var moreW=Math.min(80,x+width-cx);rounded(this,cx,chipsY,moreW,chipH,P.inset,P.line,5);text(this,'+'+(list.length-shown)+' ›',cx+5,chipsY-1,moreW-10,chipSize,P.gold);}
            this._npEffectRects[index]=screenRect(this,x,chipsY,width,chipH,index);
            if(a.actorId()===2)text(this,L('Любовь ','Love ')+gv(83)+'       '+L('Похоть ','Lust ')+gv(82),x,chipsY+chipH+4,width,chipSize,'#dfb4bd');
        };
        var refresh=w.refresh;w.refresh=function(){this._npEffectRects=[];this._npDetailRects=[];this.contents.outlineWidth=0;refresh.apply(this,arguments);};w.refresh();
    }
    function questObjective(q) {
        if(!q)return '';
        if(q.progress&&typeof KNS_QuestBase!=='undefined'&&KNS_QuestBase.getCurrentProgressIndex){var p=q.progress[KNS_QuestBase.getCurrentProgressIndex(q)];if(p)return plain(p[1]);}
        return plain(q.short_desc||'');
    }
    function refreshContext(scene) {
        var w=scene._npHeader,width=w.contentsWidth(),wide=scene._npLayout.wide,q=$.currentQuest(),size=wide?16:13;
        w.contents.clear();text(w,'NYMPRI',0,wide?16:2,150,wide?23:18,P.gold,null,true);
        text(w,L('ПУТЬ АВАНТЮРИСТА','THE ADVENTURER’S PATH'),wide?155:112,wide?17:2,width-160,wide?13:10,P.muted);
        w.contents.fillRect(0,wide?59:31,width,1,P.line);
        text(w,L('День ','Day ')+gv(4)+' · '+(Number(gv(5))===1?L('Ночь','Night'):L('День','Daytime')),0,wide?79:38,width*0.6,size,P.muted);
        text(w,mapCaption(),0,wide?106:59,width*0.68,wide?29:22,P.text,null,true);
        var currency=scene._goldWindow.currencyUnit?scene._goldWindow.currencyUnit():($dataSystem.currencyUnit||'G');
        if(currency==='銀貨')currency=L('серебра','SC');
        var money=String($gameParty.gold()).replace(/\B(?=(\d{3})+(?!\d))/g,' ')+' '+currency,walletW=wide?290:185;
        icon(w,'coins',width-walletW,wide?104:60,wide?22:17);text(w,money,width-walletW+29,wide?101:56,wide?145:100,wide?19:15,P.gold);
        text(w,L('Ранг ','Rank ')+gv(9)+' ★',width-(wide?100:75),wide?101:56,wide?100:75,wide?17:13,P.gold,'right');
        w=scene._npQuest;width=w.contentsWidth();w.contents.clear();w.contents.fillRect(0,0,width,1,P.line);w.contents.fillRect(0,w.contentsHeight()-1,width,1,P.line);
        icon(w,'scroll-text',0,wide?15:4,17);text(w,L('ТЕКУЩЕЕ ЗАДАНИЕ','CURRENT QUEST'),25,wide?9:0,width-25,wide?13:11,P.gold);
        var route=scene._commandWindow._list.find(function(c){return c.symbol==='knsQuest';});
        text(w,q?q.title:L('Нет отмеченного или сюжетного задания','No bookmarked or story quest'),0,wide?38:20,width-(route?110:0),wide?22:16,P.text,null,true);
        text(w,questObjective(q),0,wide?68:41,width-(route?110:0),wide?16:12,P.muted);
        if(route)text(w,L('Журнал ›','Journal ›'),width-110,wide?43:23,110,wide?16:13,P.gold,'right');
        scene._npQuestRect=route?screenRect(w,width-110,0,110,w.contentsHeight()):null;
        w=scene._npSummary;width=w.contentsWidth();w.contents.clear();
        text(w,L('Слава ','Fame ')+gv(322)+'     '+L('Репутация ','Reputation ')+plain(gv(328)),0,0,width,wide?16:12,P.muted);
        var allocate=scene._npExtraCommands.find(function(c){return c.symbol==='npAllocate';});
        if(allocate)text(w,L('Распределить очки ›','Allocate points ›'),width-(wide?240:170),0,wide?240:170,wide?16:12,P.gold,'right');
        scene._npAllocateRect=allocate?screenRect(w,width-(wide?240:170),0,wide?240:170,w.contentsHeight()):null;
        w=scene._npFooter;width=w.contentsWidth();w.contents.clear();w.contents.fillRect(0,0,width,1,P.line);
        text(w,L('↑↓  Выбор      Enter  Открыть','↑↓  Select      Enter  Open'),0,wide?10:2,width*0.65,wide?14:11,P.muted);
        text(w,L('Esc  Назад · Мышь','Esc  Back · Mouse'),width*0.65,wide?10:2,width*0.35,wide?14:11,P.muted,'right');
    }
    function wrap(w, value, width) {
        var lines = [];
        String(value).split('\n').forEach(function(paragraph) {
            var line = '';
            paragraph.split(/\s+/).forEach(function(word) {
                if (line && w.textWidth(line + ' ' + word) > width) { lines.push(line); line = ''; }
                while (w.textWidth(word) > width && word.length > 1) {
                    var split = 1;
                    while (split < word.length && w.textWidth(word.slice(0, split + 1)) <= width) split++;
                    lines.push(word.slice(0, split)); word = word.slice(split);
                }
                line += (line ? ' ' : '') + word;
            });
            if (line) lines.push(line);
        });
        return lines;
    }
    function Window_NpMenuEffects() { this.initialize.apply(this, arguments); }
    Window_NpMenuEffects.prototype = Object.create(Window_Selectable.prototype);
    Window_NpMenuEffects.prototype.constructor = Window_NpMenuEffects;
    Window_NpMenuEffects.prototype.initialize = function() {
        this._data = []; this._actorIndex = 0;
        var w = Math.min(720, Graphics.boxWidth - 48), h = Graphics.boxHeight - 80;
        Window_Selectable.prototype.initialize.call(this, (Graphics.boxWidth - w) / 2, 40, w, h);
        style(this, {x:this.x, y:this.y, w:w, h:h}, 16); this._actorIndex = 0; this._data = []; this.hide(); this.deactivate();
    };
    Window_NpMenuEffects.prototype.maxItems = function() { return this._data.length; };
    Window_NpMenuEffects.prototype.itemHeight = function() { return 116; };
    Window_NpMenuEffects.prototype.itemRect = function(index) {
        var r = Window_Selectable.prototype.itemRect.call(this, index); r.y += 72; return r;
    };
    Window_NpMenuEffects.prototype.maxPageRows = function() { return Math.max(1, Math.floor((this.contentsHeight() - 72) / this.itemHeight())); };
    Window_NpMenuEffects.prototype.refresh = function() {
        this.contents.clear(); background(this);
        var a = members()[this._actorIndex]; if (!a) return;
        this._data = [];
        var self = this, width = this.contentsWidth() - 16;
        this.contents.fontSize = 16;
        effects(a).forEach(function(e) {
            var lines = wrap(self, plain(e.details), width), chunks = Math.max(1, Math.ceil(lines.length / 2));
            for (var i = 0; i < chunks; i++) self._data.push({name:e.name + (chunks > 1 ? ' (' + (i + 1) + '/' + chunks + ')' : ''), duration:e.duration, lines:lines.slice(i * 2, i * 2 + 2)});
        });
        text(this, a.name() + ' · ' + L('Эффекты', 'Effects'), 8, 0, this.contentsWidth() - 16, 23, P.gold);
        text(this, L('←→ Персонаж · ↑↓/PgUp/PgDn Список · Esc Назад', '←→ Actor · ↑↓/PgUp/PgDn List · Esc Back'), 8, 30, this.contentsWidth() - 16, 15, P.muted);
        if (!this._data.length) text(this, L('Нет временных эффектов', 'No temporary effects'), 8, 80, this.contentsWidth() - 16, 19, P.muted);
        this.drawAllItems();
    };
    Window_NpMenuEffects.prototype.drawItem = function(index) {
        var e = this._data[index]; if (!e) return;
        var r = this.itemRect(index), width = r.width - 16;
        this.contents.fillRect(r.x, r.y, r.width, r.height - 6, P.card);
        text(this, e.name, r.x + 8, r.y + 2, width, 20, P.gold);
        text(this, e.duration || '', r.x + 8, r.y + 27, width, 16, P.muted);
        for (var i = 0; i < e.lines.length; i++) text(this, e.lines[i], r.x + 8, r.y + 50 + i * 23, width, 16);

    };
    Window_NpMenuEffects.prototype.processCursorMove = function() {
        if (this.active && (Input.isRepeated('left') || Input.isRepeated('right'))) {
            var direction = Input.isRepeated('right') ? 1 : -1;
            this._actorIndex = (this._actorIndex + members().length + direction) % Math.max(1, members().length);
            this.select(0); this.refresh(); SoundManager.playCursor();
        } else Window_Selectable.prototype.processCursorMove.call(this);
    };

    function Window_NpNavigation() {this.initialize.apply(this,arguments);}
    Window_NpNavigation.prototype=Object.create(Window_Command.prototype);Window_NpNavigation.prototype.constructor=Window_NpNavigation;
    Window_NpNavigation.prototype.initialize=function(entries,rect,modal){this._npEntries=entries;this._npRect=rect;this._npModal=!!modal;Window_Command.prototype.initialize.call(this,rect.x,rect.y);style(this,rect,modal?16:0);this.refresh();this.select(0);};
    Window_NpNavigation.prototype.windowWidth=function(){return this._npRect.w;};
    Window_NpNavigation.prototype.windowHeight=function(){return this._npRect.h;};
    Window_NpNavigation.prototype.makeCommandList=function(){this._list=this._npEntries.slice();};
    Window_NpNavigation.prototype.itemHeight=function(){
        if(this._npModal)return 44;
        var base=Graphics.boxWidth>=1000?55:43,count=Math.max(1,this._npEntries.length);
        return Math.max(32,Math.min(base,Math.floor((this._npRect.h-14)/count)));
    };
    Window_NpNavigation.prototype.itemRect=function(index){var r=Window_Selectable.prototype.itemRect.call(this,index);if(!this._npModal&&this._list[index]&&this._list[index].lower)r.y+=14;return r;};
    Window_NpNavigation.prototype.updateCursor=function(){this.setCursorRect(0,0,0,0);};
    Window_NpNavigation.prototype.select=function(index){Window_Selectable.prototype.select.call(this,index);if(this.contents&&this._list)this.refresh();};
    Window_NpNavigation.prototype.drawItem=function(index){
        var r=this.itemRect(index),entry=this._list[index],size=Graphics.boxWidth>=1000?18:14,iconY=r.y+Math.floor((r.height-18)/2),textY=r.y+Math.floor((r.height-this.lineHeight())/2);
        if(index===this.index())rounded(this,r.x+0.5,r.y+0.5,r.width-1,r.height-5,P.active,'#62553b',6);
        if(entry.separator&&index>0)this.contents.fillRect(r.x,r.y-8,r.width,1,P.line);
        this.changePaintOpacity(entry.enabled!==false);if(entry.icon)icon(this,entry.icon,r.x+12,iconY,18);
        text(this,entry.name,r.x+(entry.icon?41:12),textY,r.width-(entry.icon?55:24),size,index===this.index()?P.gold:P.text);
        if(index===this.index()&&!this._npModal)text(this,'›',r.x+r.width-24,textY,16,size,P.gold,'right');this.changePaintOpacity(true);
    };
    Window_NpNavigation.prototype.refresh=function(){if(!this.contents)return;this.contents.clear();if(this._npModal)background(this);this.drawAllItems();};
    function focusNavigation(scene){scene._commandWindow.active=false;scene._commandWindow.hide();scene._npNavigation.activate();}
    function dispatch(scene,entry){
        if(!entry||entry.enabled===false)return;
        scene._npNavigation.deactivate();scene._npMore.hide();scene._npMore.deactivate();if(scene._npJournal){scene._npJournal.hide();scene._npJournal.deactivate();}
        var original=scene._commandWindow,index=original._list.indexOf(entry);
        if(index>=0){original.select(index);Window_MenuCommand._lastCommandSymbol=entry.symbol;original.deactivate();original.callHandler(entry.symbol);}else if(entry.action)entry.action();
    }
    function openGroup(scene,w){scene._npNavigation.deactivate();scene._statusWindow.deactivate();w.refresh();w.select(0);w.show();w.activate();consume();}
    function makeGroup(scene,entries){
        var width=Math.min(470,Graphics.boxWidth-48),height=Math.min(Graphics.boxHeight-80,entries.length*44+32),w=new Window_NpNavigation(entries,{x:(Graphics.boxWidth-width)/2,y:(Graphics.boxHeight-height)/2,w:width,h:height},true);
        entries.forEach(function(entry){w.setHandler(entry.symbol,function(){dispatch(scene,w._list[w.index()]);});});w.setHandler('cancel',function(){w.hide();w.deactivate();focusNavigation(scene);consume();});w.hide();w.deactivate();scene.addWindow(w);return w;
    }
    function openDiary(scene){
        var diary=NP_PriestessDiary;
        if(diary.canRead&&!diary.canRead()&&diary.showRefusal){
            scene._npNavigation.deactivate();scene._statusWindow.deactivate();scene._commandWindow.deactivate();
            SoundManager.playBuzzer();diary.showRefusal(scene);
            var refusal=scene._npRefusal;
            if(refusal&&!refusal._npMenuCloseWrapped){
                var close=refusal._closeMe;refusal._npMenuCloseWrapped=true;
                refusal._closeMe=function(){var result=close.apply(this,arguments);focusNavigation(scene);consume();return result;};
            }
            consume();return;
        }
        diary.open();focusNavigation(scene);
    }
    function installNavigation(scene,layout){
        var original=scene._commandWindow,used=[],entries=[],extra=[];
        function primary(symbol,ru,en,image,separator){var source=original._list.find(function(c){return c.symbol===symbol;});if(source){used.push(source);entries.push({name:L(ru,en),symbol:'npRoute'+entries.length,enabled:source.enabled,ext:source.ext,source:source,icon:image,separator:separator});return entries[entries.length-1];}return null;}
        primary('status','Отряд','Party','users');primary('item','Предметы','Items','backpack');primary('equip','Снаряжение','Equipment','shield');primary('skill','Умения','Skills','sparkles');primary('knsQuest','Задания','Quests','scroll-text');
        var titles=original._list.filter(function(c){return c.symbol==='npTitles';}),diary=window.NP_PriestessDiary&&typeof NP_PriestessDiary.open==='function'&&typeof $dataItems!=='undefined'&&$dataItems[NP_PriestessDiary.ITEM_ID||1490]&&$gameParty.hasItem&&$gameParty.hasItem($dataItems[NP_PriestessDiary.ITEM_ID||1490]);
        if(diary){var diaryEntry={name:L('Дневник жрицы','Priestess diary'),symbol:'npDiary',enabled:true,action:function(){openDiary(scene);}};var journalEntries=[diaryEntry].concat(titles);titles.forEach(function(c){used.push(c);});scene._npJournal=makeGroup(scene,journalEntries);entries.push({name:L('Дневник и титулы','Diary and titles'),symbol:'npJournal',enabled:true,icon:'book-open',action:function(){openGroup(scene,scene._npJournal);}});}
        else primary('npTitles','Дневник и титулы','Diary and titles','book-open');
        primary('personalStatus','Список персонажей','Character profiles','users');primary('TorigoyaCommonMenu_0','Спутники (A)','Companions (A)','heart');
        primary('save','Сохранение','Save','save',true);primary('options','Настройки','Settings','settings',true);
        // Only the first lower navigation item owns the separator.
        var separated=false;entries.forEach(function(e){if(e.separator){e.separator=!separated;separated=true;}else if(separated)e.separator=false;});
        extra.push({name:L('Эффекты отряда','Party effects'),symbol:'npEffects',enabled:true,ext:null,action:function(){openEffects(scene,Math.max(0,scene._statusWindow.index()));}});
        var allocation=window.NP_LevelAllocation&&NP_LevelAllocation.Scene||window.Scene_NpLevelAllocation;
        if(allocation&&(Number(gv(172))>0||Number(gv(173))>0))extra.push({name:L('Распределить очки','Allocate points'),symbol:'npAllocate',enabled:true,ext:null,action:function(){SceneManager.push(allocation);if(SceneManager.prepareNextScene)SceneManager.prepareNextScene(Number(gv(172))>0?1:2);}});
        var exit=primary('gameEnd','Выход','Exit','chevron-right');if(exit)entries.pop();
        scene._npExtraCommands=extra;var remaining=original._list.filter(function(c){return used.indexOf(c)<0;});scene._npMore=makeGroup(scene,remaining.concat(extra));
        entries.push({name:L('Ещё','More'),symbol:'npMore',enabled:true,icon:'ellipsis',action:function(){openGroup(scene,scene._npMore);}});if(exit)entries.push(exit);
        // Offset every lower row equally to leave room for the single separator.
        var after=false;entries.forEach(function(e){if(e.separator)after=true;e.lower=after;});
        var nav=scene._npNavigation=new Window_NpNavigation(entries,layout.command,false);entries.forEach(function(e){nav.setHandler(e.symbol,function(){dispatch(scene,e.source||e);});});nav.setHandler('cancel',function(){original.callHandler('cancel');});scene.addWindow(nav);
        var remembered=Window_MenuCommand._lastCommandSymbol?entries.findIndex(function(e){return e.source&&e.source===original._list[original.index()];}):-1;nav.select(remembered<0?0:remembered);
        // Original handlers continue to observe their original window, symbol and ext. Native cancel handlers hand focus back here.
        original.hide();original.deactivate();original.activate=function(){focusNavigation(scene);return this;};
        original.refresh=function(){this.createContents();Window_Selectable.prototype.refresh.call(this);};
    }
    function openEffects(scene,index){
        var tip=scene._npEffects;scene._npResume={status:scene._statusWindow.active};scene._npNavigation.deactivate();scene._commandWindow.deactivate();scene._statusWindow.deactivate();
        tip._actorIndex=index||0;tip.refresh();tip.select(0);tip.show();tip.activate();consume();
    }
    var create=Scene_Menu.prototype.create;
    Scene_Menu.prototype.create=function(){
        create.apply(this,arguments);if(!$.enabled())return;
        if(this._backgroundSprite){var backdrop=new Bitmap(Graphics.boxWidth,Graphics.boxHeight);backdrop.fillAll(P.bg);this._backgroundSprite.bitmap=backdrop;this._backgroundSprite.opacity=255;}
        var scene=this,layout=this._npLayout=$.layout(),status=this._statusWindow;
        this._goldWindow.hide();(this._variableWindows||[]).forEach(function(w){w.hide();});
        style(status,layout.status);installCards(status,layout);status.select(status.index());
        this._npHeader=panel(this,layout.header);this._npQuest=panel(this,layout.quest);this._npSummary=panel(this,layout.summary);this._npFooter=panel(this,layout.footer);
        installNavigation(this,layout);this._npEffects=new Window_NpMenuEffects();this._npEffects.setHandler('cancel',function(){scene._npEffects.hide();scene._npEffects.deactivate();if(scene._npResume.status)status.activate();else focusNavigation(scene);consume();});this.addWindow(this._npEffects);
        this._npHeader.refresh=function(){refreshContext(scene);};this._npQuest.refresh=this._npHeader.refresh;refreshContext(this);this._npMenuTick=0;
    };
    function contains(r,x,y){return r&&x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;}
    function cardContains(w,r){return r&&r.y>=w.y+w.padding&&r.y+r.h<=w.y+w.height-w.padding;}
    var update=Scene_Menu.prototype.update;
    Scene_Menu.prototype.update=function(){
        if(this._npEffects){
            var blocked=this._npRefusal||this._npEffects.visible||this._npMore.visible||(this._npJournal&&this._npJournal.visible);
            if(!blocked&&TouchInput.isTriggered()){
                var p=this._statusWindow,i,rects=p._npEffectRects||[];
                for(i=0;i<rects.length;i++)if(cardContains(p,rects[i])&&contains(rects[i],TouchInput.x,TouchInput.y)){openEffects(this,rects[i].actor);break;}
                if(!this._npEffects.visible){
                    rects=p._npDetailRects||[];
                    for(i=0;i<rects.length;i++)if(cardContains(p,rects[i])&&contains(rects[i],TouchInput.x,TouchInput.y)){
                        var source=this._commandWindow._list.find(function(c){return c.symbol==='status';});if(source&&source.enabled!==false){dispatch(this,source);p.select(rects[i].actor);p.processOk();consume();}break;
                    }
                    if(contains(this._npQuestRect,TouchInput.x,TouchInput.y)){dispatch(this,this._commandWindow._list.find(function(c){return c.symbol==='knsQuest';}));consume();}
                    if(contains(this._npAllocateRect,TouchInput.x,TouchInput.y)){dispatch(this,this._npExtraCommands.find(function(c){return c.symbol==='npAllocate';}));consume();}
                }
            }
            if(this._npEffects.visible){var a=members()[this._npEffects._actorIndex],key=a?JSON.stringify(effects(a)):'';if(key!==this._npEffectsKey){this._npEffectsKey=key;this._npEffects.refresh();}}
            this._npMenuTick++;if(this._npMenuTick%20===0){this._statusWindow.refresh();refreshContext(this);}
        }
        update.apply(this,arguments);
    };
    return $;
})();
