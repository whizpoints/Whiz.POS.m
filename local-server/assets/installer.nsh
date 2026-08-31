!include "MUI2.nsh"

; ==========================================
; UI Customization for Whiz POS Installer
; ==========================================

; Branding
BrandingText "WHIZ POS ${VERSION}"

; ------------------------------------------
; UI STYLING
; ------------------------------------------
!define MUI_INSTFILESPAGE_PROGRESSBAR smooth

; Note: Icons and Background bitmaps are handled by electron-builder via package.json
; to avoid "already defined" errors during NSIS compilation.

; ------------------------------------------
; PAGE 1: Welcome Page
; ------------------------------------------
!define MUI_WELCOMEPAGE_TITLE "Welcome to the Whiz POS Ecosystem"
!define MUI_WELCOMEPAGE_TEXT "Complete this wizard to install the core Point of Sale application and connect your business.$\r$\n$\r$\nThis setup will install Whiz POS v${VERSION} and prepare your system for seamless business operations."

; ------------------------------------------
; PAGE 2: License Agreement
; ------------------------------------------
!define MUI_LICENSEPAGE_TEXT_TOP "Please read this agreement carefully."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "You must accept the agreement to install WHIZ POS."
!define MUI_INNERTEXT_LICENSE_BOTTOM " "

; ------------------------------------------
; PAGE 3: Directory Selection
; ------------------------------------------
!define MUI_DIRECTORYPAGE_TEXT_TOP "Where should Whiz POS be installed?"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Click Next to install to this folder, or Browse... to select another location."

; ------------------------------------------
; PAGE 4: Installation Progress
; ------------------------------------------
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "Installation Aborted"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "Whiz POS installation was interrupted."

; Custom Installation Labels
!define MUI_PAGE_HEADER_TEXT "Installing WHIZ POS v${VERSION}"
!define MUI_PAGE_HEADER_SUBTEXT "This will take a few moments..."

; ------------------------------------------
; PAGE 5: Finish Page
; ------------------------------------------
!define MUI_FINISHPAGE_TITLE "Setup Complete (v${VERSION})"
!define MUI_FINISHPAGE_TEXT "Whiz POS has been successfully installed on your computer.$\r$\n$\r$\nClick 'Finish' to exit the setup wizard."
!define MUI_FINISHPAGE_RUN_TEXT "Launch Whiz POS"

; ==========================================
; SECTION: Installation Logic
; ==========================================

Section "Main"
  SetDetailsView show
  DetailPrint "----------------------------------------"
  DetailPrint "Product Overview"
  DetailPrint "  • Desktop POS (offline-first, fast checkout)"
  DetailPrint "  • Back Office Web (analytics, inventory, admin)"
  DetailPrint "  • Mobile App (remote ordering)"
  DetailPrint " "
  DetailPrint "Latest Fixes (v5.2.3)"
  DetailPrint "Receipt printer margins fixed for correct padding on 80mm paper."
  DetailPrint " "
  DetailPrint "Architecture Notes"
  DetailPrint "Mobile App -> Desktop POS (Offline queueing) -> Back Office (Sync API, MongoDB)"
  DetailPrint "----------------------------------------"
  DetailPrint "Extracting files..."

  ; Note: electron-builder handles the actual file extraction
SectionEnd

; ==========================================
; UNINSTALLER Logic
; ==========================================

!define MUI_UNWELCOMEPAGE_TITLE "Uninstall Whiz POS"
!define MUI_UNWELCOMEPAGE_TEXT "This wizard will guide you through the uninstallation of Whiz POS v${VERSION}. Your business data (MongoDB) will be preserved unless specifically deleted."

!define MUI_UNFINISHPAGE_TITLE "Uninstallation Complete"
!define MUI_UNFINISHPAGE_TEXT "Whiz POS has been successfully removed from your computer."

!macro customUnInstall
  ; Custom uninstaller logic can be placed here
!macroend
