/**
 * RuMLeEx Interview Intelligence Toolkit — Google Sheets collector.
 * Run setup() once, then deploy this project as a Web App.
 */
const PROPERTY_KEY = "RUMLEEX_RESPONSE_SPREADSHEET_ID";

function setup() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROPERTY_KEY);
  let ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create("RuMLeEx Interview Toolkit Responses");
    props.setProperty(PROPERTY_KEY, ss.getId());
  }
  let sheet = ss.getSheetByName("Responses");
  if (!sheet) sheet = ss.insertSheet("Responses");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Form ID", "Form title", "Stage", "Interviewee / project", "Contact email", "Consent", "Responses JSON"]);
    sheet.setFrozenRows(1);
  }
  Logger.log("Response spreadsheet: " + ss.getUrl());
  return ss.getUrl();
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    if (p.website) return html_("Submission received.");
    if (p.consent !== "yes") return html_("Consent is required.");
    const formId = String(p.formId || "").trim();
    if (!/^F[1-8]$/.test(formId)) return html_("Invalid form.");
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEY);
    if (!spreadsheetId) return html_("The response sheet has not been set up. Ask the site owner to run setup().");
    const responses = String(p.responses || "{}");
    if (responses.length > 45000) return html_("Response is too long. Please shorten it and try again.");
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName("Responses") || ss.insertSheet("Responses");
    sheet.appendRow([new Date(), formId, String(p.formTitle || ""), String(p.stage || ""),
      String(p.guest || "").slice(0, 300), String(p.contact || "").slice(0, 300), "yes", responses]);
    return html_("Thank you. Your response has been received.");
  } catch (err) {
    return html_("Unable to save the response. Please contact RuMLeEx.");
  }
}

function html_(message) {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font:16px Arial,sans-serif;padding:24px;color:#222"><p>' + message + '</p></body></html>'
  );
}
