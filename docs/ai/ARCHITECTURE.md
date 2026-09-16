# Архитектура, данные и инварианты

[Карта проекта](PROJECT.md) · [Разработка](DEVELOPMENT.md)

## Поток запроса и запуск

```text
Vue page/component → composable → UserClient/PublicApi → Requests
  → /api/v1 → Chi + auth/tenant/roles middleware
  → v1 handler / web adapter → service и/или repository
  → Ent / SQL → SQLite или PostgreSQL
  → DTO/JSON → frontend

repository mutation → eventbus → tenant WebSocket → обновление UI
blob + pubsub → фоновые thumbnails / ZIP export / ZIP import
```

Некоторые handlers обращаются прямо к репозиториям через adapters: обязательного service на каждую CRUD-операцию нет. DTO часто объявлены в `repo_*.go`, а не в отдельном пакете API моделей.

`backend/app/api/main.go`: чтение конфигурации → проверка pepper → telemetry → storage/database и Goose migrations → currencies, eventbus, repos, services → назначение отсутствующих asset IDs → HTTP и фоновые задачи. Запуск на существующей БД уже может изменять её миграциями и заполнением asset IDs.

`routes.go` встраивает `static/public` через `go:embed`; неизвестные frontend-маршруты получают `index.html`. Внутри API действует отдельный NotFound. Swagger UI — `/swagger/`, статус — `/api/v1/status`. Frontend — SPA (`ssr: false`), production Node-сервер для UI не требуется. Dev Nuxt проксирует `/api` на `localhost:7745`.

## Модель данных

Схемы: `backend/internal/data/ent/schema/`. UUID используется для основных сущностей; `asset_id` — отдельный числовой инвентарный идентификатор, не первичный ключ.

| Модель | Роль и связи |
| --- | --- |
| User | Локальная/OIDC учётная запись, настройки, default group, членство в группах |
| Group | Коллекция и граница tenant; общие настройки и связанные данные инвентаря |
| UserGroup | M:M User↔Group, роль `user` или `owner` на конкретное членство |
| EntityType | Тип в группе, `is_location`, icon, необязательный default template |
| Entity | Вещь или место; обязательный тип, группа, parent/children, tags, fields, attachments, maintenance |
| EntityField / TemplateField | Типы `text`, `number`, `boolean`, `time`; числовое пользовательское поле схемы — integer |
| EntityTemplate | Шаблон повторяющихся вещей с полями и параметрами создания |
| Tag | Иерархическая классификация; связь с несколькими сущностями |
| Attachment | Метаданные файлов/внешних ссылок, primary/thumbnail; содержимое файлов в blob storage |
| MaintenanceEntry / Notifier | Обслуживание и доставка напоминаний |
| AuthTokens / AuthRoles | Stateful сессии и роли токенов; не система stateless JWT |
| APIKey | Отдельные статические ключи пользователя; права действуют от его имени |
| PasswordResetTokens / GroupInvitationToken | Восстановление пароля и приглашения |
| Export | Учёт фоновых export/import jobs, статуса, прогресса и artifact path |

### Entity: важные детали

- У вещей и мест одно дерево. Место определяется `EntityType.is_location`, а не наличием отдельной Location-таблицы.
- В UI маршруты `/item/...` и `/location/...` сохранены. Основной HTTP CRUD — `/entities`; старые слова встречаются также в именах функций и labelmaker routes.
- `Location` в выдаче может вычисляться как ближайший location-предок (`nearestLocationAncestor`); не следует добавлять независимую связь location, исходя из старой модели.
- `quantity` — float, допускает дроби. Точные ограничения см. `validateQuantity` в `repo_entities.go`; не преобразовывать безусловно в integer.
- Есть архивирование, insured, purchase/sold data, serial/model/manufacturer, notes, гарантия и `sync_child_entity_locations`.
- Для полной замены и patch различаются DTO и семантика пустых/нулевых значений. Перед новым полем проверь `EntityCreate`, `EntityUpdate`, `EntityPatch`, мапперы и frontend-сериализацию.
- При удалении учитывай дерево, дочерние записи и blob cleanup; нельзя считать удаление одной SQL-строки полным удалением данных.

## Аутентификация и tenant

Основные файлы: `backend/app/api/middleware.go`, `handlers/v1/v1_ctrl_auth.go`, `providers/`, `internal/core/services/service_user*.go`, `pkgs/hasher/`.

1. `mwAuthToken` сначала пробует cookie, затем Authorization, WebSocket subprotocol, query `access_token`; проверяет токен и формирует user context.
2. `mwTenant`: `X-Tenant` → query `tenant` → `DefaultGroupID`. Проверяется реальное членство в `GroupIDs`; неправильный UUID даёт 400, чужая коллекция — 403.
3. `mwRoles` проверяет роли токена. Для API keys синтезируется `user`; это не означает владение любой коллекцией.
4. `mwGroupOwner` отдельно проверяет `IsOwnerOf(UID, GID)`. Он требуется для изменения/удаления коллекции, удаления участников, создания/отзыва приглашений.

Участник может редактировать инвентарь. В текущем routing export/import и `wipe-inventory` используют `userMW`; не описывать их как owner-only. Название UI-кнопки не является контролем доступа.

Group-scoped проверки нужны и в репозитории: `repo_authz.go` проверяет parent/type/template/tag UUID. Чужая связанная сущность намеренно выглядит как not found. Не использовать unscoped `GetOne`/`Delete` для нового пользовательского маршрута без явной проверки группы.

Frontend хранит `hb.auth.session` как признак сессии, а не полноценный bearer token; `attachmentToken` используется для ресурсов. `useUserApi` ставит `X-Tenant`, обрабатывает 401 и потерю доступа к выбранной коллекции. Выбор коллекции хранится в preferences; при изменениях проверять свежесть созданных API clients и кэшей.

Пароли хешируются Argon2id; специальный `UNSAFE_DISABLE_PASSWORD_PROJECTION=yes_i_am_sure` включает plaintext dev-ветку. Pepper API keys должен оставаться стабильным между перезапусками; его смена инвалидирует выданные ключи. Есть local password reset, CLI reset, OIDC identity и nullable password для соответствующих пользователей.

## Импорт, экспорт и файлы

### CSV

`service_entities.go` + `reporting/`: CSV разбирается в IOSheet, создаются недостающие теги и пути мест; `import_ref` находит существующую сущность. Затем выполняется **обновление**, несмотря на устаревшее слово “skipped” в комментарии CsvImport. Повторный импорт без asset ID сохраняет существующий ID. `ParentImportRef` связывает родителей после прохода строк. Пользовательские поля CSV преобразуются в text; это не полный типизированный backup. Обработка построчная, не следует обещать атомарность всего CSV.

### ZIP коллекции

`service_exports.go`: schema version 1, `manifest.json`, таблицы в JSON и attachments. Job создаётся и публикуется в pubsub; worker обновляет `pending/running/completed/failed`, прогресс и события.

Восстановление требует коллекцию **без вещей** (non-location entities). Начальные locations/tags/types могут присутствовать и очищаются перед восстановлением. Импорт переназначает PK/FK и tenant, проверяет manifest, SQL identifiers, blob paths и лимит распаковки ZIP. Не путать это с CSV merge и не обещать импорт поверх заполненной коллекции. Списки export tables и remapping нужно обновлять вместе со схемой. ZIP коллекции не заменяет резервирование всей инсталляции с пользователями, конфигурацией и секретами.

Очистка и восстановление строк БД идут в одной транзакции, blobs загружаются после commit. При ошибке восстановления blobs выполняется компенсирующая очистка импортированных строк; уже записанные blobs остаются. Ошибка самой очистки может оставить частично восстановленное состояние. Поэтому весь импорт БД + storage нельзя описывать как одну атомарную транзакцию.

### Blob storage и фоновые работы

`repo_item_attachments.go` использует Go CDK file/memory/S3/GCS/Azure drivers; подключение и prefix задаются отдельно. Метаданные хранятся в БД, blob keys — относительно storage. Отдельно обрабатываются external links, thumbnail и primary photo. На Windows есть миграция старых flat paths при запуске.

`recurring.go`: eventbus, demo seed, суточная очистка токенов/приглашений/stale exports, проверка уведомлений каждый час при локальном `Hour()==8`, subscriptions для thumbnails и collection jobs. Задачи `BackgroundTask` сначала исполняются сразу, затем по интервалу. Это не гарантия запуска ровно в 08:00.

Pubsub по умолчанию `mem://{{ .Topic }}`: брокер для обычного одиночного запуска не обязателен; очередь в памяти не обеспечивает сохранность pending jobs при рестарте. Внешние драйверы доступны, но наличие драйверов само по себе не доказывает готовность всех операций к нескольким репликам.

## Обновления UI и интеграции

- Дизайн интерфейса: `interfaceTheme` (`classic` по умолчанию / `modern`) в `use-preferences.ts`, отдельно от старой палитры `theme`. Настройка сохраняется в localStorage и синхронизируется существующим API пользовательских настроек. Неизвестное значение отображается как `classic`. `App/InterfaceThemePicker.vue` находится в настройках темы профиля.
- Современный вариант использует существующие shadcn-vue компоненты, обновлённую шапку/навигацию и общие BaseCard/BaseContainer. `assets/css/modern.css` задаёт светлую нейтральную палитру с зелёным акцентом под `html[data-interface-theme="modern"]`, включая teleported dialogs. Старые палитра и `displayLegacyHeader` сохраняются, но применяются только в классическом варианте. `public/set-theme.js` выставляет тему до загрузки Vue, `app.vue` обновляет её реактивно.

- `use-server-events.ts`: `/api/v1/ws/events?tenant=...`, auth через subprotocol `hb-auth`; события `entity.mutation`, `tag.mutation`, `user.mutation`, `export.mutation`, `import.mutation`. Есть throttling, reconnect и переподключение при смене коллекции.
- В dev WebSocket host вычисляется заменой `3000` на `7745`; нестандартные порты требуют проверки этого кода отдельно от Nuxt proxy.
- PWA в `nuxt.config.ts` содержит NetworkFirst GET API cache на сутки; это конфигурация, а не доказательство полноценного offline-режима.
- Barcode search, SMTP, Shoutrrr, OIDC, внешний label service — опциональные сетевые интеграции; проверять их конфигурацию и mocks перед тестированием.
- OpenTelemetry включает серверные трассы/метрики/логи и опциональный authenticated `/telemetry` proxy для frontend. Usage analytics отдельно и по умолчанию выключена.

## Инварианты, которые легко нарушить

- Календарные даты: в API `YYYY-MM-DD` или пустая строка; `DateFromDBTime` нормализует чтение в UTC. `createdAt/updatedAt` — timestamps. Тестировать timezone roundtrip, а не только UTC.
- Обе SQL-системы: placeholders, boolean/time encoding, миграции и raw SQL в экспорте/дереве могут различаться.
- Tenant требуется для основного объекта и каждой ссылки; owner относится к членству, token role — отдельная система.
- Событие mutation и обновление frontend-кэша являются частью поведения изменений данных.
- Для notifier HTTP сохранять проверки адресов и redirect через `internal/sys/validate/`; не заменять на произвольный default client.
- Proxy headers доверяются только при `TrustProxy`; URL для auth/Swagger/QR сверять с `SecureBaseURL` и configured hostname.
- Сохранять redaction секретов в конфигурации и логах, ограничения upload/import и обработку недоверенных архивов.
