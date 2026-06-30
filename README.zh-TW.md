# AnvilNote Desktop

**Languages:** **繁體中文** | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/badge/Release-v0.1.0-black?style=for-the-badge)](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote Desktop 是 AnvilNote 的 macOS 桌面包裝專案。它把 Electron shell、AnvilNote Web、AnvilNote API、AnvilNote Renderer、Typst、字型、模板與安裝資源組裝成可下載的桌面應用程式。

這個 repo 是使用者下載桌面版的唯一入口。Release、安裝檔、版本 tag、下載說明與未簽章注意事項都集中在這裡。

## 下載

可以透過[此連結](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)下載目前版本。

Release 會提供以下安裝產物：

- `.dmg`：適合大多數使用者直接拖拉安裝
- `.pkg`：適合需要安裝流程與安裝頁面的使用情境

目前釋出的 macOS 安裝檔尚未完成 code signing 與 notarization。第一次下載或開啟時，macOS 可能會顯示安全警告，這是目前已知且預期中的行為。

如果 macOS 阻擋開啟，請使用以下方式：

1. 在 Finder 找到下載好的 `.app`、`.dmg` 或安裝完成後的 App。
2. 對 App 按右鍵，選擇「打開」。
3. 若仍被阻擋，前往「系統設定 > 隱私權與安全性」，允許該 App 開啟後再重新執行。

正式對外發布前，這個 repo 仍需要補齊以下流程：

- Developer ID Application certificate
- Developer ID Installer certificate
- Hardened Runtime
- Notarization
- Stapling

## 目前支援語言

AnvilNote Desktop 目前隨附的 Web i18n 語言如下：

| Language | Locale |
| --- | --- |
| English | `en` |
| 繁體中文 | `zh-TW` |
| 日本語 | `ja` |
| 한국어 | `ko` |
| ไทย | `th` |
| Русский | `ru` |

## 專案定位

這不是 monorepo。這個 repo 不包含其他 AnvilNote 應用的完整原始碼，而是負責讀取、建置、拷貝與封裝其他 sibling repos 的輸出產物。

預設會使用同層目錄下的 sibling repos：

```sh
../anvilnote-web
../anvilnote-api
../anvilnote-renderer
```

如有需要，可透過 `.env` 覆寫路徑設定。

## 打包內容

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

`pnpm prepare:desktop` 會先把需要的內容組到 `dist/app/`，再由 `electron-builder` 打包成桌面應用程式。

## 本機開發

```sh
cp .env.example .env
pnpm install
pnpm check:repos
pnpm dev
```

開發模式下：

- 若設定 `ANVILNOTE_WEB_DEV_URL`，Electron 會直接載入該 URL
- 否則會使用本地打包後的 Web 產物
- API sidecar 在開發環境會以 best-effort 方式啟動

## 打包指令

```sh
pnpm pack
pnpm dist:dmg
pnpm dist:pkg
pnpm dist:mac
```

用途如下：

- `pnpm pack`：產生未安裝的 `.app` 目錄，方便本機快速驗證
- `pnpm dist:dmg`：產生 `.dmg`
- `pnpm dist:pkg`：產生 `.pkg`
- `pnpm dist:mac`：同時產生 `.dmg` 與 `.pkg`

## 執行環境與限制

- 僅支援 macOS
- 不需要使用者另外安裝 Node.js
- 不需要使用者另外安裝 Typst
- 不依賴外部雲端服務
- 本地 API 僅綁定 `127.0.0.1`
- 目前沒有 auto-update
- 目前沒有 login / cloud sync

## Typst、字型與模板

- 使用者不需要自行安裝 Typst
- 桌面版必須使用 bundle 內的 Typst binary
- 開發環境可透過 `ANVILNOTE_TYPST_PATH` 覆寫 Typst 路徑
- 字型與模板會從 bundle 內的資源目錄提供給 renderer

## 資料儲存

本地 API 會把資料寫到 `.app` 之外的可寫入位置。預設路徑為：

```text
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

可透過 `ANVILNOTE_DESKTOP_DATA_DIR` 覆寫。
