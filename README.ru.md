# AnvilNote Desktop

**Languages:** [繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [ไทย](README.th.md) | **Русский**

[![Release](https://img.shields.io/badge/Release-v0.1.0-black?style=for-the-badge)](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote Desktop — это проект упаковки настольного приложения для macOS, который объединяет Electron shell, AnvilNote Web, AnvilNote API, AnvilNote Renderer, Typst, шрифты, шаблоны и ресурсы установщика в единый загружаемый пакет.

Этот репозиторий является единой точкой загрузки настольной версии. Здесь публикуются Release, установочные файлы, теги версий, инструкции по загрузке и примечания о неподписанном приложении.

## Загрузка

Текущую версию можно скачать по [этой ссылке](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0).

В Release предполагаются следующие файлы:

- `.dmg`: для обычной установки перетаскиванием
- `.pkg`: для сценариев, где нужен установщик

Текущие установочные файлы macOS пока не прошли code signing и notarization. При первом запуске macOS может показать предупреждение безопасности.

Если macOS блокирует приложение:

1. Найдите загруженный `.app`, `.dmg` или уже установленное приложение в Finder.
2. Нажмите правой кнопкой и выберите **Open**.
3. Если блокировка сохраняется, откройте **System Settings > Privacy & Security** и разрешите запуск приложения.

Если macOS показывает **«AnvilNote» повреждён и не может быть открыт**, это вызвано неподписанным приложением и флагом карантина при загрузке — файл на самом деле не повреждён. После перемещения приложения в `/Applications` выполните эту команду в **Terminal**, чтобы снять флаг карантина, затем откройте приложение обычным способом:

```sh
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

Перед публичным релизом ещё требуются:

- Developer ID Application certificate
- Developer ID Installer certificate
- Hardened Runtime
- Notarization
- Stapling

## Поддерживаемые языки

Встроенное веб-приложение сейчас поддерживает такие i18n locale:

| Language | Locale |
| --- | --- |
| English | `en` |
| Traditional Chinese | `zh-TW` |
| Japanese | `ja` |
| Korean | `ko` |
| Thai | `th` |
| Russian | `ru` |

## Роль репозитория

Это не monorepo. Репозиторий не содержит полный исходный код других приложений AnvilNote, а отвечает за чтение, сборку, копирование и упаковку артефактов из соседних репозиториев.

Ожидаемые sibling repo:

```sh
../anvilnote-web
../anvilnote-api
../anvilnote-renderer
```

Пути можно переопределить через `.env`.

## Содержимое пакета

```text
AnvilNote.app
├── Electron shell
├── bundled anvilnote-web
├── bundled anvilnote-api
├── bundled anvilnote-renderer
├── bundled Typst binary
├── bundled fonts
├── bundled templates
└── installer resources
```

`pnpm prepare:desktop` собирает runtime в `dist/app/`, после чего `electron-builder` упаковывает его в настольное приложение.

## Локальная разработка

```sh
cp .env.example .env
pnpm install
pnpm check:repos
pnpm dev
```

В режиме разработки:

- если задан `ANVILNOTE_WEB_DEV_URL`, Electron открывает этот URL
- иначе используется встроенная web-сборка
- API sidecar запускается в best-effort режиме

## Команды упаковки

```sh
pnpm pack
pnpm dist:dmg
pnpm dist:pkg
pnpm dist:mac
```

- `pnpm pack`: собирает распакованный `.app` для локальной проверки
- `pnpm dist:dmg`: собирает `.dmg`
- `pnpm dist:pkg`: собирает `.pkg`
- `pnpm dist:mac`: собирает и `.dmg`, и `.pkg`

## Ограничения окружения

- Только macOS
- Отдельная установка Node.js не требуется
- Отдельная установка Typst не требуется
- Внешние облачные сервисы не требуются
- Локальный API слушает только `127.0.0.1`
- Auto-update пока нет
- Login / cloud sync пока нет

## Typst, шрифты и шаблоны

- Пользователям не нужно отдельно устанавливать Typst
- Настольное приложение должно использовать встроенный Typst binary
- В разработке путь можно переопределить через `ANVILNOTE_TYPST_PATH`
- Шрифты и шаблоны предоставляются из встроенных ресурсных директорий

## Хранение данных

Локальный API пишет данные вне read-only `.app` bundle. Путь по умолчанию:

```text
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

Путь можно переопределить через `ANVILNOTE_DESKTOP_DATA_DIR`.
