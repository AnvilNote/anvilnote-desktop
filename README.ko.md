# AnvilNote Desktop

**Languages:** [繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | **한국어** | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/badge/Release-v0.1.0-black?style=for-the-badge)](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote Desktop는 Electron shell, AnvilNote Web, AnvilNote API, AnvilNote Renderer, Typst, 폰트, 템플릿, 설치 리소스를 묶어 macOS용으로 배포하는 데스크톱 패키징 프로젝트입니다.

이 저장소는 데스크톱 앱의 단일 배포 진입점입니다. Release, 설치 자산, 버전 태그, 다운로드 안내, 서명되지 않은 앱 관련 안내가 모두 여기에 모입니다.

## 다운로드

현재 버전은 [이 링크](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)에서 다운로드할 수 있습니다.

Release 자산은 다음을 제공하는 것을 목표로 합니다.

- `.dmg`: 일반적인 드래그 앤 드롭 설치에 적합
- `.pkg`: 설치 프로그램 흐름이 필요한 경우에 적합

현재 macOS 설치 자산은 code signing 및 notarization이 아직 완료되지 않았습니다. 처음 실행할 때 macOS 보안 경고가 나타날 수 있습니다.

macOS가 앱 실행을 차단할 경우:

1. Finder에서 다운로드한 `.app`, `.dmg`, 또는 설치된 앱을 찾습니다.
2. 앱을 우클릭하고**열기**를 선택합니다.
3. 계속 차단되면**시스템 설정 > 개인정보 보호 및 보안**에서 허용한 뒤 다시 실행합니다.

macOS에 **"AnvilNote"이(가) 손상되어 열 수 없습니다**라고 표시되면, 이는 서명되지 않은 앱과 다운로드 격리 플래그 때문이며 파일이 실제로 손상된 것은 아닙니다. 앱을 `/Applications`로 옮긴 뒤 **터미널**에서 다음 명령을 실행해 격리 플래그를 제거하면 정상적으로 열립니다.

```sh
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

공개 릴리스 전에 아직 필요한 항목:

- Developer ID Application certificate
- Developer ID Installer certificate
- Hardened Runtime
- Notarization
- Stapling

## 지원 언어

번들된 웹 앱의 현재 i18n 로케일은 다음과 같습니다.

| Language | Locale |
| --- | --- |
| English | `en` |
| Traditional Chinese | `zh-TW` |
| Japanese | `ja` |
| Korean | `ko` |
| Thai | `th` |
| Russian | `ru` |

## 저장소 역할

이 저장소는 monorepo가 아닙니다. 다른 AnvilNote 앱의 전체 소스 코드는 포함하지 않으며, 인접 저장소의 산출물을 읽고 빌드하고 복사하고 패키징합니다.

예상 sibling repo:

```sh
../anvilnote-web
../anvilnote-api
../anvilnote-renderer
```

경로는 `.env`로 덮어쓸 수 있습니다.

## 패키지 구성

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

`pnpm prepare:desktop`가 `dist/app/`에 런타임을 조립한 뒤, `electron-builder`가 데스크톱 앱으로 패키징합니다.

## 로컬 개발

```sh
cp .env.example .env
pnpm install
pnpm check:repos
pnpm dev
```

개발 시:

- `ANVILNOTE_WEB_DEV_URL`이 설정되어 있으면 Electron이 해당 URL을 엽니다.
- 그렇지 않으면 번들된 웹 빌드를 사용합니다.
- API sidecar는 개발 환경에서 best-effort로 시작합니다.

## 패키징 명령

```sh
pnpm pack
pnpm dist:dmg
pnpm dist:pkg
pnpm dist:mac
```

- `pnpm pack`: 로컬 검증용 압축되지 않은 `.app` 생성
- `pnpm dist:dmg`: `.dmg` 생성
- `pnpm dist:pkg`: `.pkg` 생성
- `pnpm dist:mac`: `.dmg`와 `.pkg` 모두 생성

## 런타임 제약

- macOS 전용
- 별도 Node.js 설치 불필요
- 별도 Typst 설치 불필요
- 외부 클라우드 서비스 불필요
- 로컬 API는 `127.0.0.1`에만 바인딩
- auto-update 미지원
- login / cloud sync 미지원

## Typst, 폰트, 템플릿

- 사용자는 Typst를 따로 설치할 필요가 없습니다
- 데스크톱 앱은 번들된 Typst binary를 사용해야 합니다
- 개발 환경에서는 `ANVILNOTE_TYPST_PATH`로 Typst 경로를 덮어쓸 수 있습니다
- 폰트와 템플릿은 번들 리소스 디렉터리에서 제공합니다

## 저장소 위치

로컬 API는 읽기 전용 `.app` 번들 밖에 데이터를 저장합니다. 기본 경로는 다음과 같습니다.

```text
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

`ANVILNOTE_DESKTOP_DATA_DIR`로 변경할 수 있습니다.
