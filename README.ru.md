# Плагины мода NymPri (RU)

![RPG Maker MV](https://img.shields.io/badge/RPG_Maker-MV-blue)

Личный набор плагинов русского мода **Nymphomania Priestess** (RPG Maker MV, 18+). Не связан с издателем оригинала.

Только перевод + переключатель языка: [nympri-ru](https://github.com/posolware1/nympri-ru)

![Титульный экран: RU | EN и ползунок музыки](docs/screenshots/title.png)

Кнопка RU | EN — `NP_Language`. Динамик и ползунок — `NP_TitleVolume`.

Сначала нужен **Python 3**. Проще всего скачать его с https://www.python.org/downloads/ и на первом экране отметить **Add python.exe to PATH**. Если открывается Store, сработала заглушка, а не сам Python. Проверьте, что Python 3 установлен и запускается.

Игра — **Alpha 0.80j** для Windows. Английский текст ставится отдельно: [nympri-ru](https://github.com/posolware1/nympri-ru).

## Установка

1. Нажмите **Code**, затем **Download ZIP**.
2. Распакуйте весь ZIP в обычную папку. Откройте папку, где лежит `install.bat`. Не запускайте `install.bat` прямо из окна ZIP.
3. Дважды щёлкните `install.bat`.
4. Когда окно спросит папку, укажите папку игры. Это папка, где лежит `Game.exe`, или папка `www` внутри неё.
5. Дождитесь строк **Готово. Плагины установлены.** и **Done. Plugins are installed.** Нажмите Enter, чтобы закрыть окно.
6. Запустите игру.

Если написано **Не получилось.**, откройте файл `install-log.txt` в той же папке, что и `install.bat`, и пришлите этот файл.

## Если не хотите запускать install.bat

Питон не нужен. Игра — **Alpha 0.80j** для Windows. Папка игры — та, где лежит `Game.exe`. Внутри неё папка `www`. Папку `www\save` не открывайте и не копируйте. Не копируйте весь скачанный архив в игру и не подменяйте `plugins.js` другим файлом целиком.

Если в `plugins.js` уже есть `NP_Language`, шаги 6 и 7 не делайте. Вторая вставка сломает список. Уже стоящие настройки плагинов останутся как есть.

1. Распакуйте весь ZIP в обычную папку. Не работайте внутри окна архива.
2. В папке игры откройте `www`, затем `js`. Скопируйте файл `plugins.js` и назовите копию `plugins.js.manual-bak` в этой же папке. Это откат: закройте игру, удалите `plugins.js` и переименуйте `plugins.js.manual-bak` обратно в `plugins.js`.
3. В распакованном архиве откройте папку `plugins`. В строке поиска проводника (справа сверху) напишите `*.js` и нажмите Enter. Выделите все 44 файла (только файлы, не папки). Скопируйте. Вставьте в `www\js\plugins` игры. Если Windows спросит заменить файл, имя которого начинается с `NP_`, заменить можно. Остальные файлы не заменяйте.
4. Картинки и звуки. Для каждой папки ниже откройте в ней папку `assets`. Выделите всё, что внутри `assets` (папки `img`, `movies` или `audio`). Скопируйте. Вставьте в папку `www` игры (там уже есть `img` и `audio`). На вопрос «Объединить папки?» ответьте **Да**. На вопрос «Заменить файл?» ответьте **Пропустить**.
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
5. Правой кнопкой по `www\js\plugins.js` игры → **Открыть с помощью** → **Блокнот**.
6. Нажмите Ctrl+F и найдите `MEO_Util_Node`. Эта строка должна заканчиваться запятой. Если запятой нет, допишите `,` в конце. Поставьте курсор в начало следующей строки. Откройте блокнотом `manual\paste-after-MEO_Util_Node.txt` из архива, нажмите Ctrl+A, скопируйте и вставьте.
7. Пролистайте `plugins.js` вниз, к строке `];`. Строка над `];` должна заканчиваться запятой. Если нет — допишите `,`. Поставьте курсор в начало строки `];`. Откройте `manual\paste-at-end.txt`, нажмите Ctrl+A, скопируйте и вставьте.
8. Нажмите Ctrl+S и закройте блокнот.
9. Проверка до запуска игры:
   - В `www\js\plugins` есть файл `NP_Language.js`.
   - В `www\audio\bgs` есть `NP_Campfire_Crackle.ogg`.
   - В `www\audio\se` есть `NP_ClothRip.ogg`.
   - В `plugins.js` имя `NP_Language` стоит сразу после `MEO_Util_Node`.
   - Последнее имя перед `];` — `NP_OptionsCategories`.
10. Запустите игру.

Английский текст сюда не входит. Он отдельно: [nympri-ru](https://github.com/posolware1/nympri-ru). Три новых звука (костёр, дождь, разрыв ткани) копируются на шаге 4. Остальные 50 имён звуков в эту ручную установку не входят.

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
