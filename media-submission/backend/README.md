# RuMLeEx Media Submission — backend

This backend is designed for the GitHub Pages upload page. It keeps Google OAuth credentials on the server, validates signed invitation links, creates category/guest folders in the owner's Google Drive, and starts Drive resumable upload sessions.

## Important deployment boundary

GitHub Pages is static hosting. Never put Google client secrets, refresh tokens, signing secrets, or admin keys in the website repository or browser JavaScript. Deploy this backend to Cloud Run and store secrets as Cloud Run environment secrets. The upload page sends video bytes to a Google Drive resumable session URL; the backend does not proxy multi-gigabyte files.

The page currently has its API URL blank in `media-submission/config.js`. Set it only after deploying and testing the backend.

## Required Google setup

1. Create/select a Google Cloud project and enable the Google Drive API.
2. Configure an OAuth consent screen and OAuth client for a web application.
3. Authorize the RuMLeEx owner's Google account with the Drive scope `https://www.googleapis.com/auth/drive`, then obtain a refresh token. Keep the client secret and refresh token private.
4. Create a folder in the owner's Drive named `RuMLeEx Media Submissions`; copy its folder ID from the Drive URL.
5. Deploy this folder to Cloud Run. Set the environment variables below through Secret Manager / Cloud Run secrets, not GitHub.

## Environment variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` (secret)
- `GOOGLE_REFRESH_TOKEN` (secret)
- `INVITE_SIGNING_SECRET` (secret; use a long random value)
- `ADMIN_KEY` (secret; use a different long random value)
- `DRIVE_ROOT_FOLDER_ID` (folder ID of RuMLeEx Media Submissions)
- `SITE_URL` (for example `https://rumleex.github.io/RuMLeEx-Website`)
- `ALLOWED_ORIGINS` (exact website origin, for example `https://rumleex.github.io`)

## Create a contributor invitation

Send an authenticated POST request to `/api/admin/invite` with header `x-admin-key: YOUR_ADMIN_KEY` and JSON body, for example:

```json
{"guest":"ABC Boxing Academy","category":"SAFAR","days":14}
```

Allowed categories: `SAFAR`, `PATHSHALA`, `TRAVEL_EXPLORATION`, `COMMUNITY`.

The response contains a unique invitation URL. Send that URL to the contributor through WhatsApp. The invite expires after the selected number of days (1–30).

## Before inviting real contributors

- Set `RUMLEEX_UPLOAD_API` in `media-submission/config.js` to the deployed HTTPS Cloud Run URL.
- Test with small video files first, then test a large file and an interrupted mobile connection.
- Verify browser CORS behavior for Drive resumable session PUT requests in the target browsers. Do not announce the 2 GB limit as production-ready until this test passes.
- Confirm the resulting Drive folder structure and permissions.
- Review Google's current quotas, Cloud Run pricing, and the user's Drive storage before launch.

## Current safeguards and limitations

- Invite tokens are signed, category-scoped and time-limited.
- Uploads are restricted to video MIME types and 2 GB per file.
- Drive credentials remain server-side.
- Contributors cannot list or download other submissions through this API.
- This first version does not provide an admin dashboard, token revocation, virus scanning, automatic duplicate detection, or a full resume-after-disconnection UI. A failed upload can require retrying the file.
- A private link is a bearer credential: anyone who receives/forwards it can use it until it expires. Send each link only to its intended contributor.
- Files are stored privately in the Drive folder; no public sharing link is created.
