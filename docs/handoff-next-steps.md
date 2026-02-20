# 25교구탁아출석부 다음 작업 정리

## 반영된 핵심 정책
- 명단 삭제: 관리자만 (`jbstar33@gmail.com`)
- 출석 삭제: 누구나
- 출석 입력: 누구나
- 동일 아동/동일 날짜 중복 출석 차단
- 출석 레코드에 나이/셀은 명단 참조값으로 저장

## Apps Script 배포 체크리스트
1. `apps_script/api.gs`를 Apps Script 프로젝트(`generateAttendanceSheet`)에 반영
2. 저장 후 **새 버전**으로 웹 앱 재배포
3. 웹 앱 URL 유지 확인
   - `https://script.google.com/macros/s/AKfycbyHXy2ltOHeChtphgip2D2foXiMMSnzJW67hSKdMu78FcJHPbVsxu5jG58zZV2NHYPqGg/exec`

## 시트 헤더 권장안
### 명단 시트(`명단`)
`id, name, age, cell, guardian, phone, createdAt, createdBy`

### 출석기록 시트(`출석기록`)
`id, date, memberId, name, age, cell, createdAt`

## 검증 시나리오
- GET 명단 조회
  - `GET /exec?action=members`
- 출석 추가
  - `POST /exec` with `{ "action":"addAttendance", "memberId":"...", "date":"2026-02-20" }`
- 동일 아동/동일 날짜 재등록 시도
  - 에러: `같은 날짜에는 중복 출석할 수 없습니다.`
- 출석 삭제(비관리자)
  - `POST /exec` with `{ "action":"deleteAttendance", "attendanceId":"..." }` 성공
- 명단 삭제(비관리자)
  - `POST /exec` with `{ "action":"deleteMember", "memberId":"..." }` 실패

## 참고
- Apps Script의 `Session.getActiveUser().getEmail()`은 실행 권한/배포 설정에 따라 빈 값일 수 있음.
- Flutter 앱에서 POST 검증 시 302 redirect 이슈는 `http.post` 실제 동작 기준으로 재검증 권장.
