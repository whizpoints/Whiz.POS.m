!include "MUI2.nsh"

; ==========================================
; UI Customization for Whiz POS Installer
; ==========================================

; Branding
BrandingText "WHIZ POS ${VERSION} | Whizpoint Solutions"

; ------------------------------------------
; UI STYLING
; ------------------------------------------
!define MUI_INSTFILESPAGE_PROGRESSBAR smooth

; Note: Icons and Background bitmaps are handled by electron-builder via package.json
; to avoid "already defined" errors during NSIS compilation.

; ------------------------------------------
; PAGE 1: Welcome Page
; ------------------------------------------
!define MUI_WELCOMEPAGE_TITLE "Welcome to Whiz POS Retail Operating System"
!define MUI_WELCOMEPAGE_TEXT "This wizard will install Whiz POS v${VERSION} on your workstation.$\r$\n$\r$\nEngineered for zero-latency retail terminals, offline-first SQLite datastores, automated Safaricom M-Pesa STK callbacks, KRA eTIMS signing, and real-time cloud multi-store synchronization.$\r$\n$\r$\nClick 'Next' to continue setup."

; ------------------------------------------
; PAGE 2: License Agreement
; ------------------------------------------
!define MUI_LICENSEPAGE_TEXT_TOP "Please review the Whiz POS Commercial License Agreement before continuing."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "If you accept all terms of the agreement, click 'I Agree' to proceed with installation."
!define MUI_INNERTEXT_LICENSE_BOTTOM " "

; ------------------------------------------
; PAGE 3: Directory Selection
; ------------------------------------------
!define MUI_DIRECTORYPAGE_TEXT_TOP "Select Installation Location"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Setup will install Whiz POS in the following folder. To install to a different folder, click Browse and select another destination."

; ------------------------------------------
; PAGE 4: Installation Progress
; ------------------------------------------
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "Installation Aborted"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "Whiz POS installation was cancelled by user."

; Custom Installation Labels
!define MUI_PAGE_HEADER_TEXT "Installing Whiz POS v${VERSION}"
!define MUI_PAGE_HEADER_SUBTEXT "Deploying edge retail binaries and offline database engines..."

; ------------------------------------------
; PAGE 5: Finish Page
; ------------------------------------------
!define MUI_FINISHPAGE_TITLE "Installation Completed Successfully"
!define MUI_FINISHPAGE_TEXT "Whiz POS v${VERSION} is now installed and ready to power your store registers.$\r$\n$\r$\nClick 'Finish' to close the installer."
!define MUI_FINISHPAGE_RUN_TEXT "Launch Whiz POS Now"

; ==========================================
; SECTION: Installation Logic
; ==========================================

Section "Main"
  SetDetailsView show
  DetailPrint "--------------------------------------------------------"
  DetailPrint "Whiz POS Retail Intelligence OS v${VERSION}"
  DetailPrint "  • Sub-millisecond LibSQL / SQLite edge-native offline engine"
  DetailPrint "  • Safaricom Daraja M-Pesa automated STK push & C2B callbacks"
  DetailPrint "  • Cryptographic KRA eTIMS VSCU signing & QR verification"
  DetailPrint "  • Real-time multi-branch cloud catalog & inventory sync"
  DetailPrint "  • Direct ESC/POS 80mm & 58mm thermal print spooler"
  DetailPrint "--------------------------------------------------------"
  DetailPrint "Unpacking system dependencies and edge runtime..."

  ; Note: electron-builder handles the actual file extraction
SectionEnd

; ==========================================
; UNINSTALLER Logic
; ==========================================

!define MUI_UNWELCOMEPAGE_TITLE "Uninstall Whiz POS"
!define MUI_UNWELCOMEPAGE_TEXT "This wizard will remove Whiz POS v${VERSION} from your computer.$\r$\n$\r$\nYour local database and encrypted offline sales snapshots will be safely preserved in your app data folder unless manually removed."

!define MUI_UNFINISHPAGE_TITLE "Uninstallation Complete"
!define MUI_UNFINISHPAGE_TEXT "Whiz POS has been successfully removed from this computer."

!macro customUnInstall
  ; Custom uninstaller logic can be placed here
!macroend
