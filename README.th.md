# AnvilNote Desktop

**Languages:** [繁體中文](README.zh-TW.md) | [English](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **ไทย** | [Русский](README.ru.md)

[![Release](https://img.shields.io/github/v/release/AnvilNote/anvilnote-desktop?style=for-the-badge&label=Release&color=black)](https://github.com/AnvilNote/anvilnote-desktop/releases/latest)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Linux](https://img.shields.io/badge/Linux-deb%20%7C%20AppImage-black?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote เป็นแอปเขียนบันทึกแบบข้ามแพลตฟอร์ม เหมาะสำหรับจัดระเบียบโน้ตแบบยาว เอกสารประกอบการบรรยาย รายงาน และเอกสารวิชาการ

คุณสามารถแก้ไขข้อความ เพิ่มสูตรคณิตศาสตร์ จัดระเบียบโค้ด ใช้เทมเพลต และส่งออกเป็น PDF ได้ทั้งหมดในพื้นที่ทำงานเดียว AnvilNote ทำงานแบบออฟไลน์เป็นหลัก ไม่ต้องเข้าสู่ระบบ และไม่ต้องติดตั้ง Node.js หรือ Typst แยกต่างหาก

## ดาวน์โหลด

ดาวน์โหลดเวอร์ชันล่าสุดได้ที่[ลิงก์นี้](https://github.com/AnvilNote/anvilnote-desktop/releases/)

แพลตฟอร์มและไฟล์ติดตั้งที่รองรับในปัจจุบัน:

| แพลตฟอร์ม | รูปแบบ | คำอธิบาย |
| --- | --- | --- |
| macOS | `.dmg` | เหมาะสำหรับผู้ใช้ส่วนใหญ่ ดาวน์โหลดแล้วลากไปยัง Applications เพื่อติดตั้ง |
| macOS | `.pkg` | เหมาะสำหรับผู้ที่ต้องการขั้นตอนติดตั้งแบบมาตรฐาน |
| Linux | `.deb` | สำหรับดิสโทร Debian / Ubuntu สามารถติดตั้งผ่านเครื่องมือจัดการแพ็กเกจได้ |
| Linux | `.AppImage` | เวอร์ชันไม่ต้องติดตั้ง เพียงให้สิทธิ์การเรียกใช้งานแล้วรันได้ทันที |

> [!WARNING]
> **ข้อควรระวังด้านความปลอดภัยสำหรับ macOS**
>
> ไฟล์ติดตั้งบน macOS ที่เผยแพร่อยู่ในปัจจุบันยังไม่ผ่านการเซ็นชื่อโค้ด (code signing) และการรับรอง (notarization) จาก Apple ดังนั้น macOS อาจแสดงคำเตือนด้านความปลอดภัยเมื่อเปิดใช้งานครั้งแรก ซึ่งเป็นสถานะที่ทราบอยู่แล้วและไม่ได้หมายความว่าไฟล์เสียหาย

หาก macOS บล็อกไม่ให้เปิดแอป:

1. ค้นหาไฟล์ `.app`, `.dmg` ที่ดาวน์โหลดมา หรือแอป AnvilNote ที่ติดตั้งแล้วใน Finder
2. คลิกขวาที่ AnvilNote แล้วเลือก "เปิด" (Open)
3. หากยังถูกบล็อกอยู่ ให้ไปที่ "การตั้งค่าระบบ > ความเป็นส่วนตัวและความปลอดภัย" เพื่ออนุญาตให้ AnvilNote เปิดใช้งาน แล้วเปิดแอปอีกครั้ง

หาก macOS แสดงข้อความว่า **"AnvilNote" เสียหายและไม่สามารถเปิดได้** มักเกิดจากแอปที่ยังไม่ได้เซ็นชื่อถูกติดแฟล็กกักกัน (quarantine) จากการดาวน์โหลด ไม่ได้หมายความว่าไฟล์เสียหายจริง หลังจากติดตั้งไปยัง `/Applications` แล้ว สามารถรันคำสั่งต่อไปนี้ใน Terminal เพื่อลบแฟล็กกักกันออก

```bash
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

> [!NOTE]
> ก่อนเปิดตัวอย่างเป็นทางการ ยังต้องดำเนินการต่อไปนี้ให้เสร็จสิ้น:
>
> - Developer ID Application certificate
> - Developer ID Installer certificate
> - Hardened Runtime
> - Notarization
> - Stapling

## ภาษาที่รองรับในปัจจุบัน

AnvilNote รองรับภาษาสำหรับส่วนติดต่อผู้ใช้ดังต่อไปนี้:

| ภาษา | Locale |
| --- | --- |
| English | `en` |
| 繁體中文 | `zh-TW` |
| 日本語 | `ja` |
| 한국어 | `ko` |
| ไทย | `th` |
| Русский | `ru` |

## ฟีเจอร์เด่น

- รองรับโน้ตและเอกสารแบบยาว
- รองรับการแก้ไขแบบบล็อก
- รองรับสูตรคณิตศาสตร์
- รองรับบล็อกโค้ด
- รองรับรูปภาพ ตาราง และโครงร่างเอกสาร
- รองรับเทมเพลต
- รองรับการส่งออกเป็น PDF
- ไม่ต้องเข้าสู่ระบบ
- ไม่ต้องติดตั้ง Typst แยกต่างหาก
- ไม่ต้องติดตั้ง Node.js แยกต่างหาก
- ปัจจุบันไม่พึ่งพาบริการคลาวด์ภายนอก

## การจัดเก็บข้อมูล

AnvilNote จะเขียนข้อมูลเอกสารไปยังตำแหน่งที่เขียนได้นอกตัวแอป โดยเส้นทางเริ่มต้นคือ:

```
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

หากต้องการ สามารถกำหนดตำแหน่งจัดเก็บข้อมูลใหม่ได้ผ่าน `ANVILNOTE_DESKTOP_DATA_DIR`
