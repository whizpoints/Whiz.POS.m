!include "MUI2.nsh"

; ==========================================
; UI Customization for WhizPOS Server Installer
; ==========================================

; Branding
BrandingText "WHIZPOS SERVER ${VERSION} | Whizpoint Solutions"

; ------------------------------------------
; UI STYLING
; ------------------------------------------
!define MUI_INSTFILESPAGE_PROGRESSBAR smooth

; ------------------------------------------
; PAGE 1: Welcome Page
; ------------------------------------------
!define MUI_WELCOMEPAGE_TITLE "Welcome to WhizPOS Local Edge Server"
!define MUI_WELCOMEPAGE_TEXT "This wizard will install WhizPOS Server v${VERSION} on your host machine.$\r$\n$\r$\nDesigned as the centralized on-premise hub for your retail store, providing zero-latency SQLite LAN synchronization, Bonjour zero-config service discovery, Safaricom M-Pesa webhook aggregation, and Cloudflare Tunnel bridge.$\r$\n$\r$\nClick 'Next' to continue setup."

; ------------------------------------------
; PAGE 2: License Agreement
; ------------------------------------------
!define MUI_LICENSEPAGE_TEXT_TOP "Please review the WhizPOS Commercial Server Agreement before continuing."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "If you accept all terms of the agreement, click 'I Agree' to proceed."
!define MUI_INNERTEXT_LICENSE_BOTTOM " "

; ------------------------------------------
; PAGE 3: Directory Selection
; ------------------------------------------
!define MUI_DIRECTORYPAGE_TEXT_TOP "Select Server Installation Directory"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Setup will install WhizPOS Server in the following folder. To select a different folder, click Browse."

; ------------------------------------------
; PAGE 4: Installation Progress
; ------------------------------------------
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "Installation Aborted"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "WhizPOS Server installation was cancelled."

; Custom Installation Labels
!define MUI_PAGE_HEADER_TEXT "Installing WhizPOS Server v${VERSION}"
!define MUI_PAGE_HEADER_SUBTEXT "Configuring high-performance SQLite engine, LAN sync daemon & Bonjour discovery..."

; ------------------------------------------
; PAGE 5: Finish Page
; ------------------------------------------
!define MUI_FINISHPAGE_TITLE "Server Setup Completed Successfully"
!define MUI_FINISHPAGE_TEXT "WhizPOS Local Edge Server v${VERSION} has been successfully installed.$\r$\n$\r$\nTerminals on your local area network (LAN) will automatically discover this node via Bonjour mDNS and synchronize orders, transactions, and fiscal receipts in real time.$\r$\n$\r$\nClick 'Finish' to launch WhizPOS Server."
!define MUI_FINISHPAGE_RUN_TEXT "Start WhizPOS Server Service"

; ==========================================
; SECTION: Installation Logic
; ==========================================

Section "Main"
  SetDetailsView show
  DetailPrint "---------------------------------------------------------"
  DetailPrint "WhizPOS Local Edge Server Architecture"
  DetailPrint "  • Embedded Engine: LibSQL / SQLite Multi-Threaded WAL"
  DetailPrint "  • Service Discovery: Bonjour mDNS zero-config LAN beacon"
  DetailPrint "  • Sync Gateway: WebSockets + REST bi-directional delta queue"
  DetailPrint "  • Payments: Safaricom M-Pesa Daraja STK Push & C2B"
  DetailPrint "  • Cloud Tunnel: Real-time synchronization to Whiz Cloud Portal"
  DetailPrint "---------------------------------------------------------"
  DetailPrint "Deploying server runtime binaries & schema..."
SectionEnd

; ==========================================
; UNINSTALLER Logic
; ==========================================

!define MUI_UNWELCOMEPAGE_TITLE "Uninstall WhizPOS Server"
!define MUI_UNWELCOMEPAGE_TEXT "This wizard will remove WhizPOS Server v${VERSION} from this machine.$\r$\n$\r$\nYour database records, sales history, and store configurations will remain safely stored on this computer unless you choose to delete them."

!define MUI_UNFINISHPAGE_TITLE "Uninstallation Complete"
!define MUI_UNFINISHPAGE_TEXT "WhizPOS Server binaries have been removed. Your store data remains preserved."

!macro customUnInstall
!macroend
