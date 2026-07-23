# AnvilNote Desktop

**語言：** **繁體中文** | [English](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/github/v/release/AnvilNote/anvilnote-desktop?style=for-the-badge&label=Release&color=black)](https://github.com/AnvilNote/anvilnote-desktop/releases/latest)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Windows](https://img.shields.io/badge/Windows-x64-black?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Linux](https://img.shields.io/badge/Linux-deb%20%7C%20AppImage-black?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)

AnvilNote Desktop 將編輯器、API、PDF Renderer、DOCX Exporter 與相關服務整合成一套 Electron 應用程式，適合整理長篇筆記、課堂講義、報告，以及技術或學術文件。

核心編輯與文件匯出功能可以離線使用，本機使用不需要註冊帳號。智慧模式是選用功能，使用時需要網路連線與使用者自己的 OpenAI API Key。

## 下載

請從 [GitHub Releases](https://github.com/AnvilNote/anvilnote-desktop/releases/latest) 下載最新公開預覽版。

| 平台 | 目前提供的安裝檔 | 架構 |
| --- | --- | --- |
| macOS | `.dmg`、`.pkg` | Apple silicon |
| Windows | NSIS `.exe` | x64 |
| Linux | `.deb`、`.AppImage` | x64、arm64 |

目前公開的 `v0.1.18` macOS 安裝檔尚未完成 Apple 程式碼簽章與公證，首次開啟時可能顯示安全警告。若系統阻擋開啟，請對 AnvilNote 按右鍵並選擇「打開」，或前往「系統設定 > 隱私權與安全性」允許執行。維護者建置流程現已支援 Developer ID 簽章，但在後續版本完成 Apple 公證、stapling 與乾淨環境驗證前，不得修改公開版本的簽章狀態說明。

Windows 版 `.exe` 尚未完成程式碼簽章（還沒有 Authenticode 憑證）。首次執行時 Windows SmartScreen 會顯示「未知發行者」警告，請在確認下載來源為官方 Release 頁面後，選擇「其他資訊 > 仍要執行」。

若 macOS 顯示應用程式已損毀，可能是未簽章版本仍帶有下載隔離標記。確認檔案來自官方 Release 頁面後，可在安裝至 `/Applications` 後執行：

```bash
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

## 功能

- 以 Tiptap 為基礎的長篇文件視覺化編輯器
- 標題、清單、表格、圖片、數學公式、程式碼區塊、Callout、證明與題目
- 可重複使用的文件範本與多語言介面
- 透過內建 Typst Renderer 匯出 PDF
- 匯出 DOCX，並在支援的情況下產生可於 Word 編輯的原生公式
- 選用的智慧模式，可產生結構化文件、參考附件內容與改寫選取文字
- 本機使用不需要帳號
- 正式安裝版本已包含執行環境，一般使用者不需要另行安裝 Node.js、Typst 或 Pandoc

## 智慧模式

每份文件可以擁有自己的智慧模式對話。AI 回覆會先成為經過驗證的文件草稿，再由使用者決定插入游標位置或取代整份文件。選取文字的改寫會顯示行內差異，並提供接受與拒絕操作。請求可以取消，套用後的編輯也會進入一般編輯器的復原紀錄。

智慧模式可以使用支援附件中擷取的文字作為參考內容，但不提供 OCR，也不會在未經確認的情況下取代文件。OpenAI API 費用會計入使用者自己的 OpenAI 帳號，與 ChatGPT 訂閱分開計算。

### API Key 儲存

OpenAI 憑證透過受信任的 Desktop 邊界處理，不會存進瀏覽器 `localStorage`：

- Electron 主程序使用作業系統支援的 `safeStorage` 加密具名稱的 Key 設定檔。
- API 資料庫只保存密文與非機密顯示資訊，無法自行解密金鑰。
- 只有 Electron 主程序可以解密金鑰，並在授權的請求中提供給 AI Provider。
- Renderer 僅會取得例如 `OpenAI · sk-proj-****5YA` 的遮罩名稱，不會收到已儲存的原始金鑰或密文。
- Loopback API 僅監聽 `127.0.0.1`，具權限的憑證操作還需要每次啟動時產生的 Desktop 信任權杖。
- 若 Linux 上的 Electron 只提供不安全的 `basic_text` 儲存後端，金鑰只會保留於目前工作階段，不會被標示為已安全永久儲存。

直接在瀏覽器執行 `anvilnote-web` 時同樣只會保留當前工作階段，因為一般瀏覽器無法使用 Desktop 的受信任邊界。

### 附件儲存

Desktop 附件不需要綁入 MinIO 或其他物件儲存服務。Electron 主程序會使用 AES-256-GCM 加密依內容定址的附件資料，安裝金鑰則由 `safeStorage` 保護。Renderer IPC 只會取得安全的附件資訊與不透明 ID。

## 測試智慧模式

1. 開啟 AnvilNote Desktop，進入「設定」。
2. 開啟 AI 設定並選擇 OpenAI。
3. 加入自己的 API Key，按下測試連線按鈕。
4. 開啟或建立一份文件，再從 Bot 按鈕開啟智慧模式。
5. 請 AI 產生一份簡短的結構化文件。
6. 檢查草稿，再選擇插入或取代目前文件。
7. 套用草稿，接著使用編輯器的一般復原功能。
8. 在編輯器中選取文字並要求改寫。
9. 接受或拒絕行內修訂。

AnvilNote 不提供共用 API Key。上述操作可能產生 OpenAI API 費用。

## 從原始碼執行

Desktop 會從相鄰的儲存庫組裝 Web 應用程式與受信任服務，因此需要以下資料夾結構：

```text
parent-folder/
  anvilnote-ai-writer/
  anvilnote-api/
  anvilnote-web/
  anvilnote-desktop/
  anvilnote-renderer/
  anvilnote-docx-exporter/
  anvilnote-charts/
```

先在各相鄰儲存庫安裝相依套件，再於 `anvilnote-desktop` 執行：

```bash
pnpm install
pnpm check:repos
pnpm dev:hot
```

`pnpm dev:hot` 會建置受信任的 Sidecar，並在 Electron 內啟動相鄰的 Next.js 開發伺服器。執行前請先關閉另外啟動的 `anvilnote-web` 開發伺服器。不需要 Hot Reload 時，可改用 `pnpm dev` 測試完整組裝後的 Web Build。

常用指令：

```bash
pnpm build:main
pnpm test
pnpm prepare:desktop
pnpm pack
pnpm dist:mac
pnpm dist:mac:release
pnpm verify:mac
pnpm dist:win
pnpm dist:linux
```

`pnpm dist:mac:release` 僅供維護者使用。執行時必須位於 clean `main`
工作目錄，登入鑰匙圈中需有 Developer ID Application 與 Installer
憑證，並已建立 `AnvilNote Notarization` notarytool 設定檔。此命令會完成
簽章、送交 Apple 公證、stapling、驗證與 SHA-256 計算，但不會自行建立或
上傳 GitHub Release。

正式安裝版本已包含所需的 Typst 與 Pandoc 執行檔。從原始碼開發時，請依各相鄰儲存庫的說明準備工具。

## 資料儲存

應用程式會將可寫入資料存放在 App Bundle 之外。預設位置為：

```text
~/.anvilnote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

開發時可透過 `ANVILNOTE_DESKTOP_DATA_DIR` 指定其他資料目錄。
智慧模式的加密附件保管區會另外存放在 Electron 依平台決定的使用者資料目錄
下，資料夾名稱為 `ai-attachments/`。

## 相關儲存庫

- [AnvilNote](https://github.com/AnvilNote/anvilnote)
- [AnvilNote Web](https://github.com/AnvilNote/anvilnote-web)
- [AnvilNote API](https://github.com/AnvilNote/anvilnote-api)
- [AnvilNote AI Writer](https://github.com/AnvilNote/anvilnote-ai-writer)
- [AnvilNote Renderer](https://github.com/AnvilNote/anvilnote-renderer)
- [AnvilNote DOCX Exporter](https://github.com/AnvilNote/anvilnote-docx-exporter)

## 授權

本儲存庫採用 [MIT License](LICENSE)。
