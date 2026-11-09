# RuMLeEx Interview Toolkit — website upload and collection setup

## Website files
- Upload `toolkit.html` to the **root** of the existing repository `rumleex/RuMLeEx-Website`.
- Add the navigation link shown in `index-nav-snippet.txt` to the `<nav>` in `index.html`.
- The page will then be available at:
  `https://rumleex.github.io/RuMLeEx-Website/toolkit.html`

## Connect response collection (Google Sheets)
1. Sign in to the Google account that should own the responses.
2. Open https://script.google.com/ and create a new Apps Script project.
3. Replace the starter code with `toolkit-backend/Code.gs`.
4. Save. Select `setup()` and click **Run**. Approve the requested Google Sheets permissions.
5. Open the execution log and copy the spreadsheet URL shown by `setup()`. This is the response spreadsheet.
6. Select **Deploy → New deployment → Web app**.
7. Choose **Execute as: Me** and **Who has access: Anyone**, then deploy and authorise.
8. Copy the deployed Web App URL ending in `/exec`.
9. In `toolkit.html`, replace `PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` in `COLLECTION_ENDPOINT` with that URL.
10. Commit the updated file to the `main` branch. Test a submission and confirm that a row appears in the private response spreadsheet.

## Data collected
Each submission adds one row with timestamp, form ID, title, stage, interviewee/project name, optional contact email, consent status and answers in JSON format.

## Privacy
The spreadsheet belongs to the Google account that ran `setup()`. Keep it private. Form submission is for research and planning; it is not publication consent. Obtain separate approval before publishing profiles, photos, quotations or personal information. Do not collect passwords, government ID numbers or unnecessary sensitive personal data.
