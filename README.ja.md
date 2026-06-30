# AnvilNote Desktop

**Languages:** [繁體中文](README.md) | [English](README.en.md) | **日本語** | [한국어](README.ko.md) | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/badge/Release-v0.1.0-black?style=for-the-badge)](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote Desktop は、Electron shell、AnvilNote Web、AnvilNote API、AnvilNote Renderer、Typst、フォント、テンプレート、インストーラー用リソースをまとめて、macOS 用のダウンロード可能なデスクトップアプリとして配布するためのパッケージングプロジェクトです。

このリポジトリはデスクトップ版の単一の配布入口です。Release、インストール用アセット、バージョンタグ、ダウンロード案内、未署名アプリに関する注意事項はすべてここに集約されます。

## ダウンロード

現在のバージョンは[このリンク](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)からダウンロードできます。

Release では次のアセットを提供する想定です。

- `.dmg`: 一般的なドラッグアンドドロップでのインストール向け
- `.pkg`: インストーラー形式を使いたい場合向け

現在の macOS インストーラーは code signing と notarization が未完了です。初回起動時に macOS の警告が表示される場合があります。

macOS によりブロックされた場合:

1. Finder でダウンロードした `.app`、`.dmg`、またはインストール済みアプリを見つけます。
2. アプリを右クリックして**開く**を選びます。
3. それでもブロックされる場合は、**システム設定 > プライバシーとセキュリティ**で許可してから再実行してください。

macOS に**「AnvilNote」は壊れているため開けません**と表示される場合、これは未署名アプリとダウンロード隔離フラグによるもので、ファイルが実際に壊れているわけではありません。アプリを `/Applications` に移動した後、**ターミナル**で次のコマンドを実行して隔離フラグを削除すると、通常どおり開けます。

```sh
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

公開リリース前に、まだ次の作業が必要です。

- Developer ID Application certificate
- Developer ID Installer certificate
- Hardened Runtime
- Notarization
- Stapling

## 対応言語

同梱される Web アプリの i18n ロケールは次のとおりです。

| Language | Locale |
| --- | --- |
| English | `en` |
| Traditional Chinese | `zh-TW` |
| Japanese | `ja` |
| Korean | `ko` |
| Thai | `th` |
| Russian | `ru` |

## リポジトリの役割

これは monorepo ではありません。他の AnvilNote アプリの完全なソースコードは含まず、隣接リポジトリの成果物を読み取り、ビルドし、コピーし、パッケージします。

想定される sibling repo:

```sh
../anvilnote-web
../anvilnote-api
../anvilnote-renderer
```

パスは `.env` で上書きできます。

## パッケージ内容

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

`pnpm prepare:desktop` で `dist/app/` に実行環境を組み立て、その後 `electron-builder` でデスクトップアプリを作成します。

## ローカル開発

```sh
cp .env.example .env
pnpm install
pnpm check:repos
pnpm dev
```

開発時:

- `ANVILNOTE_WEB_DEV_URL` が設定されていれば Electron はその URL を開きます。
- それ以外では同梱された Web ビルドを使用します。
- API sidecar は開発時に best-effort で起動します。

## パッケージコマンド

```sh
pnpm pack
pnpm dist:dmg
pnpm dist:pkg
pnpm dist:mac
```

- `pnpm pack`: ローカル確認用の未圧縮 `.app` を作成
- `pnpm dist:dmg`: `.dmg` を作成
- `pnpm dist:pkg`: `.pkg` を作成
- `pnpm dist:mac`: `.dmg` と `.pkg` の両方を作成

## 実行時の制約

- macOS 専用
- 別途 Node.js のインストール不要
- 別途 Typst のインストール不要
- 外部クラウドサービス不要
- ローカル API は `127.0.0.1` のみに bind
- auto-update は未対応
- login / cloud sync は未対応

## Typst、フォント、テンプレート

- ユーザーは Typst を別途インストールする必要はありません
- デスクトップアプリは同梱 Typst binary を使用します
- 開発時は `ANVILNOTE_TYPST_PATH` で Typst を上書きできます
- フォントとテンプレートは同梱リソースから提供されます

## 保存先

ローカル API は読み取り専用の `.app` バンドル外にデータを書き込みます。既定の場所は次のとおりです。

```text
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

`ANVILNOTE_DESKTOP_DATA_DIR` で上書きできます。
