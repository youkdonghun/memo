!define MUI_ABORTWARNING
!define MUI_DIRECTORYPAGE_TEXT_TOP "MEMO BOM을 설치할 위치를 선택해 주세요. 현재 사용자 폴더에 설치하면 관리자 권한 없이 사용할 수 있습니다."
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "MEMO BOM 설치를 마무리합니다"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "필요한 파일 구성이 완료되었습니다."
!define MUI_UNINSTFILESPAGE_FINISHHEADER_TEXT "MEMO BOM 제거를 마무리합니다"
!define MUI_UNINSTFILESPAGE_FINISHHEADER_SUBTEXT "프로그램 파일 제거가 완료되었습니다."

!macro customInstallMode
  !ifndef BUILD_UNINSTALLER
    StrCpy $isForceCurrentInstall "1"
  !endif
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "MEMO BOM 설치를 시작합니다"
  !define MUI_WELCOMEPAGE_TEXT "MEMO BOM은 업무의 효율화와 기본 스티커메모의 한계를 극복하기 위해 만든 데스크톱 메모 앱입니다.$\r$\n$\r$\n설치는 현재 사용자 기준으로 진행됩니다. 계속하려면 다음 버튼을 눌러주세요."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE "MEMO BOM 설치가 완료되었습니다"
  !define MUI_FINISHPAGE_TEXT "MEMO BOM이 준비되었습니다.$\r$\n$\r$\n앱은 작업표시줄 대신 시스템 트레이에 머물 수 있으며, 기본 단축키 Ctrl + Shift + D로 메모를 열 수 있습니다."
  !ifndef HIDE_RUN_AFTER_FINISH
    Function StartApp
      ${if} ${isUpdated}
        StrCpy $1 "--updated"
      ${else}
        StrCpy $1 ""
      ${endif}
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
    FunctionEnd

    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
    !define MUI_FINISHPAGE_RUN_TEXT "MEMO BOM 바로 실행"
  !endif
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnWelcomePage
  !define MUI_UNWELCOMEPAGE_TITLE "MEMO BOM 제거를 시작합니다"
  !define MUI_UNWELCOMEPAGE_TEXT "이 과정은 MEMO BOM 프로그램 파일을 제거합니다.$\r$\n$\r$\n메모를 따로 보관하려면 앱 설정의 백업 저장 기능을 먼저 사용해 주세요. 계속하려면 다음 버튼을 눌러주세요."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro customUninstallPage
  !define MUI_UNFINISHPAGE_TITLE "MEMO BOM 제거가 완료되었습니다"
  !define MUI_UNFINISHPAGE_TEXT "MEMO BOM이 제거되었습니다.$\r$\n$\r$\n추가 문의사항은 https://blog.naver.com/sap_y 블로그에 댓글로 남겨주세요."
!macroend
