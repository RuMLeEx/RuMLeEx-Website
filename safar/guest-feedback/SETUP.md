# RuMLeEx SAFAR Guest Feedback – Setup

The website page is designed for a Google Sheets + Google Apps Script backend. The page is not live-connected until the steps below are completed.

## 1. Create the private response spreadsheet
Create a new Google Sheet. Keep its sharing setting restricted to the RuMLeEx administrator(s). Copy the spreadsheet ID from its URL.

## 2. Install the Apps Script
Open **Extensions → Apps Script**. Replace the contents of `Code.gs` with the contents of `Code.gs` in this repository. Replace `PASTE_GOOGLE_SHEET_ID_HERE` with the spreadsheet ID.

Run `setupRuMLeExFeedback` once and approve the permissions. It creates:
- **AccessCodes** – one unique access code per guest.
- **Responses** – submitted feedback.

Add guests to AccessCodes with columns:
`AccessCode | GuestName | Episode | Active | Used | CreatedAt`
Set Active to TRUE and Used to FALSE.

## 3. Deploy the backend
In Apps Script choose **Deploy → New deployment → Web app**.
- Execute as: **Me**
- Who has access: **Anyone**

Copy the deployed Web App URL.

## 4. Connect the website
In `safar/guest-feedback/index.html`, replace:
`PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`
with the deployed Web App URL. Commit the change to GitHub.

## 5. Invite a guest
Send the guest this page:
`https://rumleex.github.io/RuMLeEx-Website/safar/guest-feedback/`
Send the private access code separately. Do not put the code in the URL.

## Important privacy notes
- Keep the Google Sheet private.
- Use a unique, random code for each guest; do not reuse codes.
- Disable a code by setting Active to FALSE.
- The code is marked Used after a successful submission.
- This is private-link access control, not identity verification. Anyone the guest forwards the code to could use it before the guest does.
- The web app is publicly reachable so guests can submit; access is controlled by the code. Review Apps Script deployment permissions and your privacy notice before collecting responses.
