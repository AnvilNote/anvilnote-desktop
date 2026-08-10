; electron-builder's default NSIS template sets `ShowInstDetails nevershow`
; (app-builder-lib/templates/nsis/common.nsh), so the install/uninstall
; progress page only ever shows a bare progress bar with no way to tell a
; slow-but-working install (e.g. antivirus scanning a large unpacked
; node_modules tree on first write) apart from a frozen one. This macro is
; inserted after common.nsh, so it overrides that default.
!macro customHeader
  ShowInstDetails show
  ShowUninstDetails show
!macroend

; electron-builder extracts the whole app as one packed archive via a
; plugin call, not per-file `File` instructions, so there's no native
; per-file "Extract: x.dll" log line to show even with ShowInstDetails on
; (see customHeader above). These are coarse stage markers instead --
; not a real file list, just enough to show the install page isn't frozen.
!macro customInstall
  DetailPrint "正在解壓縮並安裝 AnvilNote 應用程式檔案..."
  DetailPrint "正在設定捷徑與登錄檔..."
!macroend
