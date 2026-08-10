; electron-builder's default NSIS template sets `ShowInstDetails nevershow`
; (app-builder-lib/templates/nsis/common.nsh) -- no details button at all.
; `hide` (not `show`) is the standard collapsed-by-default NSIS UX: adds the
; native "Show details" toggle button but keeps the panel closed until the
; user asks for it, instead of force-expanding an empty-looking box for the
; whole install. This macro is inserted after common.nsh, so it overrides
; that default.
!macro customHeader
  ShowInstDetails hide
  ShowUninstDetails hide
!macroend

; What CAN'T be done here, and why: electron-builder 25.1.8's installSection.nsh
; calls installApplicationFiles -> registryAddInstallInfo -> addStartMenuLink
; -> addDesktopLink back to back with no macro hook between them, so there's
; no supported way to DetailPrint "Installing application files..." before
; the (slow) extraction step specifically -- only `customInit` (runs in
; .onInit, before the wizard shows its first page, let alone the details
; list control existing) and `customInstall` (runs after all four of those
; steps already finished) are available. Getting real per-stage messages
; would mean forking the vendor installSection.nsh wholesale, which trades a
; few cosmetic log lines for a copy of electron-builder's install flow that
; silently drifts out of sync on every electron-builder upgrade -- not worth
; it. These are end-of-install confirmation lines instead, shown only if the
; user opens "Show details".
;
; installSection.nsh also calls `SetDetailsPrint none` near its top (before
; customInstall is ever reached), which silently swallows any DetailPrint
; call made afterward -- confirmed via a real install where ShowInstDetails
; made the panel available but it stayed empty. `both` re-enables printing
; to the details list and the status text for the rest of this macro.
!macro customInstall
  SetDetailsPrint both
  DetailPrint "應用程式檔案安裝完成。"
  DetailPrint "捷徑與登錄檔設定完成。"
  DetailPrint "AnvilNote 安裝完成。"
!macroend
