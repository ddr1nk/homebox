# Работа с проектом и проверки

[Карта проекта](PROJECT.md) · [Архитектура](ARCHITECTURE.md)

## Окружение и команды

Источник истины: `backend/go.mod`, `frontend/package.json`, `Taskfile.yml`, `.github/workflows/partial-{backend,frontend}.yaml`. Старые Go 1.19 / Node 16 из CONTRIBUTING не соответствуют текущему checkout. Требуется Go 1.26; для UI ориентир — Node 22 из Dockerfile и pnpm 10 (packageManager `10.28.0`). Дополнительно Task, swag, golangci-lint, при необходимости Python 3 и Playwright browsers.

В исследовательской сессии `Get-Command go,node,pnpm,task` не обнаружил эти команды в PATH sandbox. Зависимости не устанавливались, сервер и тесты не запускались. `rg` тоже недоступен; использовались Get-ChildItem/Select-String. Git потребовал разовое `git -c safe.directory=D:/dev/ai/homebox ...` из-за владельца каталога; глобальные настройки Git не менялись. Это сведения о сессии, не требования проекта.

| Задача | Команда и каталог | Особенности |
| --- | --- | --- |
| Bootstrap | `task setup` из корня | Устанавливает swag/latest, goose/v3.8.0, делает go mod tidy и pnpm install; может менять manifests/locks |
| Генерация всего | `task generate` из корня | Ent → Swagger/OpenAPI → TS; требуются инструменты/зависимости |
| API dev | `task go:run` из корня | Порт 7745; demo + plaintext password dev flag; нет autoreload; зависит от генерации |
| API dev PostgreSQL | `task go:run:postgresql` | Нужен уже запущенный PostgreSQL; креды/SSL dev заданы в task |
| UI dev | `task ui:dev` | Nuxt, обычно порт 3000, `/api` → 7745 |
| Go build | `task go:build` | Backend binary; без предварительного UI build полноценной встроенной страницы не будет |
| UI build | `pnpm run build` в `frontend/` | Это `nuxt generate`; результат `.output/public` |
| Go tests | `task go:test` | Фактически `go test ./...`, несмотря на gotestsum в description |
| Race/coverage | `task go:coverage` | `-race`, coverprofile; требует подходящий toolchain |
| Go lint | `task go:lint` | golangci-lint, конфиг `backend/.golangci.yml` |
| UI проверки | `pnpm run lint:ci`, `pnpm run typecheck` в `frontend/` | CI-команды; lint:fix отдельно изменяет файлы |
| API integration | `task test:ci`, `task test:ci:postgresql` | Поднимают backend, выполняют frontend Vitest; использовать отдельную тестовую БД |
| Browser E2E | `task test:e2e` | Сборка/встраивание UI, API, браузеры Playwright, teardown; POSIX команды |
| Docs | `pnpm install`, `pnpm run build` в `docs/` | Отдельный dependency graph/lockfile |

Команды перечислены по исходникам и не были проверены исполнением в этой сессии. `task pr` объединяет generate, tidy/lint/test, UI typecheck/fix и integration; это не read-only проверка.

### Windows / PowerShell

Taskfile содержит `CGO_ENABLED=0 ...`, `cp`, фоновые `&`, `sleep`; package scripts — POSIX env assignment, teardown — `pkill`. Для полного штатного pipeline удобнее среда с POSIX shell (например, devcontainer/WSL), либо явно перевести нужные команды. Не копировать POSIX env assignment в PowerShell.

Пример обычного backend dev-запуска без demo (из корня; только отдельные локальные данные):

```powershell
$env:HBOX_AUTH_API_KEY_PEPPER = 'dev-only-pepper-not-for-production-use-32b+'
$env:HBOX_WEB_HOST = '127.0.0.1'
$env:HBOX_DATABASE_DRIVER = 'sqlite3'
$env:HBOX_DATABASE_SQLITE_PATH = '.data/homebox.db?_pragma=busy_timeout=1000&_pragma=journal_mode=WAL&_fk=1&_time_format=sqlite'
Set-Location backend
go run ./app/api/
```

Пути относительны рабочему каталогу (`backend/.data` в примере). Константный pepper здесь исключительно dev-пример. Для проверки реального хеширования в окружении должен отсутствовать `UNSAFE_DISABLE_PASSWORD_PROJECTION`. Во втором терминале из `frontend/`: `pnpm dev --no-fork`. Перед запуском backend проверь наличие generated Ent/Swagger files; при отсутствии выполни генерацию в подходящей среде.

## Конфигурация и развёртывание

Личный fork: `origin` = `git@github.com:ddr1nk/homebox.git`. Основной `.github/workflows/docker-publish.yaml` публикует `ghcr.io/ddr1nk/homebox` для amd64/arm64 через `GITHUB_TOKEN`; `latest` обновляется только из `main`, дополнительно публикуется полный SHA. PR не публикуются. Вспомогательные upstream-публикации/очистка/валюты ограничены условием репозитория. Порядок включения Actions, видимость GHCR package и переход сервера: [DEPLOYMENT.md](../DEPLOYMENT.md). Наличие workflow не доказывает успешную публикацию; проверяйте конкретный run. Docker label source указывает на fork, Go module path сохраняется.

Авторитетные defaults — `backend/internal/sys/config/conf*.go`, prefix окружения `HBOX`. Теги YAML местами исторические; не выводить название env из YAML-тега. Допустимые CLI параметры смотреть через `--help` собранного приложения.

| Параметр | Значение/смысл из кода |
| --- | --- |
| `HBOX_AUTH_API_KEY_PEPPER` | Обязателен, минимум 32 байта; хранить стабильно и вне БД |
| `HBOX_WEB_PORT` | 7745 |
| `HBOX_DATABASE_DRIVER` | `sqlite3` по умолчанию, также `postgres` |
| `HBOX_DATABASE_SQLITE_PATH` | `.data/homebox.db` с WAL/FK/time/busy_timeout query параметрами |
| `HBOX_DATABASE_HOST/PORT/DATABASE/USERNAME/PASSWORD` | PostgreSQL connection fields; SSL mode по умолчанию require |
| `HBOX_STORAGE_CONN_STRING` / `HBOX_STORAGE_PREFIX_PATH` | По умолчанию `file:///./` и `.data`; в Docker переопределяются на `/data` |
| `HBOX_DATABASE_PUBSUB_CONN_STRING` | По умолчанию `mem://{{ .Topic }}` |
| `HBOX_OPTIONS_ALLOW_REGISTRATION` | true |
| `HBOX_OPTIONS_ALLOW_LOCAL_LOGIN` | true; учитывать вместе с OIDC |
| `HBOX_OPTIONS_TRUST_PROXY` | false |
| `HBOX_OPTIONS_ALLOW_ANALYTICS` | false |
| `HBOX_OPTIONS_HOSTNAME` | Публичный адрес для формирования доверенных URL |
| `HBOX_WEB_MAX_UPLOAD_SIZE` | Обычная загрузка 10 MB |
| `HBOX_WEB_MAX_IMPORT_SIZE` | Архив коллекции 1024 MB |
| `HBOX_WEB_MAX_PARSE_MEMORY` | Multipart memory threshold 64 MB |

Обычный Dockerfile собирает Nuxt assets, копирует их в Go embed, собирает binary и упаковывает Alpine runtime. Есть отдельные rootless/hardened варианты. Healthcheck обращается к `/api/v1/status`. Корневой compose собирает локальный image, публикует `3100:7745` и содержит dev pepper; явный named/bind volume в compose не настроен (Dockerfile объявляет `/data` volume). Для длительного хранения требуется осознанно задать persistency и production secrets.

Backup инсталляции должен учитывать согласованное состояние БД, blob storage и конфигурации/pepper. При PostgreSQL одних файлов `/data` недостаточно. Миграции запускаются автоматически при старте; перед upgrade работать с резервной копией и читать entity-merge upgrade guide. Загрузка UI и API в один процесс означает, что после изменения UI для бинарного deploy нужна повторная сборка embedded assets.

## Генерируемые файлы

1. Ent: редактировать `backend/internal/data/ent/schema/` и templates; `task db:generate` использует `ent/generate.go` с `sql/versioned-migration`. Сгенерированная схема не заменяет пользовательские Goose migrations.
2. Swagger: annotations handlers + DTO в service/repo → `task swag` → `backend/app/api/static/docs/`, Swagger 2/OpenAPI 3 и копии в `docs/public/api/`.
3. TS: `task typescript-types` → swagger-typescript-api `--no-client --modular` → `frontend/lib/api/types/data-contracts.ts` → Go postprocessor `backend/app/tools/typegen/main.go`.
4. Ручной frontend-клиент в `frontend/lib/api/classes/` обновляется отдельно; наличие новых типов не добавляет методы клиента автоматически.

Проверять diff генерации: текущие tasks используют некоторые `latest`/неприкреплённые CLI и могут давать посторонние изменения.

## Как выбирать проверки

Для тем интерфейса: `node --test test/theme-startup.test.mjs` из `frontend/` проверяет раннее восстановление настроек без API. После `pnpm run build` команда `node test/theme-browser.mjs` запускает установленный Microsoft Edge через Playwright, локальный static server и подставные API-ответы: переключение в профиле, сохранение, reload, возврат старой палитры и мобильная ширина. Рабочий backend не используется; снимки сохраняются в `.output/theme-screenshots/`. Для ESLint и сборки нужен Node 22 (на Node 20 текущий ESLint падает на `Object.groupBy`).

- Entity/group/auth: Go tests в `internal/data/repo`, `internal/core/services`, API middleware; есть crosstenant, ownership, API key expiry, session/logout-all, password reset regression tests.
- Схема/raw SQL: проверить SQLite **и** PostgreSQL, миграции старой базы, date/boolean roundtrip, export table/remap list. GitHub frontend CI использует PostgreSQL 15/16/17.
- Даты: `backend/internal/data/types/date_test.go`, `repo/date_roundtrip_tz_test.go`, `frontend/lib/datelib/dateOnly.test.ts`.
- Attachments/notifiers: tests на внешние вложения, thumbnail связи, SSRF/redirect и URL validation.
- UI/API контракт: typecheck, lint и целевые Vitest tests; API tests в `frontend/lib/api/__test__/` работают с живым сервером `http://127.0.0.1:7745`.
- Browser: `frontend/test/e2e/` содержит login и wipe-inventory; Playwright targets Chromium/Firefox/WebKit. `frontend/test/upgrade/` отдельно от `testDir: ./e2e`, см. `.github/workflows/upgrade-test.yaml`.
- Документация контекста: проверить пути, ссылки, соответствие ключевых утверждений коду и diff. Полная сборка приложения для изменения только этой сводки не нужна.

### Особенность Vitest teardown

`frontend/test/setup.ts` проверяет просто `if (process.env.TEST_SHUTDOWN_API_SERVER)`: и `"true"`, и `"false"` вызывают `pkill -SIGTERM api`. Поэтому `test:local` / `test:watch` нельзя считать гарантированно безопасными для уже работающего API. Для сохранения сервера перед прямым вызовом Vitest **удали** переменную и управляй процессом отдельно:

```powershell
# В frontend/, при отдельном уже запущенном тестовом API
Remove-Item Env:TEST_SHUTDOWN_API_SERVER -ErrorAction SilentlyContinue
pnpm exec vitest --run --config ./test/vitest.config.ts --no-file-parallelism
```

Это предотвращает только указанную ветку teardown; сами интеграционные тесты всё равно меняют данные. E2E wipe-inventory особенно требует одноразовой тестовой коллекции.

## Маршруты изменения кода

| Изменение | Что проследить |
| --- | --- |
| Новое поле вещи | Schema → обе migrations → DTO/mappers/create/update/patch → Swagger/TS → client/forms → CSV/ZIP → проверки |
| Новый endpoint | `routes.go` middleware → handler/adapter → service/repo scope → API annotation → client → проверки прав |
| Изменение коллекций | membership/default group/owner → `X-Tenant` → preferences/stores/WS → сценарии удаления и потери доступа |
| Новый background job | DB status + enqueue → pubsub topic/subscriber → retries/cleanup → event/polling UI |
| Новый UI текст | Компонент/страница + `frontend/locales/` и действующий механизм i18n |
| Изменение deployment | Config defaults + Docker variants + docs + CI; отдельно проверить persistency/embedded assets |

## Наблюдения, требующие перепроверки при работе

Установленные чтением расхождения: устаревшие prerequisites CONTRIBUTING; CsvImport-комментарий про skip вместо update; truthy `"false"` в teardown; исторические item/location названия; `go:ci` description обещает проверки, но task фактически запускает сервер. Они не исправлялись в рамках исследования. Нестандартные dev-порты, PWA offline, внешние сервисы, восстановление архивов и multi-instance deployment требуют runtime-проверок по конкретной задаче.
