# HomeBox: карта проекта

## Основание и границы исследования

Сводка составлена 2026-09-15 по локальному checkout, HEAD `0ad87b3e8703a0a9c80b337c839e4e6e1829b77c`. Изучены маршруты, схемы, ключевые сервисы и репозитории, frontend-клиент, настройки, генерация, тесты и CI. Это описание текущего исходного кода; работоспособность сборки и внешних интеграций в этой сессии не проверялась. Новая сводка не заменяет исходники и не является исчерпывающим аудитом ошибок.

Навигация: [архитектура](ARCHITECTURE.md), [разработка](DEVELOPMENT.md), [инструкции агента](../../AGENTS.md).

## Назначение и пользовательская ценность

HomeBox помогает домашнему пользователю ответить: что у меня есть, где это находится, сколько стоит, где документы и когда требуется обслуживание. Основной сценарий — собственный сервер с небольшими затратами ресурсов; несколько пользователей могут совместно вести коллекцию имущества. Это инвентаризация вещей, документов и обслуживания; бухгалтерские проводки, платежи и складские заказы в изученных маршрутах не представлены.

Типовой путь:

1. Зарегистрироваться локально либо войти через настроенный OIDC.
2. Создать/выбрать коллекцию, при необходимости пригласить участников.
3. Настроить типы сущностей, места хранения, теги и шаблоны.
4. Добавить вещь вручную, из шаблона, дублированием или импортом; связать с родителем, загрузить фото и документы.
5. Искать и фильтровать имущество, сканировать QR/штрихкод, печатать этикетки.
6. Вести покупку, гарантию, продажу, обслуживание; получать напоминания и выгружать данные.

## Возможности и где их искать

Все пути ниже относительно корня репозитория. API имеет префикс `/api/v1`; точный список методов — `backend/app/api/routes.go`.

| Область | Поведение | Основные исходники |
| --- | --- | --- |
| Инвентарь | CRUD, patch, дублирование, дерево и путь, архив, количество, asset ID, поля, покупка/продажа/гарантия | `backend/internal/data/repo/repo_entities.go`, `backend/app/api/handlers/v1/v1_ctrl_entities.go`, `frontend/lib/api/classes/items.ts` |
| Места хранения | Сущности с типом `is_location`, вложенность и ближайшее место-предок | `frontend/pages/locations.vue`, `frontend/pages/location/`, `frontend/stores/locations.ts` |
| Типы и шаблоны | Пользовательские типы, шаблон по умолчанию типа, создание вещи из шаблона, типизированные поля | `backend/internal/data/repo/repo_entity_types.go`, `repo_entity_templates.go`, `frontend/pages/collection/index/entity-types.vue` |
| Теги | Иерархические теги и привязка к сущностям | `backend/internal/data/repo/repo_tags.go`, `frontend/pages/tags.vue` |
| Файлы | Фото, документы, primary attachment, thumbnails, внешние ссылки | `backend/internal/core/services/service_items_attachments.go`, `backend/internal/data/repo/repo_item_attachments.go` |
| Поиск | Серверные фильтры/сортировка/пагинация, asset ID, пользовательские поля | `repo_entities.go`, `frontend/composables/use-item-search.ts`, `frontend/pages/items.vue` |
| QR и штрихкоды | Сканер, переход к asset, поиск товара по штрихкоду, печатные этикетки | `frontend/pages/scanner-ar.vue`, `frontend/pages/a/`, `frontend/pages/assets/`, `v1_ctrl_product_search.go`, `v1_ctrl_labelmaker.go`, `backend/pkgs/labelmaker/` |
| Обслуживание | Записи с датами и стоимостью, список обслуживания и уведомления | `backend/internal/data/repo/repo_maintenance_entry.go`, `backend/internal/core/services/service_background.go`, `frontend/pages/maintenance.vue` |
| Коллекции | Создание, выбор, настройки, участники, приглашения, удаление | `backend/internal/core/services/service_group.go`, `frontend/composables/use-collections.ts`, `frontend/pages/collection/` |
| Учётная запись | Профиль/настройки, смена и восстановление пароля, logout/all, API keys | `backend/internal/core/services/service_user*.go`, `frontend/pages/profile.vue` |
| CSV и отчёты | Импорт/экспорт сущностей, bill of materials, статистика стоимости и распределения | `backend/internal/core/services/reporting/`, `service_entities.go`, `v1_ctrl_statistics.go` |
| Архив коллекции | Фоновый ZIP export/import с состоянием и прогрессом | `backend/internal/core/services/service_exports.go`, `frontend/lib/api/classes/backups.ts` |
| Массовые инструменты | Asset IDs, import refs, исправление дат, primary photos, thumbnails, очистка инвентаря | `v1_ctrl_actions.go`, `frontend/pages/collection/index/tools.vue` |

В таблице сокращённые имена `repo_*.go` относятся к `backend/internal/data/repo/`, `service_*.go` — к `backend/internal/core/services/`, `v1_ctrl_*.go` — к `backend/app/api/handlers/v1/`.

## Стек на исследованном commit

Версии ниже взяты из манифестов этого checkout, а не означают последние версии в интернете. Диапазоны зависимостей разрешаются соответствующим lockfile.

| Часть | Технологии |
| --- | --- |
| API | Go `1.26.0`, Chi v5, httpkit/errchain, validator v10, zerolog |
| Данные | Ent `0.14.6`, Goose v3; modernc SQLite без CGO, pgx/v5 для PostgreSQL |
| UI | Nuxt `4.4.7`, Vue `3.5.20`, TypeScript `5.9.2`, Pinia 3, VueUse |
| Оформление | Tailwind 3, shadcn-nuxt/reka-ui, lucide/icons, vue-i18n; переводы в `frontend/locales/` |
| UI build | `pnpm@10.28.0`, Nuxt generate; Docker frontend stages используют Node 22 |
| Проверки | Go testing/testify, golangci-lint, Vitest 3, Playwright, ESLint 9, vue-tsc |
| Интеграции | OIDC, SMTP, Shoutrrr, Go CDK blob/pubsub, OpenTelemetry, barcode providers |
| Документация | Отдельный Astro 6 / Starlight проект, Tailwind 4, Cloudflare; собственные package.json и pnpm-lock.yaml |
| Упаковка | Docker (обычный/rootless/hardened), GoReleaser, devcontainer, Nix flake |

## Структура и источники истины

- `backend/app/api/`: запуск приложения, middleware, маршруты, HTTP handlers, auth providers, встраиваемая статика и Swagger.
- `backend/internal/core/services/`: бизнес-операции, фоновые работы, пользователи, коллекции, импорт/экспорт.
- `backend/internal/data/repo/`: DTO, преобразования Ent → API, транзакции, запросы и ограничения.
- `backend/internal/data/ent/schema/`: редактируемые схемы; большая часть соседнего `ent/` генерируется.
- `backend/internal/data/migrations/{sqlite3,postgres}/`: история изменения БД, включая слияние старых items/locations в entities.
- `backend/internal/sys/`: configuration, validation, telemetry, analytics; `internal/web/`: HTTP adapters и middleware общего назначения.
- `backend/pkgs/`: хеширование, почта, этикетки, утилиты изображений/текста.
- `frontend/pages/`, `components/`, `layouts/`: экраны и UI; `composables/`, `stores/`: состояние и логика взаимодействия.
- `frontend/lib/api/`: написанный вручную клиент + сгенерированные контракты; `lib/requests/`: HTTP транспорт.
- `docs/src/content/docs/en/`: локальные руководства пользователя, настройки, разработка; другие языки рядом. `docs/public/api/`: опубликованные копии спецификаций.
- `Taskfile.yml`, `.github/workflows/`, `.gitlab-ci.yml`: автоматизация. Наличие workflow не доказывает успешность текущего CI.
- `.scaffold/`: старые шаблоны генерации моделей; перед использованием сопоставить с нынешней Entity-моделью.

## Полезные локальные руководства

- `docs/src/content/docs/en/advanced/entity-merge-upgrade.mdx`: переход к общей модели сущностей.
- `docs/src/content/docs/en/advanced/import-csv.mdx`: формат CSV.
- `docs/src/content/docs/en/quick-start/configure/`: database, storage, OIDC, proxy.
- `docs/src/content/docs/en/advanced/auth-rate-limits.mdx`, `opentelemetry.mdx`, `external-label-service.mdx`.
- `CONTRIBUTING.md`: процесс вклада; технические prerequisites сверять с манифестами.
- `LICENSE`, `SECURITY.md`: лицензирование и порядок сообщения об уязвимостях; перед юридическими выводами читать оригиналы.
