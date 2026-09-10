# MEMO BOM

MEMO BOM은 업무의 효율화와 기본 스티커메모의 한계를 극복하기 위해 만든 데스크톱 메모 앱입니다.

제작 및 관리: sap-scriptorium

문의: https://blog.naver.com/sap_y

## 설치 파일 다운로드

**[최신 버전 다운로드 (Windows · Mac)](https://github.com/youkdonghun/memo/releases/latest)**

| 운영체제 | 1.1.2 설치 파일 |
| --- | --- |
| Windows (x64) | [Windows EXE 다운로드](https://github.com/youkdonghun/memo/releases/download/v1.1.2/MEMO-BOM-Setup-1.1.2.exe) |
| Mac (Apple Silicon · Intel 공용) | [Mac DMG 다운로드](https://github.com/youkdonghun/memo/releases/download/v1.1.2/MEMO-BOM-Setup-1.1.2-universal.dmg) |

Windows는 EXE를 실행하고, Mac은 DMG를 열어 MEMO BOM을 Applications 폴더에 복사하세요.
Mac 빌드는 Apple Developer 서명 및 공증이 적용되지 않아 macOS 보안 정책에 따라 실행이 제한될 수 있습니다.

## 주요 기능

- 메모 무제한 생성
- 화면에 고정할 플로팅 메모 최대 5개 지정
- `Ctrl+Shift+D`로 플로팅 메모 순환
- `Ctrl+Shift+F`로 열린 메모 숨김
- 시스템 트레이 백그라운드 실행
- 글씨체, 글자 크기, 색상 설정
- 체크리스트, 목록, 표 삽입
- 메모별 첨부파일 영역의 열림·닫힘 상태 저장 (재실행 및 분리 창에서도 유지)
- 모니터 가장자리 위치와 숨김 모드 설정

## 실행

```powershell
npm install
npm start
```

## 설치 파일 만들기

```powershell
npm run dist
```

Mac에서는 `npm run dist:mac`으로 Apple Silicon·Intel 공용 DMG를 만듭니다.
`package.json` 버전과 일치하는 `v*` 태그를 GitHub에 올리면 두 운영체제의 설치 파일을 빌드한 뒤 Releases에 자동 게시합니다.
