# Плагины мода NymPri (RU)

![RPG Maker MV](https://img.shields.io/badge/RPG_Maker-MV-blue)

Личный набор плагинов русского мода **Nymphomania Priestess** (RPG Maker MV, 18+). Не связан с издателем оригинала.

Только перевод + переключатель языка: [nympri-ru](https://github.com/posolware1/nympri-ru)

![Титульный экран: RU | EN и ползунок музыки](docs/screenshots/title.png)

Кнопка RU | EN — `NP_Language`. Динамик и ползунок — `NP_TitleVolume`.

Игра — **Alpha 0.80j** для Windows. Английский текст ставится отдельно: [nympri-ru](https://github.com/posolware1/nympri-ru).

## Установка через install.bat

Python 3 нужен только этому способу. Проще всего скачать его с https://www.python.org/downloads/ и на первом экране отметить **Add python.exe to PATH**. Если открывается Store, сработала заглушка, а не сам Python. Проверьте, что Python 3 установлен и запускается.

## Установка

1. Нажмите **Code**, затем **Download ZIP**.
2. Распакуйте весь ZIP в обычную папку. Откройте папку, где лежит `install.bat`. Не запускайте `install.bat` прямо из окна ZIP.
3. Дважды щёлкните `install.bat`.
4. Когда окно спросит папку, укажите папку игры. Это папка, где лежит `Game.exe`, или папка `www` внутри неё.
5. Дождитесь строк **Готово. Плагины установлены.** и **Done. Plugins are installed.** Нажмите Enter, чтобы закрыть окно.
6. Запустите игру.

Если написано **Не получилось.**, откройте файл `install-log.txt` в той же папке, что и `install.bat`, и пришлите этот файл.

## Если не хотите запускать install.bat

Питон здесь не нужен. Этот способ только для **чистой Alpha 0.80j**, в чьём `plugins.js` нет текста `NP_`. Папка игры — та, где лежит `Game.exe`. Внутри неё папка `www`. Папку `www\save` не открывайте и не копируйте. Не копируйте весь архив в игру и не подменяйте `plugins.js` другим файлом целиком.

Если в `plugins.js` уже есть `NP_`, остановитесь. Не вставляйте текст и не копируйте файлы в эту игру. Одного плагина, например `NP_Language` или `NP_AutoSave`, уже достаточно: это изменённая копия. Вставка пропустит остальные или добавит плагин второй раз. Эту копию не трогайте. Ставьте в отдельную чистую копию Alpha 0.80j.

Это добавление файлов. Уже лежащие файлы оно не обновляет. Если Windows спросит заменить файл, нажмите **Пропустить** и остановитесь. Эта папка — не чистая игра.

1. Распакуйте весь ZIP в обычную папку. Не работайте внутри окна архива.
2. Откройте `www\js\plugins.js` игры в блокноте. Нажмите Ctrl+F и найдите `NP_`. Если блокнот что-то нашёл, закройте его без сохранения. Остановитесь. Возьмите отдельную чистую копию игры.
3. В той же папке `js` посмотрите, есть ли уже `plugins.js.manual-bak`. Если файл есть, остановитесь. Не заменяйте его. Это прежняя копия. Возьмите отдельную чистую копию игры.
4. Скопируйте `plugins.js` и назовите копию `plugins.js.manual-bak`. Возврат этого файла позже выключает новые плагины в списке. Он не удаляет скрипты, картинки и звуки, которые вы добавите ниже (48 скриптов и 102 других файла). Эти файлы останутся в `www`. Это не полный возврат папки к прежнему виду.
5. В распакованном архиве откройте папку `plugins`. В строке поиска проводника напишите `*.js` и нажмите Enter. Выделите все 48 файлов (только файлы, не папки). Скопируйте. Вставьте в `www\js\plugins` игры.
6. Картинки и звуки. Для каждой папки ниже откройте в ней папку `assets`. Выделите всё внутри `assets` (папки `img`, `movies` или `audio`). Скопируйте. Вставьте в `www` игры. «Объединить папки?» — **Да**. «Заменить файл?» — **Пропустить** и остановитесь.
   - `plugins\NP_AudioBalance\assets`
   - `plugins\NP_ClothDamage\assets`
   - `plugins\NP_EliteSprites\assets`
   - `plugins\NP_MenuLayout\assets`
   - `plugins\NP_OutfitReact\assets`
   - `plugins\NP_PictureAnim\assets`
   - `plugins\NP_Stress\assets`
   - `plugins\NP_SuperAttack\assets`
   - `plugins\NP_TitleProgress\assets`
   - `plugins\NP_VideoPortrait\assets`
7. Правой кнопкой по `www\js\plugins.js` игры → **Открыть с помощью** → **Блокнот**.
8. Нажмите Ctrl+F и найдите `MEO_Util_Node`. Эта строка должна заканчиваться запятой. Если запятой нет, допишите `,` в конце. Поставьте курсор в начало следующей строки. Откройте блокнотом `manual\paste-after-MEO_Util_Node.txt` из архива, нажмите Ctrl+A, скопируйте и вставьте.
9. Пролистайте `plugins.js` вниз, к строке `];`. Строка над `];` должна заканчиваться запятой. Если нет — допишите `,`. Поставьте курсор в начало строки `];`. Откройте `manual\paste-at-end.txt`, нажмите Ctrl+A, скопируйте и вставьте.
10. Нажмите Ctrl+S и закройте блокнот.
11. Проверка до запуска игры:
   - В `www\js\plugins` есть файл `NP_Language.js`.
   - В `www\audio\bgs` есть `NP_Campfire_Crackle.ogg`.
   - В `www\audio\se` есть `NP_ClothRip.ogg`.
   - В `plugins.js` имя `NP_Language` стоит сразу после `MEO_Util_Node`.
   - Последнее имя перед `];` — `NP_OptionsCategories`.
12. Запустите игру.

Английский текст сюда не входит. Он отдельно: [nympri-ru](https://github.com/posolware1/nympri-ru). Три новых звука (костёр, дождь, разрыв ткани) копируются на шаге 6. Остальные 50 имён звуков в эту ручную установку не входят.

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
- [NP_StoryHint](plugins/NP_StoryHint/) — Закреплённое «Что дальше» на вкладке «Сюжет»; говорит, где кончается 0.80j и когда в продаже снаряжение ранга 3.
- [NP_YarizoQuest](plugins/NP_YarizoQuest/) — Задание следит, где Яризо, и ставит метку.
- [NP_SoftlockFix](plugins/NP_SoftlockFix/) — Открывает шаги сюжета, чьи исходные условия не срабатывают.
- [NP_Progression](plugins/NP_Progression/) — Ранг 3 гильдии при 60 славы, квест 301010, дешевле середина витрины и немного золота с волков и боссов.
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
- [NP_OriginalBugFix](plugins/NP_OriginalBugFix/) — Чинит краши скриптов оригинала. Отсутствующие карты остаются закрытыми, кроме Горгоды и горной хижины: они открывают уже существующие города.

## Язык

`NP_Language` даёт кнопку **RU | EN** на титуле и в настройках. CSV-перевод: [nympri-ru](https://github.com/posolware1/nympri-ru).

## Для разработчиков

[docs/dev.md](docs/dev.md). Заметки версий: [CHANGELOG.md](CHANGELOG.md). English: [README.md](README.md).
