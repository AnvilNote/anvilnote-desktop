# AnvilNote Desktop

**Languages:** [繁體中文](README.zh-TW.md) | [English](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [ไทย](README.th.md) | **Русский**

[![Release](https://img.shields.io/github/v/release/AnvilNote/anvilnote-desktop?style=for-the-badge&label=Release&color=black)](https://github.com/AnvilNote/anvilnote-desktop/releases/latest)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Linux](https://img.shields.io/badge/Linux-deb%20%7C%20AppImage-black?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote — это кроссплатформенное приложение для письма и заметок, подходящее для организации длинных заметок, конспектов лекций, отчётов и научных документов.

Всё происходит в едином рабочем пространстве: редактирование текста, добавление формул, работа с кодом, применение шаблонов и экспорт в PDF. AnvilNote по умолчанию работает офлайн, не требует входа в систему и не требует отдельной установки Node.js, Typst или другого стороннего ПО.

## Загрузка

Актуальную версию можно скачать по [этой ссылке](https://github.com/AnvilNote/anvilnote-desktop/releases/).

Доступные платформы и установочные файлы:

| Платформа | Формат | Описание |
| --- | --- | --- |
| macOS | `.dmg` | Подходит большинству пользователей — после загрузки перетащите в Applications |
| macOS | `.pkg` | Подходит, если нужен стандартный процесс установки |
| Linux | `.deb` | Для Debian / Ubuntu и производных дистрибутивов — устанавливается через пакетный менеджер |
| Linux | `.AppImage` | Версия без установки — достаточно дать права на выполнение и запустить |

> [!WARNING]
> **Предупреждение о безопасности для macOS**
>
> Текущие сборки для macOS ещё не подписаны и не прошли нотаризацию Apple, поэтому при первом запуске macOS может показать предупреждение системы безопасности. Это ожидаемое и известное состояние, а не признак повреждения файла.

Если macOS блокирует запуск приложения:

1. Найдите загруженный `.app`, `.dmg` или установленное приложение AnvilNote в Finder.
2. Нажмите на AnvilNote правой кнопкой мыши и выберите «Открыть».
3. Если блокировка сохраняется, перейдите в «Системные настройки > Конфиденциальность и безопасность», разрешите запуск AnvilNote и запустите приложение снова.

Если macOS показывает сообщение **«AnvilNote» повреждено и не может быть открыто**, это обычно связано с флагом карантина (quarantine), который загрузчик ставит на неподписанные приложения, а не с реальным повреждением файла. После установки в `/Applications` выполните в терминале следующую команду, чтобы снять флаг карантина:

```bash
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

> [!NOTE]
> Перед публичным релизом ещё предстоит выполнить:
>
> - Developer ID Application certificate
> - Developer ID Installer certificate
> - Hardened Runtime
> - Notarization
> - Stapling

## Поддерживаемые языки

AnvilNote в настоящее время поддерживает следующие языки интерфейса:

| Язык | Locale |
| --- | --- |
| English | `en` |
| 繁體中文 | `zh-TW` |
| 日本語 | `ja` |
| 한국어 | `ko` |
| ไทย | `th` |
| Русский | `ru` |

## Возможности

- Поддержка длинных заметок и организации документов
- Блочное редактирование
- Поддержка математических формул
- Поддержка блоков кода
- Поддержка изображений, таблиц и структуры документа
- Поддержка шаблонов
- Экспорт в PDF
- Не требуется вход в систему
- Не требуется отдельная установка Typst
- Не требуется отдельная установка Node.js
- На данный момент не зависит от внешних облачных сервисов

## Хранение данных

AnvilNote записывает данные документов в доступное для записи место за пределами пакета приложения. Путь по умолчанию:

```
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

При необходимости расположение хранилища можно переопределить через `ANVILNOTE_DESKTOP_DATA_DIR`.
