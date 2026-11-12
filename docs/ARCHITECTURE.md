# Архитектура и навигация по коду

Стартовая карта по структуре репозитория, изученной 2026-11-12. Это не полный анализ функций: обновляй дерево и связи по мере работы, не придумывай неподтверждённые имена функций.

```text
Phuket-Atlas/
├── AGENTS.md                  # инструкции для AI
├── MEMORY.md                  # компактный указатель контекста
├── index.html                 # основной интерфейс
├── app.js                     # логика приложения
├── broker-ai.js               # клиентская AI-логика
├── editor.html                # редактор
├── 3d-preview.html            # предварительный просмотр
├── data/
│   ├── locations.json        # районы и объекты
│   ├── district-narrations-ru.json # тексты озвучки
│   └── SCHEMA.md              # правила данных
├── assets/                    # медиа
├── presentations/             # PDF-презентации
├── scripts/
│   ├── build_private_atlas.py
│   ├── build_project_covers.py
│   ├── generate_district_audio.py
│   ├── generate_patong_gtts.py
│   ├── generate_patong_piper_preview.py
│   └── generate_patong_silero_preview.py
├── ai-worker/
│   ├── README.md
│   ├── wrangler.toml
│   ├── src/index.js
│   └── test/
├── .github/workflows/         # публикация, озвучка, проверка
└── docs/                      # знания для поддержания проекта
```

## Взаимосвязи (общий уровень)
- Приложение и карты: начни с `index.html` и `app.js`; точные точки вызова уточняй поиском по коду.
- Каталог объектов: сначала `data/locations.json` и `data/SCHEMA.md`, затем потребляющий код.
- Озвучка: `data/district-narrations-ru.json`, `scripts/generate_district_audio.py` и соответствующие workflows; не менять согласованный результат без запроса.
- Закрытое развёртывание: `ai-worker/README.md`, `ai-worker/src/index.js`, `scripts/build_private_atlas.py` и workflow `private-atlas-deploy.yml`.
- Обложки объектов: `scripts/build_project_covers.py` и workflow `project-covers.yml`.

## Журнал функций (заполнять только по проверенному коду)
| Задача | Сначала искать | Проверенный символ/строка |
|---|---|---|
| Изменить карту | `app.js`, `index.html` | Уточнить перед изменением |
| Изменить карточки объектов | `app.js`, `data/locations.json` | Уточнить |
| Изменить озвучку районов | `scripts/`, `data/district-narrations-ru.json` | Уточнить |
| Изменить AI | `broker-ai.js`, `ai-worker/src/index.js` | Уточнить |

Не сканируй весь репозиторий для каждой задачи: находи точку входа здесь, затем исследуй только конкретный код.
