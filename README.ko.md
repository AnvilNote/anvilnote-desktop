# AnvilNote Desktop

**Languages:** [繁體中文](README.zh-TW.md) | [English](README.md) | [日本語](README.ja.md) | **한국어** | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/github/v/release/AnvilNote/anvilnote-desktop?style=for-the-badge&label=Release&color=black)](https://github.com/AnvilNote/anvilnote-desktop/releases/latest)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Linux](https://img.shields.io/badge/Linux-deb%20%7C%20AppImage-black?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote는 장문의 노트, 강의 자료, 보고서, 학술 문서 정리에 적합한 크로스플랫폼 글쓰기 및 노트 앱입니다.

하나의 워크스페이스에서 텍스트 편집, 수식 추가, 코드 정리, 템플릿 적용, PDF 내보내기까지 모두 처리할 수 있습니다. AnvilNote는 기본적으로 오프라인에서 동작하며, 로그인이 필요 없고 Node.js나 Typst 등을 별도로 설치할 필요도 없습니다.

## 다운로드

최신 버전은 [이 링크](https://github.com/AnvilNote/anvilnote-desktop/releases/)에서 받을 수 있습니다.

현재 제공하는 플랫폼과 설치 파일:

| 플랫폼 | 형식 | 설명 |
| --- | --- | --- |
| macOS | `.dmg` | 대부분의 사용자에게 적합. 다운로드 후 Applications로 드래그하여 설치 |
| macOS | `.pkg` | 표준 설치 절차를 원하는 경우에 적합 |
| Linux | `.deb` | Debian / Ubuntu 계열 배포판용. 패키지 관리 도구로 설치 가능 |
| Linux | `.AppImage` | 설치가 필요 없는 버전. 실행 권한만 부여하면 바로 실행 가능 |

> [!WARNING]
> **macOS 보안 관련 안내**
>
> 현재 배포 중인 macOS 설치 파일은 Apple의 코드 서명 및 공증(notarization)이 아직 완료되지 않았습니다. 이 때문에 처음 실행할 때 macOS가 보안 경고를 표시할 수 있으나, 이는 알려진 상태이며 파일 손상을 의미하지 않습니다.

macOS에서 앱 실행이 차단되는 경우:

1. Finder에서 다운로드한 `.app`, `.dmg` 또는 설치된 AnvilNote를 찾습니다.
2. AnvilNote를 마우스 오른쪽 버튼으로 클릭하고 "열기"를 선택합니다.
3. 그래도 차단된다면 "시스템 설정 > 개인정보 보호 및 보안"에서 AnvilNote 실행을 허용한 뒤 다시 실행합니다.

**"AnvilNote"이(가) 손상되어 열 수 없습니다** 라는 메시지가 표시되는 경우, 이는 서명되지 않은 앱에 다운로드 격리(quarantine) 플래그가 붙어서 발생하는 것으로, 실제 파일이 손상된 것은 아닙니다. `/Applications`에 설치한 뒤 터미널에서 다음 명령어를 실행해 격리 플래그를 제거하세요.

```bash
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

> [!NOTE]
> 정식 공개 전까지 다음 항목이 아직 필요합니다:
>
> - Developer ID Application certificate
> - Developer ID Installer certificate
> - Hardened Runtime
> - Notarization
> - Stapling

## 지원 언어

AnvilNote는 현재 다음 인터페이스 언어를 지원합니다.

| 언어 | 로케일 |
| --- | --- |
| English | `en` |
| 繁體中文 | `zh-TW` |
| 日本語 | `ja` |
| 한국어 | `ko` |
| ไทย | `th` |
| Русский | `ru` |

## 주요 기능

- 장문 노트 및 문서 정리 지원
- 블록 단위 편집 지원
- 수식 지원
- 코드 블록 지원
- 이미지, 표, 문서 개요 지원
- 템플릿 지원
- PDF 내보내기 지원
- 로그인 불필요
- Typst 별도 설치 불필요
- Node.js 별도 설치 불필요
- 현재 외부 클라우드 서비스에 의존하지 않음

## 데이터 저장

AnvilNote는 앱 번들 외부의 쓰기 가능한 위치에 문서 데이터를 저장합니다. 기본 경로는 다음과 같습니다.

```
~/.anvilnote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

필요한 경우 `ANVILNOTE_DESKTOP_DATA_DIR`을 통해 데이터 저장 위치를 재정의할 수 있습니다.
