/*:
 * @plugindesc Save compatibility only: removes orphaned events/items of three cancelled quests.
 * @help Adds no quests, dialogue, art, rewards or map events. Never writes saves.
 */
var NP_RemovedQuestCompat = (function() {
    'use strict';
    var $={},questIds=[201092,201093,201094];
    var roles=['merchant','owner','host','letter','camp','driver','milo','mapBuyer','charmBuyer','collector'];
    var legacy={96:{44:[9,8,[3,4]],45:[7,8,[2]],46:[5,7,[7]],47:[8,11,[3]],48:[6,12,[0]]},171:{68:[15,8,[5,7]]},14:{73:[14,14,[5,7]]},241:{14:[26,60,[5]],15:[32,60,[4]]},248:{16:[11,12,[6]]}};
    function ownedData(data){return !!(data&&(data.note==='NP_LastArgument'||data.note==='NP_ComicFollowups'));}
    function prefab(ev){return !!(ev&&(ev._knsOriginalEvent||ev._originalEventId!==undefined||(ev.isPrefab&&ev.isPrefab())));}
    function removedEvent(ev,mapId,id,dataMap){
        if(!ev)return false;
        if(roles.indexOf(ev._npLastArgumentRole)>=0||roles.indexOf(ev._npComicFollowupRole)>=0||ownedData(ev._knsOriginalEvent))return true;
        if(prefab(ev)||!dataMap)return false;
        // Untagged first-version NPCs: require exact identity/position and an
        // unused original map slot. A genuine prefab or current static NPC stays.
        var p=legacy[mapId]&&legacy[mapId][id],data=dataMap.events&&dataMap.events[id];
        return !!(p&&(!data||ownedData(data))&&ev._x===p[0]&&ev._y===p[1]&&ev._characterName==='People5'&&p[2].indexOf(ev._characterIndex)>=0);
    }
    function codeIn(interpreter){return !!(interpreter&&interpreter._list&&interpreter._list.some(function(c){return(c.code===355||c.code===655)&&(c.parameters||[]).some(function(p){return typeof p==='string'&&/\b(?:NP_LastArgument|NP_ComicFollowups)\b/.test(p);});}));}
    function stopRemoved(interpreter,removed){
        if(!interpreter)return;
        if(codeIn(interpreter)||removed.indexOf(interpreter._eventId)>=0){
            if(interpreter.clear)interpreter.clear();
            else{interpreter._list=null;interpreter._childInterpreter=null;interpreter._waitMode='';interpreter._waitCount=0;}
        }else if(interpreter._childInterpreter){
            if(codeIn(interpreter._childInterpreter)||removed.indexOf(interpreter._childInterpreter._eventId)>=0)interpreter._childInterpreter=null;
            else stopRemoved(interpreter._childInterpreter,removed);
        }
    }
    $.scrubMap=function(map,dataMap){
        if(!map||!map._events)return;
        var mapId=map.mapId?map.mapId():map._mapId,removed=map._npRetiredQuestSlots||[];
        map._events.forEach(function(ev,id){if(removedEvent(ev,mapId,id,dataMap)){delete map._events[id];if(removed.indexOf(id)<0)removed.push(id);}});
        stopRemoved(map._interpreter,removed);
        (map._commonEvents||[]).forEach(function(e){stopRemoved(e&&e._interpreter,[]);});
        if(map._tileEvents)map._tileEvents=map._tileEvents.filter(function(e){return removed.indexOf(e._eventId)<0;});
        if(removed.length)map._npRetiredQuestSlots=removed;
        if(dataMap&&dataMap.events)removed.forEach(function(id){if(ownedData(dataMap.events[id]))delete dataMap.events[id];});
    };
    $.cleanSession=function(){
        if(typeof $gameParty!=='undefined'&&$gameParty&&$gameParty._items&&typeof $dataItems!=='undefined'&&$dataItems&&!$dataItems[2951])delete $gameParty._items[2951];
        if(typeof $gameSystem!=='undefined'&&$gameSystem&&Array.isArray($gameSystem._knsQuestNaviList)&&typeof $csvQuestList!=='undefined'&&$csvQuestList)$gameSystem._knsQuestNaviList=$gameSystem._knsQuestNaviList.map(function(id){return questIds.indexOf(Number(id))>=0&&!$csvQuestList[id]?0:id;});
    };
    var extract=DataManager.extractSaveContents;
    DataManager.extractSaveContents=function(contents){extract.apply(this,arguments);$.scrubMap($gameMap,null);$.cleanSession();};
    var onLoad=DataManager.onLoad;
    DataManager.onLoad=function(object){
        var map=typeof $gameMap!=='undefined'&&$gameMap,actualMap=map&&(map.mapId?map.mapId():map._mapId);
        var loading=typeof $gamePlayer!=='undefined'&&$gamePlayer&&$gamePlayer.isTransferring&&$gamePlayer.isTransferring()?$gamePlayer.newMapId():actualMap;
        var same=object===$dataMap&&map&&loading===actualMap;
        if(same)$.scrubMap(map,object);
        onLoad.apply(this,arguments);
        if(same){
            // Preserve a real static event added by another update at a former
            // quest slot; its data has now received the normal metadata setup.
            (map._npRetiredQuestSlots||[]).forEach(function(id){if(!map._events[id]&&object.events[id]&&!ownedData(object.events[id]))map._events[id]=new Game_Event(actualMap,id);});
            delete map._npRetiredQuestSlots;
        }else if(object===$dataMap&&map)delete map._npRetiredQuestSlots;
        $.cleanSession();
    };
    return $;
})();
