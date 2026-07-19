# AnvilNote Desktop

**Languages:** **繁體中文** | [English](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/github/v/release/AnvilNote/anvilnote-desktop?style=for-the-badge&label=Release&color=black)](https://github.com/AnvilNote/anvilnote-desktop/releases/latest)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Linux](https://img.shields.io/badge/Linux-deb%20%7C%20AppImage-black?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote 是一款跨平台的寫作與筆記 App，適合整理長篇筆記、課堂講義、報告與學術文件。

你可以在同一個工作區裡編輯文字、加入公式、整理程式碼、套用範本，並輸出成 PDF。AnvilNote 目前以離線使用為主，不需要登入，也不需要另外安裝 Node.js、Typst 或其他開發工具。

## 下載

可以透過[此連結](https://github.com/AnvilNote/anvilnote-desktop/releases/)找到最新版本。

目前提供以下平台與安裝檔：

| 平台 | 格式 | 說明 |
| --- | --- | --- |
| macOS | `.dmg` | 適合大多數使用者，下載後拖曳到 Applications 即可安裝 |
| macOS | `.pkg` | 適合需要標準安裝流程的使用情境 |
| Linux | `.deb` | 適用於 Debian / Ubuntu 等發行版，可透過套件管理工具安裝 |
| Linux | `.AppImage` | 免安裝版本，下載後賦予執行權限即可直接執行 |

> [!WARNING]
> **macOS 安全性提醒**
>
> 目前釋出的 macOS 安裝檔尚未完成 Apple 程式碼簽章與公證，首次開啟時 macOS 可能顯示安全警告。這是已知狀況，不影響檔案完整性。

若 macOS 阻擋開啟：

1. 在 Finder 找到下載的 `.app`、`.dmg`，或安裝後的 AnvilNote。
2. 對 AnvilNote 按右鍵，選擇「打開」。
3. 若仍被阻擋，前往「系統設定 > 隱私權與安全性」允許 AnvilNote，再重新執行。

若顯示 **「AnvilNote」已損毀，無法打開**，通常是未簽章 App 被加上下載隔離標記，並非檔案損毀。安裝到 `/Applications` 後，可打開終端機並執行以下指令移除隔離標記：

```bash
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

## 目前支援語言

AnvilNote 目前支援以下介面語言：

| 語言 | Locale |
| --- | --- |
| English | `en` |
| 繁體中文 | `zh-TW` |
| 日本語 | `ja` |
| 한국어 | `ko` |
| ไทย | `th` |
| Русский | `ru` |

## 功能特色

- 支援長篇筆記與文件整理
- 支援區塊編輯
- 支援數學公式
- 支援程式碼區塊
- 支援圖片、表格與文件大綱
- 支援範本
- 支援 PDF 輸出
- 不需要登入
- 不需要另外安裝 Typst
- 不需要另外安裝 Node.js
- 核心編輯與輸出功能不依賴外部雲端服務

## 智慧模式與 OpenAI BYOK

智慧模式是選用功能。啟用後，Electron 主程序會使用作業系統支援的
`safeStorage` 加密每一把具名稱的 OpenAI key profile；API 資料庫只保存
ciphertext 與安全 metadata，只有 Electron main 可解密。Renderer 可以新增、
測試、改名、啟用、停用與刪除 profile，但只會看到例如
`OpenAI · sk-proj-****5YA` 的固定遮罩資訊；沒有 `getApiKey`，也無法讀取
ciphertext。

App 每次啟動都會為 API sidecar 產生新的隨機信任權杖。Sidecar 僅監聽
`127.0.0.1`，AI 憑證只接受受信任的 Desktop 路徑，且不快取解密後的
金鑰。若 Linux 的 Electron 只提供不安全的 `basic_text` backend，系統會
改用工作階段記憶體，不會宣稱已安全永久儲存。

### 開發時的持久 profile

開發智慧模式 UI、同時需要 hot reload 與可持久的金鑰 profile 時，請在本
repository 使用 `pnpm dev:hot` 或 `make dev-hot`。這個單一指令會先組裝相符的
可信任 sidecar，再啟動 sibling Next.js dev server 並放進 Electron；因此開發模式與
正式 Desktop 共用同一套 `safeStorage` 加密 SQLite vault。執行前請先關閉另外啟動的
`anvilnote-web` dev server。

不需要 hot reload、想直接測完整 staged Web build 時，使用 `pnpm dev` 或
`make dev`。

直接以瀏覽器執行 `anvilnote-web` 則刻意只保留當前工作階段：瀏覽器沒有
Electron `safeStorage`，不得宣稱 API key 已被持久保存。

只有使用者明確執行智慧模式時，指令、選取內容與附件文字才會傳送至
OpenAI。請求使用 Responses API、`store: false`、不使用工具，也不建立
背景對話狀態。OpenAI API 計費與 ChatGPT 訂閱分開。

Desktop 支援的附件不會綁入 MinIO 或其他服務。Electron main 以
`safeStorage` 保護的安裝金鑰，使用 AES-256-GCM 加密 content-addressed
blob；renderer IPC 只取得不透明 ID、顯示檔名、MIME、大小與是否持久化。
blob 路徑、雜湊、密文、nonce、驗證 tag 與金鑰都留在 main process。

## 資料儲存

AnvilNote 會將文件資料寫入 App 外部的可寫入位置。預設路徑為：

```
~/.anvilnote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

如有需要，可透過 `ANVILNOTE_DESKTOP_DATA_DIR` 覆寫資料儲存位置。
