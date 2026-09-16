# Развёртывание ddr1nk/homebox

Основная репа: https://github.com/ddr1nk/homebox. Проект основан на HomeBox; история, лицензия и атрибуция upstream сохраняются.

## Публикация образа

Workflow **Publish HomeBox to GHCR** (`.github/workflows/docker-publish.yaml`) собирает Linux amd64 и arm64 на отдельных GitHub runners. После успешной сборки обеих архитектур публикуется общий образ `ghcr.io/ddr1nk/homebox`.

- Изменения приложения, Dockerfile или workflow в `main`: теги `latest`, `main` и `sha-<полный commit SHA>`.
- Тег `v1.2.3`: тег образа `1.2.3` и SHA. Версионные публикации не перемещают `latest`.
- Ручной запуск: Actions → Publish HomeBox to GHCR → Run workflow. Выбирайте `main` для обновления `latest`.
- Pull requests только собираются, без входа в GHCR и публикации.
- Используется встроенный `GITHUB_TOKEN` с `packages: write`; Docker Hub credentials и персональный токен для сборки не нужны.
- Кеш сборки хранится в GitHub Actions отдельно для каждой архитектуры.

Если Actions отключены после создания форка, включите их во вкладке Actions. Политика репозитория/организации должна разрешать используемые actions и запись packages.

Первый опубликованный GHCR package по умолчанию приватный. Для скачивания без авторизации откройте GitHub → профиль ddr1nk → Packages → homebox → Package settings → Change visibility → Public. Это отдельная настройка пакета. Либо сохраните приватность и выполните на сервере `docker login ghcr.io -u ddr1nk`, введя PAT classic с `read:packages` как пароль. Токен не помещать в compose или Git.

Rootless/hardened-публикации, публикация бинарников, upstream-обновление валют и очистка пакетов ограничены условием `github.repository == 'sysadminsmedia/homebox'` и пропускаются в этом форке. Основной workflow от них не зависит.

## Переход существующего сервера

Работайте с **прежним compose-файлом и прежним именем Compose-проекта**, чтобы сохранить подключение к существующему тому.

1. Дождитесь успешного workflow и появления образа в Packages.
2. В сервисе `homebox` замените `image` на `ghcr.io/ddr1nk/homebox:latest`.
3. Удалите `build:` и `pull_policy: never`, если они добавлялись для локальной сборки.
4. Сохраните прежние environment, значение `HBOX_AUTH_API_KEY_PEPPER`, volume `homebox-data:/data/` и порты. `homebox-labels` сохраняет свой собственный `build: .`.

Пример изменяемой части (остальные поля вашего сервиса остаются):

```yaml
services:
  homebox:
    image: ghcr.io/ddr1nk/homebox:latest
    restart: always
    # Здесь остаются ваши environment, volumes и ports.
```

Получите новый образ до остановки сервера:

```bash
docker compose pull homebox
```

Перед первым переходом и последующими обновлениями сохраните согласованную копию `/data` при остановленном HomeBox, прежние compose/конфигурацию/pepper и идентификатор старого образа. Не используйте `docker compose down -v`. Для отката после миграции может понадобиться восстановить и старый образ, и старые данные. Переход с иной официальной версии нужно сначала проверить на копии данных; интеграция homebox-labels должна поддерживать текущий `/api/v1/entities` API.

После резервного копирования:

```bash
docker compose up -d --no-deps --no-build homebox
docker compose logs --tail=100 homebox
docker compose ps
```

Для последующих обновлений: резервная копия → `docker compose pull homebox` → `docker compose up -d --no-deps --no-build homebox`. Для фиксации конкретной версии используйте `ghcr.io/ddr1nk/homebox:sha-<полный commit SHA>` вместо `latest`.

Workflow публикует образ, но не подключается к вашему серверу и не перезапускает его автоматически. Серверу всё ещё нужен сетевой доступ к GHCR. При сетевых проблемах остаётся вариант `docker save` / `docker load`.

## Дальнейшая разработка

`origin` должен указывать на `git@github.com:ddr1nk/homebox.git`. Можно добавить отдельный remote `upstream` для чтения обновлений оригинального проекта:

```bash
git remote add upstream https://github.com/sysadminsmedia/homebox.git
git fetch upstream
```

Обновления upstream проверяйте в отдельной ветке. Go module path и исторические ссылки на авторов не переименовываются: они не определяют, куда публикуется Docker-образ.

Архивы `homebox-*.tar` исключены из Git и build context. Локальные `.nuxt`, `.output`, `node_modules` и `.data` также не отправляются в Docker build context.
