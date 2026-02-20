/**
 * 25교구탁아출석부 - Web App API
 *
 * 정책
 * - 명단 삭제: 관리자만
 * - 출석 삭제: 누구나
 * - 출석 입력: 누구나
 * - 같은 날짜 중복 출석 불가
 */

const ADMIN_EMAILS = [
  "jbstar33@gmail.com",
];

const SHEET_MEMBERS = "명단";
const SHEET_ATTENDANCE = "출석기록";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "";

  if (action === "members") return toJson_(getMembers_());
  if (action === "attendance") return toJson_(getAttendance_(e.parameter.date));

  return toJson_({
    ok: false,
    error: "Unsupported action",
    action,
  });
}

function doPost(e) {
  const body = parseJsonBody_(e);
  const action = body.action || "";

  if (action === "addMember") return toJson_(addMember_(body));
  if (action === "deleteMember") return toJson_(deleteMember_(body.memberId)); // 관리자만
  if (action === "addAttendance") return toJson_(addAttendance_(body));
  if (action === "deleteAttendance") return toJson_(deleteAttendanceById_(body.attendanceId)); // 누구나

  return toJson_({
    ok: false,
    error: "Unsupported action",
    action,
  });
}

function getMembers_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_MEMBERS);
  if (!sheet) return { ok: false, error: `Sheet not found: ${SHEET_MEMBERS}` };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, members: [] };

  const [header, ...rows] = values;
  const members = rows
    .filter(r => r.some(Boolean))
    .map((row) => rowToObject_(header, row));

  return { ok: true, members };
}

function getAttendance_(dateText) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ATTENDANCE);
  if (!sheet) return { ok: false, error: `Sheet not found: ${SHEET_ATTENDANCE}` };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, attendance: [] };

  const [header, ...rows] = values;
  let attendance = rows
    .filter(r => r.some(Boolean))
    .map((row) => rowToObject_(header, row));

  if (dateText) {
    attendance = attendance.filter((item) => normalizeDate_(item.date) === normalizeDate_(dateText));
  }

  return { ok: true, attendance };
}

function addMember_(body) {
  const email = Session.getActiveUser().getEmail() || "";
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_MEMBERS);
  if (!sheet) return { ok: false, error: `Sheet not found: ${SHEET_MEMBERS}` };

  const id = Utilities.getUuid();
  const now = new Date();
  const row = [
    id,
    body.name || "",
    Number(body.age || 0),
    Number(body.cell || 0),
    body.guardian || "",
    body.phone || "",
    now,
    email,
  ];
  sheet.appendRow(row);

  return { ok: true, memberId: id };
}

function deleteMember_(memberId) {
  const email = Session.getActiveUser().getEmail() || "";
  if (!ADMIN_EMAILS.includes(email)) {
    return { ok: false, error: "관리자만 명단 삭제가 가능합니다." };
  }

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_MEMBERS);
  if (!sheet) return { ok: false, error: `Sheet not found: ${SHEET_MEMBERS}` };

  return deleteById_(sheet, memberId);
}

function addAttendance_(body) {
  const memberId = body.memberId || "";
  const name = body.name || "";
  const dateText = normalizeDate_(body.date || new Date());

  const member = findMemberByIdOrName_(memberId, name);
  if (!member) return { ok: false, error: "명단에서 해당 아동을 찾을 수 없습니다." };

  const attendanceSheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ATTENDANCE);
  if (!attendanceSheet) return { ok: false, error: `Sheet not found: ${SHEET_ATTENDANCE}` };

  if (hasDuplicateAttendance_(attendanceSheet, member.id, dateText)) {
    return { ok: false, error: "같은 날짜에는 중복 출석할 수 없습니다." };
  }

  const id = Utilities.getUuid();
  attendanceSheet.appendRow([
    id,
    dateText,
    member.id,
    member.name,
    member.age,
    member.cell,
    new Date(),
  ]);

  return { ok: true, attendanceId: id };
}

function deleteAttendanceById_(attendanceId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ATTENDANCE);
  if (!sheet) return { ok: false, error: `Sheet not found: ${SHEET_ATTENDANCE}` };

  return deleteById_(sheet, attendanceId);
}

function findMemberByIdOrName_(memberId, name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_MEMBERS);
  if (!sheet) return null;

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const [header, ...rows] = values;
  const idIndex = header.indexOf("id");
  const nameIndex = header.indexOf("name");

  for (const row of rows) {
    const id = String(row[idIndex] || "");
    const rowName = String(row[nameIndex] || "");
    if ((memberId && id === memberId) || (!memberId && name && rowName === name)) {
      return {
        id,
        name: rowName,
        age: Number(row[header.indexOf("age")] || 0),
        cell: Number(row[header.indexOf("cell")] || 0),
      };
    }
  }

  return null;
}

function hasDuplicateAttendance_(sheet, memberId, dateText) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;

  const [header, ...rows] = values;
  const memberIndex = header.indexOf("memberId");
  const dateIndex = header.indexOf("date");

  return rows.some((row) => {
    return String(row[memberIndex] || "") === String(memberId) && normalizeDate_(row[dateIndex]) === dateText;
  });
}

function deleteById_(sheet, id) {
  if (!id) return { ok: false, error: "id가 필요합니다." };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: false, error: "삭제할 데이터가 없습니다." };

  const [header, ...rows] = values;
  const idIndex = header.indexOf("id");
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][idIndex] || "") === String(id)) {
      sheet.deleteRow(i + 2);
      return { ok: true };
    }
  }

  return { ok: false, error: "대상을 찾지 못했습니다." };
}

function rowToObject_(header, row) {
  const obj = {};
  for (let i = 0; i < header.length; i++) obj[header[i]] = row[i];
  return obj;
}

function normalizeDate_(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function parseJsonBody_(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return {};
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function toJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
