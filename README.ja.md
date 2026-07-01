# AnvilNote Desktop

**Languages:** [繁體中文](README.zh-TW.md) | [English](README.md) | **日本語** | [한국어](README.ko.md) | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/github/v/release/AnvilNote/anvilnote-desktop?style=for-the-badge&label=Release&color=black)](https://github.com/AnvilNote/anvilnote-desktop/releases/latest)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Linux](https://img.shields.io/badge/Linux-deb%20%7C%20AppImage-black?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote は、長文のノート、講義資料、レポート、学術文書の整理に適したクロスプラットフォームのライティング&ノートアプリです。

同じワークスペース内でテキストの編集、数式の追加、コードの整理、テンプレートの適用、PDF への書き出しまで完結します。AnvilNote は基本的にオフラインで動作し、ログインは不要で、Node.js や Typst などの別途インストールも必要ありません。

## ダウンロード

最新バージョンは[こちらのリンク](https://github.com/AnvilNote/anvilnote-desktop/releases/)から入手できます。

現在提供しているプラットフォームとインストーラー:

| プラットフォーム | 形式 | 説明 |
| --- | --- | --- |
| macOS | `.dmg` | 多くのユーザー向け。ダウンロード後 Applications にドラッグしてインストール |
| macOS | `.pkg` | 標準的なインストーラー形式を利用したい場合向け |
| Linux | `.deb` | Debian / Ubuntu 系ディストリビューション向け。パッケージ管理ツールでインストール可能 |
| Linux | `.AppImage` | インストール不要版。実行権限を付与するだけで直接起動可能 |

> [!WARNING]
> **macOS のセキュリティに関する注意**
>
> 現在配布している macOS 版インストーラーは、Apple のコード署名および公証(notarization)が未完了です。そのため初回起動時にセキュリティ警告が表示される場合がありますが、これは既知の状態であり、ファイルの破損を意味するものではありません。

macOS でアプリの起動がブロックされた場合:

1. Finder でダウンロードした `.app` / `.dmg`、またはインストール済みの AnvilNote を探します。
2. AnvilNote を右クリックし、「開く」を選択します。
3. それでもブロックされる場合は、「システム設定 > プライバシーとセキュリティ」で AnvilNote の起動を許可してから、再度実行してください。

**「AnvilNote」は壊れているため開けません** と表示される場合、これは未署名アプリにダウンロード時の隔離(quarantine)フラグが付与されていることが原因であり、ファイルが実際に破損しているわけではありません。`/Applications` にインストール後、ターミナルで以下のコマンドを実行して隔離フラグを解除してください。

```bash
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

> [!NOTE]
> 正式な一般公開の前に、以下の対応が必要です:
>
> - Developer ID Application certificate
> - Developer ID Installer certificate
> - Hardened Runtime
> - Notarization
> - Stapling

## 対応言語

AnvilNote は現在、以下のインターフェース言語に対応しています。

| 言語 | ロケール |
| --- | --- |
| English | `en` |
| 繁體中文 | `zh-TW` |
| 日本語 | `ja` |
| 한국어 | `ko` |
| ไทย | `th` |
| Русский | `ru` |

## 主な機能

- 長文ノート・ドキュメントの整理
- ブロック単位の編集
- 数式のサポート
- コードブロックのサポート
- 画像・表・ドキュメントアウトラインのサポート
- テンプレートのサポート
- PDF 出力
- ログイン不要
- Typst の別途インストール不要
- Node.js の別途インストール不要
- 現時点では外部クラウドサービスに依存しない

## データの保存先

AnvilNote は、アプリ本体の外にある書き込み可能な場所にドキュメントデータを保存します。デフォルトのパスは次のとおりです。

```
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

必要に応じて `ANVILNOTE_DESKTOP_DATA_DIR` でデータの保存先を上書きできます。
