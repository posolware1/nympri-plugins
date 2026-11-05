/*:
 * @plugindesc v0.1.0 Custom graphics for the six NP_EliteMobs species. After NP_EliteRewards.
 * @author NymPri RU mod
 * @help
 * Graphics only. Requires Elite Expansion 1.0.2; does not change spawn rolls,
 * combat, loot, normal templates, original sheets or the thirteen older rares.
 * Single-character $ atlases include eight extra transparent pixels per edge.
 * Preserve the existing aura/star, render clean body above additive aura.
 * Character origin and star compensate this padding at native elite scale1.15.
 * Original event image is remembered in the event's saved state and restored
 * when the rare option is disabled or the rare marking is removed.
 */
(function(){
    'use strict';
    var R=window.NP_RareMobs,E=window.NP_EliteMobs;
    if(!R||!E||!window.NP_EliteRewards)throw new Error('NP_EliteSprites requires RareMobs, EliteMobs and EliteRewards');
    var P=window.NP_EliteSprites={VERSION:'0.1.0'};
    var defs={
        bloodwolf:{name:'$NP_Elite_Wolf_v1',original:['Animal',6]},
        threadspider:{name:'$NP_Elite_Spider_v1',original:['Monster3',7]},
        oathscorpion:{name:'$NP_Elite_Scorpion_v1',original:['Monster3',6]},
        sporecap:{name:'$NP_Elite_Mushroom_v1',original:['walkingmushroom',4]},
        echobat:{name:'$NP_Elite_Bat_v1',original:['Monster3',0]},
        greedsludge:{name:'$NP_Elite_Sludge_v1',original:['slime_v1',5]}
    };
    P.KEYS=Object.keys(defs);
    P.graphic=function(key){var d=defs[key];return d?{name:d.name,index:0,padding:8}:null;};
    function custom(ch){var d=ch&&R.rareOf(ch);return d&&defs[d.key]?defs[d.key]:null;}
    P.bind=function(ch){
        if(!ch||typeof ch.setImage!=='function'||typeof ch.characterName!=='function')return false;
        var d=custom(ch),old=ch._npEliteSpriteOriginal;
        if(d){
            if(ch.characterName()!==d.name||ch.characterIndex()!==0){
                if(ch.characterName()!==d.name)ch._npEliteSpriteOriginal={name:ch.characterName(),index:ch.characterIndex()};
                else if(!old)ch._npEliteSpriteOriginal={name:d.original[0],index:d.original[1]};
                ch.setImage(d.name,0);
            }
            return true;
        }
        if(old){
            // A newer event page may already have replaced the graphic. Never undo that page.
            var owned=P.KEYS.some(function(k){return defs[k].name===ch.characterName();});
            if(owned)ch.setImage(old.name,old.index);
            delete ch._npEliteSpriteOriginal;
        }
        return false;
    };
    var spawn=R.onSpawn;
    R.onSpawn=function(ev){var out=spawn.apply(this,arguments);P.bind(ev);return out;};
    var flush=E.flushSpawns;
    E.flushSpawns=function(map){var out=flush.apply(this,arguments),m=map||window.$gameMap;if(out&&m&&m.event)P.bind(m.event(out.id));return out;};
    var template=R.templateSprite;
    R.templateSprite=function(key){var d=defs[key];return d?{name:d.name,index:0}:template.apply(this,arguments);};
    var tinted=R.tinted;
    R.tinted=function(name,key){
        var t=tinted.apply(this,arguments),d=defs[key];
        if(d&&name===d.name&&!t._npEliteSourceListener){
            t._npEliteSourceListener=true;
            var src=ImageManager.loadCharacter(name);
            src.addLoadListener(function(){if(t.ready)t.main=src;});
        }
        return t;
    };
    var updatePosition=Sprite_Character.prototype.updatePosition;
    Sprite_Character.prototype.updatePosition=function(){
        updatePosition.apply(this,arguments);
        if(custom(this._character)&&this._character.characterName()===custom(this._character).name)this.y+=8*1.15;
    };
    var update=R.updateSprite;
    R.updateSprite=function(sp){
        var ch=sp._character,before=ch&&ch.characterName&&ch.characterName(),bound=P.bind(ch);
        if(ch&&before!==ch.characterName()){
            sp.updateBitmap();sp.updateFrame();sp.updatePosition();
        }
        update.apply(this,arguments);
        if(bound&&sp._npGlow&&sp._npRareKey===ch._npRare){
            var d=defs[ch._npRare],src=ImageManager.loadCharacter(d.name);
            if(!sp._npEliteBody){sp._npEliteBody=new Sprite(src);sp._npEliteBody.anchor.x=.5;sp._npEliteBody.anchor.y=1;sp.addChild(sp._npEliteBody);}
            sp._npEliteBody.bitmap=src;
            var f=sp._frame;sp._npEliteBody.setFrame(f.x,f.y,f.width,f.height);
            // Base rare renderer resets star.y each update, so this offset cannot accumulate.
            if(sp._npStar)sp._npStar.y+=8;
        }else if(sp._npEliteBody){sp.removeChild(sp._npEliteBody);sp._npEliteBody=null;}
    };
})();
