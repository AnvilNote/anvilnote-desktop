# AnvilNote Desktop

**Languages:** [繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **ไทย** | [Русский](README.ru.md)

[![Release](https://img.shields.io/badge/Release-v0.1.0-black?style=for-the-badge)](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote Desktop คือโปรเจกต์สำหรับแพ็กเกจแอปเดสก์ท็อปบน macOS โดยรวม Electron shell, AnvilNote Web, AnvilNote API, AnvilNote Renderer, Typst, ฟอนต์, เทมเพลต และทรัพยากรสำหรับตัวติดตั้งเข้าไว้ด้วยกัน

รีโพนี้เป็นจุดดาวน์โหลดหลักเพียงจุดเดียวสำหรับแอปเดสก์ท็อป Release, ไฟล์ติดตั้ง, version tag, คำแนะนำการดาวน์โหลด และคำอธิบายเรื่องแอปที่ยังไม่ได้เซ็น จะถูกรวมไว้ที่นี่

## ดาวน์โหลด

สามารถดาวน์โหลดเวอร์ชันปัจจุบันได้ผ่าน[ลิงก์นี้](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)

ไฟล์ที่ตั้งใจจะปล่อยใน Release:

- `.dmg`: เหมาะกับการติดตั้งแบบลากแล้ววาง
- `.pkg`: เหมาะกับกรณีที่ต้องการตัวติดตั้งแบบเป็นขั้นตอน

ไฟล์ติดตั้งสำหรับ macOS ในตอนนี้ยังไม่ได้ทำ code signing และ notarization ดังนั้น macOS อาจแสดงคำเตือนด้านความปลอดภัยเมื่อเปิดครั้งแรก

หาก macOS บล็อกแอป:

1. หา `.app`, `.dmg` หรือแอปที่ติดตั้งแล้วใน Finder
2. คลิกขวาที่แอปแล้วเลือก **Open**
3. หากยังถูกบล็อก ให้ไปที่ **System Settings > Privacy & Security** แล้วอนุญาตให้แอปรัน

หาก macOS แสดงข้อความ **"AnvilNote" เสียหายและไม่สามารถเปิดได้** นี่เกิดจากแอปที่ไม่ได้เซ็นชื่อร่วมกับแฟล็กกักกันของการดาวน์โหลด ไม่ใช่ว่าไฟล์เสียหายจริง หลังจากย้ายแอปไปยัง `/Applications` แล้ว ให้รันคำสั่งนี้ใน **Terminal** เพื่อลบแฟล็กกักกัน จากนั้นจึงเปิดได้ตามปกติ

```sh
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

ก่อนปล่อยสู่สาธารณะ ยังต้องมี:

- Developer ID Application certificate
- Developer ID Installer certificate
- Hardened Runtime
- Notarization
- Stapling

## ภาษาที่รองรับ

เว็บแอปที่บันเดิลมาด้วยรองรับ i18n locale ดังนี้:

| Language | Locale |
| --- | --- |
| English | `en` |
| Traditional Chinese | `zh-TW` |
| Japanese | `ja` |
| Korean | `ko` |
| Thai | `th` |
| Russian | `ru` |

## บทบาทของรีโพ

นี่ไม่ใช่ monorepo รีโพนี้ไม่ได้เก็บซอร์สโค้ดทั้งหมดของแอป AnvilNote อื่น ๆ แต่มีหน้าที่อ่าน บิลด์ คัดลอก และแพ็กเกจอาร์ติแฟกต์จาก sibling repos

รีโพข้างเคียงที่คาดว่าจะมี:

```sh
../anvilnote-web
../anvilnote-api
../anvilnote-renderer
```

สามารถ override path ผ่าน `.env` ได้

## เนื้อหาที่แพ็กเกจ

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

`pnpm prepare:desktop` จะประกอบ runtime ลงใน `dist/app/` ก่อน จากนั้น `electron-builder` จะใช้ส่วนนี้ในการแพ็กเป็นแอปเดสก์ท็อป

## พัฒนาในเครื่อง

```sh
cp .env.example .env
pnpm install
pnpm check:repos
pnpm dev
```

ระหว่างพัฒนา:

- ถ้าตั้ง `ANVILNOTE_WEB_DEV_URL` ไว้ Electron จะโหลด URL นั้น
- ถ้าไม่ตั้ง จะใช้เว็บบิลด์ที่บันเดิลไว้
- API sidecar จะเริ่มแบบ best-effort ในโหมดพัฒนา

## คำสั่งแพ็กเกจ

```sh
pnpm pack
pnpm dist:dmg
pnpm dist:pkg
pnpm dist:mac
```

- `pnpm pack`: สร้าง `.app` แบบยังไม่แพ็กสำหรับตรวจสอบในเครื่อง
- `pnpm dist:dmg`: สร้าง `.dmg`
- `pnpm dist:pkg`: สร้าง `.pkg`
- `pnpm dist:mac`: สร้างทั้ง `.dmg` และ `.pkg`

## ข้อจำกัดของระบบ

- รองรับเฉพาะ macOS
- ไม่ต้องติดตั้ง Node.js เพิ่ม
- ไม่ต้องติดตั้ง Typst เพิ่ม
- ไม่ต้องพึ่งบริการคลาวด์ภายนอก
- Local API bind เฉพาะ `127.0.0.1`
- ยังไม่มี auto-update
- ยังไม่มี login / cloud sync

## Typst, ฟอนต์ และเทมเพลต

- ผู้ใช้ไม่ต้องติดตั้ง Typst เอง
- แอปเดสก์ท็อปต้องใช้ Typst binary ที่บันเดิลมา
- ในโหมดพัฒนาสามารถ override ได้ด้วย `ANVILNOTE_TYPST_PATH`
- ฟอนต์และเทมเพลตจะถูกให้บริการจาก resource directory ที่บันเดิลมา

## ที่เก็บข้อมูล

Local API จะเขียนข้อมูลไว้นอก `.app` bundle แบบ read-only โดยตำแหน่งเริ่มต้นคือ:

```text
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

สามารถ override ได้ผ่าน `ANVILNOTE_DESKTOP_DATA_DIR`
