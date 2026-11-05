var NP_L = window.NP_L || function(r) { return r; }; // i18n: NP_Language (RU/EN)
//=============================================================================
// NP_TitleProgress.js
//=============================================================================
/*:
 * @plugindesc v1.0 Заставка титульного экрана меняется по прогрессу линии Яризо (+ своя музыка).
 * @author NP RU patch
 *
 * @param Enabled
 * @desc «Заставка по прогрессу» включена по умолчанию (true/false)
 * @default true
 *
 * @param Option Label
 * @desc Название пункта в Настройках (пусто = не добавлять пункт)
 * @default Заставка по прогрессу
 *
 * @param Backgrounds
 * @desc Фоны этапов 0..3 (img/titles1), через запятую
 * @default np_title_s0,np_title_s1,np_title_s2,np_title_s3
 *
 * @param Logo
 * @desc Слой логотипа (img/titles2)
 * @default np_title_logo
 *
 * @param Bgm
 * @desc Музыка этапов 0..3 (audio/bgm), через запятую; пусто = titleBgm из System.json
 * @default PerituneMaterial_Pray_Organ4_loop,PerituneMaterial_Pray_Organ4_loop,PerituneMaterial_Midnight_Masquerade_loop,harmonic-evil4
 *
 * @param Bgm Volume
 * @desc Громкость музыки этапов 0..3
 * @default 90,90,90,100
 *
 * @param Ken Burns
 * @desc Медленный зум/панорама фона (true/false)
 * @default true
 *
 * @help
 * Самый дальний достигнутый этап хранится в config.rpgsave (ConfigManager),
 * поэтому титульный экран знает его без загрузки сохранения.
 *
 * Этапы (V204 = [絆Lvl]ヤリゾー, уровень связи 0..5;
 *        S643 = [従者契約]ヤリゾー; S5 = режим галереи — тогда не считаем):
 *   0 — по умолчанию (новая установка)
 *   1 — S643 ВКЛ или V204 >= 2
 *   2 — V204 >= 3
 *   3 — V204 >= 4
 * Этап только растёт (максимум за все прохождения).
 * Если пункт «Заставка по прогрессу» выключен — всегда этап 0.
 */
var Imported = Imported || {};
Imported.NP_TitleProgress = true;
var NP_TitleProgress = NP_TitleProgress || {};

(function() {
    'use strict';
    var params = PluginManager.parameters('NP_TitleProgress');
    function list(s) { return String(s || '').split(',').map(function(x) { return x.trim(); }); }
    var P = {
        enabled: String(params['Enabled'] || 'true') !== 'false',
        optionLabel: params['Option Label'] !== undefined ? String(params['Option Label']) : NP_L('Заставка по прогрессу', "Progress-based title screen"),
        bgs: list(params['Backgrounds'] || 'np_title_s0,np_title_s1,np_title_s2,np_title_s3'),
        logo: String(params['Logo'] !== undefined ? params['Logo'] : 'np_title_logo'),
        bgm: list(params['Bgm'] !== undefined ? params['Bgm'] :
            'PerituneMaterial_Pray_Organ4_loop,PerituneMaterial_Pray_Organ4_loop,PerituneMaterial_Midnight_Masquerade_loop,harmonic-evil4'),
        vol: list(params['Bgm Volume'] || '90,90,90,100').map(Number),
        kenBurns: String(params['Ken Burns'] || 'true') !== 'false'
    };
    NP_TitleProgress.params = P;
    var MAX_STAGE = 3;
    var V_BOND = 204, S_CONTRACT = 643, S_GALLERY = 5;

    // ---------------------------------------------------------------------
    // Этап по состоянию игры
    // ---------------------------------------------------------------------
    NP_TitleProgress.computeStage = function(lvl, contract) {
        lvl = Number(lvl) || 0;
        if (lvl >= 4) return 3;
        if (lvl >= 3) return 2;
        if (lvl >= 2 || contract) return 1;
        return 0;
    };
    NP_TitleProgress.currentGameStage = function() {
        if (typeof $gameVariables === 'undefined' || !$gameVariables ||
            typeof $gameSwitches === 'undefined' || !$gameSwitches) return 0;
        if ($gameSwitches.value(S_GALLERY)) return -1; // галерея: не учитывать
        return NP_TitleProgress.computeStage($gameVariables.value(V_BOND), $gameSwitches.value(S_CONTRACT));
    };
    var _busy = false;
    NP_TitleProgress.refresh = function() {
        if (_busy) return;
        var st = NP_TitleProgress.currentGameStage();
        if (st > (ConfigManager.npTitleStage || 0)) {
            ConfigManager.npTitleStage = Math.min(st, MAX_STAGE);
            _busy = true;
            try { ConfigManager.save(); } catch (e) { console.warn('NP_TitleProgress: save failed', e); }
            _busy = false;
        }
    };
    NP_TitleProgress.titleStage = function() {
        if (!ConfigManager.npTitleProgress) return 0;
        var s = Number(ConfigManager.npTitleStage) || 0;
        return Math.max(0, Math.min(MAX_STAGE, Math.floor(s)));
    };

    // ---------------------------------------------------------------------
    // Config / Options
    // ---------------------------------------------------------------------
    ConfigManager.npTitleProgress = P.enabled;
    ConfigManager.npTitleStage = 0;
    var _Config_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _Config_makeData.apply(this, arguments);
        config.npTitleProgress = this.npTitleProgress;
        config.npTitleStage = this.npTitleStage;
        return config;
    };
    var _Config_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _Config_applyData.apply(this, arguments);
        this.npTitleProgress = (config && config.npTitleProgress !== undefined) ? !!config.npTitleProgress : P.enabled;
        var s = config && config.npTitleStage !== undefined ? Number(config.npTitleStage) : 0;
        this.npTitleStage = isFinite(s) ? Math.max(0, Math.min(MAX_STAGE, Math.floor(s))) : 0;
    };
    if (P.optionLabel && typeof Window_Options !== 'undefined') {
        var _Opt_addGeneral = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Opt_addGeneral.apply(this, arguments);
            this.addCommand(P.optionLabel, 'npTitleProgress');
        };
    }

    // ---------------------------------------------------------------------
    // Обновление во время игры
    // ---------------------------------------------------------------------
    var _Vars_setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        _Vars_setValue.apply(this, arguments);
        if (variableId === V_BOND && this === $gameVariables) NP_TitleProgress.refresh();
    };
    var _Sw_setValue = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(switchId, value) {
        _Sw_setValue.apply(this, arguments);
        if (switchId === S_CONTRACT && this === $gameSwitches) NP_TitleProgress.refresh();
    };
    if (typeof Scene_Map !== 'undefined') {
        var _Map_start = Scene_Map.prototype.start;
        Scene_Map.prototype.start = function() {
            _Map_start.apply(this, arguments);
            NP_TitleProgress.refresh(); // покрывает и загрузку старых сохранений
        };
    }

    // ---------------------------------------------------------------------
    // Титульный экран
    // ---------------------------------------------------------------------
    var _Title_createBackground = Scene_Title.prototype.createBackground;
    Scene_Title.prototype.createBackground = function() {
        var st = NP_TitleProgress.titleStage();
        var bg = P.bgs[st] || P.bgs[0];
        if (!bg) return _Title_createBackground.apply(this, arguments);
        var o1 = $dataSystem.title1Name, o2 = $dataSystem.title2Name;
        $dataSystem.title1Name = bg;
        $dataSystem.title2Name = P.logo;
        try { _Title_createBackground.apply(this, arguments); }
        finally { $dataSystem.title1Name = o1; $dataSystem.title2Name = o2; }
        this._npTitleStage = st;
        this._npKbFrame = 0;
    };

    var _Title_update = Scene_Title.prototype.update;
    Scene_Title.prototype.update = function() {
        _Title_update.apply(this, arguments);
        if (P.kenBurns && this._backSprite1 && this._backSprite1.bitmap && this._backSprite1.bitmap.isReady()) {
            var f = (this._npKbFrame = (this._npKbFrame || 0) + 1);
            var t = f / 60;
            var s = 1.05 + 0.03 * Math.sin(t * 2 * Math.PI / 40);        // 1.02..1.08, период 40 с
            var margin = (s - 1) * Graphics.width / 2 * 0.8;
            var sp = this._backSprite1;
            sp.anchor.x = 0.5; sp.anchor.y = 0.5;
            sp.scale.x = sp.scale.y = s;
            sp.x = Graphics.width / 2 + margin * Math.sin(t * 2 * Math.PI / 57);
            sp.y = Graphics.height / 2 + margin * 0.5 * Math.cos(t * 2 * Math.PI / 63);
        }
    };

    var _Title_playTitleMusic = Scene_Title.prototype.playTitleMusic;
    Scene_Title.prototype.playTitleMusic = function() {
        var st = this._npTitleStage !== undefined ? this._npTitleStage : NP_TitleProgress.titleStage();
        var name = P.bgm[st];
        if (!name) return _Title_playTitleMusic.apply(this, arguments);
        var base = $dataSystem.titleBgm || {};
        AudioManager.playBgm({name: name, volume: isFinite(P.vol[st]) ? P.vol[st] : 90,
            pitch: base.pitch || 100, pan: base.pan || 0});
        AudioManager.stopBgs();
        AudioManager.stopMe();
    };
})();
