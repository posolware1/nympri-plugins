# Плагины мода NymPri (RU)

![RPG Maker MV](https://img.shields.io/badge/RPG_Maker-MV-blue)

Личный набор плагинов русского мода **Nymphomania Priestess** (RPG Maker MV, 18+). Не связан с издателем оригинала.

Только перевод + переключатель языка: [nympri-ru](https://github.com/posolware1/nympri-ru)

![Титульный экран: RU | EN и ползунок музыки](docs/screenshots/title.png)

Кнопка RU | EN — `NP_Language`. Динамик и ползунок — `NP_TitleVolume`.

Сначала нужен **Python 3**. Скачайте его с https://www.python.org/downloads/ . На первом экране отметьте **Add python.exe to PATH**. Программа Python из Microsoft Store этот установщик не запускает.

Игра — **Alpha 0.80j** для Windows. Английский текст ставится отдельно: [nympri-ru](https://github.com/posolware1/nympri-ru).

## Установка

1. Нажмите **Code**, затем **Download ZIP**.
2. Распакуйте весь ZIP в обычную папку. Откройте папку, где лежит `install.bat`. Не запускайте `install.bat` прямо из окна ZIP.
3. Дважды щёлкните `install.bat`.
4. Когда окно спросит папку, укажите папку игры. Это папка, где лежит `Game.exe`, или папка `www` внутри неё.
5. Дождитесь строк **Готово. Плагины установлены.** и **Done. Plugins are installed.**
6. Запустите игру.

Если написано **Не получилось.**, откройте файл `install-log.txt` в той же папке, что и `install.bat`, и пришлите этот файл.

## Плагины по категориям

Категории — только для навигации. **Порядок загрузки отдельный** — `install/plugins_order.txt`.

### Язык

- [NP_Language](plugins/NP_Language/) — Кнопка на титуле и пункт в настройках: RU ↔ EN, затем перезапуск.
- [NP_OptionsCategories](plugins/NP_OptionsCategories/) — Настройки по разделам: Звук, Бой, Механики, Интерфейс, Язык, Прочее.

### Интерфейс

- [NP_TitleVolume](plugins/NP_TitleVolume/) — Динамик и ползунок музыки 0–100 на титуле.
- [NP_TitleProgress](plugins/NP_TitleProgress/) — Фон и музыка титула сдвигаются по связи с Яризо.
- [NP_MenuLayout](plugins/NP_MenuLayout/) — Пауза: карточки отряда, задание, команды в «Ещё».
- [NP_LogToggle](plugins/NP_LogToggle/) — Журнал карты гаснет на сообщениях; L/D сворачивает.
- [NP_UIColors](plugins/NP_UIColors/) — Опция перекрашивает задания, вещи, лавку, журналы.
- [NP_SaveThumb](plugins/NP_SaveThumb/) — Слоты: снимок карты, глава, задание, стадия жрицы.
- [NP_ShopCompare](plugins/NP_ShopCompare/) — В лавке: «сейчас → станет» зелёным/красным.
- [NP_LevelAllocation](plugins/NP_LevelAllocation/) — После уровня — все новые очки на одном экране.
- [NP_BattleHUD](plugins/NP_BattleHUD/) — Карточки отряда: лицо, HP/MP, усталость, супер, напряжение.
- [NP_BattleCmd](plugins/NP_BattleCmd/) — Команды боя: две колонки «иконка + подпись».
- [NP_EnemyHUD](plugins/NP_EnemyHUD/) — Карточка врага: имя, HP, эффекты; F6 — подробности.
- [NP_PictureAnim](plugins/NP_PictureAnim/) — Картинка может дышать/качаться; лицо не искажается.
- [NP_VideoPortrait](plugins/NP_VideoPortrait/) — Зацикленное видео на месте портрета.

### Бой

- [NP_FastBattle](plugins/NP_FastBattle/) — Опция: короче паузы боя, без картинок кубиков.
- [NP_BattleQoL](plugins/NP_BattleQoL/) — Shift = ×2; автобой = обычная атака.
- [NP_PowerStrike](plugins/NP_PowerStrike/) — Команда боя: три мини-игры и множитель урона.
- [NP_SuperAttack](plugins/NP_SuperAttack/) — Суперы у жрицы, Яризо, Зельеварки и принцессы-вампира.
- [NP_BossBalance](plugins/NP_BossBalance/) — Фазы боссов, предел оглушения, масштаб сложности.
- [NP_RareMobs](plugins/NP_RareMobs/) — Редкие со звездой и бестиарий.
- [NP_EliteMobs](plugins/NP_EliteMobs/) — Шесть новых редких; шанс 25%, один на вход в карту.
- [NP_EliteRewards](plugins/NP_EliteRewards/) — Постоянные трофеи с шести новых редких.
- [NP_EliteSprites](plugins/NP_EliteSprites/) — Свои листы персонажей у новых редких.
- [NP_ClothDamage](plugins/NP_ClothDamage/) — Удары рвут базовое облачение на трёх уровнях картинки.
- [NP_Stress](plugins/NP_Stress/) — Напряжение 0–100, черты, храмовая служба.
- [NP_Voice](plugins/NP_Voice/) — Опция: короткие вздохи/стоны из штатного звука.

### Задания

- [NP_QuestMarker](plugins/NP_QuestMarker/) — Мигающий «!» на цели задания или на выходе к ней.
- [NP_QuestHints](plugins/NP_QuestHints/) — Строка «Куда идти: …» в подробностях задания.
- [NP_QuestTabs](plugins/NP_QuestTabs/) — Вкладки журнала: Сюжет / Побочные / Выполненные.
- [NP_YarizoQuest](plugins/NP_YarizoQuest/) — Задание следит, где Яризо, и ставит метку.
- [NP_SouthGateQuest](plugins/NP_SouthGateQuest/) — С ранга 2: доставка за 200 G на южной заставе.
- [NP_MorningHints](plugins/NP_MorningHints/) — После ночной отлучки герой замечает мелочь на следующей карте.
- [NP_BondHints](plugins/NP_BondHints/) — Журнал карты: какой порог связи и где ночевать дальше.
- [NP_RemovedQuestCompat](plugins/NP_RemovedQuestCompat/) — Чистит остатки трёх убранных заданий в старых сейвах.

### Контент

- [NP_PriestessDiary](plugins/NP_PriestessDiary/) — Страница «♥» и дневник открытых записей.
- [NP_Titles](plugins/NP_Titles/) — Меню «Титулы»: открыть, надеть, небольшой бонус жрице.
- [NP_Campfire](plugins/NP_Campfire/) — В некоторые ночи — короткий разговор перед сном.
- [NP_CampSkills](plugins/NP_CampSkills/) — Перед ночным разговором: умения отдыха за очки лагеря/гостиницы.
- [NP_OutfitReact](plugins/NP_OutfitReact/) — В откровенном наряде Яризо иногда говорит; ответ слайдом.
- [NP_Items](plugins/NP_Items/) — Оружие спутников, проклятые вещи, аффиксы, святая вода.
- [NP_ItemNameFix](plugins/NP_ItemNameFix/) — Переименовывает независимые копии оружия из текущей БД.
- [NP_AudioBalance](plugins/NP_AudioBalance/) — Опция ограничивает громкость; тихие карты получают звук.

### Прочее

- [NP_AutoSave](plugins/NP_AutoSave/) — Автосейв при переходах, после сна и перед боссами.

## Язык

`NP_Language` даёт кнопку **RU | EN** на титуле и в настройках. CSV-перевод: [nympri-ru](https://github.com/posolware1/nympri-ru).

## Для разработчиков

[docs/dev.md](docs/dev.md). English: [README.md](README.md).
