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
