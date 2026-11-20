const SHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const ACCESS_TAB = "AccessCodes";
const RESPONSE_TAB = "Responses";

function setupRuMLeExFeedback() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let access = ss.getSheetByName(ACCESS_TAB) || ss.insertSheet(ACCESS_TAB);
  let responses = ss.getSheetByName(RESPONSE_TAB) || ss.insertSheet(RESPONSE_TAB);
  if (access.getLastRow() === 0) access.appendRow(["AccessCode","GuestName","Episode","Active","Used","CreatedAt"]);
  if (responses.getLastRow() === 0) responses.appendRow(["SubmittedAt","GuestName","Profession","Episode","ReleaseDate","AccessCode","PrimaryReason","Expectations","ExpectationsOther","ExperienceRatings","AppreciatedMost","InterviewImprovements","Watched","Shared","AudienceResponses","ExpectationsMet","ExpectationsExplanation","Expected","Received","ValuableOutcome","Missing","ContentRatings","Representation","RepresentationComments","Suggestion1","Suggestion2","Suggestion3","SupportRequested","Recommend","Collaborate","OneChange","AdditionalFeedback"]);
  access.setFrozenRows(1); responses.setFrozenRows(1);
  access.autoResizeColumns(1,6); responses.autoResizeColumns(1,32);
}
function doGet(e) {
  const callback = (e.parameter.callback || "").replace(/[^a-zA-Z0-9_$]/g, "");
  const result = e.parameter.action === "verify" ? verifyCode_(e.parameter.code || "") : {ok:false,message:"Unknown action."};
  const output = callback ? callback + "(" + JSON.stringify(result) + ");" : JSON.stringify(result);
  return ContentService.createTextOutput(output).setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
function verifyCode_(code) {
  if (!code || SHEET_ID.indexOf("PASTE_") === 0) return {ok:false,message:"The feedback service is not configured."};
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_TAB);
  if (!sheet || sheet.getLastRow() < 2) return {ok:false,message:"No guest access codes are configured yet."};
  const rows = sheet.getDataRange().getValues();
  const normalized = String(code).trim().toUpperCase();
  for (let i=1;i<rows.length;i++) {
    if (String(rows[i][0]).trim().toUpperCase() === normalized) {
      const active = String(rows[i][3]).toLowerCase() === "true" || rows[i][3] === true;
      const used = String(rows[i][4]).toLowerCase() === "true" || rows[i][4] === true;
      if (!active || used) return {ok:false,message:"This code is inactive or has already been used."};
      return {ok:true,guestName:String(rows[i][1] || ""),episode:String(rows[i][2] || "")};
    }
  }
  return {ok:false,message:"The access code was not recognised."};
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const data = e.parameter || {};
    const check = verifyCode_(data.code || "");
    if (!check.ok) return json_({ok:false,message:check.message});
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const access = ss.getSheetByName(ACCESS_TAB);
    const responses = ss.getSheetByName(RESPONSE_TAB);
    const rows = access.getDataRange().getValues();
    let rowNumber = -1;
    for (let i=1;i<rows.length;i++) if (String(rows[i][0]).trim().toUpperCase() === String(data.code).trim().toUpperCase()) { rowNumber=i+1; break; }
    if (rowNumber < 2) return json_({ok:false,message:"Access code not found."});
    const nowUsed = String(access.getRange(rowNumber,5).getValue()).toLowerCase() === "true" || access.getRange(rowNumber,5).getValue() === true;
    if (nowUsed) return json_({ok:false,message:"This access code has already been used."});
    const fields = ["guestName","profession","episode","releaseDate","code","primaryReason","expectations","expectationsOther","experienceRatings_1","experienceRatings_2","experienceRatings_3","experienceRatings_4","experienceRatings_5","experienceRatings_6","experienceRatings_7","appreciatedMost","interviewImprovements","watched","shared","responses","expectationsMet","expectationsExplanation","expected","received","valuableOutcome","missing","contentRatings_1","contentRatings_2","contentRatings_3","contentRatings_4","contentRatings_5","representation","representationComments","suggestion1","suggestion2","suggestion3","support","recommend","collaborate","oneChange","additionalFeedback"];
    const values = [new Date()].concat(fields.map(k => data[k] || ""));
    responses.appendRow(values);
    access.getRange(rowNumber,5).setValue(true);
    return json_({ok:true});
  } finally { lock.releaseLock(); }
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
/*
SETUP:
1. Create a new Google Sheet and copy its ID into SHEET_ID above.
2. Open Extensions > Apps Script, replace Code.gs with this file, save.
3. Run setupRuMLeExFeedback once and approve the requested permissions.
4. In AccessCodes, add one row per guest:
   unique code | guest name | episode number | TRUE | FALSE | (leave blank)
5. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
6. Copy the Web app URL into API_URL in the website page and commit that one-line change.
7. Keep the Sheet private. Do not share the Sheet with guests.
For a guest-specific link, send the page URL and the code separately. Do not put the code in the URL.
*/
